// =====================================================================
// SmartCanadaRede.h: rede dos ESP32 da Smart Canada 2050 (comum aos 5 módulos)
// =====================================================================
// Os nomes dos campos são proposta. O grupo precisa confirmar antes de gravar os ESP32.
// Este arquivo NÃO foi compilado, porque o arduino-cli não está instalado no computador
// onde foi escrito. Compile na Arduino IDE 2 antes do dia.
//
// O que ele faz:
//   1. Conecta na Wi-Fi (rede de 2,4 GHz: o ESP32 NÃO conecta em rede de 5 GHz).
//   2. Escuta o anúncio UDP do servidor na porta 5051 ("SMARTCANADA <ip> <porta>").
//      Se não ouvir nada em 10 s, usa o IP e a porta de reserva da CONFIGURAÇÃO do sketch.
//   3. Manda a leitura para http://<servidor>/api/esp/leitura a cada 2 s, e na hora quando
//      o sketch chama redeEnviarAgora().
//   4. Recebe os comandos na resposta, chama executarComando() do sketch e confirma em
//      /api/esp/confirmacao. O comando "ping" é confirmado aqui mesmo, sem acionar nada.
//   5. Reconecta sozinho se a Wi-Fi cair. Escreve tudo no Monitor Serial (115200).
//   6. Se o sketch chamou marcarTeste() ao montar a leitura (valor de teste, MODO_TESTE ligado),
//      acrescenta "teste": true. Sem isso o painel entende que todos os valores são de sensores de verdade.
//
// Bibliotecas: WiFi.h, HTTPClient.h, WiFiUdp.h (vêm com a placa ESP32 da Espressif) e
// ArduinoJson versão 7 (Gerenciador de Bibliotecas).
//
// ATENÇÃO: cada pasta de sketch tem uma CÓPIA deste arquivo, porque a Arduino IDE não acha
// arquivos fora da pasta do sketch. O original fica em esp32/comum/. Se mudar o original,
// copie para as 5 pastas (node ferramentas/conferir-esp32.js --copiar faz isso).
// =====================================================================
#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// ---- O sketch PRECISA ter estas duas funções ----
// Preenche os dados da leitura com os nomes de campo do contrato (docs/API.md).
void montarLeitura(JsonObject dados);
// Executa um comando. Devolve true se executou (aí o painel mostra "Executado").
bool executarComando(const char* comando, const char* valor);

struct SmartCanadaConfig {
  const char* rede;          // nome da Wi-Fi (2,4 GHz)
  const char* senha;         // senha da Wi-Fi
  const char* chave;         // chave dos módulos (a mesma do servidor)
  const char* modulo;        // "energia", "residencial", "centro", "mobilidade" ou "economia"
  const char* ipReserva;     // IP do notebook, se o anúncio UDP não chegar
  uint16_t portaReserva;     // porta do servidor (5050)
};

namespace sc {

const uint16_t PORTA_DESCOBERTA = 5051;
const unsigned long ESPERA_DESCOBERTA_MS = 10000;  // 10 s ouvindo o anúncio
const unsigned long INTERVALO_LEITURA_MS = 2000;   // uma leitura a cada 2 s
const unsigned long INTERVALO_MINIMO_MS = 250;     // "na hora" não manda mais rápido que isso
const unsigned long ESPERA_WIFI_MS = 15000;        // espera da primeira conexão
const unsigned long REPETIR_WIFI_MS = 10000;       // tentativa nova se a Wi-Fi cair
const uint16_t TEMPO_HTTP_MS = 1500;

SmartCanadaConfig cfg;
WiFiUDP udp;
bool udpAberto = false;
String servidorIp = "";
uint16_t servidorPorta = 0;
unsigned long ultimoEnvio = 0;
bool enviarLogo = false;
unsigned long ultimaTentativaWifi = 0;
bool estavaConectado = false;
int falhasSeguidas = 0;
bool testeNaLeitura = false;  // a leitura que está sendo montada tem algum valor de teste

void mostrarConectado() {
  Serial.print("Wi-Fi conectada. IP deste ESP32: ");
  Serial.println(WiFi.localIP());
}

void conectarWifi(bool esperar) {
  ultimaTentativaWifi = millis();
  Serial.printf("Conectando na Wi-Fi \"%s\" (precisa ser rede de 2,4 GHz)...\n", cfg.rede);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.disconnect();
  WiFi.begin(cfg.rede, cfg.senha);
  if (!esperar) return;
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < ESPERA_WIFI_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    estavaConectado = true;
    mostrarConectado();
  } else {
    Serial.println("NÃO conectou. Confira: nome e senha da rede, se a rede é de 2,4 GHz");
    Serial.println("(5 GHz não funciona) e a distância do roteador. Vou tentar de novo sozinho.");
  }
}

void abrirUdp() {
  if (udpAberto) return;
  udpAberto = udp.begin(PORTA_DESCOBERTA);
  if (!udpAberto) Serial.println("Não consegui abrir a porta UDP 5051: vou usar o IP de reserva.");
}

// Lê um anúncio "SMARTCANADA <ip> <porta>", se tiver chegado. Devolve true se leu.
bool lerAnuncio() {
  if (!udpAberto) return false;
  int tamanho = udp.parsePacket();
  if (tamanho <= 0) return false;
  char texto[64];
  int n = udp.read(texto, sizeof(texto) - 1);
  if (n <= 0) return false;
  texto[n] = 0;
  char ip[20];
  unsigned int porta = 0;
  if (sscanf(texto, "SMARTCANADA %19s %u", ip, &porta) != 2) return false;
  if (servidorIp != ip || servidorPorta != porta) {
    servidorIp = ip;
    servidorPorta = (uint16_t)porta;
    Serial.printf("Servidor achado pelo anúncio: %s:%u\n", ip, porta);
  }
  return true;
}

// Escuta o anúncio por até 10 s. Se não chegar, usa o IP de reserva.
void descobrir() {
  abrirUdp();
  Serial.println("Procurando o servidor (anúncio UDP na porta 5051, até 10 s)...");
  unsigned long t0 = millis();
  while (millis() - t0 < ESPERA_DESCOBERTA_MS) {
    if (lerAnuncio()) return;
    delay(50);
  }
  servidorIp = cfg.ipReserva;
  servidorPorta = cfg.portaReserva;
  Serial.printf("Não ouvi o anúncio. Usando o IP de reserva %s:%u\n", servidorIp.c_str(), servidorPorta);
}

String url(const char* caminho) {
  return String("http://") + servidorIp + ":" + String(servidorPorta) + caminho;
}

// POST com JSON. Devolve o código HTTP (ou um número negativo se nem chegou ao servidor).
int postar(const char* caminho, const String& corpo, String& resposta) {
  HTTPClient http;
  http.setTimeout(TEMPO_HTTP_MS);
  if (!http.begin(url(caminho))) return -1;
  http.addHeader("Content-Type", "application/json");
  int codigo = http.POST(corpo);
  if (codigo > 0) resposta = http.getString();
  http.end();
  return codigo;
}

void confirmar(const char* id) {
  JsonDocument doc;
  doc["modulo"] = cfg.modulo;
  doc["chave"] = cfg.chave;
  doc["id"] = id;
  String corpo, resposta;
  serializeJson(doc, corpo);
  int codigo = postar("/api/esp/confirmacao", corpo, resposta);
  if (codigo == 200) Serial.printf("Confirmado: %s\n", id);
  else if (codigo == 404) Serial.printf("O servidor não achou o comando %s (passou de 30 s?)\n", id);
  else Serial.printf("Confirmação de %s falhou (código %d)\n", id, codigo);
}

void tratarComandos(JsonArray comandos) {
  for (JsonVariant item : comandos) {
    JsonObject c = item.as<JsonObject>();
    const char* id = c["id"] | "";
    const char* comando = c["comando"] | "";
    const char* valor = c["valor"] | "";
    Serial.printf("Comando recebido: %s = %s (%s)\n", comando, valor, id);
    bool executou;
    if (strcmp(comando, "ping") == 0) {
      Serial.println("ping: só confirma, não aciona nada.");
      executou = true;
    } else {
      executou = executarComando(comando, valor);
    }
    if (executou) confirmar(id);
    else Serial.println("Comando NÃO executado: o painel vai mostrar \"Sem resposta\".");
  }
}

void enviarLeitura() {
  JsonDocument doc;
  doc["modulo"] = cfg.modulo;
  doc["chave"] = cfg.chave;
  JsonObject dados = doc["dados"].to<JsonObject>();
  testeNaLeitura = false;
  montarLeitura(dados);
  if (testeNaLeitura) dados["teste"] = true;  // o painel mostra "Valor de teste"
  String corpo, resposta;
  serializeJson(doc, corpo);

  int codigo = postar("/api/esp/leitura", corpo, resposta);
  if (codigo <= 0) {
    falhasSeguidas++;
    Serial.printf("Sem resposta do servidor %s:%u (falha %d seguida).\n", servidorIp.c_str(), servidorPorta, falhasSeguidas);
    if (falhasSeguidas == 5) {
      Serial.println("Confira: o servidor está ligado? O firewall do notebook deixou o Node usar a rede?");
      Serial.println("Se o notebook trocar de IP, o próximo anúncio UDP corrige sozinho.");
    }
    return;
  }
  falhasSeguidas = 0;
  if (codigo == 401) {
    Serial.println("Chave errada: confira CHAVE_MODULOS (tem que ser a mesma do servidor).");
    return;
  }
  if (codigo != 200) {
    Serial.printf("Servidor respondeu %d: %s\n", codigo, resposta.c_str());
    return;
  }
  JsonDocument r;
  if (deserializeJson(r, resposta)) {
    Serial.println("Resposta do servidor ilegível.");
    return;
  }
  const char* ignorada = r["ignorada"] | "";
  if (strcmp(ignorada, "demo") == 0) {
    Serial.println("Leitura recebida, mas o painel está no modo demonstração. Na Administração, escolha \"Real (ESP32)\".");
  } else if (strcmp(ignorada, "desativado") == 0) {
    Serial.println("Leitura recebida, mas este módulo está desativado pela administração.");
  }
  for (JsonVariant aviso : r["avisos"].as<JsonArray>()) {
    Serial.printf("Aviso do servidor: %s\n", aviso.as<const char*>());
  }
  tratarComandos(r["comandos"].as<JsonArray>());
}

}  // namespace sc

// ---- Funções que o sketch usa ----

// Chame no setup(), depois de Serial.begin(115200).
void redeIniciar(const SmartCanadaConfig& config) {
  sc::cfg = config;
  Serial.println();
  Serial.printf("=== Smart Canada 2050: módulo %s ===\n", config.modulo);
  sc::conectarWifi(true);
  if (WiFi.status() == WL_CONNECTED) sc::descobrir();
}

// Chame no loop(), sempre. Cuida da Wi-Fi, do anúncio e do envio a cada 2 s.
void redeAtualizar() {
  if (WiFi.status() != WL_CONNECTED) {
    if (sc::estavaConectado) {
      Serial.println("A Wi-Fi caiu. Tentando reconectar...");
      sc::estavaConectado = false;
    }
    if (millis() - sc::ultimaTentativaWifi > sc::REPETIR_WIFI_MS) sc::conectarWifi(false);
    return;
  }
  if (!sc::estavaConectado) {
    sc::estavaConectado = true;
    sc::mostrarConectado();
  }
  if (sc::servidorIp.length() == 0) sc::descobrir();
  sc::lerAnuncio();  // o notebook mudou de IP? o anúncio atualiza sozinho

  unsigned long agora = millis();
  unsigned long passou = agora - sc::ultimoEnvio;
  if (passou >= sc::INTERVALO_LEITURA_MS || (sc::enviarLogo && passou >= sc::INTERVALO_MINIMO_MS)) {
    sc::enviarLogo = false;
    sc::ultimoEnvio = agora;
    sc::enviarLeitura();
  }
}

// Chame quando algo mudar (ex.: presença detectada): a leitura sai na hora.
void redeEnviarAgora() { sc::enviarLogo = true; }

// ---- Ajudantes para os sketches ----

// Arredonda para N casas (o painel mostra 1 ou 2 casas).
float arred(float valor, int casas) {
  float fator = powf(10.0f, (float)casas);
  return roundf(valor * fator) / fator;
}

// ---- Modo de teste (constante MODO_TESTE, no topo de cada sketch; padrão false) ----
// Sensor desligado (constante SX_LIGADO = false) e MODO_TESTE false: o sketch NÃO manda o campo e o painel mostra "--".
// Sensor desligado e MODO_TESTE true: o sketch manda um valor de teste e chama marcarTeste(); a leitura sai com
// "teste": true e o painel mostra o selo "Valor de teste" (e a pílula do topo diz "Teste", não "Ao vivo").

// Chame sempre que um valor de teste entrar na leitura que está sendo montada.
void marcarTeste() { sc::testeNaLeitura = true; }

// Valor de teste que varia devagar, para o painel mostrar movimento (só no MODO_TESTE).
float valorDeTeste(float base, float variacao, float periodoSegundos) {
  float t = millis() / 1000.0f;
  return base + variacao * sinf(2.0f * PI * t / periodoSegundos);
}

namespace sc {
// true se já faz 10 s (ou é a primeira vez) que este sensor avisou no Serial.
bool avisoLiberado(const char* sensor) {
  static const char* nomes[24];
  static unsigned long quando[24];
  static int total = 0;
  int i = 0;
  while (i < total && strcmp(nomes[i], sensor) != 0) i++;
  if (i == total) {
    if (total == 24) return false;
    nomes[total] = sensor;
    quando[total] = 0;
    total++;
  }
  if (quando[i] != 0 && millis() - quando[i] < 10000) return false;
  quando[i] = millis() | 1;  // nunca zero
  return true;
}
}  // namespace sc

// MODO_TESTE ligado e sensor desligado: avisa no Serial (no máximo a cada 10 s por sensor).
void avisarTeste(const char* sensor) {
  if (!sc::avisoLiberado(sensor)) return;
  Serial.printf("[teste] %s ainda não está ligado: mandando valor de teste.\n", sensor);
}

// MODO_TESTE desligado e sensor desligado: avisa no Serial que o campo não está sendo mandado.
void avisarSemSensor(const char* sensor) {
  if (!sc::avisoLiberado(sensor)) return;
  Serial.printf("[sem sensor] %s está desligado: o campo não é mandado (o painel mostra \"--\").\n", sensor);
}
