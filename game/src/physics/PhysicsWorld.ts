interface CylinderCollider {
  x: number
  z: number
  radius: number
  height: number
}

export class PhysicsWorld {
  private colliders: Map<string, CylinderCollider> = new Map()
  private initialized = false

  async init(): Promise<void> {
    this.initialized = true
  }

  isReady(): boolean {
    return this.initialized
  }

  addTreeCollider(id: string, x: number, z: number, radius: number): void {
    this.colliders.set(id, { x, z, radius, height: 3 })
  }

  addWellCollider(x: number, z: number): void {
    this.colliders.set('well', { x, z, radius: 2.5, height: 2 })
  }

  getColliders(): Map<string, CylinderCollider> {
    return this.colliders
  }

  checkPlayerCollisions(
    playerX: number,
    playerZ: number,
    playerRadius: number
  ): { blocked: boolean; pushX: number; pushZ: number } {
    if (!this.initialized) return { blocked: false, pushX: 0, pushZ: 0 }

    // Simple sphere-cylinder intersection for each collider
    for (const [, collider] of this.colliders) {
      const dx = playerX - collider.x
      const dz = playerZ - collider.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      const minDist = playerRadius + collider.radius
      if (dist < minDist && dist > 0.01) {
        const overlap = minDist - dist
        return {
          blocked: true,
          pushX: (dx / dist) * overlap,
          pushZ: (dz / dist) * overlap,
        }
      }
    }
    return { blocked: false, pushX: 0, pushZ: 0 }
  }
}
