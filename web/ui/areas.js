// Componentes das áreas: tile (cartão da grade), detalhe (todos os dados + comandos) e destaque da cidade.
// Os mesmos componentes servem a grade larga do modo cartões, o celular e o painel estreito do 3D (F3).
//
// Regras do visual V1:
//  - um número grande por cartão; o resto em texto pequeno;
//  - estado normal vira só uma bolinha; Alerta, Sem sinal e Desativado viram pílula com ícone e texto;
//  - nada de comandos, cadeado ou aviso de login para o visitante.
import { CAMPOS, buscarModulo } from '../../compartilhado/contrato.js';
import { h, icone, pulsar, trocar } from './dom.js';
import { AREA, ESTADO, ITEM } from './icones.js';
import { criarNumero } from './numero.js';
import { textoCampo, horaSeg, numero as fmt, SEM_DADO } from './formatar.js';
import { criarFaixaComandos } from './comandos.js';
import { pilulasDeAlerta } from './alertas.js';

// ---------------------------------------------------------------------------
// Estado de uma área

/** @returns {{chave: 'ok'|'alerta'|'sem_sinal'|'desativado', texto: string, icone: string}} */
export function estadoDaArea(id, estado) {
  const mod = estado?.modulos?.[id];
  if (!mod) return { chave: 'sem_sinal', texto: 'Sem sinal', icone: ESTADO.semSinal };
  if (mod.sinal === 'desativado') return { chave: 'desativado', texto: 'Desativado', icone: ESTADO.desativado };
  if (mod.sinal === 'sem_sinal') return { chave: 'sem_sinal', texto: 'Sem sinal', icone: ESTADO.semSinal };
  if (estado.alertas?.some((a) => a.modulo === id)) return { chave: 'alerta', texto: 'Alerta', icone: ESTADO.alerta };
  return { chave: 'ok', texto: 'Funcionando', icone: ESTADO.ok };
}

/** Bolinha (estado normal) ou pílula (qualquer outro). Devolve o elemento e quem o atualiza. */
export function criarIndicador() {
  const el = h('span', { class: 'indicador' });
  return {
    el,
    atualizar(id, estado) {
      const e = estadoDaArea(id, estado);
      el.dataset.estado = e.chave;
      if (e.chave === 'ok') {
        el.className = 'indicador bolinha';
        el.title = 'Funcionando';
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', 'Funcionando');
        trocar(el);
      } else {
        el.className = 'indicador pilula';
        el.removeAttribute('title');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        trocar(el, icone(e.icone), e.texto);
      }
    },
  };
}

/** Bolha pastel com o ícone da área. */
export function bolhaDaArea(id) {
  return h('span', { class: 'bolha', 'aria-hidden': 'true' }, icone(AREA[id]));
}

/** Selo discreto: a leitura traz valores de teste do sketch (campo opcional "teste" do módulo). */
export function criarSeloTeste() {
  return h('span', { class: 'selo-teste', title: 'Valores de teste do sketch, não de um sensor ligado' }, 'Valor de teste');
}
const ehTeste = (mod) => mod?.dados?.teste === true && mod.sinal !== 'desativado';

/** Aviso de sem sinal ou desativado, ou null. */
function avisoDeSinal(mod) {
  if (mod?.sinal === 'sem_sinal') return mod.ultimaLeitura ? `Última leitura às ${horaSeg(mod.ultimaLeitura)}` : 'Ainda sem nenhuma leitura';
  if (mod?.sinal === 'desativado') return 'Módulo desativado pela administração';
  return null;
}

const barra = () => {
  const preenchimento = h('i');
  return { el: h('span', { class: 'barra', 'aria-hidden': 'true' }, preenchimento), definir(pct) { preenchimento.style.width = `${Math.max(0, Math.min(100, typeof pct === 'number' ? pct : 0))}%`; } };
};

const soma = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a + b : undefined);

// ---------------------------------------------------------------------------
// Conteúdo de cada área
//
// numero: o UM número grande ({valor, casas, unidade}) ou texto ({texto}).
// linhas: texto pequeno (no máximo 2 no tile).

const TILE = {
  energia: (d) => ({
    numero: { valor: soma(d.solar_w, d.eolica_w), casas: 1, unidade: 'W' },
    rotulo: 'Geração agora',
    linhas: [`Solar ${fmt(d.solar_w, 1)} W`, `Eólica ${fmt(d.eolica_w, 1)} W`],
  }),
  residencial: (d) => ({
    numero: { valor: d.temperatura_c, casas: 1, unidade: '°C' },
    rotulo: 'Temperatura da casa',
    linhas: [`Umidade ${fmt(d.umidade_pct)} %`, textoCampo('residencial', 'presenca', d.presenca)],
  }),
  centro: (d) => ({
    numero: { valor: d.vagas_livres, casas: 0, unidade: 'de 4' },
    rotulo: 'Vagas livres',
    linhas: [`Semáforo ${textoCampo('centro', 'semaforo', d.semaforo).toLowerCase()}`, `Postes ${textoCampo('centro', 'postes', d.postes).toLowerCase()}`],
  }),
  mobilidade: (d) => ({
    numero: { texto: d.proximo_veiculo ?? SEM_DADO },
    rotulo: 'Próximo veículo',
    linhas: [`Trem ${textoCampo('mobilidade', 'trem', d.trem).toLowerCase()}`, `Terminal ${textoCampo('mobilidade', 'terminal', d.terminal).toLowerCase()}`],
  }),
  economia: (d) => ({
    numero: { valor: d.umidade_solo_pct, casas: 0, unidade: '%' },
    rotulo: 'Umidade do solo',
    linhas: [`Reservatório ${fmt(d.reservatorio_pct)} %`, `Bomba ${textoCampo('economia', 'bomba', d.bomba).toLowerCase()}`],
  }),
};

/** Lista de dados do detalhe, em texto pequeno: [rótulo, valor]. */
const STATS = {
  energia: (d) => [
    ['Tensão da bateria', `${fmt(d.bateria_v, 2)} V`],
    ['Consumo', `${fmt(d.consumo_w, 1)} W`],
    ['Solar', `${fmt(d.solar_w, 1)} W`],
    ['Eólica', `${fmt(d.eolica_w, 1)} W`],
  ],
  residencial: (d) => [
    ['Umidade do ar', `${fmt(d.umidade_pct)} %`],
    ['Aquecimento', textoCampo('residencial', 'aquecimento', d.aquecimento)],
    ['Presença', textoCampo('residencial', 'presenca', d.presenca)],
    ['Persiana', textoCampo('residencial', 'persiana', d.persiana)],
    ['Iluminação', textoCampo('residencial', 'iluminacao', d.iluminacao)],
  ],
  centro: (d) => [
    ['Semáforo', textoCampo('centro', 'semaforo', d.semaforo)],
    ['Postes', textoCampo('centro', 'postes', d.postes)],
  ],
  mobilidade: (d) => [
    ['Terminal', textoCampo('mobilidade', 'terminal', d.terminal)],
    ['Veículo na plataforma', textoCampo('mobilidade', 'veiculo_na_plataforma', d.veiculo_na_plataforma)],
    ['Trem', textoCampo('mobilidade', 'trem', d.trem)],
    ['Demonstração', textoCampo('mobilidade', 'demonstracao', d.demonstracao)],
  ],
  economia: (d) => [
    ['Bomba', textoCampo('economia', 'bomba', d.bomba)],
    ['Irrigação', textoCampo('economia', 'irrigacao', d.irrigacao)],
  ],
};

/** Número grande de um cartão: contagem animada de 400 ms ou texto. */
function criarNumeroGrande(classe = '') {
  const num = criarNumero({ casas: 0 });
  const texto = h('span', { class: 'texto-grande', hidden: true });
  const unidade = h('span', { class: 'unidade' });
  const el = h('span', { class: `numero-grande ${classe}`.trim() }, num.el, texto, unidade);
  let casasAtuais = 0;
  const regravar = (casas) => {
    // criarNumero fixa as casas na criação: troca o elemento se mudar (só ocorre uma vez por cartão)
    if (casas === casasAtuais) return;
    casasAtuais = casas;
    const novo = criarNumero({ casas });
    el.replaceChild(novo.el, num.el);
    num.el = novo.el;
    num.definir = novo.definir;
  };
  return {
    el,
    definir(n) {
      if ('texto' in n) {
        num.el.hidden = true; unidade.hidden = true; texto.hidden = false;
        if (texto.textContent !== n.texto) { if (texto.textContent && texto.textContent !== SEM_DADO) pulsar(texto); texto.textContent = n.texto; }
        return;
      }
      texto.hidden = true; num.el.hidden = false; unidade.hidden = false;
      regravar(n.casas ?? 0);
      num.definir(n.valor);
      unidade.textContent = n.unidade ?? '';
    },
  };
}

// ---------------------------------------------------------------------------
// Tile: o cartão da grade

/**
 * @param {string} id
 * @param {{tag?: 'a'|'button'}} [op]  'a' leva ao detalhe pelo endereço (#id); 'button' expande no celular
 */
export function criarTile(id, { tag = 'a' } = {}) {
  const m = buscarModulo(id);
  const ind = criarIndicador();
  const numero = criarNumeroGrande();
  const rotulo = h('span', { class: 'tile-rotulo' });
  const linhas = h('span', { class: 'tile-linhas' });
  const alertas = h('span', { class: 'tile-alertas' });
  const selo = criarSeloTeste();
  // Só a seta num círculo (o texto fica para leitor de tela): evita "Ver detalhes" repetido em todo cartão.
  const mais = h('span', { class: 'tile-mais' }, icone(ITEM.seta), h('span', { class: 'so-leitor' }, 'Ver detalhes'));
  const el = h(tag, {
    class: `tile area-${id}`,
    ...(tag === 'a' ? { href: `#${id}` } : { type: 'button', 'aria-expanded': 'false' }),
  },
  h('span', { class: 'tile-topo' }, bolhaDaArea(id), h('span', { class: 'tile-nome' }, m.nome), ind.el),
  h('span', { class: 'tile-meio' }, numero.el, rotulo),
  linhas, alertas,
  mais);

  return {
    el,
    atualizar(estado) {
      const mod = estado.modulos[id];
      const d = mod.dados ?? {};
      const c = TILE[id](d);
      el.dataset.sinal = mod.sinal;
      ind.atualizar(id, estado);
      numero.definir(c.numero);
      rotulo.textContent = c.rotulo;
      const aviso = avisoDeSinal(mod);
      trocar(linhas, aviso ? h('span', { class: 'tile-aviso' }, aviso) : c.linhas.map((t) => h('span', {}, t)));
      const alertasDaArea = mod.sinal === 'ok' ? (estado.alertas ?? []).filter((a) => a.modulo === id) : [];
      trocar(alertas, ehTeste(mod) && selo, pilulasDeAlerta(alertasDaArea));
    },
  };
}

// ---------------------------------------------------------------------------
// Detalhe: todos os dados da área e, para Controle e Administração, os comandos

/**
 * @param {string} id
 * @param {{sessao?: object, semCabeca?: boolean}} [op]
 */
export function criarDetalhe(id, { sessao, semCabeca = false } = {}) {
  const m = buscarModulo(id);
  const ind = criarIndicador();
  const numero = criarNumeroGrande('numero-heroi');
  const rotulo = h('span', { class: 'heroi-rotulo' });
  const barraHeroi = id === 'energia' ? barra() : null;
  const aviso = h('p', { class: 'det-aviso', hidden: true });
  const selo = criarSeloTeste();
  selo.hidden = true;
  const stats = h('dl', { class: 'stats' });
  const extra = h('div', { class: 'det-extra' });
  const comandos = sessao ? criarFaixaComandos(id, { sessao }) : null;

  // Desenhos pequenos de cada área
  const luzes = ['vermelho', 'amarelo', 'verde'].map((cor) => h('span', { class: `luz luz-${cor}` }));
  const vagas = [0, 1, 2, 3].map(() => h('span', { class: 'vaga' }));
  const barraReserva = barra();
  const textoReserva = h('span', { class: 'reserva-valor' });
  if (id === 'centro') {
    trocar(extra, h('div', { class: 'desenho-vagas', 'aria-hidden': 'true' }, vagas), h('div', { class: 'desenho-semaforo', 'aria-hidden': 'true' }, luzes));
  } else if (id === 'economia') {
    trocar(extra, h('div', { class: 'reserva' }, h('span', { class: 'reserva-rotulo' }, icone(ITEM.tanque), 'Reservatório'), textoReserva, barraReserva.el));
  } else extra.hidden = true;

  const cabeca = semCabeca ? null : h('header', { class: 'det-topo' }, bolhaDaArea(id), h('h2', { class: 'det-nome' }, m.nome), ind.el);
  const el = h('section', { class: `detalhe area-${id}`, 'aria-label': m.nome },
    cabeca,
    h('div', { class: 'det-avisos' }, aviso, selo),
    h('div', { class: 'heroi' }, numero.el, rotulo, barraHeroi?.el),
    extra,
    stats,
    comandos?.el);

  return {
    el,
    atualizar(estado) {
      const mod = estado.modulos[id];
      const d = mod.dados ?? {};
      el.dataset.sinal = mod.sinal;
      ind.atualizar(id, estado);
      const texto = avisoDeSinal(mod);
      selo.hidden = !ehTeste(mod);
      aviso.hidden = !texto;
      if (texto) trocar(aviso, icone(mod.sinal === 'desativado' ? ESTADO.desativado : ESTADO.semSinal), mod.sinal === 'sem_sinal' ? `Sem sinal. ${texto}` : texto);

      if (id === 'energia') {
        numero.definir({ valor: d.bateria_pct, casas: 0, unidade: '%' });
        rotulo.textContent = 'Carga da bateria';
        barraHeroi.definir(d.bateria_pct);
        barraHeroi.el.dataset.baixo = String(typeof d.bateria_pct === 'number' && d.bateria_pct < 20);
      } else {
        const c = TILE[id](d);
        // No detalhe, o número grande da área é o mesmo do tile, exceto a Energia (bateria).
        numero.definir(c.numero);
        rotulo.textContent = c.rotulo;
      }
      if (id === 'centro') {
        vagas.forEach((q, i) => {
          const livre = typeof d.vagas_livres === 'number' && i < d.vagas_livres;
          q.dataset.livre = String(livre);
          q.innerHTML = livre ? '' : ITEM.carro;
        });
        for (const l of luzes) l.dataset.acesa = String(l.classList.contains(`luz-${d.semaforo}`));
      }
      if (id === 'economia') {
        textoReserva.textContent = `${fmt(d.reservatorio_pct)} %`;
        barraReserva.definir(d.reservatorio_pct);
        barraReserva.el.dataset.baixo = String(typeof d.reservatorio_pct === 'number' && d.reservatorio_pct < 20);
      }
      trocar(stats, STATS[id](d).map(([r, v]) => h('div', { class: 'stat' }, h('dt', {}, r), h('dd', {}, v))));
      comandos?.atualizar(estado);
    },
  };
}

// ---------------------------------------------------------------------------
// Destaque da cidade: o único cartão colorido da tela. A cor segue a situação da energia.

const SITUACAO_TOM = { mais: 'salvia', igual: 'gelo', menos: 'ambar' };

export function criarDestaque() {
  const folha = h('span', { class: 'destaque-folha', 'aria-hidden': 'true', html: ITEM.folhaCheia });
  const frase = h('h2', { class: 'destaque-frase' }, SEM_DADO);
  const bat = criarNumero({ casas: 0 });
  const barraBat = barra();
  const cons = criarNumero({ casas: 1 });
  const alertas = h('div', { class: 'destaque-alertas', role: 'status' });
  const selo = criarSeloTeste();
  const el = h('section', { class: 'destaque', 'aria-label': 'Energia da cidade' },
    folha,
    h('p', { class: 'destaque-rotulo' }, 'Energia da cidade'),
    frase,
    h('div', { class: 'destaque-numeros' },
      h('div', { class: 'dn' },
        h('span', { class: 'dn-rotulo' }, 'Bateria'),
        h('span', { class: 'dn-valor' }, bat.el, h('span', { class: 'unidade' }, '%')),
        barraBat.el),
      h('div', { class: 'dn' },
        h('span', { class: 'dn-rotulo' }, 'Consumo'),
        h('span', { class: 'dn-valor' }, cons.el, h('span', { class: 'unidade' }, 'W')))),
    alertas);
  let fraseAntes;
  return {
    el,
    atualizar(estado) {
      const mod = estado.modulos.energia;
      const d = mod?.dados ?? {};
      const semDado = mod?.sinal !== 'ok';
      const tom = semDado ? 'ardosia' : (SITUACAO_TOM[d.situacao] ?? 'ardosia');
      el.dataset.tom = tom;
      el.dataset.sinal = mod?.sinal ?? 'sem_sinal';
      const texto = mod?.sinal === 'desativado' ? 'Energia desativada' : (mod?.sinal === 'sem_sinal' ? 'Energia sem sinal' : textoCampo('energia', 'situacao', d.situacao));
      if (fraseAntes !== undefined && texto !== fraseAntes) pulsar(frase);
      fraseAntes = texto;
      frase.textContent = texto;
      bat.definir(d.bateria_pct);
      barraBat.definir(d.bateria_pct);
      barraBat.el.dataset.baixo = String(typeof d.bateria_pct === 'number' && d.bateria_pct < 20);
      cons.definir(d.consumo_w);
      // Alerta de uma área sem sinal ou desativada seria de dado velho: some, como no tile da área.
      trocar(alertas, ehTeste(mod) && selo, pilulasDeAlerta((estado.alertas ?? []).filter((a) => estado.modulos[a.modulo]?.sinal === 'ok'), { comArea: true }));
    },
  };
}

/** Os 3 mini-cartões do topo (Bateria, Consumo, Situação) que acompanham as páginas de área. */
export function criarMinis() {
  const bat = criarNumero({ casas: 0 });
  const barraBat = barra();
  const cons = criarNumero({ casas: 1 });
  const sit = h('span', { class: 'mini-texto' }, SEM_DADO);
  const CURTO = { mais: 'Gerando mais', igual: 'Equilibrado', menos: 'Consumindo mais' };
  const el = h('div', { class: 'minis' },
    h('div', { class: 'mini' }, h('span', { class: 'mini-rotulo' }, 'Bateria'), h('span', { class: 'mini-valor' }, bat.el, h('span', { class: 'unidade' }, '%')), barraBat.el),
    h('div', { class: 'mini' }, h('span', { class: 'mini-rotulo' }, 'Consumo'), h('span', { class: 'mini-valor' }, cons.el, h('span', { class: 'unidade' }, 'W'))),
    h('div', { class: 'mini' }, h('span', { class: 'mini-rotulo' }, 'Situação'), sit));
  return {
    el,
    atualizar(estado) {
      const d = estado.modulos.energia?.dados ?? {};
      el.dataset.sinal = estado.modulos.energia?.sinal ?? 'sem_sinal';
      bat.definir(d.bateria_pct);
      barraBat.definir(d.bateria_pct);
      barraBat.el.dataset.baixo = String(typeof d.bateria_pct === 'number' && d.bateria_pct < 20);
      cons.definir(d.consumo_w);
      sit.textContent = CURTO[d.situacao] ?? SEM_DADO;
    },
  };
}

export { CAMPOS };
