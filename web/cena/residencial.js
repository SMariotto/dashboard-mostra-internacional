// Bloco 2: Área Residencial. 4 casas diferentes de telhado de duas águas (fotos de 22/10): rosa com bordas azuis e
// coração, marrom de porta com grade, verde-água de telhado de escamas e porta em arco, branca de zinco ondulado.
// Faixa verde-água com pedrinhas, retalhos de grama, painel solar no telhado da casa 2, calçada, 2 pontos escuros,
// 3 árvores, persiana na casa 2, bonequinho de presença e brilho de aquecimento (casa 1).
import * as THREE from 'three';
import { RESIDENCIAL, FOTOS_22_10 } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaPersiana, texturaPainel, texturaEscamas, texturaZinco, texturaGrade } from './texturas.js';
import { caixa, caixaCentro, cilindro, instanciar, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

const ALT_TELHADO = 3.4; // altura da cumeeira acima da parede
const BEIRAL = 0.6;
const ESPESSURA_TELHADO = 0.34;

/** Coração achatado, virado para a frente (+z). */
function geometriaCoracao(tam) {
  const s = new THREE.Shape();
  const k = tam / 2;
  s.moveTo(0, -k);
  s.bezierCurveTo(-k * 1.5, -k * 0.1, -k * 0.9, k * 0.9, 0, k * 0.35);
  s.bezierCurveTo(k * 0.9, k * 0.9, k * 1.5, -k * 0.1, 0, -k);
  return new THREE.ShapeGeometry(s, 10);
}

/** Porta em arco (retângulo com topo redondo), virada para a frente (+z). */
function geometriaArco(larg, alt) {
  const r = larg / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, alt - r);
  s.absarc(0, alt - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  return new THREE.ShapeGeometry(s, 12);
}

/**
 * Casa de duas águas: parede, empena (triângulo da frente e do fundo, na cor da parede) e duas placas de telhado.
 * `cumeeira: 'z'` (padrão): a cumeeira corre da frente para o fundo e a empena (triângulo) fica virada para o
 * visitante, como nas fotos. `cumeeira: 'x'`: a cumeeira corre ao longo de x e as águas descem para a frente e para o
 * fundo (usada na casa 2, por causa do painel solar da planta, que fica no meio do telhado).
 * @returns {{parede: THREE.Mesh, telhado: THREE.Mesh, grupo: THREE.Group}}
 */
function casaDuasAguas(c, { matParede, matEmpena, matTelhado, matBorda, cumeeira = 'z' }) {
  const grupo = new THREE.Group();
  const parede = caixa(c, Y_BLOCO, c.alturaParede, matParede, { arredondar: 0.3 });
  etiquetaPlanta(parede, 'casa', { x: c.x, y: c.y, w: c.w, h: c.h });
  grupo.add(parede);

  const base = Y_BLOCO + c.alturaParede;
  const cx = c.x + c.w / 2, cz = c.y + c.h / 2;
  const alongZ = cumeeira === 'z';
  const meio = alongZ ? c.w / 2 : c.h / 2; // meia largura da água
  const largura = alongZ ? c.h : c.w; // comprimento da cumeeira
  // Empena: triângulo extrudado ao longo da cumeeira.
  const tri = new THREE.Shape();
  tri.moveTo(-meio, 0);
  tri.lineTo(meio, 0);
  tri.lineTo(0, ALT_TELHADO);
  tri.closePath();
  const geoEmpena = new THREE.ExtrudeGeometry(tri, { depth: largura - 0.1, bevelEnabled: false });
  if (alongZ) geoEmpena.translate(cx, base, c.y + 0.05);
  else { geoEmpena.rotateY(Math.PI / 2); geoEmpena.translate(c.x + 0.05, base, cz); }
  grupo.add(new THREE.Mesh(geoEmpena, matEmpena));

  // Duas placas de telhado inclinadas, com beiral.
  const alfa = Math.atan2(ALT_TELHADO, meio);
  const vao = meio + BEIRAL;
  const comp = vao / Math.cos(alfa);
  const yMeio = base + ALT_TELHADO - (vao / 2) * Math.tan(alfa) + ESPESSURA_TELHADO * 0.45;
  const yBeiral = base + ALT_TELHADO - ALT_TELHADO * (vao / meio);
  const geoPlaca = alongZ ? new THREE.BoxGeometry(comp, ESPESSURA_TELHADO, largura + 2 * BEIRAL) : new THREE.BoxGeometry(largura + 2 * BEIRAL, ESPESSURA_TELHADO, comp);
  const geoBeiral = alongZ ? new THREE.BoxGeometry(0.34, 0.42, largura + 2 * BEIRAL + 0.04) : new THREE.BoxGeometry(largura + 2 * BEIRAL + 0.04, 0.42, 0.34);
  let telhado = null;
  for (const lado of [1, -1]) {
    const placa = new THREE.Mesh(geoPlaca, matTelhado);
    if (alongZ) { placa.rotation.z = -lado * alfa; placa.position.set(cx + lado * (vao / 2), yMeio, cz); } else { placa.rotation.x = lado * alfa; placa.position.set(cx, yMeio, cz + lado * (vao / 2)); }
    grupo.add(placa);
    telhado ??= placa;
    if (matBorda) {
      // Bordas coloridas nos beirais e na cumeeira.
      const beiral = new THREE.Mesh(geoBeiral, matBorda);
      if (alongZ) { beiral.rotation.z = -lado * alfa; beiral.position.set(cx + lado * (vao - 0.05), yBeiral + 0.02, cz); } else { beiral.rotation.x = lado * alfa; beiral.position.set(cx, yBeiral + 0.02, cz + lado * (vao - 0.05)); }
      grupo.add(beiral);
    }
  }
  if (matBorda) {
    const cume = new THREE.Mesh(alongZ ? new THREE.BoxGeometry(0.5, 0.4, largura + 2 * BEIRAL + 0.04) : new THREE.BoxGeometry(largura + 2 * BEIRAL + 0.04, 0.4, 0.5), matBorda);
    cume.position.set(cx, base + ALT_TELHADO + ESPESSURA_TELHADO * 0.7, cz);
    grupo.add(cume);
  }
  return { parede, telhado, grupo };
}

export function construirResidencial(F) {
  const g = new THREE.Group();
  g.name = 'residencial';
  const A = 'residencial';
  const R = RESIDENCIAL;
  const FT = FOTOS_22_10.residencial;

  // Todas as janelas das casas dividem UM material: a iluminação (F4) troca a cor dele.
  const matJanelas = F.matUnico(A, COR.janelaCasa, { basico: true });
  // A casa 1 tem parede própria, para o brilho laranja do aquecimento.
  const matParede1 = F.matUnico(A, COR.paredeBranca);
  const matParede = F.mat(A, COR.paredeBranca);

  const texEscamas = texturaEscamas(COR.casaVerdeEscama, COR.casaVerdeEscamaLinha);
  texEscamas.repeat.set(3, 2);
  const texZinco = texturaZinco(COR.zinco, COR.zincoSombra);
  texZinco.center.set(0.5, 0.5);
  texZinco.rotation = Math.PI / 2; // a ondulação desce da cumeeira para o beiral
  texZinco.repeat.set(1, 3);
  const estilos = {
    casa1: { matParede: matParede1, matEmpena: F.mat(A, COR.casaRosaFrontao), matTelhado: F.mat(A, COR.casaRosaTelhado), matBorda: F.mat(A, COR.casaRosaBorda) },
    casa2: { matParede, matEmpena: matParede, matTelhado: F.mat(A, COR.casaMarromTelhado), cumeeira: 'x' },
    casa3: { matParede: F.mat(A, COR.casaVerdeParede), matEmpena: F.mat(A, COR.casaVerdeParede), matTelhado: F.mat(A, '#FFFFFF', { map: texEscamas }) },
    casa4: { matParede, matEmpena: matParede, matTelhado: F.mat(A, '#FFFFFF', { map: texZinco }) },
  };

  const todas = [...R.casas, ...FT.casasExtras];
  const casas = {};
  for (const c of todas) {
    const { parede, telhado, grupo } = casaDuasAguas(c, estilos[c.id]);
    g.add(grupo);
    const cx = c.x + c.w / 2;
    const frente = c.y + c.h;
    // Porta e enfeites da fachada.
    if (c.id === 'casa1') {
      g.add(caixaCentro(cx, frente + 0.06, 1.9, 0.14, Y_BLOCO, 3.3, F.mat(A, COR.portaRosa)));
      const coracao = new THREE.Mesh(geometriaCoracao(2.3), F.mat(A, COR.coracao));
      coracao.position.set(cx, Y_BLOCO + 4.6, frente + 0.07);
      g.add(coracao);
    } else if (c.id === 'casa2') {
      const grade = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.3, 0.14), F.mat(A, '#FFFFFF', { map: texturaGrade(COR.portaMarrom, COR.portaGrade) }));
      grade.position.set(cx, Y_BLOCO + 1.65, frente + 0.06);
      g.add(grade);
    } else if (c.id === 'casa3') {
      const arco = new THREE.Mesh(geometriaArco(2.8, 4.1), F.mat(A, COR.arco));
      arco.position.set(cx, Y_BLOCO, frente + 0.07);
      g.add(arco);
    }
    // Janelas (material único): na frente quando a casa tem, e uma em cada lado (menos onde está a persiana).
    const altJanela = Y_BLOCO + c.alturaParede * 0.45;
    if (c.id === 'casa2') g.add(caixaCentro(cx + 3, frente + 0.05, 1.9, 0.1, altJanela, 1.9, matJanelas));
    if (c.id === 'casa4') g.add(caixaCentro(cx, frente + 0.05, 2.6, 0.1, altJanela, 2.4, matJanelas));
    if (c.id !== R.persiana.casa) g.add(caixaCentro(c.x + c.w + 0.05, c.y + c.h / 2, 0.1, 2.6, altJanela, 2.0, matJanelas));
    g.add(caixaCentro(c.x - 0.05, c.y + c.h / 2, 0.1, 2.6, altJanela, 2.0, matJanelas));
    casas[c.id] = { parede, telhado };
  }

  // Painel solar pequeno sobre o telhado da casa do meio, deitado na água do telhado em que a planta o põe.
  const c2 = R.casas.find((c) => c.id === 'casa2');
  const pp = R.painelTelhado;
  const meio2 = c2.h / 2;
  const inclin = Math.atan2(ALT_TELHADO, meio2);
  const cxp = pp.x + pp.w / 2, czp = pp.y + pp.h / 2;
  const dist = Math.abs(czp - (c2.y + c2.h / 2));
  const altNoPonto = Y_BLOCO + c2.alturaParede + ALT_TELHADO * (1 - dist / meio2) + ESPESSURA_TELHADO * 0.9;
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

  // fotos 22/10: faixa verde-água comprida com pedrinhas brancas nas duas bordas.
  const fv = FT.faixaVerde;
  const faixa = caixa(fv, Y_BLOCO, 0.14, F.mat(A, COR.faixaVerde), { arredondar: 0.05 });
  etiquetaPlanta(faixa, 'faixa-verde', { x: fv.x, y: fv.y, w: fv.w, h: fv.h });
  g.add(faixa);
  const pedras = [];
  for (let x = fv.x + 0.4, i = 0; x < fv.x + fv.w; x += 0.85, i++) {
    for (const [lado, zBase] of [[0, fv.y + 0.18], [1, fv.y + fv.h - 0.18]]) {
      const j = Math.sin(i * 12.9898 + lado * 78.233) * 43758.5453;
      const f = j - Math.floor(j);
      pedras.push({ x: x + (f - 0.5) * 0.3, y: Y_BLOCO + 0.2, z: zBase + (f - 0.5) * 0.35, sx: 0.8 + f * 0.55, sy: 0.7, sz: 0.8 + (1 - f) * 0.5 });
    }
  }
  const pedrinhas = instanciar(new THREE.IcosahedronGeometry(0.3, 0), F.mat(A, COR.pedrinha), pedras);
  pedrinhas.name = 'pedrinhas-faixa';
  g.add(pedrinhas);

  // fotos 22/10: retalhos de grama sintética nos vãos entre as casas (um InstancedMesh só).
  const retalhos = FT.retalhosGrama.map((r) => ({ x: r.x + r.w / 2, y: Y_BLOCO + 0.06, z: r.y + r.h / 2, sx: r.w, sy: 1, sz: r.h }));
  const grama = instanciar(new THREE.BoxGeometry(1, 0.12, 1), F.mat(A, COR.grama), retalhos);
  grama.name = 'retalhos-grama';
  g.add(grama);

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
