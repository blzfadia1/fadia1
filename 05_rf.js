/* ════════════════════════════════════════════════════════════════
   AgriSmart — 05 — RF — Page Random Forest
   CULTURES[], sval(), buildRFPage(), lancerRF()
   Fichier : 05_rf.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   RANDOM FOREST PAGE
═══════════════════════════════════════════════════════ */
// Données des cultures — noms traduits dynamiquement via T()
const CULTURES_DATA = [
  { key:'cRiz',   emoji:'🌾', c:'#1a7abf', cond:{ ph:[5,7],   hs:[60,100], n:[60,130], temp:[20,30], rain:[150,300] }},
  { key:'cBle',   emoji:'🌾', c:'#c88a00', cond:{ ph:[5.5,7.5],hs:[25,60], n:[55,100], temp:[12,25], rain:[40,150]  }},
  { key:'cMais',  emoji:'🌽', c:'#16a34a', cond:{ ph:[5.5,7], hs:[30,70],  n:[70,140], temp:[20,35], rain:[50,200]  }},
  { key:'cCoton', emoji:'🌿', c:'#c04030', cond:{ ph:[6,8],   hs:[15,50],  n:[25,100], temp:[25,40], rain:[20,100]  }},
  { key:'cPoisChiche',emoji:'🫘',c:'#8b5cf6',cond:{ ph:[5.5,7],hs:[20,50], n:[0,45],   temp:[15,30], rain:[25,100]  }},
  { key:'cCafe',  emoji:'☕', c:'#7c4a1e', cond:{ ph:[5,6.5], hs:[40,75],  n:[80,140], temp:[18,30], rain:[100,250] }},
  { key:'cTournesol',emoji:'🌻',c:'#d97706',cond:{ ph:[6,7.5], hs:[25,55], n:[30,90],  temp:[20,30], rain:[30,130]  }},
  { key:'cTomate',emoji:'🍅', c:'#dc2626', cond:{ ph:[6,7],   hs:[40,80],  n:[60,120], temp:[18,28], rain:[60,150]  }},
  { key:'cSoja',  emoji:'🌱', c:'#4a8a20', cond:{ ph:[6,7],   hs:[40,70],  n:[0,60],   temp:[20,30], rain:[60,175]  }},
  { key:'cPomme', emoji:'🥔', c:'#a06020', cond:{ ph:[5,6.5], hs:[40,70],  n:[80,130], temp:[10,22], rain:[50,150]  }},
  { key:'cMangue',emoji:'🥭', c:'#d07000', cond:{ ph:[5.5,7.5],hs:[25,60], n:[30,80],  temp:[24,38], rain:[50,200]  }},
  { key:'cRaisin',emoji:'🍇', c:'#6030a0', cond:{ ph:[6,7.5], hs:[25,55],  n:[20,70],  temp:[16,30], rain:[30,120]  }},
];

// Getter traduit — toujours à jour avec la langue active
function getCultures() {
  const _t = typeof T === 'function' ? T : k => k;
  return CULTURES_DATA.map(c => ({ ...c, nom: _t(c.key) }));
}
// Compatibilité avec le code existant
let CULTURES = getCultures();

function buildRFPage() {
  const _t = typeof T === 'function' ? T : k => k;
  const fields = [
    { id:'s-ph',   label:_t('rfPh'),       min:30,max:90, def:65, fmt:v=>(v/10).toFixed(1), hints:_t('rfHint_ph').split(',') },
    { id:'s-hs',   label:_t('rfHumSol'),   min:0, max:100,def:45, fmt:v=>v+'%',              hints:_t('rfHint_hs').split(',') },
    { id:'s-n',    label:_t('rfAzote'),     min:0, max:140,def:60, fmt:v=>v+' kg/ha',         hints:_t('rfHint_n').split(',') },
    { id:'s-temp', label:_t('rfTemp'),      min:8, max:45, def:25, fmt:v=>v+'°C',             hints:_t('rfHint_temp').split(',') },
    { id:'s-rain', label:_t('rfPluie'),     min:20,max:300,def:85, fmt:v=>v+' mm',            hints:_t('rfHint_rain').split(',') },
    { id:'s-hair', label:_t('rfHumAir'),    min:14,max:100,def:65, fmt:v=>v+'%',              hints:_t('rfHint_hair').split(',') },
    { id:'s-p',    label:_t('rfPhosphore'), min:0, max:145,def:40, fmt:v=>v+' kg/ha',         hints:_t('rfHint_p').split(',') },
    { id:'s-k',    label:_t('rfPotassium'), min:0, max:205,def:40, fmt:v=>v+' kg/ha',         hints:_t('rfHint_k').split(',') },
  ];
  document.getElementById('rf-fields').innerHTML = fields.map(f=>`
    <div class="field-row">
      <label>${f.label} <span class="fval" id="fv-${f.id}">${f.fmt(f.def)}</span></label>
      <input type="range" id="${f.id}" min="${f.min}" max="${f.max}" value="${f.def}"
        oninput="document.getElementById('fv-${f.id}').textContent='${f.fmt(''+'')}'+this.value;updateRFVal('${f.id}','${f.fmt('___')}',this.value)">
      <div class="range-hints"><span>${f.hints[0]}</span><span>${f.hints[1]}</span><span>${f.hints[2]}</span></div>
    </div>`).join('');

  // Fix the fmt display
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    el.oninput = function() {
      document.getElementById('fv-'+f.id).textContent = f.fmt(this.value);
    };
  });
}

function sval(v,[mn,mx]){const m=(mn+mx)/2,r=(mx-mn)/2||1;return Math.max(0,1-Math.abs((v-m)/r));}

function lancerRF() {
  const btn = document.getElementById('btn-rf');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spin">⟳</span> Analyse en cours…';
  setTimeout(()=>{
    const s = {
      ph:   parseFloat(document.getElementById('s-ph').value)/10,
      hs:   parseFloat(document.getElementById('s-hs').value),
      n:    parseFloat(document.getElementById('s-n').value),
      temp: parseFloat(document.getElementById('s-temp').value),
      rain: parseFloat(document.getElementById('s-rain').value),
      hair: parseFloat(document.getElementById('s-hair').value),
      p:    parseFloat(document.getElementById('s-p').value),
      k:    parseFloat(document.getElementById('s-k').value),
    };
    const CULTURES = getCultures(); const N=100, votes=new Array(CULTURES.length).fill(0);
    for(let t=0;t<N;t++){
      const n=()=>1+(Math.random()-.5)*.28;
      const sc=CULTURES.map(c=>
        sval(s.ph,c.cond.ph)*3.5*n()+sval(s.hs,c.cond.hs)*3*n()+
        sval(s.n,c.cond.n)*2*n()+sval(s.temp,c.cond.temp)*2.2*n()+
        sval(s.rain,c.cond.rain)*2.5*n()+Math.random()*.12
      );
      votes[sc.indexOf(Math.max(...sc))]++;
    }
    const sorted=CULTURES.map((c,i)=>({c,v:votes[i]})).sort((a,b)=>b.v-a.v);
    const best=sorted[0], conf=Math.round(best.v/N*100);

    // Result
    document.getElementById('rf-result-body').innerHTML = `
      <div class="pred-result-big">
        <div class="pred-emoji-big">${best.c.emoji}</div>
        <div class="pred-name" style="color:${best.c.c}">${best.c.nom}</div>
        <div style="font-size:13px;color:var(--slate);margin-bottom:12px;">${best.v} arbres sur 100 ont voté pour cette culture</div>
        <div class="pred-conf-wrap">
          <div class="pred-conf-label"><span>Confiance du modèle</span><strong>${conf}%</strong></div>
          <div class="conf-track"><div class="conf-fill" id="conf-fill-rf"></div></div>
          <div style="font-size:12px;font-weight:700;margin-top:8px;color:${conf>=75?'var(--green)':conf>=55?'var(--amber)':'var(--red)'}">
            ${conf>=75?'✅ Très fiable':conf>=55?'🟡 Fiable':'⚠️ Vérifier capteurs'}
          </div>
        </div>
      </div>`;
    setTimeout(()=>document.getElementById('conf-fill-rf').style.width=conf+'%',100);

    // Votes
    ['rf-votes-card','rf-fi-card','rf-conseils-card'].forEach(id=>document.getElementById(id).style.display='block');
    document.getElementById('rf-votes-body').innerHTML = sorted.filter(x=>x.v>0).map(({c,v})=>`
      <div class="vote-item">
        <div class="vi-label"><span>${c.emoji}</span>${c.nom}</div>
        <div class="vi-track"><div class="vi-fill" style="background:${c.c};width:0%" data-w="${v}"></div></div>
        <div class="vi-num">${v}</div>
      </div>`).join('');

    // FI
    const FI=[
      {l:'🧪 pH Sol',v:28,col:'#16a34a'},{l:'💧 H. Sol',v:22,col:'#0284c7'},
      {l:'🌧️ Pluie',v:18,col:'#0ea5e9'},{l:'🌡️ Temp.',v:14,col:'#d97706'},
      {l:'💨 Air',v:8,col:'#8b5cf6'},{l:'🌿 Azote',v:6,col:'#22c55e'},
      {l:'⚗️ Phosphore',v:3,col:'#dc2626'},{l:'🔬 Potassium',v:1,col:'#78716c'},
    ];
    document.getElementById('rf-fi-body').innerHTML = FI.map(f=>`
      <div class="fi-item">
        <div class="fi-label">${f.l}</div>
        <div class="fi-track"><div class="fi-fill" style="background:${f.col};width:0%" data-w="${f.v}"></div></div>
        <div class="fi-pct">${f.v}%</div>
      </div>`).join('');

    // Conseils
    const cons=[];
    cons.push({t:'ok', ico:best.c.emoji, tag:'RECOMMANDATION', h:`Plantez : ${best.c.nom}`, p:`C'est la culture la plus adaptée à vos conditions de terrain actuelles.`});
    if(s.ph<5.5) cons.push({t:'crit',ico:'🧪',tag:'URGENT',h:'Sol trop acide',p:'Ajoutez 400–800 kg/ha de chaux agricole pour corriger le pH.'});
    else if(s.ph>7.5) cons.push({t:'warn',ico:'🧪',tag:'ATTENTION',h:'Sol alcalin',p:'Ajoutez du soufre agricole pour baisser le pH progressivement.'});
    if(s.hs<25) cons.push({t:'crit',ico:'💧',tag:'URGENT',h:'Irrigation immédiate !',p:`Humidité sol ${s.hs}% — Arrosez 20–30mm dans les 12 prochaines heures.`});
    if(s.n<40) cons.push({t:'warn',ico:'🌿',tag:'FERTILISATION',h:'Déficit en azote',p:'Apportez de l\'urée (46% N) : 80–120 kg/ha en deux applications.'});
    if(s.temp>38) cons.push({t:'crit',ico:'🌡️',tag:'STRESS THERMIQUE',h:'Chaleur excessive',p:'Augmentez l\'irrigation et installez des filets d\'ombrage.'});
    document.getElementById('rf-conseils-body').innerHTML = cons.map((c,i)=>`
      <div class="conseil ${c.t}" style="animation-delay:${i*.1}s">
        <div class="conseil-ico">${c.ico}</div>
        <div><div class="conseil-tag">${c.tag}</div><h4>${c.h}</h4><p>${c.p}</p></div>
      </div>`).join('');

    setTimeout(()=>document.querySelectorAll('[data-w]').forEach(el=>el.style.width=el.dataset.w+'%'),200);
    btn.disabled=false;
    btn.innerHTML='🔄 Relancer l\'Analyse';
    showNotif(`🌲 ${best.c.nom} recommandé — ${conf}% confiance`);

    // ── Sauvegarder la prédiction dans MySQL
    apiCall('rf_save','POST',{
      culture: best.c.nom,
      emoji:   best.c.emoji,
      confiance: conf,
      ph:            parseFloat(document.getElementById('s-ph').value)/10,
      humidite_sol:  parseInt(document.getElementById('s-hs').value),
      azote:         parseInt(document.getElementById('s-n').value),
      temperature:   parseFloat(document.getElementById('s-temp').value),
      precipitations:parseInt(document.getElementById('s-rain').value),
      humidite_air:  parseInt(document.getElementById('s-hair').value),
      phosphore:     parseInt(document.getElementById('s-p').value),
      potassium:     parseInt(document.getElementById('s-k').value),
    }).then(d => {
      if(d.success) showNotif(`💾 Prédiction sauvegardée en MySQL`);
    });
  }, 900);
}
