// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// One batched Open-Meteo request for every hike with coordinates, cached for WEATHER_TTL_MS.

import { OPEN_METEO_URL, WEATHER_TTL_MS } from './config.js';
import { cacheGet, cacheSet } from './cache.js';

const DAILY = 'temperature_2m_max,temperature_2m_min,cloud_cover_mean,precipitation_probability_max,visibility_mean,weather_code';

/**
 * Resolves to Map<hikeId, DayForecast[]> where DayForecast = {date, highC, lowC, cloudPct, popPct, visKm, code}.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
export async function getForecasts(hikes, days) {
  const located = hikes.filter(h => Number.isFinite(h.lat) && Number.isFinite(h.lon));
  if (!located.length) return new Map();

  const lats = located.map(h => h.lat).join(',');
  const lons = located.map(h => h.lon).join(',');
  const cacheKey = `weather:${days}:${lats}:${lons}`;
  let byId = cacheGet(cacheKey);

  if (!byId) {
    const url = `${OPEN_METEO_URL}?latitude=${lats}&longitude=${lons}&daily=${DAILY}&forecast_days=${days}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
    const body = await res.json();
    const locations = Array.isArray(body) ? body : [body];
    byId = Object.fromEntries(located.map((h, i) => [h.id, normalize(locations[i].daily)]));
    cacheSet(cacheKey, byId, WEATHER_TTL_MS);
  }
  return new Map(Object.entries(byId));
}

function normalize(d) {
  return d.time.map((date, i) => ({
    date,
    highC: d.temperature_2m_max[i],
    lowC: d.temperature_2m_min[i],
    cloudPct: d.cloud_cover_mean[i],
    popPct: d.precipitation_probability_max[i],
    visKm: d.visibility_mean[i] / 1000,
    code: d.weather_code[i],
  }));
}
