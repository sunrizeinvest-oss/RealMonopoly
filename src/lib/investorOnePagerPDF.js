/**
 * investorOnePagerPDF.js — single-page investor pitch PDF via jsPDF.
 *
 * Attach in cold emails, share with VCs who prefer PDF over links. Matches
 * the Family Office palette used across every RizeAI export (navy header
 * stripe + brass accents + slate body text).
 *
 * Content is intentionally terse — one page, scannable in 30 seconds.
 */

const NAVY   = "#0a1128";
const BRASS  = "#d4af37";
const SLATE  = "#475569";
const TEXT   = "#0f172a";
const DIM    = "#94a3b8";
const GREEN  = "#16a34a";
const ROYAL  = "#2155cd";

/**
 * @param {object} args
 * @param {object} args.metrics       - live metrics blob from /api/metrics
 * @param {object} args.ask           - { amount, targetMRR, months }
 * @param {string} args.founderBio    - 3-4 sentence founder bio
 */
export async function generateInvestorOnePagerPDF({ metrics = null, ask = null, founderBio = "" } = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── HEADER STRIPE ────────────────────────────────────────────────────────
  doc.setFillColor(NAVY);
  doc.rect(0, 0, W, 78, "F");
  doc.setFillColor(BRASS);
  doc.rect(0, 78, W, 2.5, "F");

  // Logo mark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#ffffff");
  doc.text("Real", M, 40);
  doc.setTextColor(BRASS);
  doc.text("Deal", M + 38, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#d4d8e0");
  doc.text("realdealestate.app", M, 56);

  // Confidential tag (top-right)
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRASS);
  doc.text("▸ CONFIDENTIAL · PRE-SEED", W - M, 34, { align: "right" });
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#d4d8e0");
  doc.text(dateStr, W - M, 48, { align: "right" });
  doc.text("1-page investor summary", W - M, 60, { align: "right" });

  let y = 108;

  // ── HEADLINE ─────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(TEXT);
  doc.text("RizeAI · the institutional underwriting layer", M, y);
  y += 22;
  doc.text("for the $600B Canadian residential market.", M, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(SLATE);
  const subLines = doc.splitTextToSize(
    "Type any Canadian address. Get the four-strategy verdict, dimensional zoning, and AI thesis in under 3 seconds. What Bloomberg is to stocks, RizeAI is to residential real estate — but for the segment CoStar refuses to serve.",
    W - M * 2
  );
  subLines.forEach(l => { doc.text(l, M, y); y += 12; });
  y += 8;

  // ── TAM STRIP ────────────────────────────────────────────────────────────
  drawSectionRule(doc, "MARKET", M, y, W);
  y += 18;
  const tamCells = [
    { val: "$600B+",  lbl: "Annual CA transactions" },
    { val: "65,000+", lbl: "CA brokers + agents" },
    { val: "$8.4T",   lbl: "Total residential value" },
    { val: "$5B+",    lbl: "Underwriting inefficiency" },
  ];
  const tamW = (W - M * 2) / tamCells.length;
  tamCells.forEach((c, i) => {
    const x = M + i * tamW;
    doc.setFont("courier", "bold");
    doc.setFontSize(15);
    doc.setTextColor(BRASS);
    doc.text(c.val, x, y);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(SLATE);
    doc.text(c.lbl, x, y + 12);
  });
  y += 32;

  // ── TWO-COL: PRODUCT + TRACTION ──────────────────────────────────────────
  const colW = (W - M * 2 - 16) / 2;

  // Product
  drawSectionRule(doc, "PRODUCT", M, y, M + colW);
  const productYStart = y + 18;
  const productItems = [
    "4-strategy verdict panel (Buy&Hold, BRRRR, Flip, MF)",
    "37 zoning codes × 7 CA cities · dimensional specs",
    "CMHC-anchored rent for 26 CA metros",
    "our AI investment memos",
    "Chrome extension + voice-to-verdict mobile flow",
    "Public API v1 (Scale tier)",
  ];
  let py = productYStart;
  productItems.forEach(item => {
    doc.setFillColor(BRASS);
    doc.rect(M, py - 5, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(TEXT);
    const lines = doc.splitTextToSize(item, colW - 10);
    lines.forEach((l, i) => doc.text(l, M + 8, py + i * 10));
    py += 10 * lines.length + 3;
  });

  // Traction (right column)
  const rightX = M + colW + 16;
  drawSectionRule(doc, "TRACTION · LIVE", rightX, y, rightX + colW);
  let ty = y + 18;
  const tractionCells = [
    { lbl: "Property lookups",  val: metrics?.lookups?.total?.toLocaleString() || "—" },
    { lbl: "Zoning codes live", val: metrics?.zoning?.codes_registered?.toString() || "37" },
    { lbl: "CA cities covered", val: metrics?.zoning?.cities_covered?.toString() || "7" },
    { lbl: "Cron runs (success)", val: metrics?.ops?.successful_cron_runs?.toString() || "—" },
    { lbl: "API calls",         val: metrics?.api?.calls_total?.toString() || "0" },
    { lbl: "CMHC metros anchored", val: "26" },
  ];
  tractionCells.forEach(c => {
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(BRASS);
    doc.text(c.val, rightX + colW, ty, { align: "right" });
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(SLATE);
    doc.text(c.lbl, rightX, ty);
    ty += 13;
  });
  y = Math.max(py, ty) + 12;

  // ── MOAT ─────────────────────────────────────────────────────────────────
  drawSectionRule(doc, "MOAT", M, y, W);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  const moat = "Dimensional zoning registry (37 codes × 7 cities) that took months to research + build. CMHC-anchored rent for 26 metros with government-published anchors. Four-strategy verdict engine running in-browser (no per-query server cost). our AI for institutional-grade deal memos. No competitor combines all four.";
  const moatLines = doc.splitTextToSize(moat, W - M * 2);
  moatLines.forEach(l => { doc.text(l, M, y); y += 11; });
  y += 8;

  // ── BUSINESS MODEL ───────────────────────────────────────────────────────
  drawSectionRule(doc, "MODEL", M, y, W);
  y += 18;
  const tierCells = [
    { name: "Free",  price: "$0",       features: "5 lookups/mo · full verdict" },
    { name: "Pro",   price: "$99/mo",   features: "Unlimited · save · PDF" },
    { name: "Scale", price: "$299/mo",  features: "White-label · API · LTL" },
  ];
  const tierW = (W - M * 2) / tierCells.length;
  tierCells.forEach((t, i) => {
    const x = M + i * tierW;
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(TEXT);
    doc.text(t.name, x, y);
    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.setTextColor(BRASS);
    doc.text(t.price, x, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(SLATE);
    doc.text(t.features, x, y + 26);
  });
  y += 40;

  // ── THE ASK ──────────────────────────────────────────────────────────────
  // Only render if ALL three fields are set. Previously would print
  // "$X pre-seed to reach $YK MRR in N months." (placeholders visible) when
  // any of the three was missing — investor-facing PDF should never ship
  // with placeholders.
  if (ask && ask.amount && ask.targetMRR && ask.months) {
    doc.setFillColor(245, 246, 249);
    doc.rect(M, y, W - M * 2, 40, "F");
    doc.setDrawColor(BRASS);
    doc.setLineWidth(0.5);
    doc.rect(M, y, W - M * 2, 40);
    doc.setFillColor(BRASS);
    doc.rect(M, y, 3, 40, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(BRASS);
    doc.text("▸ THE ASK", M + 10, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(TEXT);
    const askText = `${ask.amount} pre-seed to reach ${ask.targetMRR}K MRR in ${ask.months} months.`;
    doc.text(askText, M + 10, y + 30);
    y += 50;
  }

  // ── FOUNDER ──────────────────────────────────────────────────────────────
  drawSectionRule(doc, "FOUNDER", M, y, W);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  const bio = founderBio || "[TODO: Insert your 3-4 sentence founder bio. Prior roles, education, why you're the right founder for this market. Update in Pitch.jsx and regenerate.]";
  const bioLines = doc.splitTextToSize(bio, W - M * 2);
  bioLines.forEach(l => { doc.text(l, M, y); y += 11; });
  y += 4;

  // ── FOOTER CONTACT ───────────────────────────────────────────────────────
  const footerY = H - 32;
  doc.setDrawColor(220, 225, 230);
  doc.setLineWidth(0.4);
  doc.line(M, footerY - 12, W - M, footerY - 12);
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT);
  doc.text("sunni@rizedevelopments.com", M, footerY);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(SLATE);
  doc.text("realdealestate.app/pitch  ·  realdealestate.app/live", W / 2, footerY, { align: "center" });
  doc.text(`Prepared ${dateStr}`, W - M, footerY, { align: "right" });

  doc.save(`RizeAI-InvestorOnePager-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function drawSectionRule(doc, label, xStart, y, xEnd) {
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(BRASS);
  doc.text(`▸ ${label}`, xStart, y);
  const labelWidth = doc.getStringUnitWidth(`▸ ${label}`) * 8;
  doc.setDrawColor(BRASS);
  doc.setLineWidth(1.5);
  doc.line(xStart, y + 4, xStart + Math.min(48, labelWidth * 0.5), y + 4);
}
