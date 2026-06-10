/**
 * First-deal-saved celebration moment.
 *
 *   import { celebrateFirstSave } from "@/lib/celebrate";
 *   celebrateFirstSave({ kind: "brrrr", onNext: () => navigate("/compare") });
 *
 * - On the very first time the user saves a deal (ever, across all tools),
 *   shows a fixed-position toast with a small confetti animation and a
 *   "Compare with another →" CTA. Sets `localStorage.rde_celebrated_first_save`
 *   so it never fires again.
 * - Subsequent saves: silent (don't be annoying).
 * - Habit formation: nudges the user toward a second action (compare / share).
 *
 * No deps — pure DOM. Auto-dismisses after 5s or on click outside.
 */

const FLAG = "rde_celebrated_first_save";
const TOAST_ID = "rde-celebrate-toast";

export function celebrateFirstSave({ kind = "deal", onNext } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FLAG)) return;  // already celebrated once
    localStorage.setItem(FLAG, new Date().toISOString());
  } catch {
    // localStorage blocked → bail silently rather than hammering on every save
    return;
  }

  // Remove any existing toast (defensive)
  document.getElementById(TOAST_ID)?.remove();

  const wrap = document.createElement("div");
  wrap.id = TOAST_ID;
  wrap.setAttribute("role", "status");
  wrap.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:10000;
    max-width:340px;
    background:linear-gradient(135deg, rgba(13,17,25,0.98), rgba(7,9,15,0.98));
    border:1px solid rgba(52,217,138,0.45);
    border-left:4px solid var(--green, #34d98a);
    border-radius:var(--r-md, 6px);
    padding:14px 16px;
    box-shadow:0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,217,138,0.15);
    font-family:'Geist', system-ui, sans-serif;
    color:#dde4ef;
    transform:translateY(20px); opacity:0;
    transition:transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.4), opacity 0.25s;
  `;

  wrap.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:10px;">
      <div style="font-size:26px; line-height:1;">🎉</div>
      <div style="flex:1; min-width:0;">
        <div style="font-family:'Geist Mono', ui-monospace, monospace; font-size:9.5px; font-weight:700; color:#34d98a; letter-spacing:0.8px; margin-bottom:4px;">
          FIRST DEAL SAVED
        </div>
        <div style="font-size:13.5px; font-weight:700; color:#dde4ef; line-height:1.35; margin-bottom:8px;">
          Nice — your ${kind.toUpperCase()} deal is saved.
        </div>
        <div style="font-size:12px; color:#6b7d96; line-height:1.5; margin-bottom:10px;">
          Compare it side-by-side with another deal to see which one actually pencils.
        </div>
        <div style="display:flex; gap:6px;">
          <button data-action="next" style="
            background:var(--green, #34d98a); color:#07090f;
            border:none; border-radius:4px;
            padding:7px 12px;
            font-family:'Geist Mono', ui-monospace, monospace; font-size:10.5px; font-weight:700;
            letter-spacing:0.5px; cursor:pointer;
          ">▸ COMPARE DEALS</button>
          <button data-action="dismiss" style="
            background:transparent; color:#6b7d96;
            border:1px solid rgba(255,255,255,0.07); border-radius:4px;
            padding:7px 10px;
            font-family:'Geist Mono', ui-monospace, monospace; font-size:10.5px; font-weight:700;
            letter-spacing:0.5px; cursor:pointer;
          ">DISMISS</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  // Slide in
  requestAnimationFrame(() => {
    wrap.style.transform = "translateY(0)";
    wrap.style.opacity = "1";
  });

  // Confetti burst (lightweight — 16 small colored circles)
  const colors = ["#34d98a", "#3b9eff", "#f0a030", "#a782ff", "#f25c5c"];
  for (let i = 0; i < 16; i++) {
    const c = document.createElement("div");
    const size = 6 + Math.random() * 5;
    c.style.cssText = `
      position:fixed; bottom:60px; right:${60 + Math.random() * 100}px; z-index:9999;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${colors[i % colors.length]};
      pointer-events:none;
      transform:translateY(0);
      transition:transform 1.2s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 1.2s;
    `;
    document.body.appendChild(c);
    requestAnimationFrame(() => {
      const dx = (Math.random() - 0.5) * 220;
      const dy = -120 - Math.random() * 140;
      c.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`;
      c.style.opacity = "0";
    });
    setTimeout(() => c.remove(), 1400);
  }

  const dismiss = () => {
    wrap.style.transform = "translateY(20px)";
    wrap.style.opacity = "0";
    setTimeout(() => wrap.remove(), 320);
  };

  wrap.querySelector('[data-action="next"]').addEventListener("click", () => {
    dismiss();
    if (onNext) onNext();
    else window.location.href = "/compare";
  });
  wrap.querySelector('[data-action="dismiss"]').addEventListener("click", dismiss);

  setTimeout(dismiss, 8000);
}
