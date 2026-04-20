/* ════════════════════════════════════════════════════════════════
   AgriSmart — 10 — CHATBOT IA AVANCÉ
   ✔ Gemini AI (optionnel) + Base de connaissance locale intelligente
   ✔ Langue arabe RTL intégrée — voix adaptée sans changer l'interface
   ✔ Sélecteur de langue FR / AR / EN dans le chat
   ✔ Contexte MySQL live : capteurs, alertes, nœuds, RF
   ✔ Mémoire conversation (10 échanges)
   ✔ Voix TTS multilingue + STT microphone
   ✔ Boutons rapides adaptés au rôle et à la langue
   ✔ Pièces jointes : photos & fichiers (Gemini Vision si clé disponible)
   Fichier : 10_chat_mysql.js
════════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════════════════════════════════════════
   STUBS DE SÉCURITÉ — évite les erreurs si les autres
   scripts ne sont pas encore chargés (XAMPP éteint, etc.)
═══════════════════════════════════════════════════════ */
if (typeof apiCall === 'undefined') {
  window.apiCall = async function(endpoint, method, body) {
    try {
      const opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(`api/data.php?action=${endpoint}`, opts);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch(e) {
      return { success: false, error: e.message };
    }
  };
}
if (typeof showNotif === 'undefined') {
  window.showNotif = function(msg, duration) {
    // Notif toast simple intégré au chatbot
    let el = document.getElementById('_chat_notif_toast');
    if (!el) {
      el = document.createElement('div');
      el.id = '_chat_notif_toast';
      el.style.cssText = [
        'position:fixed','bottom:90px','right:20px','z-index:9999',
        'background:#1e293b','color:#f1f5f9','padding:8px 16px',
        'border-radius:10px','font-size:13px','font-family:Outfit,sans-serif',
        'box-shadow:0 4px 16px rgba(0,0,0,.25)','pointer-events:none',
        'transition:opacity .3s','opacity:0','max-width:280px'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, duration || 2800);
  };
}
if (typeof CURRENT_USER === 'undefined') {
  window.CURRENT_USER = null;
}
if (typeof state === 'undefined') {
  window.state = { role: 'admin' };
}

// Patch doLogin : afficher le chatbot juste après connexion réussie
document.addEventListener('DOMContentLoaded', function() {
  if (typeof doLogin === 'function') {
    var _orig = window.doLogin;
    window.doLogin = function() {
      _orig.apply(this, arguments);
      setTimeout(function() {
        var fab = document.getElementById('chat-fab');
        var win = document.getElementById('chat-window');
        var app = document.getElementById('screen-app');
        if (!app) return;
        var visible = app.classList.contains('active') ||
                      window.getComputedStyle(app).display !== 'none';
        if (visible) {
          if (fab) fab.style.display = 'flex';
          if (win) win.style.removeProperty('display');
        }
      }, 400);
    };
  }
});

/* ═══════════════════════════════════════════════════════
   ÉTAT GLOBAL
═══════════════════════════════════════════════════════ */
let chatOpen       = false;
let chatFirstOpen  = true;
let _ttsEnabled    = true;
let _sttActive     = false;
let _chatHistory   = [];
let _contextCache  = null;
let _contextTime   = 0;
let _chatLang      = 'fr';   // langue active dans le chat
let _isSpeaking    = false;  // TTS en cours (du Chatbot.tsx)
let _geminiApiKey  = '';     // Clé Gemini (optionnelle — fallback si Claude échoue)
let _recognitionRef = null;  // instance SpeechRecognition persistante
let _attachedFile   = null;  // fichier/photo attaché en attente d'envoi

/* ═══════════════════════════════════════════════════════
   INIT VOCAL + GEMINI API KEY (depuis Chatbot.tsx)
═══════════════════════════════════════════════════════ */

// Charger clé Gemini depuis env ou localStorage (compatibilité Chatbot.tsx)
(function _initGeminiKey() {
  try {
    const fromStorage = localStorage.getItem('GEMINI_API_KEY') || '';
    if (fromStorage) _geminiApiKey = fromStorage;
  } catch(e) {}
})();

// Précharger les voix TTS dès que possible (fix Chrome)
(function _initVoices() {
  if (!window.speechSynthesis) return;
  const load = () => window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = load;
  }
  load();
})();

// Sélectionner la meilleure voix pour une langue (depuis Chatbot.tsx)
function _pickVoice(langCode, preferredGender) {
  try {
    const voices = window.speechSynthesis.getVoices();
    const byLang = voices.filter(v => v.lang?.toLowerCase().startsWith(langCode.toLowerCase()));
    if (byLang.length === 0) return null;
    const genderMatch = byLang.find(v => {
      const name = (v.name || '').toLowerCase();
      return preferredGender === 'female'
        ? name.includes('female') || name.includes('woman') || name.includes('girl') || name.includes('samantha') || name.includes('victoria')
        : name.includes('male')  || name.includes('man')   || name.includes('boy')  || name.includes('daniel')   || name.includes('david');
    });
    return genderMatch || byLang[0] || null;
  } catch { return null; }
}

// Stopper la synthèse vocale immédiatement (bouton stop du Chatbot.tsx)
function stopSpeaking() {
  window.speechSynthesis?.cancel();
  _isSpeaking = false;
  const btn = document.getElementById('chat-stop-speak');
  if (btn) btn.style.display = 'none';
  const ttsBtn = document.getElementById('chat-tts');
  if (ttsBtn) ttsBtn.textContent = '🔊';
}

// Tester la voix (bouton test du Chatbot.tsx)
function testVoice() {
  const testTexts = {
    fr: 'Bonjour ! Voici un test de la synthèse vocale.',
    ar: 'مرحباً! هذا اختبار للصوت.',
    en: 'Hello! This is a voice test.',
  };
  _speak(testTexts[_chatLang] || testTexts.fr, _chatLang);
}

/* ════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   SYSTÈME PROMPT
═══════════════════════════════════════════════════════ */
const SYSTEM_PROMPT = `Tu es AgroBot, l'assistant IA d'AgriSmart — plateforme intelligente d'agriculture de précision (XAMPP/MySQL).

## IDENTITÉ
- Nom : AgroBot
- Expert : agronome + data scientist IoT agricole
- Langue : réponds TOUJOURS dans la langue de l'utilisateur (FR/AR/EN)
- En arabe : utilise l'arabe standard moderne (MSA), direction RTL

## AGRISMART — MODULES
### 🌲 Random Forest (RF)
- 100 arbres de décision, précision **98%**
- 8 paramètres : pH, humidité sol, N, P, K, température, précipitations, humidité air
- 12 cultures : Riz, Blé, Maïs, Coton, Pois chiche, Café, Tournesol, Tomate, Soja, Pomme de terre, Mangue, Raisin
- Confiance > 75% = très fiable | 55-75% = fiable | < 55% = vérifier capteurs

### 📈 LSTM
- Réseau de neurones récurrent, précision **92.4%**, MAE 0.023
- Prédit humidité sol + température sur **7 jours**
- Seuil critique : **35%** humidité sol → irriguer
- 4 portes : oubli (f_t), entrée (i_t), candidat (g_t), sortie (o_t)

### 📡 IoT — ESP32 + LoRaWAN
- 6 nœuds ESP32, mesures toutes les **10 secondes**
- Capteurs : T°, Humidité sol/air, pH, N, P, K, Luminosité, CO2
- LoRaWAN 868MHz → 15 km, autonomie **287 jours**
- SF7 (rapide) → SF12 (longue portée)
- RSSI bon signal : > -100 dBm

### 🧪 Agronomie
pH < 5.5 → chaux 500-1000 kg/ha | pH > 7.5 → soufre 50 kg/ha
H.sol < 20% → irrigation urgente (12h) | 20-35% → 24-48h | 35-70% → OK | > 85% → drainage
N < 40 kg/ha → urée 46% (80-120 kg/ha) | P < 25 → superphosphate | K < 30 → sulfate potasse

### 👥 Utilisateurs
Rôles : Admin (accès total), Agriculteur (RF+LSTM+historique), Technicien (IoT+capteurs)
CRUD MySQL via api/users.php

## DONNÉES LIVE (injectées dans chaque message)
Utilise les données temps réel pour des conseils personnalisés et précis.

## RÈGLES
1. Langue = langue détectée dans le message (FR/AR/EN)
2. Markdown : **gras**, listes, emojis agricoles
3. Max 300 mots sauf explication technique
4. Commente les données live si disponibles
5. Personnalise avec le prénom si disponible`;

/* ═══════════════════════════════════════════════════════
   CONTEXTE MYSQL LIVE
═══════════════════════════════════════════════════════ */
async function _getLiveContext() {
  const now = Date.now();
  if (_contextCache && (now - _contextTime) < 30000) return _contextCache;
  const parts = [];
  try {
    const cap = await apiCall('capteurs_live');
    if (cap.success && cap.capteurs?.length > 0) {
      const avg = k => { const v=cap.capteurs.map(c=>parseFloat(c[k])).filter(v=>!isNaN(v)&&v>0); return v.length?(v.reduce((a,b)=>a+b,0)/v.length):null; };
      const T=avg('temperature'),Hs=avg('humidite_sol'),Ha=avg('humidite_air'),pH=avg('ph'),N=avg('azote'),P=avg('phosphore'),K=avg('potassium'),Lu=avg('luminosite'),Co=avg('co2');
      parts.push(`## CAPTEURS IoT EN TEMPS RÉEL (${cap.capteurs.length} nœuds)
- 🌡️ T° : ${T?T.toFixed(1)+'°C':'N/A'} | 💧 H.sol : ${Hs?Math.round(Hs)+'%':'N/A'}${Hs<20?' ⚠️URGENT':Hs<35?' ⚠️faible':' ✅'}
- 🧪 pH : ${pH?pH.toFixed(1):'N/A'}${pH<5.5?' ⚠️acide':pH>7.5?' ⚠️alcalin':' ✅'} | 🌧️ H.air : ${Ha?Math.round(Ha)+'%':'N/A'}
- 🌿 N : ${N?Math.round(N)+' kg/ha':'N/A'}${N<40?' ⚠️déficit':''} | ⚗️ P : ${P?Math.round(P)+' kg/ha':'N/A'}${P<25?' ⚠️':''}
- 🔬 K : ${K?Math.round(K)+' kg/ha':'N/A'} | ☀️ Lux : ${Lu?Math.round(Lu):'N/A'} | 🌫️ CO2 : ${Co?Math.round(Co)+' ppm':'N/A'}
- Nœuds : ${cap.capteurs.map(c=>`${c.node_id}(pH:${c.ph},Hs:${c.humidite_sol}%,T:${c.temperature}°C)`).join(' | ')}`);
    }
  } catch(e) {}
  try {
    const al = await apiCall('alertes&lue=0');
    if (al.success && al.alertes?.length > 0) {
      parts.push(`## ALERTES ACTIVES (${al.alertes.length})\n${al.alertes.slice(0,5).map(a=>`- [${a.type?.toUpperCase()}] ${a.titre}: ${a.description||''}`).join('\n')}`);
    } else { parts.push(`## ALERTES : Aucune alerte active ✅`); }
  } catch(e) {}
  try {
    const nd = await apiCall('noeuds');
    if (nd.success && nd.noeuds?.length > 0) {
      const on = nd.noeuds.filter(n=>n.statut==='online').length;
      parts.push(`## NŒUDS IoT (${nd.noeuds.length} total, ${on} en ligne)\n${nd.noeuds.map(n=>`- ${n.node_id}|${n.zone}|Bat:${n.batterie}%|RSSI:${n.rssi}|SF:${n.sf}|${n.statut}`).join('\n')}`);
    }
  } catch(e) {}
  try {
    const rf = await apiCall('rf_history');
    if (rf.success && rf.predictions?.length > 0) {
      const l = rf.predictions[0];
      parts.push(`## DERNIÈRE PRÉDICTION RF\n- Culture : ${l.emoji||''} ${l.culture} | Confiance : ${l.confiance}% | pH:${l.ph}, Hs:${l.humidite_sol}%, T:${l.temperature}°C`);
    }
  } catch(e) {}
  if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) {
    parts.push(`## UTILISATEUR\nPrénom: ${CURRENT_USER.prenom||CURRENT_USER.nom} | Rôle: ${CURRENT_USER.role_label||CURRENT_USER.role}`);
  }
  _contextCache = parts.join('\n\n');
  _contextTime  = now;
  return _contextCache;
}

/* ═══════════════════════════════════════════════════════
   MOTEUR DE RÉPONSE — Gemini (optionnel) + Local KB
═══════════════════════════════════════════════════════ */
async function _callClaude(userMessage) {
  // Récupérer le contexte live MySQL
  const liveCtx = await _getLiveContext();
  _chatHistory.push({ role:'user', content: userMessage });
  if (_chatHistory.length > 20) _chatHistory = _chatHistory.slice(-20);

  // ── Essai : Gemini si clé disponible ─────────────────────
  if (_geminiApiKey) {
    try {
      const geminiHistory = _chatHistory.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      const _MODELS_TEXT = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
      let _gReply = '';
      for (const _m of _MODELS_TEXT) {
        try {
          const _r = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + _m + ':generateContent?key=' + _geminiApiKey,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { role: 'user',  parts: [{ text: SYSTEM_PROMPT + (liveCtx ? '\n\n' + liveCtx : '') }] },
                  { role: 'model', parts: [{ text: 'Bonjour ! Je suis AgroBot, votre assistant AgriSmart.' }] },
                  ...geminiHistory,
                ],
                generationConfig: { temperature: 0.8, topK: 30, topP: 0.9, maxOutputTokens: 700 }
              }),
            }
          );
          const _d = await _r.json();
          _gReply = _d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (_r.ok && _gReply.length > 20) break;
          const _e = _d?.error?.message || '';
          if (!_e.includes('quota') && !_e.includes('RESOURCE_EXHAUSTED') && _r.status !== 429 && _r.status !== 404) break;
          console.warn('[AgroBot] text', _m, 'quota/404 → suivant');
          _gReply = '';
        } catch(e) { _gReply = ''; }
      }
      if (_gReply && _gReply.length > 20) {
        _chatHistory.push({ role:'assistant', content: _gReply.trim() });
        return _gReply.trim();
      }
    } catch(geminiErr) {
      console.warn('[AgroBot] Gemini indisponible:', geminiErr.message);
    }
  }

  // ── Fallback local intelligent (toujours disponible) ─────
  _chatHistory.pop();
  const reply = _fallbackLocal(userMessage);
  _chatHistory.push({ role:'assistant', content: reply });
  return reply;
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
   FALLBACK LOCAL INTELLIGENT — répond à TOUTE question
═══════════════════════════════════════════════════════ */

// Base de connaissances étendue — couvre tous les thèmes AgriSmart
const _KB = [
  /* ── Random Forest ── */
  { k:['random forest','rf','forêt','foret','culture recommand','planter','quelle culture','quel crop','crop recommend','recommend','recommand','أي محصول','غابة','توصية محصول','اختيار محصول'],
    fr:`🌲 **Random Forest — Recommandation de Culture**\n\n**Comment ça marche ?**\n- 100 arbres de décision votent en parallèle\n- Précision : **98%** sur 12 cultures\n- 8 paramètres analysés : pH, humidité sol, N, P, K, température, précipitations, humidité air\n\n**Cultures disponibles :**\n🌾 Riz · Blé · Maïs · Coton · Soja · Tournesol · Café · Tomate · Pois chiche · Pomme de terre · Mangue · Raisin\n\n**Interprétation :**\n- ✅ Confiance **> 75%** = très fiable, plantez !\n- 🟡 **55-75%** = fiable, vérifiez les capteurs\n- 🔴 **< 55%** = recalibrez les capteurs d'abord\n\n👉 Menu **"Random Forest"** → ajustez les 8 curseurs → **"Lancer l'Analyse"**`,
    ar:`🌲 **الغابة العشوائية — توصية المحصول**\n\n**كيف تعمل؟**\n- 100 شجرة قرار تصوّت في آنٍ واحد\n- الدقة: **98%** على 12 محصولاً\n- 8 معاملات: pH، رطوبة التربة، N، P، K، الحرارة، الأمطار، رطوبة الهواء\n\n**المحاصيل المتاحة:**\n🌾 أرز · قمح · ذرة · قطن · صويا · عباد الشمس · قهوة · طماطم · حمص · بطاطا · مانجو · عنب\n\n**التفسير:**\n- ✅ ثقة **> 75%** = موثوق جداً، ازرع!\n- 🟡 **55-75%** = موثوق، تحقق من المستشعرات\n- 🔴 **< 55%** = أعد معايرة المستشعرات أولاً\n\n👉 قائمة **"Random Forest"** → اضبط 8 أشرطة → **"تشغيل التحليل"**`,
    en:`🌲 **Random Forest — Crop Recommendation**\n\n**How it works:**\n- 100 decision trees vote simultaneously\n- Accuracy: **98%** across 12 crops\n- 8 parameters: pH, soil moisture, N, P, K, temperature, rainfall, air humidity\n\n**Available crops:**\n🌾 Rice · Wheat · Maize · Cotton · Soybean · Sunflower · Coffee · Tomato · Chickpea · Potato · Mango · Grape\n\n**Confidence guide:**\n- ✅ **> 75%** = very reliable, plant it!\n- 🟡 **55-75%** = reliable, check sensors\n- 🔴 **< 55%** = recalibrate sensors first\n\n👉 Menu **"Random Forest"** → set 8 sliders → **"Run Analysis"**`},

  /* ── LSTM / Prévision / Météo ── */
  { k:['lstm','prévision','prevision','rendement','météo','meteo','futur','forecast','prédiction','prediction','7 jour','7 day','7 أيام','توقع','مستقبل','تنبؤ','température future','future temperature'],
    fr:`📈 **LSTM — Prévision 7 Jours**\n\n**Architecture :**\n- Réseau de neurones récurrent avec 4 portes\n- 🚪 Oubli (f_t) · Entrée (i_t) · Candidat (g_t) · Sortie (o_t)\n- Précision : **92.4%** | MAE : **0.023**\n\n**Ce qu'il prédit :**\n- 💧 Humidité sol sur 7 jours\n- 🌡️ Température sur 7 jours\n\n**Seuils critiques :**\n- 🔴 **< 35%** humidité → planifiez l'irrigation\n- 🟡 **35-50%** → surveillance renforcée\n- ✅ **50-70%** → conditions optimales\n\n👉 Menu **"Prévisions LSTM"** pour voir les courbes`,
    ar:`📈 **LSTM — توقعات 7 أيام**\n\n**البنية:**\n- شبكة عصبية تكرارية بـ 4 بوابات\n- 🚪 نسيان · إدخال · مرشح · إخراج\n- الدقة: **92.4%** | MAE: **0.023**\n\n**ما يتنبأ به:**\n- 💧 رطوبة التربة لـ 7 أيام\n- 🌡️ درجة الحرارة لـ 7 أيام\n\n**العتبات الحرجة:**\n- 🔴 **< 35%** رطوبة → خطط للري\n- 🟡 **35-50%** → مراقبة مكثفة\n- ✅ **50-70%** → ظروف مثالية\n\n👉 قائمة **"توقعات LSTM"** لرؤية المنحنيات`,
    en:`📈 **LSTM — 7-Day Forecast**\n\n**Architecture:**\n- Recurrent neural network with 4 gates\n- 🚪 Forget · Input · Candidate · Output\n- Accuracy: **92.4%** | MAE: **0.023**\n\n**What it predicts:**\n- 💧 Soil moisture for 7 days\n- 🌡️ Temperature for 7 days\n\n**Critical thresholds:**\n- 🔴 **< 35%** moisture → plan irrigation\n- 🟡 **35-50%** → close monitoring\n- ✅ **50-70%** → optimal conditions\n\n👉 Menu **"LSTM Forecast"** to view charts`},

  /* ── IoT / Capteurs / ESP32 / LoRa ── */
  { k:['lorawan','lora','esp32','capteur','iot','signal','rssi','noeud','nœud','batterie','battery','مستشعر','لورا','عقدة','بطارية','sf7','sf12','868','node','sensor'],
    fr:`📡 **IoT — ESP32 + LoRaWAN**\n\n**Réseau de capteurs :**\n- 6 nœuds ESP32, mesures toutes les **10 secondes**\n- Capteurs : T°, Humidité sol/air, pH, N, P, K, Luminosité, CO2\n\n**Connectivité LoRaWAN 868MHz :**\n- Portée : **15 km** | Autonomie batterie : **287 jours**\n- SF7 → rapide/proche | SF12 → longue portée\n- ✅ Bon signal : RSSI **> -100 dBm**\n- ⚠️ Signal faible : RSSI **< -115 dBm** → réduire SF\n\n**Si batterie faible (< 20%) :**\nRecharger ou remplacer sous 48h\n\n**Si nœud offline :**\nVérifier alimentation, distance, obstacles (bâtiments, arbres denses)`,
    ar:`📡 **IoT — ESP32 + LoRaWAN**\n\n**شبكة المستشعرات:**\n- 6 عقد ESP32، قياس كل **10 ثوانٍ**\n- المستشعرات: T°، رطوبة التربة/الهواء، pH، N، P، K، الإضاءة، CO2\n\n**LoRaWAN 868MHz:**\n- المدى: **15 كم** | عمر البطارية: **287 يوم**\n- SF7 → سريع/قريب | SF12 → مدى طويل\n- ✅ إشارة جيدة: RSSI **> -100 dBm**\n- ⚠️ إشارة ضعيفة: RSSI **< -115 dBm** → قلل SF\n\n**إذا كانت البطارية منخفضة (< 20%):**\nاشحن أو استبدل خلال 48 ساعة`,
    en:`📡 **IoT — ESP32 + LoRaWAN**\n\n**Sensor network:**\n- 6 ESP32 nodes, readings every **10 seconds**\n- Sensors: T°, Soil/Air humidity, pH, N, P, K, Light, CO2\n\n**LoRaWAN 868MHz:**\n- Range: **15 km** | Battery life: **287 days**\n- SF7 → fast/close | SF12 → long range\n- ✅ Good signal: RSSI **> -100 dBm**\n- ⚠️ Weak signal: RSSI **< -115 dBm** → lower SF\n\n**Low battery (< 20%):**\nCharge or replace within 48h`},

  /* ── Sol / pH / Engrais / NPK ── */
  { k:['ph','acide','alcalin','chaux','soufre','sol','terre','engrais','azote','phosphore','potassium','npk','urée','uree','fertilisant','amendment','حموضة','تربة','سماد','نيتروجين','فوسفور','بوتاسيوم','كبريت','جير','تعديل','correction'],
    fr:`🧪 **Gestion du Sol — pH & Fertilisation**\n\n**Correction pH :**\n- 🔴 **pH < 5.5** (trop acide) → Chaux agricole : **500-1000 kg/ha**\n- 🔵 **pH > 7.5** (trop alcalin) → Soufre : **50 kg/ha**\n- ✅ pH idéal : **6.0 – 7.0**\n\n**Fertilisation NPK :**\n- 🌿 **N < 40 kg/ha** → Urée 46% : **80-120 kg/ha**\n- ⚗️ **P < 25 kg/ha** → Superphosphate triple\n- 🔬 **K < 30 kg/ha** → Sulfate de potasse\n\n**Conseil :** Toujours tester le sol AVANT d'amender.\nUn pH équilibré multiplie l'efficacité des engrais par **2 à 3×**.`,
    ar:`🧪 **إدارة التربة — pH والتسميد**\n\n**تصحيح pH:**\n- 🔴 **pH < 5.5** (حمضي) → جير زراعي: **500-1000 كغ/هكتار**\n- 🔵 **pH > 7.5** (قلوي) → كبريت: **50 كغ/هكتار**\n- ✅ pH مثالي: **6.0 – 7.0**\n\n**تسميد NPK:**\n- 🌿 **N < 40** → يوريا 46%: **80-120 كغ/هكتار**\n- ⚗️ **P < 25** → سوبر فوسفات ثلاثي\n- 🔬 **K < 30** → كبريتات البوتاسيوم\n\n**نصيحة:** اختبر التربة دائماً قبل التعديل.\npH متوازن يضاعف فعالية الأسمدة **2 إلى 3 أضعاف**.`,
    en:`🧪 **Soil Management — pH & Fertilization**\n\n**pH correction:**\n- 🔴 **pH < 5.5** (too acidic) → Agricultural lime: **500-1000 kg/ha**\n- 🔵 **pH > 7.5** (too alkaline) → Sulfur: **50 kg/ha**\n- ✅ Ideal pH: **6.0 – 7.0**\n\n**NPK fertilization:**\n- 🌿 **N < 40 kg/ha** → Urea 46%: **80-120 kg/ha**\n- ⚗️ **P < 25 kg/ha** → Triple superphosphate\n- 🔬 **K < 30 kg/ha** → Potassium sulfate\n\n**Tip:** Always test soil BEFORE amending.\nBalanced pH multiplies fertilizer efficiency by **2-3×**.`},

  /* ── Irrigation / Eau ── */
  { k:['irrigu','humidité sol','humidite sol','arros','irrigation','eau','sec','drought','secher','quand irriguer','when to water','when irrigate','drainage','ري','رطوبة التربة','جفاف','ماء','متى أروي','متى الري'],
    fr:`💧 **Guide d'Irrigation**\n\n**Décision basée sur l'humidité du sol :**\n- 🔴 **< 20%** → **Irrigation d'urgence** (dans les 12h !)\n- 🟡 **20-35%** → Irriguer dans les 24-48h\n- ✅ **35-70%** → Optimal, pas besoin d'irriguer\n- 🌊 **> 85%** → Vérifiez le drainage (risque de noyade des racines)\n\n**Facteurs qui accélèrent le séchage :**\n- Température > 30°C → consommation +40%\n- Vent fort → évapotranspiration élevée\n- Sol sableux → retient moins l'eau\n\n**Astuce :** Irriguer tôt le matin (6h-8h) réduit l'évaporation de **30%**.`,
    ar:`💧 **دليل الري**\n\n**القرار بناءً على رطوبة التربة:**\n- 🔴 **< 20%** → **ري طارئ** (خلال 12 ساعة!)\n- 🟡 **20-35%** → اسقِ خلال 24-48 ساعة\n- ✅ **35-70%** → مثالي، لا حاجة للري\n- 🌊 **> 85%** → تحقق من الصرف (خطر الإغراق)\n\n**عوامل تسرّع الجفاف:**\n- حرارة > 30°C → استهلاك أعلى بـ 40%\n- رياح قوية → تبخر مرتفع\n- تربة رملية → تحتفظ بالماء أقل\n\n**نصيحة:** الري صباحاً (6-8 صباحاً) يقلل التبخر **30%**.`,
    en:`💧 **Irrigation Guide**\n\n**Decision based on soil moisture:**\n- 🔴 **< 20%** → **Emergency irrigation** (within 12h!)\n- 🟡 **20-35%** → Irrigate within 24-48h\n- ✅ **35-70%** → Optimal, no irrigation needed\n- 🌊 **> 85%** → Check drainage (root flooding risk)\n\n**Factors that speed up drying:**\n- Temperature > 30°C → consumption +40%\n- Strong wind → high evapotranspiration\n- Sandy soil → retains less water\n\n**Tip:** Irrigating early morning (6-8am) reduces evaporation by **30%**.`},

  /* ── Alertes ── */
  { k:['alerte','alert','alarme','warning','notification','تنبيه','إنذار','تحذير','أي تنبيه','active alert'],
    fr:`⚠️ **Système d'Alertes AgriSmart**\n\n**Types d'alertes :**\n- 🔴 **CRIT** — Situation critique (pH < 4.5, humidité < 10%)\n- 🟡 **WARN** — Avertissement (seuil proche)\n- 🔵 **INFO** — Information utile\n- 🟢 **OK** — Retour à la normale\n\n**Pour voir les alertes actives :**\n👉 Tableau de bord → section **"Alertes"**\n\n**Pour les marquer comme lues :**\nCliquez sur l'alerte → **✓ Lu**\n\n📊 Les alertes sont générées automatiquement par les capteurs IoT en temps réel.`,
    ar:`⚠️ **نظام التنبيهات في AgriSmart**\n\n**أنواع التنبيهات:**\n- 🔴 **حرج** — حالة خطيرة (pH < 4.5، رطوبة < 10%)\n- 🟡 **تحذير** — اقتراب من العتبة\n- 🔵 **معلومة** — معلومة مفيدة\n- 🟢 **طبيعي** — عودة إلى الوضع الطبيعي\n\n**لرؤية التنبيهات النشطة:**\n👉 لوحة التحكم → قسم **"التنبيهات"**\n\n📊 تُولَّد التنبيهات تلقائياً من مستشعرات IoT في الوقت الفعلي.`,
    en:`⚠️ **AgriSmart Alert System**\n\n**Alert types:**\n- 🔴 **CRIT** — Critical situation (pH < 4.5, moisture < 10%)\n- 🟡 **WARN** — Warning (near threshold)\n- 🔵 **INFO** — Useful information\n- 🟢 **OK** — Back to normal\n\n**To view active alerts:**\n👉 Dashboard → **"Alerts"** section\n\n**To mark as read:**\nClick the alert → **✓ Read**\n\n📊 Alerts are generated automatically by IoT sensors in real time.`},

  /* ── Gestion Utilisateurs ── */
  { k:['admin','utilisateur','compte','gestion','ajouter','supprimer','rôle','role','mot de passe','password','accès','access','إضافة','مستخدم','حذف','مدير','كلمة المرور','صلاحيات','دور'],
    fr:`👥 **Gestion des Utilisateurs**\n\n**Rôles disponibles :**\n- 👑 **Admin** — Accès total (tous les modules + gestion)\n- 🌾 **Agriculteur** — RF + LSTM + historique capteurs\n- 🔧 **Technicien** — IoT + capteurs + maintenance\n\n**Actions Admin :**\n➕ Ajouter un utilisateur → bouton **+Ajouter**\n✏️ Modifier → icône **✏️** sur la ligne\n🗑 Supprimer → icône **🗑** (confirmation requise)\n🔑 Réinitialiser mot de passe → icône **🔑**\n\n👉 Menu **"Administration"** → onglet **"Utilisateurs"**\n\nLes données sont stockées dans MySQL via **api/users.php**.`,
    ar:`👥 **إدارة المستخدمين**\n\n**الأدوار المتاحة:**\n- 👑 **مدير** — وصول كامل (جميع الوحدات + الإدارة)\n- 🌾 **مزارع** — RF + LSTM + سجل المستشعرات\n- 🔧 **تقني** — IoT + مستشعرات + صيانة\n\n**إجراءات المدير:**\n➕ إضافة مستخدم → زر **+إضافة**\n✏️ تعديل → أيقونة **✏️**\n🗑 حذف → أيقونة **🗑** (يتطلب تأكيداً)\n🔑 إعادة تعيين كلمة المرور → أيقونة **🔑**\n\n👉 قائمة **"الإدارة"** → تبويب **"المستخدمون"**`,
    en:`👥 **User Management**\n\n**Available roles:**\n- 👑 **Admin** — Full access (all modules + management)\n- 🌾 **Farmer** — RF + LSTM + sensor history\n- 🔧 **Technician** — IoT + sensors + maintenance\n\n**Admin actions:**\n➕ Add user → **+Add** button\n✏️ Edit → **✏️** icon on row\n🗑 Delete → **🗑** icon (confirmation required)\n🔑 Reset password → **🔑** icon\n\n👉 Menu **"Administration"** → **"Users"** tab\n\nData stored in MySQL via **api/users.php**.`},

  /* ── Maladies / Ravageurs / Protection ── */
  { k:['maladie','disease','pest','ravageur','insecte','champignon','fungus','parasite','traitement','traiter','protect','protection','spray','مرض','آفة','حشرة','فطر','علاج','حماية','رش','وقاية'],
    fr:`🌿 **Protection des Cultures**\n\n**Signaux d'alarme dans vos données :**\n- Humidité air **> 80%** + T° **18-25°C** → risque fongique élevé\n- Luminosité anormalement basse → surveiller les insectes\n- CO2 élevé près du sol → fermentation / pourriture racinaire\n\n**Méthodes de protection :**\n- 🍄 Champignons → fongicide préventif (bouillie bordelaise)\n- 🐛 Insectes → traitement biologique (neem, pyrèthre) ou chimique\n- 🦠 Bactéries → cuivre ou antibiotiques homologués\n\n**Suivi :** Consultez les données IoT quotidiennement pour détecter les anomalies tôt.`,
    ar:`🌿 **حماية المحاصيل**\n\n**إشارات الخطر في بياناتك:**\n- رطوبة هواء **> 80%** + حرارة **18-25°C** → خطر فطري مرتفع\n- إضاءة منخفضة بشكل غير طبيعي → راقب الحشرات\n- CO2 مرتفع قرب التربة → تخمر / تعفن الجذور\n\n**طرق الحماية:**\n- 🍄 فطريات → مبيد فطري وقائي\n- 🐛 حشرات → علاج بيولوجي أو كيميائي\n- 🦠 بكتيريا → نحاس أو مضادات حيوية معتمدة\n\n**المتابعة:** راجع بيانات IoT يومياً للكشف المبكر عن الشذوذات.`,
    en:`🌿 **Crop Protection**\n\n**Warning signals in your data:**\n- Air humidity **> 80%** + T° **18-25°C** → high fungal risk\n- Abnormally low light → monitor for insects\n- High CO2 near soil → fermentation / root rot\n\n**Protection methods:**\n- 🍄 Fungi → preventive fungicide (Bordeaux mixture)\n- 🐛 Insects → biological (neem, pyrethrin) or chemical treatment\n- 🦠 Bacteria → copper or registered antibiotics\n\n**Monitoring:** Check IoT data daily for early anomaly detection.`},

  /* ── AgriSmart général / Comment utiliser ── */
  { k:['agrismart','plateforme','comment utiliser','how to use','dashboard','tableau de bord','module','menu','navigation','كيف أستخدم','لوحة التحكم','النظام','المنصة'],
    fr:`🌾 **AgriSmart — Guide d'utilisation**\n\n**Modules principaux :**\n- 🌲 **Random Forest** — Recommandation de culture (98% précision)\n- 📈 **LSTM** — Prévisions sur 7 jours\n- 📡 **IoT Dashboard** — Capteurs en temps réel\n- ⚠️ **Alertes** — Notifications automatiques\n- 👥 **Administration** — Gestion utilisateurs\n\n**Workflow recommandé :**\n➊ Vérifier les alertes actives\n➋ Consulter les données capteurs live\n➌ Lancer une analyse RF pour la culture\n➍ Voir les prévisions LSTM (7 jours)\n➎ Agir selon les recommandations\n\n💬 Posez-moi n'importe quelle question !`,
    ar:`🌾 **AgriSmart — دليل الاستخدام**\n\n**الوحدات الرئيسية:**\n- 🌲 **الغابة العشوائية** — توصية المحصول (دقة 98%)\n- 📈 **LSTM** — توقعات 7 أيام\n- 📡 **لوحة IoT** — مستشعرات في الوقت الفعلي\n- ⚠️ **التنبيهات** — إشعارات تلقائية\n- 👥 **الإدارة** — إدارة المستخدمين\n\n**سير العمل الموصى به:**\n➊ تحقق من التنبيهات النشطة\n➋ راجع بيانات المستشعرات\n➌ شغّل تحليل RF للمحصول\n➍ انظر توقعات LSTM\n➎ تصرّف وفق التوصيات\n\n💬 اسألني أي شيء!`,
    en:`🌾 **AgriSmart — Usage Guide**\n\n**Main modules:**\n- 🌲 **Random Forest** — Crop recommendation (98% accuracy)\n- 📈 **LSTM** — 7-day forecasts\n- 📡 **IoT Dashboard** — Real-time sensors\n- ⚠️ **Alerts** — Automatic notifications\n- 👥 **Administration** — User management\n\n**Recommended workflow:**\n➊ Check active alerts\n➋ Review live sensor data\n➌ Run RF analysis for crop selection\n➍ View LSTM forecasts (7 days)\n➎ Act on recommendations\n\n💬 Ask me anything!`},

  /* ── Salutations / Aide générale ── */
  { k:['bonjour','bonsoir','salut','hello','salam','مرحبا','أهلا','السلام','hi ','coucou','hey ','aide','help','qui es-tu','who are you','what are you','من أنت','ما هو'],
    fr:`🌿 **Bonjour ! Je suis AgroBot 🤖**\n\nAssistant IA d'AgriSmart — agriculture de précision.\n\n**Je peux vous aider sur :**\n- 🌲 Recommandation de culture (Random Forest)\n- 📈 Prévisions météo 7 jours (LSTM)\n- 📡 Analyse des capteurs IoT\n- 🧪 Correction sol (pH, NPK)\n- 💧 Gestion de l'irrigation\n- ⚠️ Interprétation des alertes\n- 👥 Administration des comptes\n\nJe parle 🇫🇷 FR · 🇩🇿 AR · 🇬🇧 EN — changez la langue ci-dessus.\n\n**Posez n'importe quelle question ! 🌾**`,
    ar:`🌿 **مرحباً! أنا AgroBot 🤖**\n\nمساعد ذكاء اصطناعي لـ AgriSmart — الزراعة الدقيقة.\n\n**يمكنني مساعدتك في:**\n- 🌲 توصية المحصول (الغابة العشوائية)\n- 📈 توقعات الطقس 7 أيام (LSTM)\n- 📡 تحليل مستشعرات IoT\n- 🧪 تصحيح التربة (pH، NPK)\n- 💧 إدارة الري\n- ⚠️ تفسير التنبيهات\n- 👥 إدارة الحسابات\n\nأتحدث 🇫🇷 FR · 🇩🇿 AR · 🇬🇧 EN — غيّر اللغة أعلاه.\n\n**اسألني أي شيء! 🌾**`,
    en:`🌿 **Hello! I'm AgroBot 🤖**\n\nAgriSmart AI assistant — precision agriculture.\n\n**I can help you with:**\n- 🌲 Crop recommendation (Random Forest)\n- 📈 7-day weather forecasts (LSTM)\n- 📡 IoT sensor analysis\n- 🧪 Soil correction (pH, NPK)\n- 💧 Irrigation management\n- ⚠️ Alert interpretation\n- 👥 Account management\n\nI speak 🇫🇷 FR · 🇩🇿 AR · 🇬🇧 EN — switch language above.\n\n**Ask me anything! 🌾**`},

  /* ── Riz, Blé, Maïs, cultures spécifiques ── */
  { k:['riz','rice','blé','wheat','maïs','mais','maize','coton','cotton','café','coffee','tomate','tomato','soja','soybean','tournesol','sunflower','mangue','mango','raisin','grape','pomme de terre','potato','chickpea','pois chiche','أرز','قمح','ذرة','قطن','قهوة','طماطم','صويا','عباد الشمس','مانجو','عنب','بطاطا','حمص'],
    fr:`🌾 **Cultures — Conditions Optimales**\n\n| Culture | pH optimal | H.sol % | T°C |\n|---------|-----------|---------|-----|\n| 🌾 Riz | 5.5-7.0 | 70-85% | 20-35°C |\n| 🌾 Blé | 6.0-7.5 | 45-65% | 15-25°C |\n| 🌽 Maïs | 5.8-7.0 | 50-70% | 18-32°C |\n| 🍅 Tomate | 6.0-6.8 | 60-75% | 18-30°C |\n| 🥔 Pomme de t. | 5.0-6.5 | 55-70% | 15-20°C |\n| ☕ Café | 6.0-6.5 | 60-75% | 18-24°C |\n\n**Pour des conditions précises :** Utilisez Random Forest avec vos capteurs live !`,
    ar:`🌾 **المحاصيل — الظروف المثلى**\n\n| المحصول | pH مثالي | رطوبة % | T°C |\n|---------|---------|---------|-----|\n| 🌾 أرز | 5.5-7.0 | 70-85% | 20-35°C |\n| 🌾 قمح | 6.0-7.5 | 45-65% | 15-25°C |\n| 🌽 ذرة | 5.8-7.0 | 50-70% | 18-32°C |\n| 🍅 طماطم | 6.0-6.8 | 60-75% | 18-30°C |\n| 🥔 بطاطا | 5.0-6.5 | 55-70% | 15-20°C |\n| ☕ قهوة | 6.0-6.5 | 60-75% | 18-24°C |\n\n**للحصول على ظروف دقيقة:** استخدم الغابة العشوائية مع مستشعراتك!`,
    en:`🌾 **Crops — Optimal Conditions**\n\n| Crop | Optimal pH | H.soil % | T°C |\n|------|-----------|---------|-----|\n| 🌾 Rice | 5.5-7.0 | 70-85% | 20-35°C |\n| 🌾 Wheat | 6.0-7.5 | 45-65% | 15-25°C |\n| 🌽 Maize | 5.8-7.0 | 50-70% | 18-32°C |\n| 🍅 Tomato | 6.0-6.8 | 60-75% | 18-30°C |\n| 🥔 Potato | 5.0-6.5 | 55-70% | 15-20°C |\n| ☕ Coffee | 6.0-6.5 | 60-75% | 18-24°C |\n\n**For precise conditions:** Use Random Forest with your live sensors!`},

  /* ── Données live / Capteurs live ── */
  { k:['live','direct','maintenant','actuel','temps réel','real time','current','données','data','mesure','lecture','en ce moment','الآن','مباشر','بيانات','قراءة','حالياً'],
    fr:`📊 **Données Live — Comment les Consulter**\n\nLes capteurs mesurent toutes les **10 secondes** :\n\n**Accès rapide :**\n- 📡 Tableau de bord → widget **"Capteurs IoT"**\n- 💬 Tapez ici : *"Montre-moi les données live"*\n\n**Paramètres mesurés :**\n🌡️ Température · 💧 Humidité sol & air · 🧪 pH\n🌿 Azote (N) · ⚗️ Phosphore (P) · 🔬 Potassium (K)\n☀️ Luminosité · 🌫️ CO2\n\n**Pour une analyse en temps réel**, le chatbot injecte automatiquement vos données live dans chaque réponse IA (si XAMPP est démarré).`,
    ar:`📊 **البيانات المباشرة — كيفية الاطلاع عليها**\n\nتقيس المستشعرات كل **10 ثوانٍ** :\n\n**وصول سريع:**\n- 📡 لوحة التحكم → أداة **"مستشعرات IoT"**\n- 💬 اكتب هنا: *"أرني البيانات الآن"*\n\n**المعاملات المقيسة:**\n🌡️ الحرارة · 💧 رطوبة التربة والهواء · 🧪 pH\n🌿 نيتروجين · ⚗️ فوسفور · 🔬 بوتاسيوم\n☀️ إضاءة · 🌫️ CO2\n\n**للتحليل الفوري**، يُحقن الروبوت بياناتك الحية تلقائياً في كل إجابة (إذا كان XAMPP يعمل).`,
    en:`📊 **Live Data — How to Access**\n\nSensors measure every **10 seconds**:\n\n**Quick access:**\n- 📡 Dashboard → **"IoT Sensors"** widget\n- 💬 Type here: *"Show me live data"*\n\n**Measured parameters:**\n🌡️ Temperature · 💧 Soil & air humidity · 🧪 pH\n🌿 Nitrogen (N) · ⚗️ Phosphorus (P) · 🔬 Potassium (K)\n☀️ Light · 🌫️ CO2\n\n**For real-time analysis**, the chatbot auto-injects your live data into every AI response (if XAMPP is running).`},

  /* ── XAMPP / MySQL / Base de données ── */
  { k:['xampp','mysql','base de données','database','sql','php','serveur','server','api','hors ligne','offline','connexion','connection','قاعدة بيانات','خادم','اتصال','غير متصل'],
    fr:`🗄️ **AgriSmart — Backend MySQL / XAMPP**\n\n**Architecture :**\n- Backend : **PHP + MySQL** (XAMPP local)\n- API REST : **api/*.php**\n- Données : capteurs, alertes, nœuds, RF, LSTM\n\n**Si déconnecté (XAMPP non démarré) :**\n1. Démarrez Apache + MySQL dans XAMPP\n2. Accédez à **localhost/agrismart**\n3. AgroBot récupère les données automatiquement\n\n**Tables principales :**\n\`capteurs_data\` · \`alertes\` · \`noeuds_iot\` · \`rf_predictions\` · \`users\``,
    ar:`🗄️ **AgriSmart — قاعدة بيانات MySQL/XAMPP**\n\n**البنية:**\n- الخادم: **PHP + MySQL** (XAMPP محلي)\n- API REST: **api/*.php**\n- البيانات: مستشعرات، تنبيهات، عقد، RF، LSTM\n\n**إذا لم يكن متصلاً (XAMPP لا يعمل):**\n1. شغّل Apache + MySQL في XAMPP\n2. افتح **localhost/agrismart**\n3. يسترجع AgroBot البيانات تلقائياً\n\n**الجداول الرئيسية:**\n\`capteurs_data\` · \`alertes\` · \`noeuds_iot\` · \`rf_predictions\` · \`users\``,
    en:`🗄️ **AgriSmart — MySQL/XAMPP Backend**\n\n**Architecture:**\n- Backend: **PHP + MySQL** (local XAMPP)\n- REST API: **api/*.php**\n- Data: sensors, alerts, nodes, RF, LSTM\n\n**If disconnected (XAMPP not running):**\n1. Start Apache + MySQL in XAMPP\n2. Navigate to **localhost/agrismart**\n3. AgroBot fetches data automatically\n\n**Main tables:**\n\`capteurs_data\` · \`alertes\` · \`noeuds_iot\` · \`rf_predictions\` · \`users\``},

  /* ── Questions générales sur l'agriculture ── */
  { k:['agriculture','farming','farm','agri','champ','field','récolte','harvest','saison','season','planting','semis','culture','grow','cultivate','زراعة','حقل','حصاد','موسم','زرع','نمو'],
    fr:`🌱 **Agriculture de Précision — Principes Clés**\n\n**Ce qu'AgriSmart optimise pour vous :**\n\n- 🌡️ **Micro-climat** → capteurs toutes les 10s\n- 🧪 **Sol** → pH + NPK → recommandations précises\n- 💧 **Eau** → irrigation basée sur données réelles\n- 🌲 **Sélection culture** → IA Random Forest 98%\n- 📈 **Planification** → LSTM 7 jours à l'avance\n\n**Avantages vs agriculture traditionnelle :**\n- Économie d'eau : **-30 à 40%**\n- Meilleur rendement : **+20 à 35%**\n- Réduction engrais : **-25%** (application ciblée)\n\n🌾 Posez une question spécifique pour des conseils personnalisés !`,
    ar:`🌱 **الزراعة الدقيقة — المبادئ الأساسية**\n\n**ما تحسّنه AgriSmart لك:**\n\n- 🌡️ **المناخ الدقيق** → مستشعرات كل 10 ثوانٍ\n- 🧪 **التربة** → pH + NPK → توصيات دقيقة\n- 💧 **الماء** → ري مبني على بيانات حقيقية\n- 🌲 **اختيار المحصول** → ذكاء اصطناعي 98%\n- 📈 **التخطيط** → LSTM 7 أيام مسبقاً\n\n**مزايا مقارنة بالزراعة التقليدية:**\n- توفير الماء: **30-40%**\n- تحسين الإنتاج: **+20-35%**\n- تقليل الأسمدة: **25-** (تطبيق مستهدف)\n\n🌾 اسأل سؤالاً محدداً للحصول على نصائح شخصية!`,
    en:`🌱 **Precision Agriculture — Key Principles**\n\n**What AgriSmart optimizes for you:**\n\n- 🌡️ **Micro-climate** → sensors every 10s\n- 🧪 **Soil** → pH + NPK → precise recommendations\n- 💧 **Water** → irrigation based on real data\n- 🌲 **Crop selection** → AI Random Forest 98%\n- 📈 **Planning** → LSTM 7 days ahead\n\n**Advantages vs traditional farming:**\n- Water savings: **-30 to 40%**\n- Better yield: **+20 to 35%**\n- Fertilizer reduction: **-25%** (targeted application)\n\n🌾 Ask a specific question for personalized advice!`},
];

// Normaliseur pour la recherche floue
function _norm(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
}

// Calculer un score de pertinence
function _scoreEntry(entry, qNorm) {
  let score = 0;
  for (const k of entry.k) {
    const kn = _norm(k);
    if (qNorm.includes(kn)) score += kn.length > 4 ? 3 : 1;
    else if (kn.split(' ').some(w => w.length > 3 && qNorm.includes(w))) score += 1;
  }
  return score;
}

// Générer une réponse contextuelle à partir des données live si disponibles
function _buildLiveResponse(lang) {
  if (!_contextCache) return null;
  const ctx = _contextCache;
  const lines = {
    fr: [], ar: [], en: []
  };

  // Extraire humidité sol
  const hsMatch = ctx.match(/H\.sol\s*:\s*([\d.]+)%/);
  if (hsMatch) {
    const hs = parseFloat(hsMatch[1]);
    if (hs < 20) {
      lines.fr.push(`🔴 **URGENT** : Humidité sol = **${hs}%** → Irrigation immédiate requise !`);
      lines.ar.push(`🔴 **عاجل** : رطوبة التربة = **${hs}%** → الري الفوري مطلوب!`);
      lines.en.push(`🔴 **URGENT**: Soil moisture = **${hs}%** → Immediate irrigation required!`);
    } else if (hs < 35) {
      lines.fr.push(`🟡 Humidité sol = **${hs}%** → Irriguer dans les 24-48h`);
      lines.ar.push(`🟡 رطوبة التربة = **${hs}%** → اسقِ خلال 24-48 ساعة`);
      lines.en.push(`🟡 Soil moisture = **${hs}%** → Irrigate within 24-48h`);
    } else {
      lines.fr.push(`✅ Humidité sol = **${hs}%** → Optimal, pas besoin d'irriguer`);
      lines.ar.push(`✅ رطوبة التربة = **${hs}%** → مثالية، لا حاجة للري`);
      lines.en.push(`✅ Soil moisture = **${hs}%** → Optimal, no irrigation needed`);
    }
  }

  // Extraire pH
  const phMatch = ctx.match(/pH\s*:\s*([\d.]+)/);
  if (phMatch) {
    const ph = parseFloat(phMatch[1]);
    if (ph < 5.5) {
      lines.fr.push(`🔴 pH = **${ph}** (acide) → Appliquer chaux : 500-1000 kg/ha`);
      lines.ar.push(`🔴 pH = **${ph}** (حمضي) → أضف جيراً: 500-1000 كغ/هكتار`);
      lines.en.push(`🔴 pH = **${ph}** (acidic) → Apply lime: 500-1000 kg/ha`);
    } else if (ph > 7.5) {
      lines.fr.push(`🔵 pH = **${ph}** (alcalin) → Appliquer soufre : 50 kg/ha`);
      lines.ar.push(`🔵 pH = **${ph}** (قلوي) → أضف كبريتاً: 50 كغ/هكتار`);
      lines.en.push(`🔵 pH = **${ph}** (alkaline) → Apply sulfur: 50 kg/ha`);
    } else {
      lines.fr.push(`✅ pH = **${ph}** → Optimal`);
      lines.ar.push(`✅ pH = **${ph}** → مثالي`);
      lines.en.push(`✅ pH = **${ph}** → Optimal`);
    }
  }

  // Extraire température
  const tMatch = ctx.match(/T°\s*:\s*([\d.]+)°C/);
  if (tMatch) {
    const t = parseFloat(tMatch[1]);
    lines.fr.push(`🌡️ Température = **${t}°C**${t > 35 ? ' ⚠️ Stress thermique possible' : t < 10 ? ' ⚠️ Risque de gel' : ' ✅'}`);
    lines.ar.push(`🌡️ الحرارة = **${t}°C**${t > 35 ? ' ⚠️ إجهاد حراري محتمل' : t < 10 ? ' ⚠️ خطر الصقيع' : ' ✅'}`);
    lines.en.push(`🌡️ Temperature = **${t}°C**${t > 35 ? ' ⚠️ Heat stress possible' : t < 10 ? ' ⚠️ Frost risk' : ' ✅'}`);
  }

  if (lines.fr.length === 0) return null;

  const headers = {
    fr: `📊 **État de votre exploitation (données live) :**\n\n`,
    ar: `📊 **حالة مزرعتك (بيانات مباشرة) :**\n\n`,
    en: `📊 **Your farm status (live data):**\n\n`,
  };
  const footers = {
    fr: `\n\n💬 Posez une question plus précise pour des conseils détaillés !`,
    ar: `\n\n💬 اسأل سؤالاً أكثر تحديداً للحصول على نصائح مفصلة!`,
    en: `\n\n💬 Ask a more specific question for detailed advice!`,
  };

  return headers[lang] + lines[lang].join('\n') + footers[lang];
}

function _fallbackLocal(question) {
  const qNorm = _norm(question);
  const lang  = _detectLang(question);

  // ── 1. Chercher dans la KB avec scoring ──────────────────────
  let best = null, bestScore = 0;
  for (const entry of _KB) {
    const s = _scoreEntry(entry, qNorm);
    if (s > bestScore) { bestScore = s; best = entry; }
  }
  if (best && bestScore > 0) return best[lang] || best.fr;

  // ── 2. Si données live disponibles → réponse contextuelle ────
  const liveResp = _buildLiveResponse(lang);
  if (liveResp) return liveResp;

  // ── 3. Réponse générique intelligente (jamais d'erreur) ───────
  const generic = {
    fr: `🌿 **AgroBot** — Je suis là pour vous aider !\n\n` +
        `Voici ce sur quoi je peux vous conseiller :\n` +
        `- 🌲 **Culture** → Random Forest (98% précision)\n` +
        `- 📈 **Prévisions** → LSTM 7 jours\n` +
        `- 📡 **Capteurs IoT** → données live\n` +
        `- 🧪 **Sol** → pH, NPK, amendements\n` +
        `- 💧 **Irrigation** → basée sur vos capteurs\n` +
        `- ⚠️ **Alertes** → interprétation & actions\n\n` +
        `Reformulez votre question ou cliquez sur un bouton rapide ci-dessous. 🌾`,
    ar: `🌿 **AgroBot** — أنا هنا لمساعدتك!\n\n` +
        `إليك ما يمكنني نصحك به:\n` +
        `- 🌲 **المحصول** → الغابة العشوائية (98%)\n` +
        `- 📈 **التوقعات** → LSTM 7 أيام\n` +
        `- 📡 **مستشعرات IoT** → بيانات مباشرة\n` +
        `- 🧪 **التربة** → pH، NPK، تعديلات\n` +
        `- 💧 **الري** → مبني على مستشعراتك\n` +
        `- ⚠️ **التنبيهات** → تفسير وإجراءات\n\n` +
        `أعد صياغة سؤالك أو اضغط على زر سريع أدناه. 🌾`,
    en: `🌿 **AgroBot** — I'm here to help!\n\n` +
        `Here's what I can advise you on:\n` +
        `- 🌲 **Crops** → Random Forest (98% accuracy)\n` +
        `- 📈 **Forecasts** → LSTM 7 days\n` +
        `- 📡 **IoT Sensors** → live data\n` +
        `- 🧪 **Soil** → pH, NPK, amendments\n` +
        `- 💧 **Irrigation** → sensor-based\n` +
        `- ⚠️ **Alerts** → interpretation & actions\n\n` +
        `Rephrase your question or click a quick button below. 🌾`,
  };
  return generic[lang] || generic.fr;
}

/* ═══════════════════════════════════════════════════════
   GESTION LANGUE DANS LE CHAT
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
      fr: `${dot} Claude AI · FR / AR / EN · 🎤`,
      ar: `${dot} Claude AI · عربي / FR / EN · 🎤`,
      en: `${dot} Claude AI · FR / AR / EN · 🎤`,
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
        { l:'👥 Comptes',    q:'Comment ajouter un utilisateur dans l administration ?' },
        { l:'⚠️ Alertes',    q:'Y a-t-il des alertes actives sur mes capteurs ?' },
      ],
      ar: [
        { l:'🌲 الغابة',     q:'كيف أستخدم الغابة العشوائية لاختيار المحصول؟' },
        { l:'📈 LSTM',       q:'كيف يعمل نموذج LSTM للتنبؤ؟' },
        { l:'📡 مستشعرات',  q:'أرني بيانات مستشعراتي الآن' },
        { l:'🧪 التربة',    q:'تربتي حامضة، ماذا أفعل؟' },
        { l:'💧 الري',      q:'متى يجب أن أروي حقلي؟' },
        { l:'👥 مستخدمون',  q:'كيف أضيف مستخدماً جديداً؟' },
        { l:'⚠️ تنبيهات',   q:'هل هناك تنبيهات نشطة على مستشعراتي؟' },
      ],
      en: [
        { l:'🌲 RF',         q:'How to use Random Forest to choose a crop?' },
        { l:'📈 LSTM',       q:'How does the LSTM prediction model work?' },
        { l:'📡 Sensors',    q:'Show me live IoT sensor data' },
        { l:'🧪 Soil',       q:'My soil is too acidic, what to do?' },
        { l:'💧 Irrigation', q:'When should I irrigate my fields?' },
        { l:'👥 Users',      q:'How to add a user in administration?' },
        { l:'⚠️ Alerts',     q:'Are there any active alerts on my sensors?' },
      ],
    },
    agriculteur: {
      fr: [
        { l:'🌾 Culture ?',   q:'Quelle culture dois-je planter selon mes capteurs ?' },
        { l:'💧 Irriguer ?',  q:'Est-ce que je dois irriguer aujourd hui ?' },
        { l:'🌡️ Météo 7j',   q:'Prévision météo pour les 7 prochains jours' },
        { l:'🧪 Mon sol',     q:'Comment améliorer la qualité de mon sol ?' },
        { l:'📡 Live',        q:'Montre-moi les données live de mes capteurs' },
        { l:'⚠️ Alertes',     q:'Y a-t-il des alertes sur mes capteurs ?' },
      ],
      ar: [
        { l:'🌾 أي محصول؟',  q:'ما المحصول الأنسب حسب بيانات مستشعراتي؟' },
        { l:'💧 هل أروي؟',   q:'هل يجب أن أروي حقلي اليوم؟' },
        { l:'🌡️ 7 أيام',    q:'ما توقعات الطقس للأيام السبعة القادمة؟' },
        { l:'🧪 تربتي',      q:'كيف أحسّن جودة تربتي؟' },
        { l:'📡 مباشر',      q:'أرني بيانات مستشعراتي الآن' },
      ],
      en: [
        { l:'🌾 Best crop?',  q:'What crop should I plant based on my sensor data?' },
        { l:'💧 Irrigate?',   q:'Should I irrigate my fields today?' },
        { l:'🌡️ 7-day',      q:'What is the 7-day weather forecast?' },
        { l:'🧪 My soil',     q:'How do I improve my soil quality?' },
        { l:'📡 Live',        q:'Show me my live sensor data' },
      ],
    },
    technicien: {
      fr: [
        { l:'📡 Nœuds IoT',  q:'Montre-moi l état de tous les nœuds IoT' },
        { l:'🔋 Batteries',  q:'Quels nœuds ont une batterie faible ?' },
        { l:'📶 LoRa',       q:'Comment améliorer un signal LoRa faible ?' },
        { l:'⚠️ Alertes',    q:'Y a-t-il des alertes actives ?' },
        { l:'📈 LSTM',       q:'Explique l architecture LSTM en détail' },
      ],
      ar: [
        { l:'📡 العقد',      q:'أرني حالة جميع عقد IoT' },
        { l:'🔋 البطارية',   q:'أي عقد لديها بطارية منخفضة؟' },
        { l:'📶 LoRa',       q:'كيف أحسّن إشارة LoRa الضعيفة؟' },
        { l:'⚠️ تنبيهات',   q:'هل هناك تنبيهات نشطة؟' },
      ],
      en: [
        { l:'📡 Nodes',      q:'Show all IoT node status' },
        { l:'🔋 Battery',    q:'Which nodes have low battery?' },
        { l:'📶 Signal',     q:'How to improve weak LoRa signal?' },
        { l:'⚠️ Alerts',     q:'Are there any active alerts?' },
      ],
    },
  };
  const roleSet = sets[role] || sets.admin;
  const langSet = roleSet[lang] || roleSet.fr;
  const el = document.getElementById('chat-quick');
  if (!el) return;
  el.innerHTML = langSet.map(b =>
    `<button class="chat-q-btn" onclick="envoyerQuestion('${b.q.replace(/'/g, "\\'")}')">
      ${b.l}
    </button>`
  ).join('');
}

/* ═══════════════════════════════════════════════════════
   TEXT-TO-SPEECH
═══════════════════════════════════════════════════════ */
function _speak(text, lang) {
  if (!_ttsEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[–—→·➊➋➌➍➎#]/g, '')
    .replace(/\s{2,}/g, ' ').trim().substring(0, 450);
  if (!clean) return;
  const utt  = new SpeechSynthesisUtterance(clean);
  utt.lang   = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fr-FR';
  utt.rate   = lang === 'ar' ? 0.82 : 0.92;
  utt.volume = 1;
  utt.pitch  = 1.0;

  // Sélectionner la meilleure voix (depuis Chatbot.tsx)
  const bestVoice = _pickVoice(utt.lang.split('-')[0], 'female')
    || _pickVoice('hi', 'female')  // Hindi proche du tamoul/arabe
    || _pickVoice('en', 'female');
  if (bestVoice) { utt.voice = bestVoice; utt.lang = bestVoice.lang; }

  let timer = null;
  utt.onstart = () => {
    _isSpeaking = true;
    // Afficher bouton stop si disponible
    const stopBtn = document.getElementById('chat-stop-speak');
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    timer = setInterval(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 5000);
  };
  utt.onend = utt.onerror = () => {
    _isSpeaking = false;
    const stopBtn = document.getElementById('chat-stop-speak');
    if (stopBtn) stopBtn.style.display = 'none';
    if (timer) clearInterval(timer);
  };
  setTimeout(() => { if (_ttsEnabled) window.speechSynthesis.speak(utt); }, 150);
}

function toggleTTS() {
  _ttsEnabled = !_ttsEnabled;
  if (!_ttsEnabled) { window.speechSynthesis?.cancel(); _isSpeaking = false; }
  const btn     = document.getElementById('chat-tts');
  const testBtn = document.getElementById('chat-test-voice');
  if (btn)     { btn.textContent = _ttsEnabled ? '🔊' : '🔇'; btn.style.opacity = _ttsEnabled ? '1' : '0.4'; }
  if (testBtn) { testBtn.style.display = _ttsEnabled ? 'inline-flex' : 'none'; }
  showNotif(_ttsEnabled
    ? (_chatLang==='ar' ? '🔊 الصوت مفعّل' : _chatLang==='en' ? '🔊 Voice on' : '🔊 Voix activée')
    : (_chatLang==='ar' ? '🔇 الصوت معطّل' : _chatLang==='en' ? '🔇 Voice off' : '🔇 Voix désactivée'));
}

/* ═══════════════════════════════════════════════════════
   SPEECH-TO-TEXT
═══════════════════════════════════════════════════════ */
function startSTT() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    showNotif(_chatLang === 'ar' ? '⚠️ الميكروفون غير مدعوم — استخدم Chrome' : '⚠️ Micro non supporté — Chrome requis');
    return;
  }
  if (_sttActive) return;
  const SR      = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec     = new SR();
  const mic     = document.getElementById('chat-mic');
  const inp     = document.getElementById('chat-input');
  const langMap = { fr:'fr-FR', ar:'ar-SA', en:'en-US' };
  rec.lang = langMap[_chatLang] || 'fr-FR';
  rec.continuous = true; rec.interimResults = true;
  if (mic) { mic.style.background = '#dc2626'; mic.textContent = '🔴'; mic.style.animation = 'pulse-mic 1s infinite'; }
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
    if (mic) { mic.style.background = 'var(--green,#16a34a)'; mic.textContent = '🎤'; mic.style.animation = ''; mic.onclick = startSTT; }
  };
  rec.onend = () => {
    _sttActive = false;
    if (silenceTimer) clearTimeout(silenceTimer);
    if (mic) { mic.style.background = 'var(--green,#16a34a)'; mic.textContent = '🎤'; mic.style.animation = ''; mic.onclick = startSTT; }
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
    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-size:13px;font-weight:800;color:var(--green-d,#14532d);margin:8px 0 4px;">$1</div>')
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
    div.innerHTML = `<div class="chat-ava" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;">🤖</div><div class="chat-typing"><span></span><span></span><span></span></div>`;
  } else {
    const ava = role === 'user'
      ? `<div class="chat-ava" style="background:var(--green);color:#fff;">${(CURRENT_USER||{}).avatar||'U'}</div>`
      : `<div class="chat-ava" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;">🤖</div>`;
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
   PIÈCES JOINTES — Fichiers & Photos
═══════════════════════════════════════════════════════ */

// Ouvrir le sélecteur de fichier
function ouvrirAttachement() {
  const inp = document.getElementById('chat-file-input');
  if (inp) inp.click();
}

// Fichier sélectionné → prévisualiser
function onFileSelected(input) {
  const file = input.files?.[0];
  if (!file) return;
  const maxMB = 10;
  if (file.size > maxMB * 1024 * 1024) {
    showNotif(_chatLang === 'ar' ? `⚠️ الملف كبير جداً (حد ${maxMB} ميغابايت)` : _chatLang === 'en' ? `⚠️ File too large (max ${maxMB}MB)` : `⚠️ Fichier trop lourd (max ${maxMB}Mo)`);
    input.value = '';
    return;
  }
  _attachedFile = file;
  _afficherPreviewAttachement(file);
  input.value = ''; // reset pour permettre re-sélection du même fichier
}

// Afficher la prévisualisation au-dessus du champ texte
function _afficherPreviewAttachement(file) {
  let preview = document.getElementById('chat-attach-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'chat-attach-preview';
    preview.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:6px 10px;margin:0 12px 0;
      background:var(--green-bg);border:1.5px solid var(--green-xl);
      border-radius:10px;font-size:12px;color:var(--green-d);
      animation:fadeIn .2s ease;flex-shrink:0;
    `;
    const row = document.getElementById('chat-input-row-wrap') || document.querySelector('.chat-input-row');
    if (row) row.parentNode.insertBefore(preview, row);
  }

  const isImage = file.type.startsWith('image/');
  const ext = file.name.split('.').pop().toUpperCase();
  const label = _chatLang === 'ar'
    ? `📎 جاهز للإرسال`
    : _chatLang === 'en' ? `📎 Ready to send` : `📎 Prêt à envoyer`;

  if (isImage) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = `
        <img src="${e.target.result}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--green);">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div>
          <div style="color:var(--slate);font-size:10px;">${label} · ${(file.size/1024).toFixed(0)} Ko</div>
        </div>
        <button onclick="supprimerAttachement()" title="Supprimer"
          style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;padding:0;flex-shrink:0;">✕</button>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    const icons = { pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', csv:'📊', txt:'📃', json:'📋', zip:'🗜️', png:'🖼️', jpg:'🖼️', jpeg:'🖼️' };
    const icon = icons[ext.toLowerCase()] || '📎';
    preview.innerHTML = `
      <span style="font-size:24px;">${icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</div>
        <div style="color:var(--slate);font-size:10px;">${label} · ${ext} · ${(file.size/1024).toFixed(0)} Ko</div>
      </div>
      <button onclick="supprimerAttachement()" title="Supprimer"
        style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;padding:0;flex-shrink:0;">✕</button>
    `;
  }
}

// Supprimer la pièce jointe
function supprimerAttachement() {
  _attachedFile = null;
  const preview = document.getElementById('chat-attach-preview');
  if (preview) preview.remove();
}

// Lire un fichier en base64
function _fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = () => rej(new Error('Lecture fichier échouée'));
    r.readAsDataURL(file);
  });
}

// Lire un fichier texte
function _fileToText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej(new Error('Lecture texte échouée'));
    r.readAsText(file, 'UTF-8');
  });
}

// Afficher la bulle utilisateur avec la pièce jointe
function _afficherBulleAvecFichier(texte, file) {
  const isImage = file.type.startsWith('image/');
  if (isImage) {
    const reader = new FileReader();
    reader.onload = e => {
      const html = `<img src="${e.target.result}" style="max-width:200px;max-height:150px;border-radius:8px;display:block;margin-bottom:${texte?'6px':'0'}">${texte ? `<span>${texte}</span>` : ''}`;
      ajouterMessage('user', html, false, true); // raw HTML
    };
    reader.readAsDataURL(file);
  } else {
    const icon = '📎';
    const html = `<div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.15);border-radius:8px;padding:5px 8px;margin-bottom:${texte?'5px':'0'};max-width:200px;overflow:hidden;">${icon} <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;">${file.name}</span></div>${texte ? `<span>${texte}</span>` : ''}`;
    ajouterMessage('user', html, false, true);
  }
}


/* ═══════════════════════════════════════════════════════
   APPEL IA AVEC FICHIER / PHOTO (Gemini Vision)
═══════════════════════════════════════════════════════ */
async function _callClaudeWithFile(userText, file) {
  const liveCtx = await _getLiveContext();
  const lang    = _detectLang(userText || '');
  const isImage = file.type.startsWith('image/');

  // Toujours essayer Gemini si clé présente — recharger depuis localStorage au cas où
  if (!_geminiApiKey) {
    try { _geminiApiKey = localStorage.getItem('GEMINI_API_KEY') || ''; } catch(e) {}
  }

  if (_geminiApiKey) {
    try {
      const base64 = await _fileToBase64(file);

      // Question par défaut si aucun texte
      const defaultQ = lang === 'ar'
        ? 'حلل هذه الصورة الزراعية وقدم ملاحظات مفيدة.'
        : lang === 'en'
        ? 'Analyze this agricultural image and provide useful insights.'
        : 'Analyse cette image agricole et fournis des observations utiles.';

      const question = (userText || defaultQ).trim();

      // Contexte live court (max 500 chars pour ne pas dépasser les tokens)
      const ctxShort = liveCtx ? liveCtx.substring(0, 500) : '';

      // Instruction système courte
      const sysShort = 'Tu es AgroBot, expert agronome IA. Réponds en ' +
        (lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français') +
        '. Sois précis et pratique. Maximum 200 mots.';

      // Construction des parts selon le type de fichier
      const userParts = [];

      if (isImage) {
        // Image : texte + image dans le même message
        userParts.push({ text: sysShort + (ctxShort ? '\n\nContexte capteurs:\n' + ctxShort : '') + '\n\n' + question });
        userParts.push({ inline_data: { mime_type: file.type, data: base64 } });
      } else {
        // Fichier texte : lire le contenu
        let fileContent = '';
        try { fileContent = await _fileToText(file); } catch(e) {}
        const fileSnippet = fileContent ? fileContent.substring(0, 6000) : '[contenu non lisible]';
        userParts.push({ text: sysShort + '\n\nFichier: ' + file.name + '\n' + fileSnippet + '\n\nQuestion: ' + question });
      }

      // Essayer plusieurs modèles si le quota est épuisé
      const _MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let geminiRes = null, gData = null, lastErr = '';

      for (const _model of _MODELS) {
        console.log('[AgroBot] Essai modèle Gemini:', _model);
        try {
          geminiRes = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/' + _model + ':generateContent?key=' + _geminiApiKey,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: userParts }],
                generationConfig: { temperature: 0.7, topK: 32, topP: 0.9, maxOutputTokens: 600 }
              }),
            }
          );
          gData = await geminiRes.json();
          console.log('[AgroBot]', _model, 'status:', geminiRes.status);

          if (geminiRes.ok && gData?.candidates?.[0]?.content?.parts?.[0]?.text) {
            // Succès !
            break;
          }

          // Quota épuisé ou modèle indisponible → essayer le suivant
          lastErr = gData?.error?.message || 'Erreur ' + geminiRes.status;
          const isQuota = lastErr.includes('quota') || lastErr.includes('RESOURCE_EXHAUSTED') || geminiRes.status === 429;
          const isNotFound = lastErr.includes('not found') || geminiRes.status === 404;
          if (!isQuota && !isNotFound) break; // Autre erreur → inutile de continuer
          console.warn('[AgroBot]', _model, 'indisponible:', lastErr.substring(0, 80));
          gData = null;
        } catch(fetchErr) {
          lastErr = fetchErr.message;
          console.warn('[AgroBot]', _model, 'fetch erreur:', lastErr);
        }
      }

      // Aucun modèle n'a répondu
      if (!gData || !geminiRes) {
        const msg = lang === 'ar' ? '⚠️ كل نماذج Gemini غير متاحة. أنشئ مفتاحاً جديداً على aistudio.google.com'
                  : lang === 'en' ? '⚠️ All Gemini models quota exceeded. Create a new key at aistudio.google.com'
                  : '⚠️ Quota Gemini épuisé sur tous les modèles.\n\n🔑 Crée une nouvelle clé gratuite sur **aistudio.google.com/apikey** et entre-la via le bouton 🔑';
        return msg;
      }

      const gReply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (gReply && gReply.length > 5) {
        _chatHistory.push({ role: 'user',      content: '[Fichier: ' + file.name + '] ' + question });
        _chatHistory.push({ role: 'assistant', content: gReply.trim() });
        return gReply.trim();
      }

      // Réponse vide
      const finishReason = gData?.candidates?.[0]?.finishReason || 'UNKNOWN';
      if (finishReason === 'SAFETY') {
        return lang === 'ar' ? '⚠️ المحتوى محجوب بسبب سياسة السلامة.'
             : lang === 'en' ? '⚠️ Content blocked by safety policy.'
             : '⚠️ Contenu bloqué par la politique de sécurité Gemini.';
      }

    } catch(err) {
      console.warn('[AgroBot] Gemini Vision exception:', err.message, err.stack);
      return (lang === 'ar' ? '⚠️ خطأ: ' : lang === 'en' ? '⚠️ Error: ' : '⚠️ Erreur: ') + err.message;
    }
  }

  return _analyserFichierLocal(file, userText, lang);
}

// Analyse locale basique si pas de clé Gemini
function _analyserFichierLocal(file, userText, lang) {
  const isImage = file.type.startsWith('image/');
  const ext     = file.name.split('.').pop().toUpperCase();
  const name    = file.name;
  const size    = (file.size / 1024).toFixed(0);

  const intro = {
    fr: `📎 **Fichier reçu :** \`${name}\` (${size} Ko)

`,
    ar: `📎 **تم استلام الملف:** \`${name}\` (${size} كيلوبايت)

`,
    en: `📎 **File received:** \`${name}\` (${size} KB)

`,
  }[lang];

  if (isImage) {
    const tips = {
      fr: `🖼️ **Image reçue !**

Pour analyser cette photo (maladie, sol, plante, capteur...) avec l'IA, ajoutez votre clé **Gemini** via le bouton 🔑 — c'est **gratuit** sur [aistudio.google.com](https://aistudio.google.com).

**En attendant**, décrivez ce que vous voyez sur la photo et je vous aiderai !`,
      ar: `🖼️ **تم استلام الصورة!**

لتحليل هذه الصورة (مرض، تربة، نبات...) بالذكاء الاصطناعي، أضف مفتاح **Gemini** عبر زر 🔑 — مجاني على [aistudio.google.com](https://aistudio.google.com).

**في الوقت الحالي،** صف ما تراه في الصورة وسأساعدك!`,
      en: `🖼️ **Image received!**

To analyze this photo (disease, soil, plant, sensor...) with AI, add your **Gemini** key via the 🔑 button — it's **free** at [aistudio.google.com](https://aistudio.google.com).

**For now,** describe what you see in the photo and I'll help!`,
    }[lang];
    return intro + tips;
  }

  if (ext === 'CSV' || ext === 'JSON') {
    const tips = {
      fr: `📊 **Fichier de données détecté !**

Pour que je puisse l'analyser automatiquement, ajoutez une clé **Gemini** (🔑).

**En attendant :** Copiez quelques lignes du fichier dans le chat et posez votre question !`,
      ar: `📊 **تم اكتشاف ملف بيانات!**

لتحليله تلقائياً، أضف مفتاح **Gemini** (🔑).

**في الوقت الحالي:** انسخ بعض الأسطر من الملف في الدردشة واطرح سؤالك!`,
      en: `📊 **Data file detected!**

To auto-analyze it, add a **Gemini** key (🔑).

**For now:** Copy a few lines from the file into chat and ask your question!`,
    }[lang];
    return intro + tips;
  }

  const generic = {
    fr: `📄 **Fichier ${ext} reçu.**

Pour une analyse IA complète du contenu, ajoutez votre clé **Gemini** (🔑 gratuit).

**En attendant :** Posez une question spécifique sur ce fichier en le décrivant, je ferai de mon mieux !`,
    ar: `📄 **تم استلام ملف ${ext}.**

للتحليل الكامل بالذكاء الاصطناعي، أضف مفتاح **Gemini** (🔑 مجاني).

**في الوقت الحالي:** اطرح سؤالاً محدداً حول الملف وسأبذل قصارى جهدي!`,
    en: `📄 **${ext} file received.**

For full AI content analysis, add your **Gemini** key (🔑 free).

**For now:** Ask a specific question about this file by describing it!`,
  }[lang];
  return intro + generic;
}

/* ═══════════════════════════════════════════════════════
   ENVOYER MESSAGE
═══════════════════════════════════════════════════════ */
async function envoyerChat() {
  const inp  = document.getElementById('chat-input');
  const send = document.getElementById('chat-send');
  const q    = inp?.value?.trim();
  const file = _attachedFile;

  // Vérifier qu'il y a au moins un message ou un fichier
  if (!q && !file) return;

  inp.value = ''; inp.style.height = 'auto';
  if (send) send.disabled = true;
  const quick = document.getElementById('chat-quick');
  if (quick) quick.style.display = 'none';

  // Détecter la langue du message (pour la voix uniquement)
  const detectedLang = _detectLang(q || '');

  // Afficher la bulle utilisateur
  if (file) {
    _afficherBulleAvecFichier(q, file);
    supprimerAttachement();
  } else {
    ajouterMessage('user', q);
  }

  const tyBubble = ajouterMessage('bot', '', true);

  // Invalider cache pour questions live
  if (q && /live|direct|maintenant|actuel|capteur|sensor|now|الآن|مباشر|بيانات/i.test(q)) _contextCache = null;

  try {
    let rep;
    if (file) {
      rep = await _callClaudeWithFile(q, file);
    } else {
      rep = await _callClaude(q);
    }
    tyBubble?.remove();
    ajouterMessage('bot', rep);
    _speak(rep, detectedLang);
  } catch(e) {
    tyBubble?.remove();
    ajouterMessage('bot', `⚠️ Erreur : ${e.message}`);
  }
  if (send) send.disabled = false;
  inp?.focus();
}

function envoyerQuestion(q) {
  const inp = document.getElementById('chat-input');
  if (inp) inp.value = q;
  envoyerChat();
}

/* ═══════════════════════════════════════════════════════
   EFFACER CONVERSATION
═══════════════════════════════════════════════════════ */
function clearChat() {
  _chatHistory = []; _contextCache = null; chatFirstOpen = true;
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  const quick = document.getElementById('chat-quick');
  if (quick) { quick.style.display = 'flex'; _buildQuickButtons(); }
  showNotif(_chatLang==='ar' ? '🗑 تم مسح المحادثة' : _chatLang==='en' ? '🗑 Chat cleared' : '🗑 Conversation effacée');
}

// Sauvegarder une clé Gemini API (depuis Chatbot.tsx)
function saveGeminiKey(key) {
  if (!key || !key.trim()) return;
  _geminiApiKey = key.trim();
  try { localStorage.setItem('GEMINI_API_KEY', _geminiApiKey); } catch(e) {}
  // Cacher le champ de saisie
  const keyDiv = document.getElementById('chat-gemini-key');
  if (keyDiv) keyDiv.style.display = 'none';
  showNotif('🔑 Gemini API key sauvegardée ! AgroBot peut maintenant utiliser Gemini en fallback.');
}

/* ═══════════════════════════════════════════════════════
   OUVRIR / FERMER
═══════════════════════════════════════════════════════ */
// Appelé depuis auth/app pour afficher le chatbot après connexion
function showChatBot() {
  const fab = document.getElementById('chat-fab');
  const win = document.getElementById('chat-window');
  if (fab) fab.style.display = 'flex';
  if (win) win.style.removeProperty('display');
}

// Appelé depuis auth pour cacher le chatbot sur l'écran login
function hideChatBot() {
  const fab = document.getElementById('chat-fab');
  const win = document.getElementById('chat-window');
  if (fab) fab.style.display = 'none';
  if (win) { win.classList.remove('open'); win.style.display = 'none'; }
  chatOpen = false;
}

function toggleChat() {
  // Vérifier que l'écran app est visible (classe 'active' OU style display != none)
  const appScreen = document.getElementById('screen-app');
  if (appScreen) {
    const appVisible = appScreen.classList.contains('active') ||
                       window.getComputedStyle(appScreen).display !== 'none';
    if (!appVisible) return;
  }

  const win   = document.getElementById('chat-window');
  const ico   = document.getElementById('chat-fab-ico');
  const badge = document.getElementById('chat-badge');
  if (!win) { console.error('[AgroBot] #chat-window introuvable'); return; }
  chatOpen = !chatOpen;
  if (chatOpen) {
    win.style.removeProperty('display'); // enlever display:none inline si présent
    win.classList.add('open');
    if (ico)   ico.textContent = '✕';
    if (badge) badge.style.display = 'none';
    win.classList.toggle('rtl', _chatLang === 'ar');
    _buildQuickButtons();
    if (chatFirstOpen) {
      chatFirstOpen = false;
      setTimeout(async () => {
        const user = (CURRENT_USER||{}).prenom || (CURRENT_USER||{}).nom || '';
        const cap  = await apiCall('capteurs_live').catch(() => ({ success: false }));
        const online = cap.success && cap.capteurs?.length > 0;
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#86efac;margin-right:4px;box-shadow:0 0 5px #86efac;"></span>`;
        const greetings = {
          fr: `🌿 **Bonjour ${user ? user + ' !' : '!'}** Je suis **AgroBot**, votre assistant IA AgriSmart.\n\n${online ? `${dot}Connecté à vos **${cap.capteurs.length} capteur(s) MySQL** en temps réel.` : `⚠️ Mode hors-ligne (XAMPP non démarré).`}\n\n💬 Posez n'importe quelle question agricole, ou changez la langue avec les boutons 🇫🇷 🇩🇿 🇬🇧 ci-dessus. 🌾`,
          ar: `🌿 **مرحباً ${user ? user + '!' : '!'}** أنا **AgroBot**، مساعدك الزراعي بالذكاء الاصطناعي.\n\n${online ? `${dot}متصل بـ **${cap.capteurs.length} مستشعر MySQL** مباشرةً.` : `⚠️ وضع غير متصل (XAMPP لا يعمل).`}\n\n💬 اسألني أي سؤال زراعي! يمكنك تغيير اللغة بالأزرار 🇫🇷 🇩🇿 🇬🇧 أعلاه. 🌾`,
          en: `🌿 **Hello ${user ? user + '!' : '!'}** I'm **AgroBot**, your AgriSmart AI assistant.\n\n${online ? `${dot}Connected to your **${cap.capteurs.length} live MySQL sensor(s)**.` : `⚠️ Offline mode (XAMPP not running).`}\n\n💬 Ask me anything about farming! Switch language with 🇫🇷 🇩🇿 🇬🇧 above. 🌾`,
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
        <div class="alert-icon">${icons[a.type]||'🔵'}</div>
        <div class="alert-body"><h4>${a.titre}</h4><p>${a.description||''}</p><div class="alert-time">${a.time_label}</div></div>
        <span style="font-size:10px;color:#94a3b8;margin-left:auto;flex-shrink:0;">✓ Lu</span>
      </div>`).join('');
    if (d.non_lues > 0) document.querySelectorAll('.nav-badge').forEach(b => { b.textContent = d.non_lues; b.style.display = ''; });
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
  if (d.alertes_actives > 0) document.querySelectorAll('.nav-badge').forEach(b => b.textContent = d.alertes_actives);
}

async function addAlertManual(type, titre, desc, nodeId = '') {
  return await apiCall('alerte_add', 'POST', { type, titre, description: desc, node_id: nodeId });
}

/* ═══════════════════════════════════════════════════════
   VISIBILITÉ CHATBOT — observe uniquement screen-app/login
═══════════════════════════════════════════════════════ */
(function _watchAppScreen() {

  function _checkChatVisibility() {
    var app   = document.getElementById('screen-app');
    var login = document.getElementById('screen-login');
    var fab   = document.getElementById('chat-fab');
    var win   = document.getElementById('chat-window');
    if (!fab || !win || !app) return;

    var appVisible   = app.classList.contains('active') ||
                       window.getComputedStyle(app).display !== 'none';
    var loginVisible = login && (login.classList.contains('active') ||
                       window.getComputedStyle(login).display !== 'none');

    if (appVisible && !loginVisible) {
      // Connecté → montrer le chatbot
      fab.style.display = 'flex';
      if (!chatOpen) win.style.removeProperty('display');
    } else {
      // Login → cacher
      fab.style.display = 'none';
      if (!chatOpen) { win.classList.remove('open'); win.style.display = 'none'; }
    }
  }

  function _start() {
    var app   = document.getElementById('screen-app');
    var login = document.getElementById('screen-login');

    // Observer ciblé sur les deux écrans seulement (pas subtree)
    var obs = new MutationObserver(_checkChatVisibility);
    if (app)   obs.observe(app,   { attributes: true, attributeFilter: ['class','style'] });
    if (login) obs.observe(login, { attributes: true, attributeFilter: ['class','style'] });

    // Polling court (2s × 10 = 20s) pour couvrir l'auth asynchrone
    var n = 0;
    var t = setInterval(function() {
      _checkChatVisibility();
      if (++n >= 40) clearInterval(t);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _start);
  } else {
    _start();
  }
})();

