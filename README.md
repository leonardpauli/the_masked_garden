# The Masked Garden

A multiplayer browser game built for a game jam (theme: **mask**).

**Live at:** https://the.masked.garden

## Quick Start

```bash
cd game
pnpm install
pnpm dev
```

For production with multiplayer server:
```bash
cd server
go build -o server
./server
```

## Architecture

### Data Flow Principles

The architecture follows a strict unidirectional data flow pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER (Source of Truth)            │
│                     Jotai Atoms in store/atoms/             │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │  React   │       │ Three.js │       │  Online  │
    │    UI    │       │  Render  │       │   Sync   │
    │ (reads)  │       │ (reads)  │       │ (reads)  │
    └──────────┘       └──────────┘       └──────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     ACTIONS      │
                    │ Pure TS functions│
                    │   (mutations)    │
                    └──────────────────┘
                              │
                              ▼
                     Updates Data Layer
```

**Key Rules:**
1. **Atoms are the single source of truth** - All game state lives in Jotai atoms
2. **React only reads** - Components subscribe to atoms via hooks, never mutate directly
3. **Three.js only reads** - Render loop reads from atoms, syncs to 3D objects
4. **Mutations go through Actions** - Pure TypeScript functions in `actions/` that call `gameStore.set()`
5. **No React → Three.js data flow** - Both subscribe independently to the data layer

### Directory Structure

```
the_masked_garden/
├── game/                    # Frontend (Vite + React + Three.js)
│   ├── src/
│   │   ├── store/           # Jotai store and atoms
│   │   │   ├── index.ts     # Shared store instance
│   │   │   └── atoms/       # State atoms by domain
│   │   │       ├── playerAtoms.ts
│   │   │       ├── gameAtoms.ts
│   │   │       ├── inputAtoms.ts
│   │   │       ├── configAtoms.ts
│   │   │       └── onlineAtoms.ts
│   │   ├── actions/         # Pure functions that mutate state
│   │   │   ├── playerActions.ts
│   │   │   ├── gameActions.ts
│   │   │   └── inputActions.ts
│   │   ├── components/      # Three.js/R3F components
│   │   ├── ui/              # React UI components
│   │   ├── online/          # WebSocket client
│   │   ├── input/           # Input handlers (keyboard, gyro)
│   │   ├── engine/          # Game engine (alternative Three.js impl)
│   │   └── game/            # Game loop logic
│   └── dist/                # Production build output
├── server/                  # Go WebSocket server
│   ├── server.go            # Main server with WS + webhook
│   ├── go.mod
│   └── go.sum
├── Assets/                  # Blender/3D assets
└── the-masked-garden.service  # systemd service file
```

### State Domains

| Atom File | Purpose |
|-----------|--------|
| `playerAtoms.ts` | Player position, velocity, health |
| `gameAtoms.ts` | Game state (menu/playing/gameover), score |
| `inputAtoms.ts` | Current input direction, input source |
| `configAtoms.ts` | Tunable parameters (speed, gravity, camera) |
| `onlineAtoms.ts` | Player count, connection status, other players |

### Multiplayer

The Go server handles:
- WebSocket connections at `/ws`
- Player state broadcasting at 5Hz
- GitHub webhook at `/__webhook` for auto-deploy
- Static file serving for the built game

Clients send their position + velocity, receive other players' states.
Ghost players render as semi-transparent spheres with interpolated movement.

## Development

### Adding New State

1. Create atom in appropriate file under `store/atoms/`
2. Create action functions in `actions/` to mutate it
3. Subscribe in React via `useAtomValue()` or in game loop via `gameStore.get()`

### Input Handling

- Keyboard: `input/KeyboardInput.ts` → calls `setInputDirection()`
- Gyro/Tilt: `input/GyroInput.ts` → calibrates on enable, uses relative orientation

## Deployment

Pushes to `main` trigger automatic rebuild via GitHub webhook.
See hosting README for operational details.
