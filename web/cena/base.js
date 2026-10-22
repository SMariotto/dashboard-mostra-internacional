// Palete de madeira, asfalto, os 5 blocos, as 4 vias e as faixas (central amarela e de pedestre).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PALETE, ALTURAS, BLOCOS, VIAS, FAIXAS_PEDESTRE } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaMadeira } from './texturas.js';
import { caixa, contorno as moldura, Y_ASFALTO, Y_BLOCO, tracos, instanciar, etiquetaPlanta, sombras, marcarArea } from './util.js';

/**
 * @returns {{grupo: THREE.Group, blocos: Record<string, {grupo: THREE.Group, laje: THREE.Mesh, contorno: THREE.LineSegments, material: THREE.Material}>}}
 */
export function construirBase(F, tintas) {
  const grupo = new THREE.Group();
  grupo.name = 'base';

  // Palete: 120 x 100, 2 cm de espessura, com borda de 4 cm em volta (o topo fica em y = 0).
  const madeira = texturaMadeira(COR.madeira);
  madeira.repeat.set(1, 1);
  const matMadeira = F.mat(null, '#FFFFFF', { map: madeira });
  const palete = new THREE.Mesh(
    new RoundedBoxGeometry(PALETE.largura, ALTURAS.base, PALETE.profundidade, 2, 0.35),
    matMadeira,
  );
  palete.position.set(PALETE.largura / 2, -ALTURAS.base / 2, PALETE.profundidade / 2);
  etiquetaPlanta(palete, 'palete', { x: 0, y: 0, w: PALETE.largura, h: PALETE.profundidade });
  grupo.add(palete);

  // Asfalto: uma placa na área útil (x 4 a 116, y 4 a 96), que aparece só onde não há bloco.
  const u = PALETE.util;
  const asfalto = caixa(u, 0, Y_ASFALTO, F.mat(null, COR.asfalto), { arredondar: 0.08 });
  etiquetaPlanta(asfalto, 'asfalto', u);
  grupo.add(asfalto);

  // Vias: uma placa fina por via (mesma cor do asfalto, sem degrau), para o contorno de cada uma existir na cena.
  const matAsfalto = F.mat(null, COR.asfalto);
  for (const v of VIAS) {
    const placa = caixa(v, Y_ASFALTO, 0.01, matAsfalto);
    placa.name = `via-${v.id}`;
    etiquetaPlanta(placa, `via:${v.id}`, { x: v.x, y: v.y, w: v.w, h: v.h });
    placa.receiveShadow = true;
    grupo.add(placa);
  }
  const yFaixa = Y_ASFALTO + 0.02;
  const amarelas = [];
  for (const v of VIAS) {
    const f = v.faixa;
    for (const t of tracos(f.x1, f.y1, f.x2, f.y2, f.traco, f.espaco)) {
      amarelas.push({
        x: t.cx, y: yFaixa, z: t.cy,
        sx: t.horizontal ? t.comp : f.largura, sy: 1, sz: t.horizontal ? f.largura : t.comp,
      });
    }
  }
  const geoFita = new THREE.BoxGeometry(1, 0.04, 1);
  const faixas = instanciar(geoFita, F.mat(null, COR.faixaAmarela), amarelas);
  faixas.name = 'faixas-amarelas';
  grupo.add(faixas);

  const pedestres = FAIXAS_PEDESTRE.map((p) => ({ x: p.x + p.w / 2, y: yFaixa, z: p.y + p.h / 2, sx: p.w, sy: 1, sz: p.h }));
  const faixasPedestre = instanciar(geoFita, F.mat(null, COR.faixaPedestre), pedestres);
  faixasPedestre.name = 'faixas-pedestre';
  grupo.add(faixasPedestre);

  // Blocos (as 5 áreas): placa de papelão de 0,6 cm de altura, na tinta pastel da área.
  const blocos = {};
  for (const b of BLOCOS) {
    const g = new THREE.Group();
    g.name = `bloco-${b.id}`;
    const material = F.matUnico(b.id, tintas[b.id]);
    const laje = new THREE.Mesh(
      new RoundedBoxGeometry(b.w, ALTURAS.bloco, b.h, 2, 0.2),
      material,
    );
    laje.position.set(b.x + b.w / 2, Y_ASFALTO + ALTURAS.bloco / 2, b.y + b.h / 2);
    laje.name = `laje-${b.id}`;
    etiquetaPlanta(laje, `bloco:${b.id}`, { x: b.x, y: b.y, w: b.w, h: b.h });
    g.add(laje);

    // Moldura que aparece na seleção (F4), na cor forte da área: uma tira de 0,55 cm rente à borda do bloco.
    const matMoldura = new THREE.MeshBasicMaterial({ color: tintas[`${b.id}Forte`] });
    const contorno = moldura(b, Y_BLOCO, 0.55, 0.16, matMoldura);
    contorno.visible = false;
    contorno.name = `contorno-${b.id}`;
    g.add(contorno);

    sombras(g, false, true);
    laje.castShadow = true;
    marcarArea(g, b.id);
    grupo.add(g);
    blocos[b.id] = { grupo: g, laje, contorno, material };
  }

  sombras(palete, true, true);
  asfalto.receiveShadow = true;
  faixas.receiveShadow = true;
  faixasPedestre.receiveShadow = true;
  return { grupo, blocos };
}
