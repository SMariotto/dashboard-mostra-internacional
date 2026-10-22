// Ícones desenhados para o projeto (SVG, 24x24, traço arredondado). Nada vem da internet.
const s = (miolo, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${miolo}</svg>`;

const FOLHA = 'M50 2L57 17L63 12L62 31L77 23L74 41L97 37L87 55L93 64L61 68L53 66L53 98L47 98L47 66L39 68L7 64L13 55L3 37L26 41L23 23L38 31L37 12L43 17Z';

// --- As 5 áreas ---
export const AREA = {
  // Raio (o desenho de turbina parecia um avião).
  energia: s('<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>'),
  // Casa.
  residencial: s('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>'),
  // Prédios.
  centro: s('<path d="M3 21h18"/><rect x="4" y="10" width="6" height="11"/><rect x="10" y="3" width="10" height="18"/><path d="M13 7h1.5M16.5 7H18M13 11h1.5M16.5 11H18M13 15h1.5M16.5 15H18M6.5 13.5h1M6.5 17h1"/>'),
  // Ônibus.
  mobilidade: s('<rect x="4.5" y="3" width="15" height="15" rx="3"/><path d="M4.5 11h15"/><path d="M8 18v2.5M16 18v2.5"/><circle cx="8.5" cy="14.5" r="1" fill="currentColor"/><circle cx="15.5" cy="14.5" r="1" fill="currentColor"/>'),
  // Setas da reciclagem.
  economia: s('<path d="M19.5 13a7.5 7.5 0 0 1-12.8 4.6"/><path d="M4.5 11A7.5 7.5 0 0 1 17.3 6.4"/><path d="M17.8 2.8v4h-4"/><path d="M6.2 21.2v-4h4"/>'),
};

// --- Estados (sempre com texto ao lado) ---
export const ESTADO = {
  ok: s('<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16.2 9"/>'),
  alerta: s('<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.2"/><path d="M12 17.2h.01"/>'),
  semSinal: s('<path d="M5 20v-2.5M9.5 20v-6M14 20v-9.5M18.5 20V6"/><path d="m3 3 18 18"/>'),
  desativado: s('<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>'),
  conexao: s('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M6 12.5a9 9 0 0 1 12 0"/><path d="M9.5 16a4 4 0 0 1 5 0"/><path d="M12 19.5h.01"/><path d="m3 3 18 18"/>'),
};

// --- Coisas da cidade ---
export const ITEM = {
  // Folha de bordo: linha simples (marca) e cheia (marca d'água). Contorno desenhado no projeto, não é a bandeira.
  folha: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"><path d="${FOLHA}"/></svg>`,
  folhaCheia: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="${FOLHA}"/></svg>`,
  cidade: s('<rect x="3.5" y="3.5" width="7.5" height="9" rx="2"/><rect x="13" y="3.5" width="7.5" height="5.5" rx="2"/><rect x="3.5" y="14.5" width="7.5" height="6" rx="2"/><rect x="13" y="11" width="7.5" height="9.5" rx="2"/>'),
  seta: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  voltar: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  bateria: s('<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/>'),
  raio: s('<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>'),
  sol: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  vento: s('<path d="M3 8.5h11a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 16.5h7"/>'),
  tomada: s('<path d="M9 3v5M15 3v5"/><path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0V8z"/><path d="M12 17v4"/>'),
  sobe: s('<path d="m4 16 5.5-5.5 4 4L20 8"/><path d="M14.5 8H20v5.5"/>'),
  igual: s('<path d="M5 9.5h14M5 14.5h14"/>'),
  desce: s('<path d="m4 8 5.5 5.5 4-4L20 16"/><path d="M14.5 16H20v-5.5"/>'),
  termometro: s('<path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z"/><path d="M12 8v8"/>'),
  gota: s('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  chama: s('<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-4-3-6.5-4.5-10-1.5 2.5-2 4-2 5.5-1.5-1-2.2-2.5-2.2-2.5S5.5 11 5.5 15A6.5 6.5 0 0 0 12 21.5z"/>'),
  pessoa: s('<circle cx="12" cy="6" r="3"/><path d="M6 21v-3.5a6 6 0 0 1 12 0V21"/>'),
  janela: s('<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M4 8h16M4 12h16M4 16h16"/>'),
  lampada: s('<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.6 1.2 2.5h5.6c0-.9.4-1.7 1.2-2.5A6 6 0 0 0 12 3z"/>'),
  poste: s('<path d="M8 21h8M12 21V7"/><path d="M12 7c0-2.5 2-4 4.5-4H19"/><path d="M17 3v3.5"/><circle cx="17" cy="8" r="1.4" fill="currentColor"/>'),
  semaforo: s('<rect x="8" y="2.5" width="8" height="16" rx="2.5"/><circle cx="12" cy="6.5" r="1.3"/><circle cx="12" cy="10.5" r="1.3"/><circle cx="12" cy="14.5" r="1.3"/><path d="M12 18.5v3"/>'),
  carro: s('<path d="M5 16.5V12l2-5h10l2 5v4.5"/><path d="M3.5 12h17v4.5h-17z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>'),
  terminal: s('<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>'),
  relogio: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  trem: s('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14"/><circle cx="9" cy="13.5" r="1" fill="currentColor"/><circle cx="15" cy="13.5" r="1" fill="currentColor"/><path d="m8 21 2-4M16 21l-2-4"/>'),
  plataforma: s('<path d="M3 15h18M5 15v5M19 15v5"/><path d="M7 15V9h10v6"/><path d="M10 9V6h4v3"/>'),
  play: s('<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor"/>'),
  bomba: s('<rect x="4" y="9" width="10" height="9" rx="2"/><path d="M14 12h4a2 2 0 0 1 2 2v1"/><path d="M20 18.5c-.8 1-1.3 1.6-1.3 2.2"/><path d="M7 9V6h4v3"/><path d="M6 21h6"/>'),
  regador: s('<path d="M4 9h10v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z"/><path d="M14 11l6-4v3l-6 4"/><path d="M6 9V6a3 3 0 0 1 6 0"/>'),
  tanque: s('<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M5 13c2.3-1.3 4.7 1.3 7 0s4.7-1.3 7 0"/>'),
  qr: s('<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5"/>'),
  celular: s('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
  engrenagem: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>'),
  cadeado: s('<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  entrar: s('<path d="M14 3.5h4a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4"/><path d="M10 16.5 14.5 12 10 7.5"/><path d="M14.5 12H3.5"/>'),
  sair: s('<path d="M10 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/><path d="M15.5 16.5 20 12l-4.5-4.5"/><path d="M20 12H9"/>'),
  fechar: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  enviar: s('<path d="M21 3 10 14"/><path d="M21 3 14.5 21l-4.5-7-7-4.5L21 3z"/>'),
  espera: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5h4"/>'),
  baixar: s('<path d="M12 3.5v12"/><path d="m7 10.5 5 5 5-5"/><path d="M4 20.5h16"/>'),
  chip: s('<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2.5v3.5M15 2.5v3.5M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>'),
  rede: s('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M6 12.5a9 9 0 0 1 12 0"/><path d="M9.5 16a4 4 0 0 1 5 0"/><path d="M12 19.5h.01"/>'),
  lua: s('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.7 6.7 0 0 0 10.5 10.5z"/>'),
  cubo: s('<path d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9L12 2.8z"/><path d="M12 12v9.2M3.5 7.5 12 12l8.5-4.5"/>'),
  cartoes: s('<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10.5h17"/><path d="M7 14.5h4"/>'),
  apresentacao: s('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20.5h8"/><path d="m10.5 8 4 2-4 2z" fill="currentColor"/>'),
};
