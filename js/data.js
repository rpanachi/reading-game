/* ============================================================
 * data.js — opções do compositor de histórias (pt-BR)
 * Cada opção carrega os dados de gênero/artigos necessários
 * para gerar frases gramaticalmente corretas.
 * ============================================================ */

window.GAME_DATA = (function () {
  const characters = [
    { id: 'menino',   label: 'Menino',   name: 'Leo',  species: 'menino',   gender: 'm', indef: 'um menino',   pronoun: 'ele', color: '#ff6b6b' },
    { id: 'menina',   label: 'Menina',   name: 'Bia',  species: 'menina',   gender: 'f', indef: 'uma menina',  pronoun: 'ela', color: '#f06292' },
    { id: 'gato',     label: 'Gato',     name: 'Tom',  species: 'gato',     gender: 'm', indef: 'um gato',     pronoun: 'ele', color: '#ffa726' },
    { id: 'cachorro', label: 'Cachorro', name: 'Rex',  species: 'cachorro', gender: 'm', indef: 'um cachorro', pronoun: 'ele', color: '#a1887f' },
    { id: 'galinha',  label: 'Galinha',  name: 'Lili', species: 'galinha',  gender: 'f', indef: 'uma galinha', pronoun: 'ela', color: '#fff3e0' },
  ];

  const vehicles = [
    { id: 'ape',       label: 'A pé',       phrase: 'a pé' },
    { id: 'bicicleta', label: 'Bicicleta',  phrase: 'de bicicleta' },
    { id: 'patins',    label: 'Patins',     phrase: 'de patins' },
    { id: 'skate',     label: 'Skate',      phrase: 'de skate' },
    { id: 'patinete',  label: 'Patinete',   phrase: 'de patinete' },
  ];

  const places = [
    { id: 'parque',   label: 'Parque',   to: 'até o parque',   at: 'no parque',   desc: 'O parque tinha árvores verdes e um lago azul.' },
    { id: 'floresta', label: 'Floresta', to: 'até a floresta', at: 'na floresta', desc: 'A floresta era cheia de árvores altas e passarinhos.' },
    { id: 'escola',   label: 'Escola',   to: 'até a escola',   at: 'na escola',   desc: 'A escola tinha um pátio grande e muito colorido.' },
    { id: 'festa',    label: 'Festa',    to: 'até a festa',    at: 'na festa',    desc: 'A festa tinha balões, bolo e muita música.' },
    { id: 'praia',    label: 'Praia',    to: 'até a praia',    at: 'na praia',    desc: 'A praia tinha areia quente e ondas azuis.' },
  ];

  // Cada situação tem variantes sorteadas na hora de gerar a história.
  // def = forma definida usada nas frases seguintes ("o coelho", "Davi").
  const situations = [
    {
      id: 'animal', label: 'Um animal',
      variants: [
        { id: 'coelho',     indef: 'um coelho',     def: 'o coelho',     gender: 'm', kind: 'animal' },
        { id: 'passarinho', indef: 'um passarinho', def: 'o passarinho', gender: 'm', kind: 'animal' },
        { id: 'tartaruga',  indef: 'uma tartaruga', def: 'a tartaruga',  gender: 'f', kind: 'animal' },
      ],
    },
    {
      id: 'objeto', label: 'Um objeto',
      variants: [
        { id: 'bola',   indef: 'uma bola',  def: 'a bola',   gender: 'f', kind: 'objeto' },
        { id: 'pipa',   indef: 'uma pipa',  def: 'a pipa',   gender: 'f', kind: 'objeto' },
        { id: 'chapeu', indef: 'um chapéu', def: 'o chapéu', gender: 'm', kind: 'objeto' },
      ],
    },
    {
      id: 'pessoa', label: 'Uma pessoa',
      variants: [
        { id: 'senhor',     indef: 'um senhor',     def: 'o senhor',     gender: 'm', kind: 'pessoa' },
        { id: 'senhora',    indef: 'uma senhora',   def: 'a senhora',    gender: 'f', kind: 'pessoa' },
        { id: 'professora', indef: 'uma professora', def: 'a professora', gender: 'f', kind: 'pessoa' },
      ],
    },
    {
      id: 'crianca', label: 'Outra criança',
      variants: [
        { id: 'davi', indef: 'um menino chamado Davi', def: 'Davi', gender: 'm', kind: 'crianca' },
        { id: 'ana',  indef: 'uma menina chamada Ana', def: 'Ana',  gender: 'f', kind: 'crianca' },
      ],
    },
  ];

  const dialogs = [
    { id: 'pedir_algo',  label: 'Pediu algo' },
    { id: 'pedir_ajuda', label: 'Pediu ajuda' },
    { id: 'chorando',    label: 'Estava chorando' },
    { id: 'dancando',    label: 'Estava dançando' },
    { id: 'brincando',   label: 'Estava brincando' },
    { id: 'cantando',    label: 'Estava cantando' },
  ];

  const endings = [
    { id: 'resolucao', label: 'Final feliz' },
    { id: 'amizade',   label: 'Novos amigos' },
    { id: 'licao',     label: 'Uma lição' },
    { id: 'casa',      label: 'Voltar para casa' },
  ];

  const sections = [
    { key: 'character', title: 'Quem é o personagem?', items: characters },
    { key: 'vehicle',   title: 'Como ele vai passear?', items: vehicles },
    { key: 'place',     title: 'Para onde ele vai?',    items: places },
    { key: 'situation', title: 'O que ele encontra?',   items: situations },
    { key: 'dialog',    title: 'O que acontece?',       items: dialogs },
    { key: 'ending',    title: 'Como termina?',         items: endings },
  ];

  return { characters, vehicles, places, situations, dialogs, endings, sections };
})();
