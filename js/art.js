/* ============================================================
 * art.js — ilustrações vetoriais (SVG) geradas na hora
 * Estilo cartoon simples. Tudo é desenhado com primitivas:
 * personagens, veículos, cenários, "achados" e adereços.
 * ============================================================ */

window.ART = (function () {
  let uid = 0;
  const nid = (p) => `${p}${++uid}`;
  const DARK = '#263238';

  /* ---------- primitivas ---------- */
  const circle  = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
  const ellipse = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
  const rect    = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
  const path    = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const stroke  = (d, color, w = 3, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const line    = (x1, y1, x2, y2, color, w = 3, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const g       = (inner, extra = '') => `<g ${extra}>${inner}</g>`;
  const text    = (x, y, str, size, fill, extra = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="Fredoka, Nunito, Arial, sans-serif" font-weight="700" text-anchor="middle" ${extra}>${str}</text>`;
  const svg     = (viewBox, inner, cls = '') => `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" class="${cls}" aria-hidden="true">${inner}</svg>`;
  const tr      = (x, y, s = 1) => `transform="translate(${x},${y}) scale(${s})"`;

  /* ---------- rostos ---------- */
  function mouth(x, y, mood) {
    switch (mood) {
      case 'sad':       return stroke(`M${x - 11},${y + 5} Q${x},${y - 7} ${x + 11},${y + 5}`, DARK, 3);
      case 'surprised': return ellipse(x, y, 6, 8, DARK);
      case 'sing':
      case 'talk':      return ellipse(x, y, 9, 7, DARK) + ellipse(x, y + 3, 5, 3, '#ef5350');
      case 'curious':   return stroke(`M${x - 8},${y} Q${x + 2},${y + 8} ${x + 12},${y - 2}`, DARK, 3);
      default:          return stroke(`M${x - 12},${y - 2} Q${x},${y + 12} ${x + 12},${y - 2}`, DARK, 3);
    }
  }

  function face(cx, cy, mood = 'happy', o = {}) {
    const gap = o.gap || 13, r = o.eye || 7;
    const big = mood === 'surprised' ? 1.3 : 1;
    let s = '';
    for (const sx of [-1, 1]) {
      s += circle(cx + sx * gap, cy, r * big, '#fff', `stroke="${DARK}" stroke-width="1.5"`);
      s += circle(cx + sx * gap + 2, cy + 1, r * 0.5 * big, DARK);
    }
    if (mood === 'sad') {
      s += line(cx - gap - 7, cy - 14, cx - gap + 5, cy - 10, DARK, 2.5);
      s += line(cx + gap + 7, cy - 14, cx + gap - 5, cy - 10, DARK, 2.5);
    } else if (mood === 'curious') {
      s += line(cx + gap - 7, cy - 14, cx + gap + 7, cy - 17, DARK, 2.5);
    } else if (mood === 'surprised') {
      s += line(cx - gap - 6, cy - 17, cx - gap + 6, cy - 18, DARK, 2.5);
      s += line(cx + gap - 6, cy - 18, cx + gap + 6, cy - 17, DARK, 2.5);
    }
    if (!o.noMouth) s += mouth(cx, cy + (o.mouthDy || 16), mood);
    if (mood !== 'sad' && !o.noCheeks) {
      s += circle(cx - gap - 7, cy + 9, 5, 'rgba(244,143,177,0.55)');
      s += circle(cx + gap + 7, cy + 9, 5, 'rgba(244,143,177,0.55)');
    }
    return s;
  }

  function glasses(cx, cy) {
    return circle(cx - 13, cy, 11, 'none', 'stroke="#37474f" stroke-width="2.5"')
      + circle(cx + 13, cy, 11, 'none', 'stroke="#37474f" stroke-width="2.5"')
      + line(cx - 2, cy, cx + 2, cy, '#37474f', 2.5);
  }

  /* ---------- humanos parametrizados ---------- */
  const HUMANS = {
    menino:     { skin: '#ffcc99', hair: '#5d4037', style: 'short',    outfit: 'shirt', top: '#ff6b6b', bottom: '#3f51b5', shoes: '#37474f' },
    menina:     { skin: '#ffcc99', hair: '#3e2723', style: 'pigtails', outfit: 'dress', top: '#f06292', shoes: '#8e24aa', bow: '#ffca28' },
    davi:       { skin: '#c68642', hair: '#212121', style: 'short',    outfit: 'shirt', top: '#66bb6a', bottom: '#455a64', shoes: '#212121' },
    ana:        { skin: '#8d5524', hair: '#212121', style: 'curly',    outfit: 'dress', top: '#ffca28', shoes: '#e53935', bow: '#e53935' },
    senhor:     { skin: '#ffcc99', hair: '#cfd8dc', style: 'bald',     outfit: 'shirt', top: '#8d6e63', bottom: '#5d4037', shoes: '#3e2723', glasses: true, mustache: true, cane: true, hat: true, tall: 1.15 },
    senhora:    { skin: '#f1c27d', hair: '#e0e0e0', style: 'bun',      outfit: 'dress', top: '#7e57c2', shoes: '#4527a0', glasses: true, purse: true, tall: 1.1 },
    professora: { skin: '#e0ac69', hair: '#4e342e', style: 'long',     outfit: 'dress', top: '#42a5f5', shoes: '#0d47a1', glasses: true, book: true, tall: 1.15 },
  };

  const CAP = 'M-37,-190 Q-30,-232 0,-228 Q30,-232 37,-190 Q20,-205 0,-202 Q-20,-205 -37,-190 Z';

  function hair(h) {
    const c = h.hair;
    switch (h.style) {
      case 'short':    return path(CAP, c);
      case 'pigtails': return path(CAP, c) + ellipse(-48, -170, 12, 24, c) + ellipse(48, -170, 12, 24, c)
                          + circle(-45, -192, 7, h.bow) + circle(45, -192, 7, h.bow);
      case 'curly':    return circle(-28, -212, 14, c) + circle(0, -222, 16, c) + circle(28, -212, 14, c)
                          + circle(-40, -190, 12, c) + circle(40, -190, 12, c) + circle(-44, -166, 11, c) + circle(44, -166, 11, c)
                          + path(CAP, c);
      case 'bun':      return path(CAP, c) + circle(0, -232, 16, c);
      case 'long':     return path('M-38,-190 L-48,-115 L-28,-115 L-30,-175 Z', c) + path('M38,-190 L48,-115 L28,-115 L30,-175 Z', c) + path(CAP, c);
      case 'bald':     return path('M-37,-186 Q-40,-206 -26,-210 L-26,-178 Z', c) + path('M37,-186 Q40,-206 26,-210 L26,-178 Z', c);
      default:         return '';
    }
  }

  function humanArms(h, pose) {
    const arm = (x1, y1, x2, y2) => line(x1, y1, x2, y2, h.top, 16) + circle(x2, y2, 9, h.skin);
    if (pose === 'dance') return arm(-30, -130, -60, -178) + arm(30, -130, 60, -178);
    if (pose === 'wave')  return arm(-30, -130, -44, -85) + arm(30, -130, 58, -175);
    return arm(-30, -130, -44, -85) + arm(30, -130, 44, -85);
  }

  function human(id, mood = 'happy', pose = 'stand') {
    const h = HUMANS[id];
    let s = '';
    if (h.outfit === 'shirt') s += rect(-24, -72, 20, 72, h.bottom, 6) + rect(4, -72, 20, 72, h.bottom, 6);
    else s += rect(-20, -72, 16, 72, h.skin, 6) + rect(4, -72, 16, 72, h.skin, 6);
    s += ellipse(-14, 0, 17, 8, h.shoes) + ellipse(14, 0, 17, 8, h.shoes);
    if (h.outfit === 'shirt') s += rect(-32, -145, 64, 80, h.top, 16);
    else s += path('M-26,-145 L26,-145 L46,-58 L-46,-58 Z', h.top) + rect(-30, -145, 60, 40, h.top, 12);
    s += humanArms(h, pose);
    s += circle(0, -182, 37, h.skin);
    s += hair(h);
    s += face(0, -186, mood);
    if (h.glasses)  s += glasses(0, -186);
    if (h.mustache) s += path('M-14,-166 Q-7,-176 0,-166 Q7,-176 14,-166 Q7,-160 0,-166 Q-7,-160 -14,-166 Z', '#90a4ae');
    if (h.hat)      s += ellipse(0, -214, 46, 8, '#5d4037') + rect(-30, -248, 60, 36, '#6d4c41', 6);
    if (h.cane)     s += line(52, -92, 60, 0, '#8d6e63', 6) + stroke('M52,-92 Q52,-110 66,-106', '#8d6e63', 6);
    if (h.purse)    s += rect(-68, -95, 30, 26, '#e53935', 6) + stroke('M-64,-95 Q-53,-125 -42,-95', '#b71c1c', 3);
    if (h.book)     s += rect(38, -112, 28, 36, '#ef6c00', 3) + rect(41, -109, 22, 30, '#fff3e0', 2);
    return g(s, `transform="scale(${h.tall || 1})"`);
  }

  /* ---------- bichos personagens ---------- */
  function animalArms(c, pose) {
    const arm = (x1, y1, x2, y2) => line(x1, y1, x2, y2, c, 14) + circle(x2, y2, 9, c);
    if (pose === 'dance') return arm(-34, -115, -62, -162) + arm(34, -115, 62, -162);
    if (pose === 'wave')  return arm(-34, -115, -50, -75) + arm(34, -115, 60, -160);
    return arm(-34, -115, -50, -75) + arm(34, -115, 50, -75);
  }

  function cat(mood = 'happy', pose = 'stand') {
    const c = '#ffa726', d = '#ef6c00';
    let s = stroke('M30,-60 Q85,-70 72,-135', c, 12);
    s += rect(-30, -40, 22, 40, c, 8) + rect(8, -40, 22, 40, c, 8);
    s += ellipse(-19, 0, 16, 7, d) + ellipse(19, 0, 16, 7, d);
    s += ellipse(0, -85, 42, 55, c) + ellipse(0, -80, 22, 34, '#ffe0b2');
    s += stroke('M-40,-112 q10,7 20,0', d, 4) + stroke('M20,-112 q10,7 20,0', d, 4);
    s += animalArms(c, pose);
    s += path('M-38,-160 L-32,-208 L-4,-182 Z', c) + path('M38,-160 L32,-208 L4,-182 Z', c);
    s += path('M-30,-168 L-27,-196 L-12,-181 Z', '#f8bbd0') + path('M30,-168 L27,-196 L12,-181 Z', '#f8bbd0');
    s += circle(0, -160, 40, c);
    s += ellipse(0, -146, 18, 12, '#ffe0b2');
    s += face(0, -166, mood, { mouthDy: 22 });
    s += path('M-5,-154 L5,-154 L0,-148 Z', '#f48fb1');
    s += line(-20, -150, -46, -154, '#5d4037', 2) + line(-20, -145, -46, -141, '#5d4037', 2);
    s += line(20, -150, 46, -154, '#5d4037', 2) + line(20, -145, 46, -141, '#5d4037', 2);
    return s;
  }

  function dog(mood = 'happy', pose = 'stand') {
    const c = '#a1887f', d = '#6d4c41';
    let s = stroke('M30,-70 Q80,-82 66,-130', c, 12);
    s += rect(-30, -40, 22, 40, c, 8) + rect(8, -40, 22, 40, c, 8);
    s += ellipse(-19, 0, 16, 7, d) + ellipse(19, 0, 16, 7, d);
    s += ellipse(0, -85, 44, 55, c) + ellipse(0, -78, 24, 34, '#d7ccc8');
    s += animalArms(c, pose);
    s += rect(-28, -128, 56, 11, '#e53935', 4);
    s += ellipse(-42, -148, 14, 32, d) + ellipse(42, -148, 14, 32, d);
    s += circle(0, -160, 40, c);
    s += ellipse(0, -142, 22, 15, '#d7ccc8');
    s += face(0, -168, mood, { mouthDy: 26 });
    s += ellipse(0, -152, 8, 6, '#212121');
    return s;
  }

  function chicken(mood = 'happy', pose = 'stand') {
    const w = '#fffde7', o = '#ffa000', open = ['sing', 'talk', 'surprised'].includes(mood);
    let s = ellipse(-46, -95, 10, 26, '#ffb300', 'transform="rotate(30 -46 -95)"')
          + ellipse(-52, -82, 10, 24, '#ff8f00', 'transform="rotate(55 -52 -82)"');
    s += line(-12, -30, -12, 0, o, 5) + line(12, -30, 12, 0, o, 5);
    s += stroke('M-24,6 L-12,0 L-12,8 M-12,0 L0,6', o, 4) + stroke('M0,6 L12,0 L12,8 M12,0 L24,6', o, 4);
    s += ellipse(0, -80, 44, 50, w);
    const wingRot = pose === 'dance' ? -70 : -20;
    s += ellipse(-20, -82, 18, 30, '#ffecb3', `transform="rotate(${wingRot} -20 -82)"`);
    s += circle(0, -150, 32, w);
    s += circle(-12, -182, 8, '#e53935') + circle(0, -187, 9, '#e53935') + circle(12, -182, 8, '#e53935');
    if (open) s += path('M4,-152 L32,-147 L4,-141 Z', o) + path('M4,-138 L30,-132 L4,-127 Z', '#ff8f00');
    else s += path('M4,-149 L32,-142 L4,-134 Z', o);
    s += ellipse(4, -125, 6, 9, '#e53935');
    s += face(0, -158, mood, { noMouth: true, gap: 11, eye: 6 });
    return s;
  }

  function creature(species, mood = 'happy', pose = 'stand') {
    switch (species) {
      case 'gato':     return cat(mood, pose);
      case 'cachorro': return dog(mood, pose);
      case 'galinha':  return chicken(mood, pose);
      default:         return human(species, mood, pose);
    }
  }

  /* ---------- veículos ---------- */
  function bicycle() {
    const wheel = (x) => circle(x, -24, 24, 'none', 'stroke="#37474f" stroke-width="5"') + circle(x, -24, 4, '#37474f')
      + line(x - 17, -41, x + 17, -7, '#78909c', 2) + line(x + 17, -41, x - 17, -7, '#78909c', 2) + line(x, -48, x, 0, '#78909c', 2);
    let s = wheel(-50) + wheel(50);
    s += stroke('M-50,-24 L-15,-72 L32,-72 L50,-24 M-15,-72 L-5,-24 L50,-24 M32,-72 L44,-98', '#e53935', 6);
    s += rect(-30, -80, 26, 8, '#37474f', 4) + line(30, -98, 58, -98, '#37474f', 6);
    return s;
  }
  const skate   = () => rect(-55, -6, 110, 12, '#8d6e63', 6) + circle(-34, 10, 8, '#37474f') + circle(34, 10, 8, '#37474f');
  const scooter = () => rect(-45, -8, 82, 10, '#546e7a', 4) + line(35, -6, 58, -125, '#546e7a', 7)
                      + line(38, -125, 82, -125, '#37474f', 7) + circle(-38, 8, 9, '#37474f') + circle(46, 8, 9, '#37474f');
  function skates() {
    const one = (x) => rect(x - 17, -10, 34, 14, '#e53935', 5) + circle(x - 9, 9, 5, '#37474f') + circle(x + 9, 9, 5, '#37474f');
    return one(-14) + one(14);
  }
  function shoesIcon() {
    let s = ellipse(-22, 0, 22, 10, '#37474f') + ellipse(22, 0, 22, 10, '#37474f');
    s += rect(-36, -18, 28, 18, '#546e7a', 6) + rect(8, -18, 28, 18, '#546e7a', 6);
    s += stroke('M-18,-60 l6,-4 M-6,-70 l6,-4 M8,-80 l6,-4 M22,-90 l6,-4', '#90a4ae', 4, 'opacity="0.8"');
    return s;
  }

  /* ---------- achados (animais, objetos, pessoas) ---------- */
  function rabbit(mood = 'happy') {
    const w = '#fafafa', p = '#f8bbd0';
    let s = ellipse(-14, -156, 10, 32, w) + ellipse(14, -156, 10, 32, w) + ellipse(-14, -156, 5, 22, p) + ellipse(14, -156, 5, 22, p);
    s += circle(32, -40, 10, w) + ellipse(0, -50, 30, 40, w);
    s += ellipse(-14, -2, 16, 8, w) + ellipse(14, -2, 16, 8, w);
    s += circle(0, -100, 30, w);
    s += face(0, -104, mood, { gap: 11, eye: 6, mouthDy: 20 });
    s += path('M-4,-94 L4,-94 L0,-89 Z', p);
    return s;
  }
  function bird(mood = 'happy') {
    const b = '#42a5f5', d = '#1e88e5';
    let s = line(-8, -14, -8, 0, '#ff8f00', 3) + line(8, -14, 8, 0, '#ff8f00', 3);
    s += ellipse(-30, -40, 16, 8, d, 'transform="rotate(-25 -30 -40)"');
    s += ellipse(0, -35, 30, 24, b);
    s += ellipse(-6, -38, 16, 10, d, 'transform="rotate(-20 -6 -38)"');
    s += circle(18, -62, 17, b);
    s += path('M32,-64 L50,-59 L32,-53 Z', '#ffa000');
    s += face(18, -66, mood, { gap: 7, eye: 4, noMouth: true, noCheeks: true });
    return s;
  }
  function turtle(mood = 'happy') {
    const gr = '#66bb6a', dk = '#2e7d32', sk = '#a5d6a7';
    let s = stroke('M-52,-36 Q-72,-30 -64,-14', sk, 8);
    s += ellipse(-32, -6, 12, 7, sk) + ellipse(32, -6, 12, 7, sk) + ellipse(-14, -4, 12, 7, sk) + ellipse(14, -4, 12, 7, sk);
    s += path('M-52,-30 Q0,-98 52,-30 Z', gr) + ellipse(0, -30, 56, 12, dk);
    s += circle(0, -62, 10, dk) + circle(-24, -48, 8, dk) + circle(24, -48, 8, dk);
    s += circle(60, -50, 17, sk);
    s += face(60, -53, mood, { gap: 6, eye: 4, mouthDy: 11, noCheeks: true });
    return s;
  }
  function ball(mood) {
    const clip = nid('ballclip');
    let s = `<defs><clipPath id="${clip}"><circle cx="0" cy="-36" r="36"/></clipPath></defs>`;
    s += circle(0, -36, 36, '#ef5350');
    s += path('M-44,-28 Q0,-62 44,-28 L44,-6 Q0,-40 -44,-6 Z', '#fff', `clip-path="url(#${clip})"`);
    s += circle(0, -36, 36, 'none', 'stroke="#c62828" stroke-width="3"');
    if (mood) s += face(0, -40, mood, { gap: 10, eye: 5, mouthDy: 14, noCheeks: true });
    return s;
  }
  function kite(mood) {
    let s = path('M0,-150 L40,-95 L0,-20 L-40,-95 Z', '#ab47bc') + stroke('M0,-150 L0,-20 M-40,-95 L40,-95', '#6a1b9a', 3);
    s += stroke('M0,-20 Q22,0 0,18 Q-22,36 0,52', '#6a1b9a', 3);
    s += rect(-8, -4, 16, 8, '#ffca28', 2, 'transform="rotate(-20 0 0)"') + rect(-8, 30, 16, 8, '#ffca28', 2, 'transform="rotate(20 0 34)"');
    if (mood) s += face(0, -100, mood, { gap: 10, eye: 5, mouthDy: 16, noCheeks: true });
    return s;
  }
  function hat(mood) {
    let s = ellipse(0, -30, 56, 12, '#3f51b5') + rect(-32, -95, 64, 66, '#5c6bc0', 8) + rect(-32, -50, 64, 12, '#ffca28');
    if (mood) s += face(0, -74, mood, { gap: 11, eye: 5, mouthDy: 15, noCheeks: true });
    return s;
  }

  // posição dos olhos (coordenadas locais) para lágrimas/balões
  const FOUND_FACE = {
    coelho: { x: 0, y: -104, top: -190 }, passarinho: { x: 18, y: -66, top: -80 }, tartaruga: { x: 60, y: -53, top: -100 },
    bola: { x: 0, y: -40, top: -75 }, pipa: { x: 0, y: -100, top: -152 }, chapeu: { x: 0, y: -74, top: -96 },
    senhor: { x: 0, y: -214, top: -285 }, senhora: { x: 0, y: -205, top: -270 }, professora: { x: 0, y: -214, top: -265 },
    davi: { x: 0, y: -186, top: -232 }, ana: { x: 0, y: -186, top: -240 },
  };
  const FOUND_LIFT = { pipa: 70, passarinho: 0 };

  function found(id, mood = 'happy', pose = 'stand') {
    switch (id) {
      case 'coelho':     return rabbit(mood);
      case 'passarinho': return bird(mood);
      case 'tartaruga':  return turtle(mood);
      case 'bola':       return ball(mood);
      case 'pipa':       return kite(mood);
      case 'chapeu':     return hat(mood);
      default:           return human(id, mood, pose);
    }
  }

  /* ---------- cenários ---------- */
  function sky(top, bottom) {
    const id = nid('sky');
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`
      + rect(0, 0, 800, 450, `url(#${id})`);
  }
  function sun(x, y, r, c = '#ffd54f') {
    let s = '';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      s += line(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), x + Math.cos(a) * (r + 24), y + Math.sin(a) * (r + 24), c, 6);
    }
    return g(s + circle(x, y, r, c), 'opacity="0.95"');
  }
  const cloud = (x, y, s = 1) => g(ellipse(0, 0, 40, 18, '#fff') + circle(-18, -8, 18, '#fff') + circle(8, -14, 22, '#fff') + circle(26, -4, 16, '#fff'), `${tr(x, y, s)} opacity="0.95"`);
  const tree  = (x, y, s = 1, leaf = '#66bb6a') => g(rect(-10, -60, 20, 60, '#8d6e63', 4) + circle(0, -90, 40, leaf) + circle(-30, -70, 30, leaf) + circle(30, -70, 30, leaf), tr(x, y, s));
  const pine  = (x, y, s = 1, c = '#388e3c') => g(rect(-8, -40, 16, 40, '#6d4c41', 3) + path('M-45,-40 L0,-100 L45,-40 Z', c) + path('M-38,-80 L0,-135 L38,-80 Z', c) + path('M-30,-115 L0,-165 L30,-115 Z', c), tr(x, y, s));
  const bush  = (x, y, s = 1, c = '#7cb342') => g(circle(-20, 0, 18, c) + circle(0, -8, 22, c) + circle(22, 0, 18, c), tr(x, y, s));
  const flower = (x, y, c) => g(line(0, 0, 0, -18, '#558b2f', 3) + circle(-6, -22, 5, c) + circle(6, -22, 5, c) + circle(0, -28, 5, c) + circle(0, -16, 5, c) + circle(0, -22, 4, '#fff59d'), tr(x, y));
  const mushroom = (x, y) => g(rect(-8, -18, 16, 18, '#fff3e0', 4) + path('M-24,-18 Q0,-50 24,-18 Z', '#e53935') + circle(-8, -30, 4, '#fff') + circle(8, -26, 3, '#fff'), tr(x, y));
  const house = (x, y) => g(rect(-60, -110, 120, 110, '#ffcc80') + path('M-72,-110 L0,-170 L72,-110 Z', '#e53935') + rect(30, -160, 16, 30, '#8d6e63')
    + rect(-18, -55, 36, 55, '#6d4c41', 4) + rect(-50, -90, 28, 26, '#b3e5fc', 3) + rect(22, -90, 28, 26, '#b3e5fc', 3)
    + g(circle(38, -180, 8, '#eceff1') + circle(46, -196, 10, '#eceff1') + circle(56, -214, 12, '#eceff1'), 'opacity="0.8"'), tr(x, y));

  const BG = {
    campo() {
      let s = sky('#81d4fa', '#e1f5fe') + sun(700, 80, 42) + cloud(150, 90) + cloud(520, 60, 0.8);
      s += ellipse(200, 420, 380, 120, '#aed581') + ellipse(650, 430, 400, 130, '#9ccc65');
      s += rect(0, 340, 800, 110, '#8bc34a');
      s += tree(740, 350, 0.8, '#66bb6a') + bush(60, 372, 0.9);
      s += flower(120, 420, '#f06292') + flower(300, 430, '#ffca28') + flower(520, 425, '#ba68c8') + flower(680, 435, '#f06292');
      return s;
    },
    parque() {
      let s = sky('#81d4fa', '#e1f5fe') + sun(700, 80, 42) + cloud(150, 90) + cloud(520, 60, 0.8);
      s += rect(0, 330, 800, 120, '#7cb342');
      s += ellipse(560, 356, 130, 16, '#4fc3f7') + ellipse(560, 355, 100, 9, '#81d4fa');
      s += tree(70, 350, 1.1) + tree(180, 335, 0.7, '#81c784') + tree(640, 330, 0.7, '#81c784') + bush(270, 345, 0.8);
      s += g(rect(-45, -30, 90, 10, '#8d6e63', 3) + rect(-45, -52, 90, 8, '#8d6e63', 3) + rect(-40, -20, 8, 20, '#5d4037') + rect(32, -20, 8, 20, '#5d4037')
         + rect(-44, -44, 6, 14, '#5d4037') + rect(38, -44, 6, 14, '#5d4037'), tr(735, 372));
      s += flower(160, 425, '#f06292') + flower(430, 440, '#ffca28') + flower(760, 430, '#ba68c8');
      return s;
    },
    floresta() {
      let s = sky('#a5d6a7', '#dcedc8');
      s += pine(60, 335, 1.4, '#2e7d32') + pine(190, 325, 1.1) + tree(310, 335, 1.0, '#43a047') + pine(520, 325, 1.2, '#2e7d32') + tree(660, 330, 1.2, '#388e3c') + pine(770, 335, 1.3);
      s += rect(0, 335, 800, 115, '#558b2f');
      s += bush(120, 372, 1, '#33691e') + bush(700, 375, 1.1, '#33691e');
      s += mushroom(200, 410) + mushroom(600, 425);
      s += g(bird('happy'), tr(430, 200, 0.5));
      return s;
    },
    escola() {
      let s = sky('#81d4fa', '#e1f5fe') + sun(90, 80, 40) + cloud(600, 70, 0.9);
      s += rect(0, 330, 800, 120, '#8bc34a') + rect(0, 395, 800, 30, '#cfd8dc');
      s += path('M130,150 L400,70 L670,150 Z', '#ef5350') + rect(150, 150, 500, 200, '#ffcc80');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const x = 175 + c * 130, y = 175 + r * 80;
        if (r === 1 && (c === 1 || c === 2)) continue;
        s += rect(x, y, 60, 50, '#b3e5fc', 4, 'stroke="#fff" stroke-width="4"');
      }
      s += rect(300, 245, 200, 105, '#6d4c41', 6) + rect(310, 255, 85, 95, '#8d6e63', 4) + rect(405, 255, 85, 95, '#8d6e63', 4);
      s += rect(290, 112, 220, 40, '#fff', 8, 'stroke="#ff7043" stroke-width="3"') + text(400, 141, 'ESCOLA', 28, '#ff7043');
      s += line(720, 120, 720, 340, '#78909c', 6) + path('M720,120 L790,140 L720,160 Z', '#43a047') + path('M732,132 L768,140 L732,148 Z', '#ffca28');
      s += tree(60, 350, 0.9) + bush(760, 372, 0.9);
      return s;
    },
    festa() {
      let s = sky('#fce4ec', '#f8bbd0') + rect(0, 330, 800, 120, '#d7ccc8');
      const cols = ['#ef5350', '#ffca28', '#42a5f5', '#66bb6a', '#ab47bc'];
      for (let i = 0; i < 10; i++) {
        const x = 20 + i * 80, y = 30 + (i % 2) * 18;
        s += path(`M${x},${y} L${x + 40},${y + 4} L${x + 20},${y + 42} Z`, cols[i % 5]);
      }
      s += stroke('M0,30 Q200,60 400,30 T800,30', '#8d6e63', 3);
      const balloon = (x, y, c) => ellipse(x, y, 28, 36, c) + line(x, y + 36, x + 6, y + 120, '#78909c', 2) + circle(x - 9, y - 12, 6, 'rgba(255,255,255,0.5)');
      s += balloon(110, 150, '#ef5350') + balloon(160, 110, '#42a5f5') + balloon(690, 140, '#66bb6a') + balloon(735, 100, '#ffca28');
      s += rect(320, 300, 180, 18, '#8d6e63', 4) + rect(335, 318, 12, 40, '#6d4c41') + rect(473, 318, 12, 40, '#6d4c41');
      s += rect(370, 258, 80, 42, '#f48fb1', 6) + rect(382, 238, 56, 22, '#fff8e1', 5);
      for (const cx of [392, 410, 428]) s += line(cx, 236, cx, 222, '#ffca28', 4) + ellipse(cx, 216, 4, 7, '#ff7043');
      s += rect(550, 322, 46, 40, '#ab47bc', 4) + rect(550, 336, 46, 8, '#ffca28') + rect(569, 322, 8, 40, '#ffca28');
      for (let i = 0; i < 26; i++) {
        const x = (i * 137) % 800, y = 60 + ((i * 89) % 260);
        s += rect(x, y, 10, 6, cols[i % 5], 1, `transform="rotate(${(i * 37) % 90} ${x} ${y})" opacity="0.8"`);
      }
      return s;
    },
    praia() {
      let s = sky('#4fc3f7', '#b3e5fc') + sun(120, 80, 45);
      s += rect(0, 230, 800, 110, '#29b6f6');
      s += stroke('M0,250 Q40,240 80,250 T160,250 T240,250 T320,250 T400,250 T480,250 T560,250 T640,250 T720,250 T800,250', '#e1f5fe', 4);
      s += stroke('M0,295 Q40,285 80,295 T160,295 T240,295 T320,295 T400,295 T480,295 T560,295 T640,295 T720,295 T800,295', '#e1f5fe', 4);
      s += path('M0,340 Q400,320 800,340 L800,450 L0,450 Z', '#ffe082');
      s += line(660, 200, 660, 365, '#8d6e63', 6) + path('M570,210 A90,90 0 0 1 750,210 Z', '#ef5350')
         + path('M600,210 A60,90 0 0 1 660,120 L660,210 Z', '#fff') + path('M660,120 A60,90 0 0 1 720,210 L660,210 Z', '#fff');
      s += path('M700,340 L730,340 L724,372 L706,372 Z', '#ff7043') + stroke('M702,342 Q715,318 728,342', '#bf360c', 3);
      s += stroke('M290,95 q10,-10 20,0 q10,-10 20,0', '#546e7a', 3) + stroke('M360,120 q10,-10 20,0 q10,-10 20,0', '#546e7a', 3);
      s += circle(160, 420, 6, '#fff3e0') + circle(420, 435, 5, '#ffe0b2');
      return s;
    },
    por_do_sol() {
      let s = sky('#ff8a65', '#ffd54f') + circle(400, 330, 75, '#fff176', 'opacity="0.9"');
      s += ellipse(150, 440, 420, 120, '#795548') + ellipse(700, 440, 420, 130, '#6d4c41');
      s += rect(0, 345, 800, 105, '#8d6e63');
      s += stroke('M120,110 q10,-10 20,0 q10,-10 20,0', '#5d4037', 3) + stroke('M190,90 q8,-8 16,0 q8,-8 16,0', '#5d4037', 3);
      s += house(660, 382);
      return s;
    },
  };

  function background(place) {
    return (BG[place] || BG.campo)();
  }

  /* ---------- adereços com animação ---------- */
  const anim = (inner, values, dur) =>
    `<g>${inner}<animateTransform attributeName="transform" type="translate" values="${values}" dur="${dur}" repeatCount="indefinite"/></g>`;

  function notes(x, y, c = '#5e35b1') {
    const note = (dx, dy, s) => g(text(0, 0, '♪', 44, c), `transform="translate(${dx},${dy}) scale(${s})"`);
    const note2 = (dx, dy, s) => g(text(0, 0, '♫', 44, c), `transform="translate(${dx},${dy}) scale(${s})"`);
    return anim(note(x - 30, y, 1) + note2(x + 20, y - 30, 1.2) + note(x + 60, y + 5, 0.8), '0,0;0,-14;0,0', '1.4s');
  }
  function tears(x, y) {
    const drop = (dx, delay) => `<ellipse cx="${x + dx}" cy="${y + 8}" rx="4" ry="7" fill="#4fc3f7">
      <animate attributeName="cy" values="${y + 8};${y + 40}" dur="1s" begin="${delay}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1;0" dur="1s" begin="${delay}s" repeatCount="indefinite"/></ellipse>`;
    return drop(-16, 0) + drop(16, 0.5);
  }
  function bubble(x, y, str) {
    const w = Math.max(90, str.length * 17 + 30);
    return g(rect(-w / 2, -50, w, 52, '#fff', 16, 'stroke="#455a64" stroke-width="3"')
      + path('M-20,0 L-6,18 L2,0 Z', '#fff') + line(-20, 1, -6, 18, '#455a64', 3) + line(-6, 18, 2, 1, '#455a64', 3)
      + text(0, -14, str, 26, '#37474f'), tr(x, y));
  }
  function heart(x, y, s = 1, c = '#f06292') {
    return path(`M${x},${y + 12 * s} C${x - 22 * s},${y - 4 * s} ${x - 10 * s},${y - 20 * s} ${x},${y - 8 * s} C${x + 10 * s},${y - 20 * s} ${x + 22 * s},${y - 4 * s} ${x},${y + 12 * s} Z`, c);
  }
  function hearts(x, y) {
    const one = (dx, dy, s, delay) => `<g>${heart(x + dx, y + dy, s)}<animate attributeName="opacity" values="0;1;0" dur="2s" begin="${delay}s" repeatCount="indefinite"/></g>`;
    return one(-50, 0, 1.2, 0) + one(20, -30, 1, 0.6) + one(70, 10, 0.8, 1.2);
  }
  function star(x, y, r, c = '#ffca28') {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)} `;
    }
    return path(d + 'Z', c);
  }
  function stars() {
    let s = '';
    const pts = [[90, 60], [200, 130], [650, 90], [740, 180], [400, 50], [560, 150]];
    pts.forEach(([x, y], i) => { s += `<g>${star(x, y, 16 + (i % 3) * 5)}<animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="${i * 0.25}s" repeatCount="indefinite"/></g>`; });
    return s;
  }
  function motionLines(x, y) {
    return `<g opacity="0.8">${line(x, y, x - 40, y, '#fff', 5)}${line(x - 10, y + 25, x - 55, y + 25, '#fff', 5)}${line(x, y + 50, x - 40, y + 50, '#fff', 5)}
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.8s" repeatCount="indefinite"/></g>`;
  }
  function bouncingBall(x, groundY) {
    return anim(g(ball(null), tr(x, groundY, 0.55)), '0,0;0,-45;0,0', '0.9s') ;
  }
  function thought(x, y) {
    return g(circle(-30, 30, 7, '#fff', 'stroke="#455a64" stroke-width="2"') + circle(-12, 8, 11, '#fff', 'stroke="#455a64" stroke-width="2"')
      + ellipse(30, -34, 62, 42, '#fff', 'stroke="#455a64" stroke-width="3"') + heart(30, -34, 1.6, '#f06292'), tr(x, y));
  }
  const bottle = (x, y) => g(rect(-9, -40, 18, 46, '#4fc3f7', 6) + rect(-6, -50, 12, 12, '#0288d1', 3) + rect(-6, -22, 12, 14, '#fff', 2), tr(x, y));
  const toy = (x, y) => g(ellipse(0, -10, 16, 14, '#a1887f') + circle(0, -30, 12, '#a1887f') + circle(-9, -38, 5, '#a1887f') + circle(9, -38, 5, '#a1887f')
      + circle(-4, -31, 1.8, DARK) + circle(4, -31, 1.8, DARK) + ellipse(0, -26, 3, 2, DARK), tr(x, y));

  /* ---------- montagem da cena ---------- */
  const GROUND = 382;

  function characterSvg(ch) {
    let s = '', dy = 0;
    if (ch.vehicle === 'bicicleta') { s += bicycle(); dy = -12; }
    else if (ch.vehicle === 'skate') { s += skate(); dy = -8; }
    else if (ch.vehicle === 'patinete') { s += scooter(); dy = -8; }
    s += g(creature(ch.species, ch.mood, ch.pose), `transform="translate(0,${dy})"`);
    if (ch.vehicle === 'patins') s += skates();
    return s;
  }

  function renderScene(scene) {
    const ch = scene.character, fd = scene.found, props = scene.props || [];
    const cs = ch.scale || 1, fs = fd ? (fd.scale || 1) : 1;
    let s = background(scene.place);
    if (props.includes('house') && scene.place !== 'por_do_sol') s += house(660, GROUND);
    if (props.includes('kite')) s += anim(g(kite(null), tr(620, 200, 0.6)), '0,0;12,-16;0,0', '2.4s');

    if (fd) {
      const lift = FOUND_LIFT[fd.id] || 0;
      const inner = g(found(fd.id, fd.mood, fd.pose), tr(fd.x, GROUND - lift, fs));
      s += lift ? anim(inner, '0,0;0,-14;0,0', '2s') : inner;
    }
    s += g(characterSvg(ch), tr(ch.x, GROUND, cs));

    const headTop = GROUND - 240 * cs;
    const midX = fd ? (ch.x + fd.x) / 2 : ch.x;
    const ff = fd ? FOUND_FACE[fd.id] : null;
    const fEye = fd ? { x: fd.x + ff.x * fs, y: GROUND - (FOUND_LIFT[fd.id] || 0) + ff.y * fs, top: GROUND - (FOUND_LIFT[fd.id] || 0) + ff.top * fs } : null;

    for (const p of props) {
      if (p === 'motion') s += motionLines(ch.x - 70 * cs, GROUND - 150 * cs);
      else if (p === 'exclamation') s += anim(text(ch.x + 70 * cs, headTop + 10, '!', 72, '#ff7043', 'stroke="#fff" stroke-width="2"'), '0,0;0,-8;0,0', '0.7s');
      else if (p === 'question') s += anim(text(ch.x + 70 * cs, headTop + 10, '?', 72, '#5c6bc0', 'stroke="#fff" stroke-width="2"'), '0,0;0,-8;0,0', '1.2s');
      else if (p === 'tears' && fEye) s += tears(fEye.x, fEye.y);
      else if (p === 'notes') s += notes(fd ? fEye.x : ch.x + 60, fd ? fEye.top - 20 : headTop - 10);
      else if (p === 'notes2') s += notes(ch.x + 40, headTop - 10, '#e53935');
      else if (p === 'ball') s += bouncingBall(midX, GROUND);
      else if (p.startsWith('bubble:') && fEye) s += bubble(fEye.x - 40, fEye.top - 16, p.slice(7));
      else if (p === 'hearts') s += hearts(midX, GROUND - 270);
      else if (p === 'stars') s += stars();
      else if (p === 'thought') s += thought(ch.x + 40, headTop - 40);
      else if (p === 'bottle') s += bottle(ch.x + 48 * cs, GROUND - 78 * cs);
      else if (p === 'toy' && fEye) s += toy(fd.x - 60 * fs, GROUND);
    }
    return svg('0 0 800 450', s, 'scene-svg');
  }

  /* ---------- miniaturas do compositor ---------- */
  function thumb(kind, id) {
    if (kind === 'character') return svg('-115 -265 230 285', creature(id, 'happy'));
    if (kind === 'place') return svg('0 0 800 450', background(id));
    if (kind === 'vehicle') {
      switch (id) {
        case 'bicicleta': return svg('-100 -125 200 150', bicycle());
        case 'skate':     return svg('-80 -60 160 90', skate());
        case 'patinete':  return svg('-80 -150 180 180', scooter());
        case 'patins':    return svg('-60 -50 120 80', skates());
        default:          return svg('-70 -110 140 140', shoesIcon());
      }
    }
    if (kind === 'situation') {
      switch (id) {
        case 'animal':  return svg('-70 -205 140 225', rabbit('happy'));
        case 'objeto':  return svg('-60 -90 120 110', ball('happy'));
        case 'pessoa':  return svg('-110 -300 220 320', human('senhor', 'happy', 'wave'));
        default:        return svg('-120 -245 240 265', g(human('davi'), tr(-50, 0, 0.9)) + g(human('ana'), tr(50, 0, 0.9)));
      }
    }
    const faceIcon = (mood, extra = '') => circle(0, 0, 44, '#ffe082', 'stroke="#f9a825" stroke-width="3"') + face(0, -6, mood, { gap: 15, eye: 8, mouthDy: 20 }) + extra;
    if (kind === 'dialog') {
      switch (id) {
        case 'pedir_algo':  return svg('-100 -110 200 200', faceIcon('talk', g(bubble(0, 0, '?'), tr(52, -50, 0.75))));
        case 'pedir_ajuda': return svg('-110 -120 220 210', faceIcon('surprised', g(bubble(0, 0, 'Socorro!'), tr(30, -58, 0.7))));
        case 'chorando':    return svg('-100 -100 200 200', faceIcon('sad', tears(0, -6)));
        case 'dancando':    return svg('-110 -110 220 200', g(faceIcon('happy'), 'transform="rotate(-12)"') + notes(20, -60, '#5e35b1'));
        case 'brincando':   return svg('-110 -100 220 200', faceIcon('happy', anim(g(ball(null), tr(66, 88, 0.6)), '0,0;0,-16;0,0', '0.9s')));
        default:            return svg('-110 -110 220 200', faceIcon('sing') + notes(30, -60, '#e53935'));
      }
    }
    if (kind === 'ending') {
      switch (id) {
        case 'resolucao': return svg('-100 -100 200 200', sun(0, -10, 40) + heart(-60, 30, 1.2) + heart(60, 30, 1.2) + heart(0, 65, 1));
        case 'amizade':   return svg('-110 -100 220 200', circle(-34, 0, 38, '#ffe082', 'stroke="#f9a825" stroke-width="3"') + face(-34, -6, 'happy', { gap: 12, eye: 7, mouthDy: 18 })
                              + circle(34, 0, 38, '#b3e5fc', 'stroke="#4fc3f7" stroke-width="3"') + face(34, -6, 'happy', { gap: 12, eye: 7, mouthDy: 18 }) + heart(0, -60, 1.4));
        case 'licao':     return svg('-100 -120 200 200', faceIcon('curious') + g(thought(0, 0), tr(0, -30, 0.7)));
        default:          return svg('0 0 800 450', BG.por_do_sol());
      }
    }
    return '';
  }

  return { renderScene, thumb, star };
})();
