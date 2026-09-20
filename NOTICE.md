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
- Coordinates are WGS84 city/town-area anchors, not authoritative scenic entrances
  or permission to camp. Links to Amap search use place names to avoid implying
  WGS84 coordinates are GCJ-02 navigation coordinates.
- PDF and route descriptions: prepared for this itinerary; source citations in PDF
  and the Sources section. Budgets and driving ranges are estimates.

Personal checklist and notes are stored only in localStorage, not uploaded.
Map tiles and external map/search links contact their respective third parties.
