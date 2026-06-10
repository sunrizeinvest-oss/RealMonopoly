# RizeAI — Chrome Extension

One-click underwriting for any **Realtor.ca**, **Zillow**, or **Redfin** listing.

## What it does

1. You're browsing a property on Realtor.ca / Zillow / Redfin.
2. Click the **RizeAI** icon in your Chrome toolbar.
3. The popup shows the listing's price, beds, baths, sqft — scraped from the page.
4. Click **▶ UNDERWRITE AS FLIP** or **▶ MODEL AS BRRRR** — opens [rizeai.co](https://www.rizeai.co) with the listing pre-populated. No retyping.

## Install (unpacked / developer mode)

The extension isn't on the Chrome Web Store yet. To install locally:

1. Open `chrome://extensions/` in Chrome (or Brave, Edge, Arc).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked**.
4. Select this folder: `flip-analyzer/chrome-extension/`.
5. Done. The RizeAI icon should appear in your toolbar. Pin it for one-click access.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest — declares permissions, content scripts, popup, icons |
| `popup.html` / `popup.css` / `popup.js` | The toolbar popup UI |
| `scrapers/_shared.js` | Utility helpers + message listener wiring |
| `scrapers/realtor-ca.js` | Per-site DOM scraping for Realtor.ca |
| `scrapers/zillow.js` | Per-site DOM scraping for Zillow |
| `scrapers/redfin.js` | Per-site DOM scraping for Redfin |
| `icons/icon-{16,48,128}.png` | Toolbar / extension manager icons |

## How the scrapers work

Each site script tries three strategies in order:

1. **JSON-LD** — most reliable when the listing has structured data (it usually does).
2. **DOM selectors** — `data-testid`, `data-rf-test-id`, and stable id attributes.
3. **Regex over body text** — last-ditch (`2.5 bath`, `1,250 sqft`).

When the popup opens, it sends a `{ type: "getListing" }` message to the active tab. The site-specific scraper sets `window.__realDealScrape`; the shared listener calls it and replies with `{ address, price, beds, baths, sqft, source }`.

## Deep link contract

Both buttons in the popup link to the main app with these URL params:

- `?addr=...` — full address string
- `?purchase=...` — list price as integer (no $ or commas)
- `?repair=...` — repair budget guess (defaults to min($price × 8%, $80k))
- `?sqft=...`, `?beds=...`, `?baths=...` — property attributes

The Flip Analyzer (`/app`) and BRRRR Calculator (`/brrrr`) both read these on mount.

## Updating after site markup changes

Sites change DOM regularly. If a scraper stops working:

1. Open the listing in Chrome.
2. DevTools → Console: `__realDealScrape()` — see what comes back.
3. DevTools → Elements: find the new selector for the broken field.
4. Update the relevant `scrapers/*.js` file.
5. In `chrome://extensions/`, hit the reload button on the RizeAI card.

## Publishing (later)

To put this on the Chrome Web Store you'll need:

- A developer account ($5 one-time fee at https://chrome.google.com/webstore/devconsole/).
- A privacy policy (we collect zero data — the popup just reads page content and links you to our app).
- A screenshot pack (1280×800).
- Promo tile (440×280).

The manifest is already MV3-compliant and uses only `activeTab` + `scripting` + per-site host permissions, which sail through review.
