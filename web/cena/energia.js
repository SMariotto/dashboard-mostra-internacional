// Bloco 1: Energia Renovável. Grama sintética, 4 painéis solares inclinados, caixa de baterias, 3 turbinas eólicas
// com base redonda de pedrinhas brancas (fotos de 22/10) e 2 árvores. As 3 turbinas giram juntas com `eolica_w`.
import * as THREE from 'three';
import { ENERGIA, FOTOS_22_10, buscarBloco } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaPainel } from './texturas.js';
import { caixa, caixaCentro, cilindro, instanciar, rad, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

export function construirEnergia(F) {
  const g = new THREE.Group();
  g.name = 'energia';
  const A = 'energia';
  const B = buscarBloco(A);
  const FT = FOTOS_22_10.energia;

  // Grama sintética sobre o bloco, deixando uma borda fina da tinta da área. É um material próprio, porque o
  // bloco "desativado" ganha as listras também por cima da grama (ver dados.js, matTopo).
  const matTopo = F.matUnico(A, COR.gramaEnergia);
  const margem = 0.8;
  const grama = caixa({ x: B.x + margem, y: B.y + margem, w: B.w - 2 * margem, h: B.h - 2 * margem }, Y_BLOCO, 0.1, matTopo, { arredondar: 0.04 });
  g.add(grama);
  const Y = Y_BLOCO + 0.1; // topo da grama

  // Painéis solares: o retângulo da planta é a sombra no chão (a projeção); a placa fica inclinada
  // para "o sol" (o lado de trás sobe), por isso é um pouco mais comprida que o retângulo.
  const ang = rad(ENERGIA.inclinacaoPainelGraus);
  const texPainel = texturaPainel(COR.painelCinza, COR.painelCinzaLinha);
  const matFace = F.mat(A, '#FFFFFF', { map: texPainel, roughness: 0.35 });
  const matMoldura = F.mat(A, COR.molduraPainel);
  const paineis = [];
  for (const p of [...ENERGIA.paineisSolares, ...FT.paineisExtras]) {
    const comp = p.h / Math.cos(ang);
    const sub = comp / 2 * Math.sin(ang);
    const pivo = new THREE.Group();
    pivo.position.set(p.x + p.w / 2, Y + 0.55 + sub, p.y + p.h / 2);
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
      tras.position.set(p.x + p.w / 2 + dx, Y + altoTras / 2, p.y + 0.9);
      const frente = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), matMoldura);
      frente.position.set(p.x + p.w / 2 + dx, Y + 0.225, p.y + p.h - 0.9);
      g.add(tras, frente);
    }
    etiquetaPlanta(pivo, 'painel', { x: p.x, y: p.y, w: p.w, h: p.h });
    g.add(pivo);
    paineis.push(pivo);
  }

  // Caixa de baterias (arredondada, com duas tiras e um LED). A foto não mostra caixa de baterias: não confirmado, fica.
  const b = ENERGIA.baterias;
  const caixaBat = caixa(b, Y, b.altura, F.mat(A, COR.bateria), { arredondar: 0.35 });
  etiquetaPlanta(caixaBat, 'baterias', { x: b.x, y: b.y, w: b.w, h: b.h });
  g.add(caixaBat);
  const matTira = F.mat(A, '#8794A1');
  for (const dx of [-1.6, 1.6]) {
    g.add(caixaCentro(b.x + b.w / 2 + dx, b.y + b.h + 0.01, 0.5, 0.06, Y + 0.4, 2.2, matTira));
  }
  const ledBateria = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), F.matUnico(A, '#7BD389', { basico: true }));
  ledBateria.position.set(b.x + b.w - 0.9, Y + b.altura + 0.05, b.y + 0.9);
  g.add(ledBateria);

  // Turbinas eólicas: torre afinando para cima e rotor de 3 pás num plano vertical voltado para o visitante, sobre
  // uma base redonda branca com pedrinhas. As pás ficam a -90, 30 e 150 graus, como na planta.
  // A primeira turbina é a da planta; as outras duas são das fotos de 22/10.
  const T = ENERGIA.turbina;
  const matTorre = F.mat(A, COR.torre);
  const matBaseTurbina = F.mat(A, COR.baseTurbina);
  const geoTorre = new THREE.CylinderGeometry(0.3, 0.62, T.alturaTorre, 16);
  const geoCubo = new THREE.SphereGeometry(T.raioCubo, 20, 14);
  const matCubo = F.mat(A, COR.cubo);
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

  const rotores = [];
  const pedras = [];
  [{ cx: T.cx, cy: T.cy }, ...FT.turbinasExtras].forEach((t, k) => {
    const torre = new THREE.Mesh(geoTorre, matTorre);
    torre.position.set(t.cx, Y + 0.35 + T.alturaTorre / 2, t.cy);
    etiquetaPlanta(torre, 'turbina', { x: t.cx, y: t.cy, w: 0, h: 0 });
    g.add(torre, cilindro(t.cx, t.cy, FT.raioBaseTurbina, Y, 0.35, matBaseTurbina, 28));
    // Pedrinhas brancas: um anel na borda e outro por dentro (posições fixas, sem sorteio).
    for (const [raio, n] of [[FT.raioBaseTurbina - 0.2, 14], [FT.raioBaseTurbina - 0.95, 8]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.7 + raio;
        const f = Math.abs(Math.sin(i * 12.9898 + k * 4.1 + raio * 3));
        pedras.push({ x: t.cx + Math.cos(a) * raio, y: Y + 0.4, z: t.cy + Math.sin(a) * raio, sx: 0.8 + f * 0.5, sy: 0.7, sz: 0.8 + (1 - f) * 0.5 });
      }
    }
    const rotor = new THREE.Group();
    rotor.position.set(t.cx, Y + 0.35 + T.alturaTorre, t.cy + 0.9);
    const cubo = new THREE.Mesh(geoCubo, matCubo);
    cubo.scale.set(1, 1, 1.25);
    rotor.add(cubo);
    for (const planta of [-90, 30, 150]) {
      const pa = new THREE.Mesh(geoPa, matPa);
      pa.rotation.z = rad(-planta);
      pa.position.z = 0.3;
      rotor.add(pa);
    }
    g.add(rotor);
    rotores.push(rotor);
  });
  g.add(instanciar(new THREE.IcosahedronGeometry(0.3, 0), F.mat(A, COR.pedrinha), pedras));

  g.add(arvoresDaArea(F, A));
  sombras(g);
  ledBateria.castShadow = false;
  marcarArea(g, A);
  return { grupo: g, paineis, rotor: rotores[0], rotores, ledBateria, matTopo };
}
