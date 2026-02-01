interface CylinderCollider {
  x: number
  z: number
  radius: number
  height: number
}

interface BoxCollider {
  x: number
  z: number
  width: number   // X extent
  depth: number   // Z extent
  height: number
  rotation: number // Y rotation in radians
}

export class PhysicsWorld {
  private colliders: Map<string, CylinderCollider> = new Map()
  private boxColliders: Map<string, BoxCollider> = new Map()
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

  addCollider(id: string, x: number, z: number, radius: number, height: number = 2): void {
    this.colliders.set(id, { x, z, radius, height })
  }

  addBoxCollider(id: string, x: number, z: number, width: number, depth: number, height: number, rotation: number = 0): void {
    this.boxColliders.set(id, { x, z, width, depth, height, rotation })
  }

  getColliders(): Map<string, CylinderCollider> {
    return this.colliders
  }

  getBoxColliders(): Map<string, BoxCollider> {
    return this.boxColliders
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

    // Circle vs rotated box collision
    for (const [, box] of this.boxColliders) {
      // Transform player position into box's local space
      const cos = Math.cos(-box.rotation)
      const sin = Math.sin(-box.rotation)
      const relX = playerX - box.x
      const relZ = playerZ - box.z
      const localX = relX * cos - relZ * sin
      const localZ = relX * sin + relZ * cos

      // Find closest point on box to circle center
      const halfW = box.width / 2
      const halfD = box.depth / 2
      const closestX = Math.max(-halfW, Math.min(halfW, localX))
      const closestZ = Math.max(-halfD, Math.min(halfD, localZ))

      // Check distance from circle center to closest point
      const distX = localX - closestX
      const distZ = localZ - closestZ
      const distSq = distX * distX + distZ * distZ

      if (distSq < playerRadius * playerRadius) {
        const dist = Math.sqrt(distSq)
        if (dist > 0.01) {
          const overlap = playerRadius - dist
          // Transform push direction back to world space
          const pushLocalX = (distX / dist) * overlap
          const pushLocalZ = (distZ / dist) * overlap
          const cosInv = Math.cos(box.rotation)
          const sinInv = Math.sin(box.rotation)
          return {
            blocked: true,
            pushX: pushLocalX * cosInv - pushLocalZ * sinInv,
            pushZ: pushLocalX * sinInv + pushLocalZ * cosInv,
          }
        } else {
          // Player is exactly at closest point, push out along shortest axis
          const pushX = localX > 0 ? halfW + playerRadius - localX : -halfW - playerRadius - localX
          const pushZ = localZ > 0 ? halfD + playerRadius - localZ : -halfD - playerRadius - localZ
          if (Math.abs(pushX) < Math.abs(pushZ)) {
            const cosInv = Math.cos(box.rotation)
            const sinInv = Math.sin(box.rotation)
            return { blocked: true, pushX: pushX * cosInv, pushZ: pushX * sinInv }
          } else {
            const cosInv = Math.cos(box.rotation)
            const sinInv = Math.sin(box.rotation)
            return { blocked: true, pushX: -pushZ * sinInv, pushZ: pushZ * cosInv }
          }
        }
      }
    }

    return { blocked: false, pushX: 0, pushZ: 0 }
  }
}
