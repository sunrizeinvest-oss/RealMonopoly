#!/usr/bin/env python3
"""Precision contact segmentation.

Examples:
  python3 segment.py --roles investor --markets edmonton --asset_classes multifamily --has_email
  python3 segment.py --roles "property owner" --markets edmonton --asset_classes multifamily --has_phone --limit 100 --out hot_targets.csv
  python3 segment.py --roles realtor --markets calgary --has_email
  python3 segment.py --roles lender --has_email
  python3 segment.py --any  # show all unique tag values
"""
import csv, io, sys, argparse
from collections import Counter

SRC = "/Users/sunniyaremchuk/flip-analyzer/organized_contacts.csv"

def load():
    with open(SRC, "rb") as f:
        raw = f.read().replace(b"\x00",b"").decode("utf-8", errors="replace")
    return list(csv.DictReader(io.StringIO(raw)))

def tags(field): return [t.strip().lower() for t in field.split(";") if t.strip()]

def match(row, args):
    if args.has_email and not row["email"].strip(): return False
    if args.has_phone and not row["phones"].strip(): return False
    if args.has_name and not row["name"].strip(): return False
    if args.roles:
        wanted = [r.lower() for r in args.roles]
        if not any(any(w in t for t in tags(row["roles"])) for w in wanted): return False
    if args.markets:
        wanted = [m.lower() for m in args.markets]
        if not any(any(w in t for t in tags(row["markets"])) for w in wanted): return False
    if args.asset_classes:
        wanted = [a.lower() for a in args.asset_classes]
        if not any(any(w in t for t in tags(row["asset_classes"])) for w in wanted): return False
    if args.strategies:
        wanted = [s.lower() for s in args.strategies]
        if not any(any(w in t for t in tags(row["strategies"])) for w in wanted): return False
    if args.company:
        if args.company.lower() not in row["company"].lower(): return False
    return True

def score(r):
    has_email = bool(r["email"].strip())
    has_phone = bool(r["phones"].strip())
    has_name  = bool(r["name"].strip())
    return has_email*4 + has_phone*2 + has_name*1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--roles", nargs="+")
    ap.add_argument("--markets", nargs="+")
    ap.add_argument("--asset_classes", nargs="+")
    ap.add_argument("--strategies", nargs="+")
    ap.add_argument("--company")
    ap.add_argument("--has_email", action="store_true")
    ap.add_argument("--has_phone", action="store_true")
    ap.add_argument("--has_name", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--out")
    ap.add_argument("--any", action="store_true", help="Show all unique tag values")
    args = ap.parse_args()

    rows = load()

    if args.any:
        for field in ["roles","asset_classes","markets","strategies"]:
            print(f"\n=== {field} ===")
            c = Counter()
            for r in rows:
                for t in tags(r[field]): c[t] += 1
            for v,n in c.most_common(): print(f"  {n:6d}  {v}")
        return

    out = [r for r in rows if match(r, args)]
    out.sort(key=score, reverse=True)
    if args.limit: out = out[:args.limit]

    if args.out:
        with open(args.out, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["name","email","phone","company","roles","asset_classes","markets","strategies","sources"])
            for r in out:
                w.writerow([
                    r["name"].strip(),
                    r["email"].strip(),
                    (r["phones"].split(";")[0].strip() if r["phones"] else ""),
                    r["company"].strip(),
                    r["roles"].strip(),
                    r["asset_classes"].strip(),
                    r["markets"].strip(),
                    r["strategies"].strip(),
                    (r["sources"].split(";")[0].strip() if r["sources"] else ""),
                ])
        print(f"wrote {len(out)} rows to {args.out}")
    else:
        print(f"Matched {len(out)} contacts\n")
        for r in out[:20]:
            print(f"  {r['name'][:25]:<25}  {r['email'][:30]:<30}  {(r['phones'].split(';')[0] if r['phones'] else '')[:14]:<14}  {r['company'][:30]}")
        if len(out) > 20:
            print(f"  ... and {len(out)-20} more (use --out file.csv to save)")

if __name__ == "__main__":
    main()
