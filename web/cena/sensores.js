// Camada de sensores (camada 3 da planta): cada sensor (S), atuador (P) e ESP32 (E) vira um marcador pequeno,
// num pino que sobe do chão exatamente no ponto da planta, com o código (S1, E1...) ao lado.
// Passar o mouse ou tocar mostra o que é e qual dado ele alimenta. ESP32 sem sinal fica com marcador cinza.
// Desligada por padrão; o botão "Mostrar sensores" do mapa liga.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPOS, buscarModulo } from '../../compartilhado/contrato.js';
import { SENSORES } from '../../compartilhado/maquete.js';
import { h } from '../ui/dom.js';
import { numero, textoCampo } from '../ui/formatar.js';
import { Y_BLOCO } from './util.js';

const ALTURA_PINO = 6.4; // altura padrão do pino (cm acima do bloco)
const RAIO_MARCADOR = 0.95;
const FOLGA_MARCADOR = 0.8; // espaço entre o fundo do marcador e o que há embaixo dele
const CINZA = '#9AA3AB';
const COR_ESP = '#33465C';

const NOME_TIPO = { sensor: 'Sensor', atuador: 'Atuador', esp32: 'Placa ESP32' };

/** "57 %", "Ligado"... o valor de um campo do contrato, pronto para a tela. */
function valorDoCampo(modulo, campo, dados) {
  const def = CAMPOS[modulo]?.[campo];
  const v = dados?.[campo];
  if (v === undefined || v === null) return 'sem dado';
  if (def?.unidade && typeof v === 'number') {
    const casas = def.tipo === 'inteiro' || def.unidade === '%' ? 0 : def.unidade === 'V' ? 2 : 1;
    return `${numero(v, casas)} ${def.unidade === 'vagas' ? 'vagas livres' : def.unidade}`;
  }
  return textoCampo(modulo, campo, v);
}

/**
 * @param {object} cena
 * @param {HTMLElement} camada elemento por cima do canvas
 * @param {{obterEstado: () => object|null}} op
 */
export function criarSensores(cena, camada, { obterEstado }) {
  const grupo = new THREE.Group();
  grupo.name = 'sensores';
  grupo.visible = false;
  cena.scene.add(grupo);

  // Altura do pino de cada marcador: a padrão, ou mais alta só quando há um objeto da maquete (casa, prédio...) no mesmo
  // ponto x/z que esconderia o marcador. A posição x/z e o ID nunca mudam. Um raio de cima para baixo acha o topo do objeto.
  cena.maquete.updateMatrixWorld(true);
  const alvos = [];
  cena.maquete.traverse((o) => {
    if (!o.isMesh || o.material?.transparent) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    alvos.push(o);
  });
  const raio = new THREE.Raycaster();
  const baixo = new THREE.Vector3(0, -1, 0);
  function alturaDoPino(it) {
    raio.set(new THREE.Vector3(it.cx, 80, it.cy), baixo);
    const topo = raio.intersectObjects(alvos, false)[0]?.point.y;
    if (topo === undefined) return ALTURA_PINO;
    return Math.max(ALTURA_PINO, topo - Y_BLOCO + FOLGA_MARCADOR + RAIO_MARCADOR);
  }

  const matStem = new THREE.MeshBasicMaterial({ color: '#7A8794' });
  const geoStem = new THREE.CylinderGeometry(0.09, 0.09, 1, 6);
  const marcadores = SENSORES.map((it) => {
    const altura = alturaDoPino(it);
    const forte = cena.tintas[`${it.modulo}Forte`];
    const mat = new THREE.MeshBasicMaterial({ color: it.tipo === 'esp32' ? COR_ESP : forte });
    let geo;
    if (it.tipo === 'esp32') geo = new RoundedBoxGeometry(Math.max(2, it.w * 0.8), 1.3, Math.max(1.4, it.h * 0.8), 2, 0.3);
    else if (it.tipo === 'atuador') geo = new THREE.OctahedronGeometry(1.15);
    else geo = new THREE.SphereGeometry(0.95, 14, 10);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(it.cx, Y_BLOCO + altura, it.cy);
    m.userData.sensor = it;
    m.name = `sensor-${it.id}`;
    const stem = new THREE.Mesh(geoStem, matStem);
    stem.scale.y = altura;
    stem.position.set(it.cx, Y_BLOCO + altura / 2, it.cy);
    grupo.add(m, stem);

    const rotulo = h('button', { type: 'button', class: `sensor-rotulo area-${it.modulo}`, 'data-tipo': it.tipo, tabindex: '-1', 'aria-label': `${it.id}: ${it.descricao}` }, it.id);
    rotulo.addEventListener('click', (ev) => { ev.stopPropagation(); alternar(it); });
    rotulo.addEventListener('pointerenter', () => { passando = it; });
    rotulo.addEventListener('pointerleave', () => { if (passando === it) passando = null; });
    rotulo.hidden = true;
    camada.append(rotulo);
    return { it, mat, mesh: m, rotulo, altura, ancora: new THREE.Vector3(it.cx, Y_BLOCO + altura + 1.5, it.cy) };
  });

  // ---------- Dica ----------
  const dica = h('div', { class: 'sensor-dica', role: 'status', hidden: true });
  camada.append(dica);
  let fixo = null; // sensor aberto por clique ou toque
  let passando = null; // sensor sob o mouse
  let mostrado = null;

  function conteudo(it) {
    const est = obterEstado();
    const mod = est?.modulos?.[it.modulo];
    const nomeMod = buscarModulo(it.modulo)?.nome ?? it.modulo;
    const sinal = mod?.sinal === 'ok' ? 'Funcionando' : mod?.sinal === 'desativado' ? 'Desativado' : 'Sem sinal';
    const linhas = [h('strong', { class: 'dica-titulo' }, `${it.id} · ${it.descricao}`)];
    if (it.campos.length) {
      linhas.push(h('span', { class: 'dica-sub' }, `${NOME_TIPO[it.tipo]} de ${nomeMod}. Alimenta:`));
      if (mod?.sinal === 'ok' && mod.dados?.teste === true) linhas.push(h('span', { class: 'selo-teste' }, 'Valor de teste'));
      for (const c of it.campos) {
        linhas.push(h('span', { class: 'dica-linha' }, h('span', {}, CAMPOS[it.modulo]?.[c]?.rotulo ?? c), h('b', {}, mod?.sinal === 'ok' ? valorDoCampo(it.modulo, c, mod.dados) : '--')));
      }
    } else {
      linhas.push(h('span', { class: 'dica-sub' }, `Placa do módulo ${nomeMod}.`));
      linhas.push(h('span', { class: 'dica-linha' }, h('span', {}, 'Módulo'), h('b', {}, sinal)));
    }
    return linhas;
  }

  function mostrar(it) {
    if (it === mostrado) return;
    mostrado = it;
    dica.hidden = !it;
    if (it) dica.replaceChildren(...conteudo(it));
  }

  function alternar(it) { fixo = fixo === it ? null : it; }

  const v = new THREE.Vector3();
  let larg = 1, alt = 1;
  const obs = new ResizeObserver(() => { larg = camada.clientWidth; alt = camada.clientHeight; });
  obs.observe(camada);
  larg = camada.clientWidth; alt = camada.clientHeight;
  let ligada = false;
  let ultimaConteudo = 0;

  cena.aoQuadro((dt, t) => {
    if (!ligada) return;
    for (const mk of marcadores) {
      v.copy(mk.ancora).project(cena.camera);
      const ok = v.z < 1 && v.z > -1;
      mk.rotulo.style.visibility = ok ? 'visible' : 'hidden';
      if (ok) mk.rotulo.style.transform = `translate(${((v.x * 0.5 + 0.5) * larg).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * alt).toFixed(1)}px) translate(-50%, -100%)`;
    }
    const alvo = fixo ?? passando;
    mostrar(alvo);
    if (alvo) {
      if (t - ultimaConteudo > 1) { dica.replaceChildren(...conteudo(alvo)); ultimaConteudo = t; }
      const mk = marcadores.find((m) => m.it === alvo);
      v.set(alvo.cx, Y_BLOCO + (mk?.altura ?? ALTURA_PINO), alvo.cy).project(cena.camera);
      const x = (v.x * 0.5 + 0.5) * larg, y = (-v.y * 0.5 + 0.5) * alt;
      // A dica abre para o lado em que há mais espaço.
      const paraEsquerda = x > larg * 0.6;
      dica.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${paraEsquerda ? 'calc(-100% - 22px)' : '22px'}, -50%)`;
      mk?.rotulo.classList.add('ativo');
    }
    for (const mk of marcadores) if (mk.it !== alvo) mk.rotulo.classList.remove('ativo');
  });

  return {
    get ligada() { return ligada; },
    /** Altura (cm acima do bloco) do pino de cada marcador, por ID. */
    alturas: () => Object.fromEntries(marcadores.map((m) => [m.it.id, +m.altura.toFixed(2)])),
    ligar(valor) {
      ligada = !!valor;
      grupo.visible = ligada;
      for (const mk of marcadores) mk.rotulo.hidden = !ligada;
      if (!ligada) { fixo = null; passando = null; mostrar(null); }
    },
    /** Marcadores que o mouse pode pegar (vazio com a camada desligada). */
    picaveis: () => (ligada ? marcadores.map((m) => m.mesh) : []),
    /** Passou o mouse sobre um marcador 3D (ou saiu dele). */
    aoPassar(obj) { passando = obj?.userData?.sensor ?? null; },
    /** Clique num marcador 3D: abre ou fecha a dica fixa. Devolve true se tratou o clique. */
    aoClicar(obj) {
      const it = obj?.userData?.sensor;
      if (it) { alternar(it); return true; }
      if (fixo) fixo = null;
      return false;
    },
    atualizar(estado) {
      for (const mk of marcadores) {
        const sinal = estado?.modulos?.[mk.it.modulo]?.sinal;
        const forte = cena.tintas[`${mk.it.modulo}Forte`];
        mk.mat.color.set(sinal === 'ok' ? (mk.it.tipo === 'esp32' ? COR_ESP : forte) : CINZA);
        mk.rotulo.dataset.sinal = sinal ?? 'sem_sinal';
      }
    },
    destruir() { obs.disconnect(); for (const mk of marcadores) mk.rotulo.remove(); dica.remove(); cena.scene.remove(grupo); },
  };
}
