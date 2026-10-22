// Capturas com Playwright (Chromium) para a conferência visual da SPEC seção 10.
// Liga um servidor próprio (modo demo, códigos só de teste, pastas temporárias), abre as telas,
// faz as ações e salva em docs/shots/. Capturas extras vão para docs/shots/tmp/ (fora do git).
//
// Uso: npm run shots            (todas as que já existem)
//      npm run shots -- 9 11    (só algumas)
// Precisa de: npm run build antes, e do Chromium do Playwright (npx playwright install chromium).
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { carregarConfig } from '../servidor/config.js';
import { criarApp, escutar } from '../servidor/index.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'docs', 'shots');
const PASTA_TMP = join(PASTA, 'tmp');
const CODIGOS = { controle: 'shots-controle', administracao: 'shots-admin' };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const pedidos = process.argv.slice(2);
mkdirSync(PASTA_TMP, { recursive: true });

const temp = mkdtempSync(join(tmpdir(), 'smart-canada-shots-'));
const { config } = carregarConfig();
const app = criarApp({ ...config, modo: 'demo', codigos: CODIGOS }, { pastaDados: join(temp, 'dados'), arquivoLocal: join(temp, 'local.json') });
const porta = await escutar(app.servidor, 5095, 10, '127.0.0.1');
app.definirPorta(porta);
const BASE = `http://127.0.0.1:${porta}`;
console.log(`Servidor das capturas em ${BASE}`);

async function api(metodo, caminho, corpo, token) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return r.json();
}

// Placa de vídeo do PC (Direct3D 11) para o mapa 3D; as capturas do 3D dizem se o 3D abriu.
const BASE_DADOS = {
  energia: { bateria_pct: 74, bateria_v: 12.1, solar_w: 8.2, eolica_w: 4.1, consumo_w: 3.4 },
  residencial: { temperatura_c: 22.4, umidade_pct: 56, aquecimento: false, presenca: false, persiana: 'aberta', iluminacao: 'automatico' },
  centro: { postes: 'automatico', semaforo: 'verde', vagas_livres: 2 },
  mobilidade: { terminal: 'operando', proximo_veiculo: 'Ônibus 2 em 3 min', veiculo_na_plataforma: false, trem: 'parado', demonstracao: false },
  economia: { umidade_solo_pct: 40, reservatorio_pct: 66, bomba: false, irrigacao: 'automatico' },
};
let alimentador = null;

/** Liga o modo real e manda leituras de teste a cada 1,5 s (como os ESP32), com os valores de BASE_DADOS mais `mudancas`. */
async function alimentar(mudancas = {}, silenciar = []) {
  clearInterval(alimentador);
  const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
  await api('POST', '/api/admin/modo', { modo: 'real' }, admin);
  const dados = structuredClone(BASE_DADOS);
  for (const [m, d] of Object.entries(mudancas)) Object.assign(dados[m], d);
  const enviar = () => Promise.all(Object.entries(dados).filter(([m]) => !silenciar.includes(m))
    .map(([m, d]) => api('POST', '/api/esp/leitura', { modulo: m, chave: config.chaveModulos, dados: d }).catch(() => {})));
  await enviar();
  alimentador = setInterval(enviar, 1500);
  await espera(700);
}

async function modoDemo() {
  clearInterval(alimentador);
  const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
  await api('POST', '/api/admin/modo', { modo: 'demo' }, admin);
}

/** Onde um ponto da maquete (x, y, z em cm) aparece na tela do navegador. */
const pontoNaTela = (pagina, x, y, z) => pagina.evaluate(([px, py, pz]) => {
  const { cena } = window.__app;
  const v = new cena.THREE.Vector3(px, py, pz).project(cena.camera);
  const r = cena.canvas.getBoundingClientRect();
  return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
}, [x, y, z]);

const navegador = await chromium.launch({ args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const problemas = [];

/** Abre uma página nova, juntando erros do console. */
async function abrir(url, viewport, extra = {}) {
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const pagina = await ctx.newPage();
  const scripts = [];
  pagina.on('pageerror', (e) => problemas.push(`${url}: ${e.message}`));
  pagina.on('console', (m) => { if (m.type() === 'error') problemas.push(`${url}: ${m.text()}`); });
  pagina.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  // O Three.js é reconhecido pelo conteúdo (o arquivo dele não tem "three" no nome).
  let baixouThree = false;
  pagina.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    try { if ((await r.text()).includes('WebGLRenderer')) baixouThree = true; } catch { /* resposta já descartada */ }
  });
  await pagina.goto(BASE + url);
  await pagina.waitForFunction(() => document.querySelector('.tile[data-sinal], .detalhe[data-sinal]'), null, { timeout: 10_000 });
  await espera(600); // a contagem animada dos números (400 ms) termina
  return { ctx, pagina, scripts, tresD: () => baixouThree };
}

/** A página rola? (PC não pode rolar) */
const rola = (pagina) => pagina.evaluate(() => ({
  altura: document.documentElement.scrollHeight > window.innerHeight + 1,
  largura: document.documentElement.scrollWidth > window.innerWidth + 1,
}));

/** Elementos com texto menor que `min` px (PC: 16, celular: 14). */
const textoPequeno = (pagina, min) => pagina.evaluate((minimo) => {
  const ruins = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[hidden], svg')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const tam = parseFloat(getComputedStyle(el).fontSize);
    if (tam < minimo) ruins.add(`${el.className || el.tagName} (${tam}px): ${el.textContent.trim().slice(0, 30)}`);
  }
  return [...ruins];
}, min);

/** Texto cortado e conteúdo que vaza para fora do cartão (tile, destaque ou detalhe). */
const vazamentos = (pagina) => pagina.evaluate(() => {
  const achados = [];
  for (const el of document.querySelectorAll('.tile-nome, .tile-linhas span, .numero-grande, .texto-grande, .stat dd, .cmd-botoes .botao, .destaque-frase, .dn-valor, .mini, .pilula')) {
    if (el.offsetParent && el.scrollWidth > el.clientWidth + 1) achados.push(`cortado: ${el.textContent.trim().slice(0, 40)}`);
  }
  for (const cartao of document.querySelectorAll('.tile, .destaque, .detalhe')) {
    if (!cartao.offsetParent) continue;
    const c = cartao.getBoundingClientRect();
    for (const el of cartao.querySelectorAll('*')) {
      if (el.closest('.destaque-folha, svg, [hidden]') || !el.offsetParent) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > c.right + 1 || r.bottom > c.bottom + 1 || r.left < c.left - 1 || r.top < c.top - 1) {
        achados.push(`fora do cartão ${cartao.className.split(' ')[0]}: ${(el.className || el.tagName).toString().slice(0, 30)} "${el.textContent.trim().slice(0, 24)}"`);
        break;
      }
    }
  }
  return achados;
});

async function entrarPelaTela(pagina, codigo) {
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await pagina.fill('#codigo-acesso', codigo);
  await pagina.locator('form.login button[type=submit]').click();
  await pagina.getByRole('button', { name: 'Sair' }).waitFor();
}
const irPara = async (pagina, vista) => { await pagina.evaluate((v) => { location.hash = `#${v}`; }, vista); await espera(500); };
const resumo = async (pagina, rotulo) => console.log(`   ${rotulo}: rolagem=${JSON.stringify(await rola(pagina))} | texto<16px=${JSON.stringify(await textoPequeno(pagina, 16))} | vazamentos=${JSON.stringify(await vazamentos(pagina))}`);

const CAPTURAS = {
  async 8() {
    const { ctx, pagina, scripts, tresD } = await abrir('/?modo=celular', { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    await pagina.locator('.area-economia .tile').tap();
    await espera(700);
    await pagina.screenshot({ path: join(PASTA, '08-celular.png'), fullPage: true });
    await pagina.screenshot({ path: join(PASTA_TMP, '08-celular-tela.png') });
    const r = await rola(pagina);
    console.log(`8  celular: rolagem lateral=${r.largura}; scripts=${scripts.map((s) => s.split('/').pop()).join(', ')}; three.js baixado: ${tresD() ? 'SIM (errado)' : 'não'}`);
    console.log(`   texto<14px=${JSON.stringify(await textoPequeno(pagina, 14))} | vazamentos=${JSON.stringify(await vazamentos(pagina))}`);
    await ctx.close();
  },

  async 9() {
    // Visitante: cidade, sem nenhum comando ou cadeado.
    const { ctx, pagina, tresD } = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    await pagina.screenshot({ path: join(PASTA, '09-modo-cartoes.png') });
    console.log(`9  modo cartões, cidade (visitante); three.js baixado: ${tresD() ? 'SIM (errado)' : 'não'}`);
    await resumo(pagina, 'cidade');
    const comandosVisiveis = await pagina.locator('.faixa-comandos:visible, .cmd-nota, .icone svg[data-cadeado]').count();
    console.log(`   comandos ou avisos de login visíveis para o visitante: ${comandosVisiveis}`);
    // Uma área como visitante
    await irPara(pagina, 'energia');
    await pagina.screenshot({ path: join(PASTA_TMP, '09-area-visitante.png') });
    await resumo(pagina, 'área energia (visitante)');
    await ctx.close();
  },

  async '9b'() {
    // Controle: comandos mudam o simulador.
    const { ctx, pagina } = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    await entrarPelaTela(pagina, CODIGOS.controle);
    await irPara(pagina, 'residencial');
    const antes = (await api('GET', '/api/estado')).modulos.residencial.dados.persiana;
    await pagina.locator('.detalhe .cmd-grupo', { hasText: 'Persiana' }).getByRole('button', { name: antes === 'fechada' ? 'Abrir' : 'Fechar' }).click();
    await pagina.waitForFunction(() => document.querySelectorAll('.cmd-status[data-situacao="executado"]').length >= 1, null, { timeout: 8000 });
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA, '09b-area-controle.png') });
    await resumo(pagina, 'área residencial (controle)');
    await irPara(pagina, 'economia');
    await pagina.getByRole('button', { name: 'Irrigar agora' }).click();
    await pagina.waitForFunction(() => document.querySelectorAll('.cmd-status[data-situacao="executado"]').length >= 1, null, { timeout: 8000 });
    const depois = (await api('GET', '/api/estado')).modulos;
    console.log(`9b comandos: persiana ${antes} -> ${depois.residencial.dados.persiana}; irrigação ${depois.economia.dados.irrigacao}, bomba ${depois.economia.dados.bomba}`);
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA_TMP, '09b-economia-controle.png') });
    await resumo(pagina, 'área economia (controle)');
    await ctx.close();
  },

  async 10() {
    const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
    await api('POST', '/api/admin/rede', { nome: 'SMART-CANADA-2050', senha: 'senha-de-exemplo' }, admin);
    const { ctx, pagina } = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    await pagina.getByRole('button', { name: 'Celular' }).click();
    await pagina.waitForSelector('.qr-imagem svg');
    await espera(400);
    await pagina.screenshot({ path: join(PASTA, '10-qr.png') });
    await ctx.close();
  },

  async 11() {
    // Dois "ESP32" mandam leituras para aparecer na lista de vistos (no demo os dados são ignorados).
    for (const modulo of ['energia', 'centro']) await api('POST', '/api/esp/leitura', { modulo, chave: config.chaveModulos, dados: {} });
    const { ctx, pagina } = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    await entrarPelaTela(pagina, CODIGOS.administracao);
    await pagina.getByRole('button', { name: 'Admin' }).click();
    await pagina.waitForSelector('.admin-ip');
    await pagina.getByRole('button', { name: 'Testar comandos' }).click();
    await pagina.waitForFunction(() => document.querySelectorAll('.admin-teste li[data-tom="ok"]').length === 5, null, { timeout: 8000 });
    await espera(500);
    await pagina.screenshot({ path: join(PASTA, '11-administracao.png') });
    const [download] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 8000 }),
      pagina.getByRole('button', { name: 'Exportar histórico (CSV)' }).click(),
    ]);
    console.log(`11 administração: teste de comandos ok nas 5 áreas; CSV baixado: ${download.suggestedFilename()}`);
    await download.saveAs(join(PASTA_TMP, download.suggestedFilename()));
    await pagina.evaluate(() => document.querySelector('.dialogo-corpo').scrollTo(0, 99999));
    await espera(300);
    await pagina.screenshot({ path: join(PASTA_TMP, '11-administracao-fim.png') });
    // Menu com administração: o botão Admin só existe para esse papel
    await pagina.keyboard.press('Escape');
    await espera(300);
    await pagina.screenshot({ path: join(PASTA_TMP, '11-menu-admin.png'), clip: { x: 0, y: 0, width: 140, height: 1080 } });
    await ctx.close();
  },

  // ---------------------------------------------------------------------------
  // F4: mapa 3D com painel. Os dados vêm de leituras de teste (modo real), para controlar cada valor.
  // ---------------------------------------------------------------------------

  async 1() {
    const { ctx, pagina, tresD } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA, '01-cidade.png') });
    const fps = await pagina.evaluate(() => +window.__app.cena.fps().toFixed(1));
    const etiquetas = await pagina.locator('.etiqueta').count();
    const canvas = await pagina.locator('.mapa-palco canvas').count();
    console.log(`1  3D, cidade (visitante, modo demo; pílula="${await pagina.locator('.pilula-modo').innerText()}"): canvas=${canvas}; etiquetas=${etiquetas}; three.js baixado: ${tresD() ? 'sim' : 'NÃO (errado)'}; fps=${fps}`);
    await resumo(pagina, 'cidade 3D');
    const comandosVisiveis = await pagina.locator('.faixa-comandos:visible, .cmd-nota').count();
    console.log(`   comandos ou avisos de login visíveis para o visitante: ${comandosVisiveis}`);
    // Texto das etiquetas: nunca menor que 20 px
    const tam = await pagina.evaluate(() => [...document.querySelectorAll('.etq-nome')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
    console.log(`   letra das etiquetas: ${tam.join(', ')} px`);
    const r = await pagina.evaluate(() => window.__conferirPlanta?.());
    console.log(`   conferência com a planta dentro da página: ${r ? (r.ok ? 'tudo bate' : r.falhas.join('; ')) : 'não carregou'}`);
    await ctx.close();
  },

  async 2() {
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await entrarPelaTela(pagina, CODIGOS.controle);
    // Clique de verdade no bloco da Energia, no mapa.
    const alvo = await pontoNaTela(pagina, 10, 0.8, 9);
    await pagina.mouse.move(alvo.x, alvo.y);
    await espera(300);
    const cursor = await pagina.evaluate(() => document.querySelector('.mapa-palco canvas').style.cursor);
    await pagina.mouse.click(alvo.x, alvo.y);
    await espera(1700); // 1 s de voo mais folga
    await pagina.screenshot({ path: join(PASTA, '02-energia-controle.png') });
    const hash = await pagina.evaluate(() => location.hash);
    const titulo = await pagina.locator('.topo-titulo').innerText();
    console.log(`2  clique no bloco da Energia: cursor=${cursor}; endereço=${hash}; título="${titulo}"; painel mostra detalhe=${await pagina.locator('.painel3d .detalhe').count()}`);
    await resumo(pagina, 'Energia (controle)');
    // Esc volta; clique em outra área pelo cartão do painel.
    await pagina.keyboard.press('Escape');
    await espera(1500);
    console.log(`   Esc: endereço=${await pagina.evaluate(() => location.hash)}`);
    await pagina.screenshot({ path: join(PASTA_TMP, '02-depois-do-esc.png') });
    await pagina.locator('.painel3d .tile.area-residencial').click();
    await espera(1700);
    console.log(`   cartão da Residencial: endereço=${await pagina.evaluate(() => location.hash)}; comandos=${await pagina.locator('.painel3d .cmd-botoes .botao').count()}`);
    await pagina.screenshot({ path: join(PASTA_TMP, '02-residencial-controle.png') });
    await resumo(pagina, 'Residencial (controle)');
    await ctx.close();
  },

  async 3() {
    app.simulador.silenciar('mobilidade', true);
    await espera(8000); // passam os 6 s e a Mobilidade fica sem sinal
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await irPara(pagina, 'mobilidade');
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA, '03-mobilidade-sem-sinal.png') });
    const sinal = (await api('GET', '/api/estado')).modulos.mobilidade.sinal;
    console.log(`3  Mobilidade (visitante): sinal no servidor=${sinal}; pílula na tela="${await pagina.locator('.painel3d .indicador').first().innerText()}"`);
    await resumo(pagina, 'Mobilidade sem sinal');
    await irPara(pagina, 'cidade');
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA_TMP, '03-cidade-com-sem-sinal.png') });
    app.simulador.silenciar('mobilidade', false);
    await ctx.close();
  },

  async 4() {
    await alimentar({ centro: { postes: 'ligados' } });
    const { ctx, pagina } = await abrir('/?debug=1&luz=noite', { width: 1920, height: 1080 });
    await espera(2500); // a transição para a noite leva 1,2 s
    await pagina.screenshot({ path: join(PASTA, '04-noite.png') });
    console.log('4  modo noite, postes ligados');
    await resumo(pagina, 'noite');
    // Postes em "automático": só acendem à noite.
    await alimentar({ centro: { postes: 'automatico' } });
    await espera(2500);
    await pagina.screenshot({ path: join(PASTA_TMP, '04-noite-automatico.png') });
    await pagina.evaluate(() => window.__app.ambiente.definirModo('dia'));
    await espera(2200);
    await pagina.screenshot({ path: join(PASTA_TMP, '04-dia-automatico.png') });
    await ctx.close();
  },

  async 5() {
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia&sensores=1', { width: 1920, height: 1080 });
    await espera(1200);
    // Passa o mouse sobre o marcador S10 (umidade do solo).
    const s10 = await pontoNaTela(pagina, 97, 0.8 + 6.4, 23);
    await pagina.mouse.move(s10.x, s10.y);
    await espera(900);
    await pagina.screenshot({ path: join(PASTA, '05-sensores.png') });
    const dica = await pagina.locator('.sensor-dica:visible').innerText().catch(() => '(sem dica)');
    console.log(`5  sensores: ${await pagina.locator('.sensor-rotulo:visible').count()} marcadores com rótulo; dica ao passar o mouse em S10: ${dica.replace(/\n/g, ' | ')}`);
    await resumo(pagina, 'sensores');
    const menor = await pagina.evaluate(() => Math.min(...[...document.querySelectorAll('.sensor-rotulo')].filter((e) => !e.hidden).map((e) => parseFloat(getComputedStyle(e).fontSize))));
    console.log(`   menor letra dos rótulos de sensor: ${menor} px`);
    await ctx.close();
  },

  async 6() {
    await alimentar({ economia: { reservatorio_pct: 14, bomba: true, irrigacao: 'manual', umidade_solo_pct: 24 } });
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await entrarPelaTela(pagina, CODIGOS.controle);
    await irPara(pagina, 'economia');
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA, '06-economia-bomba.png') });
    console.log(`6  Economia Circular: bomba ligada e reservatório 14%; alerta na tela="${(await pagina.locator('.painel3d .reserva-rotulo, .painel3d .stat').allInnerTexts()).join(' / ').replace(/\n/g, ' ')}"`);
    await resumo(pagina, 'Economia (bomba, reservatório baixo)');
    await ctx.close();
  },

  // Extras do 3D: desativado, residencial animada, trem, quedas de qualidade e falta de WebGL.
  async 12() {
    const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
    await alimentar({ residencial: { aquecimento: true, presenca: true, persiana: 'fechada', iluminacao: 'ligada' }, mobilidade: { trem: 'em movimento' }, centro: { vagas_livres: 1, semaforo: 'vermelho' } });
    await api('POST', '/api/admin/modulo', { modulo: 'economia', ativo: false }, admin);
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await espera(1500);
    await pagina.screenshot({ path: join(PASTA_TMP, '12-desativado-e-casa.png') });
    await resumo(pagina, 'cidade 3D com Economia desativada');
    await irPara(pagina, 'residencial');
    await espera(1700);
    await pagina.screenshot({ path: join(PASTA_TMP, '12-residencial.png') });
    await irPara(pagina, 'mobilidade');
    await espera(1700);
    await pagina.screenshot({ path: join(PASTA_TMP, '12-mobilidade-trem.png') });
    await irPara(pagina, 'centro');
    await espera(1700);
    await pagina.screenshot({ path: join(PASTA_TMP, '12-centro.png') });
    await irPara(pagina, 'energia');
    await espera(1700);
    await pagina.screenshot({ path: join(PASTA_TMP, '12-energia.png') });
    await api('POST', '/api/admin/modulo', { modulo: 'economia', ativo: true }, admin);
    await ctx.close();
  },

  // Ligações dos dados com a cena: manda valores conhecidos e lê o estado dos objetos 3D.
  async 15() {
    const lerCena = (pagina) => pagina.evaluate(() => {
      const { cena } = window.__app;
      const o = cena.objetos;
      const cor = (m) => m.color.getHexString();
      return {
        rotorZ: o.energia.rotor.rotation.z,
        carros: o.centro.carros.filter((c) => c.visible).length,
        luzes: Object.fromEntries(Object.entries(o.centro.luzes).map(([k, l]) => [k, cor(l.mat)])),
        aguaEscala: o.economia.agua.scale.y,
        gotas: o.economia.gotas.visible,
        persiana: o.residencial.persiana.scale.y,
        boneco: o.residencial.boneco.visible,
        ledPostes: cena.postes.halos.visible,
        tremX: o.mobilidade.trem.position.x,
        mapaDesativado: !!cena.base.blocos.economia.laje.material.map,
      };
    });
    const falhas = [];
    const confere = (nome, ok, detalhe) => { console.log(`   ${ok ? 'ok' : 'FALHOU'}: ${nome}${detalhe ? ` (${detalhe})` : ''}`); if (!ok) falhas.push(nome); };

    await alimentar({
      energia: { eolica_w: 5 }, centro: { postes: 'desligados', semaforo: 'vermelho', vagas_livres: 1 },
      economia: { reservatorio_pct: 30, bomba: true }, residencial: { persiana: 'fechada', presenca: true },
      mobilidade: { trem: 'em movimento' },
    });
    const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: 1920, height: 1080 });
    await espera(2500);
    const a1 = await lerCena(pagina);
    await espera(600);
    const a2 = await lerCena(pagina);
    console.log('15 ligações dos dados com a cena (dia):');
    confere('turbina gira com eolica_w = 5', Math.abs(a2.rotorZ - a1.rotorZ) > 0.5, `${(a1.rotorZ - a2.rotorZ).toFixed(2)} rad em 0,6 s`);
    confere('carros nas vagas = 4 menos vagas_livres (3)', a1.carros === 3, `${a1.carros}`);
    confere('semáforo vermelho aceso e verde apagado', a1.luzes.vermelho !== a1.luzes.verde && a1.luzes.vermelho === 'd9534b', JSON.stringify(a1.luzes));
    confere('água do reservatório em 30%', Math.abs(a2.aguaEscala - 3.3 * 0.3) < 0.15, a2.aguaEscala.toFixed(2));
    confere('gotas visíveis com a bomba ligada', a1.gotas === true);
    confere('persiana fechada (escala 1)', a1.persiana > 0.9, a1.persiana.toFixed(2));
    confere('bonequinho aparece com presenca', a1.boneco === true);
    confere('LEDs dos postes apagados (postes desligados, de dia)', a1.ledPostes === false);
    confere('trem se mexe em "em movimento"', Math.abs(a2.tremX - a1.tremX) > 5, `${(a2.tremX - a1.tremX).toFixed(1)} cm em 0,6 s`);

    await alimentar({ centro: { postes: 'ligados', vagas_livres: 4, semaforo: 'verde' }, residencial: { persiana: 'aberta', presenca: false }, economia: { bomba: false }, mobilidade: { trem: 'na estacao' }, energia: { eolica_w: 0 } });
    await espera(5000);
    const b = await lerCena(pagina);
    await espera(700);
    const b2 = await lerCena(pagina);
    confere('LEDs dos postes acesos (postes ligados)', b.ledPostes === true);
    confere('nenhum carro com 4 vagas livres', b.carros === 0, `${b.carros}`);
    confere('persiana aberta (recolhida)', b.persiana < 0.2, b.persiana.toFixed(2));
    confere('bonequinho some sem presenca', b.boneco === false);
    confere('gotas somem com a bomba desligada', b.gotas === false);
    confere('trem para na plataforma (x = 77)', Math.abs(b.tremX - 77) < 0.5, b.tremX.toFixed(1));
    confere('turbina parada com eolica_w = 0', Math.abs(b2.rotorZ - b.rotorZ) < 0.3, `${(b.rotorZ - b2.rotorZ).toFixed(2)} rad`);

    // Sem sinal: tudo da área para.
    await alimentar({ energia: { eolica_w: 6 }, mobilidade: { trem: 'em movimento' } });
    await espera(3000);
    await alimentar({ energia: { eolica_w: 6 }, mobilidade: { trem: 'em movimento' } }, ['energia', 'mobilidade']);
    await espera(10000);
    const c1 = await lerCena(pagina);
    await espera(700);
    const c2 = await lerCena(pagina);
    confere('turbina para quando a Energia fica sem sinal', Math.abs(c2.rotorZ - c1.rotorZ) < 0.3, `${(c1.rotorZ - c2.rotorZ).toFixed(2)} rad`);
    confere('trem para quando a Mobilidade fica sem sinal', Math.abs(c2.tremX - c1.tremX) < 0.5, `${(c2.tremX - c1.tremX).toFixed(2)} cm`);

    // Desativado: listras na Economia.
    const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
    await api('POST', '/api/admin/modulo', { modulo: 'economia', ativo: false }, admin);
    await espera(2500);
    const d = await lerCena(pagina);
    confere('bloco da Economia ganha listras ao ser desativado', d.mapaDesativado === true);
    await api('POST', '/api/admin/modulo', { modulo: 'economia', ativo: true }, admin);

    // Noite com postes em automático.
    await alimentar({ centro: { postes: 'automatico' } });
    await pagina.evaluate(() => window.__app.ambiente.definirModo('dia'));
    await espera(2500);
    const dia = await lerCena(pagina);
    await pagina.evaluate(() => window.__app.ambiente.definirModo('noite'));
    await espera(2500);
    const noite = await lerCena(pagina);
    confere('postes em automático: apagados de dia e acesos à noite', dia.ledPostes === false && noite.ledPostes === true);
    await ctx.close();
    if (falhas.length) problemas.push(`ligações dos dados: ${falhas.join('; ')}`);
  },


  // Telas menores (A2): 1366 x 768 e 1280 x 720. Sem rolagem de página; o painel rola por dentro; o mapa continua visível.
  async 16() {
    for (const [w, h, nome] of [[1366, 768, '1366x768'], [1280, 720, '1280x720']]) {
      const { ctx, pagina } = await abrir('/?debug=1&luz=dia', { width: w, height: h });
      await espera(1500);
      await pagina.screenshot({ path: join(PASTA, `16-${nome}-cidade.png`) });
      const medir = () => pagina.evaluate(() => {
        const c = document.querySelector('.mapa-palco canvas').getBoundingClientRect();
        const p = document.querySelector('.painel3d');
        const menu = document.querySelector('.menu');
        const ultimo = menu.querySelector('.menu-base').lastElementChild.getBoundingClientRect();
        return { mapa: `${Math.round(c.width)}x${Math.round(c.height)}`, painelRola: p.scrollHeight > p.clientHeight + 1, menuCabe: ultimo.bottom <= window.innerHeight, controlesCabem: document.querySelector('.mapa-controles').getBoundingClientRect().bottom <= window.innerHeight };
      });
      console.log(`16 ${nome} cidade: ${JSON.stringify(await medir())}`);
      await resumo(pagina, `${nome} cidade`);
      await entrarPelaTela(pagina, CODIGOS.controle);
      await irPara(pagina, 'residencial');
      await espera(1500);
      await pagina.screenshot({ path: join(PASTA, `16-${nome}-area-controle.png`) });
      console.log(`   ${nome} Residencial (controle): ${JSON.stringify(await medir())}`);
      await resumo(pagina, `${nome} Residencial (controle)`);
      await ctx.close();
    }
    // Abaixo de 1280 de largura entram os cartões (sem aviso); ?modo=3d força o 3D.
    const estreita = await abrir('/', { width: 1100, height: 700 });
    console.log(`   1100x700: layout=${await estreita.pagina.evaluate(() => document.getElementById('app').className)}`);
    await estreita.ctx.close();
    const forcada = await abrir('/?debug=1&qualidade=baixa', { width: 1920, height: 1080 });
    console.log(`   ?qualidade=baixa: qualidade da cena=${await forcada.pagina.evaluate(() => window.__app.cena.qualidade)}; botão marcado=${await forcada.pagina.locator('.seg-botao[aria-pressed="true"]').allInnerTexts()}`);
    await forcada.ctx.close();
    const forcado3d = await abrir('/?modo=3d', { width: 1100, height: 700 });
    console.log(`   ?modo=3d em 1100x700: layout=${await forcado3d.pagina.evaluate(() => document.getElementById('app').className)}`);
    await forcado3d.ctx.close();
  },

  // Sem WebGL: entra o modo cartões com o aviso.
  async 13() {
    const sem = await chromium.launch({ args: ['--disable-gpu', '--disable-3d-apis', '--disable-webgl', '--disable-webgl2'] });
    const ctx = await sem.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    const erros = [];
    pagina.on('pageerror', (e) => erros.push(e.message));
    await pagina.goto(`${BASE}/`);
    await pagina.waitForFunction(() => document.querySelector('.tile[data-sinal]'), null, { timeout: 15_000 });
    await espera(800);
    await pagina.screenshot({ path: join(PASTA_TMP, '13-sem-webgl.png') });
    const aviso = await pagina.locator('.aviso-flutuante').innerText().catch(() => '(sem aviso)');
    console.log(`13 sem WebGL: layout=${await pagina.evaluate(() => document.getElementById('app').className)}; aviso="${aviso}"; erros de página=${erros.length}`);
    await sem.close();
  },

  // Sem placa de vídeo (software) e CPU 4x mais lenta: o mapa fica lento, a qualidade cai Alta -> Média -> Baixa
  // e, se nem a Baixa passar de 24 quadros por segundo por 8 s, entram os cartões com o botão "Tentar o 3D de novo".
  async 14() {
    const soft = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const ctx = await soft.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    const cdp = await ctx.newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const t0 = Date.now();
    await pagina.goto(`${BASE}/?debug=1&luz=dia`);
    await pagina.waitForFunction(() => window.__app, null, { timeout: 90_000 });
    const linha = [];
    let ultimaQ = '';
    let cartoes = false;
    while (Date.now() - t0 < 180_000) {
      await espera(2000);
      cartoes = (await pagina.evaluate(() => document.getElementById('app').className)).includes('layout-cartoes');
      if (cartoes) { linha.push(`${Math.round((Date.now() - t0) / 1000)}s: CARTÕES`); break; }
      const est = await pagina.evaluate(() => ({ q: window.__app.cena.qualidade, f: window.__app.cena.fps().toFixed(0) }));
      if (est.q !== ultimaQ) { linha.push(`${Math.round((Date.now() - t0) / 1000)}s: ${est.q} (${est.f} fps)`); ultimaQ = est.q; if (est.q === 'media') await pagina.screenshot({ path: join(PASTA_TMP, '14-media.png') }); }
    }
    console.log(`14 sem placa de vídeo e CPU 4x mais lenta, 1920x1080: ${linha.join(' -> ')}`);
    if (cartoes) {
      const aviso = await pagina.locator('.aviso-flutuante').innerText().catch(() => '(sem aviso)');
      const botao = await pagina.getByRole('button', { name: 'Tentar o 3D de novo' }).count();
      console.log(`   aviso="${aviso.replace(/\s+/g, ' ')}"; botão "Tentar o 3D de novo": ${botao}`);
      await pagina.screenshot({ path: join(PASTA_TMP, '14-cartoes-depois-da-queda.png') });
      await pagina.reload();
      await pagina.waitForFunction(() => document.querySelector('.tile[data-sinal]'), null, { timeout: 30_000 });
      console.log(`   recarregando a página na mesma sessão: layout=${await pagina.evaluate(() => document.getElementById('app').className)}; aviso com botão=${await pagina.getByRole('button', { name: 'Tentar o 3D de novo' }).count()}`);
      await pagina.getByRole('button', { name: 'Tentar o 3D de novo' }).click();
      await pagina.waitForFunction(() => document.getElementById('app').className.includes('layout-3d'), null, { timeout: 60_000 });
      console.log(`   depois de "Tentar o 3D de novo": layout=${await pagina.evaluate(() => document.getElementById('app').className)}; endereço=${await pagina.evaluate(() => location.search)}`);
    } else problemas.push('captura 14: os cartões não entraram em 180 s');
    await soft.close();
  },

  // Conferência sem captura: com o SSE bloqueado, a tela continua atualizando por polling.
  async 98() {
    const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 } });
    const pagina = await ctx.newPage();
    await pagina.route('**/api/eventos', (r) => r.abort());
    let estados = 0;
    pagina.on('response', (r) => { if (r.url().endsWith('/api/estado')) estados += 1; });
    await pagina.goto(`${BASE}/?modo=cartoes`);
    await pagina.waitForFunction(() => document.querySelector('.tile[data-sinal]'), null, { timeout: 10_000 });
    const antes = await pagina.locator('.destaque .dn-valor').first().innerText();
    await espera(4500);
    console.log(`98 SSE bloqueado: ${estados} buscas em /api/estado em uns 5 s; bateria ${antes.replace(/\s+/g, '')} -> ${(await pagina.locator('.destaque .dn-valor').first().innerText()).replace(/\s+/g, '')}`);
    await ctx.close();
  },

  // Extras: sem sinal, desativado e alerta, no PC e no celular.
  async 99() {
    const admin = (await api('POST', '/api/login', { codigo: CODIGOS.administracao })).token;
    await api('POST', '/api/admin/modulo', { modulo: 'mobilidade', ativo: false }, admin);
    app.simulador.silenciar('residencial', true);
    await espera(7500);
    const { ctx, pagina } = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    await pagina.screenshot({ path: join(PASTA_TMP, 'extra-sem-sinal-desativado.png') });
    await resumo(pagina, 'cidade com sem sinal e desativado');
    await irPara(pagina, 'residencial');
    await pagina.screenshot({ path: join(PASTA_TMP, 'extra-area-sem-sinal.png') });
    await ctx.close();
    const cel = await abrir('/?modo=celular', { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
    await cel.pagina.screenshot({ path: join(PASTA_TMP, 'extra-celular-sem-sinal.png'), fullPage: true });
    await cel.ctx.close();
    app.simulador.silenciar('residencial', false);
    await api('POST', '/api/admin/modulo', { modulo: 'mobilidade', ativo: true }, admin);
  },

  async 17() {
    // G1: campo "teste". Primeiro todos os módulos mandam "teste": true (pílula "Teste", selos nos cartões);
    // depois só a Energia manda (pílula "Ao vivo" porque as outras 4 leituras são de sensor ligado).
    const todos = Object.fromEntries(Object.keys(BASE_DADOS).map((m) => [m, { teste: true }]));
    await alimentar(todos);
    await espera(2200);
    const lerPilula = (p) => p.locator('.pilula-modo').first().textContent().then((t) => t.trim());
    const contarSelos = (p) => p.locator('.selo-teste:visible').count();
    const a = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    console.log(`17 todos de teste: pílula="${await lerPilula(a.pagina)}" selos visíveis=${await contarSelos(a.pagina)}`);
    await a.pagina.screenshot({ path: join(PASTA, '17-teste-todos.png') });
    await resumo(a.pagina, 'cidade, todos de teste');
    await irPara(a.pagina, 'economia');
    console.log(`   página da área: selos visíveis=${await contarSelos(a.pagina)}`);
    await a.pagina.screenshot({ path: join(PASTA_TMP, '17-teste-area.png') });
    await resumo(a.pagina, 'área, teste');
    await a.ctx.close();
    await alimentar({ energia: { teste: true } });
    await espera(2200);
    const b = await abrir('/?modo=cartoes', { width: 1920, height: 1080 });
    console.log(`17 só a Energia de teste: pílula="${await lerPilula(b.pagina)}" selos visíveis=${await contarSelos(b.pagina)}`);
    await b.pagina.screenshot({ path: join(PASTA_TMP, '17-teste-so-energia.png') });
    await b.ctx.close();
    await alimentar(todos);
    await espera(2200);
    const c = await abrir('/', { width: 1920, height: 1080 });
    await espera(1500);
    console.log(`17 mapa 3D, todos de teste: pílula="${await lerPilula(c.pagina)}" selos visíveis=${await contarSelos(c.pagina)}`);
    await c.pagina.screenshot({ path: join(PASTA_TMP, '17-teste-3d.png') });
    await resumo(c.pagina, 'mapa 3D, teste');
    await irPara(c.pagina, 'energia');
    await espera(1500);
    console.log(`   3D, página Energia: selos visíveis=${await contarSelos(c.pagina)}`);
    await c.pagina.screenshot({ path: join(PASTA_TMP, '17-teste-3d-energia.png') });
    await c.ctx.close();
  },
};

try {
  await espera(2500); // o simulador manda as primeiras leituras
  for (const [n, fn] of Object.entries(CAPTURAS)) {
    if (pedidos.length && !pedidos.includes(n)) continue;
    try {
      // As capturas oficiais 1, 2, 3 e 5 ficam em modo demo (pílula "Demonstração"). A 4 e a 6 precisam de valores
      // forçados (postes ligados, reservatório baixo): usam leituras de teste no modo real, e a pílula "Ao vivo" é
      // verdadeira nelas porque há leituras chegando (de um ESP32 de mentira).
      if (['4', '6', '12', '13', '14', '15', '17'].includes(n)) await alimentar(); else await modoDemo();
      await fn();
    } catch (e) { problemas.push(`captura ${n}: ${e.message.split('\n')[0]}`); }
  }
} finally {
  await navegador.close();
  await app.encerrar();
  rmSync(temp, { recursive: true, force: true });
}
console.log(problemas.length ? `PROBLEMAS:\n- ${problemas.join('\n- ')}` : 'Sem erros no console.');
console.log(`Capturas em ${PASTA}`);
process.exit(problemas.length ? 1 : 0);
