import { useState, useEffect, useCallback, useRef } from 'react'
import {
  soundEngine,
  type PlayingSound,
  type LoadedSample,
  type OscillatorType,
  EffectGraph,
  effectsRegistry,
  type EffectId,
} from '../audio'
import { presets, presetsByCategory } from '../audio/presets'
import { TrackVisualizer } from './TrackVisualizer'
import { EffectPanel } from './EffectPanel'
import { EffectDropdown } from './EffectDropdown'

// ============================================================================
// TYPES
// ============================================================================

interface TrackEffect {
  instanceId: string
  effectId: EffectId
  config: Record<string, unknown>
  enabled: boolean
}

interface Track {
  id: number
  sampleId: string | null
  playing: boolean
  loop: boolean
  volume: number
  effects: TrackEffect[]
  sound: PlayingSound | null
  effectGraph: EffectGraph | null
}

interface SoundboardSlot {
  sampleId: string | null
}

type KeybindAction =
  | { type: 'soundboard'; slot: number }
  | { type: 'track-fade'; trackId: number }

// ============================================================================
// STYLES
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  page: { position: 'fixed', inset: 0, overflow: 'auto', padding: 20, background: '#1a1a2e', color: '#fff', zIndex: 1000 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 },
  title: { fontSize: 24, fontWeight: 300, color: '#4ecdc4', margin: 0 },
  initSection: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 20, textAlign: 'center' as const },
  btn: { padding: '10px 20px', background: '#4ecdc4', color: '#1a1a2e', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  btnSmall: { padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnActive: { padding: '6px 12px', background: '#4ecdc4', color: '#1a1a2e', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnDanger: { padding: '4px 8px', background: 'rgba(255,100,100,0.2)', color: '#ff6666', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 },
  panel: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 16 },
  panelTitle: { fontSize: 11, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', marginBottom: 12, letterSpacing: 1 },
  dropzone: { border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: 30, textAlign: 'center' as const, cursor: 'pointer', marginBottom: 16 },
  dropzoneActive: { border: '2px dashed #4ecdc4', background: 'rgba(78,205,196,0.1)' },
  sampleList: { maxHeight: 200, overflow: 'auto' },
  sampleItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4, cursor: 'grab', fontSize: 13 },
  track: { background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 12, marginBottom: 10 },
  trackHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trackName: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  trackSample: { fontSize: 13, color: '#4ecdc4', flex: 1, marginLeft: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  trackControls: { display: 'flex', gap: 6, alignItems: 'center' },
  trackBody: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  trackSliders: { display: 'flex', flexDirection: 'column' as const, gap: 6, minWidth: 220, maxWidth: 280 },
  trackVis: { flex: 1, height: 80, background: 'rgba(0,0,0,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 6 },
  sliderLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 24, textTransform: 'uppercase' as const },
  slider: { width: 100, height: 4, appearance: 'none' as const, background: 'rgba(255,255,255,0.1)', borderRadius: 2, outline: 'none' },
  sliderValue: { fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 44, textAlign: 'right' as const },
  soundboard: { marginTop: 20 },
  soundboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  soundboardSlot: { background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, textAlign: 'center' as const, minHeight: 60, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
  soundboardKey: { fontSize: 18, fontWeight: 'bold', color: '#4ecdc4', marginBottom: 4 },
  soundboardName: { fontSize: 10, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '100%' },
  keybindSection: { marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  keybindSlot: { background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 10, textAlign: 'center' as const, cursor: 'pointer' },
  keybindListening: { background: 'rgba(78,205,196,0.2)', border: '1px solid #4ecdc4' },
  masterVolume: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  nowPlaying: { background: 'rgba(78,205,196,0.1)', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid rgba(78,205,196,0.2)' },
  nowPlayingHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nowPlayingList: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  nowPlayingItem: { background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SoundDebug({ onBack }: { onBack?: () => void }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.7)
  const [samples, setSamples] = useState<LoadedSample[]>([])
  const [nextTrackId, setNextTrackId] = useState(1)
  const [nextEffectId, setNextEffectId] = useState(0)
  const [tracks, setTracks] = useState<Track[]>(() => [{
    id: 0,
    sampleId: null,
    playing: false,
    loop: true,
    volume: 0.7,
    effects: [],
    sound: null,
    effectGraph: null,
  }])
  const [playingSoundsCount, setPlayingSoundsCount] = useState(0)
  const [trackPlaytimes, setTrackPlaytimes] = useState<Record<number, { startTime: number; offset: number }>>({})
  const [, forceUpdate] = useState(0) // For re-rendering playhead position
  const [soundboard, setSoundboard] = useState<SoundboardSlot[]>(() =>
    Array.from({ length: 5 }, () => ({ sampleId: null }))
  )
  const [keybinds, setKeybinds] = useState<Record<string, KeybindAction>>({})
  const [listeningForKey, setListeningForKey] = useState<KeybindAction | null>(null)
  const [dragOverZone, setDragOverZone] = useState(false)
  const [dragOverTrack, setDragOverTrack] = useState<number | null>(null)
  const [dragOverSoundboard, setDragOverSoundboard] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Synth palette state
  const [synthExpanded, setSynthExpanded] = useState(false)
  const [oscType, setOscType] = useState<OscillatorType>('sine')
  const [oscFrequency, setOscFrequency] = useState(440)
  const [oscGain, setOscGain] = useState(0.3)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sfx']))

  // Initialize audio
  const initializeAudio = useCallback(async () => {
    try {
      await soundEngine.initialize()
      await Promise.race([soundEngine.resume(), new Promise(r => setTimeout(r, 500))])
      soundEngine.setMasterVolume(masterVolume)
      setIsInitialized(true)
    } catch (e) {
      console.error('Audio init error', e)
    }
  }, [masterVolume])

  // Master volume
  useEffect(() => {
    if (isInitialized) soundEngine.setMasterVolume(masterVolume)
  }, [isInitialized, masterVolume])

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isInitialized) return

      // If listening for keybind
      if (listeningForKey) {
        const key = e.key.toLowerCase()
        setKeybinds(prev => ({ ...prev, [key]: listeningForKey }))
        setListeningForKey(null)
        e.preventDefault()
        return
      }

      // Check keybinds
      const action = keybinds[e.key.toLowerCase()]
      if (action) {
        e.preventDefault()
        if (action.type === 'soundboard') {
          playSoundboardSlot(action.slot)
        } else if (action.type === 'track-fade') {
          toggleTrackFade(action.trackId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInitialized, keybinds, listeningForKey, samples, tracks])

  // File upload handlers
  const handleFiles = async (files: FileList | null) => {
    if (!files || !isInitialized) return
    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/')) {
        const sample = await soundEngine.loadSample(file)
        if (sample) {
          setSamples(prev => [...prev, sample])
        }
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverZone(false)
    handleFiles(e.dataTransfer.files)
  }

  // Poll playing sounds count and update playhead
  useEffect(() => {
    if (!isInitialized) return
    const interval = setInterval(() => {
      setPlayingSoundsCount(soundEngine.getPlayingSounds().length)
      forceUpdate(n => n + 1) // Force update for playhead animation
    }, 50)
    return () => clearInterval(interval)
  }, [isInitialized])

  // Track functions
  const addTrack = () => {
    setTracks(prev => [...prev, {
      id: nextTrackId,
      sampleId: null,
      playing: false,
      loop: true,
      volume: 0.7,
      effects: [],
      sound: null,
      effectGraph: null,
    }])
    setNextTrackId(prev => prev + 1)
  }

  const removeTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (track?.sound) {
      track.sound.stop()
    }
    if (track?.effectGraph) {
      track.effectGraph.destroy()
    }
    setTracks(prev => prev.filter(t => t.id !== trackId))
  }

  const assignSampleToTrack = (trackId: number, sampleId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, sampleId, playing: false, sound: null } : t
    ))
  }

  const updateTrack = (trackId: number, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      const updated = { ...t, ...updates }

      // Apply volume changes to playing sound
      if (updated.sound && 'volume' in updates) {
        updated.sound.setGain(updates.volume!)
      }
      return updated
    }))
  }

  // Effect management for tracks
  const addEffectToTrack = (trackId: number, effectId: EffectId) => {
    const def = effectsRegistry[effectId]
    if (!def) return

    const instanceId = `${effectId}_${nextEffectId}`
    setNextEffectId(prev => prev + 1)

    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t

      const newEffect: TrackEffect = {
        instanceId,
        effectId,
        config: { ...def.defaults },
        enabled: true,
      }

      // Insert effect in order based on effect's order property
      const effects = [...t.effects]
      const insertIndex = effects.findIndex(e => {
        const eDef = effectsRegistry[e.effectId]
        return eDef && eDef.order > def.order
      })

      if (insertIndex === -1) {
        effects.push(newEffect)
      } else {
        effects.splice(insertIndex, 0, newEffect)
      }

      // Update live effect graph if playing
      if (t.effectGraph) {
        t.effectGraph.add(effectId, newEffect.config)
      }

      return { ...t, effects }
    }))
  }

  const updateTrackEffect = (trackId: number, instanceId: string, config: Partial<Record<string, unknown>>) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t

      const effects = t.effects.map(e => {
        if (e.instanceId !== instanceId) return e
        const newConfig = { ...e.config, ...config }

        // Update live effect graph if playing
        if (t.effectGraph) {
          t.effectGraph.update(instanceId, config)
        }

        return { ...e, config: newConfig }
      })

      return { ...t, effects }
    }))
  }

  const toggleTrackEffect = (trackId: number, instanceId: string, enabled: boolean) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t

      const effects = t.effects.map(e => {
        if (e.instanceId !== instanceId) return e

        // Update live effect graph if playing
        if (t.effectGraph) {
          t.effectGraph.setEnabled(instanceId, enabled)
        }

        return { ...e, enabled }
      })

      return { ...t, effects }
    }))
  }

  const removeTrackEffect = (trackId: number, instanceId: string) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t

      // Remove from live effect graph if playing
      if (t.effectGraph) {
        t.effectGraph.remove(instanceId)
      }

      return { ...t, effects: t.effects.filter(e => e.instanceId !== instanceId) }
    }))
  }

  const playTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track || !track.sampleId) return

    const ctx = soundEngine.getContext()
    const masterGain = soundEngine.getMasterGain()
    if (!ctx || !masterGain) return

    // Stop existing
    if (track.sound) {
      track.sound.stop()
    }
    if (track.effectGraph) {
      track.effectGraph.destroy()
    }

    // Create effect graph
    const effectGraph = new EffectGraph(ctx, effectsRegistry)

    // Add effects from track config
    for (const effect of track.effects) {
      const instanceId = effectGraph.add(effect.effectId, effect.config)
      if (!effect.enabled) {
        effectGraph.setEnabled(instanceId, false)
      }
    }

    // Play sample without built-in effects (we're using our own graph)
    const sound = soundEngine.playSample(track.sampleId, {
      gain: track.volume,
      loop: track.loop,
    })

    if (sound) {
      // Reconnect through our effect graph
      // Disconnect from master, route through effect graph
      sound.gainNode.disconnect()
      sound.gainNode.connect(effectGraph.input)
      effectGraph.output.connect(masterGain)

      setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, playing: true, sound, effectGraph } : t
      ))
      setTrackPlaytimes(prev => ({
        ...prev,
        [trackId]: { startTime: performance.now(), offset: 0 }
      }))
    }
  }

  const stopTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (track?.sound) {
      track.sound.stop()
    }
    if (track?.effectGraph) {
      track.effectGraph.destroy()
    }
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, playing: false, sound: null, effectGraph: null } : t
    ))
    setTrackPlaytimes(prev => {
      const next = { ...prev }
      delete next[trackId]
      return next
    })
  }

  const toggleTrackFade = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    if (track.playing) {
      // Fade out
      if (track.sound) {
        const startVol = track.volume
        let vol = startVol
        const fade = setInterval(() => {
          vol -= 0.05
          if (vol <= 0) {
            clearInterval(fade)
            stopTrack(trackId)
            updateTrack(trackId, { volume: startVol })
          } else {
            track.sound?.setGain(vol)
          }
        }, 30)
      }
    } else if (track.sampleId) {
      // Fade in
      const targetVol = track.volume
      updateTrack(trackId, { volume: 0 })
      setTimeout(() => {
        playTrack(trackId)
        let vol = 0
        const fade = setInterval(() => {
          vol += 0.05
          if (vol >= targetVol) {
            clearInterval(fade)
            updateTrack(trackId, { volume: targetVol })
          } else {
            const t = tracks.find(t => t.id === trackId)
            t?.sound?.setGain(vol)
          }
        }, 30)
      }, 50)
    }
  }

  // Soundboard functions
  const assignSampleToSoundboard = (slot: number, sampleId: string) => {
    setSoundboard(prev => prev.map((s, i) =>
      i === slot ? { sampleId } : s
    ))
  }

  const playSoundboardSlot = (slot: number) => {
    const s = soundboard[slot]
    if (s?.sampleId) {
      soundEngine.playSample(s.sampleId, { gain: 0.8 })
    }
  }

  // Keybind functions
  const startListeningForKey = (action: KeybindAction) => {
    setListeningForKey(action)
  }

  const getKeyForAction = (action: KeybindAction): string | null => {
    for (const [key, a] of Object.entries(keybinds)) {
      if (a.type === action.type) {
        if (action.type === 'soundboard' && a.type === 'soundboard' && a.slot === action.slot) return key
        if (action.type === 'track-fade' && a.type === 'track-fade' && a.trackId === action.trackId) return key
      }
    }
    return null
  }

  // Drag handlers for samples
  const handleSampleDragStart = (e: React.DragEvent, sampleId: string) => {
    e.dataTransfer.setData('sampleId', sampleId)
  }

  // Synth palette functions
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const playOscillator = () => {
    soundEngine.playOscillator(oscType, oscFrequency, { gain: oscGain })
  }

  const playPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId)
    if (preset) preset.play()
  }

  const stopAllSounds = () => {
    soundEngine.stopAll()
    setTracks(prev => prev.map(t => ({ ...t, playing: false, sound: null })))
  }

  const getPlayingSoundsList = () => {
    return soundEngine.getPlayingSounds()
  }

  const getTrackCurrentTime = (track: Track): number => {
    const playtime = trackPlaytimes[track.id]
    if (!playtime || !track.playing) return 0
    const sample = samples.find(s => s.id === track.sampleId)
    if (!sample) return 0
    const elapsed = (performance.now() - playtime.startTime) / 1000
    if (track.loop) {
      return elapsed % sample.duration
    }
    return Math.min(elapsed, sample.duration)
  }

  if (!isInitialized) {
    return (
      <div style={S.page}>
        <header style={S.header}>
          {onBack && <button style={S.backBtn} onClick={onBack}>← Back</button>}
          <h1 style={S.title}>Sound Workstation</h1>
          <div />
        </header>
        <div style={S.initSection}>
          <p style={{ marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Click to initialize WebAudio</p>
          <button style={S.btn} onClick={initializeAudio}>Initialize Audio</button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        {onBack && <button style={S.backBtn} onClick={onBack}>← Back</button>}
        <h1 style={S.title}>Sound Workstation</h1>
        <div style={S.masterVolume}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Master</span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={masterVolume}
            onChange={e => setMasterVolume(+e.target.value)}
            style={{ width: 100 }}
          />
          <span style={{ fontSize: 12, color: '#4ecdc4' }}>{Math.round(masterVolume * 100)}%</span>
        </div>
      </header>

      <div style={S.layout}>
        {/* Left Panel: Upload & Library */}
        <div>
          <div style={S.panel}>
            <div style={S.panelTitle}>Upload Audio</div>
            <div
              style={{ ...S.dropzone, ...(dragOverZone ? S.dropzoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOverZone(true) }}
              onDragLeave={() => setDragOverZone(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Drop audio files here</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>or click to browse</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>

          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.panelTitle}>Library ({samples.length})</div>
            <div style={S.sampleList}>
              {samples.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No samples loaded
                </div>
              )}
              {samples.map(s => (
                <div
                  key={s.id}
                  style={S.sampleItem}
                  draggable
                  onDragStart={e => handleSampleDragStart(e, s.id)}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                    {s.duration.toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Synth Palette */}
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div
              style={{ ...S.panelTitle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => setSynthExpanded(!synthExpanded)}
            >
              <span>Synth Palette</span>
              <span>{synthExpanded ? '−' : '+'}</span>
            </div>

            {synthExpanded && (
              <>
                {/* Oscillator */}
                <div style={{ marginBottom: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>OSCILLATOR</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map(t => (
                      <button
                        key={t}
                        style={oscType === t ? S.btnActive : S.btnSmall}
                        onClick={() => setOscType(t)}
                      >
                        {t.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                  <div style={S.sliderRow}>
                    <span style={S.sliderLabel}>Hz</span>
                    <input
                      type="range" min={50} max={2000} step={10}
                      value={oscFrequency}
                      onChange={e => setOscFrequency(+e.target.value)}
                      style={S.slider}
                    />
                    <span style={{ ...S.sliderValue, width: 60 }}>{oscFrequency}Hz</span>
                  </div>
                  <div style={S.sliderRow}>
                    <span style={S.sliderLabel}>Vol</span>
                    <input
                      type="range" min={0} max={1} step={0.01}
                      value={oscGain}
                      onChange={e => setOscGain(+e.target.value)}
                      style={S.slider}
                    />
                    <span style={S.sliderValue}>{Math.round(oscGain * 100)}%</span>
                  </div>
                  <button style={{ ...S.btn, width: '100%', marginTop: 8 }} onClick={playOscillator}>
                    Play Tone
                  </button>
                </div>

                {/* Preset Categories */}
                {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                  <div key={category} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.5)',
                        padding: '6px 8px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => toggleCategory(category)}
                    >
                      <span>{category.toUpperCase()}</span>
                      <span>{expandedCategories.has(category) ? '−' : '+'}</span>
                    </div>
                    {expandedCategories.has(category) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {categoryPresets.map(p => (
                          <button
                            key={p.id}
                            style={{
                              ...S.btnSmall,
                              fontSize: 10,
                              padding: '4px 8px',
                            }}
                            onClick={() => playPreset(p.id)}
                            title={p.description}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Panel: Tracks */}
        <div>
          {/* Now Playing Status */}
          {playingSoundsCount > 0 && (
            <div style={S.nowPlaying}>
              <div style={S.nowPlayingHeader}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Now Playing ({playingSoundsCount})
                </span>
                <button style={S.btnDanger} onClick={stopAllSounds}>Stop All</button>
              </div>
              <div style={S.nowPlayingList}>
                {getPlayingSoundsList().map(sound => (
                  <div key={sound.id} style={S.nowPlayingItem}>
                    <span>{sound.type}</span>
                    <button
                      style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: 10, padding: 0 }}
                      onClick={() => sound.stop()}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={S.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={S.panelTitle}>Tracks ({tracks.length})</div>
              <button style={S.btnSmall} onClick={addTrack}>+ Add Track</button>
            </div>
            {tracks.map(track => (
              <div
                key={track.id}
                style={{
                  ...S.track,
                  ...(dragOverTrack === track.id ? { background: 'rgba(78,205,196,0.1)', border: '1px solid #4ecdc4' } : {}),
                }}
                onDragOver={e => { e.preventDefault(); setDragOverTrack(track.id) }}
                onDragLeave={() => setDragOverTrack(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverTrack(null)
                  const sampleId = e.dataTransfer.getData('sampleId')
                  if (sampleId) assignSampleToTrack(track.id, sampleId)
                }}
              >
                <div style={S.trackHeader}>
                  <span style={S.trackName}>Track {track.id + 1}</span>
                  <span style={S.trackSample}>
                    {track.sampleId ? samples.find(s => s.id === track.sampleId)?.name || '—' : '(drag sample here)'}
                  </span>
                  <div style={S.trackControls}>
                    <button
                      style={track.loop ? S.btnActive : S.btnSmall}
                      onClick={() => updateTrack(track.id, { loop: !track.loop })}
                    >Loop</button>
                    {track.playing ? (
                      <button style={S.btnSmall} onClick={() => stopTrack(track.id)}>Stop</button>
                    ) : (
                      <button
                        style={S.btnSmall}
                        onClick={() => playTrack(track.id)}
                        disabled={!track.sampleId}
                      >Play</button>
                    )}
                    {tracks.length > 1 && (
                      <button style={S.btnDanger} onClick={() => removeTrack(track.id)}>Remove</button>
                    )}
                  </div>
                </div>

                <div style={S.trackBody}>
                  <div style={S.trackSliders}>
                    {/* Volume slider always visible */}
                    <div style={S.sliderRow}>
                      <span style={S.sliderLabel}>Vol</span>
                      <input
                        type="range" min={0} max={1} step={0.01}
                        value={track.volume}
                        onChange={e => updateTrack(track.id, { volume: +e.target.value })}
                        style={S.slider}
                      />
                      <span style={S.sliderValue}>{Math.round(track.volume * 100)}%</span>
                    </div>

                    {/* Effect panels */}
                    {track.effects.map(effect => {
                      const def = effectsRegistry[effect.effectId]
                      if (!def) return null
                      return (
                        <EffectPanel
                          key={effect.instanceId}
                          def={def}
                          config={effect.config}
                          enabled={effect.enabled}
                          onUpdate={(config) => updateTrackEffect(track.id, effect.instanceId, config)}
                          onToggle={(enabled) => toggleTrackEffect(track.id, effect.instanceId, enabled)}
                          onRemove={() => removeTrackEffect(track.id, effect.instanceId)}
                        />
                      )
                    })}

                    {/* Add effect dropdown */}
                    <EffectDropdown
                      onAdd={(effectId) => addEffectToTrack(track.id, effectId)}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <TrackVisualizer
                      audioBuffer={track.sampleId ? samples.find(s => s.id === track.sampleId)?.buffer ?? null : null}
                      isPlaying={track.playing}
                      currentTime={getTrackCurrentTime(track)}
                      loop={track.loop}
                      duration={samples.find(s => s.id === track.sampleId)?.duration ?? 0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Soundboard */}
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.panelTitle}>Soundboard (one-shots)</div>
            <div style={S.soundboardGrid}>
              {soundboard.map((slot, i) => {
                const key = getKeyForAction({ type: 'soundboard', slot: i })
                return (
                  <div
                    key={i}
                    style={{
                      ...S.soundboardSlot,
                      ...(dragOverSoundboard === i ? { background: 'rgba(78,205,196,0.1)', border: '1px solid #4ecdc4' } : {}),
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverSoundboard(i) }}
                    onDragLeave={() => setDragOverSoundboard(null)}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOverSoundboard(null)
                      const sampleId = e.dataTransfer.getData('sampleId')
                      if (sampleId) assignSampleToSoundboard(i, sampleId)
                    }}
                    onClick={() => playSoundboardSlot(i)}
                  >
                    <div style={S.soundboardKey}>{key?.toUpperCase() || '?'}</div>
                    <div style={S.soundboardName}>
                      {slot.sampleId ? samples.find(s => s.id === slot.sampleId)?.name : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Keybinds */}
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.panelTitle}>
              Keybinds {listeningForKey && <span style={{ color: '#4ecdc4' }}>— Press a key...</span>}
            </div>
            <div style={S.keybindSection}>
              {soundboard.map((_, i) => {
                const action: KeybindAction = { type: 'soundboard', slot: i }
                const key = getKeyForAction(action)
                const isListening = listeningForKey?.type === 'soundboard' && listeningForKey.slot === i
                return (
                  <div
                    key={`sb-${i}`}
                    style={{ ...S.keybindSlot, ...(isListening ? S.keybindListening : {}) }}
                    onClick={() => startListeningForKey(action)}
                  >
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Slot {i + 1}</div>
                    <div style={{ fontSize: 14, color: '#4ecdc4', marginTop: 4 }}>{key?.toUpperCase() || '—'}</div>
                  </div>
                )
              })}
              {tracks.map(t => {
                const action: KeybindAction = { type: 'track-fade', trackId: t.id }
                const key = getKeyForAction(action)
                const isListening = listeningForKey?.type === 'track-fade' && listeningForKey.trackId === t.id
                return (
                  <div
                    key={`tf-${t.id}`}
                    style={{ ...S.keybindSlot, ...(isListening ? S.keybindListening : {}) }}
                    onClick={() => startListeningForKey(action)}
                  >
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>T{t.id + 1} Fade</div>
                    <div style={{ fontSize: 14, color: '#4ecdc4', marginTop: 4 }}>{key?.toUpperCase() || '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
