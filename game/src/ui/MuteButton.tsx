import { useState, useEffect } from 'react'
import { soundEngine } from '../audio/sound-engine'

export function MuteButton() {
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(1)

  // Sync with soundEngine on mount
  useEffect(() => {
    const volume = soundEngine.getMasterVolume()
    if (volume === 0) {
      setIsMuted(true)
    }
  }, [])

  const toggleMute = () => {
    if (isMuted) {
      // Unmute: restore previous volume
      soundEngine.setMasterVolume(previousVolume)
      setIsMuted(false)
    } else {
      // Mute: save current volume and set to 0
      const currentVolume = soundEngine.getMasterVolume()
      if (currentVolume > 0) {
        setPreviousVolume(currentVolume)
      }
      soundEngine.setMasterVolume(0)
      setIsMuted(true)
    }
  }

  return (
    <button
      className="mute-button"
      onClick={toggleMute}
      title={isMuted ? 'Unmute' : 'Mute'}
      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
    >
      {isMuted ? (
        // Muted icon (speaker with X)
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Unmuted icon (speaker with waves)
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  )
}
