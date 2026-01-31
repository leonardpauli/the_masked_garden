import { useMemo } from 'react'
import { Icosahedron } from './Icosahedron'
import type { Vector3Tuple } from 'three'

interface ObstacleFieldProps {
  count?: number
  spread?: number
}

function generateObstacles(count: number, spread: number): Array<{ position: Vector3Tuple; scale: number }> {
  const obstacles: Array<{ position: Vector3Tuple; scale: number }> = []

  for (let i = 0; i < count; i++) {
    // Random position, but avoid center where player starts
    let x: number, z: number
    do {
      x = (Math.random() - 0.5) * spread * 2
      z = (Math.random() - 0.5) * spread * 2
    } while (Math.abs(x) < 3 && Math.abs(z) < 3) // Keep center clear

    const scale = 0.5 + Math.random() * 0.8 // Random size 0.5-1.3

    obstacles.push({
      position: [x, scale, z],
      scale,
    })
  }

  return obstacles
}

export function ObstacleField({ count = 20, spread = 20 }: ObstacleFieldProps) {
  const obstacles = useMemo(() => generateObstacles(count, spread), [count, spread])

  return (
    <>
      {obstacles.map((obstacle, index) => (
        <Icosahedron
          key={index}
          position={obstacle.position}
          scale={obstacle.scale}
        />
      ))}
    </>
  )
}
