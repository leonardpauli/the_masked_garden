# Mask Garden

Game jam project - theme: **mask**

Domain: [masked.garden](https://masked.garden)

## Quick Start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Demo Pages

| Page | Purpose |
|------|---------|
| `/ent/web/main/` | Main game |
| `/ent/web/sound/` | Sound team workspace |
| `/ent/web/art/` | Art direction + 3D preview |
| `/ent/web/particles/` | Shader effects |
| `/ent/web/assets/` | Asset browser |

## Architecture

```
DataLayer (jotai atoms) = Source of Truth
         |
    +----+----+
    v         v
Three.js   React UI
(subscribes) (subscribes)
```

**Rule:** Never flow data from React -> Three.js. Both subscribe to data layer.

## Structure

```
env/
  ts/lib/        # pure TS utilities
  game/          # game logic (no react, no three)
    state/       # jotai atoms + actions
    lib/         # masks, zones, etc
  three/lib/     # three.js rendering
  react_web/lib/ # react hooks + components

ent/web/         # entrypoints
public/assets/   # drop zone for team
```

## Patterns

See `ts-refactoring-patterns.md` and `react-patterns.md`

## Spec

See `SPEC.rim` for full architecture spec.
