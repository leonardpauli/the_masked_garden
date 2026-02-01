import { Effect } from 'postprocessing'
import { Uniform, Color } from 'three'

const fragmentShader = /* glsl */ `
uniform vec3 edgeColor;
uniform float threshold;

// Sobel edge detection
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texelSize = 1.0 / resolution;

  // Sample 3x3 neighborhood for luminance
  float tl = dot(texture2D(inputBuffer, uv + vec2(-texelSize.x, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture2D(inputBuffer, uv + vec2(0.0, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture2D(inputBuffer, uv + vec2(texelSize.x, texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
  float l  = dot(texture2D(inputBuffer, uv + vec2(-texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float r  = dot(texture2D(inputBuffer, uv + vec2(texelSize.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture2D(inputBuffer, uv + vec2(-texelSize.x, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture2D(inputBuffer, uv + vec2(0.0, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture2D(inputBuffer, uv + vec2(texelSize.x, -texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));

  // Sobel operators
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  float edge = sqrt(gx*gx + gy*gy);

  // Apply threshold and create edge mask
  float edgeMask = smoothstep(threshold, threshold + 0.1, edge);

  // Mix edge color with original
  vec3 result = mix(inputColor.rgb, edgeColor, edgeMask);

  outputColor = vec4(result, inputColor.a);
}
`

export interface EdgeDetectionEffectOptions {
  edgeColor?: string | Color
  threshold?: number
}

export class EdgeDetectionEffect extends Effect {
  constructor({
    edgeColor = '#000000',
    threshold = 0.1,
  }: EdgeDetectionEffectOptions = {}) {
    const color = edgeColor instanceof Color ? edgeColor : new Color(edgeColor)

    super('EdgeDetectionEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['edgeColor', new Uniform(color)],
        ['threshold', new Uniform(threshold)],
      ]),
    })
  }

  get edgeColor(): Color {
    return this.uniforms.get('edgeColor')!.value
  }

  set edgeColor(value: Color | string) {
    const color = this.uniforms.get('edgeColor')!.value as Color
    if (value instanceof Color) {
      color.copy(value)
    } else {
      color.set(value)
    }
  }

  get threshold(): number {
    return this.uniforms.get('threshold')!.value
  }

  set threshold(value: number) {
    this.uniforms.get('threshold')!.value = value
  }
}
