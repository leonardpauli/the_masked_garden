import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float causticIntensity;
uniform float distortionStrength;
uniform float particleDensity;
uniform float depthFalloff;

// Simplex noise for caustics
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Hash function for particles
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Caustic pattern
float caustics(vec2 uv, float t) {
  float scale = 8.0;
  vec2 p = uv * scale;

  float c1 = snoise(p + vec2(t * 0.3, t * 0.2));
  float c2 = snoise(p * 1.5 + vec2(-t * 0.2, t * 0.4));
  float c3 = snoise(p * 2.0 + vec2(t * 0.1, -t * 0.3));

  float caustic = (c1 + c2 * 0.5 + c3 * 0.25) / 1.75;
  caustic = pow(max(caustic * 0.5 + 0.5, 0.0), 3.0);

  return caustic;
}

// Floating particles/sediment
float particles(vec2 uv, float t) {
  float particles = 0.0;

  for (float i = 0.0; i < 5.0; i++) {
    vec2 offset = vec2(
      sin(t * 0.3 + i * 1.7) * 0.1,
      t * 0.02 * (1.0 + i * 0.2)
    );
    vec2 p = fract(uv * (3.0 + i * 2.0) + offset + i * 0.3);
    float d = length(p - 0.5);
    float brightness = hash(floor(uv * (3.0 + i * 2.0) + offset + i * 0.3));
    particles += smoothstep(0.02, 0.0, d) * brightness * 0.3;
  }

  return particles * particleDensity;
}

// Lens distortion
vec2 lensDistortion(vec2 uv, float strength) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  float distortion = 1.0 + dist * dist * strength;
  return center * distortion + 0.5;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Apply subtle wave distortion
  vec2 waveOffset = vec2(
    sin(uv.y * 20.0 + time * 2.0) * 0.003,
    cos(uv.x * 15.0 + time * 1.5) * 0.002
  ) * distortionStrength;

  // Apply lens distortion (stronger at edges)
  vec2 distortedUv = lensDistortion(uv + waveOffset, 0.1 * distortionStrength);

  // Clamp UV to prevent sampling outside texture
  distortedUv = clamp(distortedUv, 0.0, 1.0);

  // Sample the scene with distorted coordinates
  vec4 sceneColor = texture2D(inputBuffer, distortedUv);

  // Calculate edge blur factor
  vec2 edgeDist = abs(uv - 0.5) * 2.0;
  float edgeFactor = smoothstep(0.6, 1.0, max(edgeDist.x, edgeDist.y));

  // Simple edge blur by sampling neighbors
  vec4 blurColor = sceneColor;
  if (edgeFactor > 0.0) {
    float blurSize = edgeFactor * 0.004;
    blurColor = texture2D(inputBuffer, distortedUv + vec2(blurSize, 0.0));
    blurColor += texture2D(inputBuffer, distortedUv + vec2(-blurSize, 0.0));
    blurColor += texture2D(inputBuffer, distortedUv + vec2(0.0, blurSize));
    blurColor += texture2D(inputBuffer, distortedUv + vec2(0.0, -blurSize));
    blurColor = mix(sceneColor, blurColor * 0.25, edgeFactor * 0.5);
  }
  sceneColor = blurColor;

  // Color absorption - reds fade, blues dominate
  // Simulate depth-based absorption
  float luminance = dot(sceneColor.rgb, vec3(0.299, 0.587, 0.114));
  float pseudoDepth = 1.0 - luminance * 0.5;

  vec3 absorptionColor = vec3(
    sceneColor.r * exp(-pseudoDepth * depthFalloff * 2.0),  // Red absorbs fastest
    sceneColor.g * exp(-pseudoDepth * depthFalloff * 0.8),  // Green absorbs medium
    sceneColor.b * exp(-pseudoDepth * depthFalloff * 0.3)   // Blue absorbs slowest
  );

  // Add underwater tint
  vec3 underwaterTint = vec3(0.1, 0.3, 0.5);
  absorptionColor = mix(absorptionColor, underwaterTint * luminance, 0.2);

  // Calculate caustic lighting
  float causticLight = caustics(uv, time);
  vec3 causticColor = vec3(0.7, 0.9, 1.0) * causticLight * causticIntensity;

  // Add caustics to the scene
  vec3 finalColor = absorptionColor + causticColor * 0.4;

  // Add floating particles
  float particleLight = particles(uv, time);
  finalColor += vec3(0.8, 0.9, 1.0) * particleLight;

  // Add subtle vignette for underwater darkness at edges
  float vignette = 1.0 - edgeFactor * 0.3;
  finalColor *= vignette;

  // Slight overall blue/cyan tint
  finalColor = mix(finalColor, finalColor * vec3(0.85, 0.95, 1.1), 0.3);

  outputColor = vec4(finalColor, sceneColor.a);
}
`

export class UnderwaterEffect extends Effect {
  constructor({
    causticIntensity = 0.8,
    distortionStrength = 1.0,
    particleDensity = 1.0,
    depthFalloff = 0.5,
  }: {
    causticIntensity?: number
    distortionStrength?: number
    particleDensity?: number
    depthFalloff?: number
  } = {}) {
    super('UnderwaterEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['causticIntensity', new Uniform(causticIntensity)],
        ['distortionStrength', new Uniform(distortionStrength)],
        ['particleDensity', new Uniform(particleDensity)],
        ['depthFalloff', new Uniform(depthFalloff)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }

  set causticIntensity(value: number) {
    this.uniforms.get('causticIntensity')!.value = value
  }

  get causticIntensity(): number {
    return this.uniforms.get('causticIntensity')!.value as number
  }

  set distortionStrength(value: number) {
    this.uniforms.get('distortionStrength')!.value = value
  }

  get distortionStrength(): number {
    return this.uniforms.get('distortionStrength')!.value as number
  }

  set particleDensity(value: number) {
    this.uniforms.get('particleDensity')!.value = value
  }

  get particleDensity(): number {
    return this.uniforms.get('particleDensity')!.value as number
  }

  set depthFalloff(value: number) {
    this.uniforms.get('depthFalloff')!.value = value
  }

  get depthFalloff(): number {
    return this.uniforms.get('depthFalloff')!.value as number
  }
}
