// Postes de iluminação: canudo listrado vermelho e branco curvado no topo (bengala, como na maquete das fotos de
// 22/10), com o LED branco quente na ponta e uma base de massinha verde. Posições em compartilhado/maquete.js (POSTES).
// Hastes, ganchos e LEDs em InstancedMesh; o brilho dos LEDs é um halo aditivo (Points), que faz o papel do bloom
// sem pós-processamento.
import * as THREE from 'three';
import { POSTE, POSTES } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaPoste } from './texturas.js';
import { texturaHalo, instanciar, Y_ASFALTO } from './util.js';

const COR_LED_LIGADO = '#FFE9B8';
const COR_LED_APAGADO = '#D8D2C6';
const RAIO_GANCHO = 1.3; // raio da curva do topo
const RAIO_TUBO = 0.25;

/** Para onde o gancho aponta: para o meio da rua em que o poste está. @returns {{dx: number, dz: number}} */
function direcao(p) {
  if (p.via === 'avenida') return { dx: 0, dz: p.cy < 40 ? 1 : -1 }; // a avenida corre em y 34 a 46
  return { dx: 1, dz: 0 };
}

export function construirPostes(F) {
  const g = new THREE.Group();
  g.name = 'postes';

  const yTopoHaste = Y_ASFALTO + POSTE.altura - RAIO_GANCHO; // onde o canudo reto acaba e a curva começa
  const alturaHaste = yTopoHaste - Y_ASFALTO;
  const tex = texturaPoste();
  tex.repeat.set(1, alturaHaste / (2 * Math.PI * POSTE.raio));
  const matCanudo = F.mat(null, '#FFFFFF', { map: tex });
  const haste = instanciar(
    new THREE.CylinderGeometry(POSTE.raio, POSTE.raio, alturaHaste, 10),
    matCanudo,
    POSTES.map((p) => ({ x: p.cx, y: Y_ASFALTO + alturaHaste / 2, z: p.cy })),
  );
  haste.name = 'postes-hastes';
  haste.castShadow = true;
  haste.receiveShadow = true;

  // Gancho: meia-volta de torus (meia circunferência por cima), com o pé no topo da haste e a ponta para baixo.
  const texGancho = texturaPoste();
  texGancho.repeat.set((Math.PI * RAIO_GANCHO) / (2 * Math.PI * RAIO_TUBO), 1);
  const ganchos = instanciar(
    new THREE.TorusGeometry(RAIO_GANCHO, RAIO_TUBO, 8, 14, Math.PI),
    F.mat(null, '#FFFFFF', { map: texGancho }),
    POSTES.map((p) => {
      const d = direcao(p);
      return { x: p.cx + d.dx * RAIO_GANCHO, y: yTopoHaste, z: p.cy + d.dz * RAIO_GANCHO, ry: Math.atan2(-d.dz, d.dx) };
    }),
  );
  ganchos.name = 'postes-ganchos';
  ganchos.castShadow = true;

  // LED na ponta do gancho (a ponta fica a duas vezes o raio do pé da haste).
  const pontas = POSTES.map((p) => {
    const d = direcao(p);
    return { x: p.cx + d.dx * 2 * RAIO_GANCHO, y: yTopoHaste - 0.55, z: p.cy + d.dz * 2 * RAIO_GANCHO };
  });
  const matLed = F.matUnico(null, COR_LED_APAGADO, { basico: true });
  const led = instanciar(new THREE.SphereGeometry(0.42, 14, 10), matLed, pontas);
  led.name = 'postes-leds';
  // Base de massinha verde, para a vareta não parecer espetada no asfalto.
  const bases = instanciar(
    new THREE.CylinderGeometry(0.7, 0.85, 0.3, 14),
    F.mat(null, COR.posteBase),
    POSTES.map((p) => ({ x: p.cx, y: Y_ASFALTO + 0.15, z: p.cy })),
  );
  bases.castShadow = true;

  const pos = new Float32Array(POSTES.length * 3);
  pontas.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); });
  const geoHalo = new THREE.BufferGeometry();
  geoHalo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const matHalo = new THREE.PointsMaterial({
    map: texturaHalo(), color: '#FFD98A', size: 9, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const halos = new THREE.Points(geoHalo, matHalo);
  halos.name = 'postes-halos';
  halos.frustumCulled = false;
  halos.visible = false;

  g.add(haste, ganchos, bases, led, halos);

  /** @param {boolean} ligados */
  const definirLigados = (ligados) => {
    matLed.color.set(ligados ? COR_LED_LIGADO : COR_LED_APAGADO);
    matHalo.opacity = ligados ? 0.85 : 0;
    halos.visible = ligados;
  };
  definirLigados(false);
  return { grupo: g, definirLigados, matLed, halos };
}
