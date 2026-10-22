// =====================================================================
// Smart Canada 2050: ESP32 da ENERGIA RENOVÁVEL (E1, bloco 1)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este sketch NÃO foi compilado, porque o arduino-cli não está instalado. Compile na Arduino IDE 2.
//
// Manda ao painel: bateria_pct, bateria_v, solar_w, eolica_w, consumo_w.
// O campo "situacao" é opcional: o servidor calcula (geração contra consumo).
// Sem comandos de usuário. O "ping" (teste da administração) é respondido pelo SmartCanadaRede.h.

// ======================= CONFIGURAÇÃO (troque aqui) =======================
// A rede PRECISA ser de 2,4 GHz. O ESP32 NÃO conecta em rede de 5 GHz.
const char* WIFI_REDE     = "NOME-DA-REDE";            // TROCAR: nome da Wi-Fi do dia
const char* WIFI_SENHA    = "SENHA-DA-REDE";           // TROCAR: senha da Wi-Fi (nunca suba a senha real para o GitHub)
const char* CHAVE_MODULOS = "chave-de-exemplo-troque"; // TROCAR: a mesma "chaveModulos" do servidor
const char* IP_RESERVA    = "192.168.0.10";            // TROCAR: IP do notebook (aparece grande na Administração)
const uint16_t PORTA_RESERVA = 5050;                   // porta do servidor

// Sensores ligados? true: o sketch lê o sensor. false: sensor desligado (ainda não instalado ou sem pino confirmado).
const bool S1_LIGADO = false;      // S1: sensor de tensão e corrente
const bool S2_LIGADO = false;      // S2: LDR das placas solares
const bool EOLICA_LIGADA = false;  // medida da turbina

// MODO_TESTE (uma só, vale para o sketch todo). Padrão false.
//   false: sensor desligado NÃO manda o campo; o cartão do painel mostra "--".
//   true:  sensor desligado manda um valor de teste e a leitura leva "teste": true (o painel mostra "Valor de teste").
const bool MODO_TESTE = false;
// ===========================================================================

const char* MODULO = "energia";

#include "SmartCanadaRede.h"

// ---- Pinos. Sensores analógicos: só pinos do ADC1 (32 a 39); os do ADC2 param com a Wi-Fi ligada. ----
const int PINO_TENSAO   = 34;  // TODO: confirmar pino. S1: tensão da bateria (por divisor de tensão)
const int PINO_CORRENTE = 35;  // TODO: confirmar pino. S1: corrente que vai para a cidade
const int PINO_LDR      = 32;  // TODO: confirmar pino. S2: LDR entre as duas placas solares
const int PINO_EOLICA   = 33;  // TODO: confirmar pino. Tensão do motor da turbina (não aparece na camada 3)

// ---- Calibração (TODO: medir na maquete) ----
const float DIVISOR_TENSAO = 5.0f;     // fator do divisor de tensão (ex.: 4 resistores iguais = 5)
const float TENSAO_VAZIA = 11.0f;      // tensão da bateria a 0%
const float TENSAO_CHEIA = 12.8f;      // tensão da bateria a 100%
const float AMPERES_POR_VOLT = 1.0f;   // sensor de corrente: amperes por volt na saída
const float SOLAR_MAXIMO_W = 10.0f;    // potência das placas com luz forte no LDR
const float EOLICA_MAXIMO_W = 5.0f;    // potência da turbina girando rápido

float voltsNoPino(int pino) {
  return analogReadMilliVolts(pino) / 1000.0f;
}

// S1: tensão da bateria (V). Devolve NAN com o sensor desligado e sem MODO_TESTE (o campo não é mandado).
float lerTensaoBateria() {
  if (!S1_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S1 (tensão e corrente)"); return NAN; }
    avisarTeste("S1 (tensão e corrente)");
    marcarTeste();
    return valorDeTeste(12.2f, 0.3f, 180);
  }
  return voltsNoPino(PINO_TENSAO) * DIVISOR_TENSAO;
}

// Carga da bateria (%) a partir da tensão
float cargaDaBateria(float tensao) {
  float pct = (tensao - TENSAO_VAZIA) / (TENSAO_CHEIA - TENSAO_VAZIA) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

// S1: consumo da cidade (W) = tensão x corrente
float lerConsumo(float tensao) {
  if (!S1_LIGADO) {
    if (!MODO_TESTE) return NAN;
    marcarTeste();
    return valorDeTeste(4.0f, 1.0f, 60);
  }
  float corrente = voltsNoPino(PINO_CORRENTE) * AMPERES_POR_VOLT;
  return tensao * corrente;
}

// S2: geração solar (W), estimada pela luz no LDR
float lerSolar() {
  if (!S2_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S2 (LDR das placas solares)"); return NAN; }
    avisarTeste("S2 (LDR das placas solares)");
    marcarTeste();
    return fmaxf(0.0f, valorDeTeste(4.0f, 5.0f, 180));
  }
  float luz = analogRead(PINO_LDR) / 4095.0f;  // 0 escuro, 1 muita luz (TODO: conferir o sentido do LDR)
  return luz * SOLAR_MAXIMO_W;
}

// Turbina eólica (W)
float lerEolica() {
  if (!EOLICA_LIGADA) {
    if (!MODO_TESTE) { avisarSemSensor("turbina eólica"); return NAN; }
    avisarTeste("turbina eólica");
    marcarTeste();
    return fmaxf(0.0f, valorDeTeste(2.0f, 1.2f, 45));
  }
  float tensao = voltsNoPino(PINO_EOLICA) / 3.3f;  // 0 a 1
  return tensao * EOLICA_MAXIMO_W;
}

// Monta a leitura com os nomes do contrato (docs/API.md).
// Campo de sensor desligado (sem MODO_TESTE) fica de fora: o painel mostra "--".
void montarLeitura(JsonObject dados) {
  float tensao = lerTensaoBateria();
  if (!isnan(tensao)) {
    dados["bateria_v"] = arred(constrain(tensao, 0.0f, 15.0f), 2);
    dados["bateria_pct"] = arred(cargaDaBateria(tensao), 1);
  }
  float solar = lerSolar();
  if (!isnan(solar)) dados["solar_w"] = arred(constrain(solar, 0.0f, 100.0f), 1);
  float eolica = lerEolica();
  if (!isnan(eolica)) dados["eolica_w"] = arred(constrain(eolica, 0.0f, 100.0f), 1);
  float consumo = lerConsumo(tensao);
  if (!isnan(consumo)) dados["consumo_w"] = arred(constrain(consumo, 0.0f, 100.0f), 1);
}

// Energia não tem comandos de usuário. O ping já foi confirmado pelo SmartCanadaRede.h.
bool executarComando(const char* comando, const char* valor) {
  Serial.printf("A Energia não tem o comando %s.\n", comando);
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  analogReadResolution(12);
  redeIniciar({WIFI_REDE, WIFI_SENHA, CHAVE_MODULOS, MODULO, IP_RESERVA, PORTA_RESERVA});
}

void loop() {
  redeAtualizar();
  delay(10);
}
