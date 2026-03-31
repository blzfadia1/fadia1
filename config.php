<?php
// ============================================================
//  config.php – AgriSmart
//  Placer dans : C:/xampp/htdocs/agrismart/api/config.php
// ============================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'agrismart');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=".DB_CHARSET,
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['success'=>false,'message'=>'Erreur BDD: '.$e->getMessage()]));
    }
    return $pdo;
}

function ok($data=[], int $code=200): void {
    http_response_code($code);
    echo json_encode(['success'=>true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}
function err(string $msg, int $code=400): void {
    http_response_code($code);
    echo json_encode(['success'=>false,'message'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
