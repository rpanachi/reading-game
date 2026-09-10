/* ============================================================
 * diag.js — modo DEBUG e diagnóstico sob demanda
 *
 * DEBUG é true só em modo local (localhost / 127.0.0.1 / file://) ou
 * quando a URL traz ?debug=1. Fora disso nada é registrado e o botão
 * "Copiar diagnóstico" fica escondido.
 *
 * Com DEBUG ligado o log tem dois níveis, para não virar um paredão:
 *   log(...)    — sempre: início da história, troca de página, ciclo de
 *                 vida da sessão, reinícios, avanços da leitura, erros.
 *   detail(...) — só fica num anel dos últimos eventos (não vai para o
 *                 console). Quando a palavra atual TRAVA (não avança há
 *                 mais de 3 s com a criança falando), o anel é despejado
 *                 no log como contexto e os detalhes passam a ser
 *                 registrados até a leitura destravar.
 * Assim o log só fica minucioso exatamente no trecho com problema.
 * ============================================================ */

window.DEBUG = (function () {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  const forced = /[?&]debug=(1|true)(&|$)/i.test(location.search);
  return local || forced;
})();

window.DIAG = (function () {
  const enabled = window.DEBUG;
  const t0 = performance.now();
  const buf = [];       // log que o botão copia
  const ring = [];      // últimos detalhes antes de travar (contexto)
  const MAX = 5000, RING = 80;
  const startedAt = new Date();
  let stuckOn = false;
  let episodes = 0;

  const ts = () => ((performance.now() - t0) / 1000).toFixed(3);
  function safe(d) {
    if (d === undefined) return '';
    if (typeof d === 'string') return d;
    try { return JSON.stringify(d); } catch (_) { return String(d); }
  }
  const fmt = (tag, msg, data) => `[voz +${ts()}s] ${tag} ${msg}${data !== undefined ? ' ' + safe(data) : ''}`;

  function push(line, toConsole) {
    buf.push(line);
    if (buf.length > MAX) buf.splice(0, buf.length - MAX);
    if (toConsole) console.log(line);
  }

  /** Evento importante: sempre registrado. */
  function log(tag, msg, data) {
    if (!enabled) return;
    push(fmt(tag, msg, data), true);
  }

  /** Evento minucioso: só no anel, ou no log enquanto a leitura está travada. */
  function detail(tag, msg, data) {
    if (!enabled) return;
    const line = fmt(tag, msg, data);
    if (stuckOn) { push(line, true); return; }
    ring.push(line);
    if (ring.length > RING) ring.shift();
  }

  /** A palavra atual travou: despeja o contexto e liga os detalhes. */
  function beginStuck(msg, data) {
    if (!enabled || stuckOn) return;
    stuckOn = true;
    episodes++;
    push('', false);
    push(fmt('TRAVOU', `#${episodes} ${msg}`, data), true);
    push(`--- contexto: ${ring.length} eventos antes de travar ---`, false);
    ring.forEach((l) => push(l, false));
    push('--- detalhes ligados até destravar ---', false);
    ring.length = 0;
  }

  /** A leitura voltou a andar. */
  function endStuck(msg, data) {
    if (!enabled || !stuckOn) return;
    stuckOn = false;
    push(fmt('DESTRAVOU', msg, data), true);
    push('', false);
  }

  function header() {
    return [
      '=== Diagnóstico do reconhecimento de voz ===',
      `data: ${startedAt.toISOString()}  (t=0 no carregamento da página)`,
      `url: ${location.href}`,
      `navegador: ${navigator.userAgent}`,
      `idioma: ${navigator.language}  online: ${navigator.onLine}`,
      `SpeechRecognition: ${!!(window.SpeechRecognition || window.webkitSpeechRecognition)}  speechSynthesis: ${'speechSynthesis' in window}  secureContext: ${window.isSecureContext}`,
      `episódios de travamento: ${episodes}  (detalhes minuciosos só dentro deles)`,
      '',
    ].join('\n');
  }

  function dump() { return enabled ? header() + buf.join('\n') + '\n' : ''; }

  async function copy() {
    if (!enabled) return false;
    const text = dump();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (_) { return false; }
    }
  }

  if (enabled) {
    window.addEventListener('error', (e) => log('erro', 'exceção não tratada', { msg: e.message, file: e.filename, line: e.lineno }));
    window.addEventListener('unhandledrejection', (e) => log('erro', 'promise rejeitada', String(e.reason)));
    document.addEventListener('visibilitychange', () => log('pagina', `visibilidade: ${document.visibilityState}`));
    window.addEventListener('online', () => log('rede', 'online'));
    window.addEventListener('offline', () => log('rede', 'OFFLINE'));
    console.info('[voz] modo DEBUG ligado: log resumido; detalhes só quando a palavra travar por mais de 3 s');
  }

  return { enabled, log, detail, beginStuck, endStuck, stuck: () => stuckOn, episodes: () => episodes, dump, copy, ts, size: () => buf.length };
})();
