/* ════════════════════════════════════════════════════════════════
   AgriSmart — 10 — CHAT & MYSQL — Chatbot et fonctions API MySQL
   CHAT_KB[], envoyerChat(), toggleChat(), loadAlertes(), loadNoeudsLoRa(), loadDashboardStats()
   Fichier : 10_chat_mysql.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   CHATBOT AGRISMART — Amélioré
   ✔ FR / AR / EN   ✔ Voix (parle + écoute)   ✔ Données IoT live
═══════════════════════════════════════════════════════ */
let chatOpen = false;
let chatFirstOpen = true;
let _ttsEnabled = true;   // synthèse vocale activée
let _sttActive  = false;  // reconnaissance vocale active

/* ── Base de connaissances multilingue ─────────────────── */
const CHAT_KB = [
  { keys:['random forest','rf','forêt','foret','arbres','arbre','culture','planter','recommand','غابة','شجر','محصول','زراعة'],
    fr:`🌲 **Random Forest — Comment l'utiliser ?**\n\nAllez dans **"Random Forest"** dans le menu.\n\n➊ Ajustez les **8 curseurs** (pH, humidité, N/P/K, température, précipitations)\n➋ Cliquez **"Lancer l'Analyse"** — 100 arbres votent\n➌ Lisez la culture recommandée et les conseils\n\n✅ Confiance > 75% = recommandation très fiable.`,
    ar:`🌲 **الغابة العشوائية — كيف تستخدمها؟**\n\nانتقل إلى **"Random Forest"** في القائمة.\n\n➊ اضبط **8 أشرطة** (pH، الرطوبة، N/P/K، الحرارة، الأمطار)\n➋ اضغط **"تشغيل التحليل"** — 100 شجرة تصوّت\n➌ اقرأ التوصية والنصائح\n\n✅ ثقة > 75% = توصية موثوقة جداً.`,
    en:`🌲 **Random Forest — How to use it?**\n\nGo to **"Random Forest"** in the menu.\n\n➊ Adjust the **8 sliders** (pH, humidity, N/P/K, temperature, rainfall)\n➋ Click **"Run Analysis"** — 100 trees vote\n➌ Read the recommended crop and advice\n\n✅ Confidence > 75% = very reliable recommendation.`},
  { keys:['lstm','prévision','prevision','temporel','futur','météo','meteo','irrigation','irrigu','توقع','ري','مستقبل'],
    fr:`📈 **LSTM — Prédiction du rendement agricole**\n\nLe **LSTM** (Long Short-Term Memory) calcule le rendement en t/ha via 4 portes mathématiques :\n\n🔢 **f_t** = porte d'oubli · **i_t** = porte d'entrée\n🔢 **g_t** = candidat · **o_t** = porte de sortie\n\n➊ Allez dans **"Prévision LSTM"**\n➋ Ajustez les 5 curseurs météo\n➌ Cliquez **"Lancer"** → les portes se calculent en temps réel\n➍ Lisez le rendement prédit en t/ha\n\n📉 Précision : **92.4%** — MAE : 0.023`,
    ar:`📈 **LSTM — التنبؤ بالمحصول الزراعي**\n\nيحسب **LSTM** المحصول بـ طن/هكتار عبر 4 بوابات رياضية:\n\n🔢 **f_t** = بوابة النسيان · **i_t** = بوابة الإدخال\n🔢 **g_t** = المرشح · **o_t** = بوابة الإخراج\n\n➊ انتقل إلى **"توقعات LSTM"**\n➋ اضبط 5 أشرطة الطقس\n➌ اضغط **"تشغيل"** → البوابات تُحسب آنياً\n\n📉 الدقة: **92.4%**`,
    en:`📈 **LSTM — Agricultural yield prediction**\n\n**LSTM** computes yield in t/ha via 4 mathematical gates:\n\n🔢 **f_t** = forget gate · **i_t** = input gate\n🔢 **g_t** = candidate · **o_t** = output gate\n\n➊ Go to **"LSTM Forecast"**\n➋ Adjust 5 weather sliders\n➌ Click **"Run"** → gates compute in real time\n\n📉 Accuracy: **92.4%** — MAE: 0.023`},
  { keys:['lorawan','lora','esp32','capteur','iot','signal','rssi','nœud','noeud','gateway','مستشعر','لورا','بث'],
    fr:`📡 **LoRaWAN & ESP32**\n\n📟 **ESP32** → collecte pH, T°, humidité, NPK toutes les 10s\n📡 **LoRaWAN 868MHz** → 15 km, très faible consommation\n☁️ **MySQL XAMPP** → stockage et historique\n🧠 **RF + LSTM** → analyse et recommande\n\n⚡ Autonomie : **287 jours** par nœud\nSignal faible → augmentez SF (SF7→SF12)`,
    ar:`📡 **LoRaWAN و ESP32**\n\n📟 **ESP32** → يقيس pH، الحرارة، الرطوبة، NPK كل 10 ثوان\n📡 **LoRaWAN 868MHz** → 15 كم، استهلاك منخفض جداً\n☁️ **MySQL XAMPP** → تخزين البيانات\n\n⚡ عمر البطارية: **287 يوم** لكل عقدة`,
    en:`📡 **LoRaWAN & ESP32**\n\n📟 **ESP32** → reads pH, T°, humidity, NPK every 10s\n📡 **LoRaWAN 868MHz** → 15 km range, ultra-low power\n☁️ **MySQL XAMPP** → data storage\n\n⚡ Battery life: **287 days** per node`},
  { keys:['acide','alcalin','ph','chaux','sol','terre','fertilisant','engrais','azote','phosphore','potassium','حموضة','تربة','سماد'],
    fr:`🧪 **Problème de Sol — Solutions**\n\n**Sol trop acide (pH < 5.5) :**\n→ Chaux agricole : **500–1000 kg/ha**\n\n**Sol trop alcalin (pH > 7.5) :**\n→ Soufre élémentaire : **50 kg/ha**\n\n**Manque d'azote (N < 40 kg/ha) :**\n→ Urée (46% N) : **80–120 kg/ha**\n\npH optimal : **6.0 – 7.0**`,
    ar:`🧪 **مشاكل التربة — الحلول**\n\n**تربة حامضة (pH < 5.5):**\n→ جير زراعي: **500–1000 كغ/هكتار**\n\n**تربة قلوية (pH > 7.5):**\n→ كبريت: **50 كغ/هكتار**\n\n**نقص النيتروجين:**\n→ يوريا (46% N): **80–120 كغ/هكتار**`,
    en:`🧪 **Soil Problems — Solutions**\n\n**Acid soil (pH < 5.5):** Agricultural lime: **500–1000 kg/ha**\n**Alkaline soil (pH > 7.5):** Sulfur: **50 kg/ha**\n**Nitrogen deficiency:** Urea (46% N): **80–120 kg/ha**\n\nOptimal pH: **6.0 – 7.0**`},
  { keys:['humidité','humidite','eau','sec','irrigat','arros','goutte','رطوبة','ماء','ري','جفاف'],
    fr:`💧 **Gestion de l'Eau & Irrigation**\n\n🔴 **Sol < 20%** → Irrigation urgente (12h)\n🟡 **Sol 20–35%** → Arrosez dans 24–48h\n✅ **Sol 35–70%** → Bon niveau\n🌊 **Sol > 85%** → Trop humide, vérifiez le drainage\n\nLe **LSTM prédit** 7 jours à l'avance.`,
    ar:`💧 **إدارة المياه والري**\n\n🔴 **< 20%** → ري عاجل خلال 12 ساعة\n🟡 **20–35%** → ري خلال 24–48 ساعة\n✅ **35–70%** → مستوى جيد\n🌊 **> 85%** → رطوبة زائدة، تحقق من الصرف`,
    en:`💧 **Water & Irrigation Management**\n\n🔴 **< 20%** → Urgent irrigation (12h)\n🟡 **20–35%** → Water within 24–48h\n✅ **35–70%** → Good level\n🌊 **> 85%** → Too wet, check drainage`},
  { keys:['capteur iot','données capteur','données live','données en direct','temperature actuelle','humidité actuelle','ph actuel','بيانات مباشرة','درجة حرارة','رطوبة التربة الان'],
    dynamic: true,  // réponse dynamique depuis les capteurs IoT
    fr:'📡 **Données IoT en direct :**',
    ar:'📡 **بيانات المستشعرات الآن :**',
    en:'📡 **Live IoT data :**'},
  { keys:['ajouter','supprimer','modifier','utilisateur','compte','admin','gestion','إضافة','حذف','مستخدم'],
    fr:`👥 **Gestion des Utilisateurs (Admin)**\n\nAllez dans **"Administration"** :\n➊ **Ajouter** → bouton ➕ Ajouter\n➋ **Modifier** → cliquez ✏️\n➌ **Supprimer** → cliquez 🗑\n\nRôles : 🌾 Agriculteur · 🔧 Technicien · 👑 Admin`,
    ar:`👥 **إدارة المستخدمين (مدير)**\n\nانتقل إلى **"الإدارة"**:\n➊ **إضافة** → زر ➕\n➋ **تعديل** → اضغط ✏️\n➌ **حذف** → اضغط 🗑`,
    en:`👥 **User Management (Admin)**\n\nGo to **"Administration"**:\n➊ **Add** → ➕ button\n➋ **Edit** → click ✏️\n➌ **Delete** → click 🗑`},
  { keys:['bienvenu','bonjour','salut','hello','aide','help','quoi','comment','utiliser','début','debut','مرحبا','ساعدني','مساعدة'],
    fr:`🌿 **Bonjour ! Je suis l'assistant AgriSmart.**\n\nJe peux répondre en 🇫🇷 français, 🇩🇿 arabe et 🇬🇧 anglais.\n\nJe peux vous aider sur :\n🌲 **Random Forest** → recommandation de culture\n📈 **LSTM** → prédiction du rendement\n📡 **IoT** → capteurs ESP32 et LoRaWAN\n🧪 **Sol** → pH, fertilisation, irrigation\n📡 **Données live** → lisez vos capteurs en temps réel`,
    ar:`🌿 **مرحباً! أنا مساعد AgriSmart.**\n\nأتكلم 🇫🇷 فرنسي، 🇩🇿 عربي و 🇬🇧 إنجليزي.\n\nيمكنني مساعدتك في:\n🌲 **الغابة العشوائية** → اختيار المحصول\n📈 **LSTM** → التنبؤ بالمحصول\n📡 **إنترنت الأشياء** → مستشعرات ESP32\n🧪 **التربة** → pH والتسميد`,
    en:`🌿 **Hello! I'm the AgriSmart assistant.**\n\nI speak 🇫🇷 French, 🇩🇿 Arabic and 🇬🇧 English.\n\nI can help you with:\n🌲 **Random Forest** → crop recommendation\n📈 **LSTM** → yield prediction\n📡 **IoT** → ESP32 sensors\n🧪 **Soil** → pH, fertilization, irrigation`},
];

/* ── Détection langue de la question ─────────────────────── */
function _detectLang(q){
  if(/[\u0600-\u06FF]/.test(q)) return 'ar';
  if(/\b(the|is|are|how|what|can|i|you|my)\b/i.test(q)) return 'en';
  return 'fr';
}

/* ── Réponse dynamique depuis les capteurs IoT ──────────── */
async function _getDynamicReply(lang){
  const d = await apiCall('capteurs_live');
  if(d.success && d.capteurs && d.capteurs.length>0){
    const avg = k => {
      const v=d.capteurs.map(c=>parseFloat(c[k])).filter(v=>!isNaN(v)&&v>0);
      return v.length ? (v.reduce((a,b)=>a+b,0)/v.length) : null;
    };
    const T=avg('temperature'), H=avg('humidite_sol'), pH=avg('ph'), N=avg('azote');
    const lines = {
      fr:`\n\n🌡️ Température : **${T?.toFixed(1)||'—'}°C**\n💧 Humidité sol : **${H?Math.round(H)+'%':'—'}**\n🧪 pH : **${pH?.toFixed(1)||'—'}**\n🌿 Azote : **${N?Math.round(N)+' kg/ha':'—'}**\n\n📡 *Données MySQL en direct — ${d.capteurs.length} nœud(s)*`,
      ar:`\n\n🌡️ الحرارة : **${T?.toFixed(1)||'—'}°C**\n💧 رطوبة التربة : **${H?Math.round(H)+'%':'—'}**\n🧪 pH : **${pH?.toFixed(1)||'—'}**\n🌿 النيتروجين : **${N?Math.round(N)+' كغ/هكتار':'—'}**\n\n📡 *بيانات MySQL مباشرة — ${d.capteurs.length} عقدة*`,
      en:`\n\n🌡️ Temperature: **${T?.toFixed(1)||'—'}°C**\n💧 Soil moisture: **${H?Math.round(H)+'%':'—'}**\n🧪 pH: **${pH?.toFixed(1)||'—'}**\n🌿 Nitrogen: **${N?Math.round(N)+' kg/ha':'—'}**\n\n📡 *Live MySQL data — ${d.capteurs.length} node(s)*`,
    };
    return lines[lang]||lines.fr;
  }
  const offline={fr:'\n\n⚠️ Capteurs hors-ligne — XAMPP non lancé.',ar:'\n\n⚠️ المستشعرات غير متصلة — XAMPP لم يبدأ.',en:'\n\n⚠️ Sensors offline — XAMPP not running.'};
  return offline[lang]||offline.fr;
}

/* ── Chercher réponse ────────────────────────────────────── */
async function trouverReponse(question){
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const lang = _detectLang(question);
  for(const entry of CHAT_KB){
    const hit = entry.keys.some(k=>q.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
    if(hit){
      if(entry.dynamic){
        const prefix = entry[lang]||entry.fr;
        const data   = await _getDynamicReply(lang);
        return prefix + data;
      }
      return entry[lang]||entry.fr;
    }
  }
  const fallback={
    fr:`🤔 Je n'ai pas de réponse précise.\n\nEssayez : **Random Forest**, **LSTM**, **IoT**, **sol**, **capteur IoT**, **irrigation** ou **utilisateur**.`,
    ar:`🤔 لم أجد إجابة دقيقة.\n\nجرّب: **الغابة العشوائية**، **LSTM**، **إنترنت الأشياء**، **التربة**، **بيانات مباشرة**.`,
    en:`🤔 I don't have a precise answer.\n\nTry: **Random Forest**, **LSTM**, **IoT**, **soil**, **live sensors**, **irrigation** or **user**.`,
  };
  return fallback[lang]||fallback.fr;
}

/* ── Formater le texte ───────────────────────────────────── */
function formatMsg(text){
  return text
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>')
    .replace(/`([^`]+)`/g,'<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:11px;">$1</code>');
}

/* ── Text-to-Speech — corrigé Chrome + arabe ─────────────── */
function _speak(text, lang){
  if(!_ttsEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // Nettoyer le texte
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[–—→·➊➋➌➍➎]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 400);

  if(!clean) return;

  const utt  = new SpeechSynthesisUtterance(clean);
  utt.lang   = lang==='ar' ? 'ar-SA' : lang==='en' ? 'en-US' : 'fr-FR';
  utt.rate   = lang==='ar' ? 0.85 : 0.92;
  utt.volume = 1;
  utt.pitch  = 1;

  // Fix Chrome : reprendre si suspendu toutes les 5s
  let resumeTimer = null;
  utt.onstart = () => {
    resumeTimer = setInterval(() => {
      if(window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
  };
  utt.onend = utt.onerror = () => {
    if(resumeTimer) clearInterval(resumeTimer);
  };

  setTimeout(() => { if(_ttsEnabled) window.speechSynthesis.speak(utt); }, 150);
}
/* ── Speech-to-Text — adapté à la langue active ─────────── */
function startSTT(){
  if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
    showNotif('⚠️ Micro non supporté — utilisez Chrome ou Edge'); return;
  }
  if(_sttActive){ showNotif('🎤 Microphone déjà actif'); return; }

  const SR     = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec    = new SR();
  const micBtn = document.getElementById('chat-mic');

  // Langue depuis le système de langue de la plateforme
  const chatLang = (typeof _lang !== 'undefined') ? _lang : 'fr';
  const langMap  = { fr:'fr-FR', ar:'ar-SA', en:'en-US' };
  rec.lang            = langMap[chatLang] || 'fr-FR';
  rec.continuous      = false;
  rec.interimResults  = false;
  rec.maxAlternatives = 1;

  if(micBtn){
    micBtn.style.background = '#dc2626';
    micBtn.textContent      = '🔴';
    micBtn.title = chatLang==='ar' ? 'جارٍ الاستماع...' :
                   chatLang==='en' ? 'Listening...' : 'Écoute en cours…';
  }
  _sttActive = true;

  showNotif(chatLang==='ar' ? '🎤 جارٍ الاستماع...' :
            chatLang==='en' ? '🎤 Listening...' : '🎤 Parlez maintenant…');

  rec.onresult = e => {
    const transcript = e.results[0][0].transcript.trim();
    const inp = document.getElementById('chat-input');
    if(inp && transcript){
      inp.value = transcript;
      setTimeout(()=>envoyerChat(), 100);
    }
  };

  rec.onerror = err => {
    const msgs = {
      'not-allowed' : '🚫 Micro refusé — activez le dans les paramètres du navigateur',
      'no-speech'   : '🔇 Aucune parole détectée — réessayez',
      'network'     : '🌐 Erreur réseau microphone',
      'aborted'     : '',
    };
    const msg = msgs[err.error] || ('⚠️ Erreur: ' + err.error);
    if(msg) showNotif(msg);
  };

  rec.onend = () => {
    _sttActive = false;
    if(micBtn){
      micBtn.style.background = 'var(--green, #16a34a)';
      micBtn.textContent      = '🎤';
      micBtn.title            = 'Parler au microphone';
    }
  };

  try { rec.start(); }
  catch(e){ showNotif('⚠️ Impossible de démarrer le microphone'); _sttActive=false; }
}

/* ── Ajouter un message ───────────────────────────────────── */
function ajouterMessage(role, text, typing=false){
  const msgs = document.getElementById('chat-messages');
  const div  = document.createElement('div');
  div.className = 'chat-msg '+(role==='user'?'user':'bot');
  if(typing){
    div.id='chat-typing-bubble';
    div.innerHTML=`<div class="chat-ava">🌿</div><div class="chat-typing"><span></span><span></span><span></span></div>`;
  }else{
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

/* ── Envoyer ─────────────────────────────────────────────── */
async function envoyerChat(){
  const inp  = document.getElementById('chat-input');
  const q    = inp.value.trim();
  if(!q) return;
  inp.value=''; inp.style.height='auto';
  document.getElementById('chat-send').disabled=true;
  document.getElementById('chat-quick').style.display='none';
  ajouterMessage('user',q);
  const tyBubble = ajouterMessage('bot','',true);
  await new Promise(r=>setTimeout(r,800+Math.random()*500));
  tyBubble.remove();
  const rep = await trouverReponse(q);
  ajouterMessage('bot',rep);
  _speak(rep, _detectLang(q));
  document.getElementById('chat-send').disabled=false;
  inp.focus();
}

function envoyerQuestion(q){
  document.getElementById('chat-input').value=q;
  envoyerChat();
}

/* ── Activer/désactiver voix ─────────────────────────────── */
function toggleTTS(){
  _ttsEnabled = !_ttsEnabled;
  if(!_ttsEnabled) window.speechSynthesis?.cancel();

  const btn = document.getElementById('chat-tts');
  if(btn){
    btn.textContent   = _ttsEnabled ? '🔊' : '🔇';
    btn.title         = _ttsEnabled ? 'Désactiver la voix' : 'Activer la voix';
    btn.style.opacity = _ttsEnabled ? '1' : '0.4';
  }

  const cl = (typeof _lang !== 'undefined') ? _lang : 'fr';
  const msg = _ttsEnabled
    ? (cl==='ar' ? '🔊 الصوت مفعّل' : cl==='en' ? '🔊 Voice enabled'  : '🔊 Voix activée')
    : (cl==='ar' ? '🔇 الصوت معطّل' : cl==='en' ? '🔇 Voice disabled' : '🔇 Voix désactivée');
  showNotif(msg);
}

/* ── Ouvrir/Fermer ───────────────────────────────────────── */
function toggleChat(){
  chatOpen=!chatOpen;
  const win=document.getElementById('chat-window');
  const fab=document.getElementById('chat-fab-ico');
  const badge=document.getElementById('chat-badge');
  if(chatOpen){
    win.classList.add('open'); fab.textContent='✕'; if(badge)badge.style.display='none';
    if(chatFirstOpen){
      chatFirstOpen=false;
      setTimeout(()=>{
        const lang=_detectLang('');
        const greet={
          fr:`🌿 Bonjour **${(CURRENT_USER||{}).prenom||''}** ! Je suis l'assistant AgriSmart.\n\nJe parle 🇫🇷 français, 🇩🇿 arabe et 🇬🇧 anglais. Je peux aussi **parler** 🔊 et **vous écouter** 🎤 !\n\nPosez-moi une question sur vos cultures, capteurs IoT, ou demandez les **données live** de vos capteurs. 🌾`,
          ar:`🌿 مرحباً **${(CURRENT_USER||{}).prenom||''}** ! أنا مساعد AgriSmart.\n\nأتكلم 🇫🇷 فرنسي، 🇩🇿 عربي و 🇬🇧 إنجليزي. يمكنني **الكلام** 🔊 **والاستماع** 🎤 !\n\nاسألني عن المحاصيل أو المستشعرات أو **البيانات المباشرة**. 🌾`,
          en:`🌿 Hello **${(CURRENT_USER||{}).prenom||''}**! I'm the AgriSmart assistant.\n\nI speak 🇫🇷 French, 🇩🇿 Arabic & 🇬🇧 English. I can also **talk** 🔊 and **listen** 🎤!\n\nAsk me about crops, IoT sensors, or request **live sensor data**. 🌾`,
        };
        const msg=greet[lang]||greet.fr;
        ajouterMessage('bot',msg);
        _speak(msg,lang);
      },400);
    }
    setTimeout(()=>document.getElementById('chat-input')?.focus(),300);
  }else{
    win.classList.remove('open'); fab.textContent='🤖';
    window.speechSynthesis?.cancel();
  }
}

setTimeout(()=>{
  if(!chatOpen){const b=document.getElementById('chat-badge');if(b)b.style.display='flex';}
},3000);


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
