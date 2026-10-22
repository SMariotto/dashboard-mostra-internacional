// Luz do dia e da noite. O modo pode ser "auto" (pelo relógio: noite das 18h às 6h), "dia" ou "noite".
// A mudança é suave (1,2 s). À noite o fundo vira um azul-ardósia, a luz esfria e enfraquece, e os LEDs dos
// postes e as janelas acendem (isso quem liga é dados.js, que escuta `aoMudar`).
import * as THREE from 'three';
import { reduzMovimento } from '../ui/dom.js';

const DIA = {
  hemiCor: new THREE.Color('#FFFFFF'), hemiChao: new THREE.Color('#E9DFCF'), hemi: 1.55,
  solCor: new THREE.Color('#FFF3E0'), sol: 2.3, sombra: 0.14,
};
const NOITE = {
  hemiCor: new THREE.Color('#8FA3D6'), hemiChao: new THREE.Color('#39445F'), hemi: 0.62,
  solCor: new THREE.Color('#A9BCFF'), sol: 0.42, sombra: 0.22,
};

/** Noite pelo relógio: das 18h às 6h. */
export const ehNoitePeloRelogio = (data = new Date()) => data.getHours() >= 18 || data.getHours() < 6;

/**
 * @param {object} cena a cena de criarCena()
 * @param {{fundoDia: string, fundoNoite?: string}} op
 */
export function criarAmbiente(cena, { fundoDia, fundoNoite = '#3A4663' }) {
  const corDia = new THREE.Color(fundoDia);
  const corNoite = new THREE.Color(fundoNoite);
  const sombraChao = cena.scene.children.find((o) => o.material?.isShadowMaterial);
  /** @type {'auto'|'dia'|'noite'} */
  let modo = 'auto';
  let t = 0; // 0 dia, 1 noite
  let alvo = 0;
  const ouvintes = new Set();

  const noiteAgora = () => (modo === 'noite' || (modo === 'auto' && ehNoitePeloRelogio()));

  function desenhar() {
    cena.scene.background.copy(corDia).lerp(corNoite, t);
    cena.hemi.color.copy(DIA.hemiCor).lerp(NOITE.hemiCor, t);
    cena.hemi.groundColor.copy(DIA.hemiChao).lerp(NOITE.hemiChao, t);
    cena.hemi.intensity = THREE.MathUtils.lerp(DIA.hemi, NOITE.hemi, t);
    cena.sol.color.copy(DIA.solCor).lerp(NOITE.solCor, t);
    cena.sol.intensity = THREE.MathUtils.lerp(DIA.sol, NOITE.sol, t);
    if (sombraChao) sombraChao.material.opacity = THREE.MathUtils.lerp(DIA.sombra, NOITE.sombra, t);
  }

  function reavaliar({ imediato = false } = {}) {
    const antes = alvo === 1;
    alvo = noiteAgora() ? 1 : 0;
    if (imediato || reduzMovimento()) { t = alvo; desenhar(); }
    if ((alvo === 1) !== antes) for (const f of ouvintes) f(alvo === 1);
  }

  cena.aoQuadro((dt) => {
    if (t === alvo) return;
    const passo = dt / 1.2;
    t = t < alvo ? Math.min(alvo, t + passo) : Math.max(alvo, t - passo);
    desenhar();
  });
  // O relógio pode virar 18h ou 6h com o painel aberto.
  const relogio = setInterval(() => { if (modo === 'auto') reavaliar(); }, 30_000);

  reavaliar({ imediato: true });

  return {
    get modo() { return modo; },
    get noite() { return alvo === 1; },
    /** @param {'auto'|'dia'|'noite'} m */
    definirModo(m) { modo = m; reavaliar(); },
    /** Chamada quando passa de dia para noite ou o contrário. */
    aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    destruir() { clearInterval(relogio); },
  };
}
