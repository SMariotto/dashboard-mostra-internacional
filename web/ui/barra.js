// Barra do topo. Telas grandes: título da vista, (nas páginas de área) 3 mini-cartões, pílula de modo e relógio.
// Celular: marca, pílula de modo e relógio. O resto (QR, administração, entrar e sair) fica no menu lateral.
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';
import { horaMin } from './formatar.js';
import { criarMinis, criarIndicador } from './areas.js';
import { criarPilulaModo, criarPilulaConexao } from './faixas.js';

export function criarMarca() {
  return h('span', { class: 'marca' }, icone(ITEM.folha, 'marca-folha'), h('span', { class: 'marca-texto' }, 'Smart Canada ', h('b', {}, '2050')));
}

export function criarRelogio() {
  const el = h('span', { class: 'relogio num' }, horaMin(Date.now()));
  setInterval(() => { el.textContent = horaMin(Date.now()); }, 1000);
  return el;
}

/** "Quarta-feira, 21 de outubro": só a primeira letra maiúscula. */
const dataPorExtenso = () => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * @param {{fonte: object, compacto?: boolean}} op
 */
export function criarTopo({ fonte, compacto = false }) {
  const modo = criarPilulaModo();
  const conexao = criarPilulaConexao(fonte);
  const relogio = criarRelogio();

  if (compacto) {
    const el = h('header', { class: 'topo topo-compacto' }, criarMarca(), h('div', { class: 'topo-direita' }, conexao, modo.el, relogio));
    return { el, atualizar: (estado) => modo.atualizar(estado), definirVista() {} };
  }

  const titulo = h('h1', { class: 'topo-titulo' });
  const indicador = criarIndicador(); // bolinha ao lado do nome da área (ou pílula, se não estiver normal)
  const sub = h('p', { class: 'topo-sub' });
  const minis = criarMinis();
  let areaAtual = null;
  let ultimoEstado = null;
  const el = h('header', { class: 'topo' },
    h('div', { class: 'topo-texto' }, h('div', { class: 'topo-linha' }, titulo, indicador.el), sub),
    minis.el,
    h('div', { class: 'topo-direita' }, conexao, modo.el, relogio));
  let comSub = true;
  const atualizarSub = () => { if (comSub) sub.textContent = dataPorExtenso(); };
  setInterval(atualizarSub, 60_000);

  return {
    el,
    atualizar(estado) {
      ultimoEstado = estado;
      modo.atualizar(estado);
      minis.atualizar(estado);
      if (areaAtual) indicador.atualizar(areaAtual, estado);
    },
    /**
     * Na cidade: título e data, sem os mini-cartões (o destaque já mostra bateria e consumo).
     * Na área: nome com o indicador de estado ao lado, e os mini-cartões.
     * @param {{titulo: string, area?: string|null}} v
     */
    definirVista({ titulo: t, area = null }) {
      titulo.textContent = t;
      areaAtual = area;
      indicador.el.hidden = !area;
      if (area && ultimoEstado) indicador.atualizar(area, ultimoEstado);
      comSub = true;
      sub.textContent = dataPorExtenso();
      minis.el.hidden = !area;
    },
  };
}
