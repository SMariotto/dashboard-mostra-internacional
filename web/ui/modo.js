// Que modo a pílula do topo mostra? Regra (A1, G1):
//   demo                                    -> "Demonstração" (âmbar)
//   real, pelo menos uma leitura recente ("ok") que NÃO é de teste -> "Ao vivo" (verde sálvia)
//   real, leituras recentes e TODAS de teste (campo "teste": true)  -> "Teste" (âmbar)
//   real e nenhum módulo com leitura        -> "Sem leituras" (cinza): nada chegou dos ESP32 ainda
// Assim "Ao vivo" só aparece quando há dado de verdade chegando.

/** @param {{modo?: string, modulos?: Record<string, {sinal?: string, dados?: {teste?: boolean}}>}} estado @returns {'demo'|'ao_vivo'|'teste'|'sem_leituras'} */
export function modoMostrado(estado) {
  if (estado?.modo === 'demo') return 'demo';
  const recentes = Object.values(estado?.modulos ?? {}).filter((m) => m?.sinal === 'ok');
  if (!recentes.length) return 'sem_leituras';
  return recentes.every((m) => m.dados?.teste === true) ? 'teste' : 'ao_vivo';
}
