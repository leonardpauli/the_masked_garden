import { useEffect, useState } from 'react'
import { Provider } from 'jotai'
import { gameStore } from './store'
import { GameCanvas } from './components/GameCanvas'
import { UIOverlay } from './ui/UIOverlay'
import { TouchJumpOverlay } from './ui/TouchJumpOverlay'
import { gameLoop } from './game/GameLoop'
import { keyboardInput } from './input/KeyboardInput'
import { soundEngine } from './audio'
import { footstepsAudio } from './audio/footsteps'
import { musicManager } from './audio/musicManager'
import { isMobile } from './utils/device'
import { connectWebSocket } from './online/wsClient'
import { initMaskStateMachine, destroyMaskStateMachine } from './masksys/maskActions'
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
    initMaskStateMachine()

    if (!isMobile()) {
      keyboardInput.initialize()
    }

    return () => {
      gameLoop.destroy()
      keyboardInput.destroy()
      destroyMaskStateMachine()
    }
  }, [route])

  // Initialize audio immediately on load, resume on interaction if browser blocks autoplay
  useEffect(() => {
    if (route !== 'game') return

    let initialized = false

    const initAudio = async () => {
      if (initialized) return
      initialized = true
      await soundEngine.initialize()
      await musicManager.initialize()
      await footstepsAudio.initialize()
    }

    const resumeAudio = async () => {
      await soundEngine.resume()
    }

    const removeListeners = () => {
      window.removeEventListener('mousedown', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('pointerdown', handleInteraction)
    }

    const handleInteraction = () => {
      if (!initialized) {
        initAudio()
      } else {
        resumeAudio()
      }
      removeListeners()
    }

    // Try to start audio immediately on page load
    initAudio()

    // If browser blocks autoplay, resume on first interaction
    window.addEventListener('mousedown', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('pointerdown', handleInteraction)

    return () => {
      removeListeners()
      musicManager.destroy()
      footstepsAudio.destroy()
    }
  }, [route])

  if (route === 'sound') {
    return <SoundDebug onBack={() => { window.location.hash = ''; setRoute('game') }} />
  }

  return (
    <Provider store={gameStore}>
      <div className="game-container">
        <GameCanvas />
        <TouchJumpOverlay />
        <UIOverlay />
      </div>
    </Provider>
  )
}
