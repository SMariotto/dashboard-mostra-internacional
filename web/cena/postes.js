// Postes de iluminação: vareta em espiral vermelha e branca (textura de canvas) com LED branco quente
// na ponta. Posições em compartilhado/maquete.js (POSTES). Hastes e LEDs em InstancedMesh; o brilho
// dos LEDs é um halo aditivo (Points), que faz o papel do bloom sem pós-processamento.
import * as THREE from 'three';
import { POSTE, POSTES } from '../../compartilhado/maquete.js';
import { texturaPoste } from './texturas.js';
import { texturaHalo, instanciar, Y_ASFALTO } from './util.js';

const COR_LED_LIGADO = '#FFE9B8';
const COR_LED_APAGADO = '#D8D2C6';

export function construirPostes(F) {
  const g = new THREE.Group();
  g.name = 'postes';

  const tex = texturaPoste();
  tex.repeat.set(1, POSTE.altura / (2 * Math.PI * POSTE.raio));
  const haste = instanciar(
    new THREE.CylinderGeometry(POSTE.raio, POSTE.raio, POSTE.altura, 10),
    F.mat(null, '#FFFFFF', { map: tex }),
    POSTES.map((p) => ({ x: p.cx, y: Y_ASFALTO + POSTE.altura / 2, z: p.cy })),
  );
  haste.name = 'postes-hastes';
  haste.castShadow = true;
  haste.receiveShadow = true;

  const matLed = F.matUnico(null, COR_LED_APAGADO, { basico: true });
  const led = instanciar(
    new THREE.SphereGeometry(0.5, 14, 10),
    matLed,
    POSTES.map((p) => ({ x: p.cx, y: Y_ASFALTO + POSTE.altura + 0.15, z: p.cy })),
  );
  led.name = 'postes-leds';
  // Uma base pequena, para a vareta não parecer espetada no asfalto.
  const bases = instanciar(
    new THREE.CylinderGeometry(0.7, 0.8, 0.3, 14),
    F.mat(null, '#B9B3A8'),
    POSTES.map((p) => ({ x: p.cx, y: Y_ASFALTO + 0.15, z: p.cy })),
  );
  bases.castShadow = true;

  const pos = new Float32Array(POSTES.length * 3);
  POSTES.forEach((p, i) => { pos.set([p.cx, Y_ASFALTO + POSTE.altura + 0.15, p.cy], i * 3); });
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

  g.add(haste, bases, led, halos);

  /** @param {boolean} ligados */
  const definirLigados = (ligados) => {
    matLed.color.set(ligados ? COR_LED_LIGADO : COR_LED_APAGADO);
    matHalo.opacity = ligados ? 0.85 : 0;
    halos.visible = ligados;
  };
  definirLigados(false);
  return { grupo: g, definirLigados, matLed, halos };
}
