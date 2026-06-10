import { useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * OnboardingTour — first-signup walkthrough.
 *
 * Five-step guided tour with a dim overlay, a spotlight cutout around the
 * target element, and a floating popup explaining what the user is looking
 * at. Built from scratch (no shepherd.js / driver.js / intro.js) so it
 * stays on the platform's terminal aesthetic and doesn't add bundle weight.
 *
 * Steps reference target elements by data-tour="<id>" attribute on the
 * host page. Use the helper TARGET below in JSX to opt elements in.
 *
 * State:
 *   - localStorage key "rde_onboarding_completed" = "1" → never auto-show
 *   - localStorage key "rde_onboarding_skipped"   = "1" → never auto-show
 *
 * Programmatic re-trigger: dispatch a "rde:start-tour" CustomEvent at
 * window. Used by the "Take the tour" item in TopNav's account menu.
 */

export const TOUR_KEYS = {
  completed: "rde_onboarding_completed",
  skipped:   "rde_onboarding_skipped",
};

const STEPS = [
  {
    target: null,                                          // centred — no element
    title:  "Welcome to RizeAI",
    body:   "60 seconds. Five stops. After this you'll know where everything is — and you can come back to a tool any time from the menu at the top.",
  },
  {
    target: '[data-tour="search"]',
    title:  "Start with any address",
    body:   "Type a US or Canadian address here and the platform pulls live zoning, permits, assessment, comps, rent estimate, and an AI thesis — all on one page.",
  },
  {
    target: '[data-tour="tools-btn"]',
    title:  "20 tools, one menu",
    body:   "Tools dropdown lives in the top bar on every page. Five categories — Analyze, Source, Track, Specialist, Learn. The active tool gets a HERE badge so you always know where you are.",
  },
  {
    target: '[data-tour="hub-cards"]',
    title:  "Pick a strategy",
    body:   "Fix & Flip · BRRRR · Multifamily · Compare. Same address, different underwriting model. After running one, cross-link buttons at the bottom let you try the same deal another way without retyping.",
  },
  {
    target: '[data-tour="deal-coach-cue"]',
    title:  "You're done.",
    body:   "On any calculator, look bottom-right for the Deal Coach button — an AI chat that knows your numbers. Swap between Banker, Skeptic, and Mentor personas for different reads on every deal.",
  },
];

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-start on first visit; listen for manual trigger
  useEffect(() => {
    function shouldAutoStart() {
      try {
        if (localStorage.getItem(TOUR_KEYS.completed) === "1") return false;
        if (localStorage.getItem(TOUR_KEYS.skipped)   === "1") return false;
      } catch { return false; }
      return true;
    }
    if (shouldAutoStart()) {
      // Defer slightly so target elements are mounted + measured
      const t = setTimeout(() => { setStep(0); setOpen(true); }, 700);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    function onTrigger() { setStep(0); setOpen(true); }
    window.addEventListener("rde:start-tour", onTrigger);
    return () => window.removeEventListener("rde:start-tour", onTrigger);
  }, []);

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape")              skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft")      back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open) return null;

  function complete() {
    try { localStorage.setItem(TOUR_KEYS.completed, "1"); } catch {}
    setOpen(false);
  }
  function skip() {
    try { localStorage.setItem(TOUR_KEYS.skipped, "1"); } catch {}
    setOpen(false);
  }
  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else complete();
  }
  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  return createPortal(
    <TourLayer
      step={step}
      total={STEPS.length}
      data={STEPS[step]}
      onNext={next}
      onBack={back}
      onSkip={skip}
      onComplete={complete}
    />,
    document.body,
  );
}

// ── Spotlight + popup ───────────────────────────────────────────────────
function TourLayer({ step, total, data, onNext, onBack, onSkip, onComplete }) {
  const [rect, setRect] = useState(null);

  // Measure target element on step change + window resize
  useLayoutEffect(() => {
    function measure() {
      if (!data.target) { setRect(null); return; }
      const el = document.querySelector(data.target);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // After scroll, give the browser a frame to settle, then measure
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [data.target, step]);

  const PAD = 10;
  const spotlight = rect ? {
    x: rect.x - PAD,
    y: rect.y - PAD,
    w: rect.w + PAD * 2,
    h: rect.h + PAD * 2,
  } : null;

  // Position popup: prefer below the target; fall back to above; centre if no target
  const POP_W = 380;
  const POP_H_EST = 230;
  const vw = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let pop;
  if (!spotlight) {
    pop = { left: (vw - POP_W) / 2, top: (vh - POP_H_EST) / 2, centred: true };
  } else {
    const spaceBelow = vh - (spotlight.y + spotlight.h);
    const spaceAbove = spotlight.y;
    const placeBelow = spaceBelow >= POP_H_EST + 16 || spaceBelow >= spaceAbove;
    const top = placeBelow
      ? spotlight.y + spotlight.h + 14
      : Math.max(16, spotlight.y - POP_H_EST - 14);
    const left = Math.max(16, Math.min(vw - POP_W - 16, spotlight.x + spotlight.w / 2 - POP_W / 2));
    pop = { left, top, centred: false };
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      pointerEvents: "auto",
    }}>
      {/* Dim overlay with spotlight cutout via SVG mask */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <mask id="rde-tour-mask">
            <rect width="100%" height="100%" fill="white"/>
            {spotlight && (
              <rect
                x={spotlight.x} y={spotlight.y}
                width={spotlight.w} height={spotlight.h}
                rx={8} ry={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(7,9,15,0.78)" mask="url(#rde-tour-mask)"/>
        {/* Glow ring around spotlight */}
        {spotlight && (
          <rect
            x={spotlight.x - 2} y={spotlight.y - 2}
            width={spotlight.w + 4} height={spotlight.h + 4}
            rx={10} ry={10}
            fill="none"
            stroke="rgba(52,217,138,0.85)"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 12px rgba(52,217,138,0.7))" }}
          />
        )}
      </svg>

      {/* Popup */}
      <div style={{
        position: "absolute",
        left: pop.left, top: pop.top, width: POP_W,
        background: "var(--card, #0d1119)",
        border: "1px solid var(--border, rgba(59,158,255,0.18))",
        borderLeft: "3px solid var(--green, #34d98a)",
        borderRadius: 6,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        padding: 0,
        animation: "rde-tour-pop 0.2s ease",
      }}>
        <style>{`
          @keyframes rde-tour-pop {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Header strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px",
          background: "rgba(52,217,138,0.05)",
          borderBottom: "1px solid var(--borderf, rgba(255,255,255,0.07))",
          fontFamily: "'Geist Mono',ui-monospace,monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--green, #34d98a)", letterSpacing: "1.4px",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--green, #34d98a)",
            boxShadow: "0 0 8px var(--green, #34d98a)",
          }}/>
          ▸ ONBOARDING · STEP {step + 1} / {total}
          <button onClick={onSkip} style={{
            marginLeft: "auto",
            background: "transparent", border: "none",
            color: "var(--dim, #3a4a60)",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 10, fontWeight: 700, letterSpacing: "1px",
            cursor: "pointer", padding: 0,
          }}>SKIP ✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px 14px" }}>
          <div style={{
            fontFamily: "'Geist',sans-serif",
            fontSize: 19, fontWeight: 800,
            color: "var(--text, #dde4ef)",
            letterSpacing: "-0.4px", lineHeight: 1.2,
            marginBottom: 10,
          }}>
            {data.title}
          </div>
          <div style={{
            fontFamily: "'Geist',sans-serif",
            fontSize: 14, color: "var(--sub, #6b7d96)",
            lineHeight: 1.55, letterSpacing: "-0.1px",
          }}>
            {data.body}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{
          display: "flex", gap: 5, padding: "0 20px 14px",
        }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 3, borderRadius: 1.5,
              background: i <= step ? "var(--green, #34d98a)" : "rgba(255,255,255,0.08)",
              transition: "background 0.2s",
            }}/>
          ))}
        </div>

        {/* Footer buttons */}
        <div style={{
          display: "flex", gap: 8, padding: "10px 16px 14px",
          borderTop: "1px solid var(--borderf, rgba(255,255,255,0.07))",
        }}>
          <button onClick={onBack} disabled={step === 0} style={{
            background: "transparent",
            border: "1px solid var(--borderf, rgba(255,255,255,0.07))",
            borderRadius: 4,
            padding: "8px 14px",
            color: step === 0 ? "var(--dim, #3a4a60)" : "var(--sub, #6b7d96)",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 11, fontWeight: 700, letterSpacing: "1px",
            cursor: step === 0 ? "default" : "pointer",
            opacity: step === 0 ? 0.4 : 1,
          }}>
            ← BACK
          </button>
          <button onClick={step < total - 1 ? onNext : onComplete} style={{
            marginLeft: "auto",
            background: "var(--green, #34d98a)",
            border: "none",
            borderRadius: 4,
            padding: "8px 18px",
            color: "#07090f",
            fontFamily: "'Geist Mono',ui-monospace,monospace",
            fontSize: 11, fontWeight: 700, letterSpacing: "1px",
            cursor: "pointer",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = ""}
          >
            {step < total - 1 ? "NEXT →" : "▶ GET STARTED"}
          </button>
        </div>
      </div>
    </div>
  );
}
