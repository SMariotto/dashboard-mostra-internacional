// Etiquetas flutuantes (HTML sobre o mapa): o nome de cada área com a bolinha de estado, presas ao bloco.
// Uma linha, letra de 20 px. Cada etiqueta é um link para o endereço da área (#energia...), então
// clicar nela faz o mesmo que clicar no bloco.
import * as THREE from 'three';
import { MODULOS } from '../../compartilhado/contrato.js';
import { BLOCOS } from '../../compartilhado/maquete.js';
import { h, icone } from '../ui/dom.js';
import { ESTADO } from '../ui/icones.js';
import { estadoDaArea } from '../ui/areas.js';

const ROTULO_ESTADO = { alerta: 'Alerta', sem_sinal: 'Sem sinal', desativado: 'Desativado' };
const ICONE_ESTADO = { alerta: ESTADO.alerta, sem_sinal: ESTADO.semSinal, desativado: ESTADO.desativado };

/**
 * @param {object} cena
 * @param {HTMLElement} camada elemento por cima do canvas (posição absoluta, sem eventos)
 * @param {{aoPassar?: (id: string|null) => void}} [op]
 */
export function criarEtiquetas(cena, camada, { aoPassar = () => {} } = {}) {
  const itens = MODULOS.map((m) => {
    const bloco = BLOCOS.find((b) => b.id === m.id);
    const ponto = h('span', { class: 'etq-ponto', 'aria-hidden': 'true' });
    const estadoTxt = h('span', { class: 'etq-estado' });
    const el = h('a', { class: `etiqueta area-${m.id}`, href: `#${m.id}`, 'data-estado': 'ok' },
      ponto, h('span', { class: 'etq-nome' }, m.curto), estadoTxt);
    el.addEventListener('pointerenter', () => aoPassar(m.id));
    el.addEventListener('pointerleave', () => aoPassar(null));
    camada.append(el);
    // Ancora na frente do bloco (o lado do visitante): a etiqueta fica logo abaixo da borda, sobre a rua ou a madeira.
    // Na fileira de cima, a da Energia fica um pouco para a esquerda e a da Economia Circular para a direita,
    // para as etiquetas não se encostarem quando o mapa está pequeno (1366 x 768).
    const deslocamento = m.id === 'energia' ? -0.1 * bloco.w : m.id === 'economia' ? 0.27 * bloco.w : 0;
    const ancora = new THREE.Vector3(bloco.x + bloco.w / 2 + deslocamento, 0.8, bloco.y + bloco.h + 0.8);
    return { m, el, ponto, estadoTxt, ancora };
  });

  const v = new THREE.Vector3();
  let larg = 1, alt = 1;
  const obs = new ResizeObserver(() => { larg = camada.clientWidth; alt = camada.clientHeight; });
  obs.observe(camada);
  larg = camada.clientWidth; alt = camada.clientHeight;

  cena.aoQuadro(() => {
    cena.scene.updateMatrixWorld();
    for (const it of itens) {
      v.copy(it.ancora).project(cena.camera);
      const visivel = v.z < 1 && v.z > -1;
      it.el.style.visibility = visivel ? 'visible' : 'hidden';
      if (!visivel) continue;
      const x = (v.x * 0.5 + 0.5) * larg;
      const y = (-v.y * 0.5 + 0.5) * alt;
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
    }
  });

  return {
    /** Atualiza a bolinha e o texto de estado de cada etiqueta. */
    atualizar(estado) {
      for (const it of itens) {
        const e = estadoDaArea(it.m.id, estado);
        it.el.dataset.estado = e.chave;
        it.estadoTxt.replaceChildren(...(e.chave === 'ok' ? [] : [icone(ICONE_ESTADO[e.chave]), ROTULO_ESTADO[e.chave]]));
        it.el.setAttribute('aria-label', `${it.m.nome}: ${e.texto}`);
      }
    },
    /** Marca a área escolhida (as outras ficam mais discretas) e a que está sob o mouse. */
    marcar({ selecionada = null, hover = null } = {}) {
      camada.dataset.selecao = selecionada ?? '';
      for (const it of itens) {
        it.el.classList.toggle('escolhida', it.m.id === selecionada);
        it.el.classList.toggle('realcada', it.m.id === hover);
      }
    },
    destruir() { obs.disconnect(); for (const it of itens) it.el.remove(); },
  };
}

