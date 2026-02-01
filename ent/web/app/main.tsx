// Main app entry - hash-based routing

import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {App} from './App.tsx'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
)
