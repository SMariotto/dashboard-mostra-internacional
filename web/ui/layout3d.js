// Layout do mapa 3D em tela grande (PC): menu lateral, topo e mapa à esquerda; painel fixo à direita
// (450 px) com os mesmos cartões da V1 (destaque da cidade, um cartão por área, detalhe da área).
//
//   #cidade  : o mapa mostra a maquete inteira; o painel mostra o destaque e os 5 cartões.
//   #energia : a câmera voa até o bloco; o painel mostra o detalhe da área (com comandos para Controle e Administração).
//
// O Three.js só é baixado aqui (importação dinâmica de ../cena/index.js). Se o WebGL não abrir, esta função
// lança um erro antes de deixar a tela pela metade, e o main.js entra no modo cartões.
import { MODULOS, buscarModulo } from '../../compartilhado/contrato.js';
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';
import { criarTopo } from './barra.js';
import { criarMenu } from './menu.js';
import { criarDestaque, criarTile, criarDetalhe } from './areas.js';
import { abrirLogin } from './login.js';
import { abrirAdmin } from './admin.js';
import { abrirQr } from './qr.js';
import { vistaDoEndereco, voltarComEsc } from './rotas.js';
import { mostrarAviso } from './aviso.js';

const NOME_QUALIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const NOME_LUZ = { auto: 'Automática', dia: 'Dia', noite: 'Noite' };

/** Botões de escolha em grupo ("Luz: Automática Dia Noite"). */
function criarSegmentado(rotulo, opcoes, aoEscolher) {
  const botoes = opcoes.map(([valor, texto]) => h('button', { type: 'button', class: 'seg-botao', 'data-valor': valor, 'aria-pressed': 'false', onclick: () => aoEscolher(valor) }, texto));
  const el = h('div', { class: 'segmentado', role: 'group', 'aria-label': rotulo }, h('span', { class: 'seg-rotulo' }, rotulo), botoes);
  return {
    el,
    definir(valor) { for (const b of botoes) b.setAttribute('aria-pressed', String(b.dataset.valor === valor)); },
  };
}

/**
 * @param {HTMLElement} raiz
 * @param {{fonte: import('../dados/FonteDeDados.js').FonteDeDados, sessao: object, aoFalhar: (motivo: string) => void}} op
 */
export async function montarLayout3d(raiz, { fonte, sessao, aoFalhar }) {
  const params = new URLSearchParams(location.search);
  // O Three.js entra só aqui, depois que o navegador decidiu que este é o layout 3D.
  const cenaMod = await import('../cena/index.js');
  const { criarAmbiente } = await import('../cena/ambiente.js');
  const { ligarDados } = await import('../cena/dados.js');
  const { criarInteracao } = await import('../cena/interacao.js');
  const { criarEtiquetas } = await import('../cena/etiquetas.js');
  const { criarSensores } = await import('../cena/sensores.js');

  // ---------- Peças da tela ----------
  const acoes = {
    abrirLogin: () => abrirLogin({ sessao, fonte }),
    abrirAdmin: () => abrirAdmin({ sessao, fonte }),
    abrirQr: () => abrirQr(),
  };
  const menu = criarMenu({
    sessao, acoes,
    botaoModo: { rotulo: 'Cartões', icone: ITEM.cartoes, titulo: 'Modo cartões: a tela sem o mapa 3D', aoClicar: () => { const u = new URL(location.href); u.searchParams.set('modo', 'cartoes'); u.hash = ''; location.href = u.toString(); } },
  });
  const topo = criarTopo({ fonte });
  const destaque = criarDestaque();
  destaque.el.classList.add('estreito');
  const tiles = MODULOS.map((m) => ({ id: m.id, ...criarTile(m.id) }));
  const detalhes = Object.fromEntries(MODULOS.map((m) => {
    const d = criarDetalhe(m.id, { sessao });
    d.el.classList.add('estreito');
    return [m.id, d];
  }));
  const voltarPainel = h('a', { class: 'voltar', href: '#cidade' }, icone(ITEM.voltar), 'Visão da cidade');
  const painel = h('aside', { class: 'painel3d', 'aria-label': 'Painel da cidade' });

  const camada = h('div', { class: 'mapa-camada' });
  const palco = h('div', { class: 'mapa-palco' });
  const mapa = h('div', { class: 'mapa' }, palco, camada);

  raiz.className = 'app layout-3d';
  const vistaMapa = h('div', { class: 'vista vista-mapa' }, mapa);
  raiz.replaceChildren(menu.el, h('div', { class: 'conteudo' }, topo.el, vistaMapa), painel);

  let cena = null;
  let cancelarDados = () => {};
  let vigia = 0;
  let ambiente = null;
  let interacao = null;
  let sensores = null;
  try {
    await construir();
  } catch (e) {
    // Desfaz o que já foi feito, para o main.js poder abrir o modo cartões sobre uma tela limpa.
    clearInterval(vigia);
    cancelarDados();
    try { ambiente?.destruir(); cena?.destruir(); } catch { /* já estava quebrado */ }
    raiz.replaceChildren();
    throw e;
  }
  return {
    cena, interacao, sensores, ambiente,
    /** Tira o mapa da tela (usado quando entra o modo cartões no lugar). */
    destruir() {
      clearInterval(vigia);
      cancelarDados();
      ambiente.destruir();
      cena.destruir();
    },
  };

  async function construir() {
    // ---------- A cena ----------
    cena = cenaMod.criarCena(palco, { qualidade: params.get('qualidade') ?? 'alta', preservarQuadro: params.get('debug') === '1' });
    ambiente = criarAmbiente(cena, { fundoDia: cena.tintas.fundo });
    const dados = ligarDados(cena, ambiente);
    let estado = null;
    let vistaAtual = vistaDoEndereco();

    const etiquetas = criarEtiquetas(cena, camada, { aoPassar: (id) => interacao.realcar(id) });
    sensores = criarSensores(cena, camada, { obterEstado: () => estado });
    interacao = criarInteracao(cena, {
      aoClicarArea: (id) => { location.hash = `#${id}`; },
      aoPassarArea: (id) => etiquetas.marcar({ selecionada: interacao.selecionada, hover: id }),
      itensPicaveis: () => sensores.picaveis(),
      aoClicarItem: (obj) => sensores.aoClicar(obj),
      aoPassarItem: (obj) => sensores.aoPassar(obj),
    });
    const luzPedida = params.get('luz');
    if (['dia', 'noite', 'auto'].includes(luzPedida)) ambiente.definirModo(luzPedida);

    // ---------- Botões no mapa ----------
    const botaoVoltar = h('a', { class: 'mapa-botao', href: '#cidade' }, icone(ITEM.voltar), 'Voltar à cidade');
    const botaoSensores = h('button', { type: 'button', class: 'mapa-botao mapa-alternar', 'aria-pressed': 'false', onclick: () => ligarSensores(!sensores.ligada) }, icone(ITEM.chip), 'Mostrar sensores');
    const segLuz = criarSegmentado('Luz', Object.entries(NOME_LUZ), (v) => { ambiente.definirModo(v); segLuz.definir(v); });
    const segQual = criarSegmentado('Qualidade', Object.entries(NOME_QUALIDADE), (v) => { cena.definirQualidade(v); segQual.definir(v); fpsBaixos = 0; aquecer = 4; });
    segLuz.definir(ambiente.modo);
    segQual.definir(cena.qualidade);
    const controles = h('div', { class: 'mapa-controles' }, botaoVoltar, botaoSensores, segLuz.el, segQual.el);
    vistaMapa.append(controles); // abaixo do mapa, não por cima: o mapa nunca fica escondido atrás dos botões

    function ligarSensores(ligar) {
      sensores.ligar(ligar);
      botaoSensores.setAttribute('aria-pressed', String(ligar));
      botaoSensores.lastChild.textContent = ligar ? 'Esconder sensores' : 'Mostrar sensores';
    }
    if (params.get('sensores') === '1') ligarSensores(true);

    // ---------- Vista (cidade ou uma área) ----------
    function aplicarVista({ imediato = false } = {}) {
      const v = vistaDoEndereco();
      vistaAtual = v;
      menu.definirAtivo(v);
      interacao.irPara(v, { imediato });
      etiquetas.marcar({ selecionada: v === 'cidade' ? null : v });
      botaoVoltar.hidden = v === 'cidade';
      if (v === 'cidade') {
        topo.definirVista({ titulo: 'Visão da cidade' });
        painel.replaceChildren(destaque.el, ...tiles.map((t) => t.el));
      } else {
        topo.definirVista({ titulo: buscarModulo(v).nome, area: v });
        painel.replaceChildren(voltarPainel, detalhes[v].el);
      }
      painel.scrollTop = 0;
    }
    window.addEventListener('hashchange', () => aplicarVista());
    voltarComEsc(() => vistaAtual);
    for (const t of tiles) {
      t.el.addEventListener('pointerenter', () => interacao.realcar(t.id));
      t.el.addEventListener('pointerleave', () => interacao.realcar(null));
    }

    // ---------- Dados ----------
    cancelarDados = fonte.assinar((novo) => {
      estado = novo;
      menu.atualizar(novo);
      topo.atualizar(novo);
      destaque.atualizar(novo);
      for (const t of tiles) t.atualizar(novo);
      for (const d of Object.values(detalhes)) d.atualizar(novo);
      dados.aplicar(novo);
      etiquetas.atualizar(novo);
      sensores.atualizar(novo);
    });
    aplicarVista({ imediato: true });

    // ---------- Qualidade cai sozinha, e depois o 3D cede lugar aos cartões ----------
    // Média abaixo de 20 quadros por segundo durante 5 s: baixa um nível (alta, média, baixa) e avisa.
    // Já na Baixa, abaixo de 24 durante 8 s seguidos: entram os cartões (main.js avisa e lembra a escolha na sessão).
    // Não mede com a aba escondida. Com ?qualidade= no endereço a qualidade é fixa e nada disso acontece.
    let fpsBaixos = 0;
    let aquecer = 4; // segundos de espera depois de abrir ou de trocar a qualidade
    const qualidadeFixa = params.has('qualidade');
    vigia = setInterval(() => {
      if (document.hidden || qualidadeFixa) return;
      if (aquecer > 0) { aquecer -= 1; return; }
      const f = cena.fps();
      const naBaixa = cena.qualidade === 'baixa';
      fpsBaixos = f > 0 && f < (naBaixa ? 24 : 20) ? fpsBaixos + 1 : 0;
      if (fpsBaixos < (naBaixa ? 8 : 5)) return;
      fpsBaixos = 0;
      aquecer = 4;
      if (naBaixa) {
        clearInterval(vigia);
        aoFalhar('o mapa ficou lento demais neste computador', { lento: true });
        return;
      }
      const novo = cenaMod.nivelAbaixo(cena.qualidade);
      cena.definirQualidade(novo);
      segQual.definir(novo);
      mostrarAviso(`O mapa estava lento. A qualidade baixou para ${NOME_QUALIDADE[novo]}.`);
    }, 1000);

    // Se o navegador perder o contexto de desenho (placa de vídeo reiniciou), entra o modo cartões.
    cena.canvas.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault();
      clearInterval(vigia);
      aoFalhar('O 3D parou de responder neste computador');
    });

    if (params.get('debug') === '1') {
      window.__cena = cena;
      window.__app = { cena, interacao, sensores, ambiente, dados, etiquetas, ligarSensores };
      import('../cena/conferencia.js').then((m) => { window.__conferirPlanta = () => m.conferirPlanta(cena); });
    }
  }
}
