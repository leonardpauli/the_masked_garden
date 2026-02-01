import { ShaderMaterial, Color } from 'three'

export interface WaterMaterialOptions {
  deepColor?: Color | string | number
  lightColor?: Color | string | number
  foamColor?: Color | string | number
  uvScale?: number
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float time;
  uniform float uvScale;
  uniform vec3 deepColor;
  uniform vec3 lightColor;
  uniform vec3 foamColor;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Scale UVs for wave pattern density
    vec2 scaledUv = vUv * uvScale;

    // Slow, peaceful wave pattern using multiple overlapping sine waves
    float wave1 = sin(scaledUv.x + time * 0.8) * sin(scaledUv.y * 0.75 + time * 0.6);
    float wave2 = sin(scaledUv.x * 0.625 - time * 0.5) * sin(scaledUv.y * 1.125 + time * 0.4);
    float wave = (wave1 + wave2) * 0.5;

    // Blend between deep and light water based on wave
    float waterBlend = wave * 0.5 + 0.5;
    vec3 waterColor = mix(deepColor, lightColor, waterBlend);

    // Subtle foam on wave peaks (cartoony hard edge)
    float foam = smoothstep(0.65, 0.75, wave);
    vec3 finalColor = mix(waterColor, foamColor, foam * 0.6);

    // Simple toon-style lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float NdotL = dot(vNormal, lightDir);
    float shade = NdotL > 0.0 ? 1.0 : 0.85;

    finalColor *= shade;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export class WaterMaterial extends ShaderMaterial {
  constructor(options: WaterMaterialOptions = {}) {
    const {
      deepColor = 0x1a6b99,
      lightColor = 0x4db8e8,
      foamColor = 0xffffff,
      uvScale = 4,
    } = options

    super({
      uniforms: {
        time: { value: 0 },
        uvScale: { value: uvScale },
        deepColor: { value: new Color(deepColor) },
        lightColor: { value: new Color(lightColor) },
        foamColor: { value: new Color(foamColor) },
      },
      vertexShader,
      fragmentShader,
    })
  }

  update(deltaTime: number): void {
    this.uniforms.time.value += deltaTime
  }

  setUvScale(scale: number): void {
    this.uniforms.uvScale.value = scale
  }
}
