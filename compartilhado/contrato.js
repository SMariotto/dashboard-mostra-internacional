// Contrato de dados da Smart Canada 2050.
// FONTE ÚNICA dos nomes de campo, unidades, faixas e comandos.
// Usado pelo servidor, pelo simulador e pela interface.
// Os nomes de campo são PROPOSTA: falta o grupo confirmar. Para renomear, mude só aqui
// (e nos sketches da pasta esp32, que usam os mesmos nomes).

export const VERSAO = '0.1.0';

/** Papéis de acesso. A checagem de verdade acontece no servidor. */
export const PAPEIS = {
  visualizacao: 'Visualização',
  controle: 'Controle',
  administracao: 'Administração',
};

/**
 * As 5 áreas da maquete, na ordem da planta (número do bloco).
 * `cor` é usada só no contorno de seleção, na etiqueta e no título do painel.
 */
export const MODULOS = [
  { id: 'energia', nome: 'Energia Renovável', curto: 'Energia', inicial: 'E', num: 1, cor: '#FFC83D', esp: 'E1', pasta: 'energia' },
  { id: 'residencial', nome: 'Área Residencial', curto: 'Residencial', inicial: 'R', num: 2, cor: '#FF8C42', esp: 'E4', pasta: 'residencial' },
  { id: 'centro', nome: 'Centro Urbano', curto: 'Centro Urbano', inicial: 'C', num: 3, cor: '#4D96FF', esp: 'E2', pasta: 'centro-urbano' },
  { id: 'mobilidade', nome: 'Mobilidade', curto: 'Mobilidade', inicial: 'M', num: 4, cor: '#9B5DE5', esp: 'E5', pasta: 'mobilidade' },
  { id: 'economia', nome: 'Economia Circular', curto: 'Economia Circular', inicial: 'EC', num: 5, cor: '#3DDC84', esp: 'E3', pasta: 'economia-circular' },
];

export const IDS_MODULOS = MODULOS.map((m) => m.id);

/** @param {string} id */
export function buscarModulo(id) {
  return MODULOS.find((m) => m.id === id) ?? null;
}

/**
 * Campo opcional de TODOS os módulos: o ESP32 manda `"teste": true` quando pelo menos um valor da leitura
 * é de teste (sensor desligado no sketch e MODO_TESTE ligado). Sem o campo, a leitura é de sensor de verdade.
 * A tela mostra o selo "Valor de teste" e a pílula do topo diz "Teste".
 */
const CAMPO_TESTE = { tipo: 'booleano', opcional: true, rotulo: 'Valor de teste', textos: { true: 'Valor de teste', false: 'Valores reais' } };

/**
 * Campos que cada módulo manda.
 * tipo: 'numero' | 'inteiro' | 'booleano' | 'texto'
 * opcional: o ESP32 pode não mandar (o servidor não reclama).
 * textos: como cada valor aparece na tela.
 */
export const CAMPOS = {
  energia: {
    bateria_pct: { tipo: 'numero', unidade: '%', min: 0, max: 100, rotulo: 'Carga da bateria' },
    bateria_v: { tipo: 'numero', unidade: 'V', min: 0, max: 15, rotulo: 'Tensão da bateria' },
    solar_w: { tipo: 'numero', unidade: 'W', min: 0, max: 100, rotulo: 'Geração solar' },
    eolica_w: { tipo: 'numero', unidade: 'W', min: 0, max: 100, rotulo: 'Geração eólica' },
    consumo_w: { tipo: 'numero', unidade: 'W', min: 0, max: 100, rotulo: 'Consumo da cidade' },
    situacao: {
      tipo: 'texto', opcional: true, valores: ['mais', 'igual', 'menos'], rotulo: 'Situação energética',
      textos: { mais: 'Gerando mais que o consumo', igual: 'Equilibrado', menos: 'Consumindo mais que gera' },
    },
    teste: CAMPO_TESTE,
  },
  residencial: {
    temperatura_c: { tipo: 'numero', unidade: '°C', min: -10, max: 60, rotulo: 'Temperatura' },
    umidade_pct: { tipo: 'numero', unidade: '%', min: 0, max: 100, rotulo: 'Umidade do ar' },
    aquecimento: { tipo: 'booleano', rotulo: 'Aquecimento', textos: { true: 'Ligado', false: 'Desligado' } },
    presenca: { tipo: 'booleano', rotulo: 'Presença', textos: { true: 'Alguém em casa', false: 'Ninguém' } },
    persiana: { tipo: 'texto', valores: ['aberta', 'fechada'], rotulo: 'Persiana', textos: { aberta: 'Aberta', fechada: 'Fechada' } },
    // Acréscimo da SPEC (eco do comando de iluminação). Marcar para o grupo confirmar.
    iluminacao: {
      tipo: 'texto', opcional: true, valores: ['automatico', 'ligada', 'desligada'], rotulo: 'Iluminação',
      textos: { automatico: 'Automática', ligada: 'Ligada', desligada: 'Desligada' },
    },
    teste: CAMPO_TESTE,
  },
  centro: {
    postes: {
      tipo: 'texto', valores: ['ligados', 'desligados', 'automatico'], rotulo: 'Postes',
      textos: { ligados: 'Ligados', desligados: 'Desligados', automatico: 'Automático' },
    },
    semaforo: {
      tipo: 'texto', valores: ['verde', 'amarelo', 'vermelho'], rotulo: 'Semáforo',
      textos: { verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho' },
    },
    vagas_livres: { tipo: 'inteiro', unidade: 'vagas', min: 0, max: 4, rotulo: 'Vagas livres' },
    teste: CAMPO_TESTE,
  },
  mobilidade: {
    terminal: { tipo: 'texto', valores: ['operando', 'parado'], rotulo: 'Terminal', textos: { operando: 'Operando', parado: 'Parado' } },
    proximo_veiculo: { tipo: 'texto', maxCaracteres: 40, rotulo: 'Próximo veículo' },
    veiculo_na_plataforma: { tipo: 'booleano', rotulo: 'Veículo na plataforma', textos: { true: 'Sim', false: 'Não' } },
    trem: {
      tipo: 'texto', valores: ['parado', 'em movimento', 'na estacao'], rotulo: 'Trem',
      textos: { parado: 'Parado', 'em movimento': 'Em movimento', 'na estacao': 'Na estação' },
    },
    demonstracao: { tipo: 'booleano', opcional: true, rotulo: 'Demonstração', textos: { true: 'Ativa', false: 'Parada' } },
    teste: CAMPO_TESTE,
  },
  economia: {
    umidade_solo_pct: { tipo: 'numero', unidade: '%', min: 0, max: 100, rotulo: 'Umidade do solo' },
    reservatorio_pct: { tipo: 'numero', unidade: '%', min: 0, max: 100, rotulo: 'Reservatório' },
    bomba: { tipo: 'booleano', rotulo: 'Bomba', textos: { true: 'Ligada', false: 'Desligada' } },
    irrigacao: {
      tipo: 'texto', opcional: true, valores: ['automatico', 'manual'], rotulo: 'Irrigação',
      textos: { automatico: 'Automática', manual: 'Manual' },
    },
    teste: CAMPO_TESTE,
  },
};

/** Diferença abaixo da qual geração e consumo contam como "igual" (W). */
export const TOLERANCIA_SITUACAO_W = 0.5;

/**
 * Situação energética calculada pelo servidor quando o ESP32 não manda.
 * @param {{solar_w?: number, eolica_w?: number, consumo_w?: number}} d
 * @returns {'mais'|'igual'|'menos'|null}
 */
export function calcularSituacao(d) {
  if (typeof d.solar_w !== 'number' || typeof d.eolica_w !== 'number' || typeof d.consumo_w !== 'number') return null;
  const diferenca = d.solar_w + d.eolica_w - d.consumo_w;
  if (Math.abs(diferenca) < TOLERANCIA_SITUACAO_W) return 'igual';
  return diferenca > 0 ? 'mais' : 'menos';
}

/** Alertas derivados dos dados. */
export const ALERTAS = [
  { id: 'bateria_baixa', modulo: 'energia', campo: 'bateria_pct', abaixoDe: 20, texto: 'Bateria baixa' },
  { id: 'reservatorio_baixo', modulo: 'economia', campo: 'reservatorio_pct', abaixoDe: 20, texto: 'Reservatório baixo' },
];

/**
 * @param {Record<string, Record<string, unknown>>} dadosPorModulo
 * @returns {{id: string, modulo: string, texto: string}[]}
 */
export function calcularAlertas(dadosPorModulo) {
  const ativos = [];
  for (const a of ALERTAS) {
    const valor = dadosPorModulo[a.modulo]?.[a.campo];
    if (typeof valor === 'number' && valor < a.abaixoDe) ativos.push({ id: a.id, modulo: a.modulo, texto: a.texto });
  }
  return ativos;
}

/**
 * Valida um campo contra o contrato.
 * @returns {string|null} null se válido, ou o motivo da recusa.
 */
export function validarCampo(def, valor) {
  switch (def.tipo) {
    case 'numero':
      if (typeof valor !== 'number' || !Number.isFinite(valor)) return 'não é número';
      if (valor < def.min || valor > def.max) return `fora da faixa ${def.min} a ${def.max}`;
      return null;
    case 'inteiro':
      if (!Number.isInteger(valor)) return 'não é número inteiro';
      if (valor < def.min || valor > def.max) return `fora da faixa ${def.min} a ${def.max}`;
      return null;
    case 'booleano':
      return typeof valor === 'boolean' ? null : 'não é true ou false';
    case 'texto':
      if (typeof valor !== 'string') return 'não é texto';
      if (def.valores && !def.valores.includes(valor)) return `valor fora da lista (${def.valores.join(', ')})`;
      if (def.maxCaracteres && valor.length > def.maxCaracteres) return `mais de ${def.maxCaracteres} caracteres`;
      return null;
    default:
      return 'tipo desconhecido no contrato';
  }
}

/**
 * Valida os dados de uma leitura. Campo inválido é ignorado sozinho; o resto é aceito.
 * @param {string} modulo
 * @param {unknown} dados
 * @returns {{validos: Record<string, unknown>, avisos: string[]}}
 */
export function validarDados(modulo, dados) {
  const defs = CAMPOS[modulo];
  const validos = {};
  const avisos = [];
  if (!defs) return { validos, avisos: [`módulo desconhecido: ${modulo}`] };
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return { validos, avisos: ['"dados" ausente ou não é objeto'] };
  for (const [campo, valor] of Object.entries(dados)) {
    const def = defs[campo];
    if (!def) { avisos.push(`${modulo}.${campo}: campo desconhecido, ignorado`); continue; }
    const erro = validarCampo(def, valor);
    if (erro) { avisos.push(`${modulo}.${campo}: ${erro}, ignorado`); continue; }
    validos[campo] = valor;
  }
  return { validos, avisos };
}

/**
 * Comandos do dashboard para os ESP32.
 * eco: campo que o ESP32 devolve e valor esperado depois do comando (os botões mostram
 * qual opção está ativa por ele).
 */
export const COMANDOS = [
  {
    modulo: 'economia', comando: 'irrigacao', rotulo: 'Irrigação', valores: ['automatico', 'agora'],
    papeis: ['controle', 'administracao'], textos: { automatico: 'Automático', agora: 'Irrigar agora' },
    eco: { campo: 'irrigacao', valor: { automatico: 'automatico', agora: 'manual' } },
  },
  {
    modulo: 'residencial', comando: 'iluminacao', rotulo: 'Iluminação', valores: ['automatico', 'ligar', 'desligar'],
    papeis: ['controle', 'administracao'], textos: { automatico: 'Automático', ligar: 'Ligar', desligar: 'Desligar' },
    eco: { campo: 'iluminacao', valor: { automatico: 'automatico', ligar: 'ligada', desligar: 'desligada' } },
  },
  {
    modulo: 'residencial', comando: 'persiana', rotulo: 'Persiana', valores: ['abrir', 'fechar'],
    papeis: ['controle', 'administracao'], textos: { abrir: 'Abrir', fechar: 'Fechar' },
    eco: { campo: 'persiana', valor: { abrir: 'aberta', fechar: 'fechada' } },
  },
  {
    modulo: 'mobilidade', comando: 'demonstracao', rotulo: 'Demonstração', valores: ['iniciar', 'parar'],
    papeis: ['controle', 'administracao'], textos: { iniciar: 'Iniciar', parar: 'Parar' },
    eco: { campo: 'demonstracao', valor: { iniciar: true, parar: false } },
  },
];

/**
 * Comando de teste aceito por TODOS os módulos, só pela administração.
 * O ESP32 confirma e não aciona nada. Usado pelo botão "Testar comandos".
 */
export const PING = { comando: 'ping', valores: ['teste'], papeis: ['administracao'], rotulo: 'Teste' };

/** Comandos de usuário de um módulo (sem o ping). */
export function comandosDoModulo(modulo) {
  return COMANDOS.filter((c) => c.modulo === modulo);
}

/**
 * @param {string} modulo
 * @param {string} comando
 */
export function buscarComando(modulo, comando) {
  if (comando === PING.comando && IDS_MODULOS.includes(modulo)) return { modulo, ...PING };
  return COMANDOS.find((c) => c.modulo === modulo && c.comando === comando) ?? null;
}

/**
 * Valida um pedido de comando e o papel de quem pediu.
 * @returns {{ok: true} | {ok: false, status: number, erro: string}}
 */
export function validarComando(pedido, papel) {
  if (!pedido || typeof pedido !== 'object') return { ok: false, status: 400, erro: 'pedido inválido' };
  const { modulo, comando, valor } = pedido;
  const def = buscarComando(modulo, comando);
  if (!def) return { ok: false, status: 400, erro: 'comando desconhecido para este módulo' };
  if (!def.valores.includes(valor)) return { ok: false, status: 400, erro: `valor inválido (${def.valores.join(', ')})` };
  if (!def.papeis.includes(papel)) return { ok: false, status: 403, erro: 'seu papel não pode usar este comando' };
  return { ok: true };
}
