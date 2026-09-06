/* ============================================================
 * diag.js — modo DEBUG e log de diagnóstico do reconhecimento
 *
 * DEBUG é true só em modo local (localhost / 127.0.0.1 / file://) ou
 * quando a URL traz ?debug=1. Fora disso, nada é registrado: o log é
 * descartado, nada vai para o console e o botão "Copiar diagnóstico"
 * fica escondido. Com DEBUG ligado, tudo que acontece (eventos do
 * reconhecedor, resultados com confiança, decisões do casamento de
 * palavras, estado do jogo, batimentos) vai para o console com o
 * prefixo [voz] e para um buffer que o botão copia inteiro.
 * ============================================================ */

window.DEBUG = (function () {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  const forced = /[?&]debug=(1|true)(&|$)/i.test(location.search);
  return local || forced;
})();

window.DIAG = (function () {
  const enabled = window.DEBUG;
  const t0 = performance.now();
  const buf = [];
  const MAX = 8000;
  const startedAt = new Date();

  const ts = () => ((performance.now() - t0) / 1000).toFixed(3);
  function safe(d) {
    if (d === undefined) return '';
    if (typeof d === 'string') return d;
    try { return JSON.stringify(d); } catch (_) { return String(d); }
  }

  /** log(tag, mensagem, dados?) → "[voz +12.345s] tag mensagem {dados}" (só com DEBUG) */
  function log(tag, msg, data) {
    if (!enabled) return;
    const line = `[voz +${ts()}s] ${tag} ${msg}${data !== undefined ? ' ' + safe(data) : ''}`;
    buf.push(line);
    if (buf.length > MAX) buf.splice(0, buf.length - MAX);
    console.log(line);
  }

  function header() {
    return [
      '=== Diagnóstico do reconhecimento de voz ===',
      `data: ${startedAt.toISOString()}  (t=0 no carregamento da página)`,
      `url: ${location.href}`,
      `navegador: ${navigator.userAgent}`,
      `idioma: ${navigator.language}  online: ${navigator.onLine}`,
      `SpeechRecognition: ${!!(window.SpeechRecognition || window.webkitSpeechRecognition)}  speechSynthesis: ${'speechSynthesis' in window}  secureContext: ${window.isSecureContext}`,
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
    console.info('[voz] modo DEBUG ligado (local ou ?debug=1): log detalhado ativo');
  }

  return { enabled, log, dump, copy, ts, size: () => buf.length };
})();
