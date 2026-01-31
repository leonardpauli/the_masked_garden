import { startGame } from '../actions/gameActions'
import { isMobile } from '../utils/device'

export function StartScreen() {
  return (
    <div className="screen start-screen">
      <h1 className="game-title">MASKED GARDEN</h1>
      <p className="game-subtitle">Navigate through the icosahedral maze</p>
      <button className="btn btn-primary" onClick={startGame}>
        PLAY
      </button>
      <p className="controls-hint">
        {isMobile() ? 'Tilt your device to move' : 'Use arrow keys or WASD to move'}
      </p>
    </div>
  )
}
