# Handoff Document

Last updated: 2026-01-31

## Recent Session Summary

### Completed

1. **Architecture Documentation**
   - `data-flow.md` - Pure TS data layer as source of truth, Jotai as reflection layer
   - `stable-randomness.md` - Branching seed system for deterministic world generation
   - `graceful-degradation.md` - Server throttling for high player counts

2. **Sound Engine Port** (from PR #1 in different repo)
   - `env/ts/lib/audio/sound-engine.ts` - Full WebAudio engine (1087 lines)
     - Oscillators, noise generators, ADSR, LFO, spatial audio, effects chain
   - `env/ts/lib/audio/presets.ts` - 30+ sound presets (percussion, synth, sfx, ui, ambient, nature)
   - `ent/web/app/pages/SoundDebug.tsx` - Debug UI at `#demo/sound-debug`

### Current State

- Sound debug page works: https://masked.exe.xyz:8004/#demo/sound-debug
- TypeScript compiles cleanly
- All commits pushed to main

---

## Next Session: Data Flow Refactoring

The goal is to implement the architecture described in `data-flow.md`.

### Problem

Currently:
- Jotai atoms ARE the source of truth (wrong)
- Three.js subscribes to atoms via `store.sub()` (should read directly)
- No pure data store exists

### Phase 1: Create Pure Data Store

**File:** `env/game/state/store.ts`

```typescript
// The actual source of truth - plain TypeScript objects
export interface GameStore {
  player: {
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    maskId: string | null
  }
  entities: Map<string, Entity>
  world: WorldData
  clock: { time: number; delta: number }
}

export const store: GameStore = {
  player: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, maskId: null },
  entities: new Map(),
  world: null!, // initialized by world-gen
  clock: { time: 0, delta: 0 },
}
```

### Phase 2: Create RNG Utilities

**Files:**
- `env/ts/lib/random/seed.ts` - Seed derivation with `branch(seed, key)`
- `env/ts/lib/random/rng.ts` - Seeded RNG with `float()`, `range()`, `vec2()`, `pick()`, `branch()`

See `stable-randomness.md` for full implementation.

### Phase 3: Refactor Actions

**File:** `env/game/state/actions.ts`

Change from:
```typescript
export const player_move = (delta: Vec2) => {
  const pos = store.get(player_pos_atom)
  store.set(player_pos_atom, { x: pos.x + delta.x, y: pos.y + delta.y })
}
```

To:
```typescript
import { store } from './store'
import { notifyAtoms } from './bridge'

export const player_move = (delta: Vec2) => {
  store.player.position.x += delta.x
  store.player.position.y += delta.y
  notifyAtoms('player:position')
}
```

### Phase 4: Refactor Atoms to Reflections

**File:** `env/game/state/atoms.ts`

Change from:
```typescript
export const player_pos_atom = atom({ x: 0, y: 0 })
```

To:
```typescript
import { atom } from 'jotai'
import { store } from './store'

// Trigger atom for selective re-renders
const playerPositionVersion = atom(0)

// Derived atom that reads from store
export const player_pos_atom = atom((get) => {
  get(playerPositionVersion) // subscribe to updates
  return store.player.position
})
```

**File:** `env/game/state/bridge.ts` (new)

```typescript
import { getDefaultStore } from 'jotai'

const jotaiStore = getDefaultStore()
const versionAtoms = new Map<string, PrimitiveAtom<number>>()

export function notifyAtoms(key: string) {
  const versionAtom = versionAtoms.get(key)
  if (versionAtom) {
    jotaiStore.set(versionAtom, (v) => v + 1)
  }
}
```

### Phase 5: Refactor Three.js Renderer

**File:** `env/three/lib/renderer.ts`

Change from:
```typescript
const unsubscribe_pos = store.sub(player_pos_atom, () => {
  const pos = store.get(player_pos_atom)
  player_mesh.position.x = pos.x
})
```

To:
```typescript
import { store } from '@game/state/store'

const animate = () => {
  // Read directly from store each frame
  player_mesh.position.x = store.player.position.x
  player_mesh.position.z = store.player.position.y
  
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
```

### Phase 6: World Generation

**Files:**
- `env/game/lib/constants.ts` - `WORLD_SEED`, `WORLD_VERSION`
- `env/game/lib/world-gen.ts` - Deterministic world from branching seeds

```typescript
import { rng } from '@ts/lib/random/rng'
import { WORLD_SEED } from './constants'

export function generateWorld(): WorldData {
  const root = rng(WORLD_SEED)
  return {
    trees: generateTrees(root.branch('trees')),
    rocks: generateRocks(root.branch('rocks')),
    zones: generateZones(root.branch('zones')),
  }
}
```

---

## File Checklist

- [ ] `env/game/state/store.ts` - Pure data store
- [ ] `env/game/state/bridge.ts` - Jotai notification bridge
- [ ] `env/game/state/atoms.ts` - Refactor to reflections
- [ ] `env/game/state/actions.ts` - Mutate store, notify atoms
- [ ] `env/ts/lib/random/seed.ts` - Seed derivation
- [ ] `env/ts/lib/random/rng.ts` - Seeded RNG
- [ ] `env/ts/lib/random/index.ts` - Exports
- [ ] `env/game/lib/constants.ts` - World seed
- [ ] `env/game/lib/world-gen.ts` - World generation
- [ ] `env/three/lib/renderer.ts` - Read from store directly

---

## Commands

```bash
# Dev server
cd /home/exedev/masked_garden
./node_modules/.bin/vite --host 0.0.0.0 --port 8000

# Type check
./node_modules/.bin/tsc --noEmit

# Build
./node_modules/.bin/vite build
```

## URLs

- Landing: https://masked.exe.xyz:8000/
- Demo index: https://masked.exe.xyz:8000/#demo
- Sound debug: https://masked.exe.xyz:8000/#demo/sound-debug
- Game: https://masked.exe.xyz:8000/#demo/game
