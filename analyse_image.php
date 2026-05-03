<?php
/* ════════════════════════════════════════════════════════════════
   AgriSmart — api/analyse_image.php
   Endpoint dédié analyse d'images par Claude Vision
   ✅ Lit la clé API depuis chat.php automatiquement
════════════════════════════════════════════════════════════════ */
ob_start();
@error_reporting(0);
@ini_set('display_errors', '0');
ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    ob_clean(); http_response_code(405);
    die(json_encode(['success'=>false,'message'=>'POST requis']));
}

/* ── Lire la clé API ── */
$api_key = '';

// 1. Essayer config_api.php (fichier dédié)
$cfg = __DIR__ . '/config_api.php';
if (file_exists($cfg)) {
    include_once $cfg;
    if (defined('AGRISMART_API_KEY') && str_starts_with(AGRISMART_API_KEY, 'sk-ant-')) {
        $api_key = AGRISMART_API_KEY;
    }
}

// 2. Fallback: lire depuis chat.php avec regex
if (empty($api_key)) {
    $chat_file = __DIR__ . '/chat.php';
    if (file_exists($chat_file)) {
        $chat_content = file_get_contents($chat_file);
        if (preg_match("/define\s*\(\s*'ANTHROPIC_API_KEY'\s*,\s*'(sk-ant-[^']+)'\s*\)/", $chat_content, $m)) {
            $api_key = $m[1];
        }
    }
}

if (empty($api_key) || !str_starts_with($api_key, 'sk-ant-')) {
    ob_clean(); http_response_code(500);
    die(json_encode([
        'success' => false,
        'message' => 'Clé API manquante. Ouvrez http://localhost/agrismart/test_api_key.html pour configurer.'
    ], JSON_UNESCAPED_UNICODE));
}

define('CLAUDE_MODEL', 'claude-haiku-4-5-20251001');

/* ── Lire le body ── */
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body) {
    ob_clean(); http_response_code(400);
    die(json_encode(['success'=>false,'message'=>'JSON invalide']));
}

$imageData = $body['image']      ?? '';
$mediaType = $body['media_type'] ?? 'image/png';
$question  = trim($body['question'] ?? 'Explique ce graphique');
$lang      = $body['lang']       ?? 'fr';
$context   = $body['context']    ?? '';

if (empty($imageData)) {
    ob_clean(); http_response_code(400);
    die(json_encode(['success'=>false,'message'=>'Image manquante']));
}

$allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
if (!in_array($mediaType, $allowed)) {
    $mediaType = 'image/jpeg'; // default
}

/* ── Prompt selon contexte ── */
$sysPmts = [
    'lstm' => [
        'fr' => "Tu es AgroBot, expert agronome. L'utilisateur envoie une image d'un graphique de prévision LSTM d'AgriSmart.\n\nREPONDS TOUJOURS AVEC CETTE STRUCTURE :\n\n🌾 **En bref** (1 phrase simple pour agriculteur non-éduqué)\n\n📊 **Ce que montre le graphique**\n- Décris exactement les valeurs visibles sur les axes\n- Courbe grise = mesures passées (7 derniers jours)\n- Courbe violette/orange = prévision LSTM (7 prochains jours)\n- Ligne pointillée jaune = seuil critique 35% (irriguer en dessous)\n- Ligne verte verticale = aujourd'hui\n\n📍 **Aujourd'hui** : valeur actuelle vue sur le graphique\n\n🔮 **Prévision** : évolution prévue jour par jour avec les vraies valeurs du graphique\n\n💡 **Action recommandée** : que faire maintenant concrètement ?\n\nIMPORTANT : Cite les VRAIES valeurs visibles sur le graphique. Ne pas inventer.",
        'ar' => "أنت AgroBot خبير زراعي. المستخدم يرسل صورة مخطط LSTM من AgriSmart.\n\nاستخدم هذا الهيكل دائما:\n\n🌾 **باختصار** (جملة بسيطة للمزارع)\n\n📊 **ما يظهره المخطط**\n- الخط الرمادي = قياسات 7 أيام الماضية\n- الخط البنفسجي = توقعات 7 أيام القادمة\n- الخط المنقط الأصفر = حد حرج 35%\n- الخط الأخضر = اليوم\n\n📍 **اليوم**: القيمة الحالية من الرسم\n\n🔮 **التوقع**: التطور المتوقع يوما بيوم\n\n💡 **الإجراء**: ماذا تفعل الآن؟\n\nمهم: اقرأ القيم الحقيقية من الرسم ولا تخترع.",
        'en' => "You are AgroBot, agronomic expert. User sends an LSTM forecast chart from AgriSmart.\n\nALWAYS USE THIS STRUCTURE:\n\n🌾 **In brief** (1 simple sentence for any farmer)\n\n📊 **What the graph shows**\n- Gray curve = past measurements (7 days)\n- Purple/orange curve = LSTM forecast (next 7 days)\n- Yellow dashed line = critical threshold 35%\n- Green vertical line = today\n\n📍 **Today**: current value from the graph\n\n🔮 **Forecast**: day-by-day evolution with real values\n\n💡 **Action**: what to do now?\n\nIMPORTANT: Read REAL values from the graph. Do not invent.",
    ],
    'default' => [
        'fr' => "Tu es AgroBot, expert agronome d'AgriSmart. Analyse cette image agricole et donne des conseils pratiques détaillés avec des emojis et des sections claires. Adapte le langage pour être compris par tout le monde.",
        'ar' => "أنت AgroBot خبير زراعي. حلل هذه الصورة وأعط نصائح عملية واضحة بالعربية.",
        'en' => "You are AgroBot, AgriSmart expert. Analyze this image and give practical agricultural advice with emojis and clear sections.",
    ]
];
$ctx    = array_key_exists($context, $sysPmts) ? $context : 'default';
$sysPmt = $sysPmts[$ctx][$lang] ?? $sysPmts[$ctx]['fr'];

/* ── Appel Anthropic ── */
$payload = json_encode([
    'model'      => CLAUDE_MODEL,
    'max_tokens' => 1200,
    'system'     => $sysPmt,
    'messages'   => [[
        'role'    => 'user',
        'content' => [
            ['type'=>'image','source'=>['type'=>'base64','media_type'=>$mediaType,'data'=>$imageData]],
            ['type'=>'text','text'=>$question]
        ]
    ]]
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'x-api-key: ' . $api_key,
        'anthropic-version: 2023-06-01',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);
ob_clean();

if ($response === false || !empty($curlErr)) {
    http_response_code(503);
    die(json_encode(['success'=>false,'message'=>'Erreur réseau: '.$curlErr], JSON_UNESCAPED_UNICODE));
}

$data = json_decode($response, true);
if ($httpCode !== 200) {
    $msg = $data['error']['message'] ?? "Erreur HTTP $httpCode";
    if ($httpCode === 401) $msg = 'Clé API invalide — vérifiez ANTHROPIC_API_KEY dans chat.php';
    if ($httpCode === 429) $msg = 'Limite API atteinte — attendez 1 minute';
    http_response_code($httpCode >= 500 ? 503 : $httpCode);
    die(json_encode(['success'=>false,'message'=>$msg], JSON_UNESCAPED_UNICODE));
}

$text = $data['content'][0]['text'] ?? '';
ob_clean();
http_response_code(200);
die(json_encode(['success'=>true,'reply'=>trim($text),'model'=>CLAUDE_MODEL], JSON_UNESCAPED_UNICODE));
