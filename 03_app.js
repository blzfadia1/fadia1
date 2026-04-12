/* ════════════════════════════════════════════════════════════════
   AgriSmart — 03 — APP — Initialisation, Navigation, Capteurs live
   initApp(), buildSidebarNav(), navigateTo(), toggleSidebar(), updateLiveSensors()
   Fichier : 03_app.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   INIT APP
═══════════════════════════════════════════════════════ */
function initApp() {
  const usr = CURRENT_USER || {
    avatar:'A', nom:'Utilisateur', badgeLabel:'USER', badgeClass:'badge-agri'
  };
  // Sidebar user info depuis MySQL
  document.getElementById('sb-avatar').textContent  = usr.avatar || usr.prenom?.[0] || 'U';
  document.getElementById('sb-avatar').style.background = state.role==='admin'?'#7c3aed':state.role==='agriculteur'?'#16a34a':'#0284c7';
  document.getElementById('sb-uname').textContent   = usr.nom;
  document.getElementById('sb-badge').textContent   = usr.badgeLabel;
  document.getElementById('sb-badge').className     = `sb-role-badge ${usr.badgeClass}`;

  // Build sidebar nav
  buildSidebarNav();
  // Build mobile nav
  buildMobileNav();

  // Init all pages
  buildDashboard();
  buildRFPage();
  buildLSTMPage();
  buildIoTPage();
  buildHistoryPage();
  if(state.role==='admin') buildAdminPage();

  // Clock
  setInterval(() => {
    document.getElementById('topbar-time').textContent = new Date().toLocaleTimeString('fr-FR');
  }, 1000);

  // Live sensor updates depuis MySQL toutes les 10 secondes
  setInterval(updateLiveSensors, 10000);
  // Rafraîchir alertes toutes les 30 secondes
  setInterval(loadAlertes, 30000);

  navigateTo('dashboard');
  showNotif(`${typeof T==='function'?T('notifWelcome'):'✅ Bienvenue'}, ${usr.nom} !`);

  // ── Connexion MySQL
  checkDbStatus();
  loadDashboardStats();
}

/* ═══════════════════════════════════════════════════════
   CHECK DB STATUS — vérifie que MySQL répond
═══════════════════════════════════════════════════════ */
async function checkDbStatus() {
  const d = await apiCall('stats');
  const dot = document.getElementById('db-status-dot');
  const lbl = document.getElementById('db-status-label');
  if (d && d.success) {
    if (dot) { dot.style.background = '#22c55e'; dot.title = 'MySQL connecté'; }
    if (lbl) lbl.textContent = 'MySQL ✅';
  } else {
    if (dot) { dot.style.background = '#f59e0b'; dot.title = 'Mode hors-ligne'; }
    if (lbl) lbl.textContent = 'Hors-ligne ⚠️';
  }
}

function buildSidebarNav() {
  const nav   = document.getElementById('sidebar-nav');
  const items = NAV_CONFIG[state.role];
  nav.innerHTML = '';
  items.forEach(item => {
    if (item.section) {
      nav.innerHTML += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      nav.innerHTML += `
        <div class="nav-item" id="nav-${item.id}" onclick="navigateTo('${item.id}')">
          <span class="ni">${item.icon}</span>
          <span class="nl">${item.label}</span>
          ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
        </div>`;
    }
  });
}

function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const ni = document.getElementById(`nav-${id}`);
  const pi = document.getElementById(`page-${id}`);
  if (ni) ni.classList.add('active');
  if (pi) pi.classList.add('active');
  state.currentPage = id;

  // Close mobile sidebar if open
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('sidebar-overlay').classList.remove('open');

  // Update mobile bottom nav
  updateMobileNav(id);

  const labels = {
    dashboard:'Tableau de Bord', rf:'Random Forest — Recommandation Culture',
    lstm:'Prévision LSTM — Séries Temporelles', iot:'IoT · ESP32 · LoRaWAN',
    history:'Historique des Données', admin:'Administration',
  };
  document.getElementById('topbar-title').textContent = labels[id] || id;

  // Draw charts on first visit
  if (id==='dashboard')  { drawLSTMChart('lstm-chart', false); loadAlertes(); loadNoeudsLoRa(); loadDashboardStats(); }
  if (id==='lstm')       { drawLSTMChart('lstm-big', true); drawTempChart(); }
  if (id==='history')    buildHistoryPage(); // recharger les données MySQL
  if (id==='iot')        buildIoTPage();     // recharger les nœuds MySQL
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  state.sidebarCollapsed = !state.sidebarCollapsed;
  sb.classList.toggle('collapsed', state.sidebarCollapsed);
  document.getElementById('collapse-icon').textContent = state.sidebarCollapsed ? '▶' : '◀';
}

/* ═══════════════════════════════════════════════════════
   SENSOR DATA (simulated live)
═══════════════════════════════════════════════════════ */
// Données capteurs depuis MySQL (fallback aléatoire si hors-ligne)
let _lastCapteurs = null;

async function updateLiveSensors() {
  const grid = document.getElementById('sensor-grid');
  if (!grid) return;

  const d = await apiCall('capteurs_live');
  if (d.success && d.capteurs && d.capteurs.length > 0) {
    _lastCapteurs = d.capteurs;
    // Agréger toutes les mesures (moyenne des nœuds actifs)
    const avg = (key) => {
      const vals = d.capteurs.map(c=>parseFloat(c[key])).filter(v=>!isNaN(v)&&v>0);
      return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : null;
    };
    const hs = avg('humidite_sol');
    const ha = avg('humidite_air');
    const _t = typeof T === 'function' ? T : k => k;
    const data = [
      { emoji:'🌡️', name:_t('sTemp'),      val: avg('temperature')?.toFixed(1)+'°C',  status:'ok',                            statusLabel:_t('stNormal') },
      { emoji:'💧', name:_t('sHumSol'),    val: Math.round(hs)+'%',                   status: hs<20?'crit':hs<35?'warn':'ok', statusLabel: hs<20?_t('stCritique'):hs<35?_t('stSurveiller'):_t('stBon') },
      { emoji:'🧪', name:_t('sPh'),        val: avg('ph')?.toFixed(1),                status: avg('ph')<5.5?'warn':'ok',       statusLabel: avg('ph')<5.5?_t('stAcide'):_t('stNeutre') },
      { emoji:'🌿', name:_t('sAzote'),     val: Math.round(avg('azote'))+' kg',       status:'ok',                            statusLabel:_t('stSuffisant') },
      { emoji:'⚗️', name:_t('sPhosphore'),val: Math.round(avg('phosphore'))+' kg',   status: avg('phosphore')<25?'crit':'ok', statusLabel: avg('phosphore')<25?_t('stCritique'):_t('stOk') },
      { emoji:'🌧️', name:_t('sHumAir'),   val: Math.round(ha)+'%',                   status:'ok',                            statusLabel:_t('stNormal') },
      { emoji:'☀️', name:_t('sLum'),       val: Math.round(avg('luminosite'))+' lx', status:'ok',                            statusLabel:_t('stBon') },
      { emoji:'🔬', name:_t('sCo2'),       val: Math.round(avg('co2'))+' ppm',       status:'ok',                            statusLabel:_t('stNormal') },
    ];
    grid.innerHTML = data.map(s => `
      <div class="sensor-card ${s.status}">
        <div class="sensor-emoji">${s.emoji}</div>
        <div class="sensor-val">${s.val}</div>
        <div class="sensor-name">${s.name}</div>
        <div class="sensor-status s-${s.status}">${s.statusLabel}</div>
      </div>`).join('');
  } else {
    // Fallback hors-ligne : données aléatoires
    const hs = Math.round(35+Math.random()*30);
    const _t2 = typeof T === 'function' ? T : k => k;
    const data = [
      { emoji:'🌡️', name:_t2('sTemp'),     val: (22+Math.random()*8).toFixed(1)+'°C',  status:'ok',                            statusLabel:_t2('stNormal')+' (local)' },
      { emoji:'💧', name:_t2('sHumSol'),   val: hs+'%',                                status:hs<30?'warn':'ok',               statusLabel:hs<30?_t2('stSurveiller'):_t2('stBon') },
      { emoji:'🧪', name:_t2('sPh'),       val: (5.8+Math.random()*2).toFixed(1),      status:'ok',                            statusLabel:_t2('stNeutre')+' (local)' },
      { emoji:'🌿', name:_t2('sAzote'),    val: Math.round(55+Math.random()*40)+' kg', status:'ok',                            statusLabel:_t2('stSuffisant') },
      { emoji:'⚗️', name:_t2('sPhosphore'),val: Math.round(30+Math.random()*30)+' kg', status:'ok',                            statusLabel:_t2('stOk') },
      { emoji:'🌧️', name:_t2('sHumAir'),  val: Math.round(50+Math.random()*30)+'%',   status:'ok',                            statusLabel:_t2('stNormal') },
      { emoji:'☀️', name:_t2('sLum'),      val: Math.round(600+Math.random()*800)+' lx',status:'ok',                           statusLabel:_t2('stBon') },
      { emoji:'🔬', name:_t2('sCo2'),      val: Math.round(380+Math.random()*50)+' ppm',status:'ok',                           statusLabel:_t2('stNormal') },
    ];
    grid.innerHTML = data.map(s => `
      <div class="sensor-card ${s.status}">
        <div class="sensor-emoji">${s.emoji}</div>
        <div class="sensor-val">${s.val} <span style="font-size:9px;opacity:.4">${_t2('stHorsLigne')}</span></div>
        <div class="sensor-name">${s.name}</div>
        <div class="sensor-status s-${s.status}">${s.statusLabel}</div>
      </div>`).join('');
  }
}
