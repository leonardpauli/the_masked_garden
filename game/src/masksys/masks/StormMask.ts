import { defineMask } from './types'

export default defineMask({
  name: 'StormMask',
  visualStyle: 'dreamscape',
  gravity: 10,
  cameraDistance: 11,
  cameraViewAngle: 75,
  playerSpeed: 17,
  cubePushStrength: 20, // Storm winds push cubes harder (default: 8)
  effectParams: {
    waveStrength: 0.001,
  },
})
