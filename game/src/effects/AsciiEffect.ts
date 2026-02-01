import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float cellSize;
uniform float colorMode;

// ASCII characters from dark to light: " .:-=+*#%@"
// We encode these as brightness thresholds and patterns

float character(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
    int a = int(round(p.x) + 5.0 * round(p.y));
    if (((n >> a) & 1) == 1) return 1.0;
  }
  return 0.0;
}

// Bitmap patterns for ASCII characters (5x5 grid encoded as int)
// Each character is encoded as bits in a 25-bit integer
int getCharPattern(float brightness) {
  // " " (space) - empty
  if (brightness < 0.1) return 0;
  // "." - dot
  if (brightness < 0.2) return 4194304; // bit at bottom center
  // ":" - colon
  if (brightness < 0.3) return 4325376; // two dots vertical
  // "-" - dash
  if (brightness < 0.4) return 448; // horizontal line middle
  // "=" - equals
  if (brightness < 0.5) return 14350; // two horizontal lines
  // "+" - plus
  if (brightness < 0.6) return 4357252; // cross pattern
  // "*" - asterisk
  if (brightness < 0.7) return 5765220; // star-ish
  // "#" - hash
  if (brightness < 0.8) return 15255086; // grid pattern
  // "%" - percent
  if (brightness < 0.9) return 18415153; // diagonal with dots
  // "@" - at sign - densest
  return 32641156; // filled circle-ish
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 resolution = 1.0 / texelSize;

  // Calculate cell position
  vec2 cellUv = floor(uv * resolution / cellSize) * cellSize / resolution;
  vec2 cellPos = fract(uv * resolution / cellSize);

  // Sample the center of the cell for brightness
  vec4 sampledColor = texture2D(inputBuffer, cellUv + (cellSize * 0.5) / resolution);

  // Calculate brightness using luminance formula
  float brightness = dot(sampledColor.rgb, vec3(0.299, 0.587, 0.114));

  // Get character pattern based on brightness
  int charPattern = getCharPattern(brightness);

  // Render the character
  float charPixel = character(charPattern, cellPos);

  vec3 finalColor;

  if (colorMode < 0.5) {
    // Green monochrome terminal style
    vec3 greenColor = vec3(0.0, 1.0, 0.3);
    // Add slight glow/phosphor effect
    float glow = brightness * 0.3;
    finalColor = greenColor * (charPixel * 0.8 + glow * 0.2);
    // Add scanline effect for retro feel
    float scanline = sin(uv.y * resolution.y * 1.5) * 0.04;
    finalColor *= (1.0 - scanline);
  } else {
    // Colored mode - preserve original colors
    finalColor = sampledColor.rgb * charPixel;
  }

  outputColor = vec4(finalColor, 1.0);
}
`

export class AsciiEffect extends Effect {
  constructor() {
    super('AsciiEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['cellSize', new Uniform(8.0)],
        ['colorMode', new Uniform(1.0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
    const timeUniform = this.uniforms.get('time')
    if (timeUniform) {
      timeUniform.value += deltaTime
    }
  }

  get cellSize(): number {
    return this.uniforms.get('cellSize')!.value
  }

  set cellSize(value: number) {
    this.uniforms.get('cellSize')!.value = value
  }

  get colorMode(): number {
    return this.uniforms.get('colorMode')!.value
  }

  set colorMode(value: number) {
    this.uniforms.get('colorMode')!.value = value
  }
}
