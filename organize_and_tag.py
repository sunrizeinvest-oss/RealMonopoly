#!/usr/bin/env python3
"""Merge all contact sources + Co-Star companies into one organized CSV with
deep tags: role / asset_class / strategy / market.

Inputs:
  local_contacts_raw.json   (email-anchored, 7,990 raw)
  drive_contacts_raw.jsonl  (email-anchored, ~2,948 raw)
  costar_records.jsonl      (company+phone, ~50,620 raw)

Output:
  organized_contacts.csv with columns:
  record_type, name, email, phones, company, roles, asset_classes,
  strategies, markets, notes, sources
"""
import os, re, json, csv
from collections import defaultdict

HOME = os.path.expanduser("~")
DIR = os.path.join(HOME, "flip-analyzer")
OUT = os.path.join(DIR, "organized_contacts.csv")

# ----- tag vocabularies (canonical labels) -----
ROLES = ["Realtor","Builder","Developer","Investor","Lender",
         "Contractor","Mortgage broker","Seller","Inspector","Property owner"]
ASSETS = ["Single-family","Multifamily","Infill","Commercial",
          "Industrial","Hotel","Land","Mixed-use"]
STRATEGIES = ["Flip","Rental","BRRRR","Seller-financing","Cash buy",
              "Value-add","Redevelopment","New development"]
MARKETS = ["Edmonton","Calgary","Vancouver","Toronto",
           "Other Canada","USA","International"]

# ----- role rules -----
ROLE_KEYWORDS = {
    "Realtor": [r"\brealtor\b", r"\bagent\b", r"\bbroker(?:age)?\b",
                r"\bexp realty\b", r"\bcentury 21\b", r"\bre/?max\b",
                r"\bsotheby", r"\broyal\s*lepage", r"\bsutton group",
                r"\bcir realty\b", r"\bcoldwell banker\b", r"\bcolliers\b",
                r"\bcushman", r"\bjll\b", r"\bavison young\b", r"\bsable realty\b"],
    "Builder":  [r"\bbuilds?\s+(?:homes?|houses?)", r"\bbuilder\b",
                 r"\bcustom\s+homes?\b", r"\bgeneral contractor\b",
                 r"\bconstruction\s+(?:co|ltd|inc)"],
    "Developer":[r"\bdeveloper\b", r"\bdevelopment\s+(?:co|corp|group|inc|ltd)",
                 r"\bdevelops?\s+(?:land|communities|sites|projects?)",
                 r"\bsubdivision\b", r"\bland developer\b"],
    "Investor": [r"\binvestor\b", r"\binvest(?:ing|ed)?\b", r"\bbuys?\s+(?:a lot|lots)",
                 r"\bcapital partners?\b", r"\bequity (?:partners?|fund)",
                 r"\binvestment manager\b", r"\bjoint venture\b", r"\bJV\b",
                 r"\bREIT\b", r"\bsearches?\s+for\s+(?:deals|properties)",
                 r"\bcash buyer\b", r"\bvalue add\b", r"\bpassive invest"],
    "Lender":   [r"\blender\b", r"\bprivate\s+money\b", r"\bPML\b",
                 r"\bhard money\b", r"\bmortgage\s+broker\b",
                 r"\bcapital corp\b", r"\bbank\b", r"\binsurance\s+company\b"],
    "Contractor":[r"\bcontractor\b", r"\btrades\b", r"\bcarpentry?\b",
                 r"\bplumb(?:er|ing)\b", r"\bconcrete\b", r"\bappraiser\b",
                 r"\bsurvey(?:or)?\b", r"\bframing\b"],
    "Mortgage broker":[r"\bmortgage\s+broker\b", r"\bmortgage alliance\b",
                       r"\bmortgage\s+group\b"],
    "Seller":   [r"\bsellers?\b", r"\bland sold\b", r"\bland sellers\b",
                 r"\bdistressed\s+property\b"],
    "Inspector":[r"\binspector\b", r"\bhome inspection\b", r"\bappraiser\b",
                 r"\bappraisal\b"],
}

ROLE_BY_DOMAIN = {
    "exprealty.com":"Realtor","cirrealty.ca":"Realtor","sablerealty.ca":"Realtor",
    "royallepage.ca":"Realtor","royallepagecommercial.com":"Realtor",
    "remax.ca":"Realtor","remax.net":"Realtor","kw.com":"Realtor",
    "century21.ca":"Realtor","cwedm.com":"Realtor","jll.com":"Realtor",
    "avisonyoung.com":"Realtor","colliers.com":"Realtor","cresa.com":"Realtor",
    "calvinrealty.ca":"Realtor","yhsg.pro":"Realtor","cbre.com":"Realtor",
    "berkadia.com":"Realtor","nmrk.com":"Realtor","walkerdunlop.com":"Realtor",
    "edmrealtygroup.ca":"Realtor","greengroup.estate":"Realtor",
    "treeholm.com":"Realtor","aicrecommercial.com":"Realtor",
    "investormeldave.com":"Investor","altynequities.com":"Investor",
    "tukcapital.com":"Investor","capitalgp.ca":"Investor",
    "tallgrass.vc":"Investor","brei.ca":"Investor",
    "investmentacademy.ca":"Investor","theinvestmentacademy.ca":"Investor",
    "kingsettcapital.com":"Investor","slateam.com":"Investor",
    "tclatam.com":"Investor","blackstone.com":"Investor",
    "rahalcta.ca":"Lender","triadfinancial.ca":"Lender",
    "ajitthiara.com":"Mortgage broker","mycranston.ca":"Builder",
    "welcomehomes.ca":"Builder","activehomes.ca":"Builder",
    "mycranston.ca":"Builder","milestonebuildergroup.com":"Builder",
    "carrington.ca":"Builder","yegcontractors.ca":"Contractor",
    "constructshon.ca":"Builder","statelydevelopments.ca":"Developer",
    "skywardhomes.ca":"Builder","glowstonehomes.com":"Builder",
    "equitybuilthomes.ca":"Builder","varsityhomesltd.ca":"Builder",
    "ndura.ca":"Developer","amrik.ca":"Developer",
    "tacada.ca":"Developer","edmontondevelopmentcorporation.com":"Developer",
    "wisemancontracting.com":"Contractor",
    "lestonholdings.com":"Investor",
}

# ----- asset-class rules -----
ASSET_KEYWORDS = {
    "Multifamily": [r"\bmulti[\s\-]?family\b", r"\bmulti[\s\-]?fam\b",
                    r"\bMF\b", r"\bapartments?\b", r"\b\d+\s*plex\b",
                    r"\b\d+[\s\-]?unit", r"\bMFH\b"],
    "Single-family":[r"\bsingle[\s\-]?family\b", r"\bSFH?\b",
                     r"\bduplex(?:es)?\b", r"\bhouse(?:s)?\b",
                     r"\btownhouse", r"\bbungalow"],
    "Infill":   [r"\binfill\b", r"\bcorner\s+lot", r"\blots?\b",
                 r"\binfill\s+lots?\b"],
    "Commercial":[r"\bcommercial\b", r"\bretail\b", r"\boffice\b",
                  r"\bstrip\s+mall", r"\bplaza\b", r"\bbusiness(?:es)?\b"],
    "Industrial":[r"\bindustrial\b", r"\bwarehouse\b", r"\bdistribution"],
    "Hotel":    [r"\bhotel\b", r"\bhospitality\b", r"\bmotel\b",
                 r"\bresort\b", r"\binn\b"],
    "Land":     [r"\bland\b", r"\bacre(?:s|age)?\b", r"\bsubdivision\b",
                 r"\braw\s+land\b", r"\bcommercial\s+land\b"],
    "Mixed-use":[r"\bmixed[\s\-]?use\b", r"\bmixed[\s\-]?use\b"],
}

# ----- strategy rules -----
STRAT_KEYWORDS = {
    "Flip":         [r"\bflips?\b", r"\bflipping\b", r"\bfix\s*(?:and|&)\s*flip"],
    "Rental":       [r"\brentals?\b", r"\bbuy\s+and\s+hold", r"\brent\s+to\s+own"],
    "BRRRR":        [r"\bBRRRR\b"],
    "Seller-financing":[r"\bseller\s*financ", r"\bseller\s*finance",
                       r"\bAFS\b", r"\bRTO\b", r"\brent\s+to\s+own",
                       r"\bowner\s+financ"],
    "Cash buy":     [r"\bcash\s+buyer", r"\bclos(?:es|ing)\s+cash",
                     r"\ball\s+cash\b", r"\bcash\s+offer"],
    "Value-add":    [r"\bvalue[\s\-]?add", r"\bvalue\s+add\b",
                     r"\brehab", r"\bfixer[\s\-]?upper"],
    "Redevelopment":[r"\bredevelopment\b", r"\bredeveloping\b"],
    "New development":[r"\bnew\s+development\b", r"\bground\s+up\b",
                       r"\bnew\s+build", r"\bnew\s+construction"],
}

# ----- market rules (by phone area code & context) -----
AREA_CODES = {
    "Edmonton": {"780","587","825"},
    "Calgary":  {"403","587","825"},
    "Vancouver":{"604","778","236","672"},
    "Toronto":  {"416","647","437","289","905","365"},
}
OTHER_CANADA_AREAS = {"506","902","709","204","306","867","867","250","867","450","438","514","418","581","819"}
USA_AREAS = {"212","213","312","305","415","404","210","281","305","310","415","202","617","303","608","212","646","312"}

MARKET_KEYWORDS = {
    "Edmonton":   [r"\bedmonton\b", r"\bYEG\b", r"\bstrathcona\b",
                   r"\ballendale\b", r"\bmillwoods\b", r"\bgarneau\b",
                   r"\bsherwood\s+park\b", r"\bst\.?\s+albert\b"],
    "Calgary":   [r"\bcalgary\b", r"\bYYC\b", r"\bairdrie\b",
                  r"\bcochrane\b"],
    "Vancouver": [r"\bvancouver\b", r"\bburnaby\b", r"\brichmond\b",
                  r"\bsurrey\b", r"\blangley\b", r"\bdelta\b",
                  r"\bcoquitlam\b", r"\bnorth\s+vancouver\b"],
    "Toronto":   [r"\btoronto\b", r"\bGTA\b", r"\bmississauga\b",
                  r"\bbrampton\b", r"\bmarkham\b", r"\bvaughan\b",
                  r"\boakville\b"],
    "Other Canada":[r"\bregina\b", r"\bsaskatoon\b", r"\bwinnipeg\b",
                    r"\bottawa\b", r"\bmontre?al\b", r"\bquebec\b",
                    r"\bhalifax\b", r"\bvictoria\b", r"\bkelowna\b",
                    r"\bnova\s+scotia\b", r"\bnew\s+brunswick\b",
                    r"\bnewfoundland\b", r"\bPEI\b"],
    "USA":       [r"\bUSA\b", r"\bnew\s+york\b", r"\blos\s+angeles\b",
                  r"\bchicago\b", r"\bhouston\b", r"\bmiami\b",
                  r"\bsan\s+francisco\b", r"\bSoCal\b", r"\bCalifornia\b",
                  r"\bsection\s*8\b"],
    "International":[r"\bbrazil\b", r"\bperu\b", r"\bcolombia\b",
                     r"\bchile\b", r"\bcosta\s+rica\b", r"\bsingapore\b",
                     r"\bhong\s+kong\b", r"\blondon\b", r"\bzurich\b",
                     r"\bmexico\b"],
}

def find_matches(text, keyword_map):
    """Return set of canonical labels whose any regex matches the text."""
    t = text.lower()
    out = set()
    for label, patterns in keyword_map.items():
        for pat in patterns:
            if re.search(pat, t):
                out.add(label); break
    return out

def market_from_phone(phone):
    """Phone string like '(780) 555-1234' or '+1234567890'."""
    digits = re.sub(r"\D","", phone)
    if not digits: return set()
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10:
        # international
        return {"International"}
    area = digits[:3]
    out = set()
    if area in AREA_CODES["Edmonton"]: out.add("Edmonton")
    if area in AREA_CODES["Calgary"] and area not in {"780"}: out.add("Calgary")
    if area in AREA_CODES["Vancouver"]: out.add("Vancouver")
    if area in AREA_CODES["Toronto"]: out.add("Toronto")
    if not out and area in OTHER_CANADA_AREAS: out.add("Other Canada")
    if not out and area in USA_AREAS: out.add("USA")
    if not out: out.add("USA")  # 10-digit non-Canadian default
    return out

# ----- role derivation from Co-Star secondary_type -----
COSTAR_ROLE = {
    "Investment Manager":"Investor","Pension Fund":"Investor",
    "Sovereign Wealth Fnd":"Investor","Sovereign Wealth Fund":"Investor",
    "Equity Funds":"Investor","Other/Unknown-Instl":"Investor",
    "Public REIT":"Investor","Private REIT":"Investor","REOC":"Investor",
    "Developer":"Developer","Developer/Owner-RGNL":"Developer",
    "Developer - Regional":"Developer","Developer - National":"Developer",
    "Bank":"Lender","Insurance Company":"Lender",
    "Government":"Property owner","Non Profit":"Property owner",
    "Religious":"Property owner","Educational":"Property owner",
    "Medical":"Property owner","Corporation":"Property owner",
    "Other - Private":"Property owner","Individual":"Property owner",
    "Trust":"Property owner","Other - Private":"Property owner",
}

# ----- province → market -----
PROV_MARKET = {
    "AB": None,  # ambiguous (Edmonton vs Calgary) — leave to context
    "BC": "Vancouver",
    "ON": "Toronto",
    "QC": "Other Canada","MB":"Other Canada","SK":"Other Canada",
    "NS":"Other Canada","NB":"Other Canada","PE":"Other Canada","NL":"Other Canada",
}

# ===========================================================
# Build records
# ===========================================================
print("loading inputs...")
records = []  # list of dicts

# --- email-anchored: local + drive ---
def add_email_record(r, origin):
    r["origin"] = origin
    records.append(r)

with open(os.path.join(DIR,"local_contacts_raw.json")) as f:
    for r in json.load(f):
        add_email_record(r, "local")
print(f"  local: {sum(1 for r in records if r['origin']=='local')}")

n_before = len(records)
with open(os.path.join(DIR,"drive_contacts_raw.jsonl")) as f:
    for line in f:
        line=line.strip()
        if not line: continue
        add_email_record(json.loads(line), "drive")
print(f"  drive: {len(records)-n_before}")

# Group email records by email
def norm_phone_digits(p):
    return re.sub(r"\D","",p)

email_groups = defaultdict(lambda: {
    "names": set(), "phones": set(), "phone_strings": set(),
    "companies": set(), "contexts": [], "sources": set(), "origins": set()
})
for r in records:
    em = r.get("email","").lower().strip()
    if not em or "@" not in em: continue
    g = email_groups[em]
    if r.get("name"): g["names"].add(r["name"])
    for p in r.get("phones",[]):
        d = norm_phone_digits(p)
        if d:
            g["phones"].add(d)
            g["phone_strings"].add(p)
    if r.get("company"): g["companies"].add(r["company"])
    if r.get("context"): g["contexts"].append(r["context"])
    src = r.get("source","")
    if src:
        src = os.path.basename(src) if r["origin"]=="local" else f"[Drive] {src}"
        g["sources"].add(src)
    g["origins"].add(r["origin"])

print(f"  unique emails: {len(email_groups)}")

# --- Co-Star companies + phones ---
costar_groups = []
with open(os.path.join(DIR,"costar_records.jsonl")) as f:
    for line in f:
        line=line.strip()
        if line: costar_groups.append(json.loads(line))
print(f"  costar raw: {len(costar_groups)}")

# Dedupe Co-Star by (company-or-name, phone digits)
def norm_co(s): return re.sub(r"[^\w]","",s.lower())
co_dedup = {}
for r in costar_groups:
    key = (norm_co(r.get("name") or r.get("company") or ""), norm_phone_digits(r["phone"]))
    if not all(key): continue
    if key in co_dedup:
        co_dedup[key]["sources"].add(r.get("source",""))
    else:
        co_dedup[key] = {
            "name": r.get("name",""), "company": r.get("company",""),
            "city": r.get("city",""), "province": r.get("province",""),
            "type": r.get("type",""), "secondary_type": r.get("secondary_type",""),
            "phone": r["phone"], "sources": {r.get("source","")}
        }
print(f"  costar unique: {len(co_dedup)}")

# ===========================================================
# Tag + write
# ===========================================================
def best_phone_format(digits_set, phone_strings):
    """Pick the cleanest formatted phone per digit-string."""
    out = []
    for d in sorted(digits_set):
        canon = d
        if len(canon) == 11 and canon.startswith("1"): canon = canon[1:]
        if len(canon) == 10:
            out.append(f"({canon[0:3]}) {canon[3:6]}-{canon[6:10]}")
        else:
            out.append("+"+d)
    return "; ".join(out)

def best_name(names):
    candidates = [n for n in names if n and len(n)>1]
    if not candidates: return ""
    multi = [n for n in candidates if " " in n]
    pool = multi if multi else candidates
    from collections import Counter
    return Counter(pool).most_common(1)[0][0]

def derive_tags_email(g, email):
    text = " | ".join(g["contexts"][:30]) + " | " + " | ".join(g["sources"])
    text += " | " + " | ".join(g["names"]) + " | " + " | ".join(g["companies"])
    domain = email.split("@")[1].lower() if "@" in email else ""
    roles = find_matches(text, ROLE_KEYWORDS)
    if domain in ROLE_BY_DOMAIN:
        roles.add(ROLE_BY_DOMAIN[domain])
    # source-file hinted roles
    src_low = text.lower()
    if "contacts_realtor" in src_low or "calgary_agents" in src_low or "toronto_1000" in src_low: roles.add("Realtor")
    if "contacts_builders" in src_low or "buyers_builders" in src_low: roles.add("Builder")
    if "contractors_trades" in src_low: roles.add("Contractor")
    if "contacts_multifamily" in src_low or "buyers_multifamily" in src_low \
       or "multifamily crm" in src_low or "multifamily investors" in src_low: roles.add("Investor")
    if "contacts_serious_investors" in src_low or "investors to organize" in src_low \
       or "admin_ investors" in src_low or "section8_buyer_hitlist" in src_low: roles.add("Investor")
    if "contacts_land_developers" in src_low or "buyers_land_developers" in src_low \
       or "developer & builders" in src_low: roles.add("Developer")
    if "lender" in src_low or "private_lender" in src_low: roles.add("Lender")
    if "mortgage" in src_low: roles.add("Mortgage broker")
    if "land sellers" in src_low or "land sold" in src_low or "distressed_property" in src_low: roles.add("Seller")
    # Buyer files imply Investor unless other role found
    if "buyer" in src_low and not roles:
        roles.add("Investor")
    if not roles:
        roles.add("Investor")  # default for unspecified contacts in real-estate context

    assets = find_matches(text, ASSET_KEYWORDS)
    strategies = find_matches(text, STRAT_KEYWORDS)
    markets = find_matches(text, MARKET_KEYWORDS)
    # markets from phone
    for p in g["phone_strings"]:
        markets |= market_from_phone(p)
    return roles, assets, strategies, markets

def derive_tags_costar(r):
    text = " | ".join([r.get("company",""), r.get("city",""),
                       r.get("type",""), r.get("secondary_type",""),
                       " | ".join(r["sources"])])
    roles = set()
    sec = r.get("secondary_type","").strip()
    if sec in COSTAR_ROLE:
        roles.add(COSTAR_ROLE[sec])
    else:
        # fall back to type
        t = r.get("type","").lower()
        if "institutional" in t or "private equity" in t or "public" in t: roles.add("Investor")
        elif "user" in t: roles.add("Property owner")
        elif "private" in t: roles.add("Property owner")
        else: roles.add("Property owner")
    # individuals could be sellers (these files are buyer/seller dumps)
    src_low = " ".join(r["sources"]).lower()
    if "sellers" in src_low and "Property owner" in roles:
        roles.add("Seller")
    if "buyers" in src_low and "Investor" not in roles and sec != "Individual":
        roles.add("Investor")

    assets = find_matches(text, ASSET_KEYWORDS)
    # asset hints from source file title
    if "hospotality" in src_low or "hospitality" in src_low: assets.add("Hotel")
    if "multifamily" in src_low or " mf" in src_low: assets.add("Multifamily")
    if "land" in src_low and "land sellers" not in src_low and "land bought" not in src_low: assets.add("Land")
    if "land sellers" in src_low or "land sold" in src_low or "land bought" in src_low: assets.add("Land")

    strategies = find_matches(text, STRAT_KEYWORDS)

    markets = find_matches(text, MARKET_KEYWORDS)
    # market from province
    prov = r.get("province","").strip()
    if prov in PROV_MARKET and PROV_MARKET[prov]:
        markets.add(PROV_MARKET[prov])
    elif prov == "AB":
        # use city
        c = r.get("city","").lower()
        if "edmonton" in c: markets.add("Edmonton")
        elif "calgary" in c: markets.add("Calgary")
        else: markets.add("Other Canada")
    elif prov and prov not in PROV_MARKET:
        # likely USA state code
        markets.add("USA")
    # market from phone
    markets |= market_from_phone(r["phone"])
    return roles, assets, strategies, markets

# ===========================================================
print("writing organized_contacts.csv ...")
rows = []
for em, g in email_groups.items():
    roles, assets, strats, markets = derive_tags_email(g, em)
    # short notes: first non-empty context truncated
    ctx = next((c for c in g["contexts"] if c), "")
    notes = re.sub(r"\s+"," ",ctx)[:240]
    # company guess
    companies = sorted(g["companies"])
    company = companies[0] if companies else ""
    # if no company but a non-free domain, derive
    domain = em.split("@")[1].lower() if "@" in em else ""
    FREE = {"gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com",
            "live.com","aol.com","me.com","msn.com","protonmail.com",
            "shaw.ca","telus.net","yahoo.ca","hotmail.ca","live.ca","ymail.com"}
    if not company and domain and domain not in FREE:
        company = domain.split(".")[0].title()
    rows.append({
        "record_type":"email_contact",
        "name": best_name(g["names"]),
        "email": em,
        "phones": best_phone_format(g["phones"], g["phone_strings"]),
        "company": company,
        "roles": "; ".join(sorted(roles)),
        "asset_classes": "; ".join(sorted(assets)),
        "strategies": "; ".join(sorted(strats)),
        "markets": "; ".join(sorted(markets)),
        "notes": notes,
        "sources": " | ".join(sorted(g["sources"]))[:400],
    })

for key, r in co_dedup.items():
    roles, assets, strats, markets = derive_tags_costar(r)
    notes = ""
    rows.append({
        "record_type":"company_phone",
        "name": r["name"],
        "email": "",
        "phones": r["phone"],
        "company": r["company"],
        "roles": "; ".join(sorted(roles)),
        "asset_classes": "; ".join(sorted(assets)),
        "strategies": "; ".join(sorted(strats)),
        "markets": "; ".join(sorted(markets)),
        "notes": "",
        "sources": " | ".join(sorted(s for s in r["sources"] if s))[:400],
    })

# Sort: email-contacts first (more actionable), then by primary market, then role, then name
def sort_key(r):
    mk = r["markets"].split(";")[0].strip() if r["markets"] else "zzz"
    ro = r["roles"].split(";")[0].strip() if r["roles"] else "zzz"
    return (0 if r["record_type"]=="email_contact" else 1, mk, ro, (r["name"] or r["company"] or r["email"]).lower())
rows.sort(key=sort_key)

with open(OUT,"w",newline="") as f:
    w = csv.DictWriter(f, fieldnames=[
        "record_type","name","email","phones","company",
        "roles","asset_classes","strategies","markets","notes","sources"])
    w.writeheader()
    w.writerows(rows)

# ----- summary -----
n_total = len(rows)
n_email = sum(1 for r in rows if r["record_type"]=="email_contact")
n_co = n_total - n_email
print(f"\n=== organized_contacts.csv: {OUT} ===")
print(f"total rows:     {n_total}")
print(f"  email contacts: {n_email}")
print(f"  company+phone:  {n_co}")
# tag counts
from collections import Counter
def count_tag(col):
    c=Counter()
    for r in rows:
        for t in (r[col].split(";") if r[col] else []):
            t=t.strip()
            if t: c[t]+=1
    return c
for col,label in [("roles","ROLES"),("asset_classes","ASSET CLASSES"),
                   ("strategies","STRATEGIES"),("markets","MARKETS")]:
    print(f"\n{label}:")
    for t,n in count_tag(col).most_common():
        print(f"  {t:25s} {n}")
