/**
 * SoundEngine - WebAudio-based sound system with spatial audio support
 *
 * This engine provides:
 * - Spatial audio (3D positioned sounds)
 * - Synthesizers (oscillators) with ADSR envelopes
 * - Noise generators (white, pink, brown)
 * - LFO modulation (tremolo, vibrato, filter wobble)
 * - Audio effects (filters, gain, delay, reverb, distortion, compressor)
 * - Sample upload and playback
 * - Real-time waveform/spectrum analysis
 */

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'
export type NoiseType = 'white' | 'pink' | 'brown'
export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'lowshelf' | 'highshelf' | 'peaking' | 'allpass'
export type LFOTarget = 'gain' | 'frequency' | 'filter' | 'pan'

export interface SpatialPosition {
  x: number
  y: number
  z: number
}

export interface ADSREnvelope {
  attack: number   // Time in seconds to reach peak
  decay: number    // Time in seconds to reach sustain level
  sustain: number  // Sustain level (0-1)
  release: number  // Time in seconds to fade out after note off
}

export interface LFOConfig {
  type: OscillatorType
  frequency: number  // LFO rate in Hz
  depth: number      // Modulation depth (0-1)
  target: LFOTarget  // What parameter to modulate
}

export interface FilterConfig {
  type: FilterType
  frequency: number
  Q?: number
  gain?: number  // For shelf and peaking filters
}

export interface EffectChainConfig {
  filters?: FilterConfig[]
  // Legacy single filter support
  lowpass?: { frequency: number; Q?: number }
  highpass?: { frequency: number; Q?: number }
  bandpass?: { frequency: number; Q?: number }
  notch?: { frequency: number; Q?: number }
  lowshelf?: { frequency: number; gain?: number }
  highshelf?: { frequency: number; gain?: number }
  peaking?: { frequency: number; Q?: number; gain?: number }
  // Other effects
  gain?: number
  delay?: { time: number; feedback?: number; wet?: number }
  reverb?: { decay: number; wet?: number }
  distortion?: { amount: number }  // 0-100
  compressor?: { threshold?: number; knee?: number; ratio?: number; attack?: number; release?: number }
}

export interface PlayingSound {
  id: string
  type: 'oscillator' | 'noise' | 'sample'
  source: AudioScheduledSourceNode | AudioBufferSourceNode
  gainNode: GainNode
  pannerNode?: PannerNode
  effectNodes: AudioNode[]
  lfoNode?: OscillatorNode
  lfoGainNode?: GainNode
  envelope?: ADSREnvelope
  stop: () => void
  release: () => void  // Trigger release phase of envelope
  setGain: (gain: number) => void
  setPosition?: (pos: SpatialPosition) => void
  setFrequency?: (freq: number) => void
  setFilterFrequency?: (freq: number) => void
  setLFOFrequency?: (freq: number) => void
  setLFODepth?: (depth: number) => void
}

export interface LoadedSample {
  id: string
  name: string
  buffer: AudioBuffer
  duration: number
  channels: number
  sampleRate: number
}


class SoundEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private listener: AudioListener | null = null
  private playingSounds: Map<string, PlayingSound> = new Map()
  private loadedSamples: Map<string, LoadedSample> = new Map()
  private nextSoundId = 0
  private reverbBuffer: AudioBuffer | null = null

  // Analyzer data arrays (reused for performance)
  private waveformData: Uint8Array<ArrayBuffer> | null = null
  private frequencyData: Uint8Array<ArrayBuffer> | null = null

  // Event callbacks
  private onSoundEndCallbacks: Map<string, () => void> = new Map()

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.context) return

    this.context = new AudioContext()

    // Create analyzer for visualization
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.8

    // Initialize data arrays
    this.waveformData = new Uint8Array(this.analyser.frequencyBinCount)
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)

    // Create master gain and connect through analyzer
    this.masterGain = this.context.createGain()
    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.context.destination)

    // Set up spatial audio listener
    this.listener = this.context.listener
    if (this.listener.positionX) {
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
      this.listener.setPosition(0, 0, 0)
      this.listener.setOrientation(0, 0, -1, 0, 1, 0)
    }

    // Generate impulse response for reverb
    await this.generateReverbImpulse()

    console.log('SoundEngine initialized with analyzer')
  }

  /**
   * Resume audio context if suspended
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
   * Get current time from audio context
   */
  getCurrentTime(): number {
    return this.context?.currentTime ?? 0
  }

  /**
   * Get sample rate
   */
  getSampleRate(): number {
    return this.context?.sampleRate ?? 44100
  }

  // ========================
  // VISUALIZATION
  // ========================

  /**
   * Get waveform data for visualization (time domain)
   */
  getWaveformData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser || !this.waveformData) return null
    this.analyser.getByteTimeDomainData(this.waveformData)
    return this.waveformData
  }

  /**
   * Get frequency data for visualization (spectrum)
   */
  getFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyser || !this.frequencyData) return null
    this.analyser.getByteFrequencyData(this.frequencyData)
    return this.frequencyData
  }

  /**
   * Get analyzer FFT size
   */
  getAnalyserFFTSize(): number {
    return this.analyser?.fftSize ?? 2048
  }

  /**
   * Set analyzer FFT size (must be power of 2)
   */
  setAnalyserFFTSize(size: number): void {
    if (this.analyser) {
      this.analyser.fftSize = size
      this.waveformData = new Uint8Array(this.analyser.frequencyBinCount)
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    }
  }

  // ========================
  // MASTER CONTROLS
  // ========================

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }
  }

  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 1
  }

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
  // OSCILLATOR SYNTHESIS WITH ADSR & LFO
  // ========================

  /**
   * Play an oscillator with optional ADSR envelope and LFO
   */
  playOscillator(
    type: OscillatorType,
    frequency: number,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      duration?: number
      envelope?: ADSREnvelope
      lfo?: LFOConfig
      detune?: number
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const id = `osc_${this.nextSoundId++}`
    const { gain = 0.3, position, effects, duration, envelope, lfo, detune = 0 } = options
    const now = this.context.currentTime

    const oscillator = this.context.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency
    oscillator.detune.value = detune

    const gainNode = this.context.createGain()

    // Apply ADSR envelope if provided
    if (envelope) {
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(gain, now + envelope.attack)
      gainNode.gain.linearRampToValueAtTime(gain * envelope.sustain, now + envelope.attack + envelope.decay)
    } else {
      gainNode.gain.value = gain
    }

    // Build effect chain
    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    // LFO setup
    let lfoNode: OscillatorNode | undefined
    let lfoGainNode: GainNode | undefined
    if (lfo) {
      lfoNode = this.context.createOscillator()
      lfoNode.type = lfo.type
      lfoNode.frequency.value = lfo.frequency

      lfoGainNode = this.context.createGain()
      lfoGainNode.gain.value = lfo.depth

      lfoNode.connect(lfoGainNode)

      switch (lfo.target) {
        case 'gain':
          lfoGainNode.connect(gainNode.gain)
          break
        case 'frequency':
          lfoGainNode.gain.value = lfo.depth * frequency * 0.1 // Scale for frequency
          lfoGainNode.connect(oscillator.frequency)
          break
        case 'filter':
          if (filterNode) {
            lfoGainNode.gain.value = lfo.depth * 1000 // Scale for filter frequency
            lfoGainNode.connect(filterNode.frequency)
          }
          break
      }

      lfoNode.start()
    }

    // Spatial audio setup
    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    // Connect chain
    oscillator.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1]! : oscillator
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain!)

    oscillator.start()

    if (duration !== undefined && !envelope) {
      oscillator.stop(now + duration)
    }

    const playingSound: PlayingSound = {
      id,
      type: 'oscillator',
      source: oscillator,
      gainNode,
      pannerNode,
      effectNodes,
      lfoNode,
      lfoGainNode,
      envelope,
      stop: () => {
        try {
          lfoNode?.stop()
          oscillator.stop()
        } catch (e) { /* Already stopped */ }
        this.cleanupSound(id)
      },
      release: () => {
        if (envelope && this.context) {
          const releaseTime = this.context.currentTime
          gainNode.gain.cancelScheduledValues(releaseTime)
          gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime)
          gainNode.gain.linearRampToValueAtTime(0, releaseTime + envelope.release)
          oscillator.stop(releaseTime + envelope.release)
        } else {
          playingSound.stop()
        }
      },
      setGain: (g: number) => {
        if (!envelope) {
          gainNode.gain.value = Math.max(0, Math.min(1, g))
        }
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFrequency: (freq: number) => {
        oscillator.frequency.value = freq
      },
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined,
      setLFOFrequency: lfoNode ? (freq: number) => {
        lfoNode!.frequency.value = freq
      } : undefined,
      setLFODepth: lfoGainNode ? (depth: number) => {
        lfoGainNode!.gain.value = depth
      } : undefined
    }

    oscillator.onended = () => {
      lfoNode?.stop()
      this.cleanupSound(id)
      this.onSoundEndCallbacks.get(id)?.()
    }

    this.playingSounds.set(id, playingSound)
    return playingSound
  }

  // ========================
  // NOISE GENERATORS
  // ========================

  playNoise(
    type: NoiseType,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      duration?: number
      envelope?: ADSREnvelope
      lfo?: LFOConfig
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const id = `noise_${this.nextSoundId++}`
    const { gain = 0.2, position, effects, duration, envelope, lfo } = options
    const now = this.context.currentTime

    // Create noise buffer
    const bufferSize = this.context.sampleRate * 2
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
    const data = buffer.getChannelData(0)

    switch (type) {
      case 'white': this.generateWhiteNoise(data); break
      case 'pink': this.generatePinkNoise(data); break
      case 'brown': this.generateBrownNoise(data); break
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gainNode = this.context.createGain()

    // Apply ADSR envelope
    if (envelope) {
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(gain, now + envelope.attack)
      gainNode.gain.linearRampToValueAtTime(gain * envelope.sustain, now + envelope.attack + envelope.decay)
    } else {
      gainNode.gain.value = gain
    }

    // Build effect chain
    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    // LFO setup
    let lfoNode: OscillatorNode | undefined
    let lfoGainNode: GainNode | undefined
    if (lfo) {
      lfoNode = this.context.createOscillator()
      lfoNode.type = lfo.type
      lfoNode.frequency.value = lfo.frequency

      lfoGainNode = this.context.createGain()
      lfoGainNode.gain.value = lfo.depth

      lfoNode.connect(lfoGainNode)

      switch (lfo.target) {
        case 'gain':
          lfoGainNode.connect(gainNode.gain)
          break
        case 'filter':
          if (filterNode) {
            lfoGainNode.gain.value = lfo.depth * 1000
            lfoGainNode.connect(filterNode.frequency)
          }
          break
      }

      lfoNode.start()
    }

    // Spatial audio
    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    // Connect chain
    source.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1]! : source
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain!)

    source.start()

    if (duration !== undefined && !envelope) {
      source.stop(now + duration)
    }

    const playingSound: PlayingSound = {
      id,
      type: 'noise',
      source,
      gainNode,
      pannerNode,
      effectNodes,
      lfoNode,
      lfoGainNode,
      envelope,
      stop: () => {
        try {
          lfoNode?.stop()
          source.stop()
        } catch (e) { /* Already stopped */ }
        this.cleanupSound(id)
      },
      release: () => {
        if (envelope && this.context) {
          const releaseTime = this.context.currentTime
          gainNode.gain.cancelScheduledValues(releaseTime)
          gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime)
          gainNode.gain.linearRampToValueAtTime(0, releaseTime + envelope.release)
          source.stop(releaseTime + envelope.release)
        } else {
          playingSound.stop()
        }
      },
      setGain: (g: number) => {
        if (!envelope) {
          gainNode.gain.value = Math.max(0, Math.min(1, g))
        }
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined,
      setLFOFrequency: lfoNode ? (freq: number) => {
        lfoNode!.frequency.value = freq
      } : undefined,
      setLFODepth: lfoGainNode ? (depth: number) => {
        lfoGainNode!.gain.value = depth
      } : undefined
    }

    source.onended = () => {
      lfoNode?.stop()
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
    let lastOut = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      lastOut = (lastOut + 0.02 * white) / 1.02
      data[i] = lastOut * 3.5
    }
  }

  // ========================
  // SAMPLE PLAYBACK
  // ========================

  async loadSample(file: File): Promise<LoadedSample | null> {
    if (!this.context) return null

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

      const sample: LoadedSample = {
        id: `sample_${this.nextSoundId++}`,
        name: file.name,
        buffer: audioBuffer,
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      }

      this.loadedSamples.set(sample.id, sample)
      return sample
    } catch (error) {
      console.error('Failed to load sample:', error)
      return null
    }
  }

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
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      }

      this.loadedSamples.set(sample.id, sample)
      return sample
    } catch (error) {
      console.error('Failed to load sample from URL:', error)
      return null
    }
  }

  getLoadedSamples(): LoadedSample[] {
    return Array.from(this.loadedSamples.values())
  }

  removeSample(sampleId: string): void {
    this.loadedSamples.delete(sampleId)
  }

  playSample(
    sampleId: string,
    options: {
      gain?: number
      position?: SpatialPosition
      effects?: EffectChainConfig
      loop?: boolean
      playbackRate?: number
      envelope?: ADSREnvelope
      lfo?: LFOConfig
      startOffset?: number
    } = {}
  ): PlayingSound | null {
    if (!this.context || !this.masterGain) return null

    const sample = this.loadedSamples.get(sampleId)
    if (!sample) return null

    const id = `play_${this.nextSoundId++}`
    const { gain = 0.5, position, effects, loop = false, playbackRate = 1, envelope, lfo, startOffset = 0 } = options
    const now = this.context.currentTime

    const source = this.context.createBufferSource()
    source.buffer = sample.buffer
    source.loop = loop
    source.playbackRate.value = playbackRate

    const gainNode = this.context.createGain()

    if (envelope) {
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(gain, now + envelope.attack)
      gainNode.gain.linearRampToValueAtTime(gain * envelope.sustain, now + envelope.attack + envelope.decay)
    } else {
      gainNode.gain.value = gain
    }

    const { chain: effectChain, nodes: effectNodes, filterNode } = this.buildEffectChain(effects)

    let lfoNode: OscillatorNode | undefined
    let lfoGainNode: GainNode | undefined
    if (lfo) {
      lfoNode = this.context.createOscillator()
      lfoNode.type = lfo.type
      lfoNode.frequency.value = lfo.frequency

      lfoGainNode = this.context.createGain()
      lfoGainNode.gain.value = lfo.depth

      lfoNode.connect(lfoGainNode)

      if (lfo.target === 'gain') {
        lfoGainNode.connect(gainNode.gain)
      } else if (lfo.target === 'filter' && filterNode) {
        lfoGainNode.gain.value = lfo.depth * 1000
        lfoGainNode.connect(filterNode.frequency)
      }

      lfoNode.start()
    }

    let pannerNode: PannerNode | undefined
    if (position) {
      pannerNode = this.createPannerNode(position)
    }

    source.connect(effectChain)
    let lastNode: AudioNode = effectNodes.length > 0 ? effectNodes[effectNodes.length - 1]! : source
    if (pannerNode) {
      lastNode.connect(pannerNode)
      pannerNode.connect(gainNode)
    } else {
      lastNode.connect(gainNode)
    }
    gainNode.connect(this.masterGain!)

    source.start(0, startOffset)

    const playingSound: PlayingSound = {
      id,
      type: 'sample',
      source,
      gainNode,
      pannerNode,
      effectNodes,
      lfoNode,
      lfoGainNode,
      envelope,
      stop: () => {
        try {
          lfoNode?.stop()
          source.stop()
        } catch (e) { /* Already stopped */ }
        this.cleanupSound(id)
      },
      release: () => {
        if (envelope && this.context) {
          const releaseTime = this.context.currentTime
          gainNode.gain.cancelScheduledValues(releaseTime)
          gainNode.gain.setValueAtTime(gainNode.gain.value, releaseTime)
          gainNode.gain.linearRampToValueAtTime(0, releaseTime + envelope.release)
          source.stop(releaseTime + envelope.release)
        } else {
          playingSound.stop()
        }
      },
      setGain: (g: number) => {
        if (!envelope) {
          gainNode.gain.value = Math.max(0, Math.min(1, g))
        }
      },
      setPosition: pannerNode ? (pos: SpatialPosition) => {
        this.updatePannerPosition(pannerNode!, pos)
      } : undefined,
      setFilterFrequency: filterNode ? (freq: number) => {
        filterNode.frequency.value = freq
      } : undefined,
      setLFOFrequency: lfoNode ? (freq: number) => {
        lfoNode!.frequency.value = freq
      } : undefined,
      setLFODepth: lfoGainNode ? (depth: number) => {
        lfoGainNode!.gain.value = depth
      } : undefined
    }

    source.onended = () => {
      lfoNode?.stop()
      this.cleanupSound(id)
      this.onSoundEndCallbacks.get(id)?.()
    }

    this.playingSounds.set(id, playingSound)
    return playingSound
  }

  // ========================
  // EFFECT CHAIN (ENHANCED)
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

    const inputGain = this.context.createGain()
    inputGain.gain.value = 1
    nodes.push(inputGain)

    if (config) {
      // Process array of filters first (new API)
      if (config.filters) {
        for (const filterConfig of config.filters) {
          const filter = this.context.createBiquadFilter()
          filter.type = filterConfig.type
          filter.frequency.value = filterConfig.frequency
          if (filterConfig.Q !== undefined) filter.Q.value = filterConfig.Q
          if (filterConfig.gain !== undefined) filter.gain.value = filterConfig.gain
          nodes.push(filter)
          if (!filterNode) filterNode = filter
        }
      }

      // Legacy single filter support
      const legacyFilters: Array<{ type: FilterType; config: { frequency: number; Q?: number; gain?: number } }> = []
      if (config.lowpass) legacyFilters.push({ type: 'lowpass', config: config.lowpass })
      if (config.highpass) legacyFilters.push({ type: 'highpass', config: config.highpass })
      if (config.bandpass) legacyFilters.push({ type: 'bandpass', config: config.bandpass })
      if (config.notch) legacyFilters.push({ type: 'notch', config: config.notch })
      if (config.lowshelf) legacyFilters.push({ type: 'lowshelf', config: config.lowshelf })
      if (config.highshelf) legacyFilters.push({ type: 'highshelf', config: config.highshelf })
      if (config.peaking) legacyFilters.push({ type: 'peaking', config: config.peaking })

      for (const { type, config: filterCfg } of legacyFilters) {
        const filter = this.context.createBiquadFilter()
        filter.type = type
        filter.frequency.value = filterCfg.frequency
        if (filterCfg.Q !== undefined) filter.Q.value = filterCfg.Q
        if (filterCfg.gain !== undefined) filter.gain.value = filterCfg.gain
        nodes.push(filter)
        if (!filterNode) filterNode = filter
      }

      // Distortion
      if (config.distortion) {
        const distortion = this.context.createWaveShaper()
        distortion.curve = this.makeDistortionCurve(config.distortion.amount)
        distortion.oversample = '4x'
        nodes.push(distortion)
      }

      // Gain stage
      if (config.gain !== undefined) {
        const gainNode = this.context.createGain()
        gainNode.gain.value = config.gain
        nodes.push(gainNode)
      }

      // Compressor
      if (config.compressor) {
        const compressor = this.context.createDynamicsCompressor()
        if (config.compressor.threshold !== undefined) compressor.threshold.value = config.compressor.threshold
        if (config.compressor.knee !== undefined) compressor.knee.value = config.compressor.knee
        if (config.compressor.ratio !== undefined) compressor.ratio.value = config.compressor.ratio
        if (config.compressor.attack !== undefined) compressor.attack.value = config.compressor.attack
        if (config.compressor.release !== undefined) compressor.release.value = config.compressor.release
        nodes.push(compressor)
      }

      // Delay with wet/dry mix
      if (config.delay) {
        const delayNode = this.context.createDelay(5)
        delayNode.delayTime.value = config.delay.time

        const dryGain = this.context.createGain()
        dryGain.gain.value = 1 - (config.delay.wet ?? 0.5)

        const wetGain = this.context.createGain()
        wetGain.gain.value = config.delay.wet ?? 0.5

        const feedbackGain = this.context.createGain()
        feedbackGain.gain.value = config.delay.feedback ?? 0.3

        // Parallel dry and wet paths with feedback
        delayNode.connect(feedbackGain)
        feedbackGain.connect(delayNode)
        delayNode.connect(wetGain)

        // We need to handle this specially in the connection logic
        nodes.push(delayNode)
      }

      // Reverb
      if (config.reverb && this.reverbBuffer) {
        const convolver = this.context.createConvolver()
        convolver.buffer = this.reverbBuffer

        const wetGain = this.context.createGain()
        wetGain.gain.value = config.reverb.wet ?? 0.3
        convolver.connect(wetGain)

        nodes.push(convolver)
        nodes.push(wetGain)
      }
    }

    // Connect all nodes in series
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i]!.connect(nodes[i + 1]!)
    }

    return { chain: nodes[0]!, nodes, filterNode }
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount
    const samples = 44100
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>
    const deg = Math.PI / 180

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
    }

    return curve
  }

  // ========================
  // SPATIAL AUDIO
  // ========================

  private createPannerNode(position: SpatialPosition): PannerNode {
    const panner = this.context!.createPanner()
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
  // REVERB
  // ========================

  private async generateReverbImpulse(): Promise<void> {
    if (!this.context) return

    const sampleRate = this.context.sampleRate
    const length = sampleRate * 2
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

  async updateReverb(decay: number): Promise<void> {
    if (!this.context) return

    const sampleRate = this.context.sampleRate
    const length = sampleRate * Math.min(decay, 5)

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

  getPlayingSounds(): PlayingSound[] {
    return Array.from(this.playingSounds.values())
  }

  stopAll(): void {
    for (const sound of this.playingSounds.values()) {
      sound.stop()
    }
    this.playingSounds.clear()
  }

  onSoundEnd(soundId: string, callback: () => void): void {
    this.onSoundEndCallbacks.set(soundId, callback)
  }

  private cleanupSound(id: string): void {
    const sound = this.playingSounds.get(id)
    if (sound) {
      sound.source.disconnect()
      sound.gainNode.disconnect()
      sound.pannerNode?.disconnect()
      sound.effectNodes.forEach(node => node.disconnect())
      sound.lfoNode?.disconnect()
      sound.lfoGainNode?.disconnect()
      this.playingSounds.delete(id)
    }
    this.onSoundEndCallbacks.delete(id)
  }

  // ========================
  // CLEANUP
  // ========================

  destroy(): void {
    this.stopAll()
    this.loadedSamples.clear()
    this.onSoundEndCallbacks.clear()

    if (this.context) {
      this.context.close()
      this.context = null
    }

    this.masterGain = null
    this.analyser = null
    this.listener = null
    this.reverbBuffer = null
    this.waveformData = null
    this.frequencyData = null

    console.log('SoundEngine destroyed')
  }
}

// Export singleton instance
export const soundEngine = new SoundEngine()
