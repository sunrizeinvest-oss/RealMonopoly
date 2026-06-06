#!/usr/bin/env python3
"""Extract Co-Star property-owner records (company, city, province, type, secondary_type, phone)
from Drive read_file_content saved results.

Reads costar_path_map.json: list of {path, title, url}.
Each path is either a JSON file with {fileContent: "..."} OR a raw text file.
The natural-language text from Drive flattens rows of CSV onto a single line
with each row prefixed by " ," — we recover rows by splitting on that anchor.
Phone is normalized; rows without a recognizable phone are dropped (since the
user's goal is phone outreach).
"""
import os, re, json, csv, sys

PATH_MAP = "/Users/sunniyaremchuk/flip-analyzer/costar_path_map.json"
OUT_JSONL = "/Users/sunniyaremchuk/flip-analyzer/costar_records.jsonl"

# Co-Star phone formats include: (604) 879-7368, 1 (212) 583-5000, 011 49 4904 06056316
PHONE_RE = re.compile(
    r"(?:1\s)?(?:\(\d{3}\)|\d{3})[\s.\-]?\d{3}[\s.\-]?\d{4}"
    r"|\b011\s\d{2,4}(?:\s\d{1,8})+"
)

# Lines that aren't records
SKIP_FIELDS = {"company name", "name", "rank", "buyers-mf", "sellers-mf",
               "buyers-land", "sellers-land", "buyers-hos", "sellers-hos",
               "buyers-all", "sellers-all", "buyers-hol", "sellers-hol",
               "company address", "phone", "city", "province", "type"}

def read_text(path):
    if not os.path.exists(path): return ""
    raw = open(path, errors="ignore").read()
    try:
        d = json.loads(raw)
        if isinstance(d, dict) and "fileContent" in d:
            return d["fileContent"]
    except Exception:
        pass
    return raw

def split_rows(text):
    """Each CSV row in the natural-language text is prefixed by ' ,' (the leading
    blank cell becomes a leading separator). Split on that pattern."""
    # First strip the leading 'export ' or sheet-name header
    parts = re.split(r"\s,(?=[\"A-Za-z0-9])", text)
    return [p.strip() for p in parts if p.strip()]

def parse_csv_row(row):
    """Lightweight CSV parser tolerant of quoted fields."""
    out = []
    cur = ""
    in_q = False
    for ch in row:
        if ch == '"':
            in_q = not in_q
            continue
        if ch == "," and not in_q:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out]

def looks_like_header(cells):
    joined = " ".join(c.lower() for c in cells[:6])
    return ("company name" in joined and "city" in joined) or \
           cells[0].lower() in SKIP_FIELDS

def find_phone(text):
    m = PHONE_RE.search(text)
    return m.group(0).strip() if m else ""

def norm_phone(p):
    d = re.sub(r"\D", "", p)
    if not d: return ""
    # 11-digit starting with 1 -> 10-digit NA
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    if len(d) == 10:
        return f"({d[0:3]}) {d[3:6]}-{d[6:10]}"
    # international: return digits with leading +
    return "+" + d

def extract_records(text, source, url):
    rows = split_rows(text)
    out = []
    for row in rows:
        cells = parse_csv_row(row)
        if len(cells) < 4: continue
        if looks_like_header(cells): continue
        company = cells[0].strip().strip('"')
        if not company or company.lower() in SKIP_FIELDS: continue
        # Co-Star pattern (Property Owners ranked): rank,Company,Type,Secondary,City,Province,...,Phone,...
        # Co-Star pattern (Sales export): Company,City,Province,Type,Secondary,#Sales,...,Phone,Address,Postal
        # Try to detect rank-prefix variant: cells[0] is a small integer
        if re.fullmatch(r"\d{1,4}", company):
            # rank,company,type,secondary,city,province,...phone...
            if len(cells) < 6: continue
            company = cells[1].strip().strip('"')
            ctype = cells[2].strip()
            sec = cells[3].strip()
            city = cells[4].strip()
            prov = cells[5].strip() if len(cells) > 5 else ""
        else:
            city = cells[1].strip() if len(cells) > 1 else ""
            prov = cells[2].strip() if len(cells) > 2 else ""
            ctype = cells[3].strip() if len(cells) > 3 else ""
            sec = cells[4].strip() if len(cells) > 4 else ""
        # phone lives somewhere in the row — search whole row
        phone = norm_phone(find_phone(row))
        if not phone: continue
        out.append({
            "company": company,
            "city": city,
            "province": prov,
            "type": ctype,
            "secondary_type": sec,
            "phone": phone,
            "source": source,
            "source_url": url,
        })
    return out

def main():
    mp = json.load(open(PATH_MAP))
    n_files = 0; n_recs = 0
    with open(OUT_JSONL, "w") as out:
        for e in mp:
            text = read_text(e["path"])
            if not text:
                print("missing/empty:", e["path"], file=sys.stderr); continue
            recs = extract_records(text, e["title"], e["url"])
            for r in recs:
                out.write(json.dumps(r) + "\n")
            n_files += 1; n_recs += len(recs)
            print(f"  {len(recs):5d} records from {e['title'][:60]}", file=sys.stderr)
    print(f"\nDONE: {n_files} files -> {n_recs} raw company-phone records", file=sys.stderr)

if __name__ == "__main__":
    main()
