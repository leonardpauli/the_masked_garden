import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float intensity;
uniform float heatShift;

// Convert RGB to HSL
vec3 rgb2hsl(vec3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float delta = maxC - minC;

  float l = (maxC + minC) * 0.5;
  float s = 0.0;
  float h = 0.0;

  if (delta > 0.0) {
    s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);

    if (color.r == maxC) {
      h = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
    } else if (color.g == maxC) {
      h = (color.b - color.r) / delta + 2.0;
    } else {
      h = (color.r - color.g) / delta + 4.0;
    }
    h /= 6.0;
  }

  return vec3(h, s, l);
}

// Convert HSL to RGB
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  if (s == 0.0) {
    return vec3(l);
  }

  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;

  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

// Detect foliage (green-ish colors)
float detectFoliage(vec3 color) {
  vec3 hsl = rgb2hsl(color);
  // Green hues are roughly 0.2-0.45 in normalized hue
  float greenness = smoothstep(0.15, 0.25, hsl.x) * smoothstep(0.5, 0.4, hsl.x);
  // Foliage is typically saturated and mid-brightness
  float saturation = smoothstep(0.1, 0.4, hsl.y);
  float brightness = smoothstep(0.1, 0.3, hsl.z) * smoothstep(0.9, 0.6, hsl.z);
  return greenness * saturation * brightness;
}

// Detect sky (blue-ish, bright, low saturation at horizon)
float detectSky(vec3 color) {
  vec3 hsl = rgb2hsl(color);
  // Blue hues are roughly 0.5-0.7
  float blueness = smoothstep(0.45, 0.55, hsl.x) * smoothstep(0.75, 0.65, hsl.x);
  // Sky is typically bright
  float brightness = smoothstep(0.4, 0.7, hsl.z);
  return blueness * brightness;
}

// Detect warm colors (potential heat sources)
float detectWarmth(vec3 color) {
  vec3 hsl = rgb2hsl(color);
  // Warm colors: red, orange, yellow (0.0-0.15 and 0.9-1.0)
  float warmHue = smoothstep(0.15, 0.0, hsl.x) + smoothstep(0.85, 1.0, hsl.x);
  float brightness = smoothstep(0.3, 0.6, hsl.z);
  return warmHue * brightness * hsl.y;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Classic infrared channel swap: swap red and blue, boost green contribution
  vec3 infrared = vec3(
    color.b * 0.8 + color.g * 0.2,
    color.g * 0.6 + color.r * 0.4,
    color.r * 0.9 + color.b * 0.1
  );

  // Detect different elements
  float foliage = detectFoliage(color);
  float sky = detectSky(color);
  float warmth = detectWarmth(color);

  // Apply heat shift to warm detection
  warmth = warmth * (1.0 + heatShift * 2.0);

  // Foliage becomes pink/magenta/white (classic IR film look)
  vec3 foliageColor = mix(
    vec3(1.0, 0.4, 0.6),  // Pink
    vec3(1.0, 0.95, 0.98), // Near white
    smoothstep(0.3, 0.8, foliage)
  );
  infrared = mix(infrared, foliageColor, foliage * 0.9);

  // Sky becomes dark/deep blue-black
  vec3 skyColor = vec3(0.05, 0.02, 0.15);
  infrared = mix(infrared, skyColor, sky * 0.7);

  // Warm objects glow with subtle pulsing
  float glowPulse = 1.0 + sin(time * 2.0) * 0.1;
  vec3 warmGlow = vec3(1.0, 0.3, 0.1) * warmth * glowPulse * (1.0 + heatShift);
  infrared += warmGlow * 0.5;

  // Add ethereal/dreamy quality with slight bloom effect simulation
  vec3 hsl = rgb2hsl(infrared);
  hsl.y *= 0.85; // Slightly desaturate for dreamy look
  hsl.z = mix(hsl.z, 0.5, 0.1); // Compress dynamic range slightly
  infrared = hsl2rgb(hsl);

  // Add subtle vignette for ethereal quality
  vec2 vignetteUV = uv * (1.0 - uv);
  float vignette = vignetteUV.x * vignetteUV.y * 15.0;
  vignette = pow(vignette, 0.25);
  infrared *= mix(0.7, 1.0, vignette);

  // Add subtle grain for film-like quality
  float grain = fract(sin(dot(uv * time, vec2(12.9898, 78.233))) * 43758.5453);
  infrared += (grain - 0.5) * 0.03;

  // Mix with original based on intensity
  vec3 result = mix(color, infrared, intensity);

  outputColor = vec4(result, inputColor.a);
}
`

export class InfraredEffect extends Effect {
  constructor() {
    super('InfraredEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['intensity', new Uniform(1.0)],
        ['heatShift', new Uniform(0.0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
    const timeUniform = this.uniforms.get('time')
    if (timeUniform) {
      timeUniform.value += deltaTime
    }
  }

  get intensity(): number {
    return this.uniforms.get('intensity')!.value as number
  }

  set intensity(value: number) {
    this.uniforms.get('intensity')!.value = value
  }

  get heatShift(): number {
    return this.uniforms.get('heatShift')!.value as number
  }

  set heatShift(value: number) {
    this.uniforms.get('heatShift')!.value = value
  }
}
