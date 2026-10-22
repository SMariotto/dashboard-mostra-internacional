// Gera entrega/smart-canada-dashboard.zip para levar no pen drive e rodar no notebook do professor,
// SEM node_modules e SEM instalar nada: o servidor não tem dependências e a interface já está compilada.
//
// Uso: npm run build   (antes, para a interface estar em servidor/publico)
//      npm run pacote
//
// Leva: servidor/ (com publico/), compartilhado/, config/padrao.json, config/local.exemplo.json, esp32/,
// docs/ (só os textos, sem as capturas), INICIAR.bat, README.md, package.json, ferramentas/esp-falso.js
// e o Node portátil (o node.exe que está rodando este comando) em tools/node/node.exe.
// NÃO leva: config/local.json (códigos reais), dados/ (histórico), node_modules/.
//
// O zip é escrito aqui mesmo, só com node:zlib e node:fs (sem programa de fora).
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'entrega', 'smart-canada-dashboard.zip');

if (!existsSync(join(RAIZ, 'servidor', 'publico', 'index.html'))) {
  console.error('A interface não está compilada em servidor/publico. Rode "npm run build" antes.');
  process.exit(1);
}

/** @type {{caminho: string, origem: string}[]} caminho dentro do zip (com /) e arquivo de origem */
const itens = [];
const adicionar = (origem, caminho) => itens.push({ origem, caminho: caminho.split(sep).join('/') });

function adicionarPasta(pasta, filtro = () => true) {
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const origem = join(pasta, e.name);
    if (!filtro(origem, e)) continue;
    if (e.isDirectory()) adicionarPasta(origem, filtro);
    else adicionar(origem, relative(RAIZ, origem));
  }
}

adicionarPasta(join(RAIZ, 'servidor'));
adicionarPasta(join(RAIZ, 'compartilhado'));
adicionarPasta(join(RAIZ, 'esp32'));
adicionarPasta(join(RAIZ, 'docs'), (_o, e) => !(e.isDirectory() && e.name === 'shots')); // sem as capturas
for (const f of ['config/padrao.json', 'config/local.exemplo.json', 'INICIAR.bat', 'README.md', 'package.json', 'ferramentas/esp-falso.js']) adicionar(join(RAIZ, f), f);

// Node portátil: o mesmo node.exe que roda este comando.
const node = process.execPath;
if (basename(node).toLowerCase() !== 'node.exe') {
  console.error(`Esperava o node.exe do Windows, mas o Node que roda este comando é ${node}.`);
  process.exit(1);
}
adicionar(node, 'tools/node/node.exe');

// Trava de segurança: o que nunca pode ir no pacote.
const proibido = itens.filter((i) => /(^|\/)config\/local\.json$/.test(i.caminho) || /^dados\//.test(i.caminho) || /node_modules\//.test(i.caminho));
if (proibido.length) {
  console.error(`Arquivos que não podem ir no pacote: ${proibido.map((i) => i.caminho).join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Escrita do zip (formato ZIP simples, deflate, nomes em UTF-8)
// ---------------------------------------------------------------------------
function dataDos(data) {
  const hora = (data.getHours() << 11) | (data.getMinutes() << 5) | (data.getSeconds() >> 1);
  const dia = ((Math.max(1980, data.getFullYear()) - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate();
  return { hora, dia };
}

const partes = [];
const central = [];
let deslocamento = 0;
let totalBytes = 0;
for (const { origem, caminho } of itens) {
  const dados = readFileSync(origem);
  const comprimido = deflateRawSync(dados, { level: 6 });
  const usar = comprimido.length < dados.length;
  const corpo = usar ? comprimido : dados;
  const nome = Buffer.from(caminho, 'utf8');
  const { hora, dia } = dataDos(statSync(origem).mtime);
  const crc = crc32(dados);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // versão necessária
  local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
  local.writeUInt16LE(usar ? 8 : 0, 8);
  local.writeUInt16LE(hora, 10);
  local.writeUInt16LE(dia, 12);
  local.writeUInt32LE(crc >>> 0, 14);
  local.writeUInt32LE(corpo.length, 18);
  local.writeUInt32LE(dados.length, 22);
  local.writeUInt16LE(nome.length, 26);
  partes.push(local, nome, corpo);

  const entrada = Buffer.alloc(46);
  entrada.writeUInt32LE(0x02014b50, 0);
  entrada.writeUInt16LE(20, 4); // versão que criou
  entrada.writeUInt16LE(20, 6);
  entrada.writeUInt16LE(0x0800, 8);
  entrada.writeUInt16LE(usar ? 8 : 0, 10);
  entrada.writeUInt16LE(hora, 12);
  entrada.writeUInt16LE(dia, 14);
  entrada.writeUInt32LE(crc >>> 0, 16);
  entrada.writeUInt32LE(corpo.length, 20);
  entrada.writeUInt32LE(dados.length, 24);
  entrada.writeUInt16LE(nome.length, 28);
  entrada.writeUInt32LE(deslocamento, 42);
  central.push(entrada, nome);

  deslocamento += local.length + nome.length + corpo.length;
  totalBytes += dados.length;
}
const tamCentral = central.reduce((s, b) => s + b.length, 0);
const fim = Buffer.alloc(22);
fim.writeUInt32LE(0x06054b50, 0);
fim.writeUInt16LE(itens.length, 8);
fim.writeUInt16LE(itens.length, 10);
fim.writeUInt32LE(tamCentral, 12);
fim.writeUInt32LE(deslocamento, 16);

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, Buffer.concat([...partes, ...central, fim]));
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`Pacote criado: ${SAIDA}`);
console.log(`  ${itens.length} arquivos, ${mb(totalBytes)} descompactado, ${mb(statSync(SAIDA).size)} compactado.`);
console.log(`  Node portátil: ${node} (${process.version}) em tools/node/node.exe`);
console.log('  Não leva: config/local.json, dados/, node_modules/.');
