/**
 * TrackManager - Lazy-loading synchronized audio track system
 *
 * Features:
 * - Lazy loading with progress tracking
 * - Master clock synchronization for all tracks
 * - State machine: desired vs actual state
 * - Priority-based loading queue
 * - Perfect looping support
 */

import { soundEngine } from './sound-engine'

// ============================================================================
// TYPES
// ============================================================================

export interface TrackMetadata {
  id: string
  url: string
  fallbackUrl?: string  // WAV fallback if M4A not available
  duration: number
  loopStart?: number
  loopEnd?: number
  category: 'music' | 'ambient' | 'sfx'
  tags?: string[]
  defaultGain?: number
  fileSize?: number
}

export interface TrackManifest {
  version: number
  masterLoopDuration: number
  tracks: TrackMetadata[]
}

export type TrackStatus = 'unloaded' | 'loading' | 'ready' | 'playing' | 'error'

export interface TrackState {
  metadata: TrackMetadata
  status: TrackStatus
  buffer: AudioBuffer | null
  source: AudioBufferSourceNode | null
  gainNode: GainNode | null
  targetGain: number
  currentGain: number
  loadProgress: number  // 0-1
  bytesLoaded: number
  bytesTotal: number
  error?: string
  lastUsed: number  // timestamp for LRU
}

export interface DesiredTrackState {
  gain: number
  priority: 'low' | 'high'
}

// ============================================================================
// TRACK MANAGER
// ============================================================================

const FADE_SPEED = 0.8  // gain change per second
const MAX_CONCURRENT_LOADS = 3

class TrackManager {
  private manifest: TrackManifest | null = null
  private tracks: Map<string, TrackState> = new Map()
  private desiredState: Map<string, DesiredTrackState> = new Map()
  private loadQueue: Array<{ trackId: string; priority: 'low' | 'high' }> = []
  private activeLoads = 0
  private animationId: number | null = null
  private subscribers: Set<() => void> = new Set()
  private masterStartTime: number = 0  // AudioContext time when we started
  private initialized = false

  /**
   * Initialize with manifest URL
   */
  async initialize(manifestUrl: string = '/audio/manifest.json'): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    try {
      const response = await fetch(manifestUrl)
      this.manifest = await response.json() as TrackManifest

      // Initialize track states from manifest
      for (const metadata of this.manifest.tracks) {
        this.tracks.set(metadata.id, {
          metadata,
          status: 'unloaded',
          buffer: null,
          source: null,
          gainNode: null,
          targetGain: 0,
          currentGain: 0,
          loadProgress: 0,
          bytesLoaded: 0,
          bytesTotal: metadata.fileSize ?? 0,
          lastUsed: 0,
        })
      }

      // Record master start time
      const ctx = soundEngine.getContext()
      if (ctx) {
        this.masterStartTime = ctx.currentTime
      }

      // Start the update loop
      this.animationId = requestAnimationFrame(this.updateLoop)

      console.log(`TrackManager initialized with ${this.manifest.tracks.length} tracks`)
    } catch (error) {
      console.error('Failed to load track manifest:', error)
      this.initialized = false
      throw error
    }
  }

  /**
   * Get manifest data
   */
  getManifest(): TrackManifest | null {
    return this.manifest
  }

  /**
   * Set target gain for a track (triggers load if needed)
   */
  setTarget(trackId: string, options: { gain: number; priority?: 'low' | 'high' }): void {
    const { gain, priority = 'low' } = options

    this.desiredState.set(trackId, { gain, priority })

    const state = this.tracks.get(trackId)
    if (!state) {
      console.warn(`Track not found: ${trackId}`)
      return
    }

    state.targetGain = gain
    state.lastUsed = Date.now()

    // Trigger load if needed and gain > 0
    if (gain > 0 && state.status === 'unloaded') {
      this.queueLoad(trackId, priority)
    }

    this.notifySubscribers()
  }

  /**
   * Hint that a track might be needed soon (preload)
   */
  hint(trackId: string, options?: { priority?: 'low' | 'high' }): void {
    const priority = options?.priority ?? 'low'
    const state = this.tracks.get(trackId)

    if (!state) {
      console.warn(`Track not found: ${trackId}`)
      return
    }

    if (state.status === 'unloaded') {
      this.queueLoad(trackId, priority)
    }
  }

  /**
   * Get state for a specific track
   */
  getTrackState(trackId: string): TrackState | undefined {
    return this.tracks.get(trackId)
  }

  /**
   * Get all track states
   */
  getAllTrackStates(): Map<string, TrackState> {
    return this.tracks
  }

  /**
   * Get tracks by category
   */
  getTracksByCategory(category: 'music' | 'ambient' | 'sfx'): TrackState[] {
    return Array.from(this.tracks.values()).filter(t => t.metadata.category === category)
  }

  /**
   * Get tracks by tag
   */
  getTracksByTag(tag: string): TrackState[] {
    return Array.from(this.tracks.values()).filter(t => t.metadata.tags?.includes(tag))
  }

  /**
   * Get total loaded bytes
   */
  getTotalLoadedBytes(): number {
    let total = 0
    for (const state of this.tracks.values()) {
      total += state.bytesLoaded
    }
    return total
  }

  /**
   * Get total manifest bytes (estimated)
   */
  getTotalManifestBytes(): number {
    let total = 0
    for (const state of this.tracks.values()) {
      total += state.bytesTotal || state.metadata.fileSize || 0
    }
    return total
  }

  /**
   * Get currently loading tracks
   */
  getLoadingTracks(): TrackState[] {
    return Array.from(this.tracks.values()).filter(t => t.status === 'loading')
  }

  /**
   * Get queued tracks
   */
  getQueuedTracks(): string[] {
    return this.loadQueue.map(q => q.trackId)
  }

  /**
   * Get master clock position (for sync visualization)
   */
  getMasterClockPosition(): number {
    const ctx = soundEngine.getContext()
    if (!ctx || !this.manifest) return 0

    const elapsed = ctx.currentTime - this.masterStartTime
    return elapsed % this.manifest.masterLoopDuration
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    for (const state of this.tracks.values()) {
      this.stopTrack(state)
    }

    this.tracks.clear()
    this.desiredState.clear()
    this.loadQueue = []
    this.subscribers.clear()
    this.initialized = false
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      callback()
    }
  }

  private queueLoad(trackId: string, priority: 'low' | 'high'): void {
    // Check if already queued or loading
    const state = this.tracks.get(trackId)
    if (!state || state.status === 'loading') return
    if (this.loadQueue.some(q => q.trackId === trackId)) return

    // Add to queue
    if (priority === 'high') {
      // Insert at front
      this.loadQueue.unshift({ trackId, priority })
    } else {
      this.loadQueue.push({ trackId, priority })
    }

    this.processLoadQueue()
  }

  private async processLoadQueue(): Promise<void> {
    while (this.loadQueue.length > 0 && this.activeLoads < MAX_CONCURRENT_LOADS) {
      const next = this.loadQueue.shift()
      if (!next) break

      const state = this.tracks.get(next.trackId)
      if (!state || state.status !== 'unloaded') continue

      this.activeLoads++
      state.status = 'loading'
      this.notifySubscribers()

      try {
        await this.loadTrack(state)
        state.status = 'ready'

        // If target gain > 0, start playing
        if (state.targetGain > 0) {
          this.startTrack(state)
        }
      } catch (error) {
        state.status = 'error'
        state.error = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to load track ${state.metadata.id}:`, error)
      }

      this.activeLoads--
      this.notifySubscribers()
    }
  }

  private async loadTrack(state: TrackState): Promise<void> {
    const ctx = soundEngine.getContext()
    if (!ctx) throw new Error('AudioContext not initialized')

    const { metadata } = state

    // Try primary URL first, fall back to fallbackUrl
    let url = `/audio/${metadata.url}`
    let useFallback = false

    try {
      // Check if M4A exists
      const headResponse = await fetch(url, { method: 'HEAD' })
      if (!headResponse.ok && metadata.fallbackUrl) {
        url = `/audio/${metadata.fallbackUrl}`
        useFallback = true
      }
    } catch {
      if (metadata.fallbackUrl) {
        url = `/audio/${metadata.fallbackUrl}`
        useFallback = true
      }
    }

    // Load with progress
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentLength = response.headers.get('content-length')
    state.bytesTotal = contentLength ? parseInt(contentLength) : 0

    if (response.body) {
      // Stream loading with progress
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        state.bytesLoaded = loaded
        state.loadProgress = state.bytesTotal > 0 ? loaded / state.bytesTotal : 0
        this.notifySubscribers()
      }

      // Combine chunks
      const arrayBuffer = new Uint8Array(loaded)
      let offset = 0
      for (const chunk of chunks) {
        arrayBuffer.set(chunk, offset)
        offset += chunk.length
      }

      state.buffer = await ctx.decodeAudioData(arrayBuffer.buffer)
    } else {
      // Fallback: no streaming progress
      const arrayBuffer = await response.arrayBuffer()
      state.bytesLoaded = arrayBuffer.byteLength
      state.bytesTotal = arrayBuffer.byteLength
      state.loadProgress = 1
      state.buffer = await ctx.decodeAudioData(arrayBuffer)
    }

    if (useFallback) {
      console.log(`Loaded ${metadata.id} from fallback: ${url}`)
    }
  }

  private startTrack(state: TrackState): void {
    const ctx = soundEngine.getContext()
    const masterGain = soundEngine.getMasterGain()
    if (!ctx || !masterGain || !state.buffer) return

    // Stop existing if any
    this.stopTrack(state)

    // Create nodes
    const source = ctx.createBufferSource()
    source.buffer = state.buffer
    source.loop = true

    const { metadata } = state
    const loopStart = metadata.loopStart ?? 0
    const loopEnd = metadata.loopEnd ?? metadata.duration
    source.loopStart = loopStart
    source.loopEnd = loopEnd

    const gainNode = ctx.createGain()
    gainNode.gain.value = state.currentGain

    // Connect
    source.connect(gainNode)
    gainNode.connect(masterGain)

    // Calculate sync offset
    const loopDuration = loopEnd - loopStart
    const elapsed = ctx.currentTime - this.masterStartTime
    const offset = loopStart + (elapsed % loopDuration)

    // Start at synchronized position
    source.start(0, offset)

    state.source = source
    state.gainNode = gainNode
    state.status = 'playing'
    state.lastUsed = Date.now()
  }

  private stopTrack(state: TrackState): void {
    if (state.source) {
      try {
        state.source.stop()
        state.source.disconnect()
      } catch { /* Already stopped */ }
      state.source = null
    }

    if (state.gainNode) {
      state.gainNode.disconnect()
      state.gainNode = null
    }

    if (state.status === 'playing') {
      state.status = 'ready'
    }
  }

  private updateLoop = (): void => {
    this.animationId = requestAnimationFrame(this.updateLoop)

    const deltaTime = 1 / 60  // approximate frame time

    for (const state of this.tracks.values()) {
      // Fade gain toward target
      const diff = state.targetGain - state.currentGain
      if (Math.abs(diff) > 0.001) {
        const change = Math.sign(diff) * Math.min(Math.abs(diff), FADE_SPEED * deltaTime)
        state.currentGain += change

        if (state.gainNode) {
          state.gainNode.gain.value = state.currentGain
        }
      }

      // Start playing if gain > 0 and ready but not playing
      if (state.currentGain > 0 && state.status === 'ready') {
        this.startTrack(state)
      }

      // Stop playing if gain === 0 and playing
      if (state.currentGain === 0 && state.targetGain === 0 && state.status === 'playing') {
        this.stopTrack(state)
      }
    }
  }
}

// Export singleton instance
export const trackManager = new TrackManager()
