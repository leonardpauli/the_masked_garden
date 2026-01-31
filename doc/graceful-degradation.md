# Graceful Degradation Under Load

This document describes the pressure-release mechanisms for handling high player counts.

## Problem

If we suddenly get 1000+ concurrent players:
- Server could be overwhelmed by position updates
- Bandwidth could saturate
- Clients could choke on incoming data
- The whole system could fail catastrophically

We want: **degrade gracefully, never fail completely**.

## Philosophy

> A game that's slightly laggy is playable.  
> A game that crashes is not.

Accept reduced fidelity over failure. Players can tolerate:
- Seeing 50 players instead of 500
- Position updates at 5Hz instead of 30Hz
- Slightly stale data

Players cannot tolerate:
- Connection errors
- Freezing
- Kicks

## Server-Side Throttling

### 1. Update Rate Limiting

```typescript
// Don't broadcast every position update
interface ThrottleConfig {
  // Base rate when load is normal
  baseRateHz: 30,
  // Minimum rate under extreme load  
  minRateHz: 5,
  // Start throttling at this player count
  throttleThreshold: 100,
  // Full throttle at this count
  maxThreshold: 1000,
}

function getUpdateRate(playerCount: number, config: ThrottleConfig): number {
  if (playerCount < config.throttleThreshold) {
    return config.baseRateHz
  }
  
  const load = (playerCount - config.throttleThreshold) / 
               (config.maxThreshold - config.throttleThreshold)
  const clamped = Math.min(1, load)
  
  return lerp(config.baseRateHz, config.minRateHz, clamped)
}
```

### 2. Spatial Partitioning

Only send updates for nearby players:

```typescript
interface SpatialConfig {
  // Full detail radius
  nearRadius: 50,
  // Reduced detail radius
  farRadius: 150,
  // Beyond this, don't send
  cullRadius: 300,
}

function getPlayersForClient(
  clientPos: Vec2,
  allPlayers: Player[],
  config: SpatialConfig
): PlayerUpdate[] {
  return allPlayers
    .map(p => ({
      player: p,
      distance: dist(clientPos, p.position)
    }))
    .filter(({ distance }) => distance < config.cullRadius)
    .map(({ player, distance }) => ({
      id: player.id,
      position: player.position,
      // Reduced precision for far players
      precision: distance < config.nearRadius ? 'full' : 'reduced',
      // Lower update priority for far players
      priority: distance < config.nearRadius ? 1 : 0.3,
    }))
}
```

### 3. Message Batching

```typescript
class UpdateBatcher {
  private pending: Map<string, PlayerUpdate> = new Map()
  private lastFlush = 0
  
  queue(update: PlayerUpdate) {
    // Latest update wins (overwrites previous)
    this.pending.set(update.id, update)
  }
  
  flush(now: number, rateHz: number): PlayerUpdate[] | null {
    const interval = 1000 / rateHz
    if (now - this.lastFlush < interval) {
      return null  // Not time yet
    }
    
    this.lastFlush = now
    const batch = Array.from(this.pending.values())
    this.pending.clear()
    return batch
  }
}
```

### 4. Priority Queuing

Under load, prioritize important updates:

```typescript
enum UpdatePriority {
  Critical = 3,  // Player spawn/despawn, mask change
  High = 2,      // Local player movement
  Normal = 1,    // Nearby player movement  
  Low = 0,       // Far player movement
}

class PriorityQueue {
  private queues: Map<UpdatePriority, Update[]> = new Map()
  private budget: number
  
  constructor(maxUpdatesPerTick: number) {
    this.budget = maxUpdatesPerTick
  }
  
  drain(): Update[] {
    const result: Update[] = []
    let remaining = this.budget
    
    // Drain highest priority first
    for (const priority of [Critical, High, Normal, Low]) {
      const queue = this.queues.get(priority) ?? []
      const take = Math.min(queue.length, remaining)
      result.push(...queue.splice(0, take))
      remaining -= take
      if (remaining <= 0) break
    }
    
    return result
  }
}
```

## Client-Side Resilience

### 1. Interpolation Buffer

Smooth over missing updates:

```typescript
class PositionBuffer {
  private buffer: TimestampedPosition[] = []
  private readonly bufferMs = 100  // 100ms buffer
  
  push(pos: Position, serverTime: number) {
    this.buffer.push({ pos, time: serverTime })
    // Keep ~200ms of history
    this.prune(serverTime - 200)
  }
  
  sample(renderTime: number): Position {
    // Render 100ms in the past for smoothness
    const targetTime = renderTime - this.bufferMs
    return this.interpolate(targetTime)
  }
  
  private interpolate(time: number): Position {
    // Find surrounding samples and lerp
    const before = this.buffer.findLast(p => p.time <= time)
    const after = this.buffer.find(p => p.time > time)
    
    if (!before) return after?.pos ?? this.lastKnown
    if (!after) return before.pos
    
    const t = (time - before.time) / (after.time - before.time)
    return lerpPos(before.pos, after.pos, t)
  }
}
```

### 2. Adaptive Quality

```typescript
class AdaptiveRenderer {
  private fps = 60
  private readonly targetFps = 60
  
  update(dt: number) {
    this.fps = lerp(this.fps, 1000 / dt, 0.1)
    
    if (this.fps < 30) {
      this.reduceQuality()
    } else if (this.fps > 55 && this.quality < MAX_QUALITY) {
      this.increaseQuality()
    }
  }
  
  private reduceQuality() {
    // Progressive degradation
    if (this.particleCount > 100) this.particleCount /= 2
    else if (this.shadowQuality > 0) this.shadowQuality--
    else if (this.renderScale > 0.5) this.renderScale -= 0.1
  }
}
```

### 3. Connection Recovery

```typescript
class ResilientConnection {
  private reconnectAttempts = 0
  private readonly maxAttempts = 5
  private readonly backoffMs = [100, 500, 2000, 5000, 10000]
  
  async connect() {
    while (this.reconnectAttempts < this.maxAttempts) {
      try {
        await this.ws.connect()
        this.reconnectAttempts = 0
        return
      } catch (e) {
        const delay = this.backoffMs[this.reconnectAttempts]
        await sleep(delay)
        this.reconnectAttempts++
      }
    }
    
    // Give up gracefully
    this.enterOfflineMode()
  }
  
  private enterOfflineMode() {
    // Still playable, just alone
    showMessage("Playing offline - other players unavailable")
  }
}
```

## Metrics & Monitoring

```typescript
// Server-side health tracking
class ServerHealth {
  readonly metrics = {
    playerCount: 0,
    updateRateHz: 30,
    queueDepth: 0,
    droppedUpdates: 0,
    avgLatencyMs: 0,
  }
  
  // Expose for monitoring
  getStatus(): HealthStatus {
    return {
      healthy: this.metrics.queueDepth < 1000,
      degraded: this.metrics.updateRateHz < 15,
      metrics: this.metrics,
    }
  }
}
```

## Configuration

```typescript
// Tunable parameters
export const LOAD_CONFIG = {
  // When to start throttling
  softLimit: 100,
  // When to go maximum throttle
  hardLimit: 500,
  // Absolute maximum connections
  maxConnections: 1000,
  
  // Update rates
  baseUpdateHz: 30,
  minUpdateHz: 5,
  
  // Spatial
  nearRadius: 50,
  farRadius: 150,
  cullRadius: 300,
  
  // Batching
  maxBatchSize: 100,
  minBatchIntervalMs: 33,
} as const
```

## Summary

| Load Level | Players | Update Rate | Behavior |
|------------|---------|-------------|----------|
| Normal | 0-100 | 30Hz | Full fidelity |
| Elevated | 100-300 | 15-30Hz | Spatial culling active |
| High | 300-500 | 10-15Hz | Aggressive batching |
| Critical | 500+ | 5-10Hz | Priority-only updates |
| Overload | 1000+ | Reject new | Existing players preserved |

The system never crashes. It gracefully reduces fidelity to maintain playability.
