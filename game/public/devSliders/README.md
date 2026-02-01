# DevSliders System

Runtime-adjustable configuration values loaded from JSON, with slider/toggle UI in the dev panel.

## How It Works

1. **defaults.json** provides initial values loaded before app startup
2. **loadDefaults.ts** fetches JSON and exposes values via `getDefault()`
3. **configAtoms.ts** uses `getDefault()` to initialize atoms with loaded values
4. **DevPanel.tsx** provides slider/checkbox UI to adjust values at runtime

## Files

| File | Purpose |
|------|---------|
| `game/public/devSliders/defaults.json` | JSON config file with default values |
| `game/src/store/loadDefaults.ts` | Async loader + `getDefault()` getter |
| `game/src/store/atoms/configAtoms.ts` | Jotai atoms using defaults |
| `game/src/ui/DevPanel.tsx` | Dev panel UI with sliders/checkboxes |

## defaults.json Format

```json
{
  "playerSpeed": 8,
  "playerScale": 0.5,
  "cameraDistance": 14,
  "cameraViewAngle": 43,
  "gravity": 20,
  "waterShaderScale": 3.6,
  "groundVibrance": 0,
  "treeColorVariation": 1
}
```

## Current Settings

| Key | Default | Description |
|-----|---------|-------------|
| `playerSpeed` | 8 | Movement speed |
| `playerScale` | 0.5 | Player model scale |
| `cameraDistance` | 14 | Camera zoom distance |
| `cameraViewAngle` | 43 | Camera angle (0=top-down, 70=third-person) |
| `gravity` | 20 | Jump gravity strength |
| `waterShaderScale` | 3.6 | Well water UV scale |
| `groundVibrance` | 0 | Ground color saturation (0=grey, 1=green) |
| `treeColorVariation` | 1 | Tree color randomness |

## Adding a New Slider

1. Add key to `SliderDefaults` interface in `loadDefaults.ts`:
   ```typescript
   export interface SliderDefaults {
     // ... existing
     myNewValue?: number
   }
   ```

2. Add default value to `defaults.json`:
   ```json
   {
     "myNewValue": 10
   }
   ```

3. Create atom in `configAtoms.ts`:
   ```typescript
   export const myNewValueAtom = atom<number>(getDefault('myNewValue', 10))
   ```

4. Add slider in `DevPanel.tsx`:
   ```typescript
   const [myNewValue, setMyNewValue] = useAtom(myNewValueAtom)
   // ...
   <Slider
     label="My New Value"
     value={myNewValue}
     onChange={setMyNewValue}
     min={0}
     max={20}
     step={1}
   />
   ```

## Loading Sequence

```
main.tsx
  └─ loadSliderDefaults()     // Fetches JSON (async)
       └─ dynamic import App   // After JSON loaded
            └─ configAtoms.ts   // Atoms created with loaded values
```

This ensures atoms initialize with JSON values, not hardcoded fallbacks.

## Notes

- Changes via sliders are runtime-only (reset on page reload)
- Edit `defaults.json` to persist new default values
- Some settings (camera presets, dev panel state) use localStorage
