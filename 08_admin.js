/* ════════════════════════════════════════════════════════════════
   AgriSmart — 08 — ADMIN — Gestion Utilisateurs
   buildAdminPage(), renderUsersTable(), CRUD Modal, Journal système
   Fichier : 08_admin.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   ADMIN — USERS DATABASE (in-memory)
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   GESTION UTILISATEURS — MySQL XAMPP
   API : http://localhost/agrismart/api/users.php
═══════════════════════════════════════════════════════ */
// USERS_API et usersApiCall définis dans la config API (voir ci-dessus)
let filtreActif    = 'tous';
let rechercheActive = '';
let userASupprimer = null; // id MySQL

/* ── CONSTRUCTION PAGE ADMIN ── */
async function buildAdminPage() {
  // Stats depuis MySQL
  const s = await usersApiCall('stats');
  if (s.success) {
    document.getElementById('admin-stats').innerHTML = [
      {ico:'👥',bg:'#ede9fe',val:s.total,        lbl:'Utilisateurs total',c:'var(--violet)'},
      {ico:'🌾',bg:'#f0fdf4',val:s.agriculteurs,  lbl:'Agriculteurs',     c:'var(--green)'},
      {ico:'🔧',bg:'#e0f2fe',val:s.techniciens,   lbl:'Techniciens',      c:'var(--blue)'},
      {ico:'✅',bg:'#f0fdf4',val:s.actifs,         lbl:'Comptes actifs',   c:'var(--green)'},
    ].map(st=>`<div class="stat-card">
      <div class="stat-icon" style="background:${st.bg}">${st.ico}</div>
      <div class="stat-body"><div class="stat-val" style="color:${st.c}">${st.val}</div><div class="stat-label">${st.lbl}</div></div>
    </div>`).join('');
  }
  await renderUsersTable();
  await chargerJournal();
  buildSysLog('info','Page administration chargée (MySQL)');
}

/* ── TABLE UTILISATEURS ── */
async function renderUsersTable() {
  const t = document.getElementById('users-table-v2');
  t.innerHTML = '<thead><tr><th colspan="8" style="text-align:center;padding:16px;color:#94a3b8;">⏳ Chargement depuis MySQL...</th></tr></thead>';

  // Construire l'URL avec filtres
  let extraParams = `&role=${filtreActif === 'tous' ? '' : filtreActif}`;
  if (rechercheActive) extraParams += `&q=${encodeURIComponent(rechercheActive)}`;

  // Appel direct avec fetch pour passer les paramètres GET correctement
  let fetchUrl = `${USERS_API}?action=list${extraParams}`;
  let d;
  try {
    const r = await fetch(fetchUrl);
    d = await r.json();
  } catch(e) {
    d = { success: false, message: 'Erreur réseau: ' + e.message };
  }
  if (!d.success) {
    t.innerHTML = `<thead><tr><th colspan="8" style="text-align:center;padding:16px;color:#dc2626;">❌ ${d.message||'Erreur MySQL'}</th></tr></thead>`;
    return;
  }

  document.getElementById('user-count-badge').textContent = d.total;

  const roleColors   = {Admin:'bg-violet', Agriculteur:'bg-green', Technicien:'bg-blue'};
  const statusColors = {Actif:'bg-green',  Inactif:'bg-amber',     Suspendu:'bg-red'};

  const thead = `<thead><tr>
    <th>#</th><th>Nom complet</th><th>Login</th><th>Rôle</th>
    <th>Zone</th><th>Téléphone</th><th>Statut</th><th>Actions</th>
  </tr></thead>`;

  const list = d.utilisateurs || [];
  const tbody = list.length ? `<tbody>${list.map(u=>`<tr>
    <td style="color:var(--slate);font-family:'JetBrains Mono',monospace;font-size:11px;">${u.id}</td>
    <td><strong>${u.prenom} ${u.nom}</strong><br><span style="font-size:11px;color:var(--slate);">Créé le ${u.date_creation}</span></td>
    <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${u.login}</td>
    <td><span class="badge ${roleColors[u.role]||'bg-green'}">${u.role}</span></td>
    <td style="font-size:12px;">${u.zone||'—'}</td>
    <td style="font-size:12px;font-family:'JetBrains Mono',monospace;">${u.telephone||'—'}</td>
    <td><span class="badge ${statusColors[u.statut]||'bg-green'}">${u.statut}</span></td>
    <td style="white-space:nowrap;">
      <button class="act-btn act-view" onclick="voirUser(${u.id})" title="Voir">👁</button>
      <button class="act-btn act-edit" onclick="ouvrirModal('modifier',${u.id})" title="Modifier" style="margin:0 4px;">✏️</button>
      ${u.login!=='admin'?`<button class="act-btn act-del" onclick="demanderSuppression(${u.id},'${u.prenom} ${u.nom}','${u.login}')" title="Supprimer">🗑</button>`:''}
    </td>
  </tr>`).join('')}</tbody>` :
  `<tbody><tr><td colspan="8" style="text-align:center;padding:24px;color:var(--slate);">Aucun utilisateur trouvé</td></tr></tbody>`;

  t.innerHTML = thead + tbody;
}

function filtrerUsers(role, btn) {
  filtreActif = role;
  document.querySelectorAll('.filtre-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderUsersTable();
}

function rechercherUsers(val) {
  rechercheActive = val;
  renderUsersTable();
}

/* ── MODAL — OUVRIR ── */
async function ouvrirModal(mode, id) {
  const m = document.getElementById('modal-user');
  document.getElementById('m-uid').value = '';
  ['m-prenom','m-nom','m-login','m-pass','m-zone','m-tel'].forEach(el=>document.getElementById(el).value='');
  document.getElementById('m-role').value   = 'Agriculteur';
  document.getElementById('m-status').value = 'Actif';

  if (mode === 'modifier' && id) {
    // Charger les données depuis MySQL
    const d = await usersApiCall(`list&q=`, 'GET', null);
    // Trouver l'utilisateur par id dans la liste
    const u = (d.utilisateurs||[]).find(x=>x.id===id);
    if (!u) { showNotif('❌ Utilisateur introuvable'); return; }

    document.getElementById('modal-title').textContent = 'Modifier Utilisateur';
    document.getElementById('modal-icon').textContent  = '✏️';
    document.getElementById('modal-save-btn').textContent = '💾 Sauvegarder';
    document.getElementById('m-uid').value    = u.id;
    document.getElementById('m-prenom').value = u.prenom;
    document.getElementById('m-nom').value    = u.nom;
    document.getElementById('m-login').value  = u.login;
    document.getElementById('m-pass').value   = ''; // ne pas afficher le hash
    document.getElementById('m-role').value   = u.role;
    document.getElementById('m-zone').value   = u.zone||'';
    document.getElementById('m-tel').value    = u.telephone||'';
    document.getElementById('m-status').value = u.statut;
  } else {
    document.getElementById('modal-title').textContent    = 'Ajouter un Utilisateur';
    document.getElementById('modal-icon').textContent     = '➕';
    document.getElementById('modal-save-btn').textContent = '✅ Créer le compte';
  }
  m.classList.add('open');
}

function fermerModal() {
  document.getElementById('modal-user').classList.remove('open');
}

/* ── SAUVEGARDER (créer ou modifier) ── */
async function sauvegarderUser() {
  const btn    = document.getElementById('modal-save-btn');
  const uid    = parseInt(document.getElementById('m-uid').value) || 0;
  const prenom = document.getElementById('m-prenom').value.trim();
  const nom    = document.getElementById('m-nom').value.trim();
  const login  = document.getElementById('m-login').value.trim();
  const pass   = document.getElementById('m-pass').value;
  const role   = document.getElementById('m-role').value;
  const zone   = document.getElementById('m-zone').value.trim();
  const tel    = document.getElementById('m-tel').value.trim();
  const statut = document.getElementById('m-status').value;

  if (!prenom || !login) { showNotif('⚠️ Prénom et login obligatoires'); return; }
  if (!uid && !pass)     { showNotif('⚠️ Mot de passe obligatoire pour un nouveau compte'); return; }

  btn.disabled   = true;
  btn.textContent = '⏳ Enregistrement...';

  const payload = { prenom, nom, login, role, zone, telephone:tel, statut };
  if (pass) payload.mot_de_passe = pass;

  let d;
  if (uid) {
    d = await usersApiCall('update', 'POST', payload, uid);
  } else {
    d = await usersApiCall('create', 'POST', payload);
  }

  btn.disabled = false;
  btn.textContent = uid ? '💾 Sauvegarder' : '✅ Créer le compte';

  if (d.success) {
    showNotif(d.message || '✅ Enregistré !');
    buildSysLog('ok', d.message || 'Utilisateur enregistré');
    fermerModal();
    buildAdminPage();
  } else {
    showNotif('❌ ' + (d.message || 'Erreur MySQL'));
  }
}

async function voirUser(id) {
  await ouvrirModal('modifier', id);
  document.getElementById('modal-save-btn').textContent = '✏️ Modifier';
}

function demanderSuppression(id, nomComplet, login) {
  userASupprimer = id;
  document.getElementById('confirm-msg').textContent =
    `Voulez-vous vraiment supprimer le compte de ${nomComplet} (${login}) ? Cette action est irréversible.`;
  document.getElementById('modal-confirm').classList.add('open');
}

function fermerConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  userASupprimer = null;
}

async function confirmerSuppression() {
  if (!userASupprimer) return;
  const btn = document.querySelector('#modal-confirm .btn:last-child');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Suppression...'; }

  const d = await usersApiCall('delete', 'POST', {}, userASupprimer);

  if (btn) { btn.disabled = false; btn.textContent = '🗑 Supprimer'; }

  if (d.success) {
    buildSysLog('warn', d.message || 'Utilisateur supprimé');
    showNotif('🗑 ' + (d.message || 'Compte supprimé'));
    fermerConfirm();
    buildAdminPage();
  } else {
    showNotif('❌ ' + (d.message || 'Erreur MySQL'));
    fermerConfirm();
  }
}

/* ── JOURNAL SYSTÈME depuis MySQL ── */
let sysLogLines = [];

async function chargerJournal() {
  const d = await usersApiCall('journal');
  if (d.success && d.journal.length > 0) {
    const colors = {ok:'#22c55e', warn:'#f59e0b', err:'#ef4444', info:'#60a5fa'};
    sysLogLines = d.journal.map(j => {
      const t = new Date(j.created_at).toLocaleTimeString('fr-FR');
      return `<div style="color:${colors[j.type]||'#94a3b8'}">[${t}] ${j.message}</div>`;
    });
    const el = document.getElementById('sys-log');
    if (el) el.innerHTML = sysLogLines.join('');
  }
}

function buildSysLog(type, msg) {
  const now = new Date().toLocaleTimeString('fr-FR');
  const colors = {ok:'#22c55e', warn:'#f59e0b', err:'#ef4444', info:'#60a5fa'};
  sysLogLines.unshift(`<div style="color:${colors[type]||'#94a3b8'}">[${now}] ${msg}</div>`);
  if (sysLogLines.length > 30) sysLogLines.pop();
  const el = document.getElementById('sys-log');
  if (el) el.innerHTML = sysLogLines.join('');
}

async function viderLog() {
  const d = await usersApiCall('journal_clear','POST');
  sysLogLines = [];
  const el = document.getElementById('sys-log');
  if (el) el.innerHTML = '<div style="color:#475569">Journal vidé.</div>';
  if(d.success) showNotif('🗑 Journal vidé');
}
