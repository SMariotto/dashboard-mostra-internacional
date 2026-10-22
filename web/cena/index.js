// Cena 3D da maquete (Three.js). Este arquivo só é carregado por importação dinâmica: o celular e o
// ?modo=cartoes nunca baixam o Three.js.
//
// Unidades: 1 = 1 cm. X = x da planta, Z = y da planta, Y para cima; o visitante fica em z grande.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PALETE } from '../../compartilhado/maquete.js';
import { criarFabrica, tintas as lerTintas } from './fabrica.js';
import { construirBase } from './base.js';
import { construirEnergia } from './energia.js';
import { construirCentro } from './centro.js';
import { construirEconomia } from './economia.js';
import { construirResidencial } from './residencial.js';
import { construirMobilidade } from './mobilidade.js';
import { construirPostes } from './postes.js';
import { PRESETS } from './qualidade.js';

export { QUALIDADES, nivelAbaixo, webglDisponivel } from './qualidade.js';

const CENTRO_PALETE = new THREE.Vector3(PALETE.largura / 2, 0, PALETE.profundidade / 2);
const ELEVACAO_PADRAO = 44; // graus acima do plano: vista de 3/4, do lado do visitante

/**
 * @param {HTMLElement} contenedor elemento onde o canvas entra (ocupa 100% dele)
 * @param {{qualidade?: 'alta'|'media'|'baixa', preservarQuadro?: boolean}} [op]
 */
export function criarCena(contenedor, op = {}) {
  let qualidade = op.qualidade && PRESETS[op.qualidade] ? op.qualidade : 'alta';
  const tintas = lerTintas();

  const renderer = new THREE.WebGLRenderer({
    antialias: qualidade !== 'baixa',
    powerPreference: 'high-performance',
    preserveDrawingBuffer: !!op.preservarQuadro,
  });
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
  contenedor.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(tintas.fundo);

  // ---------- Luz: céu e chão suaves, mais um sol quente com sombra leve ----------
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#E9DFCF', 1.55);
  const sol = new THREE.DirectionalLight('#FFF3E0', 2.3);
  sol.position.set(-45, 120, 135);
  sol.target.position.copy(CENTRO_PALETE);
  const cs = sol.shadow.camera;
  cs.left = -95; cs.right = 95; cs.top = 80; cs.bottom = -80; cs.near = 20; cs.far = 360;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.06;
  sol.shadow.radius = 3;
  scene.add(hemi, sol, sol.target);

  // Chão que só recebe a sombra do palete (o fundo continua na cor dos tokens).
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.ShadowMaterial({ color: '#6B5B45', opacity: 0.14 }),
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(CENTRO_PALETE.x, -2.02, CENTRO_PALETE.z);
  chao.receiveShadow = true;
  scene.add(chao);

  // ---------- A maquete ----------
  const F = criarFabrica();
  const base = construirBase(F, tintas);
  const objetos = {
    energia: construirEnergia(F),
    centro: construirCentro(F),
    economia: construirEconomia(F),
    residencial: construirResidencial(F),
    mobilidade: construirMobilidade(F),
  };
  const postes = construirPostes(F);
  const maquete = new THREE.Group();
  maquete.name = 'maquete';
  maquete.add(base.grupo, postes.grupo, ...Object.values(objetos).map((o) => o.grupo));
  scene.add(maquete);

  // ---------- Câmeras ----------
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 900);
  const cameraCima = new THREE.OrthographicCamera(-60, 60, 50, -50, 1, 600);
  let ativa = camera;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.minDistance = 35;
  controls.maxDistance = 260;
  controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
  controls.minPolarAngle = THREE.MathUtils.degToRad(8);
  controls.target.copy(CENTRO_PALETE);
  // O pan não deixa a mira sair da área do palete.
  const mira = new THREE.Vector3();
  controls.addEventListener('change', () => {
    mira.copy(controls.target);
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, 4, PALETE.largura - 4);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, 4, PALETE.profundidade - 4);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 25);
    camera.position.add(controls.target).sub(mira);
  });

  /**
   * Posição de câmera que enquadra uma caixa (THREE.Box3) olhando do lado do visitante, na elevação dada,
   * com a proporção atual do mapa. `margem` é a fração da tela que a caixa pode ocupar (0,95 = quase tudo).
   * @returns {{pos: THREE.Vector3, alvo: THREE.Vector3}}
   */
  function vistaQueEnquadra(caixa3, elevGraus, margem) {
    const e = THREE.MathUtils.degToRad(elevGraus);
    const dir = new THREE.Vector3(0, Math.sin(e), Math.cos(e));
    const centro = caixa3.getCenter(new THREE.Vector3());
    const alvo = new THREE.Vector3(centro.x, 0, centro.z);
    const cam = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 10, 900);
    const cantos = [];
    for (const x of [caixa3.min.x, caixa3.max.x]) for (const z of [caixa3.min.z, caixa3.max.z]) for (const y of [caixa3.min.y, caixa3.max.y]) cantos.push(new THREE.Vector3(x, y, z));
    let baixo = 25, alto = 700;
    for (let i = 0; i < 26; i++) {
      const d = (baixo + alto) / 2;
      cam.position.copy(alvo).addScaledVector(dir, d);
      cam.lookAt(alvo);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      const cabe = cantos.every((c) => {
        const p = c.clone().project(cam);
        return Math.abs(p.x) <= margem && Math.abs(p.y) <= margem;
      });
      if (cabe) alto = d; else baixo = d;
    }
    return { pos: alvo.clone().addScaledVector(dir, alto), alvo };
  }

  /** Vista de uma área (id) ou da cidade inteira ('cidade'): onde a câmera deve ficar. */
  function vistaDe(id) {
    if (id === 'cidade' || !objetos[id]) {
      return vistaQueEnquadra(new THREE.Box3(new THREE.Vector3(0, -2, 0), new THREE.Vector3(PALETE.largura, 22, PALETE.profundidade)), ELEVACAO_PADRAO, 0.95);
    }
    const caixa3 = new THREE.Box3().setFromObject(base.blocos[id].grupo).union(new THREE.Box3().setFromObject(objetos[id].grupo));
    return vistaQueEnquadra(caixa3, 50, 0.74);
  }

  /** Vista inicial: 3/4, do lado do visitante, com a maquete inteira enquadrada. */
  function vistaInicial() {
    const { pos, alvo } = vistaDe('cidade');
    camera.position.copy(pos);
    controls.target.copy(alvo);
    controls.update();
  }

  /** Vista ortográfica de cima, com a planta na mesma orientação (topo da tela = y 0), para conferir com a planta. */
  function vistaDeCima(ligar = true) {
    if (ligar) {
      cameraCima.position.set(CENTRO_PALETE.x, 300, CENTRO_PALETE.z);
      cameraCima.up.set(0, 0, -1);
      cameraCima.lookAt(CENTRO_PALETE);
      ativa = cameraCima;
      controls.enabled = false;
    } else {
      ativa = camera;
      controls.enabled = true;
    }
    redimensionar();
  }

  // ---------- Tamanho, qualidade e laço de desenho ----------
  function redimensionar() {
    const w = Math.max(1, contenedor.clientWidth);
    const h = Math.max(1, contenedor.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const meioAlt = 54; // 100 de profundidade mais uma folga
    const meioLarg = Math.max(meioAlt * (w / h), 66);
    const altura = meioLarg / (w / h);
    cameraCima.left = -meioLarg; cameraCima.right = meioLarg; cameraCima.top = altura; cameraCima.bottom = -altura;
    cameraCima.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);

  // Duração (ms) dos últimos 90 quadros.
  const medidas = [];

  function definirQualidade(q) {
    if (!PRESETS[q]) return;
    qualidade = q;
    const p = PRESETS[q];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatio));
    renderer.setSize(Math.max(1, contenedor.clientWidth), Math.max(1, contenedor.clientHeight), false);
    renderer.shadowMap.enabled = p.sombra > 0;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    sol.castShadow = p.sombra > 0;
    if (p.sombra > 0) {
      sol.shadow.mapSize.set(p.sombra, p.sombra);
      sol.shadow.map?.dispose();
      sol.shadow.map = null;
    }
    postes.halos.userData.permitido = p.halos;
    scene.traverse((o) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) m.needsUpdate = true;
    });
    medidas.length = 0;
  }

  const animadores = new Set();
  let ultimo = performance.now();
  let rodando = true;
  let rafId = 0;
  function quadro(agora) {
    if (!rodando) return;
    rafId = requestAnimationFrame(quadro);
    const dt = Math.min(0.1, (agora - ultimo) / 1000);
    if (agora !== ultimo) medidas.push(agora - ultimo);
    if (medidas.length > 90) medidas.shift();
    ultimo = agora;
    if (controls.enabled) controls.update();
    for (const a of animadores) a(dt, agora / 1000);
    renderer.render(scene, ativa);
  }

  redimensionar();
  definirQualidade(qualidade);
  vistaInicial();
  rafId = requestAnimationFrame(quadro);

  return {
    THREE, renderer, scene, camera, cameraCima, controls, canvas, tintas, fabrica: F,
    base, objetos, postes, maquete, sol, hemi,
    get qualidade() { return qualidade; },
    definirQualidade,
    vistaInicial, vistaDe, vistaDeCima, redimensionar,
    /** Quadros por segundo nos últimos 90 quadros (quadros divididos pelo tempo; 0 se ainda não há medida). */
    fps() {
      return medidas.length ? (medidas.length * 1000) / medidas.reduce((a, b) => a + b, 0) : 0;
    },
    /** Registra uma função chamada a cada quadro com (dt em s, tempo em s). Devolve a que remove. */
    aoQuadro(fn) { animadores.add(fn); return () => animadores.delete(fn); },
    /** Tira tudo da tela e libera a GPU. */
    destruir() {
      rodando = false;
      cancelAnimationFrame(rafId);
      observador.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) { m.map?.dispose?.(); m.dispose?.(); }
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
