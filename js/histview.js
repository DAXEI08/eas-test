// Optional word-history drawer (سجل الكلمات). This is view-only UI: history recording remains in game state.
// The drawer starts closed on every page load, never reserves layout space, and can be dismissed with Escape
// or by interacting elsewhere in the app. It deliberately does not pause or otherwise mutate the game.
import { $ } from './state.js';

export function isHistoryOpen() {
  return $('#hist').classList.contains('is-open');
}

export function setHistoryOpen(open, focus = true) {
  const hist = $('#hist');
  const toggle = $('#hToggle');

  hist.classList.toggle('is-open', open);
  hist.setAttribute('aria-hidden', String(!open));
  hist.toggleAttribute('inert', !open);
  toggle.setAttribute('aria-expanded', String(open));

  if (!focus) return;

  if (open) {
    requestAnimationFrame(() => $('#hClose').focus());
  } else if (hist.contains(document.activeElement)) {
    toggle.focus();
  }
}

export function initHistoryToggle() {
  const hist = $('#hist');
  const toggle = $('#hToggle');

  setHistoryOpen(false, false);

  toggle.addEventListener('click', () => setHistoryOpen(!isHistoryOpen()));
  $('#hClose').addEventListener('click', () => setHistoryOpen(false));

  // Escape belongs to an open native dialog first. Otherwise it closes this secondary drawer.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isHistoryOpen() || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    setHistoryOpen(false);
  });

  // The history is a lightweight utility, not a modal. Clicking elsewhere closes it but leaves
  // the original pointer interaction intact, so the game still feels immediate.
  document.addEventListener('pointerdown', e => {
    if (!isHistoryOpen() || hist.contains(e.target) || toggle.contains(e.target)) return;
    setHistoryOpen(false, false);
  });
}
