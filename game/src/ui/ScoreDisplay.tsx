import { useAtomValue } from 'jotai'
import { scoreAtom } from '../store/atoms/gameAtoms'
import { scoreEnabledAtom } from '../store/atoms/configAtoms'

export function ScoreDisplay() {
  const score = useAtomValue(scoreAtom)
  const scoreEnabled = useAtomValue(scoreEnabledAtom)

  // Don't render if score system is disabled
  if (!scoreEnabled) return null

  return (
    <div className="score-display">
      <span className="score-label">SCORE</span>
      <span className="score-value">{score}</span>
    </div>
  )
}
