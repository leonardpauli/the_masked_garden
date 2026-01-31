// Mulberry32 PRNG - fast, good distribution
export function createSeededRandom(seed: number) {
  return function() {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Default game seed - same for all players
export const GAME_SEED = 42069
export const seededRandom = createSeededRandom(GAME_SEED)
