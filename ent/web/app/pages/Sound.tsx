// Sound demo page - workspace for sound team

import {useState, useEffect} from 'react'
import {audio_engine_create, type AudioEngine} from '@ts/lib/audio/index.ts'
import {mask_reg} from '@game/lib/index.ts'
import {navigate} from '../App.tsx'

export const SoundPage = () => {
	const [engine, setEngine] = useState<AudioEngine | null>(null)
	const [impulse, setImpulse] = useState(0.5)
	const [lpfCutoff, setLpfCutoff] = useState(1)

	// Initialize audio on first interaction
	const init_audio = async () => {
		if (engine) return
		const e = audio_engine_create()
		await e.resume()
		setEngine(e)
	}

	// Apply LPF changes
	useEffect(() => {
		engine?.set_lpf_cutoff(lpfCutoff)
	}, [engine, lpfCutoff])

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				overflow: 'auto',
				padding: 40,
				background: '#1a1a2e',
			}}
		>
			<header style={{marginBottom: 40}}>
				<button
					onClick={() => navigate('demo')}
					style={{
						background: 'none',
						border: 'none',
						color: 'rgba(255,255,255,0.5)',
						fontSize: 14,
						marginBottom: 8,
						cursor: 'pointer',
						padding: 0,
					}}
				>
					← Back to demos
				</button>
				<h1 style={{fontSize: 32, fontWeight: 300, color: '#4ecdc4'}}>
					Sound Demo
				</h1>
				<p style={{color: 'rgba(255,255,255,0.5)', marginTop: 8}}>
					Workspace for testing audio engine + samples
				</p>
			</header>

			{!engine ? (
				<button
					onClick={init_audio}
					style={{
						padding: '16px 32px',
						fontSize: 18,
						background: '#4ecdc4',
						color: '#1a1a2e',
						border: 'none',
						borderRadius: 8,
						cursor: 'pointer',
					}}
				>
					Start Audio Engine
				</button>
			) : (
				<>
					<Section title="Impact Tester">
						<Slider
							label="Impulse"
							value={impulse}
							onChange={setImpulse}
							min={0}
							max={1}
							step={0.01}
						/>
						<button
							onClick={() => {
								console.log('Impact fired:', impulse)
							}}
							style={{
								padding: '12px 24px',
								background: '#4ecdc4',
								color: '#1a1a2e',
								border: 'none',
								borderRadius: 6,
								cursor: 'pointer',
								marginTop: 10,
							}}
						>
							Fire Impact
						</button>
					</Section>

					<Section title="Global Filter (Mask Effect)">
						<Slider
							label="LPF Cutoff"
							value={lpfCutoff}
							onChange={setLpfCutoff}
							min={0}
							max={1}
							step={0.01}
						/>
					</Section>

					<Section title="Mask Presets">
						<div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
							{mask_reg.list().map(mask => (
								<button
									key={mask.id}
									onClick={() => {
										if (mask.audio.lpf_cutoff !== undefined) {
											setLpfCutoff(mask.audio.lpf_cutoff)
										}
									}}
									style={{
										padding: '10px 16px',
										background: 'rgba(255,255,255,0.1)',
										color: '#fff',
										border: 'none',
										borderRadius: 6,
										cursor: 'pointer',
									}}
								>
									{mask.name}
								</button>
							))}
						</div>
					</Section>

					<Section title="Sample Drop Zone">
						<div
							style={{
								border: '2px dashed rgba(255,255,255,0.2)',
								borderRadius: 8,
								padding: 40,
								textAlign: 'center',
								color: 'rgba(255,255,255,0.4)',
							}}
						>
							Drop .wav or .ogg files here
							<br />
							<small>(coming soon)</small>
						</div>
					</Section>
				</>
			)}
		</div>
	)
}

// UI Components
const Section = ({title, children}: {title: string; children: React.ReactNode}) => (
	<div style={{marginBottom: 40}}>
		<h2
			style={{
				fontSize: 14,
				textTransform: 'uppercase',
				color: 'rgba(255,255,255,0.4)',
				marginBottom: 16,
				letterSpacing: '0.05em',
			}}
		>
			{title}
		</h2>
		{children}
	</div>
)

const Slider = ({
	label,
	value,
	onChange,
	min,
	max,
	step,
}: {
	label: string
	value: number
	onChange: (v: number) => void
	min: number
	max: number
	step: number
}) => (
	<div style={{marginBottom: 15}}>
		<label style={{display: 'block', marginBottom: 8, color: 'rgba(255,255,255,0.7)'}}>
			{label}: {value.toFixed(2)}
		</label>
		<input
			type="range"
			value={value}
			onChange={e => onChange(Number(e.target.value))}
			min={min}
			max={max}
			step={step}
			style={{width: '100%', maxWidth: 300}}
		/>
	</div>
)
