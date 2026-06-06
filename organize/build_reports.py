#!/usr/bin/env python3
"""Read local_inventory.json, produce:
  - dedup_report.csv     (one row per duplicate group)
  - folder_map.csv       (one row per file: current_path -> proposed_target_path)
  - PLAN.md              (markdown summary for user review)

No files are moved here. This is the plan-first stage.
"""
import os, json, csv
from collections import defaultdict, Counter

HOME = os.path.expanduser("~")
DIR  = os.path.join(HOME, "flip-analyzer", "organize")
IN   = os.path.join(DIR, "local_inventory.json")
DEDUP_CSV  = os.path.join(DIR, "dedup_report.csv")
FOLDER_CSV = os.path.join(DIR, "folder_map.csv")
PLAN_MD    = os.path.join(DIR, "PLAN.md")

# Target root for organized files
ORGANIZED_ROOT = os.path.join(HOME, "RealEstate_Organized")
DUPLICATES_DIR = os.path.join(ORGANIZED_ROOT, "_Duplicates")
UNCLEAR_DIR    = os.path.join(ORGANIZED_ROOT, "_NeedsReview")

records = json.load(open(IN))

# ---------------------------------------------------------------
# 1) Group exact duplicates by md5
# ---------------------------------------------------------------
groups = defaultdict(list)
for r in records:
    if r["md5"]:
        groups[r["md5"]].append(r)

dup_groups = [g for g in groups.values() if len(g) > 1]

# Within each dup group: keep the newest mtime as "primary" — others are duplicates
def primary_and_dupes(g):
    g_sorted = sorted(g, key=lambda r: (-r["mtime"], len(r["path"])))
    return g_sorted[0], g_sorted[1:]

# also catch near-duplicates: same filename + same size but different paths (no md5 if too big)
# Group files without md5 by (name, size)
no_hash_groups = defaultdict(list)
for r in records:
    if not r["md5"]:
        no_hash_groups[(r["name"], r["size"])].append(r)
near_dup_groups = [g for g in no_hash_groups.values() if len(g) > 1]

# also catch filename collisions across folders (different content but same name) — informational
name_groups = defaultdict(list)
for r in records:
    name_groups[r["name"]].append(r)
name_collisions = [g for g in name_groups.values() if len(g) > 1]
# but filter out groups already covered by md5/no_hash above
covered_paths = set()
for g in dup_groups + near_dup_groups:
    for r in g: covered_paths.add(r["path"])
name_only_groups = [
    g for g in name_collisions
    if any(r["path"] not in covered_paths for r in g) and len(g) > 1
]

# ---------------------------------------------------------------
# 2) Build folder map (one target per file)
# ---------------------------------------------------------------
def safe_segment(s):
    return s.replace("/", "-").strip()

def target_path(rec, is_duplicate, project_override=None):
    name = rec["name"]
    if is_duplicate:
        # move to _Duplicates, preserve project if known
        proj = project_override or rec["project"] or "Unknown"
        return os.path.join(DUPLICATES_DIR, safe_segment(proj), name)
    project = (project_override or rec["project"] or "").strip()
    sub = rec["subfolder"] or ""
    if not project and not sub:
        return os.path.join(UNCLEAR_DIR, name)
    if not project:
        # subfolder known but no project — drop into Library/<subfolder>
        return os.path.join(ORGANIZED_ROOT, "_Library", safe_segment(sub), name)
    if not sub:
        return os.path.join(ORGANIZED_ROOT, safe_segment(project), "_NeedsReview", name)
    return os.path.join(ORGANIZED_ROOT, safe_segment(project), safe_segment(sub), name)

# Mark each record with its role (primary / duplicate / unique)
status = {}   # path -> "primary"|"duplicate"|"unique"
for g in dup_groups + near_dup_groups:
    primary, dupes = primary_and_dupes(g)
    status[primary["path"]] = "primary"
    for d in dupes:
        status[d["path"]] = "duplicate"
for r in records:
    if r["path"] not in status:
        status[r["path"]] = "unique"

# ---------------------------------------------------------------
# 3) Write dedup_report.csv
# ---------------------------------------------------------------
with open(DEDUP_CSV, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["group_id","group_type","is_keeper","file","size_bytes","mtime","project","subfolder","md5_or_size"])
    gid = 0
    for g in dup_groups:
        gid += 1
        primary, dupes = primary_and_dupes(g)
        sig = primary["md5"][:10]
        w.writerow([gid, "exact_md5", "YES", primary["path"], primary["size"], primary["mtime"],
                    primary["project"], primary["subfolder"], sig])
        for d in dupes:
            w.writerow([gid, "exact_md5", "no", d["path"], d["size"], d["mtime"],
                        d["project"], d["subfolder"], sig])
    for g in near_dup_groups:
        gid += 1
        primary, dupes = primary_and_dupes(g)
        sig = f"name+size:{primary['size']}"
        w.writerow([gid, "name+size", "YES", primary["path"], primary["size"], primary["mtime"],
                    primary["project"], primary["subfolder"], sig])
        for d in dupes:
            w.writerow([gid, "name+size", "no", d["path"], d["size"], d["mtime"],
                        d["project"], d["subfolder"], sig])
    for g in name_only_groups:
        gid += 1
        sig = f"name_collision_diff_content"
        # primary = newest mtime
        g2 = sorted(g, key=lambda r: -r["mtime"])
        w.writerow([gid, "name_collision", "review", g2[0]["path"], g2[0]["size"], g2[0]["mtime"],
                    g2[0]["project"], g2[0]["subfolder"], sig])
        for d in g2[1:]:
            w.writerow([gid, "name_collision", "review", d["path"], d["size"], d["mtime"],
                        d["project"], d["subfolder"], sig])

# ---------------------------------------------------------------
# 4) Write folder_map.csv
# ---------------------------------------------------------------
with open(FOLDER_CSV, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=[
        "current_path","status","project","subfolder","proposed_target","size_bytes","mtime"])
    w.writeheader()
    for r in records:
        s = status[r["path"]]
        is_dup = (s == "duplicate")
        target = target_path(r, is_dup)
        w.writerow({
            "current_path": r["path"],
            "status": s,
            "project": r["project"],
            "subfolder": r["subfolder"] if not is_dup else "(_Duplicates)",
            "proposed_target": target,
            "size_bytes": r["size"],
            "mtime": r["mtime"],
        })

# ---------------------------------------------------------------
# 5) PLAN.md
# ---------------------------------------------------------------
n_total = len(records)
n_dup_groups = len(dup_groups)
n_redundant = sum(len(g)-1 for g in dup_groups)
bytes_recoverable = sum(g[0]["size"]*(len(g)-1) for g in dup_groups)
n_near = len(near_dup_groups)
n_near_files = sum(len(g)-1 for g in near_dup_groups)
n_no_proj = sum(1 for r in records if not r["project"])
n_no_sub  = sum(1 for r in records if not r["subfolder"])

# Project breakdown
proj_counts = Counter(r["project"] or "(unknown)" for r in records)
sub_counts  = Counter(r["subfolder"] or "(uncategorized)" for r in records)
ext_counts  = Counter(r["ext"] for r in records)

# Largest dup groups (in MB recovered)
big_dups = sorted(dup_groups, key=lambda g: -g[0]["size"]*(len(g)-1))[:15]

with open(PLAN_MD, "w") as f:
    f.write("# Organize Plan — Local Mac\n\n")
    f.write("**Phase 1: discovery only. Nothing moved yet.**\n\n")
    f.write("## Numbers\n\n")
    f.write(f"- Files scanned: **{n_total}**\n")
    f.write(f"- Exact duplicate groups (MD5): **{n_dup_groups}** → **{n_redundant}** redundant files, ~**{bytes_recoverable/1024/1024:.0f} MB** recoverable\n")
    f.write(f"- Likely duplicates by name+size (too big to hash): **{n_near}** groups → **{n_near_files}** redundant files\n")
    f.write(f"- Files with no detected project: **{n_no_proj}** ({100*n_no_proj//max(n_total,1)}%) → go to `_NeedsReview/`\n")
    f.write(f"- Files with no detected subfolder: **{n_no_sub}** ({100*n_no_sub//max(n_total,1)}%)\n\n")
    f.write("## Proposed target structure\n\n")
    f.write("```\n")
    f.write(f"{ORGANIZED_ROOT}/\n")
    f.write("├── <Project Name>/\n")
    f.write("│   ├── Contracts/\n")
    f.write("│   ├── Plans & Permits/\n")
    f.write("│   ├── Financials/\n")
    f.write("│   ├── Investor Docs/\n")
    f.write("│   ├── Construction/\n")
    f.write("│   ├── Photos/\n")
    f.write("│   ├── Marketing & OM/\n")
    f.write("│   ├── Reports/\n")
    f.write("│   ├── Legal/\n")
    f.write("│   └── _NeedsReview/\n")
    f.write("├── _Library/                      (templates, scripts, reference docs)\n")
    f.write("├── _Duplicates/<Project>/         (everything but the keeper from each dup group)\n")
    f.write("└── _NeedsReview/                  (files with no detected project)\n")
    f.write("```\n\n")
    f.write("## Projects detected\n\n")
    f.write("| Project | Files |\n|---|---:|\n")
    for p, n in proj_counts.most_common(40):
        f.write(f"| {p} | {n} |\n")
    f.write("\n## Subfolder distribution\n\n")
    f.write("| Subfolder | Files |\n|---|---:|\n")
    for s, n in sub_counts.most_common():
        f.write(f"| {s} | {n} |\n")
    f.write("\n## File types\n\n")
    f.write("| Extension | Count |\n|---|---:|\n")
    for e, n in ext_counts.most_common():
        f.write(f"| {e} | {n} |\n")
    f.write("\n## Biggest space savings from dedup (top 15)\n\n")
    f.write("| Group | Filename | Copies | Size each | Total wasted |\n|---:|---|---:|---:|---:|\n")
    for i, g in enumerate(big_dups, 1):
        primary = sorted(g, key=lambda r: -r["mtime"])[0]
        wasted = primary["size"]*(len(g)-1)
        f.write(f"| {i} | {primary['name']} | {len(g)} | {primary['size']/1024/1024:.1f} MB | {wasted/1024/1024:.1f} MB |\n")
    f.write("\n## Next: review the two CSVs in this folder\n\n")
    f.write(f"- `{os.path.basename(DEDUP_CSV)}` — every duplicate group, keeper marked `YES`. Edit if you want to keep a different copy.\n")
    f.write(f"- `{os.path.basename(FOLDER_CSV)}` — proposed target path for each file. Edit any wrong rows.\n")
    f.write("\nWhen the plan looks right, tell me to **execute Phase 2** and I'll create the new folders and move files in batches with confirmation.\n")

print(f"DONE")
print(f"  dedup report:  {DEDUP_CSV}")
print(f"  folder map:    {FOLDER_CSV}")
print(f"  plan summary:  {PLAN_MD}")
