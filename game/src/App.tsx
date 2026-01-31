import { useEffect } from 'react'
import { Provider } from 'jotai'
import { gameStore } from './store'
import { GameCanvas } from './components/GameCanvas'
import { UIOverlay } from './ui/UIOverlay'
import { gameLoop } from './game/GameLoop'
import { keyboardInput } from './input/KeyboardInput'
import { isMobile } from './utils/device'
import './App.css'

export function App() {
  useEffect(() => {
    // Initialize game systems
    gameLoop.start()

    if (!isMobile()) {
      keyboardInput.initialize()
    }

    return () => {
      gameLoop.destroy()
      keyboardInput.destroy()
    }
  }, [])

  return (
    <Provider store={gameStore}>
      <div className="game-container">
        <GameCanvas />
        <UIOverlay />
      </div>
    </Provider>
  )
}
