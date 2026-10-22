// =====================================================================
// Smart Canada 2050: ESP32 da MOBILIDADE (E5, bloco 4)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este sketch NÃO foi compilado, porque o arduino-cli não está instalado. Compile na Arduino IDE 2.
//
// Manda ao painel: terminal, proximo_veiculo, veiculo_na_plataforma, trem, demonstracao.
// Comando: demonstracao (iniciar, parar): o trem anda de ponta a ponta do trilho.
// O "ping" (teste da administração) é respondido pelo SmartCanadaRede.h.

// ======================= CONFIGURAÇÃO (troque aqui) =======================
// A rede PRECISA ser de 2,4 GHz. O ESP32 NÃO conecta em rede de 5 GHz.
const char* WIFI_REDE     = "NOME-DA-REDE";            // TROCAR: nome da Wi-Fi do dia
const char* WIFI_SENHA    = "SENHA-DA-REDE";           // TROCAR: senha da Wi-Fi (nunca suba a senha real para o GitHub)
const char* CHAVE_MODULOS = "chave-de-exemplo-troque"; // TROCAR: a mesma "chaveModulos" do servidor
const char* IP_RESERVA    = "192.168.0.10";            // TROCAR: IP do notebook (aparece grande na Administração)
const uint16_t PORTA_RESERVA = 5050;                   // porta do servidor

// Sensores ligados? true: o sketch lê o sensor. false: sensor desligado (ainda não instalado ou sem pino confirmado).
const bool S16_LIGADO = false;           // S16: aproximação do ônibus (decide "próximo veículo" e "veículo na plataforma")
const bool FIM_DE_CURSO_LIGADO = false;  // S17 e S18. Desligados, o trem anda por tempo (é movimento de verdade do motor, não valor de teste)

// MODO_TESTE (uma só, vale para o sketch todo). Padrão false.
//   false: sensor desligado NÃO manda o campo; o cartão do painel mostra "--".
//   true:  sensor desligado manda um valor de teste e a leitura leva "teste": true (o painel mostra "Valor de teste").
const bool MODO_TESTE = false;
// ===========================================================================

const char* MODULO = "mobilidade";

// P2 (painel de partidas OLED) precisa das bibliotecas "Adafruit SSD1306" e "Adafruit GFX".
// Instale e troque para 1 quando o painel estiver ligado. Com 0, o painel aparece só no Serial.
#define USAR_OLED 0

#include "SmartCanadaRede.h"
#if USAR_OLED
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#endif

// ---- Pinos ----
const int PINO_S16       = 27;  // TODO: confirmar pino. S16: aproximação do ônibus (na entrada do ponto)
const int PINO_S17       = 32;  // TODO: confirmar pino. S17: fim de curso do trem (início, x 60)
const int PINO_S18       = 33;  // TODO: confirmar pino. S18: fim de curso do trem (fim, x 110)
const int PINO_MOTOR_A   = 25;  // TODO: confirmar pino. Ponte H, entrada 1 do motor do trem
const int PINO_MOTOR_B   = 26;  // TODO: confirmar pino. Ponte H, entrada 2 do motor do trem
const int PINO_LUZ_PLATAFORMA = 2;  // TODO: confirmar pino. LED da plataforma ("a plataforma acende")
// OLED (P2) no I2C: SDA 21, SCL 22 (padrão do ESP32).

// ---- Ajustes (TODO: conferir na maquete) ----
const char* LINHA = "Ônibus 2";                    // nome que aparece no painel (até uns 20 caracteres)
const unsigned long INTERVALO_ONIBUS_MS = 180000;  // um ônibus a cada 3 minutos
const unsigned long TEMPO_NA_ESTACAO_MS = 4000;    // parada em cada ponta
const unsigned long TEMPO_DE_VIAGEM_MS = 8000;     // sem fim de curso: tempo de ponta a ponta

// ---- Estado ----
enum EstadoTrem { TREM_PARADO, TREM_ANDANDO, TREM_NA_ESTACAO };
EstadoTrem trem = TREM_PARADO;
bool demonstracaoAtiva = false;
bool indoParaS18 = true;
unsigned long inicioEtapa = 0;
volatile bool chegouNaPonta = false;
bool terminalOperando = true;
bool veiculoNaPlataforma = false;
unsigned long proximaChegada = 0;
char textoProximo[41];

#if USAR_OLED
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
#endif

// S17 e S18: param o motor na hora (interrupção), mesmo se a Wi-Fi estiver ocupada.
void IRAM_ATTR fimDeCurso() {
  digitalWrite(PINO_MOTOR_A, LOW);
  digitalWrite(PINO_MOTOR_B, LOW);
  chegouNaPonta = true;
}

void motor(bool ligado, bool paraS18) {
  digitalWrite(PINO_MOTOR_A, ligado && paraS18 ? HIGH : LOW);
  digitalWrite(PINO_MOTOR_B, ligado && !paraS18 ? HIGH : LOW);
}

// S16: tem ônibus no ponto?
bool lerVeiculoNaPlataforma() {
  if (!S16_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S16 (aproximação do ônibus)"); return false; }
    avisarTeste("S16 (aproximação do ônibus)");
    return millis() + 6000 >= proximaChegada;  // os últimos 6 s antes do horário
  }
  return digitalRead(PINO_S16) == LOW;
}

void atualizarPainel() {
  if (!S16_LIGADO && !MODO_TESTE) {
    snprintf(textoProximo, sizeof(textoProximo), "--");  // sem S16 não há horário de verdade para mostrar
  } else if (veiculoNaPlataforma) {
    snprintf(textoProximo, sizeof(textoProximo), "%s na plataforma", LINHA);
  } else {
    unsigned long falta = proximaChegada > millis() ? proximaChegada - millis() : 0;
    unsigned long minutos = (falta + 59999) / 60000;
    if (minutos < 1) minutos = 1;
    snprintf(textoProximo, sizeof(textoProximo), "%s em %lu min", LINHA, minutos);
  }
#if USAR_OLED
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);
  oled.setCursor(0, 0);
  oled.println("PARTIDAS");
  oled.println(textoProximo);  // TODO: a fonte padrão do OLED não tem acento
  oled.display();
#endif
}

void atualizarTrem() {
  if (!demonstracaoAtiva) {
    if (trem != TREM_PARADO) {
      motor(false, indoParaS18);
      trem = TREM_PARADO;
      redeEnviarAgora();
    }
    return;
  }
  unsigned long passou = millis() - inicioEtapa;
  if (trem == TREM_PARADO || (trem == TREM_NA_ESTACAO && passou >= TEMPO_NA_ESTACAO_MS)) {
    if (trem == TREM_NA_ESTACAO) indoParaS18 = !indoParaS18;
    chegouNaPonta = false;
    motor(true, indoParaS18);
    trem = TREM_ANDANDO;
    inicioEtapa = millis();
    redeEnviarAgora();
    return;
  }
  if (trem == TREM_ANDANDO) {
    bool chegou = FIM_DE_CURSO_LIGADO ? chegouNaPonta : passou >= TEMPO_DE_VIAGEM_MS;
    if (chegou) {
      motor(false, indoParaS18);
      trem = TREM_NA_ESTACAO;  // a plataforma não tem sensor: a ponta do trilho conta como estação
      inicioEtapa = millis();
      redeEnviarAgora();
    }
  }
}

// Estado do trem com os valores do contrato.
const char* textoTrem() {
  if (trem == TREM_ANDANDO) return "em movimento";
  if (trem == TREM_NA_ESTACAO) return "na estacao";
  return "parado";
}

// Monta a leitura com os nomes do contrato (docs/API.md).
// Campo de sensor desligado (sem MODO_TESTE) fica de fora: o painel mostra "--".
void montarLeitura(JsonObject dados) {
  dados["terminal"] = terminalOperando ? "operando" : "parado";
  if (S16_LIGADO || MODO_TESTE) {
    dados["proximo_veiculo"] = textoProximo;
    dados["veiculo_na_plataforma"] = veiculoNaPlataforma;
    if (!S16_LIGADO) marcarTeste();
  }
  dados["trem"] = textoTrem();
  dados["demonstracao"] = demonstracaoAtiva;
}

bool executarComando(const char* comando, const char* valor) {
  if (strcmp(comando, "demonstracao") == 0) {
    if (strcmp(valor, "iniciar") == 0) demonstracaoAtiva = true;
    else if (strcmp(valor, "parar") == 0) demonstracaoAtiva = false;
    else return false;
    atualizarTrem();
    redeEnviarAgora();
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  pinMode(PINO_S16, INPUT_PULLUP);
  pinMode(PINO_S17, INPUT_PULLUP);
  pinMode(PINO_S18, INPUT_PULLUP);
  pinMode(PINO_MOTOR_A, OUTPUT);
  pinMode(PINO_MOTOR_B, OUTPUT);
  pinMode(PINO_LUZ_PLATAFORMA, OUTPUT);
  motor(false, true);
  if (FIM_DE_CURSO_LIGADO) {
    attachInterrupt(digitalPinToInterrupt(PINO_S17), fimDeCurso, FALLING);
    attachInterrupt(digitalPinToInterrupt(PINO_S18), fimDeCurso, FALLING);
  }
#if USAR_OLED
  if (!oled.begin(SSD1306_SWITCHCAPVCC, 0x3C)) Serial.println("P2 (OLED) não respondeu.");
#endif
  proximaChegada = millis() + INTERVALO_ONIBUS_MS;
  atualizarPainel();
  redeIniciar({WIFI_REDE, WIFI_SENHA, CHAVE_MODULOS, MODULO, IP_RESERVA, PORTA_RESERVA});
}

unsigned long ultimoPainel = 0;

void loop() {
  redeAtualizar();
  atualizarTrem();

  bool antes = veiculoNaPlataforma;
  veiculoNaPlataforma = lerVeiculoNaPlataforma();
  digitalWrite(PINO_LUZ_PLATAFORMA, veiculoNaPlataforma ? HIGH : LOW);
  if (antes && !veiculoNaPlataforma) proximaChegada = millis() + INTERVALO_ONIBUS_MS;  // o ônibus saiu
  if (!S16_LIGADO && millis() >= proximaChegada) proximaChegada = millis() + INTERVALO_ONIBUS_MS;

  if (antes != veiculoNaPlataforma || millis() - ultimoPainel >= 5000) {
    ultimoPainel = millis();
    atualizarPainel();
    if (antes != veiculoNaPlataforma) {
      Serial.printf("Painel de partidas: %s\n", textoProximo);
      redeEnviarAgora();
    }
  }
  delay(10);
}
