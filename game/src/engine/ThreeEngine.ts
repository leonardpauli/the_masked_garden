import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { gameStore } from '../store'
import { visualStyleAtom, playerSpeedAtom, cameraDistanceAtom, cameraSmoothingAtom, cameraViewAngleAtom, cameraTransitionSpeedAtom, gravityAtom, collisionCooldownAtom, damageAmountAtom, treeColorVariationAtom, groundVibranceAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs, type VisualStyleConfig } from '../types/visualStyles'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { playerHealthAtom, playerColorHueAtom } from '../store/atoms/playerAtoms'
import { setPlayerPosition, takeDamage } from '../actions/playerActions'
import { endGame } from '../actions/gameActions'
import { ParticleSystem } from '../particles/ParticleSystem'

/**
 * Pure Three.js engine - no React dependencies
 * Subscribes to Jotai store for state synchronization
 */
export class ThreeEngine {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private animationId: number | null = null
  private unsubscribers: (() => void)[] = []
  
  // Scene objects
  private ground: THREE.Mesh | null = null
  private obstacles: THREE.Object3D[] = []
  private obstacleRadii: number[] = [] // Store collision radii for each obstacle
  private player: THREE.Group | null = null
  private trunkTemplate: THREE.Group | null = null
  private leavesTemplate: THREE.Group | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private directionalLight: THREE.DirectionalLight | null = null
  
  // Physics state
  private playerVelocity = new THREE.Vector3(0, 0, 0)
  private playerRadius = 0.5 // Approximate player collision radius
  private groundLevel = 0.5 // Y position when on ground
  private lastCollisionTime = 0
  private lastTime = 0

  // Camera smoothing state (current values that smooth toward targets)
  private currentCameraDistance = 14
  private currentCameraViewAngle = 43
  
  // Particle system
  private particleSystem: ParticleSystem
  private lastFootstepTime = 0
  private footstepInterval = 0.15 // Emit footstep particles every 150ms when moving
  
  // Materials (for easy style switching)
  private groundMaterial: THREE.MeshStandardMaterial
  private playerMaterial: THREE.MeshToonMaterial

  constructor(container: HTMLElement) {
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    // Initialize scene
    this.scene = new THREE.Scene()
    
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 20, 0)
    // Initial rotation will be set by lookAt in animate loop

    // Initialize materials
    this.groundMaterial = new THREE.MeshStandardMaterial({ color: '#3a5a3a' })
    this.playerMaterial = new THREE.MeshToonMaterial({ color: '#4488ff' })

    // Apply initial visual style
    this.applyVisualStyle(visualStyleConfigs[gameStore.get(visualStyleAtom)])

    // Setup scene
    this.setupScene()
    this.setupLighting()
    this.loadPlayer()
    this.generateObstacles(25, 25)
    
    // Initialize particle system
    this.particleSystem = new ParticleSystem(this.scene, 500)

    // Subscribe to store changes
    this.subscribeToStore()

    // Handle resize
    window.addEventListener('resize', this.handleResize)
  }

  private applyVisualStyle(config: VisualStyleConfig): void {
    // Background and fog
    this.scene.background = new THREE.Color(config.backgroundColor)
    this.scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar)

    // Ground
    this.groundMaterial.color.set(config.groundColor)

    // Lights
    if (this.ambientLight) {
      this.ambientLight.color.set(config.ambientColor)
      this.ambientLight.intensity = config.ambientIntensity
    }
    if (this.directionalLight) {
      this.directionalLight.color.set(config.directionalColor)
      this.directionalLight.intensity = config.directionalIntensity
    }

    // Player
    this.playerMaterial.color.set(config.playerColor)
  }

  private setupScene(): void {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    this.ground = new THREE.Mesh(groundGeometry, this.groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)
  }

  private setupLighting(): void {
    const config = visualStyleConfigs[gameStore.get(visualStyleAtom)]

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity)
    this.scene.add(this.ambientLight)

    // Directional light
    this.directionalLight = new THREE.DirectionalLight(config.directionalColor, config.directionalIntensity)
    this.directionalLight.position.set(10, 20, 10)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.far = 50
    this.directionalLight.shadow.camera.left = -20
    this.directionalLight.shadow.camera.right = 20
    this.directionalLight.shadow.camera.top = 20
    this.directionalLight.shadow.camera.bottom = -20
    this.scene.add(this.directionalLight)
  }

  // Convert HSL to THREE.Color
  private hslToColor(h: number, s: number, l: number): THREE.Color {
    s /= 100
    l /= 100
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    }
    return new THREE.Color(f(0), f(8), f(4))
  }

  private bodyMaterial: THREE.MeshStandardMaterial | null = null

  private loadPlayer(): void {
    const loader = new GLTFLoader()

    // Random skin color (Fitzpatrick scale - realistic human skin tones)
    const skinColors = [
      '#FFDFC4', '#F0D5BE', '#EECEB3', '#E1B899',  // Light
      '#D4A574', '#C68642', '#BA7D52', '#A67B5B',  // Medium
      '#8D5524', '#6B4423', '#4A3728', '#3B2F2F'   // Dark
    ]
    const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)]

    // Create parent group for player
    this.player = new THREE.Group()
    this.player.scale.setScalar(0.5)
    this.player.position.set(0, 0.5, 0)
    this.scene.add(this.player)

    // Load head with skin color
    loader.load('/models/player/charHead.glb', (gltf) => {
      const head = gltf.scene
      head.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color: skinColor })
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      this.player!.add(head)
    })

    // Load body with unique color from server (golden angle hue)
    loader.load('/models/player/charBody.glb', (gltf) => {
      const body = gltf.scene
      const colorHue = gameStore.get(playerColorHueAtom)
      this.bodyMaterial = new THREE.MeshStandardMaterial({
        color: this.hslToColor(colorHue, 70, 55)
      })

      body.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.bodyMaterial!
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      this.player!.add(body)

      // Subscribe to color changes (in case it updates after load)
      const unsubColor = gameStore.sub(playerColorHueAtom, () => {
        const hue = gameStore.get(playerColorHueAtom)
        if (this.bodyMaterial) {
          this.bodyMaterial.color = this.hslToColor(hue, 70, 55)
        }
      })
      this.unsubscribers.push(unsubColor)
    })
  }

  private generateObstacles(count: number, spread: number): void {
    const loader = new GLTFLoader()

    // Load trunk and leaves templates
    let trunkLoaded = false
    let leavesLoaded = false

    const tryCreateTrees = () => {
      if (!trunkLoaded || !leavesLoaded) return
      if (!this.trunkTemplate || !this.leavesTemplate) return

      const variation = gameStore.get(treeColorVariationAtom)

      for (let i = 0; i < count; i++) {
        // Random position, avoid center
        let x: number, z: number
        do {
          x = (Math.random() - 0.5) * spread * 2
          z = (Math.random() - 0.5) * spread * 2
        } while (Math.abs(x) < 3 && Math.abs(z) < 3)

        const scale = 0.5 + Math.random() * 0.8

        // Create tree group
        const tree = new THREE.Group()
        tree.position.set(x, 0, z)
        tree.scale.setScalar(scale)

        // Clone trunk with varied brown color
        const trunk = this.trunkTemplate.clone()
        const trunkHue = 30 + (Math.random() - 0.5) * variation * 30  // Brown with variation
        const trunkMaterial = new THREE.MeshStandardMaterial({
          color: this.hslToColor(trunkHue, 40, 35)
        })
        trunk.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = trunkMaterial
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        tree.add(trunk)

        // Clone leaves with varied green color
        const leaves = this.leavesTemplate.clone()
        const leavesHue = 120 + (Math.random() - 0.5) * variation * 40  // Green with variation
        const leavesMaterial = new THREE.MeshStandardMaterial({
          color: this.hslToColor(leavesHue, 55, 45)
        })
        leaves.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = leavesMaterial
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        tree.add(leaves)

        this.obstacles.push(tree)
        this.obstacleRadii.push(scale)
        this.scene.add(tree)
      }
    }

    loader.load('/models/foliage/treeTrunk.glb', (gltf) => {
      this.trunkTemplate = gltf.scene
      trunkLoaded = true
      tryCreateTrees()
    })

    loader.load('/models/foliage/treeLeaves.glb', (gltf) => {
      this.leavesTemplate = gltf.scene
      leavesLoaded = true
      tryCreateTrees()
    })
  }

  private subscribeToStore(): void {
    // Subscribe to visual style changes
    const unsubVisualStyle = gameStore.sub(visualStyleAtom, () => {
      const style = gameStore.get(visualStyleAtom)
      this.applyVisualStyle(visualStyleConfigs[style])
    })
    this.unsubscribers.push(unsubVisualStyle)

    // Subscribe to ground vibrance changes
    const unsubGroundVibrance = gameStore.sub(groundVibranceAtom, () => {
      const vibrance = gameStore.get(groundVibranceAtom)
      const hue = 100 + vibrance * 20        // 100 → 120
      const saturation = 20 + vibrance * 80  // 20% → 100%
      const lightness = 25 + vibrance * 25   // 25% → 50%
      this.groundMaterial.color = this.hslToColor(hue, saturation, lightness)
    })
    this.unsubscribers.push(unsubGroundVibrance)
  }

  private checkObstacleCollisions(): void {
    if (!this.player) return
    
    const now = Date.now()
    const cooldown = gameStore.get(collisionCooldownAtom)
    
    // Skip if still in cooldown
    if (now - this.lastCollisionTime < cooldown) return
    
    const playerPos = this.player.position
    
    for (let i = 0; i < this.obstacles.length; i++) {
      const obstacle = this.obstacles[i]
      const obstacleRadius = this.obstacleRadii[i]
      
      // Calculate distance between player and obstacle (only XZ plane for simplicity)
      const dx = playerPos.x - obstacle.position.x
      const dz = playerPos.z - obstacle.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      // Check if collision occurred
      const collisionDistance = this.playerRadius + obstacleRadius
      if (distance < collisionDistance) {
        // Collision detected - apply damage
        this.lastCollisionTime = now
        const damage = gameStore.get(damageAmountAtom)
        takeDamage(damage)
        
        // Emit damage particles at collision point
        this.particleSystem.emit(playerPos, 'damage')
        
        // Push player away from obstacle
        if (distance > 0.01) {
          const pushStrength = (collisionDistance - distance) + 0.5
          this.player.position.x += (dx / distance) * pushStrength
          this.player.position.z += (dz / distance) * pushStrength
          
          // Also apply velocity in the push direction
          this.playerVelocity.x = (dx / distance) * 3
          this.playerVelocity.z = (dz / distance) * 3
        }
        
        break // Only handle one collision per frame
      }
    }
  }

  private handleResize = (): void => {
    const container = this.renderer.domElement.parentElement
    if (!container) return

    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)
    
    const now = performance.now()
    const deltaTime = this.lastTime > 0 ? Math.min((now - this.lastTime) / 1000, 0.1) : 1 / 60
    this.lastTime = now
    
    const gameState = gameStore.get(gameStateAtom)
    
    // Update player movement when playing
    if (gameState === 'playing' && this.player) {
      const input = gameStore.get(inputDirectionAtom)
      const speed = gameStore.get(playerSpeedAtom)
      const gravity = gameStore.get(gravityAtom)
      
      // Simple direct movement - WASD/arrows map directly to world directions
      this.player.position.x += input.x * speed * deltaTime
      this.player.position.z += input.z * speed * deltaTime
      
      // Emit footstep particles when moving
      const isMoving = Math.abs(input.x) > 0.1 || Math.abs(input.z) > 0.1
      const nowSeconds = now / 1000
      if (isMoving && nowSeconds - this.lastFootstepTime > this.footstepInterval) {
        this.lastFootstepTime = nowSeconds
        this.particleSystem.emit(
          { x: this.player.position.x, y: 0.1, z: this.player.position.z },
          'footstep'
        )
      }
      
      // Apply gravity
      this.playerVelocity.y -= gravity * deltaTime
      this.player.position.y += this.playerVelocity.y * deltaTime
      
      // Check if player is over the ground (ground is 100x100 centered at origin)
      const groundHalfSize = 50
      const isOverGround = 
        Math.abs(this.player.position.x) < groundHalfSize && 
        Math.abs(this.player.position.z) < groundHalfSize
      
      // Ground collision - only if over ground
      if (isOverGround && this.player.position.y < this.groundLevel) {
        this.player.position.y = this.groundLevel
        this.playerVelocity.y = 0
      }
      
      // Player fell too far - game over
      if (this.player.position.y < -20) {
        endGame()
      }
      
      // Check obstacle collisions
      this.checkObstacleCollisions()
      
      // Update player position in store
      setPlayerPosition({
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z
      })
      
      // Check for game over
      const health = gameStore.get(playerHealthAtom)
      if (health <= 0) {
        endGame()
      }
    }
    
    // Update camera to follow player
    if (this.player) {
      const targetDistance = gameStore.get(cameraDistanceAtom)
      const smoothing = gameStore.get(cameraSmoothingAtom)
      const targetViewAngle = gameStore.get(cameraViewAngleAtom)
      const transitionSpeed = gameStore.get(cameraTransitionSpeedAtom)

      // Smooth camera parameters toward target values (prevents jitter when adjusting sliders)
      this.currentCameraDistance += (targetDistance - this.currentCameraDistance) * transitionSpeed
      this.currentCameraViewAngle += (targetViewAngle - this.currentCameraViewAngle) * transitionSpeed

      // Convert angle to radians
      const angleRad = (this.currentCameraViewAngle * Math.PI) / 180

      // Calculate camera position based on view angle
      // At 0 degrees: camera directly above (top-down)
      // At 70 degrees: camera behind player (third-person)
      const height = this.currentCameraDistance * Math.cos(angleRad)
      const zOffset = this.currentCameraDistance * Math.sin(angleRad)

      // Target position: above and behind player
      const targetX = this.player.position.x
      const targetY = this.player.position.y + height
      const targetZ = this.player.position.z + zOffset

      // Smooth camera movement (following player)
      this.camera.position.x += (targetX - this.camera.position.x) * smoothing
      this.camera.position.y += (targetY - this.camera.position.y) * smoothing
      this.camera.position.z += (targetZ - this.camera.position.z) * smoothing

      // Fixed rotation based on current view angle (smoothed, no jitter)
      this.camera.rotation.set(-Math.PI / 2 + angleRad, 0, 0)
    }
    
    // Update particle system
    this.particleSystem.update(deltaTime)
    
    // Render
    this.renderer.render(this.scene, this.camera)
  }

  start(): void {
    if (this.animationId === null) {
      this.animate()
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  destroy(): void {
    this.stop()
    
    // Unsubscribe from store
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
    
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize)
    
    // Dispose of Three.js resources
    this.obstacles.forEach(obj => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (child.material instanceof THREE.Material) {
            child.material.dispose()
          }
        }
      })
    })
    
    if (this.ground) {
      this.ground.geometry.dispose()
      this.groundMaterial.dispose()
    }
    
    // Dispose particle system
    this.particleSystem.dispose()
    
    this.playerMaterial.dispose()
    this.renderer.dispose()
    
    // Remove canvas from DOM
    this.renderer.domElement.remove()
  }

  // Expose scene for physics integration
  getScene(): THREE.Scene {
    return this.scene
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  getPlayer(): THREE.Group | null {
    return this.player
  }

  getObstacles(): THREE.Object3D[] {
    return this.obstacles
  }
}
