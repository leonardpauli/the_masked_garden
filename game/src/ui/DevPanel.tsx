import { useAtom } from 'jotai'
import {
  playerSpeedAtom,
  playerScaleAtom,
  playerDampingAtom,
  cameraDistanceAtom,
  cameraSmoothingAtom,
  cameraViewAngleAtom,
  gravityAtom,
  collisionCooldownAtom,
  damageAmountAtom,
  devPanelOpenAtom,
  visualStyleAtom,
} from '../store/atoms/configAtoms'
import { visualStyleConfigs, visualStyleOptions, type VisualStyle } from '../types/visualStyles'

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

export function DevPanel() {
  const [isOpen, setIsOpen] = useAtom(devPanelOpenAtom)
  const [playerSpeed, setPlayerSpeed] = useAtom(playerSpeedAtom)
  const [playerScale, setPlayerScale] = useAtom(playerScaleAtom)
  const [playerDamping, setPlayerDamping] = useAtom(playerDampingAtom)
  const [cameraDistance, setCameraDistance] = useAtom(cameraDistanceAtom)
  const [cameraSmoothing, setCameraSmoothing] = useAtom(cameraSmoothingAtom)
  const [cameraViewAngle, setCameraViewAngle] = useAtom(cameraViewAngleAtom)
  const [gravity, setGravity] = useAtom(gravityAtom)
  const [collisionCooldown, setCollisionCooldown] = useAtom(collisionCooldownAtom)
  const [damageAmount, setDamageAmount] = useAtom(damageAmountAtom)
  const [visualStyle, setVisualStyle] = useAtom(visualStyleAtom)

  return (
    <div className={`dev-panel ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="dev-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '' : '<'} DEV
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
        </div>
      )}
    </div>
  )
}
