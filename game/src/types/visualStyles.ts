export type VisualStyle =
  | 'default'
  | 'neon'
  | 'retro'
  | 'noir'
  | 'vaporwave'
  | 'nature'
  | 'cyberpunk'
  | 'pastel'
  | 'fire'
  | 'ocean'
  | 'sketch'

export interface VisualStyleConfig {
  name: string
  backgroundColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  groundColor: string
  ambientIntensity: number
  ambientColor: string
  directionalIntensity: number
  directionalColor: string
  obstacleColors: string[]
  playerColor: string
  saturation: number
  contrast: number
  brightness: number
  edgeDetection?: boolean
  edgeColor?: string
  edgeThreshold?: number
}

export const visualStyleConfigs: Record<VisualStyle, VisualStyleConfig> = {
  default: {
    name: 'Default',
    backgroundColor: '#1a1a2e',
    fogColor: '#1a1a2e',
    fogNear: 20,
    fogFar: 50,
    groundColor: '#3a5a3a',
    ambientIntensity: 0.4,
    ambientColor: '#ffffff',
    directionalIntensity: 1,
    directionalColor: '#ffffff',
    obstacleColors: ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'],
    playerColor: '#4488ff',
    saturation: 1,
    contrast: 1,
    brightness: 1,
  },
  neon: {
    name: 'Neon Glow',
    backgroundColor: '#0a0a0a',
    fogColor: '#0a0a0a',
    fogNear: 15,
    fogFar: 40,
    groundColor: '#1a0a2e',
    ambientIntensity: 0.2,
    ambientColor: '#ff00ff',
    directionalIntensity: 0.8,
    directionalColor: '#00ffff',
    obstacleColors: ['#ff00ff', '#00ffff', '#ff0080', '#80ff00', '#0080ff', '#ffff00'],
    playerColor: '#00ff88',
    saturation: 1.5,
    contrast: 1.3,
    brightness: 1.1,
  },
  retro: {
    name: 'Retro 8-bit',
    backgroundColor: '#2d1b69',
    fogColor: '#2d1b69',
    fogNear: 25,
    fogFar: 60,
    groundColor: '#4a3298',
    ambientIntensity: 0.6,
    ambientColor: '#ffcc00',
    directionalIntensity: 0.7,
    directionalColor: '#ff8800',
    obstacleColors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    playerColor: '#ffcc00',
    saturation: 1.2,
    contrast: 1.4,
    brightness: 1.0,
  },
  noir: {
    name: 'Film Noir',
    backgroundColor: '#0f0f0f',
    fogColor: '#1a1a1a',
    fogNear: 10,
    fogFar: 35,
    groundColor: '#2a2a2a',
    ambientIntensity: 0.3,
    ambientColor: '#888888',
    directionalIntensity: 1.2,
    directionalColor: '#ffffff',
    obstacleColors: ['#ffffff', '#cccccc', '#999999', '#666666', '#aaaaaa', '#dddddd'],
    playerColor: '#ffffff',
    saturation: 0,
    contrast: 1.5,
    brightness: 0.9,
  },
  vaporwave: {
    name: 'Vaporwave',
    backgroundColor: '#1a0033',
    fogColor: '#2a0044',
    fogNear: 18,
    fogFar: 45,
    groundColor: '#330066',
    ambientIntensity: 0.5,
    ambientColor: '#ff71ce',
    directionalIntensity: 0.9,
    directionalColor: '#01cdfe',
    obstacleColors: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96', '#ff6b6b'],
    playerColor: '#05ffa1',
    saturation: 1.3,
    contrast: 1.1,
    brightness: 1.05,
  },
  nature: {
    name: 'Nature',
    backgroundColor: '#87ceeb',
    fogColor: '#a8d8ea',
    fogNear: 30,
    fogFar: 70,
    groundColor: '#228b22',
    ambientIntensity: 0.6,
    ambientColor: '#fffacd',
    directionalIntensity: 1.1,
    directionalColor: '#fff8dc',
    obstacleColors: ['#8b4513', '#228b22', '#32cd32', '#daa520', '#cd853f', '#6b8e23'],
    playerColor: '#4169e1',
    saturation: 1.1,
    contrast: 1.0,
    brightness: 1.1,
  },
  cyberpunk: {
    name: 'Cyberpunk',
    backgroundColor: '#0d0221',
    fogColor: '#1a0533',
    fogNear: 12,
    fogFar: 40,
    groundColor: '#1a0533',
    ambientIntensity: 0.3,
    ambientColor: '#ff2a6d',
    directionalIntensity: 1.0,
    directionalColor: '#05d9e8',
    obstacleColors: ['#ff2a6d', '#05d9e8', '#d1f7ff', '#ff6b6b', '#01012b', '#ff9f1c'],
    playerColor: '#05d9e8',
    saturation: 1.4,
    contrast: 1.3,
    brightness: 0.95,
  },
  pastel: {
    name: 'Pastel Dream',
    backgroundColor: '#ffeef8',
    fogColor: '#fff0f5',
    fogNear: 25,
    fogFar: 55,
    groundColor: '#e8f5e9',
    ambientIntensity: 0.7,
    ambientColor: '#ffffff',
    directionalIntensity: 0.8,
    directionalColor: '#fffaf0',
    obstacleColors: ['#ffb3ba', '#baffc9', '#bae1ff', '#ffffba', '#ffdfba', '#e0bbff'],
    playerColor: '#a8d8ea',
    saturation: 0.7,
    contrast: 0.9,
    brightness: 1.15,
  },
  fire: {
    name: 'Inferno',
    backgroundColor: '#1a0000',
    fogColor: '#2a0a00',
    fogNear: 15,
    fogFar: 40,
    groundColor: '#330000',
    ambientIntensity: 0.4,
    ambientColor: '#ff4400',
    directionalIntensity: 1.0,
    directionalColor: '#ffaa00',
    obstacleColors: ['#ff0000', '#ff4400', '#ff8800', '#ffcc00', '#ff2200', '#ff6600'],
    playerColor: '#ffff00',
    saturation: 1.3,
    contrast: 1.2,
    brightness: 1.0,
  },
  ocean: {
    name: 'Deep Ocean',
    backgroundColor: '#001133',
    fogColor: '#002244',
    fogNear: 12,
    fogFar: 38,
    groundColor: '#003355',
    ambientIntensity: 0.4,
    ambientColor: '#00aaff',
    directionalIntensity: 0.8,
    directionalColor: '#88ddff',
    obstacleColors: ['#00ffff', '#0088ff', '#00ff88', '#44aaff', '#00ccaa', '#66ddff'],
    playerColor: '#ffff88',
    saturation: 1.1,
    contrast: 1.1,
    brightness: 0.95,
  },
  sketch: {
    name: 'Sketch',
    backgroundColor: '#f5f5f0',
    fogColor: '#f5f5f0',
    fogNear: 30,
    fogFar: 80,
    groundColor: '#e8e8e0',
    ambientIntensity: 0.8,
    ambientColor: '#ffffff',
    directionalIntensity: 0.6,
    directionalColor: '#ffffff',
    obstacleColors: ['#d0d0c8', '#c8c8c0', '#e0e0d8', '#d8d8d0', '#c0c0b8', '#e8e8e0'],
    playerColor: '#a0a098',
    saturation: 0.1,
    contrast: 0.8,
    brightness: 1.1,
    edgeDetection: true,
    edgeColor: '#1a1a1a',
    edgeThreshold: 0.08,
  },
}

export const visualStyleOptions: VisualStyle[] = [
  'default',
  'neon',
  'retro',
  'noir',
  'vaporwave',
  'nature',
  'cyberpunk',
  'pastel',
  'fire',
  'ocean',
  'sketch',
]
