/* ════════════════════════════════════════════════════════════════
   AgriSmart — 02 — AUTH — Login / Logout / Particules
   setRole(), doLogin(), showLoginError(), doLogout(), particules
   Fichier : 02_auth.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   LOGIN / LOGOUT — connecté à MySQL
═══════════════════════════════════════════════════════ */
function setRole(r, el) {
  state.role = r;
  document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const map = {admin:'admin', agriculteur:'ahmed', technicien:'technicien'};
  document.getElementById('login-user').value = map[r];
}

async function doLogin() {
  const loginVal = document.getElementById('login-user').value.trim();
  const passVal  = document.getElementById('login-pass').value;
  const btn      = document.querySelector('.btn-login');

  if (!loginVal || !passVal) { showLoginError('Veuillez remplir tous les champs.'); return; }

  // Afficher chargement
  btn.disabled   = true;
  btn.textContent = '⏳ Connexion...';

  try {
    const r = await fetch(`${USERS_API}?action=login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ login: loginVal, mot_de_passe: passVal })
    });
    const d = await r.json();

    btn.disabled   = false;
    btn.textContent = '🔐 Se connecter';

    if (!d.success) {
      showLoginError(d.message || 'Identifiant ou mot de passe incorrect.');
      return;
    }

    // Stocker l'utilisateur connecté
    CURRENT_USER = d.user;
    state.user   = d.user.login;
    state.role   = d.user.role;

    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    initApp();

  } catch(e) {
    btn.disabled   = false;
    btn.textContent = '🔐 Se connecter';
    // Fallback hors-ligne : comptes par défaut
    const fallback = {
      admin:      {login:'admin',      nom:'Administrateur', prenom:'Admin',   role:'admin',       avatar:'A', badgeClass:'badge-admin', badgeLabel:'ADMIN'},
      ahmed:      {login:'ahmed',      nom:'Ahmed Benali',   prenom:'Ahmed',   role:'agriculteur', avatar:'A', badgeClass:'badge-agri',  badgeLabel:'AGRICULTEUR'},
      technicien: {login:'technicien', nom:'Karim Hadj',     prenom:'Karim',   role:'technicien',  avatar:'K', badgeClass:'badge-tech',  badgeLabel:'TECHNICIEN'},
    };
    const fb = fallback[loginVal.toLowerCase()];
    if (fb && passVal === '1234') {
      CURRENT_USER = fb; state.user = fb.login; state.role = fb.role;
      document.getElementById('screen-login').classList.remove('active');
      document.getElementById('screen-app').classList.add('active');
      initApp();
      showNotif('⚠️ Mode hors-ligne (XAMPP non lancé)');
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
    el.style.cssText = 'background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-top:10px;text-align:center;';
    document.querySelector('.btn-login').insertAdjacentElement('afterend', el);
  }
  el.textContent = '❌ ' + msg;
  setTimeout(() => { if(el) el.textContent = ''; }, 4000);
}

function doLogout() {
  CURRENT_USER = null;
  state.user   = '';
  state.role   = 'admin';
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  showNotif('👋 Déconnecté avec succès');
}

/* ═══════════════════════════════════════════════════════
   LOGIN PARTICLES
═══════════════════════════════════════════════════════ */
(function() {
  const c = document.getElementById('particles');
  for (let i = 0; i < 18; i++) {
    const d = document.createElement('div');
    d.className = 'particle';
    const s = Math.random()*30+10;
    d.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;
      animation-duration:${Math.random()*12+8}s;
      animation-delay:${Math.random()*8}s;opacity:0;`;
    c.appendChild(d);
  }
})();
