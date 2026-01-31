import { useAtomValue } from 'jotai'
import { scoreAtom } from '../store/atoms/gameAtoms'

export function ScoreDisplay() {
  const score = useAtomValue(scoreAtom)

  return (
    <div className="score-display">
      <span className="score-label">SCORE</span>
      <span className="score-value">{score}</span>
    </div>
  )
}
