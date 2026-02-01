import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float blurStrength;
uniform float focusPosition;
uniform float focusBandWidth;
uniform float saturationBoost;

// Simple box blur sample offsets
const int BLUR_SAMPLES = 9;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Calculate distance from focus band center
  float distFromCenter = abs(uv.y - focusPosition);
  float focusEdge = focusBandWidth * 0.5;

  // Blur amount increases as we move away from the focus band
  float blurAmount = smoothstep(focusEdge, focusEdge + 0.3, distFromCenter) * blurStrength;

  // Sample offsets for blur (horizontal and vertical)
  vec2 texelSize = 1.0 / resolution;

  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  if (blurAmount > 0.001) {
    // Apply blur based on distance from focus band
    float radius = blurAmount * 20.0;

    for (int x = -4; x <= 4; x++) {
      for (int y = -4; y <= 4; y++) {
        vec2 offset = vec2(float(x), float(y)) * texelSize * radius;
        float weight = 1.0 - length(vec2(float(x), float(y))) / 5.66; // sqrt(32)
        weight = max(weight, 0.0);
        color += texture2D(inputBuffer, uv + offset) * weight;
        totalWeight += weight;
      }
    }
    color /= totalWeight;
  } else {
    color = inputColor;
  }

  // Mix between sharp and blurred based on blur amount
  color = mix(inputColor, color, smoothstep(0.0, 0.1, blurAmount));

  // Apply saturation boost for miniature/toy feel
  vec3 luminance = vec3(0.299, 0.587, 0.114);
  float lum = dot(color.rgb, luminance);
  vec3 saturated = mix(vec3(lum), color.rgb, 1.0 + saturationBoost);

  // Slight contrast boost for that toy-like look
  saturated = (saturated - 0.5) * 1.1 + 0.5;

  outputColor = vec4(saturated, color.a);
}
`

export class TiltShiftEffect extends Effect {
  constructor({
    blurStrength = 0.8,
    focusPosition = 0.5,
    focusBandWidth = 0.3,
    saturationBoost = 0.3,
  }: {
    blurStrength?: number
    focusPosition?: number
    focusBandWidth?: number
    saturationBoost?: number
  } = {}) {
    super('TiltShiftEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['blurStrength', new Uniform(blurStrength)],
        ['focusPosition', new Uniform(focusPosition)],
        ['focusBandWidth', new Uniform(focusBandWidth)],
        ['saturationBoost', new Uniform(saturationBoost)],
      ]),
    })
  }

  get blurStrength(): number {
    return this.uniforms.get('blurStrength')!.value as number
  }

  set blurStrength(value: number) {
    this.uniforms.get('blurStrength')!.value = value
  }

  get focusPosition(): number {
    return this.uniforms.get('focusPosition')!.value as number
  }

  set focusPosition(value: number) {
    this.uniforms.get('focusPosition')!.value = value
  }

  get focusBandWidth(): number {
    return this.uniforms.get('focusBandWidth')!.value as number
  }

  set focusBandWidth(value: number) {
    this.uniforms.get('focusBandWidth')!.value = value
  }

  get saturationBoost(): number {
    return this.uniforms.get('saturationBoost')!.value as number
  }

  set saturationBoost(value: number) {
    this.uniforms.get('saturationBoost')!.value = value
  }

  update(_renderer: unknown, _inputBuffer: unknown, _deltaTime: number): void {
    // No time-based updates needed for tilt-shift effect
  }
}
