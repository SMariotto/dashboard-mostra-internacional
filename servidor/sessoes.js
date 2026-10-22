// Login por papel (controle, administração), tokens assinados com HMAC e limite de tentativas.
// O segredo muda a cada vez que o servidor liga: reiniciar o servidor desloga todo mundo.
import { randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';

const VALOR_EXEMPLO = 'troque-isto';

const hash = (texto) => createHash('sha256').update(String(texto), 'utf8').digest();
const iguais = (a, b) => timingSafeEqual(hash(a), hash(b));

/**
 * @param {object} op
 * @param {{controle?: string, administracao?: string}|undefined} op.codigos
 * @param {number} [op.validadeMs]   8 horas
 * @param {number} [op.maxTentativas] erros por IP dentro da janela
 * @param {number} [op.janelaMs]     5 minutos
 * @param {() => number} [op.agora]
 */
export function criarSessoes({ codigos, validadeMs = 8 * 3600_000, maxTentativas = 5, janelaMs = 5 * 60_000, agora = Date.now }) {
  const segredo = randomBytes(32);
  const revogados = new Map(); // id do token -> expiração
  const erros = new Map(); // ip -> horários dos erros

  // Código vazio ou "troque-isto" não vale.
  const validos = {};
  for (const papel of ['administracao', 'controle']) {
    const c = codigos?.[papel];
    if (typeof c === 'string' && c.trim() && c !== VALOR_EXEMPLO) validos[papel] = c;
  }
  const ativo = Object.keys(validos).length > 0;

  const assinar = (corpo) => createHmac('sha256', segredo).update(corpo).digest('base64url');

  function errosRecentes(ip) {
    const limite = agora() - janelaMs;
    const lista = (erros.get(ip) ?? []).filter((t) => t > limite);
    if (lista.length) erros.set(ip, lista); else erros.delete(ip);
    return lista;
  }

  return {
    /** Login ligado? (precisa de config/local.json com pelo menos um código de verdade) */
    get ativo() { return ativo; },

    /**
     * @returns {{ok: true, papel: string, token: string} | {ok: false, status: number, erro: string}}
     */
    entrar(codigo, ip) {
      if (!ativo) return { ok: false, status: 503, erro: 'Login desligado: falta config/local.json com os códigos.' };
      if (errosRecentes(ip).length >= maxTentativas) {
        return { ok: false, status: 429, erro: 'Muitas tentativas erradas. Espere 5 minutos.' };
      }
      // Administração primeiro: se os dois códigos forem iguais, vale o papel maior.
      const papel = ['administracao', 'controle'].find((p) => validos[p] && typeof codigo === 'string' && iguais(codigo, validos[p]));
      if (!papel) {
        erros.set(ip, [...errosRecentes(ip), agora()]);
        return { ok: false, status: 401, erro: 'Código errado.' };
      }
      const corpo = Buffer.from(JSON.stringify({ p: papel, id: randomBytes(12).toString('base64url'), exp: agora() + validadeMs })).toString('base64url');
      return { ok: true, papel, token: `${corpo}.${assinar(corpo)}` };
    },

    /** @returns {{papel: string, id: string, exp: number} | null} */
    validar(token) {
      if (typeof token !== 'string') return null;
      const [corpo, assinatura] = token.split('.');
      if (!corpo || !assinatura) return null;
      const esperado = Buffer.from(assinar(corpo));
      const recebido = Buffer.from(assinatura);
      if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
      let dados;
      try { dados = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')); } catch { return null; }
      if (!dados || typeof dados.exp !== 'number' || dados.exp <= agora() || revogados.has(dados.id)) return null;
      return { papel: dados.p, id: dados.id, exp: dados.exp };
    },

    sair(token) {
      const s = this.validar(token);
      if (!s) return false;
      revogados.set(s.id, s.exp);
      for (const [id, exp] of revogados) if (exp <= agora()) revogados.delete(id);
      return true;
    },

    /** Papel de quem fez o pedido (Authorization: Bearer <token>). Sem token: visualização. */
    papelDo(req) {
      const cab = req.headers.authorization ?? '';
      const token = cab.startsWith('Bearer ') ? cab.slice(7).trim() : null;
      return this.validar(token)?.papel ?? 'visualizacao';
    },
  };
}
