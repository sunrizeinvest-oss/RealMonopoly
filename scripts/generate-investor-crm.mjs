/**
 * Generates ~/Desktop/RizeAI_Investor_CRM.csv — pre-formatted spreadsheet
 * for tracking every investor conversation during the raise.
 *
 * Opens cleanly in Google Sheets, Excel, or Numbers. Pre-seeded with:
 *   - Header row with all the columns from the Fundraise Guide schema
 *   - A few example rows (placeholder Corey-style entry, two others) so
 *     the user sees the format before typing real names
 *   - Status legend at the bottom so they don't have to remember the
 *     status values
 *
 * Workflow:
 *   1. Open in Google Sheets → "File → Make a copy"
 *   2. Filter by "Status" column to see active leads
 *   3. Review weekly: move dormant > 2 weeks to pass
 *
 * Re-run anytime to reset the template:
 *   npm run crm:template
 */

import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OUT = join(homedir(), "Desktop", "RizeAI_Investor_CRM.csv");

const lines = [];

// Title + meta
lines.push("RIZEAI — INVESTOR CRM");
lines.push("Generated: " + new Date().toISOString().slice(0, 10));
lines.push("Raise: $500K pre-seed @ $5M post-money cap (SAFE)");
lines.push("");
lines.push("INSTRUCTIONS: Update every Monday. Filter by Status. Move dormant > 2 weeks to pass.");
lines.push("");

// Headers
const headers = [
  "Date sent",
  "Name",
  "Firm",
  "Title",
  "Source",
  "First meeting",
  "Last contact",
  "Status",
  "Check size (potential)",
  "Soft commit ($)",
  "Email",
  "LinkedIn",
  "Notes",
  "Next step",
  "Date of next step",
];
lines.push(headers.join(","));

// Pre-seeded example rows — give the user a template to copy
const today = new Date().toISOString().slice(0, 10);
const exampleRows = [
  // Corey example (the inbound warm intro)
  [
    today,
    "Corey Ho",
    "MK Family Office",
    "Investment review",
    "Inbound LinkedIn (offered to review deck)",
    "",
    today,
    "outreach",
    "$50K-$100K",
    "",
    "corey@mk-familyoffice.com",
    "linkedin.com/in/coreyho-replace-with-real",
    "Offered to review deck and make intros if good. PRIORITY follow-up.",
    "Send deck + one-pager + sample IC memo + financial model",
    today,
  ],
  // Pre-seed fund example
  [
    "",
    "Janet Bannister",
    "Real Ventures",
    "Managing Partner",
    "Cold LinkedIn",
    "",
    "",
    "intro",
    "$200K-$500K",
    "",
    "",
    "linkedin.com/in/janetbannister-example",
    "Real focuses on early Canadian SaaS. Strong fit. Need warm intro path.",
    "Identify mutual connection on LinkedIn",
    "",
  ],
  // Strategic angel example
  [
    "",
    "Real example: Calgary multifamily syndicator",
    "Independent",
    "GP",
    "Cold email after demo",
    "",
    "",
    "intro",
    "$25K-$50K",
    "",
    "",
    "",
    "Their last $20M acquisition was the inspiration for our LTL parser demo. High strategic value.",
    "Send personalized Loom + invite to test platform with their last 3 deals",
    "",
  ],
];

for (const row of exampleRows) {
  // CSV-escape each cell (quote anything containing comma)
  const escaped = row.map(cell => {
    const s = String(cell ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  });
  lines.push(escaped.join(","));
}

// Blank rows the user can fill (50 spare rows so the file isn't pristine)
for (let i = 0; i < 50; i++) {
  lines.push(headers.map(() => "").join(","));
}

lines.push("");
lines.push("STATUS LEGEND");
lines.push("Status,Meaning,Action");
const statuses = [
  ["intro",       "Warm intro received but not reached out yet",     "Send first message within 48h"],
  ["outreach",    "First outreach sent",                              "Follow up in 5-7 days if no reply"],
  ["meeting1",    "First meeting scheduled or held",                  "Send thank-you + materials within 24h"],
  ["meeting2",    "Second meeting scheduled or held",                 "Move to diligence or determine pass"],
  ["diligence",   "Sent diligence pack",                              "Stay responsive to questions"],
  ["soft commit", "Verbal yes; SAFE not signed yet",                  "Send SAFE document; set close date"],
  ["signed",      "SAFE signed; awaiting wire",                       "Confirm wire instructions"],
  ["funded",      "Money in the bank",                                "Add to monthly investor update list"],
  ["pass",        "They said no",                                     "Add to monthly investor update list anyway"],
  ["dormant",     "No response 2+ weeks; not formally a pass yet",    "Move to pass on next Monday review"],
];
for (const s of statuses) {
  lines.push(s.map(cell => `"${cell}"`).join(","));
}

lines.push("");
lines.push("SOURCE LEGEND (where the lead came from)");
const sources = [
  "Warm intro (mutual connection)",
  "Cold LinkedIn",
  "Cold email",
  "Inbound (they reached out)",
  "Event / conference",
  "Founder community",
  "Portfolio referral (existing investor's recommendation)",
  "AngelList",
  "Other",
];
for (const s of sources) lines.push(s);

lines.push("");
lines.push("WEEKLY REVIEW CHECKLIST (do every Monday)");
lines.push("[ ] Filter Status=outreach with last contact > 5 days  →  follow up");
lines.push("[ ] Filter Status=meeting1 / meeting2  →  send any promised materials");
lines.push("[ ] Filter Status=diligence  →  any unanswered questions?");
lines.push("[ ] Filter Status=dormant > 14 days  →  move to pass");
lines.push("[ ] Filter Status=funded + pass  →  add to this month's investor update list");
lines.push("[ ] Tally soft commits  →  are we at critical mass for close?");
lines.push("[ ] New leads to add this week (target: 5-10)");

writeFileSync(OUT, lines.join("\n"));
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${lines.length} rows · drop into Google Sheets, filter by Status, review weekly`);
console.log(`  Pre-seeded with 3 example rows showing how to format real entries.`);
