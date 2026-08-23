import type { AnnotatedToken } from './index';

export type CantoneseTokenGloss = {
	token: string;
	gloss: string;
	mtype: 'BASE' | 'N/A';
};

export function annotateCantoneseTokenGlosses(
	tokens: CantoneseTokenGloss[],
	text: string,
): AnnotatedToken[];
