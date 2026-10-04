# NEARBY web prototype

A complete browsing prototype with a minimal, monochrome interface and clearly labelled sample content.

## Run locally

Run `python3 -m http.server 4173 --bind 127.0.0.1` from this folder and open http://127.0.0.1:4173. Serve the complete folder: `index.html` loads `model.js` and `app.js`. No package installation or build step is required.

## Working flows

- Full-screen scrolling, keyboard navigation, and restoration of the current food after refresh or resizing.
- Ampang, Bangsar, and KLCC demo area selection, with distances calculated from fixture coordinates.
- Browser GPS searches relative to the returned location, with an explicit empty state when no demo places are nearby. Location denial or timeout leaves the chosen demo area available.
- Word-based food/restaurant search, including persisted search and filter settings.
- Distance, meals/sweets, open status, and budget filters. Changes are drafted in the sheet; Apply commits them, and Cancel/Escape/Back discards them. Reset inside the sheet also remains a draft.
- A schematic demo map with coordinate-based pins, selection, panning, bounded zoom, and recentering, synchronized with applied filters.
- Place details, source-filtered sample reviews, saved status, and demo walking estimates.
- Persistent saved places across areas. Saved is independent of Discover filters, and a saved place can be removed from its detail sheet.
- Browser Back closes sheets and returns from directions to details and between navigation views.
- Photo loading, failure, and retry states, and recoverable empty results.

## Tests

Run `node --test tests/model.test.cjs` using Node.js 18 or later. Automated checks cover area/radius results, combined filters, word search, invalid preferences, GPS distance, and map projection. The browser flows, persistence, map gestures, modal navigation, and phone/desktop layouts were also checked manually.

## Data boundaries

All places, reviews, ratings, prices, opening hours, and coordinates are fictional sample data. There are six fixtures in each of three demo areas. Radius searches may include sample places in a neighbouring area. Photos are illustrative stock images retained from the supplied interface. Instagram and TikTok show sample post/video descriptions; no actual social video is connected. The map is schematic, not geographic navigation. Demo walking time is an estimate derived from straight-line distance, not a routed journey.

GPS is kept in memory for this visit and is neither sent to a server nor saved. Refresh returns to the last selected demo area. Browser storage keeps saved place IDs and demo browsing preferences on this device. Corrupt/unavailable storage falls back to safe defaults or session-only behavior. The Google Maps action searches for real food in the fixture's area; it does not direct users to a fictional restaurant.

Live Google Places search/reviews, permitted Instagram/TikTok media integration, geographic maps, and real location-based restaurant results remain outside this sample prototype. No API credentials are included.

## Source

Repository: https://github.com/seancreative/qlabs-bestspot

- `index.html`: minimal UI and styling.
- `model.js`: fixture data and pure filtering/distance logic.
- `app.js`: interface state, persistence, dialogs, navigation, and map controls.
- `tests/model.test.cjs`: meaningful automated checks for the browsing model.
