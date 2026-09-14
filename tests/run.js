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
check('pulo até a 8ª palavra + fala segue', t.progress, 11);

// leitura silabada com pausa entre as sílabas: "ca" (enunciado 1) + "chorro" (enunciado 2)
t = new S.Tracker(targetsOf('Era uma vez um cachorro chamado Rex.'));
t.update([[say('era uma vez um')]], []);
r = t.update([[say('era uma vez um')], [say('ca')]], []);
check('"ca" sozinho é tentativa não entendida', r.miss, true);
r = t.update([[say('era uma vez um')], [say('ca')], [say('chorro')]], []);
check('"ca" + "chorro" no enunciado seguinte casa "cachorro"', t.progress, 5);
check('junção entre enunciados não é erro', r.miss, false);
// regressões do diagnóstico de 2026-09-05: a parcial repetida com confiança maior
// e o final com alternativas NÃO podem casar de novo as palavras já contadas
t = new S.Tracker(targetsOf('Era uma vez um menino chamado Leo.'));
t.update([[say('era era')]], []);                       // "era" já lido (final)
t.update([[say('era era')]], [[say('uma')]]);           // parcial "uma"(0.01)
check('parcial "uma" avança para "vez"', t.progress, 2);
t.update([[say('era era')]], [[say('uma')]]);           // mesma parcial, agora (0.90)
check('parcial repetida não vira "um" pulando "vez"', t.progress, 2);
t.update([[say('era era')], [say('uma uma')]], []);     // final da mesma fala
check('final "uma uma" não conta de novo', t.progress, 2);
t = new S.Tracker(targetsOf('Você me dá um pouco de água? Estou com sede!'));
t.update([[say('você')], [say('me')]], []);
t.update([[say('você')], [say('me')]], [[say('um pouco de água')]]);
check('parcial "um pouco de água" chega em "estou"', t.progress, 7);
t.update([[say('você')], [say('me')], [say('um pouco de água'), say('com um pouco de água')]], []);
check('alternativa "com …" não pula "Estou"', t.progress, 7);
check('"1" ≈ "uma"', S.similar(S.normalize('1'), 'uma'), true);
check('"era 1 vez 1 gato"', S.computeProgress(targetsOf('Era uma vez um gato chamado Tom.'), [[say('era 1 vez 1 gato')]]), 5);
check('motivo do casamento', S.why('gatu', 'gato'), 'fonética gatu');

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

/* ---------- travamento: ponteiro dos finais atrás da palavra na tela ---------- */
// Enquanto uma parcial viva avança a tela, o ponteiro dos finais fica atrás.
// Antes, a janela de busca saía de lá e cobria só 2 palavras, então a palavra
// destacada ficava FORA da janela: a criança repetia e nada acontecia, e só
// dizer a palavra atual + a seguinte (enunciado maior → final → ponteiro em dia)
// destravava. Agora a busca alcança sempre a palavra da tela.
const alvo7 = targetsOf('Era uma vez um menino chamado Leo.');   // #3 um #4 menino #5 chamado
t = new S.Tracker(alvo7);
t.update([], [[say('era uma vez')]]);
check('parcial longa avança a tela', t.progress, 3);
check('ponteiro dos finais fica atrás', t.committed, 0);
t.update([], [[say('um')]]);
check('palavra atual casa mesmo com ponteiro 3 atrás', t.progress, 4);
t.update([], [[say('menino')]]);
check('e a próxima também', t.progress, 5);
// pronúncia aproximada da palavra atual (fonética) continua valendo
t = new S.Tracker(alvo7);
t.update([], [[say('era uma vez')]]);
t.update([], [[say('um')]]);
t.update([], [[say('meninu')]]);
check('pronúncia aproximada da palavra atual casa', t.progress, 5);
// e o atalho antigo (palavra atual + seguinte juntas) segue funcionando
t = new S.Tracker(alvo7);
t.update([], [[say('era uma vez')]]);
t.update([], [[say('um menino')]]);
check('palavra atual + seguinte juntas', t.progress, 5);
// nada de pular palavra por parecença dentro da janela alargada
t = new S.Tracker(targetsOf('Você me dá um pouco de água? Estou com sede!'));
t.update([[say('você')], [say('me')]], []);
t.update([[say('você')], [say('me')]], [[say('um pouco de água')]]);
check('parcial "um pouco de água" chega em "estou" (2)', t.progress, 7);
t.update([[say('você')], [say('me')], [say('um pouco de água'), say('com um pouco de água')]], []);
check('alternativa "com ..." não pula "Estou" (2)', t.progress, 7);

/* ---------- artefatos do reconhecedor em palavras curtas (diagnóstico de 2026-09-14) ---------- */
for (const [heard, target] of [['do', 'o'], ['no', 'o'], ['vem', 'em'], ['hem', 'em'], ['bum', 'um'], ['da', 'a'], ['do', 'no'], ['da', 'na']])
  check(`"${heard}" vale por "${target}"`, S.similar(S.normalize(heard), target), true);
for (const [heard, target] of [['skate', 'de'], ['sol', 'o'], ['volta', 'a'], ['parque', 'e'], ['um', 'o']])
  check(`"${heard}" NÃO vale por "${target}"`, S.similar(S.normalize(heard), target), false);
// vogal sozinha trocada por outra vogal ("e" → "o", diagnóstico de 2026-09-14, episódio 19)
for (const [heard, target] of [['o', 'e'], ['a', 'o'], ['é', 'a']])
  check(`vogal solta: "${heard}" vale por "${target}"`, S.similar(S.normalize(heard), target), true);
check('vogal solta não vale no meio da frase (só na palavra esperada)', S.matchProgress(targetsOf('o gato e o cão'), say('o gato a o cão'), 0), 5);
check('vogal solta: "o" não pula "gato" para casar "e"', S.matchProgress(targetsOf('o gato e o cão'), say('o o'), 1, 2, null, 1), 1);

// "um um" vem como o número 11
{
  const got = [];
  const l2 = new S.Listener({ onWords: (f, i) => got.push(i.length ? i[0][0] : f[f.length - 1][0]) });
  l2._onResult(ev([['11', false]]));
  check('"11" vira "um um"', got[0].join(' '), 'um um');
  l2._onResult(ev([['era 111 vez', false]]));
  check('"111" vira "um um um"', got[1].join(' '), 'era um um um vez');
  // "11" repetido casa só a palavra esperada, sem pular
  t = new S.Tracker(targetsOf('Era uma vez um menino chamado Leo.'));
  t.update([[say('era uma vez')]], []);
  t.update([[say('era uma vez')]], [[['um', 'um']]]);
  check('"um um" (do 11) avança só "um"', t.progress, 4);
}

/* ---------- eco: repetir a palavra anterior não é tentativa da atual ---------- */
{
  const tg = targetsOf('Eu perdi meu brinquedo — disse a professora.');
  check('eco: última palavra repetida', S.isEcho(say('brinquedo'), tg, 4), true);
  check('eco: última palavra repetida duas vezes', S.isEcho(say('brinquedo brinquedo'), tg, 4), true);
  check('eco: últimas duas palavras', S.isEcho(say('meu brinquedo'), tg, 4), true);
  check('eco tolerante ("tava" por "estava")', S.isEcho(say('tava'), targetsOf('A professora estava chorando'), 3), true);
  check('não é eco: palavra nova', S.isEcho(say('disse'), tg, 4), false);
  check('não é eco: palavra parecida com a atual', S.isEcho(say('peda'), tg, 1), false);
  check('não é eco no começo da página', S.isEcho(say('eu'), tg, 0), false);
  check('não é eco: mistura repetição com palavra nova', S.isEcho(say('brinquedo disse'), tg, 4), false);
  // episódio 25: "em" repetido depois que a tela avançou para "volta" contava como tentativa não entendida
  t = new S.Tracker(targetsOf('Rex olhou em volta, bem curioso.'));
  t.update([[say('olhou vem em')]], []);
  check('"olhou vem em" avança até "volta"', t.progress, 3);
  let r = t.update([[say('olhou vem em')], [say('em')]], []);
  check('final "em" repetido: não é erro', r.miss, false);
  check('final "em" repetido: é eco', r.echo, true);
  r = t.update([[say('olhou vem em')], [say('em')]], [[say('volta')]]);
  check('"volta" depois do eco avança', t.progress, 4);
  check('avanço não é marcado como eco', r.echo, false);
  // episódio 38: parcial "brinquedo" repetida enquanto a tela já mostra "disse"
  t = new S.Tracker(tg);
  t.update([[say('eu')], [say('peda perdi meu')]], [[say('pegando brinquedo')]]);
  check('"pegando brinquedo" avança até "disse"', t.progress, 4);
  r = t.update([[say('eu')], [say('peda perdi meu')]], [[say('pegando brinquedo')], [say('brinquedo')]]);
  check('parcial "brinquedo" repetida é eco', r.echo, true);
  r = t.update([[say('eu')], [say('peda perdi meu')]], [[say('pegando brinquedo')], [say('dice')]]);
  check('parcial "dice" (tentativa real) não é eco', r.echo, false);
  // erro de verdade continua contando
  t = new S.Tracker(tg);
  t.update([[say('eu')]], []);
  r = t.update([[say('eu')], [say('a')]], []);
  check('final "a" na palavra "perdi" é erro', r.miss, true);
  // página completa: um final atrasado não é erro
  t = new S.Tracker(targetsOf('Fim!'));
  t.update([[say('fim')]], []);
  r = t.update([[say('fim')], [say('curioso')]], []);
  check('final depois da página completa não é erro', r.miss, false);
}

/* ---------- início da tentativa (âncora do travamento) ---------- */
{
  const T = 100000;
  check('rabo da palavra anterior não conta', S.attemptStart({ voiceOn: true, voiceStartAt: T - 500, now: T + 200, progressAt: T, from: T + 250 }), 0);
  check('trecho novo depois da troca conta', S.attemptStart({ voiceOn: true, voiceStartAt: T + 900, now: T + 950, progressAt: T, from: T + 250 }), T + 900);
  check('voz emendada no mesmo fôlego conta a partir de 600 ms', S.attemptStart({ voiceOn: true, voiceStartAt: T - 500, now: T + 700, progressAt: T, from: T + 250 }), T + 600);
  check('sem voz não há tentativa', S.attemptStart({ voiceOn: false, voiceStartAt: T + 900, now: T + 2000, progressAt: T, from: T + 250 }), 0);
  check('depois de um eco só conta trecho novo', S.attemptStart({ voiceOn: true, voiceStartAt: T + 900, now: T + 1500, progressAt: T, from: T + 1400 }), 0);
}

/* ---------- medidor: trechos de voz = tentativas ---------- */
{
  const m = new S.Meter(null);
  let t = 1000;
  const burst = (ms, rms) => { for (let i = 0; i < ms; i += 16) { m._sample(rms, 16, t); t += 16; } };
  burst(300, 0.1);            // "o"
  check('primeiro trecho de voz = 1 tentativa', m.attempts, 1);
  check('início do trecho registrado', m.voiceStartAt, 1000);
  burst(200, 0.01);           // pausa curta (sílaba)
  burst(300, 0.1);
  check('pausa de 200 ms não abre tentativa nova', m.attempts, 1);
  burst(800, 0.01);           // pausa de verdade
  burst(300, 0.1);            // "o" de novo
  check('pausa de 800 ms abre a 2ª tentativa', m.attempts, 2);
  check('primeira tentativa continua sendo a primeira', m.firstAttemptAt, 1000);
  check('voz acumulada', Math.round(m.voicedMs), 912);
  m.resetVoiced();
  check('resultado zera as tentativas', m.attempts, 0);
  burst(100, 0.1);
  check('voz que continua depois do resultado não é tentativa nova', m.attempts, 0);
}

/* ---------- página nova sem reiniciar a sessão: parcial atravessada é descartada ---------- */
{
  const seen = [];
  const l3 = new S.Listener({ onWords: (f, i) => seen.push({ f: f.map((a) => a[0].join(' ')), i: i.map((a) => a[0].join(' ')) }) });
  l3.active = true; l3.rec = {};
  l3._onResult(ev([['de skate', true], ['muito bem', false]]));        // fim da página 1, parcial "muito bem" viva
  l3.reset();                                                          // página 2
  l3._onResult(ev([['de skate', true], ['muito bem um dia', false]])); // a fala nova foi emendada na mesma parcial
  const last = seen[seen.length - 1];
  check('final antigo ignorado na página nova', last.f.length, 0);
  check('parcial atravessada: só as palavras novas contam', last.i[0], 'um dia');
  l3._onResult(ev([['de skate', true], ['muito bem um dia', true], ['rex', false]]));
  const last2 = seen[seen.length - 1];
  check('final da parcial atravessada entra sem as palavras antigas', last2.f[0], 'um dia');
  check('resultado novo entra inteiro', last2.i[0], 'rex');
}

/* ---------- vigia da sessão (simulado, sem navegador) ---------- */
function fakeListener({ ageMs, sinceFirstMs, sinceResultMs, voicedMs, quietMs, pending, attempts = 0, firstAttemptMs = 0 }) {
  const l = new S.Listener({});
  const restarts = [];
  l.active = true;
  l.rec = { abort() { restarts.push('abort'); } };
  l.restart = (reason) => restarts.push(reason);
  const now = Date.now();
  l._startedAt = now - ageMs;
  l._firstResultAt = sinceFirstMs == null ? 0 : now - sinceFirstMs;
  l._lastResult = now - sinceResultMs;
  l._speechAt = 0;
  l.interimResults = pending ? [[['x']]] : [];
  l.meter = { voicedMs, lastVoiceAt: now - quietMs, level: 0, attempts, firstAttemptAt: firstAttemptMs ? now - firstAttemptMs : 0 };
  l._check();
  return restarts;
}
// cenário do diagnóstico: sessão com 65s desde o 1º resultado, "Tom" dito (voz 900ms), 7s sem resposta
check('travamento: voz captada sem resposta reinicia', fakeListener({ ageMs: 72000, sinceFirstMs: 65000, sinceResultMs: 7000, voicedMs: 900, quietMs: 3000, pending: true }).length, 1);
check('não reinicia enquanto a criança ainda fala', fakeListener({ ageMs: 72000, sinceFirstMs: 65000, sinceResultMs: 7000, voicedMs: 900, quietMs: 200, pending: true }).length, 0);
check('pausa normal (sem voz) não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 9000, voicedMs: 0, quietMs: 9000, pending: false }).length, 0);
check('renovação preventiva aos 45s numa pausa', fakeListener({ ageMs: 50000, sinceFirstMs: 46000, sinceResultMs: 2000, voicedMs: 0, quietMs: 2000, pending: false }).length, 1);
check('renovação espera se há parcial pendente (<55s)', fakeListener({ ageMs: 50000, sinceFirstMs: 46000, sinceResultMs: 2000, voicedMs: 0, quietMs: 2000, pending: true }).length, 0);
check('renovação força aos 55s mesmo com parcial pendente', fakeListener({ ageMs: 60000, sinceFirstMs: 56000, sinceResultMs: 2000, voicedMs: 0, quietMs: 2000, pending: true }).length, 1);
check('sessão jovem não renova', fakeListener({ ageMs: 30000, sinceFirstMs: 25000, sinceResultMs: 2000, voicedMs: 0, quietMs: 2000, pending: false }).length, 0);
// tentativa de fala sem resposta: "vez" dito, 2,5 s de silêncio, nenhum resultado → reinicia já
check('fala sem resposta 2s depois de calar reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 4000, voicedMs: 600, quietMs: 2500, pending: false }).length, 1);
check('fala respondida (resultado depois da voz) não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 1000, voicedMs: 600, quietMs: 2500, pending: false }).length, 0);
check('ainda dentro dos 2s de silêncio não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 3000, voicedMs: 600, quietMs: 1200, pending: false }).length, 0);
check('ruído curto (<250ms de voz) não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 4000, voicedMs: 200, quietMs: 2500, pending: false }).length, 0);
check('"a" de 300 ms sem resposta 2 s depois de calar reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 4000, voicedMs: 300, quietMs: 2500, pending: false }).length, 1);
// criança repetindo sem parar (episódios "Rex" 22 s e "de" 12 s): voz acumulada, nada chega, nunca há pausa de 2 s
check('voz acumulada sem resposta reinicia mesmo sem pausa', fakeListener({ ageMs: 40000, sinceFirstMs: 35000, sinceResultMs: 5000, voicedMs: 1600, quietMs: 60, pending: true }).length, 1);
check('voz acumulada mas resposta recente não reinicia', fakeListener({ ageMs: 40000, sinceFirstMs: 35000, sinceResultMs: 2000, voicedMs: 1600, quietMs: 60, pending: true }).length, 0);
// criança repetiu a palavra (2 trechos de voz) e nada chegou 2,5 s depois do primeiro: reinicia já, sem pausa
check('repetiu 2x sem resposta há 3 s reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 3200, voicedMs: 700, quietMs: 50, pending: true, attempts: 2, firstAttemptMs: 3000 }).length, 1);
check('repetiu 2x mas só há 2 s não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 2500, voicedMs: 700, quietMs: 50, pending: true, attempts: 2, firstAttemptMs: 2000 }).length, 0);
check('uma tentativa só, há 3 s, ainda espera', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 3200, voicedMs: 700, quietMs: 50, pending: true, attempts: 1, firstAttemptMs: 3000 }).length, 0);
check('duas tentativas mas voz curta demais (ruído) não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 3200, voicedMs: 150, quietMs: 50, pending: true, attempts: 2, firstAttemptMs: 3000 }).length, 0);
check('"a" repetido (2 x 150 ms) sem resposta reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 3200, voicedMs: 300, quietMs: 50, pending: true, attempts: 2, firstAttemptMs: 3000 }).length, 1);
// sessão nova que nunca respondeu: paciência menor (1,2 s de pausa)
check('sessão nova: fala sem resposta 1,3 s depois de calar reinicia', fakeListener({ ageMs: 4000, sinceFirstMs: null, sinceResultMs: 4000, voicedMs: 800, quietMs: 1300, pending: false }).length, 1);
check('sessão já respondida: 1,3 s de pausa ainda não reinicia', fakeListener({ ageMs: 20000, sinceFirstMs: 15000, sinceResultMs: 4000, voicedMs: 800, quietMs: 1300, pending: false }).length, 0);

/* ---------- troca de página: sessão velha é renovada na hora ---------- */
function pageTurn({ sinceFirstMs, ageMs }) {
  const l = new S.Listener({});
  const restarts = [];
  l.active = true;
  l.rec = { abort() {} };
  l.restart = (reason) => restarts.push(reason);
  const now = Date.now();
  l._startedAt = now - ageMs;
  l._firstResultAt = sinceFirstMs == null ? 0 : now - sinceFirstMs;
  l.reset();
  return restarts.length;
}
check('página nova com sessão de 35 s desde o 1º resultado renova', pageTurn({ sinceFirstMs: 35000, ageMs: 40000 }), 1);
check('página nova com sessão de 24 s mantém', pageTurn({ sinceFirstMs: 24000, ageMs: 30000 }), 0);
check('página nova com sessão muda de 55 s (aquecimento longo) renova', pageTurn({ sinceFirstMs: null, ageMs: 55000 }), 1);
check('página nova com sessão muda de 10 s mantém', pageTurn({ sinceFirstMs: null, ageMs: 10000 }), 0);

/* ---------- palavra de 1 letra aceita pela fala curta ---------- */
{
  const T = 200000, from = T + 250;
  const b = (o) => S.shortBurst(Object.assign({ voiceOn: false, from }, o));
  check('"a" de 130 ms, calou há 1,4 s: aceita', b({ voiceStartAt: T + 1000, lastVoiceAt: T + 1130, now: T + 2600 }), true);
  check('ainda falando: espera', b({ voiceOn: true, voiceStartAt: T + 1000, lastVoiceAt: T + 1130, now: T + 2600 }), false);
  check('calou há menos de 600 ms: espera', b({ voiceStartAt: T + 1000, lastVoiceAt: T + 1300, now: T + 1800 }), false);
  check('menos de 1,5 s desde o início: espera o reconhecedor', b({ voiceStartAt: T + 1000, lastVoiceAt: T + 1130, now: T + 2400 }), false);
  check('rabo da palavra anterior (antes da troca) não conta', b({ voiceStartAt: T - 300, lastVoiceAt: T + 100, now: T + 2000 }), false);
  check('fala longa (1,2 s) não é a vogal: não aceita', b({ voiceStartAt: T + 1000, lastVoiceAt: T + 2200, now: T + 3000 }), false);
  check('estalo de 20 ms não conta', b({ voiceStartAt: T + 1000, lastVoiceAt: T + 1020, now: T + 2600 }), false);
}

console.log(`\n${total - fails}/${total} verificações ok`);
process.exit(fails ? 1 : 0);
