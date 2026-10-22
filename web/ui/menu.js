// Menu lateral estreito (telas grandes): marca, ícones da cidade e das 5 áreas (com a bolinha de estado
// de cada uma) e, embaixo, acesso pelo celular, administração (só para quem tem o papel) e entrar ou sair.
import { MODULOS, PAPEIS } from '../../compartilhado/contrato.js';
import { h, icone } from './dom.js';
import { AREA, ITEM } from './icones.js';
import { estadoDaArea } from './areas.js';

const NOME_ESTADO = { ok: 'funcionando', alerta: 'em alerta', sem_sinal: 'sem sinal', desativado: 'desativada' };

/**
 * @param {{sessao: object, acoes: {abrirQr: Function, abrirAdmin: Function, abrirLogin: Function}, botaoModo?: {rotulo: string, icone: string, titulo: string, aoClicar: Function}}} op
 *   botaoModo: troca entre o mapa 3D e os cartões ("Modo cartões" no mapa, "Mapa 3D" nos cartões).
 */
export function criarMenu({ sessao, acoes, botaoModo = null }) {
  const itemCidade = h('a', { class: 'menu-item', href: '#cidade', title: 'Visão da cidade', 'aria-label': 'Visão da cidade' }, icone(ITEM.cidade));
  const areas = MODULOS.map((m) => {
    const ponto = h('span', { class: 'menu-ponto', 'aria-hidden': 'true' });
    const el = h('a', { class: `menu-item area-${m.id}`, href: `#${m.id}`, title: m.nome }, icone(AREA[m.id]), ponto);
    return { m, el, ponto };
  });

  const botaoQr = h('button', { type: 'button', class: 'menu-item menu-acao', onclick: () => acoes.abrirQr() }, icone(ITEM.qr), h('span', {}, 'Celular'));
  const botaoTroca = botaoModo
    ? h('button', { type: 'button', class: 'menu-item menu-acao', title: botaoModo.titulo, onclick: () => botaoModo.aoClicar() }, icone(botaoModo.icone), h('span', {}, botaoModo.rotulo))
    : null;
  const botaoAdmin = h('button', { type: 'button', class: 'menu-item menu-acao', title: 'Administração', onclick: () => acoes.abrirAdmin() }, icone(ITEM.engrenagem), h('span', {}, 'Admin'));
  const botaoPapel = h('button', { type: 'button', class: 'menu-item menu-acao' });

  function desenharPapel() {
    const p = sessao.papel;
    botaoAdmin.hidden = p !== 'administracao';
    botaoPapel.replaceChildren(icone(p === 'visualizacao' ? ITEM.entrar : ITEM.sair), h('span', {}, p === 'visualizacao' ? 'Entrar' : 'Sair'));
    botaoPapel.title = p === 'visualizacao' ? 'Entrar como Controle ou Administração' : `Sair (você está como ${PAPEIS[p]})`;
    botaoPapel.onclick = () => (p === 'visualizacao' ? acoes.abrirLogin() : sessao.sair());
  }
  sessao.aoMudar(desenharPapel);
  desenharPapel();

  const el = h('aside', { class: 'menu' },
    h('span', { class: 'menu-marca', 'aria-hidden': 'true' }, icone(ITEM.folha)),
    h('nav', { class: 'menu-nav', 'aria-label': 'Cidade e áreas' }, itemCidade, areas.map((a) => a.el)),
    h('div', { class: 'menu-base' }, botaoTroca, botaoQr, botaoAdmin, botaoPapel));

  return {
    el,
    /** @param {string} vista 'cidade' ou o id de uma área */
    definirAtivo(vista) {
      for (const [item, id] of [[itemCidade, 'cidade'], ...areas.map((a) => [a.el, a.m.id])]) {
        if (id === vista) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
      }
    },
    atualizar(estado) {
      for (const { m, el: item, ponto } of areas) {
        const e = estadoDaArea(m.id, estado);
        ponto.dataset.estado = e.chave;
        item.setAttribute('aria-label', `${m.nome}: ${NOME_ESTADO[e.chave]}`);
      }
    },
  };
}
