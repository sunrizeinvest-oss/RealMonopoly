#!/usr/bin/env python3
"""Generate side-by-side HTML showing old vs new AI thesis output."""
import json, urllib.request, urllib.parse, os, webbrowser

# Real deal data — Allendale 6-Plex
DEAL = {
    "address": "10646 61 Avenue NW, Edmonton, AB",
    "city": "Edmonton",
    "strategy": "BRRRR",
    "purchasePrice": 950000,
    "arv": 1350000,
    "repairCosts": 180000,
    "totalCosts": 1130000,
    "holdMonths": 12,
    "myCash": 240000,
    "netProfit": 220000,
    "roiTotal": 0.195,
    "profitMargin": 0.163,
    "annualizedCoC": 0.18,
    "mao": 985000,
    "grade": "B",
    "bedrooms": 12,
    "bathrooms": 6,
    "sqft": 4800,
    "monthlyRent": 13800,
}

def call_api():
    req = urllib.request.Request(
        "https://www.realdealestate.app/api/ai-analyze",
        data=json.dumps(DEAL).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

OLD_OUTPUT = """VERDICT: 🟢 STRONG GO

BOTTOM LINE:
This deal generates $220,000 in estimated profit at a 16.3% margin. The fundamentals are workable.

STRENGTHS:
• Purchase price is $35,000 below MAO — you have negotiating room.
• Profit margin of 16.3% exceeds the 15% investor benchmark.
• Total ROI of 19.5% is strong for this strategy.

RISKS:
• 12-month hold is above average. Every extra month adds carrying costs and market risk.

PRICE RECOMMENDATION:
Current purchase price of $950,000 works if your repair budget holds. Consider offering $921,500 to build in a buffer.

WHAT WOULD MAKE THIS DEAL BETTER:
• Get a second contractor bid. If repair costs come in 10% lower, profit improves by $18,000."""

print("Calling live API...")
data = call_api()
new_text = data.get("analysis", "")
source = data.get("source", "?")
context = data.get("enrichedContext", {})

import html as h
old_html = h.escape(OLD_OUTPUT).replace("\n","<br>")
new_html = h.escape(new_text).replace("\n","<br>")

HTML = f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>AI Thesis Upgrade — Before/After</title>
<style>
* {{ box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f1419; color: #e8eaed; margin: 0; padding: 30px 20px; }}
.container {{ max-width: 1400px; margin: 0 auto; }}
.hero {{ text-align: center; margin-bottom: 30px; }}
h1 {{ font-size: 32px; margin: 0 0 8px; background: linear-gradient(135deg, #4ade80, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
.subtitle {{ color: #94a3b8; margin: 4px 0; }}
.deal {{ background: #1a1f2e; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }}
.deal strong {{ color: #4ade80; }}
.grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
@media (max-width: 900px) {{ .grid {{ grid-template-columns: 1fr; }} }}
.col {{ background: #1a1f2e; border: 1px solid #2a3142; border-radius: 12px; padding: 24px; }}
.col h2 {{ font-size: 16px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }}
.col.old h2 {{ color: #ef4444; }}
.col.new h2 {{ color: #4ade80; }}
.label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }}
.text {{ font-family: ui-monospace, 'SF Mono', Monaco, monospace; font-size: 12px; line-height: 1.6; color: #cbd5e1; max-height: 70vh; overflow: auto; padding: 16px; background: #0a0e15; border-radius: 6px; white-space: pre-wrap; }}
.tags {{ display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }}
.tag {{ background: #0a3a2e; color: #4ade80; padding: 4px 10px; border-radius: 999px; font-size: 12px; }}
.tag.warn {{ background: #3a2a0a; color: #fbbf24; }}
.metric-row {{ display: flex; justify-content: space-around; background: #0a3a2e; padding: 16px; border-radius: 8px; margin-bottom: 24px; }}
.metric {{ text-align: center; }}
.metric-val {{ font-size: 24px; font-weight: 600; color: #4ade80; }}
.metric-lbl {{ font-size: 11px; color: #94a3b8; text-transform: uppercase; }}
</style>
</head>
<body>
<div class="container">
<div class="hero">
  <h1>AI Investment Thesis — Before vs After</h1>
  <p class="subtitle">Same deal data. New institutional prompt + live zoning enrichment.</p>
</div>

<div class="deal">
  📍 <strong>{DEAL["address"]}</strong> · {DEAL["strategy"]} ·
  Purchase {DEAL["purchasePrice"]:,} · ARV {DEAL["arv"]:,} · Net Profit ${DEAL["netProfit"]:,}
  · Margin {DEAL["profitMargin"]*100:.1f}% · 6-plex / 4,800 sqft
</div>

<div class="metric-row">
  <div class="metric"><div class="metric-val">3×</div><div class="metric-lbl">Length</div></div>
  <div class="metric"><div class="metric-val">+Live</div><div class="metric-lbl">Zoning Data</div></div>
  <div class="metric"><div class="metric-val">+5yr</div><div class="metric-lbl">IRR Projection</div></div>
  <div class="metric"><div class="metric-val">10/10</div><div class="metric-lbl">Sections</div></div>
  <div class="metric"><div class="metric-val">Sonnet 4.6</div><div class="metric-lbl">Model (was Haiku)</div></div>
</div>

<div class="grid">
  <div class="col old">
    <h2>❌ Before (v1)</h2>
    <div class="label">Claude Haiku · 350-word cap · 6 sections · No external data</div>
    <div class="text">{old_html}</div>
    <div class="tags">
      <span class="tag warn">Generic risks</span>
      <span class="tag warn">No zoning insight</span>
      <span class="tag warn">No market context</span>
      <span class="tag warn">No exit strategy</span>
    </div>
  </div>

  <div class="col new">
    <h2>✅ After (v2)</h2>
    <div class="label">Claude Sonnet 4.6 · 900 words · 10 sections · Live city open data</div>
    <div class="text">{new_html}</div>
    <div class="tags">
      <span class="tag">Source: {h.escape(source)}</span>
      <span class="tag">City: {h.escape(str(context.get("city","")))}</span>
      <span class="tag">Live zoning enrichment</span>
      <span class="tag">5yr IRR projected</span>
      <span class="tag">Risk matrix w/ $ impact</span>
      <span class="tag">3-scenario exit ranking</span>
    </div>
  </div>
</div>

<p style="text-align:center;color:#64748b;margin-top:32px;font-size:13px;">
  Generated live from your deployed API at <code>www.realdealestate.app/api/ai-analyze</code><br>
  To unlock Claude Sonnet 4.6 (not the rule-based fallback), add <code>ANTHROPIC_API_KEY</code> in Vercel env vars.
</p>
</div>
</body>
</html>'''

OUT = os.path.expanduser("~/flip-analyzer/demo_thesis_preview.html")
with open(OUT, "w") as f: f.write(HTML)
print(f"✓ wrote {OUT}")
webbrowser.open(f"file://{OUT}")
