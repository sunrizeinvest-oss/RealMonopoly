# 🏠 START HERE — Your Files Index

Everything I built for you, organized by what it does for you.

---

## 🎯 THE THREE THINGS YOU PROBABLY WANT FIRST

| # | What | Where | Use it for |
|---|---|---|---|
| 1 | **Outreach segments (9 ready-to-call lists)** | `~/flip-analyzer/outreach/segments/` | Open in Excel/Numbers, start working through `status` column |
| 2 | **Outreach templates (5 email/call scripts)** | `~/flip-analyzer/outreach/templates/` | Copy/paste into Gmail when sending outreach |
| 3 | **Your organized projects (Mac)** | `~/RealEstate_Organized/` | All your real estate files, sorted by project |

---

## 📞 OUTREACH FOLDER — `~/flip-analyzer/outreach/`

```
outreach/
├── PIPELINE_TRACKER.md              ← your daily/weekly ritual + targets
│
├── segments/                        ← 9 contact lists, each with status tracking
│   ├── seg0_WARM_your_own_network.csv             2,974  ⭐ START HERE — people you know
│   ├── seg1_edmonton_MF_investors.csv               683  🔥 raise list (email)
│   ├── seg2_AB_BC_debt_sources.csv                   69     lenders + brokers
│   ├── seg3_other_market_investors.csv            1,914     out-of-province
│   ├── seg4_edmonton_MF_owners_to_call.csv           33  📞 cold-call list
│   ├── seg5_AB_land_owners.csv                       38     land sourcing
│   ├── seg6_edmonton_sellers.csv                    139     quick-close
│   ├── seg7_AB_realtors.csv                          83     referral network
│   └── seg8_AB_builders_contractors.csv             635     construction team
│
└── templates/                       ← what to say
    ├── 01_investor_warm_intro.md           → use with seg0, seg1
    ├── 02_lender_intro.md                  → use with seg2
    ├── 03_property_owner_cold_call.md      → use with seg4, seg5 (PHONE)
    ├── 04_realtor_referral.md              → use with seg7
    └── 05_other_market_investor.md         → use with seg3
```

Each segment CSV has 13 columns: `status | name | email | phone | company | why_relevant | markets | roles | asset_classes | last_contact | next_action | next_action_date | notes`

Fill in `status` as you work: `new → contacted → replied → meeting → committed → CLOSED` (or `dead`)

---

## 📊 CORE CONTACT DATA — `~/flip-analyzer/`

| File | Rows | What |
|---|---:|---|
| `organized_contacts.csv` | 28,817 | Master file — every contact, deep-tagged. Source of all segments above. |
| `companies_phones.csv` | 25,480 | Co-Star property owner database (companies + phones, no emails) |
| `contacts.csv` | 3,337 | Original email-anchored contacts (older, kept for reference) |

---

## 🏗 YOUR MAC PROJECT FILES — `~/RealEstate_Organized/`

Every active project lives in its own folder. Inside each: Contracts / Plans & Permits / Financials / Investor Docs / Construction / Photos / Marketing / Reports / Legal.

Projects with files:
- Allendale 5-Plex (6408 106 St)
- Allendale 6-Plex (10646 61 Ave)
- Allendale (generic)
- Allendale 2
- Jasper Park
- Mayfield 110
- Inglewood 6-Plex (11328 126 St)
- Verum (9121 152 St)
- Emanation (12020 129 St)
- Camrose 127 Acres
- 10612 127 Street NW
- 15981 110B Ave NW (9-Plex)
- Manhattan
- Sherbrooke
- 10401 154
- 8207 121
- 2811 34
- SoCal Multifamily Portfolio
- West Naturopath
- Mission
- Olds AB
- … and `_Library/` for templates / leads / marketing / tax / personal docs

---

## ⚙️ TOOLS (scripts you can re-run anytime)

| Script | What it does |
|---|---|
| `segment.py` | Custom contact slicer. `python3 segment.py --roles investor --markets calgary --has_email --out my_list.csv` |
| `build_priority_segments.py` | Regenerates the 8 priority segment CSVs from `organized_contacts.csv` |
| `build_outreach_lists.py` | Generates broader outreach lists (older, less refined version) |
| `organize/scan_local.py` | Re-scan your Mac for any new files |
| `organize/build_reports.py` | Regenerate the dedup + folder plan reports |
| `organize/execute_moves.py` | Run another pass of moving files into `~/RealEstate_Organized/` |
| `organize/organize_drive_v2.gs` | Apps Script that organizes your Google Drive (partial — 13 folders done) |

---

## 📁 SUPPORTING FILES (you probably won't touch)

- `organize/local_inventory.json` — full inventory of every file we scanned on your Mac
- `organize/move_log.csv` — audit log of every file we moved (rollback-able)
- `organize/PLAN.md` + `organize/DRIVE_PLAN.md` — original organization plans
- `organize/conference_photos_ocr.txt` — OCR'd text from your 41 conference photos
- `organize/dedup_report.csv` — every duplicate group we found
- `drive_*.json` — internal queues used during the Drive scan
- `*.py` extraction scripts — the parsers that built `organized_contacts.csv`

---

## 🚀 SUGGESTED FIRST 30 MINUTES

1. **Open** `outreach/segments/seg0_WARM_your_own_network.csv` in Numbers
2. **Filter** to rows with both email AND phone (your top-quality warm contacts)
3. **Pick 5 people** you actually remember
4. **Open** `outreach/templates/01_investor_warm_intro.md`
5. **Send 5 personalized emails** — change `{{first_name}}` to their name, drop in your active projects
6. **Mark them `contacted` + today's date** in the CSV
7. **You've just started your raise funnel.** Repeat tomorrow with the next 5.
