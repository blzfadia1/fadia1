/* ════════════════════════════════════════════════════════════════
   AgriSmart — 10 — CHAT & MYSQL — Chatbot et fonctions API MySQL
   CHAT_KB[], envoyerChat(), toggleChat(), loadAlertes(), loadNoeudsLoRa(), loadDashboardStats()
   Fichier : 10_chat_mysql.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   CHATBOT AGRISMART
═══════════════════════════════════════════════════════ */
let chatOpen = false;
let chatFirstOpen = true;

const CHAT_KB = [
  { keys:['random forest','rf','forêt','foret','arbres','arbre','culture','planter','recommand'],
    rep:`🌲 **Random Forest — Comment l'utiliser ?**\n\nAllez dans l'onglet **"Random Forest"** dans le menu.\n\n➊ Ajustez les **8 curseurs** avec les valeurs de vos capteurs terrain (pH, humidité, N/P/K, température, précipitations)\n➋ Cliquez sur **"Lancer l'Analyse"**\n➌ L'algorithme fait voter **100 arbres de décision**\n➍ Lisez la culture recommandée et les conseils\n\n✅ Une confiance > 75% = recommandation très fiable.` },
  { keys:['lstm','prévision','prevision','temporel','futur','météo','meteo','irrigation','irrigu'],
    rep:`📈 **LSTM — Prévision Temporelle**\n\nLe **LSTM** (Long Short-Term Memory) prédit les besoins futurs sur **7 jours** en analysant 30 jours de données passées.\n\n➊ Allez dans **"Prévision LSTM"**\n➋ La **ligne violette** = prédiction future\n➌ Si la barre du jour est sous le **seuil jaune** → irriguez ce jour-là\n➍ Le planning vous dit exactement quand arroser\n\n📉 Précision actuelle : **92.4%** — MAE : 0.023` },
  { keys:['lorawan','lora','esp32','capteur','iot','signal','rssi','nœud','noeud','gateway'],
    rep:`📡 **LoRaWAN & ESP32**\n\nL'architecture IoT fonctionne en 4 étapes :\n\n📟 **ESP32** → collecte pH, T°, humidité, NPK toutes les 10s\n📡 **LoRaWAN 868MHz** → transmet jusqu'à 15 km, très faible consommation\n☁️ **Serveur TTN/MQTT** → reçoit et stocke les données\n🧠 **IA (RF + LSTM)** → analyse et recommande\n\n⚡ Autonomie batterie : **287 jours** par nœud\nSi signal faible : augmentez le Spreading Factor (SF7→SF12)` },
  { keys:['acide','alcalin','ph','chaux','sol','terre','fertilisant','engrais','azote','phosphore','potassium'],
    rep:`🧪 **Problème de Sol — Que faire ?**\n\n**Sol trop acide (pH < 5.5) :**\n→ Ajoutez **500–1000 kg/ha de chaux agricole (CaCO₃)**\n\n**Sol trop alcalin (pH > 7.5) :**\n→ Ajoutez du **soufre élémentaire (50 kg/ha)**\n\n**Manque d'azote (N < 40 kg/ha) :**\n→ Épandez de l'**urée (46% N) : 80–120 kg/ha**\n\n**Manque de phosphore :**\n→ Utilisez du **superphosphate triple**\n\nPH optimal pour la plupart des cultures : **6.0 – 7.0**` },
  { keys:['humidité','humidite','eau','sec','irrigat','arros','goutte'],
    rep:`💧 **Gestion de l'Eau & Irrigation**\n\n🔴 **Sol < 20% humidité** → Irrigation urgente dans les 12h\n🟡 **Sol 20–35%** → Arrosez dans les 24–48h\n✅ **Sol 35–70%** → Bon niveau, maintenez\n🌊 **Sol > 85%** → Trop humide, risque d'asphyxie racinaire\n\nLe **LSTM prédit** à 7 jours pour planifier vos irrigations à l'avance.\n\nConseil : le **goutte-à-goutte** économise 40% d'eau vs aspersion classique.` },
  { keys:['ajouter','supprimer','modifier','utilisateur','compte','admin','gestion'],
    rep:`👥 **Gestion des Utilisateurs (Admin uniquement)**\n\nAllez dans **"Administration"** dans le menu :\n\n➊ **Ajouter** un utilisateur → bouton vert **"➕ Ajouter"**\n➋ **Modifier** → cliquez sur ✏️ à droite de l'utilisateur\n➌ **Supprimer** → cliquez sur 🗑 (confirmation demandée)\n➍ **Filtrer** par rôle : Agriculteur / Technicien / Admin\n➎ **Rechercher** par nom ou identifiant\n\nLes rôles disponibles : 🌾 Agriculteur, 🔧 Technicien, 👑 Admin` },
  { keys:['batterie','énergie','energie','autonomie','consomm'],
    rep:`⚡ **Autonomie & Énergie des Capteurs**\n\nChaque nœud ESP32 avec batterie LiPo 3000mAh dure **287 jours** grâce au mode veille profonde LoRa.\n\n🔋 **Batterie < 20%** → alerte orange dans le dashboard\n🔋 **Batterie < 10%** → alerte rouge, remplacement urgent\n\n💡 **Conseils :**\n• Aumentez l'intervalle d'envoi (10s → 30s) pour économiser\n• Utilisez SF plus bas (SF7) si couverture suffisante\n• Panneaux solaires 5W recommandés pour les zones exposées` },
  { keys:['précision','precision','performance','modèle','model','résultat','résultats'],
    rep:`📊 **Performance des Modèles IA**\n\n| Modèle | Précision | Métrique |\n|--------|-----------|---------|\n| 🌲 Random Forest | **98.0%** | Accuracy |\n| 📈 LSTM | **92.4%** | Accuracy |\n| 🤖 Fusion RF+LSTM | **98.0%** | F1-score |\n\nLe RF utilise **100 arbres** avec 8 features capteurs.\nLe LSTM analyse **30 jours** de séquences temporelles.\n\nMise à jour automatique du modèle chaque mois.` },
  { keys:['alerte','urgent','critique','problème','probleme','erreur','panne'],
    rep:`🔔 **Gestion des Alertes**\n\n🔴 **Rouge = URGENT** → action dans les 12h\n🟡 **Orange = Attention** → surveillance dans les 48h\n🔵 **Bleu = Information** → pas d'action requise\n✅ **Vert = Tout va bien** → conditions optimales\n\nLes alertes apparaissent dans :\n• Le **Tableau de Bord** (section alertes actives)\n• La barre de **notification** en haut\n• Votre **email/SMS** si configuré\n\nEn cas d'alerte rouge non résolue après 2h → escalade automatique à l'admin.` },
  { keys:['bienvenu','bonjour','salut','hello','aide','help','quoi','comment','utiliser','début','debut'],
    rep:`🌿 **Bienvenue sur AgriSmart !**\n\nJe suis votre assistant intelligent. Voici ce que je peux vous expliquer :\n\n🌲 **Random Forest** → recommandation de culture\n📈 **LSTM** → prévisions d'irrigation sur 7 jours\n📡 **LoRaWAN / ESP32** → configuration des capteurs\n🧪 **Problèmes de sol** → pH, fertilisation, irrigation\n👥 **Administration** → gestion des utilisateurs\n📊 **Performances** → précision des modèles IA\n\nPosez votre question ou cliquez sur un sujet rapide ci-dessous !` },
];

function trouverReponse(question) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const entry of CHAT_KB) {
    if (entry.keys.some(k => q.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))) {
      return entry.rep;
    }
  }
  return `🤔 Je n'ai pas trouvé de réponse précise à votre question.\n\nVoici ce que je sais expliquer :\n• 🌲 Random Forest & recommandations\n• 📈 LSTM & prévisions\n• 📡 LoRaWAN & ESP32\n• 🧪 Problèmes de sol\n• 👥 Gestion des utilisateurs\n• ⚡ Autonomie des capteurs\n\nReformez votre question ou utilisez les boutons rapides ci-dessous.`;
}

function formatMsg(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>')
    .replace(/`([^`]+)`/g,'<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px;">$1</code>');
}

function ajouterMessage(role, text, typing=false) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role==='user'?'user':'bot');

  if (typing) {
    div.id = 'chat-typing-bubble';
    div.innerHTML = `
      <div class="chat-ava">🌿</div>
      <div class="chat-typing"><span></span><span></span><span></span></div>`;
  } else {
    const ava = role==='user'
      ? `<div class="chat-ava" style="background:var(--green);color:#fff;">${(CURRENT_USER||{}).avatar||'U'}</div>`
      : `<div class="chat-ava">🌿</div>`;
    div.innerHTML = (role==='bot'?ava:'') +
      `<div class="chat-bubble">${formatMsg(text)}</div>` +
      (role==='user'?ava:'');
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function envoyerChat() {
  const inp = document.getElementById('chat-input');
  const q   = inp.value.trim();
  if (!q) return;
  inp.value = '';
  inp.style.height = 'auto';

  document.getElementById('chat-send').disabled = true;
  document.getElementById('chat-quick').style.display = 'none';

  ajouterMessage('user', q);

  // Show typing indicator
  const tyBubble = ajouterMessage('bot', '', true);

  await new Promise(r => setTimeout(r, 900 + Math.random()*600));

  tyBubble.remove();
  const rep = trouverReponse(q);
  ajouterMessage('bot', rep);

  document.getElementById('chat-send').disabled = false;
  inp.focus();
}

function envoyerQuestion(q) {
  document.getElementById('chat-input').value = q;
  envoyerChat();
}

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chat-window');
  const fab = document.getElementById('chat-fab-ico');
  const badge = document.getElementById('chat-badge');

  if (chatOpen) {
    win.classList.add('open');
    fab.textContent = '✕';
    badge.style.display = 'none';
    if (chatFirstOpen) {
      chatFirstOpen = false;
      setTimeout(()=>ajouterMessage('bot',
        `🌿 Bonjour **${(CURRENT_USER||{}).prenom||''}** ! Je suis l'assistant AgriSmart.\n\nPosez-moi n'importe quelle question sur l'utilisation de la plateforme, les capteurs IoT, les algorithmes IA ou vos cultures. Je suis là pour vous aider ! 🌾`
      ), 400);
    }
    setTimeout(()=>document.getElementById('chat-input').focus(), 300);
  } else {
    win.classList.remove('open');
    fab.textContent = '🤖';
  }
}

// Show notification badge after 3 sec if not opened
setTimeout(()=>{
  if (!chatOpen && document.getElementById('chat-badge')) {
    document.getElementById('chat-badge').style.display='flex';
  }
}, 3000);


/* ═══════════════════════════════════════════════════════
   FONCTIONS MySQL — Alertes, Nœuds, Stats
═══════════════════════════════════════════════════════ */

// Charger et afficher les alertes depuis MySQL
async function loadAlertes() {
  const el = document.getElementById('alerts-body');
  if (!el) return;
  const d = await apiCall('alertes&lue=0');
  const icons = {crit:'🔴', warn:'🟡', info:'🔵', ok:'🟢'};
  if (d.success && d.alertes.length > 0) {
    el.innerHTML = d.alertes.slice(0,5).map(a=>`
      <div class="alert-item ${a.type}" style="cursor:pointer;" onclick="marquerAlerteLue(${a.id},this)">
        <div class="alert-icon">${icons[a.type]||'🔵'}</div>
        <div class="alert-body">
          <h4>${a.titre}</h4>
          <p>${a.description||''}</p>
          <div class="alert-time">${a.time_label}</div>
        </div>
        <span style="font-size:10px;color:#94a3b8;margin-left:auto;flex-shrink:0;">✓ Lu</span>
      </div>`).join('');
    // Mettre à jour badge nav
    if(d.non_lues > 0) {
      document.querySelectorAll('.nav-badge').forEach(b=>{ b.textContent=d.non_lues; b.style.display=''; });
    }
  } else {
    el.innerHTML = `<div class="alert-item ok"><div class="alert-icon">✅</div><div class="alert-body"><h4>Aucune alerte active</h4><p>Tous les capteurs fonctionnent normalement.</p></div></div>`;
  }
}

async function marquerAlerteLue(id, el) {
  const d = await apiCall('alerte_lue&id='+id,'POST');
  if (d.success) {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
    showNotif('✅ Alerte marquée comme lue');
  }
}

// Charger nœuds LoRa pour la sidebar dashboard
async function loadNoeudsLoRa() {
  const el = document.getElementById('lora-devices');
  if (!el) return;
  const d = await apiCall('noeuds');
  if (d.success && d.noeuds.length > 0) {
    el.innerHTML = d.noeuds.slice(0,3).map(n=>`
      <div class="device-row">
        <div class="device-dot dev-${n.statut}"></div>
        <div class="device-name">${n.node_id} — ${n.zone}</div>
        <div class="device-info">${n.rssi} · 🔋 ${n.batterie}%</div>
      </div>`).join('');
  }
}

// Charger les stats depuis MySQL et mettre à jour le dashboard
async function loadDashboardStats() {
  const d = await apiCall('stats');
  if (!d.success) return;
  // Mettre à jour "Capteurs actifs" dans les stat-cards
  const statCards = document.querySelectorAll('#stats-grid .stat-val');
  if (statCards[2]) statCards[2].textContent = d.noeuds_actifs+'/6';
  // Mettre à jour "Alertes" badge nav
  if (d.alertes_actives > 0) {
    document.querySelectorAll('.nav-badge').forEach(b=>b.textContent=d.alertes_actives);
  }
}

// Ajouter une alerte manuellement depuis la page admin
async function addAlertManual(type, titre, desc, nodeId='') {
  return await apiCall('alerte_add','POST',{type, titre, description: desc, node_id: nodeId});
}
