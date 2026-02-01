// Registry pattern - core types

export type RegEntry = {
	id: string
	tags?: string[]
}

export type Reg<T extends RegEntry> = {
	entries: Map<string, T>
	register: (entry: T) => void
	get: (id: string) => T | undefined
	list: () => T[]
	by_tag: (tag: string) => T[]
}

export const reg_create = <T extends RegEntry>(initial?: Record<string, T>): Reg<T> => {
	const entries = new Map<string, T>()

	if (initial) {
		for (const [id, entry] of Object.entries(initial)) {
			entries.set(id, entry)
		}
	}

	return {
		entries,
		register: (entry) => {
			entries.set(entry.id, entry)
		},
		get: (id) => entries.get(id),
		list: () => Array.from(entries.values()),
		by_tag: (tag) => Array.from(entries.values()).filter(e => e.tags?.includes(tag)),
	}
}
