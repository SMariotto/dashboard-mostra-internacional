// Bloco 2: Área Residencial. 3 casas de telhado de quatro águas, painel solar no telhado da casa do meio,
// calçada, 2 pontos escuros, 3 árvores, persiana na casa 2, bonequinho de presença e brilho de aquecimento.
import * as THREE from 'three';
import { RESIDENCIAL } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaPersiana, texturaPainel } from './texturas.js';
import { caixa, caixaCentro, cilindro, rad, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

const ALT_TELHADO = 3.6;
const BEIRAL = 0.6;

export function construirResidencial(F) {
  const g = new THREE.Group();
  g.name = 'residencial';
  const A = 'residencial';
  const R = RESIDENCIAL;

  // Todas as janelas das casas dividem UM material: a iluminação (F4) troca a cor dele.
  const matJanelas = F.matUnico(A, COR.janelaCasa, { basico: true });
  const matTelhado = F.mat(A, COR.telhado, { flatShading: true });
  const matPorta = F.mat(A, COR.porta);
  // A casa 1 tem parede própria, para o brilho laranja do aquecimento.
  const matParede1 = F.matUnico(A, COR.parede);
  const matParede = F.mat(A, COR.parede);

  const casas = {};
  for (const c of R.casas) {
    const parede = caixa(c, Y_BLOCO, c.alturaParede, c.id === R.aquecimento.casa ? matParede1 : matParede, { arredondar: 0.3 });
    etiquetaPlanta(parede, 'casa', { x: c.x, y: c.y, w: c.w, h: c.h });
    const meio = c.w / 2 + BEIRAL;
    const telhado = new THREE.Mesh(new THREE.ConeGeometry(meio * Math.SQRT2, ALT_TELHADO, 4, 1), matTelhado);
    telhado.rotation.y = Math.PI / 4;
    telhado.position.set(c.x + c.w / 2, Y_BLOCO + c.alturaParede + ALT_TELHADO / 2, c.y + c.h / 2);
    const porta = caixaCentro(c.x + c.w / 2, c.y + c.h + 0.06, 1.9, 0.14, Y_BLOCO, 3.3, matPorta);
    g.add(parede, telhado, porta);
    // Duas janelas na frente (voltada para o visitante) e uma de cada lado.
    for (const dx of [-3, 3]) g.add(caixaCentro(c.x + c.w / 2 + dx, c.y + c.h + 0.05, 1.9, 0.1, Y_BLOCO + 2.7, 1.9, matJanelas));
    if (c.id !== R.persiana.casa) g.add(caixaCentro(c.x + c.w + 0.05, c.y + c.h / 2, 0.1, 2.6, Y_BLOCO + 2.6, 2.0, matJanelas));
    g.add(caixaCentro(c.x - 0.05, c.y + c.h / 2, 0.1, 2.6, Y_BLOCO + 2.6, 2.0, matJanelas));
    casas[c.id] = { parede, telhado };
  }

  // Painel solar pequeno sobre o telhado da casa do meio, deitado na água do telhado em que a planta o põe.
  const c2 = R.casas.find((c) => c.id === 'casa2');
  const pp = R.painelTelhado;
  const meio2 = c2.w / 2 + BEIRAL;
  const inclin = Math.atan(ALT_TELHADO / meio2);
  const cxp = pp.x + pp.w / 2, czp = pp.y + pp.h / 2;
  const dist = Math.max(Math.abs(cxp - (c2.x + c2.w / 2)), Math.abs(czp - (c2.y + c2.h / 2)));
  const altNoPonto = Y_BLOCO + c2.alturaParede + ALT_TELHADO * (1 - dist / meio2);
  const painelRoof = new THREE.Group();
  painelRoof.position.set(cxp, altNoPonto + 0.12, czp);
  painelRoof.rotation.x = -inclin; // a água do lado do fundo (z menor) desce para trás
  const compP = pp.h / Math.cos(inclin);
  const molduraP = new THREE.Mesh(new THREE.BoxGeometry(pp.w, 0.2, compP), F.mat(A, COR.moldura));
  const faceP = new THREE.Mesh(new THREE.PlaneGeometry(pp.w - 0.4, compP - 0.4), F.mat(A, '#FFFFFF', { map: texturaPainel(COR.painel, COR.painelLinha), roughness: 0.35 }));
  faceP.rotation.x = -Math.PI / 2;
  faceP.position.y = 0.11;
  painelRoof.add(molduraP, faceP);
  etiquetaPlanta(painelRoof, 'painel-telhado', { x: pp.x, y: pp.y, w: pp.w, h: pp.h });
  g.add(painelRoof);

  // Persiana na parede lateral direita da casa 2 (servo S15): 1 = fechada, 0 = aberta (recolhida no alto).
  const P = R.persiana;
  const ALT_PERSIANA = 3.4;
  const topoPersiana = Y_BLOCO + 4.6;
  const janelaLateral = caixaCentro(c2.x + c2.w + 0.04, P.cy, 0.1, P.largura + 0.2, Y_BLOCO + 1.0, ALT_PERSIANA + 0.2, matJanelas);
  const texPersiana = texturaPersiana(COR.persiana);
  texPersiana.repeat.set(1, 3);
  const persianaMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, ALT_PERSIANA, P.largura), F.mat(A, '#FFFFFF', { map: texPersiana }));
  persianaMesh.position.y = -ALT_PERSIANA / 2;
  const persianaPivo = new THREE.Group();
  persianaPivo.position.set(c2.x + c2.w + 0.2, topoPersiana, P.cy);
  persianaPivo.add(persianaMesh);
  etiquetaPlanta(persianaPivo, 'persiana', { x: P.cx - 0.2, y: P.cy - P.largura / 2, w: 0.4, h: P.largura });
  g.add(janelaLateral, persianaPivo);
  /** @param {number} frac 0 = aberta (recolhida), 1 = fechada */
  const definirPersiana = (frac) => { persianaPivo.scale.y = Math.max(0.08, Math.min(1, frac)); };
  definirPersiana(1);

  // Calçada e os dois pontos escuros (postes da rua residencial: bases baixas, não acendem).
  const cal = R.calcada;
  const calcada = caixa(cal, Y_BLOCO, 0.12, F.mat(A, COR.calcada), { arredondar: 0.04 });
  etiquetaPlanta(calcada, 'calcada', { x: cal.x, y: cal.y, w: cal.w, h: cal.h });
  g.add(calcada);
  for (const p of R.pontosEscuros) {
    const base = cilindro(p.cx, p.cy, p.raio, Y_BLOCO, 0.7, F.mat(A, COR.poste), 16);
    etiquetaPlanta(base, 'ponto-escuro', { x: p.cx - p.raio, y: p.cy - p.raio, w: p.raio * 2, h: p.raio * 2 });
    g.add(base);
  }

  // Bonequinho de presença perto do sensor S13 (40, 93): aparece com presenca = true.
  const boneco = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 1.6, 4, 10), F.mat(A, COR.roupa));
  corpo.position.y = 1.55;
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), F.mat(A, COR.pele));
  cabeca.position.y = 3.35;
  boneco.add(corpo, cabeca);
  boneco.position.set(R.presenca.cx, Y_BLOCO, R.presenca.cy);
  boneco.visible = false;
  etiquetaPlanta(boneco, 'boneco', { x: R.presenca.cx - 0.8, y: R.presenca.cy - 0.8, w: 1.6, h: 1.6 });
  g.add(boneco);

  // Brilho laranja suave na casa 1 com aquecimento = true (parede com luz própria; o halo vem na F4).
  const definirAquecimento = (ligado) => {
    matParede1.emissive.set(ligado ? '#FF9A4D' : '#000000');
    matParede1.emissiveIntensity = ligado ? 0.38 : 0;
  };

  g.add(arvoresDaArea(F, A));
  sombras(g);
  marcarArea(g, A);
  return { grupo: g, casas, matJanelas, boneco, definirPersiana, definirAquecimento, persiana: persianaPivo };
}
