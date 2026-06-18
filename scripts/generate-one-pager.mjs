/**
 * Generates ~/Desktop/RizeAI_OnePager.pdf from docs/one-pager.md.
 *
 * Single-document attachment for the Corey email. Uses the same brand
 * palette + markdown renderer as the fundraise guide, but tighter
 * (no running header, more compact spacing — meant to fit on 2-3 pages
 * not 12).
 *
 * Re-run after editing docs/one-pager.md:
 *   npm run onepager:pdf
 */

import { jsPDF } from "jspdf";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SRC = "./docs/one-pager.md";
const OUT = join(homedir(), "Desktop", "RizeAI_OnePager.pdf");

const C = {
  navy:      "#0a1128",
  navyText:  "#1a2540",
  brass:     "#b8941f",
  brassLight:"#d4af37",
  royal:     "#2155cd",
  text:      "#0f172a",
  sub:       "#475569",
  dim:       "#94a3b8",
  line:      "#e2e8f0",
  cardBg:    "#f8fafc",
};

const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const M = 50;
const CONTENT_W = W - M * 2;
let y = M;
let pageNum = 0;

function newPage(skipHeader = false) {
  if (pageNum > 0) doc.addPage();
  pageNum++;
  y = M;
  if (!skipHeader && pageNum > 1) drawHeader();
  drawFooter();
}

function drawHeader() {
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(C.brass);
  doc.text("RIZEAI", M, M - 20);
  doc.setFont("helvetica", "normal").setTextColor(C.dim);
  doc.text("· One-pager", M + 36, M - 20);
  doc.setDrawColor(C.line).setLineWidth(0.5);
  doc.line(M, M - 10, W - M, M - 10);
}

function drawFooter() {
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.dim);
  doc.text(`p. ${pageNum}`, W - M, H - 22, { align: "right" });
  doc.text("www.realdealestate.app · Confidential", M, H - 22);
}

function needSpace(amount) {
  if (y + amount > H - M - 6) newPage();
}

function strip(text) {
  if (!text) return "";
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/&amp;/g, "&");
}

function renderH1(text) {
  needSpace(54);
  y += 6;
  doc.setFillColor(C.brass);
  doc.rect(M, y, 3, 24, "F");
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(C.navyText);
  doc.text(strip(text), M + 12, y + 18);
  y += 32;
  doc.setDrawColor(C.line).setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 14;
}

function renderH2(text) {
  needSpace(38);
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(C.navyText);
  doc.text(strip(text), M, y);
  y += 14;
}

function renderH3(text) {
  needSpace(28);
  y += 4;
  doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(C.royal);
  doc.text(strip(text), M, y);
  y += 13;
}

function renderParagraph(text) {
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(C.text);
  const lines = doc.splitTextToSize(strip(text), CONTENT_W);
  for (const line of lines) {
    needSpace(13);
    doc.text(line, M, y);
    y += 13;
  }
  y += 5;
}

function renderBullet(text) {
  doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(C.text);
  const indent = 16;
  const lines = doc.splitTextToSize(strip(text), CONTENT_W - indent);
  for (let i = 0; i < lines.length; i++) {
    needSpace(13);
    if (i === 0) {
      doc.setTextColor(C.brass);
      doc.text("•", M + 4, y);
      doc.setTextColor(C.text);
    }
    doc.text(lines[i], M + indent, y);
    y += 13;
  }
}

function renderQuote(text) {
  needSpace(36);
  const cleanText = strip(text);
  doc.setFillColor(C.cardBg);
  const lines = doc.splitTextToSize(cleanText, CONTENT_W - 22);
  const h = lines.length * 13 + 14;
  doc.rect(M, y - 4, CONTENT_W, h, "F");
  doc.setDrawColor(C.royal).setLineWidth(2);
  doc.line(M, y - 4, M, y - 4 + h);
  doc.setFont("helvetica", "italic").setFontSize(9.5).setTextColor(C.text);
  let qy = y + 6;
  for (const line of lines) {
    doc.text(line, M + 12, qy);
    qy += 13;
  }
  y += h + 4;
}

function renderTable(rows) {
  if (!rows.length) return;
  const cols = rows[0].length;
  const colW = CONTENT_W / cols;
  const rowH = 18;
  needSpace(rows.length * rowH + 8);

  for (let r = 0; r < rows.length; r++) {
    const isHeader = r === 0;
    const rowY = y;
    if (isHeader) {
      doc.setFillColor(C.navy);
      doc.rect(M, rowY, CONTENT_W, rowH, "F");
    } else if (r % 2 === 0) {
      doc.setFillColor(C.cardBg);
      doc.rect(M, rowY, CONTENT_W, rowH, "F");
    }
    doc.setDrawColor(C.line).setLineWidth(0.2);
    doc.line(M, rowY + rowH, W - M, rowY + rowH);

    for (let c = 0; c < cols; c++) {
      const cell = strip(String(rows[r][c] ?? ""));
      const cellX = M + c * colW + 6;
      if (isHeader) {
        doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor("#ffffff");
      } else {
        doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(C.text);
      }
      const wrapped = doc.splitTextToSize(cell, colW - 12);
      doc.text(wrapped[0] || "", cellX, rowY + 12);
    }
    y += rowH;
  }
  y += 6;
}

function renderHR() {
  needSpace(14);
  doc.setDrawColor(C.brass).setLineWidth(1);
  doc.line(M, y + 4, M + 32, y + 4);
  y += 14;
}

// ── Title page ────────────────────────────────────────────────────────────
function renderTitle() {
  newPage(true);
  doc.setFillColor(C.navy);
  doc.rect(0, 0, W, 200, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(C.brass);
  doc.text("RIZEAI", M, 70);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor("#d4d8e0");
  doc.text("· INVESTOR ONE-PAGER", M + 38, 70);

  doc.setFont("helvetica", "bold").setFontSize(28).setTextColor("#ffffff");
  doc.text("AI Underwriting for", M, 120);
  doc.text("Canadian Real Estate", M, 152);

  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor("#d4d8e0");
  doc.text("Live in production · Stripe live-mode billing · 6 cities · $500K @ $5M cap", M, 180);

  y = 230;
}

// ── Markdown parser ───────────────────────────────────────────────────────
function parseMarkdownTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const line = lines[i].trim();
    if (!/^\|[\s:|-]+\|$/.test(line)) {
      rows.push(line.slice(1, -1).split("|").map(s => s.trim()));
    }
    i++;
  }
  return { rows, nextIdx: i };
}

function renderMarkdown(src) {
  const lines = src.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let pendingPara = [];

  function flushPara() {
    if (pendingPara.length) {
      renderParagraph(pendingPara.join(" "));
      pendingPara = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t.startsWith("```")) { flushPara(); inCodeBlock = !inCodeBlock; i++; continue; }
    if (inCodeBlock) { i++; continue; }

    if (t === "---") { flushPara(); renderHR(); i++; continue; }

    if (t.startsWith("# ")) {
      flushPara();
      if (pageNum > 1) newPage();
      renderH1(t.slice(2));
      i++; continue;
    }
    if (t.startsWith("## ")) { flushPara(); renderH2(t.slice(3)); i++; continue; }
    if (t.startsWith("### ")) { flushPara(); renderH3(t.slice(4)); i++; continue; }

    if (t.startsWith("|") && lines[i+1] && /^\|[\s:|-]+\|$/.test(lines[i+1].trim())) {
      flushPara();
      const { rows, nextIdx } = parseMarkdownTable(lines, i);
      renderTable(rows);
      i = nextIdx;
      continue;
    }

    if (t.startsWith("> ")) {
      flushPara();
      const q = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        q.push(lines[i].trim().slice(2));
        i++;
      }
      renderQuote(q.join(" "));
      continue;
    }

    if (t.startsWith("- ") || t.startsWith("* ")) {
      flushPara();
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        const b = lines[i].trim().slice(2);
        if (b) renderBullet(b);
        i++;
      }
      y += 4;
      continue;
    }

    if (/^\d+\. /.test(t)) {
      flushPara();
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^(\d+)\. (.+)$/);
        if (m) renderBullet(`${m[1]}. ${m[2]}`);
        i++;
      }
      y += 4;
      continue;
    }

    if (!t) { flushPara(); i++; continue; }

    pendingPara.push(t);
    i++;
  }
  flushPara();
}

// ── Run ───────────────────────────────────────────────────────────────────
const src = readFileSync(SRC, "utf8");
renderTitle();
renderMarkdown(src);

const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(OUT, buf);
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${buf.length.toLocaleString()} bytes · ${pageNum} pages`);
console.log(`  Ready to attach to the Corey email.`);
