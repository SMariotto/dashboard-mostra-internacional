// Formatação de números e horas em português do Brasil.
import { CAMPOS } from '../../compartilhado/contrato.js';

export const SEM_DADO = '--';

/** Número com casas decimais fixas, ou "--" sem dado. */
export function numero(v, casas = 0) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return SEM_DADO;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

const doisDig = (n) => String(n).padStart(2, '0');

/** HH:MM */
export function horaMin(ms) {
  const d = new Date(ms);
  return `${doisDig(d.getHours())}:${doisDig(d.getMinutes())}`;
}

/** HH:MM:SS */
export function horaSeg(ms) {
  const d = new Date(ms);
  return `${doisDig(d.getHours())}:${doisDig(d.getMinutes())}:${doisDig(d.getSeconds())}`;
}

/** Texto de tela de um campo do contrato ("Ligado", "Alguém em casa"...). */
export function textoCampo(modulo, campo, valor) {
  if (valor === undefined || valor === null) return SEM_DADO;
  const def = CAMPOS[modulo]?.[campo];
  return def?.textos?.[String(valor)] ?? String(valor);
}

/** "há 5 s", "há 3 min" */
export function haQuanto(ms, agora = Date.now()) {
  const s = Math.max(0, Math.round((agora - ms) / 1000));
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  return `às ${horaMin(ms)}`;
}
