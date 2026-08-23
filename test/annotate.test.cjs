const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
	annotate,
	annotateCantoneseTokenGlosses,
	refreshYueSBWordsSnapshot,
	tokenizeAndSpell,
} = require('../dist');

const localRows = [{
	id: 1,
	word_lang: 'yue',
	word: '貓',
	gloss: 'cat',
	gloss_lang: 'en',
	is_core: true,
	created_at: '2026-01-01T00:00:00.000Z',
	is_human_verified: true,
}];

test('lightweight treatment entry points do not load the static trie', () => {
	const result = spawnSync(process.execPath, ['-e', `
		require('yue-snap-annotator/deterministic');
		require('yue-snap-annotator/spelling');
		if (Object.keys(require.cache).some(path => path.includes('canto3db_codepoints_prefixtrie'))) process.exit(1);
	`], { cwd: process.cwd() });
	assert.equal(result.status, 0, result.stderr.toString());
});

test('annotates Cantonese locally with caller-supplied dictionary rows', async () => {
	const tokens = await annotate('貓。', { latestSBWords: localRows });
	assert.equal(tokens.map(token => token.text).join(''), '貓。');
	assert.equal(tokens.find(token => token.text === '貓')?.gloss, 'cat');
	assert.deepEqual(tokens.find(token => token.text === '貓')?.phoneticToken, [['貓', 'maau1']]);
	assert.equal(tokens.find(token => token.text === '。')?.gloss ?? null, null);
});

test('simplifies glosses only for end-to-end deterministic annotation', async () => {
	const simplificationRows = [
		{ ...localRows[0], id: 2, word: '冇', gloss: 'not have' },
		{ ...localRows[0], id: 3, word: '佢', gloss: 'he/she/it' },
		{ ...localRows[0], id: 4, word: '佢哋', gloss: 'they-PL' },
		{ ...localRows[0], id: 5, word: '衫', gloss: 'shirt/clothes' },
	];
	const tokens = await annotate('冇 佢 佢哋 衫', { latestSBWords: simplificationRows });
	assert.equal(tokens.find(token => token.text === '冇')?.gloss, 'no');
	assert.equal(tokens.find(token => token.text === '佢')?.gloss, 'they');
	assert.equal(tokens.find(token => token.text === '佢哋')?.gloss, 'they');
	assert.equal(tokens.find(token => token.text === '衫')?.gloss, 'shirt');

	const externalTokens = annotateCantoneseTokenGlosses([
		{ token: '冇', gloss: 'not have', mtype: 'BASE' },
		{ token: '佢', gloss: 'he', mtype: 'BASE' },
		{ token: '佢哋', gloss: 'they-PL', mtype: 'BASE' },
		{ token: '衫', gloss: 'shirt/clothes', mtype: 'BASE' },
	], '冇佢佢哋衫');
	assert.deepEqual(externalTokens.map(token => token.gloss), [
		'not have', 'he', 'they-PL', 'shirt / clothes',
	]);
});

test('tokenizeAndSpell does not require gloss data or a network', () => {
	const tokens = tokenizeAndSpell('我');
	assert.equal(tokens.map(token => token.text).join(''), '我');
	assert.deepEqual(tokens[0].phoneticToken, [['我', 'ngo5']]);
});

test('owns the historical Yue regroup and context rules', () => {
	assert.deepEqual(tokenizeAndSpell('好凍').map(token => token.text), ['好凍']);

	const measure = annotateCantoneseTokenGlosses([
		{ token: '度', gloss: 'degree', mtype: 'BASE' },
		{ token: '咗', gloss: 'completed', mtype: 'BASE' },
	], '度咗');
	assert.equal(measure[0].gloss, 'measure');

	const location = annotateCantoneseTokenGlosses([
		{ token: '度', gloss: 'degree', mtype: 'BASE' },
	], '度');
	assert.equal(location[0].gloss, 'location');
});

test('bundled snapshot annotation stays offline in Node', async () => {
	const originalFetch = global.fetch;
	global.fetch = async () => {
		throw new Error('annotate must not fetch in Node');
	};
	try {
		const tokens = await annotate('我鍾意貓。');
		assert.equal(tokens.find(token => token.text === '鍾意')?.gloss, 'like');
		assert.equal(tokens.find(token => token.text === '貓')?.gloss, 'cat');
	} finally {
		global.fetch = originalFetch;
	}
});

test('forced refresh requests server revalidation', async () => {
	const originalFetch = global.fetch;
	let requestedUrl;
	global.fetch = async (url) => {
		requestedUrl = new URL(url);
		return { status: 304 };
	};
	try {
		const result = await refreshYueSBWordsSnapshot({
			force: true,
			endpointUrl: 'https://example.test/api/yue-sb-words',
		});
		assert.equal(requestedUrl.searchParams.get('version'), result.version);
		assert.equal(requestedUrl.searchParams.get('refresh'), '1');
		assert.equal(result.updated, false);
	} finally {
		global.fetch = originalFetch;
	}
});
