/* ════════════════════════════════════════════════════════════════
   AgriSmart — 06 — LSTM — Page LSTM
   buildLSTMPage()
   Fichier : 06_lstm.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   LSTM PAGE
═══════════════════════════════════════════════════════ */
function buildLSTMPage() {
  document.getElementById('lstm-arch-steps').innerHTML = [
    { ico:'📥', c:'#16a34a', t:'Entrée (30 jours)',    d:'30 mesures consécutives de capteurs : T°, humidité, pH → vecteur X de séquence.' },
    { ico:'🧠', c:'#7c3aed', t:'Cellule LSTM',         d:'La porte d\'oubli sélectionne ce qui est important. La mémoire stocke les tendances.' },
    { ico:'📤', c:'#0284c7', t:'Sortie (7 jours)',     d:'7 prédictions futures : humidité du sol jour par jour.' },
    { ico:'⚙️', c:'#d97706', t:'Action Automatique',   d:'Si humidité prévue < 30% → alerte irrigation automatique déclenchée.' },
  ].map(s=>`
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
      <div style="width:32px;height:32px;border-radius:9px;background:${s.c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">${s.ico}</div>
      <div><div style="font-size:13px;font-weight:700;margin-bottom:2px;">${s.t}</div><div style="font-size:12px;color:var(--slate);">${s.d}</div></div>
    </div>`).join('');

  // Irrigation schedule
  const days = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const hum  = [41,38,36,40,43,39,37];
  document.getElementById('lstm-schedule').innerHTML = days.map((d,i)=>{
    const need = hum[i]<38;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:68px;font-size:12px;font-weight:700;">${d}</div>
      <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${hum[i]*2}%;background:${need?'#dc2626':'#16a34a'};border-radius:5px;transition:width 1.2s ease;"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${need?'var(--red)':'var(--green)'};width:50px;">${hum[i]}% ${need?'💧':''}</div>
    </div>`;
  }).join('');
}
