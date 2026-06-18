/**
 * Generates ~/Desktop/RizeAI_Deck.pdf — a ready-to-send 12-slide pitch deck.
 *
 * Reads docs/deck.md, extracts each slide's Title / Subhead / Body, renders
 * each on a 16:9 landscape page with Family Office brand styling. Skips the
 * "Visual:" and "Presenter cue:" sections (those are slide-assembly notes,
 * not deck content).
 *
 * Output is sendable today. User can later replace with a hand-crafted
 * Google Slides version that has screenshots, but this gets the artifact
 * into Corey's inbox immediately.
 *
 * Re-run after editing docs/deck.md:
 *   node scripts/generate-deck.mjs
 *   OR
 *   npm run deck:pdf
 */

import { jsPDF } from "jspdf";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SRC = "./docs/deck.md";
const OUT = join(homedir(), "Desktop", "RizeAI_Deck.pdf");

// ── Brand palette (Family Office) ─────────────────────────────────────────
const C = {
  navy:     "#0a1128",
  navyLight:"#1a2540",
  brass:    "#d4af37",
  brassMid: "#b8941f",
  royal:    "#2155cd",
  alabaster:"#f0f0f0",
  alabaster2:"#d4d8e0",
  alabaster3:"#94a3b8",
  bodyText: "#0f172a",
  cardBg:   "#f8fafc",
  line:     "#cbd5e1",
};

// ── 16:9 landscape, custom size (Letter 11x8.5 in landscape = 792x612 pt) ──
const doc = new jsPDF({ unit: "pt", format: [792, 612], orientation: "landscape" });
const W = doc.internal.pageSize.getWidth();   // 792
const H = doc.internal.pageSize.getHeight();  // 612
const M = 56;
const CONTENT_W = W - M * 2;
let slideNum = 0;

// ── Helpers ───────────────────────────────────────────────────────────────
function stripMd(text) {
  if (!text) return "";
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/&amp;/g, "&")
    .trim();
}

function drawSlideChrome(slideIndex, totalSlides) {
  // Navy gradient (faked with two rectangles)
  doc.setFillColor(C.navy);
  doc.rect(0, 0, W, H, "F");
  // Subtle brass accent bar at top
  doc.setFillColor(C.brass);
  doc.rect(0, 0, W, 4, "F");
  // Footer brand mark
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(C.brass);
  doc.text("RIZEAI", M, H - 26);
  doc.setFont("helvetica", "normal").setTextColor(C.alabaster3);
  doc.text("· www.realdealestate.app", M + 38, H - 26);
  // Slide number
  doc.text(`${slideIndex} / ${totalSlides}`, W - M, H - 26, { align: "right" });
}

function drawTitleSlide() {
  drawSlideChrome(1, 12);
  // Big brand block
  doc.setFont("helvetica", "bold").setFontSize(72).setTextColor("#ffffff");
  doc.text("RizeAI", M, 220);
  doc.setFont("helvetica", "normal").setFontSize(20).setTextColor(C.brass);
  doc.text("AI underwriting for Canadian real estate operators", M, 260);

  // Brass rule
  doc.setDrawColor(C.brass).setLineWidth(2);
  doc.line(M, 290, M + 100, 290);

  // Subhead block
  doc.setFont("helvetica", "normal").setFontSize(13).setTextColor(C.alabaster2);
  const lines = [
    "Live in production at www.realdealestate.app   (migrating to rizeai.io)",
    "",
    "Pre-seed allocation:  $500K on a SAFE  ·  $5M post-money cap",
    "",
    "Sunni Yaremchuk, Founder",
  ];
  let y = 330;
  for (const l of lines) {
    if (l) doc.text(l, M, y);
    y += 22;
  }

  // Date stamp bottom-right
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.alabaster3);
  const today = new Date().toISOString().slice(0, 10);
  doc.text(today, W - M, 540, { align: "right" });
}

function drawContentSlide({ slideIndex, title, subhead, body, totalSlides }) {
  drawSlideChrome(slideIndex, totalSlides);

  // Title
  doc.setFont("helvetica", "bold").setFontSize(32).setTextColor("#ffffff");
  const titleLines = doc.splitTextToSize(stripMd(title), CONTENT_W);
  doc.text(titleLines, M, 90);
  let y = 90 + titleLines.length * 36;

  // Brass rule under title
  doc.setDrawColor(C.brass).setLineWidth(2);
  doc.line(M, y, M + 60, y);
  y += 20;

  // Subhead (italic, brass)
  if (subhead) {
    doc.setFont("helvetica", "italic").setFontSize(14).setTextColor(C.brass);
    const subLines = doc.splitTextToSize(stripMd(subhead), CONTENT_W);
    doc.text(subLines, M, y);
    y += subLines.length * 18 + 14;
  }

  // Body content — render whatever we got
  renderBody(body, y);
}

function renderBody(bodyLines, startY) {
  let y = startY;
  let i = 0;
  let pendingPara = [];

  function flushPara() {
    if (pendingPara.length) {
      const text = stripMd(pendingPara.join(" "));
      doc.setFont("helvetica", "normal").setFontSize(13).setTextColor(C.alabaster);
      const wrapped = doc.splitTextToSize(text, CONTENT_W);
      for (const line of wrapped) {
        if (y > H - 60) return;
        doc.text(line, M, y);
        y += 19;
      }
      y += 8;
      pendingPara = [];
    }
  }

  while (i < bodyLines.length) {
    const raw = bodyLines[i];
    const line = raw.trim();

    // Skip empty lines as paragraph breaks
    if (!line) {
      flushPara();
      i++;
      continue;
    }

    // Skip the slide-assembly meta sections
    if (/^\*\*(Visual|Presenter cue|Body|Title|Subhead)/i.test(line)) {
      // If it's a Body marker, skip; otherwise we shouldn't be in renderBody
      if (line.startsWith("**Body")) { i++; continue; }
      // Visual / Presenter cue → skip everything until next major break
      flushPara();
      while (i < bodyLines.length && !/^---|^## /.test(bodyLines[i])) i++;
      continue;
    }

    // Table detection
    if (line.startsWith("|") && bodyLines[i + 1] && /^\|[\s:|-]+\|$/.test(bodyLines[i + 1].trim())) {
      flushPara();
      const rows = [];
      while (i < bodyLines.length && bodyLines[i].trim().startsWith("|")) {
        const l = bodyLines[i].trim();
        if (!/^\|[\s:|-]+\|$/.test(l)) {
          rows.push(l.slice(1, -1).split("|").map(s => stripMd(s.trim())));
        }
        i++;
      }
      y = drawTable(rows, y);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushPara();
      const quoteLines = [];
      while (i < bodyLines.length && bodyLines[i].trim().startsWith("> ")) {
        quoteLines.push(bodyLines[i].trim().slice(2));
        i++;
      }
      y = drawQuote(quoteLines.join(" "), y);
      continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara();
      while (i < bodyLines.length && (bodyLines[i].trim().startsWith("- ") || bodyLines[i].trim().startsWith("* "))) {
        const txt = bodyLines[i].trim().slice(2);
        y = drawBullet(stripMd(txt), y);
        i++;
      }
      y += 4;
      continue;
    }

    // Numbered bullet
    if (/^\d+\. /.test(line)) {
      flushPara();
      while (i < bodyLines.length && /^\d+\. /.test(bodyLines[i].trim())) {
        const m = bodyLines[i].trim().match(/^(\d+)\. (.+)$/);
        if (m) y = drawBullet(`${m[1]}. ${stripMd(m[2])}`, y);
        i++;
      }
      y += 4;
      continue;
    }

    // Sub-heading (e.g. "**1. ...**")
    if (/^\*\*\d/.test(line) || /^### /.test(line)) {
      flushPara();
      const txt = stripMd(line.replace(/^### /, ""));
      if (y > H - 80) return;
      doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(C.brass);
      doc.text(txt, M, y);
      y += 22;
      continue;
    }

    // Paragraph accumulate
    pendingPara.push(line);
    i++;
  }
  flushPara();
}

function drawTable(rows, y) {
  if (!rows.length) return y;
  const cols = rows[0].length;
  const colW = CONTENT_W / cols;
  const rowH = 26;

  for (let r = 0; r < rows.length; r++) {
    if (y > H - 80) return y;
    const isHeader = r === 0;
    if (isHeader) {
      doc.setFillColor(C.brassMid);
      doc.rect(M, y, CONTENT_W, rowH, "F");
    } else if (r % 2 === 0) {
      doc.setFillColor("#1a2540");
      doc.rect(M, y, CONTENT_W, rowH, "F");
    }

    for (let c = 0; c < cols; c++) {
      const cell = rows[r][c] || "";
      const cellX = M + c * colW + 10;
      if (isHeader) {
        doc.setFont("helvetica", "bold").setFontSize(10).setTextColor("#0a1128");
      } else {
        doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(C.alabaster);
      }
      const wrapped = doc.splitTextToSize(cell, colW - 20);
      doc.text(wrapped[0] || "", cellX, y + 17);
    }
    y += rowH;
  }
  return y + 12;
}

function drawQuote(text, y) {
  if (y > H - 100) return y;
  const cleanText = stripMd(text);
  doc.setFont("helvetica", "italic").setFontSize(14).setTextColor(C.brass);
  const wrapped = doc.splitTextToSize(cleanText, CONTENT_W - 28);
  // Royal-blue left bar
  doc.setDrawColor(C.royal).setLineWidth(3);
  doc.line(M, y, M, y + wrapped.length * 19 + 8);
  let qy = y + 16;
  for (const line of wrapped) {
    doc.text(line, M + 16, qy);
    qy += 19;
  }
  return qy + 6;
}

function drawBullet(text, y) {
  if (y > H - 60) return y;
  doc.setFont("helvetica", "normal").setFontSize(13).setTextColor(C.alabaster);
  const wrapped = doc.splitTextToSize(text, CONTENT_W - 24);
  for (let i = 0; i < wrapped.length; i++) {
    if (y > H - 60) return y;
    if (i === 0) {
      doc.setTextColor(C.brass);
      doc.text("▸", M + 4, y);
      doc.setTextColor(C.alabaster);
    }
    doc.text(wrapped[i], M + 24, y);
    y += 20;
  }
  return y;
}

// ── Parse docs/deck.md into slides ────────────────────────────────────────
function parseDeck(markdownSrc) {
  // Each slide starts with "## Slide N" and ends with the next "---"
  const lines = markdownSrc.split("\n");
  const slides = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const slideMatch = line.match(/^## Slide (\d+)\s*(?:—\s*(.+))?$/);
    if (slideMatch) {
      if (current) slides.push(current);
      current = { num: parseInt(slideMatch[1], 10), heading: slideMatch[2] || "", title: "", subhead: "", body: [] };
      continue;
    }
    // Reached the "## How to actually build this tonight" section → stop
    if (line.match(/^## (How to|Email template|What to ALSO|Realistic|Bottom line)/)) {
      if (current) slides.push(current);
      current = null;
      break;
    }
    if (!current) continue;

    // Capture **Title:** and **Subhead:** explicitly
    const titleM = line.match(/^\*\*Title:\*\*\s*(.+)$/);
    if (titleM) { current.title = titleM[1].trim(); continue; }
    const subheadM = line.match(/^\*\*Subhead:\*\*\s*(.+)$/);
    if (subheadM) { current.subhead = subheadM[1].trim(); continue; }
    // Skip the **Body:** marker line itself
    if (/^\*\*Body[^*]*:\*\*\s*$/.test(line)) continue;
    // Stop body collection at Visual / Presenter cue
    if (/^\*\*(Visual|Presenter cue):\*\*/.test(line)) {
      // Drop the rest of this slide's body
      while (i < lines.length && lines[i].trim() !== "---") i++;
      continue;
    }
    // Horizontal rule = end of slide
    if (line.trim() === "---") {
      if (current) slides.push(current);
      current = null;
      continue;
    }

    current.body.push(line);
  }
  if (current) slides.push(current);
  return slides;
}

// ── Run ───────────────────────────────────────────────────────────────────
const src = readFileSync(SRC, "utf8");
const slides = parseDeck(src);
const totalSlides = slides.length;

drawTitleSlide();

for (let s = 1; s < slides.length; s++) {
  doc.addPage([792, 612], "landscape");
  drawContentSlide({
    slideIndex: s + 1,
    title:    slides[s].title || slides[s].heading,
    subhead:  slides[s].subhead,
    body:     slides[s].body,
    totalSlides,
  });
}

const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(OUT, buf);
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${buf.length.toLocaleString()} bytes · ${totalSlides} slides · 16:9 landscape`);
console.log(`  Ready to send to Corey TODAY.`);
