// Lê config/padrao.json e sobrescreve com config/local.json (se existir).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PASTA_CONFIG = join(RAIZ, 'config');
export const ARQUIVO_LOCAL = join(PASTA_CONFIG, 'local.json');

/** Valor que o local.exemplo.json traz; nunca vale como código ou chave. */
export const VALOR_EXEMPLO = 'troque-isto';

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8').replace(/^﻿/, ''));
}

function mesclar(base, extra) {
  const saida = { ...base };
  for (const [k, v] of Object.entries(extra ?? {})) {
    saida[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object'
      ? mesclar(base[k], v)
      : v;
  }
  return saida;
}

/**
 * @returns {{config: object, avisos: string[], temLocal: boolean}}
 */
export function carregarConfig(pasta = PASTA_CONFIG) {
  const avisos = [];
  let config = lerJson(join(pasta, 'padrao.json'));
  const caminhoLocal = join(pasta, 'local.json');
  let temLocal = false;
  if (existsSync(caminhoLocal)) {
    try {
      config = mesclar(config, lerJson(caminhoLocal));
      temLocal = true;
    } catch (e) {
      avisos.push(`config/local.json com erro (${e.message}). Ignorado: login desligado.`);
    }
  } else {
    avisos.push('Sem config/local.json: login desligado (só visualização). Copie config/local.exemplo.json para config/local.json e troque os códigos.');
  }
  if (config.chaveModulos === VALOR_EXEMPLO) {
    avisos.push('chaveModulos ainda é "troque-isto": usando a chave de exemplo do padrao.json.');
    config.chaveModulos = lerJson(join(pasta, 'padrao.json')).chaveModulos;
  }
  if (!['auto', '3d', 'cartoes'].includes(config.modoInicial)) {
    avisos.push(`modoInicial "${config.modoInicial}" não existe (use "auto", "3d" ou "cartoes"). Usando "auto".`);
    config.modoInicial = 'auto';
  }
  return { config, avisos, temLocal };
}
