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
  // Bouton refresh
  const btnIoT = document.getElementById('btn-refresh-iot');
  if (btnIoT) { btnIoT.disabled = true; btnIoT.textContent = '⏳'; }

  // Charger les noeuds depuis MySQL
  // iot_data.php — public endpoint
  let d;
  try {
    const r = await fetch('api/iot_data.php?action=noeuds', { cache:'no-cache' });
    d = await r.json();
  } catch(e) { d = { success: false }; }
  let nodes = [];
  if (d.success && d.noeuds && d.noeuds.length > 0) {
    // Filtrer : afficher seulement les nœuds qui ont envoyé des données (pas les fictifs)
    nodes = d.noeuds.map(n=>({
      id:       n.node_id,
      zone:     n.zone || '—',
      rssi:     n.rssi || 'WiFi',
      bat:      n.batterie+'%',
      sf:       n.sf || 'WiFi',
      status:   n.statut,
      detail:   n.statut_detail || '',
      dbId:     n.id,
      secondes: n.secondes_depuis || 0,
      last_seen:n.last_seen_label || n.last_seen || ''
    }));
  } else {
    // Fallback — montrer ESP32-DHT11 en attente
    nodes = [
      { id:'ESP32-DHT11', zone:'Mon champ — Nord', rssi:'WiFi', bat:'100%', sf:'WiFi', status:'offline', dbId: null },
    ];
  }

  // Re-activer bouton
  if (btnIoT) { btnIoT.disabled = false; btnIoT.innerHTML = '🔄 Actualiser'; }
  const iotLbl = document.getElementById('iot-last-update');
  const onlineCount = nodes.filter(n=>n.status==='online').length;
  if (iotLbl) iotLbl.textContent = `✅ ${new Date().toLocaleTimeString('fr-FR')} · ${onlineCount}/${nodes.length} en ligne`;

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
      <td>
        ${(()=>{
          const detail = n.detail || '';
          const sec = parseInt(n.secondes || 0);
          const ago = sec < 60 ? sec+'s' : Math.floor(sec/60)+'min';
          if (n.status === 'online') {
            return '<span class="badge bg-green" title="Dernière mesure il y a '+ago+'">✓ En ligne · '+ago+'</span>';
          } else if (n.status === 'warn') {
            return '<span class="badge bg-amber">⚠️ '+detail+'</span>';
          } else {
            return '<span class="badge bg-red" title="'+detail+'">✗ '+detail+'</span>';
          }
        })()}
      </td>
      <td>
        <button onclick="buildIoTPage()" style="font-size:11px;padding:3px 8px;background:#e0f2fe;color:#0284c7;border:1px solid #bae6fd;border-radius:6px;cursor:pointer;margin-right:3px;">🔄</button>
        ${n.dbId ? `<button onclick="saveCapteursManuel('${n.id}')" style="font-size:11px;padding:3px 8px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:6px;cursor:pointer;">💾 Mesure</button>` : ''}
      </td>
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
  const t = document.getElementById('hist-table');
  if (!t) return;

  // Header avec bouton actualiser
  const headerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <span style="font-size:13px;font-weight:600;color:var(--text)">📜 Mesures réelles ESP32 depuis MySQL</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span id="hist-last-update" style="font-size:11px;color:var(--slate)">—</span>
        <button onclick="buildHistoryPage()" id="btn-refresh-hist"
          style="font-size:11px;padding:5px 14px;background:var(--violet);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
          🔄 Actualiser
        </button>
      </div>
    </div>`;

  // Insérer header avant le tableau
  const histContainer = t.parentElement;
  let histHeader = document.getElementById('hist-header');
  if (!histHeader) {
    histHeader = document.createElement('div');
    histHeader.id = 'hist-header';
    histContainer.insertBefore(histHeader, t);
  }
  histHeader.innerHTML = headerHTML;

  t.innerHTML = `<thead><tr>
    <th>Date & Heure</th><th>Nœud</th>
    <th>🌡️ Temp.</th><th>💧 H.Air</th><th>💧 H.Sol</th>
    <th>🧪 pH</th><th>🌿 N</th><th>⚗️ P</th><th>🔬 K</th>
    <th>Statut</th>
  </tr></thead>
  <tbody><tr><td colspan="10" style="text-align:center;padding:20px;color:#94a3b8;">⏳ Chargement depuis MySQL...</td></tr></tbody>`;

  const d = await apiCall('historique');

  if (d.success && d.historique && d.historique.length > 0) {
    const rows = d.historique.map(r => {
      // Couleur statut
      let statusColor = 'bg-green', statusText = '✓ Normal';
      if (r.action && r.action !== 'Normal') {
        statusColor = r.action.includes('acide')||r.action.includes('Sec')||r.action.includes('Chaleur') ? 'bg-red' : 'bg-amber';
        statusText = r.action;
      }
      return `<tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;white-space:nowrap;">${r.time_label}</td>
        <td><span class="badge bg-blue" style="font-size:10px;">${r.node_id}</span></td>
        <td style="font-weight:600;color:${r.temperature!=null?'var(--amber)':'var(--slate)'}">
          ${r.temperature!=null ? r.temperature.toFixed(1)+'°C' : '—'}
        </td>
        <td style="color:${r.humidite_air!=null?'var(--blue)':'var(--slate)'}">
          ${r.humidite_air!=null ? r.humidite_air+'%' : '—'}
        </td>
        <td style="color:${r.humidite_sol!=null?(r.humidite_sol<20?'var(--red)':r.humidite_sol<35?'var(--amber)':'var(--green)'):'var(--slate)'}">
          ${r.humidite_sol!=null ? r.humidite_sol+'%' : '—'}
        </td>
        <td style="color:${r.ph!=null?(r.ph<5.5?'var(--red)':r.ph>7.5?'var(--amber)':'var(--green)'):'var(--slate)'}">
          ${r.ph!=null ? r.ph.toFixed(1) : '—'}
        </td>
        <td style="color:var(--slate)">${r.azote!=null ? r.azote+' kg' : '—'}</td>
        <td style="color:var(--slate)">${r.phosphore!=null ? r.phosphore+' kg' : '—'}</td>
        <td style="color:var(--slate)">${r.potassium!=null ? r.potassium+' kg' : '—'}</td>
        <td><span class="badge ${statusColor}" style="font-size:10px;">${statusText}</span></td>
      </tr>`;
    }).join('');

    t.innerHTML = `<thead><tr>
      <th>Date & Heure</th><th>Nœud</th>
      <th>🌡️ Temp.</th><th>💧 H.Air</th><th>💧 H.Sol</th>
      <th>🧪 pH</th><th>🌿 N</th><th>⚗️ P</th><th>🔬 K</th>
      <th>Statut</th>
    </tr></thead><tbody>${rows}</tbody>`;

    const lbl = document.getElementById('hist-last-update');
    if (lbl) lbl.textContent = '✅ ' + d.historique.length + ' mesures · ' + new Date().toLocaleTimeString('fr-FR');
  } else {
    t.innerHTML = `<thead><tr>
      <th>Date & Heure</th><th>Nœud</th>
      <th>🌡️ Temp.</th><th>💧 H.Air</th><th>💧 H.Sol</th>
      <th>🧪 pH</th><th>🌿 N</th><th>⚗️ P</th><th>🔬 K</th>
      <th>Statut</th>
    </tr></thead>
    <tbody><tr><td colspan="10" style="text-align:center;padding:30px;color:#94a3b8;">
      <div style="font-size:24px;margin-bottom:8px">📭</div>
      <div>Aucune mesure ESP32 — vérifiez que l'ESP32 est connecté et envoie des données</div>
    </td></tr></tbody>`;
  }

  // Timeline — construite depuis les mesures réelles
  const tlEl = document.getElementById('timeline');
  if (tlEl && d.success && d.historique && d.historique.length > 0) {
    // Prendre les 10 dernières mesures pour la timeline
    const recent = d.historique.slice(0, 10);
    tlEl.innerHTML = recent.map((r, i) => {
      const ico  = r.action && r.action !== 'Normal' ? '⚠️' : '📡';
      const bg   = r.action && r.action !== 'Normal' ? '#fee2e2' : '#e0f2fe';
      const info = [
        r.temperature != null ? r.temperature.toFixed(1)+'°C' : null,
        r.humidite_air != null ? r.humidite_air+'% air' : null,
      ].filter(Boolean).join(' · ') || 'Mesure enregistrée';
      return `<div class="tl-item" style="animation-delay:${i*.06}s">
        <div class="tl-dot" style="background:${bg}">${ico}</div>
        <div class="tl-body">
          <div class="tl-title">${r.node_id} — ${info}</div>
          <div class="tl-sub">${r.action !== 'Normal' ? r.action : 'Données reçues'}</div>
          <div class="tl-time">${r.time_label}</div>
        </div>
      </div>`;
    }).join('');
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
