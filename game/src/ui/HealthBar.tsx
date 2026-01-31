import { useAtomValue } from 'jotai'
import { playerHealthAtom } from '../store/atoms/playerAtoms'

export function HealthBar() {
  const health = useAtomValue(playerHealthAtom)

  const getHealthColor = () => {
    if (health > 60) return '#4ade80'
    if (health > 30) return '#facc15'
    return '#ef4444'
  }

  return (
    <div className="health-bar-container">
      <div className="health-bar-bg">
        <div
          className="health-bar-fill"
          style={{
            width: `${health}%`,
            backgroundColor: getHealthColor(),
          }}
        />
      </div>
      <span className="health-text">{health}</span>
    </div>
  )
}
