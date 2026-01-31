// EffectGraph - manages a dynamic chain of audio effects

import type { EffectDefAny, EffectInstance, EffectRegistry, EffectIdOf } from './_types'

// ============================================================================
// TYPES
// ============================================================================

type EffectEntry = {
  id: string           // Instance ID (unique per graph)
  effectId: string     // Effect type ID (from registry)
  def: EffectDefAny
  instance: EffectInstance
  config: Record<string, unknown>
  enabled: boolean
}

// ============================================================================
// EFFECT GRAPH CLASS
// ============================================================================

export class EffectGraph<R extends EffectRegistry = EffectRegistry> {
  private ctx: AudioContext
  private registry: R
  private effects: Map<string, EffectEntry> = new Map()
  private order: string[] = []
  private nextId = 0

  readonly input: GainNode
  readonly output: GainNode

  constructor(ctx: AudioContext, registry: R) {
    this.ctx = ctx
    this.registry = registry

    // Create input/output gain nodes as entry/exit points
    this.input = ctx.createGain()
    this.output = ctx.createGain()

    // Initially connect input directly to output
    this.input.connect(this.output)
  }

  /**
   * Add an effect to the graph
   * @param effectId Effect type from registry
   * @param config Partial config (merged with defaults)
   * @returns Instance ID for later reference
   */
  add(
    effectId: EffectIdOf<R>,
    config?: Record<string, unknown>
  ): string {
    const def = this.registry[effectId]
    if (!def) throw new Error(`Unknown effect: ${effectId}`)

    const instanceId = `${effectId}_${this.nextId++}`
    const fullConfig = { ...def.defaults, ...config }
    const instance = def.create(this.ctx, fullConfig)

    const entry: EffectEntry = {
      id: instanceId,
      effectId: effectId as string,
      def,
      instance,
      config: fullConfig,
      enabled: true,
    }

    this.effects.set(instanceId, entry)

    // Insert in order based on effect's order property
    const insertIndex = this.order.findIndex(id => {
      const existing = this.effects.get(id)
      return existing && existing.def.order > def.order
    })

    if (insertIndex === -1) {
      this.order.push(instanceId)
    } else {
      this.order.splice(insertIndex, 0, instanceId)
    }

    this.reconnect()
    return instanceId
  }

  /**
   * Update an effect's config
   */
  update(instanceId: string, config: Partial<Record<string, unknown>>): void {
    const entry = this.effects.get(instanceId)
    if (!entry) return

    Object.assign(entry.config, config)
    entry.instance.update(config)
  }

  /**
   * Enable/disable an effect (bypassed when disabled)
   */
  setEnabled(instanceId: string, enabled: boolean): void {
    const entry = this.effects.get(instanceId)
    if (!entry || entry.enabled === enabled) return

    entry.enabled = enabled
    this.reconnect()
  }

  /**
   * Remove an effect from the graph
   */
  remove(instanceId: string): void {
    const entry = this.effects.get(instanceId)
    if (!entry) return

    entry.instance.destroy()
    this.effects.delete(instanceId)
    this.order = this.order.filter(id => id !== instanceId)
    this.reconnect()
  }

  /**
   * Get all effects in order
   */
  getEffects(): Array<{
    instanceId: string
    effectId: string
    name: string
    config: Record<string, unknown>
    enabled: boolean
    def: EffectDefAny
  }> {
    return this.order.map(id => {
      const entry = this.effects.get(id)!
      return {
        instanceId: entry.id,
        effectId: entry.effectId,
        name: entry.def.name,
        config: entry.config,
        enabled: entry.enabled,
        def: entry.def,
      }
    })
  }

  /**
   * Reorder effects manually
   */
  reorder(instanceIds: string[]): void {
    // Validate all IDs exist
    if (!instanceIds.every(id => this.effects.has(id))) {
      throw new Error('Invalid instance IDs in reorder')
    }
    if (instanceIds.length !== this.order.length) {
      throw new Error('Reorder must include all effects')
    }

    this.order = instanceIds
    this.reconnect()
  }

  /**
   * Reconnect the audio graph after changes
   */
  private reconnect(): void {
    // Disconnect everything
    this.input.disconnect()
    for (const entry of this.effects.values()) {
      entry.instance.output.disconnect()
    }

    // Get enabled effects in order
    const enabled = this.order
      .map(id => this.effects.get(id)!)
      .filter(e => e.enabled)

    if (enabled.length === 0) {
      // No effects, connect input directly to output
      this.input.connect(this.output)
      return
    }

    // Connect: input -> first effect
    this.input.connect(enabled[0].instance.input)

    // Connect effects in chain
    for (let i = 0; i < enabled.length - 1; i++) {
      enabled[i].instance.output.connect(enabled[i + 1].instance.input)
    }

    // Connect last effect -> output
    enabled[enabled.length - 1].instance.output.connect(this.output)
  }

  /**
   * Get the current config for serialization
   */
  serialize(): Array<{ effectId: string; config: Record<string, unknown>; enabled: boolean }> {
    return this.order.map(id => {
      const entry = this.effects.get(id)!
      return {
        effectId: entry.effectId,
        config: { ...entry.config },
        enabled: entry.enabled,
      }
    })
  }

  /**
   * Load effects from serialized data
   */
  load(data: Array<{ effectId: string; config?: Record<string, unknown>; enabled?: boolean }>): void {
    // Clear existing
    this.destroy()

    // Reconnect input to output (destroy disconnects everything)
    this.input.connect(this.output)

    // Add each effect
    for (const item of data) {
      if (item.effectId in this.registry) {
        const instanceId = this.add(item.effectId as EffectIdOf<R>, item.config)
        if (item.enabled === false) {
          this.setEnabled(instanceId, false)
        }
      }
    }
  }

  /**
   * Cleanup all effects
   */
  destroy(): void {
    for (const entry of this.effects.values()) {
      entry.instance.destroy()
    }
    this.effects.clear()
    this.order = []
    this.input.disconnect()
  }
}

/**
 * Create an EffectGraph factory bound to a registry
 */
export const createEffectGraphFactory = <R extends EffectRegistry>(registry: R) =>
  (ctx: AudioContext) => new EffectGraph(ctx, registry)
