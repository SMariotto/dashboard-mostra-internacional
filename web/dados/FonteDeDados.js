// Interface da fonte de dados do painel.
// Hoje a única implementação é FonteServidor (SSE com queda para polling).
// Troca futura possível (SPEC seção 11): WebSocket ou MQTT implementando esta mesma interface,
// sem mexer no resto da tela.

export class FonteDeDados {
  /** Último estado recebido (formato do /api/estado), ou null. */
  ultimo = null;
  /** Conectado ao servidor? (recebeu algo nos últimos segundos) */
  conectado = false;

  #ouvintes = new Set();
  #ouvintesConexao = new Set();

  /**
   * Recebe o estado a cada mudança. Se já existe um estado, chama na hora.
   * @param {(estado: object) => void} fn
   * @returns {() => void} cancela
   */
  assinar(fn) {
    this.#ouvintes.add(fn);
    if (this.ultimo) fn(this.ultimo);
    return () => this.#ouvintes.delete(fn);
  }

  /** @param {(conectado: boolean) => void} fn */
  aoMudarConexao(fn) {
    this.#ouvintesConexao.add(fn);
    fn(this.conectado);
    return () => this.#ouvintesConexao.delete(fn);
  }

  /** Para as implementações: entrega um estado novo. */
  emitir(estado) {
    this.ultimo = estado;
    for (const fn of this.#ouvintes) {
      try { fn(estado); } catch (e) { console.error('Erro ao desenhar o estado:', e); }
    }
  }

  /** Para as implementações: avisa mudança de conexão. */
  definirConexao(conectado) {
    if (conectado === this.conectado) return;
    this.conectado = conectado;
    for (const fn of this.#ouvintesConexao) fn(conectado);
  }

  iniciar() { throw new Error('FonteDeDados.iniciar() precisa ser implementado'); }
  parar() {}
}
