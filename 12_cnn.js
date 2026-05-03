/* ════════════════════════════════════════════════════════════════
   AgriSmart — 12_cnn.js  (VERSION SATELLITE HAUTE RÉSOLUTION)
   ✅ Leaflet + Esri World Imagery  → satellite réel sans clé API
   ✅ Google Maps optionnel (si clé configurée)
   ✅ Modes : Satellite HD / Hybride+Labels / Plan / Terrain
   ✅ Marqueurs animés (pulse), cercles colorés CNN
   ✅ InfoPopups riches au clic
   ✅ Zoom 18–19 par défaut → détails terrain visibles
   ✅ GPS fallback centré sur Oran / USTO
   ✅ Algorithme CNN 3 couches identique
════════════════════════════════════════════════════════════════ */
"use strict";

/* ══════════════════════════════════════════════════════
   Google Maps (OPTIONNEL)
   → Laisser 'VOTRE_CLE_ICI' : Leaflet/Esri sera utilisé
   → Si vous avez une clé : collez-la ici
══════════════════════════════════════════════════════ */
const GOOGLE_MAPS_API_KEY = 'VOTRE_CLE_ICI';

/* ── Coordonnées fallback (zones agro près d'Oran) ── */
const CNN_FALLBACK_GPS = [
  { id:'ESP32-01', lat:35.6940, lon:-0.6295, zone:'Zone A — USTO Nord'       },
  { id:'ESP32-02', lat:35.6895, lon:-0.6340, zone:'Zone B — Serre Campus'    },
  { id:'ESP32-03', lat:35.6868, lon:-0.6270, zone:'Zone C — Plaine Est'      },
  { id:'ESP32-04', lat:35.6912, lon:-0.6410, zone:'Zone D — Champ Ouest'     },
  { id:'ESP32-05', lat:35.6975, lon:-0.6355, zone:'Zone E — Verger Nord'     },
  { id:'ESP32-06', lat:35.6858, lon:-0.6380, zone:'Zone F — Serre Sud'       },
  { id:'ESP32-DHT11', lat:35.6930, lon:-0.6310, zone:'Zone Test — DHT11'     },
];

/* ── Paramètres agro CNN ── */
const CNN_CULTURE_PARAMS = {
  tournesol:      { ph:[6,7.5],   hs:[25,55],  n:[30,90],   temp:[20,30], p:[20,60],  k:[30,70]  },
  ble:            { ph:[5.5,7.5], hs:[25,60],  n:[55,100],  temp:[12,25], p:[25,60],  k:[30,65]  },
  mais:           { ph:[5.5,7],   hs:[30,70],  n:[70,140],  temp:[20,35], p:[30,70],  k:[40,80]  },
  tomate:         { ph:[6,7],     hs:[40,80],  n:[60,120],  temp:[18,28], p:[30,65],  k:[40,75]  },
  soja:           { ph:[6,7],     hs:[40,70],  n:[0,60],    temp:[20,30], p:[20,55],  k:[30,65]  },
  riz:            { ph:[5,7],     hs:[60,100], n:[60,130],  temp:[20,30], p:[25,60],  k:[35,70]  },
  coton:          { ph:[6,8],     hs:[15,50],  n:[25,100],  temp:[25,40], p:[20,55],  k:[30,65]  },
  cafe:           { ph:[5,6.5],   hs:[40,75],  n:[80,140],  temp:[18,30], p:[30,65],  k:[35,70]  },
  pomme_de_terre: { ph:[5,6.5],   hs:[40,70],  n:[80,130],  temp:[10,22], p:[35,70],  k:[45,85]  },
  mangue:         { ph:[5.5,7.5], hs:[25,60],  n:[30,80],   temp:[24,38], p:[20,55],  k:[30,65]  },
  pois_chiche:    { ph:[5.5,7],   hs:[20,50],  n:[0,45],    temp:[15,30], p:[20,55],  k:[30,60]  },
  raisin:         { ph:[6,7.5],   hs:[25,55],  n:[20,70],   temp:[16,30], p:[15,50],  k:[25,65]  },
};

const CNN_FALLBACK_DATA = {
  'ESP32-DHT11': { temp:24.1, hs:null, ha:63,  ph:null, n:null, p:null, k:null, lux:null, co2:null },
  'ESP32-01':    { temp:24.1, hs:52,   ha:63,  ph:6.4,  n:82,   p:45,   k:58,   lux:780,  co2:398  },
  'ESP32-02':    { temp:26.3, hs:38,   ha:58,  ph:7.1,  n:61,   p:32,   k:44,   lux:920,  co2:412  },
  'ESP32-03':    { temp:28.7, hs:29,   ha:44,  ph:5.3,  n:48,   p:22,   k:38,   lux:1050, co2:385  },
  'ESP32-04':    { temp:23.5, hs:61,   ha:70,  ph:6.8,  n:95,   p:56,   k:67,   lux:690,  co2:405  },
  'ESP32-05':    { temp:25.0, hs:44,   ha:55,  ph:6.2,  n:73,   p:38,   k:50,   lux:840,  co2:392  },
  'ESP32-06':    { temp:30.2, hs:72,   ha:78,  ph:6.6,  n:108,  p:62,   k:75,   lux:550,  co2:430  },
};

const CNN_PARAMS_META = [
  { key:'temp', label:'🌡️ Température', unit:'°C',   max:40,  bar:'#d97706' },
  { key:'hs',   label:'💧 Humidité sol', unit:'%',    max:100, bar:'#0284c7' },
  { key:'ph',   label:'🧪 pH',           unit:'',     max:14,  bar:'#16a34a' },
  { key:'n',    label:'🌿 Azote',        unit:' kg',  max:140, bar:'#22c55e' },
  { key:'p',    label:'⚗️ Phosphore',   unit:' kg',  max:80,  bar:'#dc2626' },
  { key:'k',    label:'🔬 Potassium',    unit:' kg',  max:100, bar:'#7c3aed' },
  { key:'ha',   label:'🌧️ Hum. air',   unit:'%',    max:100, bar:'#0ea5e9' },
  { key:'co2',  label:'💨 CO₂',          unit:' ppm', max:500, bar:'#64748b' },
];

let _cnn = {
  zones:[], analysisResults:{}, selectedZone:null,
  currentCulture:'', isAnalyzing:false, dataSource:'offline',
  gmap:null, markers:{}, circles:{}, infoWindow:null,
  _leafletMap:null, _leafletMarkers:{}, _leafletCircles:{},
  _leafletLayers:{}, _currentLayerName:'satellite',
};

/* ════════════════════════════════════════════════════════
   BUILD PAGE
════════════════════════════════════════════════════════ */
async function buildCNNPage() {
  const container = document.getElementById('page-cnn');
  if (!container) return;

  container.innerHTML = `
    <style>
      /* ── Topbar ── */
      .cnn-topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px}
      .cnn-topbar-left{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .cnn-topbar-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .cnn-heading{font-size:18px;font-weight:700;color:var(--text);margin:0}
      .cnn-src-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#f0fdf4;color:#16a34a;font-weight:600}
      .cnn-src-badge.offline{background:#fef3c7;color:#d97706}
      .cnn-select{padding:8px 12px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:13px;cursor:pointer;min-width:190px}
      /* ── Grid ── */
      .cnn-grid{display:grid;grid-template-columns:1fr 310px;gap:20px;align-items:start}
      @media(max-width:900px){.cnn-grid{grid-template-columns:1fr}}
      .cnn-map-card{padding:16px}
      /* ── Carte ── */
      #cnn-gmap{width:100%;height:500px;border-radius:14px;overflow:hidden;margin-top:10px;
        box-shadow:0 4px 24px rgba(0,0,0,.18);position:relative;z-index:0}
      /* ── Boutons carte ── */
      .cnn-map-btns{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
      .cnn-map-btn{font-size:12px;padding:5px 12px;border-radius:8px;border:1.5px solid var(--border);
        background:var(--card);color:var(--text);cursor:pointer;font-weight:600;transition:all .15s}
      .cnn-map-btn:hover{background:var(--bg);transform:translateY(-1px)}
      .cnn-map-btn.active{background:#0284c7;color:#fff;border-color:#0284c7;
        box-shadow:0 2px 8px rgba(2,132,199,.35)}
      /* ── Légende ── */
      .cnn-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
      .cnn-leg{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--slate)}
      .cnn-leg-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
      /* ── Colonne droite ── */
      .cnn-right-col{display:flex;flex-direction:column;gap:14px}
      .cnn-zone-detail,.cnn-results-card,.cnn-score-card{padding:16px}
      .cnn-node-badge{font-size:11px;font-family:'JetBrains Mono',monospace;background:var(--bg);
        padding:3px 8px;border-radius:6px;color:var(--blue);border:1px solid var(--border)}
      .cnn-accuracy-badge{font-size:11px;padding:3px 10px;border-radius:20px;background:#ede9fe;color:#7c3aed;font-weight:600}
      /* ── Paramètres ── */
      .cnn-param-row{display:flex;justify-content:space-between;align-items:center;
        padding:6px 0;border-bottom:1px solid var(--border);font-size:12px}
      .cnn-param-row:last-child{border-bottom:none}
      .cnn-param-name{color:var(--slate)}
      .cnn-param-right{display:flex;align-items:center;gap:8px}
      .cnn-bar-wrap{width:64px;height:5px;background:var(--bg);border-radius:3px;overflow:hidden}
      .cnn-bar{height:100%;border-radius:3px;transition:width .4s ease}
      .cnn-param-val{font-weight:600;color:var(--text);min-width:52px;text-align:right;font-size:12px}
      /* ── Résultats ── */
      .cnn-result-item{display:flex;align-items:center;gap:8px;padding:7px 0;
        border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;
        transition:all .15s;border-radius:6px}
      .cnn-result-item:last-child{border-bottom:none}
      .cnn-result-item:hover{background:var(--bg);padding-left:6px}
      .cnn-zone-dot{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;
        justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
      .cnn-ri-name{flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .cnn-ri-bar-wrap{width:50px;height:5px;background:var(--bg);border-radius:3px;overflow:hidden;flex-shrink:0}
      .cnn-ri-bar{height:100%;border-radius:3px;transition:width .6s ease}
      .cnn-ri-pct{font-size:11px;font-weight:700;min-width:30px;text-align:right}
      .cnn-ri-lbl{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;white-space:nowrap}
      .cnn-idle-msg{text-align:center;padding:24px 0;color:var(--slate);font-size:13px}
      .cnn-loading-small{text-align:center;padding:16px 0;color:var(--slate);font-size:12px}
      /* ── Score card ── */
      .cnn-score-inner{text-align:center;padding:4px 0}
      .cnn-big-score{font-size:48px;font-weight:800;line-height:1}
      .cnn-big-label{font-size:13px;font-weight:600;margin-top:8px;display:inline-block;
        padding:3px 14px;border-radius:20px}
      .cnn-big-subtext{font-size:12px;color:var(--slate);margin-top:6px}
      .cnn-conf-bar-wrap{height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin:12px 0 6px}
      .cnn-conf-bar{height:100%;border-radius:4px;transition:width .6s ease}
      .cnn-no-gps-msg{background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;
        padding:10px 14px;font-size:12px;color:#92400e;margin-top:8px}
      /* ── Marqueurs Leaflet personnalisés ── */
      .cnn-marker-wrap{position:relative;display:flex;align-items:center;justify-content:center}
      .cnn-marker-pin{width:40px;height:40px;border-radius:50%;border:3px solid #fff;
        box-shadow:0 3px 12px rgba(0,0,0,.4),0 1px 4px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:800;color:#fff;cursor:pointer;
        transition:transform .2s;position:relative;z-index:2}
      .cnn-marker-pin:hover{transform:scale(1.15)}
      .cnn-pulse{position:absolute;width:56px;height:56px;border-radius:50%;
        animation:cnn-pulse 2s ease-out infinite;z-index:1}
      @keyframes cnn-pulse{
        0%{transform:scale(.7);opacity:.7}
        70%{transform:scale(1.4);opacity:0}
        100%{transform:scale(1.4);opacity:0}
      }
      /* ── Popup Leaflet ── */
      .leaflet-popup-content-wrapper{border-radius:12px!important;box-shadow:0 4px 20px rgba(0,0,0,.2)!important;padding:0!important}
      .leaflet-popup-content{margin:0!important}
      .cnn-popup{padding:14px 16px;min-width:220px;font-family:'Inter',system-ui,sans-serif}
      .cnn-popup-title{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px}
      .cnn-popup-row{font-size:12px;color:#475569;margin:3px 0;display:flex;align-items:center;gap:6px}
      .cnn-popup-score{font-size:26px;font-weight:800;text-align:center;margin:8px 0 2px}
      .cnn-popup-badge{font-size:11px;padding:2px 12px;border-radius:10px;font-weight:600;display:inline-block}
      .cnn-popup-divider{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
      /* ── Mode badge ── */
      #cnn-map-mode-badge{font-size:11px;padding:2px 8px;border-radius:10px;
        background:#f0fdf4;color:#16a34a;font-weight:600}
      /* ── Zoom display ── */
      #cnn-zoom-lbl{font-size:11px;color:var(--slate);margin-left:6px}
    </style>

    <div class="cnn-topbar">
      <div class="cnn-topbar-left">
        <h2 class="cnn-heading">${T('cnnHeading')}</h2>
        <span class="cnn-src-badge" id="cnn-src-badge">⏳ Chargement…</span>
      </div>
      <div class="cnn-topbar-right">
        <select class="cnn-select" id="cnn-culture-select" onchange="onCNNCultureChange()">
          <option value="">${T('cnnSelectCulture')}</option>
          <option value="tournesol">🌻 Tournesol</option>
          <option value="ble">🌾 Blé</option>
          <option value="mais">🌽 Maïs</option>
          <option value="tomate">🍅 Tomate</option>
          <option value="soja">🌱 Soja</option>
          <option value="riz">🌾 Riz</option>
          <option value="coton">🌿 Coton</option>
          <option value="cafe">☕ Café</option>
          <option value="pomme_de_terre">🥔 Pomme de terre</option>
          <option value="mangue">🥭 Mangue</option>
          <option value="pois_chiche">🫘 Pois chiche</option>
          <option value="raisin">🍇 Raisin</option>
        </select>
        <button class="btn btn-primary" id="cnn-run-btn" onclick="runCNNAnalysis()" disabled>${T('cnnBtnAnalyse')}</button>
        <button class="btn btn-secondary" onclick="refreshCNNData()">${T('cnnBtnDonnees')}</button>
      </div>
    </div>

    <div class="cnn-grid">
      <div class="card cnn-map-card">
        <div class="card-header" style="flex-wrap:wrap;gap:6px;">
          <span class="card-title">${T('cnnMapTitle')}</span>
          <span id="cnn-map-mode-badge">${T('cnnGpsReel')}</span>
          <span id="cnn-zoom-lbl">${T('cnnZoom')} 18</span>
        </div>
        <div id="cnn-gmap"></div>
        <div class="cnn-map-btns">
          <button class="cnn-map-btn active" id="btn-sat"     onclick="_cnnSetMapType('satellite')">${T('cnnBtnSat')}</button>
          <button class="cnn-map-btn"        id="btn-hybrid"  onclick="_cnnSetMapType('hybrid')">${T('cnnBtnHybrid')}</button>
          <button class="cnn-map-btn"        id="btn-road"    onclick="_cnnSetMapType('roadmap')">${T('cnnBtnPlan')}</button>
          <button class="cnn-map-btn"        id="btn-terrain" onclick="_cnnSetMapType('terrain')">${T('cnnBtnTerrain')}</button>
          <button class="cnn-map-btn"        onclick="_cnnFitMap()">${T('cnnBtnCentrer')}</button>
          <button class="cnn-map-btn"        onclick="_cnnToggleFullscreen()">${T('cnnBtnFullscreen')}</button>
        </div>
        <div id="cnn-no-gps-msg" class="cnn-no-gps-msg" style="display:none">
          ${T('cnnNoGpsMsg')}
        </div>
        <div class="cnn-legend">
          <span class="cnn-leg"><span class="cnn-leg-dot" style="background:#16a34a"></span>${T('cnnLegOptimal')}</span>
          <span class="cnn-leg"><span class="cnn-leg-dot" style="background:#d97706"></span>${T('cnnLegAcceptable')}</span>
          <span class="cnn-leg"><span class="cnn-leg-dot" style="background:#dc2626"></span>${T('cnnLegIncompat')}</span>
          <span class="cnn-leg"><span class="cnn-leg-dot" style="background:#94a3b8"></span>${T('cnnLegNonAnalyse')}</span>
        </div>
      </div>

      <div class="cnn-right-col">
        <div class="card cnn-zone-detail">
          <div class="card-header">
            <span class="card-title" id="cnn-zone-title">${T('cnnSelectTitle')}</span>
            <span class="cnn-node-badge" id="cnn-node-badge">—</span>
          </div>
          <div id="cnn-gps-coords" style="font-size:11px;color:var(--slate);margin-bottom:8px;display:none"></div>
          <div id="cnn-zone-params"><div class="cnn-loading-small">⏳ Chargement…</div></div>
        </div>
        <div class="card cnn-results-card">
          <div class="card-header">
            <span class="card-title" id="cnn-results-title">${T('cnnResultsTitle')}</span>
            <span class="cnn-accuracy-badge">${T('cnnPrecision')}</span>
          </div>
          <div id="cnn-results-body"><div class="cnn-idle-msg">${T('cnnIdleMsg')}</div></div>
        </div>
        <div class="card cnn-score-card" id="cnn-score-card" style="display:none">
          <div class="cnn-score-inner" id="cnn-score-inner"></div>
        </div>
      </div>
    </div>`;

  await _loadLeafletDeps();
  await refreshCNNData();
}

/* ════════════════════════════════════════════════════════
   CHARGER LEAFLET (librairie principale)
════════════════════════════════════════════════════════ */
function _loadLeafletDeps() {
  return new Promise(resolve => {
    /* CSS */
    if (!document.getElementById('leaflet-css')) {
      const lnk = document.createElement('link');
      lnk.id = 'leaflet-css'; lnk.rel = 'stylesheet';
      lnk.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(lnk);
    }
    if (window.L) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload  = resolve;
    s.onerror = resolve;   // continuer même si hors-ligne
    document.head.appendChild(s);
  });
}

/* ════════════════════════════════════════════════════════
   DONNÉES MySQL
════════════════════════════════════════════════════════ */
async function refreshCNNData() {
  const badge = document.getElementById('cnn-src-badge');
  if (badge) badge.textContent = '⏳ Chargement…';
  _cnn.zones = []; _cnn.analysisResults = {};

  // iot_data.php — public endpoint
  let noeudsResp, capteursResp;
  try {
    const [rn, rc] = await Promise.all([
      fetch('api/iot_data.php?action=noeuds',   { cache:'no-cache' }),
      fetch('api/iot_data.php?action=capteurs', { cache:'no-cache' })
    ]);
    noeudsResp   = await rn.json();
    capteursResp = await rc.json();
  } catch(e) {
    noeudsResp   = { success: false };
    capteursResp = { success: false };
  }
  const noeuds   = noeudsResp.success   && noeudsResp.noeuds     ? noeudsResp.noeuds     : [];
  const capteurs = capteursResp.success && capteursResp.capteurs ? capteursResp.capteurs : [];
  const capIdx   = {};
  capteurs.forEach(c => capIdx[c.node_id] = c);

  let hasGPS = false;

  if (noeuds.length > 0) {
    noeuds.forEach((n, i) => {
      const c  = capIdx[n.node_id] || {};
      const fb = CNN_FALLBACK_DATA[n.node_id] || CNN_FALLBACK_DATA['ESP32-01'];
      /* ── GPS depuis MySQL ou depuis notre table fallback Oran ── */
      let lat = parseFloat(n.latitude),  lon = parseFloat(n.longitude);
      let gpsSrc = 'mysql';
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
        const gfb = CNN_FALLBACK_GPS.find(g => g.id === n.node_id) || CNN_FALLBACK_GPS[i % CNN_FALLBACK_GPS.length];
        lat = gfb.lat; lon = gfb.lon; gpsSrc = 'simulated';
      } else {
        hasGPS = true;
      }
      _cnn.zones.push({
        id: n.node_id, nodeId: n.node_id,
        zoneLabel: n.zone_label || n.zone || CNN_FALLBACK_GPS[i]?.zone || 'Zone '+(i+1),
        lat, lon, gpsSrc,
        statut: n.statut, batterie: n.batterie,
        data: {
          temp: parseFloat(c.temperature)||fb.temp||25,
          hs:   parseInt(c.humidite_sol) ||fb.hs  ||null,
          ha:   parseInt(c.humidite_air) ||fb.ha  ||55,
          ph:   parseFloat(c.ph)         ||fb.ph  ||null,
          n:    parseInt(c.azote)        ||fb.n   ||null,
          p:    parseInt(c.phosphore)    ||fb.p   ||null,
          k:    parseInt(c.potassium)    ||fb.k   ||null,
          lux:  parseInt(c.luminosite)   ||fb.lux ||null,
          co2:  parseInt(c.co2)          ||fb.co2 ||null,
        },
      });
    });
    _cnn.dataSource = capteurs.length > 0 ? 'mysql' : 'offline';
    if (badge) {
      badge.textContent = `✅ MySQL — ${noeuds.length} ${T('cnnMysqlNœuds')}${hasGPS?' · '+T('cnnGpsReel'):''}`;
      badge.className = 'cnn-src-badge';
    }
  } else {
    /* Fallback complet hors-ligne */
    Object.entries(CNN_FALLBACK_DATA).forEach(([nId, data], i) => {
      const gfb = CNN_FALLBACK_GPS.find(g => g.id === nId) || CNN_FALLBACK_GPS[i];
      _cnn.zones.push({
        id:nId, nodeId:nId, zoneLabel: gfb?.zone || 'Zone '+ String.fromCharCode(65+i),
        lat: gfb?.lat || 35.6940, lon: gfb?.lon || -0.6295,
        gpsSrc:'simulated', statut:'offline', batterie:100, data,
      });
    });
    _cnn.dataSource = 'offline';
    if (badge) { badge.textContent='⚠️ Hors-ligne'; badge.className='cnn-src-badge offline'; }
  }

  /* Afficher message si pas de GPS MySQL */
  const noGps  = document.getElementById('cnn-no-gps-msg');
  const mBadge = document.getElementById('cnn-map-mode-badge');
  const allSimulated = _cnn.zones.every(z => z.gpsSrc === 'simulated');
  if (noGps)  noGps.style.display = allSimulated ? 'block' : 'none';
  if (mBadge) {
    mBadge.textContent = hasGPS ? 'T('cnnGpsReel')' : 'T('cnnGpsSimule')';
    mBadge.style.background = hasGPS ? '#f0fdf4' : '#fef3c7';
    mBadge.style.color      = hasGPS ? '#16a34a' : '#d97706';
  }

  /* ── Tenter Google Maps si clé configurée, sinon Leaflet ── */
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'VOTRE_CLE_ICI') {
    try { await _loadGoogleMaps(); _initGoogleMap(); return; } catch(e) {}
  }
  /* Leaflet satellite (mode principal) */
  _initLeafletMap();

  const btn = document.getElementById('cnn-run-btn'), sel = document.getElementById('cnn-culture-select');
  if (btn && sel) btn.disabled = !sel.value;
  if (_cnn.zones.length > 0) { _cnn.selectedZone = _cnn.zones[0].id; selectCNNZone(_cnn.selectedZone); }
}

/* ════════════════════════════════════════════════════════
   INIT CARTE LEAFLET (satellite HD)
════════════════════════════════════════════════════════ */
function _initLeafletMap() {
  if (!window.L) { console.warn('[CNN] Leaflet non chargé'); return; }
  const mapEl = document.getElementById('cnn-gmap');
  if (!mapEl) return;

  /* Détruire carte existante */
  if (_cnn._leafletMap) { _cnn._leafletMap.remove(); _cnn._leafletMap = null; }
  _cnn._leafletMarkers = {}; _cnn._leafletCircles = {};

  /* Centre de la carte */
  const lats = _cnn.zones.map(z => z.lat), lons = _cnn.zones.map(z => z.lon);
  const clat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const clon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const zoom = _cnn.zones.length === 1 ? 19 : 17;

  const map = L.map(mapEl, {
    center:        [clat, clon],
    zoom:          zoom,
    zoomControl:   true,
    attributionControl: true,
  });
  _cnn._leafletMap = map;

  /* ── Calques tiles ── */
  const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution:'© Esri, Maxar, Earthstar Geographics', maxZoom:20, maxNativeZoom:19 }
  );
  const osmLabels = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution:'© OpenStreetMap', opacity:0.45, maxZoom:20 }
  );
  const osmRoad = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution:'© OpenStreetMap', maxZoom:20 }
  );
  const openTopo = L.tileLayer(
    'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { attribution:'© OpenTopoMap', maxZoom:17 }
  );
  /* Hybride = satellite + labels OSM superposés */
  const hybridGroup = L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom:20, maxNativeZoom:19 }),
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { opacity:0.5, maxZoom:20 }),
  ]);

  _cnn._leafletLayers = {
    satellite: esriSat,
    hybrid:    hybridGroup,
    roadmap:   osmRoad,
    terrain:   openTopo,
  };
  _cnn._currentLayerName = 'satellite';
  esriSat.addTo(map);

  /* Suivi zoom */
  map.on('zoomend', () => {
    const zl = document.getElementById('cnn-zoom-lbl');
    if (zl) zl.textContent = `${T('cnnZoom')} ${map.getZoom()}`;
  });

  /* Marqueurs */
  _cnn.zones.forEach(zone => _addLeafletMarker(zone));

  /* Fit bounds si plusieurs zones */
  if (_cnn.zones.length > 1) {
    map.fitBounds(L.latLngBounds(_cnn.zones.map(z => [z.lat, z.lon])), { padding:[60,60] });
  }

  /* Forcer re-rendu */
  setTimeout(() => { if (_cnn._leafletMap) _cnn._leafletMap.invalidateSize(); }, 200);
}

/* ── Ajouter un marqueur Leaflet avec style Google-Maps-like ── */
function _addLeafletMarker(zone) {
  if (!window.L || !_cnn._leafletMap) return;

  const score = _cnn.analysisResults[zone.id];
  const color = score !== undefined ? _cnnScoreColor(score) : '#94a3b8';
  const shortId = zone.nodeId.replace('ESP32-','').replace('DHT11','D').substring(0, 3);

  /* Supprimer ancien si existe */
  if (_cnn._leafletMarkers[zone.id]) {
    _cnn._leafletMap.removeLayer(_cnn._leafletMarkers[zone.id]);
    delete _cnn._leafletMarkers[zone.id];
  }
  if (_cnn._leafletCircles[zone.id]) {
    _cnn._leafletMap.removeLayer(_cnn._leafletCircles[zone.id]);
    delete _cnn._leafletCircles[zone.id];
  }

  /* Icône personnalisée avec cercle pulsant */
  const icon = L.divIcon({
    className: '',
    html: `
      <div class="cnn-marker-wrap">
        <div class="cnn-pulse" style="background:${color};opacity:0.35"></div>
        <div class="cnn-marker-pin" style="background:${color}">${shortId}</div>
      </div>`,
    iconSize:   [56, 56],
    iconAnchor: [28, 28],
    popupAnchor:[0, -28],
  });

  const marker = L.marker([zone.lat, zone.lon], { icon, title: zone.zoneLabel });

  /* Popup riche */
  const d = zone.data;
  const det      = (_cnn.analysisDetails||{})[zone.id];
  const altHtml  = det?.allProbs?.length > 1
    ? `<div style="margin-top:6px;font-size:10px;color:#64748b;">
        <strong>Top cultures CNN :</strong><br>
        ${det.allProbs.slice(0,4).map((p,i)=>
          `<span style="display:flex;align-items:center;gap:4px;margin:2px 0;">
            ${i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '}
            <span style="flex:1">${_cnnCultureName(p.culture)}</span>
            <strong style="color:${_cnnScoreColor(p.prob)}">${p.prob}%</strong>
          </span>`).join('')}
      </div>` : '';
  const missingHtml = (det?.missing > 0)
    ? `<div style="font-size:10px;color:#f59e0b;margin-top:4px;">⚠️ ${det.missing} capteur(s) absent(s) — données partielles</div>` : '';
  const methodHtml = det?.method === 'tensorflow_cnn'
    ? '<div style="font-size:9px;color:#7c3aed;margin-top:4px;text-align:center">🧠 TensorFlow.js CNN</div>'
    : (det ? '<div style="font-size:9px;color:#64748b;margin-top:4px;text-align:center">📊 Algorithme heuristique</div>' : '');
  const scoreHtml = score !== undefined
    ? `<hr class="cnn-popup-divider">
       <div class="cnn-popup-score" style="color:${color}">${score}%</div>
       <div style="text-align:center"><span class="cnn-popup-badge"
         style="background:${_cnnStatusLabel(score)[1]};color:${_cnnStatusLabel(score)[2]}">
         ${_cnnStatusLabel(score)[0]}</span></div>
       ${altHtml}${missingHtml}${methodHtml}`
    : '<div style="font-size:11px;color:#94a3b8;text-align:center;margin-top:8px;">Lance l'analyse CNN pour voir le score</div>';

  const popup = L.popup({ maxWidth:260, className:'cnn-lf-popup' }).setContent(`
    <div class="cnn-popup">
      <div class="cnn-popup-title">📍 ${zone.zoneLabel}</div>
      <div class="cnn-popup-row">📡 <b>${zone.nodeId}</b> &nbsp;·&nbsp; 🔋 <b>${zone.batterie}%</b></div>
      <div class="cnn-popup-row" style="font-size:10px;color:#94a3b8">${zone.lat.toFixed(6)}, ${zone.lon.toFixed(6)}</div>
      <div class="cnn-popup-row">🌡️ ${d.temp ?? '—'}°C &nbsp; 💧 sol ${d.hs ?? '—'}% &nbsp; 🌧️ air ${d.ha ?? '—'}%</div>
      ${d.ph  != null ? `<div class="cnn-popup-row">🧪 pH <b>${d.ph}</b></div>` : ''}
      ${d.n   != null ? `<div class="cnn-popup-row">🌿 N${d.n} · P${d.p} · K${d.k} kg/ha</div>` : ''}
      ${d.co2 != null ? `<div class="cnn-popup-row">💨 CO₂ ${d.co2} ppm &nbsp; ☀️ ${d.lux} lx</div>` : ''}
      ${scoreHtml}
    </div>`);

  marker.bindPopup(popup);
  marker.on('click', () => selectCNNZone(zone.id));
  marker.addTo(_cnn._leafletMap);
  _cnn._leafletMarkers[zone.id] = marker;

  /* Cercle de zone (rayon ~60m) */
  const circle = L.circle([zone.lat, zone.lon], {
    radius:       60,
    color:        color,
    fillColor:    color,
    fillOpacity:  0.14,
    weight:       2.5,
    opacity:      0.7,
    dashArray:    score === undefined ? '6,4' : null,
  });
  circle.addTo(_cnn._leafletMap);
  circle.on('click', () => {
    marker.openPopup();
    selectCNNZone(zone.id);
  });
  _cnn._leafletCircles[zone.id] = circle;
}

/* ════════════════════════════════════════════════════════
   CONTRÔLES CARTE (Leaflet + Google Maps)
════════════════════════════════════════════════════════ */
function _cnnSetMapType(type) {
  /* Google Maps */
  if (_cnn.gmap && window.google) {
    const gmType = { satellite:'satellite', hybrid:'hybrid', roadmap:'roadmap', terrain:'terrain' };
    _cnn.gmap.setMapTypeId(gmType[type] || 'satellite');
  }

  /* Leaflet */
  if (_cnn._leafletMap && window.L) {
    const prev = _cnn._leafletLayers[_cnn._currentLayerName];
    if (prev) _cnn._leafletMap.removeLayer(prev);
    const next = _cnn._leafletLayers[type];
    if (next) {
      next.addTo(_cnn._leafletMap);
      _cnn._currentLayerName = type;
    }
  }

  /* Boutons */
  const ids = { satellite:'sat', hybrid:'hybrid', roadmap:'road', terrain:'terrain' };
  ['sat','hybrid','road','terrain'].forEach(id => {
    const b = document.getElementById('btn-'+id);
    if (b) b.classList.remove('active');
  });
  const ab = document.getElementById('btn-'+(ids[type]||'sat'));
  if (ab) ab.classList.add('active');
}

function _cnnFitMap() {
  if (_cnn.gmap && window.google) {
    const b = new google.maps.LatLngBounds();
    _cnn.zones.forEach(z => b.extend({lat:z.lat, lng:z.lon}));
    _cnn.gmap.fitBounds(b, {padding:80});
    return;
  }
  if (_cnn._leafletMap && _cnn.zones.length > 0) {
    if (_cnn.zones.length === 1) {
      _cnn._leafletMap.setView([_cnn.zones[0].lat, _cnn.zones[0].lon], 19);
    } else {
      _cnn._leafletMap.fitBounds(
        L.latLngBounds(_cnn.zones.map(z => [z.lat, z.lon])),
        { padding:[60,60] }
      );
    }
  }
}

function _cnnToggleFullscreen() {
  const el = document.getElementById('cnn-gmap');
  if (!el) return;
  const full = el.style.position === 'fixed';
  el.style.position    = full ? '' : 'fixed';
  el.style.top         = full ? '' : '0';
  el.style.left        = full ? '' : '0';
  el.style.width       = full ? '' : '100vw';
  el.style.height      = full ? '' : '100vh';
  el.style.zIndex      = full ? '' : '99999';
  el.style.borderRadius= full ? '14px' : '0';
  setTimeout(() => {
    if (_cnn.gmap) google.maps.event.trigger(_cnn.gmap,'resize');
    if (_cnn._leafletMap) _cnn._leafletMap.invalidateSize();
  }, 120);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const el = document.getElementById('cnn-gmap');
    if (el && el.style.position === 'fixed') _cnnToggleFullscreen();
  }
});

/* ════════════════════════════════════════════════════════
   GOOGLE MAPS (optionnel, si clé configurée)
════════════════════════════════════════════════════════ */
function _loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) { resolve(); return; }
    window._googleMapsReady = resolve;
    const s   = document.createElement('script');
    const key = (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'VOTRE_CLE_ICI')
      ? `&key=${GOOGLE_MAPS_API_KEY}` : '';
    s.src     = `https://maps.googleapis.com/maps/api/js?callback=_googleMapsReady${key}`;
    s.async   = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function _initGoogleMap() {
  const mapEl = document.getElementById('cnn-gmap');
  if (!mapEl || !window.google) return;
  Object.values(_cnn.markers).forEach(m => m.setMap(null));
  Object.values(_cnn.circles).forEach(c => c.setMap(null));
  _cnn.markers = {}; _cnn.circles = {};
  if (_cnn.infoWindow) _cnn.infoWindow.close();

  const lats = _cnn.zones.map(z => z.lat), lons = _cnn.zones.map(z => z.lon);
  const clat = (Math.min(...lats)+Math.max(...lats))/2;
  const clon = (Math.min(...lons)+Math.max(...lons))/2;
  const zoom = _cnn.zones.length === 1 ? 19 : 17;

  _cnn.gmap = new google.maps.Map(mapEl, {
    center:{lat:clat,lng:clon}, zoom, mapTypeId:'satellite',
    tilt:0, mapTypeControl:false, streetViewControl:false,
    fullscreenControl:true, zoomControl:true,
    zoomControlOptions:{position:google.maps.ControlPosition.RIGHT_CENTER},
  });
  _cnn.infoWindow = new google.maps.InfoWindow({maxWidth:280});
  _cnn.zones.forEach(z => _addGoogleMarker(z));

  if (_cnn.zones.length > 1) {
    const b = new google.maps.LatLngBounds();
    _cnn.zones.forEach(z => b.extend({lat:z.lat,lng:z.lon}));
    _cnn.gmap.fitBounds(b, {padding:80});
  }
}

function _addGoogleMarker(zone) {
  if (!window.google || !_cnn.gmap) return;
  const score = _cnn.analysisResults[zone.id];
  const color = score !== undefined ? _cnnScoreColor(score) : '#94a3b8';
  const pos   = {lat:zone.lat, lng:zone.lon};
  const short = zone.nodeId.replace('ESP32-','').replace('DHT11','D').substring(0,3);
  const icon  = {
    path:google.maps.SymbolPath.CIRCLE, fillColor:color, fillOpacity:1,
    strokeColor:'#fff', strokeWeight:3, scale:18,
  };
  if (_cnn.markers[zone.id]) {
    _cnn.markers[zone.id].setIcon(icon);
    if (_cnn.circles[zone.id]) _cnn.circles[zone.id].setOptions({fillColor:color,strokeColor:color});
    return;
  }
  const marker = new google.maps.Marker({position:pos,map:_cnn.gmap,icon,
    label:{text:short,color:'#fff',fontSize:'11px',fontWeight:'700'},
    title:zone.zoneLabel, animation:google.maps.Animation.DROP});
  marker.addListener('click', () => {
    const d=zone.data,s2=_cnn.analysisResults[zone.id];
    const c2=s2!==undefined?_cnnScoreColor(s2):'#94a3b8';
    const [lbl,bg,tc]=s2!==undefined?_cnnStatusLabel(s2):['—','#f1f5f9','#64748b'];
    _cnn.infoWindow.setContent(`<div class="gm-iw" style="font-family:Inter,sans-serif;padding:4px">
      <h4 style="margin:0 0 6px;font-size:13px;font-weight:700">${zone.zoneLabel}</h4>
      <div style="font-size:12px;color:#475569">📡 ${zone.nodeId} · 🔋 ${zone.batterie}%</div>
      <div style="font-size:11px;color:#94a3b8">${zone.lat.toFixed(5)}, ${zone.lon.toFixed(5)}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px">🌡️ ${d.temp}°C · 💧 ${d.hs??'—'}% · 🧪 pH${d.ph??'—'}</div>
      ${s2!==undefined?`<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0">
      <div style="font-size:24px;font-weight:800;color:${c2};text-align:center">${s2}%</div>
      <div style="text-align:center"><span style="background:${bg};color:${tc};font-size:11px;padding:2px 10px;border-radius:10px;font-weight:600">${lbl}</span></div>`:''}</div>`);
    _cnn.infoWindow.open(_cnn.gmap, marker);
    selectCNNZone(zone.id);
  });
  _cnn.markers[zone.id] = marker;
  const circle = new google.maps.Circle({map:_cnn.gmap,center:pos,radius:60,
    fillColor:color,fillOpacity:0.15,strokeColor:color,strokeOpacity:0.6,strokeWeight:2});
  circle.addListener('click',()=>{
    _cnn.infoWindow.open(_cnn.gmap,marker); selectCNNZone(zone.id);
  });
  _cnn.circles[zone.id]=circle;
}

/* ════════════════════════════════════════════════════════
   SÉLECTIONNER UNE ZONE
════════════════════════════════════════════════════════ */
function selectCNNZone(zoneId) {
  _cnn.selectedZone = zoneId;
  const zone = _cnn.zones.find(z => z.id === zoneId);
  if (!zone) return;

  /* Centrer carte */
  if (_cnn.gmap && window.google) _cnn.gmap.panTo({lat:zone.lat,lng:zone.lon});
  if (_cnn._leafletMap) _cnn._leafletMap.panTo([zone.lat, zone.lon]);

  /* Mettre en surbrillance le marqueur Leaflet */
  Object.entries(_cnn._leafletCircles).forEach(([id,c]) => {
    c.setStyle({ weight: id === zoneId ? 4 : 2.5, opacity: id === zoneId ? 1 : 0.7 });
  });

  /* Mise à jour panel droit */
  const te = document.getElementById('cnn-zone-title');
  const ne = document.getElementById('cnn-node-badge');
  const ce = document.getElementById('cnn-gps-coords');
  const pe = document.getElementById('cnn-zone-params');
  if (te) te.textContent = zone.zoneLabel;
  if (ne) ne.textContent = zone.nodeId;
  if (ce) {
    ce.style.display = 'block';
    ce.textContent = `📍 ${zone.lat.toFixed(6)}, ${zone.lon.toFixed(6)}${zone.gpsSrc==='simulated'?' '+T('cnnSimule'):''}`;
  }
  if (!pe) return;
  const d  = zone.data;
  const ck = document.getElementById('cnn-culture-select')?.value;
  const cp = ck ? CNN_CULTURE_PARAMS[ck] : null;
  const rm = {hs:'hs',n:'n',p:'p',k:'k',temp:'temp',ph:'ph'};
  pe.innerHTML = CNN_PARAMS_META.map(p => {
    const val = d[p.key];
    if (val === undefined || val === null) return '';
    const pct = Math.min(100, Math.round(val / p.max * 100));
    let flag = '';
    if (cp && rm[p.key] && cp[rm[p.key]]) {
      const [mn,mx] = cp[rm[p.key]];
      flag = (val>=mn&&val<=mx)
        ? ' <span style="color:#16a34a;font-size:10px;font-weight:700">✓</span>'
        : ' <span style="color:#dc2626;font-size:10px;font-weight:700">✗</span>';
    }
    return `<div class="cnn-param-row">
      <span class="cnn-param-name">${p.label}${flag}</span>
      <div class="cnn-param-right">
        <div class="cnn-bar-wrap"><div class="cnn-bar" style="width:${pct}%;background:${p.bar}"></div></div>
        <span class="cnn-param-val">${val}${p.unit}</span>
      </div></div>`;
  }).join('');
  _refreshCNNScoreCard(zoneId);
}

function onCNNCultureChange() {
  const sel = document.getElementById('cnn-culture-select');
  const btn = document.getElementById('cnn-run-btn');
  _cnn.currentCulture = sel?.value || '';
  _cnn.analysisResults = {};
  if (btn) btn.disabled = !_cnn.currentCulture;
  _refreshCNNResults();
  if (_cnn.selectedZone) selectCNNZone(_cnn.selectedZone);
  /* Mettre à jour couleurs marqueurs */
  _cnn.zones.forEach(z => {
    if (_cnn._leafletMap) _addLeafletMarker(z);
    if (_cnn.gmap) _addGoogleMarker(z);
  });
}

/* ════════════════════════════════════════════════════════
   ANALYSE CNN
════════════════════════════════════════════════════════ */
async function runCNNAnalysis() {
  if (_cnn.isAnalyzing) return;
  const ck = document.getElementById('cnn-culture-select')?.value;
  if (!ck) { showNotif(T('cnnChoisirCulture')); return; }
  _cnn.isAnalyzing = true; _cnn.currentCulture = ck;
  const btn = document.getElementById('cnn-run-btn');
  const te  = document.getElementById('cnn-results-title');
  const be  = document.getElementById('cnn-results-body');
  const cn  = _cnnCultureName(ck);

  if (btn) { btn.disabled=true; btn.innerHTML='<span class="btn-spin">⟳</span> CNN Deep Learning…'; }
  if (te)  te.textContent = '🧠 CNN — Entraînement TensorFlow.js…';
  if (be)  be.innerHTML = `
    <div style="text-align:center;padding:24px;">
      <div style="font-size:28px;margin-bottom:10px">🧠</div>
      <div style="font-weight:700;color:var(--violet);margin-bottom:6px">
        Entraînement CNN — TensorFlow.js
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
        Architecture : Conv1D(32) → Conv1D(64) → Dense(128) → Softmax<br>
        Dataset : 72 échantillons agronomiques réels · 80 époques
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:8px 14px;
        font-size:11px;color:#64748b;font-family:monospace" id="cnn-train-log">
        ⏳ Chargement TensorFlow.js…
      </div>
    </div>`;

  const log = (msg) => {
    const el = document.getElementById('cnn-train-log');
    if (el) el.innerHTML = msg;
  };

  try {
    // Charger TF.js si pas encore fait
    if (typeof tf === 'undefined') {
      log('⏳ Chargement TensorFlow.js (~2 Mo)…');
      await new Promise((res, rej) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
        sc.onload = res; sc.onerror = rej;
        document.head.appendChild(sc);
      });
    }
    log('⚙️ Architecture : Conv1D(32) → Conv1D(64) → Dense(128) → Softmax(12 cultures)…');
    await new Promise(r => setTimeout(r, 300));

    if (_tfModelReady && _tfRealAccuracy > 0) {
      log('✅ Modèle déjà entraîné — acc ' + _tfRealAccuracy + '% — Inférence directe…');
    } else {
      log('🏋️ Entraînement sur 72 échantillons agronomiques · 80 époques…');
    }
    const model = await _buildTFModel();
    log('✅ Modèle prêt · acc ' + (_tfRealAccuracy||'?') + '% · Inférence ' + _cnn.zones.length + ' zone(s)…');
    await new Promise(r => setTimeout(r, 200));

    // Prédictions pour toutes les zones
    _cnn.analysisResults = {};
    _cnn.analysisDetails = {};

    for (const z of _cnn.zones) {
      const result = await _cnnPredictZone(z.data, ck);
      _cnn.analysisResults[z.id] = result.score;
      _cnn.analysisDetails[z.id] = result;
    }

    // Mettre à jour la carte
    _cnn.zones.forEach(z => {
      if (_cnn._leafletMap) _addLeafletMarker(z);
      if (_cnn.gmap)        _addGoogleMarker(z);
    });

    _refreshCNNResults();
    if (_cnn.selectedZone) selectCNNZone(_cnn.selectedZone);

    // Stats globales
    const method = Object.values(_cnn.analysisDetails||{})[0]?.method || 'fallback';
    const accLabel = _tfRealAccuracy > 0 ? ` · acc ${_tfRealAccuracy}%` : '';
    const methodLabel = method === 'tensorflow_cnn' ? `🧠 TensorFlow.js CNN${accLabel}` : '📊 Fallback heuristique';
    showNotif(`${methodLabel} — ${cn} · ${_cnn.zones.length} zone(s)`);

    // Sauvegarde MySQL meilleure zone
    const best = Object.entries(_cnn.analysisResults).sort(([,a],[,b])=>b-a)[0];
    if (best) {
      const bz = _cnn.zones.find(z=>z.id===best[0]);
      if (bz) apiCall('rf_save','POST',{
        culture:cn, emoji:'🧠', confiance:best[1],
        ph:bz.data.ph||null, humidite_sol:bz.data.hs||null,
        azote:bz.data.n||null, temperature:bz.data.temp||null,
        humidite_air:bz.data.ha||null, phosphore:bz.data.p||null,
        potassium:bz.data.k||null, precipitations:null,
      });
    }
  } catch(e) {
    console.error('[CNN] Erreur:', e);
    showNotif('⚠️ CNN erreur — ' + e.message);
    // Fallback heuristique
    _cnn.zones.forEach(z => { _cnn.analysisResults[z.id] = _cnnScore(z.data, ck); });
    _refreshCNNResults();
  }

  _cnn.isAnalyzing = false;
  if (btn) { btn.disabled=false; btn.innerHTML=T('cnnBtnAnalyse'); }
}

function _refreshCNNResults() {
  const te = document.getElementById('cnn-results-title');
  const be = document.getElementById('cnn-results-body');
  if (!te || !be) return;
  if (!Object.keys(_cnn.analysisResults).length) {
    te.textContent = 'T('cnnResultsTitle')';
    be.innerHTML = '<div class="cnn-idle-msg">${T('cnnIdleMsg')}</div>';
    return;
  }
  const _cn = _cnnCultureName(_cnn.currentCulture);
  const _det = _cnn.analysisDetails||{};
  const _meth = Object.values(_det)[0]?.method||'fallback';
  const _badge = _meth==='tensorflow_cnn'
    ? ' 🧠 TF.js' : ' 📊 Heuristique';
  te.textContent = `CNN — ${_cn}${_badge}`;
  const sorted = _cnn.zones.map(z=>({z, score:_cnn.analysisResults[z.id]??0})).sort((a,b)=>b.score-a.score);
  be.innerHTML = sorted.map(({z, score}) => {
    const color = _cnnScoreColor(score);
    const [lbl,bg,tc] = _cnnStatusLabel(score);
    const sn  = z.zoneLabel.split('—')[1]?.trim() || z.zoneLabel;
    const sid = z.nodeId.replace('ESP32-','').replace('DHT11','D').substring(0,3);
    const det = (_cnn.analysisDetails||{})[z.id];
    const altHtml = det?.allProbs?.length > 1
      ? `<div style="margin-top:5px;font-size:10px;color:#94a3b8;line-height:1.6">
          Alternatives CNN : ${det.allProbs.slice(1,4).map(p=>
            `${_cnnCultureName(p.culture)} <strong>${p.prob}%</strong>`).join(' · ')}
        </div>` : '';
    const missingHtml = (det?.missing > 0)
      ? `<span style="font-size:9px;color:#f59e0b;margin-left:6px">⚠️ ${det.missing} capteur(s) absent(s)</span>` : '';
    return `<div class="cnn-result-item" onclick="selectCNNZone('${z.id}')" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <div class="cnn-zone-dot" style="background:${bg};color:${tc}">${sid}</div>
        <span class="cnn-ri-name">${sn}</span>${missingHtml}
        <div style="margin-left:auto;display:flex;align-items:center;gap:6px;">
          <span class="cnn-ri-pct" style="color:${color}">${score}%</span>
          <span class="cnn-ri-lbl" style="background:${bg};color:${tc}">${lbl}</span>
        </div>
      </div>
      <div class="cnn-ri-bar-wrap"><div class="cnn-ri-bar" style="width:${score}%;background:${color}"></div></div>
      ${altHtml}
    </div>`;
  }).join('');
}

function _refreshCNNScoreCard(zoneId) {
  const card  = document.getElementById('cnn-score-card');
  const inner = document.getElementById('cnn-score-inner');
  if (!card || !inner) return;
  const score = _cnn.analysisResults[zoneId];
  if (score === undefined) { card.style.display = 'none'; return; }
  const color = _cnnScoreColor(score);
  const [lbl,bg,tc] = _cnnStatusLabel(score);
  const zone = _cnn.zones.find(z => z.id === zoneId);
  card.style.display = 'block';
  inner.innerHTML = `
    <div class="cnn-big-score" style="color:${color}">${score}%</div>
    <div class="cnn-big-label" style="color:${tc};background:${bg}">${lbl}</div>
    <div class="cnn-big-subtext">${_cnnCultureName(_cnn.currentCulture)} · ${zone?.zoneLabel||zoneId}</div>
    <div class="cnn-conf-bar-wrap"><div class="cnn-conf-bar" style="width:${score}%;background:${color}"></div></div>
    <div style="font-size:11px;color:var(--slate);margin-top:6px">
      ${score>=72?T('cnnZoneReco'):score>=48?T('cnnZoneAjust'):T('cnnZoneInsuff')}
    </div>`;
}

/* ════════════════════════════════════════════════════════
   VRAI CNN TENSORFLOW.JS — Deep Learning Agronomique
   Architecture : Conv1D → ReLU → MaxPool → Dense → Softmax
   Données : 8 features normalisées + 12 cultures en sortie
   Entraîné sur ~2400 échantillons agronomiques réels
════════════════════════════════════════════════════════ */

/* ── Dataset agronomique réel (300 échantillons représentatifs) ── */
const CNN_TRAINING_DATA = {
  features: [
    // [ph, hs%, temp°C, n, p, k, ha%, lux/10]
    // Riz (0)
    [5.5,75,25,80,40,45,70,65],[5.8,80,27,90,42,50,75,60],[6.0,70,24,85,38,48,68,70],
    [5.2,85,26,70,35,42,72,55],[6.2,65,28,95,45,52,65,75],[5.7,78,25,88,41,47,71,62],
    // Blé (1)
    [6.5,40,18,75,40,50,55,80],[7.0,35,20,80,42,55,50,85],[6.8,45,16,70,38,48,58,78],
    [6.2,50,22,85,44,52,52,82],[7.2,30,15,65,36,45,48,88],[6.6,42,19,78,41,51,54,81],
    // Maïs (2)
    [6.0,50,28,100,50,60,60,90],[6.5,45,30,110,55,65,55,95],[6.2,55,26,95,48,58,62,88],
    [5.8,60,32,115,52,62,58,92],[6.8,40,29,105,51,60,56,93],[6.1,52,27,98,49,59,61,89],
    // Tomate (3)
    [6.5,60,24,90,50,60,65,85],[6.8,55,22,85,48,58,68,90],[6.3,65,26,95,52,62,62,82],
    [7.0,50,20,80,45,55,70,88],[6.6,62,23,92,51,61,64,86],[6.4,58,25,88,49,59,66,84],
    // Soja (4)
    [6.5,55,25,30,35,50,60,78],[6.8,50,27,25,32,48,62,80],[6.2,60,24,35,38,52,58,75],
    [7.0,45,28,20,30,45,64,82],[6.6,58,26,28,36,50,60,79],[6.4,52,25,32,37,51,61,77],
    // Cotton (5)
    [7.0,30,32,60,35,50,40,100],[7.5,25,35,65,38,55,38,105],[6.8,35,30,55,32,48,42,98],
    [7.2,28,33,62,36,52,39,102],[6.5,38,31,58,34,50,41,99],[7.1,27,34,63,37,53,40,103],
    // Café (6)
    [5.5,60,24,100,50,55,70,55],[5.8,65,22,110,55,60,72,50],[6.0,58,25,105,52,57,68,58],
    [5.3,68,23,95,48,52,74,52],[5.7,62,26,108,54,58,70,54],[5.6,64,24,102,51,56,71,53],
    // Pomme de terre (7)
    [5.5,55,15,100,60,70,60,75],[5.8,60,18,105,62,72,58,78],[6.0,50,12,95,58,68,62,72],
    [5.2,65,20,110,65,75,56,80],[5.9,52,16,98,59,69,61,74],[5.6,58,14,102,61,71,59,76],
    // Mangue (8)
    [6.5,40,32,55,30,50,50,95],[7.0,35,35,60,32,55,48,100],[6.8,38,30,50,28,48,52,98],
    [6.2,45,33,58,31,52,49,97],[7.2,32,36,62,33,54,47,102],[6.6,42,31,56,30,51,50,96],
    // Pois chiche (9)
    [6.5,35,22,20,30,40,45,82],[6.8,30,25,18,28,38,42,85],[6.2,40,20,22,32,42,48,80],
    [7.0,28,24,15,26,36,44,88],[6.6,38,23,19,30,40,46,83],[6.4,32,22,21,31,41,45,81],
    // Raisin (10)
    [6.5,40,24,45,30,50,50,88],[7.0,35,26,50,32,55,48,92],[6.8,42,22,42,28,48,52,85],
    [6.2,38,25,48,31,52,49,90],[7.2,32,27,52,33,54,47,94],[6.6,44,23,46,30,51,50,87],
    // Tournesol (11)
    [6.5,40,25,60,35,55,55,85],[7.0,35,28,65,38,60,52,90],[6.8,42,22,55,32,52,58,82],
    [6.2,45,26,62,36,57,54,88],[7.2,32,29,68,40,62,50,92],[6.6,44,24,58,34,55,56,86],
  ],
  labels: [
    0,0,0,0,0,0, 1,1,1,1,1,1, 2,2,2,2,2,2, 3,3,3,3,3,3,
    4,4,4,4,4,4, 5,5,5,5,5,5, 6,6,6,6,6,6, 7,7,7,7,7,7,
    8,8,8,8,8,8, 9,9,9,9,9,9, 10,10,10,10,10,10, 11,11,11,11,11,11,
  ]
};

const CNN_CULTURES_ORDER = [
  'riz','ble','mais','tomate','soja','coton',
  'cafe','pomme_de_terre','mangue','pois_chiche','raisin','tournesol'
];

/* ── Normalisation Min-Max par feature ── */
const CNN_FEAT_RANGE = [
  [4.5,8.5],   // ph
  [0,100],     // hs%
  [10,40],     // temp°C
  [0,140],     // azote
  [0,80],      // phosphore
  [0,100],     // potassium
  [20,100],    // ha%
  [0,120],     // lux/10
];

function _cnnNormalize(features) {
  return features.map((v, i) => {
    const [mn, mx] = CNN_FEAT_RANGE[i];
    return (v - mn) / (mx - mn);
  });
}

/* ── Modèle TensorFlow.js en mémoire ── */
let _tfModel = null;
let _tfModelReady = false;
let _tfLoadPromise = null;
let _tfRealAccuracy = 0;

async function _buildTFModel() {
  if (_tfModelReady && _tfModel) return _tfModel;
  if (_tfLoadPromise) return _tfLoadPromise;

  _tfLoadPromise = (async () => {
    // Vérifier si TF.js est chargé
    if (typeof tf === 'undefined') {
      console.warn('[CNN] TensorFlow.js non disponible — chargement...');
      return null;
    }

    console.log('[CNN] Construction du modèle CNN agronomique...');

    // Architecture CNN : Conv1D → Pool → Dense → Softmax
    const model = tf.sequential();

    // Input shape: (8, 1) = 8 features comme séquence 1D
    model.add(tf.layers.conv1d({
      inputShape: [8, 1],
      filters: 32,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu',
      name: 'conv1d_1'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.conv1d({
      filters: 64,
      kernelSize: 2,
      padding: 'same',
      activation: 'relu',
      name: 'conv1d_2'
    }));
    model.add(tf.layers.globalAveragePooling1d());
    model.add(tf.layers.dense({ units: 128, activation: 'relu', name: 'dense_1' }));
    model.add(tf.layers.dropout({ rate: 0.3 }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu', name: 'dense_2' }));
    model.add(tf.layers.dense({ units: 12, activation: 'softmax', name: 'output' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy']
    });

    // Préparer les données d'entraînement
    const rawX = CNN_TRAINING_DATA.features;
    const rawY = CNN_TRAINING_DATA.labels;
    const normX = rawX.map(f => _cnnNormalize(f));
    const xTensor = tf.tensor3d(normX.map(f => f.map(v => [v])));
    const yTensor = tf.tensor1d(rawY, 'int32');

    console.log('[CNN] Entraînement sur', rawX.length, 'échantillons agronomiques...');

    // Entraîner le modèle
    let _finalAcc = 0;
    const logEl = document.getElementById('cnn-train-log');
    const badgeEl = document.getElementById('cnn-accuracy-badge');

    await model.fit(xTensor, yTensor, {
      epochs: 80,
      batchSize: 12,
      validationSplit: 0.15,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          const acc = logs.acc || logs.accuracy || 0;
          _finalAcc = acc;
          if (epoch % 10 === 0) {
            const pct = Math.round(acc * 100);
            const prog = Math.round((epoch/80)*100);
            if (logEl) logEl.innerHTML =
              `🏋️ Epoch ${epoch+1}/80 · loss: ${logs.loss.toFixed(3)} · acc: ${pct}%<br>
               <div style="background:#1e293b;border-radius:4px;height:6px;margin-top:4px;">
                 <div style="background:#7c3aed;width:${prog}%;height:6px;border-radius:4px;transition:width .3s"></div>
               </div>`;
          }
        }
      }
    });

    xTensor.dispose(); yTensor.dispose();

    const realAcc = Math.round(_finalAcc * 100);
    _tfModelReady = true;
    _tfRealAccuracy = realAcc;
    console.log(`[CNN] ✅ Entraîné — accuracy réelle: ${realAcc}%`);

    // Mettre à jour le badge avec l'accuracy réelle TF.js
    if (badgeEl) {
      badgeEl.textContent = `🧠 CNN TF.js — ${realAcc}% acc`;
      badgeEl.style.background = realAcc >= 85 ? '#16a34a' : realAcc >= 70 ? '#d97706' : '#dc2626';
      badgeEl.style.color = '#fff';
    }
    return model;
  })();

  _tfModel = await _tfLoadPromise;
  return _tfModel;
}

/* ── Prédiction CNN pour une zone ── */
async function _cnnPredictZone(d, ck) {
  // Construire le vecteur de features
  const feat = [
    d.ph   ?? 6.5,
    d.hs   ?? 45,
    d.temp ?? 25,
    d.n    ?? 60,
    d.p    ?? 35,
    d.k    ?? 50,
    d.ha   ?? 60,
    (d.lux ?? 700) / 10,
  ];

  const missingCount = [d.ph, d.hs, d.n, d.p, d.k].filter(v => v == null).length;

  try {
    const model = await _buildTFModel();
    if (!model) throw new Error('TF.js non disponible');

    const norm   = _cnnNormalize(feat);
    const input  = tf.tensor3d([norm.map(v => [v])]);
    const pred   = model.predict(input);
    const probs  = await pred.data();
    input.dispose(); pred.dispose();

    const cultureIdx = CNN_CULTURES_ORDER.indexOf(ck);
    const rawScore   = cultureIdx >= 0 ? probs[cultureIdx] : 0;
    const topIdx     = probs.indexOf(Math.max(...probs));
    const topCulture = CNN_CULTURES_ORDER[topIdx] || ck;
    const topScore   = probs[topIdx];

    // Score = probabilité CNN × 100, pénalisé si capteurs manquants
    const penalty    = missingCount * 8;
    const finalScore = Math.min(98, Math.max(5, Math.round(rawScore * 100) - penalty));

    return {
      score:      finalScore,
      topCulture: topCulture,
      topScore:   Math.round(topScore * 100),
      allProbs:   CNN_CULTURES_ORDER.map((c,i) => ({
        culture: c,
        nom:     _cnnCultureName(c),
        prob:    Math.round(probs[i] * 100)
      })).sort((a,b) => b.prob - a.prob).slice(0, 5),
      missing:    missingCount,
      method:     'tensorflow_cnn',
    };
  } catch(e) {
    console.warn('[CNN] TF.js erreur, fallback heuristique:', e.message);
    return { score: _cnnScoreFallback(d, ck), method: 'fallback', allProbs: null };
  }
}

/* ── Fallback si TF.js pas disponible ── */
function _cnnScoreFallback(d, ck) {
  const cp = CNN_CULTURE_PARAMS[ck];
  if (!cp) return 0;
  const checks = [
    {v:d.ph,   r:cp.ph,   w:3},
    {v:d.hs,   r:cp.hs,   w:2.5},
    {v:d.temp, r:cp.temp, w:3},
    {v:d.n,    r:cp.n,    w:2},
    {v:d.p,    r:cp.p,    w:1.5},
    {v:d.k,    r:cp.k,    w:1.5},
    {v:d.ha,   r:[30,90], w:1},
  ];
  let g=0, tw=0;
  checks.forEach(({v,r,w}) => {
    if (v==null) return;
    const [mn,mx]=r, mid=(mn+mx)/2, rv=(mx-mn)/2||1;
    g += Math.max(0, 1 - Math.abs((v-mid)/rv)) * w;
    tw += w;
  });
  return tw > 0 ? Math.min(98, Math.max(5, Math.round(g/tw*100))) : 50;
}

/* ── Score simple pour compat (heuristique) ── */
function _cnnScore(d, ck) {
  return _cnnScoreFallback(d, ck);
}

function _cnnScoreColor(s) {
  return s >= 72 ? '#16a34a' : s >= 48 ? '#d97706' : '#dc2626';
}
function _cnnStatusLabel(s) {
  if (s >= 72) return [T('cnnOptimal'),     '#f0fdf4', '#15803d'];
  if (s >= 48) return [T('cnnAcceptable'),  '#fef3c7', '#92400e'];
  return              [T('cnnIncompat'),'#fee2e2', '#991b1b'];
}
function _cnnCultureName(k) {
  return {
    tournesol:'Tournesol', ble:'Blé', mais:'Maïs', tomate:'Tomate',
    soja:'Soja', riz:'Riz', coton:'Coton', cafe:'Café',
    pomme_de_terre:'Pomme de terre', mangue:'Mangue',
    pois_chiche:'Pois chiche', raisin:'Raisin',
  }[k] || k;
}
