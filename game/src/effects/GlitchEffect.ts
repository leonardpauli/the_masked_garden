import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float intensity;
uniform float scanLineIntensity;
uniform float noiseIntensity;
uniform float tearFrequency;
uniform float blockSize;

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Noise function
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texCoord = uv;
  float t = time;

  // Create glitch timing - occasional bursts
  float glitchTrigger = step(0.95, random(vec2(floor(t * 3.0), 0.0)));
  float glitchIntensity = intensity * glitchTrigger;

  // Secondary smaller glitches
  float microGlitch = step(0.85, random(vec2(floor(t * 12.0), 1.0))) * 0.3;
  glitchIntensity = max(glitchIntensity, microGlitch * intensity);

  // Horizontal tearing - shift entire horizontal lines
  float tearLine = floor(uv.y * 50.0);
  float tearOffset = 0.0;
  if (random(vec2(tearLine, floor(t * tearFrequency))) > 0.97) {
    tearOffset = (random(vec2(tearLine, t)) - 0.5) * 0.1 * glitchIntensity;
  }
  texCoord.x += tearOffset;

  // Block displacement - shift rectangular blocks
  vec2 blockCoord = floor(uv * blockSize);
  float blockRand = random(blockCoord + floor(t * 8.0));
  if (blockRand > 0.98 && glitchIntensity > 0.0) {
    vec2 blockOffset = vec2(
      (random(blockCoord + vec2(t, 0.0)) - 0.5) * 0.08,
      (random(blockCoord + vec2(0.0, t)) - 0.5) * 0.04
    );
    texCoord += blockOffset * glitchIntensity;
  }

  // RGB channel separation (chromatic aberration)
  float rgbShiftAmount = 0.005 + glitchIntensity * 0.02;
  float rgbShiftRand = random(vec2(floor(t * 20.0), 2.0));
  vec2 rgbShiftDir = vec2(
    cos(rgbShiftRand * 6.28318) * rgbShiftAmount,
    sin(rgbShiftRand * 6.28318) * rgbShiftAmount * 0.5
  );

  // Sample each channel with offset
  float r = texture2D(inputBuffer, texCoord + rgbShiftDir).r;
  float g = texture2D(inputBuffer, texCoord).g;
  float b = texture2D(inputBuffer, texCoord - rgbShiftDir).b;

  vec3 color = vec3(r, g, b);

  // Scan lines
  float scanLine = sin(uv.y * 800.0) * 0.5 + 0.5;
  scanLine = pow(scanLine, 1.5);
  color = mix(color, color * scanLine, scanLineIntensity);

  // Horizontal scan line flicker
  float flickerLine = step(0.995, random(vec2(floor(uv.y * 200.0), floor(t * 30.0))));
  color = mix(color, vec3(1.0), flickerLine * glitchIntensity * 0.5);

  // Digital noise/static
  float staticNoise = random(uv * vec2(1000.0, 1000.0) + t * 100.0);
  staticNoise = (staticNoise - 0.5) * noiseIntensity * (1.0 + glitchIntensity * 2.0);
  color += staticNoise;

  // Color corruption during glitch
  if (glitchIntensity > 0.5) {
    float corruptRand = random(vec2(floor(t * 15.0), 3.0));
    if (corruptRand > 0.7) {
      // Invert colors briefly
      color = mix(color, 1.0 - color, (corruptRand - 0.7) * 3.0 * glitchIntensity);
    }
    if (corruptRand < 0.3) {
      // Shift to single channel
      float mono = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(mono, mono * 0.8, mono * 1.2), corruptRand * 2.0 * glitchIntensity);
    }
  }

  // Occasional full-width horizontal glitch bar
  float barY = fract(t * 0.5);
  float barHeight = 0.02;
  if (abs(uv.y - barY) < barHeight && glitchIntensity > 0.0) {
    float barShift = (random(vec2(floor(t * 10.0), 4.0)) - 0.5) * 0.2;
    vec3 barColor = texture2D(inputBuffer, vec2(uv.x + barShift, uv.y)).rgb;
    color = mix(color, barColor, glitchIntensity * 0.8);
  }

  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`

export class GlitchEffect extends Effect {
  constructor({
    intensity = 1.0,
    scanLineIntensity = 0.1,
    noiseIntensity = 0.05,
    tearFrequency = 10.0,
    blockSize = 8.0,
  } = {}) {
    super('GlitchEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['intensity', new Uniform(intensity)],
        ['scanLineIntensity', new Uniform(scanLineIntensity)],
        ['noiseIntensity', new Uniform(noiseIntensity)],
        ['tearFrequency', new Uniform(tearFrequency)],
        ['blockSize', new Uniform(blockSize)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }

  get intensity(): number {
    return this.uniforms.get('intensity')!.value as number
  }

  set intensity(value: number) {
    this.uniforms.get('intensity')!.value = value
  }

  get scanLineIntensity(): number {
    return this.uniforms.get('scanLineIntensity')!.value as number
  }

  set scanLineIntensity(value: number) {
    this.uniforms.get('scanLineIntensity')!.value = value
  }

  get noiseIntensity(): number {
    return this.uniforms.get('noiseIntensity')!.value as number
  }

  set noiseIntensity(value: number) {
    this.uniforms.get('noiseIntensity')!.value = value
  }
}
