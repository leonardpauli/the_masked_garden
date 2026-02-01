import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float chromaticStrength;
uniform float waveStrength;
uniform float hueShiftSpeed;

vec3 hueShift(vec3 color, float shift) {
  const vec3 k = vec3(0.57735, 0.57735, 0.57735);
  float cosAngle = cos(shift);
  return vec3(color * cosAngle + cross(k, color) * sin(shift) + k * dot(k, color) * (1.0 - cosAngle));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Wavering/breathing distortion
  vec2 waveOffset = vec2(
    sin(uv.y * 10.0 + time * 2.0) * waveStrength,
    cos(uv.x * 10.0 + time * 1.5) * waveStrength
  );
  vec2 distortedUv = uv + waveOffset;

  // Chromatic aberration at edges
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  float aberration = dist * chromaticStrength;

  vec2 redOffset = distortedUv + vec2(aberration, 0.0);
  vec2 blueOffset = distortedUv - vec2(aberration, 0.0);

  float r = texture2D(inputBuffer, redOffset).r;
  float g = texture2D(inputBuffer, distortedUv).g;
  float b = texture2D(inputBuffer, blueOffset).b;

  vec3 color = vec3(r, g, b);

  // Slow hue shift over time
  color = hueShift(color, time * hueShiftSpeed);

  // Soft dreamy glow - slight blur blend
  vec3 blur = vec3(0.0);
  float blurSize = 0.003;
  blur += texture2D(inputBuffer, distortedUv + vec2(-blurSize, -blurSize)).rgb;
  blur += texture2D(inputBuffer, distortedUv + vec2(blurSize, -blurSize)).rgb;
  blur += texture2D(inputBuffer, distortedUv + vec2(-blurSize, blurSize)).rgb;
  blur += texture2D(inputBuffer, distortedUv + vec2(blurSize, blurSize)).rgb;
  blur *= 0.25;

  color = mix(color, blur, 0.3);

  outputColor = vec4(color, inputColor.a);
}
`

export class DreamscapeEffect extends Effect {
  constructor() {
    super('DreamscapeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['chromaticStrength', new Uniform(0.015)],
        ['waveStrength', new Uniform(0.003)],
        ['hueShiftSpeed', new Uniform(0.1)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }
}
