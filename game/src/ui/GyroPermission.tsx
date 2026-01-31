import { useState, useEffect } from 'react'
import { gyroInput } from '../input/GyroInput'
import { isMobile, requiresGyroPermission } from '../utils/device'

export function GyroPermission() {
  const [needsPermission, setNeedsPermission] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    if (isMobile() && requiresGyroPermission()) {
      setNeedsPermission(true)
    } else if (isMobile()) {
      // Android: auto-initialize gyro
      gyroInput.requestPermission()
    }
  }, [])

  const handleRequestPermission = async () => {
    const granted = await gyroInput.requestPermission()
    setHasPermission(granted)
    if (granted) {
      setNeedsPermission(false)
    }
  }

  if (!needsPermission || hasPermission) return null

  return (
    <button className="gyro-permission-btn" onClick={handleRequestPermission}>
      Enable Tilt Controls
    </button>
  )
}
