// Conferência automática da cena contra a geometria da planta (compartilhado/maquete.js).
// Só é carregada com ?debug=1 (página solta) e pelo ferramentas/cena.js; não pesa na tela normal.
//
// Para cada objeto marcado com userData.planta (ver util.js, etiquetaPlanta) mede a caixa dele no
// chão (X e Z do mundo) e compara com o retângulo esperado em cm. Para o que a planta desenha como
// ponto ou como forma diferente da 3D (turbina, semáforo), compara só o centro.
import * as THREE from 'three';
import {
  PALETE, BLOCOS, VIAS, ENERGIA, CENTRO, ECONOMIA, RESIDENCIAL, MOBILIDADE, ARVORES, POSTES,
} from '../../compartilhado/maquete.js';

const TOL = 0.6; // cm
const SO_CENTRO = new Set(['turbina', 'semaforo', 'carro']);

const circulo = (c) => ({ x: c.cx - c.raio, y: c.cy - c.raio, w: c.raio * 2, h: c.raio * 2 });
const bloco = (id) => BLOCOS.find((b) => b.id === id);

/** O que a planta manda, por tipo de item: lista de retângulos {x, y, w, h}. */
function esperado() {
  const E = CENTRO.estacionamento;
  return {
    palete: [{ x: 0, y: 0, w: PALETE.largura, h: PALETE.profundidade }],
    asfalto: [PALETE.util],
    ...Object.fromEntries(BLOCOS.map((b) => [`bloco:${b.id}`, [{ x: b.x, y: b.y, w: b.w, h: b.h }]])),
    ...Object.fromEntries(VIAS.map((v) => [`via:${v.id}`, [{ x: v.x, y: v.y, w: v.w, h: v.h }]])),
    painel: ENERGIA.paineisSolares,
    baterias: [ENERGIA.baterias],
    turbina: [{ x: ENERGIA.turbina.cx, y: ENERGIA.turbina.cy, w: 0, h: 0 }],
    predio: CENTRO.predios,
    praca: [circulo({ cx: CENTRO.praca.cx, cy: CENTRO.praca.cy, raio: CENTRO.praca.raio })],
    semaforo: [{ x: CENTRO.semaforo.caixa.x, y: CENTRO.semaforo.caixa.y, w: CENTRO.semaforo.caixa.w, h: CENTRO.semaforo.caixa.h }],
    estacionamento: [{ x: E.x, y: E.y, w: E.w, h: E.h }],
    carro: E.vagas.map((v) => ({ x: v.cx - 3, y: v.cy - 1.5, w: 6, h: 3 })),
    feltro: [bloco('economia')],
    lixeira: ECONOMIA.lixeiras.map((l) => ({ x: l.x, y: l.y, w: l.w, h: l.h })),
    reservatorio: [circulo(ECONOMIA.reservatorio)],
    canteiro: ECONOMIA.canteiros,
    casa: RESIDENCIAL.casas.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h })),
    'painel-telhado': [RESIDENCIAL.painelTelhado],
    calcada: [RESIDENCIAL.calcada],
    'ponto-escuro': RESIDENCIAL.pontosEscuros.map(circulo),
    persiana: [{ x: RESIDENCIAL.persiana.cx - 0.2, y: RESIDENCIAL.persiana.cy - RESIDENCIAL.persiana.largura / 2, w: 0.4, h: RESIDENCIAL.persiana.largura }],
    boneco: [{ x: RESIDENCIAL.presenca.cx - 0.8, y: RESIDENCIAL.presenca.cy - 0.8, w: 1.6, h: 1.6 }],
    trilho: [{ x: MOBILIDADE.trilho.x1, y: MOBILIDADE.trilho.y, w: MOBILIDADE.trilho.x2 - MOBILIDADE.trilho.x1, h: MOBILIDADE.trilho.bitola }],
    plataforma: [MOBILIDADE.plataforma],
    'ponto-onibus': [MOBILIDADE.pontoOnibus],
    'painel-partidas': [{ x: MOBILIDADE.painelPartidas.cx - 1.5, y: MOBILIDADE.painelPartidas.cy - 1, w: 3, h: 2 }],
    onibus: [MOBILIDADE.onibus],
    'faixa-terminal': [MOBILIDADE.faixaTerminal],
    banco: [MOBILIDADE.peca],
  };
}

/**
 * @param {{maquete: THREE.Object3D, objetos: object, postes: object}} cena
 * @returns {{ok: boolean, falhas: string[], itens: {item: string, desvioMax: number, ok: boolean}[], total: number}}
 */
export function conferirPlanta(cena) {
  cena.maquete.updateMatrixWorld(true);
  const achados = {};
  cena.maquete.traverse((o) => {
    const p = o.userData.planta;
    if (!p || !Object.hasOwn(o.userData, 'planta')) return;
    const caixa = new THREE.Box3().setFromObject(o);
    const tam = caixa.getSize(new THREE.Vector3());
    (achados[p.item] ??= []).push({ x: caixa.min.x, y: caixa.min.z, w: tam.x, h: tam.z });
  });

  const itens = [];
  const falhas = [];
  for (const [item, lista] of Object.entries(esperado())) {
    const obtidos = [...(achados[item] ?? [])];
    let desvioMax = 0;
    let ok = obtidos.length === lista.length;
    if (!ok) falhas.push(`${item}: esperava ${lista.length} e a cena tem ${obtidos.length}`);
    for (const e of lista) {
      if (!obtidos.length) { ok = false; break; }
      // O mais próximo pelo centro.
      let melhor = 0, melhorDist = Infinity;
      obtidos.forEach((o, i) => {
        const d = Math.hypot(o.x + o.w / 2 - (e.x + e.w / 2), o.y + o.h / 2 - (e.y + e.h / 2));
        if (d < melhorDist) { melhorDist = d; melhor = i; }
      });
      const [o] = obtidos.splice(melhor, 1);
      const so = SO_CENTRO.has(item);
      const dif = so
        ? [o.x + o.w / 2 - (e.x + e.w / 2), o.y + o.h / 2 - (e.y + e.h / 2)]
        : [o.x - e.x, o.y - e.y, o.w - e.w, o.h - e.h];
      const m = Math.max(...dif.map(Math.abs));
      desvioMax = Math.max(desvioMax, m);
      if (m > TOL) { ok = false; falhas.push(`${item}: desvio de ${m.toFixed(2)} cm em (${e.x}, ${e.y})`); }
    }
    itens.push({ item, desvioMax: +desvioMax.toFixed(3), ok });
  }

  // Árvores: posição e raio de cada copa (matrizes das instâncias).
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3(), esc = new THREE.Vector3(), q = new THREE.Quaternion();
  const copas = [];
  cena.maquete.traverse((o) => {
    if (o.userData.copas) {
      for (let i = 0; i < o.userData.copas.count; i++) {
        o.userData.copas.getMatrixAt(i, m4);
        m4.decompose(pos, q, esc);
        copas.push({ cx: pos.x, cy: pos.z, r: esc.x });
      }
    }
  });
  let desvioArvore = 0;
  let okArv = copas.length === ARVORES.length;
  if (!okArv) falhas.push(`árvores: esperava ${ARVORES.length} e a cena tem ${copas.length}`);
  for (const a of ARVORES) {
    const c = copas.find((k) => Math.hypot(k.cx - a.cx, k.cy - a.cy) < 0.5);
    if (!c) { okArv = false; falhas.push(`árvore em (${a.cx}, ${a.cy}) não está na cena`); continue; }
    desvioArvore = Math.max(desvioArvore, Math.hypot(c.cx - a.cx, c.cy - a.cy), Math.abs(c.r - a.r));
  }
  itens.push({ item: 'árvores', desvioMax: +desvioArvore.toFixed(3), ok: okArv });

  // Postes: uma haste em cada posição da lista, e nenhum em cima de bloco.
  const hastes = cena.postes.grupo.getObjectByName('postes-hastes');
  const postes = [];
  for (let i = 0; i < hastes.count; i++) { hastes.getMatrixAt(i, m4); m4.decompose(pos, q, esc); postes.push({ cx: pos.x, cy: pos.z }); }
  let desvioPoste = 0;
  let okPoste = postes.length === POSTES.length;
  if (!okPoste) falhas.push(`postes: esperava ${POSTES.length} e a cena tem ${postes.length}`);
  for (const p of POSTES) {
    const c = postes.find((k) => Math.hypot(k.cx - p.cx, k.cy - p.cy) < 0.5);
    if (!c) { okPoste = false; falhas.push(`poste em (${p.cx}, ${p.cy}) não está na cena`); continue; }
    desvioPoste = Math.max(desvioPoste, Math.hypot(c.cx - p.cx, c.cy - p.cy));
    for (const b of BLOCOS) {
      if (p.cx >= b.x && p.cx <= b.x + b.w && p.cy >= b.y && p.cy <= b.y + b.h) { okPoste = false; falhas.push(`poste (${p.cx}, ${p.cy}) em cima do bloco ${b.id}`); }
    }
  }
  itens.push({ item: 'postes', desvioMax: +desvioPoste.toFixed(3), ok: okPoste });

  // Dormentes: a cada 3 cm, de x 61 a 109.
  const dorm = cena.objetos.mobilidade.grupo.getObjectByName('dormentes');
  const esperados = Math.floor((109 - MOBILIDADE.trilho.x1) / MOBILIDADE.trilho.passoDormente + 1e-9) + 1;
  const okDorm = dorm.count === esperados;
  if (!okDorm) falhas.push(`dormentes: esperava ${esperados} e a cena tem ${dorm.count}`);
  itens.push({ item: 'dormentes', desvioMax: 0, ok: okDorm });

  return { ok: falhas.length === 0, falhas, itens, total: itens.length };
}
