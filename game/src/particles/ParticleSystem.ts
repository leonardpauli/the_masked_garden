import * as THREE from 'three'
import { particlePresets, type ParticlePreset } from './presets'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  lifetime: number
  age: number
  size: number
  opacity: number
  active: boolean
}

/**
 * GPU-friendly particle system using THREE.Points
 * Uses object pooling to avoid garbage collection
 */
export class ParticleSystem {
  private scene: THREE.Scene
  private maxParticles: number
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  
  // Buffer attributes
  private positions: Float32Array
  private sizes: Float32Array
  private opacities: Float32Array
  
  // Track active preset for color changes
  private currentPreset: ParticlePreset | null = null

  constructor(scene: THREE.Scene, maxParticles = 500) {
    this.scene = scene
    this.maxParticles = maxParticles
    
    // Initialize particle pool
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        age: 0,
        size: 0.1,
        opacity: 1,
        active: false,
      })
    }
    
    // Create buffer arrays
    this.positions = new Float32Array(maxParticles * 3)
    this.sizes = new Float32Array(maxParticles)
    this.opacities = new Float32Array(maxParticles)
    
    // Create geometry with buffer attributes
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1))
    
    // Create material
    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    
    // Create points mesh
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false // Always render particles
    this.scene.add(this.points)
  }

  /**
   * Emit particles at a given position
   */
  emit(position: THREE.Vector3 | { x: number; y: number; z: number }, presetName: string): void {
    const preset = particlePresets[presetName]
    if (!preset) {
      console.warn(`Particle preset "${presetName}" not found`)
      return
    }
    
    this.currentPreset = preset
    this.material.color.set(preset.color)
    
    let emitted = 0
    
    for (let i = 0; i < this.maxParticles && emitted < preset.count; i++) {
      const particle = this.particles[i]
      
      if (!particle.active) {
        // Activate particle
        particle.active = true
        particle.age = 0
        particle.lifetime = preset.lifetime
        particle.size = preset.size
        particle.opacity = preset.opacity
        
        // Set position
        particle.position.set(
          position.x + (Math.random() - 0.5) * 0.2,
          position.y,
          position.z + (Math.random() - 0.5) * 0.2
        )
        
        // Set random velocity within spread
        const angle = Math.random() * Math.PI * 2
        const speed = preset.speed * (0.5 + Math.random() * 0.5)
        particle.velocity.set(
          Math.cos(angle) * speed * preset.spread,
          speed * (0.5 + Math.random() * 0.5),
          Math.sin(angle) * speed * preset.spread
        )
        
        emitted++
      }
    }
  }

  /**
   * Update all particles - call this every frame
   */
  update(deltaTime: number): void {
    let activeCount = 0
    
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.particles[i]
      
      if (particle.active) {
        // Update age
        particle.age += deltaTime
        
        // Check if particle should die
        if (particle.age >= particle.lifetime) {
          particle.active = false
          // Move dead particle off-screen
          this.positions[i * 3] = 0
          this.positions[i * 3 + 1] = -1000
          this.positions[i * 3 + 2] = 0
          this.sizes[i] = 0
          this.opacities[i] = 0
          continue
        }
        
        // Apply gravity (from current preset or default)
        const gravity = this.currentPreset?.gravity ?? 0
        particle.velocity.y -= gravity * deltaTime
        
        // Update position
        particle.position.x += particle.velocity.x * deltaTime
        particle.position.y += particle.velocity.y * deltaTime
        particle.position.z += particle.velocity.z * deltaTime
        
        // Calculate life ratio (0 to 1)
        const lifeRatio = particle.age / particle.lifetime
        
        // Fade out if enabled
        const fadeOut = this.currentPreset?.fadeOut ?? true
        if (fadeOut) {
          particle.opacity = (1 - lifeRatio) * (this.currentPreset?.opacity ?? 1)
        }
        
        // Shrink over time
        const currentSize = particle.size * (1 - lifeRatio * 0.5)
        
        // Update buffers
        this.positions[i * 3] = particle.position.x
        this.positions[i * 3 + 1] = particle.position.y
        this.positions[i * 3 + 2] = particle.position.z
        this.sizes[i] = currentSize
        this.opacities[i] = particle.opacity
        
        activeCount++
      }
    }
    
    // Update geometry attributes
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute
    const opacityAttr = this.geometry.getAttribute('opacity') as THREE.BufferAttribute
    
    positionAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
    
    // Update draw range to only render active particles
    this.geometry.setDrawRange(0, this.maxParticles)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
  }
}
