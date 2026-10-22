// Papel de quem está usando a tela (visualização, controle, administração) e pedidos com token.
// O token fica no sessionStorage (some ao fechar o navegador). A checagem de verdade é no servidor.
import { guardar } from '../ui/dom.js';

const CHAVE = 'smartcanada.token';

export function criarSessao() {
  let papel = 'visualizacao';
  let token = null;
  const ouvintes = new Set();
  const avisar = () => { for (const fn of ouvintes) fn(papel); };

  async function pedir(metodo, caminho, corpo) {
    const headers = {};
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const r = await fetch(caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo), cache: 'no-store' });
      let json = null;
      try { json = await r.clone().json(); } catch { /* não é JSON */ }
      // Token vencido ou servidor reiniciado: volta para visualização.
      if (r.status === 403 && token && papel !== 'visualizacao') conferir();
      return { status: r.status, json, resposta: r };
    } catch {
      return { status: 0, json: { ok: false, erro: 'Sem conexão com o servidor.' }, resposta: null };
    }
  }

  function definir(novoPapel, novoToken) {
    papel = novoPapel;
    token = novoToken;
    guardar.gravar(CHAVE, token);
    avisar();
  }

  /** Confere no servidor se o token guardado ainda vale. */
  async function conferir() {
    if (!token) return;
    const r = await pedir('GET', '/api/sessao');
    if (r.status === 200 && r.json?.papel && r.json.papel !== 'visualizacao') {
      if (r.json.papel !== papel) { papel = r.json.papel; avisar(); }
    } else if (r.status === 200) {
      definir('visualizacao', null);
    }
  }

  return {
    get papel() { return papel; },
    get token() { return token; },
    pedir,

    async iniciar() {
      token = guardar.ler(CHAVE);
      if (token) await conferir();
    },

    /** @returns {Promise<{ok: boolean, erro?: string}>} */
    async entrar(codigo) {
      const r = await pedir('POST', '/api/login', { codigo });
      if (r.status === 200 && r.json?.ok) { definir(r.json.papel, r.json.token); return { ok: true }; }
      return { ok: false, erro: r.json?.erro ?? 'Não foi possível entrar.' };
    },

    async sair() {
      await pedir('POST', '/api/logout', {});
      definir('visualizacao', null);
    },

    /** @param {(papel: string) => void} fn */
    aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
  };
}
