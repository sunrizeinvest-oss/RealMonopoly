/**
 * Generates ~/Desktop/RizeAI_Fundraise_Guide.pdf from docs/raise-guide.md.
 *
 * Renders the markdown content into a professional-looking multi-page PDF
 * with title page, section headers, body text, tables, and proper page
 * wrapping. Uses jsPDF (already in deps).
 *
 * Re-run anytime the source markdown changes:
 *   node scripts/generate-raise-guide.mjs
 */

import { jsPDF } from "jspdf";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SRC = "./docs/raise-guide.md";
const OUT = join(homedir(), "Desktop", "RizeAI_Fundraise_Guide.pdf");

// ── Brand palette ─────────────────────────────────────────────────────────
const C = {
  bg:        "#ffffff",
  navy:      "#0a1128",
  navyText:  "#1a2540",
  brass:     "#b8941f",   // darker than #d4af37 for print legibility
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
const M = 56;                    // page margin
const CONTENT_W = W - M * 2;
const BODY_LH = 15;              // line height for body
let y = M;                       // running cursor
let pageNum = 0;

function newPage(skipHeader = false) {
  if (pageNum > 0) doc.addPage();
  pageNum++;
  y = M;
  if (!skipHeader && pageNum > 1) drawRunningHeader();
  drawPageFooter();
}

function drawRunningHeader() {
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(C.brass);
  doc.text("RIZEAI", M, M - 22);
  doc.setFont("helvetica", "normal").setTextColor(C.dim);
  doc.text("· FUNDRAISE GUIDE", M + 36, M - 22);
  doc.setDrawColor(C.line).setLineWidth(0.5);
  doc.line(M, M - 12, W - M, M - 12);
}

function drawPageFooter() {
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(C.dim);
  doc.text(`p. ${pageNum}`, W - M, H - 24, { align: "right" });
  doc.text("Confidential · For RizeAI internal use", M, H - 24);
}

function needSpace(amount) {
  if (y + amount > H - M - 8) newPage();
}

// ── Renderers ─────────────────────────────────────────────────────────────
function renderTitlePage() {
  newPage(true);
  // Big navy block at the top
  doc.setFillColor(C.navy);
  doc.rect(0, 0, W, 280, "F");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.brass);
  doc.text("RIZEAI", M, 100);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor("#d4af37");
  doc.text("· FUNDRAISE GUIDE", M + 50, 100);

  doc.setFont("helvetica", "bold").setFontSize(38).setTextColor("#ffffff");
  doc.text("Pre-Seed", M, 160);
  doc.text("Fundraise Guide", M, 205);

  doc.setFont("helvetica", "normal").setFontSize(13).setTextColor("#d4d8e0");
  const sub = doc.splitTextToSize(
    "A founder's playbook: stage, valuation, SAFE terms, process, dilution math, Canadian-specific tax/grants, and red flags. Written for the actual situation.",
    CONTENT_W
  );
  doc.text(sub, M, 240);

  // Body below the dark block
  y = 320;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.sub);
  doc.text("For:  Sunni Yaremchuk", M, y); y += 16;
  doc.text("Stage:  Pre-revenue, live product, pre-seed", M, y); y += 16;
  doc.text("Target:  $175K-$215K on a SAFE at $4M-$6M post-money cap", M, y); y += 16;
  doc.text("Generated:  " + new Date().toISOString().slice(0, 10), M, y); y += 30;

  // Brass rule
  doc.setDrawColor(C.brass).setLineWidth(2);
  doc.line(M, y, M + 60, y);
  y += 32;

  doc.setFont("helvetica", "italic").setFontSize(11).setTextColor(C.text);
  const tag = doc.splitTextToSize(
    'Send Corey tomorrow. Then start the LinkedIn outreach. Then go to bed.',
    CONTENT_W
  );
  doc.text(tag, M, y);

  drawPageFooter();
}

function renderH1(text) {
  needSpace(70);
  y += 12;
  // Navy bar to the left
  doc.setFillColor(C.brass);
  doc.rect(M, y, 4, 30, "F");
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(C.navyText);
  doc.text(text, M + 14, y + 22);
  y += 38;
  doc.setDrawColor(C.line).setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 22;
}

function renderH2(text) {
  needSpace(50);
  y += 8;
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(C.navyText);
  doc.text(text, M, y);
  y += 18;
}

function renderH3(text) {
  needSpace(35);
  y += 4;
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(C.royal);
  doc.text(text, M, y);
  y += 14;
}

function renderParagraph(text) {
  const cleanText = stripInlineMarkdown(text);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
  const lines = doc.splitTextToSize(cleanText, CONTENT_W);
  for (const line of lines) {
    needSpace(BODY_LH + 2);
    doc.text(line, M, y);
    y += BODY_LH;
  }
  y += 8;
}

function renderBullet(text) {
  const cleanText = stripInlineMarkdown(text);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
  const indent = 18;
  const lines = doc.splitTextToSize(cleanText, CONTENT_W - indent);
  for (let i = 0; i < lines.length; i++) {
    needSpace(BODY_LH + 2);
    if (i === 0) {
      doc.setTextColor(C.brass).setFont("helvetica", "bold");
      doc.text("•", M + 4, y);
      doc.setTextColor(C.text).setFont("helvetica", "normal");
    }
    doc.text(lines[i], M + indent, y);
    y += BODY_LH;
  }
}

function renderQuote(text) {
  const cleanText = stripInlineMarkdown(text);
  needSpace(40);
  doc.setFillColor(C.cardBg);
  const lines = doc.splitTextToSize(cleanText, CONTENT_W - 28);
  const h = lines.length * BODY_LH + 18;
  doc.rect(M, y - 6, CONTENT_W, h, "F");
  doc.setDrawColor(C.royal).setLineWidth(2.5);
  doc.line(M, y - 6, M, y - 6 + h);
  doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(C.text);
  let qy = y + 8;
  for (const line of lines) {
    doc.text(line, M + 16, qy);
    qy += BODY_LH;
  }
  y += h + 6;
}

function renderTable(rows) {
  // rows = [[headerRow], [row], [row]...]; columns auto-sized equally
  if (!rows.length) return;
  const cols = rows[0].length;
  const colW = CONTENT_W / cols;
  const rowH = 22;
  needSpace(rows.length * rowH + 10);

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
    doc.setDrawColor(C.line).setLineWidth(0.3);
    doc.line(M, rowY + rowH, W - M, rowY + rowH);

    for (let c = 0; c < cols; c++) {
      const cell = stripInlineMarkdown(String(rows[r][c] ?? ""));
      const cellX = M + c * colW + 8;
      if (isHeader) {
        doc.setFont("helvetica", "bold").setFontSize(9).setTextColor("#ffffff");
      } else {
        doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(C.text);
      }
      const wrapped = doc.splitTextToSize(cell, colW - 16);
      doc.text(wrapped[0] || "", cellX, rowY + 14);
    }
    y += rowH;
  }
  y += 8;
}

function renderHR() {
  needSpace(20);
  doc.setDrawColor(C.brass).setLineWidth(1.2);
  doc.line(M, y + 6, M + 40, y + 6);
  y += 22;
}

function renderChecklistItem(text) {
  const cleanText = stripInlineMarkdown(text);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(C.text);
  const indent = 22;
  const lines = doc.splitTextToSize(cleanText, CONTENT_W - indent);
  for (let i = 0; i < lines.length; i++) {
    needSpace(BODY_LH + 2);
    if (i === 0) {
      // Empty square
      doc.setDrawColor(C.brass).setLineWidth(1);
      doc.rect(M + 4, y - 9, 10, 10);
    }
    doc.text(lines[i], M + indent, y);
    y += BODY_LH;
  }
}

// ── Markdown parser (purpose-built, not full CommonMark) ──────────────────
function stripInlineMarkdown(text) {
  if (!text) return "";
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")    // **bold**
    .replace(/`(.+?)`/g, "$1")          // `code`
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [text](link)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseMarkdownTable(lines, startIdx) {
  // Markdown table:
  // | h1 | h2 |
  // |---|---|
  // | r1 | r2 |
  const rows = [];
  let i = startIdx;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const line = lines[i].trim();
    // Skip the separator row (|---|---|)
    if (!/^\|[\s:|-]+\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map(s => s.trim());
      rows.push(cells);
    }
    i++;
  }
  return { rows, nextIdx: i };
}

function renderMarkdown(markdownSrc) {
  const lines = markdownSrc.split("\n");
  let i = 0;
  let inFrontmatter = false;
  let inCodeBlock = false;
  let paragraphBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      renderParagraph(paragraphBuffer.join(" "));
      paragraphBuffer = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks: skip rendering them (just acknowledge)
    if (trimmed.startsWith("```")) {
      flushParagraph();
      inCodeBlock = !inCodeBlock;
      i++;
      continue;
    }
    if (inCodeBlock) { i++; continue; }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushParagraph();
      renderHR();
      i++;
      continue;
    }

    // Heading 1: `# Title`
    if (trimmed.startsWith("# ")) {
      flushParagraph();
      // Page break before each H1 except the very first
      if (pageNum > 1) newPage();
      renderH1(trimmed.slice(2));
      i++;
      continue;
    }

    // Heading 2: `## Title`
    if (trimmed.startsWith("## ")) {
      flushParagraph();
      renderH2(trimmed.slice(3));
      i++;
      continue;
    }

    // Heading 3: `### Title`
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      renderH3(trimmed.slice(4));
      i++;
      continue;
    }

    // Markdown table
    if (trimmed.startsWith("|") && lines[i + 1] && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      flushParagraph();
      const { rows, nextIdx } = parseMarkdownTable(lines, i);
      renderTable(rows);
      i = nextIdx;
      continue;
    }

    // Block quote
    if (trimmed.startsWith("> ")) {
      flushParagraph();
      // Collect consecutive blockquote lines
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      renderQuote(quoteLines.join(" "));
      continue;
    }

    // Checklist item
    if (/^- \[ \] /.test(trimmed)) {
      flushParagraph();
      renderChecklistItem(trimmed.slice(6));
      i++;
      continue;
    }

    // Bullet
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      // Collect consecutive bullets
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        const bul = lines[i].trim().slice(2);
        // Skip empty bullets
        if (bul) renderBullet(bul);
        i++;
      }
      y += 4;
      continue;
    }

    // Numbered list (treat as bullet)
    if (/^\d+\. /.test(trimmed)) {
      flushParagraph();
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        const num = lines[i].trim().match(/^(\d+)\. (.+)$/);
        if (num) renderBullet(`${num[1]}. ${num[2]}`);
        i++;
      }
      y += 4;
      continue;
    }

    // Blank line → flush paragraph
    if (!trimmed) {
      flushParagraph();
      i++;
      continue;
    }

    // Paragraph
    paragraphBuffer.push(trimmed);
    i++;
  }
  flushParagraph();
}

// ── Run ───────────────────────────────────────────────────────────────────
const markdownSrc = readFileSync(SRC, "utf8");
renderTitlePage();
renderMarkdown(markdownSrc);

const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(OUT, buf);
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${buf.length.toLocaleString()} bytes · ${pageNum} pages`);
