/**
 * Shared scraping helpers used by every per-site content script.
 *
 * Sites change their markup constantly, so each scraper tries multiple
 * strategies in order: (1) explicit DOM selectors, (2) microdata/itemprop
 * fallbacks, (3) JSON-LD <script type="application/ld+json"> blocks.
 *
 * Listen for {type:'getListing'} messages from the popup and reply with
 * { address, price, beds, baths, sqft, source }.
 */

(function setup() {
  // Idempotent — content scripts can run multiple times on SPA navigation
  if (window.__realDealScraperReady) return;
  window.__realDealScraperReady = true;

  if (!window.__realDealScrape) {
    console.warn("[RizeAI] content script loaded before site-specific scraper. Bailing.");
    return;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "getListing") return;
    try {
      const data = window.__realDealScrape();
      sendResponse(data);
    } catch (e) {
      console.error("[RizeAI] scrape failed:", e);
      sendResponse(null);
    }
    return true; // keep channel open for async sendResponse
  });
})();

window.RDUtils = {
  /** Pull first integer out of a string. "$1,295,000" → 1295000. */
  parseInt(s) {
    if (typeof s !== "string") s = String(s ?? "");
    const m = s.replace(/[, ]/g, "").match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  },
  /** Pull first decimal out of a string. "2.5 bath" → 2.5. */
  parseFloat(s) {
    if (typeof s !== "string") s = String(s ?? "");
    const m = s.replace(/[, ]/g, "").match(/\d+\.?\d*/);
    return m ? parseFloat(m[0]) : null;
  },
  /** Try each selector; return text of first match. */
  pickText(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return null;
  },
  /** Walk all <script type='application/ld+json'> blocks, parse, run cb on each. */
  walkLDJSON(cb) {
    const nodes = document.querySelectorAll('script[type="application/ld+json"]');
    for (const n of nodes) {
      try {
        const data = JSON.parse(n.textContent);
        const arr = Array.isArray(data) ? data : [data];
        for (const obj of arr) {
          const stop = cb(obj);
          if (stop) return;
        }
      } catch { /* malformed json — skip */ }
    }
  },
};
