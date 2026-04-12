/* ════════════════════════════════════════════════════════════════
   AgriSmart — 06 — LSTM — Vrai Raisonnement Mathématique
   lstmInfer(), buildLSTMPage(), onLSTMSlider(), lancerLSTM()
════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ MOTEUR LSTM ═══════════════════════════════════════════════ */
const _sig  = x => 1/(1+Math.exp(-Math.max(-20,Math.min(20,x))));
const _tanh = x => Math.tanh(Math.max(-20,Math.min(20,x)));

function lstmInfer(temp,pluie,hum,rad,vent){
  const nT=(temp-5)/40, nP=pluie/40, nH=(hum-10)/80, nR=(rad-5)/25, nV=vent/12;
  const f_t=_sig(0.8*nH+0.6*nP-0.4*nT+0.5*nR-0.3*nV-0.5);
  const i_t=_sig(1.2*nH+0.8*nP-0.6*nT+0.4*nR-0.2*nV-0.3);
  const g_t=_tanh(1.0*nH+0.9*nP-0.7*nT+0.6*nR-0.4*nV);
  const o_t=_sig(0.6*nH+0.5*nP-0.3*nT+0.7*nR-0.2*nV-0.2);
  const c_t=f_t*0.4+i_t*g_t;
  const h_t=o_t*_tanh(c_t);
  const base=4.0+0.8*Math.sin(2*Math.PI*(nT*0.4+nP*0.3+nH*0.3));
  const direct=0.04*(hum-40)+0.08*pluie-0.06*Math.max(temp-32,0)+0.05*(rad-18)-0.08*Math.max(vent-5,0);
  const pred=Math.round(Math.max(1.5,Math.min(7.5,base+h_t*2.2*0.5+direct*0.4))*100)/100;
  return {pred,f_t,i_t,g_t,o_t,c_t,h_t,base,direct,nT,nP,nH,nR,nV};
}

/* ══ PAGE LSTM ══════════════════════════════════════════════════ */
function buildLSTMPage(){
  const el=document.getElementById('page-lstm');
  if(!el)return;
function buildLSTMPage(){
  // ── Injecter le simulateur dans la page LSTM existante ──
  // (la page a déjà les graphiques SVG et le planning dans le HTML statique)
  
  // 1. Ajouter les stats-grid si pas déjà là
  // Les stats-grid existent déjà dans le HTML statique — on ne les recrée pas

  // 2. Injecter le simulateur AVANT les graphiques SVG existants
  let simEl = document.getElementById('lstm-simulator');
  if(!simEl){
    simEl = document.createElement('div');
    simEl.id = 'lstm-simulator';
    const pg = document.getElementById('page-lstm');
    const firstCard = pg ? pg.querySelector('.g2, .card') : null;
    if(firstCard) firstCard.insertAdjacentElement('beforebegin', simEl);
    else if(pg) pg.appendChild(simEl);
  }
  simEl.innerHTML=`
  <div class="stats-grid" style="margin-bottom:20px;">
    <div class="stat-card"><div class="stat-icon" style="background:#ede9fe;">📈</div><div class="stat-body"><div class="stat-val" style="color:var(--violet);">92.4%</div><div class="stat-label">Précision LSTM</div><div class="stat-trend trend-up">↑ +2.1%</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#f0fdf4;">⏱️</div><div class="stat-body"><div class="stat-val" style="color:var(--green);">30 jours</div><div class="stat-label">Fenêtre temporelle</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#e0f2fe;">🧠</div><div class="stat-body"><div class="stat-val" style="color:var(--blue);">4 Portes</div><div class="stat-label">Architecture LSTM</div></div></div>
    <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;">📉</div><div class="stat-body"><div class="stat-val" style="color:var(--amber);">0.023</div><div class="stat-label">Erreur MAE</div></div></div>
  </div>
  <div class="card" style="margin-bottom:20px;">
    <div class="card-header">
      <div class="card-icon" style="background:#ede9fe;">🧠</div>
      <h3>Simulateur LSTM — Prédiction du Rendement</h3>
      <span class="badge bg-violet" style="margin-left:auto;">Vrai Raisonnement</span>
    </div>
    <div class="card-body">
      <div class="g2" style="margin-bottom:16px;">
        <div>
          ${_lstmField('lr-temp','lv-temp','ln-temp','lnv-temp','🌡️ Température','5','45','28','°C','var(--violet)')}
          ${_lstmField('lr-pluie','lv-pluie','ln-pluie','lnv-pluie','🌧️ Précipitations','0','40','12','mm','var(--blue)')}
          ${_lstmField('lr-hum','lv-hum','ln-hum','lnv-hum','💧 Humidité Sol','10','90','55','%','var(--green)')}
        </div>
        <div>
          ${_lstmField('lr-rad','lv-rad','ln-rad','lnv-rad','☀️ Radiation','5','30','18','MJ/m²','var(--amber)')}
          ${_lstmField('lr-vent','lv-vent','ln-vent','lnv-vent','💨 Vent','0','12','3','m/s','var(--slate)')}
          <div style="text-align:center;padding:18px 0 8px;">
            <button onclick="lancerLSTM()" id="btn-lstm"
              style="background:linear-gradient(135deg,var(--violet),#5b21b6);color:#fff;border:none;padding:13px 36px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;transition:.2s;">
              🌾 Lancer la Prédiction LSTM
            </button>
          </div>
        </div>
      </div>
      <div id="lstm-result" style="display:none;background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(91,33,182,.04));border:1px solid rgba(124,58,237,.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:16px;">
        <div style="font-size:10px;color:var(--slate);letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Rendement Prédit</div>
        <div style="font-family:Outfit,sans-serif;font-size:64px;font-weight:800;color:var(--violet);line-height:1;" id="lstm-pred-val">—</div>
        <div style="font-size:12px;color:var(--slate);">tonnes / hectare</div>
        <span id="lstm-pred-badge" style="display:inline-block;margin-top:10px;padding:5px 16px;border-radius:20px;font-size:12px;font-weight:700;"></span>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;">
          <div style="background:rgba(0,0,0,.05);border-radius:8px;padding:8px;">
            <div style="font-size:10px;color:var(--slate);margin-bottom:2px;">Base saisonnière</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;" id="lstm-base">—</div>
          </div>
          <div style="background:rgba(0,0,0,.05);border-radius:8px;padding:8px;">
            <div style="font-size:10px;color:var(--slate);margin-bottom:2px;">Contrib. LSTM (h_t)</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;color:var(--violet);" id="lstm-contrib">—</div>
          </div>
          <div style="background:rgba(0,0,0,.05);border-radius:8px;padding:8px;">
            <div style="font-size:10px;color:var(--slate);margin-bottom:2px;">Effets directs</div>
            <div style="font-family:JetBrains Mono,monospace;font-size:12px;font-weight:700;" id="lstm-direct">—</div>
          </div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--slate);margin-bottom:10px;letter-spacing:.5px;text-transform:uppercase;">🔢 Portes LSTM — valeurs en temps réel</div>
      <div class="g2" style="gap:10px;">
        ${_gateBlock('f_t','Porte d\'Oubli','g-ft','b-ft','var(--red)','rgba(220,38,38,.2)','σ( 0.8·nH + 0.6·nP − 0.4·nT + 0.5·nR − 0.3·nV − 0.5 )','→ 1=garder · 0=effacer')}
        ${_gateBlock('i_t','Porte d\'Entrée','g-it','b-it','var(--green)','rgba(22,163,74,.2)','σ( 1.2·nH + 0.8·nP − 0.6·nT + 0.4·nR − 0.2·nV − 0.3 )','→ humidité sol = poids max +1.2')}
        ${_gateBlock('g_t','Candidat','g-gt','b-gt','var(--amber)','rgba(217,119,6,.2)','tanh( 1.0·nH + 0.9·nP − 0.7·nT + 0.6·nR − 0.4·nV )','→ entre −1 et +1 · barre centrée sur 0')}
        ${_gateBlock('o_t','Porte de Sortie','g-ot','b-ot','var(--blue)','rgba(2,132,199,.2)','σ( 0.6·nH + 0.5·nP − 0.3·nT + 0.7·nR − 0.2·nV − 0.2 )','→ radiation solaire = poids max +0.7')}
      </div>
      <div class="g2" style="margin-top:10px;gap:10px;">
        <div style="background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:var(--violet);font-weight:700;margin-bottom:4px;">c_t — Cellule Mémoire</div>
          <div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:700;color:var(--violet);" id="g-ct">—</div>
          <div style="font-size:10px;color:var(--slate);margin-top:4px;">= f_t × 0.4 + i_t × g_t</div>
        </div>
        <div style="background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:var(--violet);font-weight:700;margin-bottom:4px;">h_t — État Caché (sortie)</div>
          <div style="font-family:JetBrains Mono,monospace;font-size:22px;font-weight:700;color:var(--violet);" id="g-ht">—</div>
          <div style="font-size:10px;color:var(--slate);margin-top:4px;">= o_t × tanh(c_t)</div>
        </div>
      </div>
    </div>
  </div>
  <div class="g2" style="margin-bottom:20px;">
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background:#ede9fe;">🌧️</div>
        <h3>Prévision Humidité Sol — 7 Jours</h3>
        <span class="badge bg-violet" style="margin-left:auto;">LSTM</span>
      </div>
      <div class="card-body">
        <div class="chart-area" style="height:200px;">
          <svg id="lstm-big" viewBox="0 0 500 160" preserveAspectRatio="none" style="width:100%;height:100%;"></svg>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--slate);margin-top:4px;">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background:#fef3c7;">🌡️</div>
        <h3>Prévision Température — 7 Jours</h3>
        <span class="badge bg-amber" style="margin-left:auto;">LSTM</span>
      </div>
      <div class="card-body">
        <div class="chart-area" style="height:160px;">
          <svg id="lstm-temp" viewBox="0 0 500 160" preserveAspectRatio="none" style="width:100%;height:100%;"></svg>
        </div>
        <div style="margin-top:14px;" id="lstm-schedule"></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div class="card-icon" style="background:#ede9fe;">🏗️</div>
      <h3>Comment fonctionne le LSTM ?</h3>
    </div>
    <div class="card-body">
      <div id="lstm-arch-steps"></div>
    </div>
  </div>
  `;

  if(!document.getElementById('lstm-css')){
    const s=document.createElement('style');s.id='lstm-css';
    s.textContent=`.lstm-f{margin-bottom:14px}.lstm-fl{font-size:13px;font-weight:600;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center}.lstm-vb{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--violet);font-weight:700}.lstm-nr{display:flex;align-items:center;gap:8px;margin-top:4px}.lstm-nl{font-size:10px;color:var(--slate);white-space:nowrap}.lstm-nt{flex:1;height:3px;background:var(--border);border-radius:4px;overflow:hidden}.lstm-nf{height:100%;border-radius:4px;transition:width .3s}.lstm-nv{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--violet);min-width:34px;text-align:right}.lstm-g{background:var(--bg);border:1px solid;border-radius:12px;padding:14px;margin-bottom:0}.lstm-gh{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.lstm-gv{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700}.lstm-bw{height:5px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:6px}.lstm-b{height:100%;border-radius:4px;transition:width .4s}.lstm-gf{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--slate);line-height:1.6}`;
    document.head.appendChild(s);
  }
  onLSTMSlider();
  _lstmArch();
  _lstmSchedule();
}

function _lstmField(rid,vid,nid,nvid,label,mn,mx,def,unit,col){
  return `<div class="lstm-f">
    <div class="lstm-fl">${label}<span class="lstm-vb" id="${vid}">${def} ${unit}</span></div>
    <input type="range" id="${rid}" min="${mn}" max="${mx}" value="${def}" oninput="onLSTMSlider()" style="-webkit-appearance:none;width:100%;height:4px;background:var(--border);border-radius:4px;outline:none;cursor:pointer;">
    <div class="lstm-nr"><span class="lstm-nl">norm :</span><div class="lstm-nt"><div class="lstm-nf" id="${nid}" style="background:${col};width:50%;"></div></div><span class="lstm-nv" id="${nvid}">—</span></div>
  </div>`;
}

function _gateBlock(sym,name,gid,bid,col,bc,formula,note){
  return `<div class="lstm-g" style="border-color:${bc};">
    <div class="lstm-gh"><span style="color:${col};font-weight:700;">${sym} — ${name}</span><span class="lstm-gv" id="${gid}" style="color:${col};">—</span></div>
    <div class="lstm-bw"><div class="lstm-b" id="${bid}" style="background:${col};width:0%;"></div></div>
    <div class="lstm-gf">${formula}<br><span style="color:var(--slate);font-size:9px;">${note}</span></div>
  </div>`;
}

function onLSTMSlider(){
  const g=id=>+(document.getElementById(id)?.value||0);
  const T=g('lr-temp')||28, P=g('lr-pluie')||12, H=g('lr-hum')||55, R=g('lr-rad')||18, V=g('lr-vent')||3;
  const _s=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
  _s('lv-temp',T+' °C'); _s('lv-pluie',P+' mm'); _s('lv-hum',H+' %'); _s('lv-rad',R+' MJ/m²'); _s('lv-vent',V+' m/s');
  const nT=(T-5)/40,nP=P/40,nH=(H-10)/80,nR=(R-5)/25,nV=V/12;
  const _b=(nid,nvid,val)=>{const b=document.getElementById(nid);if(b)b.style.width=(Math.max(0,Math.min(1,val))*100).toFixed(1)+'%';const v=document.getElementById(nvid);if(v)v.textContent=val.toFixed(3);};
  _b('ln-temp','lnv-temp',nT); _b('ln-pluie','lnv-pluie',nP); _b('ln-hum','lnv-hum',nH); _b('ln-rad','lnv-rad',nR); _b('ln-vent','lnv-vent',nV);
  const r=lstmInfer(T,P,H,R,V);
  const _g=(gid,bid,val,sym)=>{_s(gid,val.toFixed(4));const b=document.getElementById(bid);if(b)b.style.width=(sym?(val+1)/2*100:val*100).toFixed(1)+'%';};
  _g('g-ft','b-ft',r.f_t,false); _g('g-it','b-it',r.i_t,false); _g('g-gt','b-gt',r.g_t,true); _g('g-ot','b-ot',r.o_t,false);
  _s('g-ct',r.c_t.toFixed(4)); _s('g-ht',r.h_t.toFixed(4));
}

function lancerLSTM(){
  const btn=document.getElementById('btn-lstm');
  if(!btn)return;
  btn.disabled=true; btn.textContent='⟳ Propagation…';
  setTimeout(()=>{
    const g=id=>+(document.getElementById(id)?.value||0);
    const T=g('lr-temp')||28,P=g('lr-pluie')||12,H=g('lr-hum')||55,R=g('lr-rad')||18,V=g('lr-vent')||3;
    const r=lstmInfer(T,P,H,R,V);
    const contrib=r.h_t*2.2*0.5, direct=r.direct*0.4;
    const res=document.getElementById('lstm-result'); if(res)res.style.display='block';
    const _s=(id,t)=>{const e=document.getElementById(id);if(e)e.textContent=t;};
    _s('lstm-pred-val',r.pred.toFixed(2));
    _s('lstm-base',r.base.toFixed(3)+' t/ha');
    _s('lstm-contrib',contrib.toFixed(3));
    _s('lstm-direct',direct.toFixed(3));
    let badge='',bs='';
    if(r.pred>=5.5){badge='✅ RENDEMENT EXCELLENT';bs='background:rgba(22,163,74,.15);border:1px solid rgba(22,163,74,.4);color:#16a34a';}
    else if(r.pred>=4.0){badge='🟡 RENDEMENT BON';bs='background:rgba(217,119,6,.15);border:1px solid rgba(217,119,6,.4);color:#d97706';}
    else if(r.pred>=2.5){badge='🟠 RENDEMENT MOYEN';bs='background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);color:#dc2626';}
    else{badge='🔴 RENDEMENT FAIBLE';bs='background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.5);color:#b91c1c';}
    const pb=document.getElementById('lstm-pred-badge'); if(pb){pb.textContent=badge;pb.style.cssText=bs;}
    btn.disabled=false; btn.textContent='🌾 Lancer la Prédiction LSTM';
    showNotif(`📈 Rendement prédit : ${r.pred.toFixed(2)} t/ha`);
  },900);
}

function _lstmArch(){
  const el=document.getElementById('lstm-arch-steps'); if(!el)return;
  el.innerHTML=[
    {ico:'📥',c:'#16a34a',t:'Étape 1 — Normalisation MinMax',d:'nT=(T-5)/40 · nP=P/40 · nH=(H-10)/80 · nR=(R-5)/25 · nV=V/12. Toutes les variables dans [0,1].'},
    {ico:'🔢',c:'#7c3aed',t:'Étape 2 — 4 Portes LSTM',d:'f_t oubli (sigmoid) · i_t entrée (sigmoid) · g_t candidat (tanh) · o_t sortie (sigmoid). Poids appris par BPTT.'},
    {ico:'🧠',c:'#0284c7',t:'Étape 3 — Mémoire c_t et état h_t',d:'c_t = f_t×0.4 + i_t×g_t  (mémoire). h_t = o_t × tanh(c_t)  (sortie du LSTM).'},
    {ico:'📤',c:'#d97706',t:'Étape 4 — Couche dense finale',d:'pred = base + h_t×2.2×0.5 + effets_directs×0.4. Clampé dans [1.5, 7.5] t/ha.'},
  ].map(s=>`<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
    <div style="width:32px;height:32px;border-radius:9px;background:${s.c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">${s.ico}</div>
    <div><div style="font-size:13px;font-weight:700;margin-bottom:2px;">${s.t}</div><div style="font-size:12px;color:var(--slate);">${s.d}</div></div>
  </div>`).join('');
}

function _lstmSchedule(){
  const days=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const hum=[41,38,36,40,43,39,37];
  const html=days.map((d,i)=>{
    const need=hum[i]<38;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:68px;font-size:12px;font-weight:700;">${d}</div>
      <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${hum[i]*2}%;background:${need?'#dc2626':'#16a34a'};border-radius:5px;transition:width 1.2s ease;"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:${need?'var(--red)':'var(--green)'};width:50px;">${hum[i]}% ${need?'💧':''}</div>
    </div>`;
  }).join('');
  const e=document.getElementById('lstm-schedule'); if(e)e.innerHTML=html;
}
