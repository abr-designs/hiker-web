<!-- Created by Claude (claude-opus-5-5) -->
<!-- Date: 2026-09-28 -->

# Hiker

Local hikes as cards, grouped by the forecast weather at each trailhead and sorted by the hike Score (lower = more reasonable). Static HTML, CSS and JS; no server, no API keys. Weather comes from [Open-Meteo](https://open-meteo.com) and drive times from the public [OSRM](https://project-osrm.org) server, both cached in the browser.

Design: [docs/plans/0001-hiker-web-app.md](docs/plans/0001-hiker-web-app.md).

## Run

ES modules and `fetch` need http, so serve the folder:

```bash
npx serve .
```

VS Code Live Server works too. Opening `index.html` from disk does not.

## Test

```bash
node --test "tests/*.test.mjs"
```

`tests/hikeScore.test.mjs` checks the Score formula against every row of the sheet export in `data/source/Local.csv`.

## Add a hike

Append an object to `data/hikes.json`. The Score is computed on load, so leave it out.

```json
{
  "id": "mount-seymour",
  "name": "Mount Seymour",
  "allTrails": "https://www.alltrails.com/...",
  "lat": 49.3663, "lon": -122.9486,
  "lengthKm": 8, "timeHrs": 4, "gainM": 450,
  "difficulty": 2, "quality": 4, "accessibility": 2,
  "months": [6, 7, 8, 9, 10],
  "tags": ["MOUNTAIN_VIEWS"],
  "access": [],
  "country": "CA",
  "notes": "June-October"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique slug. |
| `name` | yes | |
| `lengthKm`, `timeHrs`, `gainM` | yes | Numbers. |
| `difficulty`, `quality`, `accessibility` | yes | Same 1 to 5 scales as the sheet. |
| `lat`, `lon` | no | Without them the hike gets no weather or drive time. |
| `months` | no | Month numbers, 1 = January. Leave out when unknown; the In season filter keeps such hikes. |
| `tags` | no | Any of `WATERFALLS`, `BIG_TREES`, `WILDFLOWERS`, `SWIMMING`, `COASTAL_VIEWS`, `MOUNTAIN_VIEWS`, `HISTORY`, `GEOLOGY`. |
| `access` | no | Any of `Ferry`, `4x4`, `Kayak`. |
| `country` | no | `CA` or `US`. |
| `allTrails`, `notes` | no | |

A missing required field stops the app with a message naming the hike.

## Re-import from the sheet

Export the `Local` and `Database` sheets as CSV into `data/source/`, then:

```bash
node tools/convert.mjs
```

This overwrites `data/hikes.json` (hand-added hikes included) and prints unmatched names and Local/Database conflicts. Local wins every conflict.

## Settings

`js/config.js` holds the forecast length, weather band thresholds, cache lifetimes and the default home (Vancouver). Drive times start from the saved home, then your location, then the default.
