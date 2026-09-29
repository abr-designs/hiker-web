// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Composition root: load hikes, show them by Score, then add weather and drive times.
// States: loading -> hikes (Score only) -> ranked, or error.

import { DAYS } from './config.js';
import { loadHikes } from './hikeStore.js';
import { getForecasts } from './weatherClient.js';
import { getDriveHours } from './routeClient.js';
import { getOrigin, saveHome } from './origin.js';
import { rank } from './recommender.js';
import { createStore } from './state.js';
import { renderList } from './ui/list.js';
import { renderControls } from './ui/controls.js';

const $list = document.getElementById('list');
const $controls = document.getElementById('controls');
const $notice = document.getElementById('notice');

const store = createStore({
  dayIndex: 0,
  filters: { inSeason: false, access: [], country: '', tags: [] },
  home: null,
});

let hikes = [];
let forecasts = new Map();
let driveHours = new Map();
let days = [];
let images = {};
let notes = [];

function render() {
  const { dayIndex, filters } = store.get();
  const bands = rank(hikes, forecasts, { dayIndex, filters });
  renderList($list, bands, { forecasts, dayIndex, driveHours, images, day: days[dayIndex] });
  renderControls($controls, store, days);
}

function notice(text, isError = false) {
  $notice.textContent = text;
  $notice.classList.toggle('error', isError);
}

async function loadDriveTimes(origin) {
  driveHours = await fetchDriveTimes(origin);
}

async function fetchDriveTimes(origin) {
  try {
    return await getDriveHours(origin, hikes);
  } catch {
    notes.push('drive times unavailable');
    return new Map();
  }
}

async function start() {
  try {
    hikes = await loadHikes();
  } catch (err) {
    notice('Could not load hikes.', true);
    $list.replaceChildren(Object.assign(document.createElement('div'), { className: 'error-box', textContent: err.message }));
    return;
  }

  images = await loadImages();
  render();
  notice('Loading weather and drive times...');

  const origin = await getOrigin();
  if (origin.source === 'home') store.set({ home: { lat: origin.lat, lon: origin.lon, name: origin.name } });

  const [weather] = await Promise.allSettled([getForecasts(hikes, DAYS), loadDriveTimes(origin)]);
  if (weather.status === 'fulfilled') {
    forecasts = weather.value;
    days = forecasts.values().next().value?.map(d => d.date) ?? [];
  } else {
    notes.unshift('weather unavailable, sorted by Score only');
  }

  notice(notes.length ? `Offline: ${notes.join('; ')}.` : `Drive times from ${origin.name ?? originLabel(origin.source)}.`, notes.length > 0);
  render();

  let lastHome = store.get().home;
  store.subscribe(async state => {
    render();
    if (state.home === lastHome) return;
    const home = lastHome = state.home;
    saveHome(home);
    notes = [];
    const hours = await fetchDriveTimes({ ...home, source: 'home' });
    // A newer home was picked while this one loaded: its own request will finish the job.
    if (home !== lastHome) return;
    driveHours = hours;
    notice(notes.length ? `Offline: ${notes.join('; ')}.` : `Drive times from ${home.name ?? 'home'}.`, notes.length > 0);
    render();
  });
}

/**
 * Photos are optional: a missing or broken images.json just means cards use the fallback art.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
async function loadImages() {
  try {
    const res = await fetch('data/images.json', { cache: 'no-cache' });
    const body = res.ok ? await res.json() : null;
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

function originLabel(source) {
  return { home: 'home', geolocation: 'your location', default: 'Vancouver (set a home above)' }[source];
}

start();
