# PROGRESSO

Documentos da obra: `C:\Users\Samuel\Documents\Jarvis\vault\documentos\escola\projetao\claude-code\SPEC.md` e `FASES.md` (use a pasta `claude-code\`, não a `projeto\`). Referências do visual novo: `claude-code\referencias-visual\`.

## Fase atual
Rodada G1, G2 e G3 concluída em 21/10/2026, depois da rodada A1, A2 e F8 enxuta (que veio depois da F4, 3D completo no PC). Os sketches dos ESP32 continuam **não compilados** (arduino-cli não instalado).

Ordem decidida pelo Samuel: F2, F6, F3, F4, depois A1, A2 e a F8 mínima, depois G1, G2 e G3. Faltam F5 e F7.
Próxima: **F5 (tablet, toque, passeio automático, teclas e menu D)**.

## Feito
- F0. Base. F1. Servidor completo e testes. F2. Interface em cartões (a função continua; o visual foi refeito na V1). F6. ESP32 e documentação da turma.
- **V1. Novo visual** (só `web/estilo/` e `web/ui/`, mais `web/main.js`, `package.json`, `ferramentas/` e `docs/`)
  - Tema claro: fundo `#F5F1EA`, cartões brancos, pastéis quentes, folha de bordo em SVG, DM Sans local. Tokens em `web/estilo/tokens.css`.
  - Menu lateral de 88 px, topo com título e relógio, pílula do modo (**Demonstração** âmbar ou **Ao vivo** verde sálvia), cartão colorido único (cor segue a situação da energia), grade em blocos de tamanhos diferentes, uma página por área (`#energia`...), Esc volta.
  - Estado normal é uma bolinha; Alerta, Sem sinal e Desativado viram pílula com texto. Sem números 1 a 5, sem bolinhas E R C M EC, sem "Sem comandos nesta área", sem cadeado, sem faixa amarela. Comandos só para Controle e Administração.
  - `ferramentas/contraste.js` (`npm run contraste`): 27 pares de cores, 0 abaixo do mínimo.
  - `ferramentas/shots.js` reescrito, com conferências automáticas. Capturas 08, 09, 09b, 10, 11 refeitas.
  - `docs/DIA-DA-MOSTRA.md` atualizado para os textos da tela nova.

## Como foi conferido (V1)
- `npm test`: 32 testes passam. `npm run contraste`: 27 pares, 0 abaixo do mínimo.
- `npm run shots`, com o simulador:
  - 1920x1080 (cidade, páginas de área como visitante e como Controle, "sem sinal" e "desativado"): sem rolagem, nenhum texto menor que 16 px, nenhum texto cortado, nada vazando para fora de cartão.
  - Visitante: 0 comandos ou avisos de login na tela.
  - Controle: persiana "aberta" virou "fechada" e "Irrigar agora" ligou a bomba (irrigação "manual"); os botões chegaram a "Executado".
  - Administração: "Testar comandos" com as 5 áreas respondendo; "Exportar histórico (CSV)" baixou o arquivo.
  - Celular 390x844: sem rolagem lateral, nenhum texto menor que 14 px, e o Three.js não é baixado.
  - SSE bloqueado: a tela segue atualizando por polling.
  - Nenhum erro no console.
- As 6 demonstrações foram dirigidas pelo servidor em modo real (leituras e confirmações como um ESP32) e os textos lidos na tela nova estão na tabela do `DIA-DA-MOSTRA.md`.
- Capturas olhadas uma a uma: 08, 09, 09b, 10, 11 e as extras em `docs/shots/tmp/` (área como visitante, "sem sinal" e "desativado" no PC e no celular, economia como Controle).
- **NÃO conferido:** celular de verdade; TV a 3 metros; tela de 1366x768 (só existe a regra de CSS, não olhei a captura); navegação só pelo teclado; leitura dos QR por câmera; os textos em leitor de tela.

## Feito em F3, V1b e F4 (21/10/2026)
- **V1b:** botão de comando ativo agora é escuro com letra clara (sem vermelho); ícone da Energia virou raio. `npm run contraste`: 29 pares, 0 abaixo do mínimo.
- **F3 (cena fiel à planta, `web/cena/`):** Three.js 0.186 local, importado só pelo layout 3D. Base de madeira, blocos na tinta pastel de cada área (lida dos tokens), vias, faixas, todos os objetos da SPEC seção 4 a partir de `compartilhado/maquete.js`, 16 postes em espiral, 11 árvores instanciadas, luz e sombras, qualidade alta, média e baixa. `npm run cena` compara com a planta (39 itens, 11 árvores, 16 postes, 17 dormentes: tudo dentro de 0,6 cm), testa os limites da câmera com o mouse e mede os quadros por segundo.
- **F4 (interação e dados):** layout mapa à esquerda e painel de 450 px à direita (`web/ui/layout3d.js`); clique no bloco, na etiqueta ou no cartão voa até a área; Esc e Voltar à cidade; etiquetas com bolinha de estado; as ligações com os dados (turbina, semáforo, vagas, reservatório, gotas, persiana, presença, aquecimento, trem, painel de partidas, postes e janelas); camada de sensores; modo noite; sem sinal cinza e parado, desativado listrado; qualidade que cai sozinha; troca para cartões se o WebGL não abrir. A tela grande sem `?modo` abre o 3D.

## Como foi conferido (F3 e F4)
- `npm test`: 32 passam. `npm run contraste`: 29 pares, 0 abaixo do mínimo.
- `npm run cena`: o 3D bate com a planta (todos os itens dentro de 0,6 cm); ângulo polar 8 a 80 graus, distância 35 a 260 cm, mira dentro do palete, câmera nunca abaixo da base. Placa de vídeo deste PC (AMD Radeon integrada): janela 1370 x 1000 a 60 quadros por segundo (limite do monitor) em alta, média e baixa; **sem o limite de 60**: 414 (alta), 398 (média), 933 (baixa); com CPU limitada a 4x: 92, 88 e 180. Tela completa 1920 x 1080 com mapa, etiquetas e painel: 60 (e 58,7 com CPU 4x). **Sem placa de vídeo (SwiftShader, pior caso):** 9 (alta), 9 (média), 21 (baixa) na janela do mapa e 6, 13 e 18 na tela completa: abaixo de 30.
- `npm run shots` (tudo): 3D em 1920 x 1080 sem rolagem, nenhuma letra menor que 16 px, etiquetas de 20 px, rótulos de sensor de 16 px, nada vazando de cartão; visitante sem comandos; clique de verdade no bloco leva a `#energia` com o cursor de mão; Esc volta; o Three.js **não** baixa no celular nem em `?modo=cartoes` (conferido pelo conteúdo do arquivo); sem WebGL entra o modo cartões com o aviso; sem placa de vídeo a qualidade cai de Alta para Média com aviso (a segunda queda, para Baixa, levaria mais uns 9 s e não esperei na medida); 20 ligações dos dados com a cena conferidas lendo os objetos 3D (captura 15).
- Capturas olhadas uma a uma: 01 a 06 (em `docs/shots/`), F3-cima e F3-perspectiva, e as extras em `docs/shots/tmp/` (12: desativado, casa, trem, centro, energia; 02: depois do Esc e Residencial; 03; 04: noite e automático).
- **NÃO conferido:** o notebook do professor (nem a placa de vídeo dele; se ele não tiver placa de vídeo, o 3D roda abaixo de 30 quadros por segundo mesmo em Baixa e a TV pode ficar melhor nos cartões); a TV a 3 metros; toque de verdade (celular ou tablet) e mapa em tela de toque; tela de 1366 x 768 no layout 3D; navegação só pelo teclado; leitor de tela; `INICIAR.bat` abrindo o navegador em tela cheia; o brilho laranja e as gotas vistos de perto num monitor real; os ESP32 de verdade.

## Rodada A1, A2 e F8 enxuta (21/10/2026)
- **A1:** a pílula do topo só diz "Ao vivo" com pelo menos um módulo com leitura recente; modo real sem leitura diz "Sem leituras" (`web/ui/modo.js`, testado). A captura 01 da F4 dizia "Ao vivo" porque o `shots.js` ligava o modo real de propósito e mandava leituras de teste; agora as capturas oficiais 1, 2, 3 e 5 são em modo demo (a 4 e a 6 continuam com leituras de teste, anotado). O servidor já estava certo (modo real sem ESP32 = tudo "sem sinal"); dois testes novos garantem.
- **A2:** queda Alta, Média, Baixa e, se a Baixa ficar abaixo de 24 quadros por segundo por 8 s, cartões com aviso e botão "Tentar o 3D de novo" (lembrado na sessão). `?qualidade=` fixa a qualidade; `?modo=3d` força o 3D; `"modoInicial"` na configuração (o servidor redireciona o endereço puro); abaixo de 1280 de largura entram os cartões; 1366 x 768 e 1280 x 720 sem rolagem de página (painel rola por dentro).
- **F8 enxuta:** `npm run pacote` gera `entrega/smart-canada-dashboard.zip` (72 arquivos, 89,9 MB descompactado, 34,5 MB compactado, com o Node portátil); `INICIAR.bat` usa `tools\node\node.exe` primeiro; README final.
- Conferido: `npm test` 38 passam; `npm run shots` completo sem erro no console. Queda de qualidade testada com desenho por software e CPU 4x mais lenta, em 1920 x 1080: Alta (12 fps) -> Média aos 11 s (7 fps) -> Baixa aos 20 s (7 fps) -> cartões aos 32 s; recarregar a página na mesma sessão abre os cartões com o botão; o botão volta ao 3D. Zip aberto com o `Expand-Archive` numa pasta temporária fora do projeto, sem `node_modules`, `INICIAR.bat` rodado com o PATH sem Node (usou o `tools\node\node.exe` do zip), `esp-falso.js` conectou os 5 módulos em modo real e `GET /` respondeu 200.
- **NÃO conferido nesta rodada:** o notebook do professor (nem a placa de vídeo, a TV e o Windows dele); o `INICIAR.bat` abrindo o navegador em tela cheia (testei só com `SEM_NAVEGADOR=1`); o firewall do Windows de outro computador; toque de verdade; teclado e leitor de tela; os ESP32 e os sketches compilados; o `git push` (não há remote nem `gh`).

## Rodada G1, G2 e G3 (21/10/2026)
- **G1 (campo "teste", contrato mudado com autorização):** `teste` (booleano, opcional) em todos os módulos; o servidor valida, guarda e repassa. A leitura do ESP32 agora **substitui** a anterior (campo que deixa de vir some do painel). Pílula do topo: **Teste** (âmbar) quando todas as leituras recentes são de teste; **Ao vivo** só com pelo menos uma leitura recente sem teste. Selo âmbar **Valor de teste** nos cartões, na página da área e na dica dos sensores do 3D. Sketches: constantes de sensor e **uma** `MODO_TESTE = false` no topo; sensor desligado sem MODO_TESTE **não manda o campo** (cartão mostra "--"). `docs/API.md`, `esp32/README.md` e `ferramentas/conferir-esp32.js` atualizados (381 conferências, 0 falhas); `esp-falso.js --teste`; captura `17-teste-todos.png`.
- **G2 (senha do Wi-Fi):** **mantida como estava** (`GET /api/rede` ainda entrega a senha). O QR é desenhado no navegador e o servidor não tem dependências; não há solução simples. Razão, risco e uma opção (senha só para Administração e localhost) em `docs/DECISOES.md` 153 e 154.
- **G3 (GitHub e guias):** `README.md` da raiz virou a página do GitHub; novos `docs/GUIA-DO-OPERADOR.md` (1 página imprimível), `docs/REDE.md` (Mermaid, sem esquema elétrico) e `docs/PUBLICAR-NO-GITHUB.md` (passos manuais com marcadores). Verificações do repositório em `docs/DECISOES.md` 157.
- **Conferido:** `npm test` 44 passam. Zip refeito (75 arquivos, 89,9 MB descompactado, 34,6 MB compactado), aberto com o `Expand-Archive` numa pasta temporária fora do projeto: sem `node_modules`, `config\local.json` nem `dados`; `INICIAR.bat` rodado com o PATH sem Node (usou o `tools\node\node.exe` do zip); `GET /` deu 200; o `esp-falso.js` deixou os 5 módulos "ok" em modo real e, com `--teste`, os 5 vieram com `teste: true`. Capturas olhadas: `17-teste-todos.png` e `docs/shots/tmp/17-teste-3d-energia.png`. Os dois diagramas Mermaid do `docs/REDE.md` renderizaram sem erro num Chromium (Mermaid 11.4.1).
- **NÃO conferido nesta rodada:** os sketches (continuam sem compilar; as mudanças do MODO_TESTE foram só lidas e conferidas em texto); ESP32 de verdade; o notebook do professor; o GitHub (nada foi publicado: não há remote nem `gh`) e como o GitHub desenha o README e o Mermaid; a Release; o `INICIAR.bat` abrindo o navegador em tela cheia; o guia do operador seguido por alguém que não programa.
- **Bloqueio para publicar:** todos os commits têm o e-mail pessoal `mariotto.sim@gmail.com`. Não publicar antes de resolver (`docs/PUBLICAR-NO-GITHUB.md`). O histórico não foi mexido.

## Falta
- **F5** (próxima), F7. A F8 mínima já foi feita; refazer o zip (`npm run build` e `npm run pacote`) depois de qualquer mudança.
- Para a F7: gráficos de 10 minutos nos cartões; passar a vista do mapa por uma revisão de textos.
- Pendências para o grupo: confirmar os nomes dos campos; trocar os pinos; compilar e gravar; deixar `MODO_TESTE = false` e ligar só as constantes dos sensores que existem; preencher a seção de ligação dos sensores do `docs/REDE.md`.
- Para o Samuel: resolver o e-mail dos commits antes de publicar; decidir a opção da senha do Wi-Fi (DECISOES 154); trocar `<LINK_DA_RELEASE>` no README depois da Release.
- Possíveis melhorias do 3D (não pedidas): objetos da planta com mais detalhe (só o que a planta tem); halos de verdade nas janelas à noite.

## Próximo passo exato (F5)
1. Tablet deitado (1280 x 800) e em pé (800 x 1280): alvos de 48 px (os botões do mapa têm 44 a 48 px), dicas dos sensores abrem no toque (já abrem por clique ou toque; falta testar com toque de verdade) e nada depende de passar o mouse. Em pé: mapa em cima (55% da altura), painel embaixo com rolagem. Hoje, abaixo de 1280 de largura o `main.js` abre os cartões (A2); a F5 troca isso pelo layout de tablet.
2. Modo apresentação: depois de 60 s sem ninguém mexer, a câmera passeia pelas 5 áreas (12 s cada) usando `interacao.irPara(id)` e mudando o endereço; qualquer toque, clique ou tecla para. Liga e desliga na administração (`/api/admin/apresentacao` já existe). Use um parâmetro de teste para encurtar o tempo.
3. Teclas: D (menu de depuração), F, N (`ambiente.definirModo`), P, Q (`cena.definirQualidade`), C (modo cartões), Esc. O menu D só com Administração ou `?debug=1`.
4. `prefers-reduced-motion` (o voo, as contagens e a água já respeitam; falta revisar o resto). Capturar a 07 (tablet) e olhar.

## Comandos
- `npm run dev`: desenvolvimento, abre em http://localhost:5173
- `npm run build`: gera `servidor/publico/` (commitar depois)
- `node servidor/index.js` (ou `INICIAR.bat`): http://localhost:5050. Opções: `--modo real`, `--porta N`.
- Telas: `/` (mapa 3D com painel), `/?modo=cartoes` (plano B), `/?modo=celular`, `/?modo=cena&debug=1` (só o mapa, para conferências).
- `npm run pacote`: zip da entrega em `entrega/` (precisa do `npm run build`).
- `npm run cena`: conferência da cena 3D contra a planta, limites da câmera e quadros por segundo.
- `node ferramentas/esp-falso.js [--modulos a,b] [--falhar mobilidade] [--depois 20] [--servidor ip:porta] [--teste]`
- `node ferramentas/conferir-esp32.js [--copiar]`: confere sketches e `docs/API.md`.
- `npm test`
- `npm run contraste`: contraste WCAG dos tokens de cor.
- `npm run shots` (ou `npm run shots -- 9 11`, também `9b`): precisa do build e do Chromium do Playwright.

## Decisões
Ver `docs/DECISOES.md` (85 a 105: V1; 106 e 107: V1b; 108 a 119: F3; 120 a 134: F4; 135 a 137: A1; 138 a 143: A2; 144 a 146: entrega; 147 a 152: G1; 153 e 154: G2; 155 a 158: G3).
