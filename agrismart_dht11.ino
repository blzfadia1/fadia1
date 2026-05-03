/* ════════════════════════════════════════════════════════════════
   AgriSmart — ESP32 + DHT11 — Code Final v2
   ✅ Envoie zone + RSSI réel + température + humidité air
   ✅ Compatible plateforme AgriSmart MySQL
════════════════════════════════════════════════════════════════ */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>+++

/* ══ MODIFIEZ UNIQUEMENT CES 4 LIGNES ═══════════════════════ */
const char* WIFI_SSID     = "S21 Ultra de Norane";
const char* WIFI_PASSWORD = "ruum1557";
const char* SERVER_URL    = "http://192.168.1.8/agrismart/api/iot_receive.php";
const char* ZONE_LABEL    = "Mon champ — Nord";  // ← Nom de votre zone
/* ════════════════════════════════════════════════════════════ */

const char* NODE_ID   = "ESP32-DHT11";
#define DHT_PIN        4
#define DHT_TYPE       DHT11
#define INTERVALLE     30000   // 30 secondes

DHT dht(DHT_PIN, DHT_TYPE);
int envoisOK = 0, envoisErreur = 0;

/* ══ SETUP ═══════════════════════════════════════════════════ */
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n╔══════════════════════════════════════╗");
  Serial.println("║  AgriSmart — ESP32 + DHT11  v2      ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.printf("Nœud   : %s\n", NODE_ID);
  Serial.printf("Zone   : %s\n", ZONE_LABEL);
  Serial.printf("Serveur: %s\n\n", SERVER_URL);

  dht.begin();
  Serial.println("⏳ Stabilisation DHT11 (2 sec)...");
  delay(2000);
  Serial.println("✅ DHT11 prêt\n");
  connecterWiFi();
}

/* ══ LOOP ════════════════════════════════════════════════════ */
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi perdu — reconnexion...");
    connecterWiFi();
  }

  Serial.println("──────────────────────────────────────");
  Serial.println("📡 Lecture DHT11...");

  float temperature = lireTemperature();
  float humiditeAir = lireHumiditeAir();

  if (isnan(temperature) || isnan(humiditeAir)) {
    Serial.println("❌ Erreur DHT11 — vérifiez le câblage");
    envoisErreur++;
  } else {
    Serial.printf("🌡️  Température  : %.1f °C\n", temperature);
    Serial.printf("💧  Humidité air : %.0f %%\n",  humiditeAir);
    bool ok = envoyerDonnees(temperature, humiditeAir);
    if (ok) envoisOK++; else envoisErreur++;
    Serial.printf("📊  Bilan : %d OK / %d erreurs\n", envoisOK, envoisErreur);
  }
  Serial.printf("⏳ Prochain envoi dans %d sec...\n\n", INTERVALLE/1000);
  delay(INTERVALLE);
}

/* ══ LECTURE ═════════════════════════════════════════════════ */
float lireTemperature() {
  float total = 0; int ok = 0;
  for (int i = 0; i < 3; i++) {
    float t = dht.readTemperature();
    if (!isnan(t) && t > -10 && t < 60) { total += t; ok++; }
    delay(500);
  }
  return ok > 0 ? total/ok : NAN;
}

float lireHumiditeAir() {
  float total = 0; int ok = 0;
  for (int i = 0; i < 3; i++) {
    float h = dht.readHumidity();
    if (!isnan(h) && h >= 0 && h <= 100) { total += h; ok++; }
    delay(500);
  }
  return ok > 0 ? total/ok : NAN;
}

/* ══ ENVOI HTTP ══════════════════════════════════════════════ */
bool envoyerDonnees(float temp, float ha) {
  if (WiFi.status() != WL_CONNECTED) return false;

  StaticJsonDocument<512> doc;
  doc["node_id"]      = NODE_ID;
  doc["zone"]         = ZONE_LABEL;              // ← Zone réelle
  doc["temperature"]  = round(temp * 10) / 10.0;
  doc["humidite_air"] = (int)round(ha);
  doc["humidite_sol"] = nullptr;  // pas de capteur
  doc["ph"]           = nullptr;
  doc["azote"]        = nullptr;
  doc["phosphore"]    = nullptr;
  doc["potassium"]    = nullptr;
  doc["luminosite"]   = nullptr;
  doc["co2"]          = nullptr;
  // RSSI WiFi réel (force du signal)
  char rssiStr[20];
  sprintf(rssiStr, "%d dBm", WiFi.RSSI());
  doc["rssi"]         = rssiStr;
  doc["batterie"]     = 100;     // USB = 100%

  String jsonStr;
  serializeJson(doc, jsonStr);
  Serial.printf("📤 Envoi: %s\n", jsonStr.c_str());

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int code = http.POST(jsonStr);
  String rep = http.getString();
  http.end();

  if (code == 200 || code == 201) {
    Serial.printf("✅ MySQL OK (HTTP %d)\n", code);
    // Afficher les infos de réponse
    StaticJsonDocument<256> resp;
    if (!deserializeJson(resp, rep)) {
      Serial.printf("   ID: %d | Node: %s | T°: %.1f | Ha: %d%%\n",
        (int)resp["id"], (const char*)resp["node_id"],
        (float)resp["temperature"], (int)resp["humidite_air"]);
    }
    return true;
  } else {
    Serial.printf("❌ Erreur HTTP %d — %s\n", code, rep.c_str());
    if (code < 0) {
      Serial.println("   → Vérifiez que XAMPP est lancé");
      Serial.printf("   → IP configurée : %s\n", SERVER_URL);
    }
    return false;
  }
}

/* ══ WIFI ════════════════════════════════════════════════════ */
void connecterWiFi() {
  Serial.printf("📡 Connexion à '%s'", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true);
  int essais = 0;
  while (WiFi.status() != WL_CONNECTED && essais < 20) {
    delay(500); Serial.print("."); essais++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connecté !");
    Serial.printf("   IP ESP32  : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal    : %d dBm\n", WiFi.RSSI());
    Serial.printf("   Serveur   : %s\n", SERVER_URL);
  } else {
    Serial.println("\n❌ Échec WiFi — vérifiez SSID/mot de passe");
  }
}
