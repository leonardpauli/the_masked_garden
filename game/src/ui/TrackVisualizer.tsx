import { useRef, useEffect, useState, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface TrackVisualizerProps {
  audioBuffer: AudioBuffer | null
  isPlaying: boolean
  currentTime: number
  loop: boolean
  duration: number
}

interface SpectrogramData {
  imageData: ImageData
  width: number
  height: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PADDING_RATIO = 0.1 // 10% padding on each side
const MAIN_AREA_RATIO = 0.8 // 80% main area
const SPECTROGRAM_HEIGHT_RATIO = 0.5 // Bottom half for spectrogram
const FFT_SIZE = 2048
const SPECTROGRAM_TIME_SLICES = 256

// Color map for spectrogram: dark blue -> cyan -> yellow -> red
const SPECTROGRAM_COLORS = [
  { pos: 0.0, r: 10, g: 20, b: 60 },    // Dark blue
  { pos: 0.3, r: 0, g: 139, b: 139 },   // Dark cyan
  { pos: 0.5, r: 78, g: 205, b: 196 },  // Cyan (#4ecdc4)
  { pos: 0.7, r: 255, g: 255, b: 0 },   // Yellow
  { pos: 1.0, r: 255, g: 50, b: 50 },   // Red
]

// ============================================================================
// HELPERS
// ============================================================================

function interpolateColor(value: number): [number, number, number] {
  // value is 0-1
  const v = Math.max(0, Math.min(1, value))

  // Find the two colors to interpolate between
  let lower = SPECTROGRAM_COLORS[0]
  let upper = SPECTROGRAM_COLORS[SPECTROGRAM_COLORS.length - 1]

  for (let i = 0; i < SPECTROGRAM_COLORS.length - 1; i++) {
    if (v >= SPECTROGRAM_COLORS[i].pos && v <= SPECTROGRAM_COLORS[i + 1].pos) {
      lower = SPECTROGRAM_COLORS[i]
      upper = SPECTROGRAM_COLORS[i + 1]
      break
    }
  }

  const range = upper.pos - lower.pos
  const t = range === 0 ? 0 : (v - lower.pos) / range

  return [
    Math.round(lower.r + (upper.r - lower.r) * t),
    Math.round(lower.g + (upper.g - lower.g) * t),
    Math.round(lower.b + (upper.b - lower.b) * t),
  ]
}

async function computeSpectrogram(
  audioBuffer: AudioBuffer,
  width: number,
  height: number
): Promise<SpectrogramData> {
  const offlineCtx = new OfflineAudioContext(
    1,
    audioBuffer.length,
    audioBuffer.sampleRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer

  const analyser = offlineCtx.createAnalyser()
  analyser.fftSize = FFT_SIZE
  analyser.smoothingTimeConstant = 0

  source.connect(analyser)
  analyser.connect(offlineCtx.destination)

  const frequencyBinCount = analyser.frequencyBinCount
  const spectrogramData: Uint8Array[] = []

  // We need to compute FFT at regular intervals
  // Since OfflineAudioContext processes everything at once,
  // we'll analyze the raw audio data directly
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerSlice = Math.floor(audioBuffer.length / SPECTROGRAM_TIME_SLICES)

  // Create a temporary audio context for analysis
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const tempAnalyser = tempCtx.createAnalyser()
  tempAnalyser.fftSize = FFT_SIZE
  tempAnalyser.smoothingTimeConstant = 0

  // Process each time slice
  for (let i = 0; i < SPECTROGRAM_TIME_SLICES; i++) {
    const startSample = i * samplesPerSlice
    const endSample = Math.min(startSample + FFT_SIZE, audioBuffer.length)
    const sliceLength = endSample - startSample

    // Create a small buffer for this slice
    const sliceBuffer = tempCtx.createBuffer(1, FFT_SIZE, audioBuffer.sampleRate)
    const sliceData = sliceBuffer.getChannelData(0)

    // Copy data and apply Hanning window
    for (let j = 0; j < FFT_SIZE; j++) {
      if (j < sliceLength) {
        const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * j / FFT_SIZE))
        sliceData[j] = channelData[startSample + j] * windowValue
      } else {
        sliceData[j] = 0
      }
    }

    // Compute FFT manually using DFT approximation
    // For performance, we'll use a simplified magnitude spectrum
    const magnitudes = new Uint8Array(frequencyBinCount)

    for (let k = 0; k < frequencyBinCount; k++) {
      let real = 0
      let imag = 0

      // Downsample the DFT computation for performance
      const step = Math.max(1, Math.floor(FFT_SIZE / 256))
      for (let n = 0; n < FFT_SIZE; n += step) {
        const angle = (2 * Math.PI * k * n) / FFT_SIZE
        real += sliceData[n] * Math.cos(angle)
        imag -= sliceData[n] * Math.sin(angle)
      }

      const magnitude = Math.sqrt(real * real + imag * imag)
      // Scale to 0-255 range with logarithmic scaling
      const db = 20 * Math.log10(magnitude + 1e-10)
      const normalized = Math.max(0, Math.min(255, ((db + 60) / 60) * 255))
      magnitudes[k] = normalized
    }

    spectrogramData.push(magnitudes)
  }

  await tempCtx.close()

  // Convert to ImageData
  const imageData = new ImageData(width, height)
  const data = imageData.data

  for (let x = 0; x < width; x++) {
    const sliceIndex = Math.floor((x / width) * SPECTROGRAM_TIME_SLICES)
    const slice = spectrogramData[Math.min(sliceIndex, spectrogramData.length - 1)]

    for (let y = 0; y < height; y++) {
      // y=0 is top (high frequency), y=height-1 is bottom (low frequency)
      const freqIndex = Math.floor(((height - 1 - y) / height) * frequencyBinCount)
      const value = slice[freqIndex] / 255

      const [r, g, b] = interpolateColor(value)
      const idx = (y * width + x) * 4
      data[idx] = r
      data[idx + 1] = g
      data[idx + 2] = b
      data[idx + 3] = 255
    }
  }

  return { imageData, width, height }
}

function computeWaveform(audioBuffer: AudioBuffer, width: number): { min: number; max: number }[] {
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerPixel = Math.floor(channelData.length / width)
  const waveform: { min: number; max: number }[] = []

  for (let i = 0; i < width; i++) {
    const start = i * samplesPerPixel
    const end = Math.min(start + samplesPerPixel, channelData.length)

    let min = 1
    let max = -1

    for (let j = start; j < end; j++) {
      const sample = channelData[j]
      if (sample < min) min = sample
      if (sample > max) max = sample
    }

    waveform.push({ min, max })
  }

  return waveform
}

// ============================================================================
// STYLES
// ============================================================================

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: 120,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TrackVisualizer({
  audioBuffer,
  isPlaying,
  currentTime,
  loop,
  duration,
}: TrackVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [spectrogram, setSpectrogram] = useState<SpectrogramData | null>(null)
  const [waveform, setWaveform] = useState<{ min: number; max: number }[] | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const animationFrameRef = useRef<number | null>(null)

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    })

    observer.observe(container)

    // Initial size
    const rect = container.getBoundingClientRect()
    setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })

    return () => observer.disconnect()
  }, [])

  // Compute spectrogram and waveform when buffer changes
  useEffect(() => {
    if (!audioBuffer || canvasSize.width === 0) {
      setSpectrogram(null)
      setWaveform(null)
      return
    }

    let cancelled = false

    const compute = async () => {
      try {
        const spectroHeight = Math.floor(canvasSize.height * SPECTROGRAM_HEIGHT_RATIO)
        const spectroData = await computeSpectrogram(audioBuffer, canvasSize.width, spectroHeight)
        if (!cancelled) setSpectrogram(spectroData)

        const waveData = computeWaveform(audioBuffer, canvasSize.width)
        if (!cancelled) setWaveform(waveData)
      } catch (e) {
        console.error('Error computing visualization:', e)
      }
    }

    compute()

    return () => {
      cancelled = true
    }
  }, [audioBuffer, canvasSize.width, canvasSize.height])

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || canvasSize.width === 0) return

    const { width, height } = canvasSize
    canvas.width = width
    canvas.height = height

    // Clear
    ctx.clearRect(0, 0, width, height)

    // Calculate regions
    const leftPadding = width * PADDING_RATIO
    const rightPadding = width * PADDING_RATIO
    const mainWidth = width * MAIN_AREA_RATIO
    const mainStart = leftPadding
    const mainEnd = mainStart + mainWidth

    const waveformHeight = height * (1 - SPECTROGRAM_HEIGHT_RATIO)
    const spectrogramY = waveformHeight

    // Draw spectrogram
    if (spectrogram) {
      ctx.putImageData(spectrogram.imageData, 0, spectrogramY)
    }

    // Draw waveform
    if (waveform && waveform.length > 0) {
      const waveformCenterY = waveformHeight / 2
      const waveformAmplitude = waveformHeight / 2 - 4

      // Main waveform (full opacity in center, faded at edges)
      for (let x = 0; x < width; x++) {
        const waveIndex = Math.floor((x / width) * waveform.length)
        const point = waveform[Math.min(waveIndex, waveform.length - 1)]

        // Determine opacity based on position
        let alpha = 1
        if (x < leftPadding) {
          // Left padding: faded end of track (for loop preview)
          alpha = 0.3
        } else if (x >= mainEnd) {
          // Right padding: faded start of track (for loop preview)
          alpha = 0.3
        }

        // Apply loop-specific fading
        if (loop) {
          // In loop mode, show the continuation
          if (x < leftPadding) {
            // Show end of track in left padding
            const loopWaveIndex = Math.floor(((x / leftPadding) * PADDING_RATIO + (1 - PADDING_RATIO)) * waveform.length)
            const loopPoint = waveform[Math.min(loopWaveIndex, waveform.length - 1)]

            ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`
            const minY = waveformCenterY - loopPoint.max * waveformAmplitude
            const maxY = waveformCenterY - loopPoint.min * waveformAmplitude
            ctx.fillRect(x, minY, 1, maxY - minY)
            continue
          } else if (x >= mainEnd) {
            // Show start of track in right padding
            const loopWaveIndex = Math.floor(((x - mainEnd) / rightPadding) * PADDING_RATIO * waveform.length)
            const loopPoint = waveform[Math.min(loopWaveIndex, waveform.length - 1)]

            ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`
            const minY = waveformCenterY - loopPoint.max * waveformAmplitude
            const maxY = waveformCenterY - loopPoint.min * waveformAmplitude
            ctx.fillRect(x, minY, 1, maxY - minY)
            continue
          }
        }

        ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`
        const minY = waveformCenterY - point.max * waveformAmplitude
        const maxY = waveformCenterY - point.min * waveformAmplitude
        ctx.fillRect(x, minY, 1, Math.max(1, maxY - minY))
      }
    }

    // Draw region separators (subtle vertical lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])

    ctx.beginPath()
    ctx.moveTo(mainStart, 0)
    ctx.lineTo(mainStart, height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(mainEnd, 0)
    ctx.lineTo(mainEnd, height)
    ctx.stroke()

    ctx.setLineDash([])

    // Draw playhead
    if (duration > 0) {
      const progress = Math.min(1, Math.max(0, currentTime / duration))
      // Playhead only moves in the main area (center 80%)
      const playheadX = mainStart + progress * mainWidth

      // Playhead glow
      const gradient = ctx.createLinearGradient(playheadX - 8, 0, playheadX + 8, 0)
      gradient.addColorStop(0, 'rgba(78, 205, 196, 0)')
      gradient.addColorStop(0.5, 'rgba(78, 205, 196, 0.3)')
      gradient.addColorStop(1, 'rgba(78, 205, 196, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(playheadX - 8, 0, 16, height)

      // Playhead line
      ctx.strokeStyle = isPlaying ? '#4ecdc4' : 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }
  }, [spectrogram, waveform, canvasSize, currentTime, duration, isPlaying, loop])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw()
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [draw])

  return (
    <div ref={containerRef} style={S.container}>
      <canvas ref={canvasRef} style={S.canvas} />
      {!audioBuffer && (
        <div style={S.placeholder}>No audio loaded</div>
      )}
    </div>
  )
}

export default TrackVisualizer
