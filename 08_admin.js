/* ════════════════════════════════════════════════════════════════
   AgriSmart — 08_admin.js — CORRIGE
   Tous les labels admin (stats, table, filtres, modal) via T()
════════════════════════════════════════════════════════════════ */
"use strict";

let filtreActif     = 'tous';
let rechercheActive = '';
let userASupprimer  = null;

/* ── Page Admin ── */
async function buildAdminPage() {
  const s = await usersApiCall('stats');
  if (s.success) {
    document.getElementById('admin-stats').innerHTML = [
      {ico:'👥', bg:'#ede9fe', val:s.total,       lK:'adminStatTotal',  c:'var(--violet)'},
      {ico:'🌾', bg:'#f0fdf4', val:s.agriculteurs, lK:'adminStatAgri',   c:'var(--green)'},
      {ico:'🔧', bg:'#e0f2fe', val:s.techniciens,  lK:'adminStatTech',   c:'var(--blue)'},
      {ico:'✅', bg:'#f0fdf4', val:s.actifs,        lK:'adminStatActifs', c:'var(--green)'},
    ].map(st => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${st.bg}">${st.ico}</div>
        <div class="stat-body">
          <div class="stat-val" style="color:${st.c}">${st.val}</div>
          <div class="stat-label">${T(st.lK)}</div>
        </div>
      </div>`).join('');
  }

  /* Filtres traduits */
  const filtresEl = document.getElementById('admin-filtres');
  if (filtresEl) filtresEl.innerHTML = `
    <button class="filtre-btn ${filtreActif==='tous'?'active':''}" onclick="filtrerUsers('tous',this)">${T('adminFiltreAll')}</button>
    <button class="filtre-btn ${filtreActif==='Admin'?'active':''}" onclick="filtrerUsers('Admin',this)">👑 ${T('adminFiltreAdmins')}</button>
    <button class="filtre-btn ${filtreActif==='Technicien'?'active':''}" onclick="filtrerUsers('Technicien',this)">🔧 ${T('adminFiltreTech')}</button>
    <button class="filtre-btn ${filtreActif==='Agriculteur'?'active':''}" onclick="filtrerUsers('Agriculteur',this)">🌾 ${T('adminFiltreAgri')}</button>`;

  /* Bouton ajouter traduit */
  const addBtn = document.getElementById('admin-add-btn');
  if (addBtn) addBtn.textContent = '➕ ' + T('adminBtnAjouter');

  /* Placeholder recherche */
  const searchEl = document.getElementById('admin-search');
  if (searchEl) searchEl.placeholder = T('adminSearchPlaceholder');

  await renderUsersTable();
  await chargerJournal();
  buildSysLog('info', T('pageDashboard'));
}

/* ── Table utilisateurs ── */
async function renderUsersTable() {
  const t = document.getElementById('users-table-v2');
  t.innerHTML = `<thead><tr><th colspan="8" style="text-align:center;padding:16px;color:#94a3b8;">⏳ ${T('histLoading')}</th></tr></thead>`;

  let extraParams = `&role=${filtreActif === 'tous' ? '' : filtreActif}`;
  if (rechercheActive) extraParams += `&q=${encodeURIComponent(rechercheActive)}`;

  let d;
  try {
    const r = await fetch(`${USERS_API}?action=list${extraParams}`);
    d = await r.json();
  } catch(e) {
    d = { success: false, message: 'Erreur réseau: ' + e.message };
  }

  if (!d.success) {
    t.innerHTML = `<thead><tr><th colspan="8" style="text-align:center;padding:16px;color:#dc2626;">❌ ${d.message||'Erreur MySQL'}</th></tr></thead>`;
    return;
  }

  const cnt = document.getElementById('user-count-badge');
  if (cnt) cnt.textContent = d.total;

  const roleColors   = {Admin:'bg-violet', Agriculteur:'bg-green', Technicien:'bg-blue'};
  const statusColors = {Actif:'bg-green',  Inactif:'bg-amber',     Suspendu:'bg-red'};

  /* En-têtes traduits */
  const thead = `<thead><tr>
    <th>${T('adminTblNum')}</th>
    <th>${T('adminTblNom')}</th>
    <th>${T('adminTblLogin')}</th>
    <th>${T('adminTblRole')}</th>
    <th>${T('adminTblZone')}</th>
    <th>${T('adminTblTel')}</th>
    <th>${T('adminTblStatut')}</th>
    <th>${T('adminTblActions')}</th>
  </tr></thead>`;

  const list  = d.utilisateurs || [];
  const tbody = list.length ? `<tbody>${list.map(u => `
    <tr>
      <td style="color:var(--slate);font-family:'JetBrains Mono',monospace;font-size:11px;">${u.id}</td>
      <td>
        <strong>${u.prenom} ${u.nom}</strong><br>
        <span style="font-size:11px;color:var(--slate);">${T('adminTblCreeLe')} ${u.date_creation}</span>
      </td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${u.login}</td>
      <td><span class="badge ${roleColors[u.role]||'bg-green'}">${u.role}</span></td>
      <td style="font-size:12px;">${u.zone||'—'}</td>
      <td style="font-size:12px;font-family:'JetBrains Mono',monospace;">${u.telephone||'—'}</td>
      <td><span class="badge ${statusColors[u.statut]||'bg-green'}">${u.statut}</span></td>
      <td style="white-space:nowrap;">
        <button class="act-btn act-view" onclick="voirUser(${u.id})" title="👁">👁</button>
        <button class="act-btn act-edit" onclick="ouvrirModal('modifier',${u.id})" title="✏️" style="margin:0 4px;">✏️</button>
        ${u.login!=='admin'?`<button class="act-btn act-del" onclick="demanderSuppression(${u.id},'${u.prenom} ${u.nom}','${u.login}')" title="🗑">🗑</button>`:''}
      </td>
    </tr>`).join('')}</tbody>` :
    `<tbody><tr><td colspan="8" style="text-align:center;padding:24px;color:var(--slate);">—</td></tr></tbody>`;

  t.innerHTML = thead + tbody;
}

function filtrerUsers(role, btn) {
  filtreActif = role;
  document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderUsersTable();
}

function rechercherUsers(val) {
  rechercheActive = val;
  renderUsersTable();
}

/* ── Modal ── */
async function ouvrirModal(mode, id) {
  const m = document.getElementById('modal-user');
  document.getElementById('m-uid').value = '';
  ['m-prenom','m-nom','m-login','m-pass','m-zone','m-tel'].forEach(el => {
    const e = document.getElementById(el);
    if (e) e.value = '';
  });
  const mRole   = document.getElementById('m-role');
  const mStatus = document.getElementById('m-status');
  if (mRole)   mRole.value   = 'Agriculteur';
  if (mStatus) mStatus.value = 'Actif';

  /* Titre et bouton traduits */
  const modalIcon    = document.getElementById('modal-icon');
  const modalTitle   = document.getElementById('modal-title');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  if (mode === 'modifier' && id) {
    const d = await usersApiCall('list&q=', 'GET', null);
    const u = (d.utilisateurs||[]).find(x => x.id === id);
    if (!u) { showNotif('❌ Utilisateur introuvable'); return; }

    if (modalTitle)   modalTitle.textContent   = T('modalEditTitle');
    if (modalIcon)    modalIcon.textContent     = '✏️';
    if (modalSaveBtn) modalSaveBtn.textContent  = T('modalBtnSave');

    document.getElementById('m-uid').value    = u.id;
    document.getElementById('m-prenom').value = u.prenom;
    document.getElementById('m-nom').value    = u.nom;
    document.getElementById('m-login').value  = u.login;
    if (mRole)   mRole.value   = u.role;
    const mZone = document.getElementById('m-zone');
    const mTel  = document.getElementById('m-tel');
    if (mZone)   mZone.value = u.zone||'';
    if (mTel)    mTel.value  = u.telephone||'';
    if (mStatus) mStatus.value = u.statut;
  } else {
    if (modalTitle)   modalTitle.textContent   = T('modalAddTitle');
    if (modalIcon)    modalIcon.textContent     = '➕';
    if (modalSaveBtn) modalSaveBtn.textContent  = T('modalBtnCreate');
  }
  m.classList.add('open');
}

function fermerModal() {
  document.getElementById('modal-user').classList.remove('open');
}

async function sauvegarderUser() {
  const btn    = document.getElementById('modal-save-btn');
  const uid    = parseInt(document.getElementById('m-uid').value) || 0;
  const prenom = document.getElementById('m-prenom').value.trim();
  const nom    = document.getElementById('m-nom').value.trim();
  const login  = document.getElementById('m-login').value.trim();
  const pass   = document.getElementById('m-pass').value;
  const role   = document.getElementById('m-role').value;
  const zone   = document.getElementById('m-zone')?.value.trim()||'';
  const tel    = document.getElementById('m-tel')?.value.trim()||'';
  const statut = document.getElementById('m-status')?.value||'Actif';

  if (!prenom || !login) { showNotif('⚠️ ' + T('mPrenom') + ' / ' + T('mLogin')); return; }
  if (!uid && !pass)     { showNotif('⚠️ ' + T('mPass')); return; }

  btn.disabled = true;
  btn.textContent = '⏳';

  const payload = { prenom, nom, login, role, zone, telephone:tel, statut };
  if (pass) payload.mot_de_passe = pass;

  const d = uid
    ? await usersApiCall('update', 'POST', payload, uid)
    : await usersApiCall('create', 'POST', payload);

  btn.disabled = false;
  btn.textContent = uid ? T('modalBtnSave') : T('modalBtnCreate');

  if (d.success) {
    showNotif(d.message || '✅');
    fermerModal();
    buildAdminPage();
  } else {
    showNotif('❌ ' + (d.message || 'Erreur MySQL'));
  }
}

async function voirUser(id) {
  await ouvrirModal('modifier', id);
}

function demanderSuppression(id, nomComplet, login) {
  userASupprimer = id;
  const msg = document.getElementById('confirm-msg');
  if (msg) msg.textContent = `${T('confirmDeleteSub')} (${nomComplet} — ${login})`;
  const ch3 = document.querySelector('.confirm-box h3');
  if (ch3) ch3.textContent = T('confirmDeleteTitle');
  document.getElementById('modal-confirm').classList.add('open');
}

function fermerConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
  userASupprimer = null;
}

async function confirmerSuppression() {
  if (!userASupprimer) return;
  const d = await usersApiCall('delete', 'POST', {}, userASupprimer);
  if (d.success) {
    showNotif('🗑 ' + (d.message||''));
    fermerConfirm();
    buildAdminPage();
  } else {
    showNotif('❌ ' + (d.message||'Erreur MySQL'));
    fermerConfirm();
  }
}

/* ── Journal système ── */
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
  const d = await usersApiCall('journal_clear', 'POST');
  sysLogLines = [];
  const el = document.getElementById('sys-log');
  if (el) el.innerHTML = `<div style="color:#475569">${T('journalBtnVider')}.</div>`;
  if (d.success) showNotif('🗑 ' + T('journalBtnVider'));
}
