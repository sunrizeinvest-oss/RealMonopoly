/**
 * testimonials.js — public testimonial wall config.
 *
 * Update this file each time a real customer, backer, or partner opts in
 * to a named public quote. Empty array is fine — the /testimonials page
 * renders a "wall goes up as commits land" empty state, same as
 * /pitch/backers.
 *
 * Field shape:
 *   {
 *     name: "First Last",
 *     role: "Broker · Calgary Commercial",
 *     firm: "Firm Name (optional)",
 *     quote: "The 1-3 sentence testimonial",
 *     url: "https://linkedin.com/in/... (optional profile)",
 *     verified: true,  // set false only if unverified/composite
 *     category: "broker" | "investor" | "firm" | "backer" | "partner",
 *   }
 */

export const TESTIMONIALS = [
  // Empty. Populate as real customers opt in.
  // Example:
  // {
  //   name: "Anita Sharma",
  //   role: "Managing Broker · Calgary",
  //   firm: "Sharma Realty Group",
  //   quote: "I underwrote three deals with RizeAI last week and closed the biggest of them within 48 hours. The math is right and the speed is real.",
  //   url: "https://linkedin.com/in/anitasharma",
  //   verified: true,
  //   category: "broker",
  // },
];

export const TESTIMONIAL_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "broker", label: "Brokers" },
  { key: "investor", label: "Investors" },
  { key: "firm", label: "Firms" },
  { key: "backer", label: "Backers" },
  { key: "partner", label: "Partners" },
];
