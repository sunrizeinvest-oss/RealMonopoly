/**
 * MLS Provider — standardised shapes.
 *
 * All MLS provider adapters return data in these shapes. Lets the AI chat
 * features and the deal screener consume listings without caring which
 * provider produced them (Realtor.ca / CREA DDF / Repliers / future).
 *
 * @typedef {Object} MlsListing
 * @property {string} address          street address only
 * @property {string} [cityProvince]   "Calgary, AB" etc, where available
 * @property {string} [mlsNumber]      provider's listing ID
 * @property {number} [price]          asking price, CAD
 * @property {number} [originalPrice]  initial listing price if a drop occurred
 * @property {number} [bedrooms]
 * @property {number} [bathrooms]
 * @property {number} [sqft]           building interior sqft
 * @property {number} [units]          for multifamily
 * @property {number} [lotSize]        sqft
 * @property {string} [propertyType]   provider's property-type string
 * @property {string} [status]         "Active" | "Sold" | "Expired" | "Terminated" | "Withdrawn"
 * @property {string} [listedDate]     ISO date the listing was created
 * @property {number} [daysOnMarket]
 * @property {number} [priceDrops]     count of reductions during the listing
 * @property {string} [listingUrl]     deep-link back to provider
 * @property {string} [photoUrl]
 * @property {number} [latitude]
 * @property {number} [longitude]
 * @property {string} [zoning]
 * @property {number} [yearBuilt]
 * @property {number} [noi]            for income property where reported
 * @property {number} [capRate]
 *
 * @typedef {Object} MlsSearchByPoint
 * @property {number} lat
 * @property {number} lng
 * @property {number} [radiusKm]       default 1.5
 * @property {number} [limit]          default 25
 *
 * @typedef {Object} MlsSearchByArea
 * @property {string} area             "Calgary, AB" / "Downtown Vancouver"
 * @property {string} [propertyType]
 * @property {number} [maxPrice]
 * @property {number} [limit]          default 25
 *
 * @typedef {Object} MlsResult
 * @property {string} provider             "realtor-ca" | "crea-ddf" | "repliers" | "none"
 * @property {boolean} groundedByMls       false if the adapter returned a stub / fallback
 * @property {MlsListing[]} activeListings
 * @property {MlsListing[]} [soldListings]
 * @property {string} [searchUrl]          provider deep-link
 * @property {string} [note]               human-readable caveat (e.g. "DDF not configured")
 */

// File is types-only; no runtime exports.
export {};
