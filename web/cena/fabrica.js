// Fábrica de materiais da cena. Cada material é registrado na área a que pertence, para o modo
// "sem sinal" (dessaturar) e o "desativado" (dessaturar e listrar) mexerem só nas cores daquela área.
// As cores de tinta vêm dos tokens do CSS (web/estilo/tokens.css), para a cena combinar com a tela.
import * as THREE from 'three';

const FALLBACK = {
  fundo: '#F5F1EA',
  energia: '#F9EBD0', residencial: '#F6D5D1', centro: '#E1ECF6', mobilidade: '#E4E8EE', economia: '#DDEBE2',
  energiaForte: '#8A5A12', residencialForte: '#C23B34', centroForte: '#3C6E9B', mobilidadeForte: '#4A5D73', economiaForte: '#3F6B54',
};

/** Lê uma variável de tokens.css; se não houver CSS (teste, por exemplo), usa o valor de reserva. */
function token(nome, reserva) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : reserva;
  } catch { return reserva; }
}

export function tintas() {
  const t = { fundo: token('--fundo', FALLBACK.fundo) };
  for (const id of ['energia', 'residencial', 'centro', 'mobilidade', 'economia']) {
    t[id] = token(`--${id}-pastel`, FALLBACK[id]);
    t[`${id}Forte`] = token(`--${id}-forte`, FALLBACK[`${id}Forte`]);
  }
  return t;
}

const hsl = { h: 0, s: 0, l: 0 };

export function criarFabrica() {
  /** @type {Map<string, Set<THREE.Material>>} */
  const porArea = new Map();
  const cache = new Map();
  /** Filtro de estado por área: 0 normal, 1 sem sinal (dessaturado), 2 desativado (dessaturado e listrado). */
  const filtro = new Map();

  /** Cor que o material mostra, dada a cor base e o filtro da área. */
  function efetiva(m) {
    const c = m.userData.corBase.clone();
    const nivel = filtro.get(m.userData.area) ?? 0;
    if (nivel > 0) {
      c.getHSL(hsl);
      // Tira a cor e escurece um pouco; material com textura (painel solar, persiana) só escurece.
      c.setHSL(hsl.h, hsl.s * 0.1, m.map ? hsl.l * 0.78 : Math.min(1, hsl.l * 0.96 + 0.01));
    }
    return c;
  }

  /**
   * @param {string|null} area id da área (ou null para vias, base, postes)
   * @param {string} hex
   * @param {object} [op] opções do material; `basico: true` cria um MeshBasicMaterial (luz própria: LED, janela, tela)
   */
  function mat(area, hex, op = {}) {
    const { basico, _unico, ...resto } = op;
    const chave = resto.map ? null : JSON.stringify([area, hex, basico ?? false, resto, _unico ?? 0]);
    if (chave && cache.has(chave)) return cache.get(chave);
    const m = basico
      ? new THREE.MeshBasicMaterial({ color: hex, ...resto })
      : new THREE.MeshStandardMaterial({ color: hex, roughness: 0.88, metalness: 0, ...resto });
    m.userData.corBase = new THREE.Color(hex);
    m.userData.area = area;
    if (chave) cache.set(chave, m);
    const k = area ?? '_';
    if (!porArea.has(k)) porArea.set(k, new Set());
    porArea.get(k).add(m);
    return m;
  }

  /** Um material próprio (não compartilhado), para o que muda de cor sozinho (semáforo, janelas...). */
  function matUnico(area, hex, op = {}) {
    return mat(area, hex, { ...op, _unico: Math.random() });
  }

  /** Muda a cor de um material respeitando o filtro de estado da área. */
  function pintar(m, hex) {
    m.userData.corBase.set(hex);
    m.color.copy(efetiva(m));
  }

  /** @param {string} area @param {0|1|2} nivel */
  function definirFiltro(area, nivel) {
    if ((filtro.get(area) ?? 0) === nivel) return;
    filtro.set(area, nivel);
    for (const m of porArea.get(area) ?? []) m.color.copy(efetiva(m));
  }

  return { mat, matUnico, pintar, definirFiltro, porArea, materiaisDa: (area) => [...(porArea.get(area) ?? [])] };
}
