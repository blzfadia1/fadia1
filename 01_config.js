/* ════════════════════════════════════════════════════════════════
   AgriSmart — 01_config.js — CORRIGE
   NAV_CONFIG maintenant dynamique : labels via T()
════════════════════════════════════════════════════════════════ */
"use strict";

let state = {
  role: 'admin',
  user: 'admin',
  currentPage: 'dashboard',
  sidebarCollapsed: false,
};

let CURRENT_USER = null;

const API       = 'api/api.php';
const USERS_API = 'api/users.php';

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
      const txt = await r.text();
      try { return JSON.parse(txt); } catch { return { success: false, message: 'Réponse PHP invalide' }; }
    }
    return await r.json();
  } catch (e) {
    return { success: false, message: 'Erreur réseau: ' + e.message };
  }
}

/* ── NAV_CONFIG dynamique — labels via T() ── */
function getNavConfig() {
  return {
    admin: [
      { section: T('navSecPrincipal') },
      { id:'dashboard', icon:'🏠', label: T('navDashboard') },
      { id:'rf',        icon:'🌲', label: T('navRF') },
      { id:'lstm',      icon:'📈', label: T('navLSTM') },
      { id:'iot',       icon:'📡', label: T('navIoT') },
      { section: T('navSecGestion') },
      { id:'history',   icon:'📜', label: T('navHistory'), badge:'24' },
      { id:'admin',     icon:'👑', label: T('navAdmin') },
    ],
    agriculteur: [
      { section: T('navSecTerrain') },
      { id:'dashboard', icon:'🏠', label: T('navDashboardAgri') },
      { id:'rf',        icon:'🌾', label: T('navRFAgri') },
      { id:'lstm',      icon:'🌧️', label: T('navLSTMAgri') },
      { section: T('navSecAide') },
      { id:'history',   icon:'📜', label: T('navHistoryAgri') },
    ],
    technicien: [
      { section: T('navSecSystemes') },
      { id:'dashboard', icon:'🏠', label: T('navDashboardTech') },
      { id:'iot',       icon:'📡', label: T('navIoTTech') },
      { id:'lstm',      icon:'📈', label: T('navLSTMTech') },
      { section: T('navSecDonnees') },
      { id:'history',   icon:'📜', label: T('navHistoryTech') },
    ],
  };
}

/* Alias statique pour compatibilité */
const NAV_CONFIG = {
  get admin()       { return getNavConfig().admin; },
  get agriculteur() { return getNavConfig().agriculteur; },
  get technicien()  { return getNavConfig().technicien; },
};
