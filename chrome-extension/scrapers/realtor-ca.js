/**
 * Realtor.ca listing scraper.
 *
 * URL pattern: https://www.realtor.ca/real-estate/<id>/<slug>
 * Page is fully rendered; data lives in DOM + a JSON-LD block for the listing.
 */
window.__realDealScrape = function () {
  const U = window.RDUtils;
  const out = { address: null, price: null, beds: null, baths: null, sqft: null, source: "realtor.ca" };

  // Strategy 1: JSON-LD (most reliable when present)
  U.walkLDJSON(obj => {
    if (obj["@type"] === "SingleFamilyResidence" || obj["@type"] === "House" || obj["@type"] === "Product" || obj.address) {
      if (obj.address?.streetAddress) {
        out.address = [obj.address.streetAddress, obj.address.addressLocality, obj.address.addressRegion].filter(Boolean).join(", ");
      }
      if (obj.offers?.price) out.price = U.parseInt(obj.offers.price);
      if (obj.numberOfRooms) out.beds = U.parseInt(obj.numberOfRooms);
      if (obj.floorSize?.value) out.sqft = U.parseInt(obj.floorSize.value);
    }
  });

  // Strategy 2: DOM selectors. Realtor.ca uses #listingPriceValue, .listingAddress, etc.
  if (!out.price) {
    out.price = U.parseInt(U.pickText([
      "#listingPriceValue",
      ".listingPrice",
      "[itemprop='price']",
      "h1 + div", // sometimes price is right under title
    ]));
  }
  if (!out.address) {
    out.address = U.pickText([
      "#listingAddress",
      ".listingAddress",
      "[itemprop='streetAddress']",
      "h1.listingDetailsHeaderH1",
    ]);
  }

  // Beds / baths / sqft — Realtor.ca uses "X beds · Y baths · Z sqft"-style chips
  const chipText = U.pickText([".listingDetailsCondoFeatures", ".listingDetailsTable"]) ||
                   document.body?.textContent || "";
  const bedsMatch  = chipText.match(/(\d+)\s*(?:bed|br)\b/i);
  const bathsMatch = chipText.match(/(\d+\.?\d*)\s*(?:bath|ba)\b/i);
  const sqftMatch  = chipText.match(/([\d,]+)\s*sq\s*ft/i);
  if (!out.beds  && bedsMatch)  out.beds  = parseInt(bedsMatch[1], 10);
  if (!out.baths && bathsMatch) out.baths = parseFloat(bathsMatch[1]);
  if (!out.sqft  && sqftMatch)  out.sqft  = parseInt(sqftMatch[1].replace(/,/g, ""), 10);

  // Fallback to <title>: often "PROPERTY ADDRESS - $X - MLS®#"
  if (!out.address) {
    const t = document.title.split("-")[0]?.trim();
    if (t && t.length > 5) out.address = t;
  }

  return out;
};
