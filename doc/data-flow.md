# Data Flow Architecture

This document describes the clean separation between data, rendering, and UI layers.

## Core Principle

**Pure TypeScript data layer is the source of truth.**

Jotai atoms are a *reflection* layer that bridges data to React. They are not the canonical source — they observe and expose the underlying data.

## The Three Worlds

### 1. Data World (Pure TypeScript)

```
env/game/
  lib/       # pure game logic
  state/     # data store + actions
```

Characteristics:
- No React imports
- No Three.js imports  
- No physics engine imports
- Just TypeScript: types, functions, data structures
- Contains: entity state, game rules, world data, clock/timing

This is where truth lives. Everything else subscribes.

### 2. Reactive World (React + Jotai)

```
env/react_web/
  lib/
    hooks.ts      # useAtom bridges
    components/   # UI components
```

Characteristics:
- Subscribes to data layer via Jotai atoms
- Updates on atom changes (push-based, reactive)
- Good for: HUD, menus, inventory, dialogs — things that update *occasionally*
- Never drives game state directly

### 3. Imperative World (Three.js + Physics)

```
env/three/
  lib/
    renderer.ts
    camera.ts
    ...
```

Characteristics:
- Runs every frame (60fps loop)
- Reads directly from data layer (pull-based, imperative)
- Does NOT read through Jotai atoms
- Updates Three.js scene graph based on current state
- Reads physics state, dispatches actions back to data layer

## Data Flow Diagram

```
                    ┌─────────────────┐
                    │   User Input    │
                    │  (click, move)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Actions      │
                    │  (pure funcs)   │
                    └────────┬────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │          DATA LAYER (Source of Truth)  │
        │                                        │
        │   env/game/state/                      │
        │   - entity positions                   │
        │   - player state                       │
        │   - world configuration                │
        │   - mask states                        │
        └────────────────────────────────────────┘
                    │                  │
         ┌──────────┘                  └──────────┐
         │                                        │
         ▼                                        ▼
┌─────────────────┐                    ┌─────────────────┐
│  Jotai Atoms    │                    │  Frame Loop     │
│  (reflection)   │                    │  (imperative)   │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│   React UI      │                    │   Three.js      │
│   (reactive)    │                    │   (per-frame)   │
│                 │                    │                 │
│   - HUD         │                    │   - Scene       │
│   - Menus       │                    │   - Minimap     │
│   - Dialogs     │                    │   - Particles   │
└─────────────────┘                    └─────────────────┘
```

## Forbidden Flows

```
❌ React → Three.js          (React state drives rendering)
❌ Three.js → Jotai atoms    (renderer writes to UI state)
❌ UI component → Data layer (direct mutation, bypassing actions)
```

## Allowed Flows

```
✓ User input → Action → Data layer
✓ Data layer → Jotai atom → React component
✓ Data layer → Frame loop → Three.js scene
✓ Physics read → Action → Data layer
✓ Three.js event → Action → Data layer
```

## Why This Matters

### Debuggability

All state changes flow through actions. You can:
- Log every action
- Time-travel debug
- Replay sequences
- Test game logic in isolation

### Performance

- React only re-renders when atoms change (sparse updates)
- Three.js reads raw data every frame (no reactive overhead)
- Minimap reads raw data every frame (no reactive overhead)
- Physics simulation is decoupled from UI

### Predictability

- No circular dependencies
- No surprise re-renders
- No "why did this update?" mysteries
- State is always consistent

## Implementation Pattern

### Data Store

```typescript
// env/game/state/store.ts

export interface GameState {
  players: Map<string, Player>
  entities: Map<string, Entity>
  world: WorldData
  clock: ClockState
}

// The actual source of truth
export const store: GameState = {
  players: new Map(),
  entities: new Map(),
  world: createWorld(),
  clock: createClock(),
}
```

### Actions

```typescript
// env/game/state/actions.ts

import { store } from './store'
import { notifyAtoms } from './atoms'

export function movePlayer(id: string, pos: Vec2) {
  const player = store.players.get(id)
  if (!player) return
  
  player.position = pos
  
  // Notify Jotai layer if needed
  notifyAtoms('player', id)
}

export function spawnEntity(entity: Entity) {
  store.entities.set(entity.id, entity)
  notifyAtoms('entities')
}
```

### Jotai Bridge

```typescript
// env/game/state/atoms.ts

import { atom } from 'jotai'
import { store } from './store'

// Derived atom that reads from store
export const playerCountAtom = atom(() => store.players.size)

// For components that need reactivity
export const localPlayerAtom = atom((get) => {
  const id = get(localPlayerIdAtom)
  return store.players.get(id)
})

// Notification system for selective updates
const listeners = new Map<string, Set<() => void>>()

export function notifyAtoms(key: string, subkey?: string) {
  const fullKey = subkey ? `${key}:${subkey}` : key
  listeners.get(fullKey)?.forEach(fn => fn())
}
```

### Frame Loop

```typescript
// env/three/lib/loop.ts

import { store } from '@game/state/store'
import { movePlayer } from '@game/state/actions'

export function frameUpdate(scene: Scene, dt: number) {
  // READ directly from store (no atoms)
  for (const [id, player] of store.players) {
    const mesh = scene.getPlayerMesh(id)
    mesh.position.set(player.position.x, 0, player.position.y)
  }
  
  // Physics integration
  const physicsState = readPhysics()
  if (physicsState.collision) {
    // WRITE through actions
    handleCollision(physicsState.collision)
  }
}
```

## Mental Model

Think of it as:

- **Data Layer** = The game's brain (pure logic)
- **Jotai Atoms** = Newspapers that report on the brain's state
- **React** = People reading newspapers (only when published)
- **Three.js** = A camera crew filming the brain in real-time

The camera crew doesn't read newspapers. They point the camera directly at the subject.

## Checklist for New Features

1. [ ] State lives in `env/game/state/`
2. [ ] Mutations go through actions
3. [ ] React components use atoms, never raw store
4. [ ] Three.js reads raw store, never atoms
5. [ ] No imports from `env/react_web/` in `env/three/`
6. [ ] No imports from `env/three/` in `env/react_web/`
7. [ ] `env/game/` imports nothing from `env/three/` or `env/react_web/`
