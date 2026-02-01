import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float pulseIntensity;
uniform float channelRotation;

// Rotate color channels for otherworldly feel
vec3 rotateChannels(vec3 color, float angle) {
  float c = cos(angle);
  float s = sin(angle);

  // Rotation matrix that blends channels
  mat3 rotation = mat3(
    c + (1.0 - c) / 3.0,       (1.0 - c) / 3.0 - s / sqrt(3.0), (1.0 - c) / 3.0 + s / sqrt(3.0),
    (1.0 - c) / 3.0 + s / sqrt(3.0), c + (1.0 - c) / 3.0,       (1.0 - c) / 3.0 - s / sqrt(3.0),
    (1.0 - c) / 3.0 - s / sqrt(3.0), (1.0 - c) / 3.0 + s / sqrt(3.0), c + (1.0 - c) / 3.0
  );

  return rotation * color;
}

// Convert RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Subtle breathing pulse for inversion intensity
  float pulse = 1.0 + pulseIntensity * sin(time * 1.5) * 0.1;

  // Convert to HSV for hue manipulation
  vec3 hsv = rgb2hsv(color);

  // Shift hue by golden ratio for alien feel (not simple 180 degree flip)
  float hueShift = 0.618033988749; // Golden ratio - creates pleasing but alien color relationships
  hsv.x = fract(hsv.x + hueShift + sin(time * 0.3) * 0.05);

  // Invert value (shadows become light, light becomes void)
  // But use a curve to make it more dramatic
  hsv.z = 1.0 - pow(hsv.z, 0.8 * pulse);

  // Boost saturation in the inverted space for more otherworldly feel
  hsv.y = min(1.0, hsv.y * 1.3);

  // Convert back to RGB
  vec3 inverted = hsv2rgb(hsv);

  // Apply channel rotation for extra dimension-shifting feel
  float rotAngle = channelRotation + sin(time * 0.7) * 0.1;
  inverted = rotateChannels(inverted, rotAngle);

  // Slight contrast enhancement to emphasize the inversion
  inverted = (inverted - 0.5) * 1.1 + 0.5;
  inverted = clamp(inverted, 0.0, 1.0);

  // Add subtle vignette that pulses - edges of the "other dimension"
  vec2 vignetteUV = uv * (1.0 - uv.yx);
  float vignette = vignetteUV.x * vignetteUV.y * 15.0;
  vignette = pow(vignette, 0.25 + sin(time * 2.0) * 0.02);

  // Mix vignette with a slight purple tint for otherworldly edge
  vec3 vignetteTint = vec3(0.4, 0.2, 0.6);
  inverted = mix(inverted * vignetteTint, inverted, vignette);

  outputColor = vec4(inverted, inputColor.a);
}
`

export class NegativeEffect extends Effect {
  constructor({
    pulseIntensity = 1.0,
    channelRotation = 0.3,
  }: {
    pulseIntensity?: number
    channelRotation?: number
  } = {}) {
    super('NegativeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['pulseIntensity', new Uniform(pulseIntensity)],
        ['channelRotation', new Uniform(channelRotation)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }

  set pulseIntensity(value: number) {
    this.uniforms.get('pulseIntensity')!.value = value
  }

  get pulseIntensity(): number {
    return this.uniforms.get('pulseIntensity')!.value as number
  }

  set channelRotation(value: number) {
    this.uniforms.get('channelRotation')!.value = value
  }

  get channelRotation(): number {
    return this.uniforms.get('channelRotation')!.value as number
  }
}
