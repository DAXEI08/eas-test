// Unified UI configuration: responsive layout preset + dimensions. This module owns only presentation state.
// New settings are stored under one key; the old scrabble.dims payload is migrated once when present.
import { DIM_LIMITS, DIMENSIONS, DEFAULT_LAYOUT, LAYOUT_PRESETS } from './config.js';
import { $ } from './state.js';

const KEY = 'scrabble.ui';
const LEGACY_DIMS_KEY = 'scrabble.dims';

const FIELDS = [
  ['boardScale', 'حجم اللوح'],
  ['rackScale', 'حجم الأرفف'],
  ['buttonScale', 'حجم الأزرار'],
  ['buttonGap', 'المسافة بين الأزرار', 'px'],
  ['controlColumns', 'عدد أعمدة الأزرار', 'int'],
  ['historyScale', 'حجم نص السجل'],
  ['historyHeightScale', 'ارتفاع السجل'],
  ['historyWidthScale', 'عرض السجل']
];

const clamp = (k, v) => {
  const [lo, hi, , def] = DIM_LIMITS[k];
  return Number.isFinite(+v) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, +v)) : def;
};
const validLayout = id => LAYOUT_PRESETS[id] ? id : DEFAULT_LAYOUT;
let ui = { layout: DEFAULT_LAYOUT, dims: {...DIMENSIONS} };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') {
      ui.layout = validLayout(saved.layout);
      if (saved.dims && typeof saved.dims === 'object') ui.dims = {...DIMENSIONS, ...saved.dims};
      return;
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_DIMS_KEY));
    if (legacy && typeof legacy === 'object') {
      ui.dims = {...DIMENSIONS, ...legacy};
      save();
      localStorage.removeItem(LEGACY_DIMS_KEY);
    }
  } catch { /* unavailable/corrupt storage -> defaults */ }
}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(ui)); } catch { /* storage unavailable */ }
};
const show = (k, v, kind) => kind === 'px' ? `${Math.round(v)} px` : kind === 'int' ? String(Math.round(v)) : `${Math.round(v * 100)}%`;

export function getLayoutPreset() { return ui.layout; }

export function applyUIConfig() {
  const r = document.documentElement, s = r.style, d = ui.dims;
  r.dataset.layout = validLayout(ui.layout);
  s.setProperty('--board-scale', clamp('boardScale', d.boardScale));
  s.setProperty('--rack-scale', clamp('rackScale', d.rackScale));
  s.setProperty('--btn-scale', clamp('buttonScale', d.buttonScale));
  s.setProperty('--btn-gap', clamp('buttonGap', d.buttonGap) + 'px');
  s.setProperty('--ctrl-cols', Math.round(clamp('controlColumns', d.controlColumns)));
  s.setProperty('--hist-scale', clamp('historyScale', d.historyScale));
  s.setProperty('--hist-hs', clamp('historyHeightScale', d.historyHeightScale));
  s.setProperty('--hist-w', clamp('historyWidthScale', d.historyWidthScale));
}

function layoutPreview(kind) {
  return `<span class="lyPreview ${kind}" aria-hidden="true"><i class="lyBoard"></i><i class="lyP1"></i><i class="lyP2"></i><i class="lyCtrl"></i></span>`;
}

function syncLayoutButtons() {
  $('#lyB').innerHTML = Object.entries(LAYOUT_PRESETS).map(([id, p]) =>
    `<button type="button" class="lyOpt" data-layout="${id}" role="radio" aria-checked="${id === ui.layout}">`
    + layoutPreview(p.preview)
    + `<span class="lyCopy"><b>${p.labelAr}</b><small>${p.labelEn}</small><em>${p.descAr}</em></span></button>`
  ).join('');
}

export function syncDimRows() {
  syncLayoutButtons();
  $('#dmB').innerHTML = FIELDS.map(([k, label, kind]) => {
    const [lo, hi, st] = DIM_LIMITS[k], v = clamp(k, ui.dims[k]);
    return `<div class="setRow"><div class="setRowHead"><label for="dm_${k}">${label}</label><output id="dmo_${k}" for="dm_${k}">${show(k, v, kind)}</output></div>`
      + `<input class="setRange" id="dm_${k}" data-k="${k}" data-kind="${kind || ''}" type="range" min="${lo}" max="${hi}" step="${st}" value="${v}"></div>`;
  }).join('');
}

export function initDims() {
  load();
  applyUIConfig();

  $('#lyB').addEventListener('click', e => {
    const b = e.target.closest('[data-layout]');
    if (!b) return;
    ui.layout = validLayout(b.dataset.layout);
    applyUIConfig(); save(); syncLayoutButtons();
  });

  $('#lyB').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const buttons = [...$('#lyB').querySelectorAll('[data-layout]')], i = buttons.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    buttons[(i + delta + buttons.length) % buttons.length].focus();
  });

  $('#dmB').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k || !DIM_LIMITS[k]) return;
    ui.dims[k] = clamp(k, e.target.value);
    $('#dmo_' + k).textContent = show(k, ui.dims[k], e.target.dataset.kind);
    applyUIConfig(); save();
  });

  $('#dmReset').addEventListener('click', () => {
    ui = { layout: DEFAULT_LAYOUT, dims: {...DIMENSIONS} };
    try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_DIMS_KEY); } catch { /* ignore */ }
    applyUIConfig(); syncDimRows();
  });
}
