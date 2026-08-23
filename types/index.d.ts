export type PhoneticPart = [chars: string] | [chars: string, spelling: string];
export type PhoneticToken = PhoneticPart[];

export type AnnotatedToken = {
	text: string;
	isWord: number;
	gloss?: string | null;
	phoneticToken?: PhoneticToken | null;
};

export type SBWordRow2 = {
	id: number;
	word_lang: string;
	word: string;
	gloss: string;
	gloss_lang: string;
	is_core: boolean;
	created_at: string;
	is_human_verified: boolean;
};

export type CantoneseTokenGloss = {
	token: string;
	gloss: string;
	mtype: 'BASE' | 'N/A';
};

export type YueAnnotateOptions = {
	latestSBWords?: SBWordRow2[];
};

export type YueSBWords = SBWordRow2[];
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

export function annotate(text: string, options?: YueAnnotateOptions): Promise<AnnotatedToken[]>;
export function tokenizeAndSpell(text: string): AnnotatedToken[];
export function tokenize(text: string): AnnotatedToken[];
export function spellTokens(tokens: AnnotatedToken[]): AnnotatedToken[];
export function annotateCantoneseTokenGlosses(tokens: CantoneseTokenGloss[], text: string): AnnotatedToken[];
export function applyYueSBWordsGlosses(tokens: AnnotatedToken[], rows: YueSBWords): AnnotatedToken[];
export function getSnapshotYueSBWords(): Promise<YueSBWords>;
export function refreshYueSBWordsSnapshot(options?: {
	force?: boolean;
	endpointUrl?: string;
}): Promise<YueSBWordsSnapshotRefreshResult>;
