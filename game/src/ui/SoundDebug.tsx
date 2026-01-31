import { useState, useEffect, useCallback } from 'react'
import {
  soundEngine,
  type OscillatorType,
  type PlayingSound,
} from '../audio'
import { presets, presetsByCategory } from '../audio/presets'

interface ActiveSound {
  id: string
  name: string
  sound: PlayingSound
}

type ViewMode = 'synth' | 'presets'

export function SoundDebug({ onBack }: { onBack?: () => void }) {
  const [viewMode, setViewMode] = useState<ViewMode>('presets')
  const [isInitialized, setIsInitialized] = useState(false)
  const [masterVolume, setMasterVolume] = useState(0.5)
  const [activeSounds, setActiveSounds] = useState<ActiveSound[]>([])

  // Oscillator state
  const [oscType, setOscType] = useState<OscillatorType>('sine')
  const [oscFrequency, setOscFrequency] = useState(440)
  const [oscGain, setOscGain] = useState(0.3)

  const initializeAudio = useCallback(async () => {
    try {
      await soundEngine.initialize()
      const resumePromise = soundEngine.resume()
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 500))
      await Promise.race([resumePromise, timeoutPromise])
      soundEngine.setMasterVolume(masterVolume)
      setIsInitialized(true)
    } catch (e) {
      console.error('Audio init error', e)
    }
  }, [masterVolume])

  useEffect(() => {
    if (isInitialized) soundEngine.setMasterVolume(masterVolume)
  }, [isInitialized, masterVolume])

  const playOscillator = useCallback(() => {
    if (!isInitialized) return
    const sound = soundEngine.playOscillator(oscType, oscFrequency, { gain: oscGain })
    if (sound) {
      setActiveSounds(prev => [...prev, { id: sound.id, name: `${oscType} ${oscFrequency}Hz`, sound }])
    }
  }, [isInitialized, oscType, oscFrequency, oscGain])

  const stopSound = useCallback((id: string) => {
    const s = activeSounds.find(a => a.id === id)
    if (s) { s.sound.stop(); setActiveSounds(prev => prev.filter(a => a.id !== id)) }
  }, [activeSounds])

  const stopAll = useCallback(() => { soundEngine.stopAll(); setActiveSounds([]) }, [])

  const playPreset = useCallback((id: string) => {
    const p = presets.find(x => x.id === id)
    if (p && isInitialized) {
      const sound = p.play()
      if (sound) setActiveSounds(prev => [...prev, { id: sound.id, name: p.name, sound }])
    }
  }, [isInitialized])

  const styles: Record<string, React.CSSProperties> = {
    page: { position: 'fixed', inset: 0, overflow: 'auto', padding: 20, background: '#1a1a2e', color: '#fff', zIndex: 1000 },
    header: { marginBottom: 20 },
    backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: 8, fontSize: 14 },
    title: { fontSize: 28, fontWeight: 300, color: '#4ecdc4', margin: 0 },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    tabs: { display: 'flex', gap: 10, marginTop: 15 },
    tab: { padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer' },
    tabActive: { padding: '8px 16px', background: '#4ecdc4', border: 'none', color: '#1a1a2e', borderRadius: 6, cursor: 'pointer' },
    section: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 12, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.5)', marginBottom: 12 },
    row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
    label: { width: 80, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    slider: { flex: 1, maxWidth: 200 },
    value: { width: 70, fontSize: 12, color: '#4ecdc4', textAlign: 'right' as const },
    btn: { padding: '10px 20px', background: '#4ecdc4', color: '#1a1a2e', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
    btnSec: { padding: '8px 16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
    select: { padding: '6px 10px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
    presetGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
    presetBtn: { padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
    activeSound: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(78,205,196,0.1)', borderRadius: 4, marginBottom: 6 },
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        {onBack && <button style={styles.backBtn} onClick={onBack}>← Back to game</button>}
        <h1 style={styles.title}>Sound Engine Debug</h1>
        <p style={styles.subtitle}>For sound engineers to test presets and create new sounds</p>
        <div style={styles.tabs}>
          <button style={viewMode === 'presets' ? styles.tabActive : styles.tab} onClick={() => setViewMode('presets')}>Presets</button>
          <button style={viewMode === 'synth' ? styles.tabActive : styles.tab} onClick={() => setViewMode('synth')}>Synth</button>
        </div>
      </header>

      {!isInitialized ? (
        <div style={styles.section}>
          <p style={{ marginBottom: 12, color: 'rgba(255,255,255,0.7)' }}>Click to initialize WebAudio (required due to browser autoplay policy)</p>
          <button style={styles.btn} onClick={initializeAudio}>Initialize Audio Engine</button>
        </div>
      ) : (
        <>
          {/* Master Volume */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Master</div>
            <div style={styles.row}>
              <span style={styles.label}>Volume</span>
              <input type="range" min={0} max={1} step={0.01} value={masterVolume} onChange={e => setMasterVolume(+e.target.value)} style={styles.slider} />
              <span style={styles.value}>{(masterVolume * 100).toFixed(0)}%</span>
            </div>
          </div>

          {viewMode === 'synth' && (
            <div style={styles.grid}>
              {/* Oscillator */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Oscillator</div>
                <div style={styles.row}>
                  <span style={styles.label}>Type</span>
                  <select style={styles.select} value={oscType} onChange={e => setOscType(e.target.value as OscillatorType)}>
                    <option value="sine">Sine</option><option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option><option value="triangle">Triangle</option>
                  </select>
                </div>
                <div style={styles.row}>
                  <span style={styles.label}>Frequency</span>
                  <input type="range" min={20} max={2000} value={oscFrequency} onChange={e => setOscFrequency(+e.target.value)} style={styles.slider} />
                  <span style={styles.value}>{oscFrequency} Hz</span>
                </div>
                <div style={styles.row}>
                  <span style={styles.label}>Gain</span>
                  <input type="range" min={0} max={1} step={0.01} value={oscGain} onChange={e => setOscGain(+e.target.value)} style={styles.slider} />
                  <span style={styles.value}>{(oscGain * 100).toFixed(0)}%</span>
                </div>
                <button style={styles.btn} onClick={playOscillator}>Play</button>
              </div>

              {/* Active Sounds */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Active Sounds ({activeSounds.length})</div>
                {activeSounds.length > 0 && <button style={{...styles.btnSec, marginBottom: 10}} onClick={stopAll}>Stop All</button>}
                {activeSounds.map(s => (
                  <div key={s.id} style={styles.activeSound}>
                    <span>{s.name}</span>
                    <button style={styles.btnSec} onClick={() => stopSound(s.id)}>Stop</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'presets' && (
            <div>
              {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                <div key={category} style={styles.section}>
                  <div style={styles.sectionTitle}>{category}</div>
                  <div style={styles.presetGrid}>
                    {categoryPresets.map(p => (
                      <button key={p.id} style={styles.presetBtn} onClick={() => playPreset(p.id)} title={p.description}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {activeSounds.length > 0 && (
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Active ({activeSounds.length})</div>
                  <button style={styles.btnSec} onClick={stopAll}>Stop All</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
