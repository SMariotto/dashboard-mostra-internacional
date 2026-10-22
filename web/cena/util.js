// Pequenas peças para montar a cena a partir da geometria da planta (compartilhado/maquete.js).
// Convenção: X = x da planta, Z = y da planta, Y para cima, 1 unidade = 1 cm.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ALTURAS } from '../../compartilhado/maquete.js';

/** Altura do topo do palete (0), do asfalto e do topo dos blocos. */
export const Y_ASFALTO = ALTURAS.asfalto;
export const Y_BLOCO = ALTURAS.asfalto + ALTURAS.bloco;

export const rad = (g) => (g * Math.PI) / 180;

/** Mistura uma cor com branco (f de 0 a 1): a versão mais clara da mesma cor. */
export function clarear(hex, f) {
  return `#${new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), f).getHexString()}`;
}

/** Caixa que ocupa o retângulo {x, y, w, h} da planta, de yBase até yBase + altura. */
export function caixa(r, yBase, altura, material, { arredondar = 0, nome } = {}) {
  const geo = arredondar > 0
    ? new RoundedBoxGeometry(r.w, altura, r.h, 2, Math.min(arredondar, r.w / 2.01, r.h / 2.01, altura / 2.01))
    : new THREE.BoxGeometry(r.w, altura, r.h);
  const m = new THREE.Mesh(geo, material);
  m.position.set(r.x + r.w / 2, yBase + altura / 2, r.y + r.h / 2);
  if (nome) m.name = nome;
  return m;
}

/** Caixa centrada em (cx, cy) da planta. */
export function caixaCentro(cx, cy, w, d, yBase, altura, material, op) {
  return caixa({ x: cx - w / 2, y: cy - d / 2, w, h: d }, yBase, altura, material, op);
}

/** Cilindro em pé no ponto (cx, cy) da planta. */
export function cilindro(cx, cy, raio, yBase, altura, material, segmentos = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, altura, segmentos), material);
  m.position.set(cx, yBase + altura / 2, cy);
  return m;
}

/** Moldura (contorno sólido) de um retângulo da planta: 4 tiras finas rentes ao chão. */
export function contorno(r, y, espessura, altura, material) {
  const g = new THREE.Group();
  const e = espessura;
  g.add(
    caixa({ x: r.x, y: r.y, w: r.w, h: e }, y, altura, material),
    caixa({ x: r.x, y: r.y + r.h - e, w: r.w, h: e }, y, altura, material),
    caixa({ x: r.x, y: r.y + e, w: e, h: r.h - 2 * e }, y, altura, material),
    caixa({ x: r.x + r.w - e, y: r.y + e, w: e, h: r.h - 2 * e }, y, altura, material),
  );
  return g;
}

/** Liga sombra em tudo o que está dentro do objeto. */
export function sombras(obj, projeta = true, recebe = true) {
  obj.traverse((o) => {
    if (o.isMesh) { o.castShadow = projeta; o.receiveShadow = recebe; }
  });
  return obj;
}

/** Marca um objeto (e o que está dentro dele) com a área a que pertence, para o clique e o realce (F4). */
export function marcarArea(obj, area) {
  obj.userData.area = area;
  obj.traverse((o) => { o.userData.area = area; });
  return obj;
}

/** Guarda o retângulo da planta no objeto, para a conferência automática contra compartilhado/maquete.js. */
export function etiquetaPlanta(obj, item, r) {
  obj.userData.planta = { item, ...r };
  return obj;
}

/**
 * Posições dos traços de uma linha tracejada entre (x1, y1) e (x2, y2): lista de {cx, cy, comp}.
 * Retorna só o que cabe; o último traço é cortado no fim da linha.
 */
export function tracos(x1, y1, x2, y2, traco, espaco) {
  const dx = x2 - x1, dy = y2 - y1;
  const comp = Math.hypot(dx, dy);
  const ux = dx / comp, uy = dy / comp;
  const saida = [];
  for (let d = 0; d < comp - 1e-6; d += traco + espaco) {
    const len = Math.min(traco, comp - d);
    const meio = d + len / 2;
    saida.push({ cx: x1 + ux * meio, cy: y1 + uy * meio, comp: len, horizontal: Math.abs(dx) >= Math.abs(dy) });
  }
  return saida;
}

/** Dados de várias caixas finas iguais em um InstancedMesh só (traços, dormentes). */
export function instanciar(geometria, material, itens) {
  const im = new THREE.InstancedMesh(geometria, material, itens.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  itens.forEach((it, i) => {
    q.setFromEuler(new THREE.Euler(0, it.ry ?? 0, 0));
    s.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, s);
    im.setMatrixAt(i, m4);
  });
  im.instanceMatrix.needsUpdate = true;
  return im;
}

/** Textura radial para halos de luz (pontos aditivos). */
export function texturaHalo() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
