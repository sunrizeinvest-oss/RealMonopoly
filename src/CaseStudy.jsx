/**
 * /admin/case-study — internal tool for the founder to spin up a 2-page
 * branded case-study PDF whenever a customer wins something worth
 * bragging about.
 *
 * Fills in a form → live-updates the preview → hits Export → downloads a
 * PDF matching the RizeAI Family Office palette (navy + brass). Same
 * jsPDF pipeline the IC memo + playbook use, so it inherits the brand.
 *
 * Auth: requires an authenticated user whose email is in the
 * ADMIN_EMAILS env var — same gate the existing /admin dashboard uses.
 * Non-admin visitors get a 403 explanation.
 *
 * NOT linked from the public site — direct-URL only. The founder types
 * /admin/case-study and lands here.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabase";
import TopNav from "./components/TopNav";
import { useDocMeta } from "./lib/seo";

const BLANK = {
  // Customer
  name:        "Sarah Chen",
  title:       "Principal",
  firm:        "Northstar Capital",
  city:        "Calgary, AB",
  photoInit:   "SC",
  // Quote — big center-of-page pull quote
  quote:       "Pulled $187K of stranded upside on a deal my broker said was tapped out.",
  // Deal summary
  dealAddress: "24-unit multifamily · Westmount NW, Calgary",
  dealType:    "Multifamily · Value-Add",
  purchase:    "6,400,000",
  unitCount:   "24",
  strategy:    "Loss-to-Lease Mark-to-Market",
  // Outcome numbers (leave blank to hide)
  outcomeLtl:      "187000",
  outcomePerDoor:  "708",
  outcomePct:      "37",
  outcomeNpv:      "460000",
  // Narrative fields (2-3 sentences each)
  paragraphContext: "Sarah was underwriting a 24-unit walk-up in Westmount NW. The broker's OM listed the building at a 5.2% cap on the current rent roll. Standard institutional take: fully valued.",
  paragraphInsight: "RizeAI's Loss-to-Lease parser read the 47-page broker OM in 5 seconds. Every unit was pulled off the rent roll PDF, cross-referenced against CMHC Calgary October rent for the bedroom count, and priced against a 5-year mark-to-market NPV at 8%.",
  paragraphResult:  "The surfaced upside was $708/door/month — 37% below market — for $187K of annual NOI Sarah could underwrite to. At the exit cap of 5.5%, that's $3.4M of value the seller wasn't pricing in. Sarah closed the deal at asking.",
  // Meta
  headline:  "How Northstar Capital found $3.4M of value on a 'fully priced' 24-unit deal.",
  dateStr:   "",
};

export default function CaseStudy() {
  useDocMeta({
    title: "Case Study Generator · RizeAI",
    description: "Internal tool for building branded customer case-study PDFs.",
  });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const setF = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const outcomeChips = useMemo(() => {
    const chips = [];
    if (form.outcomeLtl)     chips.push({ val: `$${Number(form.outcomeLtl).toLocaleString()}`, lbl: "Annual upside" });
    if (form.outcomePerDoor) chips.push({ val: `$${Number(form.outcomePerDoor).toLocaleString()}`, lbl: "Per door / mo" });
    if (form.outcomePct)     chips.push({ val: `${form.outcomePct}%`, lbl: "Below market" });
    if (form.outcomeNpv)     chips.push({ val: `$${Number(form.outcomeNpv).toLocaleString()}`, lbl: "5-yr NPV" });
    return chips;
  }, [form.outcomeLtl, form.outcomePerDoor, form.outcomePct, form.outcomeNpv]);

  // Auth gate
  if (authLoading) return null;
  if (!user) {
    navigate("/login?next=/admin/case-study");
    return null;
  }

  async function generate() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      const NAVY = [10, 17, 40];
      const NAVY2 = [0, 28, 61];
      const BRASS = [212, 175, 55];
      const ALABASTER = [240, 240, 240];
      const DIM = [148, 163, 184];
      const SUB = [213, 216, 224];

      // ── PAGE 1 · Cover
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, W, H, "F");

      // Top brass stripe
      doc.setFillColor(...BRASS);
      doc.rect(0, 0, W, 4, "F");

      // Brand
      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("▸ RIZE AI · CUSTOMER CASE STUDY", 40, 36);

      // Headline
      doc.setTextColor(...ALABASTER);
      doc.setFontSize(28);
      const hLines = doc.splitTextToSize(form.headline, W - 80);
      doc.text(hLines, 40, 100);

      // Brass underline
      doc.setFillColor(...BRASS);
      doc.rect(40, 100 + hLines.length * 32 + 8, 60, 2, "F");

      // Customer callout card
      const cardY = 100 + hLines.length * 32 + 44;
      doc.setFillColor(0, 28, 61);
      doc.roundedRect(40, cardY, W - 80, 100, 6, 6, "F");
      doc.setDrawColor(...BRASS);
      doc.setLineWidth(0.5);
      doc.roundedRect(40, cardY, W - 80, 100, 6, 6);

      // Avatar
      doc.setFillColor(...BRASS);
      doc.roundedRect(60, cardY + 20, 60, 60, 4, 4, "F");
      doc.setTextColor(...NAVY);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(form.photoInit, 60 + 30, cardY + 20 + 38, { align: "center" });

      // Name / title / firm / city
      doc.setTextColor(...ALABASTER);
      doc.setFontSize(16);
      doc.text(form.name, 140, cardY + 34);
      doc.setTextColor(...BRASS);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${form.title.toUpperCase()} · ${form.firm.toUpperCase()}`, 140, cardY + 52);
      doc.setTextColor(...SUB);
      doc.setFontSize(9);
      doc.text(form.city, 140, cardY + 68);

      // Big pull quote
      const quoteY = cardY + 100 + 40;
      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(50);
      doc.text("“", 40, quoteY + 12);

      doc.setTextColor(...ALABASTER);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      const qLines = doc.splitTextToSize(form.quote, W - 100);
      doc.text(qLines, 70, quoteY);

      // Outcome chips row
      const chipsY = quoteY + qLines.length * 22 + 40;
      if (outcomeChips.length) {
        const chipW = (W - 80) / outcomeChips.length;
        outcomeChips.forEach((c, i) => {
          const x = 40 + i * chipW;
          doc.setFillColor(0, 0, 0);
          doc.setGState(new doc.GState({ opacity: 0.35 }));
          doc.roundedRect(x, chipsY, chipW - 8, 66, 4, 4, "F");
          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setDrawColor(...BRASS);
          doc.setLineWidth(0.4);
          doc.roundedRect(x, chipsY, chipW - 8, 66, 4, 4);

          doc.setTextColor(...BRASS);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.text(c.val, x + (chipW - 8) / 2, chipsY + 30, { align: "center" });

          doc.setTextColor(...DIM);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(c.lbl, x + (chipW - 8) / 2, chipsY + 50, { align: "center" });
        });
      }

      // Footer
      doc.setFillColor(0, 28, 61);
      doc.rect(0, H - 60, W, 60, "F");
      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("▸ WWW.REALDEALESTATE.APP", 40, H - 34);
      doc.setTextColor(...DIM);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Educational · verify all figures with your own underwriting", W - 40, H - 34, { align: "right" });

      doc.setFillColor(...BRASS);
      doc.rect(0, H - 4, W, 4, "F");

      // ── PAGE 2 · The Story
      doc.addPage();
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, W, H, "F");
      doc.setFillColor(...BRASS);
      doc.rect(0, 0, W, 4, "F");

      // Chapter header
      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("▸ THE STORY", 40, 40);

      doc.setTextColor(...ALABASTER);
      doc.setFontSize(24);
      doc.text("How it played out.", 40, 74);
      doc.setFillColor(...BRASS);
      doc.rect(40, 82, 60, 2, "F");

      // Deal info bar
      const barY = 108;
      doc.setFillColor(0, 28, 61);
      doc.roundedRect(40, barY, W - 80, 68, 4, 4, "F");
      doc.setDrawColor(...BRASS);
      doc.setLineWidth(0.4);
      doc.roundedRect(40, barY, W - 80, 68, 4, 4);

      doc.setTextColor(...BRASS);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("▸ DEAL", 60, barY + 20);
      doc.setTextColor(...ALABASTER);
      doc.setFontSize(13);
      doc.text(form.dealAddress, 60, barY + 40);
      doc.setTextColor(...SUB);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const info = [
        form.dealType,
        form.purchase && `$${Number(form.purchase).toLocaleString()} purchase`,
        form.unitCount && `${form.unitCount} units`,
        form.strategy,
      ].filter(Boolean).join(" · ");
      doc.text(info, 60, barY + 58);

      // The three paragraphs
      const paragraphs = [
        { label: "CONTEXT",   body: form.paragraphContext },
        { label: "THE INSIGHT", body: form.paragraphInsight },
        { label: "THE RESULT",  body: form.paragraphResult },
      ];
      let py = barY + 68 + 40;
      for (const p of paragraphs) {
        if (!p.body) continue;
        doc.setTextColor(...BRASS);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`▸ ${p.label}`, 40, py);
        py += 16;
        doc.setTextColor(...SUB);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(p.body, W - 80);
        doc.text(lines, 40, py);
        py += lines.length * 15 + 22;
      }

      // Try-it-yourself CTA card
      const ctaY = H - 180;
      doc.setFillColor(0, 28, 61);
      doc.roundedRect(40, ctaY, W - 80, 100, 6, 6, "F");
      doc.setFillColor(...BRASS);
      doc.rect(40, ctaY, 3, 100, "F");

      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("▸ TRY IT YOURSELF", 56, ctaY + 22);

      doc.setTextColor(...ALABASTER);
      doc.setFontSize(18);
      doc.text("Drop your next rent roll on /commercial.", 56, ctaY + 48);
      doc.setTextColor(...SUB);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("5 seconds. IC memo PDF included. Free tier.", 56, ctaY + 68);

      // Footer
      doc.setFillColor(0, 28, 61);
      doc.rect(0, H - 60, W, 60, "F");
      doc.setTextColor(...BRASS);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("▸ WWW.REALDEALESTATE.APP", 40, H - 34);
      doc.setTextColor(...DIM);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const today = form.dateStr || new Date().toISOString().slice(0, 10);
      doc.text(today, W - 40, H - 34, { align: "right" });

      doc.setFillColor(...BRASS);
      doc.rect(0, H - 4, W, 4, "F");

      const safeName = form.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      doc.save(`RizeAI-case-study-${safeName}.pdf`);

      // Best-effort: record to Supabase so the founder has a paper trail
      try {
        await supabase.from("case_studies_generated").insert({
          customer_name: form.name,
          firm: form.firm,
          city: form.city,
          headline: form.headline,
          generated_by: user.email,
        });
      } catch { /* table may not exist yet — non-fatal */ }
    } catch (e) {
      alert(`PDF failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "rgba(0,0,0,0.25)",
    color: "var(--text,#f0f0f0)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 4,
    padding: "8px 10px",
    fontFamily: "'Geist',sans-serif",
    fontSize: 13,
    outline: "none",
  };
  const labelStyle = {
    display: "block",
    fontFamily: "'Geist Mono',ui-monospace,monospace",
    fontSize: 9.5, fontWeight: 700, letterSpacing: "1.2px",
    color: "var(--brass,#d4af37)", textTransform: "uppercase",
    marginBottom: 4,
  };

  return (
    <div style={{
      background: "#0a1128",
      color: "#f0f0f0",
      minHeight: "100vh",
      fontFamily: "'Geist',sans-serif",
    }}>
      <TopNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 80px" }}>
        <div style={{
          fontFamily: "'Geist Mono',ui-monospace,monospace",
          fontSize: 11, fontWeight: 700, letterSpacing: "1.4px",
          color: "var(--brass,#d4af37)", textTransform: "uppercase", marginBottom: 6,
        }}>▸ Internal · founder tool</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800, letterSpacing: "-1.4px" }}>
          Case study generator
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "var(--sub,#94a3b8)", lineHeight: 1.6, maxWidth: 640 }}>
          Fill in the fields, hit generate, drop the PDF into your next 10 broker DMs. Same brand palette as the playbook + IC memo.
        </p>

        {/* Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Customer name</label>
            <input style={inputStyle} value={form.name} onChange={setF("name")} />
          </div>
          <div>
            <label style={labelStyle}>Initials for avatar (2 chars)</label>
            <input style={inputStyle} value={form.photoInit} maxLength={2} onChange={setF("photoInit")} />
          </div>
          <div>
            <label style={labelStyle}>Title / role</label>
            <input style={inputStyle} value={form.title} onChange={setF("title")} />
          </div>
          <div>
            <label style={labelStyle}>Firm</label>
            <input style={inputStyle} value={form.firm} onChange={setF("firm")} />
          </div>
          <div>
            <label style={labelStyle}>City / market</label>
            <input style={inputStyle} value={form.city} onChange={setF("city")} />
          </div>
          <div>
            <label style={labelStyle}>Date (blank → today)</label>
            <input style={inputStyle} value={form.dateStr} placeholder="2026-07-15" onChange={setF("dateStr")} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Headline (top of the cover)</label>
          <input style={inputStyle} value={form.headline} onChange={setF("headline")} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Pull quote (center of cover — customer's actual words)</label>
          <textarea style={{...inputStyle, minHeight: 64, resize: "vertical"}} value={form.quote} onChange={setF("quote")} />
        </div>

        <div style={{
          padding: "14px 16px",
          background: "rgba(212,175,55,0.05)",
          border: "1px solid rgba(212,175,55,0.28)",
          borderLeft: "3px solid var(--brass,#d4af37)",
          borderRadius: 5,
          marginBottom: 16,
        }}>
          <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: "1.3px", color: "var(--brass,#d4af37)", textTransform: "uppercase", marginBottom: 10 }}>
            ▸ Deal
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Address / description</label>
              <input style={inputStyle} value={form.dealAddress} onChange={setF("dealAddress")} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <input style={inputStyle} value={form.dealType} onChange={setF("dealType")} />
            </div>
            <div>
              <label style={labelStyle}>Purchase price ($)</label>
              <input style={inputStyle} value={form.purchase} onChange={setF("purchase")} />
            </div>
            <div>
              <label style={labelStyle}>Unit count</label>
              <input style={inputStyle} value={form.unitCount} onChange={setF("unitCount")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Strategy tag</label>
              <input style={inputStyle} value={form.strategy} onChange={setF("strategy")} />
            </div>
          </div>
        </div>

        <div style={{
          padding: "14px 16px",
          background: "rgba(34,197,94,0.04)",
          border: "1px solid rgba(34,197,94,0.28)",
          borderLeft: "3px solid var(--green-2,#22c55e)",
          borderRadius: 5,
          marginBottom: 16,
        }}>
          <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: "1.3px", color: "var(--green,#16a34a)", textTransform: "uppercase", marginBottom: 10 }}>
            ▸ Outcome chips (leave blank to hide)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>Annual upside $</label>
              <input style={inputStyle} value={form.outcomeLtl} onChange={setF("outcomeLtl")} />
            </div>
            <div>
              <label style={labelStyle}>Per door $/mo</label>
              <input style={inputStyle} value={form.outcomePerDoor} onChange={setF("outcomePerDoor")} />
            </div>
            <div>
              <label style={labelStyle}>Below market %</label>
              <input style={inputStyle} value={form.outcomePct} onChange={setF("outcomePct")} />
            </div>
            <div>
              <label style={labelStyle}>5-yr NPV $</label>
              <input style={inputStyle} value={form.outcomeNpv} onChange={setF("outcomeNpv")} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Context paragraph (page 2)</label>
          <textarea style={{ ...inputStyle, minHeight: 66, resize: "vertical" }} value={form.paragraphContext} onChange={setF("paragraphContext")} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>The insight paragraph (page 2)</label>
          <textarea style={{ ...inputStyle, minHeight: 66, resize: "vertical" }} value={form.paragraphInsight} onChange={setF("paragraphInsight")} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>The result paragraph (page 2)</label>
          <textarea style={{ ...inputStyle, minHeight: 66, resize: "vertical" }} value={form.paragraphResult} onChange={setF("paragraphResult")} />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={generate}
            disabled={busy}
            style={{
              background: "var(--brass,#d4af37)",
              color: "#0a1128",
              border: "none",
              borderRadius: 4,
              padding: "13px 26px",
              fontFamily: "'Geist Mono',ui-monospace,monospace",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.7px",
              textTransform: "uppercase",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.65 : 1,
            }}
          >
            {busy ? "▸ Generating…" : "▸ Generate PDF"}
          </button>
          <button
            onClick={() => setForm(BLANK)}
            style={{
              background: "transparent",
              color: "var(--sub,#94a3b8)",
              border: "1px solid var(--borderf, rgba(255,255,255,0.1))",
              borderRadius: 4,
              padding: "12px 20px",
              fontFamily: "'Geist Mono',ui-monospace,monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reset to sample
          </button>
          <div style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", fontSize: 11, color: "var(--dim,#94a3b8)", letterSpacing: "0.3px" }}>
            Saves as <strong style={{ color: "var(--text,#f0f0f0)" }}>RizeAI-case-study-{form.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "customer"}.pdf</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
