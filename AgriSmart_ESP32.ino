/* ════════════════════════════════════════════════════════════════
   AgriSmart — Code ESP32 Complet
   Capteurs : DHT22 (Temp + Humidité air) + Humidité sol + pH
   Envoi JSON vers XAMPP toutes les 10 secondes
   
   ■ LIBRAIRIES à installer (Arduino IDE → Gestionnaire de bibliothèques) :
     - DHT sensor library (Adafruit)
     - Adafruit Unified Sensor (Adafruit)
     - ArduinoJson (Benoit Blanchon) ← version 6.x
     
   ■ Carte à sélectionner : ESP32 Dev Module
   ■ Tester via : http://VOTRE_IP/agrismart/api/iot_receive.php
════════════════════════════════════════════════════════════════ */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

/* ══════════════════════════════════════════════════════════════
   ■ CONFIGURATION — À MODIFIER OBLIGATOIREMENT
══════════════════════════════════════════════════════════════ */

// ── WiFi ──────────────────────────────────────────────────────
const char* WIFI_SSID     = "TON_NOM_WIFI";        // ← Votre nom WiFi
const char* WIFI_PASSWORD = "TON_MOT_DE_PASSE";    // ← Votre mot de passe WiFi

// ── Serveur XAMPP ─────────────────────────────────────────────
// Obtenir l'IP : ouvrir cmd Windows → taper "ipconfig" → chercher "Adresse IPv4"
const char* SERVER_IP  = "192.168.1.15";           // ← Votre IP (exemple)
const char* SERVER_URL = "http://192.168.1.15/agrismart/api/iot_receive.php";

// ── Identifiant de ce nœud ESP32 ─────────────────────────────
const char* NODE_ID = "ESP32-01";                  // ← Changer pour chaque ESP32

/* ══════════════════════════════════════════════════════════════
   ■ BROCHAGE — Connexion des capteurs
══════════════════════════════════════════════════════════════ */

// DHT22 (Température + Humidité air)
#define DHT_PIN    4          // GPIO 4 → Data du DHT22
#define DHT_TYPE   DHT22

// Humidité sol (capteur analogique YL-69 ou FC-28)
#define HUMID_SOL_PIN  34     // GPIO 34 (entrée analogique ADC1)
// Valeurs de calibration humidité sol (à ajuster selon votre capteur)
#define HUMID_SOL_SEC  4095   // Valeur ADC quand sol sec (0% humidité)
#define HUMID_SOL_EAU  0      // Valeur ADC quand dans l'eau (100% humidité)

// pH mètre (module analogique SEN0161 ou similaire)
#define PH_PIN  35            // GPIO 35 (entrée analogique ADC1)
// Calibration pH (à ajuster avec solution tampon)
#define PH_OFFSET  0.0        // Décalage de calibration
// Voltage de référence ESP32
#define ADC_VREF   3.3
#define ADC_RESOLUTION 4096

// NPK (si disponible — désactiver avec false si absent)
#define NPK_DISPONIBLE false

/* ══════════════════════════════════════════════════════════════
   ■ PARAMÈTRES
══════════════════════════════════════════════════════════════ */
#define INTERVALLE_ENVOI  10000  // 10 secondes entre chaque envoi
#define TIMEOUT_HTTP      10000  // 10 secondes timeout connexion
#define MAX_RETRY_WIFI    20     // Tentatives max connexion WiFi

/* ══════════════════════════════════════════════════════════════
   VARIABLES GLOBALES
══════════════════════════════════════════════════════════════ */
DHT dht(DHT_PIN, DHT_TYPE);
int  erreurWifi   = 0;
int  mesuresOK    = 0;
int  mesuresErreur = 0;

/* ══════════════════════════════════════════════════════════════
   SETUP
══════════════════════════════════════════════════════════════ */
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n========================================");
  Serial.println("   AgriSmart ESP32 — Démarrage");
  Serial.println("========================================");
  Serial.printf("   Nœud ID : %s\n", NODE_ID);
  Serial.printf("   Serveur  : %s\n", SERVER_URL);
  Serial.println("========================================\n");

  // Initialiser DHT22
  dht.begin();
  Serial.println("✅ DHT22 initialisé (GPIO " + String(DHT_PIN) + ")");

  // Configurer les entrées analogiques
  analogSetAttenuation(ADC_11db);  // 0-3.3V full range
  Serial.println("✅ ADC configuré (11dB, 0-3.3V)");

  // Connexion WiFi
  connecterWiFi();
}

/* ══════════════════════════════════════════════════════════════
   LOOP PRINCIPAL
══════════════════════════════════════════════════════════════ */
void loop() {
  
  // Reconnecter WiFi si déconnecté
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi perdu — reconnexion...");
    connecterWiFi();
  }

  Serial.println("\n──────────────────────────────────");
  Serial.println("📡 Lecture des capteurs...");

  // ── Lire DHT22 ───────────────────────────────────────────
  float temperature = lireTemperature();
  float humiditeAir = lireHumiditeAir();

  // ── Lire humidité sol ────────────────────────────────────
  float humiditeSol = lireHumiditeSol();

  // ── Lire pH ──────────────────────────────────────────────
  float ph = lirePH();

  // ── Afficher dans le moniteur série ─────────────────────
  Serial.println("📊 Valeurs mesurées :");
  Serial.printf("   🌡️  Température   : %.1f °C\n",  temperature);
  Serial.printf("   💧  Humidité air  : %.0f %%\n",   humiditeAir);
  Serial.printf("   💧  Humidité sol  : %.0f %%\n",   humiditeSol);
  Serial.printf("   🧪  pH sol        : %.2f\n",      ph);

  // ── Envoyer vers XAMPP ───────────────────────────────────
  if (!isnan(temperature) && !isnan(humiditeAir)) {
    bool ok = envoyerDonnees(temperature, humiditeAir, humiditeSol, ph);
    if (ok) {
      mesuresOK++;
      Serial.printf("✅ Total envois réussis : %d\n", mesuresOK);
    } else {
      mesuresErreur++;
      Serial.printf("❌ Total erreurs : %d\n", mesuresErreur);
    }
  } else {
    Serial.println("❌ Erreur DHT22 — vérifiez le câblage");
    mesuresErreur++;
  }

  // ── Attendre avant prochain envoi ───────────────────────
  Serial.printf("⏳ Prochain envoi dans %d secondes...\n", INTERVALLE_ENVOI/1000);
  delay(INTERVALLE_ENVOI);
}

/* ══════════════════════════════════════════════════════════════
   FONCTIONS DE LECTURE CAPTEURS
══════════════════════════════════════════════════════════════ */

float lireTemperature() {
  // Lire 3 fois et faire la moyenne pour plus de précision
  float total = 0; int valides = 0;
  for (int i = 0; i < 3; i++) {
    float t = dht.readTemperature();
    if (!isnan(t) && t > -40 && t < 80) { total += t; valides++; }
    delay(100);
  }
  return (valides > 0) ? (total / valides) : NAN;
}

float lireHumiditeAir() {
  float total = 0; int valides = 0;
  for (int i = 0; i < 3; i++) {
    float h = dht.readHumidity();
    if (!isnan(h) && h >= 0 && h <= 100) { total += h; valides++; }
    delay(100);
  }
  return (valides > 0) ? (total / valides) : NAN;
}

float lireHumiditeSol() {
  // Lire 5 fois et faire la moyenne (ADC est bruité sur ESP32)
  long total = 0;
  for (int i = 0; i < 5; i++) {
    total += analogRead(HUMID_SOL_PIN);
    delay(50);
  }
  int adc = total / 5;
  
  // Convertir en pourcentage (0-100%)
  float pct = map(adc, HUMID_SOL_SEC, HUMID_SOL_EAU, 0, 100);
  pct = constrain(pct, 0, 100);
  
  Serial.printf("   [Sol ADC=%d → %d%%]\n", adc, (int)pct);
  return pct;
}

float lirePH() {
  // Lire 10 fois pour stabiliser la lecture analogique
  long total = 0;
  for (int i = 0; i < 10; i++) {
    total += analogRead(PH_PIN);
    delay(30);
  }
  int adc = total / 10;
  
  // Convertir ADC → Voltage → pH
  float voltage = (adc / (float)ADC_RESOLUTION) * ADC_VREF;
  
  // Formule de conversion pH (calibrée pour module pH v2.0)
  // pH = 7 - ((voltage - 2.5) / 0.18)
  // ■ Ajuster selon votre calibration avec solutions tampon pH 4 et pH 7
  float ph = 7.0 - ((voltage - 2.5) / 0.18) + PH_OFFSET;
  ph = constrain(ph, 0.0, 14.0);
  
  Serial.printf("   [pH ADC=%d, V=%.2fV → pH=%.2f]\n", adc, voltage, ph);
  return ph;
}

/* ══════════════════════════════════════════════════════════════
   ENVOI HTTP VERS XAMPP
══════════════════════════════════════════════════════════════ */

bool envoyerDonnees(float temp, float ha, float hs, float ph) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Pas de WiFi — impossible d'envoyer");
    return false;
  }

  // ── Construire le JSON ────────────────────────────────────
  StaticJsonDocument<512> doc;
  doc["node_id"]      = NODE_ID;
  doc["temperature"]  = round(temp * 10) / 10.0;   // 1 décimale
  doc["humidite_air"] = (int)ha;
  doc["humidite_sol"] = (int)hs;
  doc["ph"]           = round(ph * 100) / 100.0;   // 2 décimales
  
  // Valeurs NPK — simulées si capteur absent
  if (NPK_DISPONIBLE) {
    // TODO: remplacer par vos lectures réelles
    doc["azote"]     = 60;
    doc["phosphore"] = 40;
    doc["potassium"] = 40;
  } else {
    // Valeurs par défaut raisonnables
    doc["azote"]     = 60;
    doc["phosphore"] = 40;
    doc["potassium"] = 40;
  }
  
  doc["luminosite"] = 800;     // TODO: ajouter capteur BH1750 si dispo
  doc["co2"]        = 400;     // TODO: ajouter capteur MH-Z19 si dispo
  doc["rssi"]       = String(WiFi.RSSI()) + " dBm";
  doc["batterie"]   = 100;     // TODO: lire niveau batterie si dispo

  String jsonStr;
  serializeJson(doc, jsonStr);
  
  Serial.printf("📤 Envoi vers %s\n", SERVER_URL);
  Serial.printf("   JSON: %s\n", jsonStr.c_str());

  // ── Envoyer la requête HTTP POST ─────────────────────────
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(TIMEOUT_HTTP);

  int httpCode = http.POST(jsonStr);
  String response = http.getString();
  http.end();

  if (httpCode == 201) {
    Serial.printf("✅ HTTP %d — Sauvegardé dans MySQL\n", httpCode);
    Serial.printf("   Réponse: %s\n", response.c_str());
    return true;
  } else {
    Serial.printf("❌ HTTP %d — Erreur envoi\n", httpCode);
    Serial.printf("   Réponse: %s\n", response.c_str());
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════
   CONNEXION WIFI
══════════════════════════════════════════════════════════════ */

void connecterWiFi() {
  Serial.printf("📡 Connexion WiFi à '%s'", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true);

  int tentatives = 0;
  while (WiFi.status() != WL_CONNECTED && tentatives < MAX_RETRY_WIFI) {
    delay(500);
    Serial.print(".");
    tentatives++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connecté !");
    Serial.printf("   IP ESP32  : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal    : %d dBm\n", WiFi.RSSI());
    Serial.printf("   Serveur   : %s\n", SERVER_URL);
    erreurWifi = 0;
  } else {
    Serial.println("\n❌ Échec WiFi — passage en mode hors-ligne");
    erreurWifi++;
    // Continuer sans WiFi — les données seront perdues
  }
}
