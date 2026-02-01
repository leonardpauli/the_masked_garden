/**
 * Procedural superhero eye mask geometry
 * Creates a mask shape using bezier curves with eye hole cutouts
 */

import * as THREE from 'three'

/**
 * Create a superhero-style eye mask mesh
 * @param color The mask color
 * @returns A Three.js mesh with the mask geometry
 */
export function createMaskMesh(color: THREE.Color): THREE.Mesh {
  const shape = new THREE.Shape()

  // Mask outline - symmetric superhero mask shape
  // Start from left ear area and trace around
  const width = 1.2  // Total width
  const height = 0.4 // Total height
  const noseWidth = 0.15 // Width of nose bridge

  // Left side
  shape.moveTo(-width / 2, 0)
  // Left wing curves up and toward center
  shape.bezierCurveTo(
    -width / 2 + 0.1, height * 0.8,  // control point 1
    -width / 4, height,               // control point 2
    -noseWidth, height * 0.3          // end at nose bridge top
  )
  // Nose bridge dip (convex center)
  shape.bezierCurveTo(
    -noseWidth * 0.5, height * 0.4,   // control point 1
    noseWidth * 0.5, height * 0.4,    // control point 2
    noseWidth, height * 0.3           // end at other side of nose
  )
  // Right wing curves up and toward ear
  shape.bezierCurveTo(
    width / 4, height,                // control point 1
    width / 2 - 0.1, height * 0.8,    // control point 2
    width / 2, 0                      // end at right ear
  )
  // Right side bottom curves back toward center
  shape.bezierCurveTo(
    width / 2 - 0.1, -height * 0.6,   // control point 1
    width / 4, -height * 0.8,         // control point 2
    noseWidth, -height * 0.2          // end at nose bottom right
  )
  // Nose bottom dip
  shape.bezierCurveTo(
    noseWidth * 0.5, -height * 0.1,   // control point 1
    -noseWidth * 0.5, -height * 0.1,  // control point 2
    -noseWidth, -height * 0.2         // end at nose bottom left
  )
  // Left bottom curves back to start
  shape.bezierCurveTo(
    -width / 4, -height * 0.8,        // control point 1
    -width / 2 + 0.1, -height * 0.6,  // control point 2
    -width / 2, 0                     // back to start
  )

  // Left eye hole cutout
  const leftEyeHole = new THREE.Path()
  const eyeWidth = 0.25
  const eyeHeight = 0.18
  const leftEyeX = -0.35

  leftEyeHole.moveTo(leftEyeX - eyeWidth / 2, 0)
  leftEyeHole.bezierCurveTo(
    leftEyeX - eyeWidth / 2, eyeHeight,
    leftEyeX + eyeWidth / 2, eyeHeight,
    leftEyeX + eyeWidth / 2, 0
  )
  leftEyeHole.bezierCurveTo(
    leftEyeX + eyeWidth / 2, -eyeHeight,
    leftEyeX - eyeWidth / 2, -eyeHeight,
    leftEyeX - eyeWidth / 2, 0
  )
  shape.holes.push(leftEyeHole)

  // Right eye hole cutout (mirrored)
  const rightEyeHole = new THREE.Path()
  const rightEyeX = 0.35

  rightEyeHole.moveTo(rightEyeX - eyeWidth / 2, 0)
  rightEyeHole.bezierCurveTo(
    rightEyeX - eyeWidth / 2, eyeHeight,
    rightEyeX + eyeWidth / 2, eyeHeight,
    rightEyeX + eyeWidth / 2, 0
  )
  rightEyeHole.bezierCurveTo(
    rightEyeX + eyeWidth / 2, -eyeHeight,
    rightEyeX - eyeWidth / 2, -eyeHeight,
    rightEyeX - eyeWidth / 2, 0
  )
  shape.holes.push(rightEyeHole)

  // Extrude settings - thinner depth
  const depth = 0.03
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 1
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  // Center the geometry first
  geometry.computeBoundingBox()
  geometry.center()

  // Apply curvature - bend the mask to wrap around face
  // Curve along the X axis (width) to make it wrap around
  const positionAttr = geometry.getAttribute('position')
  const curvatureStrength = 0.15 // How much to curve

  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i)
    const z = positionAttr.getZ(i)

    // Bend based on x position (edges curve back)
    // Use parabolic curve: z offset = strength * x^2
    const normalizedX = x / (width / 2) // -1 to 1
    const zOffset = -curvatureStrength * normalizedX * normalizedX

    positionAttr.setZ(i, z + zOffset)
  }

  positionAttr.needsUpdate = true
  geometry.computeVertexNormals()

  // Create glossy material with emissive glow
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.3,
    metalness: 0.4,
    roughness: 0.3,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

/**
 * Get the color for a mask type
 */
export function getMaskColor(maskType: string): THREE.Color {
  switch (maskType) {
    case 'SpringMask':
      return new THREE.Color(0x4CAF50)  // Green
    case 'AutumnMask':
      return new THREE.Color(0xFF9800)  // Orange
    case 'StormMask':
      return new THREE.Color(0x9C27B0)  // Purple
    case 'FinalMask':
      return new THREE.Color(0xFFD700)  // Gold
    default:
      return new THREE.Color(0x888888)  // Gray fallback
  }
}
