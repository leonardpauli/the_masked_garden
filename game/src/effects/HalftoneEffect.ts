import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float dotSize;
uniform float dotSpacing;
uniform float colorSeparation;

// CMYK angles in radians for color separation
const float CYAN_ANGLE = 0.261799; // 15 degrees
const float MAGENTA_ANGLE = 1.309; // 75 degrees
const float YELLOW_ANGLE = 1.5708; // 90 degrees
const float BLACK_ANGLE = 0.785398; // 45 degrees

// Convert RGB to CMYK
vec4 rgbToCmyk(vec3 rgb) {
  float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
  float c = (1.0 - rgb.r - k) / (1.0 - k + 0.001);
  float m = (1.0 - rgb.g - k) / (1.0 - k + 0.001);
  float y = (1.0 - rgb.b - k) / (1.0 - k + 0.001);
  return vec4(c, m, y, k);
}

// Convert CMYK back to RGB
vec3 cmykToRgb(vec4 cmyk) {
  float r = (1.0 - cmyk.x) * (1.0 - cmyk.w);
  float g = (1.0 - cmyk.y) * (1.0 - cmyk.w);
  float b = (1.0 - cmyk.z) * (1.0 - cmyk.w);
  return vec3(r, g, b);
}

// Rotate UV coordinates by angle
vec2 rotateUV(vec2 uv, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(
    uv.x * c - uv.y * s,
    uv.x * s + uv.y * c
  );
}

// Create halftone dot pattern for a single channel
float halftonePattern(vec2 uv, float angle, float value) {
  vec2 rotatedUV = rotateUV(uv, angle);
  vec2 nearest = floor(rotatedUV / dotSpacing + 0.5) * dotSpacing;
  vec2 diff = rotatedUV - nearest;
  float dist = length(diff);

  // Dot radius varies based on channel intensity
  float radius = dotSize * sqrt(value) * 0.5;

  // Smooth edge for anti-aliasing
  float edge = fwidth(dist) * 1.5;
  return smoothstep(radius + edge, radius - edge, dist);
}

// Black and white halftone
float bwHalftone(vec2 uv, float brightness) {
  vec2 rotatedUV = rotateUV(uv, BLACK_ANGLE);
  vec2 nearest = floor(rotatedUV / dotSpacing + 0.5) * dotSpacing;
  vec2 diff = rotatedUV - nearest;
  float dist = length(diff);

  // Invert brightness for traditional halftone (darker = bigger dots)
  float darkness = 1.0 - brightness;
  float radius = dotSize * sqrt(darkness) * 0.5;

  float edge = fwidth(dist) * 1.5;
  float dot = smoothstep(radius + edge, radius - edge, dist);

  return 1.0 - dot;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec3 color = inputColor.rgb;

  if (colorSeparation > 0.5) {
    // CMYK color separation mode
    vec4 cmyk = rgbToCmyk(color);

    // Apply halftone pattern to each CMYK channel with different angles
    float cyanDot = halftonePattern(pixelCoord, CYAN_ANGLE, cmyk.x);
    float magentaDot = halftonePattern(pixelCoord, MAGENTA_ANGLE, cmyk.y);
    float yellowDot = halftonePattern(pixelCoord, YELLOW_ANGLE, cmyk.z);
    float blackDot = halftonePattern(pixelCoord, BLACK_ANGLE, cmyk.w);

    // Reconstruct color from halftoned CMYK
    vec4 halftoned = vec4(cyanDot * cmyk.x, magentaDot * cmyk.y, yellowDot * cmyk.z, blackDot * cmyk.w);
    outputColor = vec4(cmykToRgb(halftoned), inputColor.a);
  } else {
    // Black and white mode
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    float bw = bwHalftone(pixelCoord, brightness);
    outputColor = vec4(vec3(bw), inputColor.a);
  }
}
`

export class HalftoneEffect extends Effect {
  constructor() {
    super('HalftoneEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['dotSize', new Uniform(4.0)],
        ['dotSpacing', new Uniform(8.0)],
        ['colorSeparation', new Uniform(1.0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }

  get dotSize(): number {
    return this.uniforms.get('dotSize')!.value as number
  }

  set dotSize(value: number) {
    this.uniforms.get('dotSize')!.value = value
  }

  get dotSpacing(): number {
    return this.uniforms.get('dotSpacing')!.value as number
  }

  set dotSpacing(value: number) {
    this.uniforms.get('dotSpacing')!.value = value
  }

  get colorSeparation(): boolean {
    return (this.uniforms.get('colorSeparation')!.value as number) > 0.5
  }

  set colorSeparation(value: boolean) {
    this.uniforms.get('colorSeparation')!.value = value ? 1.0 : 0.0
  }
}
