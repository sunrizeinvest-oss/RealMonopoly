#!/usr/bin/env python3
"""Build curated outreach lists from organized_contacts.csv.

Outputs three CSVs ready to action:
  - outreach_capital.csv    — Investors / LPs / Lenders / Mortgage brokers
  - outreach_brokers.csv    — Realtors who source deals (by market)
  - outreach_sellers.csv    — Property owners + sellers (deal sourcing)

Each row: name, email, phone, company, why_relevant, source.
Sorted: has-email-and-phone first, then has-email, then has-phone.
"""
import csv, re
from collections import Counter

SRC = "/Users/sunniyaremchuk/flip-analyzer/organized_contacts.csv"

def row_score(r):
    """Score by signal quality: email+phone > email > phone > nothing."""
    has_email = bool(r["email"].strip())
    has_phone = bool(r["phones"].strip())
    has_name  = bool(r["name"].strip())
    return (has_email and has_phone)*4 + has_email*2 + has_phone*1 + has_name*0.5

def has_any(field, keywords):
    f = field.lower()
    return any(k in f for k in keywords)

def write_list(path, rows, why_fn):
    rows = sorted(rows, key=row_score, reverse=True)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name","email","phone","company","why_relevant","markets","roles","source"])
        for r in rows:
            w.writerow([
                r["name"].strip(),
                r["email"].strip(),
                r["phones"].strip().split(";")[0] if r["phones"] else "",
                r["company"].strip(),
                why_fn(r),
                r["markets"].strip(),
                r["roles"].strip(),
                (r["sources"] or "").split(";")[0],
            ])
    return len(rows)

def _clean(s):
    return s.replace("\x00","")
with open(SRC, "rb") as fb:
    raw = fb.read().replace(b"\x00", b"").decode("utf-8", errors="replace")
import io
rows = list(csv.DictReader(io.StringIO(raw)))
print(f"loaded {len(rows)} contacts\n")

# ---- 1. Capital: investors, LPs, lenders, brokers ----
capital_kw  = ["investor","lender","mortgage broker","lp","capital","financier"]
capital = [r for r in rows if has_any(r["roles"], capital_kw)]
def why_capital(r):
    parts = []
    if has_any(r["roles"], ["investor","lp","capital"]): parts.append("equity partner")
    if "lender" in r["roles"].lower(): parts.append("debt source")
    if "mortgage" in r["roles"].lower(): parts.append("mortgage broker")
    if r["asset_classes"].strip(): parts.append(f"focus: {r['asset_classes']}")
    return " | ".join(parts) or "capital contact"
n1 = write_list("outreach_capital.csv", capital, why_capital)
print(f"outreach_capital.csv:  {n1} rows  (investors / LPs / lenders / mortgage brokers)")

# ---- 2. Brokers: realtors who can source deals ----
broker_kw = ["realtor","broker","agent"]
brokers = [r for r in rows
           if has_any(r["roles"], broker_kw)
           and not has_any(r["roles"], ["mortgage broker"])]
def why_broker(r):
    parts = ["realtor"]
    if r["markets"].strip(): parts.append(r["markets"])
    if r["asset_classes"].strip(): parts.append(r["asset_classes"])
    return " | ".join(parts)
n2 = write_list("outreach_brokers.csv", brokers, why_broker)
print(f"outreach_brokers.csv:  {n2} rows  (realtors by market & asset class)")

# ---- 3. Sellers + property owners: deal sourcing ----
seller_kw = ["seller","property owner","owner"]
sellers = [r for r in rows if has_any(r["roles"], seller_kw)]
def why_seller(r):
    parts = []
    if "property owner" in r["roles"].lower(): parts.append("property owner")
    elif "seller" in r["roles"].lower(): parts.append("seller")
    if r["markets"].strip(): parts.append(r["markets"])
    if r["asset_classes"].strip(): parts.append(r["asset_classes"])
    return " | ".join(parts) or "owner / seller"
n3 = write_list("outreach_sellers.csv", sellers, why_seller)
print(f"outreach_sellers.csv:  {n3} rows  (owners + sellers for acquisition outreach)")

# ---- Edmonton-focused multifamily LP sublist (the single hottest list for you) ----
edm_lp = [r for r in capital
          if has_any(r["markets"], ["edmonton","alberta","calgary"])
          and has_any(r["asset_classes"], ["multifamily","infill","mixed-use"])]
n4 = write_list("outreach_capital_edmonton_MF.csv", edm_lp, why_capital)
print(f"\nHIGH-PRIORITY: outreach_capital_edmonton_MF.csv:  {n4} rows")
print(f"  → Edmonton/Alberta capital with multifamily/infill focus.")
print(f"  → This is your call list for the next raise.\n")

# ---- Print top-of-list preview ----
print("Top 10 from outreach_capital_edmonton_MF.csv:")
print("-"*100)
rows2 = sorted(edm_lp, key=row_score, reverse=True)[:10]
for i, r in enumerate(rows2, 1):
    name = r["name"][:25] or "(no name)"
    email = r["email"][:30] or "—"
    phone = (r["phones"].split(";")[0] if r["phones"] else "")[:15] or "—"
    company = r["company"][:25]
    print(f"{i:2d}. {name:<25}  {email:<32}  {phone:<15}  {company}")
