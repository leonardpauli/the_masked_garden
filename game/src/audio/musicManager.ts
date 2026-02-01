import { soundEngine, LoadedSample, PlayingSound } from './sound-engine'
import { gameStore } from '../store'
import { isGroundedAtom } from '../store/atoms/playerAtoms'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'
import { maskStateAtom } from '../store/atoms/maskAtoms'
import type { MaskState } from '../masksys/types'

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
    mask1: Track
    mask2: Track
    mask3: Track
    mask4: Track
    wind: Track
  } = {
    synths: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.45 },
    pads: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 1.152 },
    mask1: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.5 },
    mask2: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.5 },
    mask3: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.5 },
    mask4: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.5 },
    wind: { sample: null, playing: null, targetGain: 0, currentGain: 0, maxGain: 0.284 },
  }

  private initialized = false
  private animationId: number | null = null
  private unsubscribers: (() => void)[] = []

  async initialize(): Promise<void> {
    if (this.initialized) return
    this.initialized = true // Set immediately to prevent race conditions

    // Load all tracks
    const [synths, pads, mask1, mask2, mask3, mask4, wind] = await Promise.all([
      soundEngine.loadSampleFromUrl('/audio/music/synths.m4a', 'synths'),
      soundEngine.loadSampleFromUrl('/audio/music/pads.m4a', 'pads'),
      soundEngine.loadSampleFromUrl('/audio/music/mask-1-pleasure.m4a', 'mask1'),
      soundEngine.loadSampleFromUrl('/audio/music/mask-2-loneliness.m4a', 'mask2'),
      soundEngine.loadSampleFromUrl('/audio/music/mask-3-raw.m4a', 'mask3'),
      soundEngine.loadSampleFromUrl('/audio/music/mask-4-final.m4a', 'mask4'),
      soundEngine.loadSampleFromUrl('/audio/ambient/wind-loop.m4a', 'wind'),
    ])

    if (!synths || !pads || !mask1 || !mask2 || !mask3 || !mask4 || !wind) {
      console.warn('Failed to load some music tracks')
      this.initialized = false // Reset to allow retry
      return
    }

    this.tracks.synths.sample = synths
    this.tracks.pads.sample = pads
    this.tracks.mask1.sample = mask1
    this.tracks.mask2.sample = mask2
    this.tracks.mask3.sample = mask3
    this.tracks.mask4.sample = mask4
    this.tracks.wind.sample = wind

    // Start all tracks looping at volume 0
    this.tracks.synths.playing = soundEngine.playSample(synths.id, { loop: true, gain: 0 })
    this.tracks.pads.playing = soundEngine.playSample(pads.id, { loop: true, gain: 0 })
    this.tracks.mask1.playing = soundEngine.playSample(mask1.id, { loop: true, gain: 0 })
    this.tracks.mask2.playing = soundEngine.playSample(mask2.id, { loop: true, gain: 0 })
    this.tracks.mask3.playing = soundEngine.playSample(mask3.id, { loop: true, gain: 0 })
    this.tracks.mask4.playing = soundEngine.playSample(mask4.id, { loop: true, gain: 0 })
    this.tracks.wind.playing = soundEngine.playSample(wind.id, { loop: true, gain: 0 })

    // Start fade-in for synths and wind immediately (NoMask state)
    this.tracks.synths.targetGain = this.tracks.synths.maxGain
    this.tracks.wind.targetGain = this.tracks.wind.maxGain

    // Subscribe to player state for pads (movement-based)
    const unsubInput = gameStore.sub(inputDirectionAtom, () => this.updatePadsTarget())
    this.unsubscribers.push(unsubInput)

    // Subscribe to mask state changes for crossfading
    const unsubMask = gameStore.sub(maskStateAtom, () => {
      this.onMaskStateChange(gameStore.get(maskStateAtom))
    })
    this.unsubscribers.push(unsubMask)

    // Start the gain update loop
    this.animationId = requestAnimationFrame(this.updateLoop)

    console.log('MusicManager initialized with mask-based layered tracks')
  }

  private updateLoop = (): void => {
    this.animationId = requestAnimationFrame(this.updateLoop)

    const deltaTime = 1 / 60 // approximate frame time

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

  private onMaskStateChange(state: MaskState): void {
    // Synths always on
    this.tracks.synths.targetGain = this.tracks.synths.maxGain

    // Fade out all mask tracks
    this.tracks.mask1.targetGain = 0
    this.tracks.mask2.targetGain = 0
    this.tracks.mask3.targetGain = 0
    this.tracks.mask4.targetGain = 0

    // Fade in the active mask track based on state
    switch (state) {
      case 'SpringMask':
        this.tracks.mask1.targetGain = this.tracks.mask1.maxGain
        break
      case 'AutumnMask':
        this.tracks.mask2.targetGain = this.tracks.mask2.maxGain
        break
      case 'StormMask':
        this.tracks.mask3.targetGain = this.tracks.mask3.maxGain
        break
      case 'FinalMask':
        this.tracks.mask4.targetGain = this.tracks.mask4.maxGain
        break
      // NoMask: only synths, no mask track
    }
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
  }
}

export const musicManager = new MusicManager()
