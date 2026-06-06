# Template 03 — Property Owner Cold Call Script

**Use for:** `seg4_edmonton_MF_owners_to_call.csv` and `seg5_AB_land_owners.csv`
**Channel:** PHONE (cold call) — DO NOT email these (Co-Star sourced)
**Goal:** Identify owners open to selling now or in the next 12 months

---

## Opening (15 seconds)

> "Hi, is this {{owner_name}}? My name's Sunni Yaremchuk, I'm a developer here in Edmonton. I'm reaching out about your property at {{address_if_known}} — do you have 30 seconds?"

If they say no: "Totally understand, can I leave you my number for if anything changes?"
If they say yes → continue.

---

## Qualifying questions (in order)

1. **"How long have you owned it?"**
   - <3 yrs → low priority, polite exit
   - 3-10 yrs → possible but not hot
   - 10+ yrs → HOT. Lots of equity, fatigue likely.

2. **"Are you managing it yourself or do you have a PM company?"**
   - Self-managing 10+ yrs = TIRED LANDLORD signal

3. **"If somebody made you a clean cash offer, no conditions, no agents involved, would you be open to hearing it?"**
   - "Maybe" = qualified — book a follow-up call

4. (only if maybe) **"What number would make you stop and think?"**
   - Get a price anchor

---

## Closing

If interested: "I'll put together a one-page offer and email it over by end of week. What's the best email?"
If not now: "Got it — can I check back in a year? Markets change."

---

## Scripts for objections

**"I'm not interested."**
> "Totally fair. Quick question before I let you go — what would have to change for you to be interested?"

**"What's your offer?"**
> "Without seeing inside the property and pulling rent rolls I can't be specific, but our typical range on a building like yours is [give a 15-20% wide band]. I'd rather come back with a real number after seeing it. Worth a 30-min walkthrough?"

**"Are you an agent?"**
> "No, I'm a buyer. I develop and operate properties myself. No commissions, no listings, no contingencies."

---

## Tracker entry after each call
Update the row in `seg4` / `seg5`:
- `status`: contacted | call_back | meeting | offer_sent | dead
- `last_contact`: today's date
- `next_action`: "call back in March", "send offer Friday", etc.
- `next_action_date`: YYYY-MM-DD
- `notes`: any signal (years owned, self-managing, mood, asking price floated)

---

## Goal per call session
- 30 calls → 10 conversations → 2-3 qualified → 1 site visit booked
