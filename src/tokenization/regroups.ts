import type { AnnotatedToken, PhoneticToken } from '../types';

/** Historical Cantonese token-boundary corrections, now owned by the Yue annotator. */
export const YUE_TOKEN_REGROUPS: string[] = [
		"嗰邊","唔見到","高難度","王帝","好凍","望下","好危險","好大","好驚","魔水", "熊仔", "好大部", "好大嘅", "好大個", "搵到", "唔搵到", "揾到", "唔揾到", "雙目鏡", "搵吓", "開咗", "好肚餓", "高地方", "一吓", "等一吓", "玉米卷", "魚玉米卷", "冇晒", "釣魚竿", "魚竿", "巴士飛", "露營地", "一隻", "同一隻", "邊度嚟㗎",
		"鐘唔鐘意", // mistwritten form of 鍾唔鍾意 （“鍾”）
		"一間", "一朵", "一條", "一件", "一杯", "同一個", "顏色", "桌上遊戲", "佢哋啲", "邊種", "教學生", "水喉匠", "水喉佬", "幾多蚊", "米高", "打緊機", "打緊電話", "幾條間", "幾條條紋", "開消防車",
		"好高","好忙","好嬲","好開心","好生氣","好難過","好細","好熱","好痛","好唔開心","好肚餓","好暖","好遠","好快","好驚","好難食","好細個","好危險","好長","好香",
		"上樓梯", "落樓梯", "佢瞓緊覺", "牌遊戲", "老婆婆", "月台", "買飛好長", "一班", "送禮物", "放風箏", "過咗期", "洗緊錢", "平定貴", "電影飛", "著住", "係咩種", "棒球員", "打緊牌", "食緊嘢", "有禮物", "一粒", "船上面", "一棵", "一幅", "盞燈", "一盞", "枱頂上面", "咩種", "有咩種", "一座", "火車飛", "一本", "啤啤熊", "一封信", "封信", "一本字典", "一條數學題", "睇緊張相", "畫幅畫", "一支", "一堂課", "左手邊", "洗碗盤", "新地址", "攀石", "坐住", "定定", "企定定", "解謎題", "溫緊", "溫緊書", "青蟲", "一首", "好慢", "超級英雄",
		"兩點","二點","三點","四點","五點","六點","七點","八點","九點","十點","十一點","十二點","1點","2點","3點","4點","5點","6點","7點","8點","9點","10點","11點","12點",
		"蕃茄汁", "打畀我", "同屋企人", "一條數學", "一封", "一本日記本", "軟軟", "每星期一次", "星期一次", "食物節", "花節", "好低", "双筒望遠鏡", "唔好理", "個體育場", "好夜", "巴布亞新畿內亞",
		"城巿", "睇緊張", "睇緊張卡", "喉管工人", "條規矩", "個體育館",
		"瞓緊覺", "瞓咗覺", "瞓完覺", "瞓醒覺",
		"一樖",
		"咩嚟嘅", "冇晒嘢", "一個字母", "一隻字母", "返學校",
		"着火",
		"活住", "沖緊涼", "好差",
		"卡拉ok吧", "卡拉ok酒吧", "卡拉ok", "卡拉 ok", // 20251219: NOTE: At a higher level, these often don't merge because the "OK" element higher up is usually a large token - e.g.: • x. 邊個唱緊卡拉OK ？ => [OK ？] • x. 卡拉 OK 酒吧 => [卡拉 OK ] • √. 唱卡拉OK => [卡拉OK]  // √ appropriately lowercased at least
		"蜡笔", "油漆掃",
		"播片",
		"一封信", "用緊張", "種咗", "種緊", "種滿", "新學生", "美食節", "燈籠節", "每朝",
		"邊邊", "對你好", "唱k", "人名單", "書枱燈", "羅里", "羅里車", "爆谷", "毛蟲", "毛虫",
		"二十三", "二十四",
		"圖伯特",
		"埃及豔后", "瑪麗居禮",
		"地墊",
		"佢個樣", "芙烈達·卡蘿",
	];

function getAllIndexes(substring: string, text: string): number[] {
	const indexes: number[] = [];
	let index = text.indexOf(substring);
	while (index !== -1) {
		indexes.push(index);
		index = text.indexOf(substring, index + 1);
	}
	return indexes;
}

function tokenIndexAtTextOffset(offset: number, tokens: AnnotatedToken[]): number {
	if (offset === 0) return 0;
	let length = 0;
	for (let index = 0; index < tokens.length; index += 1) {
		length += tokens[index].text.length;
		if (length === offset) return index + 1;
		if (length > offset) return -1;
	}
	return -1;
}

function mergeBetween(tokens: AnnotatedToken[], first: number, last: number): AnnotatedToken[] {
	if (first < 0 || last < 0 || first >= last) return tokens;
	const selected = tokens.slice(first, last + 1);
	const merged: AnnotatedToken = {
		text: selected.map(token => token.text).join(''),
		isWord: selected.some(token => token.isWord === 1) ? 1 : 0,
	};
	if (tokens.some(token => Object.prototype.hasOwnProperty.call(token, 'gloss'))) {
		merged.gloss = selected.map(token => token.gloss ?? '').join(' ').replace(/\s+/g, ' ').trim() || null;
	}
	if (tokens.some(token => Object.prototype.hasOwnProperty.call(token, 'phoneticToken'))) {
		merged.phoneticToken = selected.every(token => !token.phoneticToken)
			? null
			: selected.flatMap((token): PhoneticToken => token.phoneticToken ?? [[token.text]]);
	}
	return [...tokens.slice(0, first), merged, ...tokens.slice(last + 1)];
}

/** Merges configured phrases only when both phrase ends align with token boundaries. */
export function regroupYueTokens(initialTokens: AnnotatedToken[]): AnnotatedToken[] {
	let tokens = initialTokens.map(token => ({ ...token }));
	const text = tokens.map(token => token.text).join('');
	for (const word of [...YUE_TOKEN_REGROUPS].sort((a, b) => b.length - a.length)) {
		const comparableWord = word.toUpperCase();
		const comparableText = text.toUpperCase();
		if (!comparableText.includes(comparableWord)) continue;
		for (const offset of getAllIndexes(comparableWord, comparableText)) {
			const first = tokenIndexAtTextOffset(offset, tokens);
			const afterLast = tokenIndexAtTextOffset(offset + word.length, tokens);
			if (first !== -1 && afterLast !== -1) tokens = mergeBetween(tokens, first, afterLast - 1);
		}
	}
	return tokens;
}
