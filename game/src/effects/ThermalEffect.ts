import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;

// Convert to grayscale luminance
float getLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

// Thermal color palette (cold blue -> warm red/yellow/white)
vec3 thermalPalette(float t) {
  // Dark blue -> Blue -> Cyan -> Green -> Yellow -> Orange -> Red -> White
  vec3 colors[8];
  colors[0] = vec3(0.0, 0.0, 0.2);   // Dark blue (coldest)
  colors[1] = vec3(0.0, 0.0, 0.8);   // Blue
  colors[2] = vec3(0.0, 0.5, 1.0);   // Cyan
  colors[3] = vec3(0.0, 0.8, 0.2);   // Green
  colors[4] = vec3(1.0, 1.0, 0.0);   // Yellow
  colors[5] = vec3(1.0, 0.5, 0.0);   // Orange
  colors[6] = vec3(1.0, 0.0, 0.0);   // Red
  colors[7] = vec3(1.0, 1.0, 1.0);   // White (hottest)

  float scaledT = t * 7.0;
  int idx = int(floor(scaledT));
  float frac = fract(scaledT);

  if (idx >= 7) return colors[7];
  if (idx < 0) return colors[0];

  return mix(colors[idx], colors[idx + 1], frac);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Get base luminance
  float lum = getLuminance(color);

  // Add some noise for heat shimmer effect
  float noise = sin(uv.y * 100.0 + time * 5.0) * 0.02;
  noise += sin(uv.x * 80.0 + time * 3.0) * 0.01;

  // Slight UV distortion for heat wave effect
  vec2 distortedUv = uv + vec2(
    sin(uv.y * 50.0 + time * 4.0) * 0.002,
    cos(uv.x * 50.0 + time * 3.0) * 0.002
  );

  vec3 distortedColor = texture2D(inputBuffer, distortedUv).rgb;
  float distortedLum = getLuminance(distortedColor);

  // Combine luminance with noise
  float heat = clamp(distortedLum + noise, 0.0, 1.0);

  // Apply thermal palette
  vec3 thermal = thermalPalette(heat);

  // Add subtle scanline effect
  float scanline = sin(uv.y * 400.0) * 0.03 + 1.0;
  thermal *= scanline;

  outputColor = vec4(thermal, inputColor.a);
}
`

export class ThermalEffect extends Effect {
  constructor() {
    super('ThermalEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }
}
