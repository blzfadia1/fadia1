/* ════════════════════════════════════════════════════════════════
   AgriSmart — 01 — CONFIG — État global, API, Navigation
   state, CURRENT_USER, apiCall(), usersApiCall(), NAV_CONFIG
   Fichier : 01_config.js
════════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let state = {
  role: 'admin',
  user: 'admin',
  currentPage: 'dashboard',
  sidebarCollapsed: false,
};

// Utilisateur connecté (chargé depuis MySQL)
let CURRENT_USER = null;

/* ═══════════════════════════════════════════════════════
   CONFIGURATION API — URL RELATIVE (fonctionne toujours)
   Le fichier HTML doit être ouvert via :
   http://localhost/agrismart/AgriSmart.html
═══════════════════════════════════════════════════════ */
const API       = 'api/api.php';    // capteurs, alertes, IoT, RF, timeline
const USERS_API = 'api/users.php';  // utilisateurs, login

async function apiCall(action, method = 'GET', body = null) {
  try {
    const url  = `${API}?action=${action}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) return { success: false, offline: false, http: r.status };
    return await r.json();
  } catch (e) {
    console.warn('[apiCall] hors-ligne:', e.message);
    return { success: false, offline: true };
  }
}

async function usersApiCall(action, method = 'GET', body = null, id = null) {
  try {
    let url = `${USERS_API}?action=${action}`;
    if (id) url += `&id=${id}`;
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (!r.ok) {
      // Lire le texte brut pour détecter les erreurs PHP
      const txt = await r.text();
      try { return JSON.parse(txt); } catch { return { success: false, message: 'Réponse PHP invalide (vérifiez users.php)' }; }
    }
    return await r.json();
  } catch (e) {
    return { success: false, message: 'Erreur réseau: ' + e.message };
  }
}

/* NAV CONFIG PER ROLE */
const NAV_CONFIG = {
  admin: [
    { section:'Principal' },
    { id:'dashboard', icon:'🏠', label:'Tableau de Bord' },
    { id:'rf',        icon:'🌲', label:'Random Forest' },
    { id:'lstm',      icon:'📈', label:'Prévision LSTM' },
    { id:'iot',       icon:'📡', label:'IoT / ESP32 / LoRa' },
    { section:'Gestion' },
    { id:'history',   icon:'📜', label:'Historique', badge:'24' },
    { id:'admin',     icon:'👑', label:'Administration' },
  ],
  agriculteur: [
    { section:'Mon Terrain' },
    { id:'dashboard', icon:'🏠', label:'Mon Tableau de Bord' },
    { id:'rf',        icon:'🌾', label:'Quelle Culture ?' },
    { id:'lstm',      icon:'🌧️', label:'Prévisions Météo' },
    { section:'Aide' },
    { id:'history',   icon:'📜', label:'Mes Mesures' },
  ],
  technicien: [
    { section:'Systèmes' },
    { id:'dashboard', icon:'🏠', label:'Vue Globale' },
    { id:'iot',       icon:'📡', label:'Capteurs & LoRa' },
    { id:'lstm',      icon:'📈', label:'Modèles IA' },
    { section:'Données' },
    { id:'history',   icon:'📜', label:'Historique' },
  ],
};
