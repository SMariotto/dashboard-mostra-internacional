// Tela de administração: endereço do servidor, modo de dados, modo apresentação, módulos,
// ESP32 vistos, "Testar comandos" (ping), rede do QR e exportação do histórico em CSV.
// Tudo que muda algo é conferido no servidor (token de administração).
import { MODULOS, buscarModulo } from '../../compartilhado/contrato.js';
import { h, icone, trocar } from './dom.js';
import { AREA, ITEM, ESTADO } from './icones.js';
import { abrirDialogo } from './dialogo.js';
import { horaSeg, haQuanto } from './formatar.js';
import { estadoDaArea } from './areas.js';

/**
 * Monta o conteúdo da administração. Serve tanto para a janela (modo cartões) quanto para a aba do painel (3D).
 * @param {{sessao: object, fonte: object}} op
 * @returns {{el: HTMLElement, atualizar: (estado: object) => void, parar: () => void}}
 */
export function criarAdmin({ sessao, fonte }) {
  let rede = null;
  let teste = null; // {ids: {modulo: id}, inicio}

  const secao = (titulo, iconSvg, ...filhos) => h('section', { class: 'admin-secao' }, h('h3', {}, icone(iconSvg), titulo), ...filhos);
  const msg = () => h('p', { class: 'admin-msg', role: 'status', 'aria-live': 'polite' });

  // Endereço grande
  const enderecos = h('div', { class: 'admin-enderecos' }, 'Carregando...');

  // Sugestão de ligar o demo
  const sugestao = h('div', { class: 'admin-sugestao', hidden: true },
    icone(ESTADO.alerta),
    h('span', {}, 'Nenhum ESP32 mandou dados nos últimos 30 segundos.'),
    h('button', { type: 'button', class: 'botao botao-principal', onclick: () => mudarModo('demo') }, 'Ligar demonstração'));

  // Modo de dados
  const botoesModo = {
    demo: h('button', { type: 'button', class: 'botao botao-opcao', onclick: () => mudarModo('demo') }, 'Demonstração (simulador)'),
    real: h('button', { type: 'button', class: 'botao botao-opcao', onclick: () => mudarModo('real') }, 'Real (ESP32)'),
  };
  const msgModo = msg();
  async function mudarModo(modo) {
    const r = await sessao.pedir('POST', '/api/admin/modo', { modo });
    msgModo.textContent = r.status === 200 ? '' : (r.json?.erro ?? 'Não foi possível trocar.');
  }

  // Modo apresentação
  const botoesApres = {
    true: h('button', { type: 'button', class: 'botao botao-opcao', onclick: () => apresentacao(true) }, 'Ligado'),
    false: h('button', { type: 'button', class: 'botao botao-opcao', onclick: () => apresentacao(false) }, 'Desligado'),
  };
  async function apresentacao(ligado) { await sessao.pedir('POST', '/api/admin/apresentacao', { ligado }); }

  // Módulos
  const linhasModulos = MODULOS.map((m) => {
    const chip = h('span', { class: 'chip-estado' });
    const botao = h('button', { type: 'button', class: 'botao' });
    botao.addEventListener('click', async () => {
      const ativo = botao.dataset.acao === 'ativar';
      botao.disabled = true;
      await sessao.pedir('POST', '/api/admin/modulo', { modulo: m.id, ativo });
      botao.disabled = false;
    });
    const el = h('div', { class: 'admin-linha', style: { '--cor-area': m.cor } },
      h('span', { class: 'admin-area' }, icone(AREA[m.id], 'icone-area'), m.nome), chip, botao);
    return { m, chip, botao, el };
  });

  // ESP32 vistos
  const tabelaEsp = h('div', { class: 'admin-esp' });

  // Testar comandos
  const resultadoTeste = h('ul', { class: 'admin-teste' });
  const botaoTeste = h('button', { type: 'button', class: 'botao botao-principal', onclick: testar }, icone(ITEM.enviar), 'Testar comandos');
  async function testar() {
    botaoTeste.disabled = true;
    teste = { ids: {}, erros: {} };
    const estado = fonte.ultimo;
    for (const m of MODULOS) {
      if (estado?.modulos[m.id]?.sinal === 'desativado') { teste.erros[m.id] = 'desativado'; continue; }
      const r = await sessao.pedir('POST', '/api/comando', { modulo: m.id, comando: 'ping', valor: 'teste' });
      if (r.status === 200) teste.ids[m.id] = r.json.id; else teste.erros[m.id] = r.json?.erro ?? 'não enviado';
    }
    botaoTeste.disabled = false;
    if (fonte.ultimo) atualizar(fonte.ultimo);
  }

  // Rede do QR
  const campoNome = h('input', { id: 'rede-nome', type: 'text', maxlength: '32', autocomplete: 'off', placeholder: 'ex.: SMART-CANADA-2050' });
  const campoSenha = h('input', { id: 'rede-senha', type: 'text', maxlength: '63', autocomplete: 'off' });
  const msgRede = msg();
  let redePreenchida = false;
  const formRede = h('form', {
    class: 'admin-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const r = await sessao.pedir('POST', '/api/admin/rede', { nome: campoNome.value, senha: campoSenha.value });
      msgRede.textContent = r.status === 200 ? 'Rede do QR guardada.' : (r.json?.erro ?? 'Não foi possível guardar.');
      buscarRede();
    },
  },
  h('label', { for: 'rede-nome' }, 'Nome da rede (Wi-Fi 2,4 GHz)'), campoNome,
  h('label', { for: 'rede-senha' }, 'Senha'), campoSenha,
  h('button', { type: 'submit', class: 'botao botao-principal' }, 'Guardar'),
  msgRede);

  // Exportar CSV
  const escolhaCsv = h('select', { id: 'csv-modulo' },
    h('option', { value: '' }, 'Todas as áreas'),
    MODULOS.map((m) => h('option', { value: m.id }, m.nome)));
  const msgCsv = msg();
  const botaoCsv = h('button', { type: 'button', class: 'botao botao-principal', onclick: exportar }, icone(ITEM.baixar), 'Exportar histórico (CSV)');
  async function exportar() {
    botaoCsv.disabled = true;
    msgCsv.textContent = 'Preparando...';
    const r = await sessao.pedir('GET', `/api/historico.csv${escolhaCsv.value ? `?modulo=${escolhaCsv.value}` : ''}`);
    botaoCsv.disabled = false;
    if (r.status !== 200 || !r.resposta) { msgCsv.textContent = r.json?.erro ?? 'Não foi possível exportar.'; return; }
    const blob = await r.resposta.blob();
    const nome = /filename="([^"]+)"/.exec(r.resposta.headers.get('Content-Disposition') ?? '')?.[1] ?? 'historico.csv';
    const link = h('a', { href: URL.createObjectURL(blob), download: nome });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    msgCsv.textContent = `Arquivo ${nome} baixado.`;
  }

  const el = h('div', { class: 'admin' },
    secao('Endereço do painel', ITEM.rede, enderecos),
    sugestao,
    secao('Modo de dados', ITEM.chip, h('div', { class: 'admin-opcoes' }, Object.values(botoesModo)), msgModo),
    secao('Modo apresentação', ITEM.apresentacao, h('p', { class: 'nota' }, 'Depois de 60 s parado, o mapa passeia sozinho pelas áreas.'), h('div', { class: 'admin-opcoes' }, Object.values(botoesApres))),
    secao('Módulos', ITEM.engrenagem, h('div', { class: 'admin-modulos' }, linhasModulos.map((l) => l.el))),
    secao('ESP32 vistos', ITEM.chip, tabelaEsp),
    secao('Teste dos módulos', ITEM.enviar, h('p', { class: 'nota' }, 'Manda um teste inofensivo para cada área e mostra quem respondeu.'), botaoTeste, resultadoTeste),
    secao('Rede do QR', ITEM.qr, formRede),
    secao('Histórico', ITEM.baixar, h('label', { for: 'csv-modulo' }, 'Área'), escolhaCsv, botaoCsv, msgCsv));

  async function buscarRede() {
    const r = await sessao.pedir('GET', '/api/rede');
    if (r.status !== 200) return;
    rede = r.json;
    desenharRede();
  }

  function desenharRede() {
    if (!rede) return;
    trocar(enderecos, rede.ips.length
      ? rede.ips.map((ip) => h('div', { class: 'admin-ip num' }, `${ip}:${rede.porta}`))
      : h('div', { class: 'admin-ip num' }, `localhost:${rede.porta}`), h('p', { class: 'nota' }, rede.ips.length ? 'Os ESP32 e os celulares usam este endereço.' : 'Este computador não está em nenhuma rede.'));
    if (!redePreenchida && rede.rede) {
      campoNome.value = rede.rede.nome ?? '';
      campoSenha.value = rede.rede.senha ?? '';
      redePreenchida = true;
    }
    const agora = Date.now();
    trocar(tabelaEsp, rede.esp.length
      ? h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Área'), h('th', {}, 'IP'), h('th', {}, 'Última mensagem'), h('th', {}, 'Por minuto'))),
        h('tbody', {}, rede.esp.map((e) => h('tr', {},
          h('td', {}, buscarModulo(e.modulo)?.nome ?? e.modulo),
          h('td', { class: 'num' }, e.ip),
          h('td', { class: 'num' }, `${horaSeg(e.ultima)} (${haQuanto(e.ultima, agora)})`),
          h('td', { class: 'num' }, String(e.porMinuto))))))
      : h('p', { class: 'nota' }, 'Nenhum ESP32 mandou dados ainda.'));
  }

  function atualizar(estado) {
    botoesModo.demo.setAttribute('aria-pressed', String(estado.modo === 'demo'));
    botoesModo.real.setAttribute('aria-pressed', String(estado.modo === 'real'));
    botoesApres.true.setAttribute('aria-pressed', String(estado.apresentacao === true));
    botoesApres.false.setAttribute('aria-pressed', String(estado.apresentacao === false));
    sugestao.hidden = !estado.sugerirDemo;
    for (const l of linhasModulos) {
      const e = estadoDaArea(l.m.id, estado);
      l.chip.dataset.estado = e.chave;
      trocar(l.chip, icone(e.icone), e.texto);
      const ativo = estado.modulos[l.m.id].ativo;
      l.botao.dataset.acao = ativo ? 'desativar' : 'ativar';
      l.botao.textContent = ativo ? 'Desativar' : 'Ativar';
    }
    if (teste) {
      trocar(resultadoTeste, MODULOS.map((m) => {
        let texto = 'aguardando...';
        let tom = 'espera';
        if (teste.erros[m.id]) { texto = teste.erros[m.id]; tom = 'alerta'; }
        else {
          const c = estado.comandos?.find((x) => x.id === teste.ids[m.id]);
          if (c?.situacao === 'executado') { texto = `respondeu em ${c.ms} ms`; tom = 'ok'; }
          else if (c?.situacao === 'sem_resposta') { texto = 'sem resposta'; tom = 'alerta'; }
        }
        return h('li', { 'data-tom': tom }, icone(tom === 'ok' ? ESTADO.ok : tom === 'alerta' ? ESTADO.alerta : ITEM.espera), h('span', {}, h('b', {}, m.nome), `: ${texto}`));
      }));
    }
  }

  buscarRede();
  const vigia = setInterval(buscarRede, 2000);
  const cancelar = fonte.assinar(atualizar);
  return { el, atualizar, parar() { clearInterval(vigia); cancelar(); } };
}

/** Abre a administração numa janela lateral. */
export function abrirAdmin({ sessao, fonte }) {
  const admin = criarAdmin({ sessao, fonte });
  const dlg = abrirDialogo({ titulo: 'Administração', conteudo: admin.el, tipo: 'gaveta', aoFechar: () => admin.parar() });
  // Saiu do papel de administração: fecha.
  const cancelar = sessao.aoMudar((papel) => { if (papel !== 'administracao') { cancelar(); dlg.fechar(); } });
  return dlg;
}
