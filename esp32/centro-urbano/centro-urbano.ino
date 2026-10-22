// =====================================================================
// Smart Canada 2050: ESP32 do CENTRO URBANO (E2, bloco 3)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este sketch NÃO foi compilado, porque o arduino-cli não está instalado. Compile na Arduino IDE 2.
//
// Manda ao painel: postes, semaforo, vagas_livres.
// Sem comandos de usuário. O "ping" (teste da administração) é respondido pelo SmartCanadaRede.h.

// ======================= CONFIGURAÇÃO (troque aqui) =======================
// A rede PRECISA ser de 2,4 GHz. O ESP32 NÃO conecta em rede de 5 GHz.
const char* WIFI_REDE     = "NOME-DA-REDE";            // TROCAR: nome da Wi-Fi do dia
const char* WIFI_SENHA    = "SENHA-DA-REDE";           // TROCAR: senha da Wi-Fi (nunca suba a senha real para o GitHub)
const char* CHAVE_MODULOS = "chave-de-exemplo-troque"; // TROCAR: a mesma "chaveModulos" do servidor
const char* IP_RESERVA    = "192.168.0.10";            // TROCAR: IP do notebook (aparece grande na Administração)
const uint16_t PORTA_RESERVA = 5050;                   // porta do servidor

// Sensores ligados? true: o sketch lê o sensor. false: sensor desligado (ainda não instalado ou sem pino confirmado).
const bool S3_LIGADO = false;       // S3: LDR do Centro Urbano (decide os postes)
const bool VAGAS_LIGADAS = false;   // S4 a S7: sensores das vagas
const bool S8_S9_LIGADOS = false;   // S8 e S9: sensores da avenida (só alongam o verde; não são mandados ao painel)

// MODO_TESTE (uma só, vale para o sketch todo). Padrão false.
//   false: sensor desligado NÃO manda o campo; o cartão do painel mostra "--".
//   true:  sensor desligado manda um valor de teste e a leitura leva "teste": true (o painel mostra "Valor de teste").
const bool MODO_TESTE = false;
// ===========================================================================

const char* MODULO = "centro";

#include "SmartCanadaRede.h"

// ---- Pinos. Analógico: só ADC1 (32 a 39); os do ADC2 param com a Wi-Fi ligada. ----
const int PINO_LDR         = 39;  // TODO: confirmar pino. S3: LDR do Centro Urbano
const int PINO_POSTES      = 23;  // TODO: confirmar pino. LEDs dos postes (por transistor)
const int PINO_VERMELHO    = 19;  // TODO: confirmar pino. Semáforo, luz vermelha
const int PINO_AMARELO     = 18;  // TODO: confirmar pino. Semáforo, luz amarela
const int PINO_VERDE       = 5;   // TODO: confirmar pino. Semáforo, luz verde
const int PINOS_VAGA[4]    = {13, 14, 16, 17};  // TODO: confirmar pinos. S4, S5, S6, S7: sensores das vagas
const int PINO_VEICULO_S8  = 32;  // TODO: confirmar pino. S8: veículo na avenida
const int PINO_VEICULO_S9  = 33;  // TODO: confirmar pino. S9: veículo na avenida

// ---- Ajustes (TODO: conferir na maquete) ----
const int LDR_ESCURO = 1500;                 // abaixo disso está escuro (0 a 4095)
const int VAGA_OCUPADA = LOW;                // sensor infravermelho: LOW quando tem carro em cima
const unsigned long TEMPO_VERDE_MS = 6000;
const unsigned long TEMPO_AMARELO_MS = 2000;
const unsigned long TEMPO_VERMELHO_MS = 6000;
const unsigned long VERDE_EXTRA_MS = 4000;   // verde mais longo quando tem carro na avenida

// ---- Estado ----
enum CorSemaforo { VERDE, AMARELO, VERMELHO };
CorSemaforo semaforo = VERDE;
unsigned long inicioCor = 0;
bool postesLigados = false;
int vagasLivres = 4;

// S3: está escuro?
bool estaEscuro() {
  if (!S3_LIGADO) {
    if (!MODO_TESTE) { avisarSemSensor("S3 (LDR)"); return false; }  // sem LDR os postes ficam apagados
    avisarTeste("S3 (LDR)");
    return (millis() / 60000) % 2 == 1;  // alterna a cada minuto
  }
  return analogRead(PINO_LDR) < LDR_ESCURO;
}

// S4 a S7: quantas vagas livres
int lerVagasLivres() {
  if (!VAGAS_LIGADAS) {
    if (!MODO_TESTE) { avisarSemSensor("S4 a S7 (vagas)"); return vagasLivres; }  // o campo não é mandado
    avisarTeste("S4 a S7 (vagas)");
    return (millis() / 20000) % 5;  // muda a cada 20 s: 0, 1, 2, 3, 4
  }
  int livres = 0;
  for (int i = 0; i < 4; i++) {
    if (digitalRead(PINOS_VAGA[i]) != VAGA_OCUPADA) livres++;
  }
  return livres;
}

// S8 e S9: tem carro esperando na avenida?
bool carroNaAvenida() {
  if (!S8_S9_LIGADOS) return false;
  return digitalRead(PINO_VEICULO_S8) == LOW || digitalRead(PINO_VEICULO_S9) == LOW;
}

void acenderSemaforo() {
  digitalWrite(PINO_VERMELHO, semaforo == VERMELHO ? HIGH : LOW);
  digitalWrite(PINO_AMARELO, semaforo == AMARELO ? HIGH : LOW);
  digitalWrite(PINO_VERDE, semaforo == VERDE ? HIGH : LOW);
}

// Semáforo inteligente: verde 6 s, amarelo 2 s, vermelho 6 s.
// Com carro na avenida (S8 ou S9), o verde dura até 4 s a mais.
void atualizarSemaforo() {
  unsigned long passou = millis() - inicioCor;
  CorSemaforo antes = semaforo;
  if (semaforo == VERDE) {
    unsigned long limite = TEMPO_VERDE_MS + (carroNaAvenida() ? VERDE_EXTRA_MS : 0);
    if (passou >= limite) semaforo = AMARELO;
  } else if (semaforo == AMARELO) {
    if (passou >= TEMPO_AMARELO_MS) semaforo = VERMELHO;
  } else {
    if (passou >= TEMPO_VERMELHO_MS) semaforo = VERDE;
  }
  if (semaforo != antes) {
    inicioCor = millis();
    acenderSemaforo();
    redeEnviarAgora();
  }
}

// Cor do semáforo com os valores do contrato.
const char* textoSemaforo() {
  if (semaforo == AMARELO) return "amarelo";
  if (semaforo == VERMELHO) return "vermelho";
  return "verde";
}

// Monta a leitura com os nomes do contrato (docs/API.md).
// Campo de sensor desligado (sem MODO_TESTE) fica de fora: o painel mostra "--".
// O semáforo é do próprio ESP32 (não depende de sensor): vale como valor de verdade.
void montarLeitura(JsonObject dados) {
  if (S3_LIGADO || MODO_TESTE) {
    dados["postes"] = postesLigados ? "ligados" : "desligados";
    if (!S3_LIGADO) marcarTeste();
  }
  dados["semaforo"] = textoSemaforo();
  if (VAGAS_LIGADAS || MODO_TESTE) {
    dados["vagas_livres"] = vagasLivres;
    if (!VAGAS_LIGADAS) marcarTeste();
  }
}

// Centro Urbano não tem comandos de usuário. O ping já foi confirmado pelo SmartCanadaRede.h.
bool executarComando(const char* comando, const char* valor) {
  Serial.printf("O Centro Urbano não tem o comando %s.\n", comando);
  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  analogReadResolution(12);
  pinMode(PINO_POSTES, OUTPUT);
  pinMode(PINO_VERMELHO, OUTPUT);
  pinMode(PINO_AMARELO, OUTPUT);
  pinMode(PINO_VERDE, OUTPUT);
  for (int i = 0; i < 4; i++) pinMode(PINOS_VAGA[i], INPUT_PULLUP);
  pinMode(PINO_VEICULO_S8, INPUT_PULLUP);
  pinMode(PINO_VEICULO_S9, INPUT_PULLUP);
  inicioCor = millis();
  acenderSemaforo();
  redeIniciar({WIFI_REDE, WIFI_SENHA, CHAVE_MODULOS, MODULO, IP_RESERVA, PORTA_RESERVA});
}

void loop() {
  redeAtualizar();
  atualizarSemaforo();

  bool antesPostes = postesLigados;
  postesLigados = estaEscuro();  // anoitecer: o visitante cobre o LDR e os postes acendem
  digitalWrite(PINO_POSTES, postesLigados ? HIGH : LOW);

  int antesVagas = vagasLivres;
  vagasLivres = lerVagasLivres();

  if (antesPostes != postesLigados || antesVagas != vagasLivres) redeEnviarAgora();
  delay(10);
}
