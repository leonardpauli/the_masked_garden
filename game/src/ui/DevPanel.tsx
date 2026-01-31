import { useAtom } from 'jotai'
import {
  playerSpeedAtom,
  playerScaleAtom,
  playerDampingAtom,
  cameraHeightAtom,
  cameraSmoothingAtom,
  gravityAtom,
  collisionCooldownAtom,
  damageAmountAtom,
  devPanelOpenAtom,
} from '../store/atoms/configAtoms'

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
  const [cameraHeight, setCameraHeight] = useAtom(cameraHeightAtom)
  const [cameraSmoothing, setCameraSmoothing] = useAtom(cameraSmoothingAtom)
  const [gravity, setGravity] = useAtom(gravityAtom)
  const [collisionCooldown, setCollisionCooldown] = useAtom(collisionCooldownAtom)
  const [damageAmount, setDamageAmount] = useAtom(damageAmountAtom)

  return (
    <div className={`dev-panel ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="dev-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '>' : '<'} DEV
      </button>

      {isOpen && (
        <div className="dev-panel-content">
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
            label="Height"
            value={cameraHeight}
            onChange={setCameraHeight}
            min={5}
            max={50}
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
