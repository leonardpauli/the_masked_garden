import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float pixelSize;
uniform float ditherStrength;
uniform float colorLevels;

// 8x8 Bayer matrix for ordered dithering
const float bayerMatrix[64] = float[64](
   0.0/64.0, 32.0/64.0,  8.0/64.0, 40.0/64.0,  2.0/64.0, 34.0/64.0, 10.0/64.0, 42.0/64.0,
  48.0/64.0, 16.0/64.0, 56.0/64.0, 24.0/64.0, 50.0/64.0, 18.0/64.0, 58.0/64.0, 26.0/64.0,
  12.0/64.0, 44.0/64.0,  4.0/64.0, 36.0/64.0, 14.0/64.0, 46.0/64.0,  6.0/64.0, 38.0/64.0,
  60.0/64.0, 28.0/64.0, 52.0/64.0, 20.0/64.0, 62.0/64.0, 30.0/64.0, 54.0/64.0, 22.0/64.0,
   3.0/64.0, 35.0/64.0, 11.0/64.0, 43.0/64.0,  1.0/64.0, 33.0/64.0,  9.0/64.0, 41.0/64.0,
  51.0/64.0, 19.0/64.0, 59.0/64.0, 27.0/64.0, 49.0/64.0, 17.0/64.0, 57.0/64.0, 25.0/64.0,
  15.0/64.0, 47.0/64.0,  7.0/64.0, 39.0/64.0, 13.0/64.0, 45.0/64.0,  5.0/64.0, 37.0/64.0,
  63.0/64.0, 31.0/64.0, 55.0/64.0, 23.0/64.0, 61.0/64.0, 29.0/64.0, 53.0/64.0, 21.0/64.0
);

float getBayerValue(ivec2 coord) {
  int x = coord.x % 8;
  int y = coord.y % 8;
  return bayerMatrix[y * 8 + x];
}

// DOS/demoscene-style limited palette (16 colors - similar to EGA/CGA)
vec3 palette[16] = vec3[16](
  vec3(0.0, 0.0, 0.0),       // Black
  vec3(0.0, 0.0, 0.67),      // Blue
  vec3(0.0, 0.67, 0.0),      // Green
  vec3(0.0, 0.67, 0.67),     // Cyan
  vec3(0.67, 0.0, 0.0),      // Red
  vec3(0.67, 0.0, 0.67),     // Magenta
  vec3(0.67, 0.33, 0.0),     // Brown
  vec3(0.67, 0.67, 0.67),    // Light Gray
  vec3(0.33, 0.33, 0.33),    // Dark Gray
  vec3(0.33, 0.33, 1.0),     // Light Blue
  vec3(0.33, 1.0, 0.33),     // Light Green
  vec3(0.33, 1.0, 1.0),      // Light Cyan
  vec3(1.0, 0.33, 0.33),     // Light Red
  vec3(1.0, 0.33, 1.0),      // Light Magenta
  vec3(1.0, 1.0, 0.33),      // Yellow
  vec3(1.0, 1.0, 1.0)        // White
);

vec3 findClosestPaletteColor(vec3 color) {
  vec3 closest = palette[0];
  float minDist = 999.0;

  for (int i = 0; i < 16; i++) {
    vec3 diff = color - palette[i];
    float dist = dot(diff, diff);
    if (dist < minDist) {
      minDist = dist;
      closest = palette[i];
    }
  }

  return closest;
}

// Quantize color to limited levels before palette matching
vec3 quantizeColor(vec3 color, float levels) {
  return floor(color * levels + 0.5) / levels;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Get resolution for pixelation
  vec2 resolution = vec2(textureSize(inputBuffer, 0));

  // Calculate pixelated coordinates
  vec2 pixelatedUV = floor(uv * resolution / pixelSize) * pixelSize / resolution;

  // Sample the pixelated color
  vec4 color = texture2D(inputBuffer, pixelatedUV);

  // Get pixel coordinate for dithering
  ivec2 pixelCoord = ivec2(gl_FragCoord.xy / pixelSize);
  float bayerValue = getBayerValue(pixelCoord);

  // Apply dithering offset before quantization
  vec3 ditheredColor = color.rgb + (bayerValue - 0.5) * ditherStrength;

  // Quantize to limited color levels
  vec3 quantized = quantizeColor(ditheredColor, colorLevels);

  // Map to the retro palette
  vec3 finalColor = findClosestPaletteColor(quantized);

  outputColor = vec4(finalColor, color.a);
}
`

export class PixelateEffect extends Effect {
  constructor({
    pixelSize = 4.0,
    ditherStrength = 0.15,
    colorLevels = 8.0,
  }: {
    pixelSize?: number
    ditherStrength?: number
    colorLevels?: number
  } = {}) {
    super('PixelateEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['pixelSize', new Uniform(pixelSize)],
        ['ditherStrength', new Uniform(ditherStrength)],
        ['colorLevels', new Uniform(colorLevels)],
      ]),
    })
  }

  get pixelSize(): number {
    return this.uniforms.get('pixelSize')!.value as number
  }

  set pixelSize(value: number) {
    this.uniforms.get('pixelSize')!.value = value
  }

  get ditherStrength(): number {
    return this.uniforms.get('ditherStrength')!.value as number
  }

  set ditherStrength(value: number) {
    this.uniforms.get('ditherStrength')!.value = value
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
