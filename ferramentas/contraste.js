// Calcula a razão de contraste WCAG 2.x de cada par de cores dos tokens (web/estilo/tokens.css)
// e confere o mínimo de cada uso. Sai com código 1 se algum par ficar abaixo.
//
//   npm run contraste
//
// Mínimos usados:
//   7:1   números grandes (e tudo que for texto principal)
//   4,5:1 texto pequeno
//   3:1   elementos gráficos (bolinha, barra, traço de ícone, anel de foco)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(RAIZ, 'web', 'estilo', 'tokens.css'), 'utf8');

/** Lê "--nome: #HEX" e resolve "var(--outro)". */
const tokens = {};
for (const [, nome, valor] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[nome] = valor.trim();
function cor(nome) {
  let v = tokens[nome];
  while (v && v.startsWith('var(')) v = tokens[v.slice(6, -1)];
  if (!/^#[0-9a-f]{6}$/i.test(v ?? '')) throw new Error(`token --${nome} não é uma cor hexadecimal (${v})`);
  return v.toUpperCase();
}

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function razao(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const PASTEIS = ['vermelho', 'salvia', 'gelo', 'ambar', 'ardosia'];
const pares = [];
const par = (uso, primeiro, fundo, minimo) => pares.push({ uso, primeiro, fundo, minimo });

// Texto principal (números grandes e texto) sobre todos os fundos
for (const f of ['fundo', 'cartao', ...PASTEIS.map((p) => `${p}-pastel`)]) par(`texto sobre ${f}`, 'texto', f, 7);
// Texto secundário sobre todos os fundos
for (const f of ['fundo', 'cartao', ...PASTEIS.map((p) => `${p}-pastel`)]) par(`texto-2 sobre ${f}`, 'texto-2', f, 4.5);
// Elementos gráficos fortes sobre o cartão branco e sobre o próprio pastel
for (const p of PASTEIS) {
  par(`${p}-forte sobre cartao (bolinha, barra)`, `${p}-forte`, 'cartao', 3);
  par(`${p}-forte sobre ${p}-pastel (barra, ícone)`, `${p}-forte`, `${p}-pastel`, 3);
}
par('vermelho-forte sobre fundo (anel de foco)', 'vermelho-forte', 'fundo', 3);
par('vermelho-forte sobre cartao (anel de foco)', 'vermelho-forte', 'cartao', 3);
par('letra clara (cartao) sobre botão de opção ativo (texto)', 'cartao', 'texto', 7);
par('bolinha da opção ativa (salvia-pastel) sobre botão ativo', 'salvia-pastel', 'texto', 3);
par('linha sobre cartao (separador, não é texto: só informativo)', 'linha', 'cartao', 1);

let falhas = 0;
console.log('razão  mínimo  uso');
for (const p of pares) {
  const r = razao(cor(p.primeiro), cor(p.fundo));
  const ok = r >= p.minimo;
  if (!ok) falhas += 1;
  console.log(`${r.toFixed(2).padStart(5)}  ${String(p.minimo).padStart(5)}   ${ok ? 'ok    ' : 'FALHOU'} ${p.uso}  (${cor(p.primeiro)} sobre ${cor(p.fundo)})`);
}
console.log(`\n${pares.length} pares, ${falhas} abaixo do mínimo.`);
process.exit(falhas ? 1 : 0);
