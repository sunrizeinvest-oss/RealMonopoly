# Organize Plan — Local Mac

**Phase 1: discovery only. Nothing moved yet.**

## Numbers

- Files scanned: **1022**
- Exact duplicate groups (MD5): **104** → **169** redundant files, ~**99 MB** recoverable
- Likely duplicates by name+size (too big to hash): **0** groups → **0** redundant files
- Files with no detected project: **740** (72%) → go to `_NeedsReview/`
- Files with no detected subfolder: **655** (64%)

## Proposed target structure

```
/Users/sunniyaremchuk/RealEstate_Organized/
├── <Project Name>/
│   ├── Contracts/
│   ├── Plans & Permits/
│   ├── Financials/
│   ├── Investor Docs/
│   ├── Construction/
│   ├── Photos/
│   ├── Marketing & OM/
│   ├── Reports/
│   ├── Legal/
│   └── _NeedsReview/
├── _Library/                      (templates, scripts, reference docs)
├── _Duplicates/<Project>/         (everything but the keeper from each dup group)
└── _NeedsReview/                  (files with no detected project)
```

## Projects detected

| Project | Files |
|---|---:|
| (unknown) | 740 |
| Allendale | 146 |
| 10612 127 Street | 25 |
| 9121 152 | 20 |
| Jasper Park | 18 |
| 6408 106 | 18 |
| 15981 110B Ave | 7 |
| Mayfield 110 | 7 |
| 10646 61 | 5 |
| 10612 127 | 5 |
| 106 Street Property | 4 |
| Mayfield | 4 |
| Lake Ridge | 4 |
| 10407 45 | 3 |
| 10646 61 Ave | 3 |
| Distressed Property Outreach | 2 |
| High Park | 2 |
| Allendale 6-Plex | 2 |
| Allendale 5-Plex | 1 |
| 2025 03 | 1 |
| 9724 82 | 1 |
| 10848 153 St | 1 |
| 10636 127 | 1 |
| Manhattan | 1 |
| 10646 106 | 1 |

## Subfolder distribution

| Subfolder | Files |
|---|---:|
| (uncategorized) | 655 |
| Photos | 168 |
| Contracts | 82 |
| Financials | 78 |
| Plans & Permits | 17 |
| Marketing & OM | 10 |
| Investor Docs | 8 |
| Reports | 3 |
| Legal | 1 |

## File types

| Extension | Count |
|---|---:|
| .pdf | 482 |
| .xlsx | 219 |
| .csv | 63 |
| .docx | 61 |
| .jpg | 56 |
| .png | 46 |
| .heic | 41 |
| .jpeg | 18 |
| .zip | 14 |
| .numbers | 6 |
| .md | 6 |
| .svg | 3 |
| .webp | 2 |
| .txt | 2 |
| .gif | 2 |
| .xls | 1 |

## Biggest space savings from dedup (top 15)

| Group | Filename | Copies | Size each | Total wasted |
|---:|---|---:|---:|---:|
| 1 | CMHC presentation draft 1-2.pdf | 2 | 17.9 MB | 17.9 MB |
| 2 | 10646 61 Inc. Investment Summary (1) (1).xlsx | 3 | 4.3 MB | 8.6 MB |
| 3 | 14858, 8 Unit Complex, Sunrize Investments, 9121 152 Street, Jasper Park, FINAL (1).pdf | 2 | 5.3 MB | 5.3 MB |
| 4 | New 5-unit infill in Allendale.png | 3 | 2.7 MB | 5.3 MB |
| 5 | Sage Way Okotoks - Development Permit (1).pdf | 2 | 5.3 MB | 5.3 MB |
| 6 | 15014 5-Unit Complex 6408 106 St Allendale DRAFT.pdf | 2 | 4.6 MB | 4.6 MB |
| 7 | Purchase Contract 10646 106 St Seller signed.pdf | 2 | 3.5 MB | 3.5 MB |
| 8 | 15981 110B Ave NW Term Sheet (1).pdf | 2 | 3.4 MB | 3.4 MB |
| 9 | Blueprints-Fourplex Back to Back .pdf | 2 | 3.1 MB | 3.1 MB |
| 10 | 10612 - 127 STREET NW- Landridge Homes-Sales Contract (3).pdf | 4 | 1.0 MB | 2.9 MB |
| 11 | Modern infill building in lush neighborhood.png | 2 | 2.7 MB | 2.7 MB |
| 12 | 10612 - 127 STREET NW- Schedule C (2) (1).pdf | 4 | 0.7 MB | 2.2 MB |
| 13 | Peakhill Commitment Letter 6408 106 St (1).pdf | 6 | 0.4 MB | 2.2 MB |
| 14 | 9121 152 ST WDV.4.pdf | 2 | 1.9 MB | 1.9 MB |
| 15 | CMLS Invoice - COI Placement Fee.pdf | 5 | 0.5 MB | 1.9 MB |

## Next: review the two CSVs in this folder

- `dedup_report.csv` — every duplicate group, keeper marked `YES`. Edit if you want to keep a different copy.
- `folder_map.csv` — proposed target path for each file. Edit any wrong rows.

When the plan looks right, tell me to **execute Phase 2** and I'll create the new folders and move files in batches with confirmation.
