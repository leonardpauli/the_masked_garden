# Semantic Sound Tokens

Decouple game events from sound implementation. Game emits tokens, sound engineer maps tokens to sounds.

## Problem

Direct coupling is brittle:
```typescript
// BAD: Game code knows about specific sounds
import { presets } from './audio/presets'
presets.find(p => p.id === 'footstep')?.play()
```

## Solution

Two-layer indirection:
1. **Game** emits semantic tokens (`player.footstep`)
2. **Sound map** binds tokens to preset IDs
3. **Sound system** plays the mapped sound

## Implementation

### Token Types

```typescript
// game/src/audio/tokens.ts

export type SoundToken =
  // Player
  | 'player.footstep'
  | 'player.jump'
  | 'player.land'
  | 'player.damage'
  | 'player.death'
  // Collision
  | 'collision.soft'
  | 'collision.hard'
  // UI
  | 'ui.click'
  | 'ui.hover'
  | 'ui.success'
  | 'ui.error'
  // Ambient
  | 'ambient.wind'
  | 'ambient.rain'
  // Mask
  | 'mask.equip'
  | 'mask.remove'

export type SoundContext = {
  position?: { x: number; y: number; z: number }
  intensity?: number  // 0-1, affects gain/pitch variation
  variant?: number    // For randomization
}
```

### Sound Map (Sound Engineer Edits This)

```typescript
// game/src/audio/sound-map.ts

import type { SoundToken } from './tokens'

export const soundMap: Record<SoundToken, string | string[] | null> = {
  // Player
  'player.footstep': 'footstep',
  'player.jump': 'jump',
  'player.land': 'hit',
  'player.damage': 'hit',
  'player.death': 'powerDown',

  // Collision
  'collision.soft': 'footstep',
  'collision.hard': 'hit',

  // UI
  'ui.click': 'click',
  'ui.hover': 'hover',
  'ui.success': 'success',
  'ui.error': 'error',

  // Ambient (null = not yet mapped)
  'ambient.wind': 'wind',
  'ambient.rain': 'rain',

  // Mask
  'mask.equip': 'powerUp',
  'mask.remove': 'swoosh',
}
```

### Sound Events System

```typescript
// game/src/audio/sound-events.ts

import { soundEngine } from './sound-engine'
import { getPresetById } from './presets'
import { soundMap } from './sound-map'
import type { SoundToken, SoundContext } from './tokens'

class SoundEvents {
  private enabled = true

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  emit(token: SoundToken, context: SoundContext = {}) {
    if (!this.enabled) return

    const mapping = soundMap[token]
    if (!mapping) return

    // Support array for random variation
    const presetId = Array.isArray(mapping)
      ? mapping[Math.floor(Math.random() * mapping.length)]
      : mapping

    const preset = getPresetById(presetId)
    if (!preset) {
      console.warn(`Sound preset not found: ${presetId} (token: ${token})`)
      return
    }

    // Play with context
    const sound = preset.play()

    // Apply position if spatial
    if (sound?.setPosition && context.position) {
      sound.setPosition(context.position)
    }

    // Apply intensity as gain modifier
    if (sound?.setGain && context.intensity !== undefined) {
      sound.setGain(0.3 + context.intensity * 0.4)
    }
  }
}

export const soundEvents = new SoundEvents()
```

### Usage in Game Code

```typescript
// In ThreeEngine.ts or actions
import { soundEvents } from '../audio/sound-events'

// Footstep (with position)
soundEvents.emit('player.footstep', {
  position: { x: player.x, y: 0, z: player.z }
})

// Damage (with intensity)
soundEvents.emit('player.damage', {
  intensity: damage / maxHealth
})

// UI (no context needed)
soundEvents.emit('ui.click')
```

## Files to Create

- `game/src/audio/tokens.ts` — Token type definitions
- `game/src/audio/sound-map.ts` — Token → preset mappings
- `game/src/audio/sound-events.ts` — Emit system
- Update `game/src/audio/index.ts` — Export new modules

## Benefits

1. **Game devs** emit semantic tokens, don't think about sounds
2. **Sound engineer** edits `sound-map.ts` to tune the experience
3. **Easy iteration** — swap sounds without touching game logic
4. **Type-safe** — invalid tokens caught at compile time
