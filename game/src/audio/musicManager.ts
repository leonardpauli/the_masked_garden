import { soundEngine, LoadedSample, PlayingSound } from './sound-engine'
import { gameStore } from '../store'
import { isGroundedAtom } from '../store/atoms/playerAtoms'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'

const FADE_SPEED = 0.8 // gain change per second

interface Track {
  sample: LoadedSample | null
  playing: PlayingSound | null
  targetGain: number
  currentGain: number
  maxGain: number
}

class MusicManager {
  private tracks: {
    synths: Track
    pads: Track
    keyboards: Track
    wind: Track
  } = {
    synths: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.45 },
    pads: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 1.152 },
    keyboards: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.675 },
    wind: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.189 },
  }

  private initialized = false
  private synthsDuration = 0
  private startTime = 0
  private animationId: number | null = null
  private unsubscribers: (() => void)[] = []
  private keyboardsEnabled = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    this.initialized = true // Set immediately to prevent race conditions

    // Load all tracks
    const [synths, pads, keyboards, wind] = await Promise.all([
      soundEngine.loadSampleFromUrl('/audio/Music/Mask 2 - Synths.wav', 'synths'),
      soundEngine.loadSampleFromUrl('/audio/Music/Mask 2 - Pads.wav', 'pads'),
      soundEngine.loadSampleFromUrl('/audio/Music/GGJ Stockholm 2026_v3.wav', 'keyboards'),
      soundEngine.loadSampleFromUrl('/audio/Wind_Loop_v2.wav', 'wind'),
    ])

    if (!synths || !pads || !keyboards || !wind) {
      console.warn('Failed to load some music tracks')
      this.initialized = false // Reset to allow retry
      return
    }

    this.tracks.synths.sample = synths
    this.tracks.pads.sample = pads
    this.tracks.keyboards.sample = keyboards
    this.tracks.wind.sample = wind
    this.synthsDuration = synths.duration

    // Start tracks (keyboards delayed until after first synths loop)
    this.startTime = soundEngine.getCurrentTime()

    this.tracks.synths.playing = soundEngine.playSample(synths.id, { loop: true, gain: 0 })
    this.tracks.pads.playing = soundEngine.playSample(pads.id, { loop: true, gain: 0 })
    this.tracks.wind.playing = soundEngine.playSample(wind.id, { loop: true, gain: 0 })
    // keyboards.playing started later in updateLoop

    // Start fade-in for synths and wind immediately
    this.tracks.synths.targetGain = this.tracks.synths.maxGain
    this.tracks.wind.targetGain = this.tracks.wind.maxGain

    // Subscribe to player state for pads
    const unsubInput = gameStore.sub(inputDirectionAtom, () => this.updatePadsTarget())
    this.unsubscribers.push(unsubInput)

    // Start the gain update loop
    this.animationId = requestAnimationFrame(this.updateLoop)

    console.log('MusicManager initialized with layered tracks')
  }

  private updateLoop = (): void => {
    this.animationId = requestAnimationFrame(this.updateLoop)

    const now = soundEngine.getCurrentTime()
    const elapsed = now - this.startTime
    const deltaTime = 1 / 60 // approximate frame time

    // Start keyboards after first synths loop completes
    const currentLoop = Math.floor(elapsed / this.synthsDuration)
    if (currentLoop >= 1 && !this.keyboardsEnabled && this.tracks.keyboards.sample) {
      this.keyboardsEnabled = true
      // Start playing keyboards now
      const gain = this.tracks.keyboards.maxGain
      this.tracks.keyboards.playing = soundEngine.playSample(this.tracks.keyboards.sample.id, { loop: true, gain })
      this.tracks.keyboards.currentGain = gain
      this.tracks.keyboards.targetGain = gain
    }

    // Smoothly fade each track toward its target
    for (const track of Object.values(this.tracks)) {
      if (!track.playing) continue

      const diff = track.targetGain - track.currentGain
      if (Math.abs(diff) > 0.001) {
        const change = Math.sign(diff) * Math.min(Math.abs(diff), FADE_SPEED * deltaTime)
        track.currentGain += change
        track.playing.setGain(track.currentGain)
      }
    }
  }

  private updatePadsTarget(): void {
    const input = gameStore.get(inputDirectionAtom)
    const grounded = gameStore.get(isGroundedAtom)
    const isMoving = grounded && (Math.abs(input.x) > 0.1 || Math.abs(input.z) > 0.1)

    this.tracks.pads.targetGain = isMoving ? this.tracks.pads.maxGain : 0
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []

    for (const track of Object.values(this.tracks)) {
      track.playing?.stop()
      track.playing = null
      track.sample = null
      track.currentGain = 0
      track.targetGain = 0
    }

    this.initialized = false
    this.keyboardsEnabled = false
  }
}

export const musicManager = new MusicManager()
