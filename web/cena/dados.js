// Liga os dados do servidor (o /api/estado) à cena: tudo o que a SPEC seção 4 prende a um campo do contrato.
//
//   energia      eolica_w -> velocidade das 3 turbinas; bateria_pct -> LED da caixa de baterias
//   centro       semaforo -> luz acesa; vagas_livres -> carros nas vagas (sem desenho desde as fotos de 22/10); postes -> LEDs (e halos);
//                janelas acendem de noite
//   economia     reservatorio_pct -> água (aro pisca abaixo de 20%); bomba -> gotas da irrigação
//   residencial  iluminacao -> janelas; persiana -> persiana; presenca -> bonequinho; aquecimento -> brilho
//   mobilidade   trem / demonstracao -> trem dá voltas no círculo (o painel de partidas não é mais desenhado)
//
// Módulo "sem sinal": bloco dessaturado e tudo parado. "Desativado": dessaturado e listrado.
import * as THREE from 'three';
import { RESIDENCIAL } from '../../compartilhado/maquete.js';
import { COR } from './paleta.js';
import { texturaListras } from './texturas.js';
import { Y_BLOCO, texturaHalo } from './util.js';
import { reduzMovimento } from '../ui/dom.js';

const VELOCIDADE_TURBINA = 0.9; // rad/s por W de geração eólica
const VELOCIDADE_TREM = 16; // cm/s ao longo do círculo

/**
 * @param {object} cena a cena de criarCena()
 * @param {{noite: boolean, aoMudar: Function}} ambiente de criarAmbiente()
 */
export function ligarDados(cena, ambiente) {
  const { objetos, fabrica: F } = cena;
  const mod = (id) => estado?.modulos?.[id];
  /** @type {object|null} */
  let estado = null;

  const anim = {
    rotor: 0, rotorAlvo: 0,
    nivel: 0.67, nivelAlvo: 0.67,
    persiana: 1, persianaAlvo: 1,
    tremModo: 'parado',
    alertaReservatorio: false, bomba: false,
  };

  // Brilho laranja do aquecimento (halo aditivo sobre a casa 1).
  const casa1 = RESIDENCIAL.casas.find((c) => c.id === RESIDENCIAL.aquecimento.casa);
  const geoBrilho = new THREE.BufferGeometry();
  geoBrilho.setAttribute('position', new THREE.Float32BufferAttribute([casa1.x + casa1.w / 2, Y_BLOCO + 5.2, casa1.y + casa1.h / 2], 3));
  const brilhoAquecimento = new THREE.Points(geoBrilho, new THREE.PointsMaterial({
    map: texturaHalo(), color: '#FF9A4D', size: 20, sizeAttenuation: true, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  brilhoAquecimento.visible = false;
  brilhoAquecimento.frustumCulled = false;
  objetos.residencial.grupo.add(brilhoAquecimento);

  const listras = texturaListras();
  listras.repeat.set(7, 7); // listras finas em qualquer bloco

  // ---------- Estado de cada área ----------
  function aplicarSinal(id, sinal) {
    F.definirFiltro(id, sinal === 'ok' ? 0 : sinal === 'sem_sinal' ? 1 : 2);
    // O topo do bloco (a laje e, na Economia Circular, o feltro que a cobre) ganha as listras.
    const queria = sinal === 'desativado' ? listras : null;
    for (const topo of [cena.base.blocos[id].laje.material, objetos[id].matTopo]) {
      if (topo && topo.map !== queria) { topo.map = queria; topo.needsUpdate = true; }
    }
  }

  /** Aplica as luzes que dependem do dado E da noite (postes, janelas). */
  function aplicarLuzes() {
    const noite = ambiente.noite;
    const c = mod('centro')?.dados ?? {};
    const postesLigados = c.postes === 'ligados' || (c.postes !== 'desligados' && noite);
    cena.postes.definirLigados(postesLigados);
    F.pintar(objetos.centro.matJanela, noite ? COR.janelaNoite : COR.janelaDia);
    const r = mod('residencial')?.dados ?? {};
    const casasAcesas = r.iluminacao === 'ligada' || (r.iluminacao !== 'desligada' && noite);
    F.pintar(objetos.residencial.matJanelas, casasAcesas ? COR.janelaNoite : COR.janelaCasa);
  }
  ambiente.aoMudar(aplicarLuzes);

  function aplicar(novo) {
    estado = novo;
    for (const id of Object.keys(objetos)) aplicarSinal(id, mod(id)?.sinal ?? 'sem_sinal');
    const vivo = (id) => mod(id)?.sinal === 'ok';

    // Energia
    const e = mod('energia')?.dados ?? {};
    anim.rotorAlvo = vivo('energia') && typeof e.eolica_w === 'number' ? Math.min(14, e.eolica_w * VELOCIDADE_TURBINA) : 0;
    F.pintar(objetos.energia.ledBateria.material, typeof e.bateria_pct === 'number' && e.bateria_pct < 20 ? '#F0A93A' : '#7BD389');

    // Centro Urbano
    const c = mod('centro')?.dados ?? {};
    for (const [cor, luz] of Object.entries(objetos.centro.luzes)) F.pintar(luz.mat, cor === c.semaforo ? luz.acesa : luz.apagada);
    const ocupadas = typeof c.vagas_livres === 'number' ? 4 - c.vagas_livres : 0;
    objetos.centro.carros.forEach((carro, i) => { carro.visible = i < ocupadas; });

    // Economia Circular
    const ec = mod('economia')?.dados ?? {};
    if (typeof ec.reservatorio_pct === 'number') anim.nivelAlvo = ec.reservatorio_pct / 100;
    anim.alertaReservatorio = typeof ec.reservatorio_pct === 'number' && ec.reservatorio_pct < 20;
    anim.bomba = vivo('economia') && ec.bomba === true;
    objetos.economia.gotas.visible = anim.bomba;

    // Residencial
    const r = mod('residencial')?.dados ?? {};
    if (r.persiana) anim.persianaAlvo = r.persiana === 'aberta' ? 0.08 : 1;
    objetos.residencial.boneco.visible = r.presenca === true;
    objetos.residencial.definirAquecimento(r.aquecimento === true);
    brilhoAquecimento.visible = r.aquecimento === true;

    // Mobilidade
    const m = mod('mobilidade')?.dados ?? {};
    objetos.mobilidade.escreverPainel(m.proximo_veiculo);
    anim.tremModo = !vivo('mobilidade') ? 'parado' : (m.demonstracao === true || m.trem === 'em movimento') ? 'movimento' : m.trem === 'na estacao' ? 'estacao' : 'parado';

    aplicarLuzes();
  }

  // ---------- Animações (a cada quadro) ----------
  const suave = (atual, alvo, dt, taxa) => atual + (alvo - atual) * Math.min(1, dt * taxa);
  cena.aoQuadro((dt, t) => {
    const parado = reduzMovimento();
    // Turbina: a velocidade acompanha a eólica sem trancos.
    anim.rotor = suave(anim.rotor, anim.rotorAlvo, dt, 1.5);
    for (const rotor of objetos.energia.rotores) rotor.rotation.z -= anim.rotor * dt;

    // Reservatório: a água sobe e desce; abaixo de 20% o aro pisca.
    anim.nivel = suave(anim.nivel, anim.nivelAlvo, dt, parado ? 100 : 2);
    objetos.economia.definirNivel(anim.nivel);
    const aro = objetos.economia.aro;
    if (anim.alertaReservatorio) {
      const piscando = parado || Math.sin(t * 6) > 0;
      F.pintar(aro, piscando ? '#E8862F' : '#7FB3C6');
    } else F.pintar(aro, '#7FB3C6');
    if (anim.bomba) objetos.economia.animarGotas(t);

    // Persiana abre e fecha.
    anim.persiana = suave(anim.persiana, anim.persianaAlvo, dt, parado ? 100 : 2.5);
    objetos.residencial.definirPersiana(anim.persiana);
    if (brilhoAquecimento.visible) brilhoAquecimento.material.opacity = 0.45 + (parado ? 0 : Math.sin(t * 1.6) * 0.1);

    // Trem: dá voltas no círculo, para "na estação" ao lado do galpão ou fica onde está.
    const M = objetos.mobilidade;
    const passo = (VELOCIDADE_TREM * dt) / M.circunferencia; // fração de volta neste quadro
    if (anim.tremModo === 'movimento') {
      M.definirFracao(M.fracao() + passo);
    } else if (anim.tremModo === 'estacao') {
      const falta = (((M.fracaoEstacao - M.fracao()) % 1) + 1) % 1; // sempre para a frente
      if (falta > 0.002 && falta < 0.998) M.definirFracao(M.fracao() + Math.min(falta, passo)); // 0,998: já chegou (não dá outra volta)
    }
  });

  return { aplicar, aplicarLuzes, brilhoAquecimento };
}
