// Aviso curto que aparece no alto da tela e some sozinho (por exemplo, "Qualidade reduzida para Média").
import { h, icone } from './dom.js';
import { ESTADO, ITEM } from './icones.js';

let atual = null;
let relogio = 0;

/**
 * @param {string} texto
 * @param {{tempo?: number, acao?: {rotulo: string, aoClicar: () => void}}} [op] tempo 0 = fica até a pessoa fechar
 */
export function mostrarAviso(texto, { tempo = 7000, acao = null } = {}) {
  atual?.remove();
  clearTimeout(relogio);
  const botao = acao ? h('button', { type: 'button', class: 'aviso-acao', onclick: () => acao.aoClicar() }, acao.rotulo) : null;
  const fechar = acao ? h('button', { type: 'button', class: 'aviso-fechar', 'aria-label': 'Fechar o aviso', onclick: () => { atual?.remove(); atual = null; } }, icone(ITEM.fechar)) : null;
  atual = h('div', { class: 'aviso-flutuante', role: 'status' }, icone(ESTADO.alerta), h('span', { class: 'aviso-texto' }, texto), botao, fechar);
  document.body.append(atual);
  if (tempo > 0) relogio = setTimeout(() => { atual?.remove(); atual = null; }, tempo);
}
