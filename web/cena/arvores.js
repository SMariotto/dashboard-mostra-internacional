// Árvores de uma área: tronco e copa em InstancedMesh (2 desenhos por área, não 1 por árvore).
import * as THREE from 'three';
import { ARVORES } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { Y_BLOCO } from './util.js';

const ALTURA_TRONCO = 1.9;

/** @returns {THREE.Group} com `userData.arvores` = lista das posições (para a conferência com a planta). */
export function arvoresDaArea(F, area) {
  const lista = ARVORES.filter((a) => a.bloco === area);
  const g = new THREE.Group();
  g.name = `arvores-${area}`;
  if (!lista.length) return g;

  const troncos = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.32, ALTURA_TRONCO, 8),
    F.mat(area, COR.tronco),
    lista.length,
  );
  const copas = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    F.mat(area, '#FFFFFF', { flatShading: true }),
    lista.length,
  );
  const m4 = new THREE.Matrix4();
  const cor = new THREE.Color();
  lista.forEach((a, i) => {
    m4.makeTranslation(a.cx, Y_BLOCO + ALTURA_TRONCO / 2, a.cy);
    troncos.setMatrixAt(i, m4);
    // Copa: esfera baixa com o raio da planta, apoiada sobre o tronco.
    m4.makeScale(a.r, a.r * 0.95, a.r);
    m4.setPosition(a.cx, Y_BLOCO + ALTURA_TRONCO + a.r * 0.55, a.cy);
    copas.setMatrixAt(i, m4);
    cor.set(i % 2 ? COR.copa : COR.copaClara);
    copas.setColorAt(i, cor);
  });
  troncos.instanceMatrix.needsUpdate = true;
  copas.instanceMatrix.needsUpdate = true;
  if (copas.instanceColor) copas.instanceColor.needsUpdate = true;
  for (const m of [troncos, copas]) { m.castShadow = true; m.receiveShadow = true; }
  g.add(troncos, copas);
  g.userData.arvores = lista.map((a) => ({ cx: a.cx, cy: a.cy, r: a.r }));
  g.userData.copas = copas;
  return g;
}
