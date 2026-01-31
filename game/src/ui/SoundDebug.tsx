import { useState, useEffect, useCallback, useRef } from 'react'
import {
  soundEngine,
  type PlayingSound,
  type LoadedSample,
  type OscillatorType,
} from '../audio'
import { presets, presetsByCategory } from '../audio/presets'

// ============================================================================
// TYPES
// ============================================================================

interface Track {
  id: number
  sampleId: string | null
  playing: boolean
  loop: boolean
  volume: number
  lowpass: number   // Hz, 20000 = off
  highpass: number  // Hz, 20 = off
  sound: PlayingSound | null
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
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 },
  panel: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 16 },
  panelTitle: { fontSize: 11, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', marginBottom: 12, letterSpacing: 1 },
  dropzone: { border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: 30, textAlign: 'center' as const, cursor: 'pointer', marginBottom: 16 },
  dropzoneActive: { border: '2px dashed #4ecdc4', background: 'rgba(78,205,196,0.1)' },
  sampleList: { maxHeight: 200, overflow: 'auto' },
  sampleItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4, cursor: 'grab', fontSize: 13 },
  track: { background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 12, marginBottom: 10 },
  trackHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  trackName: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  trackSample: { fontSize: 13, color: '#4ecdc4', flex: 1, marginLeft: 10 },
  trackControls: { display: 'flex', gap: 8, alignItems: 'center' },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  sliderLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 25 },
  slider: { flex: 1, height: 4 },
  sliderValue: { fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 50, textAlign: 'right' as const },
  soundboard: { marginTop: 20 },
  soundboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  soundboardSlot: { background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 12, textAlign: 'center' as const, minHeight: 60, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
  soundboardKey: { fontSize: 18, fontWeight: 'bold', color: '#4ecdc4', marginBottom: 4 },
  soundboardName: { fontSize: 10, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '100%' },
  keybindSection: { marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  keybindSlot: { background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: 10, textAlign: 'center' as const, cursor: 'pointer' },
  keybindListening: { background: 'rgba(78,205,196,0.2)', border: '1px solid #4ecdc4' },
  masterVolume: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SoundDebug({ onBack }: { onBack?: () => void }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.7)
  const [samples, setSamples] = useState<LoadedSample[]>([])
  const [tracks, setTracks] = useState<Track[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      sampleId: null,
      playing: false,
      loop: true,
      volume: 0.7,
      lowpass: 20000,
      highpass: 20,
      sound: null,
    }))
  )
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

  // Track functions
  const assignSampleToTrack = (trackId: number, sampleId: string) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, sampleId, playing: false, sound: null } : t
    ))
  }

  const updateTrack = (trackId: number, updates: Partial<Track>) => {
    setTracks(prev => prev.map(t => {
      if (t.id !== trackId) return t
      const updated = { ...t, ...updates }

      // Apply filter changes to playing sound
      if (updated.sound) {
        if ('volume' in updates) {
          updated.sound.setGain(updates.volume!)
        }
        if ('lowpass' in updates && updated.sound.setFilterFrequency) {
          // Note: This applies to first filter in chain
          updated.sound.setFilterFrequency(updates.lowpass!)
        }
      }
      return updated
    }))
  }

  const playTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track || !track.sampleId) return

    // Stop existing
    if (track.sound) {
      track.sound.stop()
    }

    const sound = soundEngine.playSample(track.sampleId, {
      gain: track.volume,
      loop: track.loop,
      effects: {
        lowpass: track.lowpass < 20000 ? { frequency: track.lowpass, Q: 1 } : undefined,
        highpass: track.highpass > 20 ? { frequency: track.highpass, Q: 1 } : undefined,
      },
    })

    if (sound) {
      setTracks(prev => prev.map(t =>
        t.id === trackId ? { ...t, playing: true, sound } : t
      ))
    }
  }

  const stopTrack = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (track?.sound) {
      track.sound.stop()
    }
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, playing: false, sound: null } : t
    ))
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
              <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
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
          <div style={S.panel}>
            <div style={S.panelTitle}>Tracks</div>
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
                      title="Loop"
                    >🔁</button>
                    {track.playing ? (
                      <button style={S.btnSmall} onClick={() => stopTrack(track.id)}>⏹</button>
                    ) : (
                      <button
                        style={S.btnSmall}
                        onClick={() => playTrack(track.id)}
                        disabled={!track.sampleId}
                      >▶</button>
                    )}
                  </div>
                </div>

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

                <div style={S.sliderRow}>
                  <span style={S.sliderLabel}>LP</span>
                  <input
                    type="range" min={100} max={20000} step={100}
                    value={track.lowpass}
                    onChange={e => updateTrack(track.id, { lowpass: +e.target.value })}
                    style={S.slider}
                  />
                  <span style={S.sliderValue}>{track.lowpass >= 20000 ? 'Off' : `${track.lowpass}Hz`}</span>
                </div>

                <div style={S.sliderRow}>
                  <span style={S.sliderLabel}>HP</span>
                  <input
                    type="range" min={20} max={5000} step={20}
                    value={track.highpass}
                    onChange={e => updateTrack(track.id, { highpass: +e.target.value })}
                    style={S.slider}
                  />
                  <span style={S.sliderValue}>{track.highpass <= 20 ? 'Off' : `${track.highpass}Hz`}</span>
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
              {tracks.slice(0, 4).map(t => {
                const action: KeybindAction = { type: 'track-fade', trackId: t.id }
                const key = getKeyForAction(action)
                const isListening = listeningForKey?.type === 'track-fade' && listeningForKey.trackId === t.id
                return (
                  <div
                    key={`tf-${t.id}`}
                    style={{ ...S.keybindSlot, ...(isListening ? S.keybindListening : {}) }}
                    onClick={() => startListeningForKey(action)}
                  >
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Track {t.id + 1} Fade</div>
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
