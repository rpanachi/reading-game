/* ============================================================
 * tests/run.js — testes sem navegador (node tests/run.js)
 * Carrega os módulos do jogo com um `window` falso e confere:
 * geração das histórias, ilustrações, comparação fonética e o
 * acompanhamento da leitura (Tracker) nos cenários que já travaram.
 * ============================================================ */
global.window = {};
global.navigator = { userAgent: 'node' };
require('../js/data.js');
require('../js/art.js');
require('../js/story.js');
require('../js/speech.js');
const { GAME_DATA: D, ART, STORY, SPEECH: S } = window;

let fails = 0, total = 0;
function check(label, got, exp) {
  total++;
  const ok = got === exp;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ` => ${JSON.stringify(got)}, esperado ${JSON.stringify(exp)}`}`);
}
const say = (s) => s.split(/\s+/).map(S.normalize).filter(Boolean);
const targetsOf = (text) => S.tokenize(text).filter((t) => t.wordIndex !== null).map((t) => t.norm);

/* ---------- histórias e ilustrações: todas as combinações ---------- */
let stories = 0, problems = 0;
for (const c of D.characters) for (const v of D.vehicles) for (const p of D.places) for (const s of D.situations) for (const d of D.dialogs) for (const e of D.endings) {
  const story = STORY.generate({ character: c.id, vehicle: v.id, place: p.id, situation: s.id, dialog: d.id, ending: e.id });
  stories++;
  if (story.slides.length < 5 || story.slides.length > 8) problems++;
  for (const sl of story.slides) {
    if (/undefined|NaN|\[object/.test(sl.text)) { problems++; break; }
    if (/undefined|NaN/.test(ART.renderScene(sl.scene))) { problems++; break; }
  }
}
check(`${stories} histórias geradas sem problemas`, problems, 0);
let thumbs = 0;
for (const sec of D.sections) for (const it of sec.items) { const t = ART.thumb(sec.key, it.id); if (t && !/undefined|NaN/.test(t)) thumbs++; }
check('miniaturas do compositor', thumbs, D.sections.reduce((n, s) => n + s.items.length, 0));

/* ---------- normalização e fonética ---------- */
for (const [a, b] of [['balões,', 'balões'], ['música.', 'musica'], ['volta,', 'volta'], ['céu.', 'ceu'], ['— Sim!', 'sim'], ['Leo.', 'leo'], ['"Lá,', 'la']])
  check(`normalize(${JSON.stringify(a)}) == ${JSON.stringify(b)}`, S.normalize(a), S.normalize(b));
for (const [a, b] of [['gato', 'gatu'], ['chamado', 'xamadu'], ['vez', 'ves'], ['sol', 'sou'], ['bem', 'ben'], ['falar', 'fala'], ['você', 'vc'], ['coelho', 'coelo'], ['não', 'nao'], ['brilhava', 'brilava'], ['skate', 'esqueite'], ['muito', 'muinto'], ['céu', 'seu'], ['casa', 'caça']])
  check(`"${a}" ≈ "${b}"`, S.similar(S.normalize(a), S.normalize(b)), true);
check('"um" não é "o"', S.similar('um', 'o'), false);
for (const w of ['D', 'dê', 'the']) check(`"${w}" vale por "de" (palavra curta isolada)`, S.similar(S.normalize(w), 'de'), true);
check('"a" não vale por "até"', S.similar('a', 'ate'), false);
check('"d" não vale por "dia"', S.similar('d', 'dia'), false);

/* ---------- casamento de frases ---------- */
const t1 = targetsOf('Era uma vez um gato chamado Tom. Ele adorava passear de bicicleta.');
for (const [phrase, exp] of [
  ['era uma vez', 3],
  ['era uma vez um gatu chamadu tom', 7],
  ['era uma ves um gato xamado tom ele adorava passiá de bissicleta', 12],
  ['era uma vez um ga to chamado tom', 7],
  ['era uma vez 1 gato', 5],
  ['banana laranja maçã', 0],
]) check(`frase ${JSON.stringify(phrase)}`, S.computeProgress(t1, [[say(phrase)]]), exp);

/* ---------- Tracker: cenários que já travaram ---------- */
const t2 = targetsOf('Um dia, Lili foi de patinete até o parque. O sol brilhava no céu.');
let t = new S.Tracker(t2);
t.update([], [[say('um dia lili foi')]]);
t.update([], []);                                  // sessão caiu com parcial não finalizada
t.update([], [[say('de patinete')]]);
check('"de patinete" após a sessão cair', t.progress, 6);
t.update([[say('de patinete até o parque')]], []);
t.update([[say('de patinete até o parque')]], [[say('o sol brilhava')]]);
t.update([[say('de patinete até o parque')], [say('o sol brilha')]], []);
check('final retraído mantém o progresso', t.progress, 12);
t.update([[say('de patinete até o parque')], [say('o sol brilha')]], [[say('no céu')]]);
check('página completa', t.progress, 14);

const t3 = targetsOf('A festa tinha balões, bolo e muita música. Leo olhou em volta, bem curioso.');
t = new S.Tracker(t3);
t.update([], [[say('a festa tinha')]]);
t.update([], []);
t.update([], [[say('balões')]]);
check('"balões" casa com "balões," após a sessão cair', t.progress, 4);

t = new S.Tracker(targetsOf('O gato viu o rato.'));
t.update([], [[say('o gato viu')]]);
t.update([[say('o gato viu')]], []);
check('final igual à parcial não conta o 2º "o"', t.progress, 3);
t.update([[say('o gato viu')]], [[say('o rato')]]);
check('"o rato" termina a frase', t.progress, 5);

t = new S.Tracker(t2);
t.update([], [[say('um dia lili foi')]]);
let r = t.update([[say('um dia lili foi')]], []);
check('final que confirma a parcial não é erro', r.miss, false);
r = t.update([[say('um dia lili foi')], [say('banana')]], []);
check('final errado é erro (dica)', r.miss, true);
r = t.update([[say('um dia lili foi')], [say('banana')], [say('D')]], []);
check('"D" avança por "de"', t.progress, 5);
t.set(8);
t.update([], [[say('parque o sol')]]);
check('toque na 8ª palavra + fala segue', t.progress, 11);

/* ---------- rótulo "Ouvi" (parcial/final) ---------- */
const calls = [];
const l = new S.Listener({ onWords: (f, i, text, isFinal) => calls.push([text, isFinal]) });
const ev = (items) => ({ results: items.map(([tx, fin]) => Object.assign([{ transcript: tx }], { isFinal: fin })) });
l._onResult(ev([['um dia', false]]));
l._onResult(ev([['um dia lili foi', true], ['de', false]]));
l._onResult(ev([['um dia lili foi', true], ['de patinete', true], ['', false]]));
check('rótulo parcial', JSON.stringify(calls[0]), JSON.stringify(['um dia', false]));
check('rótulo da nova parcial', JSON.stringify(calls[1]), JSON.stringify(['de', false]));
check('rótulo final (parcial vazia não apaga)', JSON.stringify(calls[2]), JSON.stringify(['de patinete', true]));

console.log(`\n${total - fails}/${total} verificações ok`);
process.exit(fails ? 1 : 0);
