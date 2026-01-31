export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

export function supportsGyro(): boolean {
  return typeof DeviceOrientationEvent !== 'undefined'
}

export function requiresGyroPermission(): boolean {
  return (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'
  )
}
