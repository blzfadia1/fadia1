<?php
// ============================================================
//  fix_users.php — Initialiser les hash bcrypt des utilisateurs
//  Ouvrir UNE SEULE FOIS : http://localhost/agrismart/api/fix_users.php
//  SUPPRIMER ce fichier après utilisation !
// ============================================================
header('Content-Type: text/html; charset=utf-8');
echo '<style>body{font-family:Arial,sans-serif;padding:30px;background:#f0fdf4;}
.ok{color:green;font-weight:bold;} .err{color:red;}
.box{background:#fff;border-radius:12px;padding:20px;margin:12px 0;border:1px solid #bbf7d0;}</style>';
echo '<h2>🔑 Initialisation des mots de passe utilisateurs</h2>';

try {
    $pdo = new PDO('mysql:host=localhost;dbname=agrismart;charset=utf8mb4','root','',
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);

    // Remplacer tous les HASH_1234 par le vrai hash bcrypt de "1234"
    $hash = password_hash('1234', PASSWORD_BCRYPT);
    $nb = $pdo->prepare("UPDATE utilisateurs SET mot_de_passe = ? WHERE mot_de_passe = 'HASH_1234'");
    $nb->execute([$hash]);

    echo '<div class="box">';
    echo '✅ <b class="ok">'.$nb->rowCount().' compte(s)</b> mis à jour avec le mot de passe <code>1234</code><br><br>';

    // Vérification
    $users = $pdo->query("SELECT id, prenom, nom, login, role, statut FROM utilisateurs")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($users as $u) {
        echo "👤 <b>{$u['login']}</b> — {$u['prenom']} {$u['nom']} ({$u['role']}) — <span class='ok'>{$u['statut']}</span><br>";
    }
    echo '</div>';

    echo '<div class="box" style="background:#dcfce7;">';
    echo '<b>✅ Terminé !</b><br><br>';
    echo 'Connectez-vous sur : <a href="http://localhost/agrismart/AgriSmart.html">http://localhost/agrismart/AgriSmart.html</a><br><br>';
    echo '<b style="color:red;">⚠️ Supprimez fix_users.php après utilisation !</b>';
    echo '</div>';
} catch (PDOException $e) {
    echo '<div class="box"><span class="err">❌ Erreur : '.htmlspecialchars($e->getMessage()).'</span></div>';
}
?>
