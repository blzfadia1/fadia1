/* ════════════════════════════════════════════════════════════════
   AgriSmart — 04 — DASHBOARD — Tableau de bord & Graphiques LSTM
   buildDashboard(), drawLSTMChart(), drawTempChart()
   Fichier : 04_dashboard.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
function buildDashboard() {
  // Stats
  const isAdmin = state.role === 'admin';
  document.getElementById('stats-grid').innerHTML = [
    { icon:'🌾', bg:'#f0fdf4', val:'98.0%', label:'Précision RF', trend:'↑ +0.3%', c:' var(--green)', tr:'trend-up' },
    { icon:'📈', bg:'#ede9fe', val:'92.4%', label:'Précision LSTM', trend:'↑ +2.1%', c:'var(--violet)', tr:'trend-up' },
    { icon:'📡', bg:'#e0f2fe', val: isAdmin?'6/6':'3/3', label:'Capteurs actifs', trend:'✓ Tous OK', c:'var(--blue)', tr:'trend-up' },
    { icon:'⚡', bg:'#fef3c7', val:'287j', label:'Autonomie batterie', trend:'↓ -3j', c:'var(--amber)', tr:'trend-dn' },
  ].map(s=>`
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.bg}">${s.icon}</div>
      <div class="stat-body">
        <div class="stat-val" style="color:${s.c}">${s.val}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-trend ${s.tr}">${s.trend}</div>
      </div>
    </div>`).join('');

  // Sensors
  updateLiveSensors();

  // Alertes depuis MySQL
  loadAlertes();

  // Nœuds LoRa depuis MySQL
  loadNoeudsLoRa();

  // Architecture IA
  document.getElementById('arch-layers').innerHTML = [
    { n:1, bg:'#16a34a', title:'🌾 Couche Terrain — Capteurs IoT',     desc:'ESP32 collecte T°, pH, humidité, NPK toutes les 10 secondes.',         tags:['ESP32','DHT22','pH-mètre','NPK'] },
    { n:2, bg:'#0284c7', title:'📡 Couche Communication — LoRaWAN',    desc:'Transmission longue portée (10km) via protocole LoRaWAN 868MHz.',       tags:['LoRa','MQTT','Gateway','WiFi'] },
    { n:3, bg:'#7c3aed', title:'☁️ Couche Cloud — Stockage & Traitement',desc:'Firebase Realtime Database, calcul en temps réel, historique 30j.',    tags:['Firebase','Node.js','REST API'] },
    { n:4, bg:'#d97706', title:'🌲 Couche IA — Random Forest',          desc:'100 arbres de décision recommandent la culture optimale (98% précision).', tags:['Random Forest','sklearn','Python'] },
    { n:5, bg:'#dc2626', title:'📈 Couche IA — LSTM',                   desc:'Réseau LSTM prédit les besoins en irrigation sur 7 jours (92% précision).', tags:['LSTM','TensorFlow','Keras'] },
    { n:6, bg:'#059669', title:'📱 Couche Interface — Dashboard',       desc:'Interface web responsive pour agriculteurs, techniciens et admins.',   tags:['React','Chart.js','OLED'] },
  ].map(l=>`
    <div class="arch-layer">
      <div class="arch-num" style="background:${l.bg}">${l.n}</div>
      <div class="arch-body">
        <div class="arch-title">${l.title}</div>
        <div class="arch-desc">${l.desc}</div>
        <div class="arch-tags">${l.tags.map(t=>`<span class="arch-tag">${t}</span>`).join('')}</div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════
   LSTM CHART (SVG)
═══════════════════════════════════════════════════════ */
function drawLSTMChart(id, big) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const W = big ? 500 : 400;
  const H = big ? 160 : 120;

  // Past data (7 pts) + future (7 pts)
  const past    = [48,52,46,43,50,47,44];
  const future  = [41,38,36,40,43,39,37];
  const thresh  = 30;

  const xs = Array.from({length:14},(_, i)=>Math.round(10 + i*(W-20)/13));
  const yScale = v => H - 20 - (v - 20) / 40 * (H - 30);

  const pastPts = past.map((v,i)   => `${xs[i]},${yScale(v)}`);
  const futurePts = future.map((v,i) => `${xs[7+i]},${yScale(v)}`);
  const threshY = yScale(thresh);

  svg.innerHTML = `
    <defs>
      <linearGradient id="gp${id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#e2e8f0" stop-opacity=".5"/>
        <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gf${id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity=".3"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- Threshold -->
    <line x1="10" y1="${threshY}" x2="${W-10}" y2="${threshY}"
      stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="5,4" opacity=".7"/>
    <!-- Past area -->
    <polygon points="${pastPts.join(' ')} ${xs[6]},${H-20} ${xs[0]},${H-20}"
      fill="url(#gp${id})"/>
    <!-- Past line -->
    <polyline points="${pastPts.join(' ')}" fill="none" stroke="#94a3b8" stroke-width="2"/>
    <!-- Future area -->
    <polygon points="${xs[6]},${yScale(past[6])} ${futurePts.join(' ')} ${xs[13]},${H-20} ${xs[6]},${H-20}"
      fill="url(#gf${id})"/>
    <!-- Future line -->
    <polyline points="${xs[6]},${yScale(past[6])} ${futurePts.join(' ')}"
      fill="none" stroke="#7c3aed" stroke-width="2.5"/>
    <!-- Dots past -->
    ${past.map((v,i)=>`<circle cx="${xs[i]}" cy="${yScale(v)}" r="3" fill="#94a3b8"/>`).join('')}
    <!-- Dots future -->
    ${future.map((v,i)=>`<circle cx="${xs[7+i]}" cy="${yScale(v)}" r="3.5" fill="#7c3aed" stroke="#fff" stroke-width="1.5"/>`).join('')}
    <!-- Divider today -->
    <line x1="${xs[6]}" y1="5" x2="${xs[6]}" y2="${H-15}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="${xs[6]+3}" y="12" font-size="9" fill="#94a3b8" font-family="JetBrains Mono">Aujourd'hui</text>
    <!-- Y labels -->
    <text x="2" y="${yScale(50)+4}" font-size="9" fill="#94a3b8">50%</text>
    <text x="2" y="${yScale(35)+4}" font-size="9" fill="#fbbf24">35%</text>
  `;
}

function drawTempChart() {
  const svg = document.getElementById('lstm-temp');
  if (!svg) return;
  const W=500, H=160;
  const vals   = [24,27,25,28,30,26,23];
  const future = [22,20,21,23,26,25,24];
  const xs = Array.from({length:14},(_,i)=>Math.round(10+i*(W-20)/13));
  const ys = v => H-20 - (v-15)/20*(H-30);
  const pPts = vals.map((v,i)=>`${xs[i]},${ys(v)}`);
  const fPts = future.map((v,i)=>`${xs[7+i]},${ys(v)}`);
  svg.innerHTML = `
    <polygon points="${pPts.join(' ')} ${xs[6]},${H-20} ${xs[0]},${H-20}" fill="rgba(251,191,36,.1)"/>
    <polygon points="${xs[6]},${ys(vals[6])} ${fPts.join(' ')} ${xs[13]},${H-20} ${xs[6]},${H-20}" fill="rgba(217,119,6,.15)"/>
    <polyline points="${pPts.join(' ')}" fill="none" stroke="#fbbf24" stroke-width="2"/>
    <polyline points="${xs[6]},${ys(vals[6])} ${fPts.join(' ')}" fill="none" stroke="#d97706" stroke-width="2.5"/>
    ${vals.map((v,i)=>`<circle cx="${xs[i]}" cy="${ys(v)}" r="3" fill="#fbbf24"/>`).join('')}
    ${future.map((v,i)=>`<circle cx="${xs[7+i]}" cy="${ys(v)}" r="3.5" fill="#d97706" stroke="#fff" stroke-width="1.5"/>`).join('')}
    <line x1="${xs[6]}" y1="5" x2="${xs[6]}" y2="${H-15}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="2" y="${ys(28)+4}" font-size="9" fill="#94a3b8">28°C</text>
    <text x="2" y="${ys(22)+4}" font-size="9" fill="#94a3b8">22°C</text>
  `;
}
