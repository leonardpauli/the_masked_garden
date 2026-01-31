# Stable Randomness for Level Generation

This document describes the seeded randomness system for deterministic, stable world generation.

## Problem

We want:
- All players see the same world
- Designers can tweak parameters without cascading changes
- Adding one tree shouldn't move all the rocks
- Adding a property to an entity shouldn't change other entities

Naive sequential RNG breaks this:

```typescript
// BAD: Sequential consumption
const rng = seededRandom(SEED)
const treePositions = range(10).map(() => rng.next())  // consumes 10
const rockPositions = range(5).map(() => rng.next())   // consumes 5

// If we change trees to 11, ALL rocks move!
```

## Solution: Branching Seeds

Use a tree structure where each category/item gets its own derived seed.

```
ROOT_SEED (hardcoded: 0xMASKED_GARDEN)
    │
    ├── trees_seed (derived)
    │       ├── tree[0]_seed → position, scale, rotation
    │       ├── tree[1]_seed → position, scale, rotation
    │       └── tree[2]_seed → position, scale, rotation
    │
    ├── rocks_seed (derived)
    │       ├── rock[0]_seed → position, color, size
    │       └── rock[1]_seed → position, color, size
    │
    ├── flowers_seed (derived)
    │       └── ...
    │
    └── zones_seed (derived)
            └── ...
```

## Key Properties

### 1. Category Independence

Changing tree count doesn't affect rocks:

```typescript
const trees = branch(root, 'trees')
const rocks = branch(root, 'rocks')

// These are completely independent
// Adding trees doesn't touch rocks' seed chain
```

### 2. Item Independence

Each item in a list gets its own seed:

```typescript
const treesRng = branch(root, 'trees')

for (let i = 0; i < treeCount; i++) {
  const treeRng = branch(treesRng, i)
  
  // Each tree has isolated randomness
  const pos = treeRng.vec2()
  const scale = treeRng.range(0.8, 1.2)
  const rotation = treeRng.range(0, Math.PI * 2)
}
```

### 3. Property Independence

Adding a new property doesn't change existing ones:

```typescript
const treeRng = branch(treesRng, i)

// Each property uses a named branch
const pos = branch(treeRng, 'position').vec2()
const scale = branch(treeRng, 'scale').float()
const rotation = branch(treeRng, 'rotation').float()

// Adding 'color' later doesn't change position/scale/rotation
const color = branch(treeRng, 'color').pick(TREE_COLORS)
```

## Implementation

### Seed Derivation

```typescript
// env/ts/lib/random/seed.ts

export type Seed = number

// Hash function for combining seed + key
function hash(seed: Seed, key: string | number): Seed {
  // Use a simple but effective hash
  // FNV-1a or similar
  let h = seed ^ 2166136261
  const str = String(key)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function branch(seed: Seed, key: string | number): Seed {
  return hash(seed, key)
}
```

### RNG from Seed

```typescript
// env/ts/lib/random/rng.ts

import { Seed, branch } from './seed'

export interface Rng {
  float(): number           // [0, 1)
  range(min: number, max: number): number
  int(min: number, max: number): number
  vec2(): { x: number, y: number }
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
  branch(key: string | number): Rng
}

export function rng(seed: Seed): Rng {
  // Mulberry32 - fast, good quality
  let state = seed
  
  function next(): number {
    state |= 0
    state = state + 0x6D2B79F5 | 0
    let t = Math.imul(state ^ state >>> 15, 1 | state)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
  
  return {
    float: next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    vec2: () => ({ x: next(), y: next() }),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result
    },
    branch: (key) => rng(branch(seed, key)),
  }
}
```

### World Generator

```typescript
// env/game/lib/world-gen.ts

import { rng, Rng } from '@ts/lib/random/rng'
import { WORLD_SEED } from './constants'

export interface WorldTemplate {
  trees: TreeTemplate[]
  rocks: RockTemplate[]
  flowers: FlowerTemplate[]
  zones: ZoneTemplate[]
}

export function generateWorld(): WorldTemplate {
  const root = rng(WORLD_SEED)
  
  return {
    trees: generateTrees(root.branch('trees')),
    rocks: generateRocks(root.branch('rocks')),
    flowers: generateFlowers(root.branch('flowers')),
    zones: generateZones(root.branch('zones')),
  }
}

function generateTrees(r: Rng): TreeTemplate[] {
  const count = 15  // Designer decides count
  
  return range(count).map(i => {
    const tr = r.branch(i)
    return {
      position: tr.branch('pos').vec2(),
      scale: tr.branch('scale').range(0.8, 1.4),
      rotation: tr.branch('rot').range(0, Math.PI * 2),
      variant: tr.branch('variant').int(0, 3),
    }
  })
}
```

## Usage Patterns

### Pattern: Stable Iteration

```typescript
// GOOD: Each item branches by index
for (let i = 0; i < count; i++) {
  const itemRng = parentRng.branch(i)
  // ...
}

// BAD: Sequential consumption
for (let i = 0; i < count; i++) {
  const value = parentRng.float()  // Breaks if count changes
}
```

### Pattern: Stable Properties

```typescript
// GOOD: Named branches for properties
const x = rng.branch('x').float()
const y = rng.branch('y').float()
const z = rng.branch('z').float()  // Adding this doesn't change x, y

// BAD: Sequential for properties
const x = rng.float()
const y = rng.float()
const z = rng.float()  // Adding this changes all subsequent
```

### Pattern: Conditional Generation

```typescript
// GOOD: Branch before conditional
const maybeExtra = rng.branch('extra')
if (someCondition) {
  const extra = maybeExtra.float()  // Isolated, doesn't affect others
}

// BAD: Conditional consumption
if (someCondition) {
  const extra = rng.float()  // Skipping changes all subsequent
}
```

## World Seed

```typescript
// env/game/lib/constants.ts

// THE source seed - changing this changes everything
export const WORLD_SEED = 0x4D41534B  // "MASK" in hex

// Version bump if generation algorithm changes
export const WORLD_VERSION = 1
```

## Guarantees

1. **Same seed = same world** — All players see identical layout
2. **Add item = others unchanged** — Tree count +1 doesn't move rocks
3. **Add property = others unchanged** — New tree.color doesn't change tree.position
4. **Remove item = others unchanged** — Deleting tree[5] doesn't affect tree[6+]
5. **React independence** — UI state cannot affect generation (different layers)

## Testing

```typescript
// Snapshot test for world stability
test('world generation is stable', () => {
  const world1 = generateWorld()
  const world2 = generateWorld()
  
  expect(world1).toEqual(world2)
})

// Regression test for specific positions
test('first tree position is stable', () => {
  const world = generateWorld()
  expect(world.trees[0].position).toMatchInlineSnapshot(`
    {
      "x": 0.7234,
      "y": 0.1892,
    }
  `)
})
```

## When to Break Stability

Sometimes you want a fresh world:

1. Increment `WORLD_VERSION` for algorithm changes
2. Change `WORLD_SEED` for complete reset
3. Both are explicit, intentional actions

```typescript
export const WORLD_SEED = 0x4D41534B
export const WORLD_VERSION = 2  // Bumped: added biomes

// Combine for effective seed
const effectiveSeed = hash(WORLD_SEED, WORLD_VERSION)
```
