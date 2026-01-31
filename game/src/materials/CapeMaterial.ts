import {
  ShaderMaterial,
  Color,
  Vector3,
  UniformsLib,
  UniformsUtils,
} from 'three'

export interface CapeMaterialOptions {
  color?: Color | string | number
  /** How quickly the lagged velocity catches up (0-1, lower = more lag) */
  lagWeight?: number
  /** Maximum displacement amount */
  displacementStrength?: number
  /** Y position below which vertices start to be affected (in local space) */
  effectStartY?: number
  /** Y position at which effect is at maximum */
  effectEndY?: number
}

const vertexShader = /* glsl */ `
  uniform vec3 laggedVelocity;
  uniform float displacementStrength;
  uniform float effectStartY;
  uniform float effectEndY;
  uniform float time;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Calculate effect strength based on Y position
    // effectStartY is where it starts (e.g., 0.5), effectEndY is max effect (e.g., -0.5)
    float effectRange = effectStartY - effectEndY;
    float normalizedY = clamp((effectStartY - pos.y) / effectRange, 0.0, 1.0);

    // Quadratic falloff for more natural look (more movement at bottom)
    float effectStrength = normalizedY * normalizedY;

    // Displacement is opposite to velocity (trailing behind)
    // Only use XZ velocity for horizontal displacement
    vec3 displacement = vec3(-laggedVelocity.x, 0.0, -laggedVelocity.z);

    // Add subtle wave motion for organic feel
    float wave = sin(time * 3.0 + pos.y * 5.0) * 0.1 * effectStrength;
    displacement.x += wave * length(laggedVelocity.xz);

    // When jumping (positive Y velocity), compress slightly at bottom
    // When falling (negative Y velocity), stretch slightly
    float verticalEffect = -laggedVelocity.y * 0.02 * effectStrength;
    pos.y += verticalEffect;

    // Apply horizontal displacement
    pos += displacement * effectStrength * displacementStrength;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    // Simple toon shading
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float NdotL = dot(vNormal, lightDir);

    // Two-tone shading (toon style)
    float shade = NdotL > 0.0 ? 1.0 : 0.7;

    // Add subtle rim lighting
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = smoothstep(0.6, 1.0, rim) * 0.3;

    vec3 finalColor = color * shade + rim;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export class CapeMaterial extends ShaderMaterial {
  private _laggedVelocity: Vector3 = new Vector3()
  private _targetVelocity: Vector3 = new Vector3()
  private _lagWeight: number

  constructor(options: CapeMaterialOptions = {}) {
    const {
      color = 0x4488ff,
      lagWeight = 0.08,
      displacementStrength = 0.15,
      effectStartY = 0.3,
      effectEndY = -1.0,
    } = options

    const uniforms = UniformsUtils.merge([
      UniformsLib.common,
      {
        color: { value: new Color(color) },
        laggedVelocity: { value: new Vector3() },
        displacementStrength: { value: displacementStrength },
        effectStartY: { value: effectStartY },
        effectEndY: { value: effectEndY },
        time: { value: 0 },
      },
    ])

    super({
      uniforms,
      vertexShader,
      fragmentShader,
    })

    this._lagWeight = lagWeight
  }

  /**
   * Call this every frame with the current velocity and delta time
   */
  update(velocity: { x: number; y: number; z: number }, deltaTime: number) {
    this._targetVelocity.set(velocity.x, velocity.y, velocity.z)

    // Lerp the lagged velocity towards target
    // Using 1 - (1 - weight)^(dt * 60) for frame-rate independent lerp
    const effectiveLerp = 1 - Math.pow(1 - this._lagWeight, deltaTime * 60)
    this._laggedVelocity.lerp(this._targetVelocity, effectiveLerp)

    this.uniforms.laggedVelocity.value.copy(this._laggedVelocity)
    this.uniforms.time.value += deltaTime
  }

  setColor(color: Color | string | number) {
    this.uniforms.color.value.set(color)
  }

  get lagWeight() {
    return this._lagWeight
  }

  set lagWeight(value: number) {
    this._lagWeight = value
  }

  get displacementStrength() {
    return this.uniforms.displacementStrength.value
  }

  set displacementStrength(value: number) {
    this.uniforms.displacementStrength.value = value
  }
}
