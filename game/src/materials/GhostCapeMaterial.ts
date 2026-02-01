import {
  ShaderMaterial,
  Color,
  Vector3,
  UniformsLib,
  UniformsUtils,
  DoubleSide,
} from 'three'

export interface GhostCapeMaterialOptions {
  color?: Color | string | number
  opacity?: number
  lagWeight?: number
  displacementStrength?: number
  effectStartY?: number
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

    float effectRange = effectStartY - effectEndY;
    float normalizedY = clamp((effectStartY - pos.y) / effectRange, 0.0, 1.0);
    float effectStrength = normalizedY * normalizedY;

    vec3 displacement = vec3(-laggedVelocity.x, 0.0, -laggedVelocity.z);
    float wave = sin(time * 3.0 + pos.y * 5.0) * 0.1 * effectStrength;
    displacement.x += wave * length(laggedVelocity.xz);

    float verticalEffect = -laggedVelocity.y * 0.02 * effectStrength;
    pos.y += verticalEffect;
    pos += displacement * effectStrength * displacementStrength;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  uniform float time;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float NdotL = dot(vNormal, lightDir);
    float shade = NdotL > 0.0 ? 1.0 : 0.7;

    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = smoothstep(0.4, 1.0, rim) * 0.5;

    // Ghostly pulsing glow
    float pulse = sin(time * 2.0) * 0.1 + 0.9;

    vec3 finalColor = color * shade * pulse + rim * color;

    // Fresnel-based transparency (more transparent in center, more opaque at edges)
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.0);
    float finalOpacity = mix(opacity * 0.5, opacity, fresnel);

    gl_FragColor = vec4(finalColor, finalOpacity);
  }
`

export class GhostCapeMaterial extends ShaderMaterial {
  private _laggedVelocity: Vector3 = new Vector3()
  private _targetVelocity: Vector3 = new Vector3()
  private _lagWeight: number

  constructor(options: GhostCapeMaterialOptions = {}) {
    const {
      color = 0x88aaff,
      opacity = 0.6,
      lagWeight = 0.08,
      displacementStrength = 0.15,
      effectStartY = 0.3,
      effectEndY = -1.0,
    } = options

    const uniforms = UniformsUtils.merge([
      UniformsLib.common,
      {
        color: { value: new Color(color) },
        opacity: { value: opacity },
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
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    })

    this._lagWeight = lagWeight
  }

  update(velocity: { x: number; y: number; z: number }, deltaTime: number) {
    this._targetVelocity.set(velocity.x, velocity.y, velocity.z)
    const effectiveLerp = 1 - Math.pow(1 - this._lagWeight, deltaTime * 60)
    this._laggedVelocity.lerp(this._targetVelocity, effectiveLerp)
    this.uniforms.laggedVelocity.value.copy(this._laggedVelocity)
    this.uniforms.time.value += deltaTime
  }

  setColor(color: Color | string | number) {
    this.uniforms.color.value.set(color)
  }
}
