import { spellTokens } from '../spelling/spelling';
import { regroupYueTokens } from '../tokenization/regroups';
import { tokenize } from '../tokenization/static-tokenizer';
import {
	annotateCantoneseTokenGlosses,
	type CantoneseTokenGloss,
} from '../treatments/deterministic';
import {
	applyYueSBWordsGlosses,
	getSnapshotYueSBWords,
} from '../snapshot/yue-sb-words';
import type { AnnotatedToken, SBWordRow2 } from '../types';

export type YueAnnotateOptions = {
	latestSBWords?: SBWordRow2[];
};

function asCantoneseTokenGlosses(tokens: AnnotatedToken[]): CantoneseTokenGloss[] {
	return tokens.map(token => ({
		token: token.text,
		gloss: token.gloss ?? '',
		mtype: token.isWord ? 'BASE' : 'N/A',
	}));
}

function simplifyLocalGlosses(tokens: AnnotatedToken[]): AnnotatedToken[] {
	// simplifyLocalGlosses is only applied to complete end-to-end deterministic `annotate`.
	return tokens.map(token => {
		let gloss = token.gloss;
		if (token.text === '冇') gloss = 'no';
		if (token.text === '佢' || token.text === '佢哋') gloss = 'they';
		if (token.text === '都') gloss = 'al(so)';
		if (token.text === '好') gloss = '︽';
		if (gloss?.includes('/')) gloss = gloss.split('/', 1)[0].trim();
		return gloss === token.gloss ? token : { ...token, gloss };
	});
}

/** Performs complete deterministic Cantonese annotation. */
export async function annotate(text: string, options: YueAnnotateOptions = {}): Promise<AnnotatedToken[]> {
	if (!text) return [];

	const yueSBWords = options.latestSBWords ?? await getSnapshotYueSBWords();
	let tokens = regroupYueTokens(tokenize(text));
	tokens = applyYueSBWordsGlosses(tokens, yueSBWords);
	tokens = annotateCantoneseTokenGlosses(asCantoneseTokenGlosses(tokens), text);
	// Retokenization can expose dictionary words that were not lookup candidates
	// before deterministic splitting, so fill remaining gaps once more.
	tokens = applyYueSBWordsGlosses(tokens, yueSBWords);
	tokens = simplifyLocalGlosses(tokens);
	// A whole-text dictionary word follows Lingoprocessor's single-word path:
	// the specific words2 gloss is authoritative and should not be shortened by
	// generic deterministic cleanup or slash simplification.
	if (tokens.length === 1 && tokens[0].isWord && tokens[0].text === text) {
		const dictionaryToken = applyYueSBWordsGlosses(
			[{ ...tokens[0], gloss: null }],
			yueSBWords,
		)[0];
		if (dictionaryToken.gloss) tokens = [dictionaryToken];
	}
	return spellTokens(tokens);
}

/** Tokenizes and adds Jyutping without applying bundled glosses. */
export function tokenizeAndSpell(text: string): AnnotatedToken[] {
	return spellTokens(regroupYueTokens(tokenize(text)));
}
