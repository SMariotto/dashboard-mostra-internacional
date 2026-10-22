// Testes do servidor pela API HTTP (SPEC seção 10, mais o histórico em arquivo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarApp } from '../servidor/index.js';

const PADRAO = JSON.parse(readFileSync(new URL('../config/padrao.json', import.meta.url), 'utf8'));
const CODIGOS = { controle: 'codigo-controle-teste', administracao: 'codigo-admin-teste' };
const CHAVE = 'chave-dos-testes';
const DADOS_ENERGIA = { bateria_pct: 64, bateria_v: 12.1, solar_w: 4, eolica_w: 2, consumo_w: 3 };

/** Sobe um servidor de teste numa porta livre, com relógio controlado e pastas temporárias. */
async function montar({ config = {}, pastaDados, t0 = new Date(2026, 9, 20, 12, 0, 0).getTime() } = {}) {
  const pasta = mkdtempSync(join(tmpdir(), 'smart-canada-teste-'));
  mkdirSync(join(pasta, 'publico'));
  writeFileSync(join(pasta, 'publico', 'index.html'), '<p>painel</p>');
  writeFileSync(join(pasta, 'segredo.txt'), 'NAO DEVE SAIR');
  let t = t0;
  const relogio = { agora: () => t, avancar: (ms) => { t += ms; } };
  const app = criarApp(
    { ...PADRAO, codigos: CODIGOS, chaveModulos: CHAVE, modo: 'real', ...config },
    {
      agora: relogio.agora,
      pastaPublico: join(pasta, 'publico'),
      pastaDados: pastaDados ?? join(pasta, 'dados'),
      arquivoLocal: join(pasta, 'local.json'),
      semTimers: true,
      atrasoSimuladorMs: 5,
    },
  );
  await new Promise((ok) => app.servidor.listen(0, '127.0.0.1', ok));
  const porta = app.servidor.address().port;
  const base = `http://127.0.0.1:${porta}`;

  async function pedir(metodo, caminho, corpo, token) {
    const headers = {};
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(base + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) });
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* não é JSON */ }
    return { status: r.status, json, texto, tipo: r.headers.get('content-type') };
  }

  /** Pedido cru, sem o fetch normalizar o caminho. */
  function cru(caminho) {
    return new Promise((ok, falha) => {
      const req = request({ host: '127.0.0.1', port: porta, path: caminho, method: 'GET' }, (res) => {
        let corpo = '';
        res.on('data', (c) => { corpo += c; });
        res.on('end', () => ok({ status: res.statusCode, corpo }));
      });
      req.on('error', falha);
      req.end();
    });
  }

  const login = async (codigo) => (await pedir('POST', '/api/login', { codigo })).json.token;
  const leitura = (modulo, dados, chave = CHAVE) => pedir('POST', '/api/esp/leitura', { modulo, chave, dados });

  async function fechar() {
    await app.encerrar();
    rmSync(pasta, { recursive: true, force: true });
  }
  return { app, pasta, relogio, pedir, cru, login, leitura, fechar };
}

test('login: código certo dá o papel, código errado dá 401', async () => {
  const s = await montar();
  try {
    const c = await s.pedir('POST', '/api/login', { codigo: CODIGOS.controle });
    assert.equal(c.status, 200);
    assert.equal(c.json.papel, 'controle');
    const a = await s.pedir('POST', '/api/login', { codigo: CODIGOS.administracao });
    assert.equal(a.json.papel, 'administracao');
    const e = await s.pedir('POST', '/api/login', { codigo: 'chute' });
    assert.equal(e.status, 401);
    assert.equal((await s.pedir('GET', '/api/sessao', undefined, a.json.token)).json.papel, 'administracao');
    await s.pedir('POST', '/api/logout', {}, a.json.token);
    assert.equal((await s.pedir('GET', '/api/sessao', undefined, a.json.token)).json.papel, 'visualizacao');
  } finally { await s.fechar(); }
});

test('login: token vence em 8 horas', async () => {
  const s = await montar();
  try {
    const token = await s.login(CODIGOS.controle);
    s.relogio.avancar(8 * 3600_000 + 1);
    assert.equal((await s.pedir('GET', '/api/sessao', undefined, token)).json.papel, 'visualizacao');
  } finally { await s.fechar(); }
});

test('login: 5 erros por IP bloqueiam por 5 minutos', async () => {
  const s = await montar();
  try {
    for (let i = 0; i < 5; i++) assert.equal((await s.pedir('POST', '/api/login', { codigo: `errado-${i}` })).status, 401);
    assert.equal((await s.pedir('POST', '/api/login', { codigo: CODIGOS.controle })).status, 429);
    s.relogio.avancar(5 * 60_000 + 1);
    assert.equal((await s.pedir('POST', '/api/login', { codigo: CODIGOS.controle })).status, 200);
  } finally { await s.fechar(); }
});

test('login desligado sem códigos de verdade ("troque-isto" não vale)', async () => {
  const s = await montar({ config: { codigos: { controle: 'troque-isto', administracao: 'troque-isto' } } });
  try {
    assert.equal((await s.pedir('POST', '/api/login', { codigo: 'troque-isto' })).status, 503);
    assert.equal((await s.pedir('GET', '/api/estado')).json.loginAtivo, false);
  } finally { await s.fechar(); }
});

test('comando: negado para visualização, aceito para controle; ping só para administração', async () => {
  const s = await montar();
  try {
    const pedido = { modulo: 'economia', comando: 'irrigacao', valor: 'agora' };
    assert.equal((await s.pedir('POST', '/api/comando', pedido)).status, 403);
    assert.equal((await s.pedir('POST', '/api/comando', pedido, 'token-falso')).status, 403);
    const controle = await s.login(CODIGOS.controle);
    const ok = await s.pedir('POST', '/api/comando', pedido, controle);
    assert.equal(ok.status, 200);
    assert.match(ok.json.id, /^c-/);
    assert.equal((await s.pedir('POST', '/api/comando', { ...pedido, valor: 'sempre' }, controle)).status, 400);
    assert.equal((await s.pedir('POST', '/api/comando', { modulo: 'energia', comando: 'ping', valor: 'teste' }, controle)).status, 403);
    const admin = await s.login(CODIGOS.administracao);
    assert.equal((await s.pedir('POST', '/api/comando', { modulo: 'energia', comando: 'ping', valor: 'teste' }, admin)).status, 200);
  } finally { await s.fechar(); }
});

test('administração desativa módulo: "desativado", leituras ignoradas, comandos recusados', async () => {
  const s = await montar();
  try {
    const controle = await s.login(CODIGOS.controle);
    assert.equal((await s.pedir('POST', '/api/admin/modulo', { modulo: 'economia', ativo: false }, controle)).status, 403);
    const admin = await s.login(CODIGOS.administracao);
    assert.equal((await s.pedir('POST', '/api/admin/modulo', { modulo: 'economia', ativo: false }, admin)).status, 200);
    const e = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(e.modulos.economia.sinal, 'desativado');
    const r = await s.leitura('economia', { umidade_solo_pct: 40, reservatorio_pct: 50, bomba: false });
    assert.equal(r.json.ignorada, 'desativado');
    assert.deepEqual((await s.pedir('GET', '/api/estado')).json.modulos.economia.dados, {});
    assert.equal((await s.pedir('POST', '/api/comando', { modulo: 'economia', comando: 'irrigacao', valor: 'agora' }, controle)).status, 409);
    await s.pedir('POST', '/api/admin/modulo', { modulo: 'economia', ativo: true }, admin);
    assert.equal((await s.pedir('GET', '/api/estado')).json.modulos.economia.sinal, 'sem_sinal');
  } finally { await s.fechar(); }
});

test('validação do contrato: campo fora da faixa ou com tipo errado é ignorado sozinho', async () => {
  const s = await montar();
  try {
    const r = await s.leitura('energia', { ...DADOS_ENERGIA, bateria_pct: 140, solar_w: '4', inventado: 1 });
    assert.equal(r.status, 200);
    assert.equal(r.json.avisos.length, 3);
    const d = (await s.pedir('GET', '/api/estado')).json.modulos.energia.dados;
    assert.equal(d.bateria_pct, undefined);
    assert.equal(d.solar_w, undefined);
    assert.equal(d.bateria_v, 12.1);
    await s.leitura('centro', { postes: 'piscando', semaforo: 'verde', vagas_livres: 2.5 });
    const c = (await s.pedir('GET', '/api/estado')).json.modulos.centro.dados;
    assert.deepEqual(c, { semaforo: 'verde' });
  } finally { await s.fechar(); }
});

test('"sem sinal" depois de 6 s sem leitura', async () => {
  const s = await montar();
  try {
    await s.leitura('energia', DADOS_ENERGIA);
    let e = (await s.pedir('GET', '/api/estado')).json.modulos.energia;
    assert.equal(e.sinal, 'ok');
    assert.equal(e.dados.situacao, 'mais');
    s.relogio.avancar(6001);
    e = (await s.pedir('GET', '/api/estado')).json.modulos.energia;
    assert.equal(e.sinal, 'sem_sinal');
    assert.equal(e.dados.bateria_pct, 64); // o último valor continua lá
  } finally { await s.fechar(); }
});

test('fila de comandos: entregue uma vez, "executado" na confirmação, "sem_resposta" depois de 30 s', async () => {
  const s = await montar();
  try {
    const controle = await s.login(CODIGOS.controle);
    const id1 = (await s.pedir('POST', '/api/comando', { modulo: 'residencial', comando: 'persiana', valor: 'fechar' }, controle)).json.id;
    const r1 = await s.leitura('residencial', { persiana: 'aberta' });
    assert.deepEqual(r1.json.comandos.map((c) => c.id), [id1]);
    assert.equal(r1.json.comandos[0].valor, 'fechar');
    assert.deepEqual((await s.leitura('residencial', { persiana: 'aberta' })).json.comandos, []);
    assert.equal((await s.pedir('POST', '/api/esp/confirmacao', { modulo: 'residencial', chave: CHAVE, id: id1 })).status, 200);
    const c1 = (await s.pedir('GET', '/api/estado')).json.comandos.find((c) => c.id === id1);
    assert.equal(c1.situacao, 'executado');

    const id2 = (await s.pedir('POST', '/api/comando', { modulo: 'mobilidade', comando: 'demonstracao', valor: 'iniciar' }, controle)).json.id;
    s.relogio.avancar(30_001);
    s.app.fila.verificar();
    const c2 = (await s.pedir('GET', '/api/estado')).json.comandos.find((c) => c.id === id2);
    assert.equal(c2.situacao, 'sem_resposta');
    assert.deepEqual((await s.leitura('mobilidade', { trem: 'parado' })).json.comandos, []);
    assert.equal((await s.pedir('POST', '/api/esp/confirmacao', { modulo: 'mobilidade', chave: CHAVE, id: id2 })).status, 404);
  } finally { await s.fechar(); }
});

test('modo demo: o simulador obedece ao comando e confirma', async () => {
  const s = await montar({ config: { modo: 'demo' } });
  try {
    s.app.simulador.passo();
    const controle = await s.login(CODIGOS.controle);
    const id = (await s.pedir('POST', '/api/comando', { modulo: 'residencial', comando: 'persiana', valor: 'fechar' }, controle)).json.id;
    await new Promise((ok) => setTimeout(ok, 50));
    const e = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(e.comandos.find((c) => c.id === id).situacao, 'executado');
    assert.equal(e.modulos.residencial.dados.persiana, 'fechada');
    // Em demo, leitura de ESP32 de verdade é aceita mas não entra nos dados.
    assert.equal((await s.leitura('residencial', { persiana: 'aberta' })).json.ignorada, 'demo');
  } finally { await s.fechar(); }
});

test('leitura com chave errada é recusada', async () => {
  const s = await montar();
  try {
    const r = await s.leitura('energia', DADOS_ENERGIA, 'chave-errada');
    assert.equal(r.status, 401);
    assert.equal((await s.leitura('energia', DADOS_ENERGIA, null)).status, 401);
    assert.equal((await s.pedir('GET', '/api/estado')).json.modulos.energia.sinal, 'sem_sinal');
    assert.equal((await s.pedir('POST', '/api/esp/leitura', { modulo: 'lua', chave: CHAVE, dados: {} })).status, 400);
  } finally { await s.fechar(); }
});

test('JSON inválido e corpo grande não derrubam o servidor', async () => {
  const s = await montar();
  try {
    assert.equal((await s.pedir('POST', '/api/esp/leitura', '{isto não é json')).status, 400);
    assert.equal((await s.pedir('POST', '/api/login', '')).status, 400);
    assert.equal((await s.pedir('POST', '/api/comando', 'null')).status, 400);
    assert.equal((await s.pedir('POST', '/api/esp/leitura', JSON.stringify({ modulo: 'energia', x: 'a'.repeat(20_000) }))).status, 413);
    assert.equal((await s.pedir('GET', '/api/estado')).status, 200);
  } finally { await s.fechar(); }
});

test('arquivo fora de publico é recusado', async () => {
  const s = await montar();
  try {
    for (const caminho of ['/../segredo.txt', '/..%2fsegredo.txt', '/..%5csegredo.txt', '/%2e%2e/segredo.txt', '/assets/../../segredo.txt']) {
      const r = await s.cru(caminho);
      assert.ok(!r.corpo.includes('NAO DEVE SAIR'), `vazou com ${caminho}`);
      assert.ok([403, 404].includes(r.status) || r.corpo.includes('painel'), `${caminho}: ${r.status}`);
    }
    assert.equal((await s.cru('/')).corpo, '<p>painel</p>');
  } finally { await s.fechar(); }
});

test('rede: ESP32 vistos com IP e mensagens por minuto; rede do QR gravada pela administração', async () => {
  const s = await montar();
  try {
    await s.leitura('energia', DADOS_ENERGIA);
    await s.leitura('energia', DADOS_ENERGIA);
    const r = (await s.pedir('GET', '/api/rede')).json;
    assert.equal(r.esp.length, 1);
    assert.equal(r.esp[0].modulo, 'energia');
    assert.equal(r.esp[0].porMinuto, 2);
    assert.equal(r.rede.configurada, false);
    const admin = await s.login(CODIGOS.administracao);
    assert.equal((await s.pedir('POST', '/api/admin/rede', { nome: 'SMART-CANADA-2050', senha: 'senha-de-teste' }, admin)).status, 200);
    assert.equal((await s.pedir('GET', '/api/rede')).json.rede.nome, 'SMART-CANADA-2050');
    assert.equal(JSON.parse(readFileSync(join(s.pasta, 'local.json'), 'utf8')).rede.nome, 'SMART-CANADA-2050');
  } finally { await s.fechar(); }
});

test('modo real sem nenhum ESP32 por 30 s: sugere ligar o demo', async () => {
  const s = await montar();
  try {
    assert.equal((await s.pedir('GET', '/api/estado')).json.sugerirDemo, false);
    s.relogio.avancar(30_001);
    assert.equal((await s.pedir('GET', '/api/estado')).json.sugerirDemo, true);
    await s.leitura('energia', DADOS_ENERGIA);
    assert.equal((await s.pedir('GET', '/api/estado')).json.sugerirDemo, false);
  } finally { await s.fechar(); }
});

test('histórico em memória: /api/historico devolve os pontos', async () => {
  const s = await montar();
  try {
    await s.leitura('energia', DADOS_ENERGIA);
    s.app.estado.amostrarHistorico();
    s.relogio.avancar(2000);
    await s.leitura('energia', { ...DADOS_ENERGIA, bateria_pct: 65 });
    s.app.estado.amostrarHistorico();
    const r = (await s.pedir('GET', '/api/historico?modulo=energia&campo=bateria_pct')).json;
    assert.deepEqual(r.pontos.map((p) => p.v), [64, 65]);
    assert.equal((await s.pedir('GET', '/api/historico?modulo=energia&campo=geracao_w')).json.pontos[0].v, 6);
    assert.equal((await s.pedir('GET', '/api/historico?modulo=energia&campo=nada')).status, 400);
  } finally { await s.fechar(); }
});

test('histórico em arquivo: grava uma linha JSON por módulo "ok" em dados/historico-AAAA-MM-DD.jsonl', async () => {
  const s = await montar();
  try {
    await s.leitura('energia', DADOS_ENERGIA);
    await s.leitura('centro', { postes: 'ligados', semaforo: 'verde', vagas_livres: 3 });
    assert.equal(s.app.gravarHistorico(), 2);
    const arquivo = join(s.pasta, 'dados', 'historico-2026-10-20.jsonl');
    const linhas = readFileSync(arquivo, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(linhas.map((l) => l.modulo), ['energia', 'centro']);
    assert.equal(linhas[0].dados.bateria_pct, 64);
    assert.equal(linhas[0].modo, 'real');
    assert.ok(!Number.isNaN(Date.parse(linhas[0].hora)));
    s.relogio.avancar(10_000);
    s.app.gravarHistorico(); // 10 s sem leitura: os dois estão "sem sinal" e nada é gravado
    assert.equal(readFileSync(arquivo, 'utf8').trim().split('\n').length, 2, 'sem sinal não grava');
  } finally { await s.fechar(); }
});

test('histórico em arquivo: ao ligar, relê os últimos 10 minutos do arquivo do dia', async () => {
  const pastaDados = mkdtempSync(join(tmpdir(), 'smart-canada-dados-'));
  try {
    const t0 = new Date(2026, 9, 20, 12, 0, 0).getTime();
    const a = await montar({ pastaDados, t0 });
    await a.leitura('energia', DADOS_ENERGIA);
    a.app.gravarHistorico(); // 12:00:00
    a.relogio.avancar(5 * 60_000);
    await a.leitura('energia', { ...DADOS_ENERGIA, bateria_pct: 70 });
    a.app.gravarHistorico(); // 12:05:00
    await a.fechar();

    // Liga de novo às 12:12: a linha das 12:00 já tem mais de 10 min; a das 12:05 volta.
    const b = await montar({ pastaDados, t0: t0 + 12 * 60_000 });
    try {
      assert.equal(b.app.inicio.relidas, 1);
      assert.deepEqual(b.app.estado.historico('energia', 'bateria_pct').map((p) => p.v), [70]);
      const r = (await b.pedir('GET', '/api/historico?modulo=energia&campo=bateria_pct')).json;
      assert.equal(r.pontos.length, 1);
    } finally { await b.fechar(); }
  } finally { rmSync(pastaDados, { recursive: true, force: true }); }
});

test('histórico em arquivo: ligar o servidor não apaga nenhum arquivo, nem os antigos', async () => {
  const pastaDados = mkdtempSync(join(tmpdir(), 'smart-canada-dados-'));
  try {
    const nomes = ['historico-2026-01-05.jsonl', 'historico-2026-10-12.jsonl', 'historico-2026-10-20.jsonl', 'historico-velho.jsonl', 'outro.txt'];
    for (const nome of nomes) writeFileSync(join(pastaDados, nome), '');
    const s = await montar({ pastaDados });
    try {
      assert.deepEqual(readdirSync(pastaDados).sort(), [...nomes].sort());
    } finally { await s.fechar(); }
    assert.deepEqual(readdirSync(pastaDados).sort(), [...nomes].sort());
  } finally { rmSync(pastaDados, { recursive: true, force: true }); }
});

test('CSV do histórico: só com token de administração', async () => {
  const s = await montar();
  try {
    await s.leitura('energia', DADOS_ENERGIA);
    await s.leitura('economia', { umidade_solo_pct: 41.5, reservatorio_pct: 18, bomba: true });
    s.app.gravarHistorico();
    assert.equal((await s.pedir('GET', '/api/historico.csv?modulo=energia')).status, 403);
    const controle = await s.login(CODIGOS.controle);
    assert.equal((await s.pedir('GET', '/api/historico.csv?modulo=energia', undefined, controle)).status, 403);
    const admin = await s.login(CODIGOS.administracao);
    const r = await s.pedir('GET', '/api/historico.csv?modulo=economia', undefined, admin);
    assert.equal(r.status, 200);
    assert.match(r.tipo, /text\/csv/);
    const linhas = r.texto.replace(/^﻿/, '').trim().split('\r\n');
    assert.equal(linhas[0], 'hora;modulo;modo;umidade_solo_pct;reservatorio_pct;bomba;irrigacao;teste');
    assert.equal(linhas.length, 2);
    assert.match(linhas[1], /^2026-10-20 12:00:00;Economia Circular;real;41,5;18;sim;;$/);
    const todos = await s.pedir('GET', '/api/historico.csv', undefined, admin);
    assert.equal(todos.texto.trim().split('\r\n').length, 3);
    assert.equal((await s.pedir('GET', '/api/historico.csv?modulo=lua', undefined, admin)).status, 400);
    assert.ok(!existsSync(join(s.pasta, 'publico', 'dados')));
  } finally { await s.fechar(); }
});

test('modo real sem nenhum ESP32: os 5 módulos ficam "sem sinal" e sem dados; com uma leitura, só aquele fica "ok"', async () => {
  const s = await montar();
  try {
    const vazio = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(vazio.modo, 'real');
    for (const m of Object.values(vazio.modulos)) {
      assert.equal(m.sinal, 'sem_sinal');
      assert.deepEqual(m.dados, {});
    }
    await s.leitura('energia', DADOS_ENERGIA);
    const com = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(com.modulos.energia.sinal, 'ok');
    assert.equal(com.modulos.centro.sinal, 'sem_sinal');
  } finally { await s.fechar(); }
});

test('trocar de demo para real apaga os dados do simulador (nada de valor simulado como se fosse real)', async () => {
  const s = await montar({ config: { modo: 'demo' } });
  try {
    const admin = await s.login(CODIGOS.administracao);
    s.app.simulador.passo(); // o simulador manda as primeiras leituras
    const demo = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(demo.modo, 'demo');
    assert.ok(Object.values(demo.modulos).some((m) => Object.keys(m.dados).length > 0));
    await s.pedir('POST', '/api/admin/modo', { modo: 'real' }, admin);
    const real = (await s.pedir('GET', '/api/estado')).json;
    assert.equal(real.modo, 'real');
    for (const m of Object.values(real.modulos)) { assert.equal(m.sinal, 'sem_sinal'); assert.deepEqual(m.dados, {}); }
  } finally { await s.fechar(); }
});

test('modoInicial na configuração: o endereço puro vai para a tela escolhida; ?modo= e "auto" não redirecionam', async () => {
  const s = await montar({ config: { modoInicial: 'cartoes' } });
  try {
    const r = await fetch(`http://127.0.0.1:${s.app.servidor.address().port}/`, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), '/?modo=cartoes');
    const com = await fetch(`http://127.0.0.1:${s.app.servidor.address().port}/?modo=celular`, { redirect: 'manual' });
    assert.equal(com.status, 200);
  } finally { await s.fechar(); }
  const t = await montar({ config: { modoInicial: '3d' } });
  try {
    const r = await fetch(`http://127.0.0.1:${t.app.servidor.address().port}/`, { redirect: 'manual' });
    assert.equal(r.headers.get('location'), '/?modo=3d');
  } finally { await t.fechar(); }
  const u = await montar({ config: { modoInicial: 'auto' } });
  try {
    const r = await fetch(`http://127.0.0.1:${u.app.servidor.address().port}/`, { redirect: 'manual' });
    assert.equal(r.status, 200);
  } finally { await u.fechar(); }
});

test('campo "teste": o servidor valida o tipo, guarda e repassa no /api/estado', async () => {
  const s = await montar();
  try {
    const r = await s.leitura('economia', { umidade_solo_pct: 58, teste: true });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.avisos, []);
    const eco = (await s.pedir('GET', '/api/estado')).json.modulos.economia;
    assert.equal(eco.dados.teste, true);
    assert.equal(eco.dados.umidade_solo_pct, 58);
    // tipo errado: o campo é recusado com aviso e o resto é guardado
    const ruim = await s.leitura('energia', { ...DADOS_ENERGIA, teste: 'sim' });
    assert.equal(ruim.json.avisos.length, 1);
    assert.match(ruim.json.avisos[0], /energia\.teste: não é true ou false/);
    const en = (await s.pedir('GET', '/api/estado')).json.modulos.energia.dados;
    assert.equal('teste' in en, false);
    assert.equal(en.bateria_pct, 64);
  } finally { await s.fechar(); }
});

test('leitura do ESP32 substitui a anterior: sensor que parou de mandar volta a "--" e o selo de teste some', async () => {
  const s = await montar();
  try {
    await s.leitura('economia', { umidade_solo_pct: 58, reservatorio_pct: 66, bomba: false, irrigacao: 'automatico', teste: true });
    let d = (await s.pedir('GET', '/api/estado')).json.modulos.economia.dados;
    assert.equal(d.teste, true);
    assert.equal(d.reservatorio_pct, 66);
    // o grupo trocou MODO_TESTE para false e regravou: só os campos de verdade, sem "teste"
    await s.leitura('economia', { bomba: false, irrigacao: 'automatico' });
    d = (await s.pedir('GET', '/api/estado')).json.modulos.economia.dados;
    assert.deepEqual(d, { bomba: false, irrigacao: 'automatico' });
  } finally { await s.fechar(); }
});

test('"teste" aparece no CSV do histórico como coluna sim/não', async () => {
  const s = await montar();
  try {
    const admin = await s.login(CODIGOS.administracao);
    await s.leitura('economia', { umidade_solo_pct: 58, teste: true });
    s.app.gravarHistorico();
    const csv = (await s.pedir('GET', '/api/historico.csv', undefined, admin)).texto;
    assert.match(csv.split('\r\n')[0], /;teste/);
  } finally { await s.fechar(); }
});
