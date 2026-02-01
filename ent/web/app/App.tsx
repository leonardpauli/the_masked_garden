// App - hash-based routing

import {useState, useEffect, type ReactNode} from 'react'
import {LandingPage} from './pages/Landing.tsx'
import {DemoIndex} from './pages/DemoIndex.tsx'
import {GamePage} from './pages/Game.tsx'
import {SoundPage} from './pages/Sound.tsx'
import {SoundDebugPage} from './pages/SoundDebug.tsx'

type Route = {
	path: string
	component: () => ReactNode
}

const routes: Route[] = [
	{path: '', component: LandingPage},
	{path: 'demo', component: DemoIndex},
	{path: 'demo/game', component: GamePage},
	{path: 'demo/sound', component: SoundPage},
	{path: 'demo/sound-debug', component: SoundDebugPage},
]

export const App = () => {
	const [path, setPath] = useState(() => window.location.hash.slice(1) || '')

	useEffect(() => {
		const on_hash_change = () => {
			setPath(window.location.hash.slice(1) || '')
		}
		window.addEventListener('hashchange', on_hash_change)
		return () => window.removeEventListener('hashchange', on_hash_change)
	}, [])

	const route = routes.find(r => r.path === path) ?? routes[0]!

	return <>{route.component()}</>
}

// Navigation helper
export const navigate = (path: string) => {
	window.location.hash = path
}
