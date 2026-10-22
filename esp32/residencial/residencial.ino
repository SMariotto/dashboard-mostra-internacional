// =====================================================================
// Smart Canada 2050: ESP32 da ÁREA RESIDENCIAL (E4, bloco 2)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este sketch NÃO foi compilado, porque o arduino-cli não está instalado. Compile na Arduino IDE 2.
//
// Manda ao painel: temperatura_c, umidade_pct, aquecimento, presenca, persiana, iluminacao.
// Comandos: iluminacao (automatico, ligar, desligar) e persiana (abrir, fechar).
// O "ping" (teste da administração) é respondido pelo SmartCanadaRede.h.

// ======================= CONFIGURAÇÃO (troque aqui) =======================
// A rede PRECISA ser de 2,4 GHz. O ESP32 NÃO conecta em rede de 5 GHz.
const char* WIFI_REDE     = "NOME-DA-REDE";            // TROCAR: nome da Wi-Fi do dia
const char* WIFI_SENHA    = "SENHA-DA-REDE";           // TROCAR: senha da Wi-Fi (nunca suba a senha real para o GitHub)
const char* CHAVE_MODULOS = "chave-de-exemplo-troque"; // TROCAR: a mesma "chaveModulos" do servidor
const char* IP_RESERVA    = "192.168.0.10";            // TROCAR: IP do notebook (aparece grande na Administração)
const uint16_t PORTA_RESERVA = 5050;                   // porta do servidor

// Sensores ligados? true: o sketch lê o sensor. false: sensor desligado (ainda não instalado ou sem pino confirmado).
const bool S12_LIGADO = false;  // S12: LDR na frente do bloco
const bool S13_LIGADO = false;  // S13: sensor de presença (PIR)
// S14 (DHT22) precisa da biblioteca "DHT sensor library" (Adafruit). Instale e troque USAR_DHT para 1
// quando o sensor estiver ligado. Com 0, o sketch compila sem ela e o S14 fica desligado.
#define USAR_DHT 0
const bool S14_LIGADO = USAR_DHT;

// MODO_TESTE (uma só, vale para o sketch todo). Padrão false.
//   false: sensor desligado NÃO manda o campo; o cartão do painel mostra "--".
//   true:  sensor desligado manda um valor de teste e a leitura leva "teste": true (o painel mostra "Valor de teste").
const bool MODO_TESTE = false;
// ===========================================================================

const char* MODULO = "residencial";

#include "SmartCanadaRede.h"
#if USAR_DHT
#include <DHT.h>
#endif

// ---- Pinos. Analógico: só ADC1 (32 a 39); os do ADC2 param com a Wi-Fi ligada. ----
const int PINO_DHT         = 4;   // TODO: confirmar pino. S14: DHT22 dentro da casa 1
const int PINO_PIR         = 27;  // TODO: confirmar pino. S13: sensor de presença na frente do bloco
const int PINO_LDR         = 36;  // TODO: confirmar pino. S12: LDR na frente do bloco
const int PINO_LUZ_CASA    = 25;  // TODO: confirmar pino. LEDs das casas
const int PINO_AQUECIMENTO = 26;  // TODO: confirmar pino. LED laranja ou relé do aquecimento
const int PINO_SERVO       = 13;  // TODO: confirmar pino. S15: servo da persiana (casa 2)

// ---- Ajustes (TODO: conferir na maquete) ----
const float LIGA_AQUECIMENTO_ABAIXO = 19.5f;    // °C
const float DESLIGA_AQUECIMENTO_ACIMA = 20.5f;  // °C
const int LDR_ESCURO = 1500;                    // abaixo disso está escuro (0 a 4095)
const int ANGULO_ABERTA = 90;                   // graus do servo com a persiana aberta
const int ANGULO_FECHADA = 0;                   // graus do servo com a persiana fechada

#if USAR_DHT
DHT dht(PINO_DHT, DHT22);
#endif

// ---- Estado ----
enum ModoIluminacao { ILUMINACAO_AUTOMATICA, ILUMINACAO_LIGADA, ILUMINACAO_DESLIGADA };
ModoIluminacao modoIluminacao = ILUMINACAO_AUTOMATICA;
bool persianaAberta = true;
bool aquecimentoLigado = false;
bool presencaAgora = false;
float temperatura = NAN;  // NAN: ainda sem leitura (o campo não é mandado)
float umidade = NAN;

// ---- Servo da persiana (PWM de 50 Hz, sem biblioteca extra) ----
void servoIniciar() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcAttach(PINO_SERVO, 50, 16);
#else
  ledcSetup(0, 50, 16);
  ledcAttachPin(PINO_SERVO, 0);
#endif
}

void servoAngulo(int graus) {
  // 0,5 ms a 2,4 ms dentro de 20 ms (TODO: ajustar se o servo não chegar nas pontas)
  float ms = 0.5f + (constrain(graus, 0, 180) / 180.0f) * 1.9f;
  uint32_t duty = (uint32_t)(ms / 20.0f * 65535.0f);
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  ledcWrite(PINO_SERVO, duty);
#else
  ledcWrite(0, duty);
#endif
}

// S14: temperatura e umidade
void lerTemperaturaUmidade() {
#if USAR_DHT
  float t = dht.readTemperature();
  float u = dht.readHumidity();
  if (!isnan(t) && !isnan(u)) {
    temperatura = t;
    umidade = u;
    return;
  }
  Serial.println("S14 (DHT22) não respondeu: mantendo a última leitura.");
#else
  if (!MODO_TESTE) { avisarSemSensor("S14 (DHT22)"); return; }  // temperatura e umidade ficam NAN
  avisarTeste("S14 (DHT22)");
  temperatura = valorDeTeste(21.0f, 3.5f, 180);
  umidade = valorDeTeste(55.0f, 8.0f, 90);
#endif
}

// S13: presença
bool lerPresenca() {
  if (!S13_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S13 (presença PIR)"); return false; }
    avisarTeste("S13 (presença PIR)");
    return (millis() / 15000) % 3 == 0;  // "alguém em casa" 15 s a cada 45 s
  }
  return digitalRead(PINO_PIR) == HIGH;
}

// S12: está escuro?
bool estaEscuro() {
  if (!S12_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S12 (LDR)"); return false; }  // sem LDR a iluminação automática não acende
    avisarTeste("S12 (LDR)");
    return (millis() / 60000) % 2 == 1;  // alterna a cada minuto
  }
  return analogRead(PINO_LDR) < LDR_ESCURO;
}

void aplicarSaidas() {
  bool luz = modoIluminacao == ILUMINACAO_LIGADA || (modoIluminacao == ILUMINACAO_AUTOMATICA && estaEscuro());
  digitalWrite(PINO_LUZ_CASA, luz ? HIGH : LOW);
  digitalWrite(PINO_AQUECIMENTO, aquecimentoLigado ? HIGH : LOW);
}

// Eco do comando de iluminação, com os valores do contrato.
const char* textoIluminacao() {
  if (modoIluminacao == ILUMINACAO_LIGADA) return "ligada";
  if (modoIluminacao == ILUMINACAO_DESLIGADA) return "desligada";
  return "automatico";
}

// Monta a leitura com os nomes do contrato (docs/API.md).
// Campo de sensor desligado (sem MODO_TESTE) fica de fora: o painel mostra "--".
void montarLeitura(JsonObject dados) {
  if (!isnan(temperatura) && !isnan(umidade)) {
    dados["temperatura_c"] = arred(constrain(temperatura, -10.0f, 60.0f), 1);
    dados["umidade_pct"] = arred(constrain(umidade, 0.0f, 100.0f), 0);
    dados["aquecimento"] = aquecimentoLigado;  // vem da temperatura: sem temperatura, não é mandado
    if (!S14_LIGADO) marcarTeste();
  }
  if (S13_LIGADO || MODO_TESTE) {
    dados["presenca"] = presencaAgora;
    if (!S13_LIGADO) marcarTeste();
  }
  dados["persiana"] = persianaAberta ? "aberta" : "fechada";
  dados["iluminacao"] = textoIluminacao();
}

bool executarComando(const char* comando, const char* valor) {
  if (strcmp(comando, "iluminacao") == 0) {
    if (strcmp(valor, "automatico") == 0) modoIluminacao = ILUMINACAO_AUTOMATICA;
    else if (strcmp(valor, "ligar") == 0) modoIluminacao = ILUMINACAO_LIGADA;
    else if (strcmp(valor, "desligar") == 0) modoIluminacao = ILUMINACAO_DESLIGADA;
    else return false;
    aplicarSaidas();
    redeEnviarAgora();
    return true;
  }
  if (strcmp(comando, "persiana") == 0) {
    if (strcmp(valor, "abrir") == 0) persianaAberta = true;
    else if (strcmp(valor, "fechar") == 0) persianaAberta = false;
    else return false;
    servoAngulo(persianaAberta ? ANGULO_ABERTA : ANGULO_FECHADA);
    redeEnviarAgora();
    return true;
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  analogReadResolution(12);
  pinMode(PINO_PIR, INPUT);
  pinMode(PINO_LUZ_CASA, OUTPUT);
  pinMode(PINO_AQUECIMENTO, OUTPUT);
#if USAR_DHT
  dht.begin();
#endif
  servoIniciar();
  servoAngulo(ANGULO_ABERTA);
  redeIniciar({WIFI_REDE, WIFI_SENHA, CHAVE_MODULOS, MODULO, IP_RESERVA, PORTA_RESERVA});
}

unsigned long ultimaLeituraSensores = 0;

void loop() {
  redeAtualizar();

  // Sensores a cada 0,5 s (o DHT22 não aceita leituras mais rápidas que 2 s; ele guarda a última).
  if (millis() - ultimaLeituraSensores >= 500) {
    ultimaLeituraSensores = millis();
    static unsigned long ultimoDht = 0;
    if (millis() - ultimoDht >= 2000) {
      ultimoDht = millis();
      lerTemperaturaUmidade();
    }

    // Aquecimento automático, com folga para não ficar liga e desliga.
    bool antesAquecimento = aquecimentoLigado;
    if (temperatura < LIGA_AQUECIMENTO_ABAIXO) aquecimentoLigado = true;
    else if (temperatura > DESLIGA_AQUECIMENTO_ACIMA) aquecimentoLigado = false;

    bool antesPresenca = presencaAgora;
    presencaAgora = lerPresenca();

    aplicarSaidas();
    if (antesAquecimento != aquecimentoLigado || antesPresenca != presencaAgora) redeEnviarAgora();
  }
  delay(10);
}
