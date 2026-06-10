/**
 * MLS Provider factory — returns whichever adapter has credentials.
 *
 * Selection priority (highest to lowest):
 *   1. CREA DDF      (DDF_USERNAME + DDF_PASSWORD)   — official Canadian MLS
 *   2. Repliers.io   (REPLIERS_API_KEY)               — paid aggregator
 *   3. Realtor.ca    (no env var)                     — unofficial scraper
 *
 * Callers should treat the result as opaque and just call .searchByPoint()
 * or .searchByArea(). They get an MlsResult back; the `groundedByMls` flag
 * tells them whether the data is real or a stub.
 */

import * as creaDdfMod    from "./creaDdf.js";
import * as repliersMod   from "./repliers.js";
import * as realtorCaMod  from "./realtorCa.js";

export function getMlsProvider() {
  if (process.env.DDF_USERNAME && process.env.DDF_PASSWORD)  return creaDdfMod;
  if (process.env.REPLIERS_API_KEY)                          return repliersMod;
  return realtorCaMod;
}

export function getProviderName() {
  if (process.env.DDF_USERNAME && process.env.DDF_PASSWORD)  return "crea-ddf";
  if (process.env.REPLIERS_API_KEY)                          return "repliers";
  return "realtor-ca";
}
