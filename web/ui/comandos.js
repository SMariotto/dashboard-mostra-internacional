// Faixa de comandos de uma área. Visível só para Controle e Administração.
// Cada grupo mostra a opção ativa pelo dado de eco e a situação do último envio:
// "Enviando...", "Enviado", "Executado" ou "Sem resposta".
import { comandosDoModulo } from '../../compartilhado/contrato.js';
import { h, icone, trocar } from './dom.js';
import { ITEM, ESTADO } from './icones.js';

const SITUACOES = {
  enviando: { texto: 'Enviando...', icone: ITEM.enviar },
  enviado: { texto: 'Enviado', icone: ITEM.espera },
  executado: { texto: 'Executado', icone: ESTADO.ok },
  sem_resposta: { texto: 'Sem resposta', icone: ESTADO.alerta },
  erro: { texto: 'Não enviado', icone: ESTADO.alerta },
};

/**
 * @param {string} modulo
 * @param {{sessao: ReturnType<import('../dados/sessao.js').criarSessao>}} op
 */
export function criarFaixaComandos(modulo, { sessao }) {
  const defs = comandosDoModulo(modulo);
  const el = h('div', { class: 'faixa-comandos' });
  let ultimoEstado = null;

  const grupos = defs.map((def) => {
    const g = { def, idPendente: null, situacao: null, erro: '', botoes: {} };
    g.status = h('span', { class: 'cmd-status', role: 'status', 'aria-live': 'polite' });
    for (const valor of def.valores) {
      g.botoes[valor] = h('button', {
        type: 'button',
        class: 'botao botao-opcao',
        'aria-pressed': 'false',
        onclick: () => enviar(g, valor),
      }, def.textos[valor]);
    }
    g.el = h('div', { class: 'cmd-grupo' },
      h('div', { class: 'cmd-cabeca' }, h('span', { class: 'cmd-rotulo' }, def.rotulo), g.status),
      h('div', { class: 'cmd-botoes' }, Object.values(g.botoes)));
    return g;
  });

  function mostrarSituacao(g) {
    const s = SITUACOES[g.situacao];
    g.status.dataset.situacao = g.situacao ?? '';
    if (!s) { trocar(g.status); return; }
    trocar(g.status, icone(s.icone), g.situacao === 'erro' && g.erro ? g.erro : s.texto);
  }

  async function enviar(g, valor) {
    g.situacao = 'enviando';
    g.idPendente = null;
    mostrarSituacao(g);
    const r = await sessao.pedir('POST', '/api/comando', { modulo, comando: g.def.comando, valor });
    if (r.status === 200 && r.json?.id) {
      g.idPendente = r.json.id;
      g.enviadoEm = Date.now();
      g.situacao = 'enviado';
    } else {
      g.situacao = 'erro';
      g.erro = r.status === 403 ? 'Entre como Controle' : (r.json?.erro ?? 'Não enviado');
    }
    mostrarSituacao(g);
    if (ultimoEstado) atualizar(ultimoEstado);
  }

  // Visitante (e áreas sem comandos): a faixa nem existe. Nada de aviso nem cadeado.
  function desenhar() {
    el.hidden = !defs.length || sessao.papel === 'visualizacao';
    trocar(el, el.hidden ? [] : grupos.map((g) => g.el));
  }

  function atualizar(estado) {
    ultimoEstado = estado;
    const mod = estado.modulos[modulo];
    const desativado = mod?.sinal === 'desativado';
    for (const g of grupos) {
      const eco = mod?.dados?.[g.def.eco.campo];
      for (const [valor, botao] of Object.entries(g.botoes)) {
        const ativo = eco !== undefined && g.def.eco.valor[valor] === eco;
        botao.setAttribute('aria-pressed', String(ativo));
        botao.disabled = desativado;
      }
      if (g.idPendente) {
        const c = estado.comandos?.find((x) => x.id === g.idPendente);
        if (c) {
          g.situacao = c.situacao;
          mostrarSituacao(g);
        } else if (Date.now() - g.enviadoEm > 10_000) {
          // O servidor tira da lista os comandos terminados há mais de 2 minutos: limpa o aviso.
          g.idPendente = null;
          g.situacao = null;
          mostrarSituacao(g);
        }
      }
    }
  }

  desenhar();
  sessao.aoMudar(desenhar);
  return { el, atualizar };
}
