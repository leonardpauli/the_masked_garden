// Demo page registry - additative pattern

import {reg_create, type RegEntry} from '@ts/lib/reg/index.ts'

export type DemoDef = RegEntry & {
	name: string
	desc: string
	path: string // hash path
	team?: string // which team uses this
}

// Demo definitions
export const demo_game: DemoDef = {
	id: 'game',
	name: 'Game',
	desc: 'Main game - drag to move, tap masks to switch',
	path: 'demo/game',
	tags: ['core'],
}

export const demo_sound: DemoDef = {
	id: 'sound',
	name: 'Sound',
	desc: 'Audio engine testing - mixer, impacts, filters',
	path: 'demo/sound',
	team: 'sound',
	tags: ['audio'],
}

export const demo_sound_debug: DemoDef = {
	id: 'sound-debug',
	name: 'Sound Debug',
	desc: 'Advanced sound engine - oscillators, ADSR, LFO, spatial audio, presets',
	path: 'demo/sound-debug',
	team: 'sound',
	tags: ['audio', 'debug'],
}

export const demo_art: DemoDef = {
	id: 'art',
	name: 'Art',
	desc: '3D asset preview + art direction',
	path: 'demo/art',
	team: 'art',
	tags: ['visual'],
}

export const demo_particles: DemoDef = {
	id: 'particles',
	name: 'Particles',
	desc: 'Shader effects + particle systems',
	path: 'demo/particles',
	tags: ['visual', 'fx'],
}

export const demo_assets: DemoDef = {
	id: 'assets',
	name: 'Assets',
	desc: 'Asset browser - preview all loaded assets',
	path: 'demo/assets',
	tags: ['tools'],
}

// Registry
export const demo_reg = reg_create<DemoDef>({
	game: demo_game,
	sound: demo_sound,
	'sound-debug': demo_sound_debug,
	art: demo_art,
	particles: demo_particles,
	assets: demo_assets,
})
