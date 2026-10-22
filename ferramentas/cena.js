// Conferência da cena 3D (F3): compara com a planta, mede os quadros por segundo e tira as capturas de cima
// e em perspectiva. Liga um servidor próprio (modo demo), abre ?modo=cena&debug=1 no Chromium do Playwright.
//
// Uso: npm run cena          (precisa de npm run build antes)
//
// Sobre os quadros por segundo: o Chromium sem cabeça pode usar a placa de vídeo do PC (ANGLE/Direct3D11) ou
// o desenho por software (SwiftShader, que é o pior caso: PC sem placa de vídeo nenhuma). Esta ferramenta
// mede os dois e diz qual placa cada medida usou. A CPU limitada (4x) simula um notebook fraco.
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { carregarConfig } from '../servidor/config.js';
import { criarApp, escutar } from '../servidor/index.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'docs', 'shots');
const PASTA_TMP = join(PASTA, 'tmp');
mkdirSync(PASTA_TMP, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const temp = mkdtempSync(join(tmpdir(), 'smart-canada-cena-'));
const { config } = carregarConfig();
const app = criarApp({ ...config, modo: 'demo', codigos: { controle: 'x', administracao: 'y' } }, { pastaDados: join(temp, 'dados'), arquivoLocal: join(temp, 'local.json') });
const porta = await escutar(app.servidor, 5096, 10, '127.0.0.1');
app.definirPorta(porta);
const URL = `http://127.0.0.1:${porta}/?modo=cena&debug=1`;

const problemas = [];
const VIEWPORT = { width: 1370, height: 1000 }; // o tamanho aproximado do mapa na tela de 1920x1080 com o painel de 450 px

async function abrir(nav, { cpu = 1, extra = '', viewport = VIEWPORT, layout = false } = {}) {
  const ctx = await nav.newContext({ viewport, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => problemas.push(e.message));
  pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problemas.push(`${m.type()}: ${m.text()}`); });
  if (cpu > 1) {
    const cdp = await ctx.newCDPSession(pg);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  await pg.goto(layout ? `http://127.0.0.1:${porta}/?debug=1&luz=dia` : URL + extra);
  await pg.waitForFunction(() => window.__cena, null, { timeout: 60_000 });
  return { ctx, pg };
}

const placa = (pg) => pg.evaluate(() => {
  const gl = window.__cena.renderer.getContext();
  const e = gl.getExtension('WEBGL_debug_renderer_info');
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'desconhecida';
});

/** Quadros por segundo médios depois de `ms` de espera (a média dos últimos 90 quadros). */
async function fps(pg, ms = 4000) {
  await pg.evaluate(() => { window.__cena.fps(); });
  await espera(ms);
  return pg.evaluate(() => +window.__cena.fps().toFixed(1));
}

// ---------------------------------------------------------------------------
// 1. Conferência com a planta e capturas (placa de vídeo do PC)
// ---------------------------------------------------------------------------
const gpu = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
{
  const { ctx, pg } = await abrir(gpu);
  console.log(`Placa usada nas capturas: ${await placa(pg)}`);
  const r = await pg.evaluate(() => window.__conferirPlanta());
  console.log(`\nConferência com a planta (${r.total} itens, tolerância 0,6 cm): ${r.ok ? 'TUDO BATE' : 'FALHOU'}`);
  for (const i of r.itens) console.log(`  ${i.ok ? 'ok ' : 'XX '} ${i.item.padEnd(16)} desvio máx. ${i.desvioMax} cm`);
  for (const f of r.falhas) console.log(`  FALHA: ${f}`);
  await espera(1500);
  await pg.screenshot({ path: join(PASTA, 'F3-perspectiva.png') });
  await pg.evaluate(() => window.__cena.vistaDeCima(true));
  await espera(600);
  await pg.screenshot({ path: join(PASTA, 'F3-cima.png') });
  await pg.evaluate(() => window.__cena.vistaDeCima(false));
  await pg.evaluate(() => window.__cena.vistaInicial());
  await espera(400);

  // Limites da câmera, com o mouse de verdade: arrastar para todos os lados, girar a roda e arrastar com o botão direito.
  const estado = () => pg.evaluate(() => {
    const c = window.__cena.controls;
    return {
      polar: +(c.getPolarAngle() * 180 / Math.PI).toFixed(1),
      distancia: +c.getDistance().toFixed(1),
      alvoX: +c.target.x.toFixed(1), alvoZ: +c.target.z.toFixed(1), alvoY: +c.target.y.toFixed(1),
      cameraY: +window.__cena.camera.position.y.toFixed(1),
    };
  });
  const arrastar = async (de, ate, botao = 'left') => {
    await pg.mouse.move(...de);
    await pg.mouse.down({ button: botao });
    await pg.mouse.move(...ate, { steps: 12 });
    await pg.mouse.up({ button: botao });
    await espera(900);
  };
  const lim = { polarMax: 0, polarMin: 999, distMax: 0, distMin: 999, alvoXMin: 999, alvoXMax: -999, alvoZMin: 999, alvoZMax: -999, cameraYMin: 999 };
  const anotar = async () => {
    const e = await estado();
    lim.polarMax = Math.max(lim.polarMax, e.polar); lim.polarMin = Math.min(lim.polarMin, e.polar);
    lim.distMax = Math.max(lim.distMax, e.distancia); lim.distMin = Math.min(lim.distMin, e.distancia);
    lim.alvoXMin = Math.min(lim.alvoXMin, e.alvoX); lim.alvoXMax = Math.max(lim.alvoXMax, e.alvoX);
    lim.alvoZMin = Math.min(lim.alvoZMin, e.alvoZ); lim.alvoZMax = Math.max(lim.alvoZMax, e.alvoZ);
    lim.cameraYMin = Math.min(lim.cameraYMin, e.cameraY);
  };
  await arrastar([700, 200], [700, 950]); await anotar();   // tenta passar por baixo da base
  await arrastar([700, 900], [700, 50]); await anotar();    // tenta passar por cima (de cabeça para baixo)
  for (let i = 0; i < 12; i++) await pg.mouse.wheel(0, -900); // aproximar
  await espera(900); await anotar();
  for (let i = 0; i < 40; i++) await pg.mouse.wheel(0, 900);  // afastar
  await espera(900); await anotar();
  await arrastar([300, 500], [1300, 100], 'right'); await anotar(); // pan para um lado
  await arrastar([1300, 100], [50, 950], 'right'); await anotar();  // pan para o outro
  console.log('\nLimites da câmera depois de arrastar, rolar a roda e fazer pan até o fim:');
  console.log(`  ângulo polar: de ${lim.polarMin}° a ${lim.polarMax}° (limite: 8° a 80°)`);
  console.log(`  distância: de ${lim.distMin} a ${lim.distMax} cm (limite: 35 a 260)`);
  console.log(`  mira: x de ${lim.alvoXMin} a ${lim.alvoXMax} (limite 4 a 116), z de ${lim.alvoZMin} a ${lim.alvoZMax} (limite 4 a 96); câmera nunca abaixo de y = ${lim.cameraYMin}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// 2. Quadros por segundo
// ---------------------------------------------------------------------------
const medidas = [];
async function rodada(nav, rotulo, op) {
  const { ctx, pg } = await abrir(nav, op);
  const nomePlaca = await placa(pg);
  const linha = { rotulo, placa: nomePlaca };
  for (const q of ['alta', 'media', 'baixa']) {
    await pg.evaluate((n) => window.__cena.definirQualidade(n), q);
    await espera(2000); // aquecimento: os shaders novos compilam no primeiro quadro
    await pg.evaluate(() => window.__cena.definirQualidade(window.__cena.qualidade));
    await espera(1500);
    linha[q] = await fps(pg, 4000);
  }
  const info = await pg.evaluate(() => ({ chamadas: window.__cena.renderer.info.render.calls, triangulos: window.__cena.renderer.info.render.triangles }));
  Object.assign(linha, info);
  medidas.push(linha);
  await ctx.close();
}
await rodada(gpu, 'placa de vídeo do PC', {});
await rodada(gpu, 'TELA COMPLETA (mapa, etiquetas e painel) 1920x1080, placa de vídeo do PC', { layout: true, viewport: { width: 1920, height: 1080 } });
await rodada(gpu, 'TELA COMPLETA, CPU limitada 4x', { layout: true, cpu: 4, viewport: { width: 1920, height: 1080 } });
await rodada(gpu, 'placa de vídeo do PC, CPU limitada 4x', { cpu: 4 });
await gpu.close();

// Capacidade bruta: sem o limite de 60 quadros por segundo do monitor.
const livre = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
await rodada(livre, 'placa de vídeo do PC, sem limite de 60 quadros', {});
await rodada(livre, 'placa de vídeo do PC, sem limite de 60 quadros, CPU limitada 4x', { cpu: 4 });
await livre.close();

// Pior caso: sem placa de vídeo (desenho por software, SwiftShader).
const soft = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
await rodada(soft, 'sem placa de vídeo (software, SwiftShader)', {});
await rodada(soft, 'TELA COMPLETA, sem placa de vídeo (software)', { layout: true, viewport: { width: 1920, height: 1080 } });
await rodada(soft, 'sem placa de vídeo (software), CPU limitada 4x', { cpu: 4 });
await soft.close();

console.log('\nQuadros por segundo (média dos últimos 90 quadros), na janela de 1370 x 1000:');
for (const m of medidas) {
  console.log(`  ${m.rotulo}\n    placa: ${m.placa}\n    alta ${m.alta} | média ${m.media} | baixa ${m.baixa}   (${m.chamadas} chamadas de desenho, ${m.triangulos} triângulos)`);
}

const unicos = [...new Set(problemas)];
console.log(unicos.length ? `\nProblemas no console:\n  ${unicos.join('\n  ')}` : '\nSem erros nem avisos no console.');
app.servidor.close();
process.exit(0);
