#!/usr/bin/env python3
"""Extract email-anchored contacts (email + nearby phone/name/company) from local files."""
import os, re, sys, json, zipfile, subprocess, html

HOME = os.path.expanduser("~")

EXCLUDE_DIRS = (
    "/Library/", "/.Trash/", "/.cache/", "/.npm/", "/node_modules/", "/.venv/",
    "/.git/", "/Photos Library.photoslibrary/", "/CapCut/", "/.claude/",
    "/.local/", "/.cocoapods/", "/site-packages/",
)
EXTS = {".csv", ".txt", ".tsv", ".vcf", ".xlsx", ".xls", ".docx", ".doc", ".pdf", ".rtf", ".md"}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# North American phone, requires separators or parens to limit false positives
PHONE_RE = re.compile(
    r"(?:\+?1[\s.\-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.\-])\d{3}[\s.\-]\d{4}"
)
NAME_RE = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b")

BAD_EMAIL_SUBSTR = (
    "sentry", "example.com", "example.org", "w3.org", "schema.org", "googleapis",
    "@2x", "@3x", "domain.com", "email.com", "yourdomain", "react", "webpack",
    "sentry.io", "wixpress", "no-reply@", "noreply@",
)
BAD_EMAIL_TLD = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".js", ".css", ".ts", ".webp")
FREE_DOMAINS = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
                "live.com","aol.com","me.com","msn.com","protonmail.com","shaw.ca","telus.net"}

def valid_email(e):
    el = e.lower()
    if any(b in el for b in BAD_EMAIL_SUBSTR): return False
    if any(el.endswith(t) for t in BAD_EMAIL_TLD): return False
    if el.count("@") != 1: return False
    if len(el) > 100: return False
    return True

def extract_text(path):
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext in (".csv", ".txt", ".tsv", ".vcf", ".md"):
            with open(path, "r", errors="ignore") as f:
                return f.read()
        if ext == ".xlsx":
            import openpyxl
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
            parts = []
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    cells = [str(c) for c in row if c is not None]
                    if cells: parts.append(" | ".join(cells))
            wb.close()
            return "\n".join(parts)
        if ext == ".docx":
            with zipfile.ZipFile(path) as z:
                xml = z.read("word/document.xml").decode("utf-8", "ignore")
            xml = re.sub(r"</w:p>", "\n", xml)
            return html.unescape(re.sub(r"<[^>]+>", " ", xml))
        if ext == ".pdf":
            from pypdf import PdfReader
            r = PdfReader(path)
            return "\n".join((pg.extract_text() or "") for pg in r.pages)
        if ext in (".doc", ".rtf", ".xls"):
            out = subprocess.run(["textutil","-convert","txt","-stdout",path],
                                 capture_output=True, timeout=60)
            return out.stdout.decode("utf-8","ignore")
    except Exception as e:
        return ""
    return ""

def find_contacts(text, source):
    recs = []
    for m in EMAIL_RE.finditer(text):
        email = m.group(0).strip(".")
        if not valid_email(email): continue
        a, b = max(0, m.start()-160), min(len(text), m.end()+160)
        ctx = text[a:b]
        phones = []
        for pm in PHONE_RE.finditer(ctx):
            digits = re.sub(r"\D","", pm.group(0))
            if len(digits) in (10,11):
                phones.append(pm.group(0).strip())
        # name guess: look in 80 chars before email, else derive from local part
        before = text[max(0,m.start()-80):m.start()]
        nm = NAME_RE.findall(before)
        name = nm[-1] if nm else ""
        domain = email.split("@")[1].lower()
        company = "" if domain in FREE_DOMAINS else domain.split(".")[0]
        recs.append({
            "email": email.lower(),
            "phones": sorted(set(phones)),
            "name": name,
            "company": company,
            "source": source,
            "context": " ".join(ctx.split())[:200],
        })
    return recs

def main():
    out = []
    scanned = 0; hit_files = 0
    for root, dirs, files in os.walk(HOME):
        rp = root + "/"
        if any(x in rp for x in EXCLUDE_DIRS):
            dirs[:] = []
            continue
        for fn in files:
            ext = os.path.splitext(fn)[1].lower()
            if ext not in EXTS: continue
            if fn.startswith("~$"): continue  # office lock files
            path = os.path.join(root, fn)
            scanned += 1
            txt = extract_text(path)
            if not txt: continue
            recs = find_contacts(txt, path)
            if recs:
                hit_files += 1
                out.extend(recs)
            if scanned % 50 == 0:
                print(f"...scanned {scanned} files, {len(out)} raw records", file=sys.stderr)
    with open(os.path.join(HOME,"flip-analyzer","local_contacts_raw.json"),"w") as f:
        json.dump(out, f)
    print(f"DONE local: scanned={scanned} files_with_contacts={hit_files} records={len(out)}", file=sys.stderr)

if __name__ == "__main__":
    main()
