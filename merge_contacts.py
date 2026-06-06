#!/usr/bin/env python3
"""Merge local + Drive raw contact records into a deduplicated CSV.

Group by email (lowercased). Within a group, union phones, pick a best name,
pick a best company, and list distinct source files. Phone numbers are
normalized to digits-only for dedup but presented in a readable format.
"""
import os, json, re, csv

HOME = os.path.expanduser("~")

# ---------- load ----------
local_path = os.path.join(HOME, "flip-analyzer", "local_contacts_raw.json")
drive_path = os.path.join(HOME, "flip-analyzer", "drive_contacts_raw.jsonl")

records = []
with open(local_path) as f:
    for r in json.load(f):
        r["origin"] = "local"
        records.append(r)
if os.path.exists(drive_path):
    with open(drive_path) as f:
        for line in f:
            line = line.strip()
            if not line: continue
            r = json.loads(line)
            r["origin"] = "drive"
            records.append(r)
print(f"loaded {len(records)} raw records")

# ---------- normalize phones ----------
def norm_phone(p):
    d = re.sub(r"\D", "", p)
    if len(d) == 11 and d.startswith("1"): d = d[1:]
    if len(d) != 10: return None
    return f"({d[0:3]}) {d[3:6]}-{d[6:10]}"

# ---------- merge ----------
def is_better_name(new, old):
    if not new: return False
    if not old: return True
    # prefer multi-word names over single-word
    return new.count(" ") > old.count(" ")

groups = {}
for r in records:
    em = r["email"].lower().strip()
    if not em or "@" not in em: continue
    g = groups.setdefault(em, {
        "email": em,
        "names": set(),
        "phones": set(),
        "companies": set(),
        "sources": set(),
        "origins": set(),
        "occurrences": 0,
    })
    g["occurrences"] += 1
    if r.get("name"):
        g["names"].add(r["name"].strip())
    for p in r.get("phones", []):
        n = norm_phone(p)
        if n: g["phones"].add(n)
    if r.get("company"):
        g["companies"].add(r["company"].strip().lower())
    # source basename
    src = r.get("source", "")
    if src:
        if r.get("origin") == "local":
            g["sources"].add(os.path.basename(src))
        else:
            g["sources"].add(f"[Drive] {src}")
    g["origins"].add(r.get("origin", "?"))

# ---------- best name picker ----------
def best_name(names):
    if not names: return ""
    # filter out obvious garbage (single capitalized words look like headers)
    candidates = [n for n in names if n and len(n) > 1]
    if not candidates: return ""
    # prefer multi-word
    multi = [n for n in candidates if " " in n]
    pool = multi if multi else candidates
    # pick most common, then longest
    from collections import Counter
    c = Counter(pool)
    return c.most_common(1)[0][0]

# ---------- write CSV ----------
out_path = os.path.join(HOME, "flip-analyzer", "contacts.csv")
rows = []
for em, g in groups.items():
    rows.append({
        "name": best_name(g["names"]),
        "email": em,
        "phones": "; ".join(sorted(g["phones"])),
        "company": "; ".join(sorted(g["companies"])) if g["companies"] else "",
        "occurrences": g["occurrences"],
        "origin": "+".join(sorted(g["origins"])),
        "sources": " | ".join(sorted(g["sources"]))[:500],
    })

# sort: phones-present first, then by name, then email
rows.sort(key=lambda r: (0 if r["phones"] else 1, r["name"].lower() if r["name"] else "~", r["email"]))

with open(out_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["name","email","phones","company","occurrences","origin","sources"])
    w.writeheader()
    w.writerows(rows)

# ---------- summary ----------
n_total = len(rows)
n_phone = sum(1 for r in rows if r["phones"])
n_name = sum(1 for r in rows if r["name"])
n_both = sum(1 for r in rows if r["phones"] and r["name"])
local_only = sum(1 for r in rows if r["origin"] == "local")
drive_only = sum(1 for r in rows if r["origin"] == "drive")
both = sum(1 for r in rows if "local" in r["origin"] and "drive" in r["origin"])
print(f"\n=== contacts.csv written: {out_path} ===")
print(f"unique emails: {n_total}")
print(f"  with phone(s): {n_phone}")
print(f"  with a name:   {n_name}")
print(f"  with both:     {n_both}")
print(f"  local only:    {local_only}")
print(f"  drive only:    {drive_only}")
print(f"  in both:       {both}")
