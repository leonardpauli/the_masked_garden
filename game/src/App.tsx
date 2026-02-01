import { useEffect, useState } from 'react'
import { Provider } from 'jotai'
import { gameStore } from './store'
import { GameCanvas } from './components/GameCanvas'
import { UIOverlay } from './ui/UIOverlay'
import { gameLoop } from './game/GameLoop'
import { keyboardInput } from './input/KeyboardInput'
import { isMobile } from './utils/device'
import { connectWebSocket } from './online/wsClient'
import { SoundDebug } from './ui/SoundDebug'
import './App.css'

type Route = 'game' | 'sound'

function getRouteFromHash(): Route {
  const hash = window.location.hash
  if (hash === '#sound' || hash === '#/sound') return 'sound'
  return 'game'
}

export function App() {
  const [route, setRoute] = useState<Route>(getRouteFromHash)

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    // Only initialize game systems when on game route
    if (route !== 'game') return

    gameLoop.start()
    connectWebSocket()

    if (!isMobile()) {
      keyboardInput.initialize()
    }

    return () => {
      gameLoop.destroy()
      keyboardInput.destroy()
    }
  }, [route])

  if (route === 'sound') {
    return <SoundDebug onBack={() => { window.location.hash = ''; setRoute('game') }} />
  }

  return (
    <Provider store={gameStore}>
      <div className="game-container">
        <GameCanvas />
        <UIOverlay />
      </div>
    </Provider>
  )
}
