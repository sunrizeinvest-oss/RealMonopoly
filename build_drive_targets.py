#!/usr/bin/env python3
"""Build the target list of Drive files to read for contact extraction."""
import json, re

with open("/Users/sunniyaremchuk/flip-analyzer/drive_inv_p12.json") as f:
    inv = json.load(f)

# Manually add page-3 contact-likely entries (from the inline search result).
# Format: (id, title, mimeType-short)
PAGE3_CONTACT = [
    ("1MvGuP_ckRXuNBLNFeo7tksuXW9sB6UHy", "Builders_Developers INFO (email_numbers) .xlsx", "sheet"),
    ("1Ftkf6bR4T2ZrTDhcWhNek40lZRlR2fMH", "Bea LinkedIN.xlsx", "sheet"),
    ("1j2SkchM-j2x-diKJVt6NqvORV3UfwJjR", "Developer & Builders  (1) addded to monday .xlsx", "sheet"),
    ("1rZ0Rj3-UKWxYv8PBPek38xdcimV9G3Mi", "Copy of Co-Star: Edmonton, Multifamily Sellers, 2014-2022, 1-4 stars.xlsx", "sheet"),
    ("19rEqkAEDaeQG5DbU05VF0W0nECtPH8w1", "Developer & Builders  (1).xlsx", "sheet"),
    ("13lauypPnyCqtzDvlUezawvKBLABqwb5d", "5K Canada list 0.csv", "csv"),
    ("1tx9t0SqB4QliuS3tTE91trJ4iMHnk1Md", "5K Canada list 0.csv", "csv"),
    ("1bR2sEswixtJlnH003WBgsTSvC-dg2PsG", "Section8_Buyer_HitList.xlsx", "sheet"),
    ("1BggR9B2ebfrNTnDyw73CsrOT0PlQRMa6", "High_Ticket_Lead_Tracker.xlsx", "sheet"),
    ("1kUv3YQ5oY3RBb5aQ4GWLkaaWuMs-1w1p", "Builder Resume.xlsx", "sheet"),
]

# Allowlist substrings (case-insensitive) — title-based heuristic for contact files.
ALLOW = [
    "buyer", "seller", "investor", "builder", "developer", "contractor",
    "realtor", "agent", "lead", "contact", "crm", "hubspot", "linkedin",
    "outreach", "co-star", "costar", "5k canada", "naturopathic",
    "mycontacts", "hit_list", "hitlist", "distressed", "land sold",
    "land sellers", "land bought", "home owners", "commercial",
    "lender", "section8", "ticket_lead", "leads", "export",
    "edmonton all assets", "private",
]

def is_contact_likely(title):
    t = title.lower()
    return any(k in t for k in ALLOW)

targets = []
for r in inv:
    if r["mt"] == "text/csv" or is_contact_likely(r["title"]):
        targets.append({"id": r["id"], "title": r["title"], "mt": r["mt"], "url": r["url"]})

# Add page-3 manually selected contact-likely entries
for fid, title, mt in PAGE3_CONTACT:
    if not any(t["id"] == fid for t in targets):
        targets.append({"id": fid, "title": title, "mt": mt, "url": f"https://drive.google.com/file/d/{fid}/view"})

# De-dupe by id
seen = set(); uniq = []
for t in targets:
    if t["id"] in seen: continue
    seen.add(t["id"]); uniq.append(t)

json.dump(uniq, open("/Users/sunniyaremchuk/flip-analyzer/drive_targets.json","w"), indent=2)
print("contact-likely targets:", len(uniq))
for t in uniq:
    print(" ", t["title"][:80])
