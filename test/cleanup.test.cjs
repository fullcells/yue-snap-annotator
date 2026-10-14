"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const deterministic_1 = require("../dist/treatments/deterministic");
const word = (token, gloss) => ({ token, gloss, mtype: 'BASE' });
const clean = (tokens) => (0, deterministic_1.annotateCantoneseTokenGlosses)(tokens, tokens.map(t => t.token).join(''));
const single = (token, gloss) => clean([word(token, gloss)])[0].gloss;
(0, node_test_1.default)('prohibitive and copular readings of 咪 retain their supplied local sense', () => {
    strict_1.default.equal(single('咪', "don't"), "don't");
    strict_1.default.equal(single('咪', 'not is'), 'not is');
});
(0, node_test_1.default)('source 由 cannot override later movement or purpose 嚟', () => {
    const result = clean([word('由', 'from'), word('澳門', 'Macau'), word('嚟', 'come'), word('嚟', 'in order to'), word('嚟', 'from')]);
    strict_1.default.deepEqual(result.filter(t => t.text === '嚟').map(t => t.gloss), ['come', 'in order to', 'come from']);
    strict_1.default.equal(single('嚟', 'come to'), 'come');
    strict_1.default.equal(single('嚟', 'together'), 'together');
});
(0, node_test_1.default)('disposal 將 cannot be converted into a future prediction', () => {
    for (const gloss of ['take', 'will', '(object)', 'about to'])
        strict_1.default.equal(single('將', gloss), gloss);
});
(0, node_test_1.default)('numeric decimal punctuation survives while formatting abbreviation periods are cleaned', () => {
    for (const gloss of ['$7.25', '0.0625', '-3.75', '๑.๒๕', 'v2.8'])
        strict_1.default.equal(single('數值', gloss), gloss);
    strict_1.default.ok(!single('數值', 'cl.').includes('.'));
});
(0, node_test_1.default)('which person is not converted into standalone who', () => {
    strict_1.default.equal(clean([word('邊個', 'which person'), word('醫生', 'doctor')])[0].gloss, 'which');
    strict_1.default.equal(single('邊個', 'whose'), 'whose');
    strict_1.default.equal(single('邊個', 'who'), 'who');
});
(0, node_test_1.default)('scheduled, school, team and unknown classifiers remain distinguishable', () => {
    for (const gloss of ['(service)', '(vehicle)', '(bus)', '(flight)', '(scheduled)'])
        strict_1.default.equal(single('班', gloss), '(scheduled)');
    strict_1.default.equal(clean([word('班', '(classifier)'), word('火車', 'train')])[0].gloss, '(scheduled)');
    strict_1.default.equal(single('班', '(class)'), '(class)');
    strict_1.default.equal(single('班', '(team)'), '(squad)');
    strict_1.default.equal(single('班', '(classifier)'), '(classifier)');
});
(0, node_test_1.default)('cleanup does not introduce pronoun alternatives or fail on a missing gloss', () => {
    for (const gloss of ['they', 'them', 'their', 'him', 'hers', 'it'])
        strict_1.default.equal(single('佢', gloss), gloss);
    strict_1.default.equal(single('佢', 'he/him/his'), 'he');
    strict_1.default.equal(single('佢', 'he/she/it'), 'they');
    strict_1.default.equal(single('佢', ''), undefined);
});
(0, node_test_1.default)('existing comparative boundaries and lexical word merges are both preserved', () => {
    const result = clean([word('早', 'early'), word('啲', 'a bit')]);
    strict_1.default.deepEqual(result.map(t => t.text), ['早', '啲']);
    strict_1.default.deepEqual(result.map(t => t.gloss), ['early', 'a bit']);
    strict_1.default.deepEqual(clean([word('媽', 'mom'), word('媽', 'mom')]), [{ text: '媽媽', isWord: 1, gloss: 'mother' }]);
});
(0, node_test_1.default)('delay-marker terminology is not confused with progressive aspect or lexical residence', () => {
    strict_1.default.equal(single('住', '(delay marker)'), '(delay marker)');
    strict_1.default.equal(single('住', 'at the moment'), 'at the moment');
    strict_1.default.equal(single('住', 'continuous'), '-ing');
    strict_1.default.equal(single('住', 'stay'), 'reside');
});
(0, node_test_1.default)('N/A tokens never receive a gloss through a dictionary rewrite', () => {
    const result = clean([{ token: '咪', gloss: 'junk', mtype: 'N/A' }, { token: '👩🏿‍🔬', gloss: 'junk', mtype: 'N/A' }]);
    strict_1.default.ok(result.every(t => t.isWord === 0 && t.gloss == null));
    strict_1.default.equal(result.map(t => t.text).join(''), '咪👩🏿‍🔬');
});
