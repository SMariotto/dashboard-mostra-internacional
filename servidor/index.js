// Servidor do dashboard Smart Canada 2050.
// Node puro, sem dependências de npm: serve servidor/publico/ e a API.
// Rodar: node servidor/index.js [--porta 5050] [--modo demo|real] [--abrir]
import { createServer } from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, normalize, relative, isAbsolute, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { IDS_MODULOS, CAMPOS, validarComando } from '../compartilhado/contrato.js';
import { carregarConfig, RAIZ, ARQUIVO_LOCAL } from './config.js';
import { criarEstado } from './estado.js';
import { criarSimulador } from './simulador.js';
import { criarSessoes } from './sessoes.js';
import { criarFilaComandos } from './comandos.js';
import { criarHistoricoArquivo, dataLocal } from './historico.js';
import { iniciarDescoberta } from './descoberta.js';

export const PASTA_PUBLICO = join(RAIZ, 'servidor', 'publico');
export const PASTA_DADOS = join(RAIZ, 'dados');
const LIMITE_CORPO = 16 * 1024;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/** IPv4 da rede (sem os internos e sem os 169.254.x de rede sem DHCP). */
export function enderecosDeRede() {
  const ips = [];
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista ?? []) {
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) ips.push(i.address);
    }
  }
  return ips;
}

class ErroHttp extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}

function json(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(corpo));
}

/** Lê o corpo como JSON. Mais de 16 KB: 413. JSON inválido: 400. */
function lerJson(req) {
  return new Promise((ok, falha) => {
    const partes = [];
    let total = 0;
    let estourou = false;
    req.on('data', (c) => {
      if (estourou) return;
      total += c.length;
      if (total > LIMITE_CORPO) { estourou = true; partes.length = 0; falha(new ErroHttp(413, 'Corpo grande demais (máximo 16 KB).')); return; }
      partes.push(c);
    });
    req.on('end', () => {
      if (estourou) return;
      try { ok(JSON.parse(Buffer.concat(partes).toString('utf8'))); } catch { falha(new ErroHttp(400, 'JSON inválido.')); }
    });
    req.on('error', () => falha(new ErroHttp(400, 'Pedido interrompido.')));
  });
}

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ipDe = (req) => (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
const hash = (t) => createHash('sha256').update(String(t), 'utf8').digest();

/**
 * Resolve um caminho da URL para um arquivo dentro de publico/. Devolve null se sair da pasta.
 * @param {string} pastaPublico
 * @param {string} caminhoUrl ex.: "/assets/x.js"
 */
export function resolverArquivo(pastaPublico, caminhoUrl) {
  let decodificado;
  try { decodificado = decodeURIComponent(caminhoUrl); } catch { return null; }
  if (decodificado.includes('\0')) return null;
  const alvo = normalize(join(pastaPublico, decodificado));
  const rel = relative(pastaPublico, alvo);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return alvo;
}

async function servirEstatico(req, res, pastaPublico) {
  const url = new URL(req.url, 'http://x');
  const caminho = url.pathname === '/' ? '/index.html' : url.pathname;
  let arquivo = resolverArquivo(pastaPublico, caminho);
  if (!arquivo) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Proibido'); return; }
  try {
    const info = await stat(arquivo);
    if (info.isDirectory()) arquivo = join(arquivo, 'index.html');
  } catch {
    // Não existe: rota de página (sem extensão) cai no index.html; arquivo com extensão dá 404.
    if (extname(caminho)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Arquivo não encontrado'); return; }
    arquivo = join(pastaPublico, 'index.html');
  }
  try {
    const conteudo = await readFile(arquivo);
    const ext = extname(arquivo).toLowerCase();
    const cache = caminho.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': cache });
    res.end(req.method === 'HEAD' ? undefined : conteudo);
  } catch {
    if (arquivo.endsWith('index.html')) {
      res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>Smart Canada 2050</title><p style="font:20px sans-serif">A interface ainda não foi gerada. Rode <b>npm run build</b> na pasta do projeto.</p>');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Arquivo não encontrado');
    }
  }
}

/**
 * Monta o servidor (sem escutar ainda). Os testes usam isto direto.
 * Ao montar: relê os últimos 10 minutos do histórico em arquivo.
 * @param {object} config  config/padrao.json mesclado com local.json
 * @param {object} [op]
 * @param {() => number} [op.agora]
 * @param {string} [op.pastaPublico]
 * @param {string} [op.pastaDados]
 * @param {string} [op.arquivoLocal]  onde a administração grava a rede do QR
 * @param {boolean} [op.semTimers]     não liga simulador nem relógios (testes)
 * @param {number} [op.atrasoSimuladorMs] tempo até o simulador "executar" um comando
 */
export function criarApp(config, op = {}) {
  const agora = op.agora ?? Date.now;
  const pastaPublico = op.pastaPublico ?? PASTA_PUBLICO;
  const arquivoLocal = op.arquivoLocal ?? ARQUIVO_LOCAL;
  const estado = criarEstado({
    semSinalMs: config.semSinalMs,
    historicoMs: config.historicoMinutos * 60_000,
    modo: config.modo === 'real' ? 'real' : 'demo',
    apresentacao: config.apresentacao !== false,
    agora,
  });
  const simulador = criarSimulador({ estado, intervaloMs: config.intervaloLeituraMs, agora });
  const sessoes = criarSessoes({
    codigos: config.codigos,
    validadeMs: (config.sessao?.validadeHoras ?? 8) * 3600_000,
    maxTentativas: config.sessao?.tentativasLogin ?? 5,
    janelaMs: (config.sessao?.janelaTentativasMin ?? 5) * 60_000,
    agora,
  });
  const fila = criarFilaComandos({ expiraMs: config.comandoExpiraMs, agora });
  const historicoArquivo = criarHistoricoArquivo({ pasta: op.pastaDados ?? PASTA_DADOS, agora });
  const rede = { nome: config.rede?.nome ?? '', senha: config.rede?.senha ?? '' };
  const chaveModulos = hash(config.chaveModulos);
  const atrasoSimulador = op.atrasoSimuladorMs ?? 400;
  const timers = [];
  let porta = config.porta;

  /** ESP32 vistos: módulo -> {ip, ultima, mensagens (horários do último minuto)} */
  const espVistos = {};
  let ultimaMsgEsp = null;
  let inicioModoReal = estado.modo === 'real' ? agora() : null;

  // Ao ligar: relê os últimos 10 minutos do arquivo do dia (nenhum arquivo é apagado).
  const relidas = estado.carregarHistorico(historicoArquivo.relerUltimos(config.historicoMinutos * 60_000));

  function sugerirDemo() {
    if (estado.modo !== 'real') return false;
    return agora() - Math.max(inicioModoReal ?? 0, ultimaMsgEsp ?? 0) > config.alertaRealSemEspMs;
  }

  function estadoCompleto() {
    return {
      ...estado.obter(),
      comandos: fila.recentes(),
      loginAtivo: sessoes.ativo,
      sugerirDemo: sugerirDemo(),
    };
  }

  // --- Server-Sent Events ---
  const clientesSse = new Set();
  let envioPendente = false;
  function enviarEstado() {
    envioPendente = false;
    const msg = `data: ${JSON.stringify(estadoCompleto())}\n\n`;
    for (const res of clientesSse) res.write(msg);
  }
  function agendarEnvio() {
    if (envioPendente || clientesSse.size === 0) return;
    envioPendente = true;
    setTimeout(enviarEstado, 50); // junta as 5 leituras do mesmo ciclo numa mensagem só
  }
  estado.aoMudar(agendarEnvio);
  fila.aoMudar(agendarEnvio);

  function eventos(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 2000\n\n');
    res.write(`data: ${JSON.stringify(estadoCompleto())}\n\n`);
    clientesSse.add(res);
    req.on('close', () => clientesSse.delete(res));
  }

  // --- Avisos de leitura no terminal (o mesmo aviso no máximo 1 vez por minuto) ---
  const ultimosAvisos = new Map();
  function avisarLog(msg) {
    const t = agora();
    if ((ultimosAvisos.get(msg) ?? -Infinity) > t - 60_000) return;
    ultimosAvisos.set(msg, t);
    console.warn(`[leitura] ${msg}`);
  }

  function exigirAdmin(req, res) {
    if (sessoes.papelDo(req) === 'administracao') return true;
    json(res, 403, { ok: false, erro: 'Só a administração pode fazer isto.' });
    return false;
  }

  function chaveCerta(chave) {
    return typeof chave === 'string' && timingSafeEqual(hash(chave), chaveModulos);
  }

  /** No modo demo, o simulador "busca" e executa o comando, como um ESP32 faria. */
  function executarNoSimulador(cmd) {
    setTimeout(() => {
      if (estado.modo !== 'demo' || simulador.silenciados.includes(cmd.modulo)) return; // vira "sem resposta"
      try {
        fila.retirar(cmd.modulo);
        const eco = simulador.aplicarComando(cmd);
        if (eco === null) return;
        if (Object.keys(eco).length) estado.registrarLeitura(cmd.modulo, eco);
        fila.confirmar(cmd.modulo, cmd.id);
      } catch (e) { console.error('[simulador] erro ao executar comando:', e); }
    }, atrasoSimulador);
  }

  function trocarModo(modo) {
    if (modo === estado.modo) return;
    estado.definirModo(modo);
    if (modo === 'demo') { simulador.iniciar(); inicioModoReal = null; }
    else { simulador.parar(); inicioModoReal = agora(); }
  }

  function urlsDoPainel() {
    const ips = enderecosDeRede();
    return { ips, urls: ips.map((ip) => `http://${ip}:${porta}/?modo=celular`) };
  }

  const rotas = {
    'GET /api/estado': (req, res) => json(res, 200, estadoCompleto()),
    'GET /api/eventos': eventos,

    'POST /api/login': async (req, res) => {
      const corpo = await lerJson(req);
      const r = sessoes.entrar(objeto(corpo) ? corpo.codigo : undefined, ipDe(req));
      if (!r.ok) return json(res, r.status, { ok: false, erro: r.erro });
      return json(res, 200, { ok: true, papel: r.papel, token: r.token });
    },

    'POST /api/logout': (req, res) => {
      const cab = req.headers.authorization ?? '';
      sessoes.sair(cab.startsWith('Bearer ') ? cab.slice(7).trim() : '');
      json(res, 200, { ok: true });
    },

    // Acréscimo: a tela confere se o token guardado ainda vale (ex.: depois de reiniciar o servidor).
    'GET /api/sessao': (req, res) => json(res, 200, { ok: true, papel: sessoes.papelDo(req), loginAtivo: sessoes.ativo }),

    'POST /api/comando': async (req, res) => {
      const corpo = await lerJson(req);
      if (!objeto(corpo)) return json(res, 400, { ok: false, erro: 'Pedido inválido.' });
      const pedido = { modulo: corpo.modulo, comando: corpo.comando, valor: corpo.valor };
      const v = validarComando(pedido, sessoes.papelDo(req));
      if (!v.ok) return json(res, v.status, { ok: false, erro: v.erro });
      if (estado.obter().modulos[pedido.modulo].sinal === 'desativado') {
        return json(res, 409, { ok: false, erro: 'Módulo desativado pela administração.' });
      }
      const cmd = fila.adicionar(pedido);
      if (estado.modo === 'demo') executarNoSimulador(cmd);
      return json(res, 200, { ok: true, id: cmd.id });
    },

    'POST /api/admin/modulo': async (req, res) => {
      if (!exigirAdmin(req, res)) return;
      const corpo = await lerJson(req);
      if (!objeto(corpo) || !IDS_MODULOS.includes(corpo.modulo) || typeof corpo.ativo !== 'boolean') {
        return json(res, 400, { ok: false, erro: 'Use {modulo, ativo: true ou false}.' });
      }
      estado.definirAtivo(corpo.modulo, corpo.ativo);
      return json(res, 200, { ok: true });
    },

    'POST /api/admin/modo': async (req, res) => {
      if (!exigirAdmin(req, res)) return;
      const corpo = await lerJson(req);
      if (!objeto(corpo) || (corpo.modo !== 'demo' && corpo.modo !== 'real')) {
        return json(res, 400, { ok: false, erro: 'Use {modo: "demo" ou "real"}.' });
      }
      trocarModo(corpo.modo);
      return json(res, 200, { ok: true, modo: estado.modo });
    },

    // Acréscimo: liga e desliga o modo apresentação (passeio automático).
    'POST /api/admin/apresentacao': async (req, res) => {
      if (!exigirAdmin(req, res)) return;
      const corpo = await lerJson(req);
      if (!objeto(corpo) || typeof corpo.ligado !== 'boolean') return json(res, 400, { ok: false, erro: 'Use {ligado: true ou false}.' });
      estado.definirApresentacao(corpo.ligado);
      return json(res, 200, { ok: true });
    },

    // Acréscimo: rede e senha do QR de Wi-Fi, guardadas só em config/local.json.
    'POST /api/admin/rede': async (req, res) => {
      if (!exigirAdmin(req, res)) return;
      const corpo = await lerJson(req);
      const ok = objeto(corpo) && typeof corpo.nome === 'string' && typeof corpo.senha === 'string'
        && corpo.nome.length <= 32 && corpo.senha.length <= 63;
      if (!ok) return json(res, 400, { ok: false, erro: 'Use {nome, senha} (nome até 32 e senha até 63 caracteres).' });
      rede.nome = corpo.nome.trim();
      rede.senha = corpo.senha;
      try {
        const local = existsSync(arquivoLocal) ? JSON.parse(readFileSync(arquivoLocal, 'utf8').replace(/^\uFEFF/, '')) : {};
        local.rede = { nome: rede.nome, senha: rede.senha };
        writeFileSync(arquivoLocal, JSON.stringify(local, null, 2) + '\n', 'utf8');
      } catch (e) {
        return json(res, 500, { ok: false, erro: `Rede guardada só até desligar: não consegui gravar o local.json (${e.message}).` });
      }
      return json(res, 200, { ok: true });
    },

    'GET /api/rede': (req, res) => {
      const t = agora();
      const { ips, urls } = urlsDoPainel();
      const esp = IDS_MODULOS.filter((id) => espVistos[id]).map((id) => {
        const v = espVistos[id];
        v.mensagens = v.mensagens.filter((m) => m > t - 60_000);
        return { modulo: id, ip: v.ip, ultima: v.ultima, porMinuto: v.mensagens.length };
      });
      json(res, 200, {
        ok: true,
        ips,
        porta,
        url: urls[0] ?? `http://localhost:${porta}/?modo=celular`,
        urls,
        rede: { nome: rede.nome, senha: rede.senha, configurada: Boolean(rede.nome) },
        esp,
        sugerirDemo: sugerirDemo(),
      });
    },

    'GET /api/historico': (req, res, url) => {
      const modulo = url.searchParams.get('modulo');
      const campo = url.searchParams.get('campo');
      const valido = IDS_MODULOS.includes(modulo) && (CAMPOS[modulo][campo] || (modulo === 'energia' && campo === 'geracao_w'));
      if (!valido) return json(res, 400, { ok: false, erro: 'Use ?modulo=...&campo=... com nomes do contrato.' });
      return json(res, 200, { ok: true, modulo, campo, pontos: estado.historico(modulo, campo) });
    },

    'GET /api/historico.csv': (req, res, url) => {
      if (!exigirAdmin(req, res)) return;
      const modulo = url.searchParams.get('modulo') || null;
      if (modulo && !IDS_MODULOS.includes(modulo)) return json(res, 400, { ok: false, erro: 'Módulo desconhecido.' });
      const nome = `historico-${modulo ?? 'todos'}-${dataLocal(agora())}.csv`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
      });
      res.end(historicoArquivo.csv(modulo));
    },

    'POST /api/esp/leitura': async (req, res) => {
      const corpo = await lerJson(req);
      if (!objeto(corpo) || !IDS_MODULOS.includes(corpo.modulo)) {
        return json(res, 400, { ok: false, erro: `Campo "modulo" deve ser um destes: ${IDS_MODULOS.join(', ')}.` });
      }
      if (!chaveCerta(corpo.chave)) return json(res, 401, { ok: false, erro: 'Chave dos módulos errada.' });
      const t = agora();
      const v = (espVistos[corpo.modulo] ??= { ip: '', ultima: 0, mensagens: [] });
      v.ip = ipDe(req);
      v.ultima = t;
      v.mensagens = v.mensagens.filter((m) => m > t - 60_000);
      v.mensagens.push(t);
      ultimaMsgEsp = t;
      const sinal = estado.obter().modulos[corpo.modulo].sinal;
      if (sinal === 'desativado') return json(res, 200, { ok: true, ignorada: 'desativado', comandos: [] });
      if (estado.modo === 'demo') return json(res, 200, { ok: true, ignorada: 'demo', comandos: [] });
      const r = estado.registrarLeitura(corpo.modulo, corpo.dados, { substituir: true });
      for (const a of r.avisos) avisarLog(a);
      return json(res, 200, { ok: true, comandos: fila.retirar(corpo.modulo), avisos: r.avisos });
    },

    'POST /api/esp/confirmacao': async (req, res) => {
      const corpo = await lerJson(req);
      if (!objeto(corpo) || !IDS_MODULOS.includes(corpo.modulo) || typeof corpo.id !== 'string') {
        return json(res, 400, { ok: false, erro: 'Use {modulo, chave, id}.' });
      }
      if (!chaveCerta(corpo.chave)) return json(res, 401, { ok: false, erro: 'Chave dos módulos errada.' });
      if (!fila.confirmar(corpo.modulo, corpo.id)) return json(res, 404, { ok: false, erro: 'Comando não encontrado ou já vencido.' });
      return json(res, 200, { ok: true });
    },
  };

  async function tratar(req, res) {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      const rota = rotas[`${req.method} ${url.pathname}`];
      if (!rota) return json(res, 404, { ok: false, erro: 'Rota não encontrada.' });
      return rota(req, res, url);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, erro: 'Método não permitido.' });
    // modoInicial fixo na configuração: quem abre o endereço puro (sem ?modo=) vai direto para a tela escolhida.
    if (url.pathname === '/' && !url.searchParams.has('modo') && (config.modoInicial === 'cartoes' || config.modoInicial === '3d')) {
      url.searchParams.set('modo', config.modoInicial);
      res.writeHead(302, { Location: `/${url.search}`, 'Cache-Control': 'no-store' });
      return res.end();
    }
    return servirEstatico(req, res, pastaPublico);
  }

  const servidor = createServer((req, res) => {
    Promise.resolve()
      .then(() => tratar(req, res))
      .catch((e) => {
        if (e instanceof ErroHttp) {
          if (!res.headersSent) {
            res.setHeader('Connection', 'close');
            json(res, e.status, { ok: false, erro: e.message });
          }
          return;
        }
        console.error('[servidor] erro numa requisição:', e);
        if (!res.headersSent) json(res, 500, { ok: false, erro: 'Erro interno.' });
        else res.end();
      });
  });
  servidor.on('clientError', (_e, socket) => { try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch { /* nada */ } });

  let ultimaSugestao = false;
  function iniciarTimers() {
    if (estado.modo === 'demo') simulador.iniciar();
    timers.push(setInterval(() => {
      estado.verificarSinal();
      fila.verificar();
      const s = sugerirDemo();
      if (s !== ultimaSugestao) { ultimaSugestao = s; agendarEnvio(); }
    }, 1000));
    timers.push(setInterval(() => estado.amostrarHistorico(), config.intervaloHistoricoMs));
    timers.push(setInterval(() => historicoArquivo.gravar(estado.obter()), config.historicoArquivo?.intervaloMs ?? 10_000));
    timers.push(setInterval(() => { for (const r of clientesSse) r.write(': ainda aqui\n\n'); }, 15_000));
  }

  function encerrar() {
    simulador.parar();
    for (const t of timers) clearInterval(t);
    for (const r of clientesSse) r.end();
    clientesSse.clear();
    return new Promise((ok) => servidor.close(() => ok()));
  }

  if (!op.semTimers) iniciarTimers();
  return {
    servidor, estado, simulador, sessoes, fila, historicoArquivo, encerrar,
    /** Grava agora a linha de histórico (o timer faz isso a cada 10 s). */
    gravarHistorico: () => historicoArquivo.gravar(estado.obter()),
    definirPorta(p) { porta = p; },
    inicio: { relidas },
  };
}

/** Escuta na porta pedida; se ocupada, tenta as seguintes. */
export async function escutar(servidor, porta, tentativas, host = '0.0.0.0') {
  for (let i = 0; i <= tentativas; i++) {
    try {
      await new Promise((ok, falha) => {
        servidor.once('error', falha);
        servidor.listen(porta + i, host, () => { servidor.off('error', falha); ok(); });
      });
      return porta + i;
    } catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error(`As portas ${porta} a ${porta + tentativas} estão ocupadas.`);
}

/** Abre o navegador em tela cheia (Edge ou Chrome); se não achar, abre o padrão. */
function abrirNavegador(url) {
  if (process.platform !== 'win32') return;
  const candidatos = [
    join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Microsoft\\Edge\\Application\\msedge.exe'),
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];
  const exe = candidatos.find((c) => existsSync(c));
  try {
    const filho = exe
      ? spawn(exe, ['--new-window', '--start-fullscreen', '--no-first-run', `--user-data-dir=${join(tmpdir(), 'smart-canada-navegador')}`, url], { detached: true, stdio: 'ignore' })
      : spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
    filho.on('error', (e) => console.log(`  Não consegui abrir o navegador (${e.message}). Abra ${url} à mão.`));
    filho.unref();
  } catch (e) {
    console.log(`  Não consegui abrir o navegador (${e.message}). Abra ${url} à mão.`);
  }
}

function lerArgs(argv) {
  const args = { abrir: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--porta') args.porta = Number(argv[++i]);
    else if (argv[i] === '--modo') args.modo = argv[++i];
    else if (argv[i] === '--abrir') args.abrir = true;
  }
  return args;
}

async function principal() {
  process.on('uncaughtException', (e) => console.error('[servidor] erro inesperado (o servidor continua):', e));
  process.on('unhandledRejection', (e) => console.error('[servidor] erro inesperado (o servidor continua):', e));

  const args = lerArgs(process.argv.slice(2));
  const { config, avisos } = carregarConfig();
  if (args.porta) config.porta = args.porta;
  if (args.modo === 'demo' || args.modo === 'real') config.modo = args.modo;

  const app = criarApp(config);
  const porta = await escutar(app.servidor, config.porta, config.tentativasPorta ?? 10);
  app.definirPorta(porta);
  iniciarDescoberta({ portaHttp: porta, portaUdp: config.descoberta.porta, intervaloMs: config.descoberta.intervaloMs });

  const ips = enderecosDeRede();
  const linha = '='.repeat(62);
  console.log('');
  console.log(linha);
  console.log('  SMART CANADA 2050 - painel da cidade (Módulo 6)');
  console.log(linha);
  if (porta !== config.porta) console.log(`  A porta ${config.porta} estava ocupada. Usando a porta ${porta}.`);
  console.log(`  Neste computador:   http://localhost:${porta}`);
  if (ips.length) for (const ip of ips) console.log(`  Na rede:            http://${ip}:${porta}`);
  else console.log('  Na rede:            nenhuma rede encontrada (ligue a Wi-Fi do projeto)');
  console.log(`  Modo de dados:      ${app.estado.modo === 'demo' ? 'DEMONSTRAÇÃO (simulador)' : 'REAL (ESP32)'}`);
  if (config.modoInicial && config.modoInicial !== 'auto') console.log(`  Tela inicial:       fixada em ${config.modoInicial === 'cartoes' ? 'CARTÕES' : 'MAPA 3D'} (modoInicial na configuração)`);
  console.log('  QR para celulares:  botão "Acesso pelo celular" na barra do painel');
  console.log(`  Login:              ${app.sessoes.ativo ? 'ligado (códigos do config/local.json)' : 'DESLIGADO (só visualização)'}`);
  console.log(`  Histórico:          pasta dados\\ (${app.inicio.relidas} linhas relidas dos últimos 10 min)`);
  console.log(`  ESP32:              anúncio UDP na porta ${config.descoberta.porta} a cada ${config.descoberta.intervaloMs / 1000} s`);
  for (const a of avisos) console.log(`  AVISO: ${a}`);
  console.log('  Para desligar: feche esta janela (ou Ctrl+C).');
  console.log(linha);
  console.log('');

  if (args.abrir) abrirNavegador(`http://localhost:${porta}/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().catch((e) => {
    console.error('Não foi possível ligar o servidor:', e.message);
    process.exitCode = 1;
  });
}
