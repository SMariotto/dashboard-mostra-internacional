// Bloco 4: Mobilidade (fotos de 22/10). Trilho CIRCULAR vermelho de brinquedo sobre base marrom escura com pedrinhas
// brancas, trem branco de 3 vagões com nariz azul que anda no círculo, galpão marrom, faixa vermelha do terminal com
// tracejado amarelo e duas setas, e 3 árvores.
// Não há mais desenho de ônibus, ponto de ônibus, painel de partidas, banco nem da plataforma (a plataforma da planta
// cairia dentro do círculo): os dados deles continuam existindo (contrato, cartões, marcadores S16, S17, S18 e P2).
import * as THREE from 'three';
import { MOBILIDADE, FOTOS_22_10 } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { caixa, instanciar, tracos, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

const N_TRAVESSAS = 48;
const ALT_BASE = 0.3; // altura da base marrom
const ALT_ANEL = 0.45;
const ANGULO_ESTACAO = -0.45; // rad: o trem para "na estação" ao lado do galpão (lado leste do círculo)

/** Seta achatada apontando para +x (comprimento c, largura l), deitada no chão. */
function geometriaSeta(c, l) {
  const s = new THREE.Shape();
  s.moveTo(-c / 2, -l * 0.18);
  s.lineTo(c * 0.1, -l * 0.18);
  s.lineTo(c * 0.1, -l / 2);
  s.lineTo(c / 2, 0);
  s.lineTo(c * 0.1, l / 2);
  s.lineTo(c * 0.1, l * 0.18);
  s.lineTo(-c / 2, l * 0.18);
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function construirMobilidade(F) {
  const g = new THREE.Group();
  g.name = 'mobilidade';
  const A = 'mobilidade';
  const M = MOBILIDADE;
  const FT = FOTOS_22_10.mobilidade;
  const C = FT.circulo;

  // Base marrom escura debaixo do círculo.
  const base = caixa(FT.base, Y_BLOCO, ALT_BASE, F.mat(A, COR.baseCirculo), { arredondar: 0.2 });
  etiquetaPlanta(base, 'base-circulo', FT.base);
  g.add(base);
  const yAnel = Y_BLOCO + ALT_BASE;

  // Anel de plástico vermelho (uma peça só) e travessas escuras (InstancedMesh) que dão o aspecto de escada.
  const formaAnel = new THREE.Shape();
  formaAnel.absarc(0, 0, C.raioExterno, 0, Math.PI * 2, false);
  const furo = new THREE.Path();
  furo.absarc(0, 0, C.raioInterno, 0, Math.PI * 2, true);
  formaAnel.holes.push(furo);
  const geoAnel = new THREE.ExtrudeGeometry(formaAnel, { depth: ALT_ANEL, bevelEnabled: false, curveSegments: 64 });
  geoAnel.rotateX(-Math.PI / 2);
  const anel = new THREE.Mesh(geoAnel, F.mat(A, COR.circuloTrilho));
  anel.position.set(C.cx, yAnel, C.cy);
  etiquetaPlanta(anel, 'circulo-trilho', { x: C.cx - C.raioExterno, y: C.cy - C.raioExterno, w: C.raioExterno * 2, h: C.raioExterno * 2 });
  g.add(anel);
  const raioMeio = (C.raioExterno + C.raioInterno) / 2;
  const largTrilho = C.raioExterno - C.raioInterno;
  const travessas = [];
  for (let i = 0; i < N_TRAVESSAS; i++) {
    const a = (i / N_TRAVESSAS) * Math.PI * 2;
    travessas.push({ x: C.cx + Math.cos(a) * raioMeio, y: yAnel + ALT_ANEL + 0.04, z: C.cy + Math.sin(a) * raioMeio, ry: -a, sx: largTrilho * 0.82, sz: 0.5 });
  }
  const dorm = instanciar(new THREE.BoxGeometry(1, 0.1, 1), F.mat(A, COR.travessaTrilho), travessas);
  dorm.name = 'travessas';
  g.add(dorm);

  // Pedrinhas brancas dentro e fora do anel, e um retalho ao lado do galpão (posições fixas, sem sorteio).
  const pedras = [];
  const anelDePedras = (raio, n, desloc) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + desloc;
      const f = Math.abs(Math.sin(i * 12.9898 + raio * 7.3));
      const r = raio + (f - 0.5) * 0.5;
      pedras.push({ x: C.cx + Math.cos(a) * r, y: yAnel + 0.12, z: C.cy + Math.sin(a) * r, sx: 0.8 + f * 0.5, sy: 0.7, sz: 0.8 + (1 - f) * 0.5 });
    }
  };
  anelDePedras(C.raioExterno + 0.65, 46, 0.05);
  anelDePedras(C.raioInterno - 0.7, 38, 0.1);
  anelDePedras(C.raioInterno - 1.6, 24, 0.3);
  const pe = FT.pedrinhas;
  for (let i = 0; i < 30; i++) {
    const f1 = Math.abs(Math.sin(i * 91.7 + 1.3)), f2 = Math.abs(Math.sin(i * 47.1 + 5.9));
    pedras.push({ x: pe.x + 0.5 + f1 * (pe.w - 1), y: Y_BLOCO + 0.15, z: pe.y + 0.5 + f2 * (pe.h - 1), sx: 0.9 + f1 * 0.6, sy: 0.8, sz: 0.9 + f2 * 0.5 });
  }
  g.add(instanciar(new THREE.IcosahedronGeometry(0.3, 0), F.mat(A, COR.pedrinha), pedras));

  // Galpão marrom de telhado baixo ao lado do círculo (provável estação, não confirmado).
  const ga = FT.galpao;
  const galpao = caixa(ga, Y_BLOCO, ga.altura, F.mat(A, COR.galpao), { arredondar: 0.25 });
  etiquetaPlanta(galpao, 'galpao', { x: ga.x, y: ga.y, w: ga.w, h: ga.h });
  const telhadoG = caixa({ x: ga.x - 0.4, y: ga.y - 0.4, w: ga.w + 0.8, h: ga.h + 0.8 }, Y_BLOCO + ga.altura, 0.45, F.mat(A, COR.galpaoTelhado), { arredondar: 0.15 });
  const portaG = caixa({ x: ga.x + ga.w / 2 - 1, y: ga.y + ga.h - 0.02, w: 2, h: 0.12 }, Y_BLOCO, 2, F.mat(A, '#5E3F28'));
  g.add(galpao, telhadoG, portaG);

  // Faixa vermelha do terminal, com o tracejado amarelo no meio e duas setas brancas (uma para cada sentido).
  const FTm = M.faixaTerminal;
  const faixa = caixa(FTm, Y_BLOCO, 0.08, F.mat(A, COR.faixaTerminal), { arredondar: 0.03 });
  etiquetaPlanta(faixa, 'faixa-terminal', { x: FTm.x, y: FTm.y, w: FTm.w, h: FTm.h });
  g.add(faixa);
  const tr = FTm.tracejado;
  const tracosT = tracos(tr.x1, tr.y1, tr.x2, tr.y2, tr.traco, tr.espaco).map((t) => ({ x: t.cx, y: Y_BLOCO + 0.1, z: t.cy, sx: t.comp, sy: 1, sz: 0.28 }));
  g.add(instanciar(new THREE.BoxGeometry(1, 0.04, 1), F.mat(A, COR.tracejadoTerminalAmarelo), tracosT));
  const geoSeta = geometriaSeta(3.6, 1.3);
  const matSeta = F.mat(A, COR.seta);
  const setaIda = new THREE.Mesh(geoSeta, matSeta);
  setaIda.position.set(FTm.x + 18, Y_BLOCO + 0.12, FTm.y + 1.0);
  const setaVolta = new THREE.Mesh(geoSeta, matSeta);
  setaVolta.rotation.y = Math.PI;
  setaVolta.position.set(FTm.x + 36, Y_BLOCO + 0.12, FTm.y + FTm.h - 1.0);
  g.add(setaIda, setaVolta);

  // Trem de brinquedo: 3 carros brancos, o da frente com nariz azul arredondado. Cada carro acompanha o círculo
  // (posição e giro calculados a partir de uma fração de volta).
  const raioTrem = raioMeio;
  // O trem ocupa uns 25% da volta (foto-37 e foto-47): 3 carros de 6,2 cm no anel de raio médio 12,9 cm.
  const CARRO = { comp: 6.2, larg: 2.0, alt: 1.9, folga: 0.5 };
  const geoCorpo = new THREE.BoxGeometry(CARRO.comp, CARRO.alt, CARRO.larg);
  const matBranco = F.mat(A, COR.tremBranco);
  const matJanelaTrem = F.mat(A, COR.onibusJanela);
  const matAzul = F.mat(A, COR.tremNariz);
  const geoJanela = new THREE.BoxGeometry(CARRO.comp * 0.55, 0.5, 0.06);
  const trem = new THREE.Group();
  trem.name = 'trem';
  const carros = [0, 1, 2].map((i) => {
    const c = new THREE.Group();
    const corpo = new THREE.Mesh(geoCorpo, matBranco);
    corpo.position.y = CARRO.alt / 2 + 0.25;
    c.add(corpo);
    for (const lado of [1, -1]) {
      const j = new THREE.Mesh(geoJanela, matJanelaTrem);
      j.position.set(0, CARRO.alt * 0.62 + 0.25, lado * (CARRO.larg / 2 + 0.02));
      c.add(j);
    }
    if (i === 0) {
      const nariz = new THREE.Mesh(new THREE.CylinderGeometry(CARRO.larg / 2, CARRO.larg / 2, CARRO.alt, 14, 1, false, 0, Math.PI), matAzul);
      nariz.position.set(CARRO.comp / 2, CARRO.alt / 2 + 0.25, 0);
      c.add(nariz);
    }
    trem.add(c);
    return c;
  });
  trem.position.y = yAnel + ALT_ANEL;
  etiquetaPlanta(trem, 'trem', { x: C.cx, y: C.cy, w: 0, h: 0 });
  g.add(trem);
  let fracao = 0;
  /** Põe o trem a `u` voltas (0 a 1) do ponto de partida; o carro da frente anda primeiro. */
  const definirFracao = (u) => {
    fracao = ((u % 1) + 1) % 1;
    carros.forEach((c, i) => {
      const a = fracao * Math.PI * 2 - (i * (CARRO.comp + CARRO.folga)) / raioTrem;
      c.position.set(C.cx + Math.cos(a) * raioTrem, 0, C.cy + Math.sin(a) * raioTrem);
      c.rotation.y = -a - Math.PI / 2;
    });
  };
  definirFracao(ANGULO_ESTACAO / (Math.PI * 2));
  trem.userData.circunferencia = Math.PI * 2 * raioTrem;

  g.add(arvoresDaArea(F, A));
  sombras(g);
  marcarArea(g, A);
  return {
    grupo: g, trem, definirFracao,
    fracao: () => fracao,
    fracaoEstacao: ((ANGULO_ESTACAO / (Math.PI * 2)) % 1 + 1) % 1,
    circunferencia: Math.PI * 2 * raioTrem,
    /** Sem desenho do painel de partidas (o dado continua no contrato e nos cartões). */
    escreverPainel: () => {},
  };
}
