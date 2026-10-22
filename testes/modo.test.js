// A pílula do topo: "Ao vivo" só com leitura de verdade (A1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoMostrado } from '../web/ui/modo.js';

const modulos = (sinais) => Object.fromEntries(sinais.map((s, i) => [`m${i}`, { sinal: s }]));

test('modo demo mostra Demonstração, mesmo com módulos "ok"', () => {
  assert.equal(modoMostrado({ modo: 'demo', modulos: modulos(['ok', 'ok']) }), 'demo');
});

test('modo real com pelo menos um módulo "ok" mostra Ao vivo', () => {
  assert.equal(modoMostrado({ modo: 'real', modulos: modulos(['sem_sinal', 'ok', 'desativado']) }), 'ao_vivo');
});

test('modo real sem nenhum módulo "ok" não mostra Ao vivo', () => {
  assert.equal(modoMostrado({ modo: 'real', modulos: modulos(['sem_sinal', 'sem_sinal']) }), 'sem_leituras');
  assert.equal(modoMostrado({ modo: 'real', modulos: modulos(['desativado']) }), 'sem_leituras');
  assert.equal(modoMostrado({ modo: 'real', modulos: {} }), 'sem_leituras');
  assert.equal(modoMostrado(null), 'sem_leituras');
});

const leituras = (lista) => Object.fromEntries(lista.map(([sinal, teste], i) => [`m${i}`, { sinal, dados: teste === undefined ? {} : { teste } }]));

test('modo real com todas as leituras recentes de teste mostra Teste', () => {
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['ok', true], ['ok', true]]) }), 'teste');
  // módulo sem sinal ou desativado não conta como leitura recente
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['ok', true], ['sem_sinal'], ['desativado']]) }), 'teste');
});

test('Ao vivo só com pelo menos uma leitura recente que não seja de teste', () => {
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['ok', true], ['ok']]) }), 'ao_vivo');
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['ok', true], ['ok', false]]) }), 'ao_vivo');
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['ok']]) }), 'ao_vivo');
});

test('leitura de teste sem sinal não vira Teste nem Ao vivo; demo ignora o campo', () => {
  assert.equal(modoMostrado({ modo: 'real', modulos: leituras([['sem_sinal', true]]) }), 'sem_leituras');
  assert.equal(modoMostrado({ modo: 'demo', modulos: leituras([['ok', true]]) }), 'demo');
});
