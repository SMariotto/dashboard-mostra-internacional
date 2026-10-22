// Janela sobre a tela (login, administração, QR). Esc fecha. O foco volta para quem abriu.
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';

let contador = 0;

/**
 * @param {object} op
 * @param {string} op.titulo
 * @param {Node} op.conteudo
 * @param {'centro'|'gaveta'|'cheia'} [op.tipo]
 * @param {() => void} [op.aoFechar]
 */
export function abrirDialogo({ titulo, conteudo, tipo = 'centro', aoFechar }) {
  const id = `dialogo-titulo-${++contador}`;
  const quemAbriu = document.activeElement;
  const fecharBotao = h('button', { type: 'button', class: 'botao botao-fechar', onclick: () => fechar() }, icone(ITEM.fechar), 'Fechar');
  const painel = h('div', { class: `dialogo-painel dialogo-${tipo}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id },
    h('header', { class: 'dialogo-cabeca' }, h('h2', { id }, titulo), fecharBotao),
    h('div', { class: 'dialogo-corpo' }, conteudo));
  const fundo = h('div', { class: `dialogo-fundo fundo-${tipo}`, onclick: (e) => { if (e.target === fundo) fechar(); } }, painel);

  function tecla(e) {
    if (e.key === 'Escape') { e.stopPropagation(); fechar(); }
  }
  let aberto = true;
  function fechar() {
    if (!aberto) return;
    aberto = false;
    document.removeEventListener('keydown', tecla, true);
    fundo.remove();
    aoFechar?.();
    if (quemAbriu instanceof HTMLElement && document.contains(quemAbriu)) quemAbriu.focus();
  }

  document.addEventListener('keydown', tecla, true);
  document.body.append(fundo);
  const primeiro = painel.querySelector('input, select, .dialogo-corpo button') ?? fecharBotao;
  primeiro.focus();
  return { fechar, painel };
}
