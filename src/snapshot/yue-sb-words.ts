import bundledSnapshotJson from './yue-sb-words.snapshot.json';
import type { AnnotatedToken, SBWordRow2 } from '../types';

// Reuse the existing Supabase words2 row type instead of maintaining a Yue
// duplicate. The semantic alias still makes it clear that this array contains
// the YUE→EN and EN→YUE subset bundled for MyYue.
export type YueSBWords = SBWordRow2[];

// The wrapper fields let clients determine whether their local rows are stale
// without changing the familiar YueSBWords row shape itself.
export type YueSBWordsSnapshot = {
	schemaVersion: 1;
	version: string;
	generatedAt: string;
	rows: YueSBWords;
};

export type YueSBWordsSnapshotRefreshResult = {
	updated: boolean;
	version: string;
	count: number;
};

// This checked-in snapshot is MyYue's always-available offline starting point.
// `npm run snapshot:update` regenerates it from words2 before a release/build.
const bundledSnapshot = bundledSnapshotJson as YueSBWordsSnapshot;

// Extracted MyYue clients can use this public endpoint without importing any
// lingoprocessor/Supabase code. A manual refresh may override endpointUrl.
const defaultRefreshEndpoint = 'https://lingoprocessor.omnilingualaccess.com/api/yue-sb-words';
const refreshIntervalMs = 24 * 60 * 60 * 1000;
// A temporarily offline client may retry sooner than one day, but repeated
// annotations will not cause a tight loop of failed network requests.
const failedRefreshRetryMs = 15 * 60 * 1000;

// IndexedDB works in normal web pages, Chrome extension pages, and extension
// service workers. It can hold this dataset without localStorage's small limit.
const databaseName = 'my-yue';
const storeName = 'yue-sb-words';
const recordKey = 'current';

// One object is stored rather than thousands of individual word records because
// MyYue consumes the complete snapshot and replaces it atomically on refresh.
type StoredYueSBWords = {
	key: typeof recordKey;
	snapshot: YueSBWordsSnapshot;
	lastCheckedAt: number;
};

// Module memory is the fast path after the first annotation. The promise fields
// also prevent simultaneous annotations from duplicating IndexedDB/network work.
let activeSnapshot = bundledSnapshot;
let lastCheckedAt = 0;
let lastFailedAt = 0;
let persistentStateLoaded = false;
let loadPromise: Promise<void> | undefined;
let refreshPromise: Promise<YueSBWordsSnapshotRefreshResult> | undefined;

function supportsPersistentYueSBWords(): boolean {
	// Node/server consumers have no IndexedDB, so they stay deterministic and do
	// not silently make network requests. They may pass latestSBWords.
	return typeof indexedDB !== 'undefined';
}

function isYueSBWordsSnapshot(value: unknown): value is YueSBWordsSnapshot {
	// Both IndexedDB and the refresh endpoint are external inputs at runtime.
	// Validate every row before replacing the known-good bundled/current copy.
	if (!value || typeof value !== 'object') return false;
	const snapshot = value as Partial<YueSBWordsSnapshot>;
	if (snapshot.schemaVersion !== 1 || typeof snapshot.version !== 'string' || !Array.isArray(snapshot.rows)) return false;
	return snapshot.rows.every(row =>
		row && typeof row === 'object'
		&& typeof row.id === 'number'
		&& typeof row.word_lang === 'string'
		&& typeof row.word === 'string'
		&& typeof row.gloss === 'string'
		&& typeof row.gloss_lang === 'string'
		&& typeof row.is_core === 'boolean'
		&& typeof row.created_at === 'string'
		&& typeof row.is_human_verified === 'boolean'
	);
}

function openDatabase(): Promise<IDBDatabase> {
	// IndexedDB uses event callbacks; wrap them in a Promise so the rest of this
	// module can use straightforward async/await control flow.
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, 1);
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: 'key' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function readStoredSnapshot(): Promise<StoredYueSBWords | undefined> {
	const database = await openDatabase();
	try {
		return await new Promise((resolve, reject) => {
			const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(recordKey);
			request.onsuccess = () => resolve(request.result as StoredYueSBWords | undefined);
			request.onerror = () => reject(request.error);
		});
	} finally {
		database.close();
	}
}

async function writeStoredSnapshot(record: StoredYueSBWords): Promise<void> {
	const database = await openDatabase();
	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(storeName, 'readwrite');
			transaction.objectStore(storeName).put(record);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	} finally {
		database.close();
	}
}

async function loadPersistentState(): Promise<void> {
	// Read IndexedDB only once per loaded MyYue module. If it is unavailable or
	// corrupt, annotation safely continues with the checked-in snapshot.
	if (persistentStateLoaded || !supportsPersistentYueSBWords()) return;
	loadPromise ??= (async () => {
		try {
			const stored = await readStoredSnapshot();
			if (stored && isYueSBWordsSnapshot(stored.snapshot)) {
				activeSnapshot = stored.snapshot;
				lastCheckedAt = stored.lastCheckedAt || 0;
			}
		} catch (error) {
			console.warn('MyYue could not read its cached YueSBWords; using the bundled copy.', error);
		} finally {
			persistentStateLoaded = true;
		}
	})();
	await loadPromise;
}

// Returns using local data only (IndexedDB when present, otherwise the bundle).
// It starts, but deliberately does not await, the possible network refresh so
// an annotation is never delayed by connectivity.
export async function getSnapshotYueSBWords(): Promise<YueSBWords> {
	await loadPersistentState();
	if (supportsPersistentYueSBWords() && typeof fetch !== 'undefined') {
		void refreshYueSBWordsSnapshot().catch(() => undefined);
	}
	return activeSnapshot.rows;
}

// Consumers may call this with force=true for a user-facing "refresh" action.
// Automatic calls are conditional and at most daily; failures retain local data.
export async function refreshYueSBWordsSnapshot({
	force = false,
	endpointUrl = defaultRefreshEndpoint,
}: {
	force?: boolean;
	endpointUrl?: string;
} = {}): Promise<YueSBWordsSnapshotRefreshResult> {
	await loadPersistentState();
	const now = Date.now();
	if (!force && (now - lastCheckedAt < refreshIntervalMs || now - lastFailedAt < failedRefreshRetryMs)) {
		return { updated: false, version: activeSnapshot.version, count: activeSnapshot.rows.length };
	}
	if (typeof fetch === 'undefined') {
		return { updated: false, version: activeSnapshot.version, count: activeSnapshot.rows.length };
	}
	// Share one request if several annotations/manual refreshes arrive together.
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		try {
			// Send the known content version as a query parameter rather than an
			// ETag. Some hosting layers replace application-generated ETags, whereas
			// this SHA-based version remains stable and still permits a bodyless 304.
			const requestUrl = new URL(
				endpointUrl,
				typeof location !== 'undefined' ? location.href : undefined,
			);
			requestUrl.searchParams.set('version', activeSnapshot.version);
			// A user-requested refresh also asks Lingoprocessor to revalidate its
			// short-lived server cache. The endpoint coalesces/rate-limits reloads.
			if (force) requestUrl.searchParams.set('refresh', '1');
			const response = await fetch(requestUrl, { cache: 'no-store' });
			if (response.status === 304) {
				lastCheckedAt = Date.now();
				if (supportsPersistentYueSBWords()) {
					await writeStoredSnapshot({ key: recordKey, snapshot: activeSnapshot, lastCheckedAt });
				}
				return { updated: false, version: activeSnapshot.version, count: activeSnapshot.rows.length };
			}
			if (!response.ok) throw new Error(`YueSBWords refresh failed with HTTP ${response.status}.`);
			const snapshot: unknown = await response.json();
			if (!isYueSBWordsSnapshot(snapshot)) throw new Error('YueSBWords refresh returned an unsupported shape.');

			const changed = snapshot.version !== activeSnapshot.version;
			activeSnapshot = snapshot;
			lastCheckedAt = Date.now();
			if (supportsPersistentYueSBWords()) {
				await writeStoredSnapshot({ key: recordKey, snapshot: activeSnapshot, lastCheckedAt });
			}
			return { updated: changed, version: activeSnapshot.version, count: activeSnapshot.rows.length };
		} catch (error) {
			lastFailedAt = Date.now();
			throw error;
		} finally {
			refreshPromise = undefined;
		}
	})();

	return refreshPromise;
}

function preferredRow(rows: YueSBWords, target: (row: SBWordRow2) => string): SBWordRow2 | undefined {
	// Match glossifyTokens2ii's established priority when duplicate rows exist:
	// verified+lowercase, verified, lowercase, and finally the first row.
	return rows.find(row => row.is_human_verified && target(row) === target(row).toLowerCase())
		?? rows.find(row => row.is_human_verified)
		?? rows.find(row => target(row) === target(row).toLowerCase())
		?? rows[0];
}

// Mirrors the existing SBWords preference order: direct YUE→EN first, followed
// by reverse EN→YUE, preferring verified and lowercase English entries.
export function applyYueSBWordsGlosses(tokens: AnnotatedToken[], rows: YueSBWords): AnnotatedToken[] {
	// Build indexes once for this annotation rather than scanning all snapshot
	// rows separately for every token.
	const directByWord = new Map<string, YueSBWords>();
	const reverseByYueGloss = new Map<string, YueSBWords>();
	for (const row of rows) {
		if (row.word_lang === 'yue' && row.gloss_lang === 'en') {
			const key = row.word.toLowerCase();
			directByWord.set(key, [...(directByWord.get(key) ?? []), row]);
		} else if (row.word_lang === 'en' && row.gloss_lang === 'yue') {
			const key = row.gloss.toLowerCase();
			reverseByYueGloss.set(key, [...(reverseByYueGloss.get(key) ?? []), row]);
		}
	}

	return tokens.map(token => {
		// Non-words (for example `。`) intentionally keep null/absent glosses.
		// Existing deterministic/contextual glosses are also not overwritten.
		if (!token.isWord || token.gloss) return token;
		const key = token.text.toLowerCase();
		const direct = preferredRow(directByWord.get(key) ?? [], row => row.gloss);
		if (direct) return { ...token, gloss: direct.gloss };
		const reverse = preferredRow(reverseByYueGloss.get(key) ?? [], row => row.word);
		return reverse ? { ...token, gloss: reverse.word } : token;
	});
}
