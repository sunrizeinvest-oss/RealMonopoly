/**
 * api/city-data.js
 *
 * Pulls live property intelligence from municipal open data portals.
 * Supported cities (all free, no API key required):
 *   - Vancouver    → opendata.vancouver.ca (Opendatasoft)
 *   - Calgary      → data.calgary.ca      (Socrata)
 *   - Edmonton     → data.edmonton.ca     (Socrata)
 *   - Toronto      → open.toronto.ca      (CKAN)
 *
 * Returns: zoning, active building permits, nearby development applications,
 *          property class, assessed value (where available).
 *
 * Query params:
 *   ?address=123 Main St, Vancouver, BC
 *   (city is auto-detected from the address)
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Address required" });

  const city = detectCity(address);
  if (!city) {
    return res.status(404).json({
      error: "City not supported yet. Covered: Vancouver, Calgary, Edmonton, Toronto.",
      detected: null,
    });
  }

  try {
    // Step 1: Geocode the address to get lat/lng
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "RizeAI/1.0 (rizeai.co)" } }
    );

    let lat = null, lon = null;
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
      }
    }

    // Step 2: Fetch city-specific data
    let result;
    switch (city) {
      case "vancouver": result = await getVancouverData(address, lat, lon); break;
      case "calgary":   result = await getCalgaryData(address, lat, lon);   break;
      case "edmonton":  result = await getEdmontonData(address, lat, lon);  break;
      case "toronto":   result = await getTorontoData(address, lat, lon);   break;
      default:
        // Explicit "unsupported city" signal — was previously { error: "..." }
        // which the UI silently swallowed. Now returns HTTP 404 + a structured
        // payload so PropertyHub can render "we don't have municipal data for
        // this city yet" rather than empty-state.
        return res.status(404).json({
          city,
          source: null,
          error: `Municipal open data not yet supported for "${city}"`,
          supportedCities: ["vancouver", "calgary", "edmonton", "toronto"],
          note: "Zoning, assessment, and permits require a per-city adapter. Property lookup (values, rent estimate, CMHC) still works for all Canadian cities via the /api/property-lookup endpoint.",
          geocoded: lat ? { lat, lon } : null,
        });
    }

    return res.status(200).json({
      city,
      source: getCitySource(city),
      geocoded: lat ? { lat, lon } : null,
      ...result,
    });

  } catch (err) {
    console.error("city-data error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── City Detection ───────────────────────────────────────────────────────────
function detectCity(address) {
  const a = address.toLowerCase();
  if (/\bvancouver\b/.test(a) || /\bv[0-9][a-z]\s?[0-9][a-z][0-9]\b/.test(a) || /\bburnaby\b/.test(a) || /\bnorth van\b/.test(a)) return "vancouver";
  if (/\bcalgary\b/.test(a) || /\bairdrie\b/.test(a)) return "calgary";
  if (/\bedmonton\b/.test(a) || /\bst\. albert\b/.test(a) || /\bsherwood park\b/.test(a)) return "edmonton";
  if (/\btoronto\b/.test(a) || /\bmississauga\b/.test(a) || /\bscarborough\b/.test(a) || /\betobicoke\b/.test(a) || /\bnorth york\b/.test(a)) return "toronto";
  return null;
}

function getCitySource(city) {
  const sources = {
    vancouver: "City of Vancouver Open Data (opendata.vancouver.ca)",
    calgary:   "City of Calgary Open Data (data.calgary.ca)",
    edmonton:  "City of Edmonton Open Data (data.edmonton.ca)",
    toronto:   "City of Toronto Open Data (open.toronto.ca)",
  };
  return sources[city] || "Municipal Open Data";
}

// ─── Vancouver ────────────────────────────────────────────────────────────────
async function getVancouverData(address, lat, lon) {
  const results = {};

  try {
    // Property tax report data (zoning, property class, assessed value)
    // Vancouver Open Data — property-tax-report dataset
    const streetAddr = address.split(",")[0].trim().toUpperCase();
    const taxRes = await fetch(
      `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/property-tax-report/records?` +
      `where=upper(full_address)%20like%20'${encodeURIComponent("%" + streetAddr.split(" ").slice(0,3).join(" ") + "%")}'` +
      `&limit=3&select=full_address,current_land_value,current_improvement_value,tax_levy,zone_name,property_type,year_built`,
      { headers: { "Accept": "application/json" } }
    );

    if (taxRes.ok) {
      const taxData = await taxRes.json();
      const record  = taxData.results?.[0];
      if (record) {
        results.zoning         = record.zone_name    || null;
        results.propertyClass  = record.property_type || null;
        results.assessedLand   = record.current_land_value || null;
        results.assessedImprovement = record.current_improvement_value || null;
        results.assessedTotal  = (record.current_land_value || 0) + (record.current_improvement_value || 0) || null;
        results.taxLevy        = record.tax_levy     || null;
        results.yearBuilt      = record.year_built   || null;
      }
    }
  } catch (e) { console.error("Van tax data error:", e.message); }

  try {
    // Development applications nearby (if geocoded)
    if (lat && lon) {
      const devRes = await fetch(
        `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/development-applications/records?` +
        `where=distance(geo_point_2d%2C%20geom'POINT(${lon}%20${lat})')%20<%202000&limit=5&order_by=applictn_dt%20DESC` +
        `&select=applictn_no,applictn_dt,prmry_sdrtd_addr,dscrptn_rsn,type_of_permit,status`,
        { headers: { "Accept": "application/json" } }
      );

      if (devRes.ok) {
        const devData = await devRes.json();
        results.nearbyDevelopmentApplications = (devData.results || []).map(d => ({
          appNumber:   d.applictn_no  || null,
          date:        d.applictn_dt  || null,
          address:     d.prmry_sdrtd_addr || null,
          description: d.dscrptn_rsn || null,
          type:        d.type_of_permit || null,
          status:      d.status       || null,
        }));
      }
    }
  } catch (e) { console.error("Van dev apps error:", e.message); }

  try {
    // Active building permits nearby
    if (lat && lon) {
      const permitRes = await fetch(
        `https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/issued-building-permits/records?` +
        `where=distance(geo_point_2d%2C%20geom'POINT(${lon}%20${lat})')%20<%201000&limit=5&order_by=issuedate%20DESC` +
        `&select=permitnumber,issuedate,typeofwork,propertyuse,applicantname,permitvalue`,
        { headers: { "Accept": "application/json" } }
      );

      if (permitRes.ok) {
        const permitData = await permitRes.json();
        results.nearbyPermits = (permitData.results || []).map(p => ({
          permitNumber: p.permitnumber || null,
          issueDate:    p.issuedate    || null,
          typeOfWork:   p.typeofwork   || null,
          propertyUse:  p.propertyuse  || null,
          applicant:    p.applicantname || null,
          value:        p.permitvalue  || null,
        }));
      }
    }
  } catch (e) { console.error("Van permits error:", e.message); }

  // Append Broadway Plan / TOD zone detection
  if (results.zoning) {
    results.todZone    = isTODZone(results.zoning);
    results.broadwayPlan = isBroadwayPlan(results.zoning);
  }

  return results;
}

// ─── Calgary ──────────────────────────────────────────────────────────────────
async function getCalgaryData(address, lat, lon) {
  const results = {};

  try {
    // Calgary property assessments (Socrata)
    const streetPart = address.split(",")[0].replace(/[^a-zA-Z0-9\s]/g, "").trim();
    const words = streetPart.toUpperCase().split(/\s+/).slice(0, 3);

    const assessRes = await fetch(
      `https://data.calgary.ca/resource/6zp6-pxei.json?` +
      `$where=upper(address)%20like%20'${encodeURIComponent("%" + words.join("%") + "%")}'` +
      `&$limit=3&$select=address,assessed_value,assessment_class,land_use,roll_number`,
      { headers: { "Accept": "application/json" } }
    );

    if (assessRes.ok) {
      const data  = await assessRes.json();
      const record = data[0];
      if (record) {
        results.assessedValue = parseInt(record.assessed_value) || null;
        results.propertyClass = record.assessment_class        || null;
        results.zoning        = record.land_use                || null;
        results.rollNumber    = record.roll_number             || null;
      }
    }
  } catch (e) { console.error("Calgary assess error:", e.message); }

  try {
    // Calgary building permits nearby (Socrata)
    if (lat && lon) {
      const permitRes = await fetch(
        `https://data.calgary.ca/resource/c2es-76ed.json?` +
        `$where=within_circle(point,%20${lat},%20${lon},%201000)` +
        `&$limit=5&$order=applieddate%20DESC` +
        `&$select=permitnum,statuscurrent,applieddate,workclassgroup,estprojectcost,originaladdress`,
        { headers: { "Accept": "application/json" } }
      );

      if (permitRes.ok) {
        const data = await permitRes.json();
        results.nearbyPermits = data.map(p => ({
          permitNumber: p.permitnum          || null,
          status:       p.statuscurrent      || null,
          appliedDate:  p.applieddate        || null,
          workClass:    p.workclassgroup     || null,
          projectCost:  p.estprojectcost     || null,
          address:      p.originaladdress    || null,
        }));
      }
    }
  } catch (e) { console.error("Calgary permits error:", e.message); }

  return results;
}

// ─── Edmonton ─────────────────────────────────────────────────────────────────
async function getEdmontonData(address, lat, lon) {
  const results = {};

  try {
    // Edmonton property assessments (Socrata)
    const streetPart = address.split(",")[0].replace(/[^a-zA-Z0-9\s]/g, "").trim().toUpperCase();

    const assessRes = await fetch(
      `https://data.edmonton.ca/resource/q7d6-ambg.json?` +
      `$where=upper(house_number_and_street_name)%20like%20'${encodeURIComponent("%" + streetPart.split(/\s+/).slice(0,2).join(" ") + "%")}'` +
      `&$limit=3&$select=house_number_and_street_name,assessed_value,property_type,zoning`,
      { headers: { "Accept": "application/json" } }
    );

    if (assessRes.ok) {
      const data   = await assessRes.json();
      const record = data[0];
      if (record) {
        results.assessedValue = parseInt(record.assessed_value) || null;
        results.propertyClass = record.property_type            || null;
        results.zoning        = record.zoning                   || null;
      }
    }
  } catch (e) { console.error("Edmonton assess error:", e.message); }

  try {
    // Edmonton building permits
    if (lat && lon) {
      const permitRes = await fetch(
        `https://data.edmonton.ca/resource/24uj-dj8v.json?` +
        `$where=within_circle(location,%20${lat},%20${lon},%201000)` +
        `&$limit=5&$order=issue_date%20DESC` +
        `&$select=permit_number,status_of_permit,issue_date,work_type_group,job_description,construction_value,address`,
        { headers: { "Accept": "application/json" } }
      );

      if (permitRes.ok) {
        const data = await permitRes.json();
        results.nearbyPermits = data.map(p => ({
          permitNumber: p.permit_number      || null,
          status:       p.status_of_permit   || null,
          issueDate:    p.issue_date         || null,
          workType:     p.work_type_group    || null,
          description:  p.job_description   || null,
          value:        p.construction_value || null,
          address:      p.address            || null,
        }));
      }
    }
  } catch (e) { console.error("Edmonton permits error:", e.message); }

  return results;
}

// ─── Toronto ──────────────────────────────────────────────────────────────────
async function getTorontoData(address, lat, lon) {
  const results = {};

  try {
    // Toronto building permits (CKAN)
    if (lat && lon) {
      // Toronto uses CKAN — fetch building permits dataset
      const permitRes = await fetch(
        `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?` +
        `resource_id=c3f65cc3-7c73-4e4f-8ef6-91de9e9d4c5f` +
        `&q=${encodeURIComponent(address.split(",")[0])}` +
        `&limit=5`,
        { headers: { "Accept": "application/json" } }
      );

      if (permitRes.ok) {
        const data    = await permitRes.json();
        const records = data.result?.records || [];
        results.nearbyPermits = records.map(p => ({
          permitNumber: p.PERMIT_NUM           || null,
          status:       p.STATUS               || null,
          issueDate:    p.ISSUED_DATE          || null,
          workType:     p.WORK                 || null,
          description:  p.DESCRIPTION         || null,
          value:        p.EST_CONST_COST       || null,
          address:      p.ADDRESS              || null,
        }));
      }
    }
  } catch (e) { console.error("Toronto permits error:", e.message); }

  return results;
}

// ─── Helpers — Vancouver zone classification ──────────────────────────────────
function isTODZone(zoning) {
  if (!zoning) return false;
  const z = zoning.toUpperCase();
  // Broadway Plan TOD, Cambie Corridor, Joyce-Collingwood, Oakridge, Surrey Central
  return /\bRM\b/.test(z) || /\bCD-1\b/.test(z) || /\bTOD\b/.test(z) || /\bBROADWAY\b/.test(z);
}

function isBroadwayPlan(zoning) {
  if (!zoning) return false;
  const z = zoning.toUpperCase();
  return /BROADWAY/.test(z) || /CAMBIE/.test(z);
}
