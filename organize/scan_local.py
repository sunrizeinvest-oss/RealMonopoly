#!/usr/bin/env python3
"""Walk ~/ for documents; hash each; detect project + subfolder.
Output: organize/local_inventory.json (one dict per file).
"""
import os, re, json, hashlib, sys
from collections import defaultdict

HOME = os.path.expanduser("~")
OUT = os.path.join(HOME, "flip-analyzer", "organize", "local_inventory.json")
SUMMARY = os.path.join(HOME, "flip-analyzer", "organize", "local_scan_summary.txt")

EXCLUDE_DIRS = (
    "/Library/", "/.Trash/", "/.cache/", "/.npm/", "/node_modules/", "/.venv/",
    "/.git/", "/Photos Library.photoslibrary/", "/CapCut/", "/.claude/",
    "/.local/", "/.cocoapods/", "/site-packages/", "/Movies/Music/",
    "/.zsh_sessions/", "/.vscode/",
    # exclude the working/output dirs of this very pipeline
    "/flip-analyzer/organize/", "/flip-analyzer/drive_inline/",
    "/flip-analyzer/.vercel/",
)

DOC_EXTS = {".pdf",".docx",".doc",".xlsx",".xls",".csv",".txt",".rtf",".md",
            ".numbers",".pages",".key",".ppt",".pptx",".odt",".ods"}
IMG_EXTS = {".jpg",".jpeg",".png",".heic",".heif",".tiff",".tif",".gif",".webp",".bmp",".svg"}
DRAW_EXTS = {".dwg",".dxf",".skp",".rvt"}
ARCHIVE_EXTS = {".zip",".rar",".7z"}
WANTED_EXTS = DOC_EXTS | IMG_EXTS | DRAW_EXTS | ARCHIVE_EXTS

MAX_HASH_BYTES = 250 * 1024 * 1024  # don't hash files >250MB

# ---------- project detection ----------
# Known project labels (in order of preference)
PROJECT_LABELS = [
    "Allendale 6-Plex",   # 10646 61 Ave NW
    "Allendale 5-Plex",   # 6408 106 St (could be the other allendale)
    "Allendale 2",
    "Allendale",          # generic catch
    "Mayfield 110",
    "Mayfield",
    "Jasper Park",
    "Sherbrooke",
    "Inglewood 6-Plex",   # 11328 126 St
    "Inglewood 9-Plex",
    "Inglewood",
    "High Park",          # 9-unit
    "Forest Heights 6-Plex",
    "Forest Heights",
    "Ritchie 8-Plex",
    "Ritchie",
    "Lake Ridge",
    "Solomon",
    "Westmount",
    "Hazardous Sites",
    "Gazette",
    "Distressed Property Outreach",
    "Manhattan",
    "In-Between Homes",
    "10646 61 Ave",
    "10612 127 Street",
    "15981 110B Ave",
    "11328 126 St",
    "12020 129 St",
    "10848 153 St",
    "9121 152",
    "106 Street Property",
    "6729",
    "6408 106",
    "9107 84",
    "Spruce Avenue",
]

# Compiled regexes
PROJECT_RE = [(label, re.compile(re.escape(label).replace(r"\ ",r"[\s_-]+"), re.I))
              for label in PROJECT_LABELS]

# Generic address pattern (Edmonton-style street addressing)
ADDR_RE = re.compile(
    r"\b(\d{3,5})\s*[\-_ ]?\s*(\d{1,3}[A-Z]?)\s+(?:Ave|Avenue|St|Street|Dr|Drive|Cres|Crescent|Rd|Road|Blvd|Way|Place|Pl|NW|SW|NE|SE)\b",
    re.I)
# Simpler: 5-digit + (whitespace) + 2-3-digit + word
ADDR_RE2 = re.compile(r"\b(\d{4,5})\s+(\d{1,3}[A-Z]?)\b", re.I)

def detect_project(filename):
    # 1) known labels first
    for label, rx in PROJECT_RE:
        if rx.search(filename):
            return label
    # 2) address pattern
    m = ADDR_RE.search(filename) or ADDR_RE2.search(filename)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return ""  # uncategorized — needs user review

# ---------- subfolder detection ----------
SUBFOLDER_RULES = [
    # (subfolder, list of regex patterns to test against lowercased filename)
    ("Contracts", [
        r"\bcontract\b", r"\bagreement\b", r"\baddendum\b", r"\bamendment\b",
        r"\bsales\s+contract\b", r"\bsale\s+contract\b", r"\bschedule[\s_]*[a-z]\b",
        r"\brebate\s+agreement\b", r"\brental\s+guarantee\b", r"\bpurchase\b",
        r"\bspecifications?\b", r"\bassignment\b", r"\bfinder[_\s]?fee\b",
        r"\breferral[_\s]?fee\b", r"\bindependent\s+contractor\b",
        r"\bnda\b", r"\bgift\s+letter\b",
    ]),
    ("Plans & Permits", [
        r"\bplans?\b", r"\bdrawing\b", r"\bblueprint\b", r"\bpermit\b",
        r"\brezon", r"\btopo\b", r"\bsurvey(?:or)?\b", r"\bsite[\s_]*plan\b",
        r"\belevation\b", r"\blotting\b", r"\bschedule_b\b", r"\bschedule_a\b",
    ]),
    ("Financials", [
        r"\bbudget\b", r"\bpro[\s_-]?forma\b", r"\bcash[\s_-]?flow\b",
        r"\bcmhc\b", r"\bcost\s+breakdown\b", r"\bsoft\s+cost\b",
        r"\bhard\s+cost\b", r"\bsummary\b", r"\binvoice\b", r"\btax\b",
        r"\bestimate\b", r"\bunderwriting\b", r"\banalysis\b", r"\ballocation\b",
        r"\bexit\b", r"\bfee\b", r"\bdraw\b", r"\bequity\b", r"\bcost[\s_]*to[\s_]*date\b",
        r"\bfoundation\s+stage\b", r"\bbonding\b",
    ]),
    ("Investor Docs", [
        r"\binvestor\b", r"\binvestment\s+proposal\b", r"\binvestment\s+summary\b",
        r"\bpnw\s+statement\b", r"\bpersonal\s+financial\b", r"\bborrower\b",
        r"\bpnw\b", r"\bproject\s+brief\b", r"\bone[\s_-]?pager\b",
        r"\bshareholder\b",
    ]),
    ("Construction", [
        r"\bconstruction\b", r"\bscope\b", r"\bschedule\s+of\s+values\b",
        r"\bsov\b", r"\binspection\b", r"\bdraw\s+\d\b",
    ]),
    ("Marketing & OM", [
        r"\boffering\s+memorandum\b", r"\bom\b(?!\w)", r"\bcmls\b",
        r"\bmarketing\b", r"\bbrochure\b", r"\blisting\b", r"\bmls\b",
    ]),
    ("Reports", [
        r"\binspection\s+report\b", r"\bappraisal\b", r"\b(?:soil|environmental)\b",
        r"\benv\b", r"\bphase\s+(?:i|ii|iii)\b",
    ]),
    ("Legal", [
        r"\blawyer\b", r"\basc\b", r"\bletter\s+to\b", r"\btitle\s+search\b",
        r"\bencumbrance\b", r"\baffidavit\b",
    ]),
]

def detect_subfolder(filename, ext):
    if ext in IMG_EXTS:
        return "Photos"
    fn = filename.lower()
    for sub, patterns in SUBFOLDER_RULES:
        for p in patterns:
            if re.search(p, fn):
                return sub
    return ""  # uncategorized

# ---------- hashing ----------
def md5_of(path, size):
    if size > MAX_HASH_BYTES:
        return ""  # too big — dedup by name+size only
    try:
        h = hashlib.md5()
        with open(path, "rb") as f:
            while True:
                b = f.read(1024*1024)
                if not b: break
                h.update(b)
        return h.hexdigest()
    except Exception:
        return ""

# ---------- walk ----------
def main():
    out = []
    scanned = 0; hashed = 0
    for root, dirs, files in os.walk(HOME):
        rp = root + "/"
        if any(x in rp for x in EXCLUDE_DIRS):
            dirs[:] = []
            continue
        for fn in files:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in WANTED_EXTS: continue
            if fn.startswith("~$"): continue  # office lock files
            if fn.startswith("."): continue  # hidden files
            path = os.path.join(root, fn)
            try:
                st = os.stat(path)
            except Exception:
                continue
            scanned += 1
            md5 = md5_of(path, st.st_size)
            if md5: hashed += 1
            project = detect_project(fn)
            subfolder = detect_subfolder(fn, ext)
            out.append({
                "path": path,
                "name": fn,
                "ext": ext,
                "size": st.st_size,
                "mtime": int(st.st_mtime),
                "md5": md5,
                "project": project,
                "subfolder": subfolder,
            })
            if scanned % 200 == 0:
                print(f"...scanned {scanned}, hashed {hashed}", file=sys.stderr)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f)

    # summary
    from collections import Counter
    n_total = len(out)
    n_no_project = sum(1 for r in out if not r["project"])
    n_no_sub = sum(1 for r in out if not r["subfolder"])
    by_project = Counter(r["project"] or "(unknown)" for r in out)
    by_sub = Counter(r["subfolder"] or "(uncategorized)" for r in out)
    by_ext = Counter(r["ext"] for r in out)
    # potential duplicates (group by md5; ignore "")
    dup_groups = defaultdict(list)
    for r in out:
        if r["md5"]:
            dup_groups[r["md5"]].append(r)
    n_dup_groups = sum(1 for g in dup_groups.values() if len(g) > 1)
    n_dup_files = sum(len(g)-1 for g in dup_groups.values() if len(g) > 1)
    bytes_recoverable = sum(g[0]["size"]*(len(g)-1) for g in dup_groups.values() if len(g) > 1)

    with open(SUMMARY, "w") as f:
        f.write(f"LOCAL SCAN SUMMARY\n==================\n\n")
        f.write(f"files scanned: {n_total}\n")
        f.write(f"files hashed:  {hashed}\n")
        f.write(f"uncategorized (no project guess): {n_no_project} ({100*n_no_project//max(n_total,1)}%)\n")
        f.write(f"uncategorized subfolder:          {n_no_sub} ({100*n_no_sub//max(n_total,1)}%)\n")
        f.write(f"\nDUPLICATES (by MD5 exact match)\n")
        f.write(f"  duplicate groups: {n_dup_groups}\n")
        f.write(f"  redundant files:  {n_dup_files}\n")
        f.write(f"  bytes recoverable: {bytes_recoverable/1024/1024:.1f} MB\n")
        f.write(f"\nTOP PROJECTS DETECTED\n")
        for p,n in by_project.most_common(25):
            f.write(f"  {n:5d}  {p}\n")
        f.write(f"\nSUBFOLDER DISTRIBUTION\n")
        for s,n in by_sub.most_common():
            f.write(f"  {n:5d}  {s}\n")
        f.write(f"\nFILE TYPES\n")
        for e,n in by_ext.most_common():
            f.write(f"  {n:5d}  {e}\n")
    print(f"DONE: {n_total} files, {n_dup_groups} dup groups, {bytes_recoverable/1024/1024:.0f}MB recoverable", file=sys.stderr)

if __name__ == "__main__":
    main()
