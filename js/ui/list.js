// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Renders ranked hikes: good matches first, then everything else by Score.

import { el } from './dom.js';
import { renderCard } from './card.js';
import { goodFirst } from '../recommender.js';

/**
 * bands: output of rank(). ctx = {forecasts, dayIndex, driveHours, images}.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
export function renderList(root, bands, { forecasts = new Map(), dayIndex = 0, driveHours = new Map(), images = {} } = {}) {
  if (!bands.length) {
    root.replaceChildren(el('p', { class: 'muted' }, 'No hikes match these filters.'));
    return;
  }
  const card = ({ hike, band }) => renderCard({
    hike, band, dayIndex,
    forecast: forecasts.get(hike.id),
    driveHrs: driveHours.get(hike.id),
    image: validImage(images[hike.id]),
  });
  const { good, rest } = goodFirst(bands);

  const section = (title, items) => items.length > 0 && el('section', { class: 'group' },
    title && el('h2', {}, title, el('span', { class: 'count' }, String(items.length))),
    el('div', { class: 'cards' }, items.map(card)));

  root.replaceChildren(...[
    section(good.length ? 'Good matches' : '', good),
    section(good.length ? 'More hikes' : forecasts.size ? 'No good weather this day' : '', rest),
  ].filter(Boolean));
}

/** A hand-edited images.json entry is only used when it has a string url. @created Claude (claude-opus-5-5) - 2026-09-28 */
function validImage(entry) {
  return entry && typeof entry.url === 'string' ? entry : undefined;
}
