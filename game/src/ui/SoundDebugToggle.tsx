import { useState } from 'react'
import { SoundDebugPage } from './SoundDebugPage'

export function SoundDebugToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        className={`sound-debug-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Sound Engine Debug"
      >
        &#9835;
      </button>

      {isOpen && <SoundDebugPage onClose={() => setIsOpen(false)} />}
    </>
  )
}
