// Simulador (modo demo): leituras plausíveis e coerentes dos 5 módulos a cada 2 s.
// Valores sempre dentro das faixas do contrato. Obedece aos comandos.

const CICLO_SOL_S = 180; // o sol sobe e desce em 3 minutos
const SEMAFORO = [['verde', 6], ['amarelo', 2], ['vermelho', 6]]; // segundos
const DURACAO_IRRIGAR_AGORA_S = 10;
const RESERVATORIO_MINIMO_AUTO = 20; // abaixo disso a irrigação automática fica bloqueada (PDF)

const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const arred = (v, casas = 1) => Math.round(v * 10 ** casas) / 10 ** casas;

/**
 * @param {object} op
 * @param {{registrarLeitura: (id: string, dados: object) => unknown}} op.estado
 * @param {number} [op.intervaloMs]
 * @param {() => number} [op.agora]
 * @param {() => number} [op.aleatorio]
 */
export function criarSimulador({ estado, intervaloMs = 2000, agora = Date.now, aleatorio = Math.random }) {
  const inicio = agora();
  let timer = null;
  /** Módulos que o simulador deixa de mandar (menu de depuração: forçar "sem sinal"). */
  const silenciados = new Set();

  const s = {
    bateria_pct: 72,
    temperatura_c: 22,
    presencaAte: 0,
    persiana: 'aberta',
    iluminacao: 'automatico',
    vagas_livres: 2,
    proximaChegada: 0,
    demonstracao: false,
    umidade_solo_pct: 58,
    reservatorio_pct: 66,
    bomba: false,
    irrigacao: 'automatico',
    irrigarAgoraAte: 0,
  };

  const ruido = (amplitude) => (aleatorio() * 2 - 1) * amplitude;

  function passo() {
    const t = (agora() - inicio) / 1000;
    const dt = intervaloMs / 1000;

    // Sol: metade do ciclo é "dia" (seno positivo), metade "noite".
    // Começa de manhã (20 s depois do nascer do sol), para a demo abrir de dia.
    const sol = Math.max(0, Math.sin((2 * Math.PI * (t + 20)) / CICLO_SOL_S));
    const noite = sol < 0.12;

    // --- Centro Urbano ---
    const postes = noite ? 'ligados' : 'desligados';
    const fase = t % SEMAFORO.reduce((a, [, d]) => a + d, 0);
    let acumulado = 0;
    let semaforo = 'verde';
    for (const [cor, d] of SEMAFORO) { acumulado += d; if (fase < acumulado) { semaforo = cor; break; } }
    if (aleatorio() < 0.12) s.vagas_livres = limitar(s.vagas_livres + (aleatorio() < 0.5 ? -1 : 1), 0, 4);

    // --- Economia Circular ---
    const agoraS = t;
    if (s.irrigacao === 'manual') {
      s.bomba = agoraS < s.irrigarAgoraAte;
    } else if (s.reservatorio_pct < RESERVATORIO_MINIMO_AUTO) {
      s.bomba = false;
    } else if (s.umidade_solo_pct < 35) {
      s.bomba = true;
    } else if (s.umidade_solo_pct > 70) {
      s.bomba = false;
    }
    if (s.bomba) {
      s.umidade_solo_pct += 3 * (dt / 2);
      s.reservatorio_pct -= 1.5 * (dt / 2);
    } else {
      s.umidade_solo_pct -= 0.5 * (dt / 2);
      s.reservatorio_pct += 0.3 * (dt / 2);
    }
    s.umidade_solo_pct = limitar(s.umidade_solo_pct, 5, 95);
    s.reservatorio_pct = limitar(s.reservatorio_pct, 3, 100);
    if (s.reservatorio_pct <= 3) s.bomba = false;

    // --- Residencial ---
    const alvo = 18 + 8 * sol; // a casa esquenta de dia
    s.temperatura_c += (alvo - s.temperatura_c) * 0.08 + ruido(0.1);
    const aquecimento = s.temperatura_c < 19.5;
    if (aquecimento) s.temperatura_c += 0.3;
    s.temperatura_c = limitar(s.temperatura_c, 10, 35);
    if (agoraS >= s.presencaAte && aleatorio() < 0.06) s.presencaAte = agoraS + 10 + aleatorio() * 15;
    const presenca = agoraS < s.presencaAte;

    // --- Mobilidade ---
    if (s.proximaChegada <= agoraS) s.proximaChegada = agoraS + 40 + aleatorio() * 30;
    const faltaS = s.proximaChegada - agoraS;
    const naPlataforma = faltaS > 0 && faltaS < 6; // ônibus parado nos últimos 6 s antes de sair
    const minutos = Math.max(1, Math.ceil(faltaS / 60));
    const proximo_veiculo = naPlataforma ? 'Ônibus 2 na plataforma' : `Ônibus 2 em ${minutos} min`;
    let trem = 'parado';
    if (s.demonstracao) {
      const ciclo = (agoraS % 16);
      trem = ciclo < 12 ? 'em movimento' : 'na estacao';
    }

    // --- Energia ---
    const solar_w = arred(limitar(8 * sol + ruido(0.15) * (sol > 0 ? 1 : 0), 0, 100));
    const eolica_w = arred(limitar(2 + 1.4 * Math.sin(t / 23) + ruido(0.3), 0, 100));
    let consumo = 3.2 + ruido(0.2);
    if (postes === 'ligados') consumo += 1.6;
    if (s.bomba) consumo += 2;
    if (aquecimento) consumo += 1.2;
    if (s.iluminacao === 'ligada' || (s.iluminacao === 'automatico' && noite)) consumo += 0.6;
    if (trem === 'em movimento') consumo += 1;
    const consumo_w = arred(limitar(consumo, 0, 100));
    s.bateria_pct = limitar(s.bateria_pct + (solar_w + eolica_w - consumo_w) * 0.25 * (dt / 2), 12, 100);
    const bateria_v = arred(11 + 1.8 * (s.bateria_pct / 100), 2);

    const leituras = {
      energia: { bateria_pct: arred(s.bateria_pct), bateria_v, solar_w, eolica_w, consumo_w },
      residencial: {
        temperatura_c: arred(s.temperatura_c),
        umidade_pct: arred(limitar(55 + 8 * Math.sin(t / 37) + ruido(1), 0, 100)),
        aquecimento,
        presenca,
        persiana: s.persiana,
        iluminacao: s.iluminacao,
      },
      centro: { postes, semaforo, vagas_livres: s.vagas_livres },
      mobilidade: {
        terminal: 'operando',
        proximo_veiculo,
        veiculo_na_plataforma: naPlataforma,
        trem,
        demonstracao: s.demonstracao,
      },
      economia: {
        umidade_solo_pct: arred(s.umidade_solo_pct),
        reservatorio_pct: arred(s.reservatorio_pct),
        bomba: s.bomba,
        irrigacao: s.irrigacao,
      },
    };

    for (const [id, dados] of Object.entries(leituras)) {
      if (!silenciados.has(id)) estado.registrarLeitura(id, dados);
    }
    return leituras;
  }

  return {
    passo,
    iniciar() {
      if (timer) return;
      passo();
      timer = setInterval(() => {
        try { passo(); } catch (e) { console.error('[simulador] erro:', e); }
      }, intervaloMs);
    },
    parar() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    get ligado() { return timer !== null; },

    /** Silencia ou volta a mandar um módulo (depuração). */
    silenciar(id, sim) { if (sim) silenciados.add(id); else silenciados.delete(id); },

    get silenciados() { return [...silenciados]; },

    /**
     * Executa um comando como o ESP32 faria. O ping só confirma.
     * @returns {Record<string, unknown>|null} os campos de eco que mudaram ({} no ping), ou null se não executou
     */
    aplicarComando({ modulo, comando, valor }) {
      if (comando === 'ping') return {};
      const t = (agora() - inicio) / 1000;
      if (modulo === 'economia' && comando === 'irrigacao') {
        if (valor === 'agora') { s.irrigacao = 'manual'; s.irrigarAgoraAte = t + DURACAO_IRRIGAR_AGORA_S; s.bomba = true; }
        else { s.irrigacao = 'automatico'; s.irrigarAgoraAte = 0; }
        return { irrigacao: s.irrigacao, bomba: s.bomba };
      }
      if (modulo === 'residencial' && comando === 'iluminacao') {
        s.iluminacao = { automatico: 'automatico', ligar: 'ligada', desligar: 'desligada' }[valor];
        return { iluminacao: s.iluminacao };
      }
      if (modulo === 'residencial' && comando === 'persiana') {
        s.persiana = valor === 'abrir' ? 'aberta' : 'fechada';
        return { persiana: s.persiana };
      }
      if (modulo === 'mobilidade' && comando === 'demonstracao') {
        s.demonstracao = valor === 'iniciar';
        return { demonstracao: s.demonstracao };
      }
      return null;
    },
  };
}
