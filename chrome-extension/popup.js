/**
 * popup.js — entry point when user clicks the toolbar icon.
 *
 * Flow:
 *   1. Query the active tab.
 *   2. If on a supported site, send a 'getListing' message to the content script.
 *   3. Render the detected fields + "Analyze in RizeAI" button.
 *   4. If not on a supported site, show the supported-sites onboarding.
 */

const APP_BASE = "https://www.rizeai.co";

const SUPPORTED_HOSTS = [
  { match: /(?:^|\.)realtor\.ca$/i, label: "Realtor.ca" },
  { match: /(?:^|\.)zillow\.com$/i,  label: "Zillow" },
  { match: /(?:^|\.)redfin\.com$/i,  label: "Redfin" },
];

const fmt = n => n != null ? "$" + Math.round(n).toLocaleString() : "—";
const num = v => (typeof v === "number") ? v.toLocaleString() : (v || "—");

function isSupportedHost(host) {
  return SUPPORTED_HOSTS.find(s => s.match.test(host));
}

function setBarTag(text, color = "var(--green)") {
  const t = document.getElementById("bar-tag");
  if (!t) return;
  t.textContent = text;
  t.style.color = color;
}

function renderEmpty(currentHost) {
  setBarTag("▸ NO LISTING", "var(--amber)");
  document.getElementById("content").innerHTML = `
    <div class="empty">
      <div class="empty-icon">🏠</div>
      <div class="empty-h">Open a listing first.</div>
      <div class="empty-p">RizeAI underwrites listings on the sites below. Open a property page, then click the extension icon again.</div>
      <div class="empty-sites">
        <div><span>●</span>Realtor.ca</div>
        <div><span>●</span>Zillow.com</div>
        <div><span>●</span>Redfin.com</div>
      </div>
      <a class="btn secondary" href="${APP_BASE}/app" target="_blank" rel="noopener">▶ OPEN ANALYZER MANUALLY</a>
    </div>
    <div class="foot">▸ CURRENT: ${currentHost || "unknown"}</div>
  `;
}

function renderListing(data) {
  setBarTag(`▸ ${data.source.toUpperCase()}`, "var(--green)");
  const params = new URLSearchParams();
  if (data.address)       params.set("addr",     data.address);
  if (data.price)         params.set("purchase", data.price);
  if (data.sqft)          params.set("sqft",     data.sqft);
  if (data.beds)          params.set("beds",     data.beds);
  if (data.baths)         params.set("baths",    data.baths);
  // Default rehab guess (8% of price, capped at $80k) so the popup has something to chew on
  if (data.price) {
    const guess = Math.min(80000, Math.round(data.price * 0.08));
    params.set("repair", String(guess));
  }
  const analyzeUrl = `${APP_BASE}/app?${params.toString()}`;
  const brrrrUrl   = `${APP_BASE}/brrrr?${params.toString()}`;

  document.getElementById("content").innerHTML = `
    <div class="eyebrow">▸ DETECTED LISTING</div>
    <div class="addr">${data.address || "Address not detected"}</div>

    <div class="grid">
      <div class="metric full">
        <div class="metric-lbl">List price</div>
        <div class="metric-val" style="color:var(--green)">${fmt(data.price)}</div>
      </div>
      <div class="metric">
        <div class="metric-lbl">Beds</div>
        <div class="metric-val">${num(data.beds)}</div>
      </div>
      <div class="metric">
        <div class="metric-lbl">Baths</div>
        <div class="metric-val">${num(data.baths)}</div>
      </div>
      <div class="metric full">
        <div class="metric-lbl">Sq Ft</div>
        <div class="metric-val">${num(data.sqft)}</div>
      </div>
    </div>

    <a class="btn" href="${analyzeUrl}" target="_blank" rel="noopener">▶ UNDERWRITE AS FLIP</a>
    <a class="btn secondary" href="${brrrrUrl}" target="_blank" rel="noopener">▶ MODEL AS BRRRR</a>
  `;
}

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    renderEmpty("no active tab");
    return;
  }

  let host = "";
  try { host = new URL(tab.url).hostname; } catch { /* not a real URL */ }

  const supported = isSupportedHost(host);
  if (!supported) {
    renderEmpty(host);
    return;
  }

  try {
    const data = await chrome.tabs.sendMessage(tab.id, { type: "getListing" });
    if (!data || !data.price) {
      // Content script ran but couldn't find a listing — could be a search-results page
      setBarTag(`▸ ${supported.label.toUpperCase()}`, "var(--amber)");
      document.getElementById("content").innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔎</div>
          <div class="empty-h">No listing data on this page.</div>
          <div class="empty-p">Looks like a search results page or map view. Click into a specific property and try again.</div>
          <a class="btn secondary" href="${APP_BASE}/app" target="_blank" rel="noopener">▶ OPEN ANALYZER MANUALLY</a>
        </div>
      `;
      return;
    }
    renderListing(data);
  } catch (e) {
    // Content script not injected yet (page hasn't fully loaded, or extension just installed)
    setBarTag("▸ NOT READY", "var(--red)");
    document.getElementById("content").innerHTML = `
      <div class="empty">
        <div class="empty-icon">⟲</div>
        <div class="empty-h">Reload this listing page.</div>
        <div class="empty-p">The extension was likely just installed. Refresh the tab and try again.</div>
      </div>
    `;
  }
})();
