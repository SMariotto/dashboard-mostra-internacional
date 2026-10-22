// Estado da cidade: último dado de cada módulo, sinal (ok, sem_sinal, desativado),
// alertas e histórico curto em memória.
import {
  VERSAO, MODULOS, IDS_MODULOS, CAMPOS, validarDados, calcularSituacao, calcularAlertas,
} from '../compartilhado/contrato.js';

/**
 * @param {object} op
 * @param {number} op.semSinalMs     sem leitura há mais que isso: "sem_sinal"
 * @param {number} op.historicoMs    quanto tempo de histórico guardar
 * @param {'demo'|'real'} op.modo
 * @param {boolean} [op.apresentacao]
 * @param {() => number} [op.agora]  relógio (os testes trocam)
 */
export function criarEstado({ semSinalMs, historicoMs, modo, apresentacao = true, agora = Date.now }) {
  /** @type {Record<string, {dados: Record<string, unknown>, ultimaLeitura: number|null, ativo: boolean}>} */
  const modulos = {};
  for (const id of IDS_MODULOS) modulos[id] = { dados: {}, ultimaLeitura: null, ativo: true };

  /** @type {Record<string, {t: number, v: number}[]>} chave "modulo.campo" */
  const historico = {};
  const ouvintes = new Set();
  let modoAtual = modo;
  let apresentacaoAtual = apresentacao;
  let ultimoSinal = JSON.stringify(sinais());

  function sinalDe(id) {
    const m = modulos[id];
    if (!m.ativo) return 'desativado';
    if (m.ultimaLeitura === null || agora() - m.ultimaLeitura > semSinalMs) return 'sem_sinal';
    return 'ok';
  }

  function sinais() {
    return Object.fromEntries(IDS_MODULOS.map((id) => [id, sinalDe(id)]));
  }

  /** Pontos numéricos de uma leitura (mais a geração total da Energia, para o gráfico). */
  function guardarPontos(id, d, t) {
    const pontos = { ...d };
    if (id === 'energia' && typeof d.solar_w === 'number' && typeof d.eolica_w === 'number') {
      pontos.geracao_w = Math.round((d.solar_w + d.eolica_w) * 10) / 10;
    }
    for (const [campo, v] of Object.entries(pontos)) {
      const tipo = CAMPOS[id][campo]?.tipo;
      if (campo !== 'geracao_w' && tipo !== 'numero' && tipo !== 'inteiro') continue;
      (historico[`${id}.${campo}`] ??= []).push({ t, v });
    }
  }

  function cortarHistorico() {
    const limite = agora() - historicoMs;
    for (const lista of Object.values(historico)) {
      while (lista.length && lista[0].t < limite) lista.shift();
    }
  }

  function avisar() {
    ultimoSinal = JSON.stringify(sinais());
    for (const fn of ouvintes) {
      try { fn(); } catch (e) { console.error('[estado] erro num ouvinte:', e); }
    }
  }

  return {
    get modo() { return modoAtual; },

    /** @param {'demo'|'real'} novo */
    definirModo(novo) {
      if (novo === modoAtual) return;
      modoAtual = novo;
      // Ao trocar de modo, apaga os dados antigos para não mostrar valor do simulador
      // como se fosse leitura real (e vice-versa).
      for (const id of IDS_MODULOS) { modulos[id].dados = {}; modulos[id].ultimaLeitura = null; }
      avisar();
    },

    get apresentacao() { return apresentacaoAtual; },
    definirApresentacao(ligado) { apresentacaoAtual = !!ligado; avisar(); },

    /**
     * Guarda uma leitura. Campos inválidos são ignorados sozinhos.
     * @param {{substituir?: boolean}} [op]  substituir: a leitura inteira troca os dados antigos (é o que o ESP32 faz:
     *   campo que ele deixou de mandar, como o de um sensor desligado, volta a "--" e some o selo de teste).
     *   Sem isso, a leitura só acrescenta ou troca os campos que vieram (simulador e eco de comando).
     * @returns {{aceita: boolean, avisos: string[]}}
     */
    registrarLeitura(id, dados, { substituir = false } = {}) {
      const m = modulos[id];
      if (!m) return { aceita: false, avisos: [`módulo desconhecido: ${id}`] };
      if (!m.ativo) return { aceita: false, avisos: [`${id} está desativado pela administração`] };
      const { validos, avisos } = validarDados(id, dados);
      if (substituir) m.dados = {};
      Object.assign(m.dados, validos);
      if (id === 'energia' && !('situacao' in validos)) {
        const s = calcularSituacao(m.dados);
        if (s) m.dados.situacao = s;
      }
      m.ultimaLeitura = agora();
      avisar();
      return { aceita: true, avisos };
    },

    /** Liga ou desliga um módulo (administração). */
    definirAtivo(id, ativo) {
      const m = modulos[id];
      if (!m) return false;
      m.ativo = !!ativo;
      if (m.ativo) m.ultimaLeitura = null; // volta como "sem sinal" até a próxima leitura
      avisar();
      return true;
    },

    /** Chamado a cada segundo: avisa se algum módulo mudou de sinal só pelo tempo. */
    verificarSinal() {
      if (JSON.stringify(sinais()) !== ultimoSinal) avisar();
    },

    /** Chamado a cada 2 s: guarda um ponto dos campos numéricos de quem está "ok". */
    amostrarHistorico() {
      const t = agora();
      for (const id of IDS_MODULOS) {
        if (sinalDe(id) === 'ok') guardarPontos(id, modulos[id].dados, t);
      }
      cortarHistorico();
    },

    /**
     * Recoloca no gráfico as linhas relidas do arquivo (ao ligar o servidor).
     * @param {{hora: string, modulo: string, dados: object}[]} linhas
     */
    carregarHistorico(linhas) {
      const ordenadas = linhas
        .map((l) => ({ t: Date.parse(l.hora), modulo: l.modulo, dados: l.dados }))
        .filter((l) => Number.isFinite(l.t) && modulos[l.modulo])
        .sort((a, b) => a.t - b.t);
      for (const l of ordenadas) guardarPontos(l.modulo, validarDados(l.modulo, l.dados).validos, l.t);
      cortarHistorico();
      return ordenadas.length;
    },

    /** @returns {{t: number, v: number}[]} */
    historico(id, campo) {
      return [...(historico[`${id}.${campo}`] ?? [])];
    },

    /** Estado completo, como vai para /api/estado. */
    obter() {
      const saida = {};
      const dadosAtivos = {};
      for (const def of MODULOS) {
        const m = modulos[def.id];
        saida[def.id] = {
          nome: def.nome,
          sinal: sinalDe(def.id),
          ativo: m.ativo,
          ultimaLeitura: m.ultimaLeitura,
          dados: { ...m.dados },
        };
        if (m.ativo) dadosAtivos[def.id] = m.dados;
      }
      return {
        versao: VERSAO,
        modo: modoAtual,
        apresentacao: apresentacaoAtual,
        hora: agora(),
        modulos: saida,
        alertas: calcularAlertas(dadosAtivos),
      };
    },

    /** @param {() => void} fn @returns {() => void} para cancelar */
    aoMudar(fn) {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
  };
}
