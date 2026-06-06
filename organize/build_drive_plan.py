#!/usr/bin/env python3
"""Consolidate all paginated Drive list responses; detect duplicates by (title,size);
apply project + subfolder detection; output:
  - drive_inventory.json
  - drive_dedup_report.csv
  - drive_folder_map.csv
  - DRIVE_PLAN.md
  - organize_drive.gs   (Google Apps Script for execution)
"""
import os, json, csv, re, glob
from collections import defaultdict, Counter

HOME = os.path.expanduser("~")
ORG  = os.path.join(HOME, "flip-analyzer", "organize")
TR   = "/Users/sunniyaremchuk/.claude/projects/-Users-sunniyaremchuk-flip-analyzer/a146bcfd-6e1b-4094-a5b2-da6a8feb4bdf/tool-results"

# the 4 pages from list_recent_files
PAGES = [
    "mcp-claude_ai_Google_Drive-list_recent_files-1780065481402.txt",
    "mcp-claude_ai_Google_Drive-list_recent_files-1780065515285.txt",
    "mcp-claude_ai_Google_Drive-list_recent_files-1780065542319.txt",
    "mcp-claude_ai_Google_Drive-list_recent_files-1780065562730.txt",
]

# ============== load pages ==============
files = []
folders = {}
for p in PAGES:
    d = json.load(open(os.path.join(TR, p)))
    for f in d["files"]:
        if f["mimeType"] == "application/vnd.google-apps.folder":
            folders[f["id"]] = {
                "id": f["id"], "title": f["title"],
                "parentId": f.get("parentId",""),
                "owner": f.get("owner",""),
            }
        files.append(f)
# de-dupe entries by id (in case overlapping pages)
seen = set(); uniq = []
for f in files:
    if f["id"] in seen: continue
    seen.add(f["id"]); uniq.append(f)
files = uniq
print(f"files (incl folders): {len(files)}; folders: {len(folders)}")

# ============== build path map ==============
def folder_path(fid, depth=0):
    if depth > 30: return "(loop)"
    f = folders.get(fid)
    if not f: return ""
    if f.get("parentId") and f["parentId"] in folders:
        return folder_path(f["parentId"], depth+1) + "/" + f["title"]
    return f["title"]

# ============== project detection (same as local) ==============
PROJECT_LABELS = [
    "Allendale 6-Plex","Allendale 5-Plex","Allendale 2","Allendale",
    "Mayfield 110","Mayfield","Jasper Park","Sherbrooke",
    "Inglewood 6-Plex","Inglewood 9-Plex","Inglewood",
    "High Park","Forest Heights 6-Plex","Forest Heights",
    "Ritchie 8-Plex","Ritchie","Lake Ridge","Solomon",
    "Westmount","Hazardous Sites","Gazette",
    "Distressed Property Outreach","Manhattan","In-Between Homes",
    "10646 61 Ave","10612 127 Street","15981 110B Ave","11328 126 St",
    "12020 129 St","10848 153 St","9121 152","106 Street Property",
    "6729","6408 106","9107 84","Spruce Avenue",
]
PROJECT_RE = [(label, re.compile(re.escape(label).replace(r"\ ",r"[\s_-]+"), re.I))
              for label in PROJECT_LABELS]
ADDR_RE = re.compile(r"\b(\d{4,5})\s+(\d{1,3}[A-Z]?)\b", re.I)

CANONICAL = {
    "Allendale 6-Plex":      "Allendale 6-Plex (10646 61 Ave)",
    "10646 61":              "Allendale 6-Plex (10646 61 Ave)",
    "10646 61 Ave":          "Allendale 6-Plex (10646 61 Ave)",
    "Allendale 5-Plex":      "Allendale 5-Plex (6408 106 St)",
    "6408 106":              "Allendale 5-Plex (6408 106 St)",
    "Allendale 2":           "Allendale 2",
    "Allendale":             "Allendale (generic)",
    "Jasper Park":           "Jasper Park",
    "Mayfield":              "Mayfield 110",
    "Mayfield 110":          "Mayfield 110",
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

def detect_project(text):
    for label, rx in PROJECT_RE:
        if rx.search(text): return CANONICAL.get(label, label)
    m = ADDR_RE.search(text)
    if m: return f"{m.group(1)} {m.group(2)}"
    return ""

# ============== subfolder detection ==============
IMG_MIMES = {"image/jpeg","image/png","image/heif","image/heic","image/gif","image/webp","image/svg+xml","image/tiff","image/bmp"}
SUBFOLDER_RULES = [
    ("Contracts", [r"\bcontract\b",r"\bagreement\b",r"\baddendum\b",r"\bamendment\b",
                   r"\bschedule[\s_]*[a-z]\b",r"\brebate\s+agreement\b",
                   r"\brental\s+guarantee\b",r"\bpurchase\b",r"\bspecifications?\b",
                   r"\bassignment\b",r"\bfinder[_\s]?fee\b",r"\breferral[_\s]?fee\b",
                   r"\bindependent\s+contractor\b",r"\bnda\b",r"\bgift\s+letter\b"]),
    ("Plans & Permits", [r"\bplans?\b",r"\bdrawing\b",r"\bblueprint\b",r"\bpermit\b",
                         r"\brezon",r"\btopo\b",r"\bsurvey(?:or)?\b",
                         r"\bsite[\s_]*plan\b",r"\belevation\b",r"\blotting\b"]),
    ("Financials", [r"\bbudget\b",r"\bpro[\s_-]?forma\b",r"\bcash[\s_-]?flow\b",
                    r"\bcmhc\b",r"\bcost\s+breakdown\b",r"\bsoft\s+cost\b",
                    r"\bhard\s+cost\b",r"\bsummary\b",r"\binvoice\b",r"\btax\b",
                    r"\bestimate\b",r"\bunderwriting\b",r"\banalysis\b",
                    r"\ballocation\b",r"\bexit\b",r"\bfee\b",r"\bdraw\b",
                    r"\bequity\b",r"\bcost[\s_]*to[\s_]*date\b",r"\bfoundation\s+stage\b",
                    r"\bbonding\b",r"\bcalculator\b",r"\bproforma\b"]),
    ("Investor Docs", [r"\binvestor\b",r"\binvestment\s+proposal\b",
                       r"\binvestment\s+summary\b",r"\bpnw\s+statement\b",
                       r"\bpersonal\s+financial\b",r"\bborrower\b",r"\bpnw\b",
                       r"\bproject\s+brief\b",r"\bone[\s_-]?pager\b",r"\bshareholder\b"]),
    ("Construction", [r"\bconstruction\b",r"\bscope\b",r"\bschedule\s+of\s+values\b",
                      r"\bsov\b",r"\bdraw\s+\d\b"]),
    ("Marketing & OM", [r"\boffering\s+memorandum\b",r"\bom\b(?!\w)",r"\bcmls\b",
                        r"\bmarketing\b",r"\bbrochure\b",r"\blisting\b",r"\bmls\b"]),
    ("Reports", [r"\binspection\s+report\b",r"\bappraisal\b",
                 r"\b(?:soil|environmental)\b",r"\benv\b",
                 r"\bphase\s+(?:i|ii|iii)\b"]),
    ("Legal", [r"\blawyer\b",r"\basc\b",r"\bletter\s+to\b",r"\btitle\s+search\b",
               r"\bencumbrance\b",r"\baffidavit\b"]),
]

def detect_subfolder(title, mime):
    if mime in IMG_MIMES: return "Photos"
    fn = title.lower()
    for sub, patterns in SUBFOLDER_RULES:
        for p in patterns:
            if re.search(p, fn): return sub
    return ""

# ============== build inventory ==============
inv = []
for f in files:
    if f["mimeType"] == "application/vnd.google-apps.folder": continue
    parent = f.get("parentId","")
    path = folder_path(parent) if parent else "(root)"
    title = f["title"]
    size = int(f.get("fileSize","0")) if f.get("fileSize") else 0
    proj = detect_project(f"{title} {path}")
    sub = detect_subfolder(title, f["mimeType"])
    inv.append({
        "id": f["id"], "title": title, "size": size,
        "mime": f["mimeType"], "owner": f.get("owner",""),
        "parentId": parent, "current_path": path,
        "project": proj, "subfolder": sub,
        "viewUrl": f.get("viewUrl",""),
        "modifiedTime": f.get("modifiedTime",""),
    })
json.dump(inv, open(os.path.join(ORG,"drive_inventory.json"),"w"))
print(f"non-folder files: {len(inv)}")

# ============== duplicates by (title, size) ==============
groups = defaultdict(list)
for r in inv:
    if r["size"] > 0:
        groups[(r["title"], r["size"])].append(r)
dup_groups = [g for g in groups.values() if len(g) > 1]
n_dup_groups = len(dup_groups)
n_redundant = sum(len(g)-1 for g in dup_groups)
bytes_recoverable = sum(g[0]["size"]*(len(g)-1) for g in dup_groups)
print(f"dup groups (by title+size): {n_dup_groups}; redundant: {n_redundant}; ~{bytes_recoverable/1024/1024:.0f} MB recoverable")

# ============== reports ==============
# dedup CSV: keeper = newest modifiedTime
def keeper(g):
    return sorted(g, key=lambda r: (r["modifiedTime"] or ""), reverse=True)[0]

with open(os.path.join(ORG,"drive_dedup_report.csv"),"w",newline="") as f:
    w = csv.writer(f)
    w.writerow(["group_id","is_keeper","file","viewUrl","size","modified","project","current_path"])
    for gid,g in enumerate(dup_groups, 1):
        k = keeper(g)
        w.writerow([gid,"YES",k["title"],k["viewUrl"],k["size"],k["modifiedTime"],
                    k["project"],k["current_path"]])
        for r in g:
            if r["id"] != k["id"]:
                w.writerow([gid,"no",r["title"],r["viewUrl"],r["size"],r["modifiedTime"],
                            r["project"],r["current_path"]])

# folder map
dup_ids = set()
for g in dup_groups:
    k = keeper(g)
    for r in g:
        if r["id"] != k["id"]:
            dup_ids.add(r["id"])

with open(os.path.join(ORG,"drive_folder_map.csv"),"w",newline="") as f:
    w = csv.writer(f)
    w.writerow(["id","title","status","current_path","proposed_target","viewUrl"])
    for r in inv:
        s = "duplicate" if r["id"] in dup_ids else "primary"
        if s == "duplicate":
            target = f"_Duplicates/{r['project'] or 'Unknown'}/{r['title']}"
        else:
            proj = r["project"]
            sub  = r["subfolder"]
            if not proj and not sub:
                target = f"_NeedsReview/{r['title']}"
            elif not proj:
                target = f"_Library/{sub}/{r['title']}"
            elif not sub:
                target = f"{proj}/_NeedsReview/{r['title']}"
            else:
                target = f"{proj}/{sub}/{r['title']}"
        w.writerow([r["id"],r["title"],s,r["current_path"],target,r["viewUrl"]])

# project + subfolder counts
proj_counts = Counter(r["project"] or "(unknown)" for r in inv)
sub_counts  = Counter(r["subfolder"] or "(uncategorized)" for r in inv)

# ============== DRIVE_PLAN.md ==============
with open(os.path.join(ORG,"DRIVE_PLAN.md"),"w") as f:
    f.write("# Drive Organize Plan\n\nPhase 1: discovery only. Nothing moved in Drive yet.\n\n")
    f.write("## Numbers\n\n")
    f.write(f"- Drive files inventoried (non-folder): **{len(inv)}**\n")
    f.write(f"- Folders mapped: **{len(folders)}**\n")
    f.write(f"- Duplicate groups (same title + size): **{n_dup_groups}**\n")
    f.write(f"- Redundant duplicate files: **{n_redundant}**\n")
    f.write(f"- Bytes recoverable: **~{bytes_recoverable/1024/1024:.0f} MB**\n\n")
    f.write("## Projects detected (top 30)\n\n| Project | Files |\n|---|---:|\n")
    for p,n in proj_counts.most_common(30):
        f.write(f"| {p} | {n} |\n")
    f.write("\n## Subfolder distribution\n\n| Subfolder | Files |\n|---|---:|\n")
    for s,n in sub_counts.most_common():
        f.write(f"| {s} | {n} |\n")
    f.write("\n## Next steps\n\n")
    f.write("- Review `drive_dedup_report.csv` and `drive_folder_map.csv`.\n")
    f.write("- Run `organize_drive.gs` in script.google.com to execute moves with your own credentials.\n")

# ============== organize_drive.gs (Apps Script) ==============
# Build the data the script needs: file id -> target_project, target_subfolder, is_duplicate
script_data = []
for r in inv:
    is_dup = r["id"] in dup_ids
    proj = r["project"] or ""
    sub  = r["subfolder"] or ""
    script_data.append({
        "id": r["id"], "is_dup": is_dup,
        "project": proj, "sub": sub,
    })

GS_TEMPLATE = '''/* organize_drive.gs — generated by Claude
 * Paste this into https://script.google.com (new project), Save, then Run.
 * It will:
 *   1) Create a top-level folder "_Organized" in your Drive root.
 *   2) Inside it, create per-project subfolders (Contracts, Plans & Permits, etc).
 *   3) Move each listed file to its target. (Drive "move" = remove from current
 *      parents and add new parent. Original is NOT copied or deleted.)
 *   4) Move duplicates to "_Organized/_Duplicates/<Project>/".
 * Safe to re-run: skips files already in the target folder.
 *
 * If you want to BACK OUT, the moves are reversible from Drive (Right-click → "Show
 * in folder" or use Activity panel). Files are NEVER deleted by this script.
 */

const ROOT_NAME = "_Organized";
const SUBFOLDERS = ["Contracts","Plans & Permits","Financials","Investor Docs",
                    "Construction","Photos","Marketing & OM","Reports","Legal","_NeedsReview"];

// folder cache
const cache = {};
function getOrCreate(parent, name) {
  const key = parent.getId() + "::" + name;
  if (cache[key]) return cache[key];
  const it = parent.getFoldersByName(name);
  let f = it.hasNext() ? it.next() : parent.createFolder(name);
  cache[key] = f;
  return f;
}

function moveFile(file, newParent) {
  // Add new parent
  newParent.addFile(file);
  // Remove all other parents
  const parents = file.getParents();
  while (parents.hasNext()) {
    const p = parents.next();
    if (p.getId() !== newParent.getId()) p.removeFile(file);
  }
}

function run() {
  const root = DriveApp.getRootFolder();
  const org = getOrCreate(root, ROOT_NAME);
  const dupRoot = getOrCreate(org, "_Duplicates");
  const lib = getOrCreate(org, "_Library");

  const items = ITEMS;   // <-- injected below

  let moved = 0, skipped = 0, errored = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const file = DriveApp.getFileById(item.id);
      let target;
      if (item.is_dup) {
        const proj = item.project || "Unknown";
        target = getOrCreate(getOrCreate(dupRoot, proj), ".");  // no subfolder under dup project
        // shortcut: just place inside the project's dup folder, no further sub
        target = getOrCreate(dupRoot, proj);
      } else if (item.project && item.sub) {
        const proj = getOrCreate(org, item.project);
        target = getOrCreate(proj, item.sub);
      } else if (item.project) {
        const proj = getOrCreate(org, item.project);
        target = getOrCreate(proj, "_NeedsReview");
      } else if (item.sub) {
        target = getOrCreate(lib, item.sub);
      } else {
        target = getOrCreate(org, "_NeedsReview");
      }
      // skip if already there
      const inTarget = target.getFilesByName(file.getName());
      let already = false;
      while (inTarget.hasNext()) {
        if (inTarget.next().getId() === file.getId()) { already = true; break; }
      }
      if (already) { skipped++; continue; }
      moveFile(file, target);
      moved++;
      if (moved % 50 === 0) Logger.log("moved %s so far", moved);
    } catch (e) {
      errored++;
      Logger.log("ERR " + item.id + " " + e);
    }
  }
  Logger.log("DONE moved=%s skipped=%s errored=%s total=%s", moved, skipped, errored, items.length);
}
'''
items_json = json.dumps(script_data)
gs_out = GS_TEMPLATE.replace("ITEMS", items_json)
with open(os.path.join(ORG,"organize_drive.gs"),"w") as f:
    f.write(gs_out)

print("\nWrote:")
print(f"  {os.path.join(ORG,'drive_inventory.json')}")
print(f"  {os.path.join(ORG,'drive_dedup_report.csv')}")
print(f"  {os.path.join(ORG,'drive_folder_map.csv')}")
print(f"  {os.path.join(ORG,'DRIVE_PLAN.md')}")
print(f"  {os.path.join(ORG,'organize_drive.gs')}  ({len(script_data)} files in the script)")
