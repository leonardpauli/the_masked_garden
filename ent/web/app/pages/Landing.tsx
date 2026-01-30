// Landing page - temporary nice intro

import {navigate} from '../App.tsx'

export const LandingPage = () => {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
				padding: 20,
				textAlign: 'center',
			}}
		>
			<h1
				style={{
					fontSize: 'clamp(2.5rem, 10vw, 5rem)',
					fontWeight: 300,
					letterSpacing: '0.1em',
					marginBottom: 16,
					color: '#fff',
				}}
			>
				MASKED GARDEN
			</h1>

			<p
				style={{
					fontSize: 'clamp(1rem, 3vw, 1.25rem)',
					color: 'rgba(255,255,255,0.6)',
					maxWidth: 400,
					lineHeight: 1.6,
					marginBottom: 48,
				}}
			>
				Wander a world where masks reveal hidden layers.
				<br />
				What you see depends on what you wear.
			</p>

			<button
				onClick={() => navigate('demo/game')}
				style={{
					padding: '16px 48px',
					fontSize: 18,
					fontWeight: 600,
					background: '#4ecdc4',
					color: '#1a1a2e',
					border: 'none',
					borderRadius: 12,
					cursor: 'pointer',
					transition: 'transform 0.2s, box-shadow 0.2s',
					boxShadow: '0 4px 24px rgba(78, 205, 196, 0.3)',
				}}
				onMouseEnter={e => {
					e.currentTarget.style.transform = 'scale(1.05)'
					e.currentTarget.style.boxShadow = '0 8px 32px rgba(78, 205, 196, 0.4)'
				}}
				onMouseLeave={e => {
					e.currentTarget.style.transform = 'scale(1)'
					e.currentTarget.style.boxShadow = '0 4px 24px rgba(78, 205, 196, 0.3)'
				}}
			>
				Enter Garden
			</button>

			<div style={{marginTop: 48, display: 'flex', gap: 24}}>
				<a
					href="#demo"
					style={{
						color: 'rgba(255,255,255,0.5)',
						fontSize: 14,
					}}
				>
					Demo Pages
				</a>
			</div>

			<div
				style={{
					position: 'absolute',
					bottom: 20,
					color: 'rgba(255,255,255,0.3)',
					fontSize: 12,
				}}
			>
				Game Jam 2026 — Theme: Mask
			</div>
		</div>
	)
}
