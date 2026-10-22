// A vista atual vem do endereço da página: #cidade (ou vazio) ou #energia, #residencial...
// O menu, os cartões, o mapa 3D, o Esc e o clique no bloco só mudam o endereço; quem desenha escuta `hashchange`.
import { MODULOS } from '../../compartilhado/contrato.js';

/** @returns {string} 'cidade' ou o id de uma área */
export function vistaDoEndereco() {
  const id = location.hash.replace('#', '');
  return MODULOS.some((m) => m.id === id) ? id : 'cidade';
}

/** Esc volta para a cidade (a janela aberta, se houver, fecha primeiro e consome a tecla). */
export function voltarComEsc(vistaAtual) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && vistaAtual() !== 'cidade') location.hash = '#cidade';
  });
}
