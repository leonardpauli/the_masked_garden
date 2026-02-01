import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
uniform float time;
uniform float offsetAmount;
uniform float ghostOpacity;
uniform float glowIntensity;
uniform vec3 astralTint;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Pulsing/breathing effect - oscillates between aligned and offset states
  float breathe = sin(time * 0.8) * 0.5 + 0.5;
  float pulse = sin(time * 1.2) * 0.3 + 0.7;

  // Calculate offset for ghost/astral layer
  float currentOffset = offsetAmount * breathe;
  vec2 ghostOffset = vec2(
    currentOffset * sin(time * 0.3),
    currentOffset * cos(time * 0.4)
  );

  // Sample the main scene
  vec4 mainScene = inputColor;

  // Sample the ghost/astral layer with offset
  vec2 ghostUV = uv + ghostOffset;
  vec4 ghostScene = texture2D(inputBuffer, ghostUV);

  // Apply purple/violet tint to ghost layer
  vec3 tintedGhost = mix(ghostScene.rgb, ghostScene.rgb * astralTint, 0.6);

  // Calculate luminance for glow effect
  float luminance = dot(mainScene.rgb, vec3(0.299, 0.587, 0.114));
  float ghostLuminance = dot(ghostScene.rgb, vec3(0.299, 0.587, 0.114));

  // Ethereal glow around objects based on edges/luminance
  vec2 texelSize = vec2(1.0) / resolution;
  float edgeGlow = 0.0;

  // Sample surrounding pixels for edge detection
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 sampleUV = uv + vec2(x, y) * texelSize * 2.0;
      vec4 sampleColor = texture2D(inputBuffer, sampleUV);
      float sampleLum = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
      edgeGlow += abs(luminance - sampleLum);
    }
  }
  edgeGlow /= 25.0;
  edgeGlow = smoothstep(0.0, 0.15, edgeGlow) * glowIntensity;

  // Create ethereal glow color (purple/violet)
  vec3 glowColor = astralTint * edgeGlow * pulse;

  // Blend ghost layer with main scene
  float dynamicOpacity = ghostOpacity * (0.7 + breathe * 0.3);
  vec3 blendedScene = mix(mainScene.rgb, tintedGhost, dynamicOpacity);

  // Add ethereal glow
  blendedScene += glowColor;

  // Subtle chromatic separation on ghost layer for extra ethereal feel
  float chromaOffset = currentOffset * 0.5;
  float rOffset = texture2D(inputBuffer, uv + ghostOffset + vec2(chromaOffset, 0.0)).r;
  float bOffset = texture2D(inputBuffer, uv + ghostOffset - vec2(chromaOffset, 0.0)).b;

  // Mix in subtle chromatic aberration
  blendedScene.r = mix(blendedScene.r, rOffset * astralTint.r, dynamicOpacity * 0.3);
  blendedScene.b = mix(blendedScene.b, bOffset * astralTint.b, dynamicOpacity * 0.3);

  // Final output with slight overall tint
  vec3 finalColor = mix(blendedScene, blendedScene * (vec3(1.0) + astralTint * 0.1), 0.5);

  outputColor = vec4(finalColor, mainScene.a);
}
`

export class AstralEffect extends Effect {
  constructor({
    offsetAmount = 0.015,
    ghostOpacity = 0.35,
    glowIntensity = 0.8,
    astralTint = [0.7, 0.4, 1.0],
  }: {
    offsetAmount?: number
    ghostOpacity?: number
    glowIntensity?: number
    astralTint?: [number, number, number]
  } = {}) {
    super('AstralEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['time', new Uniform(0)],
        ['offsetAmount', new Uniform(offsetAmount)],
        ['ghostOpacity', new Uniform(ghostOpacity)],
        ['glowIntensity', new Uniform(glowIntensity)],
        ['astralTint', new Uniform(astralTint)],
      ]),
    })
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number): void {
    const time = this.uniforms.get('time')!
    time.value += deltaTime
  }

  setOffsetAmount(value: number): void {
    this.uniforms.get('offsetAmount')!.value = value
  }

  setGhostOpacity(value: number): void {
    this.uniforms.get('ghostOpacity')!.value = value
  }

  setGlowIntensity(value: number): void {
    this.uniforms.get('glowIntensity')!.value = value
  }

  setAstralTint(r: number, g: number, b: number): void {
    const tint = this.uniforms.get('astralTint')!.value as number[]
    tint[0] = r
    tint[1] = g
    tint[2] = b
  }
}
