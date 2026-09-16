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
* O jogo fica sempre no modo reconhecimento. Sem microfone ou sem suporte,
  um aviso explica o motivo; tocar numa palavra ouve a pronúncia dela e
  "Pular página" segue em frente.

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

## Reconhecimento no aparelho (Chrome 139+)

O Chrome recente sabe reconhecer fala **no próprio computador**, sem mandar o
áudio para o Google (`SpeechRecognition.available` / `install` /
`processLocally`). Para pt-BR o pacote vem como "baixável": na tela de
compor aparece o botão **"⬇️ Baixar reconhecimento no aparelho"**, que pede
ao Chrome para baixar o modelo (uma vez só, algumas dezenas de MB). Depois
disso a opção "Reconhecimento no aparelho" fica marcada e guardada no
navegador; dá para desligar na mesma tela.

Nesse modo o jogo passa ao reconhecedor **as palavras da página**
(`phrases`, peso 3 numa escala de 0 a 10): ele dá preferência a elas, o que
ajuda exatamente nas palavras curtas ditas sozinhas ("era" em vez de
"ela"). Também não existe a demora de abrir uma sessão na nuvem (1 a 4 s, e
às vezes ela nem responde). Se o reconhecedor do aparelho recusar
(`language-not-supported`), o jogo tenta de novo 1 s depois e então volta
sozinho para a nuvem: a opção é desmarcada e a tela de compor mostra o
motivo, o estado do pacote e o botão para tentar de novo ou baixar. Esse
erro chega sem `onend`, por isso a sessão morta é descartada à mão (o
mesmo vale para qualquer erro ao abrir uma sessão, com nova tentativa em
1 s, dobrando até 10 s). Em modo DEBUG,
`?local=available|downloadable|downloading` força o estado da opção para
testar a tela.

## Publicação (GitHub Pages)

O site está publicado em <https://reading-game.rpanachi.com/> pelo
GitHub Pages, direto da branch `main` (pasta raiz), sem etapa de build:
todo push em `main` atualiza o site em cerca de um minuto. O arquivo
`.nojekyll` diz ao GitHub para servir os arquivos como estão e o arquivo
`CNAME` define o domínio (no DNS, `reading-game` é um CNAME para
`rpanachi.github.io`). O microfone só funciona em HTTPS.

O domínio passa pelo proxy da Cloudflare, que guarda os arquivos por
4 h. Por isso toda mudança sobe o `?v=` dos scripts no `index.html` e o
`APP_VERSION` em `js/app.js` (o rodapé da leitura mostra a versão). Depois
de publicar, espere um minuto antes de abrir o site: se uma URL nova for
pedida enquanto o GitHub ainda serve a versão antiga, o proxy guarda a
antiga por 4 h.

## Modo DEBUG (diagnóstico do reconhecimento)

`js/diag.js` define `window.DEBUG`, que é `true` só em modo local
(`localhost`, `127.0.0.1` ou `file://`) ou quando a URL traz `?debug=1`.
No site publicado (DEBUG desligado) nada é registrado e o botão
"📋 Copiar diagnóstico" não aparece.

Com DEBUG ligado o log tem **dois níveis**, para o diagnóstico não virar um
paredão de linhas:

| Nível | O que entra | Quando é registrado |
| --- | --- | --- |
| resumo | início da história, troca de página, ciclo de vida e reinícios da sessão, avanços da leitura, dicas, pulos, erros | sempre |
| minucioso | cada resultado com suas alternativas e confiança, a decisão do casamento palavra a palavra, o estado do acompanhamento, batimentos | fica num anel dos 80 últimos eventos; só vai para o log quando a leitura trava |

A leitura é considerada **travada** quando 3 s depois da primeira tentativa de
ler a palavra destacada nada avançou. A tentativa é um trecho de voz que
**começou** depois da troca de palavra: o rabo da palavra anterior (ainda
soando quando a tela avançou) e a repetição da palavra anterior (a criança
a repete porque a tela demorou a avançar; o acompanhamento reconhece o eco)
não contam, senão viravam alarmes falsos. Nesse instante o log ganha uma linha `TRAVOU` com a
fotografia completa do estado (página, palavra atual, ponteiros do
acompanhamento, modo nuvem/aparelho, idade da sessão, tempo sem resposta,
nível do microfone),
despeja o anel como contexto do que veio antes e passa a registrar tudo até a
linha `DESTRAVOU`, que diz o que fez a leitura andar e quanto tempo demorou.
O botão copia esse log inteiro. No carregamento, o log também diz se o
navegador oferece reconhecimento no próprio aparelho para pt-BR
(`SpeechRecognition.available`, Chrome 139+): se um dia oferecer, dá para
passar ao reconhecedor as palavras da página (`phrases`).

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
2. O reconhecimento usa **uma sessão contínua**, mantida durante toda a
   história (resultados parciais e até 5 alternativas). Reiniciar a sessão
   a cada palavra foi testado e descartado: o Chrome fecha uma sessão não
   contínua ~100 ms depois do fim da fala, mas a primeira resposta do
   reconhecedor numa sessão nova leva 1 a 2 s, então palavras curtas ditas
   sozinhas morriam sem resultado (30 de 97 sessões num teste real). "Uma
   palavra por vez" é garantido pelo acompanhamento (item 4), não pela
   sessão. A escuta liga assim que a criança clica na primeira opção da
   tela de compor (a primeira sessão da página leva 2 s só para abrir o
   microfone e às vezes nem responde; assim ela já está aquecida quando a
   leitura começa) e a sessão **não é reiniciada ao virar a página**: uma
   sessão nova leva de 0,3 a 6 s para dar a primeira resposta (e às vezes
   nem responde à primeira palavra curta), então só os resultados antigos
   são descartados e, se uma parcial estava viva, as palavras que ela já
   tinha são ignoradas. A exceção é a sessão velha: o Chrome para de
   responder ~60 s depois do primeiro resultado, então uma sessão com mais
   de 30 s é renovada **na troca de página** (a criança ainda vai olhar o
   desenho), e não no meio da página seguinte, numa pausa entre palavras.
3. Cada palavra vira uma **chave fonética do português brasileiro**
   (`phon` em `js/speech.js`): "gato"/"gatu", "chamado"/"xamadu",
   "vez"/"ves", "sol"/"sou", "bem"/"ben", "falar"/"fala" viram a mesma
   chave. Chaves iguais casam; chaves longas toleram 1 a 3 letras de
   diferença (Levenshtein); uma troca de r por l ("era" → "ela", "brincar"
   → "blincar"), comum na fala infantil, também casa. Leitura silabada
   ("ca cho rro") também casa.
4. As palavras ouvidas avançam um ponteiro pelo texto, sempre a partir da
   palavra que está destacada na tela (o ponteiro nunca volta, mesmo que o
   navegador reinicie a sessão de reconhecimento). **A busca alcança sempre a
   palavra destacada**: enquanto uma parcial viva avança a tela, o ponteiro
   dos resultados finais fica para trás, e a busca precisa atravessar as
   palavras já lidas para chegar na atual. Uma palavra não entendida pode ser
   pulada para a leitura não travar em "o", "e", "de", mas só com casamento
   exato; as regras tolerantes (fonética, "1" = um/uma, letra inicial) valem
   para a palavra esperada e para a destacada na tela. Uma palavra repetida
   ("uma uma") só pode casar com a próxima esperada. Palavras curtas ditas
   sozinhas voltam do reconhecedor com artefatos conhecidos, todos aceitos:
   uma letra só ("de" → "D"), uma consoante colada na frente ("o" → "do",
   "em" → "vem", "um" → "bum"), a troca n/d ("no" → "do") e "um um" virando
   o número "11" (cada "1" vira um "um"), e uma vogal sozinha trocada por
   outra ("e" → "o"). Repetir a palavra anterior (a criança a diz de novo
   porque a tela demorou a avançar) é reconhecido como **eco**: não conta
   como tentativa da palavra atual nem como erro. Palavra de **uma letra**
   ("a", "e", "o"): o reconhecedor leva 2,5 a 3 s para responder uma vogal
   isolada e numa sessão nova muitas vezes nem responde (um "A" de 134 ms
   de voz ficou 9,9 s travado); se a criança disse uma coisa curta (50 a
   900 ms de voz), calou e 1,5 s depois nada avançou, a palavra é aceita
   pela voz captada, sem esperar o reconhecedor.
5. Se 3 s depois da primeira tentativa (trecho de voz iniciado depois que a
   palavra ficou destacada) nada avançou, ou se uma tentativa inteira foi
   finalizada sem avançar, aparece a dica "Tente de novo" com um botão para
   ouvir a pronúncia da palavra. Na segunda tentativa finalizada sem sucesso
   a palavra é marcada em amarelo (pulada) e a leitura segue. A leitura é
   sempre de uma palavra por vez; duas ou três ditas juntas também casam.
6. Um vigia (2x por segundo) protege a sessão. Toda fala captada (a partir
   de 250 ms de voz; um estalo de 30 ms não conta) tem que ser respondida:
   se 2 s depois de a criança calar nenhum resultado chegou (2,5 s numa
   sessão que ainda não respondeu nada, porque a primeira resposta de uma
   sessão nova leva de 1 a 4 s), o reconhecedor travou nesse enunciado e a
   sessão é reiniciada. A voz que já soava quando a sessão nasceu não conta
   (a sessão é trocada no meio da repetição). Quando não há nada para ler
   (tela de compor, página completa) a conversa não reinicia nada: só a
   renovação por idade. Se a criança **repete** a
   palavra (dois trechos de voz desde o último resultado) e nada chegou
   2,5 s depois do primeiro, a sessão é reiniciada na hora, sem esperar
   pausa: medido no diagnóstico, o reconhecedor do Chrome fica mudo de 4 a
   15 s com uma parcial aberta enquanto a criança repete uma palavra curta,
   e uma sessão nova aberta no meio da repetição responde em menos de 1 s.
   Uma fala longa sem pausa e sem resposta em 4 s também reinicia.
   A sessão também é renovada a partir de 45 s depois do primeiro resultado,
   numa pausa, porque o Chrome para de responder por volta de 60 s sem
   avisar. Enquanto uma resposta não chega o status mostra "Entendendo...".
7. As palavras lidas ficam verdes, a próxima fica laranja. Quando a página
   termina, toca um sino, cai confete e o botão "Próxima página" é liberado.

## Como estender

* Nova opção: adicione em `js/data.js`, desenhe a miniatura/figura em
  `js/art.js` e, se for diálogo ou final, escreva as frases em `js/story.js`.
* Os "achados" (animal, objeto, pessoa, criança) têm variantes sorteadas a
  cada história, então a mesma escolha gera histórias diferentes.
