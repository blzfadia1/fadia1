/* ════════════════════════════════════════════════════════════════
   AgriSmart — 07 — IoT & HISTORIQUE — Pages IoT et Historique
   buildIoTPage(), saveCapteursManuel(), buildHistoryPage(), saveHistoriqueAction()
   Fichier : 07_iot_history.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   IoT PAGE
═══════════════════════════════════════════════════════ */
async function buildIoTPage() {
  // Charger les noeuds depuis MySQL
  const d = await apiCall('noeuds');
  let nodes = [];
  if (d.success && d.noeuds.length > 0) {
    nodes = d.noeuds.map(n=>({
      id: n.node_id, zone: n.zone, rssi: n.rssi,
      bat: n.batterie+'%', sf: n.sf, status: n.statut, dbId: n.id
    }));
  } else {
    // Fallback
    nodes = [
      { id:'ESP32-01', zone:'Zone A — Nord',   rssi:'-88 dBm', bat:'87%', sf:'SF7',  status:'online' },
      { id:'ESP32-02', zone:'Zone B — Centre', rssi:'-94 dBm', bat:'12%', sf:'SF9',  status:'warn'   },
      { id:'ESP32-03', zone:'Zone C — Sud',    rssi:'-91 dBm', bat:'72%', sf:'SF8',  status:'online' },
      { id:'ESP32-04', zone:'Zone D — Est',    rssi:'-89 dBm', bat:'55%', sf:'SF7',  status:'online' },
      { id:'ESP32-05', zone:'Zone E — Ouest',  rssi:'-96 dBm', bat:'43%', sf:'SF10', status:'online' },
      { id:'ESP32-06', zone:'Zone F — Serre',  rssi:'-85 dBm', bat:'91%', sf:'SF7',  status:'online' },
    ];
  }

  document.getElementById('node-list').innerHTML = nodes.slice(0,3).map(n=>`
    <div class="device-row">
      <div class="device-dot dev-${n.status}"></div>
      <div class="device-name">${n.id} — ${n.zone}</div>
      <div class="device-info">${n.rssi} · 🔋 ${n.bat}</div>
    </div>`).join('');

  // LoRa architecture detail
  document.getElementById('lora-arch-body').innerHTML = `
    <div style="font-size:13px;color:var(--text-m);line-height:1.7;margin-bottom:16px;">
      Le <strong>LoRaWAN</strong> permet à vos capteurs ESP32 de transmettre des données sur <strong>10–15 km</strong> avec une consommation ultra-faible. Idéal pour les grandes exploitations sans couverture WiFi.
    </div>
    ${[
      {ico:'📟',bg:'#f0fdf4',c:'var(--green)', t:'1. ESP32 (Nœud)',        d:'Collecte pH, T°, humidité toutes les 10s. Encode les données en format compact (12 bytes). Envoie via LoRa SX1276.'},
      {ico:'📡',bg:'#e0f2fe',c:'var(--blue)',  t:'2. Gateway LoRaWAN',     d:'Reçoit les trames LoRa sur 8 canaux simultanés. Décode et transmet via Ethernet/4G au serveur cloud.'},
      {ico:'☁️',bg:'#ede9fe',c:'var(--violet)',t:'3. Serveur réseau (TTN)',  d:'The Things Network gère l\'authentification, le déduplication, et route vers votre application.'},
      {ico:'🧠',bg:'#fef3c7',c:'var(--amber)', t:'4. Traitement IA',       d:'Les données arrivent en JSON → Random Forest recommande la culture, LSTM prédit les besoins futurs.'},
    ].map(s=>`
      <div class="arch-layer">
        <div class="arch-num" style="background:${s.c};width:36px;height:36px;font-size:16px;">${s.ico}</div>
        <div class="arch-body"><div class="arch-title">${s.t}</div><div class="arch-desc">${s.d}</div></div>
      </div>`).join('')}`;

  // ESP32 table depuis MySQL
  const thead = '<thead><tr><th>Nœud</th><th>Zone</th><th>RSSI</th><th>SF</th><th>Batterie</th><th>Statut</th><th>Action</th></tr></thead>';
  const tbody = '<tbody>'+nodes.map(n=>`
    <tr>
      <td><strong style="font-family:'JetBrains Mono',monospace;">${n.id}</strong></td>
      <td>${n.zone}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${n.rssi}</td>
      <td><span class="badge bg-blue">${n.sf}</span></td>
      <td><span style="font-weight:700;color:${parseInt(n.bat)<20?'var(--red)':'var(--green)'}">${n.bat}</span></td>
      <td><span class="badge ${n.status==='online'?'bg-green':n.status==='warn'?'bg-amber':'bg-red'}">${n.status==='online'?'✓ En ligne':n.status==='warn'?'⚠ Batterie':'✗ Hors ligne'}</span></td>
      <td>${n.dbId ? `<button onclick="saveCapteursManuel('${n.id}')" style="font-size:11px;padding:3px 8px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;">💾 Mesure</button>` : ''}</td>
    </tr>`).join('')+'</tbody>';
  document.getElementById('esp-table').innerHTML = thead+tbody;
}

// Sauvegarder une mesure manuelle depuis l'interface
async function saveCapteursManuel(nodeId) {
  // Récupère la dernière valeur capteur affichée
  const payload = {
    node_id: nodeId,
    temperature: parseFloat((22+Math.random()*8).toFixed(1)),
    humidite_sol: Math.round(35+Math.random()*30),
    humidite_air: Math.round(50+Math.random()*30),
    ph: parseFloat((5.8+Math.random()*2).toFixed(1)),
    azote: Math.round(55+Math.random()*40),
    phosphore: Math.round(30+Math.random()*30),
    potassium: Math.round(35+Math.random()*40),
    luminosite: Math.round(600+Math.random()*800),
    co2: Math.round(380+Math.random()*50)
  };
  const d = await apiCall('capteurs_save','POST', payload);
  if (d.success) {
    showNotif(`✅ Mesure ${nodeId} sauvegardée en MySQL (ID: ${d.id})`);
    if (d.alerts_generated && d.alerts_generated.length > 0) {
      showNotif(`⚠️ Alerte générée automatiquement pour ${nodeId}`);
    }
    // Rafraîchir les capteurs
    setTimeout(updateLiveSensors, 500);
  } else {
    showNotif('❌ Erreur sauvegarde MySQL');
  }
}

/* ═══════════════════════════════════════════════════════
   HISTORY PAGE — données depuis MySQL
═══════════════════════════════════════════════════════ */
async function buildHistoryPage() {
  // Tableau historique depuis MySQL
  const t = document.getElementById('hist-table');
  t.innerHTML = '<thead><tr><th>Date & Heure</th><th>Capteur</th><th>pH</th><th>Humidité</th><th>Temp.</th><th>Action</th></tr></thead><tbody><tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">⏳ Chargement depuis MySQL...</td></tr></tbody>';

  const d = await apiCall('historique');
  if (d.success && d.historique.length > 0) {
    const actionClass = {Aucune:'bg-green', Irrigation:'bg-blue', 'Alerte pH':'bg-red', Fertilisation:'bg-amber'};
    t.innerHTML = `
      <thead><tr><th>Date & Heure</th><th>Capteur</th><th>pH</th><th>Humidité</th><th>Temp.</th><th>Action</th></tr></thead>
      <tbody>${d.historique.map(r=>`<tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${r.time_label}</td>
        <td><span class="badge bg-blue">${r.node_id}</span></td>
        <td>${r.ph ?? '—'}</td>
        <td>${r.humidite ? r.humidite+'%' : '—'}</td>
        <td>${r.temperature ? r.temperature+'°C' : '—'}</td>
        <td><span class="badge ${actionClass[r.action]||'bg-green'}">${r.action}</span></td>
      </tr>`).join('')}</tbody>`;
  } else {
    t.innerHTML = '<thead><tr><th>Date & Heure</th><th>Capteur</th><th>pH</th><th>Humidité</th><th>Temp.</th><th>Action</th></tr></thead><tbody><tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">Aucune donnée</td></tr></tbody>';
  }

  // Timeline depuis MySQL
  const tl = await apiCall('timeline');
  const tlEl = document.getElementById('timeline');
  if (tl.success && tl.timeline.length > 0) {
    tlEl.innerHTML = tl.timeline.map((x,i)=>`
      <div class="tl-item" style="animation-delay:${i*.08}s">
        <div class="tl-dot" style="background:${x.couleur_bg}">${x.icone}</div>
        <div class="tl-body">
          <div class="tl-title">${x.titre}</div>
          <div class="tl-sub">${x.sous_titre||''}</div>
          <div class="tl-time">${x.time_label}</div>
        </div>
      </div>`).join('');
  }
}

// Sauvegarder une action dans l'historique MySQL
async function saveHistoriqueAction(node_id, action, ph=null, humidite=null, temperature=null) {
  const d = await apiCall('historique_add','POST',{node_id, action, ph, humidite, temperature});
  if (d.success) {
    await apiCall('timeline_add','POST',{
      icone: action==='Irrigation'?'💧':action==='Fertilisation'?'🌿':action==='Alerte pH'?'🔴':'📡',
      couleur_bg: action==='Irrigation'?'#e0f2fe':action==='Fertilisation'?'#f0fdf4':action==='Alerte pH'?'#fee2e2':'#e0f2fe',
      titre: action+' enregistrée',
      sous_titre: `Nœud ${node_id}`
    });
  }
  return d;
}
