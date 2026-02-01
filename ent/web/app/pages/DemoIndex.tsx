// Demo index - shows all demo pages from registry

import {demo_reg} from '../demos/reg.ts'
import {navigate} from '../App.tsx'

export const DemoIndex = () => {
	const demos = demo_reg.list()

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
				<a
					href="#"
					style={{
						color: 'rgba(255,255,255,0.5)',
						fontSize: 14,
						marginBottom: 8,
						display: 'block',
					}}
				>
					← Back to landing
				</a>
				<h1 style={{fontSize: 32, fontWeight: 300, color: '#4ecdc4'}}>
					Demo Pages
				</h1>
				<p style={{color: 'rgba(255,255,255,0.5)', marginTop: 8}}>
					Workspaces for different teams
				</p>
			</header>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
					gap: 20,
				}}
			>
				{demos.map(demo => (
					<button
						key={demo.id}
						onClick={() => navigate(demo.path)}
						style={{
							padding: 24,
							background: 'rgba(255,255,255,0.05)',
							border: '1px solid rgba(255,255,255,0.1)',
							borderRadius: 12,
							textAlign: 'left',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={e => {
							e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
							e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.3)'
						}}
						onMouseLeave={e => {
							e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
							e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
						}}
					>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
							<span style={{fontSize: 18, fontWeight: 600, color: '#fff'}}>
								{demo.name}
							</span>
							{demo.team && (
								<span
									style={{
										fontSize: 11,
										padding: '2px 8px',
										background: 'rgba(78, 205, 196, 0.2)',
										color: '#4ecdc4',
										borderRadius: 4,
									}}
								>
									{demo.team}
								</span>
							)}
						</div>
						<p style={{color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.5}}>
							{demo.desc}
						</p>
						{demo.tags && demo.tags.length > 0 && (
							<div style={{display: 'flex', gap: 6, marginTop: 12}}>
								{demo.tags.map(tag => (
									<span
										key={tag}
										style={{
											fontSize: 10,
											padding: '2px 6px',
											background: 'rgba(255,255,255,0.1)',
											color: 'rgba(255,255,255,0.5)',
											borderRadius: 3,
										}}
									>
										{tag}
									</span>
								))}
							</div>
						)}
					</button>
				))}
			</div>
		</div>
	)
}
