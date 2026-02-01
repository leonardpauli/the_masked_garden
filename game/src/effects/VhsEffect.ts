import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float noiseIntensity;
uniform float scanLineIntensity;
uniform float rgbShift;
uniform float trackingError;

// Pseudo-random noise function
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Tracking error displacement
float trackingNoise(vec2 uv, float t) {
  float trackLine = floor(uv.y * 20.0 + t * 2.0);
  float trackRand = rand(vec2(trackLine, floor(t * 10.0)));

  // Create occasional tracking error bands
  float trackBand = smoothstep(0.95, 1.0, trackRand);
  float bandHeight = noise(vec2(trackLine * 0.1, t * 5.0));

  return trackBand * sin(uv.y * 50.0 + t * 20.0) * bandHeight;
}

// Vertical color banding
float colorBanding(vec2 uv) {
  return sin(uv.x * 100.0) * 0.02 + sin(uv.x * 250.0) * 0.01;
}

// Jitter/wobble effect
vec2 jitter(vec2 uv, float t) {
  float jitterAmount = rand(vec2(floor(t * 15.0), 0.0));
  float shouldJitter = step(0.97, jitterAmount);

  float wobbleX = sin(t * 100.0) * 0.002 * shouldJitter;
  float wobbleY = sin(t * 80.0 + uv.x * 10.0) * 0.001 * shouldJitter;

  // Subtle constant wobble
  wobbleX += sin(t * 2.0 + uv.y * 3.0) * 0.0005;
  wobbleY += cos(t * 1.5) * 0.0003;

  return vec2(wobbleX, wobbleY);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 coord = uv;

  // Apply jitter/wobble
  coord += jitter(uv, time);

  // Apply tracking error displacement
  float tracking = trackingNoise(uv, time) * trackingError * 0.05;
  coord.x += tracking;

  // RGB color bleeding/shift (chromatic aberration)
  float shift = rgbShift;
  float shiftVariation = sin(time * 3.0 + uv.y * 10.0) * 0.3 + 0.7;
  shift *= shiftVariation;

  // Add extra shift in tracking error areas
  shift += abs(tracking) * 2.0;

  vec4 colorR = texture2D(inputBuffer, coord + vec2(shift, 0.0));
  vec4 colorG = texture2D(inputBuffer, coord);
  vec4 colorB = texture2D(inputBuffer, coord - vec2(shift, 0.0));

  vec3 color = vec3(colorR.r, colorG.g, colorB.b);

  // Horizontal scan lines
  float scanLine = sin(uv.y * 800.0) * 0.5 + 0.5;
  scanLine = pow(scanLine, 1.5);
  float scanLineFactor = 1.0 - scanLine * scanLineIntensity * 0.3;

  // Thicker scan lines for more VHS feel
  float thickScanLine = sin(uv.y * 300.0 + time * 0.5) * 0.5 + 0.5;
  scanLineFactor *= 1.0 - thickScanLine * scanLineIntensity * 0.1;

  color *= scanLineFactor;

  // Noise/static overlay
  float staticNoise = rand(uv * vec2(1000.0, 1000.0) + vec2(time * 100.0, time * 50.0));
  float noisePattern = noise(uv * 500.0 + time * 50.0);
  float combinedNoise = mix(staticNoise, noisePattern, 0.5);

  // Make noise more prominent in certain horizontal bands (like real VHS)
  float noiseBand = smoothstep(0.4, 0.6, noise(vec2(uv.y * 5.0, time * 2.0)));
  combinedNoise *= 1.0 + noiseBand * 0.5;

  color = mix(color, vec3(combinedNoise), noiseIntensity * 0.15);

  // Vertical color banding
  float banding = colorBanding(uv);
  color += vec3(banding * 0.5, banding * 0.3, banding * 0.7);

  // Add slight color degradation (reduce saturation slightly, shift colors)
  vec3 luminance = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
  color = mix(color, luminance, 0.1);

  // Slight warm color shift typical of VHS
  color.r *= 1.05;
  color.b *= 0.95;

  // Vignette for that old TV feel
  vec2 vignetteUV = uv * (1.0 - uv.yx);
  float vignette = vignetteUV.x * vignetteUV.y * 15.0;
  vignette = pow(vignette, 0.25);
  color *= vignette;

  // Occasional white flash/interference
  float flashRand = rand(vec2(floor(time * 8.0), 0.0));
  float flash = step(0.995, flashRand) * 0.1;
  color += flash;

  outputColor = vec4(color, inputColor.a);
}
`

export class VhsEffect extends Effect {
  constructor() {
    super('VhsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['noiseIntensity', new Uniform(0.3)],
        ['scanLineIntensity', new Uniform(0.5)],
        ['rgbShift', new Uniform(0.005)],
        ['trackingError', new Uniform(0.3)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const timeUniform = this.uniforms.get('time')
    if (timeUniform) {
      timeUniform.value += deltaTime
    }
  }

  get noiseIntensity(): number {
    return this.uniforms.get('noiseIntensity')!.value as number
  }

  set noiseIntensity(value: number) {
    this.uniforms.get('noiseIntensity')!.value = value
  }

  get scanLineIntensity(): number {
    return this.uniforms.get('scanLineIntensity')!.value as number
  }

  set scanLineIntensity(value: number) {
    this.uniforms.get('scanLineIntensity')!.value = value
  }

  get rgbShift(): number {
    return this.uniforms.get('rgbShift')!.value as number
  }

  set rgbShift(value: number) {
    this.uniforms.get('rgbShift')!.value = value
  }

  get trackingError(): number {
    return this.uniforms.get('trackingError')!.value as number
  }

  set trackingError(value: number) {
    this.uniforms.get('trackingError')!.value = value
  }
}
