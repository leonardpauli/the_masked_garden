import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { gameStore } from '../store'
import { visualStyleAtom, playerSpeedAtom, cameraHeightAtom, cameraSmoothingAtom } from '../store/atoms/configAtoms'
import { visualStyleConfigs, type VisualStyleConfig } from '../types/visualStyles'
import { inputDirectionAtom } from '../store/atoms/inputAtoms'
import { gameStateAtom } from '../store/atoms/gameAtoms'
import { setPlayerPosition } from '../actions/playerActions'

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
  private obstacles: THREE.Mesh[] = []
  private player: THREE.Group | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private directionalLight: THREE.DirectionalLight | null = null
  
  // Materials (for easy style switching)
  private groundMaterial: THREE.MeshStandardMaterial
  private obstacleMaterials: THREE.MeshStandardMaterial[] = []
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
    this.camera.lookAt(0, 0, 0)

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

    // Obstacles - update colors based on style palette
    this.obstacleMaterials.forEach((material, index) => {
      const colorIndex = index % config.obstacleColors.length
      material.color.set(config.obstacleColors[colorIndex])
    })
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

  private loadPlayer(): void {
    const loader = new GLTFLoader()
    loader.load('/models/player.glb', (gltf) => {
      this.player = gltf.scene
      this.player.scale.setScalar(0.5)
      this.player.position.set(0, 0.5, 0)
      
      // Apply toon material to all meshes
      this.player.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = this.playerMaterial
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      this.scene.add(this.player)
    })
  }

  private generateObstacles(count: number, spread: number): void {
    const config = visualStyleConfigs[gameStore.get(visualStyleAtom)]
    
    for (let i = 0; i < count; i++) {
      // Random position, avoid center
      let x: number, z: number
      do {
        x = (Math.random() - 0.5) * spread * 2
        z = (Math.random() - 0.5) * spread * 2
      } while (Math.abs(x) < 3 && Math.abs(z) < 3)

      const scale = 0.5 + Math.random() * 0.8
      const colorIndex = Math.floor(Math.random() * config.obstacleColors.length)
      
      // Create icosahedron
      const geometry = new THREE.IcosahedronGeometry(scale, 0)
      const material = new THREE.MeshStandardMaterial({
        color: config.obstacleColors[colorIndex],
        roughness: 0.4,
        metalness: 0.1
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, scale, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      
      this.obstacles.push(mesh)
      this.obstacleMaterials.push(material)
      this.scene.add(mesh)
    }
  }

  private subscribeToStore(): void {
    // Subscribe to visual style changes
    const unsubVisualStyle = gameStore.sub(visualStyleAtom, () => {
      const style = gameStore.get(visualStyleAtom)
      this.applyVisualStyle(visualStyleConfigs[style])
    })
    this.unsubscribers.push(unsubVisualStyle)
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
    
    const gameState = gameStore.get(gameStateAtom)
    
    // Update player movement when playing
    if (gameState === 'playing' && this.player) {
      const input = gameStore.get(inputDirectionAtom)
      const speed = gameStore.get(playerSpeedAtom)
      const deltaTime = 1 / 60 // Approximate delta
      
      // Move player based on input
      this.player.position.x += input.x * speed * deltaTime
      this.player.position.z += input.z * speed * deltaTime
      
      // Update player position in store
      setPlayerPosition([
        this.player.position.x,
        this.player.position.y,
        this.player.position.z
      ])
    }
    
    // Update camera to follow player
    if (this.player) {
      const cameraHeight = gameStore.get(cameraHeightAtom)
      const smoothing = gameStore.get(cameraSmoothingAtom)
      
      // Smooth camera follow
      const targetX = this.player.position.x
      const targetZ = this.player.position.z
      
      this.camera.position.x += (targetX - this.camera.position.x) * smoothing
      this.camera.position.z += (targetZ - this.camera.position.z) * smoothing
      this.camera.position.y = cameraHeight
      
      // Look at player
      this.camera.lookAt(
        this.player.position.x,
        0,
        this.player.position.z
      )
    }
    
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
    this.obstacles.forEach(mesh => {
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    })
    
    if (this.ground) {
      this.ground.geometry.dispose()
      this.groundMaterial.dispose()
    }
    
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

  getObstacles(): THREE.Mesh[] {
    return this.obstacles
  }
}
