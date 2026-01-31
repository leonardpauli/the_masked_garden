import { useAtomValue } from 'jotai'
import { scoreAtom } from '../store/atoms/gameAtoms'
import { resetGame, startGame } from '../actions/gameActions'

export function GameOverScreen() {
  const score = useAtomValue(scoreAtom)

  return (
    <div className="screen gameover-screen">
      <h1 className="gameover-title">GAME OVER</h1>
      <div className="final-score">
        <span className="final-score-label">Final Score</span>
        <span className="final-score-value">{score}</span>
      </div>
      <div className="gameover-buttons">
        <button className="btn btn-primary" onClick={startGame}>
          PLAY AGAIN
        </button>
        <button className="btn btn-secondary" onClick={resetGame}>
          MENU
        </button>
      </div>
    </div>
  )
}
