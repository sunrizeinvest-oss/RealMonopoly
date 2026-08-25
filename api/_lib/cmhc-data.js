/**
 * CMHC Rental Market Survey — October 2023 snapshot.
 *
 * Pure data + a fuzzy city lookup. Imported by:
 *   - /api/cmhc-rental    (raw data lookup endpoint)
 *   - /api/predict-rent   (uses CMA averages as the model anchor)
 *
 * Refresh annually in Q4 when CMHC publishes the new survey:
 *   https://www.cmhc-schl.gc.ca/en/data-and-research/data-tables/average-rents-bedroom-type-areas
 */

export const CMHC_DATA_YEAR = 2023;
export const CMHC_DATA_SOURCE = "CMHC Rental Market Survey — October 2023";

// Since CMHC's next survey publishes annually in Q4, our 2023 base data ages
// out fast. Rather than shipping stale rents, we project forward at a
// conservative 4.5%/yr compound (Statistics Canada rent CPI has averaged
// ~5-7% since 2022 — 4.5% is deliberately below to avoid over-projecting).
// Refresh CMHC_DATA_YEAR and the RENTAL_DATA rows to real 2026 numbers when
// CMHC publishes the next report.
export const CMHC_ANNUAL_INFLATION = 0.045;

/**
 * Multiplier applied to CMHC's 2023 rents to project to the current year.
 * Compounded annually from CMHC_DATA_YEAR. Deterministic per fiscal year so
 * two lookups on the same day return identical numbers.
 */
export function getCmhcInflationMultiplier(now = new Date()) {
  const currentYear = now.getUTCFullYear();
  const yearsElapsed = Math.max(0, currentYear - CMHC_DATA_YEAR);
  return Math.pow(1 + CMHC_ANNUAL_INFLATION, yearsElapsed);
}

/**
 * Apply the inflation multiplier to a raw CMHC rents object and round.
 * Preserves null / missing fields as-is (they're unavailable, not stale-zero).
 */
export function inflateAvgRents(avgRents, multiplier = getCmhcInflationMultiplier()) {
  if (!avgRents) return null;
  const out = {};
  for (const [k, v] of Object.entries(avgRents)) {
    out[k] = (typeof v === "number" && isFinite(v)) ? Math.round(v * multiplier) : v;
  }
  return out;
}

export const RENTAL_DATA = [
  {
    city: "Vancouver", province: "BC", cma: "Vancouver CMA",
    aliases: ["vancouver", "north vancouver", "west vancouver", "burnaby", "richmond", "new westminster", "coquitlam", "port moody", "maple ridge", "delta"],
    vacancyRate: 0.9,
    avgRents: { bachelor: 1517, oneBed: 2003, twoBed: 2690, threePlusBed: 3173 },
    yoyChange: 8.2,
    universeSize: 178400,
    notes: "Tightest rental market in Canada. Purpose-built rental vacancy near historic lows.",
  },
  {
    city: "Victoria", province: "BC", cma: "Victoria CMA",
    aliases: ["victoria", "saanich", "langford", "colwood", "esquimalt", "oak bay", "sidney"],
    vacancyRate: 1.6,
    avgRents: { bachelor: 1339, oneBed: 1657, twoBed: 2101, threePlusBed: 2485 },
    yoyChange: 6.1,
    universeSize: 27900,
    notes: "Strong government and tech employment base. Limited new supply.",
  },
  {
    city: "Kelowna", province: "BC", cma: "Kelowna CMA",
    aliases: ["kelowna", "west kelowna", "lake country", "peachland"],
    vacancyRate: 1.4,
    avgRents: { bachelor: 1201, oneBed: 1647, twoBed: 1987, threePlusBed: 2264 },
    yoyChange: 7.3,
    universeSize: 14200,
    notes: "Strong demand from retirees and remote workers. Rapid rent growth.",
  },
  {
    city: "Abbotsford", province: "BC", cma: "Abbotsford-Mission CMA",
    aliases: ["abbotsford", "mission", "chilliwack", "fraser valley"],
    vacancyRate: 2.1,
    avgRents: { bachelor: 1120, oneBed: 1468, twoBed: 1756, threePlusBed: 1941 },
    yoyChange: 5.8,
    universeSize: 12800,
    notes: "Overflow market from Vancouver. Growing commuter population.",
  },
  {
    city: "Calgary", province: "AB", cma: "Calgary CMA",
    aliases: ["calgary", "airdrie", "cochrane", "chestermere", "strathmore"],
    vacancyRate: 2.6,
    avgRents: { bachelor: 1143, oneBed: 1553, twoBed: 1893, threePlusBed: 2137 },
    yoyChange: 9.1,
    universeSize: 68400,
    notes: "Fastest rent growth in Canada in 2023. Energy sector recovery driving demand.",
  },
  {
    city: "Edmonton", province: "AB", cma: "Edmonton CMA",
    aliases: ["edmonton", "st. albert", "sherwood park", "spruce grove", "leduc", "fort saskatchewan"],
    vacancyRate: 3.6,
    avgRents: { bachelor: 871, oneBed: 1148, twoBed: 1394, threePlusBed: 1683 },
    yoyChange: 6.8,
    universeSize: 58200,
    notes: "Most affordable major rental market west of Winnipeg. High supply pipeline.",
  },
  {
    city: "Red Deer", province: "AB", cma: "Red Deer",
    aliases: ["red deer"],
    vacancyRate: 4.2,
    avgRents: { bachelor: 742, oneBed: 962, twoBed: 1134, threePlusBed: 1298 },
    yoyChange: 5.2,
    universeSize: 8900,
  },
  {
    city: "Lethbridge", province: "AB", cma: "Lethbridge",
    aliases: ["lethbridge"],
    vacancyRate: 3.8,
    avgRents: { bachelor: 718, oneBed: 924, twoBed: 1089, threePlusBed: 1241 },
    yoyChange: 4.9,
    universeSize: 6100,
  },
  {
    city: "Toronto", province: "ON", cma: "Toronto CMA",
    aliases: ["toronto", "mississauga", "brampton", "markham", "vaughan", "richmond hill", "pickering", "ajax", "oshawa", "oakville", "burlington", "hamilton"],
    vacancyRate: 1.5,
    avgRents: { bachelor: 1453, oneBed: 1982, twoBed: 2345, threePlusBed: 2593 },
    yoyChange: 8.4,
    universeSize: 344700,
    notes: "Largest rental market in Canada. Condo rentals driving supply.",
  },
  {
    city: "Ottawa", province: "ON", cma: "Ottawa-Gatineau CMA",
    aliases: ["ottawa", "gatineau", "kanata", "barrhaven", "nepean", "gloucester"],
    vacancyRate: 2.1,
    avgRents: { bachelor: 1151, oneBed: 1567, twoBed: 1847, threePlusBed: 2080 },
    yoyChange: 5.6,
    universeSize: 89600,
    notes: "Stable government employment base. Strong demand for 2+ bedroom units.",
  },
  {
    city: "Hamilton", province: "ON", cma: "Hamilton CMA",
    aliases: ["hamilton", "burlington", "stoney creek", "dundas", "ancaster"],
    vacancyRate: 2.4,
    avgRents: { bachelor: 1022, oneBed: 1394, twoBed: 1627, threePlusBed: 1829 },
    yoyChange: 5.9,
    universeSize: 28700,
    notes: "Overflow market from Toronto. Strong transit-oriented demand.",
  },
  {
    city: "London", province: "ON", cma: "London CMA",
    aliases: ["london", "st. thomas"],
    vacancyRate: 2.1,
    avgRents: { bachelor: 942, oneBed: 1218, twoBed: 1432, threePlusBed: 1621 },
    yoyChange: 6.2,
    universeSize: 32400,
  },
  {
    city: "Kitchener", province: "ON", cma: "Kitchener-Cambridge-Waterloo CMA",
    aliases: ["kitchener", "waterloo", "cambridge", "kwc"],
    vacancyRate: 1.8,
    avgRents: { bachelor: 1089, oneBed: 1447, twoBed: 1698, threePlusBed: 1912 },
    yoyChange: 7.1,
    universeSize: 29800,
    notes: "Tech corridor. Strong student and professional demand.",
  },
  {
    city: "Windsor", province: "ON", cma: "Windsor CMA",
    aliases: ["windsor"],
    vacancyRate: 2.8,
    avgRents: { bachelor: 812, oneBed: 1067, twoBed: 1243, threePlusBed: 1401 },
    yoyChange: 5.3,
    universeSize: 14200,
  },
  {
    city: "Kingston", province: "ON", cma: "Kingston",
    aliases: ["kingston"],
    vacancyRate: 1.3,
    avgRents: { bachelor: 982, oneBed: 1312, twoBed: 1543, threePlusBed: 1739 },
    yoyChange: 6.8,
    universeSize: 10800,
    notes: "Queen's University drives extremely tight vacancy.",
  },
  {
    city: "Barrie", province: "ON", cma: "Barrie CMA",
    aliases: ["barrie", "innisfil", "orillia"],
    vacancyRate: 2.2,
    avgRents: { bachelor: 1098, oneBed: 1467, twoBed: 1712, threePlusBed: 1932 },
    yoyChange: 6.4,
    universeSize: 12600,
  },
  {
    city: "Montreal", province: "QC", cma: "Montréal CMA",
    aliases: ["montreal", "montréal", "laval", "longueuil", "brossard", "saint-jerome", "blainville"],
    vacancyRate: 3.0,
    avgRents: { bachelor: 839, oneBed: 1038, twoBed: 1170, threePlusBed: 1384 },
    yoyChange: 7.0,
    universeSize: 328000,
    notes: "Rent control applies to units built before 1987. Significantly below national averages.",
  },
  {
    city: "Quebec City", province: "QC", cma: "Québec CMA",
    aliases: ["quebec city", "québec city", "lévis"],
    vacancyRate: 1.1,
    avgRents: { bachelor: 602, oneBed: 799, twoBed: 884, threePlusBed: 982 },
    yoyChange: 5.1,
    universeSize: 72400,
    notes: "Very low vacancy in capital region. Strong government employment.",
  },
  {
    city: "Winnipeg", province: "MB", cma: "Winnipeg CMA",
    aliases: ["winnipeg"],
    vacancyRate: 2.9,
    avgRents: { bachelor: 787, oneBed: 1002, twoBed: 1184, threePlusBed: 1371 },
    yoyChange: 4.8,
    universeSize: 41900,
  },
  {
    city: "Saskatoon", province: "SK", cma: "Saskatoon CMA",
    aliases: ["saskatoon"],
    vacancyRate: 4.1,
    avgRents: { bachelor: 827, oneBed: 1099, twoBed: 1255, threePlusBed: 1445 },
    yoyChange: 5.6,
    universeSize: 19800,
  },
  {
    city: "Regina", province: "SK", cma: "Regina CMA",
    aliases: ["regina"],
    vacancyRate: 5.8,
    avgRents: { bachelor: 789, oneBed: 998, twoBed: 1159, threePlusBed: 1299 },
    yoyChange: 4.2,
    universeSize: 15400,
    notes: "Highest vacancy among major prairie cities. Tenant-favourable market.",
  },
  {
    city: "Halifax", province: "NS", cma: "Halifax CMA",
    aliases: ["halifax", "dartmouth", "bedford", "sackville"],
    vacancyRate: 1.8,
    avgRents: { bachelor: 1049, oneBed: 1435, twoBed: 1741, threePlusBed: 1985 },
    yoyChange: 9.3,
    universeSize: 30100,
    notes: "Fastest-growing market in Atlantic Canada. Strong immigration-driven demand.",
  },
  {
    city: "Moncton", province: "NB", cma: "Moncton CMA",
    aliases: ["moncton", "dieppe", "riverview"],
    vacancyRate: 1.4,
    avgRents: { bachelor: 812, oneBed: 1034, twoBed: 1198, threePlusBed: 1345 },
    yoyChange: 8.7,
    universeSize: 11200,
    notes: "Fastest rent growth in New Brunswick. Logistics hub driving demand.",
  },
  {
    city: "Saint John", province: "NB", cma: "Saint John",
    aliases: ["saint john", "st. john"],
    vacancyRate: 3.2,
    avgRents: { bachelor: 693, oneBed: 898, twoBed: 1034, threePlusBed: 1178 },
    yoyChange: 5.8,
    universeSize: 8700,
  },
  {
    city: "St. John's", province: "NL", cma: "St. John's CMA",
    aliases: ["st. john's", "st johns", "mount pearl", "paradise"],
    vacancyRate: 3.1,
    avgRents: { bachelor: 856, oneBed: 1089, twoBed: 1245, threePlusBed: 1398 },
    yoyChange: 6.4,
    universeSize: 14800,
  },
  {
    city: "Charlottetown", province: "PE", cma: "Charlottetown",
    aliases: ["charlottetown", "summerside"],
    vacancyRate: 1.2,
    avgRents: { bachelor: 887, oneBed: 1187, twoBed: 1412, threePlusBed: 1589 },
    yoyChange: 10.2,
    universeSize: 6800,
    notes: "Tightest market in Atlantic Canada. Extremely limited new supply.",
  },
];

/**
 * Fuzzy-match a city/alias string against the CMHC dataset.
 * Returns the matching row or null. Optional province narrows ambiguous matches
 * like "London" (ON) vs "London" (UK — not in dataset but defensive).
 */
export function lookupCMHC(cityOrAlias, province = null) {
  if (!cityOrAlias) return null;
  const search = String(cityOrAlias).toLowerCase().trim();
  const provFilter = province ? String(province).toUpperCase().trim() : null;

  let match = RENTAL_DATA.find(d => {
    const nameMatch = d.aliases.some(a => search.includes(a) || a.includes(search))
      || d.city.toLowerCase() === search;
    const provMatch = !provFilter || d.province === provFilter;
    return nameMatch && provMatch;
  });

  // Fallback: 4-char prefix match against canonical city name.
  if (!match) {
    match = RENTAL_DATA.find(d => d.city.toLowerCase().startsWith(search.slice(0, 4)));
  }

  if (!match) return null;

  // Inflate the raw 2023 rents to current year using the compound multiplier
  // above. Base rents are preserved on the returned object so callers can
  // audit / display "as of Oct 2023" if they want. `dataYear` still reflects
  // 2023 (the source snapshot year); we also expose `projectedTo` for the UI.
  const multiplier = getCmhcInflationMultiplier();
  return {
    ...match,
    avgRentsBase: match.avgRents,
    avgRents:     inflateAvgRents(match.avgRents, multiplier),
    dataYear:     CMHC_DATA_YEAR,
    projectedTo:  new Date().getUTCFullYear(),
    inflationMultiplier: +multiplier.toFixed(4),
    inflationNote: `Projected forward from Oct ${CMHC_DATA_YEAR} at ${(CMHC_ANNUAL_INFLATION * 100).toFixed(1)}%/yr compound. Refresh RENTAL_DATA when CMHC publishes the next survey.`,
  };
}
