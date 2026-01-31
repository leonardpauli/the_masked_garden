import { useRef, useEffect } from 'react'
import { gameStore } from '../store'
import { playerPositionAtom, playerColorHueAtom } from '../store/atoms/playerAtoms'
import { otherPlayersAtom } from '../store/atoms/onlineAtoms'

const MINIMAP_SIZE = 80 // Smaller minimap
const DOT_RADIUS_ME = 3
const DOT_RADIUS_OTHER = 2
const MIN_RANGE = 20
const UPDATE_INTERVAL = 1000 / 30 // 30 FPS

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastDrawTime = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas for high DPI
    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_SIZE * dpr
    canvas.height = MINIMAP_SIZE * dpr
    ctx.scale(dpr, dpr)

    let animationId: number

    function draw(timestamp: number) {
      // Throttle to 30fps
      if (timestamp - lastDrawTime.current < UPDATE_INTERVAL) {
        animationId = requestAnimationFrame(draw)
        return
      }
      lastDrawTime.current = timestamp

      const playerPos = gameStore.get(playerPositionAtom)
      const playerHue = gameStore.get(playerColorHueAtom)
      const otherPlayers = gameStore.get(otherPlayersAtom)

      // Clear canvas
      ctx!.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)

      // Don't draw if alone
      if (otherPlayers.size === 0) {
        animationId = requestAnimationFrame(draw)
        return
      }

      // Draw background
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx!.beginPath()
      ctx!.roundRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE, 6)
      ctx!.fill()

      // Draw grid lines
      ctx!.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx!.lineWidth = 0.5
      ctx!.beginPath()
      ctx!.moveTo(MINIMAP_SIZE / 2, 8)
      ctx!.lineTo(MINIMAP_SIZE / 2, MINIMAP_SIZE - 8)
      ctx!.moveTo(8, MINIMAP_SIZE / 2)
      ctx!.lineTo(MINIMAP_SIZE - 8, MINIMAP_SIZE / 2)
      ctx!.stroke()

      // Collect all positions with colors
      const positions = [
        { x: playerPos.x, z: playerPos.z, isMe: true, colorHue: playerHue },
        ...Array.from(otherPlayers.values()).map(p => ({ x: p.x, z: p.z, isMe: false, colorHue: p.colorHue }))
      ]

      // Find bounds
      let minX = Infinity, maxX = -Infinity
      let minZ = Infinity, maxZ = -Infinity
      for (const pos of positions) {
        minX = Math.min(minX, pos.x)
        maxX = Math.max(maxX, pos.x)
        minZ = Math.min(minZ, pos.z)
        maxZ = Math.max(maxZ, pos.z)
      }

      // Calculate range with padding
      const rangeX = Math.max(maxX - minX, MIN_RANGE)
      const rangeZ = Math.max(maxZ - minZ, MIN_RANGE)
      const range = Math.max(rangeX, rangeZ) * 1.3

      const centerX = (minX + maxX) / 2
      const centerZ = (minZ + maxZ) / 2

      // Draw other players first (so we're on top)
      for (const pos of positions) {
        if (pos.isMe) continue
        const screenX = MINIMAP_SIZE / 2 + ((pos.x - centerX) / range) * (MINIMAP_SIZE - 16)
        const screenY = MINIMAP_SIZE / 2 + ((pos.z - centerZ) / range) * (MINIMAP_SIZE - 16)

        // Use player's unique color from golden angle hue
        ctx!.fillStyle = `hsla(${pos.colorHue}, 70%, 55%, 0.9)`
        ctx!.beginPath()
        ctx!.arc(screenX, screenY, DOT_RADIUS_OTHER, 0, Math.PI * 2)
        ctx!.fill()
      }

      // Draw me with my unique color
      const myScreenX = MINIMAP_SIZE / 2 + ((playerPos.x - centerX) / range) * (MINIMAP_SIZE - 16)
      const myScreenY = MINIMAP_SIZE / 2 + ((playerPos.z - centerZ) / range) * (MINIMAP_SIZE - 16)

      ctx!.fillStyle = `hsl(${playerHue}, 70%, 55%)`
      ctx!.beginPath()
      ctx!.arc(myScreenX, myScreenY, DOT_RADIUS_ME, 0, Math.PI * 2)
      ctx!.fill()

      // White border on me to stand out
      ctx!.strokeStyle = 'white'
      ctx!.lineWidth = 1
      ctx!.stroke()

      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
    />
  )
}
