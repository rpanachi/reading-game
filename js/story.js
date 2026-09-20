/* ============================================================
 * story.js — gera a história (texto + descrição das cenas)
 * a partir das escolhas do jogador. Tudo em pt-BR, com
 * concordância de gênero para personagem e "achado".
 *
 * As mesmas escolhas rendem histórias diferentes: cada página tem
 * 3 versões do texto (a "variante" da história escolhe uma delas em
 * todas as páginas, com as descrições do lugar e do jeito de passear
 * combinando) e o "achado" da situação é sorteado entre 2 ou 3. As
 * variantes e os achados vão se revezando a cada história com as
 * mesmas escolhas (guardado no navegador), para a leitura não repetir.
 * ============================================================ */

window.STORY = (function () {
  const VARIANTS = 3;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const ag = (gender, m, f) => (gender === 'f' ? f : m);

  /* ---------- textos: 3 versões por página ---------- */
  const T1 = [
    (x) => `Era uma vez ${x.indef} ${x.chamado} ${x.N}. ${x.Ele} adorava passear ${x.manner}.`,
    (x) => `Esta é a história de ${x.N}, ${x.indef} muito alegre. ${x.Ele} gostava de passear ${x.manner}.`,
    (x) => `${x.N} era ${x.indef} ${x.esperto} e ${x.curioso}. Todo dia ${x.ele} saía para passear ${x.manner}.`,
  ];
  const T2 = [
    (x) => `Um dia, ${x.N} foi ${x.manner} ${x.to}. O sol brilhava no céu.`,
    (x) => `Numa manhã de sol, ${x.N} decidiu ir ${x.to}. ${x.Ele} foi ${x.manner}, bem ${x.animado}.`,
    (x) => `Naquele dia, ${x.N} quis ir ${x.to}. ${x.Ele} partiu ${x.manner}, cantarolando pelo caminho.`,
  ];
  const T3 = [
    (x) => `${x.desc} ${x.N} olhou em volta, bem ${x.curioso}.`,
    (x) => `${x.desc} — Que lugar bonito! — disse ${x.N}.`,
    (x) => `${x.desc} ${x.N} sorriu e foi passear por ali.`,
  ];
  const T4 = [
    (x) => `De repente, ${x.N} encontrou ${x.f.indef}.`,
    (x) => `Então ${x.N} viu ${x.f.indef} ${x.at}.`,
    (x) => `${x.N} deu alguns passos e, olha só, ali estava ${x.f.indef}!`,
  ];
  const T4_OBJ = (x) => ` Era ${x.f.indef} ${ag(x.f.gender, 'mágico', 'mágica')} que falava!`;

  // Páginas 5 e 6: o que acontece e a resposta. Cada diálogo tem 3 versões,
  // com os enfeites da cena (props) combinando com o texto.
  const DIALOGS = {
    pedir_algo: [
      (x) => ({
        t5: `${x.Def} pediu uma coisa: — Você me dá um pouco de água? Estou com sede!`, p5: ['bubble:Água?'],
        t6: `${x.N} pegou sua garrafa e deu água para ${x.def}. — ${x.obrigado}! — disse ${x.def}.`, p6: ['bottle', 'hearts'],
      }),
      (x) => ({
        t5: `${x.Def} estava com fome. — Você tem um lanchinho para mim? — pediu ${x.def}.`, p5: ['bubble:Fome!'],
        t6: `${x.N} abriu a mochila e dividiu seu lanche. ${x.Pair} comeram ${x.juntos}, felizes.`, p6: ['hearts'],
      }),
      (x) => ({
        t5: `— Você me empresta o seu boné? O sol está forte! — pediu ${x.def}.`, p5: ['bubble:Boné?'],
        t6: `${x.N} emprestou o boné na hora. — ${x.obrigado}, você é muito gentil! — disse ${x.def}.`, p6: ['hearts', 'stars'],
      }),
    ],
    pedir_ajuda: [
      (x) => ({
        t5: `${x.Def} pediu ajuda: — Socorro! Eu me perdi e não sei voltar para casa!`, p5: ['bubble:Socorro!'],
        t6: `— Não se preocupe, eu vou te ajudar! — disse ${x.N}. E ${x.pair} foram ${x.juntos} procurar o caminho.`, p6: ['hearts', 'motion'],
      }),
      (x) => ({
        t5: `${x.Def} precisava de ajuda: — Meu balão ficou preso na árvore! Você me ajuda?`, p5: ['bubble:Ajuda!'],
        t6: `${x.N} deu um pulo bem alto e pegou o balão. — Que alívio! — disse ${x.def}.`, p6: ['hearts', 'stars'],
      }),
      (x) => ({
        t5: `— Você me ajuda a atravessar a rua? Tem muitos carros! — pediu ${x.def}.`, p5: ['bubble:Ajuda?'],
        t6: `${x.N} olhou para os dois lados, e ${x.pair} atravessaram ${x.juntos}, com cuidado.`, p6: ['motion', 'hearts'],
      }),
    ],
    chorando: [
      (x) => ({
        t5: `${x.Def} estava chorando. — Por que você está triste? — perguntou ${x.N}.`, p5: ['tears'],
        t6: `— Eu perdi meu brinquedo — disse ${x.def}. ${x.N} procurou e achou o brinquedo ali perto!`, p6: ['toy', 'hearts'],
      }),
      (x) => ({
        t5: `${x.Def} estava chorando baixinho. — O que aconteceu? — perguntou ${x.N}, com carinho.`, p5: ['tears'],
        t6: `— Ninguém quer brincar comigo — disse ${x.def}. — Eu brinco com você! — respondeu ${x.N}. E o choro virou sorriso.`, p6: ['ball', 'hearts'],
      }),
      (x) => ({
        t5: `${x.N} ouviu um choro e olhou: era ${x.def}! — Não chore, eu estou aqui — disse ${x.N}.`, p5: ['tears'],
        t6: `— Eu perdi o caminho de volta — soluçou ${x.def}. ${x.N} mostrou o caminho, e ${x.pair} foram ${x.juntos}.`, p6: ['motion', 'hearts'],
      }),
    ],
    dancando: [
      (x) => ({
        t5: `${x.Def} estava dançando. — Vem dançar comigo! — chamou ${x.def}.`, p5: ['notes'],
        t6: `${x.N} começou a dançar também. ${x.Pair} dançaram e riram muito!`, p6: ['notes', 'notes2'],
      }),
      (x) => ({
        t5: `${x.Def} rodopiava ao som de uma música animada. — Vem, ${x.N}! Dança comigo! — gritou ${x.def}.`, p5: ['notes'],
        t6: `${x.N} entrou na dança, pulando e girando. ${x.Pair} não paravam de rir!`, p6: ['notes', 'notes2', 'stars'],
      }),
      (x) => ({
        t5: `Tinha música tocando, e ${x.def} dançava sem parar. — Olha só os meus passos! — disse ${x.def}.`, p5: ['notes'],
        t6: `${x.N} inventou um passo novo, e ${x.def} copiou. Que dança divertida!`, p6: ['notes', 'notes2', 'hearts'],
      }),
    ],
    brincando: [
      (x) => ({
        t5: `${x.Def} estava brincando ${ag(x.f.gender, 'sozinho', 'sozinha')}. — Quer brincar comigo? — perguntou ${x.def}.`, p5: [x.f.id === 'bola' ? 'kite' : 'ball'],
        t6: `— Sim! — respondeu ${x.N}. ${x.Pair} brincaram a tarde toda ${x.at}.`, p6: [x.f.id === 'bola' ? 'kite' : 'ball', 'hearts'],
      }),
      (x) => ({
        t5: `${x.Def} estava brincando de esconde-esconde. — Vem brincar também! — chamou ${x.def}.`, p5: ['bubble:Vem!'],
        t6: `${x.N} correu para se esconder atrás de uma árvore. ${x.Pair} brincaram até cansar!`, p6: ['motion', 'hearts'],
      }),
      (x) => ({
        t5: `${x.Def} pulava corda e ria alto. — Quer pular comigo? — perguntou ${x.def}.`, p5: ['bubble:Vem pular!'],
        t6: `— Claro! — disse ${x.N}. ${x.Pair} pularam, contaram até dez e caíram na gargalhada.`, p6: ['stars', 'hearts'],
      }),
    ],
    cantando: [
      (x) => ({
        t5: `${x.Def} estava cantando uma música bem bonita. — Lá, lá, lá! — cantava ${x.def}.`, p5: ['notes'],
        t6: `${x.N} bateu palmas e cantou junto. Que música alegre!`, p6: ['notes', 'notes2', 'hearts'],
      }),
      (x) => ({
        t5: `${x.Def} cantava uma canção sobre o sol. — Sol, sol, venha brincar! — cantava ${x.def}.`, p5: ['notes'],
        t6: `${x.N} aprendeu a canção e cantou junto, bem alto. Até os passarinhos pararam para ouvir!`, p6: ['notes', 'notes2', 'stars'],
      }),
      (x) => ({
        t5: `Uma voz bonita vinha de perto: era ${x.def}, cantando. — Você conhece esta música? — perguntou ${x.def}.`, p5: ['notes'],
        t6: `${x.N} não conhecia, mas aprendeu rapidinho. ${x.Pair} cantaram ${x.juntos} até o fim da tarde.`, p6: ['notes', 'notes2', 'hearts'],
      }),
    ],
  };

  const ENDINGS = {
    resolucao: [
      (x) => `No fim, tudo deu certo. ${x.N} e ${x.def} ficaram muito felizes. Fim!`,
      (x) => `E assim o dia terminou do jeito mais feliz. ${x.N} e ${x.def} sorriam de orelha a orelha. Fim!`,
      (x) => `Tudo acabou bem! ${x.N} e ${x.def} deram um abraço apertado e foram descansar. Fim!`,
    ],
    amizade: [
      (x) => `Depois daquele dia, ${x.N} e ${x.def} viraram ${x.amigos}. Fim!`,
      (x) => `Daquele dia em diante, ${x.N} e ${x.def} nunca mais se separaram: viraram ${x.amigos} de verdade. Fim!`,
      (x) => `${x.N} ganhou ${ag(x.f.gender, 'um amigo novo', 'uma amiga nova')}, e ${x.def} também. Que dia especial! Fim!`,
    ],
    licao: [
      (x) => `${x.N} pensou: — Ser gentil deixa o dia mais bonito! Fim!`,
      (x) => `${x.N} aprendeu uma coisa importante: ajudar os outros faz o coração ficar quentinho. Fim!`,
      (x) => `No caminho de volta, ${x.N} pensou: — Um amigo novo é o melhor presente do mundo! Fim!`,
    ],
    casa: [
      (x) => `Quando o sol se pôs, ${x.N} voltou para casa ${x.manner}, feliz e ${x.cansado}. Fim!`,
      (x) => `Quando começou a escurecer, ${x.N} se despediu e voltou para casa ${x.manner}. Que dia divertido! Fim!`,
      (x) => `O sol foi embora, e ${x.N} também. ${x.Ele} chegou em casa ${x.manner}, ${x.cansado} e contente, e dormiu sonhando com o passeio. Fim!`,
    ],
  };

  /* ---------- revezamento das variantes (guardado no navegador) ---------- */
  const store = {
    get(k) { try { return window.localStorage ? window.localStorage.getItem(k) : null; } catch (_) { return null; } },
    set(k, v) { try { if (window.localStorage) window.localStorage.setItem(k, String(v)); } catch (_) { /* sem storage */ } },
  };
  const choicesKey = (sel) => ['character', 'vehicle', 'place', 'situation', 'dialog', 'ending'].map((k) => sel[k]).join('|');

  /**
   * Próxima variante e próximo achado para estas escolhas. Um contador por
   * combinação de escolhas percorre todos os pares (variante, achado) antes
   * de repetir — 9 histórias com 3 achados, 6 com 2 — e duas histórias
   * seguidas nunca têm a mesma variante nem o mesmo achado. Sem storage
   * (ou na primeira vez), começa num ponto sorteado.
   */
  function rotate(sel) {
    const D = window.GAME_DATA;
    const st = D.situations.find((x) => x.id === sel.situation);
    const n = st ? st.variants.length : 1;
    const key = `historia:vez:${choicesKey(sel)}`;
    const last = store.get(key);
    const c = last === null ? Math.floor(Math.random() * VARIANTS * n) : Number(last) + 1;
    store.set(key, c);
    const variant = c % VARIANTS;
    // com n múltiplo de 3 o achado andaria junto com a variante; o deslocamento a cada volta desfaz isso
    const found = n ? (c + (n % VARIANTS === 0 ? Math.floor(c / VARIANTS) : 0)) % n : 0;
    return { variant, found };
  }

  /**
   * Gera a história. `opts.variant` (0 a 2) escolhe a versão dos textos e
   * `opts.found` o achado da situação; sem eles, sorteia.
   */
  function generate(sel, opts = {}) {
    const D = window.GAME_DATA;
    const c  = D.characters.find((x) => x.id === sel.character);
    const v  = D.vehicles.find((x) => x.id === sel.vehicle);
    const p  = D.places.find((x) => x.id === sel.place);
    const st = D.situations.find((x) => x.id === sel.situation);
    const k  = ((Number.isInteger(opts.variant) ? opts.variant : Math.floor(Math.random() * VARIANTS)) % VARIANTS + VARIANTS) % VARIANTS;
    const fi = Number.isInteger(opts.found) ? ((opts.found % st.variants.length) + st.variants.length) % st.variants.length : Math.floor(Math.random() * st.variants.length);
    const f  = st.variants[fi];
    const dialog = sel.dialog, ending = sel.ending;

    const bothF = c.gender === 'f' && f.gender === 'f';
    const pair = bothF ? 'as duas' : 'os dois';
    const isObject = f.kind === 'objeto';
    const foundIsHuman = f.kind === 'pessoa' || f.kind === 'crianca';

    // Tudo que os textos precisam, já com a concordância resolvida.
    const x = {
      N: c.name, indef: c.indef, f, def: f.def, Def: cap(f.def),
      ele: ag(c.gender, 'ele', 'ela'), Ele: ag(c.gender, 'Ele', 'Ela'),
      chamado: ag(c.gender, 'chamado', 'chamada'),
      esperto: ag(c.gender, 'esperto', 'esperta'),
      curioso: ag(c.gender, 'curioso', 'curiosa'),
      animado: ag(c.gender, 'animado', 'animada'),
      cansado: ag(c.gender, 'cansado', 'cansada'),
      obrigado: ag(f.gender, 'Obrigado', 'Obrigada'),
      pair, Pair: cap(pair), juntos: bothF ? 'juntas' : 'juntos',
      amigos: bothF ? 'grandes amigas' : 'grandes amigos',
      manner: (v.manners || [v.phrase])[k % (v.manners || [v.phrase]).length],
      to: p.to, at: p.at,
      desc: (p.descs || [p.desc])[k % (p.descs || [p.desc]).length],
    };

    const slides = [];
    const base = { place: p.id };

    // 1 — apresentação
    slides.push({
      text: T1[k](x),
      scene: { place: 'campo', character: { species: c.species, mood: 'happy', x: 400, scale: 1.05, vehicle: v.id, pose: 'wave' }, props: [] },
    });

    // 2 — a viagem
    slides.push({
      text: T2[k](x),
      scene: { ...base, character: { species: c.species, mood: 'happy', x: 330, vehicle: v.id }, props: ['motion'] },
    });

    // 3 — o lugar
    slides.push({
      text: T3[k](x),
      scene: { ...base, character: { species: c.species, mood: 'curious', x: 260 }, props: ['question'] },
    });

    // 4 — o encontro
    slides.push({
      text: T4[k](x) + (isObject ? T4_OBJ(x) : ''),
      scene: { ...base, character: { species: c.species, mood: 'surprised', x: 250 }, found: { id: f.id, mood: 'happy', x: 560 }, props: ['exclamation'] },
    });

    // 5 e 6 — o que acontece e a resposta
    const foundMood = { pedir_algo: 'talk', pedir_ajuda: 'surprised', chorando: 'sad', dancando: 'happy', brincando: 'happy', cantando: 'sing' }[dialog];
    const foundPose = dialog === 'dancando' ? 'dance' : (dialog === 'pedir_ajuda' ? 'wave' : 'stand');
    const dlg = DIALOGS[dialog][k](x);

    slides.push({
      text: dlg.t5,
      scene: { ...base, character: { species: c.species, mood: 'curious', x: 200, scale: 0.85 }, found: { id: f.id, mood: foundMood, pose: foundPose, x: 540, scale: 1.05 }, props: dlg.p5 },
    });

    const charMood6 = dialog === 'cantando' ? 'sing' : 'happy';
    const charPose6 = dialog === 'dancando' ? 'dance' : (dialog === 'cantando' ? 'wave' : 'stand');
    slides.push({
      text: dlg.t6,
      scene: { ...base, character: { species: c.species, mood: charMood6, pose: charPose6, x: 300 }, found: { id: f.id, mood: dialog === 'cantando' ? 'sing' : 'happy', pose: charPose6, x: 520 }, props: dlg.p6 },
    });

    // 7 — final
    const endScene = {
      resolucao: { ...base, character: { species: c.species, mood: 'happy', pose: 'wave', x: 300 }, found: { id: f.id, mood: 'happy', pose: 'wave', x: 520 }, props: ['hearts', 'stars'] },
      amizade: { ...base, character: { species: c.species, mood: 'happy', x: 340 }, found: { id: f.id, mood: 'happy', x: 470 }, props: ['hearts'] },
      licao: { ...base, character: { species: c.species, mood: 'curious', x: 380, scale: 1.05 }, props: ['thought'] },
      casa: { place: 'por_do_sol', character: { species: c.species, mood: 'happy', x: 300, vehicle: v.id }, props: ['motion', 'house'] },
    }[ending];
    slides.push({ text: ENDINGS[ending][k](x), scene: endScene });

    return {
      title: `${c.name} ${p.at}`,
      character: c, vehicle: v, place: p, found: f, dialog, ending,
      variant: k, foundIndex: fi,
      foundIsHuman,
      slides,
    };
  }

  return { generate, rotate, VARIANTS };
})();
