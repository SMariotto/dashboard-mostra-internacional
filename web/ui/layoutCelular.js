// Celular (?modo=celular ou tela estreita): sem 3D, só visualização, sem login.
// Marca, destaque da cidade e os 5 cartões das áreas. Ao tocar num cartão, ele abre com todos os dados.
import { MODULOS } from '../../compartilhado/contrato.js';
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';
import { criarTopo } from './barra.js';
import { criarDestaque, criarTile, criarDetalhe } from './areas.js';
import { horaSeg } from './formatar.js';

function blocoDaArea(m) {
  const tile = criarTile(m.id, { tag: 'button' });
  const detalhe = criarDetalhe(m.id, { semCabeca: true });
  detalhe.el.classList.add('estreito');
  const corpo = h('div', { class: 'bloco-corpo', id: `corpo-${m.id}`, hidden: true }, detalhe.el);
  tile.el.setAttribute('aria-controls', `corpo-${m.id}`);
  const rotuloMais = tile.el.querySelector('.tile-mais');
  const el = h('div', { class: `bloco area-${m.id}` }, tile.el, corpo);
  return {
    el,
    botao: tile.el,
    abrir(sim) {
      corpo.hidden = !sim;
      tile.el.setAttribute('aria-expanded', String(sim));
      el.classList.toggle('aberto', sim);
      rotuloMais.replaceChildren(icone(sim ? ITEM.fechar : ITEM.seta), h('span', { class: 'so-leitor' }, sim ? 'Fechar' : 'Ver detalhes'));
    },
    atualizar(estado) { tile.atualizar(estado); detalhe.atualizar(estado); },
  };
}

export function montarCelular(raiz, { fonte }) {
  const topo = criarTopo({ fonte, compacto: true });
  const destaque = criarDestaque();
  destaque.el.classList.add('estreito');
  const blocos = MODULOS.map(blocoDaArea);
  const atualizado = h('p', { class: 'celular-rodape' });

  // Um aberto por vez.
  for (const b of blocos) {
    b.botao.addEventListener('click', () => {
      const abrir = b.botao.getAttribute('aria-expanded') !== 'true';
      for (const o of blocos) o.abrir(false);
      b.abrir(abrir);
    });
    b.abrir(false);
  }

  raiz.className = 'app layout-celular';
  raiz.replaceChildren(topo.el, h('main', { class: 'lista-celular' }, destaque.el, blocos.map((b) => b.el)), atualizado);

  fonte.assinar((estado) => {
    topo.atualizar(estado);
    destaque.atualizar(estado);
    for (const b of blocos) b.atualizar(estado);
    atualizado.textContent = `Atualizado às ${horaSeg(estado.hora)}`;
  });
}
