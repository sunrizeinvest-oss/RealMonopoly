/**
 * verdictMemoPDF.js — client-side jsPDF renderer for the AI-authored
 * 1-page investment memo. Called by the "Generate Memo PDF" button on
 * /property (StrategyVerdicts panel).
 *
 * The memo text arrives as plain Markdown-ish content with these section
 * headers (verbatim):
 *   ## THESIS
 *   ## HIGHLIGHTS
 *   ## RISKS
 *   ## THE STRATEGY
 *   ## NEXT STEPS
 *
 * We parse those into structured blocks and lay each out with the same
 * Family Office palette (navy header stripe + brass accents) used across
 * every RizeAI PDF.
 */

const NAVY   = "#0a1128";
const BRASS  = "#d4af37";
const SLATE  = "#475569";
const TEXT   = "#0f172a";
const DIM    = "#94a3b8";

/** Split memo into sections keyed by header name. */
function parseSections(memo) {
  const out = { THESIS: "", HIGHLIGHTS: "", RISKS: "", THE_STRATEGY: "", NEXT_STEPS: "" };
  const lines = String(memo || "").split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const m = line.match(/^\s*##\s+(.+?)\s*$/);
    if (m) {
      const key = m[1].toUpperCase().replace(/\s+/g, "_");
      if (key in out) { current = key; out[current] = ""; continue; }
      current = null;
      continue;
    }
    if (current) out[current] += line + "\n";
  }
  return out;
}

/** Split a section's body into bullet items (lines starting with -, *, or a digit.) */
function toBullets(body) {
  return String(body || "")
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean);
}

/** Turn a section's body into paragraphs (for THESIS / STRATEGY prose blocks). */
function toParagraph(body) {
  return String(body || "").replace(/\s+/g, " ").trim();
}

/**
 * Fetch the current user's white-label branding (Scale-tier only) so we can
 * swap the header. Falls back to RizeAI defaults if no branding set or user
 * is on a lower tier.
 */
async function loadBranding() {
  try {
    const { supabase } = await import("./../supabase.js");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const { data } = await supabase
      .from("user_branding")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

/**
 * Load an image URL as a data URL for jsPDF. jsPDF's addImage needs base64.
 * Fails silently — if the logo can't be loaded we fall through to the text
 * header. Handles CORS by using fetch() blob.
 */
async function loadImageAsDataURL(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/**
 * Generate + trigger download of the memo PDF.
 * @param {object} args
 * @param {string} args.memo      - AI-authored memo text
 * @param {object} args.property  - property snapshot for header
 * @param {array}  args.verdicts  - viable strategy results for the footer band
 * @param {object} [args.branding] - optional { firm_name, firm_logo_url, firm_email, ... } override
 */
export async function generateVerdictMemoPDF({ memo, property, verdicts = [], branding = null }) {
  const { jsPDF } = await import("jspdf");

  // If no branding passed in, try to load the user's white-label settings
  const effectiveBranding = branding || await loadBranding();
  const useCustomBrand = !!(effectiveBranding?.firm_name || effectiveBranding?.firm_logo_url);
  const accent = (effectiveBranding?.primary_color && /^#[0-9a-f]{6}$/i.test(effectiveBranding.primary_color))
    ? effectiveBranding.primary_color
    : BRASS;

  const logoDataUrl = effectiveBranding?.firm_logo_url
    ? await loadImageAsDataURL(effectiveBranding.firm_logo_url)
    : null;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;

  const sections = parseSections(memo);
  const address = property?.address || "Property";
  const city = [property?.city, property?.province].filter(Boolean).join(", ");
  const purchasePrice = property?.purchasePrice || property?.estimatedValue;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── HEADER STRIPE ───────────────────────────────────────────────────────
  doc.setFillColor(NAVY);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(accent);
  doc.rect(0, 96, W, 3, "F");

  // Logo mark (top-left) — custom firm logo if set, else RizeAI wordmark
  if (logoDataUrl) {
    try {
      // Detect PNG/JPG from data URL prefix (jsPDF needs the format hint)
      const fmt = /^data:image\/jpe?g/i.test(logoDataUrl) ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, fmt, M, 22, 100, 40, undefined, "FAST");
    } catch { /* fall through to text wordmark */ }
  } else if (useCustomBrand && effectiveBranding.firm_name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor("#ffffff");
    doc.text(effectiveBranding.firm_name, M, 40);
    if (effectiveBranding.firm_tagline) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#d4d8e0");
      doc.text(effectiveBranding.firm_tagline, M, 55);
    } else if (effectiveBranding.firm_website) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor("#d4d8e0");
      doc.text(effectiveBranding.firm_website, M, 55);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor("#ffffff");
    doc.text("Real", M, 40);
    doc.setTextColor(BRASS);
    doc.text("Deal", M + 32, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor("#d4d8e0");
    doc.text("realdealestate.app", M, 55);
  }

  // Eyebrow + doc type (top-right)
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(accent);
  doc.text("▸ INVESTMENT MEMO · AI-GENERATED", W - M, 32, { align: "right" });
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#d4d8e0");
  doc.text(dateStr, W - M, 46, { align: "right" });
  if (useCustomBrand && (effectiveBranding.firm_email || effectiveBranding.firm_phone)) {
    doc.text(effectiveBranding.firm_email || effectiveBranding.firm_phone, W - M, 58, { align: "right" });
  } else {
    doc.text("our AI · Institutional Grade", W - M, 58, { align: "right" });
  }

  // Property title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#ffffff");
  doc.text(address, M, 80);

  // ── PROPERTY FACTS STRIP (right under header) ───────────────────────────
  const factsY = 120;
  const facts = [];
  if (city)          facts.push(["Location",  city]);
  // Guard against typo/negative entries — a "$-500,000" facts label breaks the
  // grid layout AND raises "wait, is this a distressed sale?" confusion.
  if (purchasePrice && purchasePrice > 0) facts.push(["List / Est",   `$${Math.round(purchasePrice).toLocaleString()}`]);
  if (property?.rentEstimate) facts.push(["Est. Rent", `$${Math.round(property.rentEstimate).toLocaleString()}/mo`]);
  if (property?.sqft)   facts.push(["Sqft",      property.sqft.toLocaleString()]);
  if (property?.units)  facts.push(["Units",     String(property.units)]);
  if (property?.zoning) facts.push(["Zoning",    property.zoning]);

  const factW = (W - M * 2) / Math.max(1, facts.length);
  facts.forEach(([label, value], i) => {
    const x = M + i * factW;
    doc.setFont("courier", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(DIM);
    doc.text(label.toUpperCase(), x, factsY);
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(TEXT);
    doc.text(String(value), x, factsY + 14);
  });

  // Divider under facts strip
  doc.setDrawColor(230, 232, 236);
  doc.setLineWidth(0.5);
  doc.line(M, factsY + 26, W - M, factsY + 26);

  // ── MEMO BODY ────────────────────────────────────────────────────────────
  let y = factsY + 50;

  const drawSectionHeader = (label, color = BRASS) => {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(color);
    doc.text(`▸ ${label}`, M, y);
    y += 6;
    doc.setDrawColor(color);
    doc.setLineWidth(1.5);
    doc.line(M, y, M + 32, y);
    y += 12;
  };

  const drawParagraph = (text, opts = {}) => {
    doc.setFont("helvetica", opts.italic ? "italic" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(TEXT);
    const lines = doc.splitTextToSize(text, W - M * 2);
    for (const line of lines) {
      doc.text(line, M, y);
      y += 13;
    }
    y += 4;
  };

  const drawBullets = (bullets) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(TEXT);
    for (const bullet of bullets) {
      const lines = doc.splitTextToSize(bullet, W - M * 2 - 14);
      // Draw a brass square as bullet marker
      doc.setFillColor(BRASS);
      doc.rect(M, y - 6, 4, 4, "F");
      lines.forEach((line, i) => {
        doc.text(line, M + 12, y + (i * 12));
      });
      y += 12 * lines.length + 4;
    }
  };

  // THESIS
  if (sections.THESIS.trim()) {
    drawSectionHeader("THESIS");
    drawParagraph(toParagraph(sections.THESIS));
    y += 4;
  }

  // HIGHLIGHTS
  if (sections.HIGHLIGHTS.trim()) {
    drawSectionHeader("HIGHLIGHTS");
    drawBullets(toBullets(sections.HIGHLIGHTS));
    y += 4;
  }

  // RISKS
  if (sections.RISKS.trim()) {
    drawSectionHeader("RISKS", "#dc2626");
    drawBullets(toBullets(sections.RISKS));
    y += 4;
  }

  // THE STRATEGY
  if (sections.THE_STRATEGY.trim()) {
    drawSectionHeader("THE STRATEGY");
    drawParagraph(toParagraph(sections.THE_STRATEGY));
    y += 4;
  }

  // NEXT STEPS
  if (sections.NEXT_STEPS.trim()) {
    drawSectionHeader("NEXT STEPS");
    drawBullets(toBullets(sections.NEXT_STEPS));
  }

  // ── STRATEGY VERDICT BAND (footer, above disclaimer) ────────────────────
  const bandTop = H - 96;
  doc.setFillColor("#f8fafc");
  doc.rect(M, bandTop, W - M * 2, 40, "F");
  doc.setDrawColor(BRASS);
  doc.setLineWidth(0.6);
  doc.rect(M, bandTop, W - M * 2, 40);
  doc.setDrawColor(230, 232, 236);
  doc.line(M + 4, bandTop + 4, M + 4, bandTop + 36);   // brass hairline

  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BRASS);
  doc.text("▸ VERDICT GRID", M + 12, bandTop + 14);

  const viable = (verdicts || []).filter(v => v?.viable).slice(0, 4);
  if (viable.length > 0) {
    const colW = (W - M * 2 - 24) / viable.length;
    viable.forEach((v, i) => {
      const x = M + 12 + i * colW;
      doc.setFont("courier", "bold");
      doc.setFontSize(7);
      doc.setTextColor(SLATE);
      doc.text(`${v.name || v.key || "?"}`.toUpperCase(), x, bandTop + 26);
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(v.verdict?.color || NAVY);
      doc.text(`${v.verdict?.label || ""} · ${v.headline || ""}`, x, bandTop + 36);
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    doc.text("No viable strategies flagged.", M + 12, bandTop + 30);
  }

  // ── FOOTER DISCLAIMER ───────────────────────────────────────────────────
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(DIM);
  const footerAttrib = useCustomBrand && effectiveBranding.firm_name
    ? `Prepared by ${effectiveBranding.firm_name}${effectiveBranding.firm_website ? ` · ${effectiveBranding.firm_website}` : ""} · Powered by RizeAI (our AI)`
    : `Generated by realdealestate.app · our AI`;
  doc.text(
    `${footerAttrib} · ${dateStr}   ·   Not investment advice. Verify all figures before acting.`,
    W / 2,
    H - 24,
    { align: "center" }
  );

  const slug = String(address || "property").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  doc.save(`RizeAI-memo-${slug || "property"}.pdf`);
}
