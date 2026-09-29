// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Inline stroke icons (Lucide shapes) and the WMO weather code -> icon mapping.

const CLOUD_BASE = '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/>';

const PATHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  partly: '<path d="M12 2v2m-7.07.93 1.41 1.41M20 12h2m-2.93-7.07-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  fog: CLOUD_BASE + '<path d="M16 17H7m10 4H9"/>',
  drizzle: CLOUD_BASE + '<path d="M8 19v1m0-6v1m8 4v1m0-6v1m-4 6v1m0-6v1"/>',
  rain: CLOUD_BASE + '<path d="M16 14v6M8 14v6m4-4v6"/>',
  snow: CLOUD_BASE + '<path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01"/>',
  storm: '<path d="M6 16.3A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 .5 9"/><path d="m13 12-3 5h4l-3 5"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m4 0h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4m0 4h.01"/>',
  mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
};

// Upper bound of each WMO code group -> icon and label.
const SKY = [
  [0, 'sun', 'Clear'], [2, 'partly', 'Partly cloudy'], [3, 'cloud', 'Overcast'], [48, 'fog', 'Fog'],
  [57, 'drizzle', 'Drizzle'], [67, 'rain', 'Rain'], [77, 'snow', 'Snow'], [82, 'rain', 'Showers'],
  [86, 'snow', 'Snow showers'], [99, 'storm', 'Thunderstorm'],
];

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
export function icon(name, label) {
  const span = document.createElement('span');
  span.className = 'icon';
  if (label) span.setAttribute('title', label);
  span.setAttribute(label ? 'role' : 'aria-hidden', label ? 'img' : 'true');
  if (label) span.setAttribute('aria-label', label);
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
  return span;
}

/** Returns [iconName, label] for a WMO weather code. @created Claude (claude-opus-5-5) - 2026-09-28 */
export function sky(code) {
  const hit = SKY.find(([max]) => code <= max) ?? SKY.at(-1);
  return [hit[1], hit[2]];
}
