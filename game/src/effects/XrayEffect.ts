import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;

// Sobel edge detection kernels
const float sobelX[9] = float[9](
  -1.0, 0.0, 1.0,
  -2.0, 0.0, 2.0,
  -1.0, 0.0, 1.0
);

const float sobelY[9] = float[9](
  -1.0, -2.0, -1.0,
   0.0,  0.0,  0.0,
   1.0,  2.0,  1.0
);

// X-ray blue/cyan color palette
const vec3 xrayColorBright = vec3(0.4, 0.8, 1.0);
const vec3 xrayColorMid = vec3(0.2, 0.5, 0.8);
const vec3 xrayColorDark = vec3(0.05, 0.15, 0.3);

float getLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float sampleLuminance(vec2 uv) {
  vec4 color = texture2D(inputBuffer, uv);
  return getLuminance(color.rgb);
}

float detectEdges(vec2 uv, vec2 texelSize) {
  float gx = 0.0;
  float gy = 0.0;

  int idx = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      float lum = sampleLuminance(uv + offset);
      gx += lum * sobelX[idx];
      gy += lum * sobelY[idx];
      idx++;
    }
  }

  return sqrt(gx * gx + gy * gy);
}

float getFresnelEdge(vec2 uv, vec2 texelSize) {
  // Sample depth/luminance changes to simulate fresnel-like edge detection
  float center = sampleLuminance(uv);
  float left = sampleLuminance(uv - vec2(texelSize.x * 2.0, 0.0));
  float right = sampleLuminance(uv + vec2(texelSize.x * 2.0, 0.0));
  float top = sampleLuminance(uv - vec2(0.0, texelSize.y * 2.0));
  float bottom = sampleLuminance(uv + vec2(0.0, texelSize.y * 2.0));

  float diffH = abs(left - right);
  float diffV = abs(top - bottom);

  return (diffH + diffV) * 2.0;
}

float wireframeGrid(vec2 uv, float scale, float thickness) {
  vec2 grid = fract(uv * scale);
  vec2 lines = smoothstep(thickness, 0.0, grid) + smoothstep(1.0 - thickness, 1.0, grid);
  return max(lines.x, lines.y) * 0.15;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texelSize = 1.0 / resolution;

  // Get original luminance and invert it
  float originalLum = getLuminance(inputColor.rgb);
  float invertedLum = 1.0 - originalLum;

  // Edge detection using Sobel
  float edges = detectEdges(uv, texelSize);

  // Fresnel-like edge enhancement
  float fresnelEdge = getFresnelEdge(uv, texelSize);

  // Combine edge effects
  float combinedEdge = clamp(edges * 2.0 + fresnelEdge, 0.0, 1.0);

  // Create base x-ray color from inverted luminance
  vec3 baseColor = mix(xrayColorDark, xrayColorMid, invertedLum);

  // Add bright edges (fresnel effect - edges are bright, centers fade)
  vec3 edgeColor = mix(baseColor, xrayColorBright, combinedEdge);

  // Add edge glow
  float glowRadius = 3.0;
  float glow = 0.0;
  for (float i = 1.0; i <= 3.0; i += 1.0) {
    vec2 offset = texelSize * i * glowRadius;
    glow += detectEdges(uv + vec2(offset.x, 0.0), texelSize);
    glow += detectEdges(uv - vec2(offset.x, 0.0), texelSize);
    glow += detectEdges(uv + vec2(0.0, offset.y), texelSize);
    glow += detectEdges(uv - vec2(0.0, offset.y), texelSize);
  }
  glow = clamp(glow * 0.1, 0.0, 0.5);

  // Apply glow
  vec3 glowColor = edgeColor + xrayColorBright * glow;

  // Add faint animated wireframe/grid overlay
  float gridScale = 50.0;
  float gridThickness = 0.02;
  float grid = wireframeGrid(uv + vec2(time * 0.01, time * 0.005), gridScale, gridThickness);

  // Secondary finer grid
  float fineGrid = wireframeGrid(uv * 1.5 - vec2(time * 0.005), gridScale * 2.0, gridThickness * 0.5) * 0.5;

  vec3 finalColor = glowColor + vec3(grid + fineGrid) * xrayColorBright * 0.3;

  // Enhance contrast slightly
  finalColor = pow(finalColor, vec3(0.95));

  // Add subtle scan line effect
  float scanLine = sin(uv.y * resolution.y * 0.5 + time * 2.0) * 0.02 + 1.0;
  finalColor *= scanLine;

  // Vignette for that medical imaging look
  float vignette = 1.0 - length((uv - 0.5) * 1.2);
  vignette = smoothstep(0.0, 0.7, vignette);
  finalColor *= mix(0.7, 1.0, vignette);

  outputColor = vec4(finalColor, inputColor.a);
}
`

export class XrayEffect extends Effect {
  constructor() {
    super('XrayEffect', fragmentShader, {
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
