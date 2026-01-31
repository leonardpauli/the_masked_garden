import { setInputDirection, setInputSource } from '../actions/inputActions'

class KeyboardInput {
  private keys: Set<string> = new Set()
  private initialized = false

  initialize(): void {
    if (this.initialized) return
    this.initialized = true

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault()
      this.keys.add(e.key.toLowerCase())
      setInputSource('keyboard')
      this.updateDirection()
    }
  }

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase())
    this.updateDirection()
  }

  private updateDirection(): void {
    let x = 0
    let z = 0

    if (this.keys.has('arrowleft') || this.keys.has('a')) x -= 1
    if (this.keys.has('arrowright') || this.keys.has('d')) x += 1
    if (this.keys.has('arrowup') || this.keys.has('w')) z -= 1
    if (this.keys.has('arrowdown') || this.keys.has('s')) z += 1

    // Normalize diagonal movement
    const length = Math.sqrt(x * x + z * z)
    if (length > 0) {
      x /= length
      z /= length
    }

    setInputDirection({ x, z })
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.keys.clear()
    this.initialized = false
  }
}

export const keyboardInput = new KeyboardInput()
