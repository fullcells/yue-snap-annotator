import { canto3db_codepoints_prefixtrie as _rootTrie } from '../data/canto3db_codepoints_prefixtrie_20220530_with_oid.min'; // Heavy trie used only by the static tokenizer.
import type { AnnotatedToken } from '../types';

type CantoToken = {
	text: string;
	links: number[];
	is_word: boolean;
};

/**
 * Tokenizes Cantonese locally using the historical longest-prefix trie.
 * Keep this module lazy-loaded so API-based annotation does not load the trie.
 */
export function tokenize(text:string):AnnotatedToken[] {
	// SPLIT SENTENCE INTO CODEPOINTS
	let codepoints_remaining = Array.from(text); // Array.from(string) Splits strings by 'Codepoints'

	let tokens:CantoToken[] = []; // ~ currently a special type <- to be revised.
	let curTrieNode = _rootTrie; // ~ type?

	// 1. LOOP THROUGH SENTENCE CODEPOINTS AND IDENTIFY TOKENS
	while (codepoints_remaining.length > 0) {
		let latestIndexWithValidValue = -1;
		let latestValidLookupsValue = null;

		// Iterate through every remaining codepoint in sentence
		for (let i=0; i<codepoints_remaining.length; i++) {
			let curCodepoint = codepoints_remaining[i];
			let nextNode = curTrieNode[curCodepoint];
			// A. IF the current Trie Level can find the current Codepoint - STORE Current Values, and Keep trying to fill the Word.
			if (nextNode != null) {
				// Remember the current values up to this point (in case continued searches bear no fruit).
				let lookupValues = nextNode["•"];
				if (lookupValues != null) { //~
					latestIndexWithValidValue = i; // i.e. Remember the last Valid Position in the Sentence.
					latestValidLookupsValue = lookupValues;
				}
				// Progress along the Trie:
				curTrieNode = nextNode;
				// Don't break. Continue looping through the remaining codepoints trying to match what's available in the Trie.
			}

			// B. BREAKS:
			// - IF: the current Trie Level CAN NOT find the current Codepoint,
			// - OR, END OF SENTENCE.
			if ((nextNode == null)||(i == codepoints_remaining.length - 1)) {
				// B.i. A Valid Phrase is in Storage:
				if (latestIndexWithValidValue >= 0) {
					// The Previous phrase has hit a DEAD END. Record it up to it's [•] (not necessarily the previous codepoint).
					// To determine what amount should be recorded, look up the index & length of the last valid value, then record CodePoints up to that length.
					let recordLength = latestIndexWithValidValue+1; // starts at 0
					let popped_codepoints = codepoints_remaining.splice(0, recordLength).join("");

					// Record Original Text with no Links.
					let token:CantoToken = {
						text: popped_codepoints,
						links: latestValidLookupsValue,
						is_word: true
					};
					tokens.push(token);
					// Reset Search-Space and Continue
					curTrieNode = _rootTrie;
					break; // Continue onto next Codepoint.
				}

				// B.ii. A Valid Phrase is NOT in Storage:
				if (latestIndexWithValidValue == -1) {
					// POP 1 CODEPOINT INTO A TOKEN with NO LINKS.
					let token:CantoToken = {
						text: codepoints_remaining.splice(0, 1).join(""), // This outputs the splice, & updates/edits the array so the splice is taken out.
						links: [],
						is_word: false
					};
					tokens.push(token);

					// Reset Search-Space and Restart loop through Remaining Codepoints.
					curTrieNode = _rootTrie;
					break;
				}
			}

		} // End FOR Loop on codepoints_remaining.LENGTH
	} // End WHILE Loop on codepoints_remaining.LENGTH

	// 2. Combining Unfound (i.e. Non-Word) Tokens (e.g. so that Emojis can be retained)
	let shouldMergeUnfoundTokens = true;
	if (shouldMergeUnfoundTokens) {
		let mergedTokens:CantoToken[] = [];
		let newToken:CantoToken = { text: null, links: [], is_word: false };
		for (let i=0; i<tokens.length; i++) {
			let token = tokens[i];

			// If Token-in-Loop exists (i.e. is_word):
			if (token.is_word) {
				// Record Earlier Stored Token, if it exists. Then reset it.
				if (newToken.text != null) {
					mergedTokens.push(newToken)
					// Reset Stored Token
					newToken = { text: null, links: [], is_word: false };
				}
				// Add Token from Loop
				mergedTokens.push(token);
			}

			// If Token-in-Loop does not exist:
			if (token.is_word == false) {
				// New Stored Token?
				if (newToken.text == null) {
					newToken.text = token.text
					newToken.links = [] // not necessary
					newToken.is_word = false
				}
				// Existing Stored Token
				else {
					newToken.text = newToken.text + token.text
				}
			}

			// If Last Token, and token is not found. Make sure it gets added to the mergedTokens.
			if (i == (tokens.length-1)) {
				if (token.is_word == false) {
					mergedTokens.push(newToken)
				}
			}
		}
		tokens = mergedTokens;

		// Split Line Breaks into […, '\n', …]
		mergedTokens = [];
		for (let i=0; i<tokens.length; i++) {
			let token = tokens[i];
			if (!token.is_word) {
				let tokenStringByNewLine = token.text.split("\n");
				// if (tokenStringByNewLine.length>1) { console.log("> tokenStringByNewLine", tokenStringByNewLine);}
				for (let j=0; j<tokenStringByNewLine.length; j++) {
					let newSubToken:CantoToken = {
						text: tokenStringByNewLine[j],
						links: [], // not necessary
						is_word: false
					};
					mergedTokens.push(newSubToken);

					// Add a token containing the 'new line char'.
					if (j != tokenStringByNewLine.length-1) {
						mergedTokens.push({"text":"\n", "links":[], "is_word":false});
					}
				}
			} else {
				mergedTokens.push(token);
			}
		}
		tokens = mergedTokens;
	}

	// BRUTE FORCE SPLITTING // Should technically be done after 'spelling' (since spelling is per-word right now, rather than using sentence-context), but this is easiest for now.
	let brute_force_splits = {
		"食水": ["食", "水"],
		"食肉": ["食", "肉"],
		"冇嘢": ["冇", "嘢"],
		"嘢食": ["嘢", "食"],
		"讀書": ["讀", "書"],
		"個人": ["個", "人"],
		"大個": ["大", "個"],
		"老定": ["老", "定"],
		"要件": ["要", "件"],
		"個頭": ["個", "頭"],
		"打波": ["打", "波"],
		"海上": ["海", "上"],
		"上街": ["上", "街"],
		"定遠": ["定", "遠"],
		"人中": ["人", "中"],
		"要人": ["要", "人"],
		"有條紋": ["有", "條紋"],
		"人種" : ["人", "種"],
		"三十一號" : ["三十一", "號"],
		"七點鐘" : ["七", "點鐘"],
		"七日": ["七", "日"],
		"過啲": ["過", "啲"],
		"冰凍": ["冰", "凍"],
		"完場": ["完", "場"],
		"相對": ["相", "對"],
		"玩水": ["玩", "水"],
		"人為": ["人", "為"],
		"係咩": ["係", "咩"],
		"有水": ["有", "水"],
		"上畫": ["上", "畫"],
		"英文堂": ["英文", "堂"],
		"係要": [ "係", "要" ],
		"嚟嘅": [ "嚟", "嘅" ],
		"新地址": [ "新", "地址" ],
		"飲咖啡": [ "飲", "咖啡" ],
		"會死": [ "會", "死" ],
		"舊書": [ "舊", "書" ],
		"我係": [ "我", "係" ],

	}
	for (var i = 0; i < tokens.length; i++) {
		let token = tokens[i];
		let split_words = brute_force_splits[token.text];
		if (split_words) {
			let replacement_tokens = split_words.map((word) => ({ text: word, links: [], is_word: true }));
			tokens.splice(i, 1, ...replacement_tokens);
			i += replacement_tokens.length - 1; // skip past the newly added replacement tokens // -1 to compensate for removed token
		}
	}
	// . (End Brute Force Splitting) .

	// Format CantoTokens to AnnotatedTokens
	let annotatedTokens:AnnotatedToken[] = tokens.map(t => ({
		text: t.text,
		isWord: t.is_word ? 1 : 0
	}));

	return annotatedTokens;
}
