import { useAtomValue } from 'jotai'
import { useState, useEffect } from 'react'
import { playerCountAtom, wsConnectedAtom, lastBuildTimeAtom } from '../store/atoms/onlineAtoms'

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function PlayerCount() {
  const playerCount = useAtomValue(playerCountAtom)
  const connected = useAtomValue(wsConnectedAtom)
  const lastBuildTime = useAtomValue(lastBuildTimeAtom)
  const [, forceUpdate] = useState(0)

  // Update the "time ago" display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="online-status">
      <div className="player-count">
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        {playerCount} online
      </div>
      {lastBuildTime && (
        <div className="build-time">
          Built {formatTimeAgo(lastBuildTime)}
        </div>
      )}
    </div>
  )
}
