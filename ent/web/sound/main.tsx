// Sound Demo - workspace for sound team

import {StrictMode, useState, useRef, useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {audio_engine_create, type AudioEngine} from '@ts/lib/audio/index.ts'
import {mask_reg} from '@game/lib/index.ts'

const App = () => {
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
		<div>
			<h1>Sound Demo</h1>
			<p style={{color: '#666', marginBottom: 20}}>
				Workspace for testing audio engine + samples
			</p>

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
								// Placeholder - would trigger impact sound
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
								color: '#666',
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
	<div style={{marginBottom: 30}}>
		<h2>{title}</h2>
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
		<label style={{display: 'block', marginBottom: 5, color: '#aaa'}}>
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

// Mount
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
)
