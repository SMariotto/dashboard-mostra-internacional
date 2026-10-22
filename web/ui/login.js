// Entrar como Controle ou Administração com o código de acesso.
import { h, icone } from './dom.js';
import { ITEM } from './icones.js';
import { abrirDialogo } from './dialogo.js';

/**
 * @param {{sessao: object, fonte: object}} op
 */
export function abrirLogin({ sessao, fonte }) {
  if (fonte.ultimo && fonte.ultimo.loginAtivo === false) {
    abrirDialogo({
      titulo: 'Entrar',
      conteudo: h('div', { class: 'login' },
        h('p', {}, icone(ITEM.cadeado), ' O login está desligado neste computador.'),
        h('p', { class: 'nota' }, 'Falta o arquivo config\\local.json com os códigos de acesso. Sem ele, o painel funciona só para visualização.')),
    });
    return;
  }
  const campo = h('input', { id: 'codigo-acesso', type: 'password', autocomplete: 'off', required: true, maxlength: '64' });
  const erro = h('p', { class: 'login-erro', role: 'alert' });
  const botao = h('button', { type: 'submit', class: 'botao botao-principal' }, icone(ITEM.entrar), 'Entrar');
  let dlg;
  const form = h('form', {
    class: 'login',
    onsubmit: async (e) => {
      e.preventDefault();
      botao.disabled = true;
      erro.textContent = '';
      const r = await sessao.entrar(campo.value);
      botao.disabled = false;
      if (r.ok) dlg.fechar();
      else { erro.textContent = r.erro; campo.select(); }
    },
  },
  h('label', { for: 'codigo-acesso' }, 'Código de acesso'),
  campo,
  h('p', { class: 'nota' }, 'Controle usa os comandos. Administração também liga e desliga módulos.'),
  erro,
  botao);
  dlg = abrirDialogo({ titulo: 'Entrar', conteudo: form });
}
