#!/usr/bin/env python3
"""Extract email-anchored contacts from Drive read_file_content saved results.

Reads drive_path_map.json: list of {path, title, url}.
For each path, opens the JSON {fileContent: string}, extracts contacts, and
appends one JSON record per line to drive_contacts_raw.jsonl.
"""
import os, re, json, sys

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?1[\s.\-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.\-])\d{3}[\s.\-]\d{4}")
NAME_RE  = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b")

BAD_SUB = ("sentry","example.com","example.org","schema.org","googleapis","@2x","@3x","domain.com","yourdomain","wixpress","no-reply@","noreply@")
BAD_TLD = (".png",".jpg",".jpeg",".gif",".svg",".js",".css",".ts",".webp")
FREE = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","live.com","aol.com","me.com","msn.com","protonmail.com","shaw.ca","telus.net","yahoo.ca","hotmail.ca","live.ca"}

def valid(e):
    el=e.lower()
    if any(b in el for b in BAD_SUB): return False
    if any(el.endswith(t) for t in BAD_TLD): return False
    if el.count("@")!=1: return False
    if len(el)>100: return False
    return True

def extract(text, source, url):
    out=[]
    seen={}
    for m in EMAIL_RE.finditer(text):
        em=m.group(0).strip(".").lower()
        if not valid(em): continue
        a,b=max(0,m.start()-160),min(len(text),m.end()+160)
        ctx=text[a:b]
        phones=[]
        for pm in PHONE_RE.finditer(ctx):
            d=re.sub(r"\D","",pm.group(0))
            if len(d) in (10,11): phones.append(pm.group(0).strip())
        before=text[max(0,m.start()-80):m.start()]
        nm=NAME_RE.findall(before)
        name=nm[-1] if nm else ""
        dom=em.split("@")[1]
        company="" if dom in FREE else dom.split(".")[0]
        # de-dupe per source, accumulating phones
        if em in seen:
            seen[em]["phones"]=sorted(set(seen[em]["phones"])|set(phones))
            if not seen[em]["name"] and name: seen[em]["name"]=name
        else:
            seen[em]={"email":em,"phones":sorted(set(phones)),"name":name,"company":company,"source":source,"source_url":url,"context":" ".join(ctx.split())[:200]}
    return list(seen.values())

def main():
    mp=json.load(open("/Users/sunniyaremchuk/flip-analyzer/drive_path_map.json"))
    out_path="/Users/sunniyaremchuk/flip-analyzer/drive_contacts_raw.jsonl"
    n_files=0; n_recs=0
    with open(out_path,"a") as out:
        for e in mp:
            p=e["path"]
            if not os.path.exists(p):
                print("missing:",p,file=sys.stderr); continue
            try:
                raw=open(p).read()
                try:
                    d=json.loads(raw)
                    text=d.get("fileContent","") if isinstance(d,dict) else raw
                except Exception:
                    text=raw  # treat as plain text
                if not text: continue
                recs=extract(text, e["title"], e["url"])
                for r in recs: out.write(json.dumps(r)+"\n")
                n_files+=1; n_recs+=len(recs)
            except Exception as ex:
                print("ERR",p,ex,file=sys.stderr)
    print(f"processed {n_files} drive files, {n_recs} records appended")

if __name__=="__main__":
    main()
