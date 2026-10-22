// Bloco 1: Energia Renovável. 2 painéis solares inclinados, caixa de baterias, turbina eólica, 2 árvores.
import * as THREE from 'three';
import { ENERGIA } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaPainel } from './texturas.js';
import { caixa, caixaCentro, cilindro, rad, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

export function construirEnergia(F) {
  const g = new THREE.Group();
  g.name = 'energia';
  const A = 'energia';

  // Painéis solares: o retângulo da planta é a sombra no chão (a projeção); a placa fica inclinada
  // para "o sol" (o lado de trás sobe), por isso é um pouco mais comprida que o retângulo.
  const ang = rad(ENERGIA.inclinacaoPainelGraus);
  const texPainel = texturaPainel(COR.painel, COR.painelLinha);
  const matFace = F.mat(A, '#FFFFFF', { map: texPainel, roughness: 0.35 });
  const matMoldura = F.mat(A, COR.moldura);
  const paineis = [];
  for (const p of ENERGIA.paineisSolares) {
    const comp = p.h / Math.cos(ang);
    const sub = comp / 2 * Math.sin(ang);
    const pivo = new THREE.Group();
    pivo.position.set(p.x + p.w / 2, Y_BLOCO + 0.55 + sub, p.y + p.h / 2);
    pivo.rotation.x = ang;
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.35, comp), matMoldura);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(p.w - 0.8, comp - 0.8), matFace);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.19;
    pivo.add(moldura, face);
    // Pés verticais: dois altos atrás (onde a placa sobe) e dois baixos na frente.
    const altoTras = 0.55 + 2 * sub - 0.1;
    for (const dx of [-p.w / 2 + 1.1, p.w / 2 - 1.1]) {
      const tras = new THREE.Mesh(new THREE.BoxGeometry(0.5, altoTras, 0.5), matMoldura);
      tras.position.set(p.x + p.w / 2 + dx, Y_BLOCO + altoTras / 2, p.y + 0.9);
      const frente = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), matMoldura);
      frente.position.set(p.x + p.w / 2 + dx, Y_BLOCO + 0.225, p.y + p.h - 0.9);
      g.add(tras, frente);
    }
    etiquetaPlanta(pivo, 'painel', { x: p.x, y: p.y, w: p.w, h: p.h });
    g.add(pivo);
    paineis.push(pivo);
  }

  // Caixa de baterias (arredondada, com duas tiras e um LED).
  const b = ENERGIA.baterias;
  const caixaBat = caixa(b, Y_BLOCO, b.altura, F.mat(A, COR.bateria), { arredondar: 0.35 });
  etiquetaPlanta(caixaBat, 'baterias', { x: b.x, y: b.y, w: b.w, h: b.h });
  g.add(caixaBat);
  const matTira = F.mat(A, '#8794A1');
  for (const dx of [-1.6, 1.6]) {
    g.add(caixaCentro(b.x + b.w / 2 + dx, b.y + b.h + 0.01, 0.5, 0.06, Y_BLOCO + 0.4, 2.2, matTira));
  }
  const ledBateria = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), F.matUnico(A, '#7BD389', { basico: true }));
  ledBateria.position.set(b.x + b.w - 0.9, Y_BLOCO + b.altura + 0.05, b.y + 0.9);
  g.add(ledBateria);

  // Turbina eólica: torre afinando para cima e rotor de 3 pás num plano vertical voltado para o visitante.
  // As pás ficam a -90, 30 e 150 graus, como na planta (que a desenha de frente, vista de cima como estrela).
  const T = ENERGIA.turbina;
  const matTorre = F.mat(A, COR.torre);
  const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.62, T.alturaTorre, 16), matTorre);
  torre.position.set(T.cx, Y_BLOCO + T.alturaTorre / 2, T.cy);
  etiquetaPlanta(torre, 'turbina', { x: T.cx, y: T.cy, w: 0, h: 0 });
  const base = cilindro(T.cx, T.cy, 1.1, Y_BLOCO, 0.4, F.mat(A, COR.bateria));
  g.add(torre, base);

  const rotor = new THREE.Group();
  rotor.position.set(T.cx, Y_BLOCO + T.alturaTorre, T.cy + 0.9);
  const cubo = new THREE.Mesh(new THREE.SphereGeometry(T.raioCubo, 20, 14), F.mat(A, COR.cubo));
  cubo.scale.set(1, 1, 1.25);
  rotor.add(cubo);
  const forma = new THREE.Shape();
  const r0 = T.raioCubo * 0.8;
  forma.moveTo(r0, -0.55);
  forma.quadraticCurveTo(T.comprimentoPa * 0.5, -0.75, T.comprimentoPa, -0.12);
  forma.lineTo(T.comprimentoPa, 0.2);
  forma.quadraticCurveTo(T.comprimentoPa * 0.5, 0.45, r0, 0.55);
  forma.closePath();
  const geoPa = new THREE.ExtrudeGeometry(forma, { depth: 0.22, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 6 });
  geoPa.translate(0, 0, -0.11);
  const matPa = F.mat(A, COR.pa);
  for (const planta of [-90, 30, 150]) {
    const pa = new THREE.Mesh(geoPa, matPa);
    pa.rotation.z = rad(-planta);
    pa.position.z = 0.3;
    rotor.add(pa);
  }
  g.add(rotor);

  g.add(arvoresDaArea(F, A));
  sombras(g);
  ledBateria.castShadow = false;
  marcarArea(g, A);
  return { grupo: g, paineis, rotor, ledBateria };
}
