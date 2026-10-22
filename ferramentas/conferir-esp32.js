// Confere a pasta esp32/ e o docs/API.md contra compartilhado/contrato.js e o servidor.
//
//   node ferramentas/conferir-esp32.js            confere tudo e mostra o resultado
//   node ferramentas/conferir-esp32.js --copiar   antes, copia esp32/comum/SmartCanadaRede.h
//                                                 para a pasta de cada sketch (a Arduino IDE
//                                                 só enxerga arquivos dentro da pasta do sketch)
//
// Não compila nada (o arduino-cli não está instalado). Compara strings:
//   - nomes de campo, valores de texto, comandos e valores de comando de cada sketch;
//   - cópia do SmartCanadaRede.h igual ao original, rotas, chaves JSON e portas do cabeçalho;
//   - tabelas, rotas, mensagens de erro e números do docs/API.md contra o código do servidor;
//   - os exemplos JSON do docs/API.md, enviados de verdade a um servidor de teste.
// Sai com código 1 se algo não bater.
import { readFileSync, existsSync, copyFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSocket } from 'node:dgram';
import { MODULOS, CAMPOS, COMANDOS, IDS_MODULOS } from '../compartilhado/contrato.js';
import { SENSORES } from '../compartilhado/maquete.js';
import { carregarConfig } from '../servidor/config.js';
import { criarApp } from '../servidor/index.js';
import { iniciarDescoberta, redesComBroadcast } from '../servidor/descoberta.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const { config } = carregarConfig(join(RAIZ, 'config'));
const PADRAO = JSON.parse(ler('config', 'padrao.json'));

let total = 0;
const falhas = [];
function checar(ok, descricao) {
  total += 1;
  if (!ok) falhas.push(descricao);
}
const mesmoConjunto = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const unicos = (lista) => [...new Set(lista)];
const TRAVESSAO = String.fromCharCode(0x2014); // o travessão, montado pelo código para o arquivo não conter o caractere
const AVISO_NOMES = 'Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.';
const SEM_COMPILAR = 'NÃO foi compilado';

const copiar = process.argv.includes('--copiar');
const original = join(RAIZ, 'esp32', 'comum', 'SmartCanadaRede.h');
if (copiar) {
  for (const m of MODULOS) copyFileSync(original, join(RAIZ, 'esp32', m.pasta, 'SmartCanadaRede.h'));
  console.log('Cópias do SmartCanadaRede.h atualizadas nas 5 pastas.');
}

// ---------------------------------------------------------------------------
// 1. Cabeçalho comum
// ---------------------------------------------------------------------------
const cabecalho = readFileSync(original, 'utf8');
checar(cabecalho.includes(AVISO_NOMES), 'SmartCanadaRede.h: falta o aviso "Os nomes dos campos são proposta..."');
checar(cabecalho.includes('NÃO foi compilado'), 'SmartCanadaRede.h: falta o aviso de que não foi compilado');
checar(new RegExp(`PORTA_DESCOBERTA = ${config.descoberta.porta};`).test(cabecalho), `SmartCanadaRede.h: PORTA_DESCOBERTA diferente de ${config.descoberta.porta}`);
checar(cabecalho.includes('"SMARTCANADA %19s %u"'), 'SmartCanadaRede.h: formato do anúncio diferente de "SMARTCANADA <ip> <porta>"');
checar(/ESPERA_DESCOBERTA_MS = 10000;/.test(cabecalho), 'SmartCanadaRede.h: espera da descoberta diferente de 10 s');
checar(new RegExp(`INTERVALO_LEITURA_MS = ${config.intervaloLeituraMs};`).test(cabecalho), `SmartCanadaRede.h: intervalo de leitura diferente de ${config.intervaloLeituraMs} ms`);
checar(cabecalho.includes('"/api/esp/leitura"'), 'SmartCanadaRede.h: falta a rota /api/esp/leitura');
checar(cabecalho.includes('"/api/esp/confirmacao"'), 'SmartCanadaRede.h: falta a rota /api/esp/confirmacao');
checar(cabecalho.includes('strcmp(comando, "ping") == 0'), 'SmartCanadaRede.h: falta o tratamento do ping');
// Chaves JSON que o servidor espera (leitura: modulo, chave, dados; confirmação: modulo, chave, id).
for (const k of ['modulo', 'chave', 'dados', 'id']) checar(cabecalho.includes(`doc["${k}"]`), `SmartCanadaRede.h: falta doc["${k}"]`);
// Chaves da resposta que o servidor manda.
for (const k of ['comandos', 'avisos', 'ignorada']) checar(cabecalho.includes(`r["${k}"]`), `SmartCanadaRede.h: não lê r["${k}"] da resposta`);
for (const k of ['id', 'comando', 'valor']) checar(cabecalho.includes(`c["${k}"]`), `SmartCanadaRede.h: não lê c["${k}"] do comando`);
checar(cabecalho.includes('strcmp(ignorada, "demo")') && cabecalho.includes('strcmp(ignorada, "desativado")'), 'SmartCanadaRede.h: não trata ignorada demo e desativado');
checar(!cabecalho.includes(TRAVESSAO), 'SmartCanadaRede.h: tem travessão');
// Modo de teste (G1): a leitura leva "teste": true quando o sketch chamou marcarTeste()
checar(cabecalho.includes('dados["teste"] = true') && cabecalho.includes('void marcarTeste()') && cabecalho.includes('testeNaLeitura = false;'), 'SmartCanadaRede.h: falta o tratamento do campo "teste" (marcarTeste e dados["teste"] = true)');
checar(cabecalho.includes('void avisarSemSensor(') && cabecalho.includes('void avisarTeste('), 'SmartCanadaRede.h: faltam avisarTeste ou avisarSemSensor');

// ---------------------------------------------------------------------------
// 2. Cada sketch
// ---------------------------------------------------------------------------
const resumoSketches = [];
for (const m of MODULOS) {
  const nome = `esp32/${m.pasta}/${m.pasta}.ino`;
  const caminho = join(RAIZ, 'esp32', m.pasta, `${m.pasta}.ino`);
  if (!existsSync(caminho)) { checar(false, `${nome}: arquivo não existe`); continue; }
  const src = readFileSync(caminho, 'utf8');
  const copia = join(RAIZ, 'esp32', m.pasta, 'SmartCanadaRede.h');

  checar(existsSync(copia) && readFileSync(copia, 'utf8') === cabecalho, `${nome}: a cópia do SmartCanadaRede.h na pasta do sketch não é igual ao original (rode com --copiar)`);
  checar(src.includes('#include "SmartCanadaRede.h"'), `${nome}: não inclui SmartCanadaRede.h`);
  checar(src.includes(AVISO_NOMES), `${nome}: falta o aviso "Os nomes dos campos são proposta..."`);
  checar(src.includes('NÃO foi compilado'), `${nome}: falta o aviso de que não foi compilado`);
  checar(!src.includes(TRAVESSAO), `${nome}: tem travessão`);

  // Módulo
  const idNoSketch = /const char\* MODULO = "(\w+)";/.exec(src)?.[1];
  checar(idNoSketch === m.id, `${nome}: MODULO é "${idNoSketch}", o contrato diz "${m.id}"`);

  // Configuração: valores de exemplo, nunca senha real
  checar(/WIFI_REDE\s*=\s*"NOME-DA-REDE"/.test(src), `${nome}: WIFI_REDE não é o valor de exemplo "NOME-DA-REDE"`);
  checar(/WIFI_SENHA\s*=\s*"SENHA-DA-REDE"/.test(src), `${nome}: WIFI_SENHA não é o valor de exemplo "SENHA-DA-REDE"`);
  checar(new RegExp(`CHAVE_MODULOS\\s*=\\s*"${PADRAO.chaveModulos}"`).test(src), `${nome}: CHAVE_MODULOS diferente da chave de exemplo do padrao.json`);
  checar(/IP_RESERVA\s*=\s*"\d+\.\d+\.\d+\.\d+"/.test(src), `${nome}: falta IP_RESERVA`);
  checar(new RegExp(`PORTA_RESERVA\\s*=\\s*${PADRAO.porta};`).test(src), `${nome}: PORTA_RESERVA diferente de ${PADRAO.porta}`);
  const posConfig = src.indexOf('CONFIGURAÇÃO');
  const posInclude = src.indexOf('#include "SmartCanadaRede.h"');
  checar(posConfig >= 0 && posConfig < posInclude, `${nome}: a seção CONFIGURAÇÃO não está no topo, antes do include`);

  // Modo de teste (G1): uma constante MODO_TESTE (false) e as constantes de sensor ligado/desligado, todas no topo, antes do include
  const constantesBool = [...src.matchAll(/^const bool (\w+)\s*=\s*([^;]+);/gm)].map((x) => ({ nome: x[1], valor: x[2].trim(), pos: x.index }));
  const modoTeste = constantesBool.find((c) => c.nome === 'MODO_TESTE');
  checar(modoTeste && modoTeste.valor === 'false' && modoTeste.pos < posInclude, `${nome}: falta "const bool MODO_TESTE = false;" na seção CONFIGURAÇÃO (uma só, padrão false)`);
  checar(constantesBool.filter((c) => c.nome === 'MODO_TESTE').length === 1, `${nome}: MODO_TESTE precisa ser uma constante só`);
  const sensoresBool = constantesBool.filter((c) => c.nome !== 'MODO_TESTE');
  checar(sensoresBool.length > 0 && sensoresBool.every((c) => c.pos < posInclude), `${nome}: as constantes ligado/desligado dos sensores precisam estar no topo, antes do include: ${sensoresBool.filter((c) => c.pos >= posInclude).map((c) => c.nome).join(', ')}`);
  checar(/if \(!MODO_TESTE\)/.test(src) && src.includes('marcarTeste()') && src.includes('avisarSemSensor('), `${nome}: sensor desligado precisa seguir o MODO_TESTE (if (!MODO_TESTE) ... avisarSemSensor / marcarTeste)`);

  // Campos enviados contra o contrato
  const defs = CAMPOS[m.id];
  const enviados = unicos([...src.matchAll(/dados\["(\w+)"\]\s*=/g)].map((x) => x[1]));
  const desconhecidos = enviados.filter((c) => !defs[c]);
  const faltando = Object.keys(defs).filter((c) => !defs[c].opcional && !enviados.includes(c));
  checar(desconhecidos.length === 0, `${nome}: campos que não existem no contrato: ${desconhecidos.join(', ')}`);
  checar(faltando.length === 0, `${nome}: campos obrigatórios que o sketch não manda: ${faltando.join(', ')}`);

  // Valores de texto: cada literal atribuído a um campo precisa estar na lista do contrato
  for (const [, campo, direita] of src.matchAll(/dados\["(\w+)"\]\s*=\s*([^;]+);/g)) {
    const def = defs[campo];
    if (!def?.valores) continue;
    for (const [, literal] of direita.matchAll(/"([^"]*)"/g)) {
      checar(def.valores.includes(literal), `${nome}: ${campo} recebe "${literal}", que não está em ${JSON.stringify(def.valores)}`);
    }
  }
  // Funções que devolvem texto (textoTrem, textoSemaforo...): cada return "x" vale para algum campo de texto do módulo
  const todosValores = unicos(Object.values(defs).flatMap((d) => d.valores ?? []));
  for (const [, literal] of src.matchAll(/return\s+"([^"]*)";/g)) {
    checar(todosValores.includes(literal), `${nome}: return "${literal}" não é valor de nenhum campo de texto do contrato`);
  }
  // Tipos: booleano só recebe true/false/variável; texto de próximo veículo cabe em 40
  const buffer = /char textoProximo\[(\d+)\]/.exec(src);
  if (m.id === 'mobilidade') checar(buffer && Number(buffer[1]) === 41, `${nome}: o texto do próximo veículo precisa caber em 40 caracteres (buffer de 41)`);

  // Comandos: exatamente os do contrato, com os mesmos valores
  const esperados = COMANDOS.filter((c) => c.modulo === m.id);
  const comandosNoSketch = unicos([...src.matchAll(/strcmp\(comando,\s*"(\w+)"\)/g)].map((x) => x[1]));
  const valoresNoSketch = unicos([...src.matchAll(/strcmp\(valor,\s*"(\w+)"\)/g)].map((x) => x[1]));
  checar(mesmoConjunto(comandosNoSketch, esperados.map((c) => c.comando)),
    `${nome}: comandos ${JSON.stringify(comandosNoSketch)} diferentes do contrato ${JSON.stringify(esperados.map((c) => c.comando))}`);
  checar(mesmoConjunto(valoresNoSketch, unicos(esperados.flatMap((c) => c.valores))),
    `${nome}: valores de comando ${JSON.stringify(valoresNoSketch)} diferentes do contrato ${JSON.stringify(unicos(esperados.flatMap((c) => c.valores)))}`);
  checar(!/strcmp\(comando,\s*"ping"\)/.test(src), `${nome}: o ping já é tratado no SmartCanadaRede.h; não repita no sketch`);

  // Funções obrigatórias
  checar(/void montarLeitura\(JsonObject dados\)\s*\{/.test(src), `${nome}: falta void montarLeitura(JsonObject dados)`);
  checar(/bool executarComando\(const char\* comando, const char\* valor\)\s*\{/.test(src), `${nome}: falta bool executarComando(...)`);
  checar(src.includes('Serial.begin(115200)'), `${nome}: Serial precisa ser 115200`);
  checar(src.includes('redeIniciar(') && src.includes('redeAtualizar()'), `${nome}: falta redeIniciar ou redeAtualizar`);

  // Pinos marcados e sensores da camada 3 citados
  const linhasPino = src.split('\n').filter((l) => /^const int PINOS?_\w+/.test(l));
  const semMarca = linhasPino.filter((l) => !l.includes('TODO: confirmar pino'));
  checar(linhasPino.length > 0 && semMarca.length === 0, `${nome}: pino sem "// TODO: confirmar pino": ${semMarca.map((l) => l.split('=')[0].trim()).join(', ')}`);
  const idsSensores = SENSORES.filter((s) => s.modulo === m.id && s.tipo !== 'esp32').map((s) => s.id);
  const naoCitados = idsSensores.filter((id) => !new RegExp(`\\b${id}\\b`).test(src));
  checar(naoCitados.length === 0, `${nome}: sensores da camada 3 não citados: ${naoCitados.join(', ')}`);

  resumoSketches.push(`${m.pasta}: ${enviados.length} campos (${enviados.join(', ')}); comandos ${comandosNoSketch.join(', ') || 'nenhum'}; sensores citados ${idsSensores.join(', ')}`);
}

// ---------------------------------------------------------------------------
// 3. docs/API.md contra o contrato e o código do servidor
// ---------------------------------------------------------------------------
const api = ler('docs', 'API.md');
const codigoServidor = ler('servidor', 'index.js');
checar(api.includes(AVISO_NOMES), 'docs/API.md: falta o aviso "Os nomes dos campos são proposta..."');
checar(/arduino-cli não está instalado/.test(api) && api.includes('NÃO foram compilados'), 'docs/API.md: falta o aviso de que os sketches não foram compilados');
checar(!api.includes(TRAVESSAO), 'docs/API.md: tem travessão');

// Rotas: as do doc existem no servidor, e todas as /api/esp/ do servidor estão no doc
const rotasServidor = [...codigoServidor.matchAll(/'(GET|POST) (\/api\/[\w./]+)'/g)].map((x) => `${x[1]} ${x[2]}`);
const rotasDoc = [...api.matchAll(/^### (GET|POST) `(\/api\/[^`]+)`/gm)].map((x) => `${x[1]} ${x[2]}`);
for (const r of rotasDoc) checar(rotasServidor.includes(r), `docs/API.md: a rota ${r} não existe no servidor`);
for (const r of rotasServidor.filter((x) => x.includes('/api/esp/'))) checar(rotasDoc.includes(r), `docs/API.md: a rota ${r} do servidor não está documentada`);
for (const [, caminho] of api.matchAll(/(\/api\/[\w./]+)/g)) {
  checar(rotasServidor.some((r) => r.endsWith(` ${caminho}`)), `docs/API.md: o caminho ${caminho} citado no texto não existe no servidor`);
}

// Tabelas de campos: um bloco por módulo, "### Nome (`id`)"
const blocos = api.split(/^(?=### )/m);
const tabelaPorModulo = {};
for (const b of blocos) {
  const id = /^### .*\(`(\w+)`\)/.exec(b)?.[1];
  if (id && IDS_MODULOS.includes(id)) tabelaPorModulo[id] = b;
}
for (const id of IDS_MODULOS) {
  const bloco = tabelaPorModulo[id];
  if (!bloco) { checar(false, `docs/API.md: falta a seção do módulo ${id}`); continue; }
  const linhas = [...bloco.matchAll(/^\| `(\w+)` \| ([^|]+)\| ([^|]*)\| ([^|]*)\| (sim|não) \|$/gm)];
  const camposDoc = linhas.map((l) => l[1]);
  checar(mesmoConjunto(camposDoc, Object.keys(CAMPOS[id])), `docs/API.md (${id}): campos ${JSON.stringify(camposDoc)} diferentes do contrato ${JSON.stringify(Object.keys(CAMPOS[id]))}`);
  for (const [, campo, tipo, valores, faixa, obrigatorio] of linhas) {
    const def = CAMPOS[id][campo];
    if (!def) continue;
    const tipoDoc = { número: 'numero', inteiro: 'inteiro', booleano: 'booleano', texto: 'texto' }[tipo.trim()];
    checar(tipoDoc === def.tipo, `docs/API.md (${id}.${campo}): tipo "${tipo.trim()}" diferente do contrato "${def.tipo}"`);
    checar((obrigatorio === 'não') === Boolean(def.opcional), `docs/API.md (${id}.${campo}): obrigatório "${obrigatorio}" diferente do contrato`);
    if (def.min !== undefined) checar(faixa.includes(`${def.min} a ${def.max}`), `docs/API.md (${id}.${campo}): faixa "${faixa.trim()}" diferente de ${def.min} a ${def.max}`);
    if (def.unidade && def.tipo !== 'inteiro') checar(valores.includes(def.unidade), `docs/API.md (${id}.${campo}): unidade "${def.unidade}" não aparece`);
    for (const v of def.valores ?? []) checar(valores.includes(`"${v}"`), `docs/API.md (${id}.${campo}): valor "${v}" não aparece`);
    if (def.maxCaracteres) checar(faixa.includes(`${def.maxCaracteres} caracteres`), `docs/API.md (${id}.${campo}): limite de ${def.maxCaracteres} caracteres não aparece`);
  }
}

// Tabela de comandos
const secaoComandos = api.slice(api.indexOf('## Comandos'), api.indexOf('## Erros'));
const linhasComandos = [...secaoComandos.matchAll(/^\| `(\w+)` \| `(\w+)` \| ([^|]+)\|/gm)]
  .map((l) => ({ modulo: l[1], comando: l[2], valores: [...l[3].matchAll(/`([^`]+)`/g)].map((x) => x[1]) }));
for (const c of COMANDOS) {
  const l = linhasComandos.find((x) => x.modulo === c.modulo && x.comando === c.comando);
  checar(l && mesmoConjunto(l.valores, c.valores), `docs/API.md: comando ${c.modulo}.${c.comando} diferente do contrato (${c.valores.join(', ')})`);
}
const linhaPing = linhasComandos.find((x) => x.modulo === 'todos' && x.comando === 'ping');
checar(linhaPing && mesmoConjunto(linhaPing.valores, ['teste']), 'docs/API.md: falta a linha do ping (valor teste)');
checar(linhasComandos.length === COMANDOS.length + 1, `docs/API.md: ${linhasComandos.length} linhas de comando, esperado ${COMANDOS.length + 1}`);

// Campo "teste" (G1): opcional, booleano, em todos os módulos, e explicado no doc
for (const id of IDS_MODULOS) checar(CAMPOS[id].teste?.tipo === 'booleano' && CAMPOS[id].teste.opcional === true, `contrato: ${id} precisa do campo opcional booleano "teste"`);
checar(api.includes('MODO_TESTE') && api.includes('Valor de teste') && api.includes('"Teste"'), 'docs/API.md: falta a explicação do campo "teste" (MODO_TESTE, selo "Valor de teste" e pílula "Teste")');

// Números citados
checar(api.includes(`${PADRAO.semSinalMs / 1000} s`) && /mais de \*\*6 s\*\*/.test(api), 'docs/API.md: "sem sinal" depois de 6 s não bate com semSinalMs');
checar(PADRAO.semSinalMs === 6000, 'config/padrao.json: semSinalMs não é 6000 (o doc diz 6 s)');
checar(PADRAO.comandoExpiraMs === 30000 && api.includes('**30 s**'), 'docs/API.md: expiração de 30 s não bate com comandoExpiraMs');
checar(PADRAO.intervaloLeituraMs === 2000 && api.includes('**2 s**'), 'docs/API.md: leitura a cada 2 s não bate com intervaloLeituraMs');
checar(codigoServidor.includes('LIMITE_CORPO = 16 * 1024') && api.includes('16 KB'), 'docs/API.md: limite de 16 KB não bate com o servidor');
checar(api.includes(`**${PADRAO.descoberta.porta}**`) && api.includes('SMARTCANADA'), 'docs/API.md: porta do anúncio não bate com a config');
checar(api.includes(`:${PADRAO.porta}`) && api.includes('5060'), 'docs/API.md: porta 5050 e tentativas até 5060 não batem');
checar(api.includes(PADRAO.chaveModulos), 'docs/API.md: chave de exemplo diferente da do padrao.json');
checar(api.includes('Alerta') || api.includes('Alertas'), 'docs/API.md: falta a seção de alertas');

// ---------------------------------------------------------------------------
// 4. Exemplos do docs/API.md contra um servidor de verdade
// ---------------------------------------------------------------------------
const exemplos = [...api.matchAll(/```json\n([\s\S]*?)```/g)].map((x) => {
  try { return JSON.parse(x[1]); } catch (e) { checar(false, `docs/API.md: bloco JSON inválido (${e.message}): ${x[1].slice(0, 60)}`); return null; }
}).filter(Boolean);
const leituras = exemplos.filter((e) => e.chave && e.dados);
const confirmacoes = exemplos.filter((e) => e.chave && e.id && !e.dados);
const respostas = exemplos.filter((e) => e.ok === true && 'comandos' in e);
const comandosEx = exemplos.filter((e) => e.id && e.comando && !e.chave);
const erroEx = exemplos.filter((e) => e.ok === false);
checar(mesmoConjunto(unicos(leituras.map((e) => e.modulo)), IDS_MODULOS), `docs/API.md: precisa de pelo menos 1 exemplo de leitura por módulo (achei ${unicos(leituras.map((e) => e.modulo)).join(', ')})`);
checar(confirmacoes.length >= 1 && respostas.length >= 2 && comandosEx.length >= 1 && erroEx.length >= 1, 'docs/API.md: faltam exemplos de confirmação, resposta, comando ou erro');

const pastaTeste = mkdtempSync(join(tmpdir(), 'smart-canada-conferir-'));
async function comServidor(modo, fn) {
  const app = criarApp({ ...PADRAO, modo, codigos: {}, chaveModulos: PADRAO.chaveModulos }, { pastaDados: join(pastaTeste, modo), semTimers: true, arquivoLocal: join(pastaTeste, 'local.json') });
  await new Promise((ok) => app.servidor.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${app.servidor.address().port}`;
  const post = async (caminho, corpo) => {
    const r = await fetch(base + caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  try { await fn({ app, base, post }); } finally { await app.encerrar(); }
}

await comServidor('real', async ({ app, base, post }) => {
  // Cada exemplo de leitura: 200, sem avisos, e o painel guarda os valores
  for (const ex of leituras) {
    const r = await post('/api/esp/leitura', ex);
    checar(r.status === 200 && r.json?.ok === true && Array.isArray(r.json.avisos) && r.json.avisos.length === 0, `exemplo de leitura ${ex.modulo}: o servidor respondeu ${r.status} ${JSON.stringify(r.json)}`);
    const guardado = app.estado.obter().modulos[ex.modulo];
    checar(guardado.sinal === 'ok' && Object.entries(ex.dados).every(([k, v]) => guardado.dados[k] === v), `exemplo de leitura ${ex.modulo}: o painel não guardou todos os valores`);
  }
  // Formato da resposta com comando: mesmas chaves do exemplo do doc
  const respDoc = respostas.find((e) => e.comandos.length > 0);
  const cmdDoc = comandosEx[0];
  const alvo = COMANDOS[0];
  const enviado = app.fila.adicionar({ modulo: alvo.modulo, comando: alvo.comando, valor: alvo.valores[0] });
  const exLeitura = leituras.find((e) => e.modulo === alvo.modulo);
  const r = await post('/api/esp/leitura', exLeitura);
  checar(r.json?.comandos?.length === 1 && mesmoConjunto(Object.keys(r.json.comandos[0]), Object.keys(cmdDoc)), 'formato do comando na resposta diferente do exemplo do doc');
  checar(respDoc && mesmoConjunto(Object.keys(r.json), Object.keys(respDoc)), 'formato da resposta de leitura diferente do exemplo do doc');
  checar(r.json.comandos[0].id === enviado.id, 'o comando entregue não é o que foi enfileirado');
  checar((await post('/api/esp/leitura', exLeitura)).json.comandos.length === 0, 'o comando foi entregue duas vezes (docs dizem uma vez só)');
  // Confirmação
  const confDoc = confirmacoes[0];
  const conf = await post('/api/esp/confirmacao', { modulo: alvo.modulo, chave: PADRAO.chaveModulos, id: enviado.id });
  checar(conf.status === 200 && conf.json?.ok === true && mesmoConjunto(Object.keys(confDoc), ['modulo', 'chave', 'id']), 'confirmação: resposta ou formato diferente do doc');
  // Ping aceito por todos os módulos
  for (const id of IDS_MODULOS) {
    const p = app.fila.adicionar({ modulo: id, comando: 'ping', valor: 'teste' });
    const rr = await post('/api/esp/leitura', leituras.find((e) => e.modulo === id));
    checar(rr.json?.comandos?.some((c) => c.id === p.id && c.comando === 'ping' && c.valor === 'teste'), `ping não chegou ao módulo ${id}`);
    checar((await post('/api/esp/confirmacao', { modulo: id, chave: PADRAO.chaveModulos, id: p.id })).status === 200, `confirmação do ping de ${id} recusada`);
  }
  // Aviso de campo recusado: formato igual ao exemplo do doc
  const ruim = await post('/api/esp/leitura', { modulo: 'energia', chave: PADRAO.chaveModulos, dados: { ...leituras.find((e) => e.modulo === 'energia').dados, bateria_pct: 150 } });
  checar(ruim.json?.avisos?.[0] === 'energia.bateria_pct: fora da faixa 0 a 100, ignorado' && api.includes('`energia.bateria_pct: fora da faixa 0 a 100, ignorado`'), 'aviso de campo recusado diferente do texto do doc');
  // Mensagens de erro: o texto de cada resposta precisa estar escrito no doc
  const cenarios = [
    ['leitura sem módulo', await post('/api/esp/leitura', { chave: PADRAO.chaveModulos, dados: {} }), 400],
    ['leitura com módulo desconhecido', await post('/api/esp/leitura', { modulo: 'lua', chave: PADRAO.chaveModulos, dados: {} }), 400],
    ['confirmação sem id', await post('/api/esp/confirmacao', { modulo: 'energia', chave: PADRAO.chaveModulos }), 400],
    ['JSON inválido', await post('/api/esp/leitura', '{isto não é json'), 400],
    ['chave errada na leitura', await post('/api/esp/leitura', { modulo: 'energia', chave: 'errada', dados: {} }), 401],
    ['chave errada na confirmação', await post('/api/esp/confirmacao', { modulo: 'energia', chave: 'errada', id: 'x' }), 401],
    ['confirmação de comando que não existe', await post('/api/esp/confirmacao', { modulo: 'energia', chave: PADRAO.chaveModulos, id: 'c-nao-existe' }), 404],
    ['corpo de 20 KB', await post('/api/esp/leitura', JSON.stringify({ modulo: 'energia', x: 'a'.repeat(20_000) })), 413],
  ];
  for (const [nome, resp, status] of cenarios) {
    const texto = resp.json?.erro;
    checar(resp.status === status && resp.json?.ok === false, `erro "${nome}": esperado ${status}, veio ${resp.status}`);
    checar(typeof texto === 'string' && api.includes(`\`${texto}\``) && api.includes(`| ${status} |`), `erro "${nome}": o texto "${texto}" não está na tabela de erros do doc`);
  }
  const rota404 = await fetch(`${base}/api/nada`);
  const rota404json = await rota404.json();
  checar(rota404.status === 404 && api.includes(`\`${rota404json.erro}\``), 'erro "rota não encontrada" diferente do doc');
  // Exemplo de erro do doc
  checar(erroEx.some((e) => e.erro === 'Chave dos módulos errada.'), 'exemplo de erro do doc diferente do texto real');
  // GET /api/estado traz o que o doc diz
  const estado = await (await fetch(`${base}/api/estado`)).json();
  checar(['modo', 'alertas', 'comandos', 'modulos'].every((k) => k in estado) && Object.values(estado.modulos).every((m) => 'sinal' in m && 'dados' in m), 'GET /api/estado: faltam chaves que o doc cita');
});

await comServidor('demo', async ({ post }) => {
  const r = await post('/api/esp/leitura', leituras[0]);
  const docDemo = respostas.find((e) => e.ignorada === 'demo');
  checar(r.json?.ignorada === 'demo' && docDemo && mesmoConjunto(Object.keys(r.json), Object.keys(docDemo)), 'resposta "ignorada: demo" diferente do exemplo do doc');
});

await comServidor('real', async ({ app, post }) => {
  app.estado.definirAtivo('energia', false);
  const r = await post('/api/esp/leitura', leituras.find((e) => e.modulo === 'energia'));
  checar(r.status === 200 && r.json?.ignorada === 'desativado' && api.includes('"desativado"'), 'resposta "ignorada: desativado" diferente do doc');
});

// ---------------------------------------------------------------------------
// 5. Anúncio UDP (só se o computador estiver numa rede)
// ---------------------------------------------------------------------------
let descoberta = 'não testado (este computador não está em nenhuma rede)';
if (redesComBroadcast().length) {
  const ouvinte = createSocket({ type: 'udp4', reuseAddr: true });
  const recebida = new Promise((ok) => {
    const timer = setTimeout(() => ok(null), 4000);
    ouvinte.on('message', (msg) => { clearTimeout(timer); ok(msg.toString()); });
  });
  await new Promise((ok) => ouvinte.bind(PADRAO.descoberta.porta, ok));
  const anuncio = iniciarDescoberta({ portaHttp: PADRAO.porta, portaUdp: PADRAO.descoberta.porta, intervaloMs: 300 });
  const texto = await recebida;
  anuncio.parar();
  ouvinte.close();
  const partes = texto?.trim().split(/\s+/) ?? [];
  const certo = partes.length === 3 && partes[0] === 'SMARTCANADA' && /^\d+\.\d+\.\d+\.\d+$/.test(partes[1]) && Number(partes[2]) === PADRAO.porta;
  checar(certo, `anúncio UDP: recebi ${JSON.stringify(texto)}, esperado "SMARTCANADA <ip> ${PADRAO.porta}"`);
  descoberta = certo ? `ok (recebi "${texto}")` : 'FALHOU';
}

// ---------------------------------------------------------------------------
// 6. Outros arquivos de texto da pasta esp32 e docs
// ---------------------------------------------------------------------------
for (const arq of ['esp32/README.md', 'docs/DIA-DA-MOSTRA.md']) {
  const caminho = join(RAIZ, arq);
  if (!existsSync(caminho)) { checar(false, `${arq}: não existe`); continue; }
  const texto = readFileSync(caminho, 'utf8');
  checar(!texto.includes(TRAVESSAO), `${arq}: tem travessão`);
  if (arq === 'esp32/README.md') {
    checar(texto.includes('MODO_TESTE') && texto.includes('"teste": true'), arq + ': falta explicar o MODO_TESTE e o campo "teste"');
    checar(texto.includes(AVISO_NOMES), `${arq}: falta o aviso "Os nomes dos campos são proposta..."`);
    checar(/arduino-cli não está instalado/.test(texto) && texto.includes('NÃO foram compilados'), `${arq}: falta o aviso de que os sketches não foram compilados`);
    for (const m of MODULOS) checar(texto.includes(`${m.pasta}/${m.pasta}.ino`) || texto.includes(`\`${m.pasta}\``), `${arq}: não cita o sketch ${m.pasta}`);
  }
}
rmSync(pastaTeste, { recursive: true, force: true });

// ---------------------------------------------------------------------------
console.log('Sketches:');
for (const linha of resumoSketches) console.log(`  ${linha}`);
console.log(`Anúncio UDP: ${descoberta}`);
console.log(`Exemplos do API.md enviados ao servidor: ${leituras.length} leituras, ${confirmacoes.length} confirmação, ${respostas.length} respostas, ${comandosEx.length} comando, ${erroEx.length} erro`);
console.log(`Rotas do API.md: ${rotasDoc.join(', ')}`);
console.log(`\n${total} conferências, ${falhas.length} falhas.`);
for (const f of falhas) console.log(`  FALHOU: ${f}`);
process.exit(falhas.length ? 1 : 0);
