// Finge ser os 5 ESP32 pela rede: testa o caminho real sem hardware.
// Ouve o anúncio UDP, manda leituras por HTTP com a chave, executa os comandos e confirma.
//
// Uso:
//   node ferramentas/esp-falso.js
//   node ferramentas/esp-falso.js --modulos energia,centro
//   node ferramentas/esp-falso.js --falhar mobilidade          (para de mandar depois de 20 s)
//   node ferramentas/esp-falso.js --falhar mobilidade --depois 5
//   node ferramentas/esp-falso.js --servidor 192.168.0.10:5050 (pula a descoberta)
//   node ferramentas/esp-falso.js --chave minha-chave
//   node ferramentas/esp-falso.js --teste                      (manda "teste": true: o painel mostra "Valor de teste" e "Teste")
// O servidor precisa estar no modo real (tela de administração) para usar estes dados.
import { createSocket } from 'node:dgram';
import { IDS_MODULOS } from '../compartilhado/contrato.js';
import { carregarConfig } from '../servidor/config.js';
import { criarSimulador } from '../servidor/simulador.js';

function lerArgs(argv) {
  const a = { modulos: IDS_MODULOS, falhar: [], depois: 20, servidor: null, chave: null, teste: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i + 1];
    if (argv[i] === '--modulos') { a.modulos = v.split(',').map((s) => s.trim()); i++; }
    else if (argv[i] === '--falhar') { a.falhar = v.split(',').map((s) => s.trim()); i++; }
    else if (argv[i] === '--depois') { a.depois = Number(v); i++; }
    else if (argv[i] === '--servidor') { a.servidor = v; i++; }
    else if (argv[i] === '--chave') { a.chave = v; i++; }
    else if (argv[i] === '--teste') a.teste = true;
  }
  for (const m of [...a.modulos, ...a.falhar]) {
    if (!IDS_MODULOS.includes(m)) { console.error(`Módulo desconhecido: ${m}. Use: ${IDS_MODULOS.join(', ')}`); process.exit(1); }
  }
  return a;
}

const hora = () => new Date().toLocaleTimeString('pt-BR');
const log = (msg) => console.log(`[${hora()}] ${msg}`);

/** Escuta o anúncio "SMARTCANADA <ip> <porta>" por até 10 s, como o ESP32 faz. */
function descobrir(portaUdp, reserva) {
  return new Promise((ok) => {
    const socket = createSocket({ type: 'udp4', reuseAddr: true });
    const fim = (endereco, origem) => { clearTimeout(timer); try { socket.close(); } catch { /* já fechado */ } ok({ endereco, origem }); };
    const timer = setTimeout(() => fim(reserva, 'IP de reserva (não ouvi o anúncio em 10 s)'), 10_000);
    socket.on('message', (msg) => {
      const partes = msg.toString().trim().split(/\s+/);
      if (partes[0] === 'SMARTCANADA' && partes.length === 3) fim(`${partes[1]}:${partes[2]}`, 'anúncio UDP');
    });
    socket.on('error', (e) => fim(reserva, `IP de reserva (erro no UDP: ${e.message})`));
    socket.bind(portaUdp);
  });
}

async function postar(base, caminho, corpo) {
  const r = await fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(3000),
  });
  return { status: r.status, corpo: await r.json().catch(() => ({})) };
}

async function principal() {
  const args = lerArgs(process.argv.slice(2));
  const { config } = carregarConfig();
  const chave = args.chave ?? config.chaveModulos;

  let endereco = args.servidor;
  if (!endereco) {
    log(`Procurando o servidor (UDP ${config.descoberta.porta}, até 10 s)...`);
    const d = await descobrir(config.descoberta.porta, `localhost:${config.porta}`);
    endereco = d.endereco;
    log(`Servidor: ${endereco} (${d.origem})`);
  }
  const base = `http://${endereco}`;

  // O simulador gera os dados; aqui ele só guarda a última leitura de cada módulo.
  const ultimas = {};
  const sim = criarSimulador({ estado: { registrarLeitura: (id, dados) => { ultimas[id] = dados; } }, intervaloMs: 2000 });
  const inicio = Date.now();
  const caiu = new Set();
  log(`Fingindo ser: ${args.modulos.join(', ')}${args.falhar.length ? ` (vão falhar depois de ${args.depois} s: ${args.falhar.join(', ')})` : ''}`);

  async function ciclo() {
    sim.passo();
    for (const modulo of args.modulos) {
      if (args.falhar.includes(modulo) && Date.now() - inicio > args.depois * 1000) {
        if (!caiu.has(modulo)) { caiu.add(modulo); log(`${modulo}: parei de mandar (falha simulada)`); }
        continue;
      }
      try {
        const r = await postar(base, '/api/esp/leitura', { modulo, chave, dados: args.teste ? { ...ultimas[modulo], teste: true } : ultimas[modulo] });
        if (r.status !== 200) { log(`${modulo}: servidor respondeu ${r.status} ${r.corpo.erro ?? ''}`); continue; }
        if (r.corpo.ignorada) log(`${modulo}: leitura ignorada pelo servidor (${r.corpo.ignorada})`);
        for (const a of r.corpo.avisos ?? []) log(`${modulo}: aviso do servidor: ${a}`);
        for (const c of r.corpo.comandos ?? []) {
          const eco = sim.aplicarComando(c);
          log(`${modulo}: comando ${c.comando} = ${c.valor} (${c.id}) ${eco === null ? 'NÃO executado' : 'executado'}`);
          if (eco === null) continue;
          const conf = await postar(base, '/api/esp/confirmacao', { modulo, chave, id: c.id });
          log(`${modulo}: confirmação ${conf.status === 200 ? 'aceita' : `recusada (${conf.status})`}`);
        }
      } catch (e) {
        log(`${modulo}: sem conexão com ${base} (${e.cause?.code ?? e.message})`);
      }
    }
  }

  await ciclo();
  setInterval(() => { ciclo().catch((e) => log(`erro: ${e.message}`)); }, 2000);
}

principal();
