// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// One hike card: photo background, name, stats, multi-day weather strip, chips, action button.

import { el } from './dom.js';
import { icon, sky } from './icons.js';
import { weatherScore, bandFor } from '../weatherScore.js';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DIFFICULTY = ['Easy', 'Moderate', 'Challenging', 'Hard', 'Extreme'];
export const TAG_ICONS = {
  WATERFALLS: 'droplets', BIG_TREES: 'tree', WILDFLOWERS: 'flower', SWIMMING: 'waves',
  COASTAL_VIEWS: 'sailboat', MOUNTAIN_VIEWS: 'mountain', HISTORY: 'landmark', GEOLOGY: 'gem',
};

/**
 * forecast: DayForecast[] from today (undefined when there is none). band: 'good' marks a good match.
 * image: {url, page, credit} from data/images.json, or undefined.
 * onOpen: called when the card is clicked (the name is also a button for keyboards). expanded: the modal version,
 * with titled facts and every tag. weather: an element that replaces the weather strip.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
export function renderCard({ hike, forecast, dayIndex, band, driveHrs, image, onOpen, expanded = false, weather }) {
  const link = hike.allTrails
    ? { href: hike.allTrails, text: 'View on AllTrails' }
    : Number.isFinite(hike.lat) && { href: `https://www.google.com/maps/dir/?api=1&destination=${hike.lat},${hike.lon}`, text: 'Directions' };

  const card = el('article', { class: ['card', !image && 'no-photo', onOpen && 'openable', expanded && 'expanded'].filter(Boolean).join(' '), 'data-hike': hike.id },
    image && renderCredit(image),
    !image && el('span', { class: 'backdrop' }, icon('mountain')),
    el('div', { class: 'card-body' },
      el('h3', {}, onOpen ? el('button', { type: 'button', class: 'card-open', onclick: onOpen }, hike.name) : hike.name),
      expanded
        ? el('dl', { class: 'facts' },
          fact('Distance', `${hike.lengthKm} km`), fact('Time', `${hike.timeHrs} h`), fact('Elevation', `${hike.gainM} m`))
        : el('p', { class: 'stats' }, `${hike.lengthKm} km, ${hike.timeHrs} h, ${hike.gainM} m gain`),
      weather ?? renderWeather(hike, forecast, dayIndex),
      el('div', { class: 'chips' },
        band === 'good' && chip('trophy', 'Good match', 'good'),
        DIFFICULTY[hike.difficulty - 1] && chip(null, DIFFICULTY[hike.difficulty - 1], `diff diff-${hike.difficulty}`),
        driveHrs !== undefined && chip('car', `${driveHrs.toFixed(1)} h drive`),
        chip('calendar', season(hike)),
        hike.access.map(a => chip('alert', a, 'warn')),
        (expanded ? hike.tags : hike.tags.slice(0, 2)).map(t => chip(TAG_ICONS[t], tagLabel(t)))),
      link && el('a', { class: 'action', href: link.href, target: '_blank', rel: 'noopener' }, link.text)));

  // JSON string quoting is a valid CSS string, so quotes or backslashes in a hand-entered URL cannot break out.
  if (onOpen) card.addEventListener('click', e => e.target.closest('a, button') || onOpen());
  if (image) card.style.setProperty('--photo', `url(${JSON.stringify(image.url)})`);
  return card;
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function renderCredit(image) {
  const text = `Photo: ${image.credit ?? 'see source'}`;
  return image.page
    ? el('a', { class: 'credit', href: image.page, target: '_blank', rel: 'noopener', title: text }, text)
    : el('span', { class: 'credit', title: text }, text);
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function fact(title, value) {
  return el('div', {}, el('dt', {}, title), el('dd', {}, value));
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function chip(iconName, text, tone) {
  return el('span', { class: `chip-tag${tone ? ` ${tone}` : ''}` }, iconName && icon(iconName), text);
}

/**
 * One column per day. Selection and good weather are visual only, so each day also carries a
 * visually hidden sentence for screen readers and the visible parts are hidden from them.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
export function renderWeather(hike, forecast, dayIndex) {
  if (!forecast) {
    const why = Number.isFinite(hike.lat) ? 'No forecast right now' : 'No coordinates, no forecast';
    return el('p', { class: 'forecast-missing' }, why);
  }
  return el('ol', { class: 'forecast', 'aria-label': 'Forecast' },
    forecast.map((day, i) => {
      const [name, label] = sky(day.code);
      const good = bandFor(weatherScore(day)) === 'good';
      const summary = `${label}, high ${Math.round(day.highC)}°, low ${Math.round(day.lowC)}°, ${day.popPct}% rain${good ? ', good hiking weather' : ''}`;
      return el('li', {
        class: [i === dayIndex && 'selected', good && 'good'].filter(Boolean).join(' ') || undefined,
        'aria-current': i === dayIndex && 'date',
        title: summary,
      },
      el('span', { class: 'sr-only' }, `${i === 0 ? 'Today' : weekday(day.date, 'long')}: ${summary}`),
      el('span', { class: 'dow', 'aria-hidden': 'true' }, i === 0 ? 'Today' : weekday(day.date)),
      icon(name),
      el('span', { class: 'temp', 'aria-hidden': 'true' }, `${Math.round(day.highC)}°`));
    }));
}

/** "Today", "Tomorrow", then "Wed 30". @created Claude (claude-opus-5-5) - 2026-09-28 */
export function dayLabel(date, i) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function weekday(date, style = 'short') {
  return new Date(`${date}T12:00`).toLocaleDateString(undefined, { weekday: style });
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function season(hike) {
  if (!hike.months) return hike.notes || 'Season unknown';
  if (hike.months.length === 12) return 'All year';
  return `${MONTH[hike.months[0] - 1]}-${MONTH[hike.months.at(-1) - 1]}`;
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function tagLabel(tag) {
  return tag.charAt(0) + tag.slice(1).toLowerCase().replace(/_/g, ' ');
}
