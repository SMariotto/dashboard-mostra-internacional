// Cores da cena. A SPEC e a planta trazem cores de desenho técnico (asfalto #3A3A3A, painéis #3B5B7A...).
// A cena é clara e pastel, como a tela (V1): os mesmos matizes, só mais suaves. Os blocos usam a
// tinta pastel da própria área (vem dos tokens, ver fabrica.js). Registrado em docs/DECISOES.md.
export const COR = {
  madeira: '#DDBF93',
  asfalto: '#A29E98',
  faixaAmarela: '#F0C24A',
  faixaPedestre: '#FFFFFF',
  contornoBloco: '#D9D1C4',

  copa: '#86B77A',
  copaClara: '#9CC78D',
  tronco: '#8A6A4B',

  // Energia
  painel: '#6A93BB',
  painelLinha: '#A9C6DE',
  moldura: '#7A8A99',
  bateria: '#69737E',
  torre: '#F4F1EA',
  pa: '#FBFAF6',
  cubo: '#E6B35C',

  // Centro Urbano
  predio: ['#E4E2DD', '#CBC8C2', '#AFACA7'],
  janelaDia: '#A9BFD1',
  janelaNoite: '#FFD98A',
  praca: '#AFD4E0',
  pracaAnel: '#7FB3C6',
  pracaAguaCentro: '#C9E5EE',
  estacionamento: '#FBFAF6',
  estacionamentoLinha: '#BDB7AC',
  semaforoCaixa: '#6C7580',
  semaforo: { vermelho: '#D9534B', amarelo: '#E3B02F', verde: '#4F9A6B' },
  semaforoApagado: '#9AA3AB',
  carros: ['#E58F83', '#7FA6CF', '#E6C26B', '#8DBF9B'],

  // Economia Circular
  feltro: '#A9CDA2',
  lixeira: ['#4F9A6B', '#4F86C0', '#E3B02F'],
  agua: '#7DB8D8',
  vidro: '#CFE6EE',
  canteiro: '#B9CC8E',
  terra: '#A98D6B',
  muda: '#6FAE6A',
  irrigacao: '#6FA3B5',

  // Residencial
  parede: '#F1E6D3',
  telhado: '#C99A8B',
  janelaCasa: '#B7CAD8',
  porta: '#B98F6E',
  calcada: '#E8DECB',
  poste: '#6B7580',
  persiana: '#E9E4DA',
  pele: '#F0C9A6',
  roupa: '#6F95C6',

  // Mobilidade
  trilho: '#7D8894',
  dormente: '#B79A78',
  plataforma: '#F3F1EC',
  contornoPlataforma: '#7B8591',
  onibus: '#6B8FC4',
  onibusJanela: '#DCE8F3',
  faixaTerminal: '#D98078',
  faixaTerminalTraco: '#F6E1DE',
  banco: '#C0675D',
  trem: '#5C8DBF',
  roda: '#5E6873',
};
