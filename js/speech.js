/* ============================================================
 * speech.js — reconhecimento de voz (Web Speech API, pt-BR),
 * comparação fonética das palavras lidas e voz do navegador.
 *
 * O motor de reconhecimento é o do navegador: no Chrome é o
 * reconhecedor pt-BR do Google, no Edge é o da Microsoft (Azure),
 * no Safari é o da Apple. Nada precisa ser instalado.
 * Tudo que acontece é registrado em DIAG (js/diag.js).
 * ============================================================ */

window.SPEECH = (function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SR;
  const log = (tag, msg, data) => { if (window.DIAG) window.DIAG.log(tag, msg, data); };

  const NUM = { 1: 'um', 2: 'dois', 3: 'tres', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez' };
  const ALIAS = {
    pra: 'para', pro: 'para', ta: 'esta', tava: 'estava', vc: 'voce', obrigadu: 'obrigado', the: 'de',
    esqueite: 'skate', esquete: 'skate', isqueite: 'skate', patinet: 'patinete',
  };
  // Números: o reconhecedor devolve "1" tanto para "um" quanto para "uma".
  const NUM_EQUIV = { um: 'uma', uma: 'um', dois: 'duas', duas: 'dois' };

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
   * 2 letras também vale. Devolve o motivo (string) ou '' se não casa.
   */
  function why(a, b) {
    if (a === b) return 'igual';
    if (NUM_EQUIV[a] === b) return 'número';
    const pa = key(a), pb = key(b);
    if (pa && pa === pb) return `fonética ${pa}`;
    const L = Math.max(pa.length, pb.length);
    if (L < 4) {
      const [s, t] = a.length <= b.length ? [a, b] : [b, a];
      return s.length === 1 && t.length <= 2 && s[0] === t[0] ? 'inicial' : '';
    }
    const tol = L <= 6 ? 1 : L <= 10 ? 2 : 3;
    if (Math.abs(pa.length - pb.length) > tol) return '';
    const d = levenshtein(pa, pb);
    return d <= tol ? `parecida ${pa}~${pb} (${d})` : '';
  }
  const similar = (a, b) => why(a, b) !== '';

  /**
   * Avança pelo texto-alvo com as palavras faladas.
   * - lookahead 2: permite pular no máximo 1 palavra não entendida ("o", "e", "de");
   * - junta 2 ou 3 pedaços falados para leitura silabada ("ca cho rro").
   * Retorna o índice da próxima palavra a ler; `trace` (opcional) recebe
   * uma linha por palavra falada explicando a decisão.
   */
  function matchProgress(target, spoken, start = 0, lookahead = 2, trace = null) {
    let t = start;
    for (let i = 0; i < spoken.length && t < target.length; i++) {
      // Palavra repetida ("uma uma": a criança repetiu ou o reconhecedor duplicou)
      // só pode casar com a próxima palavra esperada, nunca pulando.
      const repeated = i > 0 && spoken[i] === spoken[i - 1];
      const limit = Math.min(t + (repeated ? 1 : lookahead), target.length);
      let matched = false;
      for (let k = t; k < limit && !matched; k++) {
        // Pular uma palavra (k > t) só com casamento exato: as regras tolerantes
        // (fonética, número, inicial) valem apenas para a palavra esperada.
        const r1 = why(spoken[i], target[k]);
        if (r1 && (k === t || r1 === 'igual')) { if (trace) trace.push(`"${spoken[i]}"→#${k}"${target[k]}" ${r1}${k > t ? ` (pulou ${k - t})` : ''}`); t = k + 1; matched = true; break; }
        for (let j = 2; j <= 3 && i + j <= spoken.length; j++) {
          const joined = spoken.slice(i, i + j).join('');
          const rj = why(joined, target[k]);
          if (rj && (k === t || rj === 'igual')) { if (trace) trace.push(`"${spoken.slice(i, i + j).join('+')}"→#${k}"${target[k]}" junção ${rj}`); t = k + 1; i += j - 1; matched = true; break; }
        }
      }
      if (!matched && trace) trace.push(`"${spoken[i]}"✗ esperava #${t}"${target[t]}" [${key(spoken[i])}≠${key(target[t])}]${repeated ? ' (repetida)' : ''}`);
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
   * Um enunciado que não casou é guardado (`lastMiss`) e tentado junto com
   * o próximo: "ca" + "chorro" → "cachorro" (leitura silabada com pausa).
   */
  class Tracker {
    constructor(target) {
      this.target = target;
      this.progress = 0;        // palavras já marcadas como lidas (monotônico)
      this.committed = 0;       // ponteiro depois dos resultados finais (>= progress quando não há parcial viva)
      this.applied = 0;         // quantos resultados finais já foram aplicados
      this.liveAdvanced = false; // a parcial viva já fez a leitura avançar?
      this.lastMiss = null;     // palavras do último enunciado que não casou (para juntar com o próximo)
    }
    _best(alts, from, label) {
      let best = from, bestTrace = null, bestWords = null;
      const candidates = [];
      for (const words of alts) {
        candidates.push(words);
        if (this.lastMiss) candidates.push(this.lastMiss.concat(words));
      }
      for (const words of candidates) {
        const tr = [];
        const p = matchProgress(this.target, words, from, 2, tr);
        if (bestTrace === null || p > best) { best = Math.max(best, p); bestTrace = tr; bestWords = words; }
      }
      log('casar', `${label} de #${from} → #${best} ${best > from ? 'AVANÇOU' : 'não avançou'} | melhor alt: [${(bestWords || []).join(' ')}] | ${(bestTrace || []).join(' ; ')}`);
      return best;
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
        const p = this._best(finals[this.applied], this.committed, `final#${this.applied}`);
        newFinal = true;
        this.progress = Math.max(this.progress, Math.min(p, len));
        this.committed = Math.max(this.committed, p, this.progress);
        if (this.progress === beforeThis && !this.liveAdvanced) {
          misses++;
          const words = finals[this.applied][0] || [];
          this.lastMiss = words.length && words.length <= 3 ? words : null;
        } else {
          this.lastMiss = null;
        }
        this.liveAdvanced = false; // a parcial viva virou este final
      }
      let p = this.committed;
      interims.forEach((alts, i) => { p = this._best(alts, p, `parcial#${i}`); });
      const pInterim = Math.min(p, len);
      if (pInterim > this.progress) { this.progress = pInterim; this.liveAdvanced = true; this.lastMiss = null; }
      if (!interims.length) {
        // Sem parcial viva (foi finalizada ou a sessão caiu), o ponteiro alcança
        // o que está na tela: a próxima fala casa a partir da palavra atual.
        this.committed = Math.max(this.committed, this.progress);
        this.liveAdvanced = false;
      }
      const out = { advanced: this.progress > before, newFinal, miss: misses > 0, done: this.progress >= len };
      log('tracker', `progresso ${before}→${this.progress}/${len} committed=${this.committed} aplicados=${this.applied} vivoAvancou=${this.liveAdvanced} ultimoErro=${this.lastMiss ? '[' + this.lastMiss.join(' ') + ']' : '-'} → ${out.advanced ? 'avançou' : out.miss ? 'ERRO (tentativa não entendida)' : 'sem mudança'}${out.done ? ' PÁGINA COMPLETA' : ''}`);
      return out;
    }
  }

  /* ---------- medidor do microfone (nível local, só indicador) ---------- */
  class Meter {
    constructor(onLevel) {
      this.onLevel = onLevel;
      this.level = 0;
      this.voicedMs = 0;    // tempo com voz desde o último resultado (vigia de travamento)
      this.lastVoiceAt = 0; // último instante com voz (Date.now), para renovar só no silêncio
      this.stream = null;
      this.ctx = null;
      this.raf = 0;
      this._last = 0;
    }
    async start() {
      if (this.stream) return true;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { log('medidor', 'getUserMedia indisponível'); return false; }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = this.ctx.createMediaStreamSource(this.stream);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 512;
        src.connect(this.analyser);
        this.buf = new Uint8Array(this.analyser.fftSize);
        this._last = performance.now();
        const track = this.stream.getAudioTracks()[0];
        log('medidor', 'microfone aberto', { label: track && track.label, settings: track && track.getSettings ? track.getSettings() : null });
        const tick = (now) => {
          if (!this.stream) return;
          this.analyser.getByteTimeDomainData(this.buf);
          let sum = 0;
          for (let i = 0; i < this.buf.length; i++) { const d = (this.buf[i] - 128) / 128; sum += d * d; }
          const rms = Math.sqrt(sum / this.buf.length);
          const dt = now - this._last; this._last = now;
          const voice = rms > 0.04;
          if (voice) { this.voicedMs += dt; this.lastVoiceAt = Date.now(); }
          this.level = rms;
          this.onLevel && this.onLevel(rms, voice);
          this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
        return true;
      } catch (e) {
        log('medidor', 'falhou ao abrir o microfone', { name: e && e.name, message: e && e.message });
        this.stop();
        return false;
      }
    }
    resetVoiced() { this.voicedMs = 0; }
    stop() {
      cancelAnimationFrame(this.raf);
      if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; log('medidor', 'microfone fechado'); }
      if (this.ctx) { try { this.ctx.close(); } catch (_) { /* ignore */ } this.ctx = null; }
      this.level = 0; this.voicedMs = 0;
      this.onLevel && this.onLevel(0, false);
    }
  }

  /* ---------- ouvinte: um enunciado por vez ---------- */
  class Listener {
    constructor(handlers) {
      this.h = handlers;
      this.meter = null;
      this.active = false;
      this.rec = null;
      this.session = 0;         // número da sessão atual (cada start() do reconhecedor)
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
      this._ticks = 0;
      this.restarts = 0;
    }

    start() {
      if (!supported) { log('ouvinte', 'SpeechRecognition não existe neste navegador'); return false; }
      log('ouvinte', `start() active=${this.active} rec=${!!this.rec}`);
      this.active = true;
      if (!this.rec) this._spawn();
      if (!this._watchdog) this._watchdog = setInterval(() => this._check(), 500);
      return true;
    }

    _spawn() {
      if (!this.active) return;
      const rec = new SR();
      const id = ++this.session;
      const age = () => `${Date.now() - this._startedAt}ms`;
      rec.lang = 'pt-BR';
      // Sessão contínua e única. O modo "um enunciado por sessão" (v6) perdia
      // metade das palavras: o Chrome fecha a sessão ~100ms depois do fim da
      // fala, mas a primeira resposta do reconhecedor numa sessão nova leva
      // 1 a 2 s, então palavras curtas ("uma", "dá") morriam sem resultado.
      // "Uma palavra por vez" é garantido pelo Tracker, não pela sessão.
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      this._nextFinal = 0;
      this._ignoreBefore = 0;
      this._seen = 0;
      this._startedAt = Date.now();
      this._lastResult = this._startedAt;
      this._firstResultAt = 0;
      this._speechAt = 0;
      if (this.meter) this.meter.resetVoiced();
      rec.onstart = () => { log('sessão', `#${id} onstart (${age()} após start)`); this.h.onState && this.h.onState('listening'); };
      rec.onaudiostart = () => log('sessão', `#${id} onaudiostart ${age()}`);
      rec.onsoundstart = () => log('sessão', `#${id} onsoundstart ${age()}`);
      rec.onspeechstart = () => { log('sessão', `#${id} onspeechstart ${age()}`); if (!this._speechAt) this._speechAt = Date.now(); this.h.onActivity && this.h.onActivity(true); };
      rec.onspeechend = () => { log('sessão', `#${id} onspeechend ${age()}`); this.h.onActivity && this.h.onActivity(false); };
      rec.onsoundend = () => log('sessão', `#${id} onsoundend ${age()}`);
      rec.onaudioend = () => log('sessão', `#${id} onaudioend ${age()}`);
      rec.onnomatch = () => log('sessão', `#${id} onnomatch ${age()}`);
      rec.onresult = (e) => {
        const now = Date.now();
        log('sessão', `#${id} onresult ${age()} (${now - this._lastResult}ms desde o último) resultIndex=${e.resultIndex} results=${e.results.length}`);
        this._lastResult = now;
        if (!this._firstResultAt) this._firstResultAt = now;
        this._speechAt = 0;
        if (this.meter) this.meter.resetVoiced();
        this._onResult(e, id);
      };
      rec.onerror = (e) => {
        const err = e.error;
        log('sessão', `#${id} onerror "${err}" ${age()}`, e.message || '');
        if (err === 'not-allowed' || err === 'service-not-allowed') { this.active = false; this.h.onError && this.h.onError('not-allowed'); }
        else if (err === 'audio-capture') { this.active = false; this.h.onError && this.h.onError('no-mic'); }
        else if (err === 'network') { this.active = false; this.h.onError && this.h.onError('network'); }
        // 'no-speech' e 'aborted' são normais: o onend reinicia a escuta.
      };
      rec.onend = () => {
        const hadInterim = this.interimResults.length > 0;
        log('sessão', `#${id} onend ${age()} parcialPendente=${hadInterim} active=${this.active}`);
        this.rec = null;
        this.interimResults = [];
        // Parciais não finalizadas se perdem com a sessão: avisa o app (sem
        // texto novo) para o ponteiro de leitura alcançar o que está na tela.
        if (hadInterim && this.h.onWords) this.h.onWords(this.finalResults, [], undefined);
        if (this.active) this._restartTimer = setTimeout(() => this._spawn(), 0);
        else this.h.onState && this.h.onState('idle');
      };
      this.rec = rec;
      try { rec.start(); log('sessão', `#${id} start() chamado`); }
      catch (e) { log('sessão', `#${id} start() lançou`, String(e)); }
    }

    /**
     * Vigia (1x por segundo). Três proteções, todas só em momento de silêncio
     * do microfone para não cortar uma palavra ao meio:
     *  1) voz captada pelo microfone e nenhum resultado em 5s: a sessão travou;
     *  2) o reconhecedor avisou fala e não respondeu em 8s;
     *  3) renovação preventiva: o Chrome para de responder ~60s depois do
     *     primeiro resultado da sessão (sem disparar onend), então a sessão é
     *     renovada a partir dos 45s numa pausa (aos 55s mesmo com parcial pendente).
     * Também registra um batimento a cada 3s para alinhar os tempos no diagnóstico.
     */
    _check() {
      if (!this.active) return;
      const now = Date.now();
      const silentFor = now - this._lastResult;
      const age = now - (this._firstResultAt || this._startedAt);
      const voiced = this.meter ? this.meter.voicedMs : 0;
      const quietFor = this.meter && this.meter.lastVoiceAt ? now - this.meter.lastVoiceAt : Infinity;
      const pending = this.interimResults.length > 0;
      this._ticks++;
      if (this._ticks % 6 === 0) {
        log('batimento', `sessão#${this.session} rec=${!!this.rec} idade=${now - this._startedAt}ms desde1ºResultado=${this._firstResultAt ? now - this._firstResultAt + 'ms' : '-'} semResultado=${silentFor}ms vozSemResposta=${Math.round(voiced)}ms quietoHá=${quietFor === Infinity ? '-' : quietFor + 'ms'} falaSemResposta=${this._speechAt ? now - this._speechAt + 'ms' : '-'} nível=${this.meter ? this.meter.level.toFixed(3) : '-'} finais=${this.finalResults.length} parciais=${this.interimResults.length}`);
      }
      if (!this.rec) { if (now - this._startedAt > 3000) { log('vigia', 'sem sessão há mais de 3s, recriando'); this._spawn(); } return; }
      const quiet = quietFor > 800;
      // Uma tentativa de fala (voz captada depois do último resultado) tem que
      // ser respondida: se 2 s depois de a criança calar nada chegou, o
      // reconhecedor travou nesse enunciado; reinicia já, antes que ela repita.
      if (this.waiting() && quietFor > 2000) { this.restart(`fala de ${Math.round(voiced)}ms sem resposta ${(quietFor / 1000).toFixed(1)}s depois de terminar`); return; }
      if (this._speechAt && now - this._speechAt > 8000 && quiet) { this.restart('fala sem resposta há 8s'); return; }
      if (age > 45000 && quiet && silentFor > 1200 && (!pending || age > 55000)) this.restart(`renovação preventiva (${Math.round(age / 1000)}s desde o 1º resultado${pending ? ', parcial pendente' : ''})`);
    }

    /** Há fala captada pelo microfone ainda sem nenhum resultado do reconhecedor? */
    waiting() {
      const m = this.meter;
      return !!(this.active && this.rec && m && m.lastVoiceAt > this._lastResult && m.voicedMs > 400);
    }

    restart(reason) {
      this.restarts++;
      log('ouvinte', `restart: ${reason} (total ${this.restarts})`);
      this.h.onRestart && this.h.onRestart(reason);
      if (this.rec) { try { this.rec.abort(); } catch (_) { /* ignore */ } }   // onend → _spawn
      else this._spawn();
    }

    _onResult(e, id) {
      const interim = [];
      let lastText = '', lastIsFinal = false;
      this._seen = e.results.length;
      for (let i = this._ignoreBefore; i < e.results.length; i++) {
        const r = e.results[i];
        const alts = [];
        const desc = [];
        for (let a = 0; a < r.length; a++) {
          const raw = r[a].transcript;
          const words = raw.split(/\s+/).map(normalize).filter(Boolean);
          desc.push(`"${raw.trim()}"(${typeof r[a].confidence === 'number' ? r[a].confidence.toFixed(2) : '?'})`);
          if (words.length) alts.push(words);
        }
        log('resultado', `#${id} r${i} ${r.isFinal ? 'FINAL' : 'parcial'} alts=${desc.join(' | ')}`);
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

    /**
     * Nova página: esquece o que foi ouvido. A sessão é mantida (reiniciar
     * custa 1 a 2 s até a primeira resposta); só reinicia se há uma parcial
     * viva, porque as primeiras palavras da página nova poderiam ser
     * emendadas nela pelo reconhecedor.
     */
    reset() {
      const pending = this.interimResults.length > 0;
      const age = this.rec ? Date.now() - this._startedAt : 0;
      const renew = pending || age > 30000;   // sessão velha: renova agora, que a criança está olhando a página nova
      log('ouvinte', `reset (nova página) finais=${this.finalResults.length} parciais=${this.interimResults.length} idade=${age}ms sessão=${renew ? 'reiniciada' : 'mantida'}`);
      this.finalResults = [];
      this.interimResults = [];
      this._ignoreBefore = this._seen;
      this._nextFinal = Math.max(this._nextFinal, this._seen);
      if (this.active && renew) this.restart(pending ? 'nova página com parcial pendente' : `nova página, sessão com ${Math.round(age / 1000)}s`);
    }

    stop() {
      log('ouvinte', `stop() active=${this.active} rec=${!!this.rec}`);
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
    const end = (how) => { if (!ended) { ended = true; log('fala', `fim (${how})`); onEnd && onEnd(); } };
    u.onend = () => end('onend');
    u.onerror = (e) => end(`onerror ${e && e.error}`);
    // Alguns navegadores não disparam onend; garante o fim pelo tamanho do texto.
    setTimeout(() => end('timeout'), 1500 + text.length * 120);
    log('fala', `início "${text}" voz=${v ? v.name : 'padrão'}`);
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

  return { supported, ttsSupported, normalize, tokenize, phon, similar, why, matchProgress, computeProgress, Tracker, Meter, Listener, speak, stopSpeaking, pickVoice, recognizerName };
})();
