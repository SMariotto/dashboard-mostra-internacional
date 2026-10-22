// =====================================================================
// Smart Canada 2050: ESP32 da ECONOMIA CIRCULAR (E3, bloco 5)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este sketch NÃO foi compilado, porque o arduino-cli não está instalado. Compile na Arduino IDE 2.
//
// Manda ao painel: umidade_solo_pct, reservatorio_pct, bomba, irrigacao.
// Comando: irrigacao (automatico, agora).
// O "ping" (teste da administração) é respondido pelo SmartCanadaRede.h.

// ======================= CONFIGURAÇÃO (troque aqui) =======================
// A rede PRECISA ser de 2,4 GHz. O ESP32 NÃO conecta em rede de 5 GHz.
const char* WIFI_REDE     = "NOME-DA-REDE";            // TROCAR: nome da Wi-Fi do dia
const char* WIFI_SENHA    = "SENHA-DA-REDE";           // TROCAR: senha da Wi-Fi (nunca suba a senha real para o GitHub)
const char* CHAVE_MODULOS = "chave-de-exemplo-troque"; // TROCAR: a mesma "chaveModulos" do servidor
const char* IP_RESERVA    = "192.168.0.10";            // TROCAR: IP do notebook (aparece grande na Administração)
const uint16_t PORTA_RESERVA = 5050;                   // porta do servidor

// Sensores ligados? true: o sketch lê o sensor. false: sensor desligado (ainda não instalado ou sem pino confirmado).
const bool S10_LIGADO = false;  // S10: umidade do solo
const bool S11_LIGADO = false;  // S11: nível do reservatório

// MODO_TESTE (uma só, vale para o sketch todo). Padrão false.
//   false: sensor desligado NÃO manda o campo; o cartão do painel mostra "--".
//   true:  sensor desligado manda um valor de teste e a leitura leva "teste": true (o painel mostra "Valor de teste").
const bool MODO_TESTE = false;
// ===========================================================================

const char* MODULO = "economia";

#include "SmartCanadaRede.h"

// ---- Pinos. Analógico: só ADC1 (32 a 39); os do ADC2 param com a Wi-Fi ligada. ----
const int PINO_UMIDADE_SOLO = 34;  // TODO: confirmar pino. S10: umidade do solo (canteiro do meio)
const int PINO_NIVEL        = 35;  // TODO: confirmar pino. S11: nível do reservatório
const int PINO_BOMBA        = 26;  // TODO: confirmar pino. P1: relé da bomba de água

// ---- Ajustes (TODO: medir na maquete) ----
const int SOLO_SECO = 3200;          // leitura do S10 com o solo seco (0 a 4095)
const int SOLO_MOLHADO = 1300;       // leitura do S10 com o solo encharcado
const int NIVEL_VAZIO = 300;         // leitura do S11 com o reservatório vazio
const int NIVEL_CHEIO = 3000;        // leitura do S11 com o reservatório cheio
const int RELE_LIGA = HIGH;          // muitos relés ligam com LOW: troque se a bomba ficar ao contrário
const float LIGA_ABAIXO = 35.0f;     // irrigação automática liga com o solo abaixo disso (%)
const float DESLIGA_ACIMA = 70.0f;   // e desliga acima disso (%)
const float RESERVATORIO_MINIMO = 20.0f;  // abaixo disso a automática não liga (sem água suficiente)
const unsigned long IRRIGAR_AGORA_MS = 10000;  // "Irrigar agora" liga a bomba por 10 s

// ---- Estado ----
bool irrigacaoAutomatica = true;
bool bombaLigada = false;
unsigned long irrigarAte = 0;
float umidadeSolo = NAN;  // NAN: sem leitura (sensor desligado e sem MODO_TESTE): o campo não é mandado
float reservatorio = NAN;

float paraPorcentagem(int leitura, int zero, int cem) {
  float pct = (float)(leitura - zero) / (float)(cem - zero) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

// S10: umidade do solo (%)
float lerUmidadeSolo() {
  if (!S10_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S10 (umidade do solo)"); return NAN; }
    avisarTeste("S10 (umidade do solo)");
    // Teste: o solo seca devagar e molha com a bomba ligada.
    float atual = isnan(umidadeSolo) ? 55.0f : umidadeSolo;
    atual += bombaLigada ? 0.6f : -0.05f;
    return constrain(atual, 5.0f, 95.0f);
  }
  return paraPorcentagem(analogRead(PINO_UMIDADE_SOLO), SOLO_SECO, SOLO_MOLHADO);
}

// S11: nível do reservatório (%)
float lerReservatorio() {
  if (!S11_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S11 (nível do reservatório)"); return NAN; }
    avisarTeste("S11 (nível do reservatório)");
    float atual = isnan(reservatorio) ? 65.0f : reservatorio;
    atual += bombaLigada ? -0.3f : 0.03f;
    return constrain(atual, 3.0f, 100.0f);
  }
  return paraPorcentagem(analogRead(PINO_NIVEL), NIVEL_VAZIO, NIVEL_CHEIO);
}

void ligarBomba(bool ligar) {
  if (ligar == bombaLigada) return;
  bombaLigada = ligar;
  digitalWrite(PINO_BOMBA, ligar ? RELE_LIGA : !RELE_LIGA);
  Serial.println(ligar ? "Bomba LIGADA" : "Bomba desligada");
  redeEnviarAgora();
}

void decidirBomba() {
  if (!irrigacaoAutomatica) {
    ligarBomba(millis() < irrigarAte);  // "Irrigar agora": 10 s
    return;
  }
  if (reservatorio < RESERVATORIO_MINIMO) {
    if (bombaLigada) Serial.println("Reservatório baixo: irrigação automática bloqueada.");
    ligarBomba(false);
  } else if (umidadeSolo < LIGA_ABAIXO) {
    ligarBomba(true);
  } else if (umidadeSolo > DESLIGA_ACIMA) {
    ligarBomba(false);
  }
}

// Monta a leitura com os nomes do contrato (docs/API.md).
// Campo de sensor desligado (sem MODO_TESTE) fica de fora: o painel mostra "--".
// A bomba e a irrigação são do próprio ESP32 (relé e comando): valem como valor de verdade.
void montarLeitura(JsonObject dados) {
  if (!isnan(umidadeSolo)) {
    dados["umidade_solo_pct"] = arred(umidadeSolo, 1);
    if (!S10_LIGADO) marcarTeste();
  }
  if (!isnan(reservatorio)) {
    dados["reservatorio_pct"] = arred(reservatorio, 1);
    if (!S11_LIGADO) marcarTeste();
  }
  dados["bomba"] = bombaLigada;
  dados["irrigacao"] = irrigacaoAutomatica ? "automatico" : "manual";
}

bool executarComando(const char* comando, const char* valor) {
  if (strcmp(comando, "irrigacao") == 0) {
    if (strcmp(valor, "automatico") == 0) {
      irrigacaoAutomatica = true;
      irrigarAte = 0;
    } else if (strcmp(valor, "agora") == 0) {
      irrigacaoAutomatica = false;  // fica "manual" até alguém escolher "Automático"
      irrigarAte = millis() + IRRIGAR_AGORA_MS;
    } else {
      return false;
    }
    decidirBomba();
    redeEnviarAgora();
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  analogReadResolution(12);
  pinMode(PINO_BOMBA, OUTPUT);
  digitalWrite(PINO_BOMBA, !RELE_LIGA);
  redeIniciar({WIFI_REDE, WIFI_SENHA, CHAVE_MODULOS, MODULO, IP_RESERVA, PORTA_RESERVA});
}

unsigned long ultimaLeituraSensores = 0;

void loop() {
  redeAtualizar();
  if (millis() - ultimaLeituraSensores >= 500) {
    ultimaLeituraSensores = millis();
    umidadeSolo = lerUmidadeSolo();
    reservatorio = lerReservatorio();
    decidirBomba();
  }
  delay(10);
}
