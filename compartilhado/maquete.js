// Geometria da maquete Smart Canada 2050, em centímetros.
// Fonte: "Planta baixa escolar técnica.zip" (camadas 1 e 2, script do .dc.html) e o
// prompt da camada 3 (sensores e ESP32). Conferido contra a planta em 20/10/2026.
//
// Origem no canto superior esquerdo do palete na planta. x cresce para a direita (0 a 120),
// y cresce para baixo (0 a 100). O visitante fica do lado de baixo (y = 100).
// Na cena 3D: X = x, Z = y, Y para cima, 1 unidade = 1 cm.
//
// Convenção: retângulos usam {x, y, w, h} com (x, y) no canto superior esquerdo.
// Círculos e pontos usam {cx, cy}. Marcadores de sensor usam o CENTRO (cx, cy).

export const PALETE = {
  largura: 120,
  profundidade: 100,
  borda: 4,
  corBorda: '#C8A070',
  util: { x: 4, y: 4, w: 112, h: 92 },
};

/** Alturas sugeridas (cm). */
export const ALTURAS = {
  base: 2, // espessura do palete
  asfalto: 0.2, // asfalto acima da base
  bloco: 0.6, // blocos de papelão acima do asfalto
};

export const CORES = {
  bloco: '#F4F3F1',
  contornoBloco: '#8F8F8B',
  asfalto: '#3A3A3A',
  faixaCentral: '#F2C230', // a planta diz branca; a maquete real é amarela
  faixaPedestre: '#FFFFFF',
  copa: '#7CAD6E',
  contornoCopa: '#4F7D4A',
  tronco: '#7A5A3A',
};

/** As 5 áreas clicáveis. `id` é o mesmo de compartilhado/contrato.js. */
export const BLOCOS = [
  { id: 'energia', num: 1, nome: 'Energia Renovável', x: 4, y: 4, w: 28, h: 30 },
  { id: 'centro', num: 3, nome: 'Centro Urbano', x: 42, y: 4, w: 30, h: 30 },
  { id: 'economia', num: 5, nome: 'Economia Circular', x: 80, y: 4, w: 36, h: 30 },
  { id: 'residencial', num: 2, nome: 'Área Residencial', x: 4, y: 46, w: 46, h: 50 },
  { id: 'mobilidade', num: 4, nome: 'Mobilidade', x: 58, y: 46, w: 58, h: 50 },
];

/**
 * Vias (não clicáveis). `faixa`: linha central tracejada.
 * Tracejado da planta: avenida 3 cm de traço e 2 de espaço; ruas 2 e 1,5.
 */
export const VIAS = [
  {
    id: 'rua-separacao', nome: 'Rua Separação Técnica', x: 32, y: 4, w: 10, h: 30,
    faixa: { x1: 37, y1: 4, x2: 37, y2: 34, largura: 0.42, traco: 2, espaco: 1.5 },
  },
  {
    id: 'rua-interna', nome: 'Rua Interna', x: 72, y: 4, w: 8, h: 30,
    faixa: { x1: 76, y1: 4, x2: 76, y2: 34, largura: 0.42, traco: 2, espaco: 1.5 },
  },
  {
    id: 'avenida', nome: 'Avenida Principal', x: 4, y: 34, w: 112, h: 12,
    faixa: { x1: 10.67, y1: 40, x2: 109.33, y2: 40, largura: 0.5, traco: 3, espaco: 2 },
  },
  {
    id: 'rua-local', nome: 'Rua Local', x: 50, y: 46, w: 8, h: 50,
    faixa: { x1: 54, y1: 46, x2: 54, y2: 96, largura: 0.42, traco: 2, espaco: 1.5 },
  },
];

/** Faixas de pedestre nas duas pontas da avenida (4 listras em cada). */
export const FAIXAS_PEDESTRE = [5, 6.33, 7.67, 9, 110.33, 111.67, 113, 114.33].map((x) => ({
  x, y: 35.33, w: 0.67, h: 9.33,
}));

// ---------------------------------------------------------------------------
// Objetos da camada 2 (forma low-poly cartoon na cena 3D)
// ---------------------------------------------------------------------------

export const ENERGIA = {
  // Inclinados uns 25 graus para "o sol".
  paineisSolares: [
    { x: 7, y: 13, w: 10, h: 6 },
    { x: 7, y: 21, w: 10, h: 6 },
  ],
  corPainel: '#3B5B7A',
  corMoldura: '#1F2F3F',
  corGradePainel: '#9FC1DA',
  inclinacaoPainelGraus: 25,
  baterias: { x: 7, y: 29, w: 6, h: 4, altura: 3, cor: '#2E2E2E' },
  // Gira com velocidade proporcional a eolica_w. Pás a -90, 30 e 150 graus na planta.
  turbina: { cx: 24, cy: 20, alturaTorre: 14, raioCubo: 1.2, comprimentoPa: 8, cor: '#555555' },
};

export const CENTRO = {
  // Janelas acendem no modo noite.
  predios: [
    { x: 44, y: 12, w: 6, h: 5, altura: 8, cor: '#D9D9D9' },
    { x: 58, y: 12, w: 6, h: 6, altura: 12, cor: '#B8B8B8' },
    { x: 65, y: 12, w: 5, h: 7, altura: 16, cor: '#8F8F8F' },
  ],
  praca: { cx: 54, cy: 15, raio: 3, raioAnel: 1.4, cor: '#AFD4E0', corContorno: '#5B8A9A' },
  // Na planta a caixa do semáforo vai de (43,6; 19,7) a (45,2; 23,3); as luzes ficam em x 43,8.
  semaforo: {
    caixa: { x: 43.6, y: 19.7, w: 1.6, h: 3.6 },
    luzes: [
      { cor: 'vermelho', hex: '#C0392B', x: 43.8, y: 20, w: 1.2, h: 1 },
      { cor: 'amarelo', hex: '#D4AC0D', x: 43.8, y: 21, w: 1.2, h: 1 },
      { cor: 'verde', hex: '#2E7D4F', x: 43.8, y: 22, w: 1.2, h: 1 },
    ],
  },
  // 4 vagas (divisões em x 58 e y 26). Carros aparecem nas vagas ocupadas (4 menos vagas_livres).
  estacionamento: {
    x: 46, y: 20, w: 24, h: 12, cor: '#FAFAF8', corLinhas: '#8A8A8A',
    vagas: [
      { cx: 52, cy: 23 },
      { cx: 64, cy: 23 },
      { cx: 52, cy: 29 },
      { cx: 64, cy: 29 },
    ],
  },
};

export const ECONOMIA = {
  chao: { cor: '#2E7D32' }, // feltro verde no bloco inteiro
  lixeiras: [
    { x: 83, y: 13, w: 1.6, h: 1.6, altura: 2, cor: '#2E7D4F' },
    { x: 85.4, y: 13, w: 1.6, h: 1.6, altura: 2, cor: '#2E6DA4' },
    { x: 87.8, y: 13, w: 1.6, h: 1.6, altura: 2, cor: '#D4AC0D' },
  ],
  // A água sobe e desce com reservatorio_pct. Abaixo de 20%, a borda pisca.
  reservatorio: { cx: 97, cy: 15, raio: 3, cor: '#AFD4E0', corContorno: '#5B8A9A' },
  canteiros: [
    { x: 83, y: 20, w: 8, h: 4 },
    { x: 93, y: 20, w: 8, h: 4 },
    { x: 103, y: 20, w: 8, h: 4 },
  ],
  corCanteiro: '#9CB071',
  corMuda: '#8FAE6B',
  mudas: [{ cx: 87, cy: 20.5 }, { cx: 97, cy: 20.5 }, { cx: 107, cy: 20.5 }],
  // Na planta a descida central vai de y 18 a 20 (a SPEC dizia até 19); vale a planta.
  irrigacao: {
    cor: '#5B8A9A',
    segmentos: [
      { x1: 97, y1: 18, x2: 97, y2: 20 },
      { x1: 87, y1: 19, x2: 107, y2: 19 },
      { x1: 87, y1: 19, x2: 87, y2: 20 },
      { x1: 107, y1: 19, x2: 107, y2: 20 },
    ],
    // Pontos onde as gotas caem quando bomba = true.
    gotejadores: [{ cx: 87, cy: 20 }, { cx: 97, cy: 20 }, { cx: 107, cy: 20 }],
  },
};

export const RESIDENCIAL = {
  // Telhado de quatro águas. Casa 1 em x 9, casa 2 em x 22, casa 3 em x 35.
  casas: [
    { id: 'casa1', x: 9, y: 56, w: 10, h: 10, alturaParede: 6 },
    { id: 'casa2', x: 22, y: 56, w: 10, h: 10, alturaParede: 6 },
    { id: 'casa3', x: 35, y: 56, w: 10, h: 10, alturaParede: 6 },
  ],
  corParede: '#E8DCC8',
  corTelhado: '#8A7A5C',
  painelTelhado: { x: 25.5, y: 58.5, w: 3, h: 2 },
  calcada: { x: 9, y: 67, w: 36, h: 2, cor: '#E3D9C6', corContorno: '#C9BC9F' },
  // Pontos escuros da planta (postes da rua residencial). Viram bases escuras; não acendem.
  pontosEscuros: [{ cx: 7, cy: 67, raio: 0.8 }, { cx: 47, cy: 67, raio: 0.8 }],
  // Persiana na parede lateral direita da casa 2 (servo S15). Abre e fecha com `persiana`.
  persiana: { casa: 'casa2', cx: 32, cy: 61, largura: 4 },
  // Bonequinho aparece quando presenca = true.
  presenca: { cx: 40, cy: 93 },
  // Brilho laranja suave quando aquecimento = true.
  aquecimento: { casa: 'casa1' },
};

export const MOBILIDADE = {
  // Trilho reto, bitola 2 (trilhos em y 58 e y 60), dormentes a cada 3 cm de x 61 a 109.
  trilho: { x1: 61, x2: 111, y: 58, bitola: 2, passoDormente: 3, cor: '#3A3A3A' },
  // Contorno SÓLIDO (a camada 3 mandou tirar o tracejado).
  plataforma: { x: 70, y: 62, w: 14, h: 6, cor: '#EDEDE9', corContorno: '#555555' },
  pontoOnibus: { x: 61, y: 72, w: 18, h: 8, cor: '#EDEDE9', corContorno: '#555555' },
  painelPartidas: { cx: 76, cy: 73, w: 3, h: 2 },
  onibus: { x: 62, y: 81, w: 12, h: 4, cor: '#4A6FA5', corContorno: '#2E4A73' },
  faixaTerminal: {
    x: 60, y: 90, w: 54, h: 4, cor: '#C0392B',
    tracejado: { x1: 61, y1: 92, x2: 113, y2: 92, cor: '#F3D9D6', traco: 1, espaco: 0.83 },
  },
  // Forma escolhida: banco de espera (ver docs/DECISOES.md).
  peca: { x: 95, y: 84, w: 6, h: 3, cor: '#A5433A', corContorno: '#6E2C26', forma: 'banco' },
  // Anda de ponta a ponta (fins de curso S17 em x 60 e S18 em x 110); para na plataforma.
  trem: { comprimento: 10, largura: 2.4, altura: 2.4, cor: '#2E6DA4', xMin: 61, xMax: 111, xPlataforma: 77, y: 59 },
};

/** Árvores (InstancedMesh). Raio da copa conforme a planta. */
export const ARVORES = [
  { bloco: 'energia', cx: 15, cy: 30, r: 1.6 },
  { bloco: 'energia', cx: 28, cy: 29, r: 1.6 },
  { bloco: 'economia', cx: 86, cy: 29, r: 1.6 },
  { bloco: 'economia', cx: 97, cy: 30, r: 1.6 },
  { bloco: 'economia', cx: 108, cy: 29, r: 1.6 },
  { bloco: 'residencial', cx: 14, cy: 80, r: 1.8 },
  { bloco: 'residencial', cx: 27, cy: 85, r: 1.8 },
  { bloco: 'residencial', cx: 40, cy: 80, r: 1.8 },
  { bloco: 'mobilidade', cx: 90, cy: 64, r: 1.8 },
  { bloco: 'mobilidade', cx: 104, cy: 70, r: 1.8 },
  { bloco: 'mobilidade', cx: 85, cy: 85, r: 1.8 },
];

// ---------------------------------------------------------------------------
// Postes de iluminação (vareta listrada em espiral vermelha e branca, LED na ponta)
// ---------------------------------------------------------------------------

/**
 * A planta não marca os postes. Lista editável.
 * AJUSTAR PARA AS POSIÇÕES REAIS DA MAQUETE.
 * 6 em cada margem da avenida, dentro do asfalto e rente à borda (y 35 e y 45),
 * entre x 20 e x 100 (longe das faixas de pedestre). 2 no meio de cada rua da fileira de cima.
 * Nenhum poste em cima de bloco (os blocos de cima vão até y 34; os de baixo começam em y 46).
 */
export const POSTE = { altura: 9, raio: 0.25, corLed: '#FFE2A8' };

export const POSTES = [
  ...[20, 36, 52, 68, 84, 100].map((cx) => ({ cx, cy: 35, via: 'avenida' })),
  ...[20, 36, 52, 68, 84, 100].map((cx) => ({ cx, cy: 45, via: 'avenida' })),
  { cx: 37, cy: 12, via: 'rua-separacao' },
  { cx: 37, cy: 26, via: 'rua-separacao' },
  { cx: 76, cy: 12, via: 'rua-interna' },
  { cx: 76, cy: 26, via: 'rua-interna' },
];

// ---------------------------------------------------------------------------
// Camada 3: sensores (S), atuadores (P) e ESP32 (E). Posição = CENTRO do marcador.
// `campos`: dados do contrato que o item alimenta.
// ---------------------------------------------------------------------------

export const SENSORES = [
  // Energia
  { id: 'E1', tipo: 'esp32', modulo: 'energia', cx: 6, cy: 6, w: 3, h: 2, descricao: 'ESP32 da Energia', campos: [] },
  { id: 'S1', tipo: 'sensor', modulo: 'energia', cx: 7, cy: 29, w: 2, h: 2, descricao: 'Sensor de tensão e corrente', campos: ['bateria_v', 'bateria_pct', 'consumo_w'] },
  { id: 'S2', tipo: 'sensor', modulo: 'energia', cx: 12, cy: 19, w: 1, h: 1, descricao: 'Sensor de luz (LDR)', campos: ['solar_w'] },
  // Centro Urbano
  { id: 'E2', tipo: 'esp32', modulo: 'centro', cx: 66, cy: 6, w: 3, h: 2, descricao: 'ESP32 do Centro Urbano', campos: [] },
  { id: 'S3', tipo: 'sensor', modulo: 'centro', cx: 46, cy: 7, w: 1, h: 1, descricao: 'Sensor de luz (LDR)', campos: ['postes'] },
  { id: 'S4', tipo: 'sensor', modulo: 'centro', cx: 52, cy: 23, w: 2, h: 2, descricao: 'Sensor da vaga 1', campos: ['vagas_livres'] },
  { id: 'S5', tipo: 'sensor', modulo: 'centro', cx: 64, cy: 23, w: 2, h: 2, descricao: 'Sensor da vaga 2', campos: ['vagas_livres'] },
  { id: 'S6', tipo: 'sensor', modulo: 'centro', cx: 52, cy: 29, w: 2, h: 2, descricao: 'Sensor da vaga 3', campos: ['vagas_livres'] },
  { id: 'S7', tipo: 'sensor', modulo: 'centro', cx: 64, cy: 29, w: 2, h: 2, descricao: 'Sensor da vaga 4', campos: ['vagas_livres'] },
  { id: 'S8', tipo: 'sensor', modulo: 'centro', cx: 40, cy: 40, w: 2, h: 2, descricao: 'Sensor de veículo na avenida', campos: ['semaforo'] },
  { id: 'S9', tipo: 'sensor', modulo: 'centro', cx: 60, cy: 40, w: 2, h: 2, descricao: 'Sensor de veículo na avenida', campos: ['semaforo'] },
  // Economia Circular
  { id: 'E3', tipo: 'esp32', modulo: 'economia', cx: 110, cy: 6, w: 3, h: 2, descricao: 'ESP32 da Economia Circular', campos: [] },
  { id: 'S10', tipo: 'sensor', modulo: 'economia', cx: 97, cy: 23, w: 1, h: 1, descricao: 'Sensor de umidade do solo', campos: ['umidade_solo_pct'] },
  { id: 'S11', tipo: 'sensor', modulo: 'economia', cx: 97, cy: 15, w: 1, h: 2, descricao: 'Sensor de nível do reservatório', campos: ['reservatorio_pct'] },
  { id: 'P1', tipo: 'atuador', modulo: 'economia', cx: 91, cy: 27, w: 2, h: 2, descricao: 'Bomba de água', campos: ['bomba', 'irrigacao'] },
  // Área Residencial
  { id: 'E4', tipo: 'esp32', modulo: 'residencial', cx: 6, cy: 49, w: 3, h: 2, descricao: 'ESP32 da Área Residencial', campos: [] },
  { id: 'S12', tipo: 'sensor', modulo: 'residencial', cx: 10, cy: 93, w: 1, h: 1, descricao: 'Sensor de luz (LDR)', campos: ['iluminacao'] },
  { id: 'S13', tipo: 'sensor', modulo: 'residencial', cx: 40, cy: 93, w: 2, h: 2, descricao: 'Sensor de presença (PIR)', campos: ['presenca'] },
  { id: 'S14', tipo: 'sensor', modulo: 'residencial', cx: 14, cy: 64, w: 2, h: 2, descricao: 'Sensor de temperatura e umidade (DHT22)', campos: ['temperatura_c', 'umidade_pct', 'aquecimento'] },
  { id: 'S15', tipo: 'atuador', modulo: 'residencial', cx: 32, cy: 61, w: 2, h: 1, descricao: 'Servo da persiana', campos: ['persiana'] },
  // Mobilidade
  { id: 'E5', tipo: 'esp32', modulo: 'mobilidade', cx: 112, cy: 50, w: 3, h: 2, descricao: 'ESP32 da Mobilidade', campos: [] },
  { id: 'S16', tipo: 'sensor', modulo: 'mobilidade', cx: 60, cy: 76, w: 1, h: 2, descricao: 'Sensor de aproximação do ônibus', campos: ['veiculo_na_plataforma', 'proximo_veiculo'] },
  { id: 'P2', tipo: 'atuador', modulo: 'mobilidade', cx: 76, cy: 73, w: 3, h: 2, descricao: 'Painel de partidas', campos: ['proximo_veiculo', 'terminal'] },
  { id: 'S17', tipo: 'sensor', modulo: 'mobilidade', cx: 60, cy: 59, w: 1, h: 2, descricao: 'Fim de curso do trem (início)', campos: ['trem'] },
  { id: 'S18', tipo: 'sensor', modulo: 'mobilidade', cx: 110, cy: 59, w: 1, h: 2, descricao: 'Fim de curso do trem (fim)', campos: ['trem'] },
];

/** @param {string} id */
export function buscarBloco(id) {
  return BLOCOS.find((b) => b.id === id) ?? null;
}

/** Ponto dentro de um retângulo {x, y, w, h} (bordas incluídas). */
export function pontoDentro(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// ---------------------------------------------------------------------------
// fotos 22/10
// Itens que a maquete física tem a mais que a planta (fotos de 22/10/2026). Nada acima mudou: posições de
// blocos, vias, sensores e ESP32 continuam as da planta. Só o desenho 3D usa esta seção (a planta oficial
// não tem estes itens). Posições razoáveis dentro do bloco certo, sem encostar nos itens da planta.
// ---------------------------------------------------------------------------
export const FOTOS_22_10 = {
  residencial: {
    // 4ª casa (branca com telhado de zinco ondulado marrom e janela azul), atrás da faixa verde-água.
    casasExtras: [{ id: 'casa4', x: 17, y: 75, w: 7.5, h: 7.5, alturaParede: 5.2 }],
    // Faixa verde-água comprida com pedrinhas brancas nas duas bordas.
    faixaVerde: { x: 9, y: 70, w: 36, h: 3, cor: '#4FBFA5' },
    // Retalhos de grama sintética entre as casas.
    retalhosGrama: [
      { x: 4.6, y: 56, w: 3.6, h: 10 },
      { x: 19.8, y: 57, w: 1.8, h: 8 },
      { x: 32.8, y: 57, w: 1.8, h: 8 },
      { x: 45.6, y: 56, w: 3.6, h: 10 },
      { x: 27, y: 75, w: 10, h: 6 },
    ],
  },
  energia: {
    // 2 painéis a mais (a foto mostra 4) e 2 turbinas a mais (a foto mostra 3; a da planta é a primeira).
    // As pás têm 8 cm: cada turbina fica a 8 cm ou mais das bordas do bloco (x 4 a 32), para o rotor não passar por cima da rua.
    paineisExtras: [{ x: 17.8, y: 12.2, w: 8.5, h: 4.5 }, { x: 17.5, y: 25.5, w: 8.5, h: 5 }],
    turbinasExtras: [{ cx: 12.5, cy: 9 }, { cx: 24, cy: 9 }],
    raioBaseTurbina: 2.5, // base redonda branca com pedrinhas
  },
  mobilidade: {
    // Trilho circular de brinquedo no lugar do trilho reto da planta (o reto não é mais desenhado).
    circulo: { cx: 74, cy: 67, raioExterno: 14, raioInterno: 11.8 }, // anel de 2,2 cm: o trem cabe nele
    base: { x: 59, y: 51, w: 30, h: 30 }, // base marrom escura debaixo do círculo
    galpao: { x: 93, y: 54, w: 13, h: 7, altura: 3.4 }, // galpão marrom de telhado baixo (provável estação)
    pedrinhas: { x: 93, y: 62.5, w: 9, h: 8 }, // retalho de pedrinhas brancas ao lado do galpão
  },
};
