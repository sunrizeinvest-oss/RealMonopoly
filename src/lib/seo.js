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

const SUFFIX = " · RizeAI";
const DEFAULT_DESC = "RizeAI — institutional real estate underwriting for US + Canadian investors. BRRRR, multifamily, flip calculators with IRR, DSCR, and AI deal thesis.";

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

// Points to the OG image that actually exists in /public/. Every page falls
// back here unless it passes its own `image` — swap when per-page images ship.
const DEFAULT_OG_IMAGE = "https://www.realdealestate.app/og-image.png";

export function useDocMeta({ title, description = DEFAULT_DESC, og = true, image, jsonld } = {}) {
  useEffect(() => {
    // Wrap in try/catch — a single failed meta mutation must NEVER crash the
    // page render. The cost of a missed meta tag is zero; the cost of a blank
    // page is total. Documented quirk: React 19 StrictMode runs effects twice,
    // so any closure-stale reference can throw on the second invocation.
    let prevTitle;
    let jsonldEl;
    try {
      prevTitle = document.title;
      if (title) document.title = `${title}${SUFFIX}`;
      setOrCreateMeta("description", description);
      if (og) {
        setOrCreateMeta("og:title", title ? `${title}${SUFFIX}` : "RizeAI", "property");
        setOrCreateMeta("og:description", description, "property");
        setOrCreateMeta("og:url", window.location.href, "property");
        setOrCreateMeta("og:image", image || DEFAULT_OG_IMAGE, "property");
        setOrCreateMeta("og:type", "website", "property");
        setOrCreateMeta("twitter:card", "summary_large_image");
        setOrCreateMeta("twitter:title", title ? `${title}${SUFFIX}` : "RizeAI");
        setOrCreateMeta("twitter:description", description);
        setOrCreateMeta("twitter:image", image || DEFAULT_OG_IMAGE);
      }
      if (jsonld) {
        jsonldEl = document.createElement("script");
        jsonldEl.type = "application/ld+json";
        jsonldEl.text = typeof jsonld === "string" ? jsonld : JSON.stringify(jsonld);
        jsonldEl.dataset.seoManaged = "1";
        document.head.appendChild(jsonldEl);
      }
    } catch (e) {
      console.warn("useDocMeta failed (non-fatal):", e?.message);
    }

    return () => {
      try {
        if (prevTitle != null) document.title = prevTitle;
        // Remove any jsonld we injected so the next route isn't polluted.
        if (jsonldEl && jsonldEl.parentNode) jsonldEl.parentNode.removeChild(jsonldEl);
        // Leave the meta tags in place — they'll be overwritten by the next route.
        // Removing them between renders causes flicker for crawlers.
      } catch {}
    };
  }, [title, description, og, image, jsonld]);
}
