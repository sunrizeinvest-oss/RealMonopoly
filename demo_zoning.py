#!/usr/bin/env python3
"""
Live demo: real Edmonton open data, formatted like the app would show it.
"""
import json, urllib.request, urllib.parse

def http(url):
    req = urllib.request.Request(url, headers={"User-Agent": "RealDealEstate/demo"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

def geocode(address):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": address, "format": "json", "countrycodes": "ca", "limit": "1"
    })
    r = http(url)
    if not r: raise Exception(f"no geocode for {address}")
    return float(r[0]["lat"]), float(r[0]["lon"]), r[0]["display_name"]

# Edmonton zoning is a polygon dataset — use intersects() with a POINT
def zoning(lat, lng):
    url = f"https://data.edmonton.ca/resource/fixa-tstc.json?" + urllib.parse.urlencode({
        "$where": f"intersects(geometry_multipolygon, 'POINT({lng} {lat})')",
        "$limit": "1"
    })
    rows = http(url)
    return rows[0] if rows else None

def assessment(address):
    # Parse "10646 61 Avenue NW" → house_number=10646, street_name="61 AVENUE NW"
    import re
    m = re.match(r'^\s*(\d+)\s+(.+?)(?:,|$)', address.upper())
    if not m: return None
    house = m.group(1)
    street = m.group(2).strip()
    # Normalize: "AVENUE" vs "AVE", etc. Edmonton dataset uses full words.
    street = street.replace(" AVE ", " AVENUE ").replace(" ST ", " STREET ").rstrip()
    if street.endswith(" AVE"): street = street[:-4] + " AVENUE"
    if street.endswith(" ST"): street = street[:-3] + " STREET"
    url = f"https://data.edmonton.ca/resource/q7d6-ambg.json?" + urllib.parse.urlencode({
        "$where": f"house_number='{house}' AND street_name='{street}'",
        "$limit": "1"
    })
    try:
        rows = http(url)
        return rows[0] if rows else None
    except Exception as e:
        return None

def permits(lat, lng):
    # Permits dataset uses latitude/longitude fields too
    dlat, dlng = 0.009, 0.014  # ~1km
    url = f"https://data.edmonton.ca/resource/24uj-dj8v.json?" + urllib.parse.urlencode({
        "$where": f"latitude > {lat-dlat} AND latitude < {lat+dlat} AND longitude > {lng-dlng} AND longitude < {lng+dlng}",
        "$limit": "20", "$order": "permit_date DESC"
    })
    try:
        return http(url)
    except Exception:
        return []

# ─── Zone code → defaults from Edmonton Bylaw 20001 ──────────────────────────
ZONE_INFO = {
    "RS":  ("Small Scale Residential", 10, 2.5, 0.7, 4),
    "RSF": ("Small Scale Flex Residential", 10, 2.5, 0.7, 4),
    "RSM": ("Small-Medium Scale Residential", 12, 3, 1.0, 8),
    "RM":  ("Medium Scale Residential", 16, 4, 1.3, 16),
    "RL":  ("Large Scale Residential", 23, 6, 2.0, None),
    "MU":  ("Mixed Use", 23, 6, 2.5, None),
    "CB":  ("Commercial Boulevard", 16, 4, 2.0, None),
    "CG":  ("Commercial General", 12, 3, 1.5, None),
    "BE":  ("Business Employment", 12, 3, 1.0, None),
}

def show(address):
    print("═"*72)
    print(f"  📍  {address}")
    print("═"*72)
    lat, lng, display = geocode(address)
    print(f"     {display[:65]}\n")

    z = zoning(lat, lng)
    if z:
        code = z.get('zoning', '')
        defaults = ZONE_INFO.get(code, ("", None, None, None, None))
        desc, mh, ms, far, mu = defaults
        print("  🏛  ZONING")
        print(f"     Zone:        {code}  —  {z.get('description', desc)}")
        if ms:  print(f"     Max storeys: up to {ms}")
        if mh:  print(f"     Max height:  {mh} m")
        if far: print(f"     Max FAR:     {far}")
        if mu:  print(f"     Max units:   up to {mu} dwellings")
        if z.get('url'): print(f"     Bylaw link:  {z['url']}")
        print()

    a = assessment(address)
    if a:
        print("  💰  PROPERTY ASSESSMENT")
        print(f"     Address:        {a.get('house_number','')} {a.get('street_name','')}")
        print(f"     Assessed value: ${int(float(a.get('assessed_value', 0))):,}")
        print(f"     Tax class:      {a.get('tax_class','')}")
        print(f"     Neighbourhood:  {a.get('neighbourhood','')}")
        print(f"     Ward:           {a.get('ward','')}")
        print(f"     Garage:         {a.get('garage','')}")
        print()

    p = permits(lat, lng)
    if p:
        print(f"  🏗  RECENT NEARBY PERMITS  ({len(p)} found within 1km)")
        for x in p[:5]:
            d = (x.get('permit_date') or '')[:10]
            t = (x.get('work_type') or '').strip()[:18] or '—'
            c = (x.get('permit_class') or '').strip()[:22] or '—'
            ad = (x.get('address') or '').strip()[:32]
            print(f"     {d}  {t:18s}  {c:22s}  {ad}")
        print()

    # AI-thesis hint
    if z and a:
        code = z.get('zoning', '')
        val = int(float(a.get('assessed_value', 0)))
        defaults = ZONE_INFO.get(code, (None,)*5)
        max_units = defaults[4]
        if max_units and max_units > 1:
            print(f"  🤖  AI THESIS HINT")
            print(f"     Zoning allows up to {max_units} dwellings on this lot.")
            print(f"     Assessed value ${val:,} suggests current SFH/duplex configuration.")
            print(f"     → Redevelopment to multi-unit may unlock material NOI.")
            print()

addresses = [
    "10646 61 Avenue NW, Edmonton, AB",
    "9121 152 Street NW, Edmonton, AB",
    "12020 129 Street NW, Edmonton, AB",
    "6408 106 Street NW, Edmonton, AB",
]
for a in addresses:
    try: show(a)
    except Exception as e: print(f"  ⚠ {e}\n")
