export interface SliderDefaults {
  playerSpeed?: number
  playerScale?: number
  cameraDistance?: number
  cameraViewAngle?: number
  gravity?: number
  waterShaderScale?: number
  groundVibrance?: number
  treeColorVariation?: number
}

let loadedDefaults: SliderDefaults = {}

export async function loadSliderDefaults(): Promise<SliderDefaults> {
  try {
    const response = await fetch('/devSliders/defaults.json')
    if (response.ok) {
      loadedDefaults = await response.json()
    }
  } catch {
    console.warn('Could not load slider defaults, using hardcoded values')
  }
  return loadedDefaults
}

export function getDefault<K extends keyof SliderDefaults>(
  key: K,
  fallback: NonNullable<SliderDefaults[K]>
): NonNullable<SliderDefaults[K]> {
  return (loadedDefaults[key] ?? fallback) as NonNullable<SliderDefaults[K]>
}
