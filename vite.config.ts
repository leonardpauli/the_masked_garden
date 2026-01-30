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
			'@ent': resolve(__dirname, 'ent'),
		},
	},
	server: {
		port: 8000,
		host: '0.0.0.0',
		allowedHosts: ['the.masked.garden', 'masked.exe.xyz'],
	},
	root: 'ent/web/app',
	publicDir: resolve(__dirname, 'public'),
})
