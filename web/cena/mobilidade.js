// Bloco 4: Mobilidade. Trilho com dormentes, plataforma da estação, ponto de ônibus com painel de partidas,
// ônibus azul, faixa vermelha do terminal, banco de espera, trem que anda no trilho e 3 árvores.
import * as THREE from 'three';
import { MOBILIDADE } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { painelPartidas } from './texturas.js';
import { caixa, caixaCentro, contorno, instanciar, tracos, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

export function construirMobilidade(F) {
  const g = new THREE.Group();
  g.name = 'mobilidade';
  const A = 'mobilidade';
  const M = MOBILIDADE;

  // Trilho: dois trilhos finos (bitola 2) e dormentes a cada 3 cm de x 61 a 109.
  const T = M.trilho;
  const matTrilho = F.mat(A, COR.trilho);
  const z1 = T.y, z2 = T.y + T.bitola;
  const compTrilho = T.x2 - T.x1;
  const trilhos = new THREE.Group();
  for (const z of [z1, z2]) {
    trilhos.add(caixa({ x: T.x1, y: z - 0.15, w: compTrilho, h: 0.3 }, Y_BLOCO + 0.2, 0.3, matTrilho));
  }
  etiquetaPlanta(trilhos, 'trilho', { x: T.x1, y: z1, w: compTrilho, h: T.bitola });
  g.add(trilhos);
  const dormentes = [];
  for (let x = T.x1; x <= 109 + 1e-6; x += T.passoDormente) dormentes.push({ x: x + 0.4, y: Y_BLOCO + 0.1, z: (z1 + z2) / 2, sx: 0.8, sy: 1, sz: T.bitola + 1.6 });
  const dorm = instanciar(new THREE.BoxGeometry(1, 0.2, 1), F.mat(A, COR.dormente), dormentes);
  dorm.name = 'dormentes';
  g.add(dorm);

  // Plataforma da estação (contorno sólido) e ponto de ônibus (contorno sólido).
  const matPlat = F.mat(A, COR.plataforma);
  const matContorno = F.mat(A, COR.contornoPlataforma);
  const pl = M.plataforma;
  const plat = caixa(pl, Y_BLOCO, 0.4, matPlat, { arredondar: 0.12 });
  etiquetaPlanta(plat, 'plataforma', { x: pl.x, y: pl.y, w: pl.w, h: pl.h });
  g.add(plat, contorno(pl, Y_BLOCO + 0.4, 0.22, 0.04, matContorno));
  const po = M.pontoOnibus;
  const ponto = caixa(po, Y_BLOCO, 0.3, matPlat, { arredondar: 0.12 });
  etiquetaPlanta(ponto, 'ponto-onibus', { x: po.x, y: po.y, w: po.w, h: po.h });
  g.add(ponto, contorno(po, Y_BLOCO + 0.3, 0.22, 0.04, matContorno));

  // Painel de partidas (P2): um pedestal baixo com a tela voltada para o visitante.
  const pp = M.painelPartidas;
  const pedestal = caixaCentro(pp.cx, pp.cy, pp.w, pp.h, Y_BLOCO + 0.3, 2.9, F.mat(A, COR.roda), { arredondar: 0.2 });
  etiquetaPlanta(pedestal, 'painel-partidas', { x: pp.cx - pp.w / 2, y: pp.cy - pp.h / 2, w: pp.w, h: pp.h });
  const painel = painelPartidas();
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(pp.w - 0.5, 1.9), F.mat(A, '#FFFFFF', { basico: true, map: painel.textura }));
  tela.position.set(pp.cx, Y_BLOCO + 0.3 + 1.7, pp.cy + pp.h / 2 + 0.02);
  g.add(pedestal, tela);

  // Ônibus azul parado perto do ponto: corpo arredondado, faixa de janelas e 4 rodas.
  const O = M.onibus;
  const bus = new THREE.Group();
  const corpo = caixa({ x: 0, y: 0, w: O.w, h: O.h }, 0.55, 3.2, F.mat(A, COR.onibus), { arredondar: 0.6 });
  bus.add(corpo);
  const matVidro = F.mat(A, COR.onibusJanela);
  for (const zFace of [O.h + 0.03, -0.03]) {
    for (let i = 0; i < 4; i++) {
      const j = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.2, 0.1), matVidro);
      j.position.set(1.9 + i * 2.5, 2.4, zFace);
      bus.add(j);
    }
  }
  // Para-brisa na frente (lado +x).
  const para = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, O.h - 0.8), matVidro);
  para.position.set(O.w + 0.03, 2.4, O.h / 2);
  bus.add(para);
  const matRoda = F.mat(A, COR.roda);
  for (const [x, z] of [[2.4, 0], [O.w - 2.4, 0], [2.4, O.h], [O.w - 2.4, O.h]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 14), matRoda);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, 0.62, z);
    bus.add(r);
  }
  bus.position.set(O.x, Y_BLOCO, O.y);
  etiquetaPlanta(bus, 'onibus', { x: O.x, y: O.y, w: O.w, h: O.h });
  g.add(bus);

  // Faixa vermelha do terminal, com o tracejado claro no meio.
  const FT = M.faixaTerminal;
  const faixa = caixa(FT, Y_BLOCO, 0.08, F.mat(A, COR.faixaTerminal), { arredondar: 0.03 });
  etiquetaPlanta(faixa, 'faixa-terminal', { x: FT.x, y: FT.y, w: FT.w, h: FT.h });
  g.add(faixa);
  const tr = FT.tracejado;
  const tracosT = tracos(tr.x1, tr.y1, tr.x2, tr.y2, tr.traco, tr.espaco).map((t) => ({ x: t.cx, y: Y_BLOCO + 0.1, z: t.cy, sx: t.comp, sy: 1, sz: 0.28 }));
  g.add(instanciar(new THREE.BoxGeometry(1, 0.04, 1), F.mat(A, COR.faixaTerminalTraco), tracosT));

  // Peça em (95, 84): banco de espera (assento, encosto e 2 pés).
  const pc = M.peca;
  const matBanco = F.mat(A, COR.banco);
  const banco = new THREE.Group();
  banco.add(
    caixa({ x: pc.x, y: pc.y + 0.4, w: pc.w, h: pc.h - 0.4 }, Y_BLOCO + 1.5, 0.5, matBanco, { arredondar: 0.15 }),
    caixa({ x: pc.x, y: pc.y, w: pc.w, h: 0.5 }, Y_BLOCO + 1.5, 1.8, matBanco, { arredondar: 0.15 }),
    caixa({ x: pc.x + 0.4, y: pc.y + 0.6, w: 0.5, h: pc.h - 0.8 }, Y_BLOCO, 1.5, matBanco),
    caixa({ x: pc.x + pc.w - 0.9, y: pc.y + 0.6, w: 0.5, h: pc.h - 0.8 }, Y_BLOCO, 1.5, matBanco),
  );
  etiquetaPlanta(banco, 'banco', { x: pc.x, y: pc.y, w: pc.w, h: pc.h });
  g.add(banco);

  // Trem curto azul sobre o trilho. `definirX(x)` põe o centro em x (limitado ao trilho).
  const TR = M.trem;
  const trem = new THREE.Group();
  const matTrem = F.mat(A, COR.trem);
  const corpoT = new THREE.Mesh(new THREE.BoxGeometry(TR.comprimento, TR.altura, TR.largura), matTrem);
  corpoT.position.y = TR.altura / 2 + 0.55;
  const teto = new THREE.Mesh(new THREE.BoxGeometry(TR.comprimento - 0.4, 0.3, TR.largura - 0.5), F.mat(A, '#F4F1EA'));
  teto.position.y = TR.altura + 0.55 + 0.1;
  trem.add(corpoT, teto);
  for (const lado of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const j = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.1), F.mat(A, COR.onibusJanela));
      j.position.set(-3 + i * 3, TR.altura / 2 + 0.95, lado * (TR.largura / 2 + 0.03));
      trem.add(j);
    }
  }
  const nariz = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, TR.largura - 0.8), F.mat(A, COR.onibusJanela));
  nariz.position.set(TR.comprimento / 2 + 0.03, TR.altura / 2 + 0.95, 0);
  trem.add(nariz);
  for (const x of [-3.2, -1.1, 1.1, 3.2]) {
    for (const lado of [1, -1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), matRoda);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, 0.5, lado * 0.95);
      trem.add(r);
    }
  }
  trem.position.set(TR.xPlataforma, Y_BLOCO, TR.y);
  etiquetaPlanta(trem, 'trem', { x: TR.xPlataforma - TR.comprimento / 2, y: TR.y - TR.largura / 2, w: TR.comprimento, h: TR.largura });
  g.add(trem);
  const definirX = (x) => { trem.position.x = Math.min(TR.xMax - TR.comprimento / 2, Math.max(TR.xMin + TR.comprimento / 2, x)); };

  g.add(arvoresDaArea(F, A));
  sombras(g);
  tela.castShadow = false;
  marcarArea(g, A);
  return { grupo: g, trem, definirX, onibus: bus, tela, escreverPainel: painel.escrever, xPlataforma: TR.xPlataforma, xMin: TR.xMin + TR.comprimento / 2, xMax: TR.xMax - TR.comprimento / 2 };
}
