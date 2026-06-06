# Outreach Pipeline Tracker

**Updated:** _live document — update after every interaction_

---

## STATUS LIFECYCLE

Every contact goes through this funnel. Track in each `seg*.csv` file's `status` column.

```
new → contacted → replied → meeting → committed → CLOSED
                       ↓
                      dead (with reason)
```

**Capital side:** committed = signed subscription agreement
**Deal side:** committed = signed LOI

---

## WEEKLY TARGETS

| Segment | Weekly outreach | Weekly conversions target |
|---|---:|---|
| S1 Edmonton MF Investors | 25 emails | 3 replies → 1 meeting |
| S2 AB/BC Lenders | 5 emails | 2 replies → 1 added to rolodex |
| S3 Other-market Investors | 15 emails | 1 reply → 1 meeting |
| S4 Edmonton MF Owners (CALL) | 30 calls | 10 conversations → 2 qualified |
| S5 AB Land Owners (CALL) | 15 calls | 5 conversations → 1 qualified |
| S6 Edmonton Sellers | 10 touches | 3 replies → 1 LOI |
| S7 AB Realtors | 10 emails | 3 replies → ongoing |
| S8 Builders/Contractors | as needed | — |

**Total weekly load:** ~80 emails + 45 calls = ~3 hours focused work, spread across 5 days

---

## DAILY RITUAL (15 min)

**Morning (10 min):**
- [ ] Open today's segment file (rotate: Mon-S1, Tue-S2, Wed-S4, Thu-S6, Fri-S1+followups)
- [ ] Filter by status="new" — pick 10 names
- [ ] Pull the matching template from `outreach/templates/`
- [ ] Personalize line 1 of each (use `sources` column for signal)
- [ ] Send batch

**Evening (5 min):**
- [ ] Log replies → update status + last_contact + notes
- [ ] Schedule next_action_date for any "call_back" rows
- [ ] Mark dead anything with hard-no replies

---

## WEEKLY REVIEW (Friday, 30 min)

```
This week:
- Outreach sent:     ___ across segments S1-S8
- Replies received:  ___ (positive: ___, negative: ___)
- Meetings booked:   ___
- LOIs sent:         ___
- $ raised this week: $___
- Top signal:        _______________________________________
- Top miss:          _______________________________________
- Next week focus:   _______________________________________
```

Paste this block into `outreach/weekly_log.md` every Friday.

---

## CURRENT FUNNEL — fill in counts after first week of outreach

| Stage | Capital pipeline (S1+S2+S3) | Deal pipeline (S4+S5+S6) |
|---|---:|---:|
| New | | |
| Contacted | | |
| Replied | | |
| Meeting booked | | |
| Term sheet / LOI out | | |
| Committed | | |
| Closed | | |
| Dead | | |

---

## KILL-RULES (when to mark dead)

- 3 unanswered emails over 30 days = dead (re-add to cold list in 12 months)
- Hard "no" reply = dead (re-add if their context changes — promotion, new fund, etc.)
- Voicemail × 3 with no callback = dead
- Any "remove me" / "unsubscribe" = PERMANENT dead, add email to `outreach/do_not_contact.txt`
