// Página de teste da cena (?modo=cena): só o mapa 3D ocupando a janela, sem painel nem menu.
// Serve às conferências (captura de cima, quadros por segundo) e fica como ferramenta de depuração.
// O layout de verdade (mapa e painel) é o de web/ui/layout3d.js.
import { criarCena } from './index.js';

export function montarCenaSolta(raiz) {
  const params = new URLSearchParams(location.search);
  raiz.replaceChildren();
  raiz.className = 'cena-solta';
  raiz.style.cssText = 'position:fixed;inset:0;';
  const cena = criarCena(raiz, {
    qualidade: params.get('qualidade') ?? 'alta',
    preservarQuadro: params.get('debug') === '1',
  });
  if (params.get('vista') === 'cima') cena.vistaDeCima(true);
  if (params.get('debug') === '1') {
    window.__cena = cena;
    // A conferência com a planta só é baixada no modo de depuração.
    import('./conferencia.js').then((m) => { window.__conferirPlanta = () => m.conferirPlanta(cena); });
  }
  return cena;
}
