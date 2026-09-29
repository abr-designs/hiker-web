// Created by Claude (claude-opus-5-5)
// Date: 2026-09-28
// Finds a candidate photo per hike (Wikimedia Commons, then Openverse) and writes data/images.json
// ({id: {url, page, credit, title}}). Matches are by title only, so check each new entry by eye and set wrong ones to false
// (rejected: never looked up again; null means nothing was found and --retry-misses tries again).
// Keeps existing entries (hand edits win); only hikes missing from the file are looked up.
// Run from the repo root: node tools/images.mjs   (add --retry-misses to look up null entries again)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const OPENVERSE = 'https://api.openverse.org/v1/images/';
const HEADERS = { 'User-Agent': 'Hiker/1.0 (personal static app; one-off image import)' };
const PACE_MS = 4000;
const BACKOFF_MS = 60000;
const ATTEMPTS = 5;
const OUT = new URL('../data/images.json', import.meta.url);

// Words that say nothing about which hike a photo shows.
const GENERIC = new Set(['mount', 'mountain', 'mt', 'lake', 'lakes', 'peak', 'trail', 'ridge', 'creek', 'canyon', 'pass',
  'falls', 'hill', 'loop', 'the', 'and', 'of', 'summit', 'park', 'provincial', 'tarn', 'meadows', 'glacier', 'river']);

// An Openverse photo has no location, so its title or tags must also say it is outdoors or in the region.
const SCENIC = ['mountain', 'mount', 'lake', 'trail', 'hike', 'hiking', 'peak', 'summit', 'ridge', 'view', 'landscape',
  'forest', 'park', 'island', 'canada', 'british columbia', 'britishcolumbia', 'bc', 'washington', 'cascades', 'glacier', 'alpine'];

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Lowercase text with every non-alphanumeric run turned into one space, padded for whole-word checks. @created Claude (claude-opus-5-5) - 2026-09-28 */
const words = text => ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;

/** Distinctive lowercase words of a hike name; a photo title must contain all of them. @created Claude (claude-opus-5-5) - 2026-09-28 */
export const keyWords = name => words(name).trim().split(' ').filter(w => w.length > 2 && !GENERIC.has(w));

/** True when `title` contains every key word as a whole word. @created Claude (claude-opus-5-5) - 2026-09-28 */
export const titleMatches = (title, keys) => {
  const t = words(title);
  return keys.every(k => t.includes(` ${k} `));
};

/** True when title or tags mention a scenic or regional term. @created Claude (claude-opus-5-5) - 2026-09-28 */
export const looksScenic = (title, tags = []) => {
  const t = words(`${title} ${tags.join(' ')}`);
  return SCENIC.some(s => t.includes(` ${s} `));
};

/** Text of an HTML fragment (Commons Artist is HTML). @created Claude (claude-opus-5-5) - 2026-09-28 */
const plain = html => html?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || undefined;

/**
 * GET JSON with retries. 429, 5xx, non-JSON bodies and API error objects are retried after BACKOFF_MS;
 * after ATTEMPTS it throws, so the caller skips the hike instead of saving a false miss.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
async function getJson(url) {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let reason;
    try {
      const res = await fetch(url, { headers: HEADERS });
      const text = await res.text();
      if (res.ok) {
        const body = JSON.parse(text);
        if (!body.error) {
          await sleep(PACE_MS);
          return body;
        }
        reason = `API error ${body.error.code ?? ''}`;
      } else reason = `HTTP ${res.status}`;
    } catch (err) {
      reason = err.message;
    }
    console.log(`  ${reason}; waiting ${BACKOFF_MS / 1000}s (attempt ${attempt}/${ATTEMPTS})`);
    await sleep(BACKOFF_MS);
  }
  throw new Error(`gave up on ${new URL(url).host}`);
}

/** First Commons hit (in search order) whose title has all `keys`, or null. @created Claude (claude-opus-5-5) - 2026-09-28 */
async function commons(query, keys = []) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', maxlag: '5', generator: 'search', gsrnamespace: '6', gsrlimit: '10',
    gsrsearch: `${query} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900',
    iiextmetadatafilter: 'Artist|LicenseShortName',
  });
  const body = await getJson(`${COMMONS}?${params}`);
  const page = Object.values(body.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .find(p => titleMatches(p.title, keys));
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    url: info.thumburl ?? info.url,
    page: info.descriptionurl,
    title: page.title.replace(/^File:/, ''),
    credit: credit(plain(meta.Artist?.value), plain(meta.LicenseShortName?.value), 'Wikimedia Commons'),
  };
}

/**
 * Openverse, excluding Commons (searched already). All CC licences are accepted: this is a personal, non-commercial
 * app that shows photos unmodified, and the credit names the licence.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
async function openverse(query, keys) {
  const params = new URLSearchParams({
    q: query, page_size: '20', excluded_source: 'wikimedia',
  });
  const body = await getJson(`${OPENVERSE}?${params}`);
  const hit = (body.results ?? []).find(p =>
    p.title && titleMatches(p.title, keys) && looksScenic(p.title, (p.tags ?? []).map(t => t.name))
    && (p.width ?? 1) >= (p.height ?? 1));
  if (!hit) return null;
  return { url: hit.url, page: hit.foreign_landing_url, credit: credit(hit.creator, licence(hit), hit.source), title: hit.title };
}

/** @created Claude (claude-opus-5-5) - 2026-09-28 */
function licence({ license, license_version: version }) {
  if (license === 'cc0') return 'CC0';
  if (license === 'pdm') return 'Public domain';
  return `CC ${license.toUpperCase()}${version ? ` ${version}` : ''}`;
}

/** "Author, Licence (Source)". @created Claude (claude-opus-5-5) - 2026-09-28 */
function credit(author, licenceName, source) {
  return `${author ?? 'Unknown author'}, ${licenceName ?? 'licence on source page'} (${source})`;
}

/**
 * Most specific first: Commons name near the hike, then Openverse name with region, then name alone.
 * A nearby photo that does not name the hike is never used: it rarely shows the hike itself.
 * @created Claude (claude-opus-5-5) - 2026-09-28
 */
async function findImage(hike) {
  const located = Number.isFinite(hike.lat) && Number.isFinite(hike.lon);
  const region = hike.country === 'US' ? 'Washington' : 'British Columbia';
  const keys = keyWords(hike.name);
  return (located ? await commons(`${hike.name} nearcoord:15km,${hike.lat},${hike.lon}`, keys) : await commons(`"${hike.name}"`, keys))
    ?? await openverse(`${hike.name} ${region}`, keys)
    ?? await openverse(hike.name, keys);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hikes = JSON.parse(readFileSync(new URL('../data/hikes.json', import.meta.url), 'utf8'));
  const images = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const retryMisses = process.argv.includes('--retry-misses');
  let skipped = 0;

  for (const hike of hikes) {
    if (hike.id in images && (images[hike.id] !== null || !retryMisses)) continue;
    try {
      images[hike.id] = await findImage(hike);
    } catch (err) {
      // Not saved, so the next run tries this hike again.
      skipped++;
      console.log(`${hike.name}: skipped (${err.message})`);
      continue;
    }
    console.log(`${hike.name}: ${images[hike.id] ? `${images[hike.id].title} <${images[hike.id].page}>` : 'no image'}`);
    writeFileSync(OUT, JSON.stringify(images, null, 2) + '\n');
  }
  const found = Object.values(images).filter(Boolean).length;
  console.log(`${found}/${hikes.length} hikes have an image${skipped ? `; ${skipped} skipped, run again to retry them` : ''}`);
}
