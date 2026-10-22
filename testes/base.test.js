// Testes básicos da F0: contrato, estado com "sem sinal" e simulador dentro das faixas.
// Os testes completos da SPEC seção 10 entram na F1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPOS, IDS_MODULOS, validarDados, calcularSituacao, validarComando } from '../compartilhado/contrato.js';
import { criarEstado } from '../servidor/estado.js';
import { criarSimulador } from '../servidor/simulador.js';

test('situação energética calculada com tolerância de 0,5 W', () => {
  assert.equal(calcularSituacao({ solar_w: 3, eolica_w: 2, consumo_w: 4 }), 'mais');
  assert.equal(calcularSituacao({ solar_w: 2, eolica_w: 2, consumo_w: 4.4 }), 'igual');
  assert.equal(calcularSituacao({ solar_w: 1, eolica_w: 1, consumo_w: 4 }), 'menos');
});

test('campo inválido é ignorado sozinho', () => {
  const r = validarDados('energia', { bateria_pct: 150, bateria_v: 12.1, solar_w: 'x' });
  assert.deepEqual(r.validos, { bateria_v: 12.1 });
  assert.equal(r.avisos.length, 2);
});

test('ping só para administração, em qualquer módulo', () => {
  for (const id of IDS_MODULOS) {
    assert.equal(validarComando({ modulo: id, comando: 'ping', valor: 'teste' }, 'administracao').ok, true);
    assert.equal(validarComando({ modulo: id, comando: 'ping', valor: 'teste' }, 'controle').ok, false);
  }
});

test('estado: sinal "ok", depois "sem_sinal" passados 6 s, e "desativado"', () => {
  let t = 1_000_000;
  const estado = criarEstado({ semSinalMs: 6000, historicoMs: 600_000, modo: 'demo', agora: () => t });
  assert.equal(estado.obter().modulos.energia.sinal, 'sem_sinal');
  estado.registrarLeitura('energia', { bateria_pct: 50, solar_w: 1, eolica_w: 1, consumo_w: 5 });
  assert.equal(estado.obter().modulos.energia.sinal, 'ok');
  assert.equal(estado.obter().modulos.energia.dados.situacao, 'menos');
  t += 6000;
  assert.equal(estado.obter().modulos.energia.sinal, 'ok');
  t += 1;
  assert.equal(estado.obter().modulos.energia.sinal, 'sem_sinal');
  estado.definirAtivo('energia', false);
  assert.equal(estado.obter().modulos.energia.sinal, 'desativado');
});

test('simulador: 10 minutos de leituras, todas dentro do contrato', () => {
  let t = 0;
  const leituras = [];
  const estado = { registrarLeitura: (id, dados) => leituras.push([id, dados]) };
  const sim = criarSimulador({ estado, agora: () => t });
  for (let i = 0; i < 300; i++) { sim.passo(); t += 2000; }
  assert.equal(leituras.length, 300 * 5);
  for (const [id, dados] of leituras) {
    const { avisos } = validarDados(id, dados);
    assert.deepEqual(avisos, [], `${id}: ${avisos.join('; ')}`);
    for (const campo of Object.keys(CAMPOS[id])) {
      if (!CAMPOS[id][campo].opcional && campo !== 'situacao') assert.ok(campo in dados, `${id}.${campo} faltando`);
    }
  }
});
