// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Renders ranked bands of cards.

import { el } from './dom.js';
import { renderCard, BAND_LABEL } from './card.js';

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function renderList(root, bands, driveHours = new Map(), { heading = true } = {}) {
  if (!bands.length) {
    root.replaceChildren(el('p', { class: 'muted' }, 'No hikes match these filters.'));
    return;
  }
  root.replaceChildren(...bands.map(({ band, items }) =>
    el('section', { class: 'band' },
      heading && el('h2', {},
        el('span', { class: `badge ${band}` }, BAND_LABEL[band]),
        el('span', { class: 'count' }, `${items.length} hike${items.length === 1 ? '' : 's'}`)),
      el('div', { class: 'cards' },
        items.map(({ hike, day }) => renderCard(hike, day, driveHours.get(hike.id)))))));
}
