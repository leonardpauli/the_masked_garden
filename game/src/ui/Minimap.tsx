import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { playerPositionAtom } from '../store/atoms/playerAtoms'
import { otherPlayersAtom } from '../store/atoms/onlineAtoms'

const MINIMAP_SIZE = 120
const MIN_RANGE = 20 // Minimum world units to show

interface Dot {
  x: number
  y: number
  isMe: boolean
}

export function Minimap() {
  const playerPos = useAtomValue(playerPositionAtom)
  const otherPlayers = useAtomValue(otherPlayersAtom)

  const dots = useMemo((): Dot[] => {
    const allPositions = [
      { x: playerPos.x, z: playerPos.z, isMe: true },
      ...Array.from(otherPlayers.values()).map(p => ({ x: p.x, z: p.z, isMe: false }))
    ]

    if (allPositions.length <= 1) {
      return [{ x: 50, y: 50, isMe: true }]
    }

    // Find bounds
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    for (const pos of allPositions) {
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x)
      minZ = Math.min(minZ, pos.z)
      maxZ = Math.max(maxZ, pos.z)
    }

    // Add padding and ensure minimum range
    const rangeX = Math.max(maxX - minX, MIN_RANGE)
    const rangeZ = Math.max(maxZ - minZ, MIN_RANGE)
    const range = Math.max(rangeX, rangeZ) * 1.2 // 20% padding

    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    // Map to percentage positions
    return allPositions.map(pos => ({
      x: 50 + ((pos.x - centerX) / range) * 80,
      y: 50 + ((pos.z - centerZ) / range) * 80,
      isMe: pos.isMe
    }))
  }, [playerPos.x, playerPos.z, otherPlayers])

  // Don't show minimap if alone
  if (otherPlayers.size === 0) return null

  return (
    <div className="minimap">
      <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} viewBox="0 0 100 100">
        {/* Background */}
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.4)" rx="8" />
        
        {/* Grid lines */}
        <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        
        {/* Other players (render first so we're on top) */}
        {dots.filter(d => !d.isMe).map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r="4"
            fill="#88aaff"
            opacity="0.8"
          />
        ))}
        
        {/* Me */}
        {dots.filter(d => d.isMe).map((dot, i) => (
          <circle
            key={`me-${i}`}
            cx={dot.x}
            cy={dot.y}
            r="5"
            fill="#4ade80"
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  )
}
