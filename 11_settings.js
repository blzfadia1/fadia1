/* ════════════════════════════════════════════════════════════════
   AgriSmart — 11_settings.js — CORRIGE COMPLET
   Tous les textes codés en dur maintenant traduits (FR/AR/EN)
   Screenshots corrigés :
     - Stat cards dashboard (labels + trends)
     - Navigation sidebar + section labels
     - Architecture IA layers
     - IoT page (table headers, LoRa description, steps)
     - Historique table headers
     - Admin page (stats, table, filtres, boutons)
     - Modal labels complets
     - Conseils RF (tags, titres, textes)
     - Titre topbar par page
     - Badge rôle sidebar
════════════════════════════════════════════════════════════════ */
"use strict";

/* ══ MODE NUIT ══ */
let _darkMode = false;
function toggleDarkMode() {
  _darkMode = !_darkMode;
  document.documentElement.classList.toggle('dark', _darkMode);
  const btn = document.getElementById('btn-dark');
  if (btn) btn.textContent = _darkMode ? '☀️' : '🌙';
  try { localStorage.setItem('agrismart_dark', _darkMode ? '1' : '0'); } catch(e) {}
}
(function() {
  try { if (localStorage.getItem('agrismart_dark') === '1') { _darkMode = true; document.documentElement.classList.add('dark'); } } catch(e) {}
})();

/* ══ DICTIONNAIRE ══ */
const LANG = {

/* ─────────────────── FRANCAIS ─────────────────── */
fr: {
  /* Login */
  loginTitle:"Plateforme Intelligente d'Agriculture de Precision",
  loginIdentifiant:'Identifiant', loginPassword:'Mot de passe',
  loginPlaceholder:'Entrez votre identifiant', loginBtn:'Connecter',
  tabAdmin:'Admin', tabAgri:'Agriculteur', tabTech:'Technicien',

  /* Sidebar */
  sidebarReduce:'Reduire', sidebarLogout:'Deconnexion',
  roleAdmin:'ADMIN', roleAgri:'AGRICULTEUR', roleTech:'TECHNICIEN',

  /* Nav sections */
  navSecPrincipal:'Principal', navSecGestion:'Gestion',
  navSecTerrain:'Mon Terrain', navSecAide:'Aide',
  navSecSystemes:'Systemes', navSecDonnees:'Donnees',

  /* Nav items */
  navDashboard:'Tableau de Bord', navDashboardAgri:'Mon Tableau de Bord', navDashboardTech:'Vue Globale',
  navRF:'Random Forest', navRFAgri:'Quelle Culture ?', navRFTech:'Random Forest',
  navLSTM:'Prevision LSTM', navLSTMAgri:'Previsions Meteo', navLSTMTech:'Modeles IA',
  navIoT:'IoT / ESP32 / LoRa', navIoTTech:'Capteurs & LoRa',
  navHistory:'Historique', navHistoryAgri:'Mes Mesures', navHistoryTech:'Historique',
  navAdmin:'Administration',

  /* Topbar */
  topbarLive:'Capteurs en direct',
  pageDashboard:'Tableau de Bord',
  pageRF:'Random Forest — Recommandation Culture',
  pageLSTM:'Prevision LSTM — Series Temporelles',
  pageIoT:'IoT . ESP32 . LoRaWAN',
  pageHistory:'Historique des Donnees',
  pageAdmin:'Administration',

  /* Stat cards */
  statRFLabel:'Precision RF',      statRFTrend:'+ +0.3%',
  statLSTMLabel:'Precision LSTM',  statLSTMTrend:'+ +2.1%',
  statSensLabel:'Capteurs actifs', statSensTrend:'Tous OK',
  statBatLabel:'Autonomie batterie', statBatTrend:'- -3j',

  /* Cards */
  cardSensors:'Capteurs ESP32 — Donnees en Direct',
  cardAlerts:'Alertes Actives',
  cardLSTMDash:'Prevision LSTM — Humidite Sol (7j)',
  cardLoRa:'Reseau LoRaWAN',
  cardArch:"Architecture IA du Systeme — Comment ca marche ?",
  cardTerrain:'Donnees de Votre Terrain',
  cardReco:'Recommandation',
  cardVotes:'Votes des 100 Arbres',
  cardImportance:'Importance Capteurs',
  cardConseils:'Conseils Personnalises',
  cardLSTMBig:'Prevision Humidite Sol — 7 Jours',
  cardLSTMTemp:'Prevision Temperature — 7 Jours',
  cardLSTMHow:'Comment fonctionne le LSTM ?',
  cardSensorMap:'Carte des Capteurs Terrain',
  cardLoRaArch:'Architecture LoRaWAN — De la Plante au Cloud',
  cardESP32:'Configuration des Noeuds ESP32',
  cardHistorique:'Historique des Mesures',
  cardTimeline:'Activite Recente',
  cardUsers:'Gestion des Utilisateurs',
  cardJournal:'Journal Systeme',
  cardGuide:"Guide d'Utilisation — Pour Tout le Monde",

  /* Alertes */
  alertNone:'Aucune alerte active',
  alertNoneSub:'Tous les capteurs fonctionnent normalement.',

  /* Noeuds statut */
  nodeOnline:'En ligne', nodeWarn:'Batterie faible', nodeOffline:'Hors ligne',

  /* Architecture IA layers */
  archL1Title:'Couche Terrain — Capteurs IoT',
  archL1Desc:'ESP32 collecte T, pH, humidite, NPK toutes les 10 secondes.',
  archL2Title:'Couche Communication — LoRaWAN',
  archL2Desc:'Transmission longue portee (10km) via protocole LoRaWAN 868MHz.',
  archL3Title:'Couche Cloud — Stockage & Traitement',
  archL3Desc:'Firebase Realtime Database, calcul en temps reel, historique 30j.',
  archL4Title:'Couche IA — Random Forest',
  archL4Desc:'100 arbres de decision recommandent la culture optimale (98% precision).',
  archL5Title:'Couche IA — LSTM',
  archL5Desc:'Reseau LSTM predit les besoins en irrigation sur 7 jours (92% precision).',
  archL6Title:'Couche Interface — Dashboard',
  archL6Desc:'Interface web responsive pour agriculteurs, techniciens et admins.',

  /* IoT page */
  iotLoRaDesc:"Le LoRaWAN permet a vos capteurs ESP32 de transmettre des donnees sur 10-15 km avec une consommation ultra-faible.",
  iotS1Title:'1. ESP32 (Noeud)', iotS1Desc:'Collecte pH, T, humidite toutes les 10s. Encode les donnees en format compact (12 bytes). Envoie via LoRa SX1276.',
  iotS2Title:'2. Gateway LoRaWAN', iotS2Desc:'Recoit les trames LoRa sur 8 canaux simultanes. Decode et transmet via Ethernet/4G au serveur cloud.',
  iotS3Title:'3. Serveur reseau (TTN)', iotS3Desc:"The Things Network gere l'authentification, la deduplication, et route vers votre application.",
  iotS4Title:'4. Traitement IA', iotS4Desc:'Les donnees arrivent en JSON — Random Forest recommande la culture, LSTM predit les besoins futurs.',
  /* Table IoT */
  iotTblNoeud:'Noeud', iotTblZone:'Zone', iotTblRSSI:'RSSI', iotTblSF:'SF',
  iotTblBatterie:'Batterie', iotTblStatut:'Statut', iotTblAction:'Action',
  iotBtnMesure:'Mesure',

  /* Historique */
  histTblDate:'Date & Heure', histTblCapteur:'Capteur', histTblPH:'pH',
  histTblHumidite:'Humidite', histTblTemp:'Temp.', histTblAction:'Action',
  histLoading:'Chargement depuis MySQL...',

  /* Admin */
  adminStatTotal:'Utilisateurs total', adminStatAgri:'Agriculteurs',
  adminStatTech:'Techniciens', adminStatActifs:'Comptes actifs',
  adminTblNum:'#', adminTblNom:'Nom complet', adminTblLogin:'Login',
  adminTblRole:'Role', adminTblZone:'Zone', adminTblTel:'Telephone',
  adminTblStatut:'Statut', adminTblActions:'Actions', adminTblCreeLe:'Cree le',
  adminBtnAjouter:'Ajouter', adminSearchPlaceholder:'Rechercher...',
  adminFiltreAll:'Le tout', adminFiltreAdmins:'Admins',
  adminFiltreTech:'Techniciens', adminFiltreAgri:'Agriculteurs',
  modalAddTitle:'Ajouter un Utilisateur', modalEditTitle:'Modifier Utilisateur',
  modalBtnCreate:'Creer le compte', modalBtnSave:'Sauvegarder',
  modalBtnCancel:'Annuler', modalBtnDelete:'Supprimer',
  confirmDeleteTitle:'Supprimer cet utilisateur ?',
  confirmDeleteSub:'Cette action est irreversible.',
  statutActif:'Actif', statutInactif:'Inactif', statutSuspendu:'Suspendu',
  journalBtnVider:'Vider', journalLoading:'Chargement...',

  /* Modal labels */
  mPrenom:'Prenom', mNom:'Nom', mLogin:'Identifiant de connexion',
  mPass:'Mot de passe', mRole:'Role', mZone:'Zone / Exploitation',
  mTel:'Telephone', mStatut:'Statut',

  /* RF */
  rfBtn:'Lancer Analyse (100 Arbres)',
  rfDesc:"Ajustez les valeurs selon vos capteurs ESP32. L'algorithme Random Forest (100 arbres) analysera votre terrain.",
  rfArbreVote:'arbres sur 100 ont vote pour cette culture',
  rfConfiance:'Confiance du modele',
  rfTresFilable:'Tres fiable', rfFilable:'Fiable', rfVerifier:'Verifier capteurs',

  /* Conseils RF */
  consTagReco:'RECOMMANDATION', consTagUrgent:'URGENT',
  consTagAttn:'ATTENTION', consTagFertil:'FERTILISATION', consTagTherm:'STRESS THERMIQUE',
  consPlantez:'Plantez :',
  consAcideH:'Sol trop acide', consAcideP:'Ajoutez 400-800 kg/ha de chaux agricole pour corriger le pH.',
  consAlcalinH:'Sol alcalin', consAlcalinP:'Ajoutez du soufre agricole pour baisser le pH progressivement.',
  consIrrigH:'Irrigation immediate !', consIrrigP:'Arrosez 20-30mm dans les 12 prochaines heures.',
  consAzoteH:'Deficit en azote', consAzoteP:"Apportez de l'uree (46% N) : 80-120 kg/ha en deux applications.",
  consThermH:'Chaleur excessive', consThermP:"Augmentez l'irrigation et installez des filets d'ombrage.",
  consAdaptee:'Culture la plus adaptee a vos conditions de terrain actuelles.',

  /* Capteurs */
  sTemp:'Temperature', sHumSol:'Humidite Sol', sPh:'pH du Sol',
  sAzote:'Azote (N)', sPhosphore:'Phosphore (P)', sHumAir:'Humidite Air',
  sLum:'Luminosite', sCo2:'CO2',
  stNormal:'Normal', stBon:'Bon', stSurveiller:'Surveiller',
  stCritique:'Critique', stNeutre:'Neutre', stAcide:'Acide',
  stSuffisant:'Suffisant', stOk:'OK', stHorsLigne:'hors-ligne',

  /* Cultures */
  cRiz:'Riz', cBle:'Ble', cMais:'Mais', cCoton:'Coton',
  cPoisChiche:'Pois chiche', cCafe:'Cafe', cTournesol:'Tournesol',
  cTomate:'Tomate', cSoja:'Soja', cPomme:'Pomme de terre',
  cMangue:'Mangue', cRaisin:'Raisin',

  /* RF sliders */
  rfPh:'pH du Sol', rfHumSol:'Humidite Sol', rfAzote:'Azote (N)',
  rfTemp:'Temperature', rfPluie:'Precipitations',
  rfHumAir:'Humidite Air', rfPhosphore:'Phosphore (P)', rfPotassium:'Potassium (K)',
  rfHint_ph:'3.0 Acide,6.5 Neutre,9.0 Alcalin',
  rfHint_hs:'0% Sec,50%,100% Noye',
  rfHint_n:'0,70,140', rfHint_temp:'8C,27C,45C',
  rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
  rfHint_p:'0,72,145', rfHint_k:'0,100,205',

  /* Chat */
  chatTitle:'Assistant AgriSmart', chatSub:'IA . Disponible 24h/24',
  chatPlaceholder:'Posez votre question...',
  notifWelcome:'Bienvenue', notifLogout:'Deconnecte avec succes',
  notifOffline:'Mode hors-ligne (XAMPP non lance)',

  /* LSTM */
  lstmTitle:'Prevision LSTM — Series Temporelles',
  lstmSimTitle:'Simulateur LSTM — Prediction du Rendement',
  lstmVraiRaison:'Vrai Raisonnement',
  lstmLancer:'Lancer la Prediction LSTM',
  lstmRendement:'Rendement Predit', lstmUnit:'tonnes / hectare',
  lstmBase:'Base saisonniere', lstmContrib:'Contrib. LSTM (h_t)',
  lstmDirect:'Effets directs', lstmGates:'Portes LSTM — valeurs en temps reel',
  lstmAujourdHui:"Aujourd'hui",
},

/* ─────────────────── ARABE ─────────────────── */
ar: {
  /* Login */
  loginTitle:'منصة الزراعة الذكية والدقيقة',
  loginIdentifiant:'المعرّف', loginPassword:'كلمة المرور',
  loginPlaceholder:'أدخل معرّفك', loginBtn:'تسجيل الدخول',
  tabAdmin:'مدير', tabAgri:'مزارع', tabTech:'تقني',

  /* Sidebar */
  sidebarReduce:'طي القائمة', sidebarLogout:'تسجيل الخروج',
  roleAdmin:'مدير', roleAgri:'مزارع', roleTech:'تقني',

  /* Nav sections */
  navSecPrincipal:'الرئيسية', navSecGestion:'إدارة',
  navSecTerrain:'أرضي', navSecAide:'مساعدة',
  navSecSystemes:'الأنظمة', navSecDonnees:'البيانات',

  /* Nav items */
  navDashboard:'لوحة التحكم', navDashboardAgri:'لوحتي', navDashboardTech:'نظرة عامة',
  navRF:'الغابة العشوائية', navRFAgri:'أي محصول؟', navRFTech:'الغابة العشوائية',
  navLSTM:'تنبؤ LSTM', navLSTMAgri:'توقعات الطقس', navLSTMTech:'نماذج الذكاء الاصطناعي',
  navIoT:'IoT / ESP32 / LoRa', navIoTTech:'المستشعرات و LoRa',
  navHistory:'السجل', navHistoryAgri:'قياساتي', navHistoryTech:'السجل',
  navAdmin:'الإدارة',

  /* Topbar */
  topbarLive:'المستشعرات مباشرة',
  pageDashboard:'لوحة التحكم',
  pageRF:'الغابة العشوائية — توصية المحصول',
  pageLSTM:'توقعات LSTM — السلاسل الزمنية',
  pageIoT:'IoT . ESP32 . LoRaWAN',
  pageHistory:'سجل البيانات',
  pageAdmin:'الإدارة',

  /* Stat cards */
  statRFLabel:'دقة RF',           statRFTrend:'↑ +0.3%',
  statLSTMLabel:'دقة LSTM',       statLSTMTrend:'↑ +2.1%',
  statSensLabel:'مستشعرات نشطة', statSensTrend:'✓ Tous OK',
  statBatLabel:'عمر البطارية',    statBatTrend:'↓ -3j',

  /* Cards */
  cardSensors:'مستشعرات ESP32 — بيانات مباشرة',
  cardAlerts:'التنبيهات النشطة',
  cardLSTMDash:'توقع LSTM — رطوبة التربة (7 أيام)',
  cardLoRa:'شبكة LoRaWAN',
  cardArch:'بنية نظام الذكاء الاصطناعي — كيف يعمل؟',
  cardTerrain:'بيانات أرضك',
  cardReco:'التوصية',
  cardVotes:'أصوات 100 شجرة',
  cardImportance:'أهمية المستشعرات',
  cardConseils:'نصائح مخصصة',
  cardLSTMBig:'توقع رطوبة التربة — 7 أيام',
  cardLSTMTemp:'توقع درجة الحرارة — 7 أيام',
  cardLSTMHow:'كيف يعمل LSTM؟',
  cardSensorMap:'خريطة المستشعرات',
  cardLoRaArch:'بنية LoRaWAN — من النبتة إلى السحابة',
  cardESP32:'إعداد عقد ESP32',
  cardHistorique:'سجل القياسات',
  cardTimeline:'النشاط الأخير',
  cardUsers:'إدارة المستخدمين',
  cardJournal:'سجل النظام',
  cardGuide:'دليل الاستخدام — للجميع',

  /* Alertes */
  alertNone:'Aucune alerte active',
  alertNoneSub:'Tous les capteurs fonctionnent normalement.',

  /* Noeuds statut */
  nodeOnline:'متصل', nodeWarn:'بطارية منخفضة', nodeOffline:'غير متصل',

  /* Architecture IA */
  archL1Title:'طبقة الأرض — مستشعرات IoT',
  archL1Desc:'يجمع ESP32 الحرارة والحموضة والرطوبة وNPK كل 10 ثوانٍ.',
  archL2Title:'طبقة الاتصال — LoRaWAN',
  archL2Desc:'نقل بعيد المدى (10 كم) عبر بروتوكول LoRaWAN 868MHz.',
  archL3Title:'طبقة السحابة — التخزين والمعالجة',
  archL3Desc:'Firebase Realtime Database، حساب فوري، سجل 30 يوماً.',
  archL4Title:'طبقة الذكاء — الغابة العشوائية',
  archL4Desc:'100 شجرة قرار توصي بالمحصول الأمثل (دقة 98%).',
  archL5Title:'طبقة الذكاء — LSTM',
  archL5Desc:'شبكة LSTM تتوقع احتياجات الري لـ 7 أيام (دقة 92%).',
  archL6Title:'طبقة الواجهة — لوحة التحكم',
  archL6Desc:'واجهة ويب متجاوبة للمزارعين والتقنيين والمديرين.',

  /* IoT page */
  iotLoRaDesc:'يتيح LoRaWAN لمستشعرات ESP32 إرسال البيانات على مسافة 10-15 كم باستهلاك طاقة منخفض جداً.',
  iotS1Title:'1. ESP32 (العقدة)', iotS1Desc:'يجمع pH والحرارة والرطوبة كل 10 ث. يشفر البيانات (12 بايت). يرسل عبر LoRa SX1276.',
  iotS2Title:'2. بوابة LoRaWAN', iotS2Desc:'تستقبل إطارات LoRa على 8 قنوات. تفكك وترسل عبر Ethernet/4G إلى السحابة.',
  iotS3Title:'3. خادم الشبكة (TTN)', iotS3Desc:'تتولى TTN المصادقة والتوجيه لتطبيقك.',
  iotS4Title:'4. معالجة الذكاء الاصطناعي', iotS4Desc:'البيانات تصل JSON — الغابة العشوائية توصي بالمحصول، LSTM يتوقع الاحتياجات.',
  /* Table IoT */
  iotTblNoeud:'العقدة', iotTblZone:'المنطقة', iotTblRSSI:'RSSI', iotTblSF:'SF',
  iotTblBatterie:'البطارية', iotTblStatut:'الحالة', iotTblAction:'الإجراء',
  iotBtnMesure:'قياس',

  /* Historique */
  histTblDate:'التاريخ والوقت', histTblCapteur:'المستشعر', histTblPH:'pH',
  histTblHumidite:'الرطوبة', histTblTemp:'الحرارة', histTblAction:'الإجراء',
  histLoading:'جارٍ التحميل من MySQL...',

  /* Admin */
  adminStatTotal:'إجمالي المستخدمين', adminStatAgri:'المزارعون',
  adminStatTech:'التقنيون', adminStatActifs:'الحسابات النشطة',
  adminTblNum:'#', adminTblNom:'الاسم الكامل', adminTblLogin:'تسجيل الدخول',
  adminTblRole:'الدور', adminTblZone:'المنطقة', adminTblTel:'الهاتف',
  adminTblStatut:'الحالة', adminTblActions:'الإجراءات', adminTblCreeLe:'أنشئ في',
  adminBtnAjouter:'إضافة', adminSearchPlaceholder:'بحث...',
  adminFiltreAll:'الكل', adminFiltreAdmins:'مديرون',
  adminFiltreTech:'تقنيون', adminFiltreAgri:'مزارعون',
  modalAddTitle:'إضافة مستخدم', modalEditTitle:'تعديل المستخدم',
  modalBtnCreate:'إنشاء الحساب', modalBtnSave:'حفظ',
  modalBtnCancel:'إلغاء', modalBtnDelete:'حذف',
  confirmDeleteTitle:'حذف هذا المستخدم؟',
  confirmDeleteSub:'هذا الإجراء لا يمكن التراجع عنه.',
  statutActif:'نشط', statutInactif:'غير نشط', statutSuspendu:'موقوف',
  journalBtnVider:'مسح', journalLoading:'جارٍ التحميل...',

  /* Modal labels */
  mPrenom:'الاسم الأول', mNom:'اللقب', mLogin:'معرّف الدخول',
  mPass:'كلمة المرور', mRole:'الدور', mZone:'المنطقة / المزرعة',
  mTel:'الهاتف', mStatut:'الحالة',

  /* RF */
  rfBtn:'تشغيل التحليل (100 شجرة)',
  rfDesc:'اضبط القيم حسب مستشعرات ESP32. ستحلل خوارزمية الغابة العشوائية (100 شجرة) أرضك.',
  rfArbreVote:'شجرة من أصل 100 صوّتت لهذا المحصول',
  rfConfiance:'ثقة النموذج',
  rfTresFilable:'موثوق جداً', rfFilable:'موثوق', rfVerifier:'تحقق من المستشعرات',

  /* Conseils RF */
  consTagReco:'RECOMMANDATION', consTagUrgent:'عاجل',
  consTagAttn:'تنبيه', consTagFertil:'تسميد', consTagTherm:'إجهاد حراري',
  consPlantez:'ازرع :',
  consAcideH:'التربة حامضية جداً', consAcideP:'أضف 400-800 كغ/هكتار من الجير الزراعي لتصحيح الحموضة.',
  consAlcalinH:'التربة قلوية', consAlcalinP:'أضف الكبريت الزراعي لخفض الحموضة تدريجياً.',
  consIrrigH:'ري فوري!', consIrrigP:'اسقِ 20-30 مم خلال الـ 12 ساعة القادمة.',
  consAzoteH:'نقص في النيتروجين', consAzoteP:'أضف اليوريا (46% N): 80-120 كغ/هكتار على دفعتين.',
  consThermH:'حرارة مفرطة', consThermP:'زد الري وركّب شبكات تظليل.',
  consAdaptee:'هذا هو المحصول الأنسب لظروف أرضك الحالية.',

  /* Capteurs */
  sTemp:'درجة الحرارة', sHumSol:'رطوبة التربة', sPh:'حموضة التربة',
  sAzote:'النيتروجين (N)', sPhosphore:'الفسفور (P)', sHumAir:'رطوبة الهواء',
  sLum:'الإضاءة', sCo2:'ثاني أكسيد الكربون',
  stNormal:'طبيعي', stBon:'جيد', stSurveiller:'مراقبة',
  stCritique:'حرج', stNeutre:'معتدل', stAcide:'حامضي',
  stSuffisant:'كافٍ', stOk:'موافق', stHorsLigne:'غير متصل',

  /* Cultures */
  cRiz:'أرز', cBle:'قمح', cMais:'ذرة', cCoton:'قطن',
  cPoisChiche:'حمص', cCafe:'قهوة', cTournesol:'عباد الشمس',
  cTomate:'طماطم', cSoja:'صويا', cPomme:'بطاطس',
  cMangue:'مانغو', cRaisin:'عنب',

  /* RF sliders */
  rfPh:'حموضة التربة', rfHumSol:'رطوبة التربة', rfAzote:'النيتروجين (N)',
  rfTemp:'درجة الحرارة', rfPluie:'الأمطار',
  rfHumAir:'رطوبة الهواء', rfPhosphore:'الفسفور (P)', rfPotassium:'البوتاسيوم (K)',
  rfHint_ph:'3.0 حامضي,6.5 معتدل,9.0 قلوي',
  rfHint_hs:'0% جاف,50%,100% مشبع',
  rfHint_n:'0,70,140', rfHint_temp:'8C,27C,45C',
  rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
  rfHint_p:'0,72,145', rfHint_k:'0,100,205',

  /* Chat */
  chatTitle:'مساعد AgriSmart', chatSub:'ذكاء اصطناعي . متاح 24/7',
  chatPlaceholder:'اكتب سؤالك...',
  notifWelcome:'مرحباً', notifLogout:'تم تسجيل الخروج',
  notifOffline:'وضع بدون اتصال (XAMPP غير مشغل)',

  /* LSTM */
  lstmTitle:'توقعات LSTM — السلاسل الزمنية',
  lstmSimTitle:'محاكي LSTM — التنبؤ بالمحصول',
  lstmVraiRaison:'حساب حقيقي',
  lstmLancer:'تشغيل توقع LSTM',
  lstmRendement:'المحصول المتوقع', lstmUnit:'طن / هكتار',
  lstmBase:'القاعدة الموسمية', lstmContrib:'مساهمة LSTM (h_t)',
  lstmDirect:'تأثيرات مباشرة', lstmGates:'بوابات LSTM — القيم الحية',
  lstmAujourdHui:'اليوم',
},

/* ─────────────────── ANGLAIS ─────────────────── */
en: {
  loginTitle:'Intelligent Precision Agriculture Platform',
  loginIdentifiant:'Username', loginPassword:'Password',
  loginPlaceholder:'Enter your username', loginBtn:'Sign In',
  tabAdmin:'Admin', tabAgri:'Farmer', tabTech:'Technician',
  sidebarReduce:'Collapse', sidebarLogout:'Sign Out',
  roleAdmin:'ADMIN', roleAgri:'FARMER', roleTech:'TECHNICIAN',
  navSecPrincipal:'Main', navSecGestion:'Management',
  navSecTerrain:'My Field', navSecAide:'Help',
  navSecSystemes:'Systems', navSecDonnees:'Data',
  navDashboard:'Dashboard', navDashboardAgri:'My Dashboard', navDashboardTech:'Global View',
  navRF:'Random Forest', navRFAgri:'Which Crop?', navRFTech:'Random Forest',
  navLSTM:'LSTM Forecast', navLSTMAgri:'Weather Forecast', navLSTMTech:'AI Models',
  navIoT:'IoT / ESP32 / LoRa', navIoTTech:'Sensors & LoRa',
  navHistory:'History', navHistoryAgri:'My Measurements', navHistoryTech:'History',
  navAdmin:'Administration',
  topbarLive:'Live sensors',
  pageDashboard:'Dashboard', pageRF:'Random Forest — Crop Recommendation',
  pageLSTM:'LSTM Forecast — Time Series', pageIoT:'IoT . ESP32 . LoRaWAN',
  pageHistory:'Data History', pageAdmin:'Administration',
  statRFLabel:'RF Accuracy', statRFTrend:'+ +0.3%',
  statLSTMLabel:'LSTM Accuracy', statLSTMTrend:'+ +2.1%',
  statSensLabel:'Active sensors', statSensTrend:'All OK',
  statBatLabel:'Battery life', statBatTrend:'- -3d',
  cardSensors:'ESP32 Sensors — Live Data',
  cardAlerts:'Active Alerts',
  cardLSTMDash:'LSTM Forecast — Soil Moisture (7d)',
  cardLoRa:'LoRaWAN Network',
  cardArch:'AI System Architecture — How it works?',
  cardTerrain:'Your Field Data', cardReco:'Recommendation',
  cardVotes:'100 Trees Votes', cardImportance:'Sensor Importance',
  cardConseils:'Personalized Advice',
  cardLSTMBig:'Soil Moisture Forecast — 7 Days',
  cardLSTMTemp:'Temperature Forecast — 7 Days',
  cardLSTMHow:'How does LSTM work?',
  cardSensorMap:'Field Sensor Map',
  cardLoRaArch:'LoRaWAN Architecture — From Plant to Cloud',
  cardESP32:'ESP32 Node Configuration',
  cardHistorique:'Measurement History', cardTimeline:'Recent Activity',
  cardUsers:'User Management', cardJournal:'System Log',
  cardGuide:'User Guide — For Everyone',
  alertNone:'No active alert', alertNoneSub:'All sensors are functioning normally.',
  nodeOnline:'Online', nodeWarn:'Low battery', nodeOffline:'Offline',
  archL1Title:'Field Layer — IoT Sensors', archL1Desc:'ESP32 collects T, pH, humidity, NPK every 10 seconds.',
  archL2Title:'Communication Layer — LoRaWAN', archL2Desc:'Long-range transmission (10km) via LoRaWAN 868MHz.',
  archL3Title:'Cloud Layer — Storage & Processing', archL3Desc:'Firebase Realtime Database, real-time computation, 30-day history.',
  archL4Title:'AI Layer — Random Forest', archL4Desc:'100 decision trees recommend optimal crop (98% accuracy).',
  archL5Title:'AI Layer — LSTM', archL5Desc:'LSTM predicts irrigation needs over 7 days (92% accuracy).',
  archL6Title:'Interface Layer — Dashboard', archL6Desc:'Responsive web interface for farmers, technicians and admins.',
  iotLoRaDesc:'LoRaWAN allows your ESP32 sensors to transmit data over 10-15 km with ultra-low power.',
  iotS1Title:'1. ESP32 (Node)', iotS1Desc:'Collects pH, T, humidity every 10s. Encodes compact data (12 bytes). Sends via LoRa SX1276.',
  iotS2Title:'2. LoRaWAN Gateway', iotS2Desc:'Receives LoRa frames on 8 simultaneous channels. Decodes and forwards via Ethernet/4G.',
  iotS3Title:'3. Network Server (TTN)', iotS3Desc:'TTN handles authentication, deduplication and routing.',
  iotS4Title:'4. AI Processing', iotS4Desc:'Data arrives as JSON — Random Forest recommends crop, LSTM predicts future needs.',
  iotTblNoeud:'Node', iotTblZone:'Zone', iotTblRSSI:'RSSI', iotTblSF:'SF',
  iotTblBatterie:'Battery', iotTblStatut:'Status', iotTblAction:'Action',
  iotBtnMesure:'Measure',
  histTblDate:'Date & Time', histTblCapteur:'Sensor', histTblPH:'pH',
  histTblHumidite:'Humidity', histTblTemp:'Temp.', histTblAction:'Action',
  histLoading:'Loading from MySQL...',
  adminStatTotal:'Total users', adminStatAgri:'Farmers', adminStatTech:'Technicians', adminStatActifs:'Active accounts',
  adminTblNum:'#', adminTblNom:'Full Name', adminTblLogin:'Login',
  adminTblRole:'Role', adminTblZone:'Zone', adminTblTel:'Phone',
  adminTblStatut:'Status', adminTblActions:'Actions', adminTblCreeLe:'Created on',
  adminBtnAjouter:'Add', adminSearchPlaceholder:'Search...',
  adminFiltreAll:'All', adminFiltreAdmins:'Admins',
  adminFiltreTech:'Technicians', adminFiltreAgri:'Farmers',
  modalAddTitle:'Add User', modalEditTitle:'Edit User',
  modalBtnCreate:'Create account', modalBtnSave:'Save',
  modalBtnCancel:'Cancel', modalBtnDelete:'Delete',
  confirmDeleteTitle:'Delete this user?', confirmDeleteSub:'This action is irreversible.',
  statutActif:'Active', statutInactif:'Inactive', statutSuspendu:'Suspended',
  journalBtnVider:'Clear', journalLoading:'Loading...',
  mPrenom:'First name', mNom:'Last name', mLogin:'Login ID',
  mPass:'Password', mRole:'Role', mZone:'Zone / Farm',
  mTel:'Phone', mStatut:'Status',
  rfBtn:'Run Analysis (100 Trees)',
  rfDesc:'Adjust values according to your ESP32 sensors. The Random Forest algorithm (100 trees) will analyze your field.',
  rfArbreVote:'trees out of 100 voted for this crop',
  rfConfiance:'Model confidence',
  rfTresFilable:'Very reliable', rfFilable:'Reliable', rfVerifier:'Check sensors',
  consTagReco:'RECOMMENDATION', consTagUrgent:'URGENT',
  consTagAttn:'WARNING', consTagFertil:'FERTILIZATION', consTagTherm:'HEAT STRESS',
  consPlantez:'Plant:',
  consAcideH:'Soil too acidic', consAcideP:'Add 400-800 kg/ha of agricultural lime to correct pH.',
  consAlcalinH:'Alkaline soil', consAlcalinP:'Add agricultural sulfur to gradually lower pH.',
  consIrrigH:'Immediate irrigation!', consIrrigP:'Water 20-30mm in the next 12 hours.',
  consAzoteH:'Nitrogen deficiency', consAzoteP:'Apply urea (46% N): 80-120 kg/ha in two applications.',
  consThermH:'Excessive heat', consThermP:'Increase irrigation and install shade nets.',
  consAdaptee:'Most suitable crop for your current field conditions.',
  sTemp:'Temperature', sHumSol:'Soil Moisture', sPh:'Soil pH',
  sAzote:'Nitrogen (N)', sPhosphore:'Phosphorus (P)', sHumAir:'Air Humidity',
  sLum:'Luminosity', sCo2:'CO2',
  stNormal:'Normal', stBon:'Good', stSurveiller:'Monitor',
  stCritique:'Critical', stNeutre:'Neutral', stAcide:'Acidic',
  stSuffisant:'Sufficient', stOk:'OK', stHorsLigne:'offline',
  cRiz:'Rice', cBle:'Wheat', cMais:'Corn', cCoton:'Cotton',
  cPoisChiche:'Chickpea', cCafe:'Coffee', cTournesol:'Sunflower',
  cTomate:'Tomato', cSoja:'Soybean', cPomme:'Potato',
  cMangue:'Mango', cRaisin:'Grape',
  rfPh:'Soil pH', rfHumSol:'Soil Moisture', rfAzote:'Nitrogen (N)',
  rfTemp:'Temperature', rfPluie:'Rainfall',
  rfHumAir:'Air Humidity', rfPhosphore:'Phosphorus (P)', rfPotassium:'Potassium (K)',
  rfHint_ph:'3.0 Acid,6.5 Neutral,9.0 Alkaline',
  rfHint_hs:'0% Dry,50%,100% Saturated',
  rfHint_n:'0,70,140', rfHint_temp:'8C,27C,45C',
  rfHint_rain:'20mm,160mm,300mm', rfHint_hair:'14%,57%,100%',
  rfHint_p:'0,72,145', rfHint_k:'0,100,205',
  chatTitle:'AgriSmart Assistant', chatSub:'AI . Available 24/7',
  chatPlaceholder:'Ask your question...',
  notifWelcome:'Welcome', notifLogout:'Signed out successfully',
  notifOffline:'Offline mode (XAMPP not running)',
  lstmTitle:'LSTM Forecast — Time Series',
  lstmSimTitle:'LSTM Simulator — Yield Prediction',
  lstmVraiRaison:'Real Computation',
  lstmLancer:'Run LSTM Prediction',
  lstmRendement:'Predicted Yield', lstmUnit:'tons / hectare',
  lstmBase:'Seasonal base', lstmContrib:'LSTM contrib (h_t)',
  lstmDirect:'Direct effects', lstmGates:'LSTM Gates — live values',
  lstmAujourdHui:'Today',
},
};

/* ══ LANGUE ACTIVE ══ */
let _lang = 'fr';
function T(k) { return (LANG[_lang]||LANG.fr)[k] || LANG.fr[k] || k; }

/* ══ HELPERS ══ */
function _mLabel(inputId, text) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const lbl = inp.closest('.m-field')?.querySelector('label');
  if (lbl && text) lbl.textContent = text;
}

/* ══════════════════════════════════════════════
   APPLY LANG — traduction complete
══════════════════════════════════════════════ */
function applyLang() {
  const isRTL = _lang === 'ar';
  document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = _lang;

  /* ── LOGIN ── */
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

  /* ── SIDEBAR boutons ── */
  const cnl = document.querySelector('.btn-collapse .nl');
  if (cnl) cnl.textContent = T('sidebarReduce');
  const lnl = document.querySelector('.btn-logout .nl');
  if (lnl) lnl.textContent = T('sidebarLogout');

  /* ── Badge role sidebar ── */
  const badge = document.getElementById('sb-badge');
  if (badge) {
    const r = (typeof state !== 'undefined') ? state.role : 'admin';
    if (r === 'admin')       badge.textContent = T('roleAdmin');
    else if (r === 'agriculteur') badge.textContent = T('roleAgri');
    else                     badge.textContent = T('roleTech');
  }

  /* ── Nav section labels ── */
  const SEC_MAP = {
    'Principal':T('navSecPrincipal'), 'Gestion':T('navSecGestion'),
    'Mon Terrain':T('navSecTerrain'), 'Aide':T('navSecAide'),
    'Systemes':T('navSecSystemes'), 'Systèmes':T('navSecSystemes'),
    'Donnees':T('navSecDonnees'), 'Données':T('navSecDonnees'),
    // Already translated — reverse mapping
    'الرئيسية':T('navSecPrincipal'), 'إدارة':T('navSecGestion'),
    'أرضي':T('navSecTerrain'), 'مساعدة':T('navSecAide'),
    'الأنظمة':T('navSecSystemes'), 'البيانات':T('navSecDonnees'),
    'Main':T('navSecPrincipal'), 'Management':T('navSecGestion'),
    'My Field':T('navSecTerrain'), 'Help':T('navSecAide'),
    'Systems':T('navSecSystemes'), 'Data':T('navSecDonnees'),
  };
  document.querySelectorAll('.nav-section-label').forEach(el => {
    const t = el.textContent.trim();
    if (SEC_MAP[t]) el.textContent = SEC_MAP[t];
  });

  /* ── Nav items labels ── */
  const role = (typeof state !== 'undefined') ? state.role : 'admin';
  const NAV_LABELS = {
    dashboard: {admin:T('navDashboard'), agriculteur:T('navDashboardAgri'), technicien:T('navDashboardTech')},
    rf:        {admin:T('navRF'),        agriculteur:T('navRFAgri'),        technicien:T('navRFTech')},
    lstm:      {admin:T('navLSTM'),      agriculteur:T('navLSTMAgri'),      technicien:T('navLSTMTech')},
    iot:       {admin:T('navIoT'),       agriculteur:T('navIoT'),           technicien:T('navIoTTech')},
    history:   {admin:T('navHistory'),   agriculteur:T('navHistoryAgri'),   technicien:T('navHistoryTech')},
    admin:     {admin:T('navAdmin'),     agriculteur:T('navAdmin'),         technicien:T('navAdmin')},
  };
  document.querySelectorAll('.nav-item').forEach(item => {
    const oc = item.getAttribute('onclick') || '';
    const m  = oc.match(/navigateTo\(['"](\w+)['"]\)/);
    if (!m) return;
    const pid = m[1];
    const nl  = item.querySelector('.nl');
    if (nl && NAV_LABELS[pid]) {
      nl.textContent = NAV_LABELS[pid][role] || NAV_LABELS[pid]['admin'];
    }
  });

  /* ── TOPBAR ── */
  const tlbl = document.getElementById('lbl-live');
  if (tlbl) tlbl.textContent = T('topbarLive');
  // Titre page
  const PAGE_LABELS = {
    dashboard:T('pageDashboard'), rf:T('pageRF'), lstm:T('pageLSTM'),
    iot:T('pageIoT'), history:T('pageHistory'), admin:T('pageAdmin'),
  };
  const topTitle = document.getElementById('topbar-title');
  if (topTitle) {
    const cur = (typeof state !== 'undefined') ? state.currentPage : 'dashboard';
    if (PAGE_LABELS[cur]) topTitle.textContent = PAGE_LABELS[cur];
  }

  /* ── Cards h3 ── */
  const CARD_VARIANTS = [
    ['cardSensors',   ['Capteurs ESP32 — Donnees en Direct','Capteurs ESP32 — Données en Direct','ESP32 Sensors — Live Data','مستشعرات ESP32 — بيانات مباشرة']],
    ['cardAlerts',    ['Alertes Actives','Active Alerts','التنبيهات النشطة']],
    ['cardLSTMDash',  ['Prevision LSTM — Humidite Sol (7j)','Prévision LSTM — Humidité Sol (7j)','LSTM Forecast — Soil Moisture (7d)','توقع LSTM — رطوبة التربة (7 أيام)']],
    ['cardLoRa',      ['Reseau LoRaWAN','Réseau LoRaWAN','LoRaWAN Network','شبكة LoRaWAN']],
    ['cardArch',      ["Architecture IA du Systeme — Comment ca marche ?","Architecture IA du Système — Comment ça marche ?",'AI System Architecture — How it works?','بنية نظام الذكاء الاصطناعي — كيف يعمل؟']],
    ['cardTerrain',   ['Donnees de Votre Terrain','Données de Votre Terrain','Your Field Data','بيانات أرضك']],
    ['cardReco',      ['Recommandation','Recommendation','التوصية']],
    ['cardVotes',     ['Votes des 100 Arbres','100 Trees Votes','أصوات 100 شجرة']],
    ['cardImportance',['Importance Capteurs','Sensor Importance','أهمية المستشعرات']],
    ['cardConseils',  ['Conseils Personnalises','Conseils Personnalisés','Personalized Advice','نصائح مخصصة']],
    ['cardLSTMBig',   ['Prevision Humidite Sol — 7 Jours','Prévision Humidité Sol — 7 Jours','Soil Moisture Forecast — 7 Days','توقع رطوبة التربة — 7 أيام']],
    ['cardLSTMTemp',  ['Prevision Temperature — 7 Jours','Prévision Température — 7 Jours','Temperature Forecast — 7 Days','توقع درجة الحرارة — 7 أيام']],
    ['cardLSTMHow',   ['Comment fonctionne le LSTM ?','How does LSTM work?','كيف يعمل LSTM؟']],
    ['cardSensorMap', ['Carte des Capteurs Terrain','Field Sensor Map','خريطة المستشعرات']],
    ['cardLoRaArch',  ['Architecture LoRaWAN — De la Plante au Cloud','LoRaWAN Architecture — From Plant to Cloud','بنية LoRaWAN — من النبتة إلى السحابة']],
    ['cardESP32',     ['Configuration des Noeuds ESP32','Configuration des Nœuds ESP32','ESP32 Node Configuration','إعداد عقد ESP32']],
    ['cardHistorique',['Historique des Mesures','Measurement History','سجل القياسات']],
    ['cardTimeline',  ['Activite Recente','Activité Récente','Recent Activity','النشاط الأخير']],
    ['cardUsers',     ['Gestion des Utilisateurs','User Management','إدارة المستخدمين']],
    ['cardJournal',   ['Journal Systeme','Journal Système','System Log','سجل النظام']],
    ['cardGuide',     ["Guide d'Utilisation — Pour Tout le Monde","Guide d'Utilisation — Pour Tout le Monde",'User Guide — For Everyone','دليل الاستخدام — للجميع']],
  ];
  document.querySelectorAll('.card-header h3').forEach(h3 => {
    const cur = h3.textContent.trim();
    for (const [key, variants] of CARD_VARIANTS) {
      if (variants.includes(cur)) { h3.textContent = T(key); break; }
    }
  });

  /* ── Confirm modal ── */
  const ch3 = document.querySelector('.confirm-box h3');
  if (ch3) ch3.textContent = T('confirmDeleteTitle');
  const chp = document.querySelector('.confirm-box p');
  if (chp) chp.textContent = T('confirmDeleteSub');

  /* ── RF btn + desc ── */
  const rfBtn = document.getElementById('btn-rf');
  if (rfBtn) rfBtn.innerHTML = T('rfBtn');
  const rfDescEl = document.querySelector('#page-rf .card-body > p');
  if (rfDescEl) rfDescEl.innerHTML = T('rfDesc');

  /* ── Modal labels ── */
  _mLabel('m-prenom', T('mPrenom'));
  _mLabel('m-nom',    T('mNom'));
  _mLabel('m-pass',   T('mPass'));
  _mLabel('m-role',   T('mRole'));
  _mLabel('m-zone',   T('mZone'));
  _mLabel('m-tel',    T('mTel'));
  _mLabel('m-status', T('mStatut'));
  document.querySelectorAll('.modal-body .m-field label').forEach(lbl => {
    const t = lbl.textContent.trim();
    if (['Identifiant de connexion','Login ID','معرّف الدخول'].includes(t)) lbl.textContent = T('mLogin');
  });

  /* ── Boutons confirm modal ── */
  document.querySelectorAll('.confirm-btns .btn').forEach(btn => {
    const t = btn.textContent.trim();
    if (['Annuler','Cancel','إلغاء'].includes(t)) btn.textContent = T('modalBtnCancel');
    if (['Supprimer','Delete','حذف','🗑 Supprimer'].includes(t)) btn.textContent = T('modalBtnDelete');
  });

  /* ── Admin: filtres ── */
  document.querySelectorAll('.filtre-btn').forEach(btn => {
    const t = btn.textContent.trim();
    if (['Le tout','All','الكل'].includes(t)) btn.textContent = T('adminFiltreAll');
    else if (t.includes('Admin') || t.includes('مدير')) btn.textContent = T('adminFiltreAdmins');
    else if (t.includes('Tech') || t.includes('تقني')) btn.textContent = T('adminFiltreTech');
    else if (t.includes('Agri') || t.includes('مزارع') || t.includes('Farmer')) btn.textContent = T('adminFiltreAgri');
  });

  /* ── Admin: bouton ajouter ── */
  document.querySelectorAll('button').forEach(btn => {
    const t = btn.textContent.trim();
    if (t === '➕ Ajouter' || t === '➕ Add' || t === '➕ إضافة') btn.textContent = '➕ ' + T('adminBtnAjouter');
    if (['🗑 Vider','🗑 Clear','🗑 مسح'].includes(t)) btn.textContent = '🗑 ' + T('journalBtnVider');
  });

  /* ── Admin: search placeholder ── */
  const sInp = document.querySelector('#page-admin input[type=text]');
  if (sInp) sInp.placeholder = T('adminSearchPlaceholder');

  /* ── Chat ── */
  const cht = document.getElementById('chat-head-title');
  if (cht) cht.textContent = T('chatTitle');
  const chs = document.getElementById('chat-head-sub');
  if (chs) chs.textContent = T('chatSub');
  const chatFab = document.getElementById('chat-fab');
  if (chatFab) chatFab.title = T('chatTitle');
  const chatInp = document.getElementById('chat-input');
  if (chatInp) chatInp.placeholder = T('chatPlaceholder');

  /* ── Synchro select ── */
  const sel = document.getElementById('lang-select');
  if (sel) sel.value = _lang;
}

/* ══ API PUBLIQUE ══ */
function setLang(lang) {
  if (!LANG[lang]) return;
  _lang = lang;
  try { localStorage.setItem('agrismart_lang', lang); } catch(e) {}
  applyLang();
  /* Rebuild pages qui contiennent du texte codé en dur */
  if (typeof buildSidebarNav  === 'function') buildSidebarNav();
  if (typeof buildMobileNav   === 'function') buildMobileNav();
  if (typeof state !== 'undefined') {
    if (state.currentPage === 'dashboard' && typeof buildDashboard  === 'function') buildDashboard();
    if (state.currentPage === 'rf'        && typeof buildRFPage     === 'function') buildRFPage();
    if (state.currentPage === 'admin'     && typeof buildAdminPage  === 'function') buildAdminPage();
    if (state.currentPage === 'iot'       && typeof buildIoTPage    === 'function') buildIoTPage();
    if (state.currentPage === 'history'   && typeof buildHistoryPage=== 'function') buildHistoryPage();
  }
  document.querySelectorAll('.login-lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}

/* Aliases utilises dans AgriSmart.html */
function AS_setLang(lang) { setLang(lang); }
function AS_toggleDark()  { toggleDarkMode(); }

/* ══ INIT ══ */
(function() {
  try { const s = localStorage.getItem('agrismart_lang'); if (s && LANG[s]) _lang = s; } catch(e) {}
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLang);
  } else {
    applyLang();
  }
})();
