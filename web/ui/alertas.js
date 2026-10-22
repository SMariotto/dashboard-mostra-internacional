// Pílulas de alerta ("Reservatório baixo", "Bateria baixa"). Aparecem dentro do destaque da cidade
// e no tile da área em alerta. Não existe mais uma faixa de alertas separada.
import { buscarModulo } from '../../compartilhado/contrato.js';
import { h, icone } from './dom.js';
import { ESTADO } from './icones.js';

/**
 * @param {{id: string, modulo: string, texto: string}[]} alertas
 * @param {{comArea?: boolean}} [op] comArea: acrescenta o nome curto da área ("Reservatório baixo (Economia Circular)")
 */
export function pilulasDeAlerta(alertas, { comArea = false } = {}) {
  return alertas.map((a) => h('span', { class: 'pilula', 'data-estado': 'alerta' },
    icone(ESTADO.alerta),
    comArea ? `${a.texto} (${buscarModulo(a.modulo)?.curto ?? a.modulo})` : a.texto));
}
