// Texturas geradas no código (nada vem de arquivo ou da internet).
import * as THREE from 'three';

function tela(w, h, desenhar) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Listras diagonais vermelhas e brancas dos postes: vira uma espiral quando enrolada no cilindro. */
export function texturaPoste() {
  const t = tela(64, 64, (g, w, h) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#D9534B';
    for (let i = -2; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0);
      g.lineTo(i * 32 + 16 + 64, 64); g.lineTo(i * 32 + 64, 64);
      g.closePath(); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Veios de madeira do palete (listras finas ao longo do comprimento). */
export function texturaMadeira(corBase) {
  const t = tela(512, 128, (g, w, h) => {
    g.fillStyle = corBase;
    g.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 46; i++) {
      const y = rnd() * h;
      g.strokeStyle = `rgba(120, 80, 40, ${0.05 + rnd() * 0.08})`;
      g.lineWidth = 0.6 + rnd() * 1.6;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + (rnd() - 0.5) * 3);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Células do painel solar: grade fina e um brilho diagonal suave. */
export function texturaPainel(base, linha) {
  return tela(128, 192, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = linha;
    g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const brilho = g.createLinearGradient(0, 0, w, h);
    brilho.addColorStop(0, 'rgba(255,255,255,0.28)');
    brilho.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.fillStyle = brilho;
    g.fillRect(0, 0, w, h);
  });
}

/** Painel de partidas do terminal (P2): devolve a textura e uma função que escreve o texto do próximo veículo. */
export function painelPartidas() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  function escrever(texto) {
    g.fillStyle = '#26323D';
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#9FB0C2';
    g.font = '600 20px "DM Sans", "Segoe UI", sans-serif';
    g.fillText('PARTIDAS', 14, 28);
    g.fillStyle = '#F6D58A';
    g.font = '700 34px "DM Sans", "Segoe UI", sans-serif';
    // Quebra em até 3 linhas de uns 14 caracteres.
    const palavras = String(texto ?? '--').split(' ');
    const linhas = [];
    let atual = '';
    for (const p of palavras) {
      if ((atual + ' ' + p).trim().length > 13 && atual) { linhas.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
    }
    if (atual) linhas.push(atual);
    linhas.slice(0, 3).forEach((l, i) => g.fillText(l, 14, 72 + i * 38));
    textura.needsUpdate = true;
  }
  escrever('--');
  return { textura, escrever };
}

/** Listras diagonais claras: o bloco de uma área desativada pela administração. */
export function texturaListras() {
  const t = tela(64, 64, (g, w, h) => {
    g.fillStyle = '#F2F4F7';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#C5CCD6';
    for (let i = -2; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0); g.lineTo(i * 32 + 14, 0);
      g.lineTo(i * 32 + 14 + 64, 64); g.lineTo(i * 32 + 64, 64);
      g.closePath(); g.fill();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tiras horizontais da persiana. */
export function texturaPersiana(cor) {
  const t = tela(32, 64, (g, w, h) => {
    g.fillStyle = cor;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90, 80, 60, 0.28)';
    for (let y = 0; y < h; y += 8) g.fillRect(0, y + 6, w, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------
// fotos 22/10: texturas pequenas (64 px) das casas, das lojas e dos letreiros
// ---------------------------------------------------------------------------

/** Telhado de escamas de papelão: fileiras de arcos. */
export function texturaEscamas(base, linha) {
  const t = tela(64, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = linha;
    g.lineWidth = 2;
    for (let fila = 0; fila < 4; fila++) {
      const y = fila * 16 + 16;
      for (let x = (fila % 2) * 8 - 8; x < w + 16; x += 16) {
        g.beginPath();
        g.arc(x + 8, y - 16, 8, 0, Math.PI);
        g.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Telhado de zinco ondulado: listras que correm da cumeeira ao beiral. */
export function texturaZinco(base, sombra) {
  const t = tela(32, 32, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = sombra;
    for (let x = 0; x < w; x += 8) g.fillRect(x + 5, 0, 3, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Porta de madeira com grade. */
export function texturaGrade(fundo, linha) {
  return tela(48, 80, (g, w, h) => {
    g.fillStyle = fundo;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = linha;
    g.lineWidth = 2;
    for (let x = 6; x < w; x += 10) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.stroke(); }
    for (let y = 8; y < h; y += 14) { g.beginPath(); g.moveTo(4, y); g.lineTo(w - 4, y); g.stroke(); }
  });
}

/** Letreiro: texto escuro sobre fundo claro, com borda. */
export function texturaLetreiro(texto, fundo = '#F8F5EE', cor = '#233A63', borda = '#8A93A0') {
  return tela(256, 64, (g, w, h) => {
    g.fillStyle = borda;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fundo;
    g.fillRect(5, 5, w - 10, h - 10);
    g.fillStyle = cor;
    g.font = 'italic 700 34px "DM Sans", "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texto, w / 2, h / 2 + 2);
  });
}

/** Toldo listrado (listras verticais de duas cores). */
export function texturaToldo(c1, c2) {
  const t = tela(64, 16, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = (x / 16) % 2 === 0 ? c1 : c2;
      g.fillRect(x, 0, 16, h);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
