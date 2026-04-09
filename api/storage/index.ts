/**
 * Simple key-value storage interface.
 * Swap the implementation (Redis, SQLite, S3, etc.) by changing the export.
 */
export interface Store {
	get<T = unknown>(key: string): Promise<T | null>;
	set<T = unknown>(key: string, value: T): Promise<void>;
}

class MemoryStore implements Store {
	private data = new Map<string, unknown>();

	async get<T = unknown>(key: string): Promise<T | null> {
		return (this.data.get(key) as T) ?? null;
	}

	async set<T = unknown>(key: string, value: T): Promise<void> {
		this.data.set(key, value);
	}
}

export const store: Store = new MemoryStore();
