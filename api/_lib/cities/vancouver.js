/**
 * Vancouver city adapter — uses CKAN API at opendata.vancouver.ca.
 *
 * Datasets to integrate (TODO — wire up actual endpoints):
 *   - Zoning Districts and Labels:        zoning-districts-and-labels
 *   - Property Tax Report:                property-tax-report
 *   - Issued Building Permits:            issued-building-permits
 *
 * This is a STUB adapter. Returns structured zoning defaults based on
 * Vancouver's main zone codes, but does not yet fetch the per-parcel
 * data live. Wire up when ready (~half day of work).
 */

const CKAN_BASE = "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets";

export async function getZoning({ lat, lng, address }) {
  // TODO: real CKAN query — for now, return a stub that signals "supported but not yet wired"
  return {
    city: "vancouver",
    found: false,
    address,
    _stub: true,
    _note: "Vancouver adapter in development — CKAN integration coming soon.",
    referenceZones: VANCOUVER_ZONES_REFERENCE,
  };
}

export async function getAssessment() { return null; }
export async function getPermits() { return []; }

// Reference data so the frontend can still surface useful info:
const VANCOUVER_ZONES_REFERENCE = {
  "RS-1":     { maxHeightM: 10.7, maxStoreys: 2.5, maxFAR: 0.7,  description: "Single family residential" },
  "RT-5":     { maxHeightM: 10.7, maxStoreys: 2.5, maxFAR: 0.85, description: "Two-family / character home" },
  "RT-7/8":   { maxHeightM: 10.7, maxStoreys: 2.5, maxFAR: 0.95, description: "Multiple Dwelling (low-density)" },
  "RM-1":     { maxHeightM: 10.7, maxStoreys: 3,   maxFAR: 1.45, description: "Multiple dwelling — low-rise" },
  "RM-3":     { maxHeightM: 13.8, maxStoreys: 4,   maxFAR: 1.45, description: "Multiple dwelling — 4 storey" },
  "RM-4":     { maxHeightM: 18.3, maxStoreys: 6,   maxFAR: 1.45, description: "Multiple dwelling — 6 storey" },
  "C-2":      { maxHeightM: 13.8, maxStoreys: 4,   maxFAR: 2.5,  description: "Commercial mixed-use" },
  "FM-1":     { maxHeightM: 23,   maxStoreys: 8,   maxFAR: 3.0,  description: "First Shaughnessy multifamily" },
};
