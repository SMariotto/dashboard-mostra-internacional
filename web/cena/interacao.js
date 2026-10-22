// Interação com o mapa: passar o mouse realça o bloco, clique ou toque escolhe a área, e a câmera voa até ela.
//
// Quem manda na vista é o endereço da página (#energia, #cidade...): a tela chama `irPara(vista)` quando o
// endereço muda, e este módulo só faz o voo e o realce. Assim o menu, o painel, o Esc e o clique no mapa
// usam o mesmo caminho.
import * as THREE from 'three';
import { reduzMovimento } from '../ui/dom.js';

const facilidade = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2); // cúbica, entra e sai suave

/**
 * @param {object} cena a cena de criarCena()
 * @param {{aoClicarArea: (id: string) => void, aoPassarArea?: (id: string|null) => void, itensPicaveis?: () => THREE.Object3D[], aoClicarItem?: (obj: THREE.Object3D|null, ev: PointerEvent) => boolean, aoPassarItem?: (obj: THREE.Object3D|null) => void}} op
 */
export function criarInteracao(cena, { aoClicarArea, aoPassarArea = () => {}, itensPicaveis = () => [], aoClicarItem = () => false, aoPassarItem = () => {} }) {
  const { canvas, camera, controls, base, tintas } = cena;
  const ids = Object.keys(base.blocos);
  const raio = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let hover = null;
  let selecionada = null;
  let sujo = false;
  let ultimoEvento = null;
  let voo = null;

  // ---------- Realce: o bloco acende de leve (emissivo) e a moldura aparece na área escolhida ----------
  const brilho = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const id of ids) base.blocos[id].material.emissive = new THREE.Color(tintas[`${id}Forte`]);

  function atualizarRealce(dt) {
    for (const id of ids) {
      const alvo = id === selecionada ? 0.16 : id === hover ? 0.28 : 0;
      brilho[id] += (alvo - brilho[id]) * Math.min(1, dt * 10);
      base.blocos[id].material.emissiveIntensity = brilho[id];
    }
  }

  // ---------- Escolha por raio ----------
  function pegar() {
    raio.setFromCamera(ponteiro, camera);
    const alvos = [cena.maquete, ...itensPicaveis()];
    const acertos = raio.intersectObjects(alvos, true);
    for (const a of acertos) {
      if (a.object.isPoints || a.object.visible === false) continue;
      return a.object;
    }
    return null;
  }
  const areaDe = (obj) => {
    for (let o = obj; o; o = o.parent) if (o.userData?.area) return o.userData.area;
    return null;
  };

  function posicionar(ev) {
    const r = canvas.getBoundingClientRect();
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }

  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    ultimoEvento = ev; sujo = true;
  });
  canvas.addEventListener('pointerleave', () => { definirHover(null); aoPassarItem(null); canvas.style.cursor = ''; });

  let inicio = null;
  canvas.addEventListener('pointerdown', (ev) => { inicio = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!inicio) return;
    const moveu = Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y);
    const dur = performance.now() - inicio.t;
    inicio = null;
    if (moveu > 6 || dur > 600 || ev.button !== 0) return; // foi arrastar (girar a câmera), não clique
    posicionar(ev);
    const obj = pegar();
    if (aoClicarItem(obj, ev)) return; // um marcador de sensor ou dica tratou o clique
    const id = areaDe(obj);
    if (id) aoClicarArea(id);
  });

  function definirHover(id) {
    if (id === hover) return;
    hover = id;
    aoPassarArea(id);
  }
  /** Realce vindo de fora (o cartão do painel ou a etiqueta sob o mouse). */
  function realcar(id) { definirHover(id); }

  // ---------- Voo da câmera ----------
  function irPara(vista, { imediato = false } = {}) {
    selecionada = vista === 'cidade' || !ids.includes(vista) ? null : vista;
    for (const id of ids) base.blocos[id].contorno.visible = id === selecionada;
    const destino = cena.vistaDe(selecionada ?? 'cidade');
    if (imediato || reduzMovimento()) {
      voo = null;
      camera.position.copy(destino.pos);
      controls.target.copy(destino.alvo);
      controls.update();
      return;
    }
    voo = {
      t: 0, duracao: 1.0,
      de: { pos: camera.position.clone(), alvo: controls.target.clone() },
      para: destino,
    };
    controls.enabled = false;
  }

  const a = new THREE.Vector3();
  function atualizarVoo(dt) {
    if (!voo) return;
    voo.t = Math.min(1, voo.t + dt / voo.duracao);
    const k = facilidade(voo.t);
    camera.position.lerpVectors(voo.de.pos, voo.para.pos, k);
    a.lerpVectors(voo.de.alvo, voo.para.alvo, k);
    controls.target.copy(a);
    camera.lookAt(a);
    if (voo.t >= 1) {
      voo = null;
      controls.enabled = true;
      controls.update();
    }
  }
  // Se a pessoa pegar a câmera no meio do voo, o voo para.
  canvas.addEventListener('pointerdown', () => { if (voo) { voo = null; controls.enabled = true; } });

  cena.aoQuadro((dt) => {
    if (sujo && ultimoEvento) {
      sujo = false;
      posicionar(ultimoEvento);
      const obj = pegar();
      const id = areaDe(obj);
      definirHover(id);
      aoPassarItem(obj?.userData?.sensor ? obj : null);
      canvas.style.cursor = id || obj?.userData?.sensor ? 'pointer' : '';
    }
    atualizarVoo(dt);
    atualizarRealce(dt);
  });

  return {
    irPara,
    realcar,
    get selecionada() { return selecionada; },
    get voando() { return !!voo; },
    /** Para testes: o que está sob um ponto da tela? */
    pegarEm(clientX, clientY) { posicionar({ clientX, clientY }); const o = pegar(); return { area: areaDe(o), nome: o?.name ?? null }; },
  };
}
