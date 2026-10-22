// Escolhe o layout e liga tudo.
//   ?modo=celular (ou tela com menos de 768 px): celular, só visualização, sem 3D.
//   ?modo=cartoes: cartões em tela grande (plano B do 3D).
//   ?modo=cena: só o mapa 3D, para conferências (sem painel).
//   ?modo=3d: força o mapa 3D (vale mais que a memória da sessão e que a largura da tela).
//   Tela grande sem ?modo: mapa 3D com o painel à direita (importação dinâmica, para o celular e os
//   cartões nunca baixarem o Three.js). Se o WebGL não abrir, entra o modo cartões com um aviso.
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './estilo/tokens.css';
import './estilo/base.css';
import './estilo/componentes.css';
import './estilo/cartoes.css';
import './estilo/mapa3d.css';
import './estilo/celular.css';
import { FonteServidor } from './dados/FonteServidor.js';
import { criarSessao } from './dados/sessao.js';
import { montarCartoes } from './ui/layoutCartoes.js';
import { montarCelular } from './ui/layoutCelular.js';
import { mostrarAviso } from './ui/aviso.js';
import { guardar } from './ui/dom.js';
import { webglDisponivel } from './cena/qualidade.js';

const pedido = new URLSearchParams(location.search).get('modo');
const ehCena = pedido === 'cena'; // página de teste do mapa 3D (sem painel)
const ehCelular = pedido === 'celular' || (!pedido && window.innerWidth < 768);
const raiz = document.getElementById('app');
const fonte = new FonteServidor();

if (ehCena) {
  const { montarCenaSolta } = await import('./cena/paginaSolta.js');
  montarCenaSolta(raiz);
} else if (ehCelular) {
  montarCelular(raiz, { fonte });
} else {
  const sessao = criarSessao();
  await sessao.iniciar();
  let layout3d = null;
  const CHAVE_LEMBRAR = 'smartcanada.cartoes'; // a sessão lembra que o 3D foi lento demais
  const abrirCartoes = (aviso, op) => {
    layout3d?.destruir();
    layout3d = null;
    montarCartoes(raiz, { fonte, sessao });
    if (aviso) mostrarAviso(aviso, op);
  };
  const tentarDeNovo = () => {
    guardar.gravar(CHAVE_LEMBRAR, null);
    const u = new URL(location.href);
    u.searchParams.set('modo', '3d');
    u.hash = '';
    location.href = u.toString();
  };
  const avisoLento = () => abrirCartoes('O mapa 3D estava lento demais neste computador, então entraram os cartões.', { tempo: 0, acao: { rotulo: 'Tentar o 3D de novo', aoClicar: tentarDeNovo } });
  const forcar3d = pedido === '3d'; // ?modo=3d vale mais que a memória da sessão e que a largura da tela
  if (forcar3d) guardar.gravar(CHAVE_LEMBRAR, null);

  if (pedido === 'cartoes') abrirCartoes();
  else if (!forcar3d && window.innerWidth < 1280) abrirCartoes(); // o mapa 3D precisa de pelo menos 1280 px de largura (tablet: F5)
  else if (!forcar3d && guardar.ler(CHAVE_LEMBRAR) === '1') avisoLento();
  else if (!webglDisponivel()) abrirCartoes('Modo cartões: o 3D não abriu neste computador');
  else {
    try {
      const { montarLayout3d } = await import('./ui/layout3d.js');
      layout3d = await montarLayout3d(raiz, {
        fonte, sessao,
        aoFalhar: (motivo, op) => {
          if (op?.lento) { guardar.gravar(CHAVE_LEMBRAR, '1'); avisoLento(); } else abrirCartoes(`Modo cartões: ${motivo}`);
        },
      });
    } catch (e) {
      console.error('O mapa 3D não abriu:', e);
      abrirCartoes('Modo cartões: o 3D não abriu neste computador');
    }
  }
}
if (!ehCena) fonte.iniciar();
