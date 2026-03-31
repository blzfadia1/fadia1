/* ════════════════════════════════════════════════════════════════
   AgriSmart — 11 — SETTINGS — Mode Nuit & Langue
   Fichier : 11_settings.js
════════════════════════════════════════════════════════════════ */
"use strict";

/* ══════════════════════════════════════════════
   MODE NUIT
══════════════════════════════════════════════ */
let _darkMode = false;

function toggleDarkMode() {
  _darkMode = !_darkMode;
  document.documentElement.classList.toggle('dark', _darkMode);
  const btn = document.getElementById('btn-dark');
  if (btn) btn.textContent = _darkMode ? '☀️' : '🌙';
  try { localStorage.setItem('agrismart_dark', _darkMode ? '1' : '0'); } catch(e) {}
}

(function() {
  try {
    if (localStorage.getItem('agrismart_dark') === '1') {
      _darkMode = true;
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();

/* ══════════════════════════════════════════════
   DICTIONNAIRE
══════════════════════════════════════════════ */
const LANG = {
  fr: {
    loginTitle:'Plateforme Intelligente d\'Agriculture de Précision',
    loginIdentifiant:'Identifiant', loginPassword:'Mot de passe',
    loginPlaceholder:'Entrez votre identifiant', loginBtn:'🔐 Se connecter',
    tabAdmin:'👑 Admin', tabAgri:'🌾 Agriculteur', tabTech:'🔧 Technicien',
    sidebarReduce:'Réduire', sidebarLogout:'Déconnexion',
    topbarLive:'Capteurs en direct',
    cardSensors:'Capteurs ESP32 — Données en Direct',
    cardAlerts:'Alertes Actives',
    cardLSTMDash:'Prévision LSTM — Humidité Sol (7j)',
    cardLoRa:'Réseau LoRaWAN',
    cardArch:'Architecture IA du Système — Comment ça marche ?',
    cardTerrain:'Données de Votre Terrain', cardReco:'Recommandation',
    cardVotes:'Votes des 100 Arbres', cardImportance:'Importance Capteurs',
    cardConseils:'Conseils Personnalisés',
    rfBtn:'🌲 Lancer l\'Analyse (100 Arbres)',
    rfDesc:'Ajustez les valeurs selon vos capteurs ESP32. L\'algorithme <strong>Random Forest</strong> (100 arbres) analysera votre terrain.',
    cardLSTMBig:'Prévision Humidité Sol — 7 Jours',
    cardLSTMTemp:'Prévision Température — 7 Jours',
    cardLSTMHow:'Comment fonctionne le LSTM ?',
    cardSensorMap:'Carte des Capteurs Terrain',
    cardLoRaArch:'Architecture LoRaWAN — De la Plante au Cloud',
    cardESP32:'Configuration des Nœuds ESP32',
    cardHistorique:'Historique des Mesures', cardTimeline:'Activité Récente',
    cardUsers:'Gestion des Utilisateurs', cardJournal:'Journal Système',
    confirmDelete:'Supprimer cet utilisateur ?',
    cardGuide:'Guide d\'Utilisation — Pour Tout le Monde',
    mPrenom:'Prénom', mNom:'Nom', mLogin:'Identifiant de connexion',
    mPass:'Mot de passe', mRole:'Rôle', mZone:'Zone / Exploitation',
    mTel:'Téléphone', mStatut:'Statut',
  },
  ar: {
    loginTitle:'منصة الزراعة الذكية والدقيقة',
    loginIdentifiant:'المعرّف', loginPassword:'كلمة المرور',
    loginPlaceholder:'أدخل معرّفك', loginBtn:'🔐 تسجيل الدخول',
    tabAdmin:'👑 مدير', tabAgri:'🌾 مزارع', tabTech:'🔧 تقني',
    sidebarReduce:'طي القائمة', sidebarLogout:'تسجيل الخروج',
    topbarLive:'المستشعرات مباشرة',
    cardSensors:'مستشعرات ESP32 — بيانات مباشرة',
    cardAlerts:'التنبيهات النشطة',
    cardLSTMDash:'توقع LSTM — رطوبة التربة (7 أيام)',
    cardLoRa:'شبكة LoRaWAN',
    cardArch:'بنية نظام الذكاء الاصطناعي — كيف يعمل؟',
    cardTerrain:'بيانات أرضك', cardReco:'التوصية',
    cardVotes:'أصوات 100 شجرة', cardImportance:'أهمية المستشعرات',
    cardConseils:'نصائح مخصصة',
    rfBtn:'🌲 تشغيل التحليل (100 شجرة)',
    rfDesc:'اضبط القيم حسب مستشعرات ESP32. ستحلل خوارزمية <strong>الغابة العشوائية</strong> (100 شجرة) أرضك.',
    cardLSTMBig:'توقع رطوبة التربة — 7 أيام',
    cardLSTMTemp:'توقع درجة الحرارة — 7 أيام',
    cardLSTMHow:'كيف يعمل LSTM؟',
    cardSensorMap:'خريطة المستشعرات',
    cardLoRaArch:'بنية LoRaWAN — من النبتة إلى السحابة',
    cardESP32:'إعداد عقد ESP32',
    cardHistorique:'سجل القياسات', cardTimeline:'النشاط الأخير',
    cardUsers:'إدارة المستخدمين', cardJournal:'سجل النظام',
    confirmDelete:'حذف هذا المستخدم؟',
    cardGuide:'دليل الاستخدام — للجميع',
    mPrenom:'الاسم الأول', mNom:'اللقب', mLogin:'معرّف الدخول',
    mPass:'كلمة المرور', mRole:'الدور', mZone:'المنطقة / المزرعة',
    mTel:'الهاتف', mStatut:'الحالة',
  },
  en: {
    loginTitle:'Intelligent Precision Agriculture Platform',
    loginIdentifiant:'Username', loginPassword:'Password',
    loginPlaceholder:'Enter your username', loginBtn:'🔐 Sign In',
    tabAdmin:'👑 Admin', tabAgri:'🌾 Farmer', tabTech:'🔧 Technician',
    sidebarReduce:'Collapse', sidebarLogout:'Sign Out',
    topbarLive:'Live sensors',
    cardSensors:'ESP32 Sensors — Live Data',
    cardAlerts:'Active Alerts',
    cardLSTMDash:'LSTM Forecast — Soil Moisture (7d)',
    cardLoRa:'LoRaWAN Network',
    cardArch:'AI System Architecture — How it works?',
    cardTerrain:'Your Field Data', cardReco:'Recommendation',
    cardVotes:'100 Trees Votes', cardImportance:'Sensor Importance',
    cardConseils:'Personalized Advice',
    rfBtn:'🌲 Run Analysis (100 Trees)',
    rfDesc:'Adjust values from your ESP32 sensors. The <strong>Random Forest</strong> algorithm (100 trees) will analyze your field.',
    cardLSTMBig:'Soil Moisture Forecast — 7 Days',
    cardLSTMTemp:'Temperature Forecast — 7 Days',
    cardLSTMHow:'How does LSTM work?',
    cardSensorMap:'Field Sensor Map',
    cardLoRaArch:'LoRaWAN Architecture — From Plant to Cloud',
    cardESP32:'ESP32 Node Configuration',
    cardHistorique:'Measurement History', cardTimeline:'Recent Activity',
    cardUsers:'User Management', cardJournal:'System Log',
    confirmDelete:'Delete this user?',
    cardGuide:'User Guide — For Everyone',
    mPrenom:'First Name', mNom:'Last Name', mLogin:'Login ID',
    mPass:'Password', mRole:'Role', mZone:'Zone / Farm',
    mTel:'Phone', mStatut:'Status',
  },
};

/* ══════════════════════════════════════════════
   LANGUE ACTIVE
══════════════════════════════════════════════ */
let _lang = 'fr';

function T(k) { return (LANG[_lang]||LANG.fr)[k] || LANG.fr[k] || k; }

/* ─ Remplace un <h3> dans .card-header par correspondance de texte ─ */
function _h3(oldTxt, newTxt) {
  document.querySelectorAll('.card-header h3').forEach(h => {
    if (h.textContent.trim() === oldTxt.trim()) h.textContent = newTxt;
  });
}

/* ─ Traduit le label d'un champ modal par son input id ─ */
function _mLabel(inputId, text) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const lbl = inp.closest('.m-field')?.querySelector('label');
  if (lbl) lbl.textContent = text;
}

function applyLang() {
  /* LOGIN */
  const lp = document.querySelector('.login-logo p');
  if (lp) lp.textContent = T('loginTitle');

  document.querySelectorAll('.inp-group').forEach(g => {
    const lbl = g.querySelector('label');
    const inp = g.querySelector('input');
    if (!lbl || !inp) return;
    if (inp.id === 'login-user') { lbl.textContent = T('loginIdentifiant'); inp.placeholder = T('loginPlaceholder'); }
    if (inp.id === 'login-pass') { lbl.textContent = T('loginPassword'); }
  });

  const lb = document.querySelector('.btn-login');
  if (lb) lb.textContent = T('loginBtn');

  const tabs = document.querySelectorAll('.role-tab');
  if (tabs[0]) tabs[0].textContent = T('tabAdmin');
  if (tabs[1]) tabs[1].textContent = T('tabAgri');
  if (tabs[2]) tabs[2].textContent = T('tabTech');

  /* SIDEBAR */
  const cnl = document.querySelector('.btn-collapse .nl');
  if (cnl) cnl.textContent = T('sidebarReduce');
  const lnl = document.querySelector('.btn-logout .nl');
  if (lnl) lnl.textContent = T('sidebarLogout');

  /* TOPBAR */
  const tls = document.querySelector('.topbar-badge span');
  if (tls) tls.textContent = T('topbarLive');

  /* TOUTES LES CARTES — on traduit depuis toutes les langues possibles */
  const allCards = [
    ['cardSensors',   ['Capteurs ESP32 — Données en Direct','ESP32 Sensors — Live Data','مستشعرات ESP32 — بيانات مباشرة']],
    ['cardAlerts',    ['Alertes Actives','Active Alerts','التنبيهات النشطة']],
    ['cardLSTMDash',  ['Prévision LSTM — Humidité Sol (7j)','LSTM Forecast — Soil Moisture (7d)','توقع LSTM — رطوبة التربة (7 أيام)']],
    ['cardLoRa',      ['Réseau LoRaWAN','LoRaWAN Network','شبكة LoRaWAN']],
    ['cardArch',      ['Architecture IA du Système — Comment ça marche ?','AI System Architecture — How it works?','بنية نظام الذكاء الاصطناعي — كيف يعمل؟']],
    ['cardTerrain',   ['Données de Votre Terrain','Your Field Data','بيانات أرضك']],
    ['cardReco',      ['Recommandation','Recommendation','التوصية']],
    ['cardVotes',     ['Votes des 100 Arbres','100 Trees Votes','أصوات 100 شجرة']],
    ['cardImportance',['Importance Capteurs','Sensor Importance','أهمية المستشعرات']],
    ['cardConseils',  ['Conseils Personnalisés','Personalized Advice','نصائح مخصصة']],
    ['cardLSTMBig',   ['Prévision Humidité Sol — 7 Jours','Soil Moisture Forecast — 7 Days','توقع رطوبة التربة — 7 أيام']],
    ['cardLSTMTemp',  ['Prévision Température — 7 Jours','Temperature Forecast — 7 Days','توقع درجة الحرارة — 7 أيام']],
    ['cardLSTMHow',   ['Comment fonctionne le LSTM ?','How does LSTM work?','كيف يعمل LSTM؟']],
    ['cardSensorMap', ['Carte des Capteurs Terrain','Field Sensor Map','خريطة المستشعرات']],
    ['cardLoRaArch',  ['Architecture LoRaWAN — De la Plante au Cloud','LoRaWAN Architecture — From Plant to Cloud','بنية LoRaWAN — من النبتة إلى السحابة']],
    ['cardESP32',     ['Configuration des Nœuds ESP32','ESP32 Node Configuration','إعداد عقد ESP32']],
    ['cardHistorique',['Historique des Mesures','Measurement History','سجل القياسات']],
    ['cardTimeline',  ['Activité Récente','Recent Activity','النشاط الأخير']],
    ['cardUsers',     ['Gestion des Utilisateurs','User Management','إدارة المستخدمين']],
    ['cardJournal',   ['Journal Système','System Log','سجل النظام']],
    ['cardGuide',     ['Guide d\'Utilisation — Pour Tout le Monde','User Guide — For Everyone','دليل الاستخدام — للجميع']],
  ];

  document.querySelectorAll('.card-header h3').forEach(h3 => {
    const current = h3.textContent.trim();
    for (const [key, variants] of allCards) {
      if (variants.includes(current)) {
        h3.textContent = T(key);
        break;
      }
    }
  });

  /* Confirm modal h3 */
  const ch3 = document.querySelector('.confirm-box h3');
  if (ch3) ch3.textContent = T('confirmDelete');

  /* Bouton RF */
  const rfBtn = document.getElementById('btn-rf');
  if (rfBtn) rfBtn.innerHTML = T('rfBtn');

  /* Description RF */
  const rfDescEl = document.querySelector('#page-rf .card-body > p');
  if (rfDescEl) rfDescEl.innerHTML = T('rfDesc');

  /* Modal labels */
  _mLabel('m-prenom', T('mPrenom'));
  _mLabel('m-nom',    T('mNom'));
  _mLabel('m-pass',   T('mPass'));
  _mLabel('m-role',   T('mRole'));
  _mLabel('m-zone',   T('mZone'));
  _mLabel('m-tel',    T('mTel'));
  _mLabel('m-status', T('mStatut'));

  /* Label login modal (pas d'id direct, cherche par texte) */
  document.querySelectorAll('.modal-body .m-field label').forEach(lbl => {
    const t = lbl.textContent.trim();
    if (['Identifiant de connexion','Login ID','معرّف الدخول'].includes(t))
      lbl.textContent = T('mLogin');
  });

  /* RTL */
  document.documentElement.dir  = _lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = _lang;

  /* Synchro select topbar */
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = _lang;
}

/* ══════════════════════════════════════════════
   API PUBLIQUE
══════════════════════════════════════════════ */
function setLang(lang) {
  if (!LANG[lang]) return;
  _lang = lang;
  try { localStorage.setItem('agrismart_lang', lang); } catch(e) {}
  applyLang();
  /* Sync boutons login */
  document.querySelectorAll('.login-lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
(function() {
  try {
    const s = localStorage.getItem('agrismart_lang');
    if (s && LANG[s]) _lang = s;
  } catch(e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLang);
  } else {
    applyLang();
  }
})();
