import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float kernelSize;
uniform float saturationBoost;
uniform float colorLevels;

// Get average color and variance in a region
vec4 getRegionStats(sampler2D tex, vec2 uv, vec2 offset, vec2 texelSize) {
  vec3 sum = vec3(0.0);
  vec3 sumSq = vec3(0.0);
  float count = 0.0;

  for (float x = 0.0; x <= 1.0; x += 0.25) {
    for (float y = 0.0; y <= 1.0; y += 0.25) {
      vec2 sampleUV = uv + (offset + vec2(x, y)) * texelSize * kernelSize;
      vec3 c = texture2D(tex, sampleUV).rgb;
      sum += c;
      sumSq += c * c;
      count += 1.0;
    }
  }

  vec3 mean = sum / count;
  vec3 variance = sumSq / count - mean * mean;
  float totalVariance = variance.r + variance.g + variance.b;

  return vec4(mean, totalVariance);
}

// Kuwahara filter - selects the region with lowest variance
vec3 kuwaharaFilter(sampler2D tex, vec2 uv, vec2 texelSize) {
  // Sample 4 quadrants around the pixel
  vec4 region0 = getRegionStats(tex, uv, vec2(-1.0, -1.0), texelSize);
  vec4 region1 = getRegionStats(tex, uv, vec2(0.0, -1.0), texelSize);
  vec4 region2 = getRegionStats(tex, uv, vec2(-1.0, 0.0), texelSize);
  vec4 region3 = getRegionStats(tex, uv, vec2(0.0, 0.0), texelSize);

  // Find region with minimum variance
  vec3 result = region0.rgb;
  float minVariance = region0.a;

  if (region1.a < minVariance) {
    minVariance = region1.a;
    result = region1.rgb;
  }
  if (region2.a < minVariance) {
    minVariance = region2.a;
    result = region2.rgb;
  }
  if (region3.a < minVariance) {
    result = region3.rgb;
  }

  return result;
}

// Quantize color for more painterly look
vec3 quantizeColor(vec3 color, float levels) {
  return floor(color * levels + 0.5) / levels;
}

// Boost saturation
vec3 adjustSaturation(vec3 color, float amount) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, amount);
}

// Subtle edge detection for preserving structure
float detectEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
  vec3 c00 = texture2D(tex, uv + texelSize * vec2(-1.0, -1.0)).rgb;
  vec3 c10 = texture2D(tex, uv + texelSize * vec2(0.0, -1.0)).rgb;
  vec3 c20 = texture2D(tex, uv + texelSize * vec2(1.0, -1.0)).rgb;
  vec3 c01 = texture2D(tex, uv + texelSize * vec2(-1.0, 0.0)).rgb;
  vec3 c21 = texture2D(tex, uv + texelSize * vec2(1.0, 0.0)).rgb;
  vec3 c02 = texture2D(tex, uv + texelSize * vec2(-1.0, 1.0)).rgb;
  vec3 c12 = texture2D(tex, uv + texelSize * vec2(0.0, 1.0)).rgb;
  vec3 c22 = texture2D(tex, uv + texelSize * vec2(1.0, 1.0)).rgb;

  // Sobel operator
  vec3 gx = -c00 - 2.0 * c01 - c02 + c20 + 2.0 * c21 + c22;
  vec3 gy = -c00 - 2.0 * c10 - c20 + c02 + 2.0 * c12 + c22;

  return length(gx) + length(gy);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texelSize = 1.0 / resolution;

  // Apply Kuwahara filter for painterly effect
  vec3 painted = kuwaharaFilter(inputBuffer, uv, texelSize);

  // Detect edges to preserve structure
  float edge = detectEdge(inputBuffer, uv, texelSize);
  edge = smoothstep(0.1, 0.5, edge);

  // Quantize colors for more painterly appearance
  vec3 quantized = quantizeColor(painted, colorLevels);

  // Blend between quantized and smooth based on edges
  vec3 result = mix(quantized, painted, edge * 0.5);

  // Boost saturation for vibrant painting feel
  result = adjustSaturation(result, saturationBoost);

  // Subtle canvas texture effect using time
  float canvas = sin(uv.x * 800.0 + time * 0.1) * sin(uv.y * 800.0 - time * 0.05) * 0.01;
  result += canvas;

  outputColor = vec4(result, inputColor.a);
}
`

export class OilPaintingEffect extends Effect {
  constructor({
    kernelSize = 4.0,
    saturationBoost = 1.3,
    colorLevels = 16.0,
  }: {
    kernelSize?: number
    saturationBoost?: number
    colorLevels?: number
  } = {}) {
    super('OilPaintingEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['kernelSize', new Uniform(kernelSize)],
        ['saturationBoost', new Uniform(saturationBoost)],
        ['colorLevels', new Uniform(colorLevels)],
      ]),
    })
  }

  get kernelSize(): number {
    return this.uniforms.get('kernelSize')!.value as number
  }

  set kernelSize(value: number) {
    this.uniforms.get('kernelSize')!.value = value
  }

  get saturationBoost(): number {
    return this.uniforms.get('saturationBoost')!.value as number
  }

  set saturationBoost(value: number) {
    this.uniforms.get('saturationBoost')!.value = value
  }

  get colorLevels(): number {
    return this.uniforms.get('colorLevels')!.value as number
  }

  set colorLevels(value: number) {
    this.uniforms.get('colorLevels')!.value = value
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }
}
