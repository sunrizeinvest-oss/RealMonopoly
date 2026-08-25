/**
 * zoningSpecs.js — dimensional zoning limits by city + code.
 *
 * Sources:
 *   • Calgary Land Use Bylaw 1P2007 (as amended through 2025)
 *   • Edmonton Zoning Bylaw 20001 (adopted 2024, replaces old Bylaw 12800)
 *
 * Codes not in the registry return null — the UI shows a "specs coming
 * soon" placeholder with a link to the full bylaw. Better to be accurate
 * on 15 codes than confidently wrong on 40.
 *
 * Fields:
 *   maxHeightM        — max building height in metres (usually to eaves or midpoint)
 *   maxFAR            — max floor-area ratio (gross floor area / lot area)
 *   maxCoverage       — max lot coverage as decimal (0.45 = 45%)
 *   maxDensity        — max units per gross hectare (null for SFH)
 *   minLotAreaM2      — min parcel area
 *   maxUnits          — max dwelling units allowed per lot
 *   setbacks          — { front, rear, side } in metres (approx typical)
 *   permittedUses     — human-readable summary
 *   note              — 1-line context for the user
 *   bylawUrl          — official source
 */

const CALGARY_BYLAW_URL     = "https://www.calgary.ca/planning/land-use/bylaw-1p2007.html";
const EDMONTON_BYLAW_URL    = "https://webdocs.edmonton.ca/zoningbylaw/ZoningBylaw/index.htm";
const VANCOUVER_BYLAW_URL   = "https://vancouver.ca/your-government/zoning-and-development-by-law.aspx";
const TORONTO_BYLAW_URL     = "https://www.toronto.ca/city-government/planning-development/zoning-by-law-preliminary-zoning-reviews/zoning-by-law/";
const OTTAWA_BYLAW_URL      = "https://ottawa.ca/en/planning-development-and-construction/planning-applications-and-development-applications/zoning-law";
const MISSISSAUGA_BYLAW_URL = "https://www.mississauga.ca/services-and-programs/planning-and-development/zoning-by-law/";
const HAMILTON_BYLAW_URL    = "https://www.hamilton.ca/build-invest-grow/planning-development/zoning-law";

const CALGARY = {
  "R-C1": {
    name: "Residential – Contextual One Dwelling",
    maxHeightM: 10, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 371, maxUnits: 1,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Single detached · secondary suite (up to 2 total)",
    note: "Contextual — setbacks match neighbouring homes. Secondary suite discretionary.",
  },
  "R-C1L": {
    name: "Residential – Contextual One Dwelling (Low)",
    maxHeightM: 10, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 464, maxUnits: 1,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Single detached · secondary suite (up to 2 total)",
    note: "Same envelope as R-C1 with a larger minimum lot area.",
  },
  "R-C1s": {
    name: "Residential – Contextual One / Semi-Detached",
    maxHeightM: 10, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 464, maxUnits: 2,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Single detached · semi-detached · secondary suite",
    note: "Duplex-ready. Same 10m envelope, semi-detached permitted.",
  },
  "R-C2": {
    name: "Residential – Contextual One / Two Dwelling",
    maxHeightM: 10, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 371, maxUnits: 2,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Single detached · duplex · secondary suite (up to 4 total)",
    note: "Common infill zone — supports duplex with basement suites.",
  },
  "R-CG": {
    name: "Residential – Grade-Oriented Infill",
    maxHeightM: 11, maxFAR: 0.7, maxCoverage: 0.60, maxDensity: null,
    minLotAreaM2: 500, maxUnits: 4,
    setbacks: { front: 3.0, rear: 5.0, side: 1.2 },
    permittedUses: "Up to 4 units at grade (rowhouses, fourplex) · secondary suites in each",
    note: "The infill workhorse — 4 units/lot, no discretionary approval needed.",
  },
  "M-C1": {
    name: "Multi-Residential – Contextual Low Profile",
    maxHeightM: 14, maxFAR: 1.2, maxCoverage: 0.55, maxDensity: 65,
    minLotAreaM2: 600, maxUnits: null,
    setbacks: { front: 3.0, rear: 5.0, side: 3.0 },
    permittedUses: "Low-rise apartments (3–4 storeys), rowhouse",
    note: "Small apartment sites — up to ~65 units/ha.",
  },
  "M-C2": {
    name: "Multi-Residential – Contextual Medium Profile",
    maxHeightM: 16, maxFAR: 2.0, maxCoverage: 0.55, maxDensity: 148,
    minLotAreaM2: 800, maxUnits: null,
    setbacks: { front: 3.0, rear: 5.0, side: 3.0 },
    permittedUses: "Medium-rise apartments (4–5 storeys)",
    note: "Bump-up density zone — common in inner-city redevelopment corridors.",
  },
  "M-H2": {
    name: "Multi-Residential – High Density Medium Rise",
    maxHeightM: 22, maxFAR: 3.5, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 1000, maxUnits: null,
    setbacks: { front: 3.0, rear: 5.0, side: 3.0 },
    permittedUses: "6–8 storey apartments",
    note: "High-density mid-rise. Common along transit corridors.",
  },
  "C-N1": {
    name: "Commercial – Neighbourhood 1",
    maxHeightM: 12, maxFAR: 1.5, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Ground-floor retail + apartments above",
    note: "Mixed-use main-street zone — typical for arterial corners.",
  },
  "C-N2": {
    name: "Commercial – Neighbourhood 2",
    maxHeightM: 14, maxFAR: 2.0, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Retail + apartments · slightly taller than C-N1",
    note: "Common on 17th Ave SW, Kensington, Marda Loop.",
  },
};

const EDMONTON = {
  "RS": {
    name: "Small Scale Residential",
    maxHeightM: 10, maxFAR: 0.7, maxCoverage: 0.42, maxDensity: null,
    minLotAreaM2: 250, maxUnits: 8,
    setbacks: { front: 4.5, rear: 5.5, side: 1.2 },
    permittedUses: "Up to 8 units — SFH, duplex, rowhouse, triplex, backyard suites",
    note: "Post-2024 Zoning Bylaw: any residential site allows up to 8 dwelling units.",
  },
  "RSF": {
    name: "Small Scale Residential – Flex",
    maxHeightM: 10, maxFAR: 0.7, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 250, maxUnits: 8,
    setbacks: { front: 4.5, rear: 5.5, side: 1.2 },
    permittedUses: "As RS · additional discretionary uses",
    note: "Flex sibling of RS — same envelope, more permitted uses.",
  },
  "RM": {
    name: "Medium Scale Residential",
    maxHeightM: 16, maxFAR: 2.0, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 500, maxUnits: null,
    setbacks: { front: 4.5, rear: 6.0, side: 2.5 },
    permittedUses: "Apartments (up to 4 storeys), rowhouse, stacked townhouse",
    note: "Standard low-to-mid rise apartment zone.",
  },
  "RL": {
    name: "Large Scale Residential",
    maxHeightM: 23, maxFAR: 3.5, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 800, maxUnits: null,
    setbacks: { front: 4.5, rear: 6.0, side: 3.0 },
    permittedUses: "Apartments (up to 6+ storeys)",
    note: "Mid-to-high rise. Common along LRT alignments.",
  },
  "MU": {
    name: "Mixed Use",
    maxHeightM: 16, maxFAR: 3.0, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Ground-floor commercial + upper-storey residential",
    note: "Main-street mixed-use.",
  },
  "CN": {
    name: "Neighbourhood Commercial",
    maxHeightM: 12, maxFAR: 2.0, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Neighbourhood retail with apartments above",
    note: "Smaller mixed-use footprint. Local-scale commercial.",
  },
};

// ═══════════════════════════ VANCOUVER ═══════════════════════════
// Zoning and Development By-law No. 3575 (as amended through 2024).
// R1-1 is the 2023 "Multiplex" zone that replaced RS-1 in most of the city.
const VANCOUVER = {
  "RS-1": {
    name: "One-Family Dwelling",
    maxHeightM: 10.7, maxFAR: 0.70, maxCoverage: 0.40, maxDensity: null,
    minLotAreaM2: 405, maxUnits: 3,
    setbacks: { front: 6.0, rear: 10.6, side: 1.2 },
    permittedUses: "1 dwelling + secondary suite + laneway house (up to 3 units)",
    note: "Most Vancouver lots. Laneway house + secondary suite together give 3 units on a standard 33′ lot.",
  },
  "RT-11": {
    name: "Two-Family Dwelling",
    maxHeightM: 10.7, maxFAR: 0.75, maxCoverage: 0.40, maxDensity: null,
    minLotAreaM2: 465, maxUnits: 4,
    setbacks: { front: 6.0, rear: 10.6, side: 1.2 },
    permittedUses: "Duplex + 2 secondary suites (up to 4 units total)",
    note: "Duplex-ready. Includes laneway option in many sub-districts.",
  },
  "R1-1": {
    name: "Residential Multiplex",
    maxHeightM: 11.5, maxFAR: 1.0, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 306, maxUnits: 8,
    setbacks: { front: 4.9, rear: 7.6, side: 1.2 },
    permittedUses: "Up to 8 units — multiplex, rowhouse, character retention",
    note: "The 2023 city-wide multiplex zone. Replaces RS-1 in most residential neighbourhoods.",
  },
  "RM-3": {
    name: "Multiple Dwelling",
    maxHeightM: 18, maxFAR: 1.45, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 465, maxUnits: null,
    setbacks: { front: 6.1, rear: 10.6, side: 3.7 },
    permittedUses: "Low-to-mid-rise apartments (typically 4-5 storeys)",
    note: "Common on transit corridors and West End edge blocks.",
  },
  "C-2": {
    name: "Commercial (mixed-use)",
    maxHeightM: 13.8, maxFAR: 2.5, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Ground-floor retail + apartments above (up to 4 storeys)",
    note: "The main street commercial zone — Main St, Commercial Dr, W 4th.",
  },
};

// ═══════════════════════════ TORONTO ═══════════════════════════
// Zoning By-law 569-2013 (as amended through 2024).
// Multiplex By-law 89-2023 allows up to 4 units on all R zones.
const TORONTO = {
  "RD": {
    name: "Residential Detached",
    maxHeightM: 9.0, maxFAR: 0.60, maxCoverage: 0.35, maxDensity: null,
    minLotAreaM2: 371, maxUnits: 4,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Detached house + up to 4 units (fourplex citywide as of 2023)",
    note: "The default residential zone. City-wide multiplex bylaw (2023) allows 4 units on all RD lots as-of-right.",
  },
  "RS": {
    name: "Residential Semi-Detached",
    maxHeightM: 9.0, maxFAR: 0.60, maxCoverage: 0.35, maxDensity: null,
    minLotAreaM2: 232, maxUnits: 4,
    setbacks: { front: 6.0, rear: 7.5, side: 0.6 },
    permittedUses: "Semi-detached + up to 4 units per side",
    note: "Same envelope as RD, permits semi-detached form. Narrower side setback.",
  },
  "RT": {
    name: "Residential Townhouse",
    maxHeightM: 10.0, maxFAR: 1.0, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 6.0, rear: 7.5, side: 1.5 },
    permittedUses: "Townhouses, stacked townhouses",
    note: "Rowhouse-scale infill. Common in Toronto inner suburbs.",
  },
  "RM": {
    name: "Residential Multiple Dwelling",
    maxHeightM: 14, maxFAR: 1.0, maxCoverage: 0.40, maxDensity: null,
    minLotAreaM2: 500, maxUnits: null,
    setbacks: { front: 6.0, rear: 7.5, side: 2.5 },
    permittedUses: "Low-rise apartments (3-4 storeys)",
    note: "Small apartment sites. Height often bumped up on transit-served lots.",
  },
  "CR": {
    name: "Commercial Residential (mixed-use)",
    maxHeightM: 18, maxFAR: 3.0, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 5.5, side: 0 },
    permittedUses: "Ground-floor commercial + apartments above",
    note: "The city's mixed-use main-street zone. FAR/height frequently bonused on Avenues.",
  },
};

// ═══════════════════════════ OTTAWA ═══════════════════════════
// Zoning By-law 2008-250 (as amended through 2024). New comprehensive
// zoning bylaw is in development — these specs may shift in 2025-2026.
const OTTAWA = {
  "R1": {
    name: "Residential First Density",
    maxHeightM: 11.0, maxFAR: 0.60, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 360, maxUnits: 3,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Detached + secondary dwelling unit + coach house",
    note: "Standard SFH zone. 3-unit as-of-right thanks to 2020 amendment.",
  },
  "R2": {
    name: "Residential Second Density",
    maxHeightM: 11.0, maxFAR: 0.60, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 270, maxUnits: 4,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Detached + semi-detached + 2 secondary units",
    note: "Duplex + suites allowed. Common in older inner suburbs.",
  },
  "R4": {
    name: "Residential Fourth Density",
    maxHeightM: 14.5, maxFAR: 1.5, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 450, maxUnits: null,
    setbacks: { front: 3.0, rear: 6.0, side: 1.5 },
    permittedUses: "Low-rise apartments, stacked dwellings, planned unit developments",
    note: "The main low-rise apartment zone in inner-city Ottawa.",
  },
  "R5": {
    name: "Residential Fifth Density",
    maxHeightM: 22, maxFAR: 2.0, maxCoverage: 0.50, maxDensity: null,
    minLotAreaM2: 600, maxUnits: null,
    setbacks: { front: 3.0, rear: 7.5, side: 3.0 },
    permittedUses: "Mid-rise apartments (typically 6-8 storeys)",
    note: "Common along Rideau, Bank, and transit-served corridors.",
  },
  "TM": {
    name: "Traditional Mainstreet",
    maxHeightM: 15, maxFAR: 2.5, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Ground-floor retail + apartments (4-5 storeys)",
    note: "Wellington, Bank, Preston, Rideau — the traditional main streets.",
  },
};

// ═══════════════════════════ MISSISSAUGA ═══════════════════════════
// Zoning By-law 0225-2007 (as amended).
const MISSISSAUGA = {
  "R3": {
    name: "Residential 3 – Detached",
    maxHeightM: 10.7, maxFAR: null, maxCoverage: 0.35, maxDensity: null,
    minLotAreaM2: 510, maxUnits: 1,
    setbacks: { front: 7.5, rear: 7.5, side: 1.5 },
    permittedUses: "Detached dwelling + accessory apartment",
    note: "Larger-lot SFH zone. Common in Mineola, Erindale.",
  },
  "R4": {
    name: "Residential 4 – Detached (smaller lots)",
    maxHeightM: 10.7, maxFAR: null, maxCoverage: 0.40, maxDensity: null,
    minLotAreaM2: 315, maxUnits: 1,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Detached dwelling + accessory apartment",
    note: "Standard suburban SFH. Post-war neighbourhoods.",
  },
  "RM4": {
    name: "Residential Multiple 4 – Townhouse",
    maxHeightM: 10.7, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 190, maxUnits: null,
    setbacks: { front: 6.0, rear: 7.5, side: 1.2 },
    permittedUses: "Townhouses, back-to-back townhouses",
    note: "Townhouse infill zone. Per-unit lot minimum.",
  },
  "C4": {
    name: "Mainstreet Commercial Node",
    maxHeightM: 15, maxFAR: 2.5, maxCoverage: null, maxDensity: null,
    minLotAreaM2: null, maxUnits: null,
    setbacks: { front: 0, rear: 3.0, side: 0 },
    permittedUses: "Ground-floor retail + apartments (mixed-use, up to ~5 storeys)",
    note: "Port Credit, Streetsville, Cooksville village core.",
  },
};

// ═══════════════════════════ HAMILTON ═══════════════════════════
// Zoning By-law 05-200 (rural + former Hamilton) + Zoning By-law 6593
// (former city area). Codes here from By-law 05-200 (post-amalgamation).
const HAMILTON = {
  "C": {
    name: "Urban Residential (former By-law 6593)",
    maxHeightM: 10.7, maxFAR: null, maxCoverage: 0.40, maxDensity: null,
    minLotAreaM2: 270, maxUnits: 3,
    setbacks: { front: 4.5, rear: 7.5, side: 1.2 },
    permittedUses: "Detached / semi-detached + 2 accessory units",
    note: "The inner-city Hamilton residential zone (former City of Hamilton).",
  },
  "D": {
    name: "Multiple Residential (former By-law 6593)",
    maxHeightM: 11, maxFAR: null, maxCoverage: 0.45, maxDensity: null,
    minLotAreaM2: 465, maxUnits: 6,
    setbacks: { front: 4.5, rear: 7.5, side: 1.5 },
    permittedUses: "Multi-unit dwellings, converted dwellings, small apartments",
    note: "The small-apartment / conversion zone in inner Hamilton.",
  },
};

const CITY_TABLES = {
  calgary:     { table: CALGARY,     bylawUrl: CALGARY_BYLAW_URL,     displayName: "Calgary" },
  edmonton:    { table: EDMONTON,    bylawUrl: EDMONTON_BYLAW_URL,    displayName: "Edmonton" },
  vancouver:   { table: VANCOUVER,   bylawUrl: VANCOUVER_BYLAW_URL,   displayName: "Vancouver" },
  toronto:     { table: TORONTO,     bylawUrl: TORONTO_BYLAW_URL,     displayName: "Toronto" },
  ottawa:      { table: OTTAWA,      bylawUrl: OTTAWA_BYLAW_URL,      displayName: "Ottawa" },
  mississauga: { table: MISSISSAUGA, bylawUrl: MISSISSAUGA_BYLAW_URL, displayName: "Mississauga" },
  hamilton:    { table: HAMILTON,    bylawUrl: HAMILTON_BYLAW_URL,    displayName: "Hamilton" },
};

/** Normalize a zoning code — strip whitespace, uppercase, remove common suffixes. */
function normalizeCode(code) {
  if (!code) return "";
  return String(code).toUpperCase().replace(/\s+/g, "").replace(/\.$/, "");
}

/** Detect city slug from an address string — matches the strategyMath convention. */
function citySlugFrom(address) {
  const a = String(address || "").toLowerCase();
  if (/calgary|airdrie|cochrane|okotoks|chestermere/.test(a)) return "calgary";
  if (/edmonton|sherwood park|st\.? albert|spruce grove|leduc/.test(a)) return "edmonton";
  if (/vancouver|burnaby|richmond|surrey|north van|west van|coquitlam|delta/.test(a)) return "vancouver";
  if (/mississauga|streetsville|cooksville|port credit/.test(a)) return "mississauga";
  if (/hamilton|dundas|ancaster|stoney creek|waterdown/.test(a)) return "hamilton";
  if (/toronto|north york|scarborough|etobicoke|markham|vaughan|brampton|oakville|burlington|richmond hill/.test(a)) return "toronto";
  if (/ottawa|gatineau|kanata|orleans|orléans|nepean/.test(a)) return "ottawa";
  return "unknown";
}

/**
 * Look up dimensional specs for a zoning code in a given city.
 *
 * @param {string} code    - the zoning code (e.g. "R-C1", "RS")
 * @param {string} city    - city slug ("calgary"|"edmonton") OR an address string
 * @returns {object|null}  - specs blob or null if unknown
 */
export function getZoningSpecs(code, city) {
  const normCode = normalizeCode(code);
  if (!normCode) return null;

  const slug = CITY_TABLES[city] ? city : citySlugFrom(city);
  const cityEntry = CITY_TABLES[slug];
  if (!cityEntry) return null;

  // Exact match first, then try common suffixes stripped.
  let specs = cityEntry.table[normCode];
  if (!specs) {
    // e.g. "R-C1(D)" → try "R-C1"
    const stripped = normCode.replace(/\([^)]*\)$/, "").replace(/[-–]$/, "");
    specs = cityEntry.table[stripped];
  }
  if (!specs) return null;

  return { ...specs, code: normCode, city: cityEntry.displayName, bylawUrl: cityEntry.bylawUrl };
}

/**
 * Get the bylaw URL for a city even if we don't have the code catalogued.
 * Used for the "specs coming soon" placeholder.
 */
export function getBylawUrl(city) {
  const slug = CITY_TABLES[city] ? city : citySlugFrom(city);
  return CITY_TABLES[slug]?.bylawUrl || null;
}

/**
 * Rough buildable envelope calc — given lot area + FAR + coverage, what
 * could you actually build?
 *   maxBuildableM2 = min(lotArea × FAR, lotArea × coverage × storeys)
 * where storeys ≈ floor(maxHeightM / 3.0m).
 */
export function estimateBuildableEnvelope(specs, lotAreaM2) {
  if (!specs || !lotAreaM2) return null;
  const area = Number(lotAreaM2);
  if (!area) return null;

  const storeys = specs.maxHeightM ? Math.floor(specs.maxHeightM / 3.0) : 1;
  const farLimit = specs.maxFAR ? area * specs.maxFAR : Infinity;
  const coverageLimit = specs.maxCoverage ? area * specs.maxCoverage * storeys : Infinity;
  const buildableM2 = Math.min(farLimit, coverageLimit);
  if (!isFinite(buildableM2)) return null;

  return {
    lotAreaM2: area,
    storeys,
    buildableM2: Math.round(buildableM2),
    buildableSqft: Math.round(buildableM2 * 10.7639),
    limitedBy: farLimit < coverageLimit ? "FAR" : "coverage × storeys",
  };
}
