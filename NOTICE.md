# Notices

This project, **山水路书 / National Day Roadbook**, is a standalone static adaptation
of the public itinerary-sharing approach in [liketrek/TREK](https://github.com/liketrek/TREK).
It is not an official TREK product, and does not run the TREK server or database.
No TREK logo or product branding is used.

The shared payload organization (`trip`, `days`, `places`, `assignments`, `dayNotes`,
`permissions`) and sorted-day / selected-day map derivation were adapted with reference
to upstream `client/src/pages/SharedTripPage.tsx` and
`client/src/pages/sharedTrip/useSharedTrip.ts` (reviewed 2026-09-20). The UI, static
data adapter, route cache, itinerary content and GitHub Pages setup are new work.
This adaptation is released under **GNU AGPL v3**; see LICENSE. Its complete
corresponding source is the GitHub repository linked in the page footer.

- Leaflet 1.9.4: BSD-2-Clause, copyright Vladimir Agafonkin and contributors;
  bundled license in `vendor/leaflet-LICENSE.txt`.
- Basemap: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
- Road geometry: OSRM public routing service with OpenStreetMap data.
  https://project-osrm.org/ ; build-time cache only, no live traffic.
- Coordinates are WGS84 city/town/village-area anchors, not authoritative scenic entrances
  or permission to camp. Links to Amap search use place names to avoid implying
  WGS84 coordinates are GCJ-02 navigation coordinates.
- PDF and route descriptions: prepared for this itinerary; source citations in PDF
  and the Sources section. Budgets and driving ranges are estimates.

Personal checklist and notes are stored only in localStorage, not uploaded.
Map tiles and external map/search links contact their respective third parties.

## Current interactive edition (2026-09-21)

Daily accordion/map interaction revision: re-inspected upstream
`client/src/pages/SharedTripPage.tsx` and `sharedTrip/useSharedTrip.ts` on
2026-09-21. The expanded day and map selection share one selected-day state,
with all-trip fallback and ordered day stops. The static Leaflet controller
`itinerary-map.mjs` is a local implementation, not the TREK backend.

The current UI reads `data/plan.json`, generated from `data/plan.mjs` by the build.
Legacy `data/trips.json`, TREK snapshots and `report.pdf` are retained as historical
artifacts, not the current itinerary. No reservations have been made by this site.

Weather: Open-Meteo, https://open-meteo.com/ , CC BY 4.0 weather data attribution.
The browser submits public destination coordinates only. The displayed timestamp
is retrieval time, not model publication time. Missing dates are never extrapolated.
https://creativecommons.org/licenses/by/4.0/

Photos: Wikimedia Commons, chosen license CC BY-SA 4.0. Local JPEGs are unchanged
downloads (or Wikimedia-generated thumbnails); CSS uses a responsive display crop.
Both photographs are historical, not live conditions. Photographer, original page
and license are linked beside each displayed image. Photo reuse/crops remain under
CC BY-SA 4.0, separate from the software AGPL license.

- `assets/chengkan.jpg`: TIY, 2023-05-16, Chengkan Village,
  https://commons.wikimedia.org/wiki/File:%E5%91%88%E5%9D%8E.jpg
- `assets/xiandu.jpg`: Zhangzhugang, 2017-09-10, Dinghu Peak and Shiliang Bridge,
  https://commons.wikimedia.org/wiki/File:Jinyun_Xiandu_2017.09.10_06-47-19.jpg
- License: https://creativecommons.org/licenses/by-sa/4.0/

New checklist key: `national-day-2026-v2`. Checklist IDs are semantic and stable
across routes. Each traveler's personal items are independent. Old notes under
`roadbook-2026-note` are read if the new note is empty; legacy checklist storage is
not deleted or silently reinterpreted. No account, backend, tracking or device sync.

Anhui revision: Xixinan, Chengkan, Lucun village (not the exact viewpoint parking),
Yansi, Biyang and Tongrui-area anchors were checked using OpenStreetMap Nominatim
on 2026-09-20. Data © OpenStreetMap contributors, ODbL 1.0. Lu village in Yixian
is distinct from Lucun town in Guangde. Search/navigation uses explicit place names.
