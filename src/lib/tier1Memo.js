/**
 * Tier 1 Investor Memo — single-page branded PDF a residential investor
 * hands to a private lender or JV partner. Mirrors tier2Report.js styling
 * (purple/green/blue palette, terminal-style typography, sharp 4px corners)
 * at a much tighter 1-page scope.
 *
 * Replaces three earlier ad-hoc generators (pdfExport.js exportFlipPDF /
 * exportBRRRRPDF, generatePDF.js generateFlipPDF) that all had different
 * fonts, colors, and information density.
 *
 * Usage:
 *   generateTier1Memo({ type, deal, summary }).save('investor-memo.pdf')
 *
 *   type    — "flip" | "brrrr" | "rental"
 *   deal    — { address, purchasePrice, repairCost?, arv?, monthlyRent?,
 *               yearBuilt?, beds?, baths?, sqft? }
 *   summary — { tiles: [{label, value, color?}, ...], rows: [{label, value}, ...],
 *               verdict?, notes? }
 *
 * Caller supplies the calculated tiles + rows. tier1Memo only formats. This
 * keeps the underwriting math in the calculator components where it belongs
 * and avoids duplicating it inside a PDF library.
 */
import { jsPDF } from "jspdf";

const C = {
  bg:    "#07090f",
  card:  "#0d1119",
  text:  "#dde4ef",
  sub:   "#6b7d96",
  dim:   "#3a4a60",
  blue:  "#3b9eff",
  green: "#34d98a",
  red:   "#f25c5c",
  amber: "#f0a030",
  purple: "#a782ff",
};

const fmtMoney = n => n == null || isNaN(n) ? "—" : `$${Math.round(n).toLocaleString()}`;
const fmtMoneyK = n => {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M`
       : v >= 1000      ? `$${Math.round(v/1000)}K`
       : `$${Math.round(v)}`;
};
const fmtPct = n => n == null || isNaN(n) ? "—" : `${(Number(n)*100).toFixed(1)}%`;

const TYPE_LABEL = {
  flip:   "Fix & Flip Underwriting",
  brrrr:  "BRRRR Underwriting",
  rental: "Buy & Hold Underwriting",
};

const TYPE_ACCENT = {
  flip:   C.amber,
  brrrr:  C.green,
  rental: C.blue,
};

export function generateTier1Memo({ type = "rental", deal = {}, summary = {} }) {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const today = new Date().toISOString().slice(0, 10);
  const reportId = `RD-${today.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const accent = TYPE_ACCENT[type] || C.blue;

  // ── Header bar ───────────────────────────────────────────────────────────
  // Sharp 4px-cornered top band: "RIZE AI · INVESTOR MEMO" on the left,
  // deal type pill on the right.
  doc.setFillColor(7, 9, 15);
  doc.rect(0, 0, W, 56, "F");
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(C.blue);
  doc.text("RIZE AI", M, 26);
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.dim);
  doc.text("·", M + 64, 26);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.text);
  doc.text("INVESTOR MEMO", M + 74, 26);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.sub);
  doc.text(today, M, 42);

  // Type pill — right side
  const pillLabel = (TYPE_LABEL[type] || "Underwriting").toUpperCase();
  const pillW = doc.getTextWidth(pillLabel) + 28;
  doc.setFillColor(accent);
  doc.rect(W - M - pillW, 16, pillW, 26, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor("#07090f");
  doc.text(pillLabel, W - M - pillW + 14, 33);

  // ── Deal block ───────────────────────────────────────────────────────────
  let y = 92;
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(C.text);
  const addr = deal.address || "Untitled Property";
  // Wrap long addresses onto 2 lines if needed
  const addrLines = doc.splitTextToSize(addr, W - M*2);
  doc.text(addrLines.slice(0, 2), M, y);
  y += addrLines.length === 1 ? 28 : 56;

  // Sub-line: type + key facts
  const facts = [];
  if (deal.beds != null)       facts.push(`${deal.beds} BD`);
  if (deal.baths != null)      facts.push(`${deal.baths} BA`);
  if (deal.sqft)               facts.push(`${Number(deal.sqft).toLocaleString()} sqft`);
  if (deal.yearBuilt)          facts.push(`Built ${deal.yearBuilt}`);
  if (deal.purchasePrice)      facts.push(`Purchase ${fmtMoneyK(deal.purchasePrice)}`);
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.sub);
  doc.text(facts.join("  ·  ") || "—", M, y);
  y += 28;

  // Accent rule
  doc.setDrawColor(accent).setLineWidth(2);
  doc.line(M, y, M + 64, y);
  y += 18;

  // ── Metric tiles ─────────────────────────────────────────────────────────
  // Up to 4 tiles in a row. Each tile is 124pt wide with 12pt gutters.
  const tiles = (summary.tiles || []).slice(0, 4);
  if (tiles.length) {
    const tileW = (W - M*2 - 12 * (tiles.length - 1)) / tiles.length;
    const tileH = 72;
    tiles.forEach((t, i) => {
      const x = M + i * (tileW + 12);
      doc.setFillColor(245, 247, 250);
      doc.rect(x, y, tileW, tileH, "F");
      doc.setDrawColor(t.color || accent).setLineWidth(2.5);
      doc.line(x, y, x, y + tileH);
      doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(C.dim);
      doc.text((t.label || "").toUpperCase(), x + 12, y + 16);
      doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
      doc.text(String(t.value ?? "—"), x + 12, y + 44);
      if (t.sub) {
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.sub);
        doc.text(String(t.sub), x + 12, y + 60);
      }
    });
    y += tileH + 22;
  }

  // ── Underwriting rows ────────────────────────────────────────────────────
  // Two-column key/value rows. Numeric rows right-aligned; emphasised rows
  // (NOI / Cash Flow / Profit / Margin) get a slim accent bar to the left.
  const rows = summary.rows || [];
  if (rows.length) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(accent);
    doc.text("UNDERWRITING", M, y); y += 14;
    doc.setDrawColor(C.dim).setLineWidth(0.4);
    doc.line(M, y, W - M, y);
    y += 6;

    const labelX = M;
    const valX = W - M;
    doc.setFontSize(11);
    for (const row of rows) {
      if (y > H - 90) break;  // single-page guard

      // Section break ─ a row with `break: true` and no value
      if (row.break) {
        y += 4;
        doc.setDrawColor(C.dim).setLineWidth(0.3);
        doc.line(M, y, W - M, y);
        y += 8;
        continue;
      }
      if (row.emphasis) {
        doc.setFillColor(247, 250, 247);
        doc.rect(M - 4, y - 10, W - M*2 + 8, 18, "F");
        doc.setDrawColor(C.green).setLineWidth(2);
        doc.line(M - 4, y - 10, M - 4, y + 8);
      }
      doc.setFont("helvetica", row.emphasis ? "bold" : "normal").setTextColor(C.text);
      doc.text(row.label || "", labelX, y);
      doc.setFont("helvetica", "bold").setTextColor(row.color || C.text);
      doc.text(String(row.value ?? "—"), valX, y, { align: "right" });
      y += row.emphasis ? 22 : 16;
    }
  }

  // ── Verdict / notes block ────────────────────────────────────────────────
  if (summary.verdict || summary.notes) {
    y += 10;
    if (y > H - 100) y = H - 100;
    const blockH = summary.notes ? 56 : 36;
    doc.setFillColor(245, 247, 250);
    doc.rect(M, y, W - M*2, blockH, "F");
    doc.setDrawColor(accent).setLineWidth(3);
    doc.line(M, y, M, y + blockH);

    if (summary.verdict) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(accent);
      doc.text("VERDICT", M + 14, y + 16);
      doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(C.text);
      doc.text(String(summary.verdict), M + 14, y + 34);
    }
    if (summary.notes) {
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.sub);
      const noteY = summary.verdict ? y + 48 : y + 24;
      const lines = doc.splitTextToSize(summary.notes, W - M*2 - 24);
      doc.text(lines.slice(0, 2), M + 14, noteY, { lineHeightFactor: 1.35 });
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.dim);
  doc.text(`Generated ${today} · rizeai.co · Report ID ${reportId}`, W/2, H - 32, { align: "center" });
  doc.text("Estimates only. Not financial advice. Verify all assumptions before committing capital.", W/2, H - 20, { align: "center" });

  return doc;
}
