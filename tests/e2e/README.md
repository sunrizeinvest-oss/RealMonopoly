# E2E tests — Playwright

Critical-path smoke + functional tests covering the surfaces investors and
real users hit. The suite runs in two modes:

| Mode | Target | What it checks |
|---|---|---|
| **local** | `vite preview` on `http://localhost:4173` | UI behaviour against the production build, before deploying |
| **smoke** | `https://www.realdealestate.app` | Read-only prod regression checks — safe to run anytime |

## Run the local suite

```
npm run test:e2e
```

Playwright auto-starts `vite preview` and tears it down. First run installs the Chromium browser if not cached.

## Run a specific spec

```
npm run test:e2e -- 01-landing
npm run test:e2e -- 05-calculators
```

## Run the UI debugger

```
npm run test:e2e:ui
```

Opens Playwright's headed runner with timeline + step-by-step trace. Use this when a test fails and you need to see why.

## Run prod smoke tests

```
npm run test:smoke
```

Read-only checks against `www.realdealestate.app`. No fake users, no Stripe charges, no data writes. Use this:

- After every prod deploy to confirm nothing regressed
- As a manual "is prod alive" check
- In CI as a post-deploy gate

## Spec layout

| File | What it covers |
|---|---|
| `01-landing.spec.js` | Hero copy, X-Ray bar, Translator slider, Pulse map, toolkit, bottom CTA |
| `02-pricing.spec.js` | $0 / $99 / $299 prices, tier blurbs, no stale brand strings |
| `03-auth.spec.js` | Login page renders, forgot-password reachable, signup creates a user |
| `04-property-hub.spec.js` | `/analyze` search box accepts input |
| `05-calculators.spec.js` | Commercial · BRRRR · Flip render; LTL dropzones present |
| `06-admin-gate.spec.js` | Unauthenticated `/admin` redirects to login |
| `07-api-smoke.spec.js` | Direct API checks: property-lookup · cmhc-rental · building-grade · LTL validation · admin auth · Stripe checkout |

## Notes

- Specs use throwaway `mailinator.com` addresses for signup tests. Real accounts get created in Supabase; filter them by email prefix `rizeai-e2e-` in Supabase Studio if you want to clean up.
- Tests don't charge Stripe — the checkout test verifies the **URL returned** by the endpoint is a real `cs_live_…` session, but doesn't complete payment.
- `webServer` config in `playwright.config.js` reuses an existing preview server if one is already running on 4173, so you can keep a long-lived preview server up across test runs.
