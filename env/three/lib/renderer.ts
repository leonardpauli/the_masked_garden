// Three.js renderer - subscribes to game state
// NEVER pushes state back to data layer

import * as THREE from 'three'
import {getDefaultStore} from 'jotai'
import {player_pos_atom, player_mask_atom, impact_event_atom} from '@game/state/index.ts'
import {mask_reg} from '@game/lib/index.ts'

export type GameRenderer = {
	scene: THREE.Scene
	camera: THREE.PerspectiveCamera
	renderer: THREE.WebGLRenderer
	start: () => void
	stop: () => void
	dispose: () => void
}

export const renderer_create = (canvas: HTMLCanvasElement): GameRenderer => {
	const store = getDefaultStore()

	// Scene setup
	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x1a1a2e)

	// Camera - slight perspective, top-down ish
	const camera = new THREE.PerspectiveCamera(
		45, // low FOV for subtle perspective
		canvas.width / canvas.height,
		0.1,
		1000
	)
	camera.position.set(0, 10, 5)
	camera.lookAt(0, 0, 0)

	// Renderer
	const renderer = new THREE.WebGLRenderer({canvas, antialias: true})
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

	// Player mesh (placeholder)
	const player_geo = new THREE.CircleGeometry(0.5, 32)
	const player_mat = new THREE.MeshBasicMaterial({color: 0x4ecdc4})
	const player_mesh = new THREE.Mesh(player_geo, player_mat)
	player_mesh.rotation.x = -Math.PI / 2 // lay flat
	scene.add(player_mesh)

	// Ground plane
	const ground_geo = new THREE.PlaneGeometry(20, 20)
	const ground_mat = new THREE.MeshBasicMaterial({color: 0x16213e})
	const ground = new THREE.Mesh(ground_geo, ground_mat)
	ground.rotation.x = -Math.PI / 2
	ground.position.y = -0.01
	scene.add(ground)

	// Ambient light
	const ambient = new THREE.AmbientLight(0xffffff, 0.6)
	scene.add(ambient)

	// Subscribe to state changes
	let running = false

	const unsubscribe_pos = store.sub(player_pos_atom, () => {
		const pos = store.get(player_pos_atom)
		player_mesh.position.x = pos.x
		player_mesh.position.z = pos.y
	})

	const unsubscribe_mask = store.sub(player_mask_atom, () => {
		const mask_id = store.get(player_mask_atom)
		if (mask_id) {
			const mask = mask_reg.get(mask_id)
			if (mask?.visual) {
				// Apply visual effects (placeholder - would be post-processing)
				const sat = mask.visual.saturation ?? 1
				player_mat.color.setHSL(0.5, sat * 0.5, 0.5)
			}
		}
	})

	const unsubscribe_impact = store.sub(impact_event_atom, () => {
		const impact = store.get(impact_event_atom)
		if (impact) {
			// Spawn particles (placeholder)
			console.log('Impact!', impact)
		}
	})

	// Animation loop
	const animate = () => {
		if (!running) return
		renderer.render(scene, camera)
		requestAnimationFrame(animate)
	}

	// Resize handler
	const on_resize = () => {
		const width = canvas.clientWidth
		const height = canvas.clientHeight
		camera.aspect = width / height
		camera.updateProjectionMatrix()
		renderer.setSize(width, height, false)
	}

	return {
		scene,
		camera,
		renderer,
		start: () => {
			running = true
			on_resize()
			window.addEventListener('resize', on_resize)
			animate()
		},
		stop: () => {
			running = false
			window.removeEventListener('resize', on_resize)
		},
		dispose: () => {
			unsubscribe_pos()
			unsubscribe_mask()
			unsubscribe_impact()
			renderer.dispose()
		},
	}
}
