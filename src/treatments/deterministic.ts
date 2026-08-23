import type { AnnotatedToken } from '../types';
import { ilike, anyIn_ci } from '../utils/string';

export type CantoneseTokenGloss = {
	token: string;
	gloss: string;
	mtype: 'BASE' | 'N/A';
};

type TokenRemerge = {
	gloss: string;
	mtype: CantoneseTokenGloss['mtype'];
	textOverride?: string;
};

/** Applies deterministic Cantonese retokenization and gloss overrides. */
export function annotateCantoneseTokenGlosses(initialTokens: CantoneseTokenGloss[], text: string): AnnotatedToken[] {
	let tokens = initialTokens.map(token => ({ ...token }));
	// 2.0 SINGLE TOKEN REWRITES
	let yueSingleTokenRewrites = {
		// - Cantonese-specific words - its occasionally struggles with this
		"三文治":"sandwich",
		"紅蘿蔔":"carrot",
		// - it struggled initially with keeping words together (like 媽媽，爸爸)
		"男人":"man",
		"女人":"woman",
		// - standard words' fixes
		"黃色":"yellow",
		"時間":"time",
		"入便":"inside",
		"唔係":"is not",
		"唔同":"different",  // ~ may have to be removed later if too excessive
		"動物":"animal",
		"醫生":"doctor",
		"描述":"describe",
		"嗰個":"that",
		"附近":"nearby",
		// "一個":"one", // splitting instead
		"整親":"accidentally hurt",
		"身體":"body",
		"部位":"body part",
		"整好":"fix",
		"另外":"other",
		"點鐘":"o'clock",
		"幾點鐘":"what time",
		"唔好意思":"excuse me",
		"嗰陣":"that time",
		"芙烈達·卡蘿":"Frida Kahlo",
		"威廉·莎士比亞":"William Shakespeare",
		"分鐘":"minute",
		"媽媽":"mother",
		"爸爸":"father",
		"消防員":"firefighter",
		"係咪":"is?",
		"隔籬":"next to",
		"隔離":"next to",
		"酒店":"hotel",
		"朋友":"friend",
		"倒瀉":"spill",
		"得到":"attain",
		"亦都":"also",
		// - Original TokenText Overrides:
		"個":"(the)",
		"唔":"not",
		"係":"is", // as opposed to "be"
		"飲品":"beverage",
		"咗":"-ed",
		"覺得":"feel",
		"而且":"furthermore",
		// "邊樣":"which kind", // <- splitting
		"定係":"or?",
		"細路":"child", // as opposed to 'kid'
		// "句":"sentence", // <- disabled now
		'說話':'utterance',
		"啤啤":"baby",
		"邊份":"which portion",
		// "每個":"each", // splitting instead
		"佢哋":"they-PL", // or: they-PL uses 'GLOSS-ABBRV' which would make it an exception / 'they all' too long when part of 佢哋嘅
		// "啲":"some", // x. "some" was too overly prescriptive/aggressive.
		"咪":"not is",
		"差人":"police officer",
		"貼":"stick",
		"檸檬水":"lemonade",
		"歲":"years old",
		"多謝":"thanks (for gift)",
		"呢個":"this",
		"而":"also", // ~
		"返學":"go to school",
		// -
		"香蕉":"banana",
		"洗手間":"restroom",
		"食晏":"eat lunch",
		"櫈":"chair",
		"唔開心":"sad",
		"地方":"place",
		"入面":"inside",
		"兔仔":"rabbit",
		"耐":"long (time)",
		"下面":"below",
		"部分":"part",
		// "嗰樣":"that kind", // ~
		"鍾意":"like",
		"唔同咁多":"different amount of",
		"幾耐":"how long (time)",
		"再見":"goodbye",
		"鍾唔鍾意":"like ?",
		"頸圈":"collar",
		"鼻哥":"nose",
		"我哋":"we",
		"幾時":"when",
		"幾歲":"how old",
		"嚟㗎":"(is)",
		"邊度嚟㗎":"where from", // this merges, then will be resplit below
		"想要":"want",
		"需要":"need",
		"嗎":"?",
		"可唔可以":"can ?",
		"咩":"what",
		"消防車":"fire engine",
		"一定":"certainly",
		"樖":"(plant)", "棵":"(plant)",
		"最少":"least", // to avoid confusion when split as [most, few]
		"最多":"most", // to mirror 最少
		"電影":"movie",
		"單":"bill", // (more often than not, it should be 'bill' but not glossed as such atm)
		"信用卡":"credit card",
		"封信":"envelope", // common enough to merge, despite individually meaning [(enveloped), letter (mail)]
		"相信":"believe",
		"上網":"online",
		"字母":"letter (alphabet)",
		"第":"#",
		"地下":"ground floor",
		"下午":"afternoon",
		"星期":"week",
		"星期日":"Sunday", "星期一":"Monday", "星期二":"Tuesday", "星期三":"Wednesday", "星期四":"Thursday", "星期五":"Friday", "星期六":"Saturday",
		"太陽落山":"sunset",
		"起上嚟":"upon doing",
		"哥哥":"older brother", "弟弟":"younger brother", "家姐":"older sister", "妹妹":"younger sister",
		"阿婆":"mom's mom", "阿嫲":"dad's mom", "阿公":"mom's dad", "阿爺":"dad's dad",
		"外公": "mom's dad", "爺爺": "dad's dad", "外婆": "mom's mom", "奶奶": "dad's mom",
		"舅父": "mom's brother", "伯伯": "dad's older-brother", "叔叔": "dad's younger-brother", "姨媽": "mom's older-sister", "阿姨": "mom's younger-sister", "姑媽": "dad's older-sister", "姑姐": "dad's younger-sister",
		"瞓緊覺": "sleeping",
		"巴布亞新畿內亞": "Papua New Guinea",
		"識": "know",
		"英文": "English language",
		"知道": "know",
		"幾點":"what time",
		"手錶":"wristwatch",
		"短褸":"jacket",
		"喺度":"here",
		"今日":"today",
		"星期幾":"day of week ?",
		"消防局":"fire station",
		"學生":"student",
		"種嘢食":"grow things eat",
		"艘":"(ship)",
		"粒":"(grain)",
		"天空":"sky",
		"充滿":"full of",
		"返嚟":"return",
		"唔見咗":"lost (object)",
		"間條":"stripe",
		"向住":"face towards",
		"東邊":"east side",
		"升起":"rise up",
		"過咗期":"expired",
		"過嚟":"come over",
		"冇晒":"no more",
		"銀行":"bank",
		"之前":"before",
		"老":"old (age)",
		"女仔":"girl",
		"朝早":"morning",
		"桌上遊戲":"board game",
		"BB":"baby",
		"星期未":"weekend",
		"出名":"famous",
		"拎":"carry",
		'定定':'steadily',
		'讀書會':'book club', // for later splitting
		'睇落':'seems',
		'落雪':'snow',
		'趕唔切':'miss appointed',
		'唔係就':'else',
		'之外':'(other than)',
		'嚟自':'come from',
		'所以':'so',
		'玩具':'toy',
		'早啲':'earlier',
		'裝':'fill',
		'瞓醒覺':'sleep enough',
		'瞓咗覺':'sleep -ed',
		'行開':'walk away',
		'跑走':'run away',
		'網站':'website',
		'網上':'online',
		'生日':'birthday',
		'足球':'soccer',
		'嚟㗎咩':`is that so?`,
		'上面':`on top`,
		'人哋':`people`,
		'對唔住':`sorry`,
		'地上':`ground`,
		'通常':`usually`,
	}

	// 2.1 BRUTE TOKEN RE-MERGES/RE-GROUPS
	let bruteTokenRemerges = {}
	// - YUE SINGLE-TOKEN REWRITES: (used to MERGE Tokens in bruteTokenMerges, and REWRITE-GLOSS of LLM Tokens) (Not used in Splitting Tokens)
	Object.assign(bruteTokenRemerges, Object.fromEntries(Object.entries(yueSingleTokenRewrites).filter(([k]) => k.length > 1).map(([k,v]) => [k, {gloss:v, mtype:"BASE"}])));
	// + Conditional Additions:
	if (["你好。", "你好」"].some(t=>text.toLowerCase().includes(t))) {
		bruteTokenRemerges["你好"] = {gloss:"\"Greetings\"",mtype:"BASE"};
	}
	if (!["口"].some(t=>text.toLowerCase().includes(t))) {
		bruteTokenRemerges["嚟講"] = {gloss:`'s POV`,mtype:"BASE"};
	}
	tokens = applyTokenRemerges(tokens, bruteTokenRemerges);

	// LANG HELPERS
	const yueNumbers: { [native: string]: string } = {
		"一": "one", "兩": "two", "三": "three", "四": "four", "五": "five",
		"六": "six", "七": "seven", "八": "eight", "九": "nine", "十": "ten",
		"十一": "eleven", "十二": "twelve",
	};
	const yueClassifiers: { [native: string]: string } = {
		"個": "(the)", "隻": "(a)", "條": "(long)",
		"本": "(book)", "張": "(flat)", "間": "(space)",
		"點鐘": "o'clock", "點半": "thirty", "歲": "years_old",
		"幅": "(canvas)", "次": "(times)",
	};
	// const yuePersonalPronouns:string[] = ["我","你","佢","我哋","你哋","佢哋"];

	// 2.2 BRUTE TOKEN SPLITS (Only applies to YUE + JA atm)
	let simpleSplits:{[words:string]:/*glosses*/string} = {}; // split by spaces
	simpleSplits = {...simpleSplits, ...{
		// - potential future todo: use SBWords to determine the gloss here (though that may not always be accurate e.g. if a characters meaning is changed by the fact that its part of a compound word))
		"嗰 樣": "that kind",
		"窗 邊": "window side",
		"動物 醫生": "animal doctor",
		"講 咗": "say -ed",
		"做 咗": "do -ed",
		"見 到": "see -ed",
		"早 過": "early -er_than", // use underscore for single-morpheme glosses
		"少 過": "few -er_than",
		"傾 緊": "chat -ing",
		"畫 緊": "draw -ing",
		"做 緊": "do -ing",
		"問 緊": "ask -ing",
		"戴 住": "wear -ing",

		"每 句": "each (sentence)",
		"每 人": "each person",
		"高 大": "tall big",
		"每 個 人": "each (the) person",

		"身體 部位": "body body_part",
		"高 個": "tall (the)",
		"四 隻 腳": "four (a) leg",

		// "鍾 唔":"like not", // Decided to combine 鍾唔鍾意 instead
		"細 浴室":"small bathroom_(private)",
		// "唔 開心":"not happy", // - merging instead
		"每 個":"each (the)",
		"街 上":"street on",
		"邊 樣":"which kind-of",
		"邊 樣 嘢":"which kind-of thing",
		"老 婆婆":"age_(old) woman",
		"一 個":"one (the)",
		"邊 份":"which portion",

		"畫 住":"draw -ing",
		"邊 個 地方":"which - place",
		"邊 個 人":"which - person",
		"揀 咗":"choose -ed",
		"最 高":"most tall",
		"細 貓":"small cat",
		"邊度 嚟 㗎":"where from 。",
		"左 邊":"left side",
		"右 邊":"right side",
		"黑 白":"black white",
		"德國 旗":"German flag",
		"種 嘢 食":"grow things eat",
		'搭 的士':'ride taxi',
		"三 星":'three stars', // else it gets glossed as 'samsung'
		"零 星":'zero stars',
		"攬 住":'hug -ing',
		"嗰 日":'that day',
		'拎 走':'take away',
		'拎 住':'carry -ing',
		"有 啲":"have a_bit",
		"大 動物":"big animal",
		"窗 外":"window outside",
		"木 籬笆":"wood fence",
		"青 蘋果":"green apple",
		"車 窗":"car window",
		"四 季":"four seasons",
		"遲 到":"late arrive",
		"下 年":"next year",
		"生日 派對":"birthday party",
		"讀書 會":"book club",
		"諗 住":"think -ing",
		"上 年":"previous year",
		"拼圖 塊":"puzzle piece",
		'落 車':'alight vehicle',
		'禮貌 說話':'polite utterance',
		'睇 戲':'watch movie',
		'金 色':'gold color',
		'軟 軟':'soft soft',
		'第 一 次':'# first time',
		'裝 滿':'fill full',
		'做 晒':'do all',
		'好 啲':'good -er',
		'最 大':'most big',
		'最 細':'most small',
		'最 好':'most good',
		'最 多':'most many',
		'最 少':'most few',
		'多 啲':'more -er',
		'少 啲':'less -er',
		'最 遲':'most late',
		'最 早':'most early',
	}}
	// - adding 'numbers' to splits
	for (const [cl, gloss] of Object.entries(yueClassifiers)) {
			for (const [num, enNum] of Object.entries(yueNumbers)) {
					simpleSplits[`${num} ${cl}`] = `${enNum} ${gloss}`;
			}
	}

	Object.entries(simpleSplits).forEach(([k, g]) => {
		if (k.split(" ").length !== g.split(" ").length) {
				console.log(`⚠️ simpleSplits mismatch: "${k}" → "${g}"`);
				delete simpleSplits[k];
		}
	});
	const glossFormatFromSimple = (simple: Record<string, string>): Record<string, { token: string; gloss: string; mtype: "BASE" }[]> =>
	Object.fromEntries(
		Object.entries(simple).map(([k, g]) => [
			k.replace(/ /g, ""),
			k.split(" ").map((t, i) => ({
				token: t,
				gloss: g.split(" ")[i].replace(/_/g, " "),
				mtype: "BASE",
			})),
		])
	);
	const bruteTokenSplits = glossFormatFromSimple(simpleSplits);

	if (text.includes("最近嘅")) {
		bruteTokenSplits["最近"] = [{ token: "最", gloss: "most", mtype: "BASE" }, { token: "近", gloss: "near", mtype: "BASE" },];
	}

	tokens = applyTokenSplits(tokens, bruteTokenSplits);

	// 2.3 PROCESS EACH LLM-TOKEN TO ANNOTATED-TOKEN
	const annotatedTokens: AnnotatedToken[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const t = tokens[i];
		let gloss:string|null = t.gloss || null;
		let tokenText = t.token;
		const prevLLMToken:any|null = tokens[i-1] ?? null;
		const nextLLMToken:any|null = tokens[i+1] ?? null;
		const prevLLMTokens: any[] = tokens.slice(0, i);
		const nextLLMTokens: any[] = tokens.slice(i + 1);
		const nextLLMTokensOnCurLine: any[] = [];
		for (const t of nextLLMTokens) {
			if (["\n","\r"].includes(t.token)) break;
			nextLLMTokensOnCurLine.push(t);
		}

		// i. REWRITES
		if (true) {
			if (tokenText in yueSingleTokenRewrites) gloss = yueSingleTokenRewrites[tokenText];

			// 佢
			if (tokenText == "佢") { // Example LLM Results: "he/him/his", "he/she/they", "s/he", "he/she/it"
				// Exact match
				const exactMatch:boolean = ["he","she","it","her","his"].some(g => gloss?.toLowerCase() == g);
				// Single-Gender Check
				const parts = gloss?.toLowerCase().split("/").map(p => p.trim());
				const allMale   = parts.every(p => ["he","him","his"].includes(p));
				const allFemale = parts.every(p => ["she","her","hers"].includes(p));
				// Set
				if (!exactMatch) {
					if (allMale) gloss = "he/him/his";
					if (allFemale) gloss = "she/her/hers";
					if (!allMale && !allFemale) gloss = "he/she/it"; // Default
				}
			}
			// 色
			if (tokenText.includes("色")) {
				if (anyIn_ci(["color"], gloss)) { // Convert "red (color)" / "red [color]" / "red-color" / "red color" => "red"
					gloss = gloss
							.replace(/\s*[\(\[]\s*color\s*[\)\]]\s*/gi, " ")   // remove (color) / [color]
							.replace(/\s*-\s*color\b/gi, "")                   // remove -color
							.replace(/\bcolor\b/gi, "")                        // remove standalone "color"
							.trim().replace(/\s+/g, " ");                      // collapse extra spaces
				}
				// Override for "color" // e.g. 顏色
				if (gloss?.length == 0) gloss="color";
				// Override for Orange:
				if (tokenText == "橙色") gloss="orange (color)";
			}
			// 嘅
			if (tokenText == "嘅") {
				if (anyIn_ci(["ATT","ATR","LK","when"], gloss)) gloss="-"; // Note: Sometimes misclassifies as "ATR" instead of "POS" - if this persists, then just gloss both as "'"
				if (anyIn_ci(["POS","'S"], gloss)) gloss="'s";
				if (anyIn_ci(["FP"], gloss)) gloss="。";
				// - More Manual Overrides (Can potentially remove the LLM Tags from the prompt later)
				if (anyIn_ci(["佢","人","仔","果"], prevLLMToken?.token)) gloss="'s";
				if (anyIn_ci(["?","？"], gloss)) gloss="。";
				if (!nextLLMToken) gloss="。";
				// H: Technically "(is)" and "。" could be merged - but let's wait and give these ones a bit more time/data to see what's appropriate - 20260817
			}
			// kind of
			if (tokenText == "樣") {
				if (prevLLMToken?.token == "嗰") gloss="kind of"; // joeng // more general/all-purpose
				if (anyIn_ci(["kind","type","sort","variety","item","one","thing","kind of"], gloss)) gloss="kind of"; // joeng // more general/all-purpose
			}
			if (tokenText == "種" && anyIn_ci(["kind","type","sort","class","item"], gloss)) gloss="type of"; // zung // more specific/scientific
			// - aspect
			if (tokenText == "住" && anyIn_ci(["ing","cont","mark"], gloss)) gloss="-ing";
			if (tokenText == "住" && anyIn_ci(["live","stay","at"], gloss)) gloss="reside";
			if (tokenText == "緊" && anyIn_ci(["ing","ongo","process","aspect","mark"], gloss)) gloss="-ing";
			// - classifier
			if (tokenText == "隻" && anyIn_ci(["cl","animal","eye","hand","dog","("], gloss)) gloss="(a)";
			if (tokenText == "件" && anyIn_ci(["cl","piece"], gloss)) gloss="(piece)";
			if (tokenText == "條" && anyIn_ci(["cl","(","long","fish","narrow","slip","strip"], gloss)) gloss="(long)";
			if (tokenText == "份" && anyIn_ci(["cl","(","portion"], gloss)) gloss="(portion)";
			if (tokenText == "一個" && anyIn_ci(["person"], gloss)) gloss="one";
			if (tokenText == "幅" && anyIn_ci(["cl","(","pic","photo","paint","draw","art"], gloss)) gloss="(canvas)";
			if (tokenText == "幅" && anyIn_ci(["cloth"], gloss)) gloss="(width)";
			if (tokenText == "間") {
				if (anyIn_ci(["cl","(","institution"], gloss)) gloss="(space)";
				if (anyIn_ci(["room"], gloss)) gloss="(room)";
			}
			if (tokenText == "朵" && anyIn_ci(["flower"], gloss)) gloss="(flower)";
			//
			// ---
			if (tokenText == "配" && anyIn_ci(["pair","match","with","assign"], gloss)) gloss="goes with";
			if (tokenText == "邊個") {
				if (gloss?.toLowerCase() === "whose") { gloss="whose"; } else {
					if (anyIn_ci(["person"], gloss)) gloss="who";
					if (gloss?.toLowerCase() === "who") gloss="who";
				}
				if (anyIn_ci(["which"], gloss)) gloss="which";
				if (anyIn_ci(["人","仔","細佬","季節","光"], nextLLMToken?.token)) gloss="which"; // as in 'which person'
				if (anyIn_ci(["幫",], nextLLMToken?.token)) gloss="who";
			}
			if (tokenText == "度") {
				const verbAspectMarkers = ["咗","緊","過","晒","番"];
				gloss = verbAspectMarkers.includes(nextLLMToken?.token) ? "measure" : "location";
			}

			if (tokenText == "過" && anyIn_ci(["than"], gloss)) gloss="-er than";
			if (tokenText == "圓形") {
				if (gloss?.split(/[ (]/).length>1) gloss="circular";
				if (anyIn_ci(["round"], gloss)) gloss="circular";
			}
			if (tokenText == "幫" && anyIn_ci(["help"], gloss)) gloss="help";
			if (tokenText == "喺" && anyIn_ci(["at"], gloss)) gloss="at"; // simplifies from "at/on" for "wearing accessories"
			if (tokenText == "叫") {
				if (anyIn_ci(["name"], gloss)) gloss="named";
				if (["call", "called"].some(g=>gloss?.toLowerCase()==g)) gloss="named";
			}
			if (gloss=="FP") gloss = "。";
			if (tokenText == "呀" || tokenText == "啊") { // ~ 吖 / ㄚ
				if (!nextLLMToken || anyIn_ci([".","。",",","，"], nextLLMToken?.token)) gloss = "~";
				if (anyIn_ci(["?","？"], nextLLMToken?.token)) gloss = "?";
				if (anyIn_ci(["Q","?"], gloss)) gloss="?";
			}
			if (tokenText == "第" && anyIn_ci(["ord","ordinal"], gloss)) gloss="#";
			if (tokenText == "板球" && !anyIn_ci(["ball"], gloss)) gloss="cricket (sport)";
			if (tokenText == "要") {
				if (anyIn_ci(["need"], gloss)) gloss="need"; // converts "need to" to "need"
				if (!anyIn_ci(["must","need"], gloss)) gloss="covet";

			}
			if (tokenText == "衫") {
				if (text.includes("件")) { // more accurate to say if 件 existed in any of the 4 previous tokens
					gloss = "shirt";
				} else if (nextLLMToken?.token == "舖") {
					gloss = "clothes";
				} else {
					gloss = "shirt / clothes";
				}
			}
			if (tokenText == "有" && !prevLLMToken) gloss = "there is";
			if (tokenText == "架") {
				if (anyIn_ci(["的士","巴士","車","飛機","船%"], nextLLMToken?.token)) gloss = "(vehicle)";
				if (anyIn_ci(["shelf","rack"], gloss)) gloss="shelf";
			}
			if (tokenText == "張") {
				if (nextLLMToken && anyIn_ci(["bow","mouth"], gloss)) {
					gloss = "(stretchable)"
				} else { gloss = "(flat)"}
			}
			if (tokenText == "影" && anyIn_ci(["take","photo","picture"], gloss)) gloss="snap photo";
			if (tokenText == "信" && anyIn_ci(["letter"], gloss)) gloss="letter (mail)";
			if (tokenText == "下" && anyIn_ci(["brief","little","try", "bit"], gloss)) gloss="a bit";
			if (tokenText == "上" && anyIn_ci(["embark","board"], gloss)) gloss="embark";
			if (tokenText == "頂" && anyIn_ci(["(","cl","hat"], gloss)) gloss="(overhead)";
			if (tokenText == "落山" && text.includes("太陽")) gloss="sunset";
			if (["我","你","佢","我哋","你哋","佢哋"].includes(tokenText)) {
				if (anyIn_ci([...Object.keys(yueClassifiers),"嘅"], nextLLMToken?.token)) {
					if (tokenText=="我") gloss="my";
					if (tokenText=="你") gloss="your";
					if (tokenText=="佢") gloss="their";
					if (tokenText=="我哋") gloss="our";
					if (tokenText=="你哋") gloss="y'all's";
					if (tokenText=="佢哋") gloss="their";
				}
			}
			if (tokenText == "本" && anyIn_ci(["(","cl","book","vol","the"], gloss)) gloss="(book)";
			if (tokenText == "部") {
				if (anyIn_ci(["film","movie"], gloss) || anyIn_ci(["film","movie"], nextLLMToken?.gloss)) {
					gloss = "(film)";
				} else if (anyIn_ci(["book","tome","dictionary","novel"], nextLLMToken?.gloss)) {
					gloss = "(tome)";
				} else {
					if (anyIn_ci(["(","cl","device","phone","vehicle","unit","the"], gloss)) gloss="(mechanical)";
				}
			}
			if (tokenText == "支" && anyIn_ci(["(","cl","stick"], gloss)) gloss="(slender)";
			if (tokenText == "彈" && anyIn_ci(["play","music","instrument"], gloss)) gloss="strum";
			if (tokenText == "班") {
				if (anyIn_ci(["(","cl"], gloss)) {
					if (anyIn_ci(["bus","flight","train","schedule","run"], gloss)) {
						gloss="(scheduled)";
					} else if (anyIn_ci(["class"], gloss) || anyIn_ci(["student"],nextLLMToken?.gloss)) {
						gloss="(class)";
					} else { gloss="(squad)"; } // "group"
				}
			}
			if (tokenText == "搭" && anyIn_ci(["take","vehicle","ride",'transit','transport','travel'],gloss)) gloss="ride";
			if (tokenText == "棟") {
				if (anyIn_ci(["(","cl"],gloss)) gloss="(towering)";
			}
			if (tokenText == "套" && anyIn_ci(["film","movie"],nextLLMToken?.gloss)) gloss="(film)";

			if (tokenText == "套" && anyIn_ci(["戲","電影"],text)) gloss="(film)";
			if (tokenText == "點" && anyIn_ci(['point'],gloss)) gloss="dot";
			if (tokenText == "打" && anyIn_ci(['call','phone'],gloss)) gloss="call";
			if (tokenText == "打" && anyIn_ci(['(','cl','pair'],gloss)) gloss="(pair)";
			if (tokenText == "返" && anyIn_ci(['back'],gloss)) gloss="re-";
			if (tokenText == "幫手") {
				if (anyIn_ci(['helpers'],gloss)) { gloss="helpers"; } else
				if (anyIn_ci(['helper'],gloss)) { gloss="helper"; } else {
					gloss = "help";
				}
			}
			if (tokenText == "幾多") {
				if (anyIn_ci(['how'], gloss)) {
					if (anyIn_ci(['much'],gloss) || ["錢"].some(t=>nextLLMToken?.text == t)) { gloss="how much"; }
					else if (anyIn_ci(['many'],gloss)) { gloss="how many"; } else { /*…+…*/ }
				}
			}
			if (tokenText == "得") { // 得 rule here is deprecatable now that its moved to LLM Prompt
				if (anyIn_ci(['ready','obtain'],gloss)) { gloss="-ed °" }
				else if (anyIn_ci(['allow','get'],gloss)) { gloss="able" }
			}
			if (tokenText == "過") {
				if (anyIn_ci(['cross'],gloss)) gloss="across";
				if (anyIn_ci(['cross'],gloss)) gloss="over"; // intentionally overrides 'across'
			}
			if (tokenText == "晒") {
				if (anyIn_ci(['entirely','totally','completely'],gloss) || gloss?.toLowerCase().endsWith("ly")) gloss="completely";
				if (ilike(gloss,'all')) gloss="all!";
			}
			if (tokenText == "波" && anyIn_ci(['ball'],gloss)) gloss="ball";
			if (tokenText == "次") {
				if (anyIn_ci(['(','cl'],gloss)) {
					if (anyIn_ci(['time'],gloss)) gloss="(times)";
				}
			}
			if (tokenText == "釣" && anyIn_ci(['fish'],gloss)) gloss="to fish";
			if (tokenText == "將" && anyIn_ci(['take','will'],gloss)) gloss="about to:";
			if (tokenText == "搞" && anyIn_ci(['hold'],gloss)) gloss="organize";
			if (tokenText == "啦") {
				if (anyIn_ci(['(','fp'],gloss)) gloss="。";
				if (!gloss) gloss="。";
			}
			if (tokenText == "啱" && anyIn_ci(['match'],gloss)) gloss="fit";
			if (tokenText == "座" && anyIn_ci(['(','mountain','hill','bridge','building','large','huge'],gloss)) gloss="(immense)";
			if (tokenText == "把" && anyIn_ci(['('],gloss)) gloss="(graspable)";
			if (tokenText == "隊" && anyIn_ci(['('],gloss)) gloss="(team)";
			if (tokenText == "片" && anyIn_ci(['('],gloss)) gloss="(slice)";
			if (tokenText == "首" && anyIn_ci(['('],gloss)) gloss="(lyrical)";
			if (tokenText == "健康" && !anyIn_ci(['health','healthy'],gloss)) gloss="healthy";
			if (tokenText == "堂" && anyIn_ci(['('],gloss)) gloss="(class)";
			if (tokenText == "夜" && anyIn_ci(['late'],gloss)) gloss="late";
			if (tokenText == "落") {
				if (anyIn_ci(['get','off'],gloss)) gloss="alight";
				if (anyIn_ci(['descend','go down'],gloss)) gloss="descend";
				if (anyIn_ci(['add','put'],gloss)) gloss="drizzle";
				// also sometimes does "into"
			}
			if (tokenText == "睇") {
				if (anyIn_ci(['書','牌','本','封','紙','故仔'], text)) gloss="read";
				if (anyIn_ci(['tv','movie','film','video'], nextLLMToken?.gloss)) gloss="watch";
				if (anyIn_ci(['at'], gloss)) gloss="look"; // "watch" <- oscilated between look/watch for this
			}
			if (tokenText == "一" && anyIn_ci(['開始'],nextLLMToken?.gloss)) gloss="once";

			if (tokenText == "嘢") {
				if (anyIn_ci(['thing(s)','things'], tokenText)) gloss="things";
				if (false == anyIn_ci(['thing'],gloss)) gloss="thing";
			}
			if (tokenText == "覺" && anyIn_ci(['sleep'],gloss)) gloss="sleep";
			if (tokenText == "㗎") {
				if (!nextLLMToken || anyIn_ci([".","。",",","，"],nextLLMToken?.token) || anyIn_ci(['emph','final'], tokenText)) gloss = "。";
				if (anyIn_ci(["?","？"],nextLLMToken?.token) || anyIn_ci(["Q","?","？"],gloss)) gloss = "?";
			}
			if (tokenText == "收" && anyIn_ci(['adopt'],gloss)) gloss="receive";
			if (tokenText == "等" && anyIn_ci(['wait'],gloss)) gloss="wait";
			if (tokenText == "對") {
				if (anyIn_ci(['pair'],gloss)) gloss="(pair)";
				if ( nextLLMTokensOnCurLine.some(t => t.token === "嚟講")) gloss="treats"; // In "對A嚟講" pattern, it means "from A's POV"

			}
			if (tokenText == "生" && anyIn_ci(['birth','lay'],gloss)) gloss="birth";
			if (tokenText == "做" && anyIn_ci(['do'],gloss)) gloss="do";
			if (tokenText == "做" && ['BECOME', 'BE', 'AS'].includes(gloss.toUpperCase())) gloss="be";
			if (tokenText == "啦" && !nextLLMToken?.gloss) gloss="。";
			if (tokenText == "走" && anyIn_ci(['leave'],gloss)) gloss="leave";

			if (tokenText == "嚟") { // LLM isn't sufficient
				if (anyIn_ci(['in order', 'to'],gloss)) gloss="in order to";
				if (anyIn_ci(['arrive', 'become'],gloss)) gloss="come";
				if (anyIn_ci(['from'],gloss)) gloss="come from";
				if (text.includes('由')) gloss='come from'; // <- more precisely should be if [由,…,嚟] // } else if (!nextLLMToken?.gloss) { gloss="(become)"; } // <- not sure if this is the most appropriate gloss as a [final particle] but its a good placeholder
			}

			if (tokenText == "畫" && anyIn_ci(['drawing','painting'],gloss)) gloss="picture";
			if (tokenText == "多" && anyIn_ci(['much','many'],gloss)) gloss="much";
			if (tokenText == "好" && anyIn_ci(['better'],gloss)) gloss="good";
			if (tokenText == "比" && anyIn_ci(['than', 'compared'],gloss)) gloss="compared to";
			if (tokenText == "先" && anyIn_ci(['then'],gloss)) gloss="only then";
			if (tokenText == "咁" && gloss=="so") gloss="then";
			if (tokenText == "咁" && anyIn_ci(['like'],gloss)) gloss="-ly";
			if (tokenText == "腳上" && anyIn_ci(['feet'],gloss)) gloss="on feet";
			if (tokenText == "腳上" && anyIn_ci(['foot'],gloss)) gloss="on foot";
			if (tokenText == "會" && anyIn_ci(['can'],gloss)) gloss="will";
			if (tokenText == "小朋友" && false == anyIn_ci(['child','children'],gloss)) gloss="children";
			if (tokenText == "去") {
				if (anyIn_ci(['to'],gloss)) gloss="to";
				if (false == anyIn_ci(['go'],gloss)) gloss="to";
				// "go" is preserved
			}
			if (tokenText == "長方形" && false == anyIn_ci(['rectangle'],gloss)) gloss="rectangular";
			if (tokenText == "陣" && anyIn_ci(['time','when'],gloss)) gloss="moment";
			if (tokenText == "空中" && anyIn_ci(['sky','air'],gloss)) gloss="midair";
		}

		// ii. CLEAN
		if (gloss) {
			// '…(s)' - if gloss ends with '(s)' remove it and trim it (assuming that doesnt result in it being empty-text)
			const trimmed = gloss.replace(/\(s\)\s*$/, "").trim();
			if (trimmed !== "") gloss = trimmed;
			// "….…"
			gloss = gloss.replaceAll("."," ");
			gloss = gloss.replace(/-\)$/,")");
			gloss = gloss.replace(/\(noun\)$/,")");
			gloss = gloss.replace(/\(n\s*\)$/,")");
			gloss = gloss.replace(/$\(CL:\s*\)/,"(");
			gloss = gloss.replace(/$\(CL for\s*\)/,"(");
			gloss = gloss.replace(/\s*\(s\)$/,")");
			gloss = gloss.replace(/\s*\(y\)$/,")");
			gloss = gloss.replace(/\s*\(es\)$/,")");
		}

		// iii. OUTPUT
		let outputToken:AnnotatedToken = {
			text: tokenText,
			isWord: t.mtype !== 'N/A' ? 1 : 0,
			...(gloss !== null && { gloss })
		}
		annotatedTokens.push(outputToken);
	}
	return annotatedTokens;
}

function applyTokenRemerges(
	tokens: CantoneseTokenGloss[],
	remerges: Record<string, TokenRemerge>,
): CantoneseTokenGloss[] {
	const keys = Object.keys(remerges);
	const maxKeyLength = keys.reduce((max, key) => Math.max(max, key.length), 0);
	const output: CantoneseTokenGloss[] = [];

	for (let index = 0; index < tokens.length;) {
		let bestMatch: { end: number; key: string } | null = null;
		let concatenated = '';
		for (let lookahead = index; lookahead < tokens.length; lookahead++) {
			concatenated += tokens[lookahead].token;
			if (concatenated.length > maxKeyLength) break;
			if (remerges[concatenated]) bestMatch = { end: lookahead + 1, key: concatenated };
		}
		if (!bestMatch) {
			output.push(tokens[index]);
			index++;
			continue;
		}
		const replacement = remerges[bestMatch.key];
		output.push({
			token: replacement.textOverride ?? bestMatch.key,
			gloss: replacement.gloss,
			mtype: replacement.mtype,
		});
		index = bestMatch.end;
	}
	return output;
}

function applyTokenSplits(
	tokens: CantoneseTokenGloss[],
	splits: Record<string, CantoneseTokenGloss[]>,
): CantoneseTokenGloss[] {
	return tokens.flatMap(token => splits[token.token] ?? token);
}
