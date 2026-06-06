#!/usr/bin/env python3
"""Execute Phase 2: move identified real-estate files into ~/RealEstate_Organized/
- Files with no project detected: LEFT IN PLACE.
- Duplicates: moved to _Duplicates/<Project>/ (newest copy stays in primary location).
- Project name collisions consolidated (e.g. 10646 61 == Allendale 6-Plex).
- Every move logged to move_log.csv so we can rollback.
"""
import os, csv, shutil, json, sys, re
from collections import defaultdict

HOME = os.path.expanduser("~")
DIR  = os.path.join(HOME, "flip-analyzer", "organize")
INV  = os.path.join(DIR, "local_inventory.json")
LOG  = os.path.join(DIR, "move_log.csv")

ROOT       = os.path.join(HOME, "RealEstate_Organized")
DUPES_DIR  = os.path.join(ROOT, "_Duplicates")

# ----- consolidation: alias -> canonical project name -----
CANONICAL = {
    # Allendale family
    "Allendale 6-Plex":      "Allendale 6-Plex (10646 61 Ave)",
    "10646 61":              "Allendale 6-Plex (10646 61 Ave)",
    "10646 61 Ave":          "Allendale 6-Plex (10646 61 Ave)",
    "Allendale 5-Plex":      "Allendale 5-Plex (6408 106 St)",
    "6408 106":              "Allendale 5-Plex (6408 106 St)",
    "Allendale 2":           "Allendale 2",
    "Allendale":             "Allendale (generic)",
    # 12020 129 St / Jasper Park / Mayfield
    "Jasper Park":           "Jasper Park",
    "Mayfield":              "Mayfield 110",
    "Mayfield 110":          "Mayfield 110",
    # other addresses
    "10612 127 Street":      "10612 127 Street NW",
    "10612 127":             "10612 127 Street NW",
    "15981 110B Ave":        "15981 110B Ave NW (9-Plex)",
    "11328 126 St":          "Inglewood 6-Plex (11328 126 St)",
    "Inglewood 6-Plex":      "Inglewood 6-Plex (11328 126 St)",
    "Inglewood 9-Plex":      "Inglewood 9-Plex",
    "Inglewood":             "Inglewood (generic)",
    "10848 153 St":          "In-Between Homes (10848 153 St)",
    "In-Between Homes":      "In-Between Homes (10848 153 St)",
    "9121 152":              "Verum (9121 152 St)",
    "12020 129 St":          "Emanation (12020 129 St)",
    "10407 45":              "10407 45 Ave NW",
    "10636 127":             "10636 127 St NW",
    "10646 106":             "10646 106 St NW",
    "106 Street Property":   "106 Street Property",
    "9107 84":               "9107 84 Ave NW",
    "9724 82":               "9724 82 Ave NW",
    "6729":                  "6729 (TBD address)",
    "Sherbrooke":            "Sherbrooke",
    "High Park":             "High Park 9-Plex",
    "Forest Heights 6-Plex": "Forest Heights 6-Plex",
    "Forest Heights":        "Forest Heights 6-Plex",
    "Ritchie 8-Plex":        "Ritchie 8-Plex",
    "Ritchie":               "Ritchie 8-Plex",
    "Lake Ridge":            "Lake Ridge",
    "Solomon":               "Solomon",
    "Westmount":             "Westmount",
    "Hazardous Sites":       "Hazardous Sites (Edmonton)",
    "Gazette":               "Gazette",
    "Distressed Property Outreach": "Distressed Property Outreach",
    "Manhattan":             "Manhattan",
    "Spruce Avenue":         "Spruce Avenue",
}

def canon_project(p):
    if not p: return ""
    # try exact alias
    if p in CANONICAL: return CANONICAL[p]
    # try with year cruft
    if re.fullmatch(r"\d{4}.*", p): return ""  # like "2025 03" — junk
    return p  # leave as-is if not in map

def safe(s):
    return re.sub(r'[/<>:"\\|?*]', "-", s).strip()

# ----- load inventory + recompute dup status here so move_log is self-contained -----
records = json.load(open(INV))

# group by md5
md5_groups = defaultdict(list)
for r in records:
    if r["md5"]: md5_groups[r["md5"]].append(r)

primary_paths = set()
duplicate_paths = set()
for g in md5_groups.values():
    if len(g) < 2: continue
    # primary = newest mtime, shortest path as tiebreak
    g_sorted = sorted(g, key=lambda r: (-r["mtime"], len(r["path"])))
    primary_paths.add(g_sorted[0]["path"])
    for d in g_sorted[1:]:
        duplicate_paths.add(d["path"])

# ----- plan + execute -----
os.makedirs(ROOT, exist_ok=True)
os.makedirs(DUPES_DIR, exist_ok=True)

moved = 0; skipped_no_proj = 0; skipped_in_place = 0; errored = 0
moved_log = []
errors = []

for r in records:
    path = r["path"]
    name = r["name"]
    # never touch files already inside ROOT or our working dir
    if path.startswith(ROOT) or "/flip-analyzer/" in path:
        skipped_in_place += 1; continue

    proj = canon_project(r["project"])
    if not proj:
        skipped_no_proj += 1; continue   # leave non-RE files alone

    sub = r["subfolder"] or "_NeedsReview"

    if path in duplicate_paths:
        # move duplicate
        dest_dir = os.path.join(DUPES_DIR, safe(proj))
    else:
        dest_dir = os.path.join(ROOT, safe(proj), safe(sub))

    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, name)

    # avoid overwriting: if dest exists, append " (n)" before extension
    if os.path.exists(dest) and os.path.abspath(dest) != os.path.abspath(path):
        stem, ext = os.path.splitext(name)
        i = 2
        while True:
            cand = os.path.join(dest_dir, f"{stem} ({i}){ext}")
            if not os.path.exists(cand):
                dest = cand; break
            i += 1

    try:
        shutil.move(path, dest)
        moved += 1
        moved_log.append({
            "from": path, "to": dest,
            "project": proj, "subfolder": sub,
            "status": "duplicate" if path in duplicate_paths else "primary",
            "size": r["size"],
        })
    except Exception as e:
        errored += 1
        errors.append({"path": path, "error": str(e)})

# write log (so we can rollback if needed)
with open(LOG, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["from","to","project","subfolder","status","size"])
    w.writeheader()
    w.writerows(moved_log)

print(f"\nMoved:                  {moved}")
print(f"Skipped (no project):   {skipped_no_proj}  (left in place)")
print(f"Skipped (already in ROOT/working): {skipped_in_place}")
print(f"Errors:                 {errored}")
if errors:
    for e in errors[:5]:
        print(" ERR:", e)

# project breakdown for the new structure
print("\nNew structure under ~/RealEstate_Organized/:")
counts = defaultdict(int)
for m in moved_log:
    counts[m["project"]] += 1
for p, n in sorted(counts.items(), key=lambda kv: -kv[1]):
    print(f"  {n:4d}  {p}")
