# Stable Randomness Implementation

Implement the branching seed system from [stable-randomness.md](./stable-randomness.md).

## Problem

Need deterministic world generation where:
- All players see the same world
- Adding trees doesn't move rocks
- Adding a property doesn't change other properties

## Solution

Branching seed tree with FNV-1a hashing.

## Implementation

### Seed Utilities

```typescript
// game/src/utils/random/seed.ts

export type Seed = number

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

export function hash(seed: Seed, key: string | number): Seed {
  let h = seed ^ FNV_OFFSET
  const str = String(key)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, FNV_PRIME)
  }
  return h >>> 0
}

export function branch(seed: Seed, key: string | number): Seed {
  return hash(seed, key)
}
```

### RNG Interface

```typescript
// game/src/utils/random/rng.ts

import { type Seed, branch } from './seed'

export interface Rng {
  float(): number
  range(min: number, max: number): number
  int(min: number, max: number): number
  vec2(): { x: number; y: number }
  vec3(): { x: number; y: number; z: number }
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
  branch(key: string | number): Rng
}

export function rng(seed: Seed): Rng {
  let state = seed

  // Mulberry32 PRNG
  function next(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    float: next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    vec2: () => ({ x: next(), y: next() }),
    vec3: () => ({ x: next(), y: next(), z: next() }),
    pick: (arr) => arr[Math.floor(next() * arr.length)]!,
    shuffle: (arr) => {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[result[i], result[j]] = [result[j]!, result[i]!]
      }
      return result
    },
    branch: (key) => rng(branch(seed, key)),
  }
}
```

### World Constants

```typescript
// game/src/world/constants.ts

export const WORLD_SEED = 0x4d41534b // "MASK" in hex
export const WORLD_VERSION = 1

// Combine for effective seed (bump version to regenerate)
import { hash } from '../utils/random/seed'
export const EFFECTIVE_SEED = hash(WORLD_SEED, WORLD_VERSION)
```

### World Generator

```typescript
// game/src/world/world-gen.ts

import { rng, type Rng } from '../utils/random/rng'
import { EFFECTIVE_SEED } from './constants'

export interface TreeTemplate {
  position: { x: number; y: number }
  scale: number
  rotation: number
  variant: number
}

export interface RockTemplate {
  position: { x: number; y: number }
  scale: number
  variant: number
}

export interface WorldTemplate {
  trees: TreeTemplate[]
  rocks: RockTemplate[]
}

function generateTrees(r: Rng, count: number): TreeTemplate[] {
  return Array.from({ length: count }, (_, i) => {
    const tr = r.branch(i)
    return {
      position: { x: tr.branch('x').range(-10, 10), y: tr.branch('y').range(-10, 10) },
      scale: tr.branch('scale').range(0.8, 1.4),
      rotation: tr.branch('rot').range(0, Math.PI * 2),
      variant: tr.branch('variant').int(0, 3),
    }
  })
}

function generateRocks(r: Rng, count: number): RockTemplate[] {
  return Array.from({ length: count }, (_, i) => {
    const rr = r.branch(i)
    return {
      position: { x: rr.branch('x').range(-10, 10), y: rr.branch('y').range(-10, 10) },
      scale: rr.branch('scale').range(0.5, 1.2),
      variant: rr.branch('variant').int(0, 2),
    }
  })
}

export function generateWorld(): WorldTemplate {
  const root = rng(EFFECTIVE_SEED)

  return {
    trees: generateTrees(root.branch('trees'), 15),
    rocks: generateRocks(root.branch('rocks'), 10),
  }
}
```

### Barrel Export

```typescript
// game/src/utils/random/index.ts

export * from './seed'
export * from './rng'
```

## Files to Create

- `game/src/utils/random/seed.ts` — Hash + branch
- `game/src/utils/random/rng.ts` — Mulberry32 RNG
- `game/src/utils/random/index.ts` — Exports
- `game/src/world/constants.ts` — World seed
- `game/src/world/world-gen.ts` — Generator

## Testing

```typescript
// Verify stability
const world1 = generateWorld()
const world2 = generateWorld()
console.assert(
  JSON.stringify(world1) === JSON.stringify(world2),
  'World generation must be deterministic'
)
```

## Next Steps

- [ ] Create random utility files
- [ ] Create world generator
- [ ] Integrate with ThreeEngine to spawn objects
- [ ] Add more entity types (flowers, zones, NPCs)
