<?php
/* ════════════════════════════════════════════════════════════════
   AgriSmart — api/chat.php
   Proxy serveur → Anthropic Claude API
   
   ✅ Résout tous les problèmes CORS
   ✅ La clé API ne sort jamais du serveur
   ✅ Compatible avec 10_chat_mysql.js (remplace Gemini)
   ✅ Contexte MySQL live injecté automatiquement
   
   Placer dans : C:/xampp/htdocs/agrismart/api/chat.php
════════════════════════════════════════════════════════════════ */

ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
ob_end_clean();
ob_start();

// ── Headers CORS / JSON ──────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean();
    http_response_code(405);
    die(json_encode(['success' => false, 'message' => 'Méthode non autorisée. Utilisez POST.']));
}

// ════════════════════════════════════════════════════════════
//  ⚠️  CONFIGURATION — METTEZ VOTRE CLÉ ANTHROPIC ICI
//  Obtenez une clé gratuite sur : https://console.anthropic.com
// ════════════════════════════════════════════════════════════
define('ANTHROPIC_API_KEY', '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');
// ════════════════════════════════════════════════════════════

define('CLAUDE_MODEL',   'claude-haiku-4-5-20251001');  // Rapide et gratuit
define('MAX_TOKENS',     900);

// ── Connexion MySQL (optionnelle — pour contexte live) ───────
function getDB_chat() {
    try {
        $pdo = new PDO(
            'mysql:host=localhost;dbname=agrismart;charset=utf8mb4',
            'root', '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
             PDO::ATTR_TIMEOUT => 2]
        );
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

// ── Récupérer le contexte live MySQL ────────────────────────
function getLiveContext() {
    $db = getDB_chat();
    if (!$db) return "Mode hors-ligne — données MySQL non disponibles.";

    $parts = [];

    try {
        // Derniers capteurs (moyennes des 10 dernières mesures)
        $stmt = $db->query("
            SELECT 
                node_id,
                ROUND(AVG(temperature),1) as temperature,
                ROUND(AVG(humidite_sol)) as humidite_sol,
                ROUND(AVG(humidite_air)) as humidite_air,
                ROUND(AVG(ph),1) as ph,
                ROUND(AVG(azote)) as azote,
                ROUND(AVG(phosphore)) as phosphore,
                ROUND(AVG(potassium)) as potassium,
                ROUND(AVG(luminosite)) as luminosite,
                ROUND(AVG(co2)) as co2
            FROM (
                SELECT * FROM capteurs ORDER BY created_at DESC LIMIT 50
            ) recent
            GROUP BY node_id
            ORDER BY node_id
            LIMIT 6
        ");
        $capteurs = $stmt->fetchAll();

        if (!empty($capteurs)) {
            $lines = [];
            foreach ($capteurs as $c) {
                $hsFlag = '';
                if ($c['humidite_sol'] !== null) {
                    $hsFlag = $c['humidite_sol'] < 20 ? ' ⚠️URGENT' : ($c['humidite_sol'] < 35 ? ' ⚠️faible' : ' ✅');
                }
                $phFlag = '';
                if ($c['ph'] !== null) {
                    $phFlag = $c['ph'] < 5.5 ? ' ⚠️acide' : ($c['ph'] > 7.5 ? ' ⚠️alcalin' : ' ✅');
                }
                $lines[] = "- {$c['node_id']}: T°={$c['temperature']}°C | H.sol={$c['humidite_sol']}%{$hsFlag} | pH={$c['ph']}{$phFlag} | N={$c['azote']}kg | P={$c['phosphore']}kg | K={$c['potassium']}kg | Lux={$c['luminosite']} | CO2={$c['co2']}ppm";
            }
            $parts[] = "## CAPTEURS IoT EN TEMPS RÉEL (" . count($capteurs) . " nœuds)\n" . implode("\n", $lines);
        }
    } catch (Exception $e) {}

    try {
        // Alertes non lues
        $stmt = $db->query("SELECT type, titre, description FROM alertes WHERE lue=0 ORDER BY created_at DESC LIMIT 5");
        $alertes = $stmt->fetchAll();
        if (!empty($alertes)) {
            $lines = [];
            foreach ($alertes as $a) {
                $lines[] = "- [{$a['type']}] {$a['titre']}: " . ($a['description'] ?? '');
            }
            $parts[] = "## ALERTES ACTIVES (" . count($alertes) . ")\n" . implode("\n", $lines);
        } else {
            $parts[] = "## ALERTES : Aucune alerte active ✅";
        }
    } catch (Exception $e) {}

    try {
        // Nœuds IoT
        $stmt = $db->query("SELECT node_id, zone, batterie, rssi, sf, statut FROM noeuds_iot ORDER BY node_id LIMIT 6");
        $noeuds = $stmt->fetchAll();
        if (!empty($noeuds)) {
            $on = count(array_filter($noeuds, fn($n) => $n['statut'] === 'online'));
            $lines = [];
            foreach ($noeuds as $n) {
                $lines[] = "- {$n['node_id']}|{$n['zone']}|Bat:{$n['batterie']}%|RSSI:{$n['rssi']}|SF:{$n['sf']}|{$n['statut']}";
            }
            $parts[] = "## NŒUDS IoT (" . count($noeuds) . " total, $on en ligne)\n" . implode("\n", $lines);
        }
    } catch (Exception $e) {}

    try {
        // Dernière prédiction RF
        $stmt = $db->query("SELECT culture, emoji, confiance, ph, humidite_sol, temperature FROM predictions_rf ORDER BY created_at DESC LIMIT 1");
        $rf = $stmt->fetch();
        if ($rf) {
            $parts[] = "## DERNIÈRE PRÉDICTION RF\n- Culture : {$rf['emoji']} {$rf['culture']} | Confiance : {$rf['confiance']}% | pH:{$rf['ph']}, Hs:{$rf['humidite_sol']}%, T:{$rf['temperature']}°C";
        }
    } catch (Exception $e) {}

    return !empty($parts) ? implode("\n\n", $parts) : "Aucune donnée MySQL disponible pour le moment.";
}

// ── Lire le body JSON ────────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body) {
    ob_clean();
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'JSON invalide']));
}

$messages  = $body['messages']  ?? [];
$userMsg   = $body['message']   ?? '';   // message simple (compatibilité)
$lang      = $body['lang']      ?? 'fr';
$role      = $body['role']      ?? 'admin';
$userName  = $body['user_name'] ?? '';

// Construire les messages si on a juste un message simple
if (empty($messages) && !empty($userMsg)) {
    $messages = [['role' => 'user', 'content' => $userMsg]];
}

if (empty($messages)) {
    ob_clean();
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'Aucun message fourni']));
}

// Valider les messages (max 20, longueur max par message)
$messages = array_slice($messages, -20);
foreach ($messages as &$m) {
    $m['content'] = mb_substr($m['content'] ?? '', 0, 4000);
    $m['role']    = in_array($m['role'] ?? '', ['user', 'assistant']) ? $m['role'] : 'user';
}
unset($m);

// ── Contexte MySQL live ──────────────────────────────────────
$liveContext = getLiveContext();

// ── Prompt système AgriSmart ─────────────────────────────────
$systemPrompt = <<<PROMPT
Tu es AgroBot, l'assistant IA d'AgriSmart — plateforme intelligente d'agriculture de précision (XAMPP/MySQL).

## IDENTITÉ
- Nom : AgroBot
- Expert : agronome + data scientist IoT agricole
- Langue : réponds TOUJOURS dans la langue de l'utilisateur (FR/AR/EN)
- En arabe : utilise l'arabe standard moderne, direction RTL

## AGRISMART — MODULES
### 🌲 Random Forest (RF)
- 100 arbres de décision, précision 98%
- 8 paramètres : pH, humidité sol, N, P, K, température, précipitations, humidité air
- 12 cultures : Riz, Blé, Maïs, Coton, Pois chiche, Café, Tournesol, Tomate, Soja, Pomme de terre, Mangue, Raisin
- Confiance > 75% = très fiable | 55-75% = fiable | < 55% = vérifier capteurs

### 📈 LSTM
- Réseau de neurones récurrent, précision 92.4%, MAE 0.023
- Prédit humidité sol + température sur 7 jours
- Seuil critique : 35% humidité sol → irriguer

### 📡 IoT — ESP32 + LoRaWAN
- 6 nœuds ESP32, mesures toutes les 10 secondes
- Capteurs : T°, Humidité sol/air, pH, N, P, K, Luminosité, CO2
- LoRaWAN 868MHz → 15 km, autonomie 287 jours

### 🧪 Agronomie
pH < 5.5 → chaux 500-1000 kg/ha | pH > 7.5 → soufre 50 kg/ha
H.sol < 20% → irrigation urgente | 20-35% → 24-48h | 35-70% → OK
N < 40 kg/ha → urée 46% (80-120 kg/ha) | P < 25 → superphosphate | K < 30 → sulfate potasse

## DONNÉES LIVE MYSQL (maintenant)
$liveContext

## UTILISATEUR
Prénom/Nom: $userName | Rôle: $role | Langue préférée: $lang

## RÈGLES
1. Réponds dans la langue détectée dans le message (FR/AR/EN)
2. Utilise markdown : **gras**, listes, emojis agricoles
3. Max 300 mots sauf explication technique
4. Commente les données live si pertinent
5. Sois pratique et direct
PROMPT;

// ── Appel Claude API ─────────────────────────────────────────
$payload = json_encode([
    'model'      => CLAUDE_MODEL,
    'max_tokens' => MAX_TOKENS,
    'system'     => $systemPrompt,
    'messages'   => $messages,
], JSON_UNESCAPED_UNICODE);

// Vérifier si la clé est configurée
if (ANTHROPIC_API_KEY === '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' || empty(ANTHROPIC_API_KEY)) {
    ob_clean();
    http_response_code(200);
    die(json_encode([
        'success' => false,
        'error'   => 'no_key',
        'message' => '⚙️ Clé Anthropic non configurée. Éditez api/chat.php et remplacez sk-ant-VOTRE_CLE_ICI par votre vraie clé (console.anthropic.com).',
    ], JSON_UNESCAPED_UNICODE));
}

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . ANTHROPIC_API_KEY,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

ob_clean();

// ── Erreur cURL (réseau) ─────────────────────────────────────
if ($response === false || !empty($curlErr)) {
    http_response_code(503);
    die(json_encode([
        'success' => false,
        'error'   => 'network',
        'message' => '🌐 Erreur réseau cURL: ' . $curlErr . '. Vérifiez la connexion Internet de XAMPP.',
    ], JSON_UNESCAPED_UNICODE));
}

$data = json_decode($response, true);

// ── Erreur API Anthropic ─────────────────────────────────────
if ($httpCode !== 200) {
    $errMsg = $data['error']['message'] ?? "Erreur HTTP $httpCode";

    // Messages d'erreur conviviaux
    if ($httpCode === 401) {
        $errMsg = '🔑 Clé API invalide. Vérifiez votre clé dans api/chat.php (console.anthropic.com)';
    } elseif ($httpCode === 429) {
        $errMsg = '⏳ Limite de requêtes atteinte. Attendez 1 minute puis réessayez.';
    } elseif ($httpCode === 529) {
        $errMsg = '🔄 Serveur Anthropic surchargé. Réessayez dans quelques secondes.';
    }

    http_response_code($httpCode >= 500 ? 503 : $httpCode);
    die(json_encode([
        'success'   => false,
        'error'     => 'api_error',
        'http_code' => $httpCode,
        'message'   => $errMsg,
    ], JSON_UNESCAPED_UNICODE));
}

// ── Succès ───────────────────────────────────────────────────
$text = $data['content'][0]['text'] ?? '';

if (empty($text)) {
    http_response_code(200);
    die(json_encode([
        'success' => false,
        'error'   => 'empty_response',
        'message' => '⚠️ Réponse vide reçue d\'Anthropic.',
    ], JSON_UNESCAPED_UNICODE));
}

http_response_code(200);
die(json_encode([
    'success' => true,
    'reply'   => trim($text),
    'model'   => CLAUDE_MODEL,
    'usage'   => $data['usage'] ?? [],
], JSON_UNESCAPED_UNICODE));
