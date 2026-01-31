import { useState } from 'react'
import { useAtom } from 'jotai'
import { useMemo } from 'react'
import {
  playerSpeedAtom,
  playerScaleAtom,
  playerDampingAtom,
  cameraDistanceAtom,
  cameraSmoothingAtom,
  cameraViewAngleAtom,
  cameraTransitionSpeedAtom,
  cameraPresetsWithPersistAtom,
  gravityAtom,
  collisionCooldownAtom,
  damageAmountAtom,
  devPanelOpenAtom,
  visualStyleAtom,
  healthEnabledAtom,
  scoreEnabledAtom,
  treeColorVariationAtom,
  groundVibranceAtom,
  type CameraPreset,
} from '../store/atoms/configAtoms'
import { visualStyleConfigs, visualStyleOptions, type VisualStyle } from '../types/visualStyles'

const DEFAULT_PRESETS: CameraPreset[] = [
  { name: 'Default', distance: 14, viewAngle: 43 },
  { name: 'Close-up', distance: 8, viewAngle: 55 },
  { name: 'Overview', distance: 25, viewAngle: 20 },
]

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}

function Slider({ label, value, onChange, min, max, step = 0.1 }: SliderProps) {
  return (
    <div className="dev-slider">
      <label>
        <span className="dev-slider-label">{label}</span>
        <span className="dev-slider-value">{value.toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <div className="dev-checkbox">
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="dev-checkbox-label">{label}</span>
      </label>
    </div>
  )
}

// Convert HSL to hex color
function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

export function DevPanel() {
  const [isOpen, setIsOpen] = useAtom(devPanelOpenAtom)
  const [playerSpeed, setPlayerSpeed] = useAtom(playerSpeedAtom)
  const [playerScale, setPlayerScale] = useAtom(playerScaleAtom)
  const [playerDamping, setPlayerDamping] = useAtom(playerDampingAtom)
  const [cameraDistance, setCameraDistance] = useAtom(cameraDistanceAtom)
  const [cameraSmoothing, setCameraSmoothing] = useAtom(cameraSmoothingAtom)
  const [cameraViewAngle, setCameraViewAngle] = useAtom(cameraViewAngleAtom)
  const [cameraTransitionSpeed, setCameraTransitionSpeed] = useAtom(cameraTransitionSpeedAtom)
  const [cameraPresets, setCameraPresets] = useAtom(cameraPresetsWithPersistAtom)
  const [gravity, setGravity] = useAtom(gravityAtom)
  const [collisionCooldown, setCollisionCooldown] = useAtom(collisionCooldownAtom)
  const [damageAmount, setDamageAmount] = useAtom(damageAmountAtom)
  const [visualStyle, setVisualStyle] = useAtom(visualStyleAtom)
  const [healthEnabled, setHealthEnabled] = useAtom(healthEnabledAtom)
  const [scoreEnabled, setScoreEnabled] = useAtom(scoreEnabledAtom)
  const [treeColorVariation, setTreeColorVariation] = useAtom(treeColorVariationAtom)
  const [groundVibrance, setGroundVibrance] = useAtom(groundVibranceAtom)
  const [newPresetName, setNewPresetName] = useState('')

  // Compute ground color hex from vibrance
  const groundColorHex = useMemo(() => {
    const hue = 100 + groundVibrance * 20        // 100 → 120
    const saturation = 20 + groundVibrance * 80  // 20% → 100%
    const lightness = 25 + groundVibrance * 25   // 25% → 50%
    return hslToHex(hue, saturation, lightness)
  }, [groundVibrance])

  const applyPreset = (preset: CameraPreset) => {
    setCameraDistance(preset.distance)
    setCameraViewAngle(preset.viewAngle)
  }

  const saveCurrentAsPreset = () => {
    const name = newPresetName.trim() || `Preset ${cameraPresets.length + 1}`
    const newPreset: CameraPreset = {
      name,
      distance: cameraDistance,
      viewAngle: cameraViewAngle,
    }
    setCameraPresets([...cameraPresets, newPreset])
    setNewPresetName('')
  }

  const deletePreset = (index: number) => {
    setCameraPresets(cameraPresets.filter((_, i) => i !== index))
  }

  const resetPresets = () => {
    setCameraPresets(DEFAULT_PRESETS)
  }

  return (
    <div className={`dev-panel ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="dev-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        DEV
      </button>

      {isOpen && (
        <div className="dev-panel-content">
          <button
            className="dev-button"
            onClick={() => { window.location.hash = '#sound' }}
            style={{ width: '100%', marginBottom: 12, padding: '8px 12px', background: '#4ecdc4', color: '#1a1a2e', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
          >
            Sound Workstation
          </button>

          <h3>Visual Style</h3>
          <div className="dev-dropdown">
            <select
              value={visualStyle}
              onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
              className="dev-select"
            >
              {visualStyleOptions.map((style) => (
                <option key={style} value={style}>
                  {visualStyleConfigs[style].name}
                </option>
              ))}
            </select>
          </div>

          <h3>Player</h3>
          <Slider
            label="Speed"
            value={playerSpeed}
            onChange={setPlayerSpeed}
            min={1}
            max={30}
            step={0.5}
          />
          <Slider
            label="Scale"
            value={playerScale}
            onChange={setPlayerScale}
            min={0.1}
            max={2}
            step={0.05}
          />
          <Slider
            label="Damping"
            value={playerDamping}
            onChange={setPlayerDamping}
            min={0}
            max={10}
            step={0.5}
          />

          <h3>Camera</h3>
          <div className="dev-presets">
            {cameraPresets.map((preset, index) => (
              <div key={index} className="dev-preset-row">
                <button
                  className="dev-preset-btn"
                  onClick={() => applyPreset(preset)}
                  title={`Distance: ${preset.distance}, Angle: ${preset.viewAngle}°`}
                >
                  {preset.name}
                </button>
                <button
                  className="dev-preset-delete"
                  onClick={() => deletePreset(index)}
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="dev-preset-save">
            <input
              type="text"
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="dev-preset-input"
            />
            <button className="dev-preset-save-btn" onClick={saveCurrentAsPreset}>
              Save
            </button>
          </div>
          <button className="dev-reset-btn" onClick={resetPresets}>
            Reset Presets
          </button>
          <Slider
            label="Distance"
            value={cameraDistance}
            onChange={setCameraDistance}
            min={5}
            max={50}
            step={1}
          />
          <Slider
            label="View Angle"
            value={cameraViewAngle}
            onChange={setCameraViewAngle}
            min={0}
            max={70}
            step={1}
          />
          <Slider
            label="Smoothing"
            value={cameraSmoothing}
            onChange={setCameraSmoothing}
            min={0.01}
            max={1}
            step={0.01}
          />
          <Slider
            label="Transition"
            value={cameraTransitionSpeed}
            onChange={setCameraTransitionSpeed}
            min={0.01}
            max={0.3}
            step={0.01}
          />

          <h3>Physics</h3>
          <Slider
            label="Gravity"
            value={gravity}
            onChange={setGravity}
            min={0}
            max={50}
            step={1}
          />

          <h3>Combat</h3>
          <Slider
            label="Damage"
            value={damageAmount}
            onChange={setDamageAmount}
            min={1}
            max={50}
            step={1}
          />
          <Slider
            label="Cooldown (ms)"
            value={collisionCooldown}
            onChange={setCollisionCooldown}
            min={100}
            max={2000}
            step={50}
          />

          <h3>Game Systems</h3>
          <Checkbox
            label="Health System"
            checked={healthEnabled}
            onChange={setHealthEnabled}
          />
          <Checkbox
            label="Score System"
            checked={scoreEnabled}
            onChange={setScoreEnabled}
          />

          <h3>Environment</h3>
          <Slider
            label="Tree Variation"
            value={treeColorVariation}
            onChange={setTreeColorVariation}
            min={0}
            max={10}
            step={0.01}
          />
          <Slider
            label="Ground Vibrance"
            value={groundVibrance}
            onChange={setGroundVibrance}
            min={0}
            max={1}
            step={0.01}
          />
          <div className="dev-hex-display">
            <span>Ground Color: </span>
            <span className="hex-value" style={{ color: groundColorHex }}>{groundColorHex}</span>
          </div>
        </div>
      )}
    </div>
  )
}
