import type { AnnotatedToken, PhoneticToken } from '../types';
import ToJyutping from 'to-jyutping';
import { anyIn_ci } from '../utils/string';

/**
 * Adds Jyutping to existing Yue token boundaries without depending on the
 * static tokenizer or its trie.
 */
// Future MVB: SpellTokens(…) could probably be consolidated with other 'spelling' overrides (e.g. tokenizeAndSpellText2b's #3. Phonetic Overrides); especially when tokenizeAndSpell is separated.
export function spellTokens(_tokens:AnnotatedToken[]):AnnotatedToken[] {
	if (!_tokens) return [];
	// Future: ToJyutping alters spellings by Sentence context. Future: Feed in a whole "string" to get more accurate spellings, and then tokenize to original token-boundaries, rather than doing it on a per-token-word level.

	// Per-token-word spelling
	let tokens:AnnotatedToken[] = _tokens; // ~
	let verbAspectMarkers:string[] = [// <- to indicate that previous char was likely a verb instead of a noun - e.g. to statically differentiate "度"s "dou6 (place)" and "dok6 (measure)"
		"咗","緊","過",
		"晒","番",
		// "住","開","下", // <- ambiguous and not used for now - since in "度"s case, the noun-form (dou6 (place)) is much more common than the verb-case.
	]
	for (var i=0; i<tokens.length; i++) {
		let token:AnnotatedToken = tokens[i];
		let nextToken:AnnotatedToken|null = tokens[i+1] ?? null;
		if (token.isWord) {
			let jyutpingArray:[string, string|null][] = ToJyutping.getJyutpingList(token.text);

			// H: BRUTE FORCE - ToJyutping Single-Word Corrections:
			// 呢 : without brute-force ∂: x:"呢"(ne1), √:"呢個"(ni1 go3), √:呢樣(ni1 joeng6), x:呢度(nei1 dou6) …
			if (token.text.includes("呢")) jyutpingArray.forEach(i => { if(i[0]==='呢') i[1]='ni1'; });
			if (token.text.includes("棵")) jyutpingArray.forEach(i => { if(i[0]==='棵') i[1]='po1'; });
			if (token.text.includes("聲")) jyutpingArray.forEach(i => { if(i[0]==='聲') i[1]='seng1'; });
			if (token.text.includes("覺") && anyIn_ci("sleep/nap".split('/'),token.gloss)) jyutpingArray.forEach(i => { if(i[0]==='覺') i[1]='gaau3'; });
			if (token.text.includes("覺") && anyIn_ci("feel".split('/'),token.gloss)) jyutpingArray.forEach(i => { if(i[0]==='覺') i[1]='gok3'; });
			// 度 : Note: 度 = dou6 now, instead of 'dok6' - in updated ToJyutping
			if (token.text=="啤啤") jyutpingArray = [["啤",'bi4'],["啤",'bi1']]; // 啤啤 (baby)
			if (token.text=="成晚") jyutpingArray = [["成","seng4"],["晚","maan5"]];
			if (token.text=="坐") jyutpingArray = [["坐","co5"]];
			if (token.text=="儲") jyutpingArray = [["儲","cou5"]];
			if (token.text=="近") jyutpingArray = [["近","kan5"]];
			if (token.text=="度" && verbAspectMarkers.includes(nextToken?.text)) jyutpingArray = [["度","dok6"]];
			// if (token.text=="地下")) jyutpingArray = [["地","dei6"],["下","haa2"]]; // <- actually, data is already this
			// - using Pre-Determined Gloss (LLM-Glosser) for the spelling
			if (token.text=="抹" && anyIn_ci(["wipe","rub","mop","slip","take"],token.gloss)) jyutpingArray = [["抹","maat3"]];
			if (token.text=="畫" && anyIn_ci(["drawing","painting","picture"],token.gloss)) jyutpingArray = [["畫","waa2"]];
			if (token.text=="偈" && anyIn_ci(["chat","talk"],token.gloss)) jyutpingArray = [["偈","gai2"]];
			if (token.text=="頂" && anyIn_ci(["head","top","hat",],token.gloss)) jyutpingArray = [["頂","deng2"]];
			if (token.text=="彈" && anyIn_ci(["strum","pluck","play","instrument","music",],token.gloss)) jyutpingArray = [["彈","taan4"]];
			if (token.text=="正" && anyIn_ci("pure/genuine/good/awe/accurate/precise/exact".split('/'),token.gloss)) jyutpingArray = [["正","zeng3"]];
			if (token.text=="訂" && anyIn_ci("order/subscribe/book/reserve".split('/'),token.gloss)) jyutpingArray = [["訂","deng6"]];
			if (token.text=="定" && anyIn_ci("order/book/subscribe/deposit/down/pay".split('/'),token.gloss)) jyutpingArray = [["定","deng6"]];
			// . End Brute Force SingleWord ToJyutping Corrections

			// Format phonetics: (new tuple-based type first; deprecated object type is derived from it - 20260630).
			let phoneticToken: PhoneticToken|null = jyutpingArray.length
				? jyutpingArray.map(([chars, spelling]) => spelling ? [chars, spelling] : [chars])
				: null;
			token.phoneticToken = phoneticToken;
		}
	}
	// BRUTE FORCE - LANGTEXT-LEVEL OVERRIDES: (Would require more complex code to place it above (/efficient), since below tokens are brute merged afterwards)
	let langText:string = tokens.map(t=>t.text).join('');
	if (langText.includes("每朝")) {
		tokens.forEach(t => t.text.includes("朝") && t.phoneticToken?.forEach(([chars, spelling]) => chars === "朝" && (spelling = "ziu1")));
	}
	// . End Brute Force

	return tokens;
}
