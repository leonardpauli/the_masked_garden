import { soundEngine, LoadedSample } from './sound-engine'
import { gameStore } from '../store'
import { playerPositionAtom, isGroundedAtom } from '../store/atoms/playerAtoms'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'

const FOOTSTEP_FILES = [
  '/audio/Dirt 1.wav',
  '/audio/Dirt 2.wav',
  '/audio/Dirt 3.wav',
  '/audio/Dirt 4.wav',
]

const STEP_INTERVAL = 0.35 // seconds between footsteps
const PITCH_VARIATION = 0.15 // +/- 15% pitch variation
const VOLUME = 0.4

class FootstepsAudio {
  private samples: LoadedSample[] = []
  private lastStepTime = 0
  private initialized = false
  private unsubscribe: (() => void) | null = null
  private lastPosition = { x: 0, z: 0 }
  private distanceSinceStep = 0
  private stepDistance = 0.7 // distance units between steps

  async initialize(): Promise<void> {
    if (this.initialized) return

    // Load all footstep samples
    for (const file of FOOTSTEP_FILES) {
      const name = file.split('/').pop() || file
      const sample = await soundEngine.loadSampleFromUrl(file, name)
      if (sample) {
        this.samples.push(sample)
      }
    }

    if (this.samples.length === 0) {
      console.warn('No footstep samples loaded')
      return
    }

    this.initialized = true

    // Subscribe to player position changes
    const pos = gameStore.get(playerPositionAtom)
    this.lastPosition = { x: pos.x, z: pos.z }

    this.unsubscribe = gameStore.sub(playerPositionAtom, () => {
      this.onPositionChange()
    })

    console.log(`Footsteps initialized with ${this.samples.length} samples`)
  }

  private onPositionChange(): void {
    const pos = gameStore.get(playerPositionAtom)
    const input = gameStore.get(inputDirectionAtom)
    const grounded = gameStore.get(isGroundedAtom)

    // Calculate horizontal movement
    const dx = pos.x - this.lastPosition.x
    const dz = pos.z - this.lastPosition.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    this.lastPosition = { x: pos.x, z: pos.z }

    // Only play footsteps when grounded and there's input
    const hasInput = Math.abs(input.x) > 0.1 || Math.abs(input.z) > 0.1
    if (!grounded || !hasInput) {
      return
    }

    this.distanceSinceStep += distance

    // Check if we've moved enough for a step
    if (this.distanceSinceStep >= this.stepDistance) {
      this.playStep()
      this.distanceSinceStep = 0
    }
  }

  private playStep(): void {
    if (this.samples.length === 0) return

    const now = soundEngine.getCurrentTime()
    if (now - this.lastStepTime < STEP_INTERVAL) return

    // Pick random sample
    const sample = this.samples[Math.floor(Math.random() * this.samples.length)]!

    // Random pitch variation (0.85 to 1.15)
    const playbackRate = 1 + (Math.random() * 2 - 1) * PITCH_VARIATION

    soundEngine.playSample(sample.id, {
      gain: VOLUME,
      playbackRate,
    })

    this.lastStepTime = now
  }

  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.initialized = false
    this.samples = []
  }
}

export const footstepsAudio = new FootstepsAudio()
