// Histórico em arquivo: uma linha JSON por módulo a cada 10 s, em dados/historico-AAAA-MM-DD.jsonl.
// Só node:fs, escrita em append. A pasta dados/ fica fora do git.
// O servidor nunca apaga arquivos de histórico (ver docs/DECISOES.md, item 50).
import { appendFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { MODULOS, CAMPOS, IDS_MODULOS } from '../compartilhado/contrato.js';

const NOME = /^historico-(\d{4})-(\d{2})-(\d{2})\.jsonl$/;

const doisDig = (n) => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD. */
export function dataLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;
}

/** Hora local AAAA-MM-DD HH:MM:SS (para o CSV). */
function horaLocal(ms) {
  const d = new Date(ms);
  return `${dataLocal(ms)} ${doisDig(d.getHours())}:${doisDig(d.getMinutes())}:${doisDig(d.getSeconds())}`;
}

/**
 * @param {object} op
 * @param {string} op.pasta        pasta dados/
 * @param {() => number} [op.agora]
 */
export function criarHistoricoArquivo({ pasta, agora = Date.now }) {
  let avisouErro = false;
  const arquivoDo = (ms) => join(pasta, `historico-${dataLocal(ms)}.jsonl`);

  function lerArquivo(caminho) {
    if (!existsSync(caminho)) return [];
    const linhas = [];
    for (const texto of readFileSync(caminho, 'utf8').split('\n')) {
      if (!texto.trim()) continue;
      try {
        const l = JSON.parse(texto);
        if (l && typeof l.hora === 'string' && typeof l.modulo === 'string' && l.dados && typeof l.dados === 'object') linhas.push(l);
      } catch { /* linha quebrada (ex.: queda de energia no meio da escrita): ignora */ }
    }
    return linhas;
  }

  /** Arquivos de histórico existentes, do mais antigo para o mais novo. */
  function arquivos() {
    if (!existsSync(pasta)) return [];
    return readdirSync(pasta).filter((n) => NOME.test(n)).sort();
  }

  return {
    /**
     * Grava uma linha por módulo com sinal "ok".
     * @param {{modo: string, modulos: Record<string, {sinal: string, dados: object}>}} estado
     */
    gravar(estado) {
      const t = agora();
      const linhas = [];
      for (const id of IDS_MODULOS) {
        const m = estado.modulos[id];
        if (m?.sinal !== 'ok') continue;
        linhas.push(JSON.stringify({ hora: new Date(t).toISOString(), modulo: id, modo: estado.modo, dados: m.dados }));
      }
      if (!linhas.length) return 0;
      try {
        mkdirSync(pasta, { recursive: true });
        appendFileSync(arquivoDo(t), linhas.join('\n') + '\n', 'utf8');
        avisouErro = false;
      } catch (e) {
        if (!avisouErro) console.warn(`[histórico] não consegui gravar em ${pasta}: ${e.message}`);
        avisouErro = true;
      }
      return linhas.length;
    },

    /** Linhas dos últimos `janelaMs` (arquivo do dia e, perto da meia-noite, o de ontem). */
    relerUltimos(janelaMs) {
      const t = agora();
      const limite = t - janelaMs;
      const caminhos = [...new Set([arquivoDo(limite), arquivoDo(t)])];
      return caminhos.flatMap(lerArquivo).filter((l) => {
        const ms = Date.parse(l.hora);
        return ms >= limite && ms <= t;
      });
    },

    /**
     * Todo o histórico guardado, em CSV (separador ";" e vírgula decimal, como o Excel em português abre).
     * @param {string|null} modulo  null: todos os módulos
     */
    csv(modulo) {
      const ids = modulo ? [modulo] : IDS_MODULOS;
      const campos = [...new Set(ids.flatMap((id) => Object.keys(CAMPOS[id])))];
      const nomes = Object.fromEntries(MODULOS.map((m) => [m.id, m.nome]));
      const celula = (v) => {
        if (v === undefined || v === null) return '';
        if (typeof v === 'boolean') return v ? 'sim' : 'não';
        if (typeof v === 'number') return String(v).replace('.', ',');
        const s = String(v);
        return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const saida = [['hora', 'modulo', 'modo', ...campos].join(';')];
      for (const nome of arquivos()) {
        for (const l of lerArquivo(join(pasta, nome))) {
          if (!ids.includes(l.modulo)) continue;
          saida.push([horaLocal(Date.parse(l.hora)), nomes[l.modulo] ?? l.modulo, l.modo ?? '', ...campos.map((c) => celula(l.dados[c]))].join(';'));
        }
      }
      return '﻿' + saida.join('\r\n') + '\r\n';
    },
  };
}
