# API dos ESP32 (Smart Canada 2050)

**Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.**

**Os sketches da pasta `esp32` NÃO foram compilados, porque o arduino-cli não está instalado.** Compile cada um na Arduino IDE 2 antes do dia da Mostra.

Para quem programa um ESP32 (ou outra coisa) que fala com o painel. Os nomes de campo, as faixas e os comandos vêm de um arquivo só, `compartilhado/contrato.js`. Se o grupo mudar um nome, muda lá e nos sketches.

## Como funciona

1. O ESP32 conecta na Wi-Fi do projeto (rede de **2,4 GHz**; o ESP32 não conecta em rede de 5 GHz).
2. Ele acha o servidor pelo anúncio UDP (ou usa o IP de reserva).
3. A cada 2 s manda uma leitura por `POST /api/esp/leitura`.
4. A resposta traz os comandos pendentes daquele módulo. O ESP32 executa e confirma por `POST /api/esp/confirmacao`.

Tudo é JSON em UTF-8, sem BOM.

## Endereço do servidor

`http://<ip do notebook>:5050`. O IP aparece grande na tela de Administração e no terminal (janela preta) quando o servidor liga. Se a porta 5050 estiver ocupada, o servidor usa a próxima livre (até 5060) e mostra qual no terminal.

## Descoberta pelo anúncio UDP

A cada 2 s o servidor manda um broadcast UDP na porta **5051** com o texto:

```
SMARTCANADA 192.168.0.10 5050
```

O ESP32 escuta essa porta ao ligar. Se em 10 s não ouvir nada, usa o IP e a porta de reserva escritos no topo do sketch. Se o notebook trocar de IP, o próximo anúncio corrige sozinho.

## Chave dos módulos

Toda mensagem do ESP32 leva o campo `chave`. Ela tem que ser igual à `chaveModulos` do servidor (`config/padrao.json`, ou `config/local.json` se existir). Chave errada é recusada com 401. O valor de exemplo é `chave-de-exemplo-troque`: troque antes da Mostra, no servidor e nos sketches.

## Frequência e "sem sinal"

- Cada módulo manda uma leitura a cada **2 s**, e na hora quando algo muda.
- Sem leitura há mais de **6 s**, o painel mostra o módulo como "sem sinal". O último valor continua na tela, apagado.
- Se a administração desativar o módulo, o servidor responde 200 mas ignora a leitura, e o painel mostra "desativado".

## Rotas

### POST `/api/esp/leitura`

Corpo:

```json
{ "modulo": "economia", "chave": "chave-de-exemplo-troque", "dados": { "umidade_solo_pct": 58, "reservatorio_pct": 66, "bomba": false, "irrigacao": "automatico" } }
```

`modulo` é um destes: `energia`, `residencial`, `centro`, `mobilidade`, `economia`. Os campos de `dados` de cada módulo estão na seção "Campos de cada módulo".

Resposta 200:

```json
{ "ok": true, "comandos": [ { "id": "c-mvhdiny9-2", "modulo": "economia", "comando": "irrigacao", "valor": "agora" } ], "avisos": [] }
```

- `comandos`: os comandos pendentes deste módulo. Cada comando é entregue **uma vez só**.
- `avisos`: os campos que o servidor recusou. O servidor ignora só o campo errado, guarda o resto e responde 200. Exemplo de aviso: `energia.bateria_pct: fora da faixa 0 a 100, ignorado`.

Quando a leitura é ignorada, a resposta é:

```json
{ "ok": true, "ignorada": "demo", "comandos": [] }
```

`ignorada` vale `"demo"` (o painel está no modo demonstração: na Administração, escolha "Real (ESP32)") ou `"desativado"` (a administração desativou o módulo).

### POST `/api/esp/confirmacao`

Avisa que um comando foi executado. O painel passa o botão para "Executado".

```json
{ "modulo": "economia", "chave": "chave-de-exemplo-troque", "id": "c-mvhdiny9-2" }
```

Resposta 200: `{ "ok": true }`. Resposta 404 se o comando não existe, é de outro módulo ou já venceu (passou de 30 s).

### GET `/api/estado`

Não é para o ESP32. Serve para conferir o que o painel recebeu (abra no navegador ou use `curl.exe`). Devolve os dados de cada módulo, o `sinal` de cada um (`ok`, `sem_sinal` ou `desativado`), os alertas, o modo (`demo` ou `real`) e os comandos recentes.

## Campos de cada módulo

Campo fora da faixa, com tipo errado ou desconhecido: o servidor ignora só aquele campo e avisa em `avisos`. Os campos marcados como "não" em "obrigatório" podem faltar.

### Energia (`energia`)

| campo | tipo | unidade ou valores | faixa | obrigatório |
|---|---|---|---|---|
| `bateria_pct` | número | % | 0 a 100 | sim |
| `bateria_v` | número | V | 0 a 15 | sim |
| `solar_w` | número | W | 0 a 100 | sim |
| `eolica_w` | número | W | 0 a 100 | sim |
| `consumo_w` | número | W | 0 a 100 | sim |
| `situacao` | texto | `"mais"`, `"igual"`, `"menos"` | lista | não |
| `teste` | booleano | `true` se a leitura tem valor de teste | | não |

Se `situacao` faltar, o servidor calcula: geração (`solar_w` + `eolica_w`) contra `consumo_w`, "igual" se a diferença for menor que 0,5 W.

```json
{ "modulo": "energia", "chave": "chave-de-exemplo-troque", "dados": { "bateria_pct": 72.5, "bateria_v": 12.3, "solar_w": 5.2, "eolica_w": 2.1, "consumo_w": 4 } }
```

### Área Residencial (`residencial`)

| campo | tipo | unidade ou valores | faixa | obrigatório |
|---|---|---|---|---|
| `temperatura_c` | número | °C | -10 a 60 | sim |
| `umidade_pct` | número | % | 0 a 100 | sim |
| `aquecimento` | booleano | `true` (ligado) ou `false` | | sim |
| `presenca` | booleano | `true` (detectada) ou `false` | | sim |
| `persiana` | texto | `"aberta"`, `"fechada"` | lista | sim |
| `iluminacao` | texto | `"automatico"`, `"ligada"`, `"desligada"` | lista | não |
| `teste` | booleano | `true` se a leitura tem valor de teste | | não |

`iluminacao` é o eco do comando de iluminação. É um acréscimo da SPEC: o grupo precisa confirmar.

```json
{ "modulo": "residencial", "chave": "chave-de-exemplo-troque", "dados": { "temperatura_c": 22.4, "umidade_pct": 55, "aquecimento": false, "presenca": true, "persiana": "aberta", "iluminacao": "automatico" } }
```

### Centro Urbano (`centro`)

| campo | tipo | unidade ou valores | faixa | obrigatório |
|---|---|---|---|---|
| `postes` | texto | `"ligados"`, `"desligados"`, `"automatico"` | lista | sim |
| `semaforo` | texto | `"verde"`, `"amarelo"`, `"vermelho"` | lista | sim |
| `vagas_livres` | inteiro | vagas | 0 a 4 | sim |
| `teste` | booleano | `true` se a leitura tem valor de teste | | não |

```json
{ "modulo": "centro", "chave": "chave-de-exemplo-troque", "dados": { "postes": "desligados", "semaforo": "verde", "vagas_livres": 2 } }
```

### Mobilidade (`mobilidade`)

| campo | tipo | unidade ou valores | faixa | obrigatório |
|---|---|---|---|---|
| `terminal` | texto | `"operando"`, `"parado"` | lista | sim |
| `proximo_veiculo` | texto | ex.: `"Ônibus 2 em 3 min"` | até 40 caracteres | sim |
| `veiculo_na_plataforma` | booleano | `true` ou `false` | | sim |
| `trem` | texto | `"parado"`, `"em movimento"`, `"na estacao"` | lista | sim |
| `demonstracao` | booleano | `true` ou `false` | | não |
| `teste` | booleano | `true` se a leitura tem valor de teste | | não |

`demonstracao` é o eco do comando de demonstração. Escreva `na estacao` sem acento, exatamente assim.

```json
{ "modulo": "mobilidade", "chave": "chave-de-exemplo-troque", "dados": { "terminal": "operando", "proximo_veiculo": "Ônibus 2 em 3 min", "veiculo_na_plataforma": false, "trem": "parado", "demonstracao": false } }
```

### Economia Circular (`economia`)

| campo | tipo | unidade ou valores | faixa | obrigatório |
|---|---|---|---|---|
| `umidade_solo_pct` | número | % | 0 a 100 | sim |
| `reservatorio_pct` | número | % | 0 a 100 | sim |
| `bomba` | booleano | `true` (ligada) ou `false` | | sim |
| `irrigacao` | texto | `"automatico"`, `"manual"` | lista | não |
| `teste` | booleano | `true` se a leitura tem valor de teste | | não |

`irrigacao` é o eco do comando de irrigação: `"manual"` depois de "Irrigar agora".

```json
{ "modulo": "economia", "chave": "chave-de-exemplo-troque", "dados": { "umidade_solo_pct": 58, "reservatorio_pct": 66, "bomba": false, "irrigacao": "automatico" } }
```

### Valor de teste (`teste`)

Todo módulo pode mandar o campo opcional `teste` (booleano). O sketch manda `"teste": true` quando **pelo menos um** valor daquela leitura é de teste, isto é, o sensor está desligado no sketch (`SX_LIGADO = false`) e a constante `MODO_TESTE` está ligada. Os sketches têm `MODO_TESTE = false` por padrão. Nesse caso, sensor desligado **não manda o campo**, e o cartão mostra "--".

- O servidor valida o tipo (booleano), guarda e repassa em `GET /api/estado` (`modulos.<módulo>.dados.teste`).
- Cada leitura do ESP32 **substitui** a anterior: se o campo `teste` (ou qualquer outro) deixa de vir, ele some do painel. Não precisa reiniciar o servidor.
- O cartão da área e o da cidade mostram o selo âmbar "Valor de teste". A pílula do topo diz **"Teste"** quando todas as leituras recentes são de teste, e **"Ao vivo"** só quando pelo menos uma leitura recente não é de teste.
- O histórico (arquivo e CSV) guarda o campo, na coluna `teste`.

```json
{ "modulo": "economia", "chave": "chave-de-exemplo-troque", "dados": { "umidade_solo_pct": 58, "teste": true } }
```

### Alertas

O painel mostra "Reservatório baixo" quando `reservatorio_pct` é menor que 20, e "Bateria baixa" quando `bateria_pct` é menor que 20.

## Comandos

O painel manda estes comandos. Eles chegam na resposta da leitura, no formato:

```json
{ "id": "c-mvhdiny9-2", "modulo": "economia", "comando": "irrigacao", "valor": "agora" }
```

| módulo | comando | valores | quem pode usar no painel |
|---|---|---|---|
| `economia` | `irrigacao` | `automatico`, `agora` | controle, administração |
| `residencial` | `iluminacao` | `automatico`, `ligar`, `desligar` | controle, administração |
| `residencial` | `persiana` | `abrir`, `fechar` | controle, administração |
| `mobilidade` | `demonstracao` | `iniciar`, `parar` | controle, administração |
| `todos` | `ping` | `teste` | administração |

- Energia e Centro Urbano não têm comandos de usuário.
- **`ping`**: é o botão "Testar comandos" da Administração. O ESP32 só confirma e não aciona nada. Todo sketch aceita.
- Depois de executar, o ESP32 manda a confirmação. Sem confirmação em **30 s**, o painel mostra "Sem resposta".
- O estado novo (por exemplo `persiana` virando `"fechada"`) volta na leitura seguinte. É por esse eco que o botão ativo aparece certo no painel.

## Erros

Toda resposta de erro tem este formato:

```json
{ "ok": false, "erro": "Chave dos módulos errada." }
```

| código | texto de `erro` | quando |
|---|---|---|
| 400 | `Campo "modulo" deve ser um destes: energia, residencial, centro, mobilidade, economia.` | leitura sem `modulo` ou com módulo desconhecido |
| 400 | `Use {modulo, chave, id}.` | confirmação sem `modulo` válido ou sem `id` |
| 400 | `JSON inválido.` | corpo que não é JSON |
| 401 | `Chave dos módulos errada.` | `chave` ausente ou diferente da do servidor |
| 404 | `Comando não encontrado ou já vencido.` | confirmação de comando que não existe, é de outro módulo ou passou de 30 s |
| 404 | `Rota não encontrada.` | caminho que não existe |
| 413 | `Corpo grande demais (máximo 16 KB).` | corpo maior que 16 KB |

Servidor fora do ar, firewall bloqueando ou IP errado: o ESP32 nem recebe resposta (código HTTP negativo no `HTTPClient`).

## Testar com curl.exe (PowerShell)

Use `curl.exe` (com o `.exe`): `curl` sozinho, no PowerShell 5.1, é outro comando. Troque o IP pelo do notebook. O arquivo precisa ser salvo **sem BOM**: use `-Encoding ascii`, como abaixo (com `utf8`, o PowerShell 5.1 põe um BOM e o servidor responde `JSON inválido.`).

```powershell
$json = @'
{"modulo":"energia","chave":"chave-de-exemplo-troque","dados":{"bateria_pct":72.5,"bateria_v":12.3,"solar_w":5.2,"eolica_w":2.1,"consumo_w":4}}
'@
Set-Content -Path leitura.json -Value $json -Encoding ascii
curl.exe -s -X POST http://192.168.0.10:5050/api/esp/leitura -H "Content-Type: application/json" --data-binary "@leitura.json"
curl.exe -s http://192.168.0.10:5050/api/estado
```

O painel precisa estar no modo **Real (ESP32)** (Administração, Modo de dados). No modo demonstração a resposta traz `"ignorada": "demo"`.

## Limites

- Corpo de cada pedido: até 16 KB.
- Não há CORS: o painel e a API são do mesmo endereço.
- O servidor guarda o histórico em arquivo, uma linha por módulo a cada 10 s. Quem programa o ESP32 não precisa fazer nada.
