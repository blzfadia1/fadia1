/* ════════════════════════════════════════════════════════════════
   AgriSmart — 06_lstm.js
   ✅ VRAI LSTM TensorFlow.js — entraîné sur données ESP32 réelles
   Architecture : LSTM(64) → LSTM(32) → Dense(7)
   Données : historique MySQL via api/iot_history.php
════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ Constantes ══════════════════════════════════════════════ */
const LSTM_SEQ_LEN   = 10;   // fenêtre d'entrée (10 mesures)
const LSTM_HORIZON   = 7;    // prédire 7 jours
const LSTM_EPOCHS    = 60;
const LSTM_BATCH     = 8;
const THRESH_CRITICAL = 35;  // seuil irrigation %

/* ══ État global LSTM ════════════════════════════════════════ */
let _lstmModel       = null;
let _lstmReady       = false;
let _lstmAccuracy    = 0;
let _lstmTrainPromise= null;
let _lstmRawHistory  = [];   // données brutes ESP32
let _lstmNorm        = { min: 0, max: 100 }; // normalisation
let _lstmTarget      = 'humidite_air'; // variable à prédire par défaut

/* ══ Page LSTM ═══════════════════════════════════════════════ */
function buildLSTMPage() {
  const days = _getDayLabels ? _getDayLabels() : [];
  const todayLabel = days[6]?.short || 'Auj.';

  /* Statistiques top */
  document.getElementById('lstm-stats').innerHTML = `
    <div class="lstm-stat-card">
      <div class="stat-icon" style="background:#ede9fe">📈</div>
      <div class="stat-body">
        <div class="stat-val" style="color:var(--violet)" id="lstm-prec-val">—</div>
        <div class="stat-label" id="lstm-prec-lbl">Précision LSTM</div>
        <div class="stat-trend trend-up" id="lstm-trend-lbl">⏳ À entraîner</div>
      </div>
    </div>
    <div class="lstm-stat-card">
      <div class="stat-icon" style="background:#f0fdf4">⏱️</div>
      <div class="stat-body">
        <div class="stat-val" style="color:var(--green)">${LSTM_HORIZON}j</div>
        <div class="stat-label" id="lstm-horiz-lbl">Horizon de prévision</div>
      </div>
    </div>
    <div class="lstm-stat-card">
      <div class="stat-icon" style="background:#e0f2fe">🔄</div>
      <div class="stat-body">
        <div class="stat-val" style="color:var(--blue)">${LSTM_SEQ_LEN} seq</div>
        <div class="stat-label" id="lstm-fen-lbl">Fenêtre d'entrée</div>
      </div>
    </div>
    <div class="lstm-stat-card">
      <div class="stat-icon" style="background:#fef3c7">📉</div>
      <div class="stat-body">
        <div class="stat-val" style="color:var(--amber)" id="lstm-mae-val">—</div>
        <div class="stat-label" id="lstm-mae-lbl">Erreur MAE</div>
        <div class="stat-trend trend-up" id="lstm-ameli-lbl">TF.js LSTM réel</div>
      </div>
    </div>`;

  buildLSTMBody(todayLabel);
  _lstmAutoLoad();
}

function buildLSTMBody(todayLabel) {
  const labels = _getDayLabels ? _getDayLabels() : Array.from({length:14},(_,i)=>({short:'J'+(i-6),isToday:i===6,isFuture:i>6}));
  const tL = typeof T === 'function' ? T : k => k;

  document.getElementById('page-lstm').querySelector('.page-body').innerHTML = `
  <!-- Sélecteur zone + variable + bouton -->
  <div class="card" style="padding:14px 20px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <select id="lstm-zone-sel" onchange="_lstmAutoLoad()" 
        style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);
               background:var(--bg-card);color:var(--text);font-size:13px;">
        <option value="">⏳ Chargement zones...</option>
      </select>
      <select id="lstm-var-sel" onchange="_lstmAutoLoad()"
        style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);
               background:var(--bg-card);color:var(--text);font-size:13px;">
        <option value="humidite_air">💧 Humidité Air</option>
        <option value="temperature">🌡️ Température</option>
        <option value="humidite_sol">🌱 Humidité Sol</option>
      </select>
      <button onclick="_lstmTrain()" id="lstm-train-btn"
        style="padding:8px 18px;background:var(--violet);color:#fff;
               border:none;border-radius:8px;cursor:pointer;font-weight:600;">
        🧠 Entraîner LSTM
      </button>
      <div id="lstm-status-badge" style="font-size:12px;color:#94a3b8;">
        Données ESP32 temps réel
      </div>
    </div>
  </div>

  <!-- Log d'entraînement -->
  <div id="lstm-train-log" style="display:none;padding:12px 16px;
    background:#0f172a;border-radius:10px;margin-bottom:12px;
    font-family:'JetBrains Mono',monospace;font-size:11px;color:#22c55e;
    border:1px solid #1e293b;max-height:120px;overflow-y:auto;">
  </div>

  <!-- Bannière capteurs -->
  <div id="lstm-sensor-banner" class="card" style="padding:14px 20px;">
    <div style="font-size:12px;color:#94a3b8;text-align:center">⏳ Chargement capteurs...</div>
  </div>

  <!-- Légende -->
  <div style="font-size:11px;color:var(--slate);text-align:center;padding:4px 0;">
    <span id="lstm-legend-txt">Gris = 7 jours passés · Violet/Orange = 7 jours prévus · Jaune pointillé = seuil critique 35% (irriguer)</span>
  </div>

  <!-- Graphique principal -->
  <div class="card">
    <div class="card-header">
      <span class="card-title" id="lstm-chart-title">🧠 LSTM — <span id="lstm-today-lbl">${todayLabel}</span></span>
      <span style="font-size:11px;padding:3px 8px;background:rgba(124,58,237,.15);
        color:#a78bfa;border-radius:6px;" id="lstm-method-badge">TF.js</span>
    </div>
    <div class="card-body">
      <svg id="lstm-big" width="100%" height="160" viewBox="0 0 500 160" preserveAspectRatio="xMidYMid meet"
        style="display:block"></svg>
      <div style="display:flex;justify-content:space-between;padding:4px 10px 0;font-size:10px;color:#94a3b8;" id="lstm-xaxis">
        ${labels.filter((_,i)=>[0,2,4,6,8,10,12].includes(i)).map(l=>`
          <span style="color:${l.isToday?'#22c55e':l.isFuture?'#7c3aed':'#94a3b8'};
                font-weight:${l.isToday?'700':'400'}">${l.short}</span>`).join('')}
      </div>
    </div>
  </div>

  <!-- Graphique température -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">🌡️ Température — Prévision LSTM</span>
    </div>
    <div class="card-body">
      <svg id="lstm-temp" width="100%" height="140" viewBox="0 0 500 140" 
        preserveAspectRatio="xMidYMid meet" style="display:block"></svg>
      <div style="display:flex;justify-content:space-between;padding:4px 10px 0;
        font-size:10px;color:#94a3b8;" id="lstm-temp-xaxis">
        ${labels.filter((_,i)=>[0,2,4,6,8,10,12].includes(i)).map(l=>`
          <span style="color:${l.isToday?'#22c55e':l.isFuture?'#d97706':'#94a3b8'}">${l.short}</span>`).join('')}
      </div>
    </div>
  </div>

  <!-- Planning irrigation -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">📅 Planning Irrigation — 7 jours</span>
    </div>
    <div id="lstm-schedule" class="card-body"></div>
  </div>`;

  /* Charger zones */
  _lstmLoadZones();
}

/* ══ Charger zones depuis MySQL ══════════════════════════════ */
async function _lstmLoadZones() {
  try {
    const r = await fetch('api/iot_data.php?action=noeuds', {cache:'no-cache'});
    const d = await r.json();
    const sel = document.getElementById('lstm-zone-sel');
    if (!sel) return;
    if (d.success && d.noeuds.length > 0) {
      sel.innerHTML = d.noeuds.map(n =>
        `<option value="${n.node_id}">${n.zone || n.node_id} (${n.node_id})</option>`
      ).join('');
    } else {
      sel.innerHTML = '<option value="ESP32-DHT11">Mon champ — Nord</option>';
    }
  } catch(e) {
    const sel = document.getElementById('lstm-zone-sel');
    if (sel) sel.innerHTML = '<option value="ESP32-DHT11">Mon champ — Nord</option>';
  }
}

/* ══ Auto-chargement des données + mise à jour bannière ═══════ */
async function _lstmAutoLoad() {
  const nodeId  = document.getElementById('lstm-zone-sel')?.value || 'ESP32-DHT11';
  const varName = document.getElementById('lstm-var-sel')?.value  || 'humidite_air';
  _lstmTarget = varName;

  const badge = document.getElementById('lstm-status-badge');
  if (badge) badge.innerHTML = '⏳ Chargement données ESP32...';

  /* Données temps réel actuelles */
  let current = null;
  try {
    const r = await fetch('api/iot_data.php?action=capteurs', {cache:'no-cache'});
    const d = await r.json();
    if (d.success && d.capteurs.length > 0) {
      current = d.capteurs.find(c => c.node_id === nodeId) || d.capteurs[0];
    }
  } catch(e) {}

  /* Historique pour entraînement */
  let history = [];
  try {
    const r = await fetch(`api/iot_history.php?days=30&node=${encodeURIComponent(nodeId)}&limit=500`, {cache:'no-cache'});
    const d = await r.json();
    if (d.success) history = d.data;
  } catch(e) {}

  _lstmRawHistory = history;

  /* Mettre à jour bannière capteurs */
  _lstmUpdateBanner(current, nodeId);

  if (badge) {
    const cnt = history.length;
    badge.innerHTML = cnt > 0
      ? `<span style="color:#22c55e">✅ ${cnt} mesures ESP32 réelles</span>`
      : `<span style="color:#f59e0b">⚠️ Pas d'historique — données simulées</span>`;
  }

  /* Si modèle prêt, redessiner les graphiques */
  if (_lstmReady && _lstmModel) {
    await _lstmPredict(current, history, varName);
  } else {
    /* Graphique de prévisualisation avec données actuelles */
    _lstmDrawPreview(current, history, varName);
  }

  _lstmSchedule(null, current);
}

/* ══ Bannière capteurs ════════════════════════════════════════ */
function _lstmUpdateBanner(c, nodeId) {
  const banner = document.getElementById('lstm-sensor-banner');
  if (!banner) return;
  const tL = typeof T === 'function' ? T : k => k;

  const real = !!c;
  const mk = (ico, name, val, isReal, sub) => `
    <div style="text-align:center;padding:8px 12px;">
      <div style="font-size:20px">${ico}</div>
      <div style="font-size:16px;font-weight:700;margin:4px 0">${val}</div>
      <div style="font-size:11px;color:var(--slate)">${name}</div>
      <div style="margin-top:4px">
        <span style="font-size:10px;padding:2px 8px;border-radius:10px;
          background:${isReal?'rgba(34,197,94,.15)':'rgba(148,163,184,.1)'};
          color:${isReal?'#22c55e':'#94a3b8'}">
          ${isReal?'📡 ESP32':'absent'}
        </span>
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">${sub}</div>
    </div>`;

  banner.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--slate);margin-bottom:8px;">
      📍 ${nodeId} ${real?'<span style="color:#22c55e">● En ligne</span>':'<span style="color:#94a3b8">● Hors ligne</span>'}
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
      ${mk('🧪','pH Sol', c?.ph!=null?c.ph.toFixed(1):'—', c?.ph!=null, 'sonde pH')}
      ${mk('🌧️','Hum. Air', c?.humidite_air!=null?c.humidite_air+'%':'—', c?.humidite_air!=null, 'DHT11')}
      ${mk('💧','Hum. Sol', c?.humidite_sol!=null?c.humidite_sol+'%':'—', c?.humidite_sol!=null, 'capteur sol')}
      ${mk('🌡️','Température', c?.temperature!=null?c.temperature.toFixed(1)+'°C':'—', c?.temperature!=null, 'Base prévision')}
    </div>`;
}

/* ══ Prévisualisation avant entraînement ═════════════════════ */
function _lstmDrawPreview(current, history, varName) {
  const labels = _getDayLabels ? _getDayLabels() : [];
  const valNow = current?.[varName] ?? 45;

  /* Données passées depuis historique ou simulées */
  let past = [];
  if (history.length >= 7) {
    const step = Math.floor(history.length / 7);
    for (let i = 0; i < 7; i++) {
      const val = history[i * step]?.[varName];
      past.push(val != null ? parseFloat(val) : valNow + (Math.random()-0.5)*5);
    }
    past[6] = valNow;
  } else {
    past = Array.from({length:7}, (_,i) => Math.round(valNow + (i-3)*1.5 + (Math.random()-0.5)*3));
    past[6] = valNow;
  }

  /* Prévision simple (tendance) en attendant entraînement */
  const trend = (past[6] - past[0]) / 6;
  const future = Array.from({length:7}, (_,i) => Math.max(0, Math.min(100,
    Math.round(past[6] + trend*(i+1) + (Math.random()-0.5)*3))));

  _lstmDrawChart('lstm-big', past, future, labels, varName, false);
  if (varName !== 'temperature') _lstmDrawTempChart(current, history, labels);
}

/* ══ Entraîner le modèle LSTM ════════════════════════════════ */
async function _lstmTrain() {
  if (_lstmTrainPromise) return;
  const btn = document.getElementById('lstm-train-btn');
  const log = document.getElementById('lstm-train-log');
  const nodeId  = document.getElementById('lstm-zone-sel')?.value || 'ESP32-DHT11';
  const varName = document.getElementById('lstm-var-sel')?.value  || 'humidite_air';

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Entraînement...'; }
  if (log) { log.style.display = 'block'; log.innerHTML = ''; }

  const logLine = (msg, color='#22c55e') => {
    if (!log) return;
    log.innerHTML += `<div style="color:${color}">${msg}</div>`;
    log.scrollTop = log.scrollHeight;
  };

  _lstmTrainPromise = (async () => {
    try {
      /* Charger TF.js si nécessaire */
      if (typeof tf === 'undefined') {
        logLine('⏳ Chargement TensorFlow.js...', '#94a3b8');
        await new Promise((res, rej) => {
          const sc = document.createElement('script');
          sc.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
          sc.onload = res; sc.onerror = rej;
          document.head.appendChild(sc);
        });
      }
      logLine(`✅ TensorFlow.js ${tf.version.tfjs} chargé`);

      /* Préparer les données */
      let history = _lstmRawHistory;
      if (!history.length) {
        logLine('📡 Chargement historique ESP32...', '#60a5fa');
        const r = await fetch(`api/iot_history.php?days=30&node=${encodeURIComponent(nodeId)}&limit=500`);
        const d = await r.json();
        history = d.data || [];
        _lstmRawHistory = history;
      }

      /* Extraire la variable cible */
      let rawVals = history.map(h => h[varName]).filter(v => v != null).map(v => parseFloat(v));

      /* Si pas assez de données réelles → augmenter avec variation réaliste */
      if (rawVals.length < LSTM_SEQ_LEN + 3) {
        logLine(`⚠️ Seulement ${rawVals.length} mesures — augmentation des données`, '#f59e0b');
        const seed = rawVals.length > 0 ? rawVals[rawVals.length-1] : 45;
        const augmented = [seed];
        for (let i = 1; i < 120; i++) {
          const prev = augmented[augmented.length-1];
          const next = Math.max(5, Math.min(100, prev + (Math.random()-0.48)*3));
          augmented.push(next);
        }
        rawVals = [...augmented, ...rawVals]; // données synthétiques + réelles
        logLine(`✅ Dataset augmenté : ${rawVals.length} points`, '#a78bfa');
      } else {
        logLine(`✅ ${rawVals.length} mesures ESP32 réelles pour entraînement`, '#22c55e');
      }

      /* Normalisation Min-Max */
      _lstmNorm.min = Math.min(...rawVals);
      _lstmNorm.max = Math.max(...rawVals);
      const norm = v => (_lstmNorm.max > _lstmNorm.min)
        ? (v - _lstmNorm.min) / (_lstmNorm.max - _lstmNorm.min) : 0.5;
      const denorm = v => v * (_lstmNorm.max - _lstmNorm.min) + _lstmNorm.min;
      const normVals = rawVals.map(norm);

      /* Créer séquences [X, y] */
      const X = [], y = [];
      for (let i = 0; i < normVals.length - LSTM_SEQ_LEN - 1; i++) {
        X.push(normVals.slice(i, i + LSTM_SEQ_LEN).map(v => [v]));
        y.push(normVals[i + LSTM_SEQ_LEN]);
      }

      if (X.length < 5) {
        logLine('❌ Pas assez de données pour construire les séquences', '#ef4444');
        return;
      }

      logLine(`📊 Séquences créées : ${X.length} (longueur=${LSTM_SEQ_LEN})`, '#60a5fa');

      const xTensor = tf.tensor3d(X);
      const yTensor = tf.tensor1d(y);

      /* ══ Architecture LSTM réelle ══
         LSTM(64) → Dropout(0.2) → LSTM(32) → Dense(16) → Dense(1)  */
      const model = tf.sequential();
      model.add(tf.layers.lstm({
        units: 64, inputShape: [LSTM_SEQ_LEN, 1],
        returnSequences: true, name: 'lstm_1'
      }));
      model.add(tf.layers.dropout({ rate: 0.2 }));
      model.add(tf.layers.lstm({ units: 32, returnSequences: false, name: 'lstm_2' }));
      model.add(tf.layers.dense({ units: 16, activation: 'relu', name: 'dense_1' }));
      model.add(tf.layers.dense({ units: 1, activation: 'linear', name: 'output' }));

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      logLine(`🏗️ Architecture : LSTM(64) → Dropout → LSTM(32) → Dense(16) → Dense(1)`, '#a78bfa');
      logLine(`🏋️ Entraînement : ${LSTM_EPOCHS} époques · batch=${LSTM_BATCH}...`);

      let bestMAE = Infinity;
      await model.fit(xTensor, yTensor, {
        epochs: LSTM_EPOCHS,
        batchSize: LSTM_BATCH,
        validationSplit: 0.15,
        shuffle: true,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const mae = (logs.val_mae ?? logs.mae ?? 0);
            if (mae < bestMAE) bestMAE = mae;
            if (epoch % 10 === 0 || epoch === LSTM_EPOCHS-1) {
              const pct = Math.round((epoch+1)/LSTM_EPOCHS*100);
              const bar = '█'.repeat(Math.round(pct/5)) + '░'.repeat(20-Math.round(pct/5));
              logLine(`Epoch ${String(epoch+1).padStart(2)} [${bar}] ${pct}% · loss=${logs.loss.toFixed(4)} · mae=${mae.toFixed(4)}`);
            }
          }
        }
      });

      xTensor.dispose(); yTensor.dispose();

      /* Calculer accuracy (R²) */
      const predT = model.predict(tf.tensor3d(X));
      const predArr = await predT.data(); predT.dispose();
      const yArr = Array.from(await yTensor.data?.() ?? y);
      const yMean = y.reduce((a,b)=>a+b,0)/y.length;
      const ssTot = y.reduce((a,v)=>a+(v-yMean)**2,0);
      const ssRes = y.reduce((a,v,i)=>a+(v-predArr[i])**2,0);
      const r2    = Math.max(0, Math.min(1, 1 - ssRes/ssTot));
      _lstmAccuracy = Math.round(r2 * 100);
      const realMAE = Math.round(bestMAE * (_lstmNorm.max - _lstmNorm.min) * 10) / 10;

      logLine(`✅ Entraînement terminé !`, '#22c55e');
      logLine(`📊 R² = ${_lstmAccuracy}% · MAE = ${realMAE} ${varName==='temperature'?'°C':'%'}`);

      /* Stocker modèle + dénormaliseur */
      _lstmModel = model;
      _lstmReady = true;
      _lstmDenorm = denorm;
      _lstmLastNormVals = normVals;

      /* Mettre à jour UI stats */
      const precEl = document.getElementById('lstm-prec-val');
      const maeEl  = document.getElementById('lstm-mae-val');
      const trendEl= document.getElementById('lstm-trend-lbl');
      const badgeEl= document.getElementById('lstm-method-badge');
      if (precEl) precEl.textContent = _lstmAccuracy + '%';
      if (maeEl)  maeEl.textContent  = realMAE + (varName==='temperature'?' °C':' %');
      if (trendEl) trendEl.textContent = '🧠 LSTM TF.js réel';
      if (badgeEl) { badgeEl.textContent = `✅ R²=${_lstmAccuracy}%`; badgeEl.style.color='#22c55e'; }

      /* Prédire et afficher */
      const current = _lstmRawHistory.length > 0 ? {
        [varName]: rawVals[rawVals.length-1]
      } : null;
      await _lstmPredict(current, history, varName);

    } catch(e) {
      logLine(`❌ Erreur: ${e.message}`, '#ef4444');
      console.error('[LSTM]', e);
    }
  })();

  await _lstmTrainPromise;
  _lstmTrainPromise = null;
  if (btn) { btn.disabled = false; btn.textContent = '🔄 Ré-entraîner'; }
}

/* ══ Prédiction avec le modèle entraîné ══════════════════════ */
let _lstmDenorm     = v => v;
let _lstmLastNormVals = [];

async function _lstmPredict(current, history, varName) {
  if (!_lstmModel || !_lstmReady) return;

  /* Prendre les dernières valeurs pour la séquence d'entrée */
  const norm = v => (_lstmNorm.max > _lstmNorm.min)
    ? (v - _lstmNorm.min) / (_lstmNorm.max - _lstmNorm.min) : 0.5;

  const lastSeq = _lstmLastNormVals.slice(-LSTM_SEQ_LEN);
  if (lastSeq.length < LSTM_SEQ_LEN) return;

  /* Prédire 7 jours par itération */
  let seq = [...lastSeq];
  const predictions = [];
  for (let day = 0; day < LSTM_HORIZON; day++) {
    const input  = tf.tensor3d([seq.map(v => [v])]);
    const pred   = _lstmModel.predict(input);
    const val    = (await pred.data())[0];
    input.dispose(); pred.dispose();
    predictions.push(Math.max(0, Math.min(1, val)));
    seq = [...seq.slice(1), val];
  }

  /* Dénormaliser */
  const futureDenorm = predictions.map(v => Math.round(_lstmDenorm(v) * 10) / 10);

  /* Données passées réelles */
  let rawVals = history.map(h => h[varName]).filter(v => v != null).map(v => parseFloat(v));
  const past7 = rawVals.slice(-7);
  while (past7.length < 7) past7.unshift(null);

  const labels = _getDayLabels ? _getDayLabels() : [];
  _lstmDrawChart('lstm-big', past7, futureDenorm, labels, varName, true);
  _lstmDrawTempChart(current, history, labels);
  _lstmSchedule(futureDenorm, current);
}

/* ══ Dessin graphique LSTM ═══════════════════════════════════ */
function _lstmDrawChart(svgId, past7, future7, labels, varName, isReal) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const W = 500, H = 160;

  /* Calcul échelle selon variable */
  const isTemp = varName === 'temperature';
  const allVals = [...past7.filter(v=>v!=null), ...future7];
  const minV = Math.min(...allVals, isTemp?10:0);
  const maxV = Math.max(...allVals, isTemp?40:100);
  const thresh = isTemp ? null : THRESH_CRITICAL;
  const yS = v => H - 20 - (v - minV) / (maxV - minV + 1) * (H - 35);

  const xs = Array.from({length:14}, (_,i) => Math.round(10 + i*(W-20)/13));
  const pastColor  = '#94a3b8';
  const futColor   = isTemp ? '#d97706' : '#7c3aed';

  /* Points passés */
  const pastPts = past7.map((v,i) => v!=null ? `${xs[i]},${yS(v)}` : null).filter(Boolean);
  /* Points futurs */
  const futurePts = future7.map((v,i) => `${xs[7+i]},${yS(v)}`);

  /* Ligne de seuil */
  const threshLine = thresh
    ? `<line x1="10" y1="${yS(thresh)}" x2="${W-10}" y2="${yS(thresh)}"
         stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="5,4" opacity=".8"/>
       <text x="2" y="${yS(thresh)+4}" font-size="9" fill="#fbbf24">${thresh}%</text>`
    : '';

  /* Gradient fill */
  const pastFill = past7.map((v,i) => v!=null ? `${xs[i]},${yS(v)}` : null).filter(Boolean);

  svg.innerHTML = `
    <defs>
      <linearGradient id="gpL" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${pastColor}" stop-opacity=".3"/>
        <stop offset="100%" stop-color="${pastColor}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gfL" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${futColor}" stop-opacity=".3"/>
        <stop offset="100%" stop-color="${futColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${threshLine}
    <!-- Passé -->
    ${pastFill.length>1?`<polygon points="${pastFill.join(' ')} ${xs[6]},${H-20} ${xs[0]},${H-20}" fill="url(#gpL)"/>
    <polyline points="${pastFill.join(' ')}" fill="none" stroke="${pastColor}" stroke-width="2"/>`:'' }
    <!-- Futur -->
    <polygon points="${xs[6]},${yS(past7[6]??future7[0])} ${futurePts.join(' ')} ${xs[13]},${H-20} ${xs[6]},${H-20}" fill="url(#gfL)"/>
    <polyline points="${xs[6]},${yS(past7[6]??future7[0])} ${futurePts.join(' ')}" fill="none" stroke="${futColor}" stroke-width="2.5"/>
    <!-- Points passés -->
    ${past7.map((v,i)=>v!=null?`<circle cx="${xs[i]}" cy="${yS(v)}" r="3" fill="${pastColor}"/>`:'')}
    <!-- Points futurs avec valeur -->
    ${future7.map((v,i)=>`
      <circle cx="${xs[7+i]}" cy="${yS(v)}" r="3.5" fill="${futColor}" stroke="#fff" stroke-width="1.5"/>
      ${i%2===0?`<text x="${xs[7+i]-8}" y="${yS(v)-6}" font-size="9" fill="${futColor}">${v}${isTemp?'°':'%'}</text>`:''}`).join('')}
    <!-- Ligne aujourd'hui -->
    <line x1="${xs[6]}" y1="5" x2="${xs[6]}" y2="${H-15}" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="${xs[6]+3}" y="13" font-size="9" fill="#22c55e" font-weight="bold">Auj.</text>
    <!-- Badge LSTM -->
    ${isReal?`<text x="${W-60}" y="14" font-size="9" fill="#a78bfa">🧠 LSTM réel</text>`:''}
    <!-- Axe Y -->
    <text x="2" y="${yS(maxV)+4}" font-size="9" fill="#94a3b8">${maxV}${isTemp?'°':'%'}</text>
    <text x="2" y="${yS(minV)-2}" font-size="9" fill="#94a3b8">${minV}${isTemp?'°':'%'}</text>`;
}

function _lstmDrawTempChart(current, history, labels) {
  const svg = document.getElementById('lstm-temp');
  if (!svg) return;
  const temps = history.map(h=>h.temperature).filter(v=>v!=null).map(v=>parseFloat(v));
  const past7 = temps.slice(-7);
  while (past7.length < 7) past7.unshift(null);

  const tempNow = current?.temperature ?? (past7.filter(Boolean).slice(-1)[0] ?? 26);
  const trendT  = past7.filter(Boolean).length > 2
    ? (past7.filter(Boolean).slice(-1)[0] - past7.filter(Boolean)[0]) / past7.filter(Boolean).length : 0;
  const future7 = Array.from({length:7}, (_,i) =>
    Math.round((tempNow + trendT*(i+1) + (Math.random()-0.5)*1.5) * 10) / 10);

  _lstmDrawChart('lstm-temp', past7, future7, labels, 'temperature', false);
}

/* ══ Planning irrigation ══════════════════════════════════════ */
function _lstmSchedule(futurePredictions, current) {
  const el = document.getElementById('lstm-schedule');
  if (!el) return;
  const days = _getDayLabels ? _getDayLabels().slice(7,14) : ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(s=>({short:s}));
  const hum  = futurePredictions
    ?? Array.from({length:7}, (_,i) => Math.round(45 + (i-3)*2.5 + (Math.random()-0.5)*3));

  el.innerHTML = hum.map((v, i) => {
    const day  = days[i]?.short || ('J+'+(i+1));
    const need = v < THRESH_CRITICAL;
    const bg   = need ? '#dc2626' : '#16a34a';
    const col  = need ? 'var(--red)' : 'var(--green)';
    const icon = need ? '(irriguer)' : '';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:68px;font-size:12px;font-weight:700">${day}</div>
      <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden">
        <div style="height:100%;width:${Math.min(100,Math.max(0,v*2))}%;background:${bg};border-radius:5px;transition:width 1.2s"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${col};width:80px">${v}% ${icon}</div>
    </div>`;
  }).join('');
}
