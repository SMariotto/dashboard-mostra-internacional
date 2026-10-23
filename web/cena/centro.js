// Bloco 3: Centro Urbano (fotos de 22/10). Candy Sweet (loja baixa rosa com toldo listrado), Shopping (frente azul clara
// com grade de janelas, porta vermelha dupla e letreiro, parte de trás azul escura mais alta), um prédio alto azul escuro
// e o semáforo de palito. Não há mais praça circular, estacionamento nem carros no desenho: os dados `vagas_livres` e os
// sensores S4 a S7 continuam (marcadores sem objeto embaixo). As janelas dividem UM material (modo noite).
import * as THREE from 'three';
import { CENTRO } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaLetreiro, texturaToldo } from './texturas.js';
import { caixa, caixaCentro, cilindro, clarear, sombras, marcarArea, etiquetaPlanta, Y_BLOCO } from './util.js';
import { arvoresDaArea } from './arvores.js';

/**
 * Grade de janelas quadradas na face da frente (voltada para o visitante, +z) de um corpo {x, y, w, h, altura},
 * num só desenho (geometria juntada). `desdeNivel` pula as fileiras de baixo (onde fica a porta).
 */
function janelasDaFrente(p, material, { desdeNivel = 0 } = {}) {
  const pos = [];
  const idx = [];
  let n = 0;
  const quad = (cx, cy, cz, w, h) => {
    pos.push(cx - w / 2, cy - h / 2, cz, cx + w / 2, cy - h / 2, cz, cx + w / 2, cy + h / 2, cz, cx - w / 2, cy + h / 2, cz);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3, n, n + 2, n + 1, n, n + 3, n + 2);
    n += 4;
  };
  const cols = Math.max(1, Math.floor((p.w - 0.6) / 1.9));
  const passo = p.w / cols;
  const niveis = Math.floor((p.altura - 1.2) / 2.4);
  for (let c = 0; c < cols; c++) {
    for (let r = desdeNivel; r <= niveis; r++) {
      quad(p.x + passo * (c + 0.5), Y_BLOCO + 1.4 + r * 2.4, p.y + p.h + 0.03, 1.1, 1.3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return new THREE.Mesh(geo, material);
}

// Alturas desenhadas (cm). As pegadas vêm da planta; a altura da planta (8, 12 e 16) deixava o Shopping alto e estreito
// demais: na foto-42 a frente do Shopping é mais larga que alta, e o prédio azul é cerca de 3 vezes a loja Candy Sweet.
const ALTURA = { candy: 3.8, shoppingFrente: 5.5, shoppingTras: 8.5, torre: 11 };

export function construirCentro(F) {
  const g = new THREE.Group();
  g.name = 'centro';
  const A = 'centro';
  const [pCandy, pShopping, pTorre] = CENTRO.predios;

  // Material único das janelas: o modo noite (F4) troca a cor dele de vidro para luz acesa.
  const matJanela = F.matUnico(A, COR.janelaDia, { basico: true });

  // ---- Candy Sweet: loja baixa rosa, topo claro, toldo listrado rosa e branco e letreiro ----
  const altCandy = ALTURA.candy;
  const candy = caixa(pCandy, Y_BLOCO, altCandy, F.mat(A, COR.candyParede), { arredondar: 0.25 });
  etiquetaPlanta(candy, 'predio', { x: pCandy.x, y: pCandy.y, w: pCandy.w, h: pCandy.h });
  const topoCandy = caixa({ x: pCandy.x - 0.2, y: pCandy.y - 0.2, w: pCandy.w + 0.4, h: pCandy.h + 0.4 }, Y_BLOCO + altCandy, 0.4, F.mat(A, COR.candyTopo), { arredondar: 0.12 });
  const cxC = pCandy.x + pCandy.w / 2;
  const frenteC = pCandy.y + pCandy.h;
  const texToldo = texturaToldo(COR.candyToldoRosa, '#FFFFFF');
  texToldo.repeat.set(2.5, 1);
  const toldo = new THREE.Mesh(new THREE.BoxGeometry(pCandy.w + 0.5, 0.18, 1.7), F.mat(A, '#FFFFFF', { map: texToldo }));
  toldo.rotation.x = 0.32; // a ponta da frente desce
  toldo.position.set(cxC, Y_BLOCO + altCandy - 0.45, frenteC + 0.75);
  const letreiroC = new THREE.Mesh(new THREE.PlaneGeometry(pCandy.w - 0.9, 1.1), F.mat(A, '#FFFFFF', { map: texturaLetreiro('Candy Sweet'), roughness: 0.9 }));
  letreiroC.position.set(cxC, Y_BLOCO + altCandy + 0.95, frenteC + 0.1);
  g.add(candy, topoCandy, toldo, letreiroC);
  for (const dx of [-1.5, 1.5]) g.add(caixaCentro(cxC + dx, frenteC + 0.05, 1.3, 0.1, Y_BLOCO + 0.7, 1.4, matJanela));

  // ---- Shopping: frente azul clara (janelas e porta vermelha dupla) e parte de trás azul escura, mais alta ----
  const fundoProf = 2.4; // profundidade da parte de trás
  const shopTras = { x: pShopping.x, y: pShopping.y, w: pShopping.w, h: fundoProf };
  const shopFrente = { x: pShopping.x, y: pShopping.y + fundoProf, w: pShopping.w, h: pShopping.h - fundoProf, altura: ALTURA.shoppingFrente };
  const shopping = new THREE.Group();
  shopping.add(
    caixa(shopTras, Y_BLOCO, ALTURA.shoppingTras, F.mat(A, COR.shoppingTras), { arredondar: 0.25 }),
    caixa(shopFrente, Y_BLOCO, shopFrente.altura, F.mat(A, COR.shoppingParede), { arredondar: 0.25 }),
    caixa({ x: shopFrente.x - 0.15, y: shopFrente.y - 0.0, w: shopFrente.w + 0.3, h: shopFrente.h + 0.15 }, Y_BLOCO + shopFrente.altura, 0.35, F.mat(A, clarear(COR.shoppingParede, 0.45)), { arredondar: 0.1 }),
  );
  etiquetaPlanta(shopping, 'predio', { x: pShopping.x, y: pShopping.y, w: pShopping.w, h: pShopping.h });
  g.add(shopping, janelasDaFrente(shopFrente, matJanela, { desdeNivel: 1 }));
  const cxS = pShopping.x + pShopping.w / 2;
  const frenteS = pShopping.y + pShopping.h;
  const matPortaS = F.mat(A, COR.shoppingPorta);
  for (const dx of [-0.5, 0.5]) g.add(caixaCentro(cxS + dx, frenteS + 0.06, 0.9, 0.12, Y_BLOCO, 2.5, matPortaS));
  const letreiroS = new THREE.Mesh(new THREE.PlaneGeometry(pShopping.w - 1.2, 1.15), F.mat(A, '#FFFFFF', { map: texturaLetreiro('Shopping', '#F8F5EE', '#233A8F'), roughness: 0.9 }));
  letreiroS.position.set(cxS, Y_BLOCO + shopFrente.altura + 0.95, frenteS + 0.1);
  g.add(letreiroS);

  // ---- Prédio alto azul escuro ----
  const torre = caixa(pTorre, Y_BLOCO, ALTURA.torre, F.mat(A, COR.torreAzul), { arredondar: 0.3 });
  etiquetaPlanta(torre, 'predio', { x: pTorre.x, y: pTorre.y, w: pTorre.w, h: pTorre.h });
  g.add(torre, caixa({ x: pTorre.x - 0.15, y: pTorre.y - 0.15, w: pTorre.w + 0.3, h: pTorre.h + 0.3 }, Y_BLOCO + ALTURA.torre, 0.3, F.mat(A, clarear(COR.torreAzul, 0.3)), { arredondar: 0.1 }));

  // ---- Semáforo de palito: haste de madeira e uma caixa escura pequena com as 3 luzes, voltada para a avenida ----
  // Cada luz tem o seu material; a que está acesa segue o campo `semaforo`, as outras ficam apagadas.
  const S = CENTRO.semaforo;
  const sx = S.caixa.x + S.caixa.w / 2, sz = S.caixa.y + S.caixa.h / 2;
  const posteSem = cilindro(sx, sz, 0.16, Y_BLOCO, 5.2, F.mat(A, COR.semaforoMadeira), 10);
  const cabeca = caixaCentro(sx, sz, S.caixa.w - 0.2, 1.0, Y_BLOCO + 3.3, 3.6, F.mat(A, COR.semaforoCaixaEscura), { arredondar: 0.3 });
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

  g.add(arvoresDaArea(F, A));
  sombras(g);
  g.traverse((o) => { if (o.isMesh && o.material === matJanela) o.castShadow = false; });
  marcarArea(g, A);
  // `carros` fica vazio: não há mais carros nem vagas desenhadas (o dado vagas_livres continua no contrato).
  return { grupo: g, matJanela, luzes, carros: [] };
}
