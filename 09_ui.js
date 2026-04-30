/* ════════════════════════════════════════════════════════════════
   AgriSmart — 09_ui.js
   UI — Notifications, Navigation Mobile, Horloge
   showNotif(), buildMobileNav(), updateMobileNav(), toggleMobileSidebar()
   ✅ CNN ajouté dans MOB_NAV_ITEMS pour les 3 rôles
════════════════════════════════════════════════════════════════ */

"use strict";

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
  admin: [
    { id:'dashboard', ico:'🏠',  lbl:'Accueil'  },
    { id:'rf',        ico:'🌲',  lbl:'RF'       },
    { id:'lstm',      ico:'📈',  lbl:'LSTM'     },
    { id:'iot',       ico:'📡',  lbl:'IoT'      },
    { id:'cnn',       ico:'🗺️', lbl:'CNN'      },
    { id:'admin',     ico:'👑',  lbl:'Admin'    },
  ],
  agriculteur: [
    { id:'dashboard', ico:'🏠',  lbl:'Accueil'  },
    { id:'rf',        ico:'🌾',  lbl:'Culture'  },
    { id:'lstm',      ico:'🌧️', lbl:'Météo'    },
    { id:'cnn',       ico:'🗺️', lbl:'Zones'    },
    { id:'history',   ico:'📜',  lbl:'Mesures'  },
  ],
  technicien: [
    { id:'dashboard', ico:'🏠',  lbl:'Accueil'  },
    { id:'iot',       ico:'📡',  lbl:'Capteurs' },
    { id:'lstm',      ico:'📈',  lbl:'IA'       },
    { id:'cnn',       ico:'🗺️', lbl:'Zones'    },
    { id:'history',   ico:'📜',  lbl:'Données'  },
  ],
};

function buildMobileNav() {
  const items = MOB_NAV_ITEMS[state.role] || MOB_NAV_ITEMS.admin;
  const nav = document.getElementById('mobile-nav');
  nav.innerHTML = '<div class="mobile-nav-items">' +
    items.map(it => `
      <button class="mob-nav-item" id="mob-${it.id}" onclick="navigateTo('${it.id}')">
        <span class="mni">${it.ico}</span>${it.lbl}
      </button>`).join('') +
    '</div>';
}

function updateMobileNav(id) {
  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('mob-' + id);
  if (el) el.classList.add('active');
}

function toggleMobileSidebar() {
  const sb   = document.getElementById('sidebar');
  const ov   = document.getElementById('sidebar-overlay');
  const open = sb.classList.contains('mob-open');
  if (open) {
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
