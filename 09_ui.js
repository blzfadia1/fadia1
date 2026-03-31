/* ════════════════════════════════════════════════════════════════
   AgriSmart — 09 — UI — Guide, Notifications, Navigation Mobile, Horloge
   buildGuidePage(), showNotif(), buildMobileNav(), updateMobileNav(), toggleMobileSidebar()
   Fichier : 09_ui.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   GUIDE PAGE
/* ═══════════════════════════════════════════════════════
   GUIDE PAGE
═══════════════════════════════════════════════════════ */
function buildGuidePage() {
  const guides = {
    admin: [
      { ico:'👑', bg:'#ede9fe', t:'Tableau de Bord',
        steps:['Voir tous les capteurs en temps réel sur la carte','Consulter les alertes actives (rouge = urgent, jaune = attention)','Vérifier le statut des 6 nœuds ESP32 dans la section LoRaWAN'] },
      { ico:'🌲', bg:'#f0fdf4', t:'Random Forest — Recommandation',
        steps:['Aller dans "Random Forest"','Ajuster les 8 curseurs selon les valeurs de vos capteurs terrain','Cliquer sur "Lancer l\'Analyse" — 100 arbres votent','Lire la culture recommandée et les conseils personnalisés'] },
      { ico:'📈', bg:'#ede9fe', t:'LSTM — Prévisions',
        steps:['Aller dans "Prévision LSTM"','Lire le graphique : ligne violette = prédit, grise = mesuré','Zone sous la ligne jaune = irrigation nécessaire','Consulter le planning d\'irrigation sur 7 jours'] },
      { ico:'👥', bg:'#f0fdf4', t:'Administration',
        steps:['Gérer les comptes utilisateurs (agriculteurs, techniciens)','Superviser toutes les exploitations','Consulter le journal système pour les erreurs'] },
    ],
    agriculteur: [
      { ico:'🌾', bg:'#f0fdf4', t:'Mon Tableau de Bord',
        steps:['Voir en direct : température, eau dans le sol, pH','Badge vert = tout va bien, orange = attention, rouge = urgent','Les alertes en haut à droite vous disent quoi faire'] },
      { ico:'🌲', bg:'#f0fdf4', t:'Quelle Culture Planter ?',
        steps:['Aller dans "Quelle Culture ?"','Bouger les 8 curseurs selon ce que vous observez sur votre terrain','Appuyer sur le bouton vert','Lire la recommandation et les conseils — ils sont simples et directs !'] },
      { ico:'🌧️', bg:'#e0f2fe', t:'Prévisions — Faut-il irriguer ?',
        steps:['Aller dans "Prévisions Météo"','Si la barre du jour est rouge → Irriguez !','Si la barre est verte → Pas besoin d\'arroser','Planifiez vos irrigations 7 jours à l\'avance'] },
    ],
    technicien: [
      { ico:'📡', bg:'#e0f2fe', t:'Gestion des Capteurs ESP32',
        steps:['Aller dans "Capteurs & LoRa"','Vérifier le signal RSSI de chaque nœud (idéal > -100 dBm)','Surveiller les batteries (< 20% = remplacement urgent)','Changer le Spreading Factor (SF) pour améliorer la portée'] },
      { ico:'🔗', bg:'#e0f2fe', t:'LoRaWAN — Dépannage',
        steps:['Si nœud hors ligne → vérifier l\'alimentation ESP32','Signal faible → augmenter SF (SF7→SF12) ou déplacer le nœud','Données manquantes → vérifier la connexion Gateway','Fréquence : 868 MHz (Europe), canaux 0 à 7'] },
      { ico:'🧠', bg:'#ede9fe', t:'Modèles IA — Maintenance',
        steps:['Vérifier la précision RF régulièrement (objectif > 95%)','LSTM : MAE < 0.05 = bon, > 0.1 = ré-entraîner','Ajouter de nouveaux échantillons au dataset chaque mois','Surveiller la dérive des données (data drift)'] },
    ],
  };

  const g = guides[state.role] || guides.admin;
  document.getElementById('guide-content').innerHTML = `
    <div style="background:var(--green-bg);border:1px solid var(--green-xl);border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:13px;font-weight:600;color:var(--green-d);">
      ✅ Ce guide est personnalisé pour votre rôle : <strong>${state.role.toUpperCase()}</strong>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
    ${g.map(s=>`
      <div style="background:${s.bg};border-radius:14px;padding:18px;border:1px solid var(--border);">
        <div style="font-size:28px;margin-bottom:8px;">${s.ico}</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">${s.t}</div>
        <ol style="padding-left:18px;">
          ${s.steps.map(st=>`<li style="font-size:13px;line-height:1.7;margin-bottom:4px;">${st}</li>`).join('')}
        </ol>
      </div>`).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════ */
function showNotif(msg) {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 3000);
}

/* ═══════════════════════════════════════════════════════
   MOBILE NAVIGATION
═══════════════════════════════════════════════════════ */
const MOB_NAV_ITEMS = {
  admin:       [{id:'dashboard',ico:'🏠',lbl:'Accueil'},{id:'rf',ico:'🌲',lbl:'RF'},{id:'lstm',ico:'📈',lbl:'LSTM'},{id:'iot',ico:'📡',lbl:'IoT'},{id:'admin',ico:'👑',lbl:'Admin'}],
  agriculteur: [{id:'dashboard',ico:'🏠',lbl:'Accueil'},{id:'rf',ico:'🌾',lbl:'Culture'},{id:'lstm',ico:'🌧️',lbl:'Météo'},{id:'history',ico:'📜',lbl:'Mesures'},{id:'guide',ico:'📖',lbl:'Guide'}],
  technicien:  [{id:'dashboard',ico:'🏠',lbl:'Accueil'},{id:'iot',ico:'📡',lbl:'Capteurs'},{id:'lstm',ico:'📈',lbl:'IA'},{id:'history',ico:'📜',lbl:'Données'},{id:'guide',ico:'📖',lbl:'Guide'}],
};

function buildMobileNav() {
  const items = MOB_NAV_ITEMS[state.role] || MOB_NAV_ITEMS.admin;
  const nav = document.getElementById('mobile-nav');
  nav.innerHTML = '<div class="mobile-nav-items">' +
    items.map(it=>`
      <button class="mob-nav-item" id="mob-${it.id}" onclick="navigateTo('${it.id}')">
        <span class="mni">${it.ico}</span>${it.lbl}
      </button>`).join('') +
    '</div>';
}

function updateMobileNav(id) {
  document.querySelectorAll('.mob-nav-item').forEach(b=>b.classList.remove('active'));
  const el = document.getElementById('mob-'+id);
  if(el) el.classList.add('active');
}

function toggleMobileSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  const open = sb.classList.contains('mob-open');
  if(open){
    sb.classList.remove('mob-open');
    ov.classList.remove('open');
  } else {
    sb.classList.add('mob-open');
    ov.classList.add('open');
  }
}

/* ═══════════════════════════════════════════════════════
   AUTO-INIT CLOCK
═══════════════════════════════════════════════════════ */
setInterval(() => {
  const t = document.getElementById('topbar-time');
  if (t) t.textContent = new Date().toLocaleTimeString('fr-FR');
}, 1000);
