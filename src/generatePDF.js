import jsPDF from 'jspdf';

// ─── Formatters ──────────────────────────────────────────────────────────────
const num = v => parseFloat(v) || 0;
const fmtCAD = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = n => isNaN(n) || !isFinite(n) ? '—' : `${(n * 100).toFixed(1)}%`;
const fmtX = n => isNaN(n) || !isFinite(n) ? '—' : `${n.toFixed(2)}x`;

// ─── Brand colors (match app CSS variables exactly) ──────────────────────────
const BLU  = [59,  158, 255];   // --blue
const GRN  = [52,  217, 138];   // --green
const RED  = [242, 92,  92 ];   // --red
const AMB  = [240, 160, 48 ];   // --amber
const DARK = [20,  26,  42 ];   // near --bg but readable on white
const GRAY = [100, 115, 140];   // --sub
const LGRY = [242, 245, 250];   // light card bg
const MGRY = [210, 216, 228];   // mid-gray for rules
const WHT  = [255, 255, 255];
const WMK  = [220, 226, 238];   // watermark color — very light blue-gray

// ─── Score → color ───────────────────────────────────────────────────────────
function scoreColor(score) {
  return score >= 80 ? GRN : score >= 65 ? BLU : score >= 48 ? AMB : RED;
}

// ─── Diagonal watermark stamped on the current page ──────────────────────────
function watermark(doc, PW, PH) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(46);
  doc.setTextColor(...WMK);
  // angle is counterclockwise; 45° gives bottom-left → top-right diagonal
  doc.text('realdealestate.app', PW / 2, PH / 2, { align: 'center', angle: 45 });
  // second pass offset for denser feel
  doc.setFontSize(30);
  doc.text('realdealestate.app', PW / 2 - 28, PH / 2 + 55, { align: 'center', angle: 45 });
  doc.text('realdealestate.app', PW / 2 + 28, PH / 2 - 55, { align: 'center', angle: 45 });
}

// ─── Page header (blue bar) ───────────────────────────────────────────────────
function pageHeader(doc, PW, MR, ML, dateStr, subtitle) {
  doc.setFillColor(...BLU);
  doc.rect(0, 0, PW, 17, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHT);
  doc.text('REAL DEAL', ML, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHT);
  doc.text(subtitle, ML + 34, 11);
  doc.text(dateStr, PW - MR, 8, { align: 'right' });
  doc.text('realdealestate.app', PW - MR, 13.5, { align: 'right' });
}

// ─── Page footer ─────────────────────────────────────────────────────────────
function pageFooter(doc, PH, ML, PW, MR, dateStr) {
  doc.setDrawColor(...MGRY);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 11, PW - MR, PH - 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text('© realdealestate.app — Confidential Deal Analysis', ML, PH - 6);
  doc.text(`Generated ${dateStr}`, PW - MR, PH - 6, { align: 'right' });
}

// ─── Horizontal rule ─────────────────────────────────────────────────────────
function hline(doc, y, ML, PW, MR) {
  doc.setDrawColor(...MGRY);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  // reset draw state
  doc.setDrawColor(...MGRY);
}

// ─── Section title label ─────────────────────────────────────────────────────
function sectionTitle(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(text.toUpperCase(), x, y);
}

// ─── Metric tile (label + large value) ───────────────────────────────────────
function metricBox(doc, x, y, w, h, label, value, valueColor) {
  doc.setFillColor(...LGRY);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text(label.toUpperCase(), x + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...(valueColor || DARK));
  doc.text(value, x + 3, y + 11);
}

// ─── New page helper (header + watermark) ────────────────────────────────────
function newPage(doc, PW, PH, MR, ML, dateStr, subtitle) {
  doc.addPage();
  watermark(doc, PW, PH);
  pageHeader(doc, PW, MR, ML, dateStr, subtitle);
  return 25; // y start
}


// ═══════════════════════════════════════════════════════════════════════════════
// FLIP DEAL PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function generateFlipPDF({ form, arv, rent, deal }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 15, MR = 15;
  const CW = PW - ML - MR;
  const sc = scoreColor(deal.score);
  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  const SUBTITLE = 'Flip Analysis Report';

  // Watermark first (so content renders on top)
  watermark(doc, PW, PH);
  pageHeader(doc, PW, MR, ML, dateStr, SUBTITLE);

  let y = 25;

  // ── Address ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(form.address || 'Property Analysis', ML, y);
  y += 5;

  const propMeta = [
    form.beds && form.baths ? `${form.beds} bed / ${form.baths} bath` : null,
    num(form.sqft) ? `${num(form.sqft).toLocaleString()} sqft` : null,
    'Residential Flip',
  ].filter(Boolean).join('  ·  ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(propMeta, ML, y);
  y += 7;

  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Score strip ──
  // Score box (right side)
  const SBW = 34, SBH = 23, SBX = PW - MR - SBW;
  doc.setFillColor(...LGRY);
  doc.roundedRect(SBX, y - 2, SBW, SBH, 2.5, 2.5, 'F');
  doc.setFillColor(...sc);
  doc.roundedRect(SBX, y - 2, SBW, 7.5, 2.5, 2.5, 'F');
  doc.rect(SBX, y + 3, SBW, 2.5, 'F'); // square off rounded bottom of top bar

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHT);
  doc.text('DEAL SCORE', SBX + SBW / 2, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(String(deal.score), SBX + SBW / 2, y + 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(`Grade ${deal.grade}`, SBX + SBW / 2, y + 20, { align: 'center' });

  // Verdict (left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(deal.verdict, ML, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Profit: ${fmtCAD(deal.profit)}  ·  Margin: ${fmtPct(deal.margin)}  ·  All-In: ${fmtCAD(deal.allIn)}`,
    ML, y + 15
  );

  y += 28;
  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Key metrics 2×4 grid ──
  sectionTitle(doc, 'Key Numbers', ML, y);
  y += 5;

  const cellW = (CW - 3) / 2;
  const cellH = 13;

  const profitColor = deal.profit >= 40000 ? GRN : deal.profit < 0 ? RED : AMB;
  const marginColor = deal.margin >= 0.20 ? GRN : deal.margin < 0 ? RED : null;
  const yieldColor = rent.grossYield >= 0.07 ? GRN : null;

  const grid = [
    ['Purchase Price',     fmtCAD(num(form.purchasePrice)), null,        'Repair / Reno Cost',    fmtCAD(num(form.repairCost)),  null      ],
    ['All-In Cost',        fmtCAD(deal.allIn),              null,        'ARV — Mid Estimate',    fmtCAD(arv.mid),               BLU       ],
    ['Net Profit',         fmtCAD(deal.profit),             profitColor, 'Profit Margin',         fmtPct(deal.margin),           marginColor],
    ['Est. Monthly Rent',  fmtCAD(rent.mid) + '/mo',        null,        'Gross Yield',           fmtPct(rent.grossYield),       yieldColor ],
  ];

  grid.forEach(([l1, v1, c1, l2, v2, c2]) => {
    metricBox(doc, ML,              y, cellW, cellH, l1, v1, c1);
    metricBox(doc, ML + cellW + 3,  y, cellW, cellH, l2, v2, c2);
    y += cellH + 2.5;
  });

  y += 3;
  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── ARV Range ──
  sectionTitle(doc, 'ARV Estimate Range', ML, y);
  y += 4;

  doc.setFillColor(...LGRY);
  doc.roundedRect(ML, y, CW, 13, 2, 2, 'F');

  const arvW = CW / 3;
  [['Conservative', fmtCAD(arv.low), GRAY], ['Most Likely', fmtCAD(arv.mid), BLU], ['Optimistic', fmtCAD(arv.high), GRAY]]
    .forEach(([lbl, val, col], i) => {
      const ax = ML + i * arvW + arvW / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(lbl.toUpperCase(), ax, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(col[0], col[1], col[2]);
      doc.text(val, ax, y + 10.5, { align: 'center' });
    });

  y += 18;
  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Rent Range ──
  sectionTitle(doc, 'Rental Estimate', ML, y);
  y += 4;

  doc.setFillColor(...LGRY);
  doc.roundedRect(ML, y, CW, 13, 2, 2, 'F');

  [['Low', fmtCAD(rent.low) + '/mo', GRAY], ['Market Rate', fmtCAD(rent.mid) + '/mo', GRN], ['High', fmtCAD(rent.high) + '/mo', GRAY]]
    .forEach(([lbl, val, col], i) => {
      const rw = CW / 3;
      const rx = ML + i * rw + rw / 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(lbl.toUpperCase(), rx, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(col[0], col[1], col[2]);
      doc.text(val, rx, y + 10.5, { align: 'center' });
    });

  y += 18;
  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Deal Scorecard ──
  sectionTitle(doc, 'Deal Scorecard', ML, y);
  y += 5;

  deal.reasons.forEach(r => {
    if (y > PH - 18) {
      pageFooter(doc, PH, ML, PW, MR, dateStr);
      y = newPage(doc, PW, PH, MR, ML, dateStr, SUBTITLE);
    }
    const dc = r.type === 'pass' ? GRN : r.type === 'warn' ? AMB : RED;
    doc.setFillColor(...dc);
    doc.circle(ML + 1.5, y - 0.8, 1.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(r.text, CW - 7);
    doc.text(lines, ML + 5, y);
    y += lines.length * 4.2 + 2.5;
  });

  pageFooter(doc, PH, ML, PW, MR, dateStr);

  const fname = (form.address || 'deal').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  doc.save(`${fname}-flip.pdf`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// COMMERCIAL DEAL PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function generateCommercialPDF({ form, calc, deal, units }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, ML = 15, MR = 15;
  const CW = PW - ML - MR;
  const sc = scoreColor(deal.score);
  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  const SUBTITLE = 'Commercial Analysis Report';

  watermark(doc, PW, PH);
  pageHeader(doc, PW, MR, ML, dateStr, SUBTITLE);

  let y = 25;

  // ── Address ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text(form.address || 'Multi-Family Analysis', ML, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Multi-Family  ·  ${calc.totalUnits} units  ·  ${fmtCAD(calc.grossMonthlyRent)}/mo gross rent`, ML, y);
  y += 7;

  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Score strip ──
  const SBW = 34, SBH = 23, SBX = PW - MR - SBW;
  doc.setFillColor(...LGRY);
  doc.roundedRect(SBX, y - 2, SBW, SBH, 2.5, 2.5, 'F');
  doc.setFillColor(...sc);
  doc.roundedRect(SBX, y - 2, SBW, 7.5, 2.5, 2.5, 'F');
  doc.rect(SBX, y + 3, SBW, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHT);
  doc.text('DEAL SCORE', SBX + SBW / 2, y + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(String(deal.score), SBX + SBW / 2, y + 16, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(`Grade ${deal.grade}`, SBX + SBW / 2, y + 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(sc[0], sc[1], sc[2]);
  doc.text(deal.verdict, ML, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Cap Rate: ${fmtPct(calc.capRate)}  ·  CoC: ${fmtPct(calc.cashOnCash)}  ·  DSCR: ${fmtX(calc.dscr)}`,
    ML, y + 15
  );

  y += 28;
  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Key Metrics 3-column row 1 + 2-column rows ──
  sectionTitle(doc, 'Key Metrics', ML, y);
  y += 5;

  const col3W = (CW - 4) / 3;
  const col2W = (CW - 3) / 2;
  const mH = 13;

  const dscrCol  = calc.dscr >= 1.25 ? GRN : calc.dscr >= 1.0 ? AMB : RED;
  const capCol   = calc.capRate >= 0.07 ? GRN : calc.capRate >= 0.05 ? BLU : calc.capRate >= 0.035 ? AMB : RED;
  const cocCol   = calc.cashOnCash >= 0.08 ? GRN : calc.cashOnCash >= 0.05 ? BLU : calc.cashOnCash >= 0.02 ? AMB : RED;
  const cfCol    = calc.annualCashFlow >= 0 ? GRN : RED;
  const noiCol   = calc.noi > 0 ? GRN : RED;

  metricBox(doc, ML,                   y, col3W, mH, 'Cap Rate',              fmtPct(calc.capRate),        capCol);
  metricBox(doc, ML + col3W + 2,       y, col3W, mH, 'Cash-on-Cash Return',   fmtPct(calc.cashOnCash),     cocCol);
  metricBox(doc, ML + (col3W + 2) * 2, y, col3W, mH, 'DSCR',                  fmtX(calc.dscr),             dscrCol);
  y += mH + 2.5;

  metricBox(doc, ML,            y, col2W, mH, 'Net Operating Income (NOI)', fmtCAD(calc.noi),             noiCol);
  metricBox(doc, ML + col2W + 3, y, col2W, mH, 'Monthly Cash Flow',          fmtCAD(calc.monthlyCashFlow), cfCol);
  y += mH + 2.5;

  metricBox(doc, ML,            y, col2W, mH, 'Gross Rent Multiplier (GRM)', fmtX(calc.grm),               GRAY);
  metricBox(doc, ML + col2W + 3, y, col2W, mH, 'Total Cash to Close',         fmtCAD(calc.totalCashInvested), DARK);
  y += mH + 4;

  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Unit Mix table ──
  sectionTitle(doc, 'Unit Mix', ML, y);
  y += 4;

  // Header row
  doc.setFillColor(...BLU);
  doc.roundedRect(ML, y, CW, 7.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHT);
  doc.text('Unit Type',     ML + 4,   y + 5);
  doc.text('Count',         ML + 55,  y + 5, { align: 'center' });
  doc.text('Rent/mo',       ML + 85,  y + 5, { align: 'center' });
  doc.text('Annual Income', ML + 120, y + 5, { align: 'center' });
  doc.text('% of Total',    ML + 155, y + 5, { align: 'center' });
  y += 7.5;

  units.forEach((u, i) => {
    const unitAnnual = num(u.count) * num(u.rent) * 12;
    const pct = calc.grossAnnualRent > 0 ? (unitAnnual / calc.grossAnnualRent * 100).toFixed(0) + '%' : '—';
    const bg = i % 2 === 0 ? LGRY : WHT;
    doc.setFillColor(...bg);
    doc.rect(ML, y, CW, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(u.type,             ML + 4,   y + 5);
    doc.text(String(u.count),    ML + 55,  y + 5, { align: 'center' });
    doc.text(fmtCAD(num(u.rent)), ML + 85,  y + 5, { align: 'center' });
    doc.text(fmtCAD(unitAnnual), ML + 120, y + 5, { align: 'center' });
    doc.text(pct,                ML + 155, y + 5, { align: 'center' });
    y += 7;
  });

  // Totals row
  doc.setFillColor(230, 235, 245);
  doc.rect(ML, y, CW, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('TOTAL',                               ML + 4,   y + 5);
  doc.text(String(calc.totalUnits),               ML + 55,  y + 5, { align: 'center' });
  doc.text(fmtCAD(calc.grossMonthlyRent) + '/mo', ML + 85,  y + 5, { align: 'center' });
  doc.text(fmtCAD(calc.grossAnnualRent),          ML + 120, y + 5, { align: 'center' });
  doc.text('100%',                                ML + 155, y + 5, { align: 'center' });
  y += 12;

  hline(doc, y, ML, PW, MR);
  y += 6;

  // ── Income & Expense Breakdown ──
  sectionTitle(doc, 'Annual Income & Expense Breakdown', ML, y);
  y += 5;

  const bRows = [
    { label: 'Gross Annual Rent',                               value: fmtCAD(calc.grossAnnualRent),      bold: false, col: DARK },
    { label: `Vacancy Loss (${form.vacancyPct}%)`,              value: `(${fmtCAD(calc.vacancyLoss)})`,   bold: false, col: RED  },
    { label: 'Effective Gross Income',                          value: fmtCAD(calc.effectiveGrossIncome), bold: true,  col: DARK },
    { label: 'Property Tax',                                    value: `(${fmtCAD(calc.propTax)})`,       bold: false, col: GRAY },
    { label: 'Insurance',                                       value: `(${fmtCAD(calc.insurance)})`,     bold: false, col: GRAY },
    { label: `Management (${form.managementPct}%)`,             value: `(${fmtCAD(calc.management)})`,    bold: false, col: GRAY },
    { label: `Maintenance (${form.maintenancePct}% of value)`,  value: `(${fmtCAD(calc.maintenance)})`,   bold: false, col: GRAY },
    calc.otherExp > 0
      ? { label: 'Other Expenses', value: `(${fmtCAD(calc.otherExp)})`, bold: false, col: GRAY }
      : null,
    { label: 'Net Operating Income (NOI)',                      value: fmtCAD(calc.noi),                  bold: true,  col: calc.noi >= 0 ? GRN : RED },
    { label: `Annual Debt Service (${form.interestRate}% / ${form.amortYears}yr)`, value: `(${fmtCAD(calc.annualDebtService)})`, bold: false, col: GRAY },
    { label: 'Annual Cash Flow',                                value: fmtCAD(calc.annualCashFlow),       bold: true,  col: calc.annualCashFlow >= 0 ? GRN : RED },
  ].filter(Boolean);

  bRows.forEach((row, i) => {
    if (y > PH - 20) {
      pageFooter(doc, PH, ML, PW, MR, dateStr);
      y = newPage(doc, PW, PH, MR, ML, dateStr, SUBTITLE);
    }
    doc.setFillColor(...(i % 2 === 0 ? LGRY : WHT));
    doc.rect(ML, y - 0.5, CW, 6.5, 'F');
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(row.bold ? DARK : GRAY));
    doc.text(row.label, ML + 3, y + 4);
    doc.setTextColor(row.col[0], row.col[1], row.col[2]);
    doc.text(row.value, PW - MR - 3, y + 4, { align: 'right' });
    y += 6.5;
  });

  y += 4;

  // ── Financing Summary ──
  if (y > PH - 55) {
    pageFooter(doc, PH, ML, PW, MR, dateStr);
    y = newPage(doc, PW, PH, MR, ML, dateStr, SUBTITLE);
  }

  hline(doc, y, ML, PW, MR);
  y += 6;
  sectionTitle(doc, 'Financing Summary', ML, y);
  y += 5;

  const finRows = [
    ['Purchase Price',                   fmtCAD(num(form.purchasePrice))],
    [`Down Payment (${form.downPaymentPct}%)`, fmtCAD(calc.downPayment)],
    ['Loan Amount',                      fmtCAD(calc.loanAmount)],
    [`Closing Costs (${form.closingCostsPct}%)`, fmtCAD(calc.closingCosts)],
    num(form.renovationBudget) > 0 ? ['Renovation Budget', fmtCAD(num(form.renovationBudget))] : null,
    ['Total Cash to Close',              fmtCAD(calc.totalCashInvested)],
  ].filter(Boolean);

  const fColW = (CW - 3) / 2;
  let finCol = 0;
  let finRowY = y;

  finRows.forEach((row) => {
    const fx = ML + finCol * (fColW + 3);
    doc.setFillColor(...LGRY);
    doc.roundedRect(fx, finRowY, fColW, 11, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(row[0].toUpperCase(), fx + 3, finRowY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...(row[0].startsWith('Total') ? BLU : DARK));
    doc.text(row[1], fx + 3, finRowY + 10);
    finCol++;
    if (finCol === 2) { finCol = 0; finRowY += 13.5; }
  });
  y = finRowY + (finCol > 0 ? 13.5 : 0) + 4;

  // ── Deal Scorecard ──
  if (y > PH - 50) {
    pageFooter(doc, PH, ML, PW, MR, dateStr);
    y = newPage(doc, PW, PH, MR, ML, dateStr, SUBTITLE);
  }

  hline(doc, y, ML, PW, MR);
  y += 6;
  sectionTitle(doc, 'Deal Scorecard', ML, y);
  y += 5;

  deal.reasons.forEach(r => {
    if (y > PH - 18) {
      pageFooter(doc, PH, ML, PW, MR, dateStr);
      y = newPage(doc, PW, PH, MR, ML, dateStr, SUBTITLE);
    }
    const dc = r.type === 'pass' ? GRN : r.type === 'warn' ? AMB : RED;
    doc.setFillColor(...dc);
    doc.circle(ML + 1.5, y - 0.8, 1.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(r.text, CW - 7);
    doc.text(lines, ML + 5, y);
    y += lines.length * 4.2 + 2.5;
  });

  pageFooter(doc, PH, ML, PW, MR, dateStr);

  const fname = (form.address || 'commercial').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  doc.save(`${fname}-commercial.pdf`);
}
