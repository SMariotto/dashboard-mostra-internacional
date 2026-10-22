// Modo cartões em tela grande (?modo=cartoes): plano B do mapa 3D e base visual de tudo.
// Menu lateral + topo + uma vista por vez:
//   #cidade (ou sem endereço): o destaque da cidade e os 5 cartões das áreas, em grade de tamanhos diferentes;
//   #energia, #residencial...: o detalhe da área, com os comandos para Controle e Administração.
// A F3 vai colocar o mapa 3D à esquerda e um painel fixo à direita com estes mesmos componentes
// (criarDestaque, criarTile, criarDetalhe com a classe "estreito").
import { MODULOS, buscarModulo } from '../../compartilhado/contrato.js';
import { vistaDoEndereco, voltarComEsc } from './rotas.js';
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';
import { criarTopo } from './barra.js';
import { criarMenu } from './menu.js';
import { criarDestaque, criarTile, criarDetalhe } from './areas.js';
import { abrirLogin } from './login.js';
import { abrirAdmin } from './admin.js';
import { abrirQr } from './qr.js';

// Tiles largos (duas colunas por dentro) na grade da cidade.
const LARGOS = new Set(['energia', 'mobilidade']);

/**
 * @param {HTMLElement} raiz
 * @param {{fonte: import('../dados/FonteDeDados.js').FonteDeDados, sessao: object}} op
 */
export function montarCartoes(raiz, { fonte, sessao }) {
  const acoes = {
    abrirLogin: () => abrirLogin({ sessao, fonte }),
    abrirAdmin: () => abrirAdmin({ sessao, fonte }),
    abrirQr: () => abrirQr(),
  };
  const menu = criarMenu({
    sessao, acoes,
    botaoModo: { rotulo: 'Mapa 3D', icone: ITEM.cubo, titulo: 'Abrir o mapa 3D da maquete', aoClicar: () => { const u = new URL(location.href); u.searchParams.set('modo', '3d'); u.hash = ''; location.href = u.toString(); } },
  });
  const topo = criarTopo({ fonte });
  const destaque = criarDestaque();
  const tiles = MODULOS.map((m) => ({ id: m.id, ...criarTile(m.id) }));
  for (const t of tiles) if (LARGOS.has(t.id)) t.el.classList.add('larga');
  const detalhes = Object.fromEntries(MODULOS.map((m) => [m.id, criarDetalhe(m.id, { sessao })]));

  const gradeCidade = h('div', { class: 'grade-cidade' }, destaque.el, tiles.map((t) => t.el));
  const voltar = h('a', { class: 'voltar', href: '#cidade' }, icone(ITEM.voltar), 'Visão da cidade');
  const paginaArea = h('div', { class: 'pagina-area' }, voltar);
  const vista = h('main', { class: 'vista' });

  raiz.className = 'app layout-cartoes';
  raiz.replaceChildren(menu.el, h('div', { class: 'conteudo' }, topo.el, vista));

  let atual = null;
  function aplicar() {
    const v = vistaDoEndereco();
    if (v === atual) return;
    atual = v;
    menu.definirAtivo(v);
    if (v === 'cidade') {
      topo.definirVista({ titulo: 'Visão da cidade' });
      vista.replaceChildren(gradeCidade);
    } else {
      topo.definirVista({ titulo: buscarModulo(v).nome, area: v });
      paginaArea.replaceChildren(voltar, detalhes[v].el);
      vista.replaceChildren(paginaArea);
    }
  }
  window.addEventListener('hashchange', aplicar);
  voltarComEsc(() => atual);
  aplicar();

  fonte.assinar((estado) => {
    menu.atualizar(estado);
    topo.atualizar(estado);
    destaque.atualizar(estado);
    for (const t of tiles) t.atualizar(estado);
    for (const d of Object.values(detalhes)) d.atualizar(estado);
  });
  return { acoes };
}
