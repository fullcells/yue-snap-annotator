const assert = require('node:assert/strict');
const test = require('node:test');
const { annotate, annotateCantoneseTokenGlosses } = require('../dist');

const word = (token, gloss = '') => ({ token, gloss, mtype: 'BASE' });
const separator = token => ({ token, gloss: '', mtype: 'N/A' });
const clean = tokens => {
	const text = tokens.map(t => t.token).join('');
	const output = annotateCantoneseTokenGlosses(tokens, text);
	assert.equal(output.map(t => t.text).join(''), text);
	return output;
};
const glossOf = (tokens, text) => tokens.find(t => t.text === text)?.gloss;

test('retains the original user-selected compact gloss overrides', () => {
	for (const [token, supplied, expected] of [
		['咁', 'so', 'then'], ['咁', 'like this', '-ly'],
		['會', 'can', 'will'],
		['得', 'ready', '-ed °'], ['得', 'obtain', '-ed °'],
		['得', 'allow', 'able'], ['得', 'get', 'able'],
		['識', 'recognize', 'know'],
		['要', 'want', 'covet'], ['要', 'need to', 'need'],
		['叫', 'call', 'named'], ['叫', 'name / call', 'named'],
		['嚟', 'arrive', 'come'], ['嚟', 'become', 'come'],
		['嚟', 'come-from / for', 'come from'],
	]) assert.equal(clean([word(token, supplied)])[0].gloss, expected, `${token}: ${supplied}`);
});

test('bundled dictionary defaults are not replaced by blanket local rewrites', async () => {
	for (const [text, token, expected] of [
		['我要走。', '要', 'covet'], ['要', '要', 'covet'], ['要。', '要', 'covet'],
		['叫', '叫', 'named / call-out'], ['嚟', '嚟', 'come-from / for'],
		['冇', '冇', 'has no / did not'],
		['你叫佢嚟。', '叫', 'named'], ['你叫佢嚟。', '嚟', 'come from'],
		['咁好？', '咁', 'then'], ['佢會嚟。', '會', 'will'],
	]) {
		const result = await annotate(text);
		assert.equal(glossOf(result, token), expected, text);
		assert.equal(result.map(t => t.text).join(''), text);
	}
});

test('prohibitions work with joined and split 唔好 and preserve caller input', () => {
	for (const tokens of [
		[word('唔好', 'bad'), word('走', 'leave')],
		[word('唔', 'not'), word('好', 'good'), word('喊', 'cry')],
		[word('唔好'), word('做')],
		[word('唔好', 'not good'), word('食飯', 'eat')],
		[word('唔好', 'bad'), word('睇', 'look'), word('我', 'me')],
	]) {
		const before = structuredClone(tokens);
		assert.equal(glossOf(clean(tokens), '唔好'), "don't");
		assert.deepEqual(tokens, before);
	}
	assert.equal(glossOf(clean([word('唔好', 'please refrain from'), word('走', 'leave')]), '唔好'), 'please refrain from');
});

test('lexical and adjectival negatives are not reclassified as prohibitions', async () => {
	for (const text of ['唔好食。', '呢個唔好。', '呢啲唔好食嘅嘢。']) {
		assert.equal(glossOf(await annotate(text), '唔好'), 'bad', text);
	}
	assert.equal(glossOf(await annotate('唔好意思。'), '唔好意思'), 'excuse me');
	assert.equal(glossOf(await annotate('我唔見咗銀包。'), '唔見咗'), 'lost (object)');
});

test('local prohibitions and not-yet coexist with the original 冇 simplification', async () => {
	for (const [text, token, expected] of [
		['唔好走。', '唔好', "don't"], ['唔好喊。', '唔好', "don't"],
		['唔好食飯。', '唔好', "don't"],
		['我冇食飯。', '冇', 'no'], ['我冇去。', '冇', 'no'],
		['我冇錢。', '冇', 'no'], ['我未食飯。', '未', 'not yet'],
	]) assert.equal(glossOf(await annotate(text), token), expected, text);
	for (const noun of ['食物', '飲品', '錢', '人']) {
		assert.equal(glossOf(clean([word('冇', 'not have'), word(noun)]), '冇'), 'not have');
	}
	assert.equal(glossOf(clean([word('冇', "haven't"), word('食飯', 'eat')]), '冇'), "haven't");
	assert.equal(glossOf(clean([word('冇', 'has no / did not'), word('食飯', 'eat')]), '冇'), 'has no / did not');
	assert.equal(glossOf(clean([word('未'), word('食飯', 'eat')]), '未'), 'not yet');
});

test('inability works with whole negative verbs and both complement segmentations', async () => {
	for (const text of ['我睇唔到你。', '我搵唔到。', '我聽唔到。', '佢買唔到飛。']) {
		assert.equal(glossOf(await annotate(text), '唔到'), "can't", text);
	}
	for (const tokens of [
		[word('睇', 'see'), word('唔到', 'No')],
		[word('睇', 'see'), word('唔', 'not'), word('到', 'arrive')],
	]) {
		const result = clean(tokens);
		assert.equal(glossOf(result, '唔到'), "can't");
		assert.equal(glossOf(result, '睇'), 'see');
	}
	assert.equal(clean([word('睇唔到')])[0].gloss, "can't see");
	assert.equal(clean([word('聽唔到', 'No')])[0].gloss, "can't hear");
	assert.equal(clean([word('搵唔到', "couldn't find")])[0].gloss, "couldn't find");
	assert.equal(glossOf(clean([word('睇', 'see'), word('唔到', "couldn't manage")]), '唔到'), "couldn't manage");
});

test('construction rules cannot borrow evidence across subtitle or punctuation boundaries', () => {
	for (const boundary of ['\n', '\r\n', '。', '，', ' ']) {
		assert.equal(glossOf(clean([word('唔好', 'bad'), separator(boundary), word('走', 'leave')]), '唔好'), 'bad');
		assert.equal(glossOf(clean([word('冇', 'not have'), separator(boundary), word('食飯', 'eat')]), '冇'), 'not have');
		assert.equal(glossOf(clean([word('睇', 'see'), separator(boundary), word('唔到', 'No')]), '唔到'), 'No');
	}
	assert.equal(glossOf(clean([word('我', 'me'), word('唔到', 'not arrive')]), '唔到'), 'not arrive');
	assert.equal(glossOf(clean([word('睇', 'see'), { token: '唔到', gloss: '', mtype: 'N/A' }]), '唔到'), undefined);
});

test('得 keeps the original override before quantities without the added only rule', async () => {
	for (const text of ['我得十蚊。', '我得一個。', '我得10蚊。', '我得１０蚊。', '我得10。']) {
		assert.equal(glossOf(await annotate(text), '得'), 'able', text);
	}
	assert.equal(glossOf(await annotate('我得閒。'), '得閒'), 'available');
});
