# NEARBY web prototype

A mobile-first food discovery prototype, with a minimal, monochrome interface.

## Run locally

From this folder, run `python3 -m http.server 4173 --bind 127.0.0.1`, then open http://127.0.0.1:4173. It also works as a standalone HTML file, although location and browser storage depend on the browser environment.

## Working flows

- Full-screen scrolling and keyboard navigation through food photos.
- Search food and restaurant names; a single filter sheet handles distance, meals/sweets, open status, and budget.
- Separate Google, Instagram, and TikTok sample review tabs.
- Place details with sample price, rating, distance, and hours.
- Save/unsave places with localStorage persistence and an independent Saved collection.
- A schematic demo map with selectable food pins, synchronized with Discover filters.
- Demo walking estimates and an external Google Maps food search.
- Browser geolocation with immediate entry and fallback to the Ampang demo.

## Data boundaries

All places, reviews, ratings, prices, opening hours, and distances are fictional sample data. Photos are illustrative stock images retained from the supplied interface. Instagram and TikTok show sample post/video descriptions; there is no actual video playback or live social content. The map is schematic, not geographic navigation. GPS is not sent to a server or saved; obtaining GPS does not change the demo dataset. Saved places stay on this browser/device.

Live Google Places search/reviews, permitted Instagram/TikTok media integrations, real location-based results, and geographic mapping are future integration work. No API credentials are included.

## Source

Repository: https://github.com/seancreative/qlabs-bestspot

No build step or package installation is required. `index.html` contains the complete interface and behavior.
