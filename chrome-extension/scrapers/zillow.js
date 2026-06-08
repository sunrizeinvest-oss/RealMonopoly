/**
 * Zillow listing scraper.
 *
 * URL pattern: https://www.zillow.com/homedetails/<slug>/<zpid>_zpid/
 * Zillow has rich JSON-LD blocks and data-testid attributes — both are
 * stable enough to lean on. Beds / baths / sqft are usually in
 * [data-testid='bed-bath-item'] grids.
 */
window.__realDealScrape = function () {
  const U = window.RDUtils;
  const out = { address: null, price: null, beds: null, baths: null, sqft: null, source: "zillow" };

  // Strategy 1: JSON-LD
  U.walkLDJSON(obj => {
    if (obj["@type"] === "SingleFamilyResidence" || obj["@type"] === "Residence" || obj["@type"] === "Apartment") {
      if (obj.address?.streetAddress) {
        out.address = [obj.address.streetAddress, obj.address.addressLocality, obj.address.addressRegion, obj.address.postalCode].filter(Boolean).join(", ");
      }
      if (obj.floorSize?.value) out.sqft = U.parseInt(obj.floorSize.value);
    }
  });

  // Strategy 2: DOM
  if (!out.price) {
    out.price = U.parseInt(U.pickText([
      "[data-testid='price']",
      "span[data-testid='price'] span",
      "[data-test='property-card-price']",
      "h2 > span > span", // legacy Zillow layout
    ]));
  }
  if (!out.address) {
    out.address = U.pickText([
      "[data-testid='home-details-summary-address']",
      "h1.Text-c11n-8-110-1__sc-aiai24-0", // generated class — last-ditch
      "h1",
    ]);
  }

  // Bed/bath/sqft chips
  const bb = document.querySelectorAll("[data-testid='bed-bath-sqft-fact-container'] *, [data-testid='bed-bath-item']");
  bb.forEach(el => {
    const text = el.textContent || "";
    if (!out.beds  && /bed/i.test(text))  out.beds  = U.parseFloat(text);
    if (!out.baths && /bath/i.test(text)) out.baths = U.parseFloat(text);
    if (!out.sqft  && /sqft|sq\s*ft/i.test(text)) out.sqft = U.parseInt(text);
  });

  // Last-ditch: regex over full body text
  if (!out.beds || !out.baths || !out.sqft) {
    const body = document.body?.textContent || "";
    const bMatch = body.match(/(\d+(?:\.\d+)?)\s*bed/i);
    const baMatch = body.match(/(\d+(?:\.\d+)?)\s*bath/i);
    const sMatch = body.match(/([\d,]+)\s*sqft/i);
    if (!out.beds  && bMatch)  out.beds  = parseFloat(bMatch[1]);
    if (!out.baths && baMatch) out.baths = parseFloat(baMatch[1]);
    if (!out.sqft  && sMatch)  out.sqft  = parseInt(sMatch[1].replace(/,/g, ""), 10);
  }

  return out;
};
