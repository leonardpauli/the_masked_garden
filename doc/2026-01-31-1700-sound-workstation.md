# Sound Workstation

Upgrade SoundDebug to a full sound workstation for sound engineers.

## Features

### 1. Asset Upload
- Drag & drop zone for audio files
- Shows uploaded samples in a library panel
- In-memory storage (no backend needed)

### 2. Track System (6 tracks)
- Drag samples from library onto tracks
- Per-track controls:
  - Volume slider (0-100%)
  - Lowpass filter (cutoff frequency)
  - Highpass filter (cutoff frequency)
  - Loop toggle (seamless)
  - Play/Stop
- Track groups with shared filter

### 3. Soundboard (One-shots)
- Keys 1-5 trigger one-shot samples
- Keys 6-0 toggle track fade in/out
- Click-to-assign keybinds

### 4. Filters Available
- Lowpass (20Hz - 20kHz)
- Highpass (20Hz - 20kHz)
- Reverb wet/dry

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ Sound Workstation                          [← Back]     │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌────────────────────────────────┐ │
│ │ Drop files here │  │ TRACKS                         │ │
│ │                 │  │ ┌──────────────────────────────┐│ │
│ │   📁 or drag    │  │ │ Track 1  [sample.wav]  ▶ 🔁 ││ │
│ │                 │  │ │ Vol ━━━━━━━○━━  LP ━━○━━━━━ ││ │
│ └─────────────────┘  │ └──────────────────────────────┘│ │
│ ┌─────────────────┐  │ ┌──────────────────────────────┐│ │
│ │ LIBRARY         │  │ │ Track 2  [—empty—]     ▶ 🔁 ││ │
│ │ • kick.wav      │  │ │ Vol ━━━━━━━○━━  LP ━━○━━━━━ ││ │
│ │ • ambient.mp3   │  │ └──────────────────────────────┘│ │
│ │ • footstep.ogg  │  │ ...                             │ │
│ └─────────────────┘  └────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ SOUNDBOARD (one-shots)           KEYBINDS              │
│ [1] kick.wav    [4] —            [6] Track 1 fade      │
│ [2] snare.wav   [5] —            [7] Track 2 fade      │
│ [3] —                            [8] Track 3 fade      │
└─────────────────────────────────────────────────────────┘
```

## Implementation Files

- `game/src/ui/SoundDebug.tsx` — Main component (rewrite)
- `game/src/audio/track-system.ts` — Track state management

## State Shape

```typescript
interface WorkstationState {
  samples: LoadedSample[]
  tracks: Track[]
  soundboard: SoundboardSlot[]
  keybinds: Record<string, KeybindAction>
}

interface Track {
  id: number
  sampleId: string | null
  playing: boolean
  loop: boolean
  volume: number
  lowpass: number   // cutoff Hz, 20000 = off
  highpass: number  // cutoff Hz, 20 = off
  sound: PlayingSound | null
}

interface SoundboardSlot {
  key: '1' | '2' | '3' | '4' | '5'
  sampleId: string | null
}

type KeybindAction =
  | { type: 'soundboard'; slot: number }
  | { type: 'track-fade'; trackId: number }
```
