// Game page - main game with Three.js + masks

import {useEffect, useRef} from 'react'
import {renderer_create, type GameRenderer} from '@three/lib/renderer.ts'
import {
	usePlayerMask,
	useCurrentMaskDef,
	useMaskList,
	mask_equip,
	player_move,
} from '@ui/lib/hooks.ts'
import {navigate} from '../App.tsx'

export const GamePage = () => {
	const canvas_ref = useRef<HTMLCanvasElement>(null)
	const renderer_ref = useRef<GameRenderer | null>(null)

	// Initialize Three.js renderer
	useEffect(() => {
		if (!canvas_ref.current) return

		const renderer = renderer_create(canvas_ref.current)
		renderer_ref.current = renderer
		renderer.start()

		return () => {
			renderer.stop()
			renderer.dispose()
		}
	}, [])

	// Touch/pointer input
	useEffect(() => {
		const canvas = canvas_ref.current
		if (!canvas) return

		let last_pos: {x: number; y: number} | null = null

		const on_pointer_down = (e: PointerEvent) => {
			last_pos = {x: e.clientX, y: e.clientY}
			canvas.setPointerCapture(e.pointerId)
		}

		const on_pointer_move = (e: PointerEvent) => {
			if (!last_pos) return
			const dx = (e.clientX - last_pos.x) * 0.02
			const dy = (e.clientY - last_pos.y) * 0.02
			player_move({x: dx, y: dy})
			last_pos = {x: e.clientX, y: e.clientY}
		}

		const on_pointer_up = () => {
			last_pos = null
		}

		canvas.addEventListener('pointerdown', on_pointer_down)
		canvas.addEventListener('pointermove', on_pointer_move)
		canvas.addEventListener('pointerup', on_pointer_up)
		canvas.addEventListener('pointercancel', on_pointer_up)

		return () => {
			canvas.removeEventListener('pointerdown', on_pointer_down)
			canvas.removeEventListener('pointermove', on_pointer_move)
			canvas.removeEventListener('pointerup', on_pointer_up)
			canvas.removeEventListener('pointercancel', on_pointer_up)
		}
	}, [])

	return (
		<div style={{width: '100%', height: '100%', position: 'relative'}}>
			<canvas
				ref={canvas_ref}
				style={{width: '100%', height: '100%', display: 'block'}}
			/>

			{/* Back button */}
			<button
				onClick={() => navigate('demo')}
				style={{
					position: 'absolute',
					top: 16,
					left: 16,
					padding: '8px 16px',
					background: 'rgba(0,0,0,0.5)',
					color: 'rgba(255,255,255,0.7)',
					border: 'none',
					borderRadius: 6,
					fontSize: 14,
					cursor: 'pointer',
				}}
			>
				← Demos
			</button>

			<MaskSelector />
			<CurrentMaskDisplay />
		</div>
	)
}

// Mask selector UI
const MaskSelector = () => {
	const masks = useMaskList()
	const current = usePlayerMask()

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 20,
				left: '50%',
				transform: 'translateX(-50%)',
				display: 'flex',
				gap: 12,
			}}
		>
			{masks.map(mask => (
				<button
					key={mask.id}
					onClick={() => mask_equip(mask.id === current ? null : mask.id)}
					style={{
						padding: '12px 20px',
						borderRadius: 8,
						border: 'none',
						background: mask.id === current ? '#4ecdc4' : 'rgba(255,255,255,0.1)',
						color: mask.id === current ? '#1a1a2e' : '#fff',
						fontSize: 14,
						fontWeight: 600,
						cursor: 'pointer',
						transition: 'all 0.2s',
					}}
				>
					{mask.name.replace('Mask of ', '')}
				</button>
			))}
		</div>
	)
}

// Current mask display
const CurrentMaskDisplay = () => {
	const mask = useCurrentMaskDef()

	if (!mask) return null

	return (
		<div
			style={{
				position: 'absolute',
				top: 16,
				right: 16,
				padding: '8px 16px',
				borderRadius: 6,
				background: 'rgba(0,0,0,0.5)',
				color: '#fff',
				fontSize: 12,
			}}
		>
			{mask.name}
		</div>
	)
}
