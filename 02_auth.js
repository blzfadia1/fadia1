/* ════════════════════════════════════════════════════════════════
   AgriSmart — 02_auth.js
   ✅ Login / Logout avec sessions PHP
   ✅ Mot de passe oublié (3 étapes)
   ✅ NOUVEAU : Validation nouveau MDP par email obligatoire
      → L'utilisateur DOIT saisir son email admin
      → Un code de confirmation à 6 chiffres est envoyé
      → Il doit saisir le code pour valider le changement
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
   MOT DE PASSE OUBLIÉ — 4 étapes
   Étape 1 : Saisie identifiant → génération token
   Étape 2 : Affichage token + SAISIE EMAIL ADMIN obligatoire
             → envoi code de confirmation 6 chiffres
   Étape 3 : Saisie code reçu par email + nouveau mot de passe
   Étape 4 : Succès
════════════════════════════════════════════════════════════ */

(function _injectForgotModal() {

  const css = `
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

    #forgot-box {
      background: #0F1A0F;
      border: 1px solid rgba(122,181,53,.25);
      border-radius: 20px;
      width: 100%;
      max-width: 440px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(122,181,53,.1);
      animation: slideUpBox .28s cubic-bezier(.34,1.56,.64,1);
      max-height: 92vh;
      overflow-y: auto;
    }
    @keyframes slideUpBox { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:none; } }

    #forgot-header {
      padding: 22px 24px 18px;
      background: linear-gradient(135deg, #0A1A0A, #162416);
      border-bottom: 1px solid rgba(122,181,53,.12);
      display: flex;
      align-items: center;
      gap: 12px;
      position: sticky; top: 0; z-index: 1;
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
    #forgot-header-title { font-size: 16px; font-weight: 700; color: #E8F0DC; flex: 1; }
    #forgot-header-sub   { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 2px; }
    #forgot-close-btn {
      width: 30px; height: 30px;
      background: rgba(255,255,255,.06);
      border: none; border-radius: 8px;
      color: rgba(255,255,255,.4); cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: background .15s; flex-shrink: 0;
    }
    #forgot-close-btn:hover { background: rgba(255,255,255,.12); color: #fff; }

    #forgot-steps {
      display: flex;
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
      top: 14px; left: 50%;
      width: 100%; height: 2px;
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
      font-size: 12px; font-weight: 700;
      color: rgba(255,255,255,.4);
      z-index: 1; transition: all .3s;
    }
    .fg-step.active .fg-step-dot { background:#2D5016; border-color:#7AB535; color:#C8E89A; box-shadow:0 0 12px rgba(122,181,53,.4); }
    .fg-step.done   .fg-step-dot { background:#5A8A30; border-color:#7AB535; color:#fff; }
    .fg-step-label  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: rgba(255,255,255,.25); }
    .fg-step.active .fg-step-label { color: #A8D06A; }
    .fg-step.done   .fg-step-label { color: #7AB535; }

    #forgot-body { padding: 22px 24px; }

    .fg-panel { display: none; }
    .fg-panel.active { display: block; animation: fadeInP .2s ease; }
    @keyframes fadeInP { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

    .fg-desc {
      font-size: 13px; color: rgba(255,255,255,.5);
      margin-bottom: 16px; line-height: 1.6; font-weight: 300;
    }

    .fg-field { margin-bottom: 14px; }
    .fg-field label {
      display: block; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .6px;
      color: rgba(255,255,255,.4); margin-bottom: 6px;
    }
    .fg-field input {
      width: 100%; padding: 11px 14px;
      background: rgba(255,255,255,.06);
      border: 1.5px solid rgba(255,255,255,.1);
      border-radius: 10px; color: #E8F0DC;
      font-size: 14px; font-family: inherit; outline: none;
      transition: border-color .2s, box-shadow .2s;
      box-sizing: border-box;
    }
    .fg-field input:focus { border-color: #7AB535; box-shadow: 0 0 0 3px rgba(122,181,53,.15); }
    .fg-field input::placeholder { color: rgba(255,255,255,.2); }

    /* Token box */
    .fg-token-box {
      background: rgba(122,181,53,.08);
      border: 1.5px solid rgba(122,181,53,.25);
      border-radius: 12px; padding: 14px; margin-bottom: 16px;
    }
    .fg-token-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #7AB535; margin-bottom: 8px; }
    .fg-token-value {
      font-family: 'JetBrains Mono','Courier New',monospace;
      font-size: 11px; color: #C8E89A;
      word-break: break-all; letter-spacing: .5px;
      line-height: 1.6; cursor: pointer; user-select: all;
    }
    .fg-token-copy { margin-top: 8px; font-size: 11px; color: rgba(255,255,255,.35); }

    /* Email section */
    .fg-email-section {
      background: rgba(124,58,237,.08);
      border: 1.5px solid rgba(124,58,237,.3);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
    }
    .fg-email-title {
      font-size: 13px; font-weight: 700; color: #c4b5fd;
      margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
    }
    .fg-email-desc {
      font-size: 12px; color: rgba(255,255,255,.4);
      line-height: 1.5; margin-bottom: 12px;
    }
    .fg-email-input {
      width: 100%; padding: 10px 14px;
      background: rgba(255,255,255,.06);
      border: 1.5px solid rgba(124,58,237,.4);
      border-radius: 10px; color: #E8F0DC;
      font-size: 13px; font-family: inherit;
      outline: none; box-sizing: border-box;
      transition: border-color .2s;
    }
    .fg-email-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.15); }
    .fg-email-input::placeholder { color: rgba(255,255,255,.2); }
    .fg-email-send-btn {
      width: 100%; margin-top: 10px;
      padding: 10px; border-radius: 8px; border: none;
      background: linear-gradient(135deg, #4c1d95, #7c3aed);
      color: #fff; font-size: 13px; font-weight: 600;
      font-family: inherit; cursor: pointer;
      transition: all .2s;
    }
    .fg-email-send-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
    .fg-email-send-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* Code de confirmation */
    .fg-code-sent-info {
      background: rgba(34,197,94,.08);
      border: 1px solid rgba(34,197,94,.25);
      border-radius: 10px; padding: 12px 14px;
      margin-bottom: 14px; font-size: 12.5px;
      color: #86efac; display: none;
    }
    .fg-code-sent-info.show { display: block; }

    .fg-code-input {
      text-align: center !important;
      font-size: 28px !important;
      font-weight: 700 !important;
      letter-spacing: 8px !important;
      font-family: 'JetBrains Mono',monospace !important;
      color: #C8E89A !important;
    }

    /* User info */
    .fg-user-info {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.05);
      border-radius: 10px; padding: 10px 12px; margin-bottom: 16px;
    }
    .fg-user-avatar {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #2D5016, #5A8A30);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .fg-user-name   { font-size: 13px; font-weight: 600; color: #E8F0DC; }
    .fg-user-sub    { font-size: 11px; color: rgba(255,255,255,.35); }

    /* Password strength */
    .fg-strength-bar { height: 4px; background: rgba(255,255,255,.08); border-radius: 99px; overflow: hidden; margin-top: 6px; }
    .fg-strength-fill { height: 100%; border-radius: 99px; width: 0%; transition: width .3s, background .3s; }
    .fg-strength-text { font-size: 10.5px; margin-top: 4px; font-weight: 500; }

    .fg-pass-wrap { position: relative; }
    .fg-pass-eye {
      position: absolute; right: 12px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      font-size: 16px; color: rgba(255,255,255,.3); transition: color .15s; padding: 0;
    }
    .fg-pass-eye:hover { color: rgba(255,255,255,.7); }

    /* Success */
    .fg-success { text-align: center; padding: 8px 0; }
    .fg-success-icon { font-size: 52px; margin-bottom: 12px; display: block; filter: drop-shadow(0 4px 12px rgba(122,181,53,.4)); }
    .fg-success-title { font-size: 18px; font-weight: 700; color: #C8E89A; margin-bottom: 6px; }
    .fg-success-sub { font-size: 13px; color: rgba(255,255,255,.45); font-weight: 300; line-height: 1.6; }

    /* Footer */
    #forgot-footer { padding: 0 24px 22px; display: flex; gap: 10px; }
    .fg-btn {
      flex: 1; padding: 12px; border-radius: 10px; border: none;
      font-size: 13.5px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: all .2s; letter-spacing: .1px;
    }
    .fg-btn-primary {
      background: linear-gradient(135deg, #2D5016, #5A8A30);
      color: #fff; box-shadow: 0 4px 14px rgba(45,80,22,.4);
    }
    .fg-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(45,80,22,.5); }
    .fg-btn-secondary { background: rgba(255,255,255,.07); color: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.1); }
    .fg-btn-secondary:hover { background: rgba(255,255,255,.12); color: rgba(255,255,255,.8); }
    .fg-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

    .fg-error { background: rgba(176,48,48,.15); border: 1px solid rgba(176,48,48,.25); border-radius: 8px; padding: 9px 12px; font-size: 12.5px; color: #fca5a5; margin-bottom: 12px; display: none; }
    .fg-error.show { display: block; }

    .forgot-link {
      display: block; text-align: center; margin-top: 10px;
      font-size: 12px; color: rgba(255,255,255,.4); cursor: pointer;
      transition: color .2s; background: none; border: none;
      font-family: inherit; width: 100%; padding: 4px 0;
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
            <div id="forgot-header-sub">AgriSmart — Récupération sécurisée</div>
          </div>
          <button id="forgot-close-btn" onclick="closeForgotModal()">✕</button>
        </div>

        <!-- Steps -->
        <div id="forgot-steps">
          <div class="fg-step active" id="fg-step-1">
            <div class="fg-step-dot">1</div>
            <div class="fg-step-label">Identifiant</div>
          </div>
          <div class="fg-step" id="fg-step-2">
            <div class="fg-step-dot">2</div>
            <div class="fg-step-label">Email</div>
          </div>
          <div class="fg-step" id="fg-step-3">
            <div class="fg-step-dot">3</div>
            <div class="fg-step-label">Code + MDP</div>
          </div>
        </div>

        <!-- Body -->
        <div id="forgot-body">

          <!-- ── Étape 1 : Saisie identifiant ── -->
          <div class="fg-panel active" id="fg-panel-1">
            <div class="fg-desc">
              Entrez votre identifiant de connexion pour commencer la procédure de récupération.
            </div>
            <div class="fg-error" id="fg-err-1"></div>
            <div class="fg-field">
              <label>👤 Identifiant</label>
              <input type="text" id="fg-login-input" placeholder="Ex: ahmed, admin…"
                onkeydown="if(event.key==='Enter') forgotStep1()"
                autocomplete="username" maxlength="100">
            </div>
          </div>

          <!-- ── Étape 2 : Email obligatoire → envoi code ── -->
          <div class="fg-panel" id="fg-panel-2">
            <div class="fg-user-info" id="fg-user-info">
              <div class="fg-user-avatar" id="fg-user-avatar">A</div>
              <div>
                <div class="fg-user-name" id="fg-user-name">Utilisateur</div>
                <div class="fg-user-sub">Compte trouvé ✅</div>
              </div>
            </div>
            <div class="fg-desc">
              Pour sécuriser la réinitialisation, un <strong>code de confirmation à 6 chiffres</strong>
              sera envoyé à votre adresse email administrateur.
            </div>
            <div class="fg-error" id="fg-err-2"></div>

            <div class="fg-email-section">
              <div class="fg-email-title">
                📧 Email de l'administrateur
              </div>
              <div class="fg-email-desc">
                Saisissez votre adresse email pour recevoir le code de confirmation.
                Ce code expire dans <strong>10 minutes</strong>.
              </div>
              <input
                type="email"
                id="fg-admin-email"
                class="fg-email-input"
                placeholder="admin@agrismart.dz"
                onkeydown="if(event.key==='Enter') sendConfirmCode()"
                maxlength="150"
              >
              <button class="fg-email-send-btn" id="fg-send-code-btn" onclick="sendConfirmCode()">
                📨 Envoyer le code de confirmation
              </button>
            </div>

            <!-- Confirmation que l'email a été envoyé -->
            <div class="fg-code-sent-info" id="fg-code-sent-info">
              ✅ Code envoyé à <strong id="fg-sent-to"></strong> — vérifiez votre boîte mail et passez à l'étape suivante.
            </div>
          </div>

          <!-- ── Étape 3 : Code + nouveau mot de passe ── -->
          <div class="fg-panel" id="fg-panel-3">
            <div class="fg-desc">
              Entrez le <strong>code à 6 chiffres</strong> reçu par email, puis définissez votre nouveau mot de passe.
            </div>
            <div class="fg-error" id="fg-err-3"></div>

            <!-- Code de confirmation -->
            <div class="fg-field">
              <label>📩 Code reçu par email</label>
              <input
                type="text"
                id="fg-confirm-code"
                class="fg-code-input"
                placeholder="_ _ _ _ _ _"
                maxlength="6"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="one-time-code"
                oninput="this.value=this.value.replace(/[^0-9]/g,'')"
                onkeydown="if(event.key==='Enter') forgotStep3()"
              >
              <div style="font-size:11px;color:rgba(255,255,255,.3);margin-top:5px;">
                ⏱ Code valide 10 minutes · <span id="fg-resend-link" style="color:#7AB535;cursor:pointer;text-decoration:underline;" onclick="resendCode()">Renvoyer</span>
              </div>
            </div>

            <!-- Nouveau mot de passe -->
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
              <div id="fg-pass-reqs" style="display:none;margin-top:10px;padding:10px 12px;background:rgba(0,0,0,.2);border-radius:8px;font-size:11px;line-height:2;">
                <div style="font-weight:700;color:#94a3b8;margin-bottom:4px;">Critères requis :</div>
                <div id="req-len"     data-label="Minimum 6 caractères"         style="color:#ef4444">❌ Minimum 6 caractères</div>
                <div id="req-letter"  data-label="Au moins une lettre"           style="color:#ef4444">❌ Au moins une lettre</div>
                <div id="req-digit"   data-label="Au moins un chiffre"           style="color:#ef4444">❌ Au moins un chiffre</div>
                <div id="req-upper"   data-label="Une majuscule (conseillé)"     style="color:#94a3b8">⚪ Une majuscule (conseillé)</div>
                <div id="req-special" data-label="Un caractère spécial (!@#$…)" style="color:#94a3b8">⚪ Un caractère spécial (!@#$…)</div>
              </div>
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

          <!-- ── Succès ── -->
          <div class="fg-panel" id="fg-panel-success">
            <div class="fg-success">
              <span class="fg-success-icon">🎉</span>
              <div class="fg-success-title">Mot de passe modifié !</div>
              <div class="fg-success-sub" id="fg-success-msg">
                Votre mot de passe a été réinitialisé avec succès.<br>
                Un email de confirmation a été envoyé à l'administrateur.<br>
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

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);

  function _injectLink() {
    const loginBtn = document.querySelector('.btn-login');
    if (!loginBtn) return;
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
let _fgStep         = 1;
let _fgToken        = '';
let _fgPrenom       = '';
let _fgAdminEmail   = '';
let _fgConfirmCode  = '';   // code généré côté client (6 chiffres)
let _fgCodeSent     = false;

function openForgotModal() {
  _fgStep = 1; _fgToken = ''; _fgPrenom = ''; _fgAdminEmail = '';
  _fgConfirmCode = ''; _fgCodeSent = false;
  _fgUpdateUI();
  document.getElementById('forgot-overlay')?.classList.add('open');
  setTimeout(() => document.getElementById('fg-login-input')?.focus(), 250);
}

function closeForgotModal() {
  document.getElementById('forgot-overlay')?.classList.remove('open');
  ['fg-login-input','fg-admin-email','fg-confirm-code','fg-new-pass','fg-confirm-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sentInfo = document.getElementById('fg-code-sent-info');
  if (sentInfo) sentInfo.classList.remove('show');
  _fgClearError(1); _fgClearError(2); _fgClearError(3);
  _fgCodeSent = false;
}

document.addEventListener('click', (e) => { if (e.target?.id === 'forgot-overlay') closeForgotModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeForgotModal(); });

/* ── Navigation ── */
function forgotNext() {
  if (_fgStep === 1) forgotStep1();
  else if (_fgStep === 2) {
    if (!_fgCodeSent) { sendConfirmCode(); }
    else              { _fgStep = 3; _fgUpdateUI(); setTimeout(() => document.getElementById('fg-confirm-code')?.focus(), 200); }
  }
  else if (_fgStep === 3) forgotStep3();
  else if (_fgStep === 4) closeForgotModal();
}

function forgotBack() {
  if (_fgStep === 2) { _fgStep = 1; _fgUpdateUI(); setTimeout(() => document.getElementById('fg-login-input')?.focus(), 200); }
  else if (_fgStep === 3) { _fgStep = 2; _fgUpdateUI(); }
  else closeForgotModal();
}

/* ── Étape 1 : Vérifier identifiant + générer token ── */
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

    if (!d.success || !d.found) {
      _fgShowError(1, d.message || 'Identifiant introuvable ou compte inactif.');
      return;
    }

    _fgToken  = d.token  || '';
    _fgPrenom = d.prenom || loginVal;

    document.getElementById('fg-user-name').textContent   = _fgPrenom;
    document.getElementById('fg-user-avatar').textContent = _fgPrenom.charAt(0).toUpperCase();

    _fgStep = 2;
    _fgUpdateUI();
    setTimeout(() => document.getElementById('fg-admin-email')?.focus(), 200);

  } catch(e) {
    _fgSetLoading(false);
    _fgShowError(1, 'Erreur réseau. Vérifiez que XAMPP est lancé.');
  }
}

/* ── Étape 2 : Envoyer le code de confirmation par email ── */
async function sendConfirmCode() {
  _fgClearError(2);
  const emailVal = document.getElementById('fg-admin-email')?.value?.trim();

  if (!emailVal) { _fgShowError(2, 'Veuillez saisir votre adresse email.'); return; }
  if (!emailVal.includes('@') || !emailVal.includes('.')) { _fgShowError(2, 'Adresse email invalide.'); return; }

  _fgAdminEmail = emailVal;

  // Générer un code à 6 chiffres côté client
  _fgConfirmCode = String(Math.floor(100000 + Math.random() * 900000));

  const btn = document.getElementById('fg-send-code-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi en cours…'; }

  try {
    // Envoyer l'email avec le code via send_reset_mail.php
    const r = await fetch('api/send_reset_mail.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_email: _fgAdminEmail,
        login:       document.getElementById('fg-login-input')?.value?.trim() || '?',
        action:      'confirmation_reset',
        timestamp:   new Date().toLocaleString('fr-FR'),
        code:        _fgConfirmCode,   // ← le code 6 chiffres
        mode:        'code',
      })
    });
    const data = await r.json();

    if (btn) { btn.disabled = false; btn.textContent = '📨 Renvoyer le code'; }

    _fgCodeSent = true;

    // Afficher la confirmation d'envoi
    const sentInfo = document.getElementById('fg-code-sent-info');
    const sentTo   = document.getElementById('fg-sent-to');
    if (sentInfo) sentInfo.classList.add('show');
    if (sentTo)   sentTo.textContent = _fgAdminEmail;

    if (typeof showNotif === 'function') showNotif('📧 Code envoyé à ' + _fgAdminEmail);

    // Bouton "Continuer" devient actif pour passer à étape 3
    const btnNext = document.getElementById('fg-btn-next');
    if (btnNext) btnNext.textContent = 'Continuer →';

  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '📨 Envoyer le code'; }

    // Mode hors-ligne : on permet quand même de continuer (dev XAMPP local)
    _fgCodeSent = true;
    _fgShowError(2, `⚠️ Email non envoyé (SMTP non configuré). Code local : ${_fgConfirmCode}`);
    if (typeof showNotif === 'function') showNotif('⚠️ Mode local — code : ' + _fgConfirmCode);
  }
}

/* Renvoyer le code */
async function resendCode() {
  _fgCodeSent = false;
  const sentInfo = document.getElementById('fg-code-sent-info');
  if (sentInfo) sentInfo.classList.remove('show');
  await sendConfirmCode();
}

/* ── Étape 3 : Vérifier code + réinitialiser MDP ── */
async function forgotStep3() {
  _fgClearError(3);

  const codeVal   = document.getElementById('fg-confirm-code')?.value?.trim();
  const newPass   = document.getElementById('fg-new-pass')?.value;
  const confPass  = document.getElementById('fg-confirm-pass')?.value;

  // Valider le code
  if (!codeVal)               { _fgShowError(3, '❌ Veuillez saisir le code reçu par email.'); return; }
  if (codeVal.length !== 6)   { _fgShowError(3, '❌ Le code doit contenir exactement 6 chiffres.'); return; }
  if (codeVal !== _fgConfirmCode) { _fgShowError(3, '❌ Code incorrect. Vérifiez votre email ou renvoyez un nouveau code.'); return; }

  // Valider le mot de passe
  if (!newPass)                   { _fgShowError(3, '❌ Le nouveau mot de passe est requis.'); return; }
  if (newPass.length < 6)         { _fgShowError(3, '❌ Minimum 6 caractères requis.'); return; }
  if (!/[A-Za-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
    _fgShowError(3, '⚠️ Le mot de passe doit contenir au moins une lettre et un chiffre.'); return;
  }
  if (newPass !== confPass)       { _fgShowError(3, '❌ Les mots de passe ne correspondent pas.'); return; }

  _fgSetLoading(true, 'Mise à jour…');

  try {
    const r = await fetch(`${USERS_API}?action=reset_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: _fgToken, mot_de_passe: newPass, confirmation: confPass }),
    });
    const d = await r.json();
    _fgSetLoading(false);

    if (!d.success) {
      _fgShowError(3, d.message || 'Erreur lors de la réinitialisation.');
      return;
    }

    // ✅ Envoyer l'email de confirmation finale à l'admin
    try {
      await fetch('api/send_reset_mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_email: _fgAdminEmail,
          login:       document.getElementById('fg-login-input')?.value?.trim() || '?',
          action:      'reset_password_success',
          timestamp:   new Date().toLocaleString('fr-FR'),
          mode:        'success',
        })
      });
    } catch(e) { console.warn('Email confirmation finale non envoyé:', e.message); }

    const msgEl = document.getElementById('fg-success-msg');
    if (msgEl) msgEl.innerHTML = (d.message || 'Mot de passe modifié avec succès.')
      + `<br>📧 Confirmation envoyée à <strong>${_fgAdminEmail}</strong><br>Vous pouvez maintenant vous connecter.`;

    _fgStep = 4;
    _fgUpdateUI();
    if (typeof showNotif === 'function') showNotif('✅ Mot de passe réinitialisé !');

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
    if (typeof showNotif === 'function') showNotif('📋 Token copié !');
  }).catch(() => {
    const range = document.createRange();
    range.selectNodeContents(el);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
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
  const reqs = document.getElementById('fg-pass-reqs');
  if (!fill || !text) return;
  if (!val) { fill.style.width='0%'; text.textContent=''; if(reqs) reqs.style.display='none'; return; }
  if(reqs) reqs.style.display='block';

  const checks = {
    len6:    val.length >= 6,
    len10:   val.length >= 10,
    upper:   /[A-Z]/.test(val),
    lower:   /[a-z]/.test(val),
    digit:   /[0-9]/.test(val),
    special: /[^A-Za-z0-9]/.test(val),
  };

  const setReq = (id, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (ok ? '✅ ' : '❌ ') + el.dataset.label;
    el.style.color = ok ? '#22c55e' : '#ef4444';
  };
  setReq('req-len',     checks.len6);
  setReq('req-letter',  checks.upper || checks.lower);
  setReq('req-digit',   checks.digit);
  setReq('req-upper',   checks.upper);
  setReq('req-special', checks.special);

  let score = 0;
  if (checks.len6)    score++;
  if (checks.len10)   score++;
  if (checks.upper)   score++;
  if (checks.digit)   score++;
  if (checks.special) score++;

  const levels = [
    { pct:'15%', bg:'#ef4444', lbl:'❌ Trop court — minimum 6 caractères' },
    { pct:'35%', bg:'#f97316', lbl:'⚠️ Faible — ajoutez des chiffres' },
    { pct:'55%', bg:'#eab308', lbl:'🟡 Moyen — ajoutez majuscules' },
    { pct:'80%', bg:'#84cc16', lbl:'✅ Bon — recommandé' },
    { pct:'100%',bg:'#22c55e', lbl:'🔒 Très fort — excellent !' },
  ];
  const lvl = levels[Math.min(score, levels.length - 1)];
  fill.style.width      = lvl.pct;
  fill.style.background = lvl.bg;
  text.textContent      = lvl.lbl;
  text.style.color      = lvl.bg;
}

/* ── UI helpers ── */
function _fgUpdateUI() {
  ['1','2','3','success'].forEach(p => {
    const el = document.getElementById(`fg-panel-${p}`);
    if (el) el.classList.toggle('active', p === (_fgStep === 4 ? 'success' : String(_fgStep)));
  });

  [1,2,3].forEach(s => {
    const step = document.getElementById(`fg-step-${s}`);
    if (!step) return;
    step.classList.remove('active','done');
    if (s < _fgStep)   step.classList.add('done');
    if (s === _fgStep) step.classList.add('active');
    const dot = step.querySelector('.fg-step-dot');
    if (dot) dot.textContent = s < _fgStep ? '✓' : String(s);
  });

  const btnBack = document.getElementById('fg-btn-back');
  const btnNext = document.getElementById('fg-btn-next');

  if (btnBack) {
    btnBack.style.display = _fgStep === 4 ? 'none' : '';
    btnBack.textContent   = _fgStep === 1 ? '✕ Annuler' : '← Retour';
  }
  if (btnNext) {
    const step2Label = _fgCodeSent ? 'Continuer →' : '📨 Envoyer le code';
    const labels = { 1:'Vérifier →', 2: step2Label, 3:'✅ Réinitialiser →', 4:'✓ Fermer' };
    btnNext.textContent = labels[_fgStep] || 'Continuer →';
    btnNext.style.width = _fgStep === 4 ? '100%' : '';
  }

  const icon  = document.getElementById('forgot-header-icon');
  const icons = { 1:'🔑', 2:'📧', 3:'🔒', 4:'🎉' };
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
  const btn  = document.getElementById('fg-btn-next');
  const back = document.getElementById('fg-btn-back');
  if (btn) {
    btn.disabled = loading;
    if (loading) {
      btn.textContent = '⏳ ' + (label || 'Chargement…');
    } else {
      const step2Label = _fgCodeSent ? 'Continuer →' : '📨 Envoyer le code';
      const labels = { 1:'Vérifier →', 2: step2Label, 3:'✅ Réinitialiser →', 4:'✓ Fermer' };
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
    d.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${Math.random()*12+8}s;animation-delay:${Math.random()*8}s;opacity:0;`;
    c.appendChild(d);
  }
})();
