<?php
// ============================================================
// test.php — Ouvrir dans navigateur :
// http://localhost/agrismart/api/test.php
// ============================================================
header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html>
<head><style>
body{font-family:Arial,sans-serif;padding:30px;background:#f0fdf4;max-width:700px;margin:0 auto}
.ok{color:#16a34a;font-weight:bold} .err{color:#dc2626;font-weight:bold}
.box{background:#fff;border-radius:12px;padding:20px;margin:14px 0;border:1px solid #d1fae5;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h2{color:#14532d} code{background:#f1f5f9;padding:2px 8px;border-radius:5px;font-family:monospace}
a{color:#0284c7} pre{background:#1e293b;color:#e2e8f0;padding:14px;border-radius:8px;overflow:auto;font-size:12px}
</style></head>
<body>
<h2>🌿 AgriSmart — Diagnostic users.php</h2>

<?php
// 1. PHP
echo '<div class="box"><b>1. PHP</b><br>';
echo '<span class="ok">✅ PHP '.phpversion().'</span><br>';
echo 'PDO: '.(extension_loaded('pdo')        ? '<span class="ok">✅</span>' : '<span class="err">❌ manquant</span>').'<br>';
echo 'PDO MySQL: '.(extension_loaded('pdo_mysql') ? '<span class="ok">✅</span>' : '<span class="err">❌ manquant — décommentez extension=pdo_mysql dans php.ini</span>');
echo '</div>';

// 2. MySQL
echo '<div class="box"><b>2. Connexion MySQL</b><br>';
try {
    $db = new PDO('mysql:host=localhost;dbname=agrismart;charset=utf8mb4','root','',
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    echo '<span class="ok">✅ Connexion OK</span><br><br>';

    // Tables
    $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo '<b>Tables dans "agrismart" :</b><br>';
    foreach (['utilisateurs','capteurs','alertes','noeuds_iot','historique_actions','timeline','predictions_rf'] as $t)
        echo "$t : ".(in_array($t,$tables)?'<span class="ok">✅</span>':'<span class="err">❌ manquante</span>').'<br>';

    // Utilisateurs
    echo '<br><b>Utilisateurs :</b><br>';
    if (in_array('utilisateurs',$tables)) {
        $users = $db->query("SELECT id,prenom,nom,login,role,statut,LEFT(mot_de_passe,7) as hp FROM utilisateurs")->fetchAll();
        if (!$users) {
            echo '<span class="err">⚠️ Table vide ! users.php va insérer les comptes auto au premier appel.</span>';
        } else {
            foreach ($users as $u) {
                $ok = str_starts_with($u['hp'], '$2y$');
                echo "#{$u['id']} <b>{$u['login']}</b> — {$u['prenom']} {$u['nom']} ({$u['role']}) ";
                echo $ok ? '<span class="ok">✅ bcrypt</span>' : '<span class="err">❌ pas hashé — exécutez fix_users.php</span>';
                echo '<br>';
            }
        }
    } else {
        echo '<span class="err">Table utilisateurs inexistante — users.php va la créer automatiquement.</span>';
    }
} catch (PDOException $e) {
    echo '<span class="err">❌ '.$e->getMessage().'</span><br>';
    echo '<br><b>Solutions :</b><ul>';
    echo '<li>Vérifiez que MySQL est démarré dans XAMPP</li>';
    echo '<li>Créez la base <code>agrismart</code> dans phpMyAdmin</li>';
    echo '<li>Importez <code>agrismart_db.sql</code></ul>';
}
echo '</div>';

// 3. Test users.php
echo '<div class="box"><b>3. Test users.php → action=stats</b><br>';
$url = 'http://localhost/agrismart/api/users.php?action=stats';
$r   = @file_get_contents($url, false, stream_context_create(['http'=>['timeout'=>4,'ignore_errors'=>true]]));
if ($r === false) {
    echo '<span class="err">❌ Impossible de contacter users.php</span>';
} else {
    $j = json_decode($r, true);
    if (isset($j['success']) && $j['success']) {
        echo '<span class="ok">✅ users.php répond en JSON correct !</span><br>';
        echo 'Réponse : <code>'.htmlspecialchars(json_encode($j)).'</code>';
    } else {
        echo '<span class="err">❌ Réponse non-JSON (erreur PHP)</span><br>';
        echo '<pre>'.htmlspecialchars(substr($r,0,600)).'</pre>';
    }
}
echo '</div>';

// 4. Liens utiles
echo '<div class="box" style="background:#f0fdf4">';
echo '<b>🔗 Liens rapides</b><br><br>';
echo '<a href="http://localhost/agrismart/api/users.php?action=stats" target="_blank">→ users.php?action=stats</a><br>';
echo '<a href="http://localhost/agrismart/api/users.php?action=list"  target="_blank">→ users.php?action=list</a><br>';
echo '<a href="http://localhost/agrismart/AgriSmart.html" target="_blank">→ Ouvrir AgriSmart</a><br>';
echo '<a href="http://localhost/phpmyadmin" target="_blank">→ phpMyAdmin</a><br>';
echo '</div>';
?>
</body></html>
