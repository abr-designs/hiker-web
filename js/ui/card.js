// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// One hike card.

import { el } from './dom.js';
import { weatherScore, bandFor } from '../weatherScore.js';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// WMO weather codes, grouped.
const SKY = [
  [0, 'Clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [48, 'Fog'], [57, 'Drizzle'],
  [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm'],
];

export const BAND_LABEL = { good: 'Good', fair: 'Fair', poor: 'Poor', nogo: 'No-go', unknown: 'No forecast' };

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function renderCard(hike, day, driveHrs) {
  const title = hike.allTrails
    ? el('a', { href: hike.allTrails, target: '_blank', rel: 'noopener' }, hike.name)
    : hike.name;

  return el('article', { class: 'card' },
    el('div', { class: 'card-head' },
      el('h3', {}, title),
      el('div', { class: 'score', title: 'Hike Score (lower is more reasonable)' },
        el('b', {}, hike.score.toFixed(1)), el('span', {}, 'Score'))),
    el('div', { class: 'stats' },
      el('span', {}, `${hike.lengthKm} km`),
      el('span', {}, `${hike.timeHrs} h`),
      el('span', {}, `${hike.gainM} m gain`),
      el('span', { title: 'Difficulty' }, `Diff ${hike.difficulty}/5`),
      el('span', { title: `Quality ${hike.quality}/5` }, '★'.repeat(hike.quality) + '☆'.repeat(Math.max(0, 5 - hike.quality)))),
    el('div', { class: 'meta' },
      el('span', {}, season(hike)),
      el('span', {}, hike.country === 'US' ? 'USA' : 'Canada'),
      driveHrs === undefined
        ? el('span', { class: 'placeholder' }, 'Drive time unknown')
        : el('span', {}, `${driveHrs.toFixed(1)} h drive`)),
    hike.tags.length + hike.access.length > 0 && el('div', { class: 'tags' },
      hike.tags.map(t => el('span', { class: 'tag' }, tagLabel(t))),
      hike.access.map(a => el('span', { class: 'tag access', title: 'Access' }, a))),
    renderWeather(hike, day));
}

function renderWeather(hike, day) {
  if (!day) {
    const why = Number.isFinite(hike.lat) ? 'No forecast' : 'No coordinates, no forecast';
    return el('div', { class: 'weather' }, el('span', { class: 'placeholder' }, why));
  }
  const score = weatherScore(day);
  const band = bandFor(score);
  return el('div', { class: 'weather' },
    el('span', { class: `badge ${band}`, title: `Weather score ${score === Infinity ? 'no-go' : score.toFixed(2)}` }, BAND_LABEL[band]),
    el('span', {}, sky(day.code)),
    el('span', {}, `${Math.round(day.highC)}° / ${Math.round(day.lowC)}°`),
    el('span', {}, `${day.popPct}% rain`),
    el('span', {}, `${day.cloudPct}% cloud`));
}

function season(hike) {
  if (!hike.months) return hike.notes || 'Season unknown';
  if (hike.months.length === 12) return 'All year';
  return `${MONTH[hike.months[0] - 1]}-${MONTH[hike.months.at(-1) - 1]}`;
}

function sky(code) {
  return SKY.find(([max]) => code <= max)?.[1] ?? '';
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function tagLabel(tag) {
  return tag.charAt(0) + tag.slice(1).toLowerCase().replace(/_/g, ' ');
}
