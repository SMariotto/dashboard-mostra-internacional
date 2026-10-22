// Fala com o servidor: Server-Sent Events em /api/eventos.
// Se o SSE falhar, cai para polling de 1 s em /api/estado e tenta o SSE de novo a cada 30 s.
import { FonteDeDados } from './FonteDeDados.js';

const SEM_NOTICIA_MS = 5000; // sem nada por 5 s: "sem conexão"

export class FonteServidor extends FonteDeDados {
  #sse = null;
  #polling = null;
  #retentarSse = null;
  #vigia = null;
  #ultimaNoticia = 0;

  constructor({ urlEventos = '/api/eventos', urlEstado = '/api/estado' } = {}) {
    super();
    this.urlEventos = urlEventos;
    this.urlEstado = urlEstado;
  }

  iniciar() {
    this.#abrirSse();
    this.#vigia = setInterval(() => this.definirConexao(Date.now() - this.#ultimaNoticia < SEM_NOTICIA_MS), 1000);
  }

  parar() {
    this.#sse?.close();
    clearInterval(this.#polling);
    clearTimeout(this.#retentarSse);
    clearInterval(this.#vigia);
  }

  #receber(estado) {
    this.#ultimaNoticia = Date.now();
    this.definirConexao(true);
    this.emitir(estado);
  }

  #abrirSse() {
    if (typeof EventSource === 'undefined') { this.#iniciarPolling(); return; }
    const sse = new EventSource(this.urlEventos);
    this.#sse = sse;
    sse.onmessage = (ev) => {
      try { this.#receber(JSON.parse(ev.data)); } catch { /* mensagem quebrada: espera a próxima */ }
    };
    sse.onerror = () => {
      // Fecha e usa polling; tenta o SSE de novo depois.
      sse.close();
      if (this.#sse === sse) this.#sse = null;
      this.#iniciarPolling();
      clearTimeout(this.#retentarSse);
      this.#retentarSse = setTimeout(() => { this.#pararPolling(); this.#abrirSse(); }, 30_000);
    };
  }

  #iniciarPolling() {
    if (this.#polling) return;
    const buscar = async () => {
      try {
        const r = await fetch(this.urlEstado, { cache: 'no-store' });
        if (r.ok) this.#receber(await r.json());
      } catch { /* servidor fora: o vigia mostra "sem conexão" */ }
    };
    buscar();
    this.#polling = setInterval(buscar, 1000);
  }

  #pararPolling() {
    clearInterval(this.#polling);
    this.#polling = null;
  }
}
