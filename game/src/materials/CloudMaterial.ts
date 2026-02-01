import { ShaderMaterial, Vector2 } from 'three'

export interface CloudMaterialOptions {
  cloudscale?: number
  speed?: number
  clouddark?: number
  cloudlight?: number
  cloudcover?: number
  cloudalpha?: number
  opacity?: number
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Adapted from https://www.shadertoy.com/view/WdXBW4
const fragmentShader = /* glsl */ `
  uniform float time;
  uniform vec2 parallaxOffset;
  uniform float cloudscale;
  uniform float speed;
  uniform float clouddark;
  uniform float cloudlight;
  uniform float cloudcover;
  uniform float cloudalpha;
  uniform float opacity;

  varying vec2 vUv;

  const mat2 m = mat2(1.6, 1.2, -1.2, 1.6);

  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(in vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2
    const float K2 = 0.211324865; // (3-sqrt(3))/6
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
    return dot(n, vec3(70.0));
  }

  float fbm(vec2 n) {
    float total = 0.0, amplitude = 0.1;
    for (int i = 0; i < 7; i++) {
      total += noise(n) * amplitude;
      n = m * n;
      amplitude *= 0.4;
    }
    return total;
  }

  void main() {
    // Apply parallax offset to UVs
    vec2 p = vUv + parallaxOffset;
    vec2 uv = p * vec2(1.777, 1.0); // Approximate 16:9 aspect

    float t = time * speed;
    float q = fbm(uv * cloudscale * 0.5);

    // Ridged noise shape
    float r = 0.0;
    vec2 ruv = uv * cloudscale - q + t;
    float weight = 0.8;
    for (int i = 0; i < 8; i++) {
      r += abs(weight * noise(ruv));
      ruv = m * ruv + t;
      weight *= 0.7;
    }

    // Noise shape
    float f = 0.0;
    vec2 fuv = uv * cloudscale - q + t;
    weight = 0.7;
    for (int i = 0; i < 8; i++) {
      f += weight * noise(fuv);
      fuv = m * fuv + t;
      weight *= 0.6;
    }

    f *= r + f;

    // Noise color
    float c = 0.0;
    float t2 = time * speed * 2.0;
    vec2 cuv = uv * cloudscale * 2.0 - q + t2;
    weight = 0.4;
    for (int i = 0; i < 7; i++) {
      c += weight * noise(cuv);
      cuv = m * cuv + t2;
      weight *= 0.6;
    }

    // Noise ridge color
    float c1 = 0.0;
    float t3 = time * speed * 3.0;
    vec2 c1uv = uv * cloudscale * 3.0 - q + t3;
    weight = 0.4;
    for (int i = 0; i < 7; i++) {
      c1 += abs(weight * noise(c1uv));
      c1uv = m * c1uv + t3;
      weight *= 0.6;
    }

    c += c1;

    // Cloud color (white/cream tinted)
    vec3 cloudcolour = vec3(1.1, 1.1, 0.9) * clamp((clouddark + cloudlight * c), 0.0, 1.0);

    // Cloud coverage and alpha
    float cloudAmount = cloudcover + cloudalpha * f * r;
    float cloudAlpha = clamp(cloudAmount + c, 0.0, 1.0);

    // Semi-transparent clouds over transparent background
    // Use premultiplied alpha for proper blending
    float finalAlpha = cloudAlpha * opacity;

    gl_FragColor = vec4(cloudcolour * finalAlpha, finalAlpha);
  }
`

export class CloudMaterial extends ShaderMaterial {
  constructor(options: CloudMaterialOptions = {}) {
    const {
      cloudscale = 1.1,
      speed = 0.03,
      clouddark = 0.5,
      cloudlight = 0.3,
      cloudcover = 0.2,
      cloudalpha = 8.0,
      opacity = 0.4,
    } = options

    super({
      uniforms: {
        time: { value: 0 },
        parallaxOffset: { value: new Vector2(0, 0) },
        cloudscale: { value: cloudscale },
        speed: { value: speed },
        clouddark: { value: clouddark },
        cloudlight: { value: cloudlight },
        cloudcover: { value: cloudcover },
        cloudalpha: { value: cloudalpha },
        opacity: { value: opacity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
  }

  update(deltaTime: number): void {
    this.uniforms.time.value += deltaTime
  }

  setParallaxOffset(x: number, y: number): void {
    this.uniforms.parallaxOffset.value.set(x, y)
  }

  setOpacity(opacity: number): void {
    this.uniforms.opacity.value = opacity
  }
}
