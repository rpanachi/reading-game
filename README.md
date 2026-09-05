# Minha História — jogo de leitura (pt-BR)

Jogo para ajudar crianças a ler. A criança monta uma história escolhendo
personagem, veículo, lugar, situação, diálogo e final; o jogo gera na hora
o texto e as ilustrações (SVG, estilo cartoon) e apresenta tudo como um
livro de 7 páginas. Enquanto a criança lê em voz alta, o reconhecimento de
voz do navegador marca as palavras lidas e libera a próxima página.

Tudo roda no navegador, sem instalar nada e sem servidor próprio.

## Como rodar

Os arquivos são estáticos. Abra um servidor simples na pasta do projeto:

```bash
python3 -m http.server 8080
```

Depois acesse <http://localhost:8080> no **Microsoft Edge** ou no
**Google Chrome**.

* O reconhecimento de voz usa a **Web Speech API** (`SpeechRecognition`,
  idioma `pt-BR`). É o reconhecedor nativo do navegador: no Edge é o da
  Microsoft, no Chrome é o do Google, no Safari é o da Apple. O áudio é
  processado pelo serviço do navegador, então é preciso estar online.
* A página precisa ser servida por `http://localhost` ou `https://` para o
  microfone ser liberado (abrir o arquivo direto com `file://` não funciona).
* Sem microfone ou sem suporte, o jogo entra no **modo toque**: a criança
  (ou um adulto) toca nas palavras para marcá-las.

## Vozes (botão "Ouvir" e toque nas palavras)

O jogo escolhe sozinho a melhor voz pt-BR que o navegador oferece
(`pickVoice` em `js/speech.js`), sem proxy nem servidor:

| Navegador | Voz usada |
| --- | --- |
| Microsoft Edge | vozes neurais "Microsoft Francisca / Antonio Online (Natural)" — as mesmas do Edge TTS |
| Google Chrome | "Google português do Brasil" |
| Safari / outros | voz do sistema (no macOS, baixe a "Luciana (Aprimorada)" em Ajustes › Acessibilidade › Conteúdo Falado › Vozes do sistema para melhorar) |

O seletor "Voz: feminina / masculina" define a preferência; o nome da voz
em uso aparece ao lado. O serviço Edge TTS por WebSocket (usado no projeto
reels-generator) recusa conexões vindas de páginas web (HTTP 403 para
qualquer Origin de navegador), por isso ele só funcionaria com um proxy.

## Publicação (GitHub Pages)

O site está publicado em <https://reading-game.rpanachi.com/> pelo
GitHub Pages, direto da branch `main` (pasta raiz), sem etapa de build:
todo push em `main` atualiza o site em cerca de um minuto. O arquivo
`.nojekyll` diz ao GitHub para servir os arquivos como estão e o arquivo
`CNAME` define o domínio (no DNS, `reading-game` é um CNAME para
`rpanachi.github.io`). O microfone só funciona em HTTPS.

## Testes

```bash
node tests/run.js
```

Roda sem navegador: gera todas as combinações de história, desenha as
cenas, e confere a comparação fonética e o acompanhamento da leitura nos
cenários que já travaram.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | As três telas: compor, ler e fim. |
| `css/style.css` | Visual (fonte Andika para o texto de leitura). |
| `js/data.js` | Opções do compositor, com gênero/artigos para a concordância. |
| `js/story.js` | Gera o texto das 7 páginas e a descrição de cada cena. |
| `js/art.js` | Desenha os SVGs: personagens, veículos, cenários, achados e adereços animados. |
| `js/speech.js` | Reconhecimento de voz contínuo, síntese de voz e comparação tolerante das palavras. |
| `js/app.js` | Fluxo das telas, destaque das palavras, sons e confete. |

## Como a leitura é validada

1. O texto da página é dividido em palavras normalizadas (minúsculas, sem
   acentos e sem pontuação).
2. O reconhecimento trabalha **um enunciado por vez**: a sessão termina na
   primeira pausa da fala, com o resultado final na hora e até 5
   alternativas, e recomeça imediatamente sem o contexto anterior. Assim
   cada palavra (ou trecho curto) é reconhecida de forma independente e uma
   nova tentativa depois de um erro é avaliada sem espera. O microfone
   liga sozinho ao abrir a história.
3. Cada palavra vira uma **chave fonética do português brasileiro**
   (`phon` em `js/speech.js`): "gato"/"gatu", "chamado"/"xamadu",
   "vez"/"ves", "sol"/"sou", "bem"/"ben", "falar"/"fala" viram a mesma
   chave. Chaves iguais casam; chaves longas toleram 1 a 3 letras de
   diferença (Levenshtein). Leitura silabada ("ca cho rro") também casa.
4. As palavras ouvidas avançam um ponteiro pelo texto, sempre a partir da
   palavra que está destacada na tela (o ponteiro nunca volta, mesmo que o
   navegador reinicie a sessão de reconhecimento). Até duas palavras não
   entendidas podem ser puladas para a leitura não travar em "o", "e", "de".
   Palavras de até duas letras ditas sozinhas costumam voltar como uma
   letra ("de" → "D"); isso também vale.
5. Se uma tentativa inteira não avança nada, aparece a dica "Tente de novo:
   palavra" com um botão para ouvir a pronúncia. Na segunda tentativa sem
   sucesso a palavra é marcada em amarelo (pulada) e a leitura segue, para a
   criança nunca ficar presa.
6. Um vigia reinicia o reconhecimento sozinho quando o microfone capta voz
   (medidor ao lado do botão 🎤) mas nenhum resultado chega em alguns
   segundos, e cada página começa com uma sessão nova. O reinício é
   imediato, sem espera.
7. As palavras lidas ficam verdes, a próxima fica laranja. Quando a página
   termina, toca um sino, cai confete e o botão "Próxima página" é liberado.

## Como estender

* Nova opção: adicione em `js/data.js`, desenhe a miniatura/figura em
  `js/art.js` e, se for diálogo ou final, escreva as frases em `js/story.js`.
* Os "achados" (animal, objeto, pessoa, criança) têm variantes sorteadas a
  cada história, então a mesma escolha gera histórias diferentes.
