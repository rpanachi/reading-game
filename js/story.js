/* ============================================================
 * story.js — gera a história (texto + descrição das cenas)
 * a partir das escolhas do jogador. Tudo em pt-BR, com
 * concordância de gênero para personagem e "achado".
 * ============================================================ */

window.STORY = (function () {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const ag = (gender, m, f) => (gender === 'f' ? f : m);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function generate(sel) {
    const D = window.GAME_DATA;
    const c  = D.characters.find((x) => x.id === sel.character);
    const v  = D.vehicles.find((x) => x.id === sel.vehicle);
    const p  = D.places.find((x) => x.id === sel.place);
    const st = D.situations.find((x) => x.id === sel.situation);
    const f  = pick(st.variants);
    const dialog = sel.dialog, ending = sel.ending;

    const N = c.name;                       // nome do personagem
    const Def = cap(f.def);                 // "O coelho", "Davi"
    const def = f.def;
    const ele = ag(c.gender, 'Ele', 'Ela');
    const bothF = c.gender === 'f' && f.gender === 'f';
    const pair = bothF ? 'as duas' : 'os dois';
    const Pair = cap(pair);
    const isObject = f.kind === 'objeto';
    const foundIsHuman = f.kind === 'pessoa' || f.kind === 'crianca';

    const slides = [];
    const base = { place: p.id };

    // 1 — apresentação
    slides.push({
      text: `Era uma vez ${c.indef} ${ag(c.gender, 'chamado', 'chamada')} ${N}. ${ele} adorava passear ${v.phrase}.`,
      scene: { place: 'campo', character: { species: c.species, mood: 'happy', x: 400, scale: 1.05, vehicle: v.id, pose: 'wave' }, props: [] },
    });

    // 2 — a viagem
    slides.push({
      text: `Um dia, ${N} foi ${v.phrase} ${p.to}. O sol brilhava no céu.`,
      scene: { ...base, character: { species: c.species, mood: 'happy', x: 330, vehicle: v.id }, props: ['motion'] },
    });

    // 3 — o lugar
    slides.push({
      text: `${p.desc} ${N} olhou em volta, bem ${ag(c.gender, 'curioso', 'curiosa')}.`,
      scene: { ...base, character: { species: c.species, mood: 'curious', x: 260 }, props: ['question'] },
    });

    // 4 — o encontro
    let t4 = `De repente, ${N} encontrou ${f.indef}.`;
    if (isObject) t4 += ` Era ${f.indef} ${ag(f.gender, 'mágico', 'mágica')} que falava!`;
    slides.push({
      text: t4,
      scene: { ...base, character: { species: c.species, mood: 'surprised', x: 250 }, found: { id: f.id, mood: 'happy', x: 560 }, props: ['exclamation'] },
    });

    // 5 e 6 — o que acontece e a resposta
    const foundMood = { pedir_algo: 'talk', pedir_ajuda: 'surprised', chorando: 'sad', dancando: 'happy', brincando: 'happy', cantando: 'sing' }[dialog];
    const foundPose = dialog === 'dancando' ? 'dance' : (dialog === 'pedir_ajuda' ? 'wave' : 'stand');
    const dlg = {
      pedir_algo: {
        t5: `${Def} pediu uma coisa: — Você me dá um pouco de água? Estou com sede!`,
        p5: ['bubble:Água?'],
        t6: `${N} pegou sua garrafa e deu água para ${def}. — ${ag(f.gender, 'Obrigado', 'Obrigada')}! — disse ${def}.`,
        p6: ['bottle', 'hearts'],
      },
      pedir_ajuda: {
        t5: `${Def} pediu ajuda: — Socorro! Eu me perdi e não sei voltar para casa!`,
        p5: ['bubble:Socorro!'],
        t6: `— Não se preocupe, eu vou te ajudar! — disse ${N}. E ${pair} foram juntos procurar o caminho.`,
        p6: ['hearts', 'motion'],
      },
      chorando: {
        t5: `${Def} estava chorando. — Por que você está triste? — perguntou ${N}.`,
        p5: ['tears'],
        t6: `— Eu perdi meu brinquedo — disse ${def}. ${N} procurou e achou o brinquedo ali perto!`,
        p6: ['toy', 'hearts'],
      },
      dancando: {
        t5: `${Def} estava dançando. — Vem dançar comigo! — chamou ${def}.`,
        p5: ['notes'],
        t6: `${N} começou a dançar também. ${Pair} dançaram e riram muito!`,
        p6: ['notes', 'notes2'],
      },
      brincando: {
        t5: `${Def} estava brincando ${ag(f.gender, 'sozinho', 'sozinha')}. — Quer brincar comigo? — perguntou ${def}.`,
        p5: [f.id === 'bola' ? 'kite' : 'ball'],
        t6: `— Sim! — respondeu ${N}. ${Pair} brincaram a tarde toda ${p.at}.`,
        p6: [f.id === 'bola' ? 'kite' : 'ball', 'hearts'],
      },
      cantando: {
        t5: `${Def} estava cantando uma música bem bonita. — Lá, lá, lá! — cantava ${def}.`,
        p5: ['notes'],
        t6: `${N} bateu palmas e cantou junto. Que música alegre!`,
        p6: ['notes', 'notes2', 'hearts'],
      },
    }[dialog];

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
    const amigos = bothF ? 'grandes amigas' : 'grandes amigos';
    const end = {
      resolucao: {
        text: `No fim, tudo deu certo. ${N} e ${def} ficaram muito felizes. Fim!`,
        scene: { ...base, character: { species: c.species, mood: 'happy', pose: 'wave', x: 300 }, found: { id: f.id, mood: 'happy', pose: 'wave', x: 520 }, props: ['hearts', 'stars'] },
      },
      amizade: {
        text: `Depois daquele dia, ${N} e ${def} viraram ${amigos}. Fim!`,
        scene: { ...base, character: { species: c.species, mood: 'happy', x: 340 }, found: { id: f.id, mood: 'happy', x: 470 }, props: ['hearts'] },
      },
      licao: {
        text: `${N} pensou: — Ser gentil deixa o dia mais bonito! Fim!`,
        scene: { ...base, character: { species: c.species, mood: 'curious', x: 380, scale: 1.05 }, props: ['thought'] },
      },
      casa: {
        text: `Quando o sol se pôs, ${N} voltou para casa ${v.phrase}, feliz e ${ag(c.gender, 'cansado', 'cansada')}. Fim!`,
        scene: { place: 'por_do_sol', character: { species: c.species, mood: 'happy', x: 300, vehicle: v.id }, props: ['motion', 'house'] },
      },
    }[ending];
    slides.push(end);

    return {
      title: `${N} ${p.at}`,
      character: c, vehicle: v, place: p, found: f, dialog, ending,
      foundIsHuman,
      slides,
    };
  }

  return { generate };
})();
