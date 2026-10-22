// Níveis de qualidade da cena 3D. "baixa" desliga as sombras e desenha em 75% da resolução (imagem mais macia, bem mais leve); "media" baixa a
// resolução das sombras; "alta" é o padrão. A troca é feita em tempo de execução (sem recarregar).
export const QUALIDADES = ['alta', 'media', 'baixa'];

export const PRESETS = {
  alta: { pixelRatio: 1.5, sombra: 2048, halos: true },
  media: { pixelRatio: 1.25, sombra: 1024, halos: true },
  baixa: { pixelRatio: 0.75, sombra: 0, halos: false },
};

/** Um nível abaixo (alta, média, baixa); devolve o mesmo nível se já for o último. */
export function nivelAbaixo(q) {
  const i = QUALIDADES.indexOf(q);
  return QUALIDADES[Math.min(QUALIDADES.length - 1, i + 1)];
}

/** WebGL existe e abre neste navegador? (A F4 usa isto para trocar para os cartões.) */
export function webglDisponivel() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
