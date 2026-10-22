// Número que conta até o valor novo em 400 ms (sem animação com prefers-reduced-motion).
import { h, pulsar, reduzMovimento } from './dom.js';
import { numero as fmt, SEM_DADO } from './formatar.js';

const DURACAO_MS = 400;

/**
 * @param {{casas?: number, classe?: string}} [op]
 * @returns {{el: HTMLElement, definir: (v: unknown) => void}}
 */
export function criarNumero({ casas = 0, classe = '' } = {}) {
  const el = h('span', { class: `num ${classe}`.trim() }, SEM_DADO);
  let atual = null;
  let quadro = 0;

  return {
    el,
    definir(v) {
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        cancelAnimationFrame(quadro);
        atual = null;
        el.textContent = SEM_DADO;
        return;
      }
      if (atual !== null && fmt(v, casas) === fmt(atual, casas)) { atual = v; return; }
      const de = atual;
      atual = v;
      cancelAnimationFrame(quadro);
      if (de === null || reduzMovimento()) { el.textContent = fmt(v, casas); return; }
      pulsar(el);
      const t0 = performance.now();
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / DURACAO_MS);
        const suave = 1 - (1 - k) ** 3;
        el.textContent = fmt(de + (v - de) * suave, casas);
        if (k < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    },
  };
}
