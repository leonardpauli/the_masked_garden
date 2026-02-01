import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float trailCount;
uniform float trailDecay;
uniform float trailOffset;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 result = inputColor;

  int count = int(trailCount);

  for (int i = 1; i <= 16; i++) {
    if (i > count) break;

    float t = float(i);
    float alpha = pow(trailDecay, t);

    // Offset in diagonal direction for ghostly trail effect
    vec2 offset = vec2(trailOffset * t, trailOffset * t * 0.5);
    vec2 trailUV = uv - offset;

    // Sample the trail position
    if (trailUV.x >= 0.0 && trailUV.x <= 1.0 && trailUV.y >= 0.0 && trailUV.y <= 1.0) {
      vec4 trailColor = texture2D(inputBuffer, trailUV);
      result = mix(result, trailColor, alpha * (1.0 - result.a * 0.5));
    }
  }

  outputColor = result;
}
`

export class EchoEffect extends Effect {
  constructor() {
    super('EchoEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['trailCount', new Uniform(4.0)],
        ['trailDecay', new Uniform(0.4)],
        ['trailOffset', new Uniform(0.015)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
    const timeUniform = this.uniforms.get('time')
    if (timeUniform) {
      timeUniform.value += deltaTime
    }
  }

  get trailCount(): number {
    return this.uniforms.get('trailCount')!.value
  }

  set trailCount(value: number) {
    this.uniforms.get('trailCount')!.value = value
  }

  get trailDecay(): number {
    return this.uniforms.get('trailDecay')!.value
  }

  set trailDecay(value: number) {
    this.uniforms.get('trailDecay')!.value = value
  }

  get trailOffset(): number {
    return this.uniforms.get('trailOffset')!.value
  }

  set trailOffset(value: number) {
    this.uniforms.get('trailOffset')!.value = value
  }
}
