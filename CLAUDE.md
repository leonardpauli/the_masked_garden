# The Masked Garden - Claude Context

Multiplayer browser game built with Vite + React + Three.js (R3F) + Jotai, with a Go WebSocket server.

**Live:** https://the.masked.garden

## Quick Start

```bash
cd game && pnpm dev          # Frontend dev server
cd server && go run .        # Multiplayer server (optional)
```

## File Tree

See `doc/file_tree.md` for annotated codebase structure with imports/exports/types.

## Architecture

**Unidirectional data flow:**
```
Jotai Atoms (source of truth) → React UI / Three.js / Online sync → Actions → Updates atoms
```

**Key directories:**
- `game/src/store/atoms/` - State atoms by domain (player, game, input, config, online)
- `game/src/actions/` - Pure functions that mutate state via `gameStore.set()`
- `game/src/components/` - Three.js/R3F components (read atoms, never mutate)
- `game/src/ui/` - React UI components
- `game/src/audio/` - Procedural sound engine with presets

**Rules:**
1. Atoms are single source of truth
2. React/Three.js only read via hooks
3. Mutations go through action functions
4. No React → Three.js data flow

## Documentation Skill

Use `/table-it` pattern when planning work or documenting decisions:

```
doc/
  upcoming.md              # Priority table with links
  skill/table-it.md        # This skill definition
  YYYY-MM-DD-HHMM-slug.md  # Detailed docs, <200 lines each
```

See `doc/skill/table-it.md` for full conventions.

## Current Work

Check `doc/upcoming.md` for priority table and recently completed tasks.

## Key Files

| File | Purpose |
|------|---------|
| `game/src/App.tsx` | Main app with hash routing (`#sound` for debug) |
| `game/src/audio/sound-engine.ts` | WebAudio synth engine |
| `game/src/audio/presets.ts` | 30+ procedural sound presets |
| `game/src/ui/SoundDebug.tsx` | Sound debug page |
| `game/src/engine/ThreeEngine.ts` | Alternative Three.js renderer |
| `server/server.go` | Go WebSocket server |
