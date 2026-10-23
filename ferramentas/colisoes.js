// Confere tamanhos, colisões, marcadores de sensor e câmera do mapa 3D.
//
//   node ferramentas/colisoes.js      (ou: npm run colisoes; precisa de npm run build antes)
//
// Parte A (só dados): monta a pegada de cada objeto como o 3D desenha (com beiral de telhado, toldo, ganchos dos
//   postes...) a partir de compartilhado/maquete.js e lista (1) objeto fora do bloco a que pertence, (2) objetos sólidos
//   que se sobrepõem (casa e árvore, painel e base de turbina, árvore e trilho...), (3) pás de turbina que passam por
//   cima de objeto alto, (4) o tamanho de cada tipo de objeto comparado com a casa.
// Parte B (navegador): abre o mapa, lê a altura do pino de cada sensor e confere que nenhum marcador fica escondido dentro
//   de um objeto (o 3D sobe só a altura do pino, nunca x/z nem o ID).
// Parte C (navegador): o enquadramento inicial, o do bloco e o zoom máximo mostram a maquete inteira, em vários tamanhos
//   de janela, e ficam dentro dos limites de zoom (35 a 260 cm).
//
// As constantes de "desenhado" abaixo espelham web/cena/*.js (ALT_TELHADO, BEIRAL, toldo...). Se mudar o desenho, mude aqui.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  PALETE, BLOCOS, VIAS, ENERGIA, CENTRO, ECONOMIA, RESIDENCIAL, MOBILIDADE, ARVORES, POSTES, SENSORES, FOTOS_22_10,
} from '../compartilhado/maquete.js';
import { carregarConfig } from '../servidor/config.js';
import { criarApp, escutar } from '../servidor/index.js';

const problemas = [];
const avisos = [];
const bloco = (id) => BLOCOS.find((b) => b.id === id);
const TOL = 0.05;

// ---------------------------------------------------------------------------
// Parte A: pegadas
// ---------------------------------------------------------------------------
const ALT_TELHADO = 3.4;
const BEIRAL = 0.6;
const ESP_TELHADO = 0.34;
const rect = (r, e = 0) => ({ tipo: 'rect', x: r.x - e, y: r.y - e, w: r.w + 2 * e, h: r.h + 2 * e });
const disco = (cx, cy, r) => ({ tipo: 'disco', cx, cy, r });
/** @type {{nome: string, bloco: string, forma: object, topo: number, base?: number, classe: 'solido'|'plano'|'aereo', camada?: number}[]} */
const itens = [];
const add = (nome, blocoId, forma, topo, classe = 'solido', extra = {}) => itens.push({ nome, bloco: blocoId, forma, topo, classe, ...extra });

// Residencial
for (const c of [...RESIDENCIAL.casas, ...FOTOS_22_10.residencial.casasExtras]) add(c.id, 'residencial', rect(c, BEIRAL), c.alturaParede + ALT_TELHADO + ESP_TELHADO);
add('calçada', 'residencial', rect(RESIDENCIAL.calcada), 0.12, 'plano');
add('faixa verde-água', 'residencial', rect(FOTOS_22_10.residencial.faixaVerde), 0.14, 'plano');
FOTOS_22_10.residencial.retalhosGrama.forEach((r, i) => add(`retalho de grama ${i + 1}`, 'residencial', rect(r), 0.12, 'plano', { camada: 0 }));
RESIDENCIAL.pontosEscuros.forEach((p, i) => add(`ponto escuro ${i + 1}`, 'residencial', disco(p.cx, p.cy, p.raio), 0.7));

// Energia
const sen = Math.sin((ENERGIA.inclinacaoPainelGraus * Math.PI) / 180);
const cos = Math.cos((ENERGIA.inclinacaoPainelGraus * Math.PI) / 180);
[...ENERGIA.paineisSolares, ...FOTOS_22_10.energia.paineisExtras].forEach((p, i) => add(`painel ${i + 1}`, 'energia', rect(p), 0.65 + (p.h / cos) * sen + 0.2));
add('baterias', 'energia', rect(ENERGIA.baterias), ENERGIA.baterias.altura + 0.1);
const turbinas = [ENERGIA.turbina, ...FOTOS_22_10.energia.turbinasExtras];
const ALT_TORRE = 0.1 + 0.35 + ENERGIA.turbina.alturaTorre; // altura do cubo
turbinas.forEach((t, i) => {
  add(`base da turbina ${i + 1}`, 'energia', disco(t.cx, t.cy, FOTOS_22_10.energia.raioBaseTurbina), 0.55);
  const pa = ENERGIA.turbina.comprimentoPa;
  add(`pás da turbina ${i + 1}`, 'energia', rect({ x: t.cx - pa, y: t.cy + 0.9 - 0.5, w: 2 * pa, h: 1 }), ALT_TORRE + pa, 'aereo', { base: ALT_TORRE - pa });
});

// Centro Urbano (alturas desenhadas: ver web/cena/centro.js)
const [pCandy, pShopping, pTorre] = CENTRO.predios;
add('Candy Sweet (com toldo)', 'centro', rect({ x: pCandy.x - 0.25, y: pCandy.y, w: pCandy.w + 0.5, h: pCandy.h + 1.7 }), 3.8 + 0.4 + 2.0);
add('Shopping', 'centro', rect(pShopping, 0.15), 8.5 + 0.3);
add('prédio alto azul', 'centro', rect(pTorre, 0.15), 11 + 0.3);
add('semáforo', 'centro', rect(CENTRO.semaforo.caixa), 6.9);

// Economia Circular (não mudou nas fotos)
ECONOMIA.lixeiras.forEach((l, i) => add(`lixeira ${i + 1}`, 'economia', rect(l, 0.12), l.altura + 0.3));
add('reservatório', 'economia', disco(ECONOMIA.reservatorio.cx, ECONOMIA.reservatorio.cy, ECONOMIA.reservatorio.raio), 3.9);
ECONOMIA.canteiros.forEach((c, i) => add(`canteiro ${i + 1}`, 'economia', rect(c), 1.0));

// Mobilidade
const FM = FOTOS_22_10.mobilidade;
add('base marrom do círculo', 'mobilidade', rect(FM.base), 0.3, 'plano', { camada: 0 });
add('trilho circular (com pedrinhas)', 'mobilidade', disco(FM.circulo.cx, FM.circulo.cy, FM.circulo.raioExterno + 0.9), 1.2);
add('galpão (com telhado)', 'mobilidade', rect(FM.galpao, 0.4), FM.galpao.altura + 0.45);
add('pedrinhas do galpão', 'mobilidade', rect(FM.pedrinhas), 0.4, 'plano');
add('faixa vermelha do terminal', 'mobilidade', rect(MOBILIDADE.faixaTerminal), 0.1, 'plano');

// Árvores: tronco de 1,9 cm (sólido) e copa de raio r por cima (aérea: começa a 1,9 cm do chão)
ARVORES.forEach((a, i) => {
  add(`tronco da árvore ${i + 1}`, a.bloco, disco(a.cx, a.cy, 0.4), 1.9);
  add(`copa da árvore ${i + 1}`, a.bloco, disco(a.cx, a.cy, a.r), 1.9 + 2 * a.r, 'aereo', { base: 1.9 });
});

// Postes: pé de raio 0,85 e gancho de 2,6 cm para o meio da rua
const AREA_POSTES = [];
POSTES.forEach((p, i) => {
  const dx = p.via === 'avenida' ? 0 : 1;
  const dz = p.via === 'avenida' ? (p.cy < 40 ? 1 : -1) : 0;
  const x1 = Math.min(p.cx - 0.85, p.cx + dx * 2.6 - 0.4), x2 = Math.max(p.cx + 0.85, p.cx + dx * 2.6 + 0.4);
  const y1 = Math.min(p.cy - 0.85, p.cy + dz * 2.6 - 0.4), y2 = Math.max(p.cy + 0.85, p.cy + dz * 2.6 + 0.4);
  AREA_POSTES.push({ nome: `poste ${i + 1}`, via: p.via, forma: { tipo: 'rect', x: x1, y: y1, w: x2 - x1, h: y2 - y1 } });
});

// ---- geometria ----
function caixa(f) {
  return f.tipo === 'rect' ? { x: f.x, y: f.y, w: f.w, h: f.h } : { x: f.cx - f.r, y: f.cy - f.r, w: 2 * f.r, h: 2 * f.r };
}
function dentro(f, r) {
  const c = caixa(f);
  return c.x >= r.x - TOL && c.y >= r.y - TOL && c.x + c.w <= r.x + r.w + TOL && c.y + c.h <= r.y + r.h + TOL;
}
function pontoNoRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }
function distPontoRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}
/** Folga entre duas formas (negativa se sobrepõem, em cm). */
function folga(a, b) {
  if (a.tipo === 'disco' && b.tipo === 'disco') return Math.hypot(a.cx - b.cx, a.cy - b.cy) - a.r - b.r;
  if (a.tipo === 'rect' && b.tipo === 'rect') {
    const gx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), gy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h));
    return gx > 0 || gy > 0 ? Math.hypot(Math.max(gx, 0), Math.max(gy, 0)) : Math.max(gx, gy);
  }
  const [d, r] = a.tipo === 'disco' ? [a, b] : [b, a];
  const dist = distPontoRect(d.cx, d.cy, r);
  return pontoNoRect(d.cx, d.cy, r) ? -d.r : dist - d.r;
}

// 1. Fora do bloco
for (const it of itens) {
  const b = bloco(it.bloco);
  if (!dentro(it.forma, b)) problemas.push(`FORA DO BLOCO: ${it.nome} (${it.bloco}) sai do bloco x ${b.x}..${b.x + b.w}, y ${b.y}..${b.y + b.h}: ${JSON.stringify(caixa(it.forma))}`);
}
for (const p of AREA_POSTES) {
  const via = VIAS.find((v) => v.id === p.via);
  if (!dentro(p.forma, via)) problemas.push(`FORA DA VIA: ${p.nome} sai da via ${p.via}`);
  for (const b of BLOCOS) if (folga(p.forma, rect(b)) < -TOL) problemas.push(`POSTE EM CIMA DE BLOCO: ${p.nome} avança sobre ${b.id}`);
  for (const it of itens) if (it.classe === 'solido' && folga(p.forma, it.forma) < -TOL) problemas.push(`POSTE ENCOSTA: ${p.nome} em ${it.nome}`);
}
// o palete: nada passa de x 4..116, y 4..96
// 2. Sobreposições
for (let i = 0; i < itens.length; i++) {
  for (let j = i + 1; j < itens.length; j++) {
    const a = itens[i], b = itens[j];
    const f = folga(a.forma, b.forma);
    if (f >= -TOL) continue;
    if (a.classe === 'solido' && b.classe === 'solido') problemas.push(`SOBREPOSTOS: ${a.nome} e ${b.nome} (${(-f).toFixed(2)} cm)`);
    else if (a.classe === 'plano' && b.classe === 'plano' && (a.camada ?? 1) === (b.camada ?? 1)) problemas.push(`PLANOS SOBREPOSTOS: ${a.nome} e ${b.nome} (${(-f).toFixed(2)} cm)`);
    else if ((a.classe === 'aereo' && b.classe === 'solido' && b.topo > a.base) || (b.classe === 'aereo' && a.classe === 'solido' && a.topo > b.base)) {
      const [ar, so] = a.classe === 'aereo' ? [a, b] : [b, a];
      problemas.push(`PÁS EM CIMA DE OBJETO: ${ar.nome} passa por cima de ${so.nome} (topo ${so.topo.toFixed(1)} cm, pás começam a ${ar.base.toFixed(1)} cm)`);
    }
  }
}

// 3. Proporções: tamanho de cada tipo de objeto (maior lado da pegada e altura) contra a casa
const casaRef = RESIDENCIAL.casas[0];
const alturaCasa = casaRef.alturaParede + ALT_TELHADO + ESP_TELHADO;
const grupos = [
  ['casa', itens.find((i) => i.nome === 'casa1')],
  ['painel solar', itens.find((i) => i.nome === 'painel 1')],
  ['turbina (cubo + pás)', { forma: rect({ x: 0, y: 0, w: 16, h: 1 }), topo: ALT_TORRE + ENERGIA.turbina.comprimentoPa }],
  ['Candy Sweet', itens.find((i) => i.nome.startsWith('Candy'))],
  ['Shopping', itens.find((i) => i.nome === 'Shopping')],
  ['prédio alto azul', itens.find((i) => i.nome === 'prédio alto azul')],
  ['galpão', itens.find((i) => i.nome.startsWith('galpão'))],
  ['poste', { forma: rect({ x: 0, y: 0, w: 1.7, h: 1.7 }), topo: 9.3 }],
  ['trilho circular (diâmetro)', { forma: rect({ x: 0, y: 0, w: FM.circulo.raioExterno * 2, h: FM.circulo.raioExterno * 2 }), topo: 1.2 }],
];
const proporcoes = grupos.map(([nome, it]) => {
  const c = caixa(it.forma);
  return `  ${nome.padEnd(28)} ${Math.max(c.w, c.h).toFixed(1).padStart(5)} cm de largura, ${it.topo.toFixed(1).padStart(5)} cm de altura (altura = ${(it.topo / alturaCasa).toFixed(2)} x a casa)`;
});
// Regras de bom senso tiradas das fotos
const alt = Object.fromEntries(grupos.map(([n, it]) => [n, it.topo]));
const volta = 2 * Math.PI * ((FM.circulo.raioExterno + FM.circulo.raioInterno) / 2);
const trem = 3 * 6.2 + 2 * 0.5;
if (!(alt['casa'] / alt['turbina (cubo + pás)'] > 0.35 && alt['casa'] / alt['turbina (cubo + pás)'] < 0.6)) avisos.push(`a casa deveria ter uns 40% a 55% da altura da turbina (tem ${(alt['casa'] / alt['turbina (cubo + pás)'] * 100).toFixed(0)}%)`);
if (!(trem / volta > 0.2 && trem / volta < 0.35)) problemas.push(`TREM: ocupa ${(trem / volta * 100).toFixed(0)}% da volta (nas fotos 37 e 47 são uns 25 a 33%)`);
const largBloco = bloco('mobilidade').w;
if (!(FM.circulo.raioExterno * 2 / largBloco > 0.4 && FM.circulo.raioExterno * 2 / largBloco < 0.6)) problemas.push(`CÍRCULO: ocupa ${(FM.circulo.raioExterno * 2 / largBloco * 100).toFixed(0)}% da largura do bloco (na foto-37 é perto de 50%)`);
const larguraTrilho = FM.circulo.raioExterno - FM.circulo.raioInterno;
if (larguraTrilho < 2.0) problemas.push(`TRILHO: anel de ${larguraTrilho.toFixed(1)} cm é estreito demais para o trem (2,0 cm)`);

// ---------------------------------------------------------------------------
// Partes B e C: navegador
// ---------------------------------------------------------------------------
const temp = mkdtempSync(join(tmpdir(), 'smart-canada-colisoes-'));
const { config } = carregarConfig();
const app = criarApp({ ...config, modo: 'demo', codigos: { controle: 'x', administracao: 'y' } }, { pastaDados: join(temp, 'dados'), arquivoLocal: join(temp, 'local.json') });
const porta = await escutar(app.servidor, 5094, 10, '127.0.0.1');
app.definirPorta(porta);
const BASE = `http://127.0.0.1:${porta}`;
const relatorioB = [];
const relatorioC = [];
let navegador;
try {
  navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  // B: alturas dos pinos (layout completo, que é onde os sensores existem)
  const pg = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
  pg.on('pageerror', (e) => problemas.push(`erro na página: ${e.message}`));
  await pg.goto(`${BASE}/?debug=1&sensores=1`);
  await pg.waitForFunction(() => window.__app?.sensores, null, { timeout: 15000 });
  const alturas = await pg.evaluate(() => window.__app.sensores.alturas());
  const ALTURA_PADRAO = 6.4;
  for (const s of SENSORES) {
    const h = alturas[s.id];
    // Quanto o objeto mais alto embaixo do ponto sobe (pelas pegadas da parte A; a altura do marcador é h + 0,8 mais o raio).
    let topo = 0;
    for (const it of itens) if (it.classe === 'solido' && folga({ tipo: 'disco', cx: s.cx, cy: s.cy, r: 0.01 }, it.forma) < 0) topo = Math.max(topo, it.topo);
    const escondido = h - 0.95 < topo - 0.05;
    if (escondido) problemas.push(`MARCADOR ESCONDIDO: ${s.id} (${s.cx}, ${s.cy}) com pino a ${h} cm e objeto de ${topo.toFixed(1)} cm embaixo`);
    if (h > ALTURA_PADRAO + 0.01) relatorioB.push(`  ${s.id} (${s.cx}, ${s.cy}): pino subiu de ${ALTURA_PADRAO} para ${h} cm (objeto de ${topo.toFixed(1)} cm embaixo)`);
    if (h > ALTURA_PADRAO + 12) avisos.push(`${s.id}: pino muito alto (${h} cm)`);
  }
  await pg.close();

  // C: câmera, em janelas de vários tamanhos
  const tamanhos = [[1370, 1000], [1340, 880], [814, 613], [728, 565], [1000, 1000], [600, 900], [1280, 800]];
  for (const [w, h] of tamanhos) {
    const p2 = await navegador.newPage({ viewport: { width: w, height: h } });
    await p2.goto(`${BASE}/?modo=cena&debug=1`);
    await p2.waitForFunction(() => window.__cena, null, { timeout: 15000 });
    await p2.waitForTimeout(400);
    const r = await p2.evaluate(() => {
      const c = window.__cena;
      const T = c.THREE;
      const total = new T.Box3().setFromObject(c.maquete);
      const cantos = [];
      for (const x of [total.min.x, total.max.x]) for (const y of [total.min.y, total.max.y]) for (const z of [total.min.z, total.max.z]) cantos.push(new T.Vector3(x, y, z));
      const cam = new T.PerspectiveCamera(c.camera.fov, c.camera.aspect, 10, 900);
      const maiorDesvio = (pos, alvo) => {
        cam.position.copy(pos); cam.lookAt(alvo); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
        return Math.max(...cantos.map((k) => { const q = k.clone().project(cam); return Math.max(Math.abs(q.x), Math.abs(q.y)); }));
      };
      const v = c.vistaDe('cidade');
      const dist = v.pos.distanceTo(v.alvo);
      const dir = v.pos.clone().sub(v.alvo).normalize();
      const emMax = maiorDesvio(v.alvo.clone().addScaledVector(dir, c.controls.maxDistance), v.alvo);
      const distBlocos = ['energia', 'centro', 'economia', 'residencial', 'mobilidade'].map((id) => { const b = c.vistaDe(id); return b.pos.distanceTo(b.alvo); });
      return {
        aspecto: +c.camera.aspect.toFixed(2),
        distInicial: +dist.toFixed(1), desvioInicial: +maiorDesvio(v.pos, v.alvo).toFixed(3),
        desvioZoomMax: +emMax.toFixed(3),
        min: c.controls.minDistance, max: c.controls.maxDistance,
        distBlocos: distBlocos.map((d) => +d.toFixed(1)),
      };
    });
    await p2.close();
    relatorioC.push(`  janela ${w} x ${h} (aspecto ${r.aspecto}): distância inicial ${r.distInicial} cm, maquete até ${(r.desvioInicial * 100).toFixed(0)}% do meio da tela; no zoom máximo (${Math.round(r.max)} cm) até ${(r.desvioZoomMax * 100).toFixed(0)}%; blocos a ${Math.min(...r.distBlocos)} a ${Math.max(...r.distBlocos)} cm`);
    if (r.desvioInicial > 1) problemas.push(`CÂMERA: o enquadramento inicial corta a maquete na janela ${w} x ${h}`);
    if (r.distInicial < r.min || r.distInicial > r.max) problemas.push(`CÂMERA: distância inicial ${r.distInicial} fora de ${r.min} a ${r.max} na janela ${w} x ${h}`);
    if (r.desvioZoomMax > 1) problemas.push(`CÂMERA: no zoom máximo a maquete é cortada na janela ${w} x ${h} (${(r.desvioZoomMax * 100).toFixed(0)}%)`);
    for (const d of r.distBlocos) if (d < r.min || d > r.max) problemas.push(`CÂMERA: a vista de um bloco fica a ${d} cm, fora de ${r.min} a ${r.max}, na janela ${w} x ${h}`);
  }
} catch (e) {
  avisos.push(`partes B e C não rodaram (${e.message.split('\n')[0]}). Rode npm run build e confira se o Chromium do Playwright está instalado.`);
} finally {
  await navegador?.close();
  await app.encerrar();
}

console.log('Proporções (altura de cada objeto e quanto vale da casa):');
for (const l of proporcoes) console.log(l);
console.log(`  trem: ${trem.toFixed(1)} cm de 3 carros em ${volta.toFixed(0)} cm de volta (${(trem / volta * 100).toFixed(0)}%); círculo: ${(FM.circulo.raioExterno * 2 / largBloco * 100).toFixed(0)}% da largura do bloco; anel de ${larguraTrilho.toFixed(1)} cm`);
console.log(`\nPegadas conferidas: ${itens.length} objetos e ${AREA_POSTES.length} postes.`);
console.log('\nAltura dos pinos dos sensores que subiram (a posição x/z e o ID não mudam):');
console.log(relatorioB.length ? relatorioB.join('\n') : '  nenhum');
console.log('\nCâmera:');
console.log(relatorioC.length ? relatorioC.join('\n') : '  (não rodou)');
for (const a of avisos) console.log(`\nAVISO: ${a}`);
console.log(problemas.length ? `\n${problemas.length} PROBLEMA(S):\n- ${problemas.join('\n- ')}` : '\nSem sobreposição, objeto fora do bloco, marcador escondido nem corte de câmera.');
process.exit(problemas.length ? 1 : 0);
