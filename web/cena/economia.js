// Bloco 5: Economia Circular. Feltro verde, 3 lixeiras, reservatório com água, 3 canteiros com mudas,
// linha de irrigação (com gotejadores) e 3 árvores.
import * as THREE from 'three';
import { ECONOMIA, buscarBloco } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { caixa, cilindro, clarear, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

export function construirEconomia(F) {
  const g = new THREE.Group();
  g.name = 'economia';
  const A = 'economia';
  const B = buscarBloco(A);

  // Feltro verde no bloco inteiro.
  const matFeltro = F.matUnico(A, COR.feltro);
  const feltro = caixa(B, Y_BLOCO, 0.1, matFeltro, { arredondar: 0.04 });
  etiquetaPlanta(feltro, 'feltro', { x: B.x, y: B.y, w: B.w, h: B.h });
  g.add(feltro);
  const Y = Y_BLOCO + 0.1;

  // Lixeiras (verde, azul e amarela), com tampa mais clara.
  ECONOMIA.lixeiras.forEach((l, i) => {
    const corpo = caixa(l, Y, l.altura, F.mat(A, COR.lixeira[i]), { arredondar: 0.25 });
    etiquetaPlanta(corpo, 'lixeira', { x: l.x, y: l.y, w: l.w, h: l.h });
    const tampa = caixa({ x: l.x - 0.12, y: l.y - 0.12, w: l.w + 0.24, h: l.h + 0.24 }, Y + l.altura, 0.22, F.mat(A, clarear(COR.lixeira[i], 0.45)), { arredondar: 0.1 });
    g.add(corpo, tampa);
  });

  // Reservatório: parede de vidro, água que sobe e desce (escala em Y) e aro que pisca em alerta.
  const R = ECONOMIA.reservatorio;
  const ALTURA_RES = 3.6;
  const vidro = new THREE.Mesh(
    new THREE.CylinderGeometry(R.raio, R.raio, ALTURA_RES, 40, 1, true),
    F.mat(A, COR.vidro, { transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }),
  );
  vidro.position.set(R.cx, Y + ALTURA_RES / 2, R.cy);
  etiquetaPlanta(vidro, 'reservatorio', { x: R.cx - R.raio, y: R.cy - R.raio, w: R.raio * 2, h: R.raio * 2 });
  const fundo = cilindro(R.cx, R.cy, R.raio, Y, 0.2, F.mat(A, '#7FB3C6'));
  const matAro = F.matUnico(A, '#7FB3C6');
  const aro = new THREE.Mesh(new THREE.TorusGeometry(R.raio, 0.14, 8, 48), matAro);
  aro.rotation.x = Math.PI / 2;
  aro.position.set(R.cx, Y + ALTURA_RES, R.cy);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(R.raio - 0.15, R.raio - 0.15, 1, 40), F.mat(A, COR.agua, { transparent: true, opacity: 0.92 }));
  agua.position.set(R.cx, Y + 0.2, R.cy);
  g.add(vidro, fundo, aro, agua);
  /** Nível de 0 a 1: altura da água dentro do reservatório. */
  const definirNivel = (frac) => {
    const h = Math.max(0.02, (ALTURA_RES - 0.3) * Math.min(1, Math.max(0, frac)));
    agua.scale.y = h;
    agua.position.y = Y + 0.2 + h / 2;
  };
  definirNivel(0.67);

  // Canteiros com mudinhas.
  const matCanteiro = F.mat(A, COR.canteiro);
  const matMuda = F.mat(A, COR.muda, { flatShading: true });
  const geoMuda = new THREE.ConeGeometry(0.42, 0.95, 6);
  ECONOMIA.canteiros.forEach((c) => {
    const base = caixa(c, Y, 0.8, matCanteiro, { arredondar: 0.3 });
    etiquetaPlanta(base, 'canteiro', { x: c.x, y: c.y, w: c.w, h: c.h });
    const terra = caixa({ x: c.x + 0.4, y: c.y + 0.4, w: c.w - 0.8, h: c.h - 0.8 }, Y + 0.78, 0.06, F.mat(A, COR.terra));
    g.add(base, terra);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(geoMuda, matMuda);
      m.position.set(c.x + 1.2 + i * ((c.w - 2.4) / 4), Y + 0.84 + 0.47, c.y + c.h / 2 + (i % 2 ? 0.45 : -0.45));
      g.add(m);
    }
  });

  // Linha de irrigação (traços de 0,3 cm de largura) e os 3 gotejadores.
  const I = ECONOMIA.irrigacao;
  const matTubo = F.mat(A, COR.irrigacao);
  for (const s of I.segmentos) {
    const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2);
    const vertical = s.x1 === s.x2;
    const w = vertical ? 0.3 : Math.abs(s.x2 - s.x1);
    const h = vertical ? Math.abs(s.y2 - s.y1) : 0.3;
    g.add(caixa({ x: vertical ? x - 0.15 : x, y: vertical ? y : y - 0.15, w, h }, Y, 0.25, matTubo));
  }
  for (const d of I.gotejadores) g.add(cilindro(d.cx, d.cy, 0.2, Y + 0.25, 1.55, matTubo, 10));

  // Gotas da irrigação: 6 por gotejador, caindo do tubo até a terra (só aparecem com a bomba ligada).
  const POR_GOTEJADOR = 6;
  const gotas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), F.mat(A, '#8EC5E6', { basico: true }), I.gotejadores.length * POR_GOTEJADOR);
  gotas.frustumCulled = false;
  gotas.visible = false;
  g.add(gotas);
  const m4 = new THREE.Matrix4();
  /** Posiciona as gotas no instante t (s); chamada a cada quadro enquanto a bomba está ligada. */
  const animarGotas = (t) => {
    I.gotejadores.forEach((d, gi) => {
      for (let k = 0; k < POR_GOTEJADOR; k++) {
        const fase = (t * 1.1 + k / POR_GOTEJADOR + gi * 0.31) % 1;
        // Cai do bico (Y + 1.8) até a terra do canteiro (Y + 0.9), acelerando.
        m4.makeTranslation(d.cx + ((k % 3) - 1) * 0.45, Y + 1.8 - fase * fase * 0.9, d.cy + 0.6 + (k % 2) * 0.7);
        gotas.setMatrixAt(gi * POR_GOTEJADOR + k, m4);
      }
    });
    gotas.instanceMatrix.needsUpdate = true;
  };

  g.add(arvoresDaArea(F, A));
  sombras(g);
  vidro.castShadow = false;
  gotas.castShadow = false;
  marcarArea(g, A);
  return { grupo: g, matTopo: matFeltro, agua, aro: matAro, definirNivel, alturaReservatorio: ALTURA_RES, gotas, animarGotas };
}
