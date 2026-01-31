import { setInputDirection, setInputSource } from '../actions/inputActions'

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

class GyroInput {
  private hasPermission = false
  private initialized = false
  private sensitivity = 0.04

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

    window.addEventListener('deviceorientation', this.handleOrientation)
  }

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null) return

    setInputSource('gyro')

    // gamma: left/right tilt (-90 to 90)
    // beta: front/back tilt (-180 to 180)

    // Convert to -1 to 1 range with deadzone
    let x = this.applyDeadzone(e.gamma * this.sensitivity)
    let z = this.applyDeadzone((e.beta - 45) * this.sensitivity) // Offset for natural holding angle

    // Clamp values
    x = Math.max(-1, Math.min(1, x))
    z = Math.max(-1, Math.min(1, z))

    setInputDirection({ x, z })
  }

  private applyDeadzone(value: number, deadzone: number = 0.1): number {
    if (Math.abs(value) < deadzone) return 0
    return value
  }

  destroy(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation)
    this.initialized = false
    this.hasPermission = false
  }
}

export const gyroInput = new GyroInput()
