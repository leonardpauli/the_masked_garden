/**
 * Mask configuration registry
 *
 * To add a new mask:
 * 1. Create a new file in this directory (e.g., MyMask.ts)
 * 2. Import and add it to the registry below
 */

import type { MaskState } from '../types'
import type { MaskConfig } from './types'

import NoMask from './NoMask'
import SpringMask from './SpringMask'
import AutumnMask from './AutumnMask'
import StormMask from './StormMask'
import FinalMask from './FinalMask'

export const maskRegistry: Record<MaskState, MaskConfig> = {
  NoMask,
  SpringMask,
  AutumnMask,
  StormMask,
  FinalMask,
}

export type { MaskConfig } from './types'
export { defineMask } from './types'
