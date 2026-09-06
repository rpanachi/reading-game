/* ============================================================
 * app.js — controle das telas (compor → ler → fim)
 * ============================================================ */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const D = window.GAME_DATA;
  const VOICES = { francisca: { label: 'feminina', gender: 'f' }, antonio: { label: 'masculina', gender: 'm' } };
  const APP_VERSION = '10'; // aparece no rodapé da página de leitura; suba junto com o ?v= do index.html
  const log = (tag, msg, data) => DIAG.log(tag, msg, data);

  const state = {
    sel: { character: null, vehicle: null, place: null, situation: null, dialog: null, ending: null },
    story: null, index: 0, tokens: [], targets: [], progress: 0,
    listening: false, micDenied: false,
    startedAt: 0, wordsRead: 0,
    voice: 'francisca', tracker: null, missFinals: 0, speaking: false,
  };
  try { const v = localStorage.getItem('voz'); if (v && VOICES[v]) state.voice = v; } catch (_) { /* sem storage */ }

  /* ---------- sons (WebAudio, sem arquivos) ---------- */
  const audio = {
    ctx: null,
    ensure() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (_) { /* sem áudio */ }
      return this.ctx;
    },
    tone(freq, dur, when = 0, type = 'sine', vol = 0.12) {
      const ctx = this.ensure(); if (!ctx) return;
      const o = ctx.createOscillator(), gn = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      const t0 = ctx.currentTime + when;
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(gn).connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },
    tick() { this.tone(880, 0.09, 0, 'triangle', 0.05); },
    ding() { this.tone(659, 0.18); this.tone(880, 0.18, 0.12); this.tone(1319, 0.35, 0.24); },
    fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, i * 0.13, 'triangle', 0.1)); },
  };

  /* ---------- telas ---------- */
  function showScreen(name) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
    window.scrollTo(0, 0);
    log('tela', name);
  }

  function confetti(n) {
    const box = $('#confetti');
    const cols = ['#ef5350', '#ffca28', '#42a5f5', '#66bb6a', '#ab47bc', '#ff7043'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = cols[i % cols.length];
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
      setTimeout(() => p.remove(), 3400);
    }
  }

  /* ---------- tela 1: compositor ---------- */
  function renderComposer() {
    const main = $('#compose-sections');
    main.innerHTML = '';
    D.sections.forEach((sec, i) => {
      const wrap = document.createElement('section');
      wrap.className = 'choice';
      wrap.innerHTML = `<h2><span class="step">${i + 1}</span>${sec.title}</h2><div class="cards"></div>`;
      const cards = wrap.querySelector('.cards');
      sec.items.forEach((item) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'card';
        b.dataset.key = sec.key;
        b.dataset.id = item.id;
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `<div class="thumb">${ART.thumb(sec.key, item.id)}</div><div class="label">${item.label}</div><div class="check">✓</div>`;
        b.addEventListener('click', () => select(sec.key, item.id));
        cards.appendChild(b);
      });
      main.appendChild(wrap);
    });
    $('#hero-art').innerHTML = ART.thumb('character', 'menina') + ART.thumb('character', 'gato') + ART.thumb('character', 'galinha');
  }

  function select(key, id) {
    state.sel[key] = id;
    $$(`.card[data-key="${key}"]`).forEach((c) => {
      const on = c.dataset.id === id;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-pressed', String(on));
    });
    audio.tick();
    $('#btn-start').disabled = !D.sections.every((s) => state.sel[s.key]);
  }

  function randomize() {
    D.sections.forEach((s) => select(s.key, s.items[Math.floor(Math.random() * s.items.length)].id));
  }

  /* ---------- reconhecimento de voz ---------- */
  const listener = new SPEECH.Listener({
    onWords(finals, interims, lastText, lastIsFinal) {
      if (!state.story || !state.tracker) { log('app', 'resultado ignorado: sem história/tracker'); return; }
      log('app', `onWords finais=${finals.length} parciais=${interims.length} texto="${lastText || ''}"${lastIsFinal ? ' FINAL' : ''} falando=${state.speaking} progresso=${state.progress}/${state.targets.length} atual="${currentWord()}"`);
      // A contabilidade roda sempre (inclusive no aviso de fim de sessão que
      // chega enquanto o jogo fala); só a tela e as dicas esperam o silêncio.
      const r = state.tracker.update(finals, interims);
      if (state.speaking) { log('app', 'jogo está falando: tela não atualizada'); return; }
      // "Ouvi: …" mostra o que o reconhecedor entendeu (útil para diagnosticar);
      // "…" no fim significa resultado parcial, ainda em revisão. Quando a
      // interpretação difere do texto cru (ex.: "1" → "um"), ela aparece também.
      if (lastText) {
        const words = lastText.split(/\s+/).map(SPEECH.normalize).filter(Boolean).join(' ');
        const raw = lastText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
        const interp = words && words !== raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '') ? ` = ${words}` : '';
        $('#heard').textContent = `Ouvi: “${lastText}”${interp}${lastIsFinal ? '' : ' …'}`;
      }
      if (r.advanced) {
        setProgress(state.tracker.progress, 'voz');
        state.missFinals = 0;
        hideHint();
      } else if (r.miss && state.progress < state.targets.length) {
        // Uma tentativa inteira (parcial + final) não avançou a leitura.
        state.missFinals++;
        log('app', `tentativa não entendida nº${state.missFinals} na palavra "${currentWord()}"`);
        if (state.missFinals >= 2) skipCurrentWord();   // não deixa a criança presa numa palavra
        else showHint();
      }
    },
    onActivity(on) {
      $('#btn-mic').classList.toggle('hearing', on);
    },
    onRestart(reason) {
      log('app', `reinício do reconhecimento: ${reason}`);
    },
    onState(s) {
      state.listening = s === 'listening';
      if (state.listening) meter.start();   // microfone já liberado: liga o medidor visual
      updateMicUI();
      setStatus();
    },
    onError(kind) {
      log('app', `erro do reconhecimento: ${kind}`);
      state.listening = false;
      updateMicUI();
      if (kind === 'not-allowed') state.micDenied = true;
      showNotice(kind);
      setStatus();
    },
  });

  // Medidor local do microfone: só indicador visual (barras ao lado do 🎤).
  const vuBars = $$('#vu i');
  const meter = new SPEECH.Meter((level, voice) => {
    const n = Math.min(vuBars.length, Math.round(level * 25));
    vuBars.forEach((b, i) => b.classList.toggle('on', i < n));
    $('#vu').classList.toggle('voice', voice);
  });
  listener.meter = meter;

  function startListening() {
    if (!SPEECH.supported) return;
    log('app', 'startListening');
    audio.ensure();
    listener.start();
    $('#notice').hidden = true;
    setStatus('Ligando o microfone...');
  }

  function toggleMic() {
    if (listener.active) { log('app', 'microfone desligado pelo usuário'); listener.stop(); meter.stop(); setStatus('Microfone desligado.'); }
    else startListening();
  }

  function updateMicUI() {
    const b = $('#btn-mic');
    b.classList.toggle('on', state.listening);
    b.setAttribute('aria-pressed', String(state.listening));
    b.disabled = !SPEECH.supported;
  }

  function setStatus(msg) {
    const el = $('#status-line');
    if (msg) { el.textContent = msg; return; }
    if (state.progress >= state.targets.length && state.targets.length) el.textContent = 'Muito bem! 🎉 Vamos para a próxima página.';
    else if (state.listening) el.textContent = 'Leia em voz alta! 🎧';
    else el.textContent = SPEECH.supported ? 'Clique no microfone para começar a ler.' : 'Este navegador não reconhece voz.';
  }

  const NOTICES = {
    unsupported: 'Este navegador não tem reconhecimento de voz. Abra o jogo no Google Chrome ou no Microsoft Edge para ler com o microfone.',
    'not-allowed': 'O microfone não foi liberado. Permita o acesso ao microfone no navegador e clique no botão 🎤.',
    'no-mic': 'Nenhum microfone foi encontrado. Conecte um microfone e clique no botão 🎤.',
    network: 'O reconhecimento de voz precisa de internet e não conseguiu conectar. Verifique a conexão e clique no botão 🎤.',
  };
  function showNotice(kind) {
    const n = $('#notice');
    if (NOTICES[kind]) { n.textContent = NOTICES[kind]; n.hidden = false; }
  }

  /* ---------- dicas quando a palavra não foi entendida ---------- */
  function currentWord() {
    const tok = state.tokens.find((t) => t.wordIndex === state.progress);
    return tok ? tok.text.replace(/[^\p{L}\p{N}'-]/gu, '') : '';
  }
  function showHint() {
    const w = currentWord();
    if (!w) return;
    log('app', `dica: tente de novo "${w}"`);
    const h = $('#hint');
    h.innerHTML = `Tente de novo: <b>${w}</b> <span class="hint-ear">🔊 ouvir a palavra</span>`;
    h.hidden = false;
    const span = $(`#reading-text .w[data-wi="${state.progress}"]`);
    if (span) { span.classList.remove('shake'); void span.offsetWidth; span.classList.add('shake'); }
  }
  function hideHint() { $('#hint').hidden = true; }

  /** Duas tentativas não entendidas: marca a palavra como pulada e segue em frente. */
  function skipCurrentWord() {
    log('app', `pulando a palavra "${currentWord()}" após 2 tentativas`);
    const span = $(`#reading-text .w[data-wi="${state.progress}"]`);
    if (span) span.classList.add('skipped');
    state.missFinals = 0;
    hideHint();
    setProgress(state.progress + 1, 'pulo automático', { count: false, manual: true });
    if (state.progress < state.targets.length) setStatus('Tudo bem, vamos em frente! 💪');
  }

  /* ---------- fala: melhor voz pt-BR do navegador ---------- */
  function updateEngineLabel() {
    const v = SPEECH.pickVoice(VOICES[state.voice].gender);
    const tts = v ? `voz: ${v.name}` : 'sem voz disponível neste navegador';
    const rec = SPEECH.supported ? ` · reconhecimento ${SPEECH.recognizerName()}` : '';
    $('#tts-engine').textContent = `${tts}${rec} · v${APP_VERSION}`;
  }

  function speakText(text) {
    if (!text || state.speaking) return;
    const wasListening = listener.active;
    log('app', `falar "${text}" (microfone ${wasListening ? 'pausado' : 'já desligado'})`);
    if (wasListening) listener.stop();   // o microfone não deve "ouvir" a própria voz do jogo
    state.speaking = true;
    $('#btn-listen').disabled = true;
    setStatus('Ouça com atenção... 🔊');
    const done = () => {
      state.speaking = false;
      $('#btn-listen').disabled = false;
      if (wasListening) startListening(); else setStatus();
    };
    updateEngineLabel();
    SPEECH.speak(text, { gender: VOICES[state.voice].gender, onEnd: done });
  }

  /* ---------- tela 2: leitura ---------- */
  function startStory() {
    state.story = STORY.generate(state.sel);
    state.wordsRead = 0;
    state.startedAt = Date.now();
    log('história', 'início', { escolhas: state.sel, paginas: state.story.slides.map((s) => s.text) });
    showScreen('read');
    goToSlide(0);
    // Escutar é o padrão ao abrir a história; se o microfone falhar, o
    // onError mostra o aviso com o motivo.
    if (!SPEECH.supported) showNotice('unsupported');
    else startListening();
  }

  function goToSlide(i) {
    const slide = state.story.slides[i];
    state.index = i;
    state.progress = 0;
    state.missFinals = 0;
    state.tokens = SPEECH.tokenize(slide.text);
    state.targets = state.tokens.filter((t) => t.wordIndex !== null).map((t) => t.norm);
    state.tracker = new SPEECH.Tracker(state.targets);
    log('página', `${i + 1}/${state.story.slides.length} "${slide.text}"`, { alvos: state.targets.map((w, k) => `#${k}${w}`).join(' ') });
    const scene = $('#scene');
    scene.classList.remove('done');
    scene.innerHTML = ART.renderScene(slide.scene);
    renderText();
    renderDots();
    hideHint();
    $('#page-label').textContent = `Página ${i + 1} de ${state.story.slides.length}`;
    const next = $('#btn-next');
    next.disabled = true;
    next.classList.remove('pulse');
    next.textContent = i === state.story.slides.length - 1 ? 'Terminar ✨' : 'Próxima página →';
    $('#heard').textContent = '';
    listener.reset();
    SPEECH.stopSpeaking();
    updateEngineLabel();
    setStatus();
  }

  function renderDots() {
    $('#dots').innerHTML = state.story.slides
      .map((_, i) => `<span class="dot${i < state.index ? ' done' : ''}${i === state.index ? ' current' : ''}"></span>`)
      .join('');
  }

  function renderText() {
    const p = $('#reading-text');
    p.innerHTML = '';
    state.tokens.forEach((tok) => {
      const span = document.createElement('span');
      span.className = 'w' + (tok.wordIndex === null ? ' punct' : '');
      span.textContent = tok.text;
      if (tok.wordIndex !== null) {
        span.dataset.wi = tok.wordIndex;
        span.title = 'Toque para ouvir a palavra';
        span.addEventListener('click', () => speakText(tok.text.replace(/[^\p{L}\p{N}'-]/gu, '')));
      }
      p.appendChild(span);
      p.appendChild(document.createTextNode(' '));
    });
    updateHighlight();
  }

  function updateHighlight() {
    $$('#reading-text .w[data-wi]').forEach((span) => {
      const wi = Number(span.dataset.wi);
      span.classList.toggle('read', wi < state.progress);
      span.classList.toggle('current', wi === state.progress);
    });
  }

  function setProgress(p, source, { count = true, manual = false } = {}) {
    const total = state.targets.length;
    const wasComplete = state.progress >= total;
    const clamped = Math.min(p, total);
    const delta = clamped - state.progress;
    if (delta <= 0) return;
    log('app', `progresso ${state.progress}→${clamped}/${total} (${source}) próxima="${state.targets[clamped] || '-'}"`);
    state.progress = clamped;
    // Só um pulo manual move o ponto de partida do Tracker. Fazer isso a cada
    // avanço por voz empurrava o ponteiro para depois de palavras que ainda
    // estavam numa parcial viva, e o resultado final as casava de novo mais à
    // frente ("uma" virava "um" pulando "vez"; "com" pulava "Estou").
    if (manual && state.tracker) state.tracker.set(clamped);
    if (count) state.wordsRead += delta;
    updateHighlight();
    if (state.progress >= total && !wasComplete) onSlideComplete();
    else audio.tick();
  }

  function onSlideComplete() {
    log('app', 'página completa');
    audio.ding();
    hideHint();
    $('#scene').classList.add('done');
    confetti(18);
    const next = $('#btn-next');
    next.disabled = false;
    next.classList.add('pulse');
    next.focus();
    setStatus();
  }

  function nextSlide() {
    if (state.index < state.story.slides.length - 1) goToSlide(state.index + 1);
    else finish();
  }

  function fmtTime(secs) {
    const m = Math.floor(secs / 60), s = secs % 60;
    return m ? `${m}min ${s}s` : `${s}s`;
  }

  function finish() {
    log('história', 'fim');
    listener.stop();
    meter.stop();
    SPEECH.stopSpeaking();
    const secs = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000));
    const last = state.story.slides[state.story.slides.length - 1];
    $('#end-art').innerHTML = ART.renderScene({ ...last.scene, props: [...(last.scene.props || []), 'stars'] });
    $('#end-stats').innerHTML =
      `<div class="stat"><b>${state.story.slides.length}</b><span>páginas</span></div>` +
      `<div class="stat"><b>${state.wordsRead}</b><span>palavras lidas</span></div>` +
      `<div class="stat"><b>${fmtTime(secs)}</b><span>de leitura</span></div>`;
    showScreen('end');
    audio.fanfare();
    confetti(70);
  }

  function readAgain() {
    state.wordsRead = 0;
    state.startedAt = Date.now();
    log('história', 'ler de novo');
    showScreen('read');
    goToSlide(0);
    if (SPEECH.supported) startListening();
  }

  function backToCompose() {
    listener.stop();
    meter.stop();
    SPEECH.stopSpeaking();
    state.story = null;
    showScreen('compose');
  }

  async function copyDiagnostics() {
    if (!DIAG.enabled) return;
    log('app', 'copiando diagnóstico');
    const ok = await DIAG.copy();
    setStatus(ok ? `Diagnóstico copiado (${DIAG.size()} linhas). Cole no chat.` : 'Não consegui copiar; abra o console do navegador.');
  }

  /* ---------- eventos ---------- */
  $('#btn-random').addEventListener('click', randomize);
  $('#btn-start').addEventListener('click', startStory);
  $('#btn-back').addEventListener('click', backToCompose);
  $('#btn-new').addEventListener('click', backToCompose);
  $('#btn-again').addEventListener('click', readAgain);
  $('#btn-next').addEventListener('click', nextSlide);
  $('#btn-skip').addEventListener('click', () => { log('app', 'pular página'); setProgress(state.targets.length, 'pular página', { count: false, manual: true }); });
  $('#btn-mic').addEventListener('click', toggleMic);
  $('#btn-listen').addEventListener('click', () => speakText(state.story.slides[state.index].text));
  $('#btn-diag').addEventListener('click', copyDiagnostics);
  $('#hint').addEventListener('click', () => speakText(currentWord()));
  $('#voice').value = state.voice;
  $('#voice').addEventListener('change', (e) => {
    state.voice = e.target.value;
    try { localStorage.setItem('voz', state.voice); } catch (_) { /* sem storage */ }
    updateEngineLabel();
  });
  if (SPEECH.ttsSupported) window.speechSynthesis.addEventListener('voiceschanged', updateEngineLabel);

  document.addEventListener('keydown', (e) => {
    if (!$('#screen-read').classList.contains('active')) return;
    if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') && !$('#btn-next').disabled) {
      e.preventDefault();
      nextSlide();
    }
  });

  // O botão de diagnóstico só existe em modo DEBUG (local ou ?debug=1).
  $('#btn-diag').hidden = !DIAG.enabled;
  log('app', `versão ${APP_VERSION} carregada`, { reconhecimento: SPEECH.supported, recognizer: SPEECH.recognizerName(), voz: SPEECH.ttsSupported });
  renderComposer();
  updateMicUI();
  updateEngineLabel();
})();
