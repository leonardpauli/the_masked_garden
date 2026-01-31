import { useAtomValue } from 'jotai'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { HealthBar } from './HealthBar'
import { ScoreDisplay } from './ScoreDisplay'
import { StartScreen } from './StartScreen'
import { GameOverScreen } from './GameOverScreen'
import { GyroPermission } from './GyroPermission'
import { DevPanel } from './DevPanel'
import { PlayerCount } from './PlayerCount'
import { SoundDebugToggle } from './SoundDebugToggle'

export function UIOverlay() {
  const gameState = useAtomValue(gameStateAtom)
  const isDev = import.meta.env.DEV

  return (
    <div className="ui-overlay">
      {gameState === 'menu' && <StartScreen />}

      {gameState === 'playing' && (
        <div className="hud">
          <HealthBar />
          <ScoreDisplay />
        </div>
      )}

      {gameState === 'gameover' && <GameOverScreen />}

      <GyroPermission />

      {isDev && <DevPanel />}

      <PlayerCount />

      <SoundDebugToggle />
    </div>
  )
}
