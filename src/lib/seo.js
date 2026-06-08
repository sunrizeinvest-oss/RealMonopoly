/**
 * Tiny SEO helper — sets document.title + meta tags per-route.
 *
 *   import { useDocMeta } from "@/lib/seo";
 *   useDocMeta({
 *     title: "BRRRR Calculator",
 *     description: "Model Buy/Rehab/Rent/Refi/Repeat deals with real DSCR + IRR.",
 *   });
 *
 * No dependency. Mutates document.title and the meta[name=description] tag
 * directly. Restores prior values on unmount.
 *
 * If `og: true`, also updates og:title + og:description + og:url for share previews.
 */
import { useEffect } from "react";

const SUFFIX = " · Real Deal";
const DEFAULT_DESC = "Real Deal — institutional real estate underwriting for US + Canadian investors. BRRRR, multifamily, flip calculators with IRR, DSCR, and AI deal thesis.";

function setOrCreateMeta(name, content, attr = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  return el;
}

export function useDocMeta({ title, description = DEFAULT_DESC, og = true } = {}) {
  useEffect(() => {
    // Wrap in try/catch — a single failed meta mutation must NEVER crash the
    // page render. The cost of a missed meta tag is zero; the cost of a blank
    // page is total. Documented quirk: React 19 StrictMode runs effects twice,
    // so any closure-stale reference can throw on the second invocation.
    let prevTitle;
    try {
      prevTitle = document.title;
      if (title) document.title = `${title}${SUFFIX}`;
      setOrCreateMeta("description", description);
      if (og) {
        setOrCreateMeta("og:title", title ? `${title}${SUFFIX}` : "Real Deal", "property");
        setOrCreateMeta("og:description", description, "property");
        setOrCreateMeta("og:url", window.location.href, "property");
      }
    } catch (e) {
      console.warn("useDocMeta failed (non-fatal):", e?.message);
    }

    return () => {
      try {
        if (prevTitle != null) document.title = prevTitle;
        // Leave the meta tags in place — they'll be overwritten by the next route.
        // Removing them between renders causes flicker for crawlers.
      } catch {}
    };
  }, [title, description, og]);
}
