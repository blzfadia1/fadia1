/* ════════════════════════════════════════════════════════════════
   AgriSmart — 10 — CHATBOT IA — Version Proxy Claude
   ✅ Appelle api/chat.php (proxy serveur) → Claude API
   ✅ Images envoyées directement en multimodal via chat.php
   ✅ Pas de clé API dans le navigateur (sécurisé)
   ✅ Fallback local intelligent si le serveur est éteint
   ✅ Contexte MySQL live injecté côté serveur (chat.php)
   ✅ Conserve : TTS, STT, boutons rapides, langues FR/AR/EN
   Fichier : 10_chat_mysql.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   STUBS DE SÉCURITÉ
═══════════════════════════════════════════════════════ */
if (typeof apiCall === 'undefined') {
  window.apiCall = async function(endpoint, method, body) {
    try {
      const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(`api/api.php?action=${endpoint}`, opts);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch(e) { return { success: false, error: e.message }; }
  };
}
if (typeof showNotif === 'undefined') {
  window.showNotif = function(msg) {
    let el = document.getElementById('_chat_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '_chat_toast';
      el.style.cssText = 'position:fixed;bottom:90px;right:20px;z-index:9999;background:#1e293b;color:#f1f5f9;padding:8px 16px;border-radius:10px;font-size:13px;transition:opacity .3s;opacity:0;max-width:280px;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
  };
}
if (typeof CURRENT_USER === 'undefined') window.CURRENT_USER = null;
if (typeof state === 'undefined')        window.state = { role: 'admin' };

/* ═══════════════════════════════════════════════════════
   ÉTAT GLOBAL
═══════════════════════════════════════════════════════ */
let chatOpen      = false;
let chatFirstOpen = true;
let _ttsEnabled   = true;
let _sttActive    = false;
let _chatHistory  = [];   // [{role:'user'|'assistant', content:'...'}]
let _chatLang     = 'fr';
let _isSpeaking   = false;
let _recognitionRef = null;
let _attachedFile   = null;  // File object sélectionné
let _pendingImageB64  = null; // base64 de l'image (sans préfixe data:)
let _pendingImageType = null; // ex: 'image/jpeg'
let _pendingImageName = null; // nom du fichier

/* ═══════════════════════════════════════════════════════
   APPEL PRINCIPAL — Proxy PHP → Claude API (texte seul)
═══════════════════════════════════════════════════════ */
async function _callClaude(userMessage) {
  _chatHistory.push({ role: 'user', content: userMessage });
  if (_chatHistory.length > 20) _chatHistory = _chatHistory.slice(-20);

  try {
    const userName = CURRENT_USER
      ? ((CURRENT_USER.prenom || '') + ' ' + (CURRENT_USER.nom || '')).trim()
      : '';

    const r = await fetch('api/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:  _chatHistory,
        lang:      _chatLang,
        role:      (typeof state !== 'undefined') ? state.role : 'admin',
        user_name: userName,
      }),
    });

    const d = await r.json();

    if (!d.success && d.error === 'no_key') {
      _chatHistory.pop();
      const reply = _fallbackLocal(userMessage);
      _chatHistory.push({ role: 'assistant', content: reply });
      return reply + '\n\n---\n⚙️ *Pour activer Claude IA : éditez `api/chat.php` et ajoutez votre clé Anthropic.*';
    }

    if (!d.success) {
      _chatHistory.pop();
      const reply = _fallbackLocal(userMessage);
      _chatHistory.push({ role: 'assistant', content: reply });
      return reply;
    }

    const reply = d.reply || '';
    _chatHistory.push({ role: 'assistant', content: reply });
    return reply;

  } catch(e) {
    _chatHistory.pop();
    const reply = _fallbackLocal(userMessage);
    _chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  }
}

/* ═══════════════════════════════════════════════════════
   APPEL AVEC IMAGE — Multimodal via chat.php
   chat.php gère déjà les images base64 nativement
═══════════════════════════════════════════════════════ */
async function _callClaudeWithImage(userText, imageB64, imageType, imageName) {
  const lang = _chatLang;

  // Valider que c'est bien une image
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(imageType)) {
    return {
      fr: '❌ Format non supporté. Envoyez une image JPG, PNG, GIF ou WebP.',
      ar: '❌ صيغة غير مدعومة. أرسل صورة JPG أو PNG.',
      en: '❌ Unsupported format. Send a JPG, PNG, GIF or WebP image.',
    }[lang] || '❌ Format non supporté.';
  }

  // Vérifier la taille (~5 Mo max en base64 = ~7M chars)
  if (imageB64.length > 7_000_000) {
    return {
      fr: '❌ Image trop grande (max 5 Mo). Réduisez la taille de l\'image.',
      ar: '❌ الصورة كبيرة جداً (أقصى 5 ميغابايت).',
      en: '❌ Image too large (max 5 MB). Please reduce image size.',
    }[lang] || '❌ Image trop grande.';
  }

  // Construire le contenu multimodal pour Claude
  const userContent = [
    {
      type: 'image',
      source: { type: 'base64', media_type: imageType, data: imageB64 }
    },
    {
      type: 'text',
      text: userText || 'Analyse cette image agricole et donne des recommandations pratiques détaillées.'
    }
  ];

  // Ajouter à l'historique (version texte pour le contexte futur)
  const histEntry = { role: 'user', content: userContent };
  _chatHistory.push(histEntry);
  if (_chatHistory.length > 20) _chatHistory = _chatHistory.slice(-20);

  try {
    const userName = CURRENT_USER
      ? ((CURRENT_USER.prenom || '') + ' ' + (CURRENT_USER.nom || '')).trim()
      : '';

    const r = await fetch('api/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages:  _chatHistory,
        lang:      lang,
        role:      (typeof state !== 'undefined') ? state.role : 'admin',
        user_name: userName,
      }),
    });

    if (!r.ok) {
      throw new Error('Serveur HTTP ' + r.status);
    }

    const rawText = await r.text();
    let d;
    try {
      d = JSON.parse(rawText);
    } catch(pe) {
      console.error('[AgroBot] Réponse non-JSON:', rawText.substring(0, 200));
      throw new Error('Réponse PHP invalide — vérifiez api/chat.php');
    }

    if (!d.success) {
      // Remplacer l'entrée d'historique par une version textuelle
      _chatHistory[_chatHistory.length - 1] = {
        role: 'user',
        content: `[Image: ${imageName}] ${userText || ''}`
      };
      throw new Error(d.message || 'Erreur API');
    }

    // Remplacer dans l'historique par une version textuelle (évite de renvoyer base64 à chaque fois)
    _chatHistory[_chatHistory.length - 1] = {
      role: 'user',
      content: `[Image analysée: ${imageName}] ${userText || ''}`
    };

    const reply = d.reply || '';
    _chatHistory.push({ role: 'assistant', content: reply });
    return reply;

  } catch(e) {
    console.error('[AgroBot] Erreur image:', e.message);
    // Retirer l'entrée d'historique si erreur
    _chatHistory.pop();

    // Fallback explicatif
    const fallbacks = {
      fr: `🖼️ **Image reçue :** \`${imageName}\`\n\n⚠️ Analyse IA impossible : ${e.message}\n\n**Vérifiez :**\n- XAMPP est démarré ✓\n- \`api/chat.php\` existe dans le dossier ✓\n- Votre clé Anthropic est configurée dans \`chat.php\` ✓\n\n**En attendant**, décrivez ce que vous voyez sur l'image et je vous aide.`,
      ar: `🖼️ **تم استلام الصورة:** \`${imageName}\`\n\n⚠️ خطأ في التحليل : ${e.message}\n\nتأكد من أن XAMPP يعمل وأن المفتاح Anthropic مُعدَّل في \`api/chat.php\`.`,
      en: `🖼️ **Image received:** \`${imageName}\`\n\n⚠️ Analysis failed: ${e.message}\n\n**Check:** XAMPP running ✓, \`api/chat.php\` exists ✓, Anthropic key configured ✓\n\n**Meanwhile**, describe what you see and I'll help.`,
    };
    return fallbacks[lang] || fallbacks.fr;
  }
}

/* ═══════════════════════════════════════════════════════
   DÉTECTION DE LANGUE
═══════════════════════════════════════════════════════ */
function _detectLang(q) {
  if (/[\u0600-\u06FF]/.test(q)) return 'ar';
  if (/\b(the|is|are|how|what|can|i|you|my|help|sensor|crop|soil|farm|show|when|why|which|does|do|will|would|please|tell|give|explain|describe|compare|best|good|bad|need|want|should|could|recommend|predict|forecast)\b/i.test(q)) return 'en';
  return 'fr';
}

/* ═══════════════════════════════════════════════════════
   FALLBACK LOCAL — Base de connaissances (si XAMPP éteint)
═══════════════════════════════════════════════════════ */
const _KB = [
  { k:['random forest','rf','forêt','culture recommand','quelle culture','crop'],
    fr:`🌲 **Random Forest — Recommandation Culture**\n\n- 100 arbres de décision, précision **98%**\n- 8 paramètres : pH, humidité sol, N, P, K, température, précipitations, humidité air\n- 12 cultures disponibles : Riz, Blé, Maïs, Coton, Soja, Café, Tomate...\n\n👉 Menu **Random Forest** → ajustez les curseurs → **Lancer l'Analyse**`,
    ar:`🌲 **الغابة العشوائية — توصية المحصول**\n\n- 100 شجرة قرار، دقة **98%**\n- 8 معاملات: pH، رطوبة، N، P، K، حرارة، أمطار\n\n👉 قائمة **Random Forest** → اضبط الأشرطة → **تشغيل التحليل**`,
    en:`🌲 **Random Forest — Crop Recommendation**\n\n- 100 decision trees, **98%** accuracy\n- 8 parameters: pH, soil moisture, N, P, K, temperature, rainfall, air humidity\n\n👉 Menu **Random Forest** → set sliders → **Run Analysis**` },

  { k:['lstm','prévision','prevision','météo','meteo','forecast','7 jour'],
    fr:`📈 **LSTM — Prévision 7 Jours**\n\n- Réseau neuronal récurrent, précision **92.4%**\n- Prédit : humidité sol + température sur 7 jours\n- 🔴 < 35% humidité → planifiez l'irrigation\n\n👉 Menu **Prévisions LSTM** pour voir les courbes`,
    ar:`📈 **LSTM — توقعات 7 أيام**\n\n- شبكة عصبية، دقة **92.4%**\n- 🔴 أقل من 35% رطوبة → خطط للري`,
    en:`📈 **LSTM — 7-Day Forecast**\n\n- Recurrent neural network, **92.4%** accuracy\n- 🔴 < 35% moisture → plan irrigation` },

  { k:['iot','capteur','sensor','lora','esp32','nœud','noeud','batterie'],
    fr:`📡 **IoT — ESP32 + LoRaWAN**\n\n- 6 nœuds, mesures toutes les **10 secondes**\n- Portée : **15 km** | Batterie : **287 jours**\n- Signal OK : RSSI > -100 dBm`,
    ar:`📡 **IoT — ESP32 + LoRaWAN**\n\n- 6 عقد، قياس كل **10 ثوانٍ**\n- المدى: **15 كم** | البطارية: **287 يوم**`,
    en:`📡 **IoT — ESP32 + LoRaWAN**\n\n- 6 nodes, readings every **10 seconds**\n- Range: **15 km** | Battery: **287 days**` },

  { k:['ph','acide','alcalin','chaux','soufre','sol','engrais','npk','azote','phosphore','potassium'],
    fr:`🧪 **Sol & Fertilisation**\n\n- 🔴 pH < 5.5 → Chaux : 500–1000 kg/ha\n- 🔵 pH > 7.5 → Soufre : 50 kg/ha\n- ✅ pH idéal : 6.0–7.0\n- N < 40 → Urée 46% (80–120 kg/ha)\n- P < 25 → Superphosphate | K < 30 → Sulfate potasse`,
    ar:`🧪 **التربة والتسميد**\n\n- 🔴 pH < 5.5 → جير: 500–1000 كغ/هكتار\n- ✅ pH مثالي: 6.0–7.0\n- N < 40 → يوريا 46%`,
    en:`🧪 **Soil & Fertilization**\n\n- 🔴 pH < 5.5 → Lime: 500–1000 kg/ha\n- 🔵 pH > 7.5 → Sulfur: 50 kg/ha\n- ✅ Ideal pH: 6.0–7.0` },

  { k:['irrigu','humidité sol','arros','eau','sec','quand irriguer','when to water'],
    fr:`💧 **Irrigation**\n\n- 🔴 < 20% → Irriguer maintenant (urgence !)\n- 🟡 20–35% → Irriguer sous 24–48h\n- ✅ 35–70% → Optimal\n- 🌊 > 85% → Vérifiez le drainage\n\n**Astuce :** Irriguer tôt le matin réduit l'évaporation de 30%`,
    ar:`💧 **الري**\n\n- 🔴 أقل من 20% → ري عاجل!\n- 🟡 20–35% → اسقِ خلال 24–48 ساعة\n- ✅ 35–70% → مثالي`,
    en:`💧 **Irrigation**\n\n- 🔴 < 20% → Irrigate immediately!\n- 🟡 20–35% → Irrigate within 24–48h\n- ✅ 35–70% → Optimal` },

  { k:['alerte','alert','alarme','warning'],
    fr:`⚠️ **Alertes AgriSmart**\n\n- 🔴 CRIT — Situation critique\n- 🟡 WARN — Avertissement\n- 🟢 OK — Normal\n\n👉 Tableau de bord → section **Alertes**`,
    ar:`⚠️ **تنبيهات AgriSmart**\n\n- 🔴 حرج | 🟡 تحذير | 🟢 طبيعي`,
    en:`⚠️ **AgriSmart Alerts**\n\n- 🔴 CRIT | 🟡 WARN | 🟢 OK` },

  { k:['bonjour','bonsoir','salut','hello','salam','مرحبا','أهلا','hi ','aide','help','qui es-tu'],
    fr:`🌿 **Bonjour ! Je suis AgroBot 🤖**\n\nAssistant IA d'AgriSmart — agriculture de précision.\n\nJe peux vous aider sur :\n- 🌲 Recommandation culture (Random Forest)\n- 📈 Prévisions 7 jours (LSTM)\n- 📡 Capteurs IoT\n- 🧪 Correction sol (pH, NPK)\n- 💧 Irrigation\n- 🖼️ Analyse d'images agricoles (bouton 📎)\n\n**Posez votre question ! 🌾**`,
    ar:`🌿 **مرحباً! أنا AgroBot 🤖**\n\nمساعد ذكاء اصطناعي لـ AgriSmart.\n\nيمكنني مساعدتك في:\n- 🌲 توصية المحصول | 📈 توقعات 7 أيام\n- 📡 IoT | 🧪 التربة | 💧 الري\n- 🖼️ تحليل الصور الزراعية`,
    en:`🌿 **Hello! I'm AgroBot 🤖**\n\nAgriSmart AI assistant.\n\nI can help with:\n- 🌲 Crop recommendation | 📈 7-day forecasts\n- 📡 IoT sensors | 🧪 Soil | 💧 Irrigation\n- 🖼️ Agricultural image analysis (📎 button)` },
];

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function _fallbackLocal(question) {
  const qNorm = _norm(question);
  const lang  = _detectLang(question);
  let best = null, bestScore = 0;
  for (const entry of _KB) {
    let score = 0;
    for (const k of entry.k) {
      const kn = _norm(k);
      if (qNorm.includes(kn)) score += kn.length > 4 ? 3 : 1;
      else if (kn.split(' ').some(w => w.length > 3 && qNorm.includes(w))) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (best && bestScore > 0) return best[lang] || best.fr;

  const generic = {
    fr: `🌿 **AgroBot** — Mode hors-ligne (XAMPP non démarré)\n\n- 🌲 Recommandation culture (RF)\n- 📈 Prévisions LSTM 7j\n- 📡 Capteurs IoT\n- 🧪 Sol & pH & NPK\n- 💧 Irrigation\n\nPosez une question spécifique ! 🌾`,
    ar: `🌿 **AgroBot** — وضع غير متصل\n\n- 🌲 توصية المحصول | 📈 LSTM\n- 📡 IoT | 🧪 التربة | 💧 الري\n\nاسأل سؤالاً محدداً! 🌾`,
    en: `🌿 **AgroBot** — Offline mode (XAMPP not running)\n\n- 🌲 Crop recommendation | 📈 LSTM\n- 📡 IoT | 🧪 Soil | 💧 Irrigation\n\nAsk a specific question! 🌾`,
  };
  return generic[lang] || generic.fr;
}

/* ═══════════════════════════════════════════════════════
   GESTION LANGUE
═══════════════════════════════════════════════════════ */
function setChatLang(lang) {
  _chatLang = lang;
  ['fr','ar','en'].forEach(l => {
    const b = document.getElementById('clb-' + l);
    if (b) b.classList.toggle('active', l === lang);
  });
  const win = document.getElementById('chat-window');
  if (win) win.classList.toggle('rtl', lang === 'ar');
  const inp = document.getElementById('chat-input');
  if (inp) {
    const ph = { fr:'Posez votre question…', ar:'اكتب سؤالك هنا…', en:'Ask your question…' };
    inp.placeholder = ph[lang] || ph.fr;
    inp.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  const sub = document.getElementById('chat-head-sub');
  if (sub) {
    const dot = `<span style="width:7px;height:7px;border-radius:50%;background:#86efac;display:inline-block;box-shadow:0 0 5px #86efac;flex-shrink:0;"></span>`;
    const subs = {
      fr: `${dot} Claude AI · FR / AR / EN · 🎤 · 📷`,
      ar: `${dot} Claude AI · عربي / FR / EN · 🎤 · 📷`,
      en: `${dot} Claude AI · FR / AR / EN · 🎤 · 📷`,
    };
    sub.innerHTML = subs[lang] || subs.fr;
  }
  _buildQuickButtons();
  const notifs = { fr:'🇫🇷 Langue : Français', ar:'🇩🇿 اللغة : العربية', en:'🇬🇧 Language: English' };
  showNotif(notifs[lang] || notifs.fr);
}

/* ═══════════════════════════════════════════════════════
   BOUTONS RAPIDES
═══════════════════════════════════════════════════════ */
function _buildQuickButtons() {
  const role = (typeof state !== 'undefined') ? state.role : 'admin';
  const lang = _chatLang;

  const sets = {
    admin: {
      fr: [
        { l:'🌲 RF',         q:'Comment utiliser le Random Forest pour choisir une culture ?' },
        { l:'📈 LSTM',       q:'Comment fonctionne la prévision LSTM ?' },
        { l:'📡 Capteurs',   q:'Montre-moi les données live de mes capteurs IoT' },
        { l:'🧪 Sol',        q:'Mon sol est acide, que faire ?' },
        { l:'💧 Irrigation', q:'Quand dois-je irriguer mes champs ?' },
        { l:'⚠️ Alertes',    q:'Y a-t-il des alertes actives sur mes capteurs ?' },
      ],
      ar: [
        { l:'🌲 الغابة',    q:'كيف أستخدم الغابة العشوائية لاختيار المحصول؟' },
        { l:'📈 LSTM',      q:'كيف يعمل نموذج LSTM للتنبؤ؟' },
        { l:'📡 مستشعرات', q:'أرني بيانات مستشعراتي الآن' },
        { l:'🧪 التربة',   q:'تربتي حامضة، ماذا أفعل؟' },
        { l:'💧 الري',     q:'متى يجب أن أروي حقلي؟' },
        { l:'⚠️ تنبيهات',  q:'هل هناك تنبيهات نشطة؟' },
      ],
      en: [
        { l:'🌲 RF',        q:'How to use Random Forest to choose a crop?' },
        { l:'📈 LSTM',      q:'How does the LSTM prediction model work?' },
        { l:'📡 Sensors',   q:'Show me live IoT sensor data' },
        { l:'🧪 Soil',      q:'My soil is acidic, what to do?' },
        { l:'💧 Irrigate',  q:'When should I irrigate my fields?' },
        { l:'⚠️ Alerts',    q:'Are there any active alerts?' },
      ],
    },
    agriculteur: {
      fr: [
        { l:'🌾 Culture ?', q:'Quelle culture planter selon mes capteurs ?' },
        { l:'💧 Irriguer ?',q:'Est-ce que je dois irriguer aujourd\'hui ?' },
        { l:'🌡️ Météo 7j', q:'Prévision météo pour les 7 prochains jours' },
        { l:'🧪 Mon sol',   q:'Comment améliorer mon sol ?' },
        { l:'⚠️ Alertes',   q:'Y a-t-il des alertes sur mes capteurs ?' },
      ],
      ar: [
        { l:'🌾 أي محصول؟', q:'ما المحصول الأنسب حسب بياناتي؟' },
        { l:'💧 هل أروي؟',  q:'هل يجب أن أروي اليوم؟' },
        { l:'🧪 تربتي',     q:'كيف أحسّن جودة تربتي؟' },
      ],
      en: [
        { l:'🌾 Best crop?', q:'What crop should I plant based on my sensors?' },
        { l:'💧 Irrigate?',  q:'Should I irrigate today?' },
        { l:'🧪 My soil',    q:'How do I improve my soil?' },
      ],
    },
    technicien: {
      fr: [
        { l:'📡 Nœuds IoT', q:'État de tous les nœuds IoT' },
        { l:'🔋 Batteries', q:'Quels nœuds ont une batterie faible ?' },
        { l:'📶 LoRa',      q:'Comment améliorer un signal LoRa faible ?' },
        { l:'⚠️ Alertes',   q:'Y a-t-il des alertes actives ?' },
      ],
      ar: [
        { l:'📡 العقد',     q:'أرني حالة عقد IoT' },
        { l:'🔋 البطارية',  q:'أي عقد لديها بطارية منخفضة؟' },
      ],
      en: [
        { l:'📡 Nodes',     q:'Show all IoT node status' },
        { l:'🔋 Battery',   q:'Which nodes have low battery?' },
        { l:'📶 Signal',    q:'How to improve weak LoRa signal?' },
      ],
    },
  };

  const roleSet = sets[role] || sets.admin;
  const langSet = roleSet[lang] || roleSet.fr;
  const el = document.getElementById('chat-quick');
  if (!el) return;
  el.innerHTML = langSet.map(b =>
    `<button class="chat-q-btn" onclick="envoyerQuestion('${b.q.replace(/'/g, "\\'")}')">${b.l}</button>`
  ).join('');
}

/* ═══════════════════════════════════════════════════════
   TTS — TEXT TO SPEECH
═══════════════════════════════════════════════════════ */
(function _initVoices() {
  if (!window.speechSynthesis) return;
  const load = () => window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined)
    window.speechSynthesis.onvoiceschanged = load;
  load();
})();

function _pickVoice(langCode, preferredGender) {
  try {
    const voices = window.speechSynthesis.getVoices();
    const byLang = voices.filter(v => v.lang?.toLowerCase().startsWith(langCode.toLowerCase()));
    if (!byLang.length) return null;
    const genderMatch = byLang.find(v => {
      const name = (v.name || '').toLowerCase();
      return preferredGender === 'female'
        ? name.includes('female') || name.includes('samantha') || name.includes('victoria') || name.includes('woman')
        : name.includes('male') || name.includes('daniel') || name.includes('david');
    });
    return genderMatch || byLang[0] || null;
  } catch { return null; }
}

function stopSpeaking() {
  window.speechSynthesis?.cancel();
  _isSpeaking = false;
  const btn = document.getElementById('chat-stop-speak');
  if (btn) btn.style.display = 'none';
}

function testVoice() {
  const testTexts = { fr:'Bonjour ! Voici un test vocal.', ar:'مرحباً! اختبار الصوت.', en:'Hello! Voice test.' };
  _speak(testTexts[_chatLang] || testTexts.fr, _chatLang);
}

function _speak(text, lang) {
  if (!_ttsEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[–—→·#]/g, '')
    .replace(/\s{2,}/g, ' ').trim().substring(0, 450);
  if (!clean) return;
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang   = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fr-FR';
  utt.rate   = lang === 'ar' ? 0.82 : 0.92;
  utt.volume = 1;
  const v = _pickVoice(utt.lang.split('-')[0], 'female') || _pickVoice('en', 'female');
  if (v) { utt.voice = v; utt.lang = v.lang; }
  let timer = null;
  utt.onstart = () => {
    _isSpeaking = true;
    const sb = document.getElementById('chat-stop-speak');
    if (sb) sb.style.display = 'inline-flex';
    timer = setInterval(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 5000);
  };
  utt.onend = utt.onerror = () => {
    _isSpeaking = false;
    const sb = document.getElementById('chat-stop-speak');
    if (sb) sb.style.display = 'none';
    if (timer) clearInterval(timer);
  };
  setTimeout(() => { if (_ttsEnabled) window.speechSynthesis.speak(utt); }, 150);
}

function toggleTTS() {
  _ttsEnabled = !_ttsEnabled;
  if (!_ttsEnabled) { window.speechSynthesis?.cancel(); _isSpeaking = false; }
  const btn = document.getElementById('chat-tts');
  if (btn) { btn.textContent = _ttsEnabled ? '🔊' : '🔇'; btn.style.opacity = _ttsEnabled ? '1' : '0.4'; }
  showNotif(_ttsEnabled
    ? (_chatLang === 'ar' ? '🔊 الصوت مفعّل' : _chatLang === 'en' ? '🔊 Voice on' : '🔊 Voix activée')
    : (_chatLang === 'ar' ? '🔇 الصوت معطّل' : _chatLang === 'en' ? '🔇 Voice off' : '🔇 Voix désactivée'));
}

/* ═══════════════════════════════════════════════════════
   STT — SPEECH TO TEXT
═══════════════════════════════════════════════════════ */
function startSTT() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showNotif(_chatLang === 'ar' ? '⚠️ الميكروفون غير مدعوم — استخدم Chrome' : '⚠️ Micro non supporté — Chrome requis');
    return;
  }
  if (_sttActive) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  const mic = document.getElementById('chat-mic');
  const inp = document.getElementById('chat-input');
  const langMap = { fr:'fr-FR', ar:'ar-SA', en:'en-US' };
  rec.lang = langMap[_chatLang] || 'fr-FR';
  rec.continuous = true; rec.interimResults = true;
  if (mic) { mic.style.background = '#dc2626'; mic.textContent = '🔴'; }
  _sttActive = true;
  showNotif(_chatLang === 'ar' ? '🎤 جارٍ الاستماع...' : _chatLang === 'en' ? '🎤 Listening...' : '🎤 Parlez maintenant…');
  let finalTranscript = '', silenceTimer = null;
  rec.onresult = e => {
    finalTranscript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
    }
    if (inp && finalTranscript) inp.value = finalTranscript.trim();
    if (silenceTimer) clearTimeout(silenceTimer);
    if (finalTranscript) silenceTimer = setTimeout(() => rec.stop(), 1500);
  };
  rec.onerror = e => {
    _sttActive = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    const msgs = { 'not-allowed':'🚫 Micro refusé', 'no-speech':'🔇 Aucune parole', 'network':'🌐 Erreur réseau', 'aborted':'' };
    const m = msgs[e.error] || ('⚠️ ' + e.error);
    if (m) showNotif(m);
    if (mic) { mic.style.background = ''; mic.textContent = '🎤'; mic.onclick = startSTT; }
  };
  rec.onend = () => {
    _sttActive = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    if (mic) { mic.style.background = ''; mic.textContent = '🎤'; mic.onclick = startSTT; }
    const txt = inp ? inp.value.trim() : '';
    if (txt) setTimeout(() => envoyerChat(), 200);
  };
  mic.onclick = () => { if (_sttActive) { rec.stop(); mic.onclick = startSTT; } };
  try { rec.start(); } catch(e) { _sttActive = false; showNotif('⚠️ ' + e.message); }
}

/* ═══════════════════════════════════════════════════════
   RENDU MESSAGE
═══════════════════════════════════════════════════════ */
function formatMsg(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-size:13px;font-weight:800;color:var(--forest,#2D5016);margin:8px 0 4px;">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="margin:2px 0 2px 4px;">• $1</div>')
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace;">$1</code>');
}

function ajouterMessage(role, text, typing = false, rawHtml = false) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
  if (typing) {
    div.id = 'chat-typing-bubble';
    div.innerHTML = `<div class="chat-ava" style="background:linear-gradient(135deg,#2D5016,#5A8A30);color:#fff;">🤖</div><div class="chat-typing"><span></span><span></span><span></span></div>`;
  } else {
    const avatar = (CURRENT_USER || {}).avatar || (CURRENT_USER || {}).prenom?.[0] || 'U';
    const ava = role === 'user'
      ? `<div class="chat-ava" style="background:linear-gradient(135deg,#C4622D,#9B3E1A);color:#fff;">${avatar}</div>`
      : `<div class="chat-ava" style="background:linear-gradient(135deg,#2D5016,#5A8A30);color:#fff;">🤖</div>`;
    const content = rawHtml ? text : formatMsg(text);
    div.innerHTML = (role === 'bot' ? ava : '') +
      `<div class="chat-bubble">${content}</div>` +
      (role === 'user' ? ava : '');
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

/* ═══════════════════════════════════════════════════════
   GESTION PIÈCES JOINTES / IMAGES
   ─────────────────────────────────────────────────────
   Flux corrigé :
   1. onFileSelected() → lit le File, stocke dans _pendingImageB64/Type/Name
   2. Affiche une preview dans le chat
   3. envoyerChat() détecte _pendingImageB64 → appelle _callClaudeWithImage()
   4. _callClaudeWithImage() envoie en multimodal vers chat.php
═══════════════════════════════════════════════════════ */

function ouvrirAttachement() {
  const inp = document.getElementById('chat-file-input');
  if (inp) inp.click();
}

function onFileSelected(input) {
  const file = input.files?.[0];
  if (!file) return;

  // Seulement les images (chat.php gère le multimodal image)
  if (!file.type.startsWith('image/')) {
    showNotif('⚠️ Seules les images sont supportées (JPG, PNG, GIF, WebP)');
    input.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showNotif('❌ Image trop grande (max 5 Mo)');
    input.value = '';
    return;
  }

  // Lire et stocker en base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    _pendingImageB64  = dataUrl.split(',')[1];  // uniquement les données, sans "data:image/...;base64,"
    _pendingImageType = file.type;
    _pendingImageName = file.name;
    _afficherPreviewImage(dataUrl, file.name, file.size);
    showNotif('📷 Image prête — appuyez sur ➤ pour envoyer');
  };
  reader.onerror = () => {
    showNotif('❌ Impossible de lire l\'image');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function _afficherPreviewImage(dataUrl, fileName, fileSize) {
  // Supprimer ancienne preview si existe
  supprimerAttachement();

  const preview = document.createElement('div');
  preview.id = 'chat-attach-preview';
  preview.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;margin:0 12px 4px;background:#EAF3DE;border:1.5px solid rgba(90,138,48,.25);border-radius:10px;font-size:12px;color:#2D5016;flex-shrink:0;';

  const sizeKo = Math.round(fileSize / 1024);
  preview.innerHTML = `
    <img src="${dataUrl}" style="width:38px;height:38px;object-fit:cover;border-radius:7px;border:1px solid rgba(90,138,48,.3);">
    <div style="flex:1;min-width:0;">
      <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fileName}</div>
      <div style="font-size:10px;opacity:.7;">📎 ${sizeKo} Ko · Prêt à envoyer</div>
    </div>
    <button onclick="supprimerAttachement()" style="background:none;border:none;cursor:pointer;color:#B03030;font-size:18px;padding:2px 6px;border-radius:6px;line-height:1;" title="Annuler">✕</button>`;

  const row = document.getElementById('chat-input-row-wrap');
  if (row) {
    row.parentNode.insertBefore(preview, row);
  } else {
    // fallback: insérer avant la zone de saisie
    const win = document.getElementById('chat-window');
    if (win) win.appendChild(preview);
  }
}

function supprimerAttachement() {
  _pendingImageB64  = null;
  _pendingImageType = null;
  _pendingImageName = null;
  _attachedFile     = null;
  const preview = document.getElementById('chat-attach-preview');
  if (preview) preview.remove();
}

/* ─── Afficher la bulle utilisateur avec image ─── */
function _afficherBulleImage(dataUrl, fileName, texte) {
  const html = `
    <img src="${dataUrl}" style="max-width:180px;max-height:140px;border-radius:9px;display:block;margin-bottom:${texte ? '6px' : '0'};border:1px solid rgba(255,255,255,.3);">
    ${texte ? `<span>${texte}</span>` : ''}`;
  ajouterMessage('user', html, false, true);
}

/* ═══════════════════════════════════════════════════════
   ENVOYER MESSAGE — flux principal unifié
═══════════════════════════════════════════════════════ */
async function envoyerChat() {
  const inp  = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const q    = inp?.value?.trim() || '';

  const hasImage = !!_pendingImageB64;
  const hasText  = q.length > 0;

  if (!hasImage && !hasText) return;

  // Désactiver le bouton
  if (send) send.disabled = true;
  if (inp) { inp.value = ''; inp.style.height = 'auto'; }

  const quick = document.getElementById('chat-quick');
  if (quick) quick.style.display = 'none';

  const detectedLang = _detectLang(q);

  let reply;

  if (hasImage) {
    // ── CAS IMAGE : afficher la bulle avec preview ──
    // Reconstruire dataUrl pour affichage
    const previewImg = document.querySelector('#chat-attach-preview img');
    const displayUrl = previewImg ? previewImg.src : `data:${_pendingImageType};base64,${_pendingImageB64}`;

    _afficherBulleImage(displayUrl, _pendingImageName, q);

    // Sauvegarder les infos avant de les effacer
    const b64   = _pendingImageB64;
    const type  = _pendingImageType;
    const name  = _pendingImageName;

    // Supprimer la preview immédiatement
    supprimerAttachement();

    // Indicateur de frappe
    const tyBubble = ajouterMessage('bot', '', true);

    try {
      reply = await _callClaudeWithImage(q, b64, type, name);
    } catch(e) {
      reply = '⚠️ Erreur : ' + e.message;
    }

    tyBubble?.remove();

  } else {
    // ── CAS TEXTE SEUL ──
    ajouterMessage('user', q);
    const tyBubble = ajouterMessage('bot', '', true);

    try {
      reply = await _callClaude(q);
    } catch(e) {
      reply = '⚠️ Erreur : ' + e.message;
    }

    tyBubble?.remove();
  }

  // Afficher la réponse
  ajouterMessage('bot', reply);
  _speak(reply, detectedLang);

  if (send) send.disabled = false;
  inp?.focus();
}

function envoyerQuestion(q) {
  const inp = document.getElementById('chat-input');
  if (inp) inp.value = q;
  envoyerChat();
}

/* ═══════════════════════════════════════════════════════
   EFFACER
═══════════════════════════════════════════════════════ */
function clearChat() {
  _chatHistory = []; chatFirstOpen = true;
  supprimerAttachement();
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  const quick = document.getElementById('chat-quick');
  if (quick) { quick.style.display = 'flex'; _buildQuickButtons(); }
  showNotif(_chatLang === 'ar' ? '🗑 تم مسح المحادثة' : _chatLang === 'en' ? '🗑 Chat cleared' : '🗑 Conversation effacée');
}

/* ═══════════════════════════════════════════════════════
   OUVRIR / FERMER
═══════════════════════════════════════════════════════ */
function showChatBot() {
  const fab = document.getElementById('chat-fab');
  const win = document.getElementById('chat-window');
  if (fab) fab.style.display = 'flex';
  if (win) win.style.removeProperty('display');
}

function hideChatBot() {
  const fab = document.getElementById('chat-fab');
  const win = document.getElementById('chat-window');
  if (fab) fab.style.display = 'none';
  if (win) { win.classList.remove('open'); win.style.display = 'none'; }
  chatOpen = false;
}

function toggleChat() {
  const appScreen = document.getElementById('screen-app');
  if (appScreen) {
    const appVisible = appScreen.classList.contains('active') ||
                       window.getComputedStyle(appScreen).display !== 'none';
    if (!appVisible) return;
  }
  const win   = document.getElementById('chat-window');
  const ico   = document.getElementById('chat-fab-ico');
  const badge = document.getElementById('chat-badge');
  if (!win) return;
  chatOpen = !chatOpen;
  if (chatOpen) {
    win.style.removeProperty('display');
    win.classList.add('open');
    if (ico)   ico.textContent = '✕';
    if (badge) badge.style.display = 'none';
    win.classList.toggle('rtl', _chatLang === 'ar');
    _buildQuickButtons();
    if (chatFirstOpen) {
      chatFirstOpen = false;
      setTimeout(async () => {
        const user = (CURRENT_USER || {}).prenom || (CURRENT_USER || {}).nom || '';
        // Tester si le serveur répond
        let serverOk = false;
        try {
          const testR = await fetch('api/chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
          });
          const testD = await testR.json();
          serverOk = testD.success || testD.error === 'no_key';
        } catch(e) {}

        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${serverOk ? '#86efac' : '#fbbf24'};margin-right:4px;box-shadow:0 0 5px currentColor;"></span>`;
        const statusMsg = serverOk
          ? { fr:'✅ Serveur Claude connecté', ar:'✅ خادم Claude متصل', en:'✅ Claude server connected' }
          : { fr:'⚠️ Mode hors-ligne (XAMPP)', ar:'⚠️ وضع غير متصل', en:'⚠️ Offline mode (XAMPP)' };

        const greetings = {
          fr: `🌿 **Bonjour${user ? ' ' + user : ''} !** Je suis **AgroBot**, votre assistant IA AgriSmart.\n\n${dot}${statusMsg.fr}\n\n📷 Vous pouvez m'envoyer une **image** (bouton 📎) pour que je l'analyse.\n\n💬 Posez n'importe quelle question agricole ou cliquez sur un bouton. 🌾`,
          ar: `🌿 **مرحباً${user ? ' ' + user : ''} !** أنا **AgroBot** مساعدك الزراعي.\n\n${dot}${statusMsg.ar}\n\n📷 يمكنك إرسال **صورة** (زر 📎) لتحليلها.\n\n💬 اسألني أي شيء! 🌾`,
          en: `🌿 **Hello${user ? ' ' + user : ''} !** I'm **AgroBot**, your AgriSmart AI assistant.\n\n${dot}${statusMsg.en}\n\n📷 You can send an **image** (📎 button) for analysis.\n\n💬 Ask me anything about farming! 🌾`,
        };
        const msg = greetings[_chatLang] || greetings.fr;
        ajouterMessage('bot', msg);
        _speak(msg, _chatLang);
      }, 350);
    }
    setTimeout(() => document.getElementById('chat-input')?.focus(), 300);
  } else {
    win.classList.remove('open');
    if (ico) ico.textContent = '🤖';
    window.speechSynthesis?.cancel();
  }
}

setTimeout(() => {
  if (!chatOpen) { const b = document.getElementById('chat-badge'); if (b) b.style.display = 'flex'; }
}, 4000);

/* ═══════════════════════════════════════════════════════
   FONCTIONS MySQL — Alertes, Nœuds, Stats
═══════════════════════════════════════════════════════ */
async function loadAlertes() {
  const el = document.getElementById('alerts-body');
  if (!el) return;
  const d = await apiCall('alertes&lue=0');
  const icons = { crit:'🔴', warn:'🟡', info:'🔵', ok:'🟢' };
  if (d.success && d.alertes.length > 0) {
    el.innerHTML = d.alertes.slice(0, 5).map(a => `
      <div class="alert-item ${a.type}" style="cursor:pointer;" onclick="marquerAlerteLue(${a.id},this)">
        <div class="alert-icon">${icons[a.type] || '🔵'}</div>
        <div class="alert-body"><h4>${a.titre}</h4><p>${a.description || ''}</p><div class="alert-time">${a.time_label}</div></div>
        <span style="font-size:10px;color:#94a3b8;margin-left:auto;flex-shrink:0;">✓ Lu</span>
      </div>`).join('');
    if (d.non_lues > 0)
      document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = d.non_lues; b.style.display = ''; });
  } else {
    el.innerHTML = `<div class="alert-item ok"><div class="alert-icon">✅</div><div class="alert-body"><h4>Aucune alerte active</h4><p>Tous les capteurs fonctionnent normalement.</p></div></div>`;
  }
}

async function marquerAlerteLue(id, el) {
  const d = await apiCall('alerte_lue&id=' + id, 'POST');
  if (d.success) { el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; showNotif('✅ Alerte lue'); }
}

async function loadNoeudsLoRa() {
  const el = document.getElementById('lora-devices');
  if (!el) return;
  const d = await apiCall('noeuds');
  if (d.success && d.noeuds.length > 0) {
    el.innerHTML = d.noeuds.slice(0, 3).map(n => `
      <div class="device-row">
        <div class="device-dot dev-${n.statut}"></div>
        <div class="device-name">${n.node_id} — ${n.zone}</div>
        <div class="device-info">${n.rssi} · 🔋 ${n.batterie}%</div>
      </div>`).join('');
  }
}

async function loadDashboardStats() {
  const d = await apiCall('stats');
  if (!d.success) return;
  const statCards = document.querySelectorAll('#stats-grid .stat-val');
  if (statCards[2]) statCards[2].textContent = d.noeuds_actifs + '/6';
  if (d.alertes_actives > 0)
    document.querySelectorAll('.nav-badge').forEach(b => b.textContent = d.alertes_actives);
}

async function addAlertManual(type, titre, desc, nodeId = '') {
  return await apiCall('alerte_add', 'POST', { type, titre, description: desc, node_id: nodeId });
}

/* ═══════════════════════════════════════════════════════
   VISIBILITÉ CHATBOT — observer screen-app / screen-login
═══════════════════════════════════════════════════════ */
(function _watchAppScreen() {
  function _check() {
    const app   = document.getElementById('screen-app');
    const login = document.getElementById('screen-login');
    const fab   = document.getElementById('chat-fab');
    const win   = document.getElementById('chat-window');
    if (!fab || !win || !app) return;
    const appVisible   = app.classList.contains('active') || window.getComputedStyle(app).display !== 'none';
    const loginVisible = login && (login.classList.contains('active') || window.getComputedStyle(login).display !== 'none');
    if (appVisible && !loginVisible) {
      fab.style.display = 'flex';
      if (!chatOpen) win.style.removeProperty('display');
    } else {
      fab.style.display = 'none';
      if (!chatOpen) { win.classList.remove('open'); win.style.display = 'none'; }
    }
  }
  function _start() {
    const app   = document.getElementById('screen-app');
    const login = document.getElementById('screen-login');
    const obs   = new MutationObserver(_check);
    if (app)   obs.observe(app,   { attributes: true, attributeFilter: ['class','style'] });
    if (login) obs.observe(login, { attributes: true, attributeFilter: ['class','style'] });
    let n = 0;
    const t = setInterval(() => { _check(); if (++n >= 40) clearInterval(t); }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _start);
  else _start();
})();
