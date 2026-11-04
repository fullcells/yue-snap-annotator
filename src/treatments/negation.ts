import type { CantoneseTokenGloss } from './deterministic';

// Deliberately bounded vocabulary: a noun beginning with a verb (食物, 飲品,
// etc.) is not evidence for verbal negation. Unknown constructions retain their
// incoming gloss rather than acquiring a guessed grammatical reading.
const actions = new Set([
	'走', '喊', '郁', '嘈', '講', '講嘢', '講笑', '做', '做嘢', '做功課',
	'食', '食飯', '食嘢', '飲', '飲水', '睇', '睇戲', '睇書', '睇電視',
	'聽', '聽歌', '玩', '用', '去', '去街', '返', '返工', '返學', '嚟',
	'買', '賣', '搵', '揾', '見', '見面', '打', '打電話', '等', '等候',
	'開', '關', '閂', '入', '出', '攞', '拎', '借', '還', '約', '聯絡',
	'瞓', '瞓覺', '起身', '洗', '洗澡', '沖涼', '游水', '揸車', '煮飯',
	'寫', '讀', '讀書', '跑', '行', '行路', '坐', '企', '笑', '鬧',
	'擔心', '驚', '理', '忘記', '放棄', '落雨',
]);

// 好食/好睇/etc. also describe qualities. Do not reinterpret bare 唔好食
// (not tasty) as a command without an object/action phrase to disambiguate it.
const evaluativeVerbs = new Set(['食', '飲', '睇', '聽', '玩', '用']);
const nonObjects = new Set(['嘅', '㗎', '呀', '啊', '啦', '喇', '囉', '喎', '咩', '啫', '呢', '都', '就']);
const resultVerbs: Record<string, string> = {
	'睇': 'see', '聽': 'hear', '見': 'see', '搵': 'find', '揾': 'find',
	'買': 'buy', '做': 'do', '去': 'go', '返': 'return', '嚟': 'come',
	'食': 'eat', '飲': 'drink', '入': 'enter', '出': 'exit', '攞': 'get',
	'拎': 'get', '借': 'borrow', '約': 'arrange', '等': 'wait', '聯絡': 'contact',
};

const isWord = (token: CantoneseTokenGloss | undefined): token is CantoneseTokenGloss => token?.mtype === 'BASE';
const isFallback = (gloss: string, values: string[]) => values.includes(gloss.trim().toLowerCase());

/** Narrow construction repairs shared by local and externally glossed input. */
export function applyNegationConstructions(initial: CantoneseTokenGloss[]): CantoneseTokenGloss[] {
	const tokens = initial.map(token => ({ ...token }));
	const output: CantoneseTokenGloss[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!isWord(token)) { output.push(token); continue; }

		// Handle 唔好 and 唔 + 好 without crossing punctuation, whitespace or a
		// subtitle break. Longer lexical expressions (唔好意思) remain untouched.
		const splitProhibition = token.token === '唔' && isWord(tokens[i + 1]) && tokens[i + 1].token === '好';
		const actionIndex = i + (splitProhibition ? 2 : 1);
		const action = tokens[actionIndex];
		const object = tokens[actionIndex + 1];
		const followsAction = isWord(action) && actions.has(action.token)
			&& (!evaluativeVerbs.has(action.token) || (isWord(object) && !nonObjects.has(object.token)));
		const genericProhibition = splitProhibition
			? isFallback(token.gloss, ['', 'not']) && isFallback(tokens[i + 1].gloss, ['', 'good', 'well'])
			: isFallback(token.gloss, ['', 'bad', 'not good', "don't", 'do not']);
		if ((token.token === '唔好' || splitProhibition) && followsAction && genericProhibition) {
			output.push({ token: '唔好', gloss: "don't", mtype: 'BASE' });
			if (splitProhibition) i++;
			continue;
		}

		if (token.token === '未' && isWord(action) && actions.has(action.token) && !token.gloss) {
			token.gloss = 'not yet';
		}

		// V + 唔到, including split markers. Preserve the verb's existing gloss
		// and any specific supplied complement gloss (e.g. "couldn't manage").
		const previous = output[output.length - 1];
		const splitResult = token.token === '唔' && isWord(tokens[i + 1]) && tokens[i + 1].token === '到';
		if (isWord(previous) && Object.prototype.hasOwnProperty.call(resultVerbs, previous.token)
			&& (token.token === '唔到' || splitResult)
			&& isFallback(token.gloss, ['', 'no', 'not', 'not arrive', 'cannot', "can't"])
			&& (!splitResult || isFallback(tokens[i + 1].gloss, ['', 'arrive', 'reach', 'to', '(result)', '(resultative)']))) {
			output.push({ token: '唔到', gloss: "can't", mtype: 'BASE' });
			if (splitResult) i++;
			continue;
		}

		// Some tokenizers supply the entire negative verb as one token. Repair
		// only missing/generic glosses; a contextual phrase gloss is authoritative.
		if (token.token.endsWith('唔到')) {
			const verb = token.token.slice(0, -2);
			if (Object.prototype.hasOwnProperty.call(resultVerbs, verb) && isFallback(token.gloss, ['', 'no', 'not', 'cannot', "can't"])) {
				token.gloss = `can't ${resultVerbs[verb]}`;
			}
		}
		output.push(token);
	}
	return output;
}
