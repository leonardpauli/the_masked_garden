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

interface DynamicCubeCollider {
  x: number
  y: number
  z: number
  size: number
  isStatic: boolean // true = other players' cubes (can't push), false = own cube
}

export class PhysicsWorld {
  private colliders: Map<string, CylinderCollider> = new Map()
  private boxColliders: Map<string, BoxCollider> = new Map()
  private dynamicCubes: Map<string, DynamicCubeCollider> = new Map()
  private initialized = false
  private baseGroundLevel = 0.5 // Default ground Y position

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
    // Model origin is offset west, so shift collider east (+x) to center it
    this.colliders.set('well', { x: x + 9, z, radius: 1.0, height: 2 })
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

  setDynamicCubeCollider(id: string, x: number, y: number, z: number, size: number, isStatic: boolean): void {
    this.dynamicCubes.set(id, { x, y, z, size, isStatic })
  }

  removeDynamicCubeCollider(id: string): void {
    this.dynamicCubes.delete(id)
  }

  getDynamicCubes(): Map<string, DynamicCubeCollider> {
    return this.dynamicCubes
  }

  // Check collision between a cube and player, returns push direction for player
  checkCubePlayerCollision(
    cubeX: number,
    cubeZ: number,
    cubeSize: number,
    playerX: number,
    playerZ: number,
    playerRadius: number
  ): { colliding: boolean; pushX: number; pushZ: number } {
    // Treat cube as axis-aligned box (no rotation)
    const halfSize = cubeSize / 2

    // Find closest point on cube to player center
    const closestX = Math.max(cubeX - halfSize, Math.min(cubeX + halfSize, playerX))
    const closestZ = Math.max(cubeZ - halfSize, Math.min(cubeZ + halfSize, playerZ))

    // Check distance from player center to closest point
    const distX = playerX - closestX
    const distZ = playerZ - closestZ
    const distSq = distX * distX + distZ * distZ

    if (distSq < playerRadius * playerRadius) {
      const dist = Math.sqrt(distSq)
      if (dist > 0.01) {
        const overlap = playerRadius - dist
        return {
          colliding: true,
          pushX: (distX / dist) * overlap,
          pushZ: (distZ / dist) * overlap,
        }
      } else {
        // Player center is inside cube, push out along shortest axis
        const pushX = playerX > cubeX ? halfSize + playerRadius - (playerX - cubeX) : -halfSize - playerRadius - (playerX - cubeX)
        const pushZ = playerZ > cubeZ ? halfSize + playerRadius - (playerZ - cubeZ) : -halfSize - playerRadius - (playerZ - cubeZ)
        if (Math.abs(pushX) < Math.abs(pushZ)) {
          return { colliding: true, pushX, pushZ: 0 }
        } else {
          return { colliding: true, pushX: 0, pushZ }
        }
      }
    }

    return { colliding: false, pushX: 0, pushZ: 0 }
  }

  /**
   * Check if a point is inside a rotated box (with optional padding)
   */
  private isPointInBox(x: number, z: number, box: BoxCollider, padding: number = 0): boolean {
    const cos = Math.cos(-box.rotation)
    const sin = Math.sin(-box.rotation)
    const relX = x - box.x
    const relZ = z - box.z
    const localX = relX * cos - relZ * sin
    const localZ = relX * sin + relZ * cos

    const halfW = box.width / 2 + padding
    const halfD = box.depth / 2 + padding

    return Math.abs(localX) <= halfW && Math.abs(localZ) <= halfD
  }

  /**
   * Get the ground height at a given XZ position.
   * Returns the top surface of the highest object the player can stand on,
   * or the base ground level if nothing is below.
   */
  getGroundHeight(x: number, z: number, playerY: number): number {
    let highestSurface = this.baseGroundLevel

    // Check cylinder colliders (trees, well, etc.)
    for (const [, collider] of this.colliders) {
      const dx = x - collider.x
      const dz = z - collider.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      // Player can stand on cylinder if their center is within the cylinder's radius
      if (dist < collider.radius) {
        const surfaceY = collider.height + this.baseGroundLevel
        if (surfaceY <= playerY + 0.1 && surfaceY > highestSurface) {
          highestSurface = surfaceY
        }
      }
    }

    // Check box colliders (benches, etc.)
    for (const [, box] of this.boxColliders) {
      // Player can stand on box if their center is within the box bounds
      if (this.isPointInBox(x, z, box, 0)) {
        const surfaceY = box.height + this.baseGroundLevel
        if (surfaceY <= playerY + 0.1 && surfaceY > highestSurface) {
          highestSurface = surfaceY
        }
      }
    }

    // Check dynamic cubes (own cube and other players' cubes)
    for (const [, cube] of this.dynamicCubes) {
      const halfSize = cube.size / 2
      // Check if player center is over the cube
      if (Math.abs(x - cube.x) <= halfSize && Math.abs(z - cube.z) <= halfSize) {
        const surfaceY = cube.y + halfSize // Cube top (y is center, so add half size)
        if (surfaceY <= playerY + 0.1 && surfaceY > highestSurface) {
          highestSurface = surfaceY
        }
      }
    }

    return highestSurface
  }

  /**
   * Check player collisions with height awareness.
   * Only blocks if player is at the same height level as the obstacle.
   */
  checkPlayerCollisions3D(
    playerX: number,
    playerZ: number,
    playerY: number,
    playerRadius: number
  ): { blocked: boolean; pushX: number; pushZ: number } {
    if (!this.initialized) return { blocked: false, pushX: 0, pushZ: 0 }

    // Cylinder colliders
    for (const [, collider] of this.colliders) {
      const obstacleTopY = collider.height + this.baseGroundLevel
      if (playerY >= obstacleTopY - 0.1) continue // Player is above, skip

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

    // Static dynamic cubes (other players' cubes)
    for (const [, cube] of this.dynamicCubes) {
      if (!cube.isStatic) continue

      // Height awareness: skip if player is above the cube
      const cubeTopY = cube.y + cube.size / 2
      if (playerY >= cubeTopY - 0.1) continue

      const result = this.checkCubePlayerCollision(
        cube.x, cube.z, cube.size,
        playerX, playerZ, playerRadius
      )
      if (result.colliding) {
        return { blocked: true, pushX: result.pushX, pushZ: result.pushZ }
      }
    }

    // Box colliders
    for (const [, box] of this.boxColliders) {
      const obstacleTopY = box.height + this.baseGroundLevel
      if (playerY >= obstacleTopY - 0.1) continue // Player is above, skip

      const cos = Math.cos(-box.rotation)
      const sin = Math.sin(-box.rotation)
      const relX = playerX - box.x
      const relZ = playerZ - box.z
      const localX = relX * cos - relZ * sin
      const localZ = relX * sin + relZ * cos

      const halfW = box.width / 2
      const halfD = box.depth / 2
      const closestX = Math.max(-halfW, Math.min(halfW, localX))
      const closestZ = Math.max(-halfD, Math.min(halfD, localZ))

      const distX = localX - closestX
      const distZ = localZ - closestZ
      const distSq = distX * distX + distZ * distZ

      if (distSq < playerRadius * playerRadius) {
        const dist = Math.sqrt(distSq)
        if (dist > 0.01) {
          const overlap = playerRadius - dist
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

    // Check static dynamic cubes (other players' cubes)
    for (const [, cube] of this.dynamicCubes) {
      if (!cube.isStatic) continue // Skip own cube

      const result = this.checkCubePlayerCollision(
        cube.x, cube.z, cube.size,
        playerX, playerZ, playerRadius
      )
      if (result.colliding) {
        return {
          blocked: true,
          pushX: result.pushX,
          pushZ: result.pushZ,
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
