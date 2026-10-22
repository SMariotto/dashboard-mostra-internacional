# Guia do operador: painel Smart Canada 2050

**Para imprimir (1 página).** Para quem vai ligar o painel na Mostra (24/10/2026) e **não precisa saber programar**. Cada passo diz o que clicar e o que você deve ver. Se não vir, vá para "Se algo der errado".

> Este guia foi escrito antes de testar no notebook do professor. Na véspera, faça cada passo de verdade e corrija este papel à mão onde estiver diferente.

Anote aqui: Wi-Fi do projeto: ____________________ Senha: ____________________ IP do notebook: ____________________
Código de **Administração**: ____________________ (peça ao Samuel; não está neste papel de propósito)

## Lista de conferência da véspera (no notebook do professor, não no do Samuel)

- ☐ **Firewall:** abri o `INICIAR.bat`, o Windows perguntou sobre a rede e eu cliquei em **Permitir**.
- ☐ **Node:** a pasta do painel tem `tools\node\node.exe`. A janela preta abriu e **não** disse "O Node.js não foi encontrado".
- ☐ **TV:** ligada por cabo (HDMI) e mostrando o painel em tela cheia. Se não estiver em tela cheia, apertei **F11**. Li os números de longe (uns 3 metros).
- ☐ **Modo real:** entrei como Administração, em **Admin**, "Modo de dados", escolhi **Real (ESP32)**. A pílula do topo, perto do relógio, diz **Ao vivo** (verde), e **não** diz "Demonstração" nem "Teste".
- ☐ **Rede:** a Wi-Fi do projeto é de **2,4 GHz** (não 5 GHz), e o notebook está nela. Anotei nome, senha e o IP do notebook (janela preta, linha "Na rede").
- ☐ **ESP32 gravados:** os 5 foram gravados com o nome e a senha da Wi-Fi do projeto, e no Monitor Serial aparece "Wi-Fi conectada" e "Servidor achado". Em cada sketch, `MODO_TESTE = false`.
- ☐ **Testar comandos:** em **Admin**, cliquei em **Testar comandos** e as **5 áreas** responderam.
- ☐ **QR lido por um celular:** cliquei em **Celular** (menu lateral). O 1º QR entrou na Wi-Fi e o 2º abriu o painel no celular.
- ☐ **Plano B em cartões:** cliquei em **Cartões** (menu lateral) e a tela virou cartões; cliquei em **Mapa 3D** e voltou.
- ☐ **Na mochila:** pen drive com o zip, cabo HDMI, carregadores, extensão, este papel.

## Passo a passo do dia

1. Ligue o roteador (ou o hotspot do celular, em 2,4 GHz). Ligue o notebook e conecte na Wi-Fi do projeto. Ligue a TV.
2. Dê dois cliques em **INICIAR.bat**. Abre uma **janela preta**: **não feche** (fechar desliga o painel). O painel abre no navegador.
3. Ligue os **5 ESP32** (alimentação). Espere uns 10 segundos.
4. **Confira:** pílula **Ao vivo** (verde) e as 5 bolinhas do menu lateral **verdes**.
5. No menu lateral, clique em **Entrar**, digite o código de **Administração**. Aparece o botão **Admin**.
6. Em **Admin**: "Modo de dados" em **Real (ESP32)**; clique em **Testar comandos** (as 5 áreas devem responder); em "Rede do QR", digite o nome e a senha da Wi-Fi e clique em **Guardar**.
7. Feche o Admin, clique em **Celular** e deixe os dois QR na mesa dos visitantes (1º entra na rede, 2º abre o painel).
8. Clique em **Sair** (o visitante não deve ver botões de comando) e em **Visão da cidade**. Pronto.

Para o visitante: clique num bloco do mapa (ou num cartão) para ver a área; **Esc** ou **Voltar à cidade** volta.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Pílula **Demonstração** (âmbar) | Os valores são simulados. Em Admin, "Modo de dados", escolha **Real (ESP32)**. |
| Pílula **Teste** | Os ESP32 mandam valor de teste. Chame o Samuel (é preciso gravar de novo com `MODO_TESTE = false`). |
| Pílula **Sem leituras** (cinza) | Nenhum ESP32 chegou. Confira se estão ligados, se a Wi-Fi está no ar e se o firewall deixou. |
| Uma área **Sem sinal** | Aquele ESP32 caiu. Desligue e ligue o ESP32. O resto continua funcionando. |
| **Todas** sem sinal | Em Admin, clique em **Ligar demonstração** para não ficar vazio, e depois resolva a rede. Avise os visitantes que são valores de exemplo. |
| O mapa 3D trava ou fica lento | O painel baixa a qualidade sozinho e depois entra nos cartões. Se travou, clique em **Cartões** no menu lateral. |
| Tela preta ou "Sem conexão" | A janela preta foi fechada. Abra o `INICIAR.bat` de novo. |
| Celular não abre o painel | O celular precisa estar na mesma Wi-Fi do notebook. O firewall pode estar bloqueando: veja o passo do firewall acima. |
| Nada funciona | **Plano B:** cartões (botão **Cartões**). **Plano C:** o notebook do Samuel com o mesmo zip. |

## No fim do dia

Se quiserem os números do dia: **Admin**, bloco "Histórico", **Exportar histórico (CSV)**. Depois feche a janela preta para desligar.
