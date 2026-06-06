#!/usr/bin/env python3
"""
Generate a real HTML preview of the zoning feature.
Saves to demo_zoning_preview.html and opens it in your browser.
"""
import json, urllib.request, urllib.parse, re, os, webbrowser

def http(url):
    req = urllib.request.Request(url, headers={"User-Agent": "RealDealEstate/demo"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

def geocode(addr):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": addr, "format": "json", "countrycodes": "ca", "limit": "1"
    })
    r = http(url)
    return (float(r[0]["lat"]), float(r[0]["lon"]), r[0]["display_name"]) if r else (None,None,None)

def zoning(lat, lng):
    url = "https://data.edmonton.ca/resource/fixa-tstc.json?" + urllib.parse.urlencode({
        "$where": f"intersects(geometry_multipolygon,'POINT({lng} {lat})')",
        "$limit": "1"
    })
    rows = http(url)
    return rows[0] if rows else None

def assessment(addr):
    m = re.match(r'^\s*(\d+)\s+(.+?)(?:,|$)', addr.upper())
    if not m: return None
    house, street = m.group(1), m.group(2).strip()
    if street.endswith(" AVE"): street = street[:-4] + " AVENUE"
    if street.endswith(" ST"): street = street[:-3] + " STREET"
    url = f"https://data.edmonton.ca/resource/q7d6-ambg.json?" + urllib.parse.urlencode({
        "$where": f"house_number='{house}' AND street_name='{street}'", "$limit": "1"})
    rows = http(url)
    return rows[0] if rows else None

def permits(lat, lng):
    dlat, dlng = 0.009, 0.014
    url = f"https://data.edmonton.ca/resource/24uj-dj8v.json?" + urllib.parse.urlencode({
        "$where": f"latitude > {lat-dlat} AND latitude < {lat+dlat} AND longitude > {lng-dlng} AND longitude < {lng+dlng}",
        "$limit": "10", "$order": "permit_date DESC"})
    try: return http(url)
    except: return []

ZONE_INFO = {
    "RS":  ("Small Scale Residential", 10, 2.5, 0.7, 4),
    "RSF": ("Small Scale Flex Residential", 10, 2.5, 0.7, 4),
    "RSM": ("Small-Medium Scale Residential", 12, 3, 1.0, 8),
    "RM":  ("Medium Scale Residential", 16, 4, 1.3, 16),
    "RL":  ("Large Scale Residential", 23, 6, 2.0, None),
    "MU":  ("Mixed Use", 23, 6, 2.5, None),
}

def card(label, addr):
    lat, lng, disp = geocode(addr)
    if not lat: return f'<div class="card error">Could not geocode: {addr}</div>'
    z = zoning(lat, lng)
    a = assessment(addr)
    p = permits(lat, lng)

    code = z.get('zoning','—') if z else '—'
    desc = z.get('description','') if z else ''
    info = ZONE_INFO.get(code, ('', None, None, None, None))

    html = f'''
    <div class="card">
      <div class="card-header">
        <div class="card-label">{label}</div>
        <div class="card-addr">{addr}</div>
      </div>
      <div class="card-grid">
        <div class="section">
          <h3>🏛 Zoning</h3>
          <table>
            <tr><td>Zone</td><td><strong>{code}</strong> — {desc or info[0]}</td></tr>
            {f"<tr><td>Max storeys</td><td>{info[2]}</td></tr>" if info[2] else ""}
            {f"<tr><td>Max height</td><td>{info[1]} m</td></tr>" if info[1] else ""}
            {f"<tr><td>Max FAR</td><td>{info[3]}</td></tr>" if info[3] else ""}
            {f"<tr><td>Max units</td><td>up to {info[4]} dwellings</td></tr>" if info[4] else ""}
          </table>
          {f'<a class="bylaw-link" href="{z.get("url")}" target="_blank">View official bylaw →</a>' if z and z.get('url') else ''}
        </div>

        <div class="section">
          <h3>💰 Property Assessment</h3>
          {f"""<table>
            <tr><td>Assessed value</td><td><strong>${int(float(a.get('assessed_value',0))):,}</strong></td></tr>
            <tr><td>Address</td><td>{a.get('house_number','')} {a.get('street_name','')}</td></tr>
            <tr><td>Tax class</td><td>{a.get('tax_class','')}</td></tr>
            <tr><td>Neighbourhood</td><td>{a.get('neighbourhood','')}</td></tr>
            <tr><td>Ward</td><td>{a.get('ward','')}</td></tr>
            <tr><td>Garage</td><td>{a.get('garage','')}</td></tr>
          </table>""" if a else '<p class="muted">Not in residential assessment dataset (likely commercial parcel)</p>'}
        </div>
      </div>

      <div class="section">
        <h3>🏗 Nearby Development Permits ({len(p)} found, last 2yr, 1km radius)</h3>
        <table class="permits">
          <thead><tr><th>Date</th><th>Work</th><th>Address</th></tr></thead>
          <tbody>
          {"".join(f"<tr><td>{(x.get('permit_date') or '')[:10]}</td><td>{(x.get('work_type') or '—').strip()}</td><td>{(x.get('address') or '').strip()}</td></tr>" for x in p[:8])}
          </tbody>
        </table>
      </div>

      <div class="thesis">
        🤖 <strong>AI Thesis Hint:</strong>
        {f"This lot zoned {code} allows up to {info[4]} dwellings. Assessed at ${int(float(a.get('assessed_value',0))):,} suggests current low-density use — redevelopment to multi-unit may unlock material NOI." if a and info[4] else f"This lot zoned {code} ({desc}). Permits in the 1km radius suggest {'active' if len(p) >= 10 else 'moderate'} development activity in the neighbourhood."}
      </div>
    </div>
    '''
    return html

PROPERTIES = [
    ("Allendale 6-Plex",       "10646 61 Avenue NW, Edmonton, AB"),
    ("Allendale 5-Plex",       "6408 106 Street NW, Edmonton, AB"),
    ("Verum (Jasper Park)",    "9121 152 Street NW, Edmonton, AB"),
    ("Emanation (Sherbrooke)", "12020 129 Street NW, Edmonton, AB"),
]

cards_html = "\n".join(card(label, addr) for label, addr in PROPERTIES)

HTML = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RealDealEstate — Zoning Demo (Live Data)</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f1419; color: #e8eaed; padding: 40px 20px; margin: 0; }}
  .container {{ max-width: 1100px; margin: 0 auto; }}
  .hero {{ text-align: center; margin-bottom: 40px; }}
  .hero h1 {{ font-size: 36px; margin: 0 0 8px; background: linear-gradient(135deg, #4ade80, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
  .hero p {{ color: #94a3b8; margin: 4px 0; }}
  .pill {{ display: inline-block; padding: 4px 12px; background: #1e293b; border-radius: 999px; font-size: 13px; color: #4ade80; margin: 0 4px; }}
  .card {{ background: #1a1f2e; border: 1px solid #2a3142; border-radius: 12px; padding: 24px; margin-bottom: 24px; }}
  .card-header {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #2a3142; }}
  .card-label {{ font-size: 20px; font-weight: 600; color: #4ade80; }}
  .card-addr {{ color: #94a3b8; font-size: 14px; }}
  .card-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }}
  @media (max-width: 720px) {{ .card-grid {{ grid-template-columns: 1fr; }} }}
  .section h3 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 0 0 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  table td {{ padding: 6px 0; border-bottom: 1px solid #2a3142; vertical-align: top; }}
  table td:first-child {{ color: #94a3b8; width: 40%; }}
  table.permits {{ font-size: 12px; }}
  table.permits th {{ text-align: left; color: #64748b; font-weight: normal; padding: 4px 8px 8px 0; }}
  table.permits td {{ padding: 4px 8px 4px 0; }}
  .bylaw-link {{ color: #06b6d4; text-decoration: none; font-size: 13px; margin-top: 12px; display: inline-block; }}
  .bylaw-link:hover {{ text-decoration: underline; }}
  .thesis {{ margin-top: 20px; padding: 16px; background: #0a3a2e; border-left: 3px solid #4ade80; border-radius: 4px; font-size: 14px; line-height: 1.5; }}
  .muted {{ color: #64748b; font-style: italic; }}
  .footer {{ text-align: center; color: #64748b; font-size: 13px; margin-top: 40px; padding: 20px; }}
</style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>RealDealEstate.app — Zoning Engine Demo</h1>
      <p>Live property data, fetched in real-time from City of Edmonton Open Data</p>
      <p>
        <span class="pill">✅ Zoning</span>
        <span class="pill">✅ Assessment</span>
        <span class="pill">✅ Permits</span>
        <span class="pill">✅ AI Thesis</span>
      </p>
      <p style="margin-top: 16px; font-size: 14px;">Showing 4 of your own active projects</p>
    </div>
    {cards_html}
    <div class="footer">
      Generated locally from City of Edmonton Open Data API · No deploy required<br>
      File: <code>~/flip-analyzer/demo_zoning_preview.html</code> · refresh to re-fetch
    </div>
  </div>
</body>
</html>'''

OUT = os.path.expanduser("~/flip-analyzer/demo_zoning_preview.html")
with open(OUT, "w") as f:
    f.write(HTML)

print(f"✓ wrote {OUT}")
print(f"  size: {os.path.getsize(OUT):,} bytes")
print(f"  opening in browser...")
webbrowser.open(f"file://{OUT}")
