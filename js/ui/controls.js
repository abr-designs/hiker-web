// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Filter and day controls. They only call store.set; main reacts to the store.

import { el } from './dom.js';
import { tagLabel } from './card.js';

const ACCESS = ['Ferry', '4x4', 'Kayak'];
const TAGS = ['WATERFALLS', 'BIG_TREES', 'WILDFLOWERS', 'SWIMMING', 'COASTAL_VIEWS', 'MOUNTAIN_VIEWS', 'HISTORY', 'GEOLOGY'];

// Controls re-render on every store change, so the fold-out remembers its own open state.
let tagsOpen = false;

/**
 * days: forecast date strings (empty when there is no forecast).
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
export function renderControls(root, store, days) {
  const { dayIndex, filters, home } = store.get();
  const setFilters = patch => store.set({ filters: { ...filters, ...patch } });
  const toggle = (list, value) => (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  const chip = (label, pressed, onclick, title) =>
    el('button', { type: 'button', class: 'chip', 'aria-pressed': String(pressed), onclick, title, 'data-focus': label }, label);
  const row = (label, ...children) => el('div', { class: 'control-row' }, el('span', { class: 'label' }, label), ...children);

  const homeInput = el('input', {
    type: 'text', placeholder: 'lat, lon', 'aria-label': 'Home as latitude, longitude', 'data-focus': 'home',
    value: home ? `${home.lat}, ${home.lon}` : '',
  });
  const saveHome = () => {
    const [lat, lon] = homeInput.value.split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return store.set({ home: { lat, lon } });
    homeInput.setCustomValidity('Enter latitude, longitude');
    homeInput.reportValidity();
  };
  homeInput.addEventListener('input', () => homeInput.setCustomValidity(''));
  homeInput.addEventListener('keydown', e => e.key === 'Enter' && saveHome());

  // Every store change rebuilds the controls; put keyboard focus back on the same control afterwards.
  const focused = root.contains(document.activeElement) ? document.activeElement.dataset.focus : undefined;

  root.replaceChildren(...[
    days.length > 0 && row('Day', days.map((date, i) =>
      chip(dayLabel(date, i), i === dayIndex, () => store.set({ dayIndex: i }), date))),
    row('Show',
      chip('In season', !!filters.inSeason, () => setFilters({ inSeason: !filters.inSeason })),
      el('select', { 'aria-label': 'Country', 'data-focus': 'country', onchange: e => setFilters({ country: e.target.value }) },
        [['', 'Both countries'], ['CA', 'Canada'], ['US', 'USA']].map(([v, t]) =>
          el('option', { value: v, selected: filters.country === v }, t)))),
    row('Avoid', ACCESS.map(a =>
      chip(a, filters.access.includes(a), () => setFilters({ access: toggle(filters.access, a) })))),
    el('details', { class: 'control-row fold', open: tagsOpen, ontoggle: e => { tagsOpen = e.target.open; } },
      el('summary', { class: 'label', 'data-focus': 'tags' }, 'Tags',
        filters.tags.length > 0 && el('span', { class: 'fold-count' }, el('span', { class: 'sr-only' }, ', '), String(filters.tags.length), el('span', { class: 'sr-only' }, ' selected'))),
      el('div', { class: 'fold-body' }, TAGS.map(t =>
        chip(tagLabel(t), filters.tags.includes(t), () => setFilters({ tags: toggle(filters.tags, t) }))))),
    row('Home', homeInput, chip('Set home', false, saveHome, 'Drive times start here')),
  ].filter(Boolean));

  if (focused) root.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus();
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function dayLabel(date, i) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}
