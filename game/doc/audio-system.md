# Audio System Architecture

## Overview

The Masked Garden uses a sophisticated layered audio system where potentially hundreds of music tracks can be synchronized and crossfaded based on game state. The system prioritizes:

1. **Fast initial load** - Audio is secondary to gameplay, loaded lazily
2. **Perfect synchronization** - All layers share a master clock
3. **Seamless looping** - AAC format with proper loop points
4. **Memory efficiency** - Load/unload tracks based on need

## Audio Format

### Why AAC (M4A)?

| Format | iOS Safari | Chrome | Firefox | Size vs WAV |
|--------|------------|--------|---------|-------------|
| WAV | Yes | Yes | Yes | 1x (huge) |
| MP3 | Yes | Yes | Yes | ~10x smaller, but gap issues |
| OGG Vorbis | **No** | Yes | Yes | ~10x smaller |
| AAC (M4A) | Yes | Yes | Yes* | ~10x smaller |
| Opus (WebM) | iOS 15+ | Yes | Yes | ~12x smaller |

*Firefox AAC works on Mac/Windows via system codecs.

**AAC is the best choice** for cross-platform looping audio with good compression.

### Converting WAV to AAC

```bash
# Single file - high quality music
ffmpeg -i "input.wav" -c:a aac -b:a 192k -movflags +faststart "output.m4a"

# Single file - ambient/sfx (lower bitrate OK)
ffmpeg -i "input.wav" -c:a aac -b:a 128k -movflags +faststart "output.m4a"

# Batch convert all WAV files in a directory
for f in *.wav; do
  ffmpeg -i "$f" -c:a aac -b:a 192k -movflags +faststart "${f%.wav}.m4a"
done

# With normalization (recommended for consistent levels)
ffmpeg -i "input.wav" -af "loudnorm=I=-16:LRA=11:TP=-1.5" -c:a aac -b:a 192k -movflags +faststart "output.m4a"
```

**Flags explained:**
- `-c:a aac` - Use AAC codec
- `-b:a 192k` - 192kbps bitrate (good for music, use 128k for sfx)
- `-movflags +faststart` - Enables streaming (metadata at file start)

### File Organization

```
public/audio/
  manifest.json           # Track registry with metadata
  music/
    synths.m4a
    pads.m4a
    mask-1-pleasure.m4a
    mask-2-loneliness.m4a
    ...
  sfx/
    footsteps/
      dirt-1.m4a
      dirt-2.m4a
    ...
  ambient/
    wind-loop.m4a
    ...
```

## Architecture

### Track Registry (manifest.json)

```typescript
interface TrackMetadata {
  id: string                    // Unique identifier
  url: string                   // Path relative to /audio/
  duration: number              // Total duration in seconds
  loopStart?: number            // Loop start point (default: 0)
  loopEnd?: number              // Loop end point (default: duration)
  category: 'music' | 'ambient' | 'sfx'
  tags?: string[]               // For filtering/grouping
  defaultGain?: number          // Default volume (0-1)
  fileSize?: number             // Size in bytes (for progress display)
}

interface TrackManifest {
  version: number
  masterLoopDuration: number    // Shared loop duration for sync (e.g., 45.0)
  tracks: TrackMetadata[]
}
```

### State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                       DESIRED STATE                             │
│           (What the game wants - set immediately)               │
│  Map<trackId, { targetGain: number, priority: 'low'|'high' }>  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TRACK MANAGER                             │
│  - Compares desired vs actual state                             │
│  - Triggers loads for unloaded tracks with targetGain > 0       │
│  - Queues loads by priority                                     │
│  - Syncs new tracks to master clock when ready                  │
│  - Fades gains toward targets                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ACTUAL STATE                              │
│  Map<trackId, {                                                 │
│    status: 'unloaded' | 'loading' | 'ready' | 'playing'        │
│    buffer: AudioBuffer | null                                   │
│    source: AudioBufferSourceNode | null                         │
│    gainNode: GainNode | null                                    │
│    currentGain: number                                          │
│    loadProgress: number  // 0-1                                 │
│    bytesLoaded: number                                          │
│  }>                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Master Clock Synchronization

All tracks are modeled as if they started at `t=0` (game start). When a track loads mid-game:

```typescript
const masterTime = audioContext.currentTime  // Time since AudioContext created
const trackDuration = trackMetadata.duration
const loopStart = trackMetadata.loopStart ?? 0
const loopEnd = trackMetadata.loopEnd ?? trackDuration
const loopDuration = loopEnd - loopStart

// Calculate where we should be in the loop
const offset = loopStart + (masterTime % loopDuration)

// Start the track at the correct position
source.start(0, offset)
source.loop = true
source.loopStart = loopStart
source.loopEnd = loopEnd
```

### Loading Strategy

1. **Manifest loads first** - Small JSON, blocks nothing
2. **Essential tracks preload** - Based on initial game state
3. **Predictive loading** - Game hints which tracks might be needed
4. **On-demand loading** - If desired but not loaded, start loading immediately

```typescript
// Game can hint upcoming needs
trackManager.hint('mask-3-storm', { priority: 'high' })

// Or just set desired state - loading happens automatically
trackManager.setTarget('mask-3-storm', { gain: 0.5 })
// Track starts loading, will fade in when ready
```

### Loading with Progress

Uses `fetch()` with streaming to report progress:

```typescript
async function loadWithProgress(url: string, onProgress: (loaded: number, total: number) => void) {
  const response = await fetch(url)
  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength) : 0

  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(loaded, total)
  }

  // Combine chunks into ArrayBuffer
  const arrayBuffer = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    arrayBuffer.set(chunk, offset)
    offset += chunk.length
  }

  return arrayBuffer.buffer
}
```

## Data Flow

```
Game Events (mask change, area enter, etc.)
    │
    ▼
Actions (setMaskState, enterArea, etc.)
    │
    ▼
Jotai Atoms (maskStateAtom, playerAreaAtom, etc.)
    │
    ▼
TrackManager subscriptions
    │
    ▼
Update desired state → triggers loading if needed
    │
    ▼
Fade loop (requestAnimationFrame)
    │
    ▼
WebAudio output
```

## API

### TrackManager

```typescript
class TrackManager {
  // Initialize with manifest
  async initialize(manifestUrl: string): Promise<void>

  // Set target gain for a track (triggers load if needed)
  setTarget(trackId: string, options: { gain: number, priority?: 'low' | 'high' }): void

  // Hint that a track might be needed soon
  hint(trackId: string, options?: { priority?: 'low' | 'high' }): void

  // Get current state for UI
  getTrackState(trackId: string): TrackState | undefined
  getAllTrackStates(): Map<string, TrackState>

  // Stats for UI
  getTotalLoadedBytes(): number
  getTotalPendingBytes(): number
  getLoadingTracks(): string[]

  // Subscribe to state changes (for React)
  subscribe(callback: () => void): () => void

  // Cleanup
  destroy(): void
}
```

### Integration with Existing System

The new `TrackManager` will complement the existing `musicManager`:

- `musicManager` - Legacy, handles the current 7-track system
- `TrackManager` - New, handles unlimited lazy-loaded tracks

During transition, both can coexist. Eventually migrate to `TrackManager` only.

## Debug UI Features

The Sound Debug page (`#sound`) should show:

1. **Asset Library** - All tracks from manifest with metadata
2. **Loading States** - Which tracks are loading, progress bars
3. **Preload Controls** - Buttons to trigger preloads
4. **Memory Stats** - Total loaded size, individual track sizes
5. **Sync Visualization** - Show master clock position, track positions
6. **Gain Visualization** - Current vs target gains per track

## Performance Considerations

- **Maximum concurrent loads**: 3-4 (browser limit)
- **Load priority queue**: High priority tracks jump the queue
- **Memory budget**: Consider unloading least-recently-used tracks
- **AudioBuffer caching**: Decode once, reuse buffer for replays

## Future: Unloading

When memory pressure is high:

```typescript
// Find tracks that are:
// 1. Not currently playing (currentGain === 0 && targetGain === 0)
// 2. Loaded (status === 'ready' or was 'playing')
// 3. Not recently used (LRU timestamp)
//
// Unload them by:
// 1. Stop source if playing
// 2. Disconnect and null out nodes
// 3. Remove buffer reference
// 4. Set status back to 'unloaded'
```
