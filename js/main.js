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
let notes = [];

function render() {
  const { dayIndex, filters } = store.get();
  const bands = rank(hikes, forecasts, { dayIndex, filters });
  renderList($list, bands, driveHours, { heading: forecasts.size > 0 });
  renderControls($controls, store, days);
}

function notice(text, isError = false) {
  $notice.textContent = text;
  $notice.classList.toggle('error', isError);
}

async function loadDriveTimes(origin) {
  try {
    driveHours = await getDriveHours(origin, hikes);
  } catch {
    driveHours = new Map();
    notes.push('drive times unavailable');
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

  render();
  notice('Loading weather and drive times...');

  const origin = await getOrigin();
  if (origin.source === 'home') store.set({ home: { lat: origin.lat, lon: origin.lon } });

  const [weather] = await Promise.allSettled([getForecasts(hikes, DAYS), loadDriveTimes(origin)]);
  if (weather.status === 'fulfilled') {
    forecasts = weather.value;
    days = forecasts.values().next().value?.map(d => d.date) ?? [];
  } else {
    notes.unshift('weather unavailable, sorted by Score only');
  }

  notice(notes.length ? `Offline: ${notes.join('; ')}.` : `Drive times from ${originLabel(origin.source)}.`, notes.length > 0);
  render();

  let lastHome = store.get().home;
  store.subscribe(async state => {
    if (state.home !== lastHome) {
      lastHome = state.home;
      saveHome(state.home);
      notes = [];
      await loadDriveTimes({ ...state.home, source: 'home' });
      notice(notes.length ? `Offline: ${notes.join('; ')}.` : 'Drive times from home.', notes.length > 0);
    }
    render();
  });
}

function originLabel(source) {
  return { home: 'home', geolocation: 'your location', default: 'Vancouver (set a home below)' }[source];
}

start();
