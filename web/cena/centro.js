// Bloco 3: Centro Urbano. 3 prédios com janelas, praça circular, semáforo, estacionamento com 4 vagas.
import * as THREE from 'three';
import { CENTRO } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { caixa, caixaCentro, cilindro, clarear, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

/** Janelas de um prédio: grade de quadradinhos nas 4 faces, num só desenho (geometria juntada). */
function janelasDoPredio(p, material) {
  const pos = [];
  const idx = [];
  let n = 0;
  const quad = (cx, cy, cz, ux, uz, w, h) => {
    // Retângulo vertical centrado em (cx, cy, cz), largura w ao longo de (ux, uz), altura h.
    const hx = (ux * w) / 2, hz = (uz * w) / 2, hy = h / 2;
    pos.push(cx - hx, cy - hy, cz - hz, cx + hx, cy - hy, cz + hz, cx + hx, cy + hy, cz + hz, cx - hx, cy + hy, cz - hz);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3, n, n + 2, n + 1, n, n + 3, n + 2);
    n += 4;
  };
  const eps = 0.03;
  const largJ = 0.95, altJ = 1.2;
  const nivelMax = Math.floor((p.altura - 1.2) / 2.6);
  const face = (comprimento, fixo, ladoZ, ladoX) => {
    const cols = Math.max(1, Math.floor((comprimento - 0.6) / 2));
    const passo = comprimento / cols;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r <= nivelMax; r++) {
        const alt = Y_BLOCO + 1.4 + r * 2.6;
        const off = -comprimento / 2 + passo * (c + 0.5);
        if (ladoZ !== 0) quad(fixo.cx + off, alt, fixo.cz + ladoZ * (fixo.d / 2 + eps), 1, 0, largJ, altJ);
        else quad(fixo.cx + ladoX * (fixo.d / 2 + eps), alt, fixo.cz + off, 0, 1, largJ, altJ);
      }
    }
  };
  const cx = p.x + p.w / 2, cz = p.y + p.h / 2;
  face(p.w, { cx, cz, d: p.h }, 1, 0);
  face(p.w, { cx, cz, d: p.h }, -1, 0);
  face(p.h, { cx, cz, d: p.w }, 0, 1);
  face(p.h, { cx, cz, d: p.w }, 0, -1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return new THREE.Mesh(geo, material);
}

export function construirCentro(F) {
  const g = new THREE.Group();
  g.name = 'centro';
  const A = 'centro';

  // Prédios baixos em cinzas (o mais alto à direita). As janelas compartilham UM material: o modo
  // noite (F4) troca a cor dele de vidro para luz acesa.
  const matJanela = F.matUnico(A, COR.janelaDia, { basico: true });
  CENTRO.predios.forEach((p, i) => {
    const corpo = caixa(p, Y_BLOCO, p.altura, F.mat(A, COR.predio[i]), { arredondar: 0.3 });
    etiquetaPlanta(corpo, 'predio', { x: p.x, y: p.y, w: p.w, h: p.h });
    const topo = caixa({ x: p.x - 0.15, y: p.y - 0.15, w: p.w + 0.3, h: p.h + 0.3 }, Y_BLOCO + p.altura, 0.3, F.mat(A, clarear(COR.predio[i], 0.35)), { arredondar: 0.1 });
    g.add(corpo, topo, janelasDoPredio(p, matJanela));
  });

  // Praça circular azul clara com um anel interno.
  const P = CENTRO.praca;
  const praca = cilindro(P.cx, P.cy, P.raio, Y_BLOCO, 0.18, F.mat(A, COR.praca));
  etiquetaPlanta(praca, 'praca', { x: P.cx - P.raio, y: P.cy - P.raio, w: P.raio * 2, h: P.raio * 2 });
  const anel = new THREE.Mesh(new THREE.TorusGeometry(P.raioAnel, 0.12, 8, 40), F.mat(A, COR.pracaAnel));
  anel.rotation.x = Math.PI / 2;
  anel.position.set(P.cx, Y_BLOCO + 0.22, P.cy);
  const agua = cilindro(P.cx, P.cy, P.raioAnel - 0.1, Y_BLOCO + 0.18, 0.06, F.mat(A, COR.pracaAguaCentro));
  g.add(praca, anel, agua);

  // Semáforo: poste fino e uma caixa com as 3 luzes, voltada para a avenida (o visitante). Cada luz
  // tem o seu material; a que está acesa segue o campo `semaforo`, as outras ficam apagadas.
  const S = CENTRO.semaforo;
  const sx = S.caixa.x + S.caixa.w / 2, sz = S.caixa.y + S.caixa.h / 2;
  const matCaixaSem = F.mat(A, COR.semaforoCaixa);
  const posteSem = cilindro(sx, sz, 0.18, Y_BLOCO, 5.2, matCaixaSem, 10);
  const cabeca = caixaCentro(sx, sz, S.caixa.w - 0.2, 1.0, Y_BLOCO + 3.3, 3.6, matCaixaSem, { arredondar: 0.3 });
  etiquetaPlanta(cabeca, 'semaforo', { x: S.caixa.x, y: S.caixa.y, w: S.caixa.w, h: S.caixa.h });
  g.add(posteSem, cabeca);
  const luzes = {};
  // De cima para baixo: vermelho, amarelo, verde.
  S.luzes.forEach((l, i) => {
    const mat = F.matUnico(A, COR.semaforoApagado, { basico: true });
    const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), mat);
    lampada.scale.z = 0.6;
    lampada.position.set(sx, Y_BLOCO + 3.3 + 3.6 - 0.75 - i * 1.05, sz + 0.5);
    g.add(lampada);
    luzes[l.cor] = { mat, acesa: COR.semaforo[l.cor], apagada: COR.semaforoApagado, lampada };
  });
  // Estado inicial de repouso (F4 liga pelo dado): verde aceso.
  luzes.verde.mat.color.set(luzes.verde.acesa);

  // Estacionamento: placa branca de 24 x 12 com as divisões das 4 vagas (x 58 e y 26).
  const E = CENTRO.estacionamento;
  const pad = caixa(E, Y_BLOCO, 0.12, F.mat(A, COR.estacionamento));
  etiquetaPlanta(pad, 'estacionamento', { x: E.x, y: E.y, w: E.w, h: E.h });
  const matLinha = F.mat(A, COR.estacionamentoLinha);
  g.add(
    pad,
    caixa({ x: 58 - 0.12, y: E.y, w: 0.24, h: E.h }, Y_BLOCO + 0.12, 0.04, matLinha),
    caixa({ x: E.x, y: 26 - 0.12, w: E.w, h: 0.24 }, Y_BLOCO + 0.12, 0.04, matLinha),
    caixa({ x: E.x, y: E.y, w: E.w, h: 0.2 }, Y_BLOCO + 0.12, 0.04, matLinha),
    caixa({ x: E.x, y: E.y + E.h - 0.2, w: E.w, h: 0.2 }, Y_BLOCO + 0.12, 0.04, matLinha),
    caixa({ x: E.x, y: E.y, w: 0.2, h: E.h }, Y_BLOCO + 0.12, 0.04, matLinha),
    caixa({ x: E.x + E.w - 0.2, y: E.y, w: 0.2, h: E.h }, Y_BLOCO + 0.12, 0.04, matLinha),
  );

  // Carros pequenos, um por vaga; F4 mostra (4 menos vagas_livres) deles.
  const carros = E.vagas.map((v, i) => {
    const c = new THREE.Group();
    const cor = F.mat(A, COR.carros[i]);
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 2.6), cor);
    corpo.position.y = 0.8;
    const cabine = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.95, 2.2), F.mat(A, '#E8EEF3'));
    cabine.position.set(-0.2, 1.8, 0);
    const matRoda = F.mat(A, COR.roda);
    for (const [dx, dz] of [[-1.7, 1.35], [1.7, 1.35], [-1.7, -1.35], [1.7, -1.35]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), matRoda);
      r.rotation.x = Math.PI / 2;
      r.position.set(dx, 0.5, dz);
      c.add(r);
    }
    c.add(corpo, cabine);
    c.position.set(v.cx, Y_BLOCO + 0.12, v.cy);
    etiquetaPlanta(c, 'carro', { x: v.cx - 3, y: v.cy - 1.5, w: 6, h: 3 });
    g.add(c);
    return c;
  });

  g.add(arvoresDaArea(F, A));
  sombras(g);
  g.traverse((o) => { if (o.isMesh && o.material === matJanela) o.castShadow = false; });
  marcarArea(g, A);
  return { grupo: g, matJanela, luzes, carros };
}
