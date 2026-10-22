// Pílulas de modo e de conexão, no topo de todas as telas.
// O modo do servidor fica SEMPRE visível, discreto: "Demonstração" ou "Teste" (âmbar), "Ao vivo" (verde sálvia) ou "Sem leituras" (cinza).
// Assim ninguém confunde valor simulado com valor real. Substitui a faixa larga da F2.
import { h, icone } from './dom.js';
import { ITEM, ESTADO } from './icones.js';
import { modoMostrado } from './modo.js';

export function criarPilulaModo() {
  const el = h('span', { class: 'pilula pilula-modo', role: 'status' });
  return {
    el,
    atualizar(estado) {
      const m = modoMostrado(estado);
      el.dataset.modo = m === 'demo' ? 'demo' : m === 'ao_vivo' ? 'real' : m === 'teste' ? 'teste' : 'vazio';
      el.title = m === 'demo' ? 'Os valores desta tela são simulados'
        : m === 'ao_vivo' ? 'Dados vindos da maquete'
          : m === 'teste' ? 'Os ESP32 estão mandando valores de teste, não de sensores ligados'
            : 'Nenhum módulo da maquete mandou leitura ainda';
      el.replaceChildren(
        m === 'demo' || m === 'teste' ? icone(ITEM.apresentacao) : m === 'ao_vivo' ? h('span', { class: 'ponto-vivo', 'aria-hidden': 'true' }) : icone(ESTADO.semSinal),
        m === 'demo' ? 'Demonstração' : m === 'ao_vivo' ? 'Ao vivo' : m === 'teste' ? 'Teste' : 'Sem leituras',
      );
    },
  };
}

/** Aparece só quando o painel perde a conexão com o servidor. */
export function criarPilulaConexao(fonte) {
  const el = h('span', { class: 'pilula pilula-conexao', role: 'alert', hidden: true }, icone(ESTADO.conexao), 'Sem conexão');
  fonte.aoMudarConexao((ok) => { el.hidden = ok || !fonte.ultimo; });
  return el;
}
