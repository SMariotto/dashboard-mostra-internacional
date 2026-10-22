// Tela "Acesso pelo celular": QR da Wi-Fi e QR do painel (gerados aqui, sem internet).
import QRCode from 'qrcode';
import { h, icone, trocar, guardar } from './dom.js';
import { ITEM, ESTADO } from './icones.js';
import { abrirDialogo } from './dialogo.js';

const CHAVE_IP = 'smartcanada.ip';

/** Caracteres especiais do formato WIFI: precisam de barra invertida. */
const escaparWifi = (s) => s.replace(/([\\;,:"])/g, '\\$1');

async function qrSvg(texto) {
  return QRCode.toString(texto, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0F1B2DFF', light: '#FFFFFFFF' } });
}

export function abrirQr() {
  const corpo = h('div', { class: 'qr-tela' }, h('p', {}, 'Carregando...'));
  abrirDialogo({ titulo: 'Acesso pelo celular', conteudo: corpo, tipo: 'cheia' });
  desenhar(corpo);
}

async function desenhar(corpo) {
  let rede;
  try {
    rede = await (await fetch('/api/rede', { cache: 'no-store' })).json();
  } catch {
    trocar(corpo, h('p', { class: 'aviso' }, icone(ESTADO.conexao), 'Sem conexão com o servidor.'));
    return;
  }
  const ips = rede.ips ?? [];
  let ip = guardar.ler(CHAVE_IP, 'local');
  if (!ips.includes(ip)) ip = ips[0] ?? null;
  const url = ip ? `http://${ip}:${rede.porta}/?modo=celular` : `http://localhost:${rede.porta}/?modo=celular`;

  const cartoes = [];
  if (rede.rede?.configurada) {
    const textoWifi = `WIFI:T:WPA;S:${escaparWifi(rede.rede.nome)};P:${escaparWifi(rede.rede.senha)};;`;
    cartoes.push(h('figure', { class: 'qr-cartao' },
      h('figcaption', {}, h('span', { class: 'qr-passo' }, '1'), 'Entre na rede'),
      h('div', { class: 'qr-imagem', html: await qrSvg(textoWifi), role: 'img', 'aria-label': `QR da rede Wi-Fi ${rede.rede.nome}` }),
      h('p', { class: 'qr-legenda' }, icone(ITEM.rede), rede.rede.nome)));
  }
  cartoes.push(h('figure', { class: 'qr-cartao' },
    h('figcaption', {}, h('span', { class: 'qr-passo' }, rede.rede?.configurada ? '2' : '1'), 'Abra o painel'),
    h('div', { class: 'qr-imagem', html: await qrSvg(url), role: 'img', 'aria-label': `QR do endereço ${url}` }),
    h('p', { class: 'qr-legenda num' }, icone(ITEM.celular), url.replace('http://', ''))));

  const avisos = [];
  if (!rede.rede?.configurada) {
    avisos.push(h('p', { class: 'aviso' }, icone(ESTADO.alerta), 'A rede do QR ainda não foi configurada. A administração configura em Administração, Rede do QR.'));
  }
  if (!ip) avisos.push(h('p', { class: 'aviso' }, icone(ESTADO.alerta), 'Este computador não está em nenhuma rede: o celular não vai conseguir abrir o painel.'));

  const escolha = ips.length > 1
    ? h('div', { class: 'qr-ips' }, h('span', {}, 'Endereço do computador:'),
      ips.map((x) => h('button', {
        type: 'button', class: 'botao botao-opcao', 'aria-pressed': String(x === ip),
        onclick: () => { guardar.gravar(CHAVE_IP, x, 'local'); desenhar(corpo); },
      }, x)))
    : null;

  trocar(corpo,
    h('p', { class: 'qr-instrucao' }, rede.rede?.configurada ? '1. Entre na rede. 2. Abra o painel.' : 'Aponte a câmera do celular para o QR.'),
    h('div', { class: 'qr-cartoes' }, cartoes),
    avisos,
    escolha);
}
