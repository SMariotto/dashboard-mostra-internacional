// Ajudantes de DOM, sem framework.

/**
 * Cria um elemento. props: class, html, style (objeto), on<evento>, demais viram atributos.
 * @param {string} tag
 * @param {Record<string, any>|null} [props]
 * @param {...any} filhos
 */
export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : String(f));
  }
  return el;
}

/** Ícone SVG decorativo (o texto ao lado é que explica). */
export function icone(svg, classe = '') {
  return h('span', { class: `icone ${classe}`.trim(), 'aria-hidden': 'true', html: svg });
}

/** Troca o conteúdo de um elemento. */
export function trocar(el, ...filhos) {
  el.replaceChildren(...filhos.flat(Infinity).filter((f) => f !== null && f !== undefined && f !== false));
}

/** Reinicia a animação de pulso (valor mudou). */
export function pulsar(el) {
  if (!el || reduzMovimento()) return;
  el.classList.remove('pulso');
  void el.offsetWidth; // força o navegador a reiniciar a animação
  el.classList.add('pulso');
}

export function reduzMovimento() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** sessionStorage e localStorage podem falhar (modo privado): nunca deixa quebrar. */
export const guardar = {
  ler(chave, area = 'session') {
    try { return (area === 'local' ? localStorage : sessionStorage).getItem(chave); } catch { return null; }
  },
  gravar(chave, valor, area = 'session') {
    try {
      const s = area === 'local' ? localStorage : sessionStorage;
      if (valor === null) s.removeItem(chave); else s.setItem(chave, valor);
    } catch { /* sem armazenamento: segue sem lembrar */ }
  },
};
