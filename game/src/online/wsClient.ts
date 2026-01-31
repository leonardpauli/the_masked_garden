import { gameStore } from '../store'
import { playerCountAtom, wsConnectedAtom, myPlayerIdAtom, otherPlayersAtom, lastBuildTimeAtom, PlayerState } from '../store/atoms/onlineAtoms'
import { playerPositionAtom, playerVelocityAtom, playerColorHueAtom } from '../store/atoms/playerAtoms'

let ws: WebSocket | null = null
let pingInterval: number | null = null
let stateInterval: number | null = null

export function connectWebSocket() {
  if (ws?.readyState === WebSocket.OPEN) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${window.location.host}/ws`
  
  ws = new WebSocket(url)

  ws.onopen = () => {
    console.log('WebSocket connected')
    gameStore.set(wsConnectedAtom, true)
    
    // Send ping every second
    pingInterval = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 1000)

    // Send state 5 times per second
    stateInterval = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        const pos = gameStore.get(playerPositionAtom)
        const vel = gameStore.get(playerVelocityAtom)
        ws.send(JSON.stringify({
          type: 'state',
          state: {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            vx: vel.x,
            vy: vel.y,
            vz: vel.z,
          }
        }))
      }
    }, 200)
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case 'welcome':
          gameStore.set(myPlayerIdAtom, msg.id)
          if (msg.colorHue !== undefined) {
            gameStore.set(playerColorHueAtom, msg.colorHue)
          }
          if (msg.buildTime) {
            gameStore.set(lastBuildTimeAtom, new Date(msg.buildTime))
          }
          console.log('My player ID:', msg.id, 'Color hue:', msg.colorHue)
          break

        case 'buildTime':
          if (msg.buildTime) {
            gameStore.set(lastBuildTimeAtom, new Date(msg.buildTime))
          }
          break

        case 'playerCount':
          gameStore.set(playerCountAtom, msg.playerCount)
          break

        case 'players': {
          const newMap = new Map<number, PlayerState>()
          for (const [id, state] of Object.entries(msg.players)) {
            newMap.set(Number(id), state as PlayerState)
          }
          gameStore.set(otherPlayersAtom, newMap)
          break
        }

        case 'playerLeft': {
          const current = gameStore.get(otherPlayersAtom)
          const updated = new Map(current)
          updated.delete(msg.id)
          gameStore.set(otherPlayersAtom, updated)
          break
        }
      }
    } catch (e) {
      console.error('Failed to parse WS message:', e)
    }
  }

  ws.onclose = () => {
    console.log('WebSocket disconnected')
    gameStore.set(wsConnectedAtom, false)
    gameStore.set(otherPlayersAtom, new Map())
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
    if (stateInterval) {
      clearInterval(stateInterval)
      stateInterval = null
    }
    // Reconnect after 2 seconds
    setTimeout(connectWebSocket, 2000)
  }

  ws.onerror = (err) => {
    console.error('WebSocket error:', err)
    ws?.close()
  }
}
