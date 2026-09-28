<!-- Created by Claude (claude-opus-5-5) -->
<!-- Date: 2026-09-28 -->

# Plan: Hiker Web App

| Field | Value |
|---|---|
| Status | In Progress |
| Created | 2026-09-28 |
| Updated | 2026-09-28 |
| Proficiency | 6/10 |
| Engine | Vanilla HTML / CSS / JS (ES modules), static hosting, no backend |
| Revisions | 1 (latest: U-001) |
| Summary | Hike cards ranked by the sheet's hike Score, grouped into weather bands per forecast day, with drive times. |

## Revision Log

| ID | Date | Type | Change |
|---|---|---|---|
| U-001 | 2026-09-28 | Update | Origin prefers saved home over geolocation; test command uses a glob; convert title-cases names; ui/dom.js element helper added. |

---

## Overview

A static web app that lists local hikes as cards. Each hike's Score (the existing sheet formula, lower = more reasonable) is computed at load time from raw fields in `data/hikes.json`, so new hikes score automatically. For a chosen forecast day, Open-Meteo weather at each hike's coordinates is scored with the ported `CALCULATE_WEATHER_SCORE_` and mapped to a band (Good / Fair / Poor / No-go). Cards are grouped by band and sorted by hike Score inside each band. Drive time from the user's location comes from the public OSRM table API. All data is local JSON; both network APIs are keyless and CORS-enabled.

Sources:
- Hikes sheet: `1eUzQCbDm2AfgOawIlJ-SIHXCTanjhqk5Lnr42b-yVX8` (sheets `Local`, `Database`, `Weather`)
- Flags sheet: `1g00f4stIu9Qpc4NAcMmX5gcQAIr5A8g6jrLbOunUUNE` (sheets `Months`, `Trail Tags`, `Access Tags`)

## Architecture

```mermaid
classDiagram
  class main { composition root }
  class hikeStore { loadHikes() }
  class hikeScore { hikeScore(hike) }
  class weatherScore { weatherScore(day) }
  class weatherClient { getForecasts(hikes, days) }
  class routeClient { getDriveHours(origin, hikes) }
  class origin { getOrigin() }
  class cache { cacheGet / cacheSet }
  class recommender { rank(hikes, forecasts, opts) }
  class state { createStore(initial) }
  class ui { card / list / controls }
  main --> hikeStore
  main --> weatherClient
  main --> routeClient
  main --> origin
  main --> recommender
  main --> state
  main --> ui
  hikeStore --> hikeScore
  recommender --> weatherScore
  weatherClient --> cache
  routeClient --> cache
  ui ..> state : subscribe
```

## Key Flows

### Startup and ranking

```mermaid
sequenceDiagram
  participant M as main
  participant HS as hikeStore
  participant WC as weatherClient
  participant RC as routeClient
  participant C as cache (localStorage)
  participant R as recommender
  participant UI as ui
  M->>HS: loadHikes()
  HS-->>M: Hike[] with score
  M->>UI: renderList(hikes sorted by score)
  par weather
    M->>WC: getForecasts(hikes with coords, DAYS)
    WC->>C: cacheGet (TTL 3h)
    WC-->>M: Map<id, DayForecast[]>
  and drive time
    M->>RC: getDriveHours(origin, hikes)
    RC->>C: cacheGet keyed by origin (TTL 7d)
    RC-->>M: Map<id, hours>
  end
  M->>R: rank(hikes, forecasts, {day, filters})
  R-->>UI: Band[]
```

### App state

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> HikesOnly : hikes.json loaded
  Loading --> Error : hikes.json missing or invalid
  HikesOnly --> Ranked : forecasts loaded
  HikesOnly --> HikesOnly : network failure (cards sorted by Score, no bands)
  Ranked --> Ranked : day or filter change (no refetch)
```

## Components

### hikeScore (`js/hikeScore.js`)
Responsibility: the only home of the sheet Score formula.
Pattern: Strategy (pure function injected where needed).

- `hikeScore(hike) -> number`: `((lengthKm*1000 + gainM*2) / (10/timeHrs)) * 2^difficulty * 2^accessibility / quality / 1000`. Verified against all 64 `Local` rows to 2 decimals.

### weatherScore (`js/weatherScore.js`)
Responsibility: exact port of `CALCULATE_WEATHER_SCORE_`.

- `weatherScore({highC, lowC, cloudPct, popPct, visKm}) -> number | Infinity`: Infinity when `highC >= 30 || highC <= 5`; otherwise `round((popPct*2 + cloudPct)^2 + 2^(visKm/30)) / 100`.
- `bandFor(score) -> 'good' | 'fair' | 'poor' | 'nogo'` using `BANDS` from config.

### hikeStore (`js/hikeStore.js`)
Responsibility: fetch and validate `data/hikes.json`, attach `score`.
Owns: `data/hikes.json`.

- `loadHikes() -> Promise<Hike[]>`: throws on missing required fields with the hike name in the message.

### weatherClient (`js/weatherClient.js`)
Responsibility: one batched Open-Meteo request for all hikes with coordinates.

- `getForecasts(hikes, days) -> Promise<Map<id, DayForecast[]>>`: daily `temperature_2m_max, temperature_2m_min, cloud_cover_mean, precipitation_probability_max, visibility_mean, weather_code`, `timezone=auto`. Converts `visibility_mean` metres to km.

### routeClient (`js/routeClient.js`)
Responsibility: drive hours from origin via `router.project-osrm.org/table/v1/driving` with `sources=0&annotations=duration`.

- `getDriveHours(origin, hikes) -> Promise<Map<id, number>>`: one request per origin; cache key is origin rounded to 2 decimals.

### origin (`js/origin.js`)
- `getOrigin() -> Promise<{lat, lon, source}>`: saved home from localStorage, else browser geolocation, else `config.DEFAULT_HOME`. A saved home is an explicit choice, so it wins.
- `saveHome({lat, lon})`.

### cache (`js/cache.js`)
- `cacheGet(key) -> value | null`, `cacheSet(key, value, ttlMs)`. All storage access wrapped in try/catch.

### recommender (`js/recommender.js`)
Responsibility: filter, band, sort. Pure.
Pattern: Pipeline (filter -> band -> sort).

- `rank(hikes, forecasts, {dayIndex, filters, month}) -> Band[]`: hikes without a forecast go to an `unknown` band after the others; each band sorted by `score` ascending.
- Filters: `inSeason` (month in `hike.months`), `access` (exclude selected access tags), `country`, `tags` (require any selected).

### state (`js/state.js`)
Pattern: Observer.

- `createStore(initial) -> {get, set(patch), subscribe(fn)}`. Holds `{dayIndex, filters}`.

### ui (`js/ui/`)
- `card.js` `renderCard(hike, dayForecast, driveHrs) -> Element`: name, AllTrails link, Score, length / time / gain, difficulty, quality, tags, access, season, weather summary + band, drive time.
- `list.js` `renderList(root, bands, driveHours)`.
- `dom.js` `el(tag, attrs, ...children)` element helper shared by the three views.
- `controls.js` `renderControls(root, store, days)`: day picker, season / access / country / tag filters, set-home input.

### convert (`tools/convert.mjs`)
Responsibility: one-time import from sheet CSVs in `data/source/` to `data/hikes.json`.

- Local supplies every Score input. Database adds `lat`, `lon`, `months`, `tags`, `access`, joined on trail name (case-insensitive, trimmed).
- Decodes bitmasks to names (tables below). `country` = `US` when Local Restrictions contains `USA`, else `CA`. Local "When To Visit" kept as `notes`.
- Title-cases display names (the sheet mixes cases).
- Reports unmatched names and field conflicts to stdout.

## Data

### Hike shape

```json
{ "id": "joffre-lakes", "name": "Joffre Lakes", "allTrails": "https://...",
  "lat": 50.3695, "lon": -122.4988, "lengthKm": 9.5, "timeHrs": 4, "gainM": 360,
  "difficulty": 1, "quality": 5, "accessibility": 2,
  "months": [8, 9], "tags": [], "access": [], "country": "CA", "notes": "june-September" }
```

Required: `id, name, lengthKm, timeHrs, gainM, difficulty, quality, accessibility`. Optional: everything else (no `lat/lon` means no weather or drive time).

### Bitmask tables (from the flags sheet)

| Months | Trail Tags | Access Tags |
|---|---|---|
| Jan=1 ... Dec=2048 (bit 0 = Jan) | WATERFALLS=1, BIG_TREES=2, WILDFLOWERS=4, SWIMMING=8, COASTAL_VIEWS=16, MOUNTAIN_VIEWS=32, HISTORY=64, GEOLOGY=128 | Ferry=1, 4x4=2, Kayak=4 (Database column `Offroading`) |

### Weather bands (`config.BANDS`, tunable)

| Band | Weather score |
|---|---|
| good | <= 25 |
| fair | <= 100 |
| poor | > 100 |
| nogo | Infinity |

## Patterns Applied

| Pattern | Where | Why |
|---|---|---|
| Strategy | hikeScore, weatherScore | formulas are pure, tested and swappable apart from UI |
| Pipeline | recommender | filter, band and sort stay independent steps |
| Observer | state -> ui | controls change state; list re-renders without refetching |
| Cache-aside | weatherClient, routeClient | respect API fair use, fast reloads |

## Open Questions
- [ ] `2^(vis/30)` raises the weather score as visibility improves (lower is better elsewhere). Ported as written; effect is under 0.02. Flip later if desired.
- [ ] Band thresholds are first guesses; tune after a week of real forecasts.

## Implementation Notes
- Serve over http (`npx serve` or VS Code Live Server); `file://` blocks ES modules and `fetch`.
- Tests: `node --test "tests/*.test.mjs"`, no package.json (Node 25 rejects a bare directory argument). `hikeScore` test checks all 64 current sheet values.
- Order: convert + data, pure scoring, store, clients, recommender, UI, polish.
- Render cards before any network call finishes; network failures degrade to Score-only sorting.
- OSRM public server: about 1 request per second, cache per origin. Ferry legs are approximate.
- No API keys anywhere in the repo.
