import {resolve} from 'node:path'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@ts': resolve(__dirname, 'env/ts'),
			'@game': resolve(__dirname, 'env/game'),
			'@three': resolve(__dirname, 'env/three'),
			'@ui': resolve(__dirname, 'env/react_web'),
		},
	},
	server: {
		port: 3000,
	},
})
