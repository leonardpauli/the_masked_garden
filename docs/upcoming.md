# Upcoming

## Priority Table

| Priority | Task | Status | Details |
|----------|------|--------|---------|
| 1 | Sound debug page | ✅ Done | `game/src/ui/SoundDebug.tsx` |
| 2 | Semantic sound tokens | 🔜 Next | [design](./2026-01-31-1645-semantic-sound-tokens.md) |
| 3 | Stable randomness | 📋 Planned | [design](./2026-01-31-1650-stable-randomness-impl.md) |
| 4 | Wire sound to game | 📋 Planned | After tokens — footsteps, impacts, UI |
| 5 | Graceful degradation | 📋 Later | Apply to Go server when scaling needed |

## Recently Completed

- **2026-01-31**: Ported sound engine from origin/main to origin/freja
  - `game/src/audio/sound-engine.ts` — WebAudio synth engine
  - `game/src/audio/presets.ts` — 30+ procedural sounds
  - `game/src/ui/SoundDebug.tsx` — Debug page at `#sound`
  - Hash routing in `App.tsx`

## Reference Docs

| Doc | Purpose |
|-----|---------|
| [stable-randomness.md](./stable-randomness.md) | Seeded world generation pattern |
| [graceful-degradation.md](./graceful-degradation.md) | Server throttling for scale |
| [data-flow.md](./data-flow.md) | Clean architecture (data → atoms → UI/render) |

## How to Document

See [skill/table-it.md](./skill/table-it.md) for documentation conventions.
