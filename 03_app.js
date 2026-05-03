/* ════════════════════════════════════════════════════════════════
   AgriSmart — 03_app.js
   APP — Initialisation, Navigation, Capteurs live
   initApp(), buildSidebarNav(), navigateTo(), toggleSidebar(), updateLiveSensors()
   ✅ CNN intégré : buildCNNPage() + refreshCNNData() toutes les 60s
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   INIT APP
═══════════════════════════════════════════════════════ */
function initApp() {
  const usr = CURRENT_USER || {
    avatar:'A', nom:'Utilisateur', badgeLabel:'USER', badgeClass:'badge-agri'
  };
  document.getElementById('sb-avatar').textContent  = usr.avatar || usr.prenom?.[0] || 'U';
  document.getElementById('sb-avatar').style.background = state.role==='admin'?'#7c3aed':state.role==='agriculteur'?'#16a34a':'#0284c7';
  document.getElementById('sb-uname').textContent   = usr.nom;
  document.getElementById('sb-badge').textContent   = usr.badgeLabel;
  document.getElementById('sb-badge').className     = `sb-role-badge ${usr.badgeClass}`;

  /* Sidebar + mobile nav */
  buildSidebarNav();
  buildMobileNav();

  /* Init toutes les pages */
  buildDashboard();
  buildRFPage();    // async — charge les données ESP32 automatiquement
  buildLSTMPage();  // async — charge les données ESP32 automatiquement
  buildIoTPage();
  buildHistoryPage();
  if (state.role === 'admin') buildAdminPage();
  buildCNNPage();   // ← CNN

  /* Horloge topbar */
  setInterval(() => {
    document.getElementById('topbar-time').textContent = new Date().toLocaleTimeString('fr-FR');
  }, 1000);

  /* Mises à jour périodiques */
  setInterval(() => updateLiveSensors(), 10000);
  setInterval(loadAlertes, 30000);
  setInterval(refreshCNNData, 60000);   // ← CNN : rafraîchir les données live

  navigateTo('dashboard');
  showNotif(`${typeof T==='function'?T('notifWelcome'):'✅ Bienvenue'}, ${usr.nom} !`);

  checkDbStatus();
  loadDashboardStats();
}

/* ═══════════════════════════════════════════════════════
   CHECK DB STATUS
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

/* ═══════════════════════════════════════════════════════
   SIDEBAR NAV
═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════ */
function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const ni = document.getElementById(`nav-${id}`);
  const pi = document.getElementById(`page-${id}`);
  if (ni) ni.classList.add('active');
  if (pi) pi.classList.add('active');
  state.currentPage = id;

  /* Fermer sidebar mobile */
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('sidebar-overlay').classList.remove('open');

  /* Mobile bottom nav */
  updateMobileNav(id);

  /* Titre topbar */
  const labels = {
    dashboard : 'Tableau de Bord',
    rf        : 'Random Forest — Recommandation Culture',
    lstm      : 'Prévision LSTM — Séries Temporelles',
    iot       : 'IoT · ESP32 · LoRaWAN',
    history   : 'Historique des Données',
    admin     : 'Administration',
    cnn       : 'Analyse CNN — Zones Agricoles',
  };
  document.getElementById('topbar-title').textContent = labels[id] || id;

  /* Hooks par page */
  if (id === 'dashboard') { drawLSTMChart('lstm-chart', false); loadAlertes(); loadNoeudsLoRa(); loadDashboardStats(); }
  if (id === 'lstm')      { drawLSTMChart('lstm-big', true); drawTempChart(); }
  if (id === 'history')   buildHistoryPage();
  if (id === 'iot')       buildIoTPage();
  if (id === 'cnn')       buildCNNPage();   // ← CNN : recharge données live à chaque visite
}

/* ═══════════════════════════════════════════════════════
   SIDEBAR TOGGLE
═══════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  state.sidebarCollapsed = !state.sidebarCollapsed;
  sb.classList.toggle('collapsed', state.sidebarCollapsed);
  document.getElementById('collapse-icon').textContent = state.sidebarCollapsed ? '▶' : '◀';
}

/* ═══════════════════════════════════════════════════════
   SENSOR DATA LIVE (depuis MySQL, fallback aléatoire)
═══════════════════════════════════════════════════════ */
let _lastCapteurs = null;

async function updateLiveSensors() {
  const grid = document.getElementById('sensor-grid');
  if (!grid) return;
  const lbl = document.getElementById('last-update-time');

  // Utilise iot_data.php — endpoint public sans session requise
  let d;
  try {
    const r = await fetch('api/iot_data.php?action=capteurs', { cache:'no-cache' });
    d = await r.json();
    if (d.success && d.capteurs) d.capteurs = d.capteurs; // compatibilité
  } catch(e) { d = { success: false }; }

  if (d.success && d.capteurs && d.capteurs.length > 0) {
    _lastCapteurs = d.capteurs;

    // avg() retourne null si tous les capteurs ont NULL pour cette clé
    const avg = (key) => {
      const nums = d.capteurs
        .map(c => c[key])
        .filter(v => v !== null && v !== undefined && !isNaN(parseFloat(v)))
        .map(v => parseFloat(v));
      return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
    };

    const temp = avg('temperature');
    const hs   = avg('humidite_sol');
    const ha   = avg('humidite_air');
    const ph   = avg('ph');
    const az   = avg('azote');
    const po   = avg('phosphore');
    const ka   = avg('potassium');
    const lux  = avg('luminosite');
    const co2  = avg('co2');
    const _t   = typeof T === 'function' ? T : k => k;

    const data = [
      { emoji:'🌡️', name:_t('sTemp'),
        val:         temp!=null ? temp.toFixed(1)+'°C'        : '—',
        status:      'ok',
        statusLabel: temp!=null ? _t('stNormal')              : '—' },

      { emoji:'💧', name:_t('sHumSol'),
        val:         hs!=null ? Math.round(hs)+'%'            : '— non branché',
        status:      hs!=null ? (hs<20?'crit':hs<35?'warn':'ok') : 'ok',
        statusLabel: hs!=null ? (hs<20?_t('stCritique'):hs<35?_t('stSurveiller'):_t('stBon')) : 'Capteur absent' },

      { emoji:'🧪', name:_t('sPh'),
        val:         ph!=null ? ph.toFixed(1)                 : '— non branché',
        status:      ph!=null ? (ph<5.5?'warn':'ok')          : 'ok',
        statusLabel: ph!=null ? (ph<5.5?_t('stAcide'):_t('stNeutre')) : 'Capteur absent' },

      { emoji:'🌿', name:_t('sAzote'),
        val:         az!=null ? Math.round(az)+' kg'          : '— non branché',
        status:      'ok',
        statusLabel: az!=null ? _t('stSuffisant')             : 'Capteur absent' },

      { emoji:'⚗️', name:_t('sPhosphore'),
        val:         po!=null ? Math.round(po)+' kg'          : '— non branché',
        status:      po!=null ? (po<25?'crit':'ok')           : 'ok',
        statusLabel: po!=null ? (po<25?_t('stCritique'):_t('stOk')) : 'Capteur absent' },

      { emoji:'🌧️', name:_t('sHumAir'),
        val:         ha!=null ? Math.round(ha)+'%'            : '—',
        status:      'ok',
        statusLabel: ha!=null ? _t('stNormal')                : '—' },

      { emoji:'☀️', name:_t('sLum'),
        val:         lux!=null ? Math.round(lux)+' lx'        : '— non branché',
        status:      'ok',
        statusLabel: lux!=null ? _t('stBon')                  : 'Capteur absent' },

      { emoji:'🔬', name:_t('sCo2'),
        val:         co2!=null ? Math.round(co2)+' ppm'       : '— non branché',
        status:      'ok',
        statusLabel: co2!=null ? _t('stNormal')               : 'Capteur absent' },
    ];

    grid.innerHTML = data.map(s => `
      <div class="sensor-card ${s.status}">
        <div class="sensor-emoji">${s.emoji}</div>
        <div class="sensor-val">${s.val}</div>
        <div class="sensor-name">${s.name}</div>
        <div class="sensor-status s-${s.status}">${s.statusLabel}</div>
      </div>`).join('');

    if (lbl) lbl.textContent = '✅ ' + new Date().toLocaleTimeString('fr-FR');

  } else {
    /* ESP32 non connecté — message propre SANS données inventées */
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:28px 16px;">
        <div style="font-size:28px;margin-bottom:8px">📡</div>
        <div style="font-size:14px;font-weight:600;color:var(--slate);margin-bottom:6px">ESP32 non connecté</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">Vérifiez que l'ESP32 est branché et XAMPP lancé</div>
        <button onclick="updateLiveSensors()"
          style="font-size:12px;padding:6px 16px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;">
          🔄 Réessayer
        </button>
      </div>`;
    if (lbl) lbl.textContent = '⚠️ Hors ligne';
  }
}
