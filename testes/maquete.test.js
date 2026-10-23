// Confere a geometria de compartilhado/maquete.js contra as regras da planta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETE, BLOCOS, VIAS, POSTES, SENSORES, ARVORES, FAIXAS_PEDESTRE,
  ENERGIA, CENTRO, ECONOMIA, RESIDENCIAL, MOBILIDADE, FOTOS_22_10, buscarBloco, pontoDentro,
} from '../compartilhado/maquete.js';
import { IDS_MODULOS } from '../compartilhado/contrato.js';

const retDentro = (r, area) => r.x >= area.x && r.y >= area.y && r.x + r.w <= area.x + area.w && r.y + r.h <= area.y + area.h;
const circDentro = (cx, cy, raio, area) => retDentro({ x: cx - raio, y: cy - raio, w: 2 * raio, h: 2 * raio }, area);

test('os 5 blocos têm os mesmos ids do contrato', () => {
  assert.deepEqual(BLOCOS.map((b) => b.id).sort(), [...IDS_MODULOS].sort());
});

test('blocos e vias cobrem a área útil sem se sobrepor', () => {
  const pecas = [...BLOCOS, ...VIAS];
  const area = pecas.reduce((s, p) => s + p.w * p.h, 0);
  assert.equal(area, PALETE.util.w * PALETE.util.h);
  for (const p of pecas) assert.ok(retDentro(p, PALETE.util), `${p.id} fora da área útil`);
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i]; const b = pecas[j];
      const sobrepoe = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!sobrepoe, `${a.id} sobrepõe ${b.id}`);
    }
  }
});

test('16 postes, todos no asfalto e nenhum em cima de bloco', () => {
  assert.equal(POSTES.length, 16);
  for (const p of POSTES) {
    const via = VIAS.find((v) => v.id === p.via);
    assert.ok(pontoDentro(p.cx, p.cy, via), `poste (${p.cx}, ${p.cy}) fora da via ${p.via}`);
    for (const b of BLOCOS) assert.ok(!pontoDentro(p.cx, p.cy, b), `poste (${p.cx}, ${p.cy}) em cima do bloco ${b.id}`);
    for (const f of FAIXAS_PEDESTRE) assert.ok(!pontoDentro(p.cx, p.cy, f), `poste (${p.cx}, ${p.cy}) na faixa de pedestre`);
  }
});

test('objetos dentro dos seus blocos', () => {
  const casos = [
    ['energia', [...ENERGIA.paineisSolares, ENERGIA.baterias]],
    ['centro', [...CENTRO.predios, CENTRO.estacionamento, CENTRO.semaforo.caixa]],
    ['economia', [...ECONOMIA.lixeiras, ...ECONOMIA.canteiros]],
    ['residencial', [...RESIDENCIAL.casas, RESIDENCIAL.calcada, RESIDENCIAL.painelTelhado]],
    ['mobilidade', [MOBILIDADE.plataforma, MOBILIDADE.pontoOnibus, MOBILIDADE.onibus, MOBILIDADE.faixaTerminal, MOBILIDADE.peca]],
  ];
  for (const [id, rets] of casos) {
    const bloco = buscarBloco(id);
    for (const r of rets) assert.ok(retDentro(r, bloco), `${id}: objeto em (${r.x}, ${r.y}) fora do bloco`);
  }
  assert.ok(circDentro(CENTRO.praca.cx, CENTRO.praca.cy, CENTRO.praca.raio, buscarBloco('centro')));
  assert.ok(circDentro(ECONOMIA.reservatorio.cx, ECONOMIA.reservatorio.cy, ECONOMIA.reservatorio.raio, buscarBloco('economia')));
  assert.ok(pontoDentro(ENERGIA.turbina.cx, ENERGIA.turbina.cy, buscarBloco('energia')));
  const mob = buscarBloco('mobilidade');
  assert.ok(MOBILIDADE.trilho.x1 >= mob.x && MOBILIDADE.trilho.x2 <= mob.x + mob.w);
});

test('árvores dentro dos blocos indicados', () => {
  assert.equal(ARVORES.length, 11);
  for (const a of ARVORES) assert.ok(circDentro(a.cx, a.cy, a.r, buscarBloco(a.bloco)), `árvore (${a.cx}, ${a.cy}) fora de ${a.bloco}`);
});

test('sensores: 5 ESP32 e marcadores dentro do bloco do módulo (S8 e S9 ficam na avenida)', () => {
  assert.equal(SENSORES.filter((s) => s.tipo === 'esp32').length, 5);
  const ids = SENSORES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SENSORES) {
    if (s.id === 'S8' || s.id === 'S9') {
      assert.ok(pontoDentro(s.cx, s.cy, VIAS.find((v) => v.id === 'avenida')));
      continue;
    }
    assert.ok(pontoDentro(s.cx, s.cy, buscarBloco(s.modulo)), `${s.id} fora do bloco ${s.modulo}`);
  }
});

// ---------------------------------------------------------------------------
// Seção "fotos 22/10" de maquete.js: itens que a maquete física tem a mais que a planta
// ---------------------------------------------------------------------------
const sobrepoe = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const retDoCirculo = (cx, cy, r) => ({ x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });

test('fotos 22/10: itens novos ficam dentro do bloco certo e não encostam nos da planta', () => {
  const R = FOTOS_22_10.residencial;
  const res = buscarBloco('residencial');
  const casas = [...RESIDENCIAL.casas, ...R.casasExtras];
  for (const r of [...R.casasExtras, R.faixaVerde, ...R.retalhosGrama]) assert.ok(retDentro(r, res), `residencial: item em (${r.x}, ${r.y}) fora do bloco`);
  for (const c of R.casasExtras) {
    for (const o of [...RESIDENCIAL.casas, RESIDENCIAL.calcada, R.faixaVerde]) assert.ok(!sobrepoe(c, o), `${c.id} encosta em item da residencial`);
    for (const a of ARVORES.filter((x) => x.bloco === 'residencial')) assert.ok(!sobrepoe(c, retDoCirculo(a.cx, a.cy, a.r)), `${c.id} em cima de árvore`);
  }
  assert.ok(!sobrepoe(R.faixaVerde, RESIDENCIAL.calcada), 'faixa verde em cima da calçada');
  assert.equal(new Set(casas.map((c) => c.id)).size, 4, 'esperava 4 casas com ids diferentes');

  const E = FOTOS_22_10.energia;
  const ene = buscarBloco('energia');
  const paineis = [...ENERGIA.paineisSolares, ...E.paineisExtras];
  assert.equal(paineis.length, 4);
  for (const p of E.paineisExtras) assert.ok(retDentro(p, ene), 'painel novo fora do bloco da energia');
  const turbinas = [ENERGIA.turbina, ...E.turbinasExtras];
  assert.equal(turbinas.length, 3);
  for (const t of turbinas) {
    const base = retDoCirculo(t.cx, t.cy, E.raioBaseTurbina);
    assert.ok(retDentro(base, ene), `base da turbina em (${t.cx}, ${t.cy}) fora do bloco`);
    for (const p of paineis) assert.ok(!sobrepoe(base, p), `base da turbina em (${t.cx}, ${t.cy}) em cima de painel`);
  }
  for (let i = 0; i < paineis.length; i++) for (let j = i + 1; j < paineis.length; j++) assert.ok(!sobrepoe(paineis[i], paineis[j]), 'painéis se sobrepõem');

  const M = FOTOS_22_10.mobilidade;
  const mob = buscarBloco('mobilidade');
  const anel = retDoCirculo(M.circulo.cx, M.circulo.cy, M.circulo.raioExterno);
  for (const r of [M.base, M.galpao, M.pedrinhas, anel]) assert.ok(retDentro(r, mob), 'item novo da mobilidade fora do bloco');
  assert.ok(retDentro(anel, M.base), 'o anel não cabe na base marrom');
  assert.ok(!sobrepoe(M.galpao, M.base) && !sobrepoe(M.pedrinhas, M.base), 'galpão ou pedrinhas em cima da base');
  assert.ok(!sobrepoe(M.base, MOBILIDADE.faixaTerminal), 'base em cima da faixa do terminal');
  for (const a of ARVORES.filter((x) => x.bloco === 'mobilidade')) {
    assert.ok(Math.hypot(a.cx - M.circulo.cx, a.cy - M.circulo.cy) > M.circulo.raioExterno + a.r, `árvore (${a.cx}, ${a.cy}) em cima do trilho circular`);
  }
});
