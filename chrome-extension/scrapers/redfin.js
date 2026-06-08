/**
 * Redfin listing scraper.
 *
 * URL pattern: https://www.redfin.com/<state>/<city>/<address>/home/<id>
 * Redfin exposes data in JSON-LD and in [data-rf-test-name] attributes on
 * the stat blocks.
 */
window.__realDealScrape = function () {
  const U = window.RDUtils;
  const out = { address: null, price: null, beds: null, baths: null, sqft: null, source: "redfin" };

  // Strategy 1: JSON-LD
  U.walkLDJSON(obj => {
    if (obj["@type"] === "SingleFamilyResidence" || obj["@type"] === "Residence" || obj["@type"] === "House" || obj.address) {
      if (obj.address?.streetAddress) {
        out.address = [obj.address.streetAddress, obj.address.addressLocality, obj.address.addressRegion, obj.address.postalCode].filter(Boolean).join(", ");
      }
      if (obj.offers?.price) out.price = U.parseInt(obj.offers.price);
      if (obj.floorSize?.value) out.sqft = U.parseInt(obj.floorSize.value);
    }
  });

  // Strategy 2: DOM
  if (!out.price) {
    out.price = U.parseInt(U.pickText([
      "[data-rf-test-id='abp-price'] .statsValue",
      "[data-rf-test-id='abp-price']",
      ".statsValue.price",
      "div.price > span",
    ]));
  }
  if (!out.address) {
    out.address = U.pickText([
      "[data-rf-test-id='abp-streetLine']",
      ".street-address",
      "h1.address",
      "h1",
    ]);
    // Redfin often splits city/state into a sibling node
    const cityState = U.pickText([
      "[data-rf-test-id='abp-cityStateZip']",
      ".citystatezip",
    ]);
    if (out.address && cityState && !out.address.includes(cityState.split(",")[0])) {
      out.address = `${out.address}, ${cityState}`;
    }
  }

  // Beds / baths / sqft
  const beds  = U.pickText(["[data-rf-test-id='abp-beds'] .statsValue", "[data-rf-test-id='abp-beds']"]);
  const baths = U.pickText(["[data-rf-test-id='abp-baths'] .statsValue", "[data-rf-test-id='abp-baths']"]);
  const sqft  = U.pickText(["[data-rf-test-id='abp-sqFt'] .statsValue", "[data-rf-test-id='abp-sqFt']"]);
  if (beds)  out.beds  = U.parseFloat(beds);
  if (baths) out.baths = U.parseFloat(baths);
  if (sqft)  out.sqft  = U.parseInt(sqft);

  return out;
};
