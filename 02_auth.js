/* ════════════════════════════════════════════════════════════════
   AgriSmart — 02_auth.js
   ✅ Login / Logout avec sessions PHP
   ✅ NOUVEAU : Mot de passe oublié (3 étapes)
      Étape 1 — Saisie login → génération token
      Étape 2 — Affichage token (copier/coller)
      Étape 3 — Saisie nouveau mot de passe
   Fichier : 02_auth.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   VÉRIFICATION SESSION AU CHARGEMENT
═══════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const r = await fetch(`${USERS_API}?action=check_session`, { credentials: 'include' });
    const d = await r.json();
    if (d.success && d.authenticated) { /* session active */ }
  } catch (e) {}
});

/* ═══════════════════════════════════════════════════════
   LOGIN
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

  if (!loginVal || !passVal) { showLoginError('Veuillez remplir tous les champs.'); return; }
  if (loginVal.length > 100 || passVal.length > 128) { showLoginError('Identifiant ou mot de passe invalide.'); return; }

  btn.disabled    = true;
  btn.textContent = '⏳ Connexion...';

  try {
    const r = await fetch(`${USERS_API}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login: loginVal, mot_de_passe: passVal }),
    });
    const d = await r.json();
    btn.disabled    = false;
    btn.textContent = '🔐 Se connecter';

    if (!d.success) {
      showLoginError(r.status === 429 ? d.message : d.message || 'Identifiant ou mot de passe incorrect.');
      return;
    }

    CURRENT_USER = d.user;
    state.user   = d.user.login;
    state.role   = d.user.role;
    document.getElementById('login-pass').value = '';
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    initApp();

  } catch (e) {
    btn.disabled    = false;
    btn.textContent = '🔐 Se connecter';
    // Fallback hors-ligne
    const fallback = {
      admin:      { login:'admin',      nom:'Administrateur', prenom:'Admin', role:'admin',       avatar:'A', badgeClass:'badge-admin', badgeLabel:'ADMIN' },
      ahmed:      { login:'ahmed',      nom:'Ahmed Benali',   prenom:'Ahmed', role:'agriculteur', avatar:'A', badgeClass:'badge-agri',  badgeLabel:'AGRICULTEUR' },
      technicien: { login:'technicien', nom:'Karim Hadj',     prenom:'Karim', role:'technicien',  avatar:'K', badgeClass:'badge-tech',  badgeLabel:'TECHNICIEN' },
    };
    const fb = fallback[loginVal.toLowerCase()];
    if (fb && passVal === '1234') {
      CURRENT_USER = fb; state.user = fb.login; state.role = fb.role;
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
    el.style.cssText = 'background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-top:10px;text-align:center;';
    document.querySelector('.btn-login').insertAdjacentElement('afterend', el);
  }
  el.textContent = '❌ ' + msg;
  setTimeout(() => { if (el) el.textContent = ''; }, 5000);
}

/* ═══════════════════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════════════════ */
async function doLogout() {
  try {
    await fetch(`${USERS_API}?action=logout`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {}
  CURRENT_USER = null; state.user = ''; state.role = 'admin';
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  showNotif(typeof T === 'function' ? T('notifLogout') : '👋 Déconnecté avec succès');
}

/* ════════════════════════════════════════════════════════════
   MOT DE PASSE OUBLIÉ — 3 étapes dans une modale premium
════════════════════════════════════════════════════════════ */

// ── Injecter la modale dans le DOM au chargement ──────────
(function _injectForgotModal() {

  const css = `
    /* ── Overlay ── */
    #forgot-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(10,20,10,.75);
      backdrop-filter: blur(6px);
      z-index: 99999;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeInOv .2s ease;
    }
    #forgot-overlay.open { display: flex; }
    @keyframes fadeInOv { from { opacity:0; } to { opacity:1; } }

    /* ── Boîte ── */
    #forgot-box {
      background: #0F1A0F;
      border: 1px solid rgba(122,181,53,.25);
      border-radius: 20px;
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(122,181,53,.1);
      animation: slideUpBox .28s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes slideUpBox { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:none; } }

    /* ── Header ── */
    #forgot-header {
      padding: 22px 24px 18px;
      background: linear-gradient(135deg, #0A1A0A, #162416);
      border-bottom: 1px solid rgba(122,181,53,.12);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #forgot-header-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #2D5016, #5A8A30);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(90,138,48,.3);
      flex-shrink: 0;
    }
    #forgot-header-title {
      font-size: 16px;
      font-weight: 700;
      color: #E8F0DC;
      flex: 1;
    }
    #forgot-header-sub {
      font-size: 11px;
      color: rgba(255,255,255,.4);
      margin-top: 2px;
    }
    #forgot-close-btn {
      width: 30px; height: 30px;
      background: rgba(255,255,255,.06);
      border: none;
      border-radius: 8px;
      color: rgba(255,255,255,.4);
      cursor: pointer;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s;
      flex-shrink: 0;
    }
    #forgot-close-btn:hover { background: rgba(255,255,255,.12); color: #fff; }

    /* ── Steps ── */
    #forgot-steps {
      display: flex;
      gap: 0;
      padding: 16px 24px 0;
      background: linear-gradient(135deg, #0A1A0A, #162416);
    }
    .fg-step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
    }
    .fg-step:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 14px;
      left: 50%;
      width: 100%;
      height: 2px;
      background: rgba(255,255,255,.1);
    }
    .fg-step.done::after,
    .fg-step.active::after { background: rgba(122,181,53,.4); }
    .fg-step-dot {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,.08);
      border: 2px solid rgba(255,255,255,.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,.4);
      z-index: 1;
      transition: all .3s;
    }
    .fg-step.active .fg-step-dot {
      background: #2D5016;
      border-color: #7AB535;
      color: #C8E89A;
      box-shadow: 0 0 12px rgba(122,181,53,.4);
    }
    .fg-step.done .fg-step-dot {
      background: #5A8A30;
      border-color: #7AB535;
      color: #fff;
    }
    .fg-step-label {
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: rgba(255,255,255,.25);
    }
    .fg-step.active .fg-step-label { color: #A8D06A; }
    .fg-step.done  .fg-step-label  { color: #7AB535; }

    /* ── Body ── */
    #forgot-body { padding: 24px; }

    .fg-panel { display: none; }
    .fg-panel.active { display: block; animation: fadeInP .2s ease; }
    @keyframes fadeInP { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

    .fg-desc {
      font-size: 13px;
      color: rgba(255,255,255,.5);
      margin-bottom: 18px;
      line-height: 1.6;
      font-weight: 300;
    }

    .fg-field { margin-bottom: 14px; }
    .fg-field label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: rgba(255,255,255,.4);
      margin-bottom: 6px;
    }
    .fg-field input {
      width: 100%;
      padding: 11px 14px;
      background: rgba(255,255,255,.06);
      border: 1.5px solid rgba(255,255,255,.1);
      border-radius: 10px;
      color: #E8F0DC;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .fg-field input:focus {
      border-color: #7AB535;
      box-shadow: 0 0 0 3px rgba(122,181,53,.15);
    }
    .fg-field input::placeholder { color: rgba(255,255,255,.2); }

    /* Token display box */
    .fg-token-box {
      background: rgba(122,181,53,.08);
      border: 1.5px solid rgba(122,181,53,.25);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
    }
    .fg-token-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .7px;
      color: #7AB535;
      margin-bottom: 8px;
    }
    .fg-token-value {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      font-size: 11px;
      color: #C8E89A;
      word-break: break-all;
      letter-spacing: .5px;
      line-height: 1.6;
      cursor: pointer;
      user-select: all;
    }
    .fg-token-copy {
      margin-top: 8px;
      font-size: 11px;
      color: rgba(255,255,255,.35);
    }
    .fg-token-expiry {
      font-size: 11px;
      color: rgba(255,255,255,.35);
      margin-top: 4px;
    }

    .fg-user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,.05);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }
    .fg-user-avatar {
      width: 34px; height: 34px;
      border-radius: 9px;
      background: linear-gradient(135deg, #2D5016, #5A8A30);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .fg-user-name {
      font-size: 13px;
      font-weight: 600;
      color: #E8F0DC;
    }
    .fg-user-sub {
      font-size: 11px;
      color: rgba(255,255,255,.35);
    }

    /* Password strength bar */
    .fg-strength-bar {
      height: 4px;
      background: rgba(255,255,255,.08);
      border-radius: 99px;
      overflow: hidden;
      margin-top: 6px;
    }
    .fg-strength-fill {
      height: 100%;
      border-radius: 99px;
      width: 0%;
      transition: width .3s, background .3s;
    }
    .fg-strength-text {
      font-size: 10.5px;
      margin-top: 4px;
      font-weight: 500;
    }

    /* Password visibility toggle */
    .fg-pass-wrap { position: relative; }
    .fg-pass-eye {
      position: absolute;
      right: 12px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none;
      cursor: pointer; font-size: 16px;
      color: rgba(255,255,255,.3);
      transition: color .15s;
      padding: 0;
    }
    .fg-pass-eye:hover { color: rgba(255,255,255,.7); }

    /* Success panel */
    .fg-success {
      text-align: center;
      padding: 8px 0;
    }
    .fg-success-icon {
      font-size: 52px;
      margin-bottom: 12px;
      display: block;
      filter: drop-shadow(0 4px 12px rgba(122,181,53,.4));
    }
    .fg-success-title {
      font-size: 18px;
      font-weight: 700;
      color: #C8E89A;
      margin-bottom: 6px;
    }
    .fg-success-sub {
      font-size: 13px;
      color: rgba(255,255,255,.45);
      font-weight: 300;
      line-height: 1.6;
    }

    /* ── Footer buttons ── */
    #forgot-footer {
      padding: 0 24px 22px;
      display: flex;
      gap: 10px;
    }
    .fg-btn {
      flex: 1;
      padding: 12px;
      border-radius: 10px;
      border: none;
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all .2s;
      letter-spacing: .1px;
    }
    .fg-btn-primary {
      background: linear-gradient(135deg, #2D5016, #5A8A30);
      color: #fff;
      box-shadow: 0 4px 14px rgba(45,80,22,.4);
    }
    .fg-btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(45,80,22,.5);
    }
    .fg-btn-secondary {
      background: rgba(255,255,255,.07);
      color: rgba(255,255,255,.55);
      border: 1px solid rgba(255,255,255,.1);
    }
    .fg-btn-secondary:hover { background: rgba(255,255,255,.12); color: rgba(255,255,255,.8); }
    .fg-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

    /* ── Error message ── */
    .fg-error {
      background: rgba(176,48,48,.15);
      border: 1px solid rgba(176,48,48,.25);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 12.5px;
      color: #fca5a5;
      margin-bottom: 12px;
      display: none;
    }
    .fg-error.show { display: block; }

    /* ── Lien "mot de passe oublié" dans le login ── */
    .forgot-link {
      display: block;
      text-align: center;
      margin-top: 10px;
      font-size: 12px;
      color: rgba(255,255,255,.4);
      cursor: pointer;
      transition: color .2s;
      background: none;
      border: none;
      font-family: inherit;
      width: 100%;
      padding: 4px 0;
    }
    .forgot-link:hover { color: #86efac; text-decoration: underline; }
  `;

  const html = `
    <div id="forgot-overlay">
      <div id="forgot-box">

        <!-- Header -->
        <div id="forgot-header">
          <div id="forgot-header-icon">🔑</div>
          <div>
            <div id="forgot-header-title">Réinitialiser le mot de passe</div>
            <div id="forgot-header-sub">AgriSmart — Récupération de compte</div>
          </div>
          <button id="forgot-close-btn" onclick="closeForgotModal()">✕</button>
        </div>

        <!-- Steps indicator -->
        <div id="forgot-steps">
          <div class="fg-step active" id="fg-step-1">
            <div class="fg-step-dot">1</div>
            <div class="fg-step-label">Identifiant</div>
          </div>
          <div class="fg-step" id="fg-step-2">
            <div class="fg-step-dot">2</div>
            <div class="fg-step-label">Token</div>
          </div>
          <div class="fg-step" id="fg-step-3">
            <div class="fg-step-dot">3</div>
            <div class="fg-step-label">Nouveau MDP</div>
          </div>
        </div>

        <!-- Body -->
        <div id="forgot-body">

          <!-- Étape 1 — Saisie login -->
          <div class="fg-panel active" id="fg-panel-1">
            <div class="fg-desc">
              Entrez votre identifiant de connexion. Un token de réinitialisation sera généré.
            </div>
            <div class="fg-error" id="fg-err-1"></div>
            <div class="fg-field">
              <label>👤 Identifiant</label>
              <input type="text" id="fg-login-input" placeholder="Ex: ahmed, admin…"
                onkeydown="if(event.key==='Enter') forgotStep1()"
                autocomplete="username" maxlength="100">
            </div>
          </div>

          <!-- Étape 2 — Afficher token -->
          <div class="fg-panel" id="fg-panel-2">
            <div class="fg-user-info" id="fg-user-info">
              <div class="fg-user-avatar" id="fg-user-avatar">A</div>
              <div>
                <div class="fg-user-name" id="fg-user-name">Utilisateur</div>
                <div class="fg-user-sub">Compte trouvé ✅</div>
              </div>
            </div>
            <div class="fg-desc">
              Copiez ce token et utilisez-le à l'étape suivante pour définir votre nouveau mot de passe.
            </div>
            <div class="fg-token-box">
              <div class="fg-token-label">🔐 Token de réinitialisation</div>
              <div class="fg-token-value" id="fg-token-value" onclick="copyToken(this)" title="Cliquez pour copier">
                …
              </div>
              <div class="fg-token-copy">👆 Cliquez pour copier</div>
              <div class="fg-token-expiry" id="fg-token-expiry">⏱ Expire dans 30 minutes</div>
            </div>
          </div>

          <!-- Étape 3 — Nouveau mot de passe -->
          <div class="fg-panel" id="fg-panel-3">
            <div class="fg-desc">
              Entrez le token reçu et définissez votre nouveau mot de passe.
            </div>
            <div class="fg-error" id="fg-err-3"></div>
            <div class="fg-field">
              <label>🔐 Token reçu</label>
              <input type="text" id="fg-token-input" placeholder="Collez le token ici"
                autocomplete="off" maxlength="64"
                style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.5px;">
            </div>
            <div class="fg-field">
              <label>🔒 Nouveau mot de passe</label>
              <div class="fg-pass-wrap">
                <input type="password" id="fg-new-pass" placeholder="Minimum 6 caractères"
                  oninput="checkPassStrength(this.value)"
                  onkeydown="if(event.key==='Enter') forgotStep3()"
                  autocomplete="new-password" maxlength="128">
                <button class="fg-pass-eye" onclick="toggleFgPassVis('fg-new-pass',this)" type="button">👁</button>
              </div>
              <div class="fg-strength-bar"><div class="fg-strength-fill" id="fg-strength-fill"></div></div>
              <div class="fg-strength-text" id="fg-strength-text"></div>
            </div>
            <div class="fg-field">
              <label>🔒 Confirmer le mot de passe</label>
              <div class="fg-pass-wrap">
                <input type="password" id="fg-confirm-pass" placeholder="Répétez le mot de passe"
                  onkeydown="if(event.key==='Enter') forgotStep3()"
                  autocomplete="new-password" maxlength="128">
                <button class="fg-pass-eye" onclick="toggleFgPassVis('fg-confirm-pass',this)" type="button">👁</button>
              </div>
            </div>
          </div>

          <!-- Succès -->
          <div class="fg-panel" id="fg-panel-success">
            <div class="fg-success">
              <span class="fg-success-icon">🎉</span>
              <div class="fg-success-title">Mot de passe modifié !</div>
              <div class="fg-success-sub" id="fg-success-msg">
                Votre mot de passe a été réinitialisé avec succès.<br>
                Vous pouvez maintenant vous connecter.
              </div>
            </div>
          </div>

        </div><!-- /forgot-body -->

        <!-- Footer -->
        <div id="forgot-footer">
          <button class="fg-btn fg-btn-secondary" id="fg-btn-back" onclick="forgotBack()">← Retour</button>
          <button class="fg-btn fg-btn-primary"   id="fg-btn-next" onclick="forgotNext()">Continuer →</button>
        </div>

      </div>
    </div>
  `;

  // Injecter CSS
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Injecter HTML
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);

  // Injecter le lien "mot de passe oublié" dans la page login
  // On attend que le DOM soit prêt
  function _injectLink() {
    const loginBtn = document.querySelector('.btn-login');
    if (!loginBtn) return;
    // Vérifier qu'on n'a pas déjà injecté le lien
    if (document.getElementById('forgot-link-btn')) return;
    const link = document.createElement('button');
    link.id = 'forgot-link-btn';
    link.className = 'forgot-link';
    link.textContent = '🔑 Mot de passe oublié ?';
    link.onclick = openForgotModal;
    loginBtn.insertAdjacentElement('afterend', link);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _injectLink);
  } else {
    // Réessayer quelques fois car le HTML login peut être injecté après
    let tries = 0;
    const t = setInterval(() => {
      _injectLink();
      if (document.getElementById('forgot-link-btn') || ++tries > 20) clearInterval(t);
    }, 300);
  }

})();

/* ═══════════════════════════════════════════════════════
   ÉTAT DE LA MODALE
═══════════════════════════════════════════════════════ */
let _fgStep   = 1;
let _fgToken  = '';
let _fgPrenom = '';

function openForgotModal() {
  _fgStep = 1; _fgToken = ''; _fgPrenom = '';
  _fgUpdateUI();
  const ov = document.getElementById('forgot-overlay');
  if (ov) { ov.classList.add('open'); }
  setTimeout(() => document.getElementById('fg-login-input')?.focus(), 250);
}

function closeForgotModal() {
  const ov = document.getElementById('forgot-overlay');
  if (ov) ov.classList.remove('open');
  // Reset champs sensibles
  const inputs = ['fg-login-input','fg-token-input','fg-new-pass','fg-confirm-pass'];
  inputs.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _fgClearError(1); _fgClearError(3);
}

// Fermer en cliquant sur l'overlay
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'forgot-overlay') closeForgotModal();
});

// Fermer avec Échap
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeForgotModal();
});

/* ── Navigation ── */
function forgotNext() {
  if (_fgStep === 1) forgotStep1();
  else if (_fgStep === 2) forgotGoToStep3();
  else if (_fgStep === 3) forgotStep3();
  else if (_fgStep === 4) closeForgotModal(); // Succès → fermer
}

function forgotBack() {
  if (_fgStep === 2) { _fgStep = 1; _fgUpdateUI(); setTimeout(() => document.getElementById('fg-login-input')?.focus(), 200); }
  else if (_fgStep === 3) { _fgStep = 2; _fgUpdateUI(); }
  else closeForgotModal();
}

/* ── Step 1 : Demander le token ─────────────────────────── */
async function forgotStep1() {
  _fgClearError(1);
  const loginVal = document.getElementById('fg-login-input')?.value?.trim();
  if (!loginVal) { _fgShowError(1, 'Veuillez saisir votre identifiant.'); return; }
  if (loginVal.length > 100) { _fgShowError(1, 'Identifiant invalide.'); return; }

  _fgSetLoading(true, 'Vérification…');

  try {
    const r = await fetch(`${USERS_API}?action=forgot_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginVal }),
    });
    const d = await r.json();
    _fgSetLoading(false);

    if (!d.success) {
      _fgShowError(1, d.message || 'Erreur serveur. XAMPP est-il démarré ?');
      return;
    }

    if (!d.found) {
      // Compte non trouvé — message générique (sécurité)
      _fgShowError(1, 'Identifiant introuvable ou compte inactif.');
      return;
    }

    // Succès — afficher le token
    _fgToken  = d.token  || '';
    _fgPrenom = d.prenom || loginVal;

    const tokenEl = document.getElementById('fg-token-value');
    if (tokenEl) tokenEl.textContent = _fgToken;

    const nameEl = document.getElementById('fg-user-name');
    if (nameEl) nameEl.textContent = _fgPrenom;

    const avatarEl = document.getElementById('fg-user-avatar');
    if (avatarEl) avatarEl.textContent = _fgPrenom.charAt(0).toUpperCase();

    // Pré-remplir le champ token à l'étape 3
    const tokenInput = document.getElementById('fg-token-input');
    if (tokenInput) tokenInput.value = _fgToken;

    _fgStep = 2;
    _fgUpdateUI();

  } catch(e) {
    _fgSetLoading(false);
    _fgShowError(1, 'Erreur réseau. Vérifiez que XAMPP est lancé.');
  }
}

/* ── Step 2 → 3 : Passer à la saisie du nouveau MDP ──── */
function forgotGoToStep3() {
  _fgStep = 3;
  _fgUpdateUI();
  setTimeout(() => document.getElementById('fg-new-pass')?.focus(), 200);
}

/* ── Step 3 : Réinitialiser le mot de passe ─────────────── */
async function forgotStep3() {
  _fgClearError(3);
  const token   = document.getElementById('fg-token-input')?.value?.trim();
  const newPass = document.getElementById('fg-new-pass')?.value;
  const confPass= document.getElementById('fg-confirm-pass')?.value;

  if (!token)          { _fgShowError(3, 'Le token est requis.'); return; }
  if (token.length !== 64) { _fgShowError(3, 'Token invalide (64 caractères requis).'); return; }
  if (!newPass)        { _fgShowError(3, 'Le nouveau mot de passe est requis.'); return; }
  if (newPass.length < 6) { _fgShowError(3, 'Mot de passe trop court (minimum 6 caractères).'); return; }
  if (newPass !== confPass){ _fgShowError(3, 'Les mots de passe ne correspondent pas.'); return; }

  _fgSetLoading(true, 'Mise à jour…');

  try {
    const r = await fetch(`${USERS_API}?action=reset_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mot_de_passe: newPass, confirmation: confPass }),
    });
    const d = await r.json();
    _fgSetLoading(false);

    if (!d.success) {
      _fgShowError(3, d.message || 'Erreur lors de la réinitialisation.');
      return;
    }

    // ✅ Succès
    const msgEl = document.getElementById('fg-success-msg');
    if (msgEl) msgEl.innerHTML = (d.message || 'Mot de passe modifié avec succès.') + '<br>Vous pouvez maintenant vous connecter.';

    _fgStep = 4;
    _fgUpdateUI();
    if (typeof showNotif === 'function') showNotif('✅ Mot de passe réinitialisé avec succès !');

  } catch(e) {
    _fgSetLoading(false);
    _fgShowError(3, 'Erreur réseau. Vérifiez que XAMPP est lancé.');
  }
}

/* ── Copier le token ── */
function copyToken(el) {
  const text = el?.textContent?.trim();
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => {
    if (typeof showNotif === 'function') showNotif('📋 Token copié dans le presse-papier !');
    const copyHint = el.nextElementSibling;
    if (copyHint) { copyHint.textContent = '✅ Copié !'; setTimeout(() => { copyHint.textContent = '👆 Cliquez pour copier'; }, 2000); }
  }).catch(() => {
    // Fallback sélection manuelle
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    if (typeof showNotif === 'function') showNotif('📋 Sélectionné — Ctrl+C pour copier');
  });
}

/* ── Visibilité mot de passe ── */
function toggleFgPassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁';
}

/* ── Force du mot de passe ── */
function checkPassStrength(val) {
  const fill = document.getElementById('fg-strength-fill');
  const text = document.getElementById('fg-strength-text');
  if (!fill || !text) return;
  if (!val) { fill.style.width = '0%'; text.textContent = ''; return; }
  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct:'20%', bg:'#ef4444', lbl:'❌ Trop court' },
    { pct:'40%', bg:'#f97316', lbl:'⚠️ Faible' },
    { pct:'60%', bg:'#eab308', lbl:'🟡 Moyen' },
    { pct:'80%', bg:'#84cc16', lbl:'✅ Bon' },
    { pct:'100%',bg:'#22c55e', lbl:'🔒 Très fort' },
  ];
  const lvl = levels[Math.min(score, levels.length - 1)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.bg;
  text.textContent = lvl.lbl;
  text.style.color = lvl.bg;
}

/* ── Helpers UI ── */
function _fgUpdateUI() {
  // Panels
  [1,2,3,'success'].forEach(p => {
    const el = document.getElementById(`fg-panel-${p}`);
    if (el) el.classList.toggle('active', p === (_fgStep === 4 ? 'success' : _fgStep));
  });

  // Steps indicators
  [1,2,3].forEach(s => {
    const step = document.getElementById(`fg-step-${s}`);
    if (!step) return;
    step.classList.remove('active','done');
    if (s < _fgStep)  step.classList.add('done');
    if (s === _fgStep) step.classList.add('active');
    const dot = step.querySelector('.fg-step-dot');
    if (dot) dot.textContent = s < _fgStep ? '✓' : s;
  });

  // Buttons
  const btnBack = document.getElementById('fg-btn-back');
  const btnNext = document.getElementById('fg-btn-next');

  if (btnBack) {
    btnBack.style.display = _fgStep === 4 ? 'none' : '';
    btnBack.textContent = _fgStep === 1 ? '✕ Annuler' : '← Retour';
  }
  if (btnNext) {
    const labels = { 1:'Générer le token →', 2:'Continuer →', 3:'Réinitialiser →', 4:'✓ Fermer' };
    btnNext.textContent = labels[_fgStep] || 'Continuer →';
    if (_fgStep === 4) btnNext.style.width = '100%';
    else btnNext.style.width = '';
  }

  // Header icon
  const icon = document.getElementById('forgot-header-icon');
  const icons = { 1:'🔑', 2:'📋', 3:'🔒', 4:'🎉' };
  if (icon) icon.textContent = icons[_fgStep] || '🔑';
}

function _fgShowError(step, msg) {
  const el = document.getElementById(`fg-err-${step}`);
  if (el) { el.textContent = '❌ ' + msg; el.classList.add('show'); }
}

function _fgClearError(step) {
  const el = document.getElementById(`fg-err-${step}`);
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

function _fgSetLoading(loading, label) {
  const btn = document.getElementById('fg-btn-next');
  const back = document.getElementById('fg-btn-back');
  if (btn) {
    btn.disabled = loading;
    if (loading) btn.textContent = '⏳ ' + (label || 'Chargement…');
    else {
      const labels = { 1:'Générer le token →', 2:'Continuer →', 3:'Réinitialiser →', 4:'✓ Fermer' };
      btn.textContent = labels[_fgStep] || 'Continuer →';
    }
  }
  if (back) back.disabled = loading;
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
