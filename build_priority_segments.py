#!/usr/bin/env python3
"""Build 8 priority outreach segments.

These are the segments I'd prioritize for a Edmonton-focused multifamily/infill developer:

CAPITAL SIDE
  S1. Edmonton MF Investors  (has email)         → main raise list
  S2. Alberta/BC Lenders + Mortgage Brokers       → debt pipeline
  S3. Out-of-province Investors interested in AB → diversification capital

DEAL SIDE
  S4. Edmonton MF Property Owners (has phone)    → off-market acquisition outreach
  S5. Alberta Land Owners with phone             → land/development sourcing
  S6. Edmonton Sellers (active selling intent)   → quick-close targets
  S7. Edmonton Realtors + Brokers                → referral network

CONTRACTOR
  S8. Edmonton Builders + Contractors            → construction team
"""
import csv, io
from collections import Counter

SRC = "/Users/sunniyaremchuk/flip-analyzer/organized_contacts.csv"

def load():
    with open(SRC, "rb") as f:
        raw = f.read().replace(b"\x00",b"").decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(raw)))

def tags(s): return [t.strip().lower() for t in s.split(";") if t.strip()]

def has(field, *needles):
    fl = field.lower()
    return any(n in fl for n in needles)

def score(r):
    return (bool(r["email"].strip()))*4 + (bool(r["phones"].strip()))*2 + (bool(r["name"].strip()))*1

def write(path, rows, why_col_value, columns_extra=None):
    rows = sorted(rows, key=score, reverse=True)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        hdr = ["status","name","email","phone","company","why_relevant","markets","roles","asset_classes","last_contact","next_action","next_action_date","notes"]
        w.writerow(hdr)
        for r in rows:
            w.writerow([
                "",  # status: blank — user fills (new/contacted/replied/meeting/committed/dead)
                r["name"].strip(),
                r["email"].strip(),
                (r["phones"].split(";")[0].strip() if r["phones"] else ""),
                r["company"].strip(),
                why_col_value(r),
                r["markets"].strip(),
                r["roles"].strip(),
                r["asset_classes"].strip(),
                "",  # last_contact
                "",  # next_action
                "",  # next_action_date
                "",  # notes
            ])
    return len(rows)

rows = load()
print(f"loaded {len(rows)} contacts\n")

# -- S1. Edmonton MF investors with email --
s1 = [r for r in rows
      if has(r["roles"], "investor","lp","capital")
      and has(r["markets"], "edmonton","alberta")
      and (has(r["asset_classes"], "multifamily","infill","mixed-use") or not r["asset_classes"].strip())
      and r["email"].strip()]
n = write("seg1_edmonton_MF_investors.csv", s1,
          lambda r: "EQUITY | "+("Edmonton/AB " if has(r["markets"],"edmonton","alberta") else "")
                    + ("multifamily/infill focus" if has(r["asset_classes"],"multifamily","infill") else "asset class TBD"))
print(f"S1  seg1_edmonton_MF_investors.csv    {n} rows  — primary raise list (has email)")

# -- S2. Alberta/BC lenders + mortgage brokers --
s2 = [r for r in rows
      if has(r["roles"], "lender","mortgage broker")
      and has(r["markets"], "edmonton","calgary","alberta","vancouver","bc")]
n = write("seg2_AB_BC_debt_sources.csv", s2,
          lambda r: ("LENDER" if "lender" in r["roles"].lower() else "MORTGAGE BROKER")
                    + " | "+r["markets"])
print(f"S2  seg2_AB_BC_debt_sources.csv       {n} rows  — debt pipeline (AB + BC)")

# -- S3. Out-of-province investors who could be diversification capital --
s3 = [r for r in rows
      if has(r["roles"], "investor","lp","capital")
      and not has(r["markets"], "edmonton","alberta")
      and r["email"].strip()]
n = write("seg3_other_market_investors.csv", s3,
          lambda r: f"EQUITY | {r['markets']} investor — pitch as AB diversification play")
print(f"S3  seg3_other_market_investors.csv   {n} rows  — out-of-province investors")

# -- S4. Edmonton MF property owners with phone (off-market acquisition) --
s4 = [r for r in rows
      if has(r["roles"], "property owner","seller")
      and has(r["markets"], "edmonton","alberta")
      and has(r["asset_classes"], "multifamily","infill","mixed-use")
      and r["phones"].strip()]
n = write("seg4_edmonton_MF_owners_to_call.csv", s4,
          lambda r: f"ACQUISITION CALL | {r['asset_classes']} | owner")
print(f"S4  seg4_edmonton_MF_owners_to_call.csv {n} rows  — off-market call list")

# -- S5. Alberta land owners --
s5 = [r for r in rows
      if has(r["roles"], "property owner","seller")
      and has(r["markets"], "edmonton","alberta","calgary")
      and has(r["asset_classes"], "land")
      and r["phones"].strip()]
n = write("seg5_AB_land_owners.csv", s5,
          lambda r: "LAND ACQUISITION CALL | "+r["markets"])
print(f"S5  seg5_AB_land_owners.csv           {n} rows  — land/development sourcing")

# -- S6. Edmonton sellers (intent-tagged) --
s6 = [r for r in rows
      if "seller" in r["roles"].lower()
      and has(r["markets"], "edmonton","alberta")]
n = write("seg6_edmonton_sellers.csv", s6,
          lambda r: f"ACTIVE SELLER | {r['asset_classes'] or 'asset class TBD'}")
print(f"S6  seg6_edmonton_sellers.csv         {n} rows  — quick-close targets")

# -- S7. Edmonton/AB realtors --
s7 = [r for r in rows
      if has(r["roles"], "realtor","agent","broker")
      and not has(r["roles"], "mortgage")
      and has(r["markets"], "edmonton","alberta","calgary")]
n = write("seg7_AB_realtors.csv", s7,
          lambda r: f"REFERRAL | {r['markets']} realtor")
print(f"S7  seg7_AB_realtors.csv              {n} rows  — broker referral network")

# -- S8. Edmonton builders + contractors --
s8 = [r for r in rows
      if has(r["roles"], "builder","contractor","developer")
      and has(r["markets"], "edmonton","alberta")]
n = write("seg8_AB_builders_contractors.csv", s8,
          lambda r: f"CONSTRUCTION | {r['roles']}")
print(f"S8  seg8_AB_builders_contractors.csv  {n} rows  — construction team")

print(f"\nAll 8 segment files written to ~/flip-analyzer/")
print(f"Each has 13 columns: status, name, email, phone, company, why_relevant, markets, roles, asset_classes, last_contact, next_action, next_action_date, notes")
print(f"→ Fill in 'status' as you work: new / contacted / replied / meeting / committed / dead")
