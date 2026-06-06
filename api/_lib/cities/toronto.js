/**
 * Toronto city adapter — uses CKAN API at open.toronto.ca.
 *
 * Datasets to integrate (TODO):
 *   - Zoning By-law:                      zoning-by-law
 *   - Property Tax Assessment:            (via MPAC, not city open data)
 *   - Building Permits — Active:          building-permits-active-permits
 *
 * STUB adapter. Returns zoning defaults based on Toronto's main zones.
 * Live CKAN integration: ~half day of work to wire up.
 */

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";

export async function getZoning({ lat, lng, address }) {
  return {
    city: "toronto",
    found: false,
    address,
    _stub: true,
    _note: "Toronto adapter in development — CKAN integration coming soon.",
    referenceZones: TORONTO_ZONES_REFERENCE,
  };
}

export async function getAssessment() { return null; }
export async function getPermits() { return []; }

// Toronto Zoning By-law 569-2013 — main zones:
const TORONTO_ZONES_REFERENCE = {
  "R":         { maxHeightM: 10, maxStoreys: 3, maxFAR: 0.6, description: "Residential — detached, semis" },
  "RM":        { maxHeightM: 14, maxStoreys: 4, maxFAR: 1.0, description: "Residential Multiple" },
  "RA":        { maxHeightM: 23, maxStoreys: 6, maxFAR: 1.5, description: "Residential Apartment" },
  "RAC":       { maxHeightM: 30, maxStoreys: 8, maxFAR: 2.5, description: "Residential Apartment Commercial" },
  "CR":        { maxHeightM: 16, maxStoreys: 4, maxFAR: 2.0, description: "Commercial Residential" },
  "CRE":       { maxHeightM: 30, maxStoreys: 8, maxFAR: 3.0, description: "Commercial Residential Employment" },
  "EL":        { maxHeightM: 12, maxStoreys: 3, maxFAR: 1.0, description: "Employment Light Industrial" },
  "RD":        { maxHeightM: 12, maxStoreys: 3, maxFAR: 0.8, description: "Residential Detached" },
  "RS":        { maxHeightM: 10, maxStoreys: 2.5, maxFAR: 0.6, description: "Residential Semi-Detached" },
  "RT":        { maxHeightM: 12, maxStoreys: 3, maxFAR: 0.8, description: "Residential Townhouse" },
};
