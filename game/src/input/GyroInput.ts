import { setInputDirection, setInputSource } from '../actions/inputActions'

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type OrientationChangeCallback = (orientation: 'portrait' | 'landscape') => void

class GyroInput {
  private hasPermission = false
  private initialized = false
  private sensitivity = 0.04
  private referenceGamma: number | null = null
  private referenceBeta: number | null = null
  private lastOrientation: 'portrait' | 'landscape' | null = null
  private orientationChangeCallbacks: Set<OrientationChangeCallback> = new Set()

  async requestPermission(): Promise<boolean> {
    const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as DeviceOrientationEventiOS & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    // iOS requires explicit permission
    if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEventTyped.requestPermission()
        this.hasPermission = response === 'granted'
      } catch {
        this.hasPermission = false
      }
    } else {
      // Android and other platforms grant automatically
      this.hasPermission = true
    }

    if (this.hasPermission) {
      this.initialize()
    }

    return this.hasPermission
  }

  private initialize(): void {
    if (this.initialized) return
    this.initialized = true

    // Reset reference point - will be captured on first orientation event
    this.referenceGamma = null
    this.referenceBeta = null

    // Track initial orientation
    this.lastOrientation = this.getCurrentOrientation()

    window.addEventListener('deviceorientation', this.handleOrientation)
    window.addEventListener('orientationchange', this.handleOrientationChange)
    // Also listen for resize as a fallback (some browsers don't fire orientationchange)
    window.addEventListener('resize', this.handleResize)
  }

  private getCurrentOrientation(): 'portrait' | 'landscape' {
    // Use screen.orientation API if available
    if (screen.orientation) {
      return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape'
    }
    // Fallback to window dimensions
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  }

  private handleOrientationChange = (): void => {
    // Small delay to let the browser update dimensions
    setTimeout(() => {
      const newOrientation = this.getCurrentOrientation()
      if (this.lastOrientation !== null && this.lastOrientation !== newOrientation) {
        console.log(`Orientation changed: ${this.lastOrientation} -> ${newOrientation}`)
        this.recalibrate()
        this.notifyOrientationChange(newOrientation)
      }
      this.lastOrientation = newOrientation
    }, 100)
  }

  private handleResize = (): void => {
    const newOrientation = this.getCurrentOrientation()
    if (this.lastOrientation !== null && this.lastOrientation !== newOrientation) {
      console.log(`Orientation changed (via resize): ${this.lastOrientation} -> ${newOrientation}`)
      this.recalibrate()
      this.notifyOrientationChange(newOrientation)
    }
    this.lastOrientation = newOrientation
  }

  private notifyOrientationChange(orientation: 'portrait' | 'landscape'): void {
    this.orientationChangeCallbacks.forEach(callback => callback(orientation))
  }

  onOrientationChange(callback: OrientationChangeCallback): () => void {
    this.orientationChangeCallbacks.add(callback)
    return () => this.orientationChangeCallbacks.delete(callback)
  }

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null) return

    // Capture reference point on first reading
    if (this.referenceGamma === null || this.referenceBeta === null) {
      this.referenceGamma = e.gamma
      this.referenceBeta = e.beta
      return
    }

    setInputSource('gyro')

    // gamma: left/right tilt (-90 to 90)
    // beta: front/back tilt (-180 to 180)
    // Use relative values from reference point
    const deltaGamma = e.gamma - this.referenceGamma
    const deltaBeta = e.beta - this.referenceBeta

    // Convert to -1 to 1 range with deadzone
    let x = this.applyDeadzone(deltaGamma * this.sensitivity)
    let z = this.applyDeadzone(deltaBeta * this.sensitivity)

    // Clamp values
    x = Math.max(-1, Math.min(1, x))
    z = Math.max(-1, Math.min(1, z))

    setInputDirection({ x, z })
  }

  private applyDeadzone(value: number, deadzone: number = 0.1): number {
    if (Math.abs(value) < deadzone) return 0
    return value
  }

  recalibrate(): void {
    // Reset reference point - will be recaptured on next orientation event
    this.referenceGamma = null
    this.referenceBeta = null
  }

  destroy(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation)
    window.removeEventListener('orientationchange', this.handleOrientationChange)
    window.removeEventListener('resize', this.handleResize)
    this.initialized = false
    this.hasPermission = false
    this.referenceGamma = null
    this.referenceBeta = null
    this.lastOrientation = null
    this.orientationChangeCallbacks.clear()
  }
}

export const gyroInput = new GyroInput()
