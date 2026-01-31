import { useState, useEffect, useCallback } from 'react'
import {
  soundEngine,
  type OscillatorType,
  type NoiseType,
  type PlayingSound,
  type LoadedSample,
  type EffectChainConfig,
  type SpatialPosition
} from '../audio/SoundEngine'

interface ActiveSound {
  id: string
  name: string
  sound: PlayingSound
}

export function SoundDebugPage({ onClose }: { onClose: () => void }) {
  // Audio engine state
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.5)

  // Oscillator state
  const [oscType, setOscType] = useState<OscillatorType>('sine')
  const [oscFrequency, setOscFrequency] = useState(440)
  const [oscGain, setOscGain] = useState(0.3)

  // Noise state
  const [noiseType, setNoiseType] = useState<NoiseType>('white')
  const [noiseGain, setNoiseGain] = useState(0.2)

  // Effects state
  const [enableLowpass, setEnableLowpass] = useState(false)
  const [lowpassFreq, setLowpassFreq] = useState(2000)
  const [lowpassQ, setLowpassQ] = useState(1)
  const [enableHighpass, setEnableHighpass] = useState(false)
  const [highpassFreq, setHighpassFreq] = useState(200)
  const [highpassQ, setHighpassQ] = useState(1)
  const [enableDelay, setEnableDelay] = useState(false)
  const [delayTime, setDelayTime] = useState(0.3)
  const [delayFeedback, setDelayFeedback] = useState(0.4)
  const [enableReverb, setEnableReverb] = useState(false)
  const [reverbWet, setReverbWet] = useState(0.3)

  // Spatial audio state
  const [enableSpatial, setEnableSpatial] = useState(false)
  const [spatialX, setSpatialX] = useState(0)
  const [spatialY, setSpatialY] = useState(0)
  const [spatialZ, setSpatialZ] = useState(-5)

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

  useEffect(() => {
    return () => {
      // Stop all sounds when unmounting
      activeSounds.forEach(s => s.sound.stop())
    }
  }, [])

  // Build current effect chain config
  const getEffectChainConfig = useCallback((): EffectChainConfig | undefined => {
    const config: EffectChainConfig = {}

    if (enableLowpass) {
      config.lowpass = { frequency: lowpassFreq, Q: lowpassQ }
    }
    if (enableHighpass) {
      config.highpass = { frequency: highpassFreq, Q: highpassQ }
    }
    if (enableDelay) {
      config.delay = { time: delayTime, feedback: delayFeedback }
    }
    if (enableReverb) {
      config.reverb = { decay: 2, wet: reverbWet }
    }

    return Object.keys(config).length > 0 ? config : undefined
  }, [enableLowpass, lowpassFreq, lowpassQ, enableHighpass, highpassFreq, highpassQ, enableDelay, delayTime, delayFeedback, enableReverb, reverbWet])

  // Get spatial position if enabled
  const getSpatialPosition = useCallback((): SpatialPosition | undefined => {
    if (!enableSpatial) return undefined
    return { x: spatialX, y: spatialY, z: spatialZ }
  }, [enableSpatial, spatialX, spatialY, spatialZ])

  // Play oscillator
  const playOscillator = useCallback(() => {
    if (!isInitialized) return

    const sound = soundEngine.playOscillator(oscType, oscFrequency, {
      gain: oscGain,
      effects: getEffectChainConfig(),
      position: getSpatialPosition()
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: `${oscType} ${oscFrequency}Hz`,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, oscType, oscFrequency, oscGain, getEffectChainConfig, getSpatialPosition])

  // Play noise
  const playNoise = useCallback(() => {
    if (!isInitialized) return

    const sound = soundEngine.playNoise(noiseType, {
      gain: noiseGain,
      effects: getEffectChainConfig(),
      position: getSpatialPosition()
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: `${noiseType} noise`,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, noiseType, noiseGain, getEffectChainConfig, getSpatialPosition])

  // Handle sample upload
  const handleSampleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isInitialized || !e.target.files?.length) return

    const file = e.target.files[0]
    const sample = await soundEngine.loadSample(file)

    if (sample) {
      setLoadedSamples(soundEngine.getLoadedSamples())
    }

    // Reset input
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
      playbackRate: samplePlaybackRate
    })

    if (sound) {
      const activeSound: ActiveSound = {
        id: sound.id,
        name: sampleName,
        sound
      }
      setActiveSounds(prev => [...prev, activeSound])
    }
  }, [isInitialized, oscGain, getEffectChainConfig, getSpatialPosition, sampleLoop, samplePlaybackRate])

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

  // Quick test presets
  const playPreset = useCallback((preset: string) => {
    if (!isInitialized) return

    switch (preset) {
      case 'bass': {
        const sound = soundEngine.playOscillator('sine', 80, {
          gain: 0.4,
          effects: { lowpass: { frequency: 200 } }
        })
        if (sound) {
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Bass', sound }])
        }
        break
      }
      case 'hihat': {
        const sound = soundEngine.playNoise('white', {
          gain: 0.15,
          effects: { highpass: { frequency: 8000 } },
          duration: 0.1
        })
        if (sound) {
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Hi-hat', sound }])
          setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 150)
        }
        break
      }
      case 'kick': {
        const sound = soundEngine.playOscillator('sine', 150, {
          gain: 0.5,
          effects: { lowpass: { frequency: 100 } },
          duration: 0.15
        })
        if (sound) {
          // Quick pitch drop for kick drum feel
          let freq = 150
          const interval = setInterval(() => {
            freq *= 0.8
            if (sound.setFrequency) sound.setFrequency(freq)
            if (freq < 40) clearInterval(interval)
          }, 10)
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Kick', sound }])
          setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 200)
        }
        break
      }
      case 'laser': {
        const sound = soundEngine.playOscillator('sawtooth', 2000, {
          gain: 0.2,
          effects: { lowpass: { frequency: 4000, Q: 10 } },
          duration: 0.3
        })
        if (sound) {
          // Pitch drop
          let freq = 2000
          const interval = setInterval(() => {
            freq *= 0.95
            if (sound.setFrequency) sound.setFrequency(freq)
            if (freq < 200) clearInterval(interval)
          }, 10)
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Laser', sound }])
          setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 350)
        }
        break
      }
      case 'explosion': {
        const sound = soundEngine.playNoise('brown', {
          gain: 0.4,
          effects: {
            lowpass: { frequency: 800 },
            reverb: { decay: 1.5, wet: 0.5 }
          },
          duration: 1
        })
        if (sound) {
          // Fade out
          let gain = 0.4
          const interval = setInterval(() => {
            gain *= 0.95
            sound.setGain(gain)
            if (gain < 0.01) clearInterval(interval)
          }, 20)
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Explosion', sound }])
          setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 1100)
        }
        break
      }
      case 'ambient': {
        const sound = soundEngine.playNoise('pink', {
          gain: 0.1,
          effects: {
            lowpass: { frequency: 400 },
            reverb: { decay: 3, wet: 0.7 }
          }
        })
        if (sound) {
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Ambient', sound }])
        }
        break
      }
      case 'footstep': {
        const sound = soundEngine.playNoise('brown', {
          gain: 0.25,
          effects: {
            bandpass: { frequency: 200, Q: 2 }
          },
          duration: 0.08
        })
        if (sound) {
          setActiveSounds(prev => [...prev, { id: sound.id, name: 'Footstep', sound }])
          setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 100)
        }
        break
      }
      case 'powerup': {
        // Arpeggiated power-up sound
        const notes = [261, 329, 392, 523] // C major arpeggio
        notes.forEach((freq, i) => {
          setTimeout(() => {
            const sound = soundEngine.playOscillator('square', freq, {
              gain: 0.15,
              effects: { lowpass: { frequency: 2000 } },
              duration: 0.15
            })
            if (sound) {
              setActiveSounds(prev => [...prev, { id: sound.id, name: `PowerUp-${i}`, sound }])
              setTimeout(() => setActiveSounds(prev => prev.filter(s => s.id !== sound.id)), 200)
            }
          }, i * 80)
        })
        break
      }
    }
  }, [isInitialized])

  return (
    <div className="sound-debug-page">
      <div className="sound-debug-header">
        <h2>Sound Engine Debug</h2>
        <button className="sound-close-btn" onClick={onClose}>x</button>
      </div>

      <div className="sound-debug-content">
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
                <label>Master Volume</label>
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

        {/* Quick Presets */}
        <section className="sound-section">
          <h3>Quick Presets</h3>
          <div className="preset-grid">
            <button onClick={() => playPreset('kick')} disabled={!isInitialized}>Kick</button>
            <button onClick={() => playPreset('hihat')} disabled={!isInitialized}>Hi-hat</button>
            <button onClick={() => playPreset('bass')} disabled={!isInitialized}>Bass</button>
            <button onClick={() => playPreset('laser')} disabled={!isInitialized}>Laser</button>
            <button onClick={() => playPreset('explosion')} disabled={!isInitialized}>Explosion</button>
            <button onClick={() => playPreset('ambient')} disabled={!isInitialized}>Ambient</button>
            <button onClick={() => playPreset('footstep')} disabled={!isInitialized}>Footstep</button>
            <button onClick={() => playPreset('powerup')} disabled={!isInitialized}>Power-up</button>
          </div>
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
              <input
                type="range"
                min={20}
                max={2000}
                step={1}
                value={oscFrequency}
                onChange={e => setOscFrequency(parseInt(e.target.value))}
              />
              <span>{oscFrequency} Hz</span>
            </div>
            <div className="sound-slider">
              <label>Gain</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={oscGain}
                onChange={e => setOscGain(parseFloat(e.target.value))}
              />
              <span>{(oscGain * 100).toFixed(0)}%</span>
            </div>
            <button className="btn btn-primary" onClick={playOscillator} disabled={!isInitialized}>
              Play Oscillator
            </button>
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
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={noiseGain}
                onChange={e => setNoiseGain(parseFloat(e.target.value))}
              />
              <span>{(noiseGain * 100).toFixed(0)}%</span>
            </div>
            <button className="btn btn-primary" onClick={playNoise} disabled={!isInitialized}>
              Play Noise
            </button>
          </div>
        </section>

        {/* Effects Section */}
        <section className="sound-section">
          <h3>Effects</h3>
          <div className="sound-controls">
            {/* Low-pass Filter */}
            <div className="effect-group">
              <label className="effect-toggle">
                <input
                  type="checkbox"
                  checked={enableLowpass}
                  onChange={e => setEnableLowpass(e.target.checked)}
                />
                Low-pass Filter
              </label>
              {enableLowpass && (
                <>
                  <div className="sound-slider">
                    <label>Cutoff</label>
                    <input
                      type="range"
                      min={20}
                      max={20000}
                      step={10}
                      value={lowpassFreq}
                      onChange={e => setLowpassFreq(parseInt(e.target.value))}
                    />
                    <span>{lowpassFreq} Hz</span>
                  </div>
                  <div className="sound-slider">
                    <label>Q</label>
                    <input
                      type="range"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={lowpassQ}
                      onChange={e => setLowpassQ(parseFloat(e.target.value))}
                    />
                    <span>{lowpassQ.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>

            {/* High-pass Filter */}
            <div className="effect-group">
              <label className="effect-toggle">
                <input
                  type="checkbox"
                  checked={enableHighpass}
                  onChange={e => setEnableHighpass(e.target.checked)}
                />
                High-pass Filter
              </label>
              {enableHighpass && (
                <>
                  <div className="sound-slider">
                    <label>Cutoff</label>
                    <input
                      type="range"
                      min={20}
                      max={20000}
                      step={10}
                      value={highpassFreq}
                      onChange={e => setHighpassFreq(parseInt(e.target.value))}
                    />
                    <span>{highpassFreq} Hz</span>
                  </div>
                  <div className="sound-slider">
                    <label>Q</label>
                    <input
                      type="range"
                      min={0.1}
                      max={20}
                      step={0.1}
                      value={highpassQ}
                      onChange={e => setHighpassQ(parseFloat(e.target.value))}
                    />
                    <span>{highpassQ.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Delay */}
            <div className="effect-group">
              <label className="effect-toggle">
                <input
                  type="checkbox"
                  checked={enableDelay}
                  onChange={e => setEnableDelay(e.target.checked)}
                />
                Delay
              </label>
              {enableDelay && (
                <>
                  <div className="sound-slider">
                    <label>Time</label>
                    <input
                      type="range"
                      min={0.01}
                      max={1}
                      step={0.01}
                      value={delayTime}
                      onChange={e => setDelayTime(parseFloat(e.target.value))}
                    />
                    <span>{(delayTime * 1000).toFixed(0)} ms</span>
                  </div>
                  <div className="sound-slider">
                    <label>Feedback</label>
                    <input
                      type="range"
                      min={0}
                      max={0.9}
                      step={0.01}
                      value={delayFeedback}
                      onChange={e => setDelayFeedback(parseFloat(e.target.value))}
                    />
                    <span>{(delayFeedback * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Reverb */}
            <div className="effect-group">
              <label className="effect-toggle">
                <input
                  type="checkbox"
                  checked={enableReverb}
                  onChange={e => setEnableReverb(e.target.checked)}
                />
                Reverb
              </label>
              {enableReverb && (
                <div className="sound-slider">
                  <label>Wet</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={reverbWet}
                    onChange={e => setReverbWet(parseFloat(e.target.value))}
                  />
                  <span>{(reverbWet * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Spatial Audio Section */}
        <section className="sound-section">
          <h3>Spatial Audio</h3>
          <div className="sound-controls">
            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={enableSpatial}
                onChange={e => setEnableSpatial(e.target.checked)}
              />
              Enable 3D Positioning
            </label>
            {enableSpatial && (
              <>
                <div className="sound-slider">
                  <label>X (Left/Right)</label>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.1}
                    value={spatialX}
                    onChange={e => setSpatialX(parseFloat(e.target.value))}
                  />
                  <span>{spatialX.toFixed(1)}</span>
                </div>
                <div className="sound-slider">
                  <label>Y (Up/Down)</label>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.1}
                    value={spatialY}
                    onChange={e => setSpatialY(parseFloat(e.target.value))}
                  />
                  <span>{spatialY.toFixed(1)}</span>
                </div>
                <div className="sound-slider">
                  <label>Z (Front/Back)</label>
                  <input
                    type="range"
                    min={-20}
                    max={0}
                    step={0.1}
                    value={spatialZ}
                    onChange={e => setSpatialZ(parseFloat(e.target.value))}
                  />
                  <span>{spatialZ.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Sample Upload Section */}
        <section className="sound-section">
          <h3>Sample Library</h3>
          <div className="sound-controls">
            <div className="sample-upload">
              <label className="upload-btn">
                Upload Sample
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleSampleUpload}
                  disabled={!isInitialized}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="sound-slider">
              <label>Playback Rate</label>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.05}
                value={samplePlaybackRate}
                onChange={e => setSamplePlaybackRate(parseFloat(e.target.value))}
              />
              <span>{samplePlaybackRate.toFixed(2)}x</span>
            </div>

            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={sampleLoop}
                onChange={e => setSampleLoop(e.target.checked)}
              />
              Loop
            </label>

            {loadedSamples.length > 0 && (
              <div className="sample-list">
                {loadedSamples.map(sample => (
                  <div key={sample.id} className="sample-item">
                    <span className="sample-name">{sample.name}</span>
                    <span className="sample-duration">{sample.duration.toFixed(2)}s</span>
                    <button onClick={() => playSample(sample.id, sample.name)} disabled={!isInitialized}>
                      Play
                    </button>
                    <button onClick={() => removeSample(sample.id)} className="remove-btn">
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Active Sounds Section */}
        <section className="sound-section">
          <h3>Active Sounds ({activeSounds.length})</h3>
          <div className="sound-controls">
            {activeSounds.length > 0 && (
              <>
                <button className="btn btn-secondary stop-all-btn" onClick={stopAllSounds}>
                  Stop All
                </button>
                <div className="active-sounds-list">
                  {activeSounds.map(s => (
                    <div key={s.id} className="active-sound-item">
                      <span>{s.name}</span>
                      <button onClick={() => stopSound(s.id)}>Stop</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeSounds.length === 0 && (
              <p className="no-sounds">No sounds playing</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
