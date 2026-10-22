# ESP32 da Smart Canada 2050: guia da turma

**Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.**

**Os sketches desta pasta NÃO foram compilados, porque o arduino-cli não está instalado.** Quem for gravar o primeiro ESP32 compila na Arduino IDE 2 e corrige o que a IDE reclamar (a causa mais provável é a versão da placa ESP32 ou da biblioteca ArduinoJson). Avise o Samuel do que mudar.

Cada módulo da maquete tem um ESP32 e um sketch. Eles mandam os dados para o painel (o Módulo 6) pela Wi-Fi e recebem os comandos de volta. Os nomes de campo, faixas e comandos estão em `docs/API.md`.

## O que tem aqui

| pasta | módulo | ESP32 na maquete | comandos |
|---|---|---|---|
| `energia/energia.ino` | Energia Renovável | E1 | nenhum |
| `residencial/residencial.ino` | Área Residencial | E4 | iluminação, persiana |
| `centro-urbano/centro-urbano.ino` | Centro Urbano | E2 | nenhum |
| `mobilidade/mobilidade.ino` | Mobilidade | E5 | demonstração do trem |
| `economia-circular/economia-circular.ino` | Economia Circular | E3 | irrigação |
| `comum/SmartCanadaRede.h` | todos | | cuida da Wi-Fi, do servidor e dos comandos |

Todo sketch aceita o comando `ping`: é o botão "Testar comandos" da Administração. O ESP32 só confirma e não aciona nada.

A Arduino IDE só enxerga arquivos dentro da pasta do sketch. Por isso cada pasta tem uma **cópia** do `SmartCanadaRede.h`. O original fica em `comum/`. Se alguém mudar o original, rode na pasta do projeto `node ferramentas/conferir-esp32.js --copiar` para copiar para as 5 pastas.

## Passo a passo (primeira vez)

Faça os passos 1 a 3 **antes do dia**, com internet. Na Mostra não vai ter internet.

1. **Instale a Arduino IDE 2** (arduino.cc).
2. **Instale a placa ESP32.** Em Arquivo, Preferências, no campo "URLs Adicionais do Gerenciador de Placas", cole o endereço do pacote da Espressif (está na documentação "Installing" do Arduino ESP32, em docs.espressif.com). Depois, em Ferramentas, Placa, Gerenciador de Placas, procure **esp32** (da Espressif Systems) e instale.
3. **Instale a biblioteca ArduinoJson, versão 7.** Em Ferramentas, Gerenciar Bibliotecas, procure **ArduinoJson** (de Benoit Blanchon) e instale a versão 7.x. As outras bibliotecas (`WiFi`, `HTTPClient`, `WiFiUdp`) já vêm com a placa.
   - Só se for usar: **DHT sensor library** (Adafruit), para o S14 (DHT22) da Residencial; **Adafruit SSD1306** e **Adafruit GFX**, para o painel de partidas P2 da Mobilidade. Sem elas o sketch compila e esses sensores ficam desligados (veja "Sensores e modo de teste" abaixo).
4. **Abra o sketch** do seu módulo (o arquivo `.ino` da pasta dele).
5. **Preencha a CONFIGURAÇÃO**, no topo do sketch:
   - `WIFI_REDE` e `WIFI_SENHA`: a Wi-Fi do projeto. **Precisa ser rede de 2,4 GHz. O ESP32 não conecta em rede de 5 GHz.** Roteadores com uma rede só para 2,4 e 5 GHz com o mesmo nome costumam funcionar, mas se não conectar, crie uma rede só de 2,4 GHz.
   - `CHAVE_MODULOS`: a mesma `chaveModulos` do servidor (`config/padrao.json` ou `config/local.json`). O valor de exemplo é só para teste: troque antes da Mostra, no servidor e nos 5 sketches.
   - `IP_RESERVA`: o IP do notebook, que aparece grande na tela de Administração e na janela preta do servidor. Só é usado se o anúncio automático não chegar em 10 s.
   - **Nunca suba a senha real da Wi-Fi para o GitHub.** Troque de volta para `SENHA-DA-REDE` antes de salvar no repositório.
6. **Escolha a placa e a porta.** Ferramentas, Placa, esp32, **ESP32 Dev Module**. Ferramentas, Porta: a porta COM do ESP32.
7. **Grave** (botão com a seta). Se a IDE ficar em "Connecting...", segure o botão **BOOT** da placa até começar a gravar.
8. **Abra o Monitor Serial** (Ferramentas, Monitor Serial) em **115200**. Você deve ver, em português:
   ```
   === Smart Canada 2050: módulo economia ===
   Conectando na Wi-Fi "..." (precisa ser rede de 2,4 GHz)...
   Wi-Fi conectada. IP deste ESP32: 192.168.0.23
   Procurando o servidor (anúncio UDP na porta 5051, até 10 s)...
   Servidor achado pelo anúncio: 192.168.0.10:5050
   ```
9. **Veja o módulo ficar verde no painel.** No painel, entre como Administração e, em Modo de dados, escolha **Real (ESP32)**. A bolinha da área na barra do topo fica verde em até 6 s. Use "Testar comandos" para ver se o ESP32 responde ao `ping`.

## Sensores e modo de teste

- Os pinos estão marcados com `// TODO: confirmar pino`. **Os números são palpites**: confira com a ligação real da maquete e troque.
- Cada sensor da camada 3 (S1, S2, S10...) tem uma função de leitura e uma constante no topo (por exemplo `S10_LIGADO`). `false` = sensor desligado (ainda não instalado). Quando ligar o sensor, troque a constante para `true` e ajuste a calibração.
- Há **uma só** constante `MODO_TESTE`, também no topo, com padrão `false`:
  - **`MODO_TESTE = false` (padrão):** sensor desligado **não manda o campo**. O cartão do painel mostra "--" naquele dado e o Monitor Serial escreve `[sem sensor] S10 (umidade do solo) está desligado: o campo não é mandado`. Assim o painel não parece funcionar sem o sensor.
  - **`MODO_TESTE = true`:** sensor desligado manda um valor de teste que varia devagar (`[teste] S10 ... ainda não está ligado` no Monitor Serial) e a leitura sai com `"teste": true`. O painel mostra o selo âmbar **"Valor de teste"** nos cartões e a pílula do topo diz **"Teste"** (não "Ao vivo"). Serve para ensaiar o painel sem a maquete.
  - Sensor **ligado** sempre manda o valor lido. Só entra `"teste": true` quando pelo menos um valor da leitura é de teste.
  - Atuadores do próprio ESP32 (semáforo, bomba, persiana, trem) são valores de verdade e não ficam marcados como teste.
  - Antes da Mostra, confira nos 5 sketches: `MODO_TESTE = false` e as constantes de sensor `true` só onde o sensor está ligado de verdade.
- Sensores analógicos precisam estar em pinos do ADC1 (32 a 39). Os pinos do ADC2 não funcionam com a Wi-Fi ligada.
- As calibrações (tensão da bateria, umidade do solo, nível do reservatório, ângulos do servo) são valores de partida. Meça na maquete.

## Testar sem a maquete

No computador do painel, com o servidor no modo **Real (ESP32)**, rode `node ferramentas/esp-falso.js`. Ele finge ser os 5 ESP32 usando o mesmo caminho dos sketches (anúncio UDP, leitura com a chave, comandos e confirmação). Serve para ver o painel funcionando e para comparar com o que o seu ESP32 faz.

## O que fazer se

**O ESP32 não conecta na Wi-Fi** (o Monitor Serial mostra pontinhos e "NÃO conectou"):
- A rede é de 2,4 GHz? Em 5 GHz o ESP32 nunca conecta.
- Nome e senha estão exatamente iguais (maiúsculas, espaços)?
- O roteador está perto? Um celular com hotspot também serve (configure em 2,4 GHz).
- O ESP32 tenta de novo sozinho a cada 10 s.

**Conecta, mas o painel não vê** ("Sem resposta do servidor" no Monitor Serial):
- O servidor está ligado (janela preta aberta) e o notebook está na mesma Wi-Fi?
- O IP do servidor mudou? Veja o IP novo na Administração. O anúncio UDP corrige sozinho; se não corrigir, troque `IP_RESERVA`.
- **Firewall do Windows**: na primeira vez, o Windows pergunta se deixa o Node usar a rede. Precisa clicar em **Permitir** (pode pedir a senha de administrador). Sem isso, a tela do próprio notebook funciona, mas os ESP32 e os celulares não chegam.
- Alguns roteadores bloqueiam a conversa entre aparelhos da mesma rede (isolamento de clientes, "AP isolation"). Desligue essa opção.

**O painel vê, mas o módulo continua cinza ou os dados não mudam:**
- `Chave errada` no Monitor Serial: a `CHAVE_MODULOS` do sketch tem que ser igual à do servidor.
- `o painel está no modo demonstração`: na Administração, escolha **Real (ESP32)**.
- `este módulo está desativado pela administração`: ative na Administração.
- `Aviso do servidor: ...`: algum campo está fora da faixa ou com nome errado. O aviso diz qual.

**O comando não chega:**
- O painel mostra "Sem resposta" depois de 30 s. Confira no Monitor Serial se aparece `Comando recebido: ...`.
- Só quem está logado como Controle ou Administração manda comandos.
- O comando só chega na próxima leitura (até 2 s). O ESP32 precisa estar mandando leituras.
- Apareceu `Comando NÃO executado`? O nome ou o valor do comando é diferente do contrato (`docs/API.md`).

## Conferência automática

`node ferramentas/conferir-esp32.js` compara, em texto, cada sketch com `compartilhado/contrato.js` (campos, valores, comandos), confere o `docs/API.md` contra o servidor e envia os exemplos do `API.md` para um servidor de teste. Rode depois de mudar um nome de campo. Isso **não** substitui compilar: o script não compila nada.
