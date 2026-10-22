# Decisões

Decisões tomadas durante a construção, com o motivo. Quando a SPEC não dizia nada, valeu a opção mais simples.

## 20/10/2026 (F0)

### Correções da SPEC feitas pelo Samuel antes da F0
1. O estado de cada módulo no `/api/estado` se chama `sinal` ("ok", "sem_sinal", "desativado"). O nome `situacao` fica só como campo da Energia ("mais", "igual", "menos").
2. Comando `ping` (valor "teste"): aceito por todos os módulos, só pela administração. O ESP32 confirma sem acionar nada. O botão "Testar comandos" usa ele. Todo sketch aceita `ping`. No modo demo, o simulador confirma sozinho.
3. Postes: 6 em y 35 e 6 em y 45 (x 20, 36, 52, 68, 84, 100), mais 2 no meio de cada rua da fileira de cima (x 37 e x 76, em y 12 e y 26). Nenhum poste em cima de bloco (conferido em `testes/maquete.test.js`).

### Ferramentas ausentes
4. O `gh` (GitHub CLI) não está instalado. Na F8 o repositório não será criado automaticamente: o README terá os passos para o Samuel subir.
5. O `arduino-cli` não está instalado. Pela SPEC, não será instalado: os sketches da F6 não serão compilados, e isso ficará escrito no relatório e no `esp32/README.md`.

### Planta contra SPEC (vale a planta)
6. Faixas de pedestre: a SPEC (seção 4, postes) diz que ocupam x 5 a 15 e x 110 a 115. Pela planta, as 4 listras vão de x 5 a 9,67 e de x 110,33 a 115. Usei a planta. Não muda nada nos postes, que começam em x 20.
7. Linha de irrigação: a descida central vai de (97, 18) a (97, 20), não até 19 como na SPEC.
8. Semáforo: na planta a caixa vai de (43,6; 19,7) a (45,2; 23,3), com as 3 luzes em x 43,8 (1,2 x 1 cada, em y 20, 21 e 22). A SPEC dizia (43,8; 20) a (45,4; 23,3).
9. Tracejados copiados da planta: avenida com traço de 3 cm e espaço de 2 cm; ruas com traço de 2 cm e espaço de 1,5 cm; faixa do terminal com traço de 1 cm. A cor das faixas centrais é amarela (#F2C230), como na maquete real.

### Geometria
10. Posição dos sensores e ESP32 da camada 3 é o CENTRO do marcador. Motivo: o prompt da camada 3 diz "no centro de cada vaga" para S4 a S7, e S11 fica "dentro do reservatório" em (97, 15), que é o centro dele. Consequência: S1 (7, 29) fica no canto da caixa de baterias, não no meio.
11. Peça em (95, 84) 6x3 (#A5433A): desenhada como banco de espera.
12. Os dois pontos escuros da Residencial em (7, 67) e (47, 67) viram bases escuras de poste. Não acendem e não contam entre os 16 postes com LED.
13. Trem: azul #2E6DA4 (a SPEC só diz "azul"), 10 cm de comprimento, para na plataforma em x 77.
14. Iniciais das bolinhas de sinal: E (Energia), R (Residencial), C (Centro Urbano), M (Mobilidade), EC (Economia Circular). "E" e "C" já estavam ocupados.

### Servidor
15. Arquivo extra `servidor/config.js` (fora da lista da SPEC): lê `config/padrao.json` e sobrescreve com `config/local.json`.
16. `ultimaLeitura` e `hora` vão em milissegundos desde 1970 (número). A tela formata para HH:MM:SS.
17. Ao trocar entre demo e real, o servidor apaga os dados antigos. Motivo: não mostrar valor do simulador como se fosse "última leitura" de um ESP32.
18. Alertas: calculados a partir do último dado de cada módulo ativo, mesmo se ele estiver sem sinal. Módulo desativado não gera alerta.
19. Porta: tenta 5050 e, se ocupada, até 5060. Endereços 169.254.x (rede sem DHCP) não aparecem na lista.
20. `chaveModulos` igual a "troque-isto" no `local.json` é ignorada (vale a chave de exemplo do `padrao.json`). Na F1, códigos de acesso "troque-isto" também não valem.
21. `npm run dev` usa a porta 5050 fixa (o proxy do Vite aponta para ela).

### Simulador
22. Valores em escala de maquete: solar de 0 a uns 8 W, eólica de 0,6 a 3,4 W, consumo de 3 a 8 W. Assim a situação energética alterna entre "mais" e "menos" no ciclo de 3 minutos.
23. O ciclo do sol começa de manhã, para a demo abrir de dia.
24. Postes: "ligados" quando escurece e "desligados" de dia. O consumo sobe com postes, bomba, aquecimento, luz da casa e trem.
25. Irrigação automática liga a bomba com solo abaixo de 35% e desliga acima de 70%. Fica bloqueada com reservatório abaixo de 20% (exigência do PDF da turma: "bloqueio da irrigação automática caso não haja água suficiente").
26. "Irrigar agora" liga a bomba por 10 s e deixa a irrigação em "manual" até alguém escolher "Automático".
27. Mobilidade: o terminal fica "operando"; o texto do próximo veículo segue o exemplo da SPEC ("Ônibus 2 em 1 min"). O trem só anda com a demonstração ativa (12 s andando, 4 s na estação).

### Execução
28. `INICIAR.bat` abre o Edge (ou o Chrome) em tela cheia com um perfil separado em `%TEMP%\smart-canada-navegador`, para a tela cheia funcionar mesmo com o navegador já aberto. Se não achar nenhum dos dois, abre o navegador padrão. A variável `SEM_NAVEGADOR=1` liga só o servidor.
29. Para a F8: o zip precisa levar também `compartilhado/` e `package.json`, porque o servidor importa `compartilhado/contrato.js` e o `"type": "module"` está no `package.json`. A lista da SPEC seção 9 não citava os dois.

### Pendências do PDF da turma (Módulo 6)
30. O PDF sugere "banco de dados / histórico das leituras". A SPEC guarda só 10 minutos em memória e põe banco de dados fora do escopo (seção 11). Resolvido na F1 com o histórico em arquivo (item 31), sem banco de dados.

## 20/10/2026 (F1)

### Histórico em arquivo (pedido do Samuel na F1)
31. A cada 10 s, o servidor grava uma linha JSON por módulo com sinal "ok" em `dados/historico-AAAA-MM-DD.jsonl` (data local). Só `node:fs`, escrita em append. A pasta `dados/` é criada sozinha e está no `.gitignore`.
32. Cada linha tem `hora` (ISO, UTC), `modulo`, `modo` e `dados`. O campo `modo` ("demo" ou "real") é um acréscimo, para separar no CSV os valores do simulador dos valores reais.
33. Módulo sem sinal ou desativado não gera linha (não repete o último valor como se fosse novo).
34. Ao ligar, o servidor relê os últimos 10 minutos do arquivo do dia (e do dia anterior, se ligar logo depois da meia-noite) e põe no gráfico. Esses pontos têm um a cada 10 s; os novos, um a cada 2 s.
35. **(REVERTIDO em 21/10, ver item 50.)** **Limpeza:** ao ligar o servidor, e só nessa hora, apaga os arquivos `historico-AAAA-MM-DD.jsonl` com mais de 7 dias (pela data do nome). Só dentro de `dados/` e só arquivos com esse nome exato; qualquer outro arquivo da pasta fica. Exemplo: ligando em 20/10, apaga o de 12/10 e mantém o de 13/10.
36. `GET /api/historico.csv?modulo=` só com token de administração. Sem `modulo`, exporta todos. Junta todos os arquivos guardados em `dados/`. Formato para o Excel em português: separador `;`, vírgula decimal, "sim" e "não" nos campos de ligado e desligado, hora local `AAAA-MM-DD HH:MM:SS`, UTF-8 com BOM.
37. O botão "Exportar histórico (CSV)" entra na tela de administração na F2 (a tela ainda não existe).

### Servidor completo
38. Rotas a mais, além da SPEC seção 6: `GET /api/sessao` (a tela confere se o token guardado ainda vale depois de o servidor reiniciar), `POST /api/admin/apresentacao` (`{ligado}`) e `POST /api/admin/rede` (`{nome, senha}`, grava em `config/local.json`). As três são pedidas pela SPEC seção 7 (administração liga o modo apresentação e digita rede e senha do QR), mas não tinham rota.
39. "Testar comandos" não tem rota própria: a tela manda um `ping` para cada módulo pela `POST /api/comando`.
40. O `/api/estado` também traz `comandos` (os recentes, com situação "enviado", "executado" ou "sem_resposta" e o tempo de resposta em ms), `loginAtivo` e `sugerirDemo`.
41. Situação do comando: fica "enviado" desde a fila até a confirmação; vira "sem_resposta" 30 s depois de criado, mesmo se o ESP32 já buscou. Cada comando é entregue ao ESP32 uma vez só (para não irrigar duas vezes). Confirmação atrasada recebe 404.
42. Comando para módulo desativado: 409 "Módulo desativado pela administração".
43. No modo demo, o simulador "busca" o comando 0,4 s depois, executa, publica o eco e confirma. Leituras de ESP32 de verdade no modo demo são aceitas (o ESP32 aparece na lista de vistos), mas não entram nos dados; a resposta diz `"ignorada": "demo"`.
44. A resposta da leitura traz `avisos` com os campos recusados, para quem programa o ESP32 ver no Monitor Serial. No terminal do servidor, o mesmo aviso aparece no máximo uma vez por minuto.
45. Se os códigos de controle e administração forem iguais, o login entra como administração.
46. A senha do Wi-Fi aparece no `/api/rede` sem login, porque a tela do QR precisa dela e o QR mostra a senha para qualquer visitante de qualquer jeito. A `chave` dos módulos nunca sai do servidor.
47. Descoberta: o anúncio vai para o endereço de broadcast de cada rede (ex.: 192.168.0.255), não para 255.255.255.255, para sair pela placa de rede certa quando o notebook tem mais de uma.
48. `ferramentas/esp-falso.js` reaproveita o simulador para gerar os dados. Opção a mais: `--depois N` muda os 20 s do `--falhar`. Sem `--servidor`, escuta o UDP por 10 s e cai em `localhost` com a porta da config.
49. O teste ponta a ponta com o `esp-falso.js` foi feito por um script fora do projeto (precisa de 30 s e de rede); não está no `npm test`.

## 21/10/2026 (antes da F2)

### Reversão aprovada pelo Samuel
50. **Item 35 revertido:** o servidor não apaga mais nenhum arquivo de histórico, nem ao ligar nem em outro momento. Foi removido só o código (`limparAntigos` em `servidor/historico.js`, a chamada em `servidor/index.js` e o campo `dias` do `config/padrao.json`). Nenhum arquivo existente foi apagado, em `dados/` ou em outra pasta. O teste da limpeza virou "ligar o servidor não apaga nenhum arquivo, nem os antigos". Quem quiser liberar espaço apaga os arquivos de `dados/` à mão. Consequência: a pasta cresce uns poucos MB por dia de uso e o CSV junta todos os dias guardados.

## 21/10/2026 (F2)

### Layout
51. Tela grande sem `?modo=` abre os cartões até a F3. Na F3 ela passa a abrir o mapa 3D (com importação dinâmica do Three.js); `?modo=cartoes` continua sendo o plano B.
52. Modo cartões: a grade imita a maquete vista pelo visitante. Em cima, Energia, Centro Urbano e Economia Circular; embaixo, maiores, Área Residencial e Mobilidade. Cada cartão traz todos os dados da área e a própria faixa de comandos. Não tem painel lateral (seria repetido).
53. No modo cartões, a administração abre numa janela lateral (gaveta) pelo botão "Administração" da barra, e o QR abre em tela cheia. No layout 3D (F4), a administração vira aba no painel, como a SPEC pede; o conteúdo é o mesmo (`web/ui/admin.js`).
54. A situação do comando ("Enviando...", "Enviado", "Executado", "Sem resposta") aparece ao lado do nome do grupo de botões, e não dentro do botão, para os botões não mudarem de tamanho. O botão da opção ativa fica claro, com uma bolinha, pelo dado de eco.
55. Chip de estado de cada área: "Funcionando", "Alerta", "Sem sinal" ou "Desativado", sempre com ícone e texto.
56. Valor sem dado aparece como `--`.
57. Barra do topo: com o papel Administração, o nome do papel não aparece (o botão "Administração" já mostra). Sem isso a barra não cabia em 1920 px.
58. Faixa vermelha "Sem conexão com o servidor do painel" depois de 5 s sem nenhuma notícia do servidor.
59. Os gráficos de 10 minutos ficam para a F7, como no FASES.md. A rota `/api/historico` já existe.

### Celular
60. Cada cartão mostra nome, estado e 1 ou 2 números; ao tocar, abre com todos os dados (um aberto por vez). Sem login e sem comandos. No celular o menor texto é 14 px; o mínimo de 16 px da SPEC vale para o PC.

### QR, sessão e administração
61. Se o computador tem mais de um endereço de rede, a tela do QR mostra botões para escolher qual vai no QR; a escolha fica guardada naquele navegador.
62. O token do login fica no `sessionStorage` (some ao fechar o navegador) e é conferido em `/api/sessao` ao abrir a página.
63. "Testar comandos" pula os módulos desativados (mostra "desativado" na lista).
64. O botão "Exportar histórico (CSV)" baixa o arquivo pelo navegador, com o token de administração.

### Capturas
65. `ferramentas/shots.js` liga um servidor próprio no modo demo, com códigos só de teste (`shots-controle`, `shots-admin`) e pastas temporárias para `dados/` e para a rede do QR. Não lê nem grava `config/local.json` nem `dados/` do projeto. As capturas da SPEC vão para `docs/shots/`; as extras (visualização, sem sinal, desativado, fim da administração) vão para `docs/shots/tmp/`, fora do git.
66. Nas capturas 11 aparecem dois "ESP32" (Energia e Centro Urbano, IP 127.0.0.1): são leituras mandadas pelo próprio `shots.js` para a lista não ficar vazia.

## 21/10/2026 (F6)

### Sketches e cabeçalho
67. **Cópias do `SmartCanadaRede.h`.** A Arduino IDE só enxerga arquivos dentro da pasta do sketch, então cada uma das 5 pastas tem uma cópia do cabeçalho. O original fica em `esp32/comum/`. `node ferramentas/conferir-esp32.js --copiar` copia para as 5 e o conferidor falha se alguma cópia divergir.
68. Cada sketch define só duas funções: `montarLeitura(JsonObject)` e `executarComando(comando, valor)`. O `ping` é tratado no cabeçalho (confirma sem chamar o sketch), então nenhum sketch repete esse código. O conferidor falha se um sketch tratar `ping` por conta própria.
69. O anúncio UDP continua sendo escutado depois da descoberta inicial: se o notebook trocar de IP, o ESP32 passa a usar o novo sozinho. O IP de reserva só vale se nada chegar nos primeiros 10 s.
70. "Na hora quando algo muda": o sketch chama `redeEnviarAgora()`; o envio sai em até 250 ms (limite mínimo entre envios para não inundar o servidor).
71. Cada sensor da camada 3 tem uma chave no topo (`S10_LIGADO` etc.), `false` por padrão. Com `false`, a função de leitura manda um valor de teste que varia sozinho e escreve `[teste] ...` no Monitor Serial (no máximo a cada 10 s por sensor). Risco: o painel parece funcionar sem o sensor; o `DIA-DA-MOSTRA.md` avisa.
72. Bibliotecas extras ficam atrás de `#define` com valor 0: `USAR_DHT` (Residencial, DHT22) e `USAR_OLED` (Mobilidade, painel de partidas). Assim o sketch compila só com as bibliotecas que vêm com a placa e o ArduinoJson.
73. O servo da persiana usa o PWM do ESP32 (`ledc`) sem biblioteca, com `#if` para o pacote da placa 2.x ou 3.x.
74. **Todos os números de pino são palpites**, todos marcados `// TODO: confirmar pino`. Os sensores analógicos ficam em pinos do ADC1 (32 a 39), porque o ADC2 não funciona com a Wi-Fi ligada.

### Comportamento nos sketches (não vem do contrato; é a regra mais simples)
75. Centro Urbano: os postes seguem o LDR S3 (escuro: "ligados"; claro: "desligados"; o sketch nunca manda "automatico", que o contrato permite). Semáforo 6 s verde, 2 s amarelo, 6 s vermelho, e até 4 s a mais de verde com carro na avenida (S8 ou S9).
76. Residencial: aquecimento liga abaixo de 19,5 °C e desliga acima de 20,5 °C. Iluminação em automático acende no escuro (S12).
77. Economia Circular: irrigação automática liga com o solo abaixo de 35%, desliga acima de 70%, e fica bloqueada com o reservatório abaixo de 20% (exigência do PDF). "Irrigar agora" liga a bomba por 10 s e deixa a irrigação em "manual" até alguém escolher "Automático". É a mesma regra do simulador.
78. **Mobilidade, desvio da SPEC:** a SPEC diz que o trem "para na plataforma". A camada 3 não tem sensor na plataforma, só os fins de curso S17 e S18. O sketch faz o trem parar nas duas pontas do trilho e mandar `"na estacao"` nelas. Sem os fins de curso ligados, a viagem dura 8 s por tempo. O ônibus chega a cada 3 minutos (S16 de verdade, quando ligado).

### Documentos e conferência
79. `docs/API.md` documenta só o que o ESP32 usa (`POST /api/esp/leitura`, `POST /api/esp/confirmacao`) e `GET /api/estado` (para conferir). As rotas de login, administração e rede são do painel e não estão lá.
80. **`ferramentas/conferir-esp32.js`** (também no `npm test`, em `testes/esp32.test.js`): compara strings. Não compila. Confere campos, valores de texto, comandos e valores de comando de cada sketch contra `contrato.js`; cópias do cabeçalho; chaves JSON e rotas do cabeçalho; tabelas, rotas, mensagens de erro e números do `API.md` contra o servidor; envia os exemplos JSON do `API.md` a um servidor de teste; e escuta o anúncio UDP. Foi testado de trás para a frente: troquei de propósito 5 coisas (um campo num sketch, um valor de comando, uma faixa no doc, um texto com acento, uma rota no cabeçalho) e ele falhou em todas; depois restaurei.
81. O trecho de `curl.exe` do `API.md` foi executado literalmente no Windows PowerShell 5.1 contra um servidor de teste. Confirmado: com `-Encoding utf8` o PowerShell 5.1 grava um BOM e o servidor responde `JSON inválido.`; por isso o doc manda usar `-Encoding ascii`.
82. `docs/DIA-DA-MOSTRA.md` foi reescrito depois de mandar as leituras das 6 demonstrações ao servidor, como um ESP32 faria, e ler os textos que os cartões mostram. Achados: (a) o servidor liga em modo **demonstração** por padrão (`config/padrao.json`), então no dia alguém precisa trocar para Real, ou escrever `"modo": "real"` no `config\local.json`, ou abrir com `INICIAR.bat --modo real` (os dois últimos foram conferidos); (b) o gráfico de geração contra consumo que eu tinha prometido para a demonstração 4 só chega na F7; (c) o botão "Modo cartões" e as teclas Q, N, C, F, P, D ainda não existem.
83. Para a F8: o zip precisa levar também `ferramentas/esp-falso.js`, para ensaiar no notebook do professor sem ESP32 (ele usa `compartilhado/` e `servidor/simulador.js`, que já estão na lista do item 29).

### Não conferido nesta fase
84. Nenhum sketch foi compilado nem gravado em um ESP32 de verdade. A descoberta UDP foi testada só no mesmo computador. O comportamento dos sketches (semáforo, trem, bomba) não foi executado em lugar nenhum; só os nomes e valores foram comparados.

## 21/10/2026 (V1: novo visual)

O Samuel reprovou o visual da F2 ("feio", "muito IA", "poluído") e pediu para refazer do zero, só no visual. Referências: `claude-code\referencias-visual\` (a estrutura da 2, verde sálvia, é a mais próxima).

### Direção e tokens
85. Tema claro com pastéis quentes, em `web/estilo/tokens.css`: fundo `#F5F1EA`, cartão `#FFFFFF`, texto `#1E2933`, linha `#E8E2D8`, e os cinco pares pastel e forte pedidos (vermelho Canadá, verde sálvia, azul gelo, âmbar outono, ardósia). Pastel só em fundo de cartão, de pílula e de ícone; forte só em bolinha, barra, traço de ícone e anel de foco, **nunca em texto**; o texto é sempre escuro.
86. **Único ajuste de tom:** o texto secundário passou de `#5E6A75` para `#526069`. Com o tom original, o contraste sobre o vermelho pastel ficava em 4,30 (mínimo 4,5). Agora o menor é 4,75.
87. Fonte: **DM Sans** (400, 500, 600 e 700, `@fontsource/dm-sans`, local) no lugar da Nunito. A Nunito continua instalada em `devDependencies`, mas não é mais usada. Tamanho mínimo: 16 px no PC e 14 px no celular (conferido pelo `npm run shots`).
88. `ferramentas/contraste.js` (`npm run contraste`) calcula a razão WCAG de 27 pares dos tokens e sai com erro se algum ficar abaixo do mínimo (7:1 texto principal, 4,5:1 texto secundário, 3:1 elementos gráficos).
89. Formas: cantos de 28 px nos cartões, pílulas redondas, sombra `0 8px 24px rgba(30,41,51,0.06)`, sem borda dura, sem brilho, sem degradê em texto, sem emoji. Folha de bordo desenhada em SVG (contorno de linha na marca e no menu; cheia, com 8% de opacidade, no cartão colorido). É um contorno meu, não a bandeira.

### Estrutura da tela
90. Menu lateral de 88 px (marca, Visão da cidade, 5 áreas com a bolinha de estado de cada uma; embaixo Celular, Admin só para administração, Entrar ou Sair). O QR, a administração e o login saíram da barra do topo.
91. A cidade é uma grade em blocos de tamanhos diferentes: o cartão colorido (2 linhas), Energia e Mobilidade largos, Centro Urbano, Economia Circular e Residencial menores. Cada cartão tem UM número grande; o resto é texto pequeno.
92. Clicar num cartão (ou no ícone do menu) abre a página da área pelo endereço (`#energia`, `#residencial`...). Esc volta para a cidade. A administração e o QR continuam em janela por cima da tela.
93. **Desvio do pedido:** os 3 mini-cartões do topo (Bateria, Consumo, Situação) só aparecem nas **páginas de área**. Na visão da cidade o cartão colorido já mostra a situação, a bateria e o consumo; repetir os mesmos três dados no topo seria exatamente o tipo de repetição que o Samuel reprovou. Se preferir os mini-cartões sempre visíveis, é uma linha em `layoutCartoes.js`.
94. O cartão colorido é o único da tela e a cor segue a situação da energia: verde sálvia ("Gerando mais"), azul gelo ("Equilibrado"), âmbar ("Consumindo mais") e ardósia (sem sinal ou desativada).
95. O número grande do cartão de Energia é a **Geração agora** (solar mais eólica, somados no navegador; não é um campo do contrato). A bateria e o consumo ficam no cartão colorido; na página da Energia o número grande é a carga da bateria.
96. Bateria: número grande com barra fina (não é anel). Tanque do reservatório: barra fina com o número ao lado (âmbar abaixo de 20%).
97. Estado: normal é uma bolinha verde ao lado do nome da área; Alerta, Sem sinal e Desativado viram pílula com ícone e texto. No menu a bolinha tem formas diferentes (cheia verde, cheia âmbar, anel vazio, cinza cheia). "Sem sinal" apaga o número e mostra "Última leitura às HH:MM:SS"; "Desativado" usa listras claras.
98. Alertas: acabou a faixa de alertas. "Reservatório baixo" e "Bateria baixa" viram pílulas âmbar dentro do cartão da área e dentro do cartão colorido. Alerta de área sem sinal ou desativada some (seria de dado velho).
99. Modo do servidor sempre visível, perto do relógio: pílula âmbar **Demonstração** ou pílula verde sálvia **Ao vivo**. Substitui a faixa larga. Perdeu a conexão com o servidor: pílula **Sem conexão**.
100. O texto "Ver detalhes" repetido em cada cartão foi trocado por uma seta num círculo pastel (o texto ficou só para leitor de tela).
101. Comandos: só depois do login de Controle ou Administração, no pé da página da área, com a situação ("Enviado", "Executado", "Sem resposta") ao lado do nome do grupo. Visitante: nada, nem aviso nem cadeado. Áreas sem comandos (Energia, Centro Urbano): nada.
102. Celular: marca, pílula e relógio; cartão colorido; 5 cartões que abrem ao toque (um aberto por vez), com a seta virando "x". Sem login nem comandos.
103. A luz amarela do semáforo desenhado usa `#D49A1C`, fora da paleta (um amarelo de verdade). O contraste dela com o branco fica abaixo de 3:1; a cor do semáforo também aparece em texto na mesma página.
104. Nomes de arquivo reaproveitados em vez de apagar: `web/ui/barra.js` virou o topo, `alertas.js` virou as pílulas de alerta e `faixas.js` as pílulas de modo e de conexão. Arquivos novos: `menu.js`.

### Arquivos fora de `web/estilo/` e `web/ui/` que mudaram
105. `web/main.js` (importa DM Sans e os estilos), `package.json` e `package-lock.json` (DM Sans e o script `contraste`), `ferramentas/shots.js` (reescrito para a tela nova e com mais conferências automáticas: rolagem, texto pequeno, texto cortado e conteúdo que vaza para fora do cartão), `ferramentas/contraste.js` (novo), `docs/DIA-DA-MOSTRA.md` (os textos da tela mudaram) e `servidor/publico/` (resultado do build). **Nada** mudou em `servidor/` (fora o build), `compartilhado/`, `testes/`, `esp32/` nem na API.

## V1b: ajustes antes da F3 (21/10/2026)
106. Opção ativa dos botões de comando: fundo escuro do próprio sistema (`--texto`, #1E2933) com letra clara (#FFFFFF, contraste 14,79) e bolinha sálvia pastel (12,01). Saiu o vermelho, que lembra perigo. O `npm run contraste` passou a conferir esses 2 pares (29 pares, 0 abaixo do mínimo).
107. Ícone da Energia: raio. O desenho de turbina (uma pá para cima, duas para baixo) parecia um avião.

## F3: cena 3D (21/10/2026)
108. Three.js 0.186, instalado no projeto (nada de CDN), entra no build como um arquivo separado (`paginaSolta-*.js`, 788 kB, 203 kB comprimido) por importação dinâmica. Só a página `?modo=cena` (e, na F4, o layout 3D) o baixa. O celular e o `?modo=cartoes` nunca baixam: `npm run shots` confere pelo conteúdo do arquivo (procura `WebGLRenderer`), porque o nome do arquivo não traz "three".
109. A página `?modo=cena` (`web/cena/paginaSolta.js`) mostra só o mapa, em tela cheia. Serve para conferir e depurar. Com `&debug=1` expõe `window.__cena` e `window.__conferirPlanta()`; com `&vista=cima` abre a câmera ortográfica de cima; com `&qualidade=media` ou `baixa` abre já nesse nível.
110. **Cores mais suaves que as da SPEC e da planta.** A SPEC pede asfalto #3A3A3A, painéis #3B5B7A, caixa de baterias #2E2E2E e feltro #2E7D32; o pedido desta rodada é cena clara e pastel ("nada escuro"). Mantive os mesmos matizes, mais claros: asfalto #A29E98, painéis #6A93BB, baterias #69737E, feltro #A9CDA2, telhados #C99A8B, ônibus #6B8FC4. A lista inteira está em `web/cena/paleta.js`. A faixa central continua amarela (#F0C24A). Cada bloco usa a tinta pastel da própria área, **lida dos tokens do CSS** (`--energia-pastel`...), então muda junto com a tela.
111. **Turbina:** a planta a desenha de cima, como uma estrela de 3 pás (a -90, 30 e 150 graus). Na 3D o rotor fica num plano vertical voltado para o visitante, com as pás nos mesmos ângulos vistos de frente. Na captura de cima ela aparece como uma linha com o cubo no ponto (24, 20). A torre e o cubo batem com a planta; o desenho em estrela, não.
112. **Semáforo:** a caixa de 1,6 x 3,6 da planta é lida como o desenho do semáforo visto de frente (3 luzes empilhadas). Na 3D é um poste com uma cabeça de 3 luzes voltada para a avenida, centrada no ponto da planta (44,4; 21,5).
113. **Painéis solares inclinados 25 graus:** o retângulo da planta é a projeção no chão. A placa é mais comprida (6 / cos 25 graus) para a projeção bater com a planta. O painel pequeno do telhado da casa do meio fica na água do telhado em que a planta o põe (a de trás, voltada para o fundo da maquete), deitado na inclinação do telhado.
114. **Bloom dos LEDs:** em vez de um pós-processamento (EffectComposer com UnrealBloomPass, que custa bem mais numa placa fraca), cada LED de poste tem um halo aditivo (`THREE.Points` com textura radial, um desenho só para os 16). Parece brilho, não é bloom de verdade. Os halos só aparecem com os postes ligados (F4).
115. Sombras: um sol com sombra de 2048 (alta) ou 1024 (média), `PCFShadowMap` com raio 3. A SPEC diz 1024 em alta; usei 2048 porque os postes têm só 0,5 cm de largura. Em baixa não há sombra.
116. **Qualidade "baixa" desenha em 75% da resolução** (a SPEC diz pixel ratio 1). Motivo: sem sombra e em resolução cheia, o desenho por software ainda ficava em 14 quadros por segundo; com 75% sobe para 22. Alta usa até 1,5 e média até 1,25 (limitados ao da tela).
117. Quadros por segundo: `fps()` é a quantidade de quadros dividida pelo tempo dos últimos 90 quadros (não a média dos fps de cada quadro, que engana quando há um quadro lento).
118. `web/cena/conferencia.js` (só com `?debug=1`) mede a caixa de cada objeto da cena no chão e compara com `compartilhado/maquete.js` (tolerância 0,6 cm): 39 itens, mais as 11 árvores, os 16 postes (nenhum em cima de bloco) e os 17 dormentes. `npm run cena` roda isso, tira as capturas `F3-cima.png` e `F3-perspectiva.png`, testa os limites da câmera com o mouse e mede os quadros por segundo. Não copiei a planta para o repositório (a SPEC proíbe): a comparação visual com a planta foi feita com ela aberta fora do projeto.
119. As 4 vias viram placas finas (1 mm acima do asfalto, mesma cor) só para existirem como objetos medíveis na cena. O trem fica parado na plataforma (x = 77) até a F4 ligá-lo ao dado. Os 4 carros, as luzes do semáforo, a persiana, o bonequinho e o brilho do aquecimento já existem na cena com funções para a F4 ligar.

## F4: interação e dados na cena (21/10/2026)
120. **Layout 3D** (`web/ui/layout3d.js`, `web/estilo/mapa3d.css`): menu de 88 px, topo e mapa no meio, painel fixo de 450 px à direita. Usa os mesmos componentes da V1 (`criarDestaque` e `criarDetalhe` com a classe `estreito`, `criarTile`). Na cidade, os cartões das áreas ficam compactos (nome, estado e o número grande com o rótulo; as 2 linhas pequenas só aparecem nos cartões grandes e no detalhe). O topo é o mesmo (título, 3 mini-cartões nas áreas, pílula do modo, relógio).
121. **A vista vem do endereço** (`#energia`, `#cidade`): clique no bloco, na etiqueta, no cartão do painel, no ícone do menu, Esc e "Voltar à cidade" só mudam o endereço; o mapa e o painel escutam `hashchange`. Um arquivo só decide a vista (`web/ui/rotas.js`, também usado pelos cartões).
122. **Etiquetas** (`web/cena/etiquetas.js`): HTML sobre o mapa, ancoradas na frente de cada bloco (o lado do visitante, sobre a rua ou a madeira), 20 px, uma linha, com a bolinha de estado. Alerta, Sem sinal e Desativado acrescentam ícone e palavra. A etiqueta da área escolhida fica com a cor da área e as outras ficam um pouco apagadas.
123. **Realce e seleção:** passar o mouse acende o bloco de leve (emissivo na cor forte da área) e a etiqueta; a área escolhida ganha uma moldura de 0,55 cm na cor forte, rente à borda. Usei uma tira de verdade, não uma linha, porque linhas em WebGL têm sempre 1 pixel de espessura e sumiam.
124. **Voo da câmera:** 1 s com suavização cúbica; a vista de uma área enquadra o bloco com os objetos (elevação 50 graus). Com `prefers-reduced-motion` a câmera pula direto. Se a pessoa pegar a câmera no meio do voo, o voo para. Clique só conta se o mouse andou menos de 6 px e durou menos de 0,6 s (senão foi arrastar para girar).
125. **Modo noite** (`web/cena/ambiente.js`): botões Luz Automática, Dia e Noite. Automática segue o relógio (noite das 18h às 6h), por isso **depois das 18h a tela abre à noite**. A noite deixa o fundo azul-ardósia (#3A4663, não preto), a luz fria e fraca, e acende os postes e as janelas. Regra dos postes: `ligados` acende sempre, `desligados` nunca, `automatico` só à noite. Janelas dos prédios acendem à noite; as das casas seguem `iluminacao` (ligada, desligada ou automática = noite). A transição leva 1,2 s.
126. **Ligações com os dados** (`web/cena/dados.js`): turbina a 0,9 rad/s por watt eólico (máximo 14); semáforo; carros (4 menos `vagas_livres`); água do reservatório e aro piscando abaixo de 20%; 6 gotas por gotejador com a bomba ligada; persiana (aberta = recolhida a 8%); bonequinho; brilho laranja na casa 1; trem de ponta a ponta a 22 cm/s com o rosto virando na ponta (`na estacao` leva o trem à plataforma, x = 77, e `parado` o deixa onde está; `demonstracao` ligada também faz andar); painel de partidas escreve `proximo_veiculo` numa textura de canvas. O LED da caixa de baterias fica âmbar abaixo de 20%.
127. **Sem sinal e desativado:** os materiais da área perdem 90% da cor (os que têm textura, como o painel solar, só escurecem) e as animações da área param. Desativado ainda ganha listras no topo do bloco (na Economia Circular, no feltro, que cobre o bloco todo). O último valor fica como estava.
128. **Camada de sensores** (`web/cena/sensores.js`): os 25 itens da planta (5 ESP32, 18 sensores, 2 atuadores) viram marcadores num pino que sobe do chão no ponto exato (esfera = sensor, octaedro = atuador, caixa escura = ESP32), com o código ao lado (16 px). Passar o mouse mostra a dica (o que é, e o valor de cada campo que ele alimenta); clique ou toque fixa a dica; clicar fora fecha. Módulo sem sinal ou desativado deixa os marcadores cinza.
129. **Qualidade cai sozinha:** depois de 4 s de aquecimento, se a média ficar abaixo de 20 quadros por segundo por 5 s seguidos, baixa um nível (alta, média, baixa) e mostra um aviso por 7 s; depois de cada troca espera 4 s antes de medir de novo. Não mede com a aba escondida. Os botões Alta, Média e Baixa escolhem à mão.
130. **Sem WebGL:** `webglDisponivel()` antes de baixar o Three.js; qualquer erro ao montar a cena (inclusive a perda do contexto de desenho depois) desfaz o que foi feito e abre os cartões com o aviso "Modo cartões: o 3D não abriu neste computador" (ou "o 3D parou de responder neste computador").
131. **Menu:** botão **Cartões** (no mapa) e **Mapa 3D** (nos cartões) para trocar de modo. As teclas (Q, N, C, F, P, D) continuam para a F5.
132. Parâmetros de endereço só para teste e depuração: `?luz=dia|noite|auto`, `?sensores=1`, `?qualidade=media|baixa`, `?debug=1` (expõe `window.__app` e `window.__cena`).
133. **Capturas** `01-cidade`, `02-energia-controle`, `03-mobilidade-sem-sinal`, `04-noite`, `05-sensores` e `06-economia-bomba` em `docs/shots/`. A `ferramentas/shots.js` passou a usar a placa de vídeo do PC (`--use-angle=d3d11`) e a ligar o modo real mandando leituras de teste (`alimentar()`), para controlar cada valor. Capturas novas só de teste: 12 (desativado, casa, trem), 13 (sem WebGL), 14 (sem placa de vídeo: a qualidade cai) e 15 (20 ligações dos dados com a cena, lendo os objetos 3D).
134. **O que mudou fora de `web/`:** `ferramentas/shots.js`, `ferramentas/cena.js`, `README.md`, `PROGRESSO.md`, `docs/` e o build em `servidor/publico/`. **Nada** em `servidor/` (fora o build), `compartilhado/`, `esp32/` nem `testes/`; a API e o contrato não mudaram.

## A1: o modo mostrado na tela (21/10/2026)
135. **Por que a captura 01 da F4 dizia "Ao vivo" com valores parecidos com os do simulador:** o `ferramentas/shots.js` ligava o modo real de propósito nas capturas 1 a 6 e mandava leituras de teste (`alimentar()`, com valores próprios, de um ESP32 de mentira) para controlar cada número. O servidor não estava errado: em modo real, com leituras chegando, "Ao vivo" é verdadeiro. O que parecia simulado eram os valores de teste, escolhidos perto dos do simulador. Conferi o servidor: em modo real sem nenhum ESP32 os 5 módulos já ficam "sem sinal" e sem dados, e a troca de demo para real apaga os dados do simulador. Dois testes novos cobrem isso (`testes/servidor.test.js`). Nada mudou em `servidor/`.
136. **Regra da pílula** (`web/ui/modo.js`, testada em `testes/modo.test.js`): demo mostra "Demonstração" (âmbar); real mostra "Ao vivo" (verde sálvia) só se pelo menos um módulo está com leitura recente (`sinal` "ok"); real sem nenhum módulo "ok" mostra **"Sem leituras"** (cinza). Antes, a pílula dependia só do modo do servidor.
137. **Capturas oficiais:** 1, 2, 3 e 5 agora são tiradas em modo demo (pílula "Demonstração"; a 3 silencia a Mobilidade no simulador). A 4 (postes ligados) e a 6 (reservatório baixo, bomba ligada) precisam de valores forçados, que o simulador não aceita; continuam com leituras de teste no modo real, e a pílula "Ao vivo" nelas é verdadeira porque há leituras chegando. As capturas de teste 12 a 15 também.

## A2: salvaguardas do 3D (21/10/2026)
138. **Queda completa:** Alta, Média, Baixa (menos de 20 quadros por segundo por 5 s, um nível de cada vez). Já na Baixa, menos de **24** por **8 s** seguidos: entram os cartões (`main.js`), com o aviso "O mapa 3D estava lento demais neste computador, então entraram os cartões." e o botão **Tentar o 3D de novo**. O aviso fica até a pessoa fechar. A escolha fica na sessão (`sessionStorage`, chave `smartcanada.cartoes`): recarregar a página abre os cartões com o mesmo aviso. O botão (e o botão "Mapa 3D" do menu dos cartões) abre `?modo=3d`, que apaga a memória.
139. **Parâmetros de endereço:** `?qualidade=alta|media|baixa` força a qualidade **e desliga a queda automática** (a pessoa pediu aquela qualidade); `?modo=cartoes` continua igual; `?modo=3d` força o 3D (vale mais que a memória da sessão e que a largura da tela).
140. **`"modoInicial": "auto" | "3d" | "cartoes"`** em `config/padrao.json` (padrão `auto`; vale também em `config/local.json`). Fixa a tela de quem abre o endereço puro (sem `?modo=`): o **servidor** responde com um redirecionamento (302) para `/?modo=cartoes` ou `/?modo=3d`. O `INICIAR.bat` abre o endereço puro, então segue o que estiver na configuração. Valor inválido: aviso no terminal e `auto`. **Mudança em `servidor/`** (só `config.js`, uma linha de aviso na partida e o redirecionamento em `index.js`), pedida por este bloco; a API não mudou. Um teste novo cobre o redirecionamento.
141. **Abaixo de 1280 px de largura entram os cartões** (sem aviso; até a F5 fazer o tablet), exceto com `?modo=3d`. Celular continua abaixo de 768.
142. **1366 x 768 e 1280 x 720 no layout 3D:** os botões do mapa saíram de cima do mapa para uma fileira embaixo dele (o mapa nunca fica escondido atrás dos botões, em nenhuma tela); abaixo de 1500 px o painel fica com 400 px, os 3 mini-cartões do topo somem nas páginas de área (não cabem; a bateria e o consumo continuam no painel da cidade) e os rótulos "Luz" e "Qualidade" dos botões somem (o grupo continua com nome para leitor de tela); abaixo de 860 px de altura o menu lateral, o painel e os botões ficam mais compactos. O painel rola por dentro (com uma barra fina visível) quando não cabe; a página nunca rola. As etiquetas da Energia e da Economia Circular se afastam um pouco da Centro Urbano para não se encostarem.
143. Capturas `16-1366x768-*.png` e `16-1280x720-*.png` em `docs/shots/` (modo demo). Teste da queda (captura 14): sem placa de vídeo e com CPU 4x mais lenta.

## F8 enxuta: entrega (21/10/2026)
144. **`npm run pacote`** (`ferramentas/pacote.js`) escreve o zip com `node:zlib` e `node:fs` (nenhum programa de fora; o formato é o ZIP simples com deflate e nomes em UTF-8; foi aberto com o `Expand-Archive` do Windows para conferir). Leva `servidor/` (com `publico/`), `compartilhado/`, `esp32/`, `docs/` (só os textos, sem as capturas, para não pesar), `config/padrao.json`, `config/local.exemplo.json`, `INICIAR.bat`, `README.md`, `package.json`, `ferramentas/esp-falso.js` e o Node portátil. Tem uma trava: se `config/local.json`, `dados/` ou `node_modules/` entrarem na lista, o comando para.
145. **Node portátil:** o `node.exe` que roda o `npm run pacote` (o Node 24.19.0 instalado neste PC, `C:\Program Files\nodejs\node.exe`) vai para `tools/node/node.exe` dentro do zip. Não entra no git (`tools/node/` está no `.gitignore`). O `INICIAR.bat` agora procura primeiro `tools\node\node.exe` e só depois o Node do sistema; sem nenhum, mostra a mensagem em português. `SEM_NAVEGADOR=1` liga só o servidor.
146. O README foi reescrito para a entrega: rodar no notebook do professor, `config\local.json`, modo real, firewall, IP, qual tela abre e os passos manuais para o GitHub (`git remote add origin`, `git push -u origin main`; sem usuário nem token inventados). O repositório não tem remote.

## G1: campo "teste" (contrato mudado com autorização do Samuel)
147. **`teste` no contrato** (`compartilhado/contrato.js`, constante `CAMPO_TESTE` repetida em cada módulo): booleano, opcional. O servidor valida o tipo pelo `validarDados` de sempre (tipo errado vira aviso e o campo é ignorado), guarda em `dados.teste` e repassa em `/api/estado`. Nenhum outro nome de campo mudou. O histórico em arquivo e o CSV ganharam a coluna `teste` (sim/não, vazia quando o campo não veio), porque o CSV lê as colunas do contrato.
148. **A leitura do ESP32 passou a substituir a anterior** (`registrarLeitura(id, dados, { substituir: true })`, só na rota `POST /api/esp/leitura`; o simulador e o eco dos comandos continuam acrescentando). Motivo: antes, campo que o ESP32 deixava de mandar continuava na tela com o valor antigo (inclusive `teste: true` e valores de teste de antes de regravar o sketch), e o "--" para sensor desligado nunca apareceria sem reiniciar o servidor. Efeito: leitura com campo inválido perde aquele campo (antes mantinha o último valor bom). Teste novo cobre.
149. **`teste` vale por leitura, não por campo:** o sketch manda `"teste": true` quando pelo menos um valor daquela leitura é de teste (sensor desligado e `MODO_TESTE` ligado). Sensor ligado sempre manda o valor lido. Se todos os sensores estão ligados, o campo nem vai, mesmo com `MODO_TESTE` ligado. Atuadores do próprio ESP32 (semáforo, bomba, irrigação, persiana, iluminação, trem, demonstração, terminal) contam como valor de verdade. O trem sem fim de curso anda por tempo: movimento de verdade do motor, não valor de teste.
150. **Pílula do topo** (`web/ui/modo.js`): `demo` → "Demonstração"; real com leituras recentes ("ok") e todas com `teste: true` → **"Teste"** (âmbar, mesmo estilo da Demonstração); real com pelo menos uma leitura recente sem teste → "Ao vivo"; real sem leitura → "Sem leituras". Módulo sem sinal ou desativado não conta como leitura recente. Selo âmbar "Valor de teste" nos cartões (tile e destaque da cidade), na página da área (3D e cartões) e na dica dos sensores do mapa 3D; some quando o módulo está desativado.
151. **Sketches:** as constantes de sensor ligado/desligado (`S1_LIGADO`...) subiram para o bloco CONFIGURAÇÃO no topo, junto com **uma** `const bool MODO_TESTE = false;`. Sensor desligado e `MODO_TESTE` falso: o campo não é mandado (campos que dependem dele, como `bateria_pct` da tensão e `aquecimento` da temperatura, também não) e o Monitor Serial avisa `[sem sensor]`. `MODO_TESTE` verdadeiro: valor de teste como antes, `marcarTeste()` e `"teste": true`. `SmartCanadaRede.h` ganhou `marcarTeste`, `avisarSemSensor` e o `"teste": true` na leitura (as 5 cópias foram atualizadas). Na Residencial, `USAR_DHT` continua sendo o interruptor do S14 e passou para o bloco CONFIGURAÇÃO (`S14_LIGADO = USAR_DHT`). Na Mobilidade, o painel OLED mostra "--" no lugar do horário inventado quando o S16 está desligado e sem `MODO_TESTE`. **Os sketches continuam sem ser compilados.**
152. `ferramentas/conferir-esp32.js` ganhou conferências do G1 (MODO_TESTE único e falso no topo, constantes de sensor antes do include, `marcarTeste` e `avisarSemSensor` usados, campo `teste` no contrato e no API.md, README explicando); continua com 0 falhas. `esp-falso.js --teste` manda `"teste": true`. Captura nova `17-teste-todos.png` (e extras em `docs/shots/tmp/`).

## G2: senha do Wi-Fi em `GET /api/rede` (MANTIDA como está, por estas razões)
153. **Decisão: `GET /api/rede` continua entregando `rede.senha` a quem abrir a rota; nada foi mudado no servidor.** Não achei solução simples sem dependência nova que esconda a senha e mantenha a tela do QR funcionando para o visitante:
   - O QR da Wi-Fi é desenhado **no navegador** (biblioteca `qrcode`, dependência de desenvolvimento embutida na interface compilada). Para o visitante ver o QR, o navegador dele precisa da senha em texto para montar o texto `WIFI:T:WPA;S:nome;P:senha;;`. Gerar o QR no servidor exigiria levar essa biblioteca (ou escrever um codificador de QR) para o servidor, que hoje não tem dependência nenhuma (o pacote do notebook do professor não tem `node_modules`). Isso é "dependência nova no servidor".
   - Alternativa pesada: o navegador da Administração desenha o QR e manda a figura pronta para o servidor guardar. Mudaria a rota `POST /api/admin/rede` (API), deixaria a tela do QR vazia para o visitante até a administração salvar a rede de novo (inclusive quando a rede vem do `config/local.json`) e obrigaria o servidor a guardar e entregar uma figura vinda do navegador. Não é simples nem seguro de fazer sem pergunta.
   - A senha de uma Wi-Fi de visitante **já é pública para quem está na sala**: o QR dela fica na tela e qualquer câmera lê. O que a rota a mais expõe é a senha a quem alcança o servidor pela rede sem ver a tela (outro computador na mesma Wi-Fi, que já sabe a senha, ou a rede cabeada do notebook).
154. **Como reduzir o risco sem mexer no servidor:** usar na Mostra uma Wi-Fi **só para o projeto** (hotspot do celular ou roteador próprio), com senha que não seja a da escola nem a de casa; a senha só é gravada em `config/local.json` (fora do git e do zip) ou digitada na Administração; nunca escrever a senha real nos sketches que vão para o GitHub. Isso está no `docs/GUIA-DO-OPERADOR.md` e no README. **Opção para o Samuel decidir depois:** entregar `rede.senha` só para a Administração e para quem abre o painel no próprio notebook (endereço de loopback), o que cabe em umas 10 linhas e tem teste fácil, mas deixaria o QR da Wi-Fi sem senha se a TV abrir o painel por outro computador.

## G3: GitHub e guias
155. **Arquivos novos e reescritos:** `README.md` da raiz virou a página do GitHub (o que é, captura `docs/shots/01-cidade.png`, baixar pela Release com o marcador `<LINK_DA_RELEASE>`, rodar no notebook, conectar os ESP32, tabela "sintoma, causa provável, o que fazer", estrutura de pastas, comandos de desenvolvimento). Novos: `docs/GUIA-DO-OPERADOR.md` (uma página para imprimir, para quem não programa), `docs/REDE.md` (dois diagramas Mermaid; **os dois renderizaram sem erro com o Mermaid 11.4.1 num Chromium**, não no GitHub) e `docs/PUBLICAR-NO-GITHUB.md` (passos manuais com `<USUARIO>`, `<NOME_DO_REPOSITORIO>`, `<URL_DO_REPOSITORIO>` e `<LINK_DA_RELEASE>`; nenhum usuário, token ou link inventado). Os passos de publicar saíram do README para esse arquivo (o README só aponta).
156. **`docs/REDE.md` não tem esquema elétrico nem tabela de pinos**, de propósito: os pinos dos sketches são palpites. Tem a seção "Ligação dos sensores: a preencher depois que o grupo confirmar os pinos", vazia.
157. **Verificações do repositório (21/10/2026, antes do commit G3):**
   - 10 maiores arquivos rastreados: `servidor/publico/assets/cena-*.js` 407 kB; `docs/shots/06-economia-bomba.png` 386 kB; `three.core-*.js` 377 kB; `05-sensores.png` 375 kB; `03-mobilidade-sem-sinal.png` 373 kB; `01-cidade.png` 340 kB; `04-noite.png` 312 kB; `11-administracao.png` 301 kB; `02-energia-controle.png` 293 kB; `F3-cima.png` 271 kB. Nenhum passa de 0,5 MB.
   - Tamanho: 158 arquivos rastreados somam 5,9 MB; a pasta `.git` tem 14 MB (objetos soltos 10,5 MB mais 2,4 MB empacotados, com as versões antigas do build).
   - **Fora do git (conferido com `git ls-files` e `git check-ignore`):** `node.exe` e `tools/node/`, o zip e `entrega/`, `config/local.json` (só `padrao.json` e `local.exemplo.json` estão em `config/`) e a pasta `dados/` da raiz (`/dados/` no `.gitignore`). `web/dados/*.js` são código da interface e ficam.
   - **Busca nos arquivos rastreados** (fora do build compilado): e-mails: nenhum; telefones: nenhum; formatos de chave ou token conhecidos (AWS, GitHub, Slack, OpenAI, chave privada): nenhum. Senhas e chaves com valor: só exemplos de mentira (`SENHA-DA-REDE`, `NOME-DA-REDE`, `chave-de-exemplo-troque`, `troque-isto`, e nos testes e nas capturas `senha-de-exemplo`, `senha-de-teste`, `codigo-controle-teste`). IPs: só `192.168.0.x` de exemplo nos sketches e nos documentos. Nada foi apagado.
   - **Achados para o Samuel decidir:** (1) **todos os commits têm o e-mail pessoal `mariotto.sim@gmail.com`** (autor e quem commitou, nome `SMariotto`): **não publicar** antes de resolver (o `docs/PUBLICAR-NO-GITHUB.md` explica; não mexi no histórico). (2) `PROGRESSO.md` cita o caminho `C:\Users\Samuel\Documents\Jarvis\vault\...` (usuário do Windows). (3) A captura `docs/shots/10-qr.png` mostra o IP desta rede (`10.151.86.146`, endereço privado de rede local) e o nome `SMART-CANADA-2050` (a senha dentro do QR é a de mentira `senha-de-exemplo`).
158. `docs/DIA-DA-MOSTRA.md` foi atualizado (pílulas "Teste" e "Sem leituras", `MODO_TESTE`, links para o guia e a rede) e voltaram as barras invertidas de `tools\node` e `config\local.json`, que a gravação anterior tinha estragado (viraram quebra de linha ou sumiram).
