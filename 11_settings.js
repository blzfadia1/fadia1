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
    // Capteurs
    sTemp:'Température', sHumSol:'Humidité Sol', sPh:'pH du Sol',
    sAzote:'Azote (N)', sPhosphore:'Phosphore (P)', sHumAir:'Humidité Air',
    sLum:'Luminosité', sCo2:'CO₂',
    // Statuts capteurs
    stNormal:'Normal', stBon:'Bon', stSurveiller:'Surveiller',
    stCritique:'Critique', stNeutre:'Neutre', stAcide:'Acide',
    stSuffisant:'Suffisant', stOk:'OK', stHorsLigne:'hors-ligne',
    // Cultures RF
    cRiz:'Riz', cBle:'Blé', cMais:'Maïs', cCoton:'Coton',
    cPoisChiche:'Pois chiche', cCafe:'Café', cTournesol:'Tournesol',
    cTomate:'Tomate', cSoja:'Soja', cPomme:'Pomme de terre',
    cMangue:'Mangue', cRaisin:'Raisin',
    // RF sliders
    rfPh:'🧪 pH du Sol', rfHumSol:'💧 Humidité Sol', rfAzote:'🌿 Azote (N)',
    rfTemp:'🌡️ Température', rfPluie:'🌧️ Précipitations',
    rfHumAir:'💨 Humidité Air', rfPhosphore:'⚗️ Phosphore (P)', rfPotassium:'🔬 Potassium (K)',
    rfHint_ph:'3.0 Acide,6.5 Neutre,9.0 Alcalin',
    rfHint_hs:'0% Sec,50%,100% Noyé',
    rfHint_n:'0,70,140', rfHint_temp:'8°C,27°C,45°C',
    rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
    rfHint_p:'0,72,145', rfHint_k:'0,100,205',
    // Chat
    chatTitle:'Assistant AgriSmart', chatSub:'IA · Disponible 24h/24',
    // Notifs
    notifWelcome:'✅ Bienvenue',
    notifLogout:'👋 Déconnecté avec succès',
    notifOffline:'⚠️ Mode hors-ligne (XAMPP non lancé)',
    // Sidebar user
    roleAdmin:'ADMIN', roleAgri:'AGRICULTEUR', roleTech:'TECHNICIEN',
    // LSTM
    lstmTitle:'Prévision LSTM — Séries Temporelles',
    lstmSimTitle:'Simulateur LSTM — Prédiction du Rendement',
    lstmVraiRaison:'Vrai Raisonnement',
    lstmLancer:'🌾 Lancer la Prédiction LSTM',
    lstmRendement:'Rendement Prédit', lstmUnit:'tonnes / hectare',
    lstmBase:'Base saisonnière', lstmContrib:'Contrib. LSTM (h_t)', lstmDirect:'Effets directs',
    lstmGates:'Portes LSTM — valeurs en temps réel',
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
    // Capteurs
    sTemp:'درجة الحرارة', sHumSol:'رطوبة التربة', sPh:'حموضة التربة',
    sAzote:'النيتروجين (N)', sPhosphore:'الفسفور (P)', sHumAir:'رطوبة الهواء',
    sLum:'الإضاءة', sCo2:'ثاني أكسيد الكربون',
    // Statuts
    stNormal:'طبيعي', stBon:'جيد', stSurveiller:'مراقبة',
    stCritique:'حرج', stNeutre:'معتدل', stAcide:'حامضي',
    stSuffisant:'كافٍ', stOk:'موافق', stHorsLigne:'غير متصل',
    // Cultures RF
    cRiz:'أرز', cBle:'قمح', cMais:'ذرة', cCoton:'قطن',
    cPoisChiche:'حمص', cCafe:'قهوة', cTournesol:'عباد الشمس',
    cTomate:'طماطم', cSoja:'صويا', cPomme:'بطاطس',
    cMangue:'مانغو', cRaisin:'عنب',
    // RF sliders
    rfPh:'🧪 حموضة التربة', rfHumSol:'💧 رطوبة التربة', rfAzote:'🌿 النيتروجين (N)',
    rfTemp:'🌡️ درجة الحرارة', rfPluie:'🌧️ الأمطار',
    rfHumAir:'💨 رطوبة الهواء', rfPhosphore:'⚗️ الفسفور (P)', rfPotassium:'🔬 البوتاسيوم (K)',
    rfHint_ph:'3.0 حامضي,6.5 معتدل,9.0 قلوي',
    rfHint_hs:'0% جاف,50%,100% مشبع',
    rfHint_n:'0,70,140', rfHint_temp:'8°C,27°C,45°C',
    rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
    rfHint_p:'0,72,145', rfHint_k:'0,100,205',
    // Chat
    chatTitle:'مساعد AgriSmart', chatSub:'ذكاء اصطناعي · متاح 24/7',
    // Notifs
    notifWelcome:'✅ مرحباً', notifLogout:'👋 تم تسجيل الخروج',
    notifOffline:'⚠️ وضع بدون اتصال (XAMPP غير مشغل)',
    // Sidebar user
    roleAdmin:'مدير', roleAgri:'مزارع', roleTech:'تقني',
    // LSTM
    lstmTitle:'توقعات LSTM — السلاسل الزمنية',
    lstmSimTitle:'محاكي LSTM — التنبؤ بالمحصول',
    lstmVraiRaison:'حساب حقيقي',
    lstmLancer:'🌾 تشغيل توقع LSTM',
    lstmRendement:'المحصول المتوقع', lstmUnit:'طن / هكتار',
    lstmBase:'القاعدة الموسمية', lstmContrib:'مساهمة LSTM (h_t)', lstmDirect:'تأثيرات مباشرة',
    lstmGates:'بوابات LSTM — القيم الحية',
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
    // Capteurs
    sTemp:'Temperature', sHumSol:'Soil Moisture', sPh:'Soil pH',
    sAzote:'Nitrogen (N)', sPhosphore:'Phosphorus (P)', sHumAir:'Air Humidity',
    sLum:'Light', sCo2:'CO₂',
    // Statuts
    stNormal:'Normal', stBon:'Good', stSurveiller:'Monitor',
    stCritique:'Critical', stNeutre:'Neutral', stAcide:'Acid',
    stSuffisant:'Sufficient', stOk:'OK', stHorsLigne:'offline',
    // Cultures RF
    cRiz:'Rice', cBle:'Wheat', cMais:'Corn', cCoton:'Cotton',
    cPoisChiche:'Chickpea', cCafe:'Coffee', cTournesol:'Sunflower',
    cTomate:'Tomato', cSoja:'Soybean', cPomme:'Potato',
    cMangue:'Mango', cRaisin:'Grape',
    // RF sliders
    rfPh:'🧪 Soil pH', rfHumSol:'💧 Soil Moisture', rfAzote:'🌿 Nitrogen (N)',
    rfTemp:'🌡️ Temperature', rfPluie:'🌧️ Rainfall',
    rfHumAir:'💨 Air Humidity', rfPhosphore:'⚗️ Phosphorus (P)', rfPotassium:'🔬 Potassium (K)',
    rfHint_ph:'3.0 Acid,6.5 Neutral,9.0 Alkaline',
    rfHint_hs:'0% Dry,50%,100% Saturated',
    rfHint_n:'0,70,140', rfHint_temp:'8°C,27°C,45°C',
    rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
    rfHint_p:'0,72,145', rfHint_k:'0,100,205',
    // Chat
    chatTitle:'AgriSmart Assistant', chatSub:'AI · Available 24/7',
    // Notifs
    notifWelcome:'✅ Welcome', notifLogout:'👋 Logged out',
    notifOffline:'⚠️ Offline mode (XAMPP not running)',
    // Sidebar user
    roleAdmin:'ADMIN', roleAgri:'FARMER', roleTech:'TECHNICIAN',
    // LSTM
    lstmTitle:'LSTM Forecast — Time Series',
    lstmSimTitle:'LSTM Simulator — Yield Prediction',
    lstmVraiRaison:'Real Computation',
    lstmLancer:'🌾 Run LSTM Prediction',
    lstmRendement:'Predicted Yield', lstmUnit:'tons / hectare',
    lstmBase:'Seasonal base', lstmContrib:'LSTM contrib (h_t)', lstmDirect:'Direct effects',
    lstmGates:'LSTM Gates — live values',
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

  /* Chat header */
  ['chat-head-title', 'chat-head-sub'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id === 'chat-head-title' ? T('chatTitle') : T('chatSub');
  });
  const chatFab = document.getElementById('chat-fab');
  if (chatFab) chatFab.title = T('chatTitle');
  
  /* Boutons rapides du chat — mettre à jour le placeholder */
  const chatInp = document.getElementById('chat-input');
  if (chatInp) {
    const ph = {'fr':'Posez votre question…','ar':'اكتب سؤالك…','en':'Ask your question…'};
    chatInp.placeholder = ph[_lang] || ph.fr;
  }

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
