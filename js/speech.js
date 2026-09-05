/* ============================================================
 * speech.js — reconhecimento de voz (Web Speech API, pt-BR),
 * comparação fonética das palavras lidas e voz do sistema.
 *
 * O motor de reconhecimento é o do navegador: no Chrome é o
 * reconhecedor pt-BR do Google, no Edge é o da Microsoft (Azure),
 * no Safari é o da Apple. Nada precisa ser instalado.
 * ============================================================ */

window.SPEECH = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;

  const NUM = { 1: 'um', 2: 'dois', 3: 'tres', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez' };
  const ALIAS = {
    pra: 'para', pro: 'para', ta: 'esta', tava: 'estava', vc: 'voce', obrigadu: 'obrigado', the: 'de',
    esqueite: 'skate', esquete: 'skate', isqueite: 'skate', patinet: 'patinete',
  };

  /** minúsculas, sem acentos e sem pontuação (ç vira ss para manter o som). */
  function normalize(w) {
    let n = String(w).toLowerCase().replace(/ç/g, 'ss')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (NUM[n]) n = NUM[n];
    if (ALIAS[n]) n = ALIAS[n];
    return n;
  }

  /** Divide o texto em tokens; só tokens com letras/números contam como palavras. */
  function tokenize(text) {
    let wi = 0;
    return text.split(/\s+/).filter(Boolean).map((t) => {
      const norm = normalize(t);
      const tok = { text: t, norm, wordIndex: norm ? wi : null };
      if (norm) wi++;
      return tok;
    });
  }

  /**
   * Chave fonética simplificada do português brasileiro. Palavras que
   * soam igual viram a mesma chave: "gato"/"gatu", "chamado"/"xamadu",
   * "vez"/"ves", "sol"/"sou", "bem"/"ben", "falar"/"fala".
   */
  function phon(w) {
    let s = w;
    if (!s) return '';
    s = s.replace(/ch|sh/g, 'x').replace(/lh/g, 'l').replace(/nh/g, 'n').replace(/ph/g, 'f')
      .replace(/qu(?=[ei])/g, 'k').replace(/qu/g, 'k').replace(/gu(?=[ei])/g, 'g')
      .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/g(?=[eiy])/g, 'j')
      .replace(/z/g, 's').replace(/w/g, 'v').replace(/y/g, 'i').replace(/h/g, '');
    s = s.replace(/ao/g, 'au').replace(/m$/, 'n').replace(/l$/, 'u').replace(/l(?=[^aeiou])/g, 'u')
      .replace(/r$/, '').replace(/o$/, 'u').replace(/e$/, 'i').replace(/os$/, 'us').replace(/es$/, 'is');
    s = s.replace(/(.)\1+/g, '$1');
    return s;
  }
  const phonCache = new Map();
  function key(w) {
    let k = phonCache.get(w);
    if (k === undefined) { k = phon(w); phonCache.set(w, k); }
    return k;
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }

  /**
   * Igual, ou mesma chave fonética, ou chave fonética parecida (palavras longas).
   * Palavras curtinhas ditas sozinhas costumam voltar como uma letra
   * ("de" → "D"), então uma letra igual à inicial de uma palavra de até
   * 2 letras também vale.
   */
  function similar(a, b) {
    if (a === b) return true;
    const pa = key(a), pb = key(b);
    if (pa && pa === pb) return true;
    const L = Math.max(pa.length, pb.length);
    if (L < 4) {
      const [s, t] = a.length <= b.length ? [a, b] : [b, a];
      return s.length === 1 && t.length <= 2 && s[0] === t[0];
    }
    const tol = L <= 6 ? 1 : L <= 10 ? 2 : 3;
    if (Math.abs(pa.length - pb.length) > tol) return false;
    return levenshtein(pa, pb) <= tol;
  }

  /**
   * Avança pelo texto-alvo com as palavras faladas.
   * - lookahead: permite pular até 2 palavras não entendidas ("o", "e", "de");
   * - junta 2 ou 3 pedaços falados para leitura silabada ("ca cho rro").
   * Retorna o índice da próxima palavra a ler.
   */
  function matchProgress(target, spoken, start = 0, lookahead = 3) {
    let t = start;
    for (let i = 0; i < spoken.length && t < target.length; i++) {
      const limit = Math.min(t + lookahead, target.length);
      let matched = false;
      for (let k = t; k < limit && !matched; k++) {
        if (similar(spoken[i], target[k])) { t = k + 1; matched = true; break; }
        for (let j = 2; j <= 3 && i + j <= spoken.length; j++) {
          if (similar(spoken.slice(i, i + j).join(''), target[k])) { t = k + 1; i += j - 1; matched = true; break; }
        }
      }
    }
    return t;
  }

  /** Versão simples (recalcula do zero); usada só em testes. */
  function computeProgress(target, results) {
    let p = 0;
    for (const alts of results) {
      let best = p;
      for (const words of alts) best = Math.max(best, matchProgress(target, words, p));
      p = best;
      if (p >= target.length) break;
    }
    return p;
  }

  /**
   * Acompanha a leitura de uma página. O ponto de partida de cada
   * comparação é SEMPRE a posição já mostrada na tela (nunca volta),
   * então mesmo que o navegador reinicie a sessão de reconhecimento e
   * perca resultados antigos, a próxima fala casa a partir da palavra atual.
   *   - finals: resultados finais da página (só os novos são aplicados);
   *   - interims: resultados parciais atuais (reavaliados a cada evento).
   * Devolve também `miss`: um enunciado inteiro (parcial + final) que não
   * avançou nada, ou seja, uma tentativa de leitura que não foi entendida.
   */
  class Tracker {
    constructor(target) {
      this.target = target;
      this.progress = 0;        // palavras já marcadas como lidas (monotônico)
      this.committed = 0;       // ponteiro depois dos resultados finais (>= progress quando não há parcial viva)
      this.applied = 0;         // quantos resultados finais já foram aplicados
      this.liveAdvanced = false; // a parcial viva já fez a leitura avançar?
    }
    _best(alts, from) {
      let b = from;
      for (const words of alts) b = Math.max(b, matchProgress(this.target, words, from));
      return b;
    }
    set(p) {
      this.progress = Math.max(this.progress, Math.min(p, this.target.length));
      this.committed = Math.max(this.committed, this.progress);
    }
    update(finals, interims) {
      const before = this.progress;
      const len = this.target.length;
      let newFinal = false, misses = 0;
      for (; this.applied < finals.length; this.applied++) {
        // Um resultado final é casado a partir do ponteiro dos finais anteriores
        // (não do progresso mostrado), senão sua própria versão parcial, já
        // contada, faria as palavras casarem de novo com repetições ("o ... o").
        const beforeThis = this.progress;
        const p = this._best(finals[this.applied], this.committed);
        newFinal = true;
        this.progress = Math.max(this.progress, Math.min(p, len));
        this.committed = Math.max(this.committed, p, this.progress);
        if (this.progress === beforeThis && !this.liveAdvanced) misses++;
        this.liveAdvanced = false; // a parcial viva virou este final
      }
      let p = this.committed;
      for (const alts of interims) p = this._best(alts, p);
      const pInterim = Math.min(p, len);
      if (pInterim > this.progress) { this.progress = pInterim; this.liveAdvanced = true; }
      if (!interims.length) {
        // Sem parcial viva (foi finalizada ou a sessão caiu), o ponteiro alcança
        // o que está na tela: a próxima fala casa a partir da palavra atual.
        this.committed = Math.max(this.committed, this.progress);
        this.liveAdvanced = false;
      }
      return { advanced: this.progress > before, newFinal, miss: misses > 0, done: this.progress >= len };
    }
  }

  /* ---------- medidor do microfone (nível local, independente do reconhecedor) ---------- */
  class Meter {
    constructor(onLevel) {
      this.onLevel = onLevel;
      this.level = 0;       // RMS 0..1
      this.voicedMs = 0;    // tempo com voz desde o último reset (usado pelo vigia)
      this.stream = null;
      this.ctx = null;
      this.raf = 0;
      this._last = 0;
    }
    async start() {
      if (this.stream) return true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = this.ctx.createMediaStreamSource(this.stream);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        src.connect(this.analyser);
        this.buf = new Uint8Array(this.analyser.fftSize);
        this._last = performance.now();
        const tick = (now) => {
          if (!this.stream) return;
          this.analyser.getByteTimeDomainData(this.buf);
          let sum = 0;
          for (let i = 0; i < this.buf.length; i++) { const d = (this.buf[i] - 128) / 128; sum += d * d; }
          const rms = Math.sqrt(sum / this.buf.length);
          const dt = now - this._last; this._last = now;
          const voice = rms > 0.04;
          if (voice) this.voicedMs += dt;
          this.level = rms;
          this.onLevel && this.onLevel(rms, voice);
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
        return true;
      } catch (_) {
        this.stop();
        return false;
      }
    }
    resetVoiced() { this.voicedMs = 0; }
    stop() {
      cancelAnimationFrame(this.raf);
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
      if (this.ctx) { try { this.ctx.close(); } catch (_) { /* ignore */ } this.ctx = null; }
      this.level = 0; this.voicedMs = 0;
      this.onLevel && this.onLevel(0, false);
    }
  }

  /* ---------- ouvinte contínuo ---------- */
  class Listener {
    constructor(handlers) {
      this.h = handlers;
      this.meter = null;        // opcional: Meter para o vigia e o indicador
      this.active = false;
      this.rec = null;
      this.finalResults = [];   // resultados finais desta página: [[alt1, alt2, ...], ...]
      this.interimResults = [];
      this._nextFinal = 0;      // índice do próximo resultado final ainda não consumido
      this._ignoreBefore = 0;   // resultados anteriores à página atual são ignorados
      this._seen = 0;           // quantos resultados a sessão atual já entregou
      this._restartTimer = null;
      this._watchdog = null;
      this._startedAt = 0;
      this._lastResult = 0;
      this._speechAt = 0;       // quando o reconhecedor avisou que ouviu fala sem responder
      this.restarts = 0;
    }

    start() {
      if (!supported) return false;
      this.active = true;
      if (!this.rec) this._spawn();
      if (!this._watchdog) this._watchdog = setInterval(() => this._check(), 1000);
      return true;
    }

    _spawn() {
      if (!this.active) return;
      const rec = new SR();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      this._nextFinal = 0;
      this._ignoreBefore = 0;
      this._seen = 0;
      this._startedAt = Date.now();
      this._lastResult = this._startedAt;
      this._speechAt = 0;
      if (this.meter) this.meter.resetVoiced();
      rec.onstart = () => this.h.onState && this.h.onState('listening');
      rec.onspeechstart = () => { if (!this._speechAt) this._speechAt = Date.now(); this.h.onActivity && this.h.onActivity(true); };
      rec.onspeechend = () => this.h.onActivity && this.h.onActivity(false);
      rec.onresult = (e) => {
        this._lastResult = Date.now();
        this._speechAt = 0;
        if (this.meter) this.meter.resetVoiced();
        this._onResult(e);
      };
      rec.onerror = (e) => {
        const err = e.error;
        if (err === 'not-allowed' || err === 'service-not-allowed') { this.active = false; this.h.onError && this.h.onError('not-allowed'); }
        else if (err === 'audio-capture') { this.active = false; this.h.onError && this.h.onError('no-mic'); }
        else if (err === 'network') { this.active = false; this.h.onError && this.h.onError('network'); }
        // 'no-speech' e 'aborted' são normais: o onend reinicia a escuta.
      };
      rec.onend = () => {
        this.rec = null;
        // Parciais não finalizadas se perdem com a sessão: avisa o app (sem
        // texto novo) para o ponteiro de leitura alcançar o que está na tela.
        const hadInterim = this.interimResults.length > 0;
        this.interimResults = [];
        if (hadInterim && this.h.onWords) this.h.onWords(this.finalResults, [], undefined);
        if (this.active) this._restartTimer = setTimeout(() => this._spawn(), 0);
        else this.h.onState && this.h.onState('idle');
      };
      this.rec = rec;
      try { rec.start(); } catch (_) { /* já iniciado */ }
    }

    /**
     * Vigia (1x por segundo): se há voz no microfone (ou o reconhecedor avisou
     * que ouviu fala) e nenhum resultado chega, a sessão travou: reinicia.
     * Sessões muito longas também são renovadas, num momento de silêncio.
     */
    _check() {
      if (!this.active || !this.rec) return;
      const now = Date.now();
      const silentFor = now - this._lastResult;
      const voiced = this.meter ? this.meter.voicedMs : 0;
      if ((voiced > 2500 && silentFor > 4000) || (this._speechAt && now - this._speechAt > 5000)) { this.restart('travou'); return; }
      const quiet = !this._speechAt && (!this.meter || this.meter.level < 0.04);
      if (now - this._startedAt > 120000 && quiet && silentFor > 4000) this.restart('renovação');
    }

    restart(reason) {
      this.restarts++;
      this.h.onRestart && this.h.onRestart(reason);
      if (this.rec) { try { this.rec.abort(); } catch (_) { /* ignore */ } }   // onend → _spawn
      else this._spawn();
    }

    _onResult(e) {
      const interim = [];
      let lastText = '', lastIsFinal = false;
      this._seen = e.results.length;
      for (let i = this._ignoreBefore; i < e.results.length; i++) {
        const r = e.results[i];
        const alts = [];
        for (let a = 0; a < r.length; a++) {
          const words = r[a].transcript.split(/\s+/).map(normalize).filter(Boolean);
          if (words.length) alts.push(words);
        }
        if (r[0] && r[0].transcript.trim()) { lastText = r[0].transcript.trim(); lastIsFinal = !!r.isFinal; }
        if (r.isFinal) {
          if (i >= this._nextFinal) { this.finalResults.push(alts); this._nextFinal = i + 1; }
        } else {
          interim.push(alts);
        }
      }
      this.interimResults = interim;
      this.h.onWords && this.h.onWords(this.finalResults, this.interimResults, lastText, lastIsFinal);
    }

    /** Nova página: esquece o que foi ouvido e começa uma sessão nova e limpa. */
    reset() {
      this.finalResults = [];
      this.interimResults = [];
      this._ignoreBefore = this._seen;
      this._nextFinal = Math.max(this._nextFinal, this._seen);
      if (this.active) this.restart('nova página');
    }

    stop() {
      this.active = false;
      clearTimeout(this._restartTimer);
      clearInterval(this._watchdog);
      this._watchdog = null;
      if (this.rec) { try { this.rec.abort(); } catch (_) { /* ignore */ } this.rec = null; }
      this.h.onState && this.h.onState('idle');
    }
  }

  /* ---------- voz do navegador ---------- */
  const ttsSupported = 'speechSynthesis' in window;
  let voicesCache = [];
  if (ttsSupported) {
    voicesCache = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { voicesCache = window.speechSynthesis.getVoices(); };
  }

  /**
   * Escolhe a melhor voz pt-BR do navegador: no Edge as vozes neurais
   * "Online (Natural)" da Microsoft, no Chrome a "Google português do Brasil",
   * e por último as vozes do sistema (evitando as versões "compact").
   */
  function pickVoice(gender = 'f') {
    const voices = voicesCache.length ? voicesCache : (ttsSupported ? window.speechSynthesis.getVoices() : []);
    const br = voices.filter((v) => /^pt[-_]BR/i.test(v.lang));
    const pool = br.length ? br : voices.filter((v) => /^pt/i.test(v.lang));
    const score = (v) => {
      const n = v.name.toLowerCase();
      let s = 0;
      if (/natural|neural|online/.test(n)) s += 40;
      if (/google/.test(n)) s += 30;
      if (/premium|enhanced|aprimorad|melhorad/.test(n)) s += 20;
      if (gender === 'f' && /francisca|thalita|luciana|brenda|giovanna|leila|leticia|manuela|yara|elza|fem/.test(n)) s += 10;
      if (gender === 'm' && /antonio|donato|fabio|humberto|julio|nicolau|valerio|masc/.test(n)) s += 10;
      if (/compact/.test(n)) s -= 10;
      return s;
    };
    return pool.sort((a, b) => score(b) - score(a))[0] || null;
  }

  function speak(text, { rate = 0.85, gender = 'f', onEnd } = {}) {
    if (!ttsSupported) { onEnd && onEnd(); return false; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/—/g, ','));
    u.lang = 'pt-BR';
    u.rate = rate;
    const v = pickVoice(gender);
    if (v) u.voice = v;
    let ended = false;
    const end = () => { if (!ended) { ended = true; onEnd && onEnd(); } };
    u.onend = end;
    u.onerror = end;
    // Alguns navegadores não disparam onend; garante o fim pelo tamanho do texto.
    setTimeout(end, 1500 + text.length * 120);
    window.speechSynthesis.speak(u);
    return true;
  }

  function stopSpeaking() { if (ttsSupported) window.speechSynthesis.cancel(); }

  /** Nome do motor de reconhecimento que o navegador usa (só para informar). */
  function recognizerName() {
    if (!supported) return '';
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Microsoft (Edge)';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Google (Chrome)';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Apple (Safari)';
    return 'do navegador';
  }

  return { supported, ttsSupported, normalize, tokenize, phon, similar, matchProgress, computeProgress, Tracker, Meter, Listener, speak, stopSpeaking, pickVoice, recognizerName };
})();
