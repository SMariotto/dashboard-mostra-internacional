// Fila de comandos por módulo. O ESP32 busca os pendentes na resposta da leitura e confirma depois.
// Situação de cada comando, como o botão mostra:
//   "enviado"      na fila ou já entregue ao ESP32, esperando a confirmação
//   "executado"    o ESP32 (ou o simulador) confirmou
//   "sem_resposta" passou o prazo (30 s) sem confirmação

/**
 * @param {object} op
 * @param {number} op.expiraMs
 * @param {() => number} [op.agora]
 * @param {number} [op.guardarMs] quanto tempo os comandos terminados continuam na lista
 */
export function criarFilaComandos({ expiraMs, agora = Date.now, guardarMs = 120_000 }) {
  /** @type {{id: string, modulo: string, comando: string, valor: string, criado: number, entregue: number|null, respondido: number|null, situacao: string}[]} */
  let lista = [];
  let contador = 0;
  const ouvintes = new Set();
  const avisar = () => { for (const fn of ouvintes) { try { fn(); } catch (e) { console.error('[comandos] erro num ouvinte:', e); } } };

  /** Marca "sem_resposta" nos vencidos e tira da lista os antigos. Devolve true se algo mudou. */
  function vencer() {
    const t = agora();
    let mudou = false;
    for (const c of lista) {
      if (c.situacao === 'enviado' && t - c.criado > expiraMs) { c.situacao = 'sem_resposta'; c.respondido = t; mudou = true; }
    }
    const antes = lista.length;
    lista = lista.filter((c) => c.situacao === 'enviado' || t - c.respondido <= guardarMs);
    return mudou || lista.length !== antes;
  }

  return {
    /** @returns {{id: string, modulo: string, comando: string, valor: string}} */
    adicionar({ modulo, comando, valor }) {
      vencer();
      contador += 1;
      const c = { id: `c-${agora().toString(36)}-${contador}`, modulo, comando, valor, criado: agora(), entregue: null, respondido: null, situacao: 'enviado' };
      lista.push(c);
      avisar();
      return { id: c.id, modulo, comando, valor };
    },

    /** Comandos ainda não entregues deste módulo (cada um é entregue uma vez só). */
    retirar(modulo) {
      if (vencer()) avisar();
      const t = agora();
      const saida = [];
      for (const c of lista) {
        if (c.modulo === modulo && c.situacao === 'enviado' && c.entregue === null) {
          c.entregue = t;
          saida.push({ id: c.id, modulo: c.modulo, comando: c.comando, valor: c.valor });
        }
      }
      return saida;
    },

    /** @returns {boolean} false se o id não existe, é de outro módulo ou já venceu */
    confirmar(modulo, id) {
      vencer();
      const c = lista.find((x) => x.id === id && x.modulo === modulo);
      if (!c || c.situacao !== 'enviado') return false;
      c.situacao = 'executado';
      c.respondido = agora();
      avisar();
      return true;
    },

    /** Chamado a cada segundo. */
    verificar() { if (vencer()) avisar(); },

    /** Comandos recentes, para a tela. `ms`: tempo até a resposta. */
    recentes() {
      return lista.map((c) => ({
        id: c.id, modulo: c.modulo, comando: c.comando, valor: c.valor, situacao: c.situacao, criado: c.criado,
        ms: c.situacao === 'executado' ? c.respondido - c.criado : null,
      }));
    },

    aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
  };
}
