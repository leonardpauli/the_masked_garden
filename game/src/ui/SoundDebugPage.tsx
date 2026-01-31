import { useState, useEffect, useCallback, useRef } from 'react'
import {
  soundEngine,
  type OscillatorType,
  type NoiseType,
  type FilterType,
  type PlayingSound,
  type LoadedSample,
  type EffectChainConfig,
  type SpatialPosition,
  type ADSREnvelope,
  type LFOConfig,
  type LFOTarget
} from '../audio/SoundEngine'
import { presets, presetsByCategory } from '../audio/presets'
import { AssetLibrary } from './AssetLibrary'

interface ActiveSound {
  id: string
  name: string
  sound: PlayingSound
}

type ViewMode = 'synth' | 'presets' | 'library'
type VisualizationMode = 'waveform' | 'spectrum' | 'both'

export function SoundDebugPage({ onClose }: { onClose: () => void }) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('synth')

  // Audio engine state
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.5)

  // Oscillator state
  const [oscType, setOscType] = useState<OscillatorType>('sine')
  const [oscFrequency, setOscFrequency] = useState(440)
  const [oscGain, setOscGain] = useState(0.3)
  const [oscDetune, setOscDetune] = useState(0)

  // ADSR state
  const [enableADSR, setEnableADSR] = useState(false)
  const [attack, setAttack] = useState(0.1)
  const [decay, setDecay] = useState(0.2)
  const [sustain, setSustain] = useState(0.7)
  const [release, setRelease] = useState(0.3)

  // LFO state
  const [enableLFO, setEnableLFO] = useState(false)
  const [lfoType, setLfoType] = useState<OscillatorType>('sine')
  const [lfoFrequency, setLfoFrequency] = useState(5)
  const [lfoDepth, setLfoDepth] = useState(0.3)
  const [lfoTarget, setLfoTarget] = useState<LFOTarget>('gain')

  // Noise state
  const [noiseType, setNoiseType] = useState<NoiseType>('white')
  const [noiseGain, setNoiseGain] = useState(0.2)

  // Filter state
  const [enableFilter, setEnableFilter] = useState(false)
  const [filterType, setFilterType] = useState<FilterType>('lowpass')
  const [filterFreq, setFilterFreq] = useState(2000)
  const [filterQ, setFilterQ] = useState(1)
  const [filterGain, setFilterGain] = useState(0)

  // Effects state
  const [enableDelay, setEnableDelay] = useState(false)
  const [delayTime, setDelayTime] = useState(0.3)
  const [delayFeedback, setDelayFeedback] = useState(0.4)
  const [delayWet, setDelayWet] = useState(0.5)
  const [enableReverb, setEnableReverb] = useState(false)
  const [reverbWet, setReverbWet] = useState(0.3)
  const [enableDistortion, setEnableDistortion] = useState(false)
  const [distortionAmount, setDistortionAmount] = useState(20)
  const [enableCompressor, setEnableCompressor] = useState(false)

  // Spatial audio state
  const [enableSpatial, setEnableSpatial] = useState(false)
  const [spatialX, setSpatialX] = useState(0)
  const [spatialY, setSpatialY] = useState(0)
  const [spatialZ, setSpatialZ] = useState(-5)

  // Visualization
  const [vizMode, setVizMode] = useState<VisualizationMode>('both')
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Playing sounds and samples
  const [activeSounds, setActiveSounds] = useState<ActiveSound[]>([])
  const [loadedSamples, setLoadedSamples] = useState<LoadedSample[]>([])
  const [samplePlaybackRate, setSamplePlaybackRate] = useState(1)
  const [sampleLoop, setSampleLoop] = useState(false)

  // Initialize audio engine
  const initializeAudio = useCallback(async () => {
    await soundEngine.initialize()
    await soundEngine.resume()
    soundEngine.setMasterVolume(masterVolume)
    setIsInitialized(true)
  }, [masterVolume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      activeSounds.forEach(s => s.sound.stop())
    }
  }, [])

  // Visualization loop
  useEffect(() => {
    if (!isInitialized) return

    const draw = () => {
      // Draw waveform
      if ((vizMode === 'waveform' || vizMode === 'both') && waveformCanvasRef.current) {
        const canvas = waveformCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const data = soundEngine.getWaveformData()
          if (data) {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.3)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.lineWidth = 2
            ctx.strokeStyle = '#9932cc'
            ctx.beginPath()

            const sliceWidth = canvas.width / data.length
            let x = 0

            for (let i = 0; i < data.length; i++) {
              const v = data[i] / 128.0
              const y = (v * canvas.height) / 2

              if (i === 0) {
                ctx.moveTo(x, y)
              } else {
                ctx.lineTo(x, y)
              }
              x += sliceWidth
            }

            ctx.lineTo(canvas.width, canvas.height / 2)
            ctx.stroke()
          }
        }
      }

      // Draw spectrum
      if ((vizMode === 'spectrum' || vizMode === 'both') && spectrumCanvasRef.current) {
        const canvas = spectrumCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const data = soundEngine.getFrequencyData()
          if (data) {
            ctx.fillStyle = 'rgba(10, 10, 20, 0.3)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const barWidth = (canvas.width / data.length) * 2.5
            let x = 0

            for (let i = 0; i < data.length; i++) {
              const barHeight = (data[i] / 255) * canvas.height

              const hue = (i / data.length) * 60 + 270 // Purple to pink
              ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
              ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

              x += barWidth + 1
              if (x > canvas.width) break
            }
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isInitialized, vizMode])

  // Build ADSR envelope config
  const getEnvelope = useCallback((): ADSREnvelope | undefined => {
    if (!enableADSR) return undefined
    return { attack, decay, sustain, release }
  }, [enableADSR, attack, decay, sustain, release])

  // Build LFO config
  const getLFOConfig = useCallback((): LFOConfig | undefined => {
    if (!enableLFO) return undefined
    return { type: lfoType, frequency: lfoFrequency, depth: lfoDepth, target: lfoTarget }
  }, [enableLFO, lfoType, lfoFrequency, lfoDepth, lfoTarget])

  // Build effect chain config
  const getEffectChainConfig = useCallback((): EffectChainConfig | undefined => {
    const config: EffectChainConfig = {}

    if (enableFilter) {
      switch (filterType) {
        case 'lowpass':
          config.lowpass = { frequency: filterFreq, Q: filterQ }
          break
        case 'highpass':
          config.highpass = { frequency: filterFreq, Q: filterQ }
          break
        case 'bandpass':
          config.bandpass = { frequency: filterFreq, Q: filterQ }
          break
        case 'notch':
          config.notch = { frequency: filterFreq, Q: filterQ }
          break
        case 'lowshelf':
          config.lowshelf = { frequency: filterFreq, gain: filterGain }
          break
        case 'highshelf':
          config.highshelf = { frequency: filterFreq, gain: filterGain }
          break
        case 'peaking':
          config.peaking = { frequency: filterFreq, Q: filterQ, gain: filterGain }
          break
      }
    }
    if (enableDelay) {
      config.delay = { time: delayTime, feedback: delayFeedback, wet: delayWet }
    }
    if (enableReverb) {
      config.reverb = { decay: 2, wet: reverbWet }
    }
    if (enableDistortion) {
      config.distortion = { amount: distortionAmount }
    }
    if (enableCompressor) {
      config.compressor = { threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 }
    }

    return Object.keys(config).length > 0 ? config : undefined
  }, [enableFilter, filterType, filterFreq, filterQ, filterGain, enableDelay, delayTime, delayFeedback, delayWet, enableReverb, reverbWet, enableDistortion, distortionAmount, enableCompressor])

  // Get spatial position
  const getSpatialPosition = useCallback((): SpatialPosition | undefined => {
    if (!enableSpatial) return undefined
    return { x: spatialX, y: spatialY, z: spatialZ }
  }, [enableSpatial, spatialX, spatialY, spatialZ])

  // Play oscillator
  const playOscillator = useCallback(() => {
    if (!isInitialized) return

    const sound = soundEngine.playOscillator(oscType, oscFrequency, {
      gain: oscGain,
      detune: oscDetune,
      effects: getEffectChainConfig(),
      position: getSpatialPosition(),
      envelope: getEnvelope(),
      lfo: getLFOConfig()
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: `${oscType} ${oscFrequency}Hz`,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, oscType, oscFrequency, oscGain, oscDetune, getEffectChainConfig, getSpatialPosition, getEnvelope, getLFOConfig])

  // Release oscillator (for ADSR)
  const releaseSound = useCallback((id: string) => {
    const activeSound = activeSounds.find(s => s.id === id)
    if (activeSound) {
      activeSound.sound.release()
      // Remove after release time
      setTimeout(() => {
        setActiveSounds(prev => prev.filter(s => s.id !== id))
      }, (release + 0.1) * 1000)
    }
  }, [activeSounds, release])

  // Play noise
  const playNoise = useCallback(() => {
    if (!isInitialized) return

    const sound = soundEngine.playNoise(noiseType, {
      gain: noiseGain,
      effects: getEffectChainConfig(),
      position: getSpatialPosition(),
      envelope: getEnvelope(),
      lfo: getLFOConfig()
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: `${noiseType} noise`,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, noiseType, noiseGain, getEffectChainConfig, getSpatialPosition, getEnvelope, getLFOConfig])

  // Handle sample upload
  const handleSampleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isInitialized || !e.target.files?.length) return

    for (const file of Array.from(e.target.files)) {
      await soundEngine.loadSample(file)
    }
    setLoadedSamples(soundEngine.getLoadedSamples())
    e.target.value = ''
  }, [isInitialized])

  // Play sample
  const playSample = useCallback((sampleId: string, sampleName: string) => {
    if (!isInitialized) return

    const sound = soundEngine.playSample(sampleId, {
      gain: oscGain,
      effects: getEffectChainConfig(),
      position: getSpatialPosition(),
      loop: sampleLoop,
      playbackRate: samplePlaybackRate,
      envelope: getEnvelope(),
      lfo: getLFOConfig()
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: sampleName,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, oscGain, getEffectChainConfig, getSpatialPosition, sampleLoop, samplePlaybackRate, getEnvelope, getLFOConfig])

  // Remove sample
  const removeSample = useCallback((sampleId: string) => {
    soundEngine.removeSample(sampleId)
    setLoadedSamples(soundEngine.getLoadedSamples())
  }, [])

  // Stop a sound
  const stopSound = useCallback((id: string) => {
    const activeSound = activeSounds.find(s => s.id === id)
    if (activeSound) {
      activeSound.sound.stop()
      setActiveSounds(prev => prev.filter(s => s.id !== id))
    }
  }, [activeSounds])

  // Stop all sounds
  const stopAllSounds = useCallback(() => {
    soundEngine.stopAll()
    setActiveSounds([])
  }, [])

  // Update master volume
  useEffect(() => {
    if (isInitialized) {
      soundEngine.setMasterVolume(masterVolume)
    }
  }, [isInitialized, masterVolume])

  // Play preset
  const playPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset && isInitialized) {
      const sound = preset.play()
      if (sound) {
        setActiveSounds(prev => [...prev, { id: sound.id, name: preset.name, sound }])
      }
    }
  }, [isInitialized])

  if (viewMode === 'library') {
    return <AssetLibrary onClose={() => setViewMode('synth')} />
  }

  // viewMode is now narrowed to 'synth' | 'presets'
  const currentMode = viewMode

  return (
    <div className="sound-debug-page">
      <div className="sound-debug-header">
        <h2>Sound Engine Debug</h2>
        <div className="view-tabs">
          <button className={currentMode === 'synth' ? 'active' : ''} onClick={() => setViewMode('synth')}>Synth</button>
          <button className={currentMode === 'presets' ? 'active' : ''} onClick={() => setViewMode('presets')}>Presets</button>
          <button onClick={() => setViewMode('library')}>Library</button>
        </div>
        <button className="sound-close-btn" onClick={onClose}>x</button>
      </div>

      {/* Visualization */}
      {isInitialized && (
        <div className="visualization-container">
          <div className="viz-controls">
            <select value={vizMode} onChange={e => setVizMode(e.target.value as VisualizationMode)}>
              <option value="waveform">Waveform</option>
              <option value="spectrum">Spectrum</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="viz-canvases">
            {(vizMode === 'waveform' || vizMode === 'both') && (
              <canvas ref={waveformCanvasRef} width={400} height={100} className="viz-canvas" />
            )}
            {(vizMode === 'spectrum' || vizMode === 'both') && (
              <canvas ref={spectrumCanvasRef} width={400} height={100} className="viz-canvas" />
            )}
          </div>
        </div>
      )}

      <div className="sound-debug-content">
        {currentMode === 'synth' && (
          <>
            {/* Initialize Section */}
            <section className="sound-section">
              <h3>Audio Context</h3>
              {!isInitialized ? (
                <button className="btn btn-primary" onClick={initializeAudio}>
                  Initialize Audio
                </button>
              ) : (
                <div className="sound-controls">
                  <span className="sound-status active">Audio Active</span>
                  <div className="sound-slider">
                    <label>Master</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={masterVolume}
                      onChange={e => setMasterVolume(parseFloat(e.target.value))}
                    />
                    <span>{(masterVolume * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </section>

            {/* Oscillator Section */}
            <section className="sound-section">
              <h3>Oscillator</h3>
              <div className="sound-controls">
                <div className="sound-row">
                  <label>Type</label>
                  <select value={oscType} onChange={e => setOscType(e.target.value as OscillatorType)}>
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="triangle">Triangle</option>
                  </select>
                </div>
                <div className="sound-slider">
                  <label>Frequency</label>
                  <input type="range" min={20} max={2000} step={1} value={oscFrequency}
                    onChange={e => setOscFrequency(parseInt(e.target.value))} />
                  <span>{oscFrequency} Hz</span>
                </div>
                <div className="sound-slider">
                  <label>Gain</label>
                  <input type="range" min={0} max={1} step={0.01} value={oscGain}
                    onChange={e => setOscGain(parseFloat(e.target.value))} />
                  <span>{(oscGain * 100).toFixed(0)}%</span>
                </div>
                <div className="sound-slider">
                  <label>Detune</label>
                  <input type="range" min={-100} max={100} step={1} value={oscDetune}
                    onChange={e => setOscDetune(parseInt(e.target.value))} />
                  <span>{oscDetune} cents</span>
                </div>
                <button className="btn btn-primary" onClick={playOscillator} disabled={!isInitialized}>
                  {enableADSR ? 'Note On' : 'Play'}
                </button>
              </div>
            </section>

            {/* ADSR Section */}
            <section className="sound-section">
              <h3>ADSR Envelope</h3>
              <div className="sound-controls">
                <label className="effect-toggle">
                  <input type="checkbox" checked={enableADSR} onChange={e => setEnableADSR(e.target.checked)} />
                  Enable Envelope
                </label>
                {enableADSR && (
                  <>
                    <div className="sound-slider">
                      <label>Attack</label>
                      <input type="range" min={0.001} max={2} step={0.01} value={attack}
                        onChange={e => setAttack(parseFloat(e.target.value))} />
                      <span>{attack.toFixed(2)}s</span>
                    </div>
                    <div className="sound-slider">
                      <label>Decay</label>
                      <input type="range" min={0.01} max={2} step={0.01} value={decay}
                        onChange={e => setDecay(parseFloat(e.target.value))} />
                      <span>{decay.toFixed(2)}s</span>
                    </div>
                    <div className="sound-slider">
                      <label>Sustain</label>
                      <input type="range" min={0} max={1} step={0.01} value={sustain}
                        onChange={e => setSustain(parseFloat(e.target.value))} />
                      <span>{(sustain * 100).toFixed(0)}%</span>
                    </div>
                    <div className="sound-slider">
                      <label>Release</label>
                      <input type="range" min={0.01} max={3} step={0.01} value={release}
                        onChange={e => setRelease(parseFloat(e.target.value))} />
                      <span>{release.toFixed(2)}s</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* LFO Section */}
            <section className="sound-section">
              <h3>LFO Modulation</h3>
              <div className="sound-controls">
                <label className="effect-toggle">
                  <input type="checkbox" checked={enableLFO} onChange={e => setEnableLFO(e.target.checked)} />
                  Enable LFO
                </label>
                {enableLFO && (
                  <>
                    <div className="sound-row">
                      <label>Shape</label>
                      <select value={lfoType} onChange={e => setLfoType(e.target.value as OscillatorType)}>
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                        <option value="sawtooth">Sawtooth</option>
                        <option value="triangle">Triangle</option>
                      </select>
                    </div>
                    <div className="sound-row">
                      <label>Target</label>
                      <select value={lfoTarget} onChange={e => setLfoTarget(e.target.value as LFOTarget)}>
                        <option value="gain">Gain (Tremolo)</option>
                        <option value="frequency">Frequency (Vibrato)</option>
                        <option value="filter">Filter (Wobble)</option>
                      </select>
                    </div>
                    <div className="sound-slider">
                      <label>Rate</label>
                      <input type="range" min={0.1} max={20} step={0.1} value={lfoFrequency}
                        onChange={e => setLfoFrequency(parseFloat(e.target.value))} />
                      <span>{lfoFrequency.toFixed(1)} Hz</span>
                    </div>
                    <div className="sound-slider">
                      <label>Depth</label>
                      <input type="range" min={0} max={1} step={0.01} value={lfoDepth}
                        onChange={e => setLfoDepth(parseFloat(e.target.value))} />
                      <span>{(lfoDepth * 100).toFixed(0)}%</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Noise Section */}
            <section className="sound-section">
              <h3>Noise Generator</h3>
              <div className="sound-controls">
                <div className="sound-row">
                  <label>Type</label>
                  <select value={noiseType} onChange={e => setNoiseType(e.target.value as NoiseType)}>
                    <option value="white">White Noise</option>
                    <option value="pink">Pink Noise</option>
                    <option value="brown">Brown Noise</option>
                  </select>
                </div>
                <div className="sound-slider">
                  <label>Gain</label>
                  <input type="range" min={0} max={1} step={0.01} value={noiseGain}
                    onChange={e => setNoiseGain(parseFloat(e.target.value))} />
                  <span>{(noiseGain * 100).toFixed(0)}%</span>
                </div>
                <button className="btn btn-primary" onClick={playNoise} disabled={!isInitialized}>
                  Play Noise
                </button>
              </div>
            </section>

            {/* Filter Section */}
            <section className="sound-section">
              <h3>Filter</h3>
              <div className="sound-controls">
                <label className="effect-toggle">
                  <input type="checkbox" checked={enableFilter} onChange={e => setEnableFilter(e.target.checked)} />
                  Enable Filter
                </label>
                {enableFilter && (
                  <>
                    <div className="sound-row">
                      <label>Type</label>
                      <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)}>
                        <option value="lowpass">Low-pass</option>
                        <option value="highpass">High-pass</option>
                        <option value="bandpass">Band-pass</option>
                        <option value="notch">Notch</option>
                        <option value="lowshelf">Low Shelf</option>
                        <option value="highshelf">High Shelf</option>
                        <option value="peaking">Peaking EQ</option>
                      </select>
                    </div>
                    <div className="sound-slider">
                      <label>Cutoff</label>
                      <input type="range" min={20} max={20000} step={10} value={filterFreq}
                        onChange={e => setFilterFreq(parseInt(e.target.value))} />
                      <span>{filterFreq} Hz</span>
                    </div>
                    <div className="sound-slider">
                      <label>Q</label>
                      <input type="range" min={0.1} max={20} step={0.1} value={filterQ}
                        onChange={e => setFilterQ(parseFloat(e.target.value))} />
                      <span>{filterQ.toFixed(1)}</span>
                    </div>
                    {['lowshelf', 'highshelf', 'peaking'].includes(filterType) && (
                      <div className="sound-slider">
                        <label>Gain</label>
                        <input type="range" min={-40} max={40} step={1} value={filterGain}
                          onChange={e => setFilterGain(parseInt(e.target.value))} />
                        <span>{filterGain} dB</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Effects Section */}
            <section className="sound-section">
              <h3>Effects</h3>
              <div className="sound-controls">
                {/* Delay */}
                <div className="effect-group">
                  <label className="effect-toggle">
                    <input type="checkbox" checked={enableDelay} onChange={e => setEnableDelay(e.target.checked)} />
                    Delay
                  </label>
                  {enableDelay && (
                    <>
                      <div className="sound-slider">
                        <label>Time</label>
                        <input type="range" min={0.01} max={1} step={0.01} value={delayTime}
                          onChange={e => setDelayTime(parseFloat(e.target.value))} />
                        <span>{(delayTime * 1000).toFixed(0)} ms</span>
                      </div>
                      <div className="sound-slider">
                        <label>Feedback</label>
                        <input type="range" min={0} max={0.9} step={0.01} value={delayFeedback}
                          onChange={e => setDelayFeedback(parseFloat(e.target.value))} />
                        <span>{(delayFeedback * 100).toFixed(0)}%</span>
                      </div>
                      <div className="sound-slider">
                        <label>Wet</label>
                        <input type="range" min={0} max={1} step={0.01} value={delayWet}
                          onChange={e => setDelayWet(parseFloat(e.target.value))} />
                        <span>{(delayWet * 100).toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Reverb */}
                <div className="effect-group">
                  <label className="effect-toggle">
                    <input type="checkbox" checked={enableReverb} onChange={e => setEnableReverb(e.target.checked)} />
                    Reverb
                  </label>
                  {enableReverb && (
                    <div className="sound-slider">
                      <label>Wet</label>
                      <input type="range" min={0} max={1} step={0.01} value={reverbWet}
                        onChange={e => setReverbWet(parseFloat(e.target.value))} />
                      <span>{(reverbWet * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Distortion */}
                <div className="effect-group">
                  <label className="effect-toggle">
                    <input type="checkbox" checked={enableDistortion} onChange={e => setEnableDistortion(e.target.checked)} />
                    Distortion
                  </label>
                  {enableDistortion && (
                    <div className="sound-slider">
                      <label>Amount</label>
                      <input type="range" min={0} max={100} step={1} value={distortionAmount}
                        onChange={e => setDistortionAmount(parseInt(e.target.value))} />
                      <span>{distortionAmount}</span>
                    </div>
                  )}
                </div>

                {/* Compressor */}
                <div className="effect-group">
                  <label className="effect-toggle">
                    <input type="checkbox" checked={enableCompressor} onChange={e => setEnableCompressor(e.target.checked)} />
                    Compressor
                  </label>
                </div>
              </div>
            </section>

            {/* Spatial Audio Section */}
            <section className="sound-section">
              <h3>Spatial Audio</h3>
              <div className="sound-controls">
                <label className="effect-toggle">
                  <input type="checkbox" checked={enableSpatial} onChange={e => setEnableSpatial(e.target.checked)} />
                  Enable 3D Positioning
                </label>
                {enableSpatial && (
                  <>
                    <div className="sound-slider">
                      <label>X (L/R)</label>
                      <input type="range" min={-10} max={10} step={0.1} value={spatialX}
                        onChange={e => setSpatialX(parseFloat(e.target.value))} />
                      <span>{spatialX.toFixed(1)}</span>
                    </div>
                    <div className="sound-slider">
                      <label>Y (U/D)</label>
                      <input type="range" min={-10} max={10} step={0.1} value={spatialY}
                        onChange={e => setSpatialY(parseFloat(e.target.value))} />
                      <span>{spatialY.toFixed(1)}</span>
                    </div>
                    <div className="sound-slider">
                      <label>Z (F/B)</label>
                      <input type="range" min={-20} max={0} step={0.1} value={spatialZ}
                        onChange={e => setSpatialZ(parseFloat(e.target.value))} />
                      <span>{spatialZ.toFixed(1)}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Sample Library */}
            <section className="sound-section">
              <h3>Sample Library</h3>
              <div className="sound-controls">
                <div className="sample-upload">
                  <label className="upload-btn">
                    Upload Samples
                    <input type="file" accept="audio/*" multiple onChange={handleSampleUpload}
                      disabled={!isInitialized} style={{ display: 'none' }} />
                  </label>
                </div>

                <div className="sound-slider">
                  <label>Rate</label>
                  <input type="range" min={0.25} max={4} step={0.05} value={samplePlaybackRate}
                    onChange={e => setSamplePlaybackRate(parseFloat(e.target.value))} />
                  <span>{samplePlaybackRate.toFixed(2)}x</span>
                </div>

                <label className="effect-toggle">
                  <input type="checkbox" checked={sampleLoop} onChange={e => setSampleLoop(e.target.checked)} />
                  Loop
                </label>

                {loadedSamples.length > 0 && (
                  <div className="sample-list">
                    {loadedSamples.map(sample => (
                      <div key={sample.id} className="sample-item">
                        <span className="sample-name">{sample.name}</span>
                        <span className="sample-duration">{sample.duration.toFixed(2)}s</span>
                        <button onClick={() => playSample(sample.id, sample.name)} disabled={!isInitialized}>Play</button>
                        <button onClick={() => removeSample(sample.id)} className="remove-btn">x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Active Sounds */}
            <section className="sound-section">
              <h3>Active Sounds ({activeSounds.length})</h3>
              <div className="sound-controls">
                {activeSounds.length > 0 && (
                  <>
                    <button className="btn btn-secondary stop-all-btn" onClick={stopAllSounds}>Stop All</button>
                    <div className="active-sounds-list">
                      {activeSounds.map(s => (
                        <div key={s.id} className="active-sound-item">
                          <span>{s.name}</span>
                          <div className="sound-actions">
                            {enableADSR && (
                              <button onClick={() => releaseSound(s.id)}>Release</button>
                            )}
                            <button onClick={() => stopSound(s.id)}>Stop</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {activeSounds.length === 0 && <p className="no-sounds">No sounds playing</p>}
              </div>
            </section>
          </>
        )}

        {currentMode === 'presets' && (
          <>
            <section className="sound-section full-width">
              <h3>Audio Context</h3>
              {!isInitialized ? (
                <button className="btn btn-primary" onClick={initializeAudio}>Initialize Audio</button>
              ) : (
                <span className="sound-status active">Audio Active</span>
              )}
            </section>

            {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
              <section key={category} className="sound-section full-width">
                <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                <div className="preset-grid">
                  {categoryPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => playPreset(preset.id)}
                      disabled={!isInitialized}
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </section>
            ))}

            {activeSounds.length > 0 && (
              <section className="sound-section full-width">
                <h3>Active Sounds</h3>
                <button className="btn btn-secondary" onClick={stopAllSounds}>Stop All</button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
