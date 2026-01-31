/**
 * SoundEngine - WebAudio-based sound system with spatial audio support
 *
 * This engine provides:
 * - Spatial audio (3D positioned sounds)
 * - Synthesizers (oscillators)
 * - Noise generators (white, pink, brown)
 * - Audio effects (filters, gain, delay, reverb)
 * - Sample upload and playback
 */

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'
export type NoiseType = 'white' | 'pink' | 'brown'
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'lowshelf' | 'highshelf' | 'peaking'

export interface SpatialPosition {
  x: number
  y: number
  z: number
}

export interface EffectChainConfig {
  lowpass?: { frequency: number; Q?: number }
  highpass?: { frequency: number; Q?: number }
  bandpass?: { frequency: number; Q?: number }
  gain?: number
  delay?: { time: number; feedback?: number }
  reverb?: { decay: number; wet?: number }
}

export interface PlayingSound {
  id: string
  type: 'oscillator' | 'noise' | 'sample'
  source: AudioScheduledSourceNode | AudioBufferSourceNode
  gainNode: GainNode
  pannerNode?: PannerNode
  effectNodes: AudioNode[]
  stop: () => void
  setGain: (gain: number) => void
  setPosition?: (pos: SpatialPosition) => void
  setFrequency?: (freq: number) => void
  setFilterFrequency?: (freq: number) => void
}

export interface LoadedSample {
  id: string
  name: string
  buffer: AudioBuffer
  duration: number
}

class SoundEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private listener: AudioListener | null = null
  private playingSounds: Map<string, PlayingSound> = new Map()
  private loadedSamples: Map<string, LoadedSample> = new Map()
  private nextSoundId = 0
  private reverbBuffer: AudioBuffer | null = null

  // Event callbacks
  private onSoundEndCallbacks: Map<string, () => void> = new Map()

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.context) return

    this.context = new AudioContext()
    this.masterGain = this.context.createGain()
    this.masterGain.connect(this.context.destination)

    // Set up spatial audio listener
    this.listener = this.context.listener
    if (this.listener.positionX) {
      // Modern API
      this.listener.positionX.value = 0
      this.listener.positionY.value = 0
      this.listener.positionZ.value = 0
      this.listener.forwardX.value = 0
      this.listener.forwardY.value = 0
      this.listener.forwardZ.value = -1
      this.listener.upX.value = 0
      this.listener.upY.value = 1
      this.listener.upZ.value = 0
    } else {
      // Legacy API
      this.listener.setPosition(0, 0, 0)
      this.listener.setOrientation(0, 0, -1, 0, 1, 0)
    }

    // Generate impulse response for reverb
    await this.generateReverbImpulse()

    console.log('SoundEngine initialized')
  }

  /**
   * Resume audio context if suspended (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume()
    }
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState | 'uninitialized' {
    return this.context?.state ?? 'uninitialized'
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 1
  }

  /**
   * Update listener position for spatial audio
   */
  setListenerPosition(pos: SpatialPosition): void {
    if (!this.listener) return

    if (this.listener.positionX) {
      this.listener.positionX.value = pos.x
      this.listener.positionY.value = pos.y
      this.listener.positionZ.value = pos.z
    } else {
      this.listener.setPosition(pos.x, pos.y, pos.z)
    }
  }

  /**
   * Update listener orientation for spatial audio
   */
  setListenerOrientation(forward: SpatialPosition, up: SpatialPosition): void {
    if (!this.listener) return

    if (this.listener.forwardX) {
      this.listener.forwardX.value = forward.x
      this.listener.forwardY.value = forward.y
      this.listener.forwardZ.value = forward.z
      this.listener.upX.value = up.x
      this.listener.upY.value = up.y
      this.listener.upZ.value = up.z
    } else {
      this.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z)
    }
  }

  // ========================
  // OSCILLATOR SYNTHESIS
  // ========================

  /**
   * Play an oscillator tone
   */
  playOscillator(
    type: OscillatorType,
    frequency: number,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      duration?: number
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const id = `osc_${this.nextSoundId++}`
    const { gain = 0.3, position, effects, duration } = options

    const oscillator = this.context.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency

    const gainNode = this.context.createGain()
    gainNode.gain.value = gain

    // Build effect chain
    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    // Spatial audio setup
    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    // Connect: oscillator -> effects -> panner? -> gain -> master
    oscillator.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1] : oscillator
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain)

    oscillator.start()

    if (duration !== undefined) {
      oscillator.stop(this.context.currentTime + duration)
    }

    const playingSound: PlayingSound = {
      id,
      type: 'oscillator',
      source: oscillator,
      gainNode,
      pannerNode,
      effectNodes,
      stop: () => {
        try {
          oscillator.stop()
        } catch (e) {
          // Already stopped
        }
        this.cleanupSound(id)
      },
      setGain: (g: number) => {
        gainNode.gain.value = Math.max(0, Math.min(1, g))
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFrequency: (freq: number) => {
        oscillator.frequency.value = freq
      },
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined
    }

    oscillator.onended = () => {
      this.cleanupSound(id)
      this.onSoundEndCallbacks.get(id)?.()
    }

    this.playingSounds.set(id, playingSound)
    return playingSound
  }

  // ========================
  // NOISE GENERATORS
  // ========================

  /**
   * Play noise
   */
  playNoise(
    type: NoiseType,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      duration?: number
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const id = `noise_${this.nextSoundId++}`
    const { gain = 0.2, position, effects, duration } = options

    // Create noise buffer
    const bufferSize = this.context.sampleRate * 2 // 2 seconds of noise
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
    const data = buffer.getChannelData(0)

    switch (type) {
      case 'white':
        this.generateWhiteNoise(data)
        break
      case 'pink':
        this.generatePinkNoise(data)
        break
      case 'brown':
        this.generateBrownNoise(data)
        break
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gainNode = this.context.createGain()
    gainNode.gain.value = gain

    // Build effect chain
    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    // Spatial audio setup
    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    // Connect: source -> effects -> panner? -> gain -> master
    source.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1] : source
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain)

    source.start()

    if (duration !== undefined) {
      source.stop(this.context.currentTime + duration)
    }

    const playingSound: PlayingSound = {
      id,
      type: 'noise',
      source,
      gainNode,
      pannerNode,
      effectNodes,
      stop: () => {
        try {
          source.stop()
        } catch (e) {
          // Already stopped
        }
        this.cleanupSound(id)
      },
      setGain: (g: number) => {
        gainNode.gain.value = Math.max(0, Math.min(1, g))
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined
    }

    source.onended = () => {
      this.cleanupSound(id)
      this.onSoundEndCallbacks.get(id)?.()
    }

    this.playingSounds.set(id, playingSound)
    return playingSound
  }

  private generateWhiteNoise(data: Float32Array): void {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }

  private generatePinkNoise(data: Float32Array): void {
    // Pink noise using Voss-McCartney algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }

  private generateBrownNoise(data: Float32Array): void {
    // Brown noise (random walk / Brownian motion)
    let lastOut = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3.5 // Normalize
    }
  }

  // ========================
  // SAMPLE PLAYBACK
  // ========================

  /**
   * Load an audio sample from a file
   */
  async loadSample(file: File): Promise<LoadedSample | null> {
    if (!this.context) return null

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

      const sample: LoadedSample = {
        id: `sample_${this.nextSoundId++}`,
        name: file.name,
        buffer: audioBuffer,
        duration: audioBuffer.duration
      }

      this.loadedSamples.set(sample.id, sample)
      return sample
    } catch (error) {
      console.error('Failed to load sample:', error)
      return null
    }
  }

  /**
   * Load an audio sample from a URL
   */
  async loadSampleFromUrl(url: string, name: string): Promise<LoadedSample | null> {
    if (!this.context) return null

    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

      const sample: LoadedSample = {
        id: `sample_${this.nextSoundId++}`,
        name,
        buffer: audioBuffer,
        duration: audioBuffer.duration
      }

      this.loadedSamples.set(sample.id, sample)
      return sample
    } catch (error) {
      console.error('Failed to load sample from URL:', error)
      return null
    }
  }

  /**
   * Get all loaded samples
   */
  getLoadedSamples(): LoadedSample[] {
    return Array.from(this.loadedSamples.values())
  }

  /**
   * Remove a loaded sample
   */
  removeSample(sampleId: string): void {
    this.loadedSamples.delete(sampleId)
  }

  /**
   * Play a loaded sample
   */
  playSample(
    sampleId: string,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      loop?: boolean
      playbackRate?: number
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const sample = this.loadedSamples.get(sampleId)
    if (!sample) return null

    const id = `play_${this.nextSoundId++}`
    const { gain = 0.5, position, effects, loop = false, playbackRate = 1 } = options

    const source = this.context.createBufferSource()
    source.buffer = sample.buffer
    source.loop = loop
    source.playbackRate.value = playbackRate

    const gainNode = this.context.createGain()
    gainNode.gain.value = gain

    // Build effect chain
    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    // Spatial audio setup
    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    // Connect: source -> effects -> panner? -> gain -> master
    source.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1] : source
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain)

    source.start()

    const playingSound: PlayingSound = {
      id,
      type: 'sample',
      source,
      gainNode,
      pannerNode,
      effectNodes,
      stop: () => {
        try {
          source.stop()
        } catch (e) {
          // Already stopped
        }
        this.cleanupSound(id)
      },
      setGain: (g: number) => {
        gainNode.gain.value = Math.max(0, Math.min(1, g))
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined
    }

    source.onended = () => {
      this.cleanupSound(id)
      this.onSoundEndCallbacks.get(id)?.()
    }

    this.playingSounds.set(id, playingSound)
    return playingSound
  }

  // ========================
  // EFFECT CHAIN
  // ========================

  private buildEffectChain(config?: EffectChainConfig): {
    chain: AudioNode
    nodes: AudioNode[]
    filterNode: BiquadFilterNode | null
  } {
    if (!this.context) {
      throw new Error('Audio context not initialized')
    }

    const nodes: AudioNode[] = []
    let filterNode: BiquadFilterNode | null = null

    // Create a pass-through gain node as the entry point
    const inputGain = this.context.createGain()
    inputGain.gain.value = 1
    nodes.push(inputGain)

    if (config) {
      // Low-pass filter
      if (config.lowpass) {
        const filter = this.context.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = config.lowpass.frequency
        filter.Q.value = config.lowpass.Q ?? 1
        nodes.push(filter)
        filterNode = filter
      }

      // High-pass filter
      if (config.highpass) {
        const filter = this.context.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = config.highpass.frequency
        filter.Q.value = config.highpass.Q ?? 1
        nodes.push(filter)
        if (!filterNode) filterNode = filter
      }

      // Band-pass filter
      if (config.bandpass) {
        const filter = this.context.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.value = config.bandpass.frequency
        filter.Q.value = config.bandpass.Q ?? 1
        nodes.push(filter)
        if (!filterNode) filterNode = filter
      }

      // Gain stage
      if (config.gain !== undefined) {
        const gainNode = this.context.createGain()
        gainNode.gain.value = config.gain
        nodes.push(gainNode)
      }

      // Delay
      if (config.delay) {
        const delayNode = this.context.createDelay(5)
        delayNode.delayTime.value = config.delay.time

        if (config.delay.feedback) {
          // Create feedback loop
          const feedbackGain = this.context.createGain()
          feedbackGain.gain.value = config.delay.feedback
          delayNode.connect(feedbackGain)
          feedbackGain.connect(delayNode)
        }

        nodes.push(delayNode)
      }

      // Reverb (convolution)
      if (config.reverb && this.reverbBuffer) {
        const convolver = this.context.createConvolver()
        convolver.buffer = this.reverbBuffer

        // Create wet/dry mix
        const wetGain = this.context.createGain()
        wetGain.gain.value = config.reverb.wet ?? 0.3
        convolver.connect(wetGain)

        nodes.push(convolver)
        nodes.push(wetGain)
      }
    }

    // Connect all nodes in series
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1])
    }

    return {
      chain: nodes[0],
      nodes,
      filterNode
    }
  }

  // ========================
  // SPATIAL AUDIO HELPERS
  // ========================

  private createPannerNode(position: SpatialPosition): PannerNode {
    const panner = this.context!.createPanner()

    // Configure panner for realistic 3D audio
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = 1
    panner.maxDistance = 100
    panner.rolloffFactor = 1
    panner.coneInnerAngle = 360
    panner.coneOuterAngle = 360
    panner.coneOuterGain = 0

    this.updatePannerPosition(panner, position)

    return panner
  }

  private updatePannerPosition(panner: PannerNode, position: SpatialPosition): void {
    if (panner.positionX) {
      panner.positionX.value = position.x
      panner.positionY.value = position.y
      panner.positionZ.value = position.z
    } else {
      panner.setPosition(position.x, position.y, position.z)
    }
  }

  // ========================
  // REVERB IMPULSE RESPONSE
  // ========================

  private async generateReverbImpulse(): Promise<void> {
    if (!this.context) return

    const sampleRate = this.context.sampleRate
    const length = sampleRate * 2 // 2 seconds
    const decay = 2

    const buffer = this.context.createBuffer(2, length, sampleRate)
    const leftChannel = buffer.getChannelData(0)
    const rightChannel = buffer.getChannelData(1)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const amplitude = Math.exp(-t * (3 / decay))
      leftChannel[i] = (Math.random() * 2 - 1) * amplitude
      rightChannel[i] = (Math.random() * 2 - 1) * amplitude
    }

    this.reverbBuffer = buffer
  }

  /**
   * Update reverb parameters (regenerates impulse response)
   */
  async updateReverb(decay: number): Promise<void> {
    if (!this.context) return

    const sampleRate = this.context.sampleRate
    const length = sampleRate * Math.min(decay, 5) // Cap at 5 seconds

    const buffer = this.context.createBuffer(2, length, sampleRate)
    const leftChannel = buffer.getChannelData(0)
    const rightChannel = buffer.getChannelData(1)

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      const amplitude = Math.exp(-t * (3 / decay))
      leftChannel[i] = (Math.random() * 2 - 1) * amplitude
      rightChannel[i] = (Math.random() * 2 - 1) * amplitude
    }

    this.reverbBuffer = buffer
  }

  // ========================
  // SOUND MANAGEMENT
  // ========================

  /**
   * Get all currently playing sounds
   */
  getPlayingSounds(): PlayingSound[] {
    return Array.from(this.playingSounds.values())
  }

  /**
   * Stop all playing sounds
   */
  stopAll(): void {
    for (const sound of this.playingSounds.values()) {
      sound.stop()
    }
    this.playingSounds.clear()
  }

  /**
   * Register a callback for when a sound ends
   */
  onSoundEnd(soundId: string, callback: () => void): void {
    this.onSoundEndCallbacks.set(soundId, callback)
  }

  private cleanupSound(id: string): void {
    const sound = this.playingSounds.get(id)
    if (sound) {
      // Disconnect all nodes
      sound.source.disconnect()
      sound.gainNode.disconnect()
      sound.pannerNode?.disconnect()
      sound.effectNodes.forEach(node => node.disconnect())
      this.playingSounds.delete(id)
    }
    this.onSoundEndCallbacks.delete(id)
  }

  // ========================
  // CLEANUP
  // ========================

  /**
   * Destroy the sound engine and release all resources
   */
  destroy(): void {
    this.stopAll()
    this.loadedSamples.clear()
    this.onSoundEndCallbacks.clear()

    if (this.context) {
      this.context.close()
      this.context = null
    }

    this.masterGain = null
    this.listener = null
    this.reverbBuffer = null

    console.log('SoundEngine destroyed')
  }
}

// Export singleton instance
export const soundEngine = new SoundEngine()
