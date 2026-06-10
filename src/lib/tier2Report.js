/**
 * Tier 2 IC Report — single branded PDF combining the deal summary, the
 * Monte Carlo risk distribution, the 5-year cash flow projection, and the
 * methodology / disclaimers. Designed as the deliverable a Scale-tier user
 * hands to their investment committee, LP, or lender.
 *
 * Uses jsPDF (already a dep via pdfExport.js / generatePDF.js).
 *
 * Build with: generateTier2Report({ deal, calc, monteCarloResults })
 * Returns a jsPDF instance; caller calls .save("realdeal-ic-report.pdf").
 */
import { jsPDF } from "jspdf";

const C = {
  bg:    "#ffffff",
  card:  "#f8fafc",
  text:  "#0f172a",
  sub:   "#475569",
  dim:   "#94a3b8",
  blue:  "#1e40af",
  green: "#16a34a",
  red:   "#dc2626",
  amber: "#d97706",
  purple: "#7c3aed",
};

const fmtMoney = n => n == null || isNaN(n) ? "—" : `$${Math.round(n).toLocaleString()}`;
const fmtMoneyK = n => {
  if (n == null || isNaN(n)) return "—";
  const v = Number(n);
  return v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M`
       : v >= 1000      ? `$${Math.round(v/1000)}K`
       : `$${Math.round(v)}`;
};
const fmtPct = n => n == null || isNaN(n) ? "—" : `${(n*100).toFixed(1)}%`;
const fmtX   = n => n == null || isNaN(n) ? "—" : `${n.toFixed(2)}x`;

// Build the PDF — accepts { deal, calc, monteCarloResults, presetName }
export function generateTier2Report({ deal = {}, calc = {}, monteCarloResults = null, presetName = "BASE", priors = {}, comps = [], memo = null }) {
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const today = new Date().toISOString().slice(0, 10);
  const hasComps = Array.isArray(comps) && comps.length > 0;
  const hasMemo  = !!(memo && (memo.executiveSummary || memo.oneLiner));
  const totalPages = 4 + (hasComps ? 1 : 0) + (hasMemo ? 1 : 0);

  // Header helper — drawn at top of every page after page 1
  function pageHeader(pageNum, totalPages) {
    doc.setFillColor(7, 9, 15);
    doc.rect(0, 0, W, 32, "F");
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.blue);
    doc.text("RIZE AI · IC REPORT", M, 20);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.dim);
    doc.text(deal.address || "Multifamily Deal", W/2, 20, { align: "center" });
    doc.text(`p. ${pageNum} / ${totalPages}`, W - M, 20, { align: "right" });
    doc.setDrawColor(C.dim).setLineWidth(0.4).line(M, 36, W - M, 36);
  }
  function pageFooter() {
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.dim);
    doc.text(`Generated ${today} · rizeai.co · Confidential — do not distribute without authorisation`, W/2, H - 24, { align: "center" });
  }
  // Subtle terminal-style grid in background
  function pageGrid() {
    doc.setDrawColor(220, 224, 232).setLineWidth(0.15);
    for (let x = M; x < W - M; x += 56) doc.line(x, 50, x, H - 40);
    for (let y = 60; y < H - 40; y += 56) doc.line(M, y, W - M, y);
  }

  // ──────────────────────────────────────────────────────────────────────
  // PAGE 1 — COVER
  // ──────────────────────────────────────────────────────────────────────
  doc.setFillColor(7, 9, 15);
  doc.rect(0, 0, W, H, "F");
  pageGrid();

  // Title block — top third
  doc.setFont("helvetica", "bold").setFontSize(40).setTextColor(C.text);
  doc.text("Investment", M, 120);
  doc.text("Committee Memo", M, 168);
  doc.setFont("helvetica", "normal").setFontSize(13).setTextColor(C.sub);
  doc.text("Institutional underwriting · RizeAI Tier 2", M, 196);

  // Deal name + address card — middle third
  const cardTop = 260;
  doc.setFillColor(13, 17, 25);
  doc.roundedRect(M, cardTop, W - M*2, 130, 4, 4, "F");
  doc.setDrawColor(C.green).setLineWidth(3).line(M, cardTop, M, cardTop + 130);

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.green);
  doc.text("▸ TARGET DEAL", M + 22, cardTop + 28);
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(C.text);
  doc.text(deal.address || "Multifamily property", M + 22, cardTop + 60, { maxWidth: W - M*2 - 44 });
  doc.setFont("helvetica", "normal").setFontSize(13).setTextColor(C.sub);
  doc.text(deal.propertyType || "Multifamily / Income Property", M + 22, cardTop + 86);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.blue);
  doc.text(`Strategy: 5-year hold · Cap-comp risk-adjusted return analysis`, M + 22, cardTop + 110);

  // Key metrics row — bottom third (4 tiles)
  const metricsTop = cardTop + 165;
  const tiles = [
    { lbl: "PURCHASE",    val: fmtMoneyK(deal.purchasePrice) },
    { lbl: "CAP RATE",    val: fmtPct(calc?.capRate || calc?.actualCap) },
    { lbl: "DSCR (Y1)",   val: fmtX(calc?.dscr || calc?.DSCR) },
    { lbl: "IRR (5-yr)",  val: fmtPct(calc?.irr) },
  ];
  const tileW = (W - M*2 - 30) / 4;
  tiles.forEach((t, i) => {
    const x = M + i * (tileW + 10);
    doc.setFillColor(13, 17, 25);
    doc.roundedRect(x, metricsTop, tileW, 80, 3, 3, "F");
    doc.setDrawColor(C.blue).setLineWidth(2).line(x, metricsTop, x, metricsTop + 80);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(C.dim);
    doc.text(t.lbl, x + 12, metricsTop + 22);
    doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(C.text);
    doc.text(t.val, x + 12, metricsTop + 56);
  });

  // Cover footer — date + URL + report ID
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.dim);
  doc.text(`Generated ${today}`, M, H - 80);
  doc.text(`rizeai.co`, M, H - 64);
  const reportId = `RD-${today.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  doc.text(`Report ID · ${reportId}`, W - M, H - 80, { align: "right" });
  doc.text(`CONFIDENTIAL — do not distribute without authorisation`, W - M, H - 64, { align: "right" });

  let pageNum = 1;

  // ──────────────────────────────────────────────────────────────────────
  // PAGE 2 (optional) — AI DEAL MEMO
  // Inserts only when the user has generated a memo. Sits before the risk
  // page because it's the narrative the LP / IC reads first.
  // ──────────────────────────────────────────────────────────────────────
  let y;
  if (hasMemo) {
    doc.addPage();
    doc.setFillColor(255, 255, 255).rect(0, 0, W, H, "F");
    pageNum++;
    pageHeader(pageNum, totalPages);
    y = 64;

    doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
    doc.text("Investment Memo", M, y); y += 26;

    // One-liner banner
    if (memo.oneLiner) {
      doc.setFillColor(241, 236, 255);
      doc.setDrawColor(C.purple).setLineWidth(2);
      const blockY = y;
      doc.rect(M, blockY, W - M*2, 38, "F");
      doc.line(M, blockY, M, blockY + 38);
      doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(C.text);
      const lines = doc.splitTextToSize(memo.oneLiner, W - M*2 - 24);
      doc.text(lines.slice(0, 2), M + 14, blockY + 18, { lineHeightFactor: 1.35 });
      y += 50;
    }

    // Executive summary
    if (memo.executiveSummary) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.blue);
      doc.text("EXECUTIVE SUMMARY", M, y); y += 14;
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
      const lines = doc.splitTextToSize(memo.executiveSummary, W - M*2);
      doc.text(lines, M, y, { lineHeightFactor: 1.55 });
      y += lines.length * 13 + 16;
    }

    // Investment thesis bullets
    if (Array.isArray(memo.investmentThesis) && memo.investmentThesis.length) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.green);
      doc.text("INVESTMENT THESIS", M, y); y += 14;
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
      memo.investmentThesis.forEach(b => {
        const lines = doc.splitTextToSize(`• ${b}`, W - M*2 - 12);
        doc.text(lines, M + 6, y, { lineHeightFactor: 1.45 });
        y += lines.length * 12 + 4;
      });
      y += 10;
    }

    // Key risks bullets
    if (Array.isArray(memo.keyRisks) && memo.keyRisks.length) {
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.red);
      doc.text("KEY RISKS", M, y); y += 14;
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
      memo.keyRisks.forEach(b => {
        const lines = doc.splitTextToSize(`• ${b}`, W - M*2 - 12);
        doc.text(lines, M + 6, y, { lineHeightFactor: 1.45 });
        y += lines.length * 12 + 4;
      });
      y += 10;
    }

    // Recommendation box
    if (memo.recommendation) {
      const recY = y;
      doc.setFillColor(232, 250, 240);
      doc.rect(M, recY, W - M*2, 56, "F");
      doc.setDrawColor(C.green).setLineWidth(3);
      doc.line(M, recY, M, recY + 56);
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.green);
      doc.text("RECOMMENDATION", M + 14, recY + 16);
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.text);
      const recLines = doc.splitTextToSize(memo.recommendation, W - M*2 - 24);
      doc.text(recLines, M + 14, recY + 32, { lineHeightFactor: 1.4 });
    }

    pageFooter();
  }

  // ──────────────────────────────────────────────────────────────────────
  // PAGE — RISK SIMULATION (page 2 without memo, page 3 with memo)
  // ──────────────────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255).rect(0, 0, W, H, "F");
  pageNum++;
  pageHeader(pageNum, totalPages);
  y = 64;

  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
  doc.text("Risk Analysis · Monte Carlo", M, y); y += 26;
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.sub);
  doc.text(`1,000 simulations · ${presetName} priors`, M, y); y += 18;

  if (monteCarloResults) {
    const r = monteCarloResults;
    // P10/P50/P90 table
    const tableTop = y + 12;
    const rows = [
      ["Metric", "P10 · DOWNSIDE", "P50 · MEDIAN", "P90 · UPSIDE"],
      ["IRR (5-yr)",        fmtPct(r.irr.p10),     fmtPct(r.irr.p50),     fmtPct(r.irr.p90)],
      ["Equity Multiple",   fmtX(r.eqMult.p10),    fmtX(r.eqMult.p50),    fmtX(r.eqMult.p90)],
      ["Min DSCR (hold)",   fmtX(r.minDSCR.p10),   fmtX(r.minDSCR.p50),   fmtX(r.minDSCR.p90)],
    ];
    const colW = [(W - M*2) * 0.32, (W - M*2) * 0.22, (W - M*2) * 0.22, (W - M*2) * 0.24];
    let cy = tableTop;
    rows.forEach((row, i) => {
      const isHeader = i === 0;
      doc.setFillColor(isHeader ? 13 : 250, isHeader ? 17 : 250, isHeader ? 25 : 252);
      doc.rect(M, cy, W - M*2, 24, "F");
      doc.setFont("helvetica", "bold").setFontSize(isHeader ? 9 : 11);
      doc.setTextColor(isHeader ? C.dim : C.text);
      let cx = M + 12;
      row.forEach((cell, j) => {
        doc.text(String(cell), cx, cy + 16);
        cx += colW[j];
      });
      cy += 24;
    });
    y = cy + 24;

    // Probability bars
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.dim);
    doc.text("PROBABILITY OF OUTCOME", M, y); y += 14;
    const bars = [
      { lbl: "Positive IRR",                p: r.probabilities.positiveIRR,    good: 0.95 },
      { lbl: "DSCR ≥ 1.25 throughout",      p: r.probabilities.meetsDSCR125,   good: 0.90 },
      { lbl: `IRR ≥ ${fmtPct(0.15)} target`,p: r.probabilities.meetsIRRTarget, good: 0.70 },
    ];
    bars.forEach(b => {
      const barW = W - M*2 - 220;
      const x = M + 200;
      doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.text);
      doc.text(b.lbl, M, y + 12);
      doc.setFillColor(235, 238, 245);
      doc.rect(x, y + 4, barW, 12, "F");
      const pct = Math.max(0, Math.min(1, b.p));
      const color = pct >= b.good ? [52, 217, 138] : pct >= b.good * 0.7 ? [240, 160, 48] : [242, 92, 92];
      doc.setFillColor(...color);
      doc.rect(x, y + 4, barW * pct, 12, "F");
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...color);
      doc.text(`${Math.round(pct * 100)}%`, x + barW + 8, y + 14);
      y += 24;
    });

    // IRR histogram — pure JSON-data render
    y += 12;
    const histH = 120;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.dim);
    doc.text(`IRR DISTRIBUTION · ${r.distributions.irr.length} sims`, M, y);
    y += 8;
    const vals = r.distributions.irr;
    if (vals.length) {
      const min = vals[0], max = vals[vals.length - 1];
      const N = 30;
      const w = (max - min) / N || 1;
      const bins = new Array(N).fill(0);
      vals.forEach(v => {
        const i = Math.min(N - 1, Math.max(0, Math.floor((v - min) / w)));
        bins[i]++;
      });
      const maxCount = Math.max(...bins);
      const histW = W - M*2;
      const bw = histW / N;
      bins.forEach((count, i) => {
        const h = (count / maxCount) * histH;
        const x0 = min + i * w;
        const x1 = min + (i + 1) * w;
        const isNeg = x1 <= 0;
        const isAbove = x0 >= 0.15;
        const c = isNeg ? [242, 92, 92] : isAbove ? [52, 217, 138] : [167, 130, 255];
        doc.setFillColor(...c);
        doc.rect(M + i * bw, y + (histH - h) + 8, bw - 1, h, "F");
      });
      // X-axis labels
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.dim);
      doc.text(fmtPct(min), M, y + histH + 24);
      doc.text(fmtPct(max), W - M, y + histH + 24, { align: "right" });
      doc.text(`Median: ${fmtPct(r.irr.p50)}`, W/2, y + histH + 24, { align: "center" });
      y += histH + 36;
    }
  } else {
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.dim);
    doc.text("Run the Risk Simulator before exporting to populate this section.", M, y + 30);
  }

  pageFooter();

  // ──────────────────────────────────────────────────────────────────────
  // PAGE 3 — CASH FLOW PROJECTION
  // ──────────────────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255).rect(0, 0, W, H, "F");
  pageNum++;
  pageHeader(pageNum, totalPages);
  y = 64;

  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
  doc.text("Cash Flow & Returns", M, y); y += 26;
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.sub);
  doc.text("5-year hold · Year-by-year operating projection", M, y); y += 24;

  // Income statement summary
  const incomeRows = [
    ["Line Item", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
    ["Gross Potential Rent (GPR)",   fmtMoney(calc?.GPR), "—", "—", "—", "—"],
    ["Less: Vacancy & Credit Loss",  fmtMoney(calc?.vacancyLoss), "—", "—", "—", "—"],
    ["Effective Gross Income (EGI)", fmtMoney(calc?.EGI), "—", "—", "—", "—"],
    ["Operating Expenses",           fmtMoney(calc?.totalOpex), "—", "—", "—", "—"],
    ["Net Operating Income (NOI)",   fmtMoney(calc?.NOI), "—", "—", "—", "—"],
    ["Debt Service",                 fmtMoney(calc?.ADS), "—", "—", "—", "—"],
    ["Before-Tax Cash Flow (BTCF)",  fmtMoney(calc?.BTCF), "—", "—", "—", "—"],
  ];
  const ccolW = [(W - M*2) * 0.36, (W - M*2) * 0.128, (W - M*2) * 0.128, (W - M*2) * 0.128, (W - M*2) * 0.128, (W - M*2) * 0.128];
  let cy = y;
  incomeRows.forEach((row, i) => {
    const isHeader = i === 0;
    const isTotal  = /NOI|BTCF/.test(row[0]);
    doc.setFillColor(isHeader ? 13 : isTotal ? 245 : 250, isHeader ? 17 : isTotal ? 248 : 250, isHeader ? 25 : isTotal ? 252 : 252);
    doc.rect(M, cy, W - M*2, 22, "F");
    doc.setFont("helvetica", isHeader || isTotal ? "bold" : "normal").setFontSize(isHeader ? 9 : 10);
    doc.setTextColor(isHeader ? C.dim : isTotal ? C.blue : C.text);
    let cx = M + 10;
    row.forEach((cell, j) => {
      const align = j === 0 ? "left" : "right";
      doc.text(String(cell), align === "right" ? cx + ccolW[j] - 10 : cx, cy + 15, { align });
      cx += ccolW[j];
    });
    cy += 22;
  });
  y = cy + 24;

  // Returns metrics summary
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.dim);
  doc.text("RETURNS SUMMARY", M, y); y += 16;
  const returnsTiles = [
    { lbl: "5-Yr IRR",          val: fmtPct(calc?.irr),         c: C.green },
    { lbl: "Equity Multiple",   val: fmtX(calc?.eqMultiple),    c: C.blue },
    { lbl: "Cash-on-Cash (Y1)", val: fmtPct(calc?.CoC),         c: C.text },
    { lbl: "Cap Rate (Entry)",  val: fmtPct(calc?.capRate),     c: C.text },
  ];
  const rtW = (W - M*2 - 30) / 4;
  returnsTiles.forEach((t, i) => {
    const x = M + i * (rtW + 10);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, rtW, 64, 3, 3, "F");
    doc.setDrawColor(t.c).setLineWidth(2).line(x, y, x, y + 64);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(C.dim);
    doc.text(t.lbl, x + 10, y + 18);
    doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(C.text);
    doc.text(t.val, x + 10, y + 48);
  });

  pageFooter();

  // ──────────────────────────────────────────────────────────────────────
  // PAGE 4 — COMPARABLE SALES (only when the user has comps in the matrix)
  // ──────────────────────────────────────────────────────────────────────
  if (hasComps) {
    doc.addPage();
    doc.setFillColor(255, 255, 255).rect(0, 0, W, H, "F");
    pageNum++;
    pageHeader(pageNum, totalPages);
    y = 64;

    doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
    doc.text("Comparable Sales", M, y); y += 8;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.sub);
    doc.text(`${comps.length} comp${comps.length === 1 ? "" : "s"} · normalised against target`, M, y + 14);
    y += 36;

    // Table column setup. Address gets more room than the numeric columns.
    const cols = [
      { label: "Address",   width: 156, get: c => c.address || "—" },
      { label: "Price",     width: 64,  get: c => fmtMoneyK(c.price), align: "right" },
      { label: "Sqft",      width: 50,  get: c => c.sqft ? Number(c.sqft).toLocaleString() : "—", align: "right" },
      { label: "$/Sqft",    width: 50,  get: c => (c.price && c.sqft) ? `$${Math.round(c.price/c.sqft)}` : "—", align: "right" },
      { label: "Units",     width: 38,  get: c => c.units ?? "—", align: "right" },
      { label: "$/Unit",    width: 60,  get: c => (c.price && c.units) ? fmtMoneyK(c.price/c.units) : "—", align: "right" },
      { label: "Cap",       width: 48,  get: c => fmtPct(c.capRate), align: "right" },
      { label: "Distance",  width: 50,  get: c => c.distanceKm != null ? `${Number(c.distanceKm).toFixed(1)}km` : "—", align: "right" },
    ];

    // Header row
    let x = M;
    doc.setFillColor(13, 17, 25);
    doc.rect(M, y, cols.reduce((s, c) => s + c.width, 0), 22, "F");
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(C.blue);
    for (const col of cols) {
      const opts = col.align === "right" ? { align: "right" } : {};
      const tx = col.align === "right" ? x + col.width - 6 : x + 8;
      doc.text(col.label.toUpperCase(), tx, y + 14, opts);
      x += col.width;
    }
    y += 22;

    // Target row first (highlighted), then each comp
    const allRows = [{ label: "TARGET", deal, isTarget: true, color: C.green }];
    comps.forEach((c, i) => allRows.push({ label: `COMP ${i+1}`, deal: c, color: C.text }));

    doc.setFont("helvetica", "normal").setFontSize(9);
    for (const row of allRows) {
      // Row background for target
      if (row.isTarget) {
        doc.setFillColor(232, 250, 240).rect(M, y, cols.reduce((s, c) => s + c.width, 0), 22, "F");
        doc.setDrawColor(C.green).setLineWidth(2).line(M, y, M, y + 22);
      }
      x = M;
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        let value = String(col.get(row.deal) ?? "—");
        // Address column shows the row label (TARGET / COMP n) as prefix
        if (i === 0) {
          doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(row.color);
          doc.text(row.label, x + 8, y + 9);
          doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.text);
          // Truncate addresses that would overflow
          if (value.length > 28) value = value.slice(0, 26) + "…";
          doc.text(value, x + 8, y + 18);
        } else {
          doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.text);
          const opts = col.align === "right" ? { align: "right" } : {};
          const tx = col.align === "right" ? x + col.width - 6 : x + 8;
          doc.text(value, tx, y + 14, opts);
        }
        x += col.width;
      }
      // Subtle row separator
      doc.setDrawColor(220, 224, 232).setLineWidth(0.4);
      doc.line(M, y + 22, M + cols.reduce((s, c) => s + c.width, 0), y + 22);
      y += 22;
      // Don't run off the page
      if (y > H - 100) break;
    }

    // Average row (comps only — never the target)
    const numericMean = (key, derive) => {
      const vs = comps.map(c => derive ? derive(c) : Number(c[key])).filter(v => Number.isFinite(v));
      return vs.length ? vs.reduce((s, x) => s + x, 0) / vs.length : null;
    };
    const avgPrice  = numericMean("price");
    const avgSqft   = numericMean("sqft");
    const avgPsf    = numericMean(null, c => (c.price && c.sqft) ? c.price / c.sqft : null);
    const avgUnits  = numericMean("units");
    const avgPpu    = numericMean(null, c => (c.price && c.units) ? c.price / c.units : null);
    const avgCap    = numericMean("capRate");

    y += 4;
    doc.setFillColor(245, 247, 250).rect(M, y, cols.reduce((s, c) => s + c.width, 0), 22, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(C.blue);
    const avgValues = [
      "COMP AVERAGE", fmtMoneyK(avgPrice),
      avgSqft ? Math.round(avgSqft).toLocaleString() : "—",
      avgPsf ? `$${Math.round(avgPsf)}` : "—",
      avgUnits ? Math.round(avgUnits).toLocaleString() : "—",
      fmtMoneyK(avgPpu), fmtPct(avgCap), "—",
    ];
    x = M;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const opts = col.align === "right" ? { align: "right" } : {};
      const tx = col.align === "right" ? x + col.width - 6 : x + 8;
      doc.text(avgValues[i], tx, y + 14, opts);
      x += col.width;
    }
    y += 36;

    // Brief interpretive line below the table
    doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(C.sub);
    if (avgPsf && deal.purchasePrice && calc?.sqft) {
      const targetPsf = deal.purchasePrice / calc.sqft;
      const delta = ((targetPsf - avgPsf) / avgPsf) * 100;
      doc.text(`Target priced at ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs comp average on $/sqft basis.`, M, y);
      y += 16;
    }
    if (avgCap && calc?.capRate) {
      const delta = (calc.capRate - avgCap) * 10000; // bps
      doc.text(`Target cap rate is ${delta >= 0 ? "+" : ""}${Math.round(delta)} bps vs comp average.`, M, y);
    }

    pageFooter();
  }

  // ──────────────────────────────────────────────────────────────────────
  // PAGE 5 (or 4 if no comps) — METHODOLOGY + DISCLAIMERS
  // ──────────────────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(255, 255, 255).rect(0, 0, W, H, "F");
  pageNum++;
  pageHeader(pageNum, totalPages);
  y = 64;

  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(C.text);
  doc.text("Methodology & Disclaimers", M, y); y += 26;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(C.blue);
  doc.text("Risk Simulation", M, y); y += 16;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
  doc.text([
    "1,000 independent randomised scenarios. Each scenario samples six stochastic inputs from",
    "institutionally-typical distributions: rent growth (normal), exit cap rate (normal, with cap",
    "expansion), vacancy (normal), interest-rate shock (normal), OpEx growth (normal), and",
    "construction overrun (log-normal). Each scenario runs a simplified 5-year cash-flow model,",
    "computes IRR (Newton-Raphson), equity multiple, and minimum DSCR across the hold. Results",
    "are sorted; reported percentiles are P10 (downside), P50 (median), and P90 (upside).",
  ].join("\n"), M, y, { lineHeightFactor: 1.45 });
  y += 100;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(C.blue);
  doc.text("Active Priors (μ ± σ)", M, y); y += 14;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.text);
  const priorLines = [
    `Rent growth:        ${(priors.rentGrowthMean ?? 3.0).toFixed(1)} ± ${(priors.rentGrowthSigma ?? 1.0).toFixed(1)}% / yr`,
    `Vacancy:            ${(priors.vacancyMean ?? 7.0).toFixed(1)} ± ${(priors.vacancySigma ?? 2.0).toFixed(1)}%`,
    `Rate shock:         ${(priors.rateShockMean ?? 0.0).toFixed(2)} ± ${(priors.rateShockSigma ?? 0.75).toFixed(2)}% / yr`,
    `OpEx growth:        ${(priors.opexGrowthMean ?? 2.0).toFixed(1)} ± ${(priors.opexGrowthSigma ?? 0.5).toFixed(1)}% / yr`,
    `Exit cap σ:         ± ${(priors.exitCapSigma ?? 0.5).toFixed(2)}% (centred entry + 25 bps)`,
    `Construction:       median ${(priors.constructionMedian ?? 1.0).toFixed(2)}x · log-σ ${(priors.constructionSigma ?? 0.15).toFixed(2)}`,
  ];
  priorLines.forEach(l => { doc.text(l, M + 12, y); y += 14; });
  y += 18;

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(C.red);
  doc.text("Disclaimers", M, y); y += 16;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.sub);
  doc.text([
    "This report is generated from user-supplied inputs and is not investment advice. Returns",
    "are estimates based on the listed assumptions and a simplified cash-flow model; actual",
    "performance depends on operations, financing, market conditions, tax treatment, and other",
    "factors not captured here. Verify all inputs and consult licensed advisors before",
    "committing capital. RizeAI does not guarantee accuracy or completeness; users are",
    "solely responsible for their underwriting decisions. CONFIDENTIAL — do not distribute",
    "without authorisation.",
  ].join("\n"), M, y, { lineHeightFactor: 1.55 });

  pageFooter();

  return doc;
}
