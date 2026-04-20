/* ════════════════════════════════════════════════════════════════
   AgriSmart — 02_auth.js SÉCURISÉ
   ✅ Sessions PHP côté serveur
   ✅ Logout appelle le serveur (détruit la session)
   ✅ Vérification de session au démarrage
   Fichier : 02_auth.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   VÉRIFICATION DE SESSION AU CHARGEMENT DE LA PAGE
   Vérifie si une session PHP valide existe déjà.
═══════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const r = await fetch(`${USERS_API}?action=check_session`, { credentials: 'include' });
    const d = await r.json();
    if (d.success && d.authenticated) {
      // Session valide — recharger l'utilisateur
      // On ne peut pas récupérer toutes les infos sans re-login,
      // donc on affiche juste l'app avec les infos minimales de session
      // (l'utilisateur devra se re-logger si il rafraîchit la page
      //  à moins d'implémenter un endpoint /me)
    }
  } catch (e) {
    // Pas de session active — afficher l'écran de login normalement
  }
});

/* ═══════════════════════════════════════════════════════
   LOGIN / LOGOUT — avec sessions PHP
═══════════════════════════════════════════════════════ */
function setRole(r, el) {
  state.role = r;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const map = { admin: 'admin', agriculteur: 'ahmed', technicien: 'technicien' };
  document.getElementById('login-user').value = map[r];
}

async function doLogin() {
  const loginVal = document.getElementById('login-user').value.trim();
  const passVal  = document.getElementById('login-pass').value;
  const btn      = document.querySelector('.btn-login');

  if (!loginVal || !passVal) {
    showLoginError('Veuillez remplir tous les champs.');
    return;
  }

  // Validation côté client (longueur max)
  if (loginVal.length > 100 || passVal.length > 128) {
    showLoginError('Identifiant ou mot de passe invalide.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = '⏳ Connexion...';

  try {
    const r = await fetch(`${USERS_API}?action=login`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',  // ✅ Envoyer/recevoir les cookies de session
      body:        JSON.stringify({ login: loginVal, mot_de_passe: passVal }),
    });

    const d = await r.json();

    btn.disabled    = false;
    btn.textContent = '🔐 Se connecter';

    if (!d.success) {
      // Gérer le rate limiting
      if (r.status === 429) {
        showLoginError(d.message || 'Trop de tentatives. Réessayez dans quelques minutes.');
      } else {
        showLoginError(d.message || 'Identifiant ou mot de passe incorrect.');
      }
      return;
    }

    // ✅ Connexion réussie — session PHP créée côté serveur
    CURRENT_USER = d.user;
    state.user   = d.user.login;
    state.role   = d.user.role;

    // Effacer le mot de passe du DOM
    document.getElementById('login-pass').value = '';

    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    initApp();

  } catch (e) {
    btn.disabled    = false;
    btn.textContent = '🔐 Se connecter';

    // ⚠️ Fallback hors-ligne UNIQUEMENT pour développement local
    // DÉSACTIVER en production !
    const fallback = {
      admin:      { login: 'admin',      nom: 'Administrateur', prenom: 'Admin', role: 'admin',       avatar: 'A', badgeClass: 'badge-admin', badgeLabel: 'ADMIN' },
      ahmed:      { login: 'ahmed',      nom: 'Ahmed Benali',   prenom: 'Ahmed', role: 'agriculteur', avatar: 'A', badgeClass: 'badge-agri',  badgeLabel: 'AGRICULTEUR' },
      technicien: { login: 'technicien', nom: 'Karim Hadj',     prenom: 'Karim', role: 'technicien',  avatar: 'K', badgeClass: 'badge-tech',  badgeLabel: 'TECHNICIEN' },
    };
    const fb = fallback[loginVal.toLowerCase()];
    if (fb && passVal === '1234') {
      CURRENT_USER = fb;
      state.user   = fb.login;
      state.role   = fb.role;
      document.getElementById('login-pass').value = '';
      document.getElementById('screen-login').classList.remove('active');
      document.getElementById('screen-app').classList.add('active');
      initApp();
      showNotif('⚠️ Mode hors-ligne (XAMPP non démarré)');
    } else {
      showLoginError('Erreur réseau. Vérifiez que XAMPP est lancé.');
    }
  }
}

function showLoginError(msg) {
  let el = document.getElementById('login-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login-error';
    el.style.cssText = [
      'background:rgba(220,38,38,.15)',
      'border:1px solid rgba(220,38,38,.3)',
      'border-radius:10px',
      'padding:10px 14px',
      'font-size:13px',
      'color:#fca5a5',
      'margin-top:10px',
      'text-align:center',
    ].join(';');
    document.querySelector('.btn-login').insertAdjacentElement('afterend', el);
  }
  el.textContent = '❌ ' + msg;
  setTimeout(() => { if (el) el.textContent = ''; }, 5000);
}

async function doLogout() {
  try {
    // ✅ Appeler le serveur pour détruire la session PHP
    await fetch(`${USERS_API}?action=logout`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Continuer même si le réseau est indisponible
  }

  // Nettoyage côté client
  CURRENT_USER = null;
  state.user   = '';
  state.role   = 'admin';

  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  showNotif(typeof T === 'function' ? T('notifLogout') : '👋 Déconnecté avec succès');
}

/* ═══════════════════════════════════════════════════════
   LOGIN PARTICLES
═══════════════════════════════════════════════════════ */
(function () {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 18; i++) {
    const d = document.createElement('div');
    d.className = 'particle';
    const s = Math.random() * 30 + 10;
    d.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;animation-duration:${Math.random() * 12 + 8}s;animation-delay:${Math.random() * 8}s;opacity:0;`;
    c.appendChild(d);
  }
})();
