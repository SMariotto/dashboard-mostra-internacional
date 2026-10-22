# Dia da Mostra (sábado, 24/10/2026)

Roteiro curto para o Samuel e o grupo.

**Para quem opera na Mostra e não programa:** use o `GUIA-DO-OPERADOR.md` (uma página para imprimir, com a lista da véspera). O esquema da rede está em `REDE.md`. Este arquivo é o roteiro completo e o ensaio das 6 demonstrações.

**Estado do painel hoje (21/10/2026):** a tela de tela grande abre o **mapa 3D** da maquete com o painel de cartões à direita (F3 e F4 prontas), com o visual da V1. O passeio automático do modo apresentação, as teclas (Q, N, C, F, P, D) e o menu de depuração ainda **não existem**: vêm na F5. Os passos que dependem deles estão marcados com "(depois da F5)". O plano B é o **modo cartões** (botão "Cartões" no menu lateral, ou `?modo=cartoes` no endereço).

**Os sketches dos ESP32 NÃO foram compilados** (o arduino-cli não está instalado). Alguém do grupo compila e grava na Arduino IDE 2 antes do dia. Os nomes dos campos são proposta: o grupo precisa confirmar (`docs/API.md`).

## Como é a tela

- **Mapa 3D (esquerda):** a maquete vista do lado do visitante. Arraste para girar, use a roda para aproximar e afastar, arraste com o botão direito para deslocar. **Clique num bloco** (ou na etiqueta com o nome da área): a câmera voa até ele e o painel da direita mostra os dados dela. **Esc** ou **Voltar à cidade** volta. Passar o mouse num bloco ou etiqueta realça o bloco.
- **Botões embaixo do mapa:** **Mostrar sensores** (marcadores S, P e E da planta; passe o mouse ou toque para ver o que cada um mede), **Luz** (Automática pelo relógio, Dia ou Noite) e **Qualidade** (Alta, Média, Baixa). Se o mapa ficar lento (menos de 20 quadros por segundo por 5 s), a qualidade baixa sozinha e aparece um aviso.
- **Se o computador não abrir o 3D:** entra sozinho o modo cartões, com o aviso "Modo cartões: o 3D não abriu neste computador".
- **Painel (direita):** na cidade, o cartão colorido e um cartão por área; numa área, o detalhe dela (com comandos só para Controle e Administração).
- **Menu lateral (esquerda):** a folha de bordo, a "Visão da cidade" e um ícone para cada uma das 5 áreas, cada um com a sua bolinha de estado. Embaixo: **Cartões** (troca para o modo cartões; nos cartões o botão é **Mapa 3D**), **Celular** (os QR), **Admin** (só aparece para quem entrou como Administração) e **Entrar** ou **Sair**.
- **Visão da cidade:** um cartão colorido com a situação da energia ("Gerando mais que o consumo"), a bateria e o consumo, e um cartão para cada área. Clicar num cartão (ou no ícone do menu) abre a página da área, com todos os dados.
- **Esc** ou o botão "Visão da cidade" volta para a cidade.
- **Bolinha ao lado do nome da área:** verde é "funcionando". Qualquer outro estado aparece como pílula com texto: **Alerta**, **Sem sinal** ou **Desativado**. No menu lateral, a bolinha de cada ícone é verde (funcionando), âmbar (alerta), anel vazio (sem sinal) ou cinza cheia (desativado).
- **Perto do relógio fica a pílula do modo:** **Ao vivo** (verde) quando pelo menos um ESP32 manda leitura de sensor, **Demonstração** (âmbar) quando os valores são simulados, **Teste** (âmbar) quando os ESP32 só mandam valores de teste, e **Sem leituras** (cinza) quando nenhum ESP32 chegou. Se estiver "Demonstração" ou "Teste" na hora da Mostra, os valores **não** são da maquete. Cartões com valor de teste ganham o selo **Valor de teste**.
- Visitante não vê comandos nem cadeado. Os comandos aparecem no pé da página de cada área, só depois de **Entrar** como Controle ou Administração.

## Antes da véspera (uma vez)

1. No computador do Samuel: copiar `config\local.exemplo.json` para `config\local.json` e trocar os códigos de **Controle** e de **Administração**, e a `chaveModulos`. Esse arquivo não vai para o git nem para ninguém.
2. A `chaveModulos` do servidor tem que ser igual à `CHAVE_MODULOS` dos 5 sketches.
3. Para o painel já ligar no modo real, escreva `"modo": "real"` no `config\local.json`. Sem isso, o servidor liga no modo **demonstração**. Também dá para abrir com `INICIAR.bat --modo real`.
4. Rede do dia: roteador ou hotspot em **2,4 GHz** (o ESP32 não conecta em 5 GHz).

## Roteiro

1. **Véspera: testar no notebook do professor, não no do Samuel.**
   - **Firewall do Windows (importante):** na primeira vez que o Node liga, o Windows pergunta se deixa usar a rede. Clique em **Permitir** (pode pedir a senha de administrador do notebook). Sem isso, a tela do próprio notebook funciona, mas os ESP32 e os celulares não chegam.
   - **O zip já leva o Node portátil** (`tools/node/node.exe`): extraia o zip numa pasta do notebook e rode o `INICIAR.bat`; não precisa instalar nada. Se o `node.exe` sumir da pasta `tools\node`, o `INICIAR.bat` explica como baixar o "Windows Binary (.zip)" em nodejs.org, sem administrador.
   - **Crie o `config\local.json`** nessa pasta (códigos, chave dos módulos; veja o `README.md`). O zip não leva esse arquivo de propósito.
   - **Fixar a tela:** se o notebook do professor não for bom para o 3D, escreva `"modoInicial": "cartoes"` no `config\local.json`: o endereço puro passa a abrir os cartões, sem digitar nada. Teste o 3D na véspera: se ele rodar bem, deixe `"auto"` (padrão).
   - Tela cheia na TV: o `INICIAR.bat` tenta abrir o Edge ou o Chrome em tela cheia. Isso ainda **não foi conferido** em nenhum computador: veja na véspera e, se não abrir assim, aperte F11 no navegador.
   - Gravar os ESP32 com a rede do dia e conferir cada um no Monitor Serial.
   - Carregar o pen drive com o zip e o Node portátil.
2. **Montagem.**
   - Ligar o roteador ou hotspot (2,4 GHz) e depois o notebook, na mesma rede.
   - Abrir o `INICIAR.bat`. A janela preta mostra os endereços. Não feche a janela.
   - Ligar os 5 ESP32.
   - Conferir a pílula do modo: tem que estar **Ao vivo** (verde). Ela só diz isso com pelo menos um ESP32 mandando leitura; **Sem leituras** (cinza) quer dizer que nenhum ESP32 chegou ainda; **Demonstração** (âmbar) quer dizer que os valores são simulados. Conferir as bolinhas das 5 áreas (verdes em poucos segundos depois que cada ESP32 manda a primeira leitura).
   - Clicar em **Entrar** (embaixo, no menu lateral) com o código de **Administração**. Aparece o botão **Admin**.
   - Em **Admin**, no bloco "Modo de dados", conferir que está em **Real (ESP32)**.
   - Ainda em **Admin**, no bloco "Teste dos módulos", clicar em **Testar comandos**: devem aparecer as 5 áreas com "respondeu em ... ms". Área que não responde ao teste também não vai responder aos comandos de verdade.
   - Em "Rede do QR", digitar o nome e a senha da Wi-Fi do dia e clicar em Guardar. Fechar o Admin, clicar em **Celular** e testar os dois QR com um celular: o primeiro entra na rede, o segundo abre o painel. Deixar essa tela na mesa de visitantes.
   - Ligar o **Modo apresentação** no Admin (o passeio automático do mapa só existe depois da F5).
   - Clicar em **Sair** (visitante não deve ver comandos) e voltar para a Visão da cidade.
3. **Se um ESP32 cair:** o cartão da área ganha a pílula **Sem sinal** com "Última leitura às HH:MM:SS", e os números ficam apagados. O resto continua. **Se todos caírem:** o Admin mostra "Nenhum ESP32 mandou dados nos últimos 30 segundos" com o botão **Ligar demonstração** (ou escolha Demonstração em "Modo de dados"). A pílula do modo muda para **Demonstração**.
4. **Se o mapa 3D travar ou ficar lento:** o próprio painel baixa a qualidade (Alta, Média, Baixa) e avisa; se nem a Baixa chegar a 24 quadros por segundo por 8 s, **entram os cartões sozinhos**, com o aviso e o botão **Tentar o 3D de novo**. À mão: botão **Qualidade** (escolha Baixa), **Cartões** no menu lateral, `?modo=cartoes` no endereço, ou `"modoInicial": "cartoes"` no `config\local.json`. Em último caso, recarregar a página (F5). Abaixo de 1280 px de largura abrem os cartões. (depois da F5: a tecla Q baixa a qualidade.)
5. **Plano C:** abrir no notebook do Samuel com o mesmo zip.
6. **Desligar:** fechar a janela preta. Antes, se quiserem os números do dia, entrar como Administração e, em Admin, no bloco "Histórico", usar **Exportar histórico (CSV)**.

## Ensaio: as 6 demonstrações do projeto da turma

São as da seção 11 do PDF do projeto. A coluna "Na tela" descreve **os cartões do painel (os mesmos do modo cartões)**, com os textos que aparecem. Foi conferida em 21/10/2026 mandando leituras de teste ao servidor, como um ESP32 faria, e lendo os cartões. Não foi conferida com um ESP32 de verdade.

Os comandos aparecem na página da área (clique no cartão), no pé, para **Controle** ou **Administração**. O texto ao lado do nome do comando mostra "Enviado" enquanto espera, "Executado" quando o ESP32 confirma e "Sem resposta" se passar de 30 s sem confirmação. A opção ativa fica com fundo escuro, letra clara e uma bolinha, pelo dado que o ESP32 devolve.

| Nº | Demonstração | O visitante faz | Quem mede | Na tela (cartões) | Comando (Controle) | Sem hardware (modo demonstração) |
|---|---|---|---|---|---|---|
| 1 | Anoitecer na cidade | Cobre o sensor de luz | Centro Urbano (S3, LDR). O consumo vem da Energia (S1) | **Visão da cidade:** o cartão colorido passa de "Gerando mais que o consumo" para "Consumindo mais que gera" e o **Consumo** sobe (ex.: 3,5 W para 5,6 W). Cartão **Centro Urbano**: "Postes ligados" | Nenhum, é automático | Os postes ligam no "anoitecer" do ciclo de 3 minutos e o consumo sobe |
| 2 | Aumento do fluxo de veículos | Põe carrinhos diante dos sensores da avenida e nas vagas | Centro Urbano (S8 e S9 na avenida, S4 a S7 nas vagas) | Cartão **Centro Urbano**: "**1** de 4 Vagas livres", "Semáforo amarelo". Na página do Centro Urbano: o desenho das 3 luzes com a cor atual e 4 quadradinhos (verde é vaga livre, carrinho é vaga ocupada). No sketch, carro na avenida alonga o verde em até 4 s | Nenhum, é automático | O semáforo cicla (verde 6 s, amarelo 2 s, vermelho 6 s) e as vagas mudam devagar |
| 3 | Chegada ao terminal | Aproxima o ônibus ou o trem do ponto | Mobilidade (S16 aproximação, P2 painel de partidas, S17 e S18 fim de curso) | Página da **Mobilidade**: "Ônibus 2 na plataforma" (Próximo veículo), "Veículo na plataforma: **Sim**", "Trem: **Em movimento**", "Na estação" ou "Parado" | **Demonstração: Iniciar** e **Parar** (o trem anda de ponta a ponta). Depois de "Executado", a página mostra "Demonstração: Ativa" e o botão Iniciar fica destacado | O ônibus chega sozinho a cada 40 a 70 s. "Iniciar" faz o trem andar |
| 4 | Geração renovável | Ilumina o painel solar e mexe a turbina | Energia (S2 luz, S1 tensão e corrente) | **Visão da cidade:** o cartão colorido mostra "Gerando mais que o consumo", **Bateria** (número com barra fina) e **Consumo**. Cartão **Energia**: "**11,3** W Geração agora" com "Solar 8,2 W" e "Eólica 3,1 W". Página da Energia: Carga da bateria, Tensão da bateria, Consumo, Solar e Eólica. O gráfico de 10 minutos ainda não existe (fase F7) | Nenhum, é automático | O sol sobe e desce a cada 3 minutos e o vento oscila |
| 5 | Solo seco | Seca o solo (ou espera a umidade cair) | Economia Circular (S10 umidade do solo, S11 nível, P1 bomba) | Cartão **Economia Circular**: "**28** % Umidade do solo", "Bomba ligada". Com o reservatório abaixo de 20% (aqui 18%), o cartão ganha a pílula **Alerta** e a linha "**Reservatório baixo**", e o cartão colorido da cidade mostra "Reservatório baixo (Economia Circular)". Página da área: "Bomba: Ligada" e a barra do reservatório em âmbar | **Irrigação: Irrigar agora**. Depois mostra "Irrigação: Manual" e fica assim até alguém escolher **Automático** | Abaixo de 35% a bomba liga sozinha. Com o reservatório abaixo de 20%, a irrigação automática fica bloqueada |
| 6 | Casa inteligente | Passa a mão no sensor de presença, cobre a luz, esquenta o sensor de temperatura | Área Residencial (S13 presença, S12 luz, S14 temperatura e umidade, S15 servo da persiana) | Cartão **Área Residencial**: "**17,8** °C Temperatura da casa", "Alguém em casa". Página da área: "Aquecimento: Ligado", "Persiana: Fechada", "Iluminação: Ligada" | **Iluminação: Automático, Ligar, Desligar.** **Persiana: Abrir, Fechar** | A presença aparece de vez em quando, a temperatura acompanha o sol e os comandos funcionam |

O mapa 3D mostra os mesmos dados na maquete (conferido em 21/10/2026 mandando valores conhecidos e lendo os objetos da cena): a turbina gira mais rápido com mais eólica e para sem vento; o semáforo acende a cor certa; aparecem 4 menos as vagas livres de carros; os LEDs dos postes acendem (ou só de noite, em automático) e as janelas dos prédios e das casas acendem à noite; a água do reservatório sobe e desce, e abaixo de 20% o aro pisca; as gotas caem com a bomba ligada; a persiana abre e fecha; o bonequinho aparece com presença; a casa 1 ganha um brilho laranja com o aquecimento; o trem anda de ponta a ponta (ou para na plataforma); e o painel de partidas escreve o próximo veículo. Área **sem sinal** fica cinza e parada; área **desativada** fica cinza e listrada.

## Antes de ensaiar com os ESP32, confira com cada equipe

- O módulo manda os campos com os nomes de `docs/API.md` (os nomes ainda são proposta do painel; o grupo confirma).
- Na demonstração 1, o consumo só muda no painel se a Energia medir o consumo da cidade (S1).
- O **Testar comandos** mostra quem responde. Um módulo que não responde ao teste também não responde aos comandos.
- Cada equipe troca os pinos marcados `// TODO: confirmar pino` e liga a constante do sensor (por exemplo `S10_LIGADO = true`). Com o sensor desligado e `MODO_TESTE = false` (o padrão), o sketch **não manda o campo** e o cartão mostra "--": o painel não finge que o sensor funciona. Com `MODO_TESTE = true` o sketch manda valor de teste e `"teste": true`: o cartão ganha o selo "Valor de teste" e a pílula do topo diz "Teste". **Na Mostra, `MODO_TESTE` tem que estar `false` nos 5 sketches.**
- A tabela acima foi conferida com leituras de teste mandadas ao servidor como um ESP32 faria, **sem** o campo `teste` (valores de sensor). Com sensor desligado, o dado correspondente aparece como "--".
