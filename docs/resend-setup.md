# Resend Setup — Morning Walkthrough

You're setting this up tomorrow. This doc is built so you can paste-and-go without me. Every command is exact, every value is real.

## Why you're doing this

Today, three things send email and **none of them deliver**:

| Feature | What it does | Today |
|---|---|---|
| Daily Market Brief cron | Sends a morning brief at 8am PT to subscribers | Cron fires → Resend call → 503 → nothing sent |
| Weekly Trigger Digest cron | Sends Monday morning digest of new Market Triggers | Same — silent fail |
| Password reset emails | Supabase sends from `noreply@supabase.io` | Works but looks unprofessional |

After this setup, the first two will deliver. The third stays Supabase-branded until you also configure Supabase's custom SMTP (separate task — not in this doc).

## What you need before you start

- [ ] **You own `rizeai.io`** *(confirmed earlier)*
- [ ] **DNS access** to `rizeai.io` *(wherever you bought it — Namecheap, Porkbun, GoDaddy, Cloudflare, etc.)*
- [ ] A credit card *(free tier covers 3,000 emails/month — enough for first months of users; payment only required if you exceed it)*
- [ ] ~30 minutes total *(15 min on Resend, 5 min on Vercel, 10 min waiting for DNS to propagate)*

---

## Step 1 — Create the Resend account *(3 min)*

1. Open **`https://resend.com/signup`**
2. Sign up with the same email you use for everything (e.g. `sunni@rizeai.io` or your personal Gmail). Use Google sign-in if you want — fastest.
3. After signup you land on the Resend dashboard. The free tier is automatic — no plan selection needed.

## Step 2 — Add and verify `rizeai.io` as a sending domain *(10 min)*

1. In the Resend left sidebar, click **Domains** → top-right **+ Add Domain**.
2. Enter `rizeai.io` and click **Add**.
3. Resend shows a table of DNS records you need to add. **Keep this tab open.** You'll see something like:

| Type | Name/Host | Value | Priority |
|---|---|---|---|
| `MX` | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` | — |
| `TXT` | `resend._domainkey` | (long DKIM string, starts with `p=MIGfMA…`) | — |
| `TXT` | `_dmarc` | `v=DMARC1; p=none;` | — |

   The exact values are unique to your account — **always copy from your Resend dashboard, never from this doc**.

4. In a new tab, log into your DNS provider for `rizeai.io`.
5. Add each row from Resend's table as a DNS record. Two gotchas that trip everyone:
   - **Name field — what to enter:**
     - If your DNS provider auto-appends the domain (Cloudflare, Vercel DNS, most modern ones), enter just `send` and `resend._domainkey` and `_dmarc`.
     - If your DNS provider wants the full hostname (older ones), enter `send.rizeai.io`, `resend._domainkey.rizeai.io`, `_dmarc.rizeai.io`.
     - **Try the short form first.** If verification fails, switch to the long form.
   - **TXT value field:** paste the value *without* surrounding quotes. Some providers add quotes automatically — that's fine. Don't add them yourself.
6. Save each record.
7. Back on the Resend Domains page, click the row for `rizeai.io` → **Verify DNS Records**.
8. **Wait.** Most providers verify in 1–5 minutes. Cloudflare is usually instant. GoDaddy can take 30+ min. If it doesn't verify after 30 min, screenshot the DNS records you saved and what Resend shows — that's the next thing to share with me.

When all four records show ✅ green, **you're verified** and ready for keys.

## Step 3 — Create the API key *(1 min)*

1. Resend left sidebar → **API Keys** → top-right **+ Create API Key**.
2. **Name:** `rize-prod` *(or anything you'll recognize — just a label)*.
3. **Permission:** **Full access** *(easier; you can lock down later)*.
4. **Domain:** select `rizeai.io` from the dropdown.
5. Click **Create**.
6. Resend shows the key **exactly once**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
7. **Copy it to your password manager NOW.** You cannot retrieve it again. If you lose it, generate a new one.

## Step 4 — Set the Vercel env vars *(3 min)*

Same UI you used for the Stripe keys earlier.

1. Open **`https://vercel.com/sunrizeinvest-oss-projects/flip-analyzer/settings/environment-variables`**
2. Click **Add new** *(or the equivalent on Vercel's current UI)*.

Add these two vars:

### Var 1: `RESEND_API_KEY`

| Field | Value |
|---|---|
| **Key** | `RESEND_API_KEY` |
| **Value** | `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` *(the key from Step 3, no spaces)* |
| **Environments** | ✅ Production *(uncheck Preview + Development)* |

**Save.**

### Var 2: `RESEND_FROM_EMAIL`

This overrides the code default which is hardcoded to `rizeai.co`. Since you own `rizeai.io`, you need this var.

| Field | Value |
|---|---|
| **Key** | `RESEND_FROM_EMAIL` |
| **Value** | `RizeAI <hello@rizeai.io>` |
| **Environments** | ✅ Production |

**Save.**

> The `RizeAI <hello@rizeai.io>` format with the friendly name in front is what email clients show as the sender. Use any prefix you like for the address — `hello`, `triggers`, `team`, `noreply`. Whatever you pick, it doesn't need to be a real mailbox; Resend handles it as long as the domain is verified.

### Var 3 *(optional but recommended)*: `CRON_SECRET`

The cron endpoints (`/api/ai-chat?mode=cron-digest` and `?mode=cron-market-brief`) reject requests without this secret. Without it, the cron returns 401 and emails never go out. Vercel's cron scheduler automatically passes the secret if you set it.

| Field | Value |
|---|---|
| **Key** | `CRON_SECRET` |
| **Value** | Generate one: open a terminal and run `openssl rand -hex 32` — paste the output. Looks like: `8a3f4e9c7b1d6f8e2a5c9b7d4f1e3a8c6b2d9f7e4a1c8b5d3f7e9a2c5b8d1f4e` |
| **Environments** | ✅ Production |

**Save.**

> If you've already configured a `CRON_SECRET`, skip this. Check the env vars list before adding — duplicates aren't allowed.

## Step 5 — Redeploy *(1 min)*

Env var changes only apply to fresh builds. From your terminal:

```
! vercel --prod --yes
```

Wait for the green ✅ aliased line. Should take ~30 seconds.

## Step 6 — Smoke test *(5 min)*

I'll be available tomorrow to run these for you. But if you want to test yourself:

### Test 1: Direct send via the digest endpoint

Send a test digest to your own email. Paste:

```bash
curl -X POST "https://www.realdealestate.app/api/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"mode":"send-digest","email":"YOUR_EMAIL@gmail.com","summary":{"newTriggerCount":3,"triggers":[{"title":"Test trigger","city":"Calgary","detail":"This is a smoke test"}]}}'
```

Replace `YOUR_EMAIL@gmail.com` with your real address. Expected response:
```
{"ok":true,"messageId":"..."}
```

Check your inbox **and your spam folder** — a fresh sending domain often lands in spam on the first delivery until your reputation builds.

### Test 2: Manually trigger the daily market brief cron

```bash
curl -X GET "https://www.realdealestate.app/api/ai-chat?mode=cron-market-brief" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with the value from Step 4 var 3. Expected response:
```
{"ok":true,"sent":N,"failed":0}
```

If `sent` is 0, that's because no users have subscribed to a market brief yet — go to `/market-brief` while logged in and subscribe yourself first, then re-run.

### Test 3: Subscribe yourself + wait for the real cron

The cron runs at **15:00 UTC daily** for the brief and **16:00 UTC Mondays** for the digest. Subscribe yourself on `/market-brief`, then wait. Resend logs every email in **Resend dashboard → Logs**, so you can verify delivery there even without checking your inbox.

## Troubleshooting

| What you see | What it means | Fix |
|---|---|---|
| `503 Email digest is not configured. Set RESEND_API_KEY in Vercel.` | Env var not set or not deployed | Re-check Step 4 var 1; re-run Step 5 deploy |
| `Email is not configured (RESEND_API_KEY missing).` | Same as above | Same as above |
| Resend dashboard shows "DNS records pending" | DNS hasn't propagated yet | Wait 10-30 min, then click Verify again |
| Email lands in spam | Fresh sending domain reputation | Mark "Not spam" on first 3-5 emails; reputation builds over a week |
| `From` address shows `noreply@supabase.io` on password reset | Supabase SMTP is still default | Separate task — Supabase Dashboard → Authentication → Email Templates → SMTP Settings |
| Cron returns 401 | `CRON_SECRET` not set, or Vercel cron config doesn't include it | Verify Step 4 var 3; check `vercel.json` cron entries pass auth header |

## What's NOT in this setup

- **Branded password reset emails** — those send via Supabase's SMTP, not yours. To brand them, configure Supabase's custom SMTP separately (uses the same `re_xxx` API key, different config surface).
- **Inbound email handling** — Resend supports inbound but you don't need it yet.
- **Email templates beyond plain HTML** — the code generates HTML inline; if you want React Email templates later, that's a separate refactor.

## After this is done

| What | Where |
|---|---|
| Tomorrow's cron at 15:00 UTC | First real Market Brief goes out |
| Monday at 16:00 UTC | First real Weekly Trigger Digest goes out |
| Resend dashboard → Logs | Live email delivery log |
| Resend dashboard → Domains | Should show ✅ Verified |

Once you're set up, ping me and I'll re-run the prod smoke test suite — including testing that a real digest email lands in your inbox end-to-end.
