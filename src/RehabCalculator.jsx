import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AddressAutocomplete from "./AddressAutocomplete";
import TopNav from "./components/TopNav";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtRange = (lo, hi) => `${fmt(lo)} – ${fmt(hi)}`;

const num = (v) => parseFloat(v) || 0;

// ─── Category Definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "kitchen",
    name: "Kitchen",
    emoji: "🍳",
    scopes: [
      { label: "Full Reno", low: 12000, high: 35000 },
      { label: "Cosmetic", low: 3000, high: 8000 },
      { label: "Appliances Only", low: 2000, high: 5000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "bathroom",
    name: "Bathroom",
    emoji: "🚿",
    scopes: [
      { label: "Full Reno", low: 6000, high: 18000 },
      { label: "Cosmetic", low: 1500, high: 4500 },
    ],
    qtyType: "count",
    qtyLabel: "# of Baths",
  },
  {
    id: "master_bath",
    name: "Master Bath",
    emoji: "🛁",
    scopes: [
      { label: "Full Reno", low: 9000, high: 25000 },
      { label: "Cosmetic", low: 2500, high: 6000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "flooring",
    name: "Flooring",
    emoji: "🪵",
    scopes: [
      { label: "Hardwood", low: 6, high: 12, perSqft: true },
      { label: "LVP", low: 3, high: 7, perSqft: true },
      { label: "Carpet", low: 2, high: 5, perSqft: true },
      { label: "Tile", low: 5, high: 12, perSqft: true },
    ],
    qtyType: "sqft",
    qtyLabel: "Sq Ft",
  },
  {
    id: "roof",
    name: "Roof",
    emoji: "🏠",
    scopes: [
      { label: "Full Replace", low: 8000, high: 20000 },
      { label: "Repair / Patch", low: 1500, high: 4000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "hvac",
    name: "HVAC",
    emoji: "❄️",
    scopes: [
      { label: "Full System", low: 6000, high: 15000 },
      { label: "Furnace Only", low: 3000, high: 7000 },
      { label: "AC Only", low: 2500, high: 6000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "electrical",
    name: "Electrical",
    emoji: "⚡",
    scopes: [
      { label: "Full Rewire", low: 8000, high: 20000 },
      { label: "Panel Upgrade", low: 2000, high: 5000 },
      { label: "Partial / Outlets", low: 500, high: 2500 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "plumbing",
    name: "Plumbing",
    emoji: "🔧",
    scopes: [
      { label: "Full Repipe", low: 5000, high: 15000 },
      { label: "Partial", low: 1000, high: 4000 },
      { label: "Water Heater", low: 800, high: 2000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "interior_paint",
    name: "Interior Paint",
    emoji: "🖌️",
    scopes: [
      { label: "Whole House", low: 3000, high: 8000 },
      { label: "Partial", low: 800, high: 2500 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "exterior_paint",
    name: "Exterior Paint",
    emoji: "🏡",
    scopes: [
      { label: "Full", low: 4000, high: 12000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "windows",
    name: "Windows",
    emoji: "🪟",
    scopes: [
      { label: "Full Replace", low: 350, high: 750, perUnit: true },
      { label: "Partial", low: 350, high: 750, perUnit: true },
    ],
    qtyType: "count",
    qtyLabel: "# of Windows",
  },
  {
    id: "doors",
    name: "Doors",
    emoji: "🚪",
    scopes: [
      { label: "Exterior (each)", low: 500, high: 1500, perUnit: true },
      { label: "Interior (each)", low: 150, high: 400, perUnit: true },
    ],
    qtyType: "count",
    qtyLabel: "# of Doors",
  },
  {
    id: "landscaping",
    name: "Landscaping / Driveway",
    emoji: "🌿",
    scopes: [
      { label: "Full", low: 2000, high: 8000 },
      { label: "Basic", low: 500, high: 2500 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "basement",
    name: "Basement",
    emoji: "🏗️",
    scopes: [
      { label: "Finish", low: 15000, high: 40000 },
      { label: "Waterproof", low: 3000, high: 10000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "permits",
    name: "Permits & Design",
    emoji: "📋",
    scopes: [
      { label: "Flat", low: 2000, high: 6000 },
    ],
    qtyType: "fixed",
    qtyLabel: null,
  },
  {
    id: "misc",
    name: "Other / Misc",
    emoji: "🔨",
    scopes: [
      { label: "Custom", low: 0, high: 0, custom: true },
    ],
    qtyType: "fixed",
    qtyLabel: null,
    isCustom: true,
  },
];

// ─── Build initial items state ────────────────────────────────────────────────
function buildInitialItems(sqft) {
  return CATEGORIES.map((cat) => ({
    id: cat.id,
    checked: false,
    scopeIdx: 0,
    qty: cat.qtyType === "sqft" ? (num(sqft) || 1000) : cat.qtyType === "count" ? 1 : 1,
    customLow: "",
    customHigh: "",
  }));
}

// ─── Compute line item costs ──────────────────────────────────────────────────
function computeItem(cat, item, sqft) {
  const scope = cat.scopes[item.scopeIdx];
  if (!scope) return { low: 0, high: 0 };

  if (cat.isCustom) {
    return {
      low: num(item.customLow),
      high: num(item.customHigh),
    };
  }

  // Custom override takes priority
  if (item.customLow !== "" || item.customHigh !== "") {
    return {
      low: num(item.customLow),
      high: num(item.customHigh),
    };
  }

  const effectiveSqft = cat.qtyType === "sqft" ? num(sqft) || num(item.qty) || 1000 : null;
  const qty = cat.qtyType === "count" ? num(item.qty) || 1 : 1;

  if (scope.perSqft && effectiveSqft) {
    return {
      low: Math.round(scope.low * effectiveSqft),
      high: Math.round(scope.high * effectiveSqft),
    };
  }

  if (scope.perUnit) {
    return {
      low: Math.round(scope.low * qty),
      high: Math.round(scope.high * qty),
    };
  }

  // Fixed scope, multiply by qty for count types
  return {
    low: Math.round(scope.low * qty),
    high: Math.round(scope.high * qty),
  };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    overflow-x: hidden;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Geist', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .rc-wrap {
    min-height: 100vh;
    background: var(--bg);
    padding-bottom: 140px;
  }

  /* ── Nav ── */
  .rc-nav {
    position: sticky;
    top: 0;
    z-index: 200;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--borderf);
    padding: 0 24px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rc-logo {
    font-size: 16px;
    font-weight: 800;
    color: var(--text);
    text-decoration: none;
    letter-spacing: -0.5px;
  }

  .rc-logo span { color: var(--blue); }

  .rc-nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .rc-nav-link {
    font-size: 13px;
    font-weight: 500;
    color: var(--sub);
    text-decoration: none;
    padding: 5px 11px;
    border-radius: 7px;
    border: 1px solid transparent;
    transition: all 0.15s;
  }

  .rc-nav-link:hover {
    color: var(--text);
    background: rgba(15,23,42,0.05);
  }

  .rc-nav-link.active {
    color: var(--blue);
    background: rgba(59,158,255,0.1);
    border-color: rgba(59,158,255,0.2);
    font-weight: 700;
  }

  /* ── Page header ── */
  .rc-header {
    max-width: 1200px;
    margin: 0 auto;
    padding: 36px 24px 0;
  }

  .rc-header-title {
    font-size: 26px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .rc-header-sub {
    font-size: 14px;
    color: var(--sub);
    line-height: 1.6;
    margin-bottom: 28px;
  }

  /* ── Property info bar ── */
  .rc-propbar {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 16px;
    padding: 18px 22px;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
    margin-bottom: 28px;
  }

  .rc-propbar-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--sub);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }

  .rc-propbar-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .rc-propbar-field {
    flex: 1;
    min-width: 180px;
  }

  .rc-input {
    width: 100%;
    background: var(--card2);
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 6px;
    padding: 9px 12px;
    font-size: 14px;
    font-family: 'Geist', sans-serif;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .rc-input:focus {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(59,158,255,0.1);
  }

  .rc-input::placeholder { color: var(--dim); }

  .rc-select {
    width: 100%;
    background: var(--card2);
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 6px;
    padding: 9px 12px;
    font-size: 13px;
    font-family: 'Geist', sans-serif;
    color: var(--text);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%236b7d96' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }

  .rc-select:focus { border-color: var(--blue); }

  /* ── Grid ── */
  .rc-grid {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  /* ── Category card ── */
  .rc-card {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 16px;
    padding: 18px 20px;
    transition: border-color 0.2s, box-shadow 0.15s;
    position: relative;
    cursor: default;
  }

  .rc-card.checked {
    border-color: rgba(59,158,255,0.45);
    box-shadow: 0 0 0 1px rgba(59,158,255,0.15), 0 4px 20px rgba(59,158,255,0.07);
    background: linear-gradient(135deg, rgba(59,158,255,0.04) 0%, var(--card) 60%);
  }

  .rc-card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
  }

  .rc-checkbox-wrap {
    display: flex;
    align-items: center;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .rc-checkbox {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 2px solid var(--dim);
    background: transparent;
    cursor: pointer;
    appearance: none;
    transition: all 0.15s;
    position: relative;
    flex-shrink: 0;
  }

  .rc-checkbox:checked {
    background: var(--blue);
    border-color: var(--blue);
  }

  .rc-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: 2px solid #fff;
    border-top: none;
    border-left: none;
    transform: rotate(45deg);
  }

  .rc-card-emoji {
    font-size: 22px;
    line-height: 1;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .rc-card-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.3;
    flex: 1;
  }

  .rc-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .rc-field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .rc-field-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--sub);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 5px;
  }

  .rc-estimate-box {
    background: var(--card2);
    border: 1px solid rgba(15,23,42,0.06);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .rc-estimate-low {
    font-size: 12px;
    font-weight: 600;
    color: var(--amber);
  }

  .rc-estimate-high {
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
  }

  .rc-estimate-range {
    font-size: 11px;
    color: var(--sub);
    margin-top: 2px;
  }

  .rc-custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .rc-input-sm {
    width: 100%;
    background: var(--card2);
    border: 1px solid rgba(15,23,42,0.08);
    border-radius: 7px;
    padding: 7px 10px;
    font-size: 13px;
    font-family: 'Geist', sans-serif;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
  }

  .rc-input-sm:focus { border-color: var(--blue); }
  .rc-input-sm::placeholder { color: var(--dim); }

  .rc-disabled-overlay {
    opacity: 0.45;
    pointer-events: none;
  }

  /* ── Section heading ── */
  .rc-section-heading {
    max-width: 1200px;
    margin: 28px auto 14px;
    padding: 0 24px;
    font-size: 11px;
    font-weight: 700;
    color: var(--sub);
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rc-section-heading::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--borderf);
  }

  /* ── Notes area ── */
  .rc-notes-wrap {
    max-width: 1200px;
    margin: 28px auto 0;
    padding: 0 24px;
  }

  .rc-notes-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--sub);
    margin-bottom: 8px;
    display: block;
  }

  .rc-textarea {
    width: 100%;
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 10px;
    padding: 14px 16px;
    font-size: 13px;
    font-family: 'Geist', sans-serif;
    color: var(--text);
    outline: none;
    resize: vertical;
    min-height: 96px;
    transition: border-color 0.15s;
    line-height: 1.6;
  }

  .rc-textarea:focus { border-color: var(--blue); }
  .rc-textarea::placeholder { color: var(--dim); }

  /* ── Sticky summary bar ── */
  .rc-summary-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 300;
    background: rgba(13,17,25,0.98);
    backdrop-filter: blur(24px);
    border-top: 1px solid rgba(59,158,255,0.2);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .rc-summary-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex-shrink: 0;
  }

  .rc-summary-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--sub);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .rc-summary-value {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .rc-summary-value.big {
    font-size: 20px;
    font-weight: 800;
    color: var(--blue);
  }

  .rc-summary-divider {
    width: 1px;
    height: 36px;
    background: rgba(15,23,42,0.07);
    flex-shrink: 0;
  }

  .rc-summary-actions {
    margin-left: auto;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-shrink: 0;
  }

  .rc-btn-primary {
    background: var(--blue);
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Geist', sans-serif;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }

  .rc-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .rc-btn-primary:active { transform: translateY(0); }

  .rc-btn-secondary {
    background: rgba(15,23,42,0.06);
    border: 1px solid var(--borderf);
    border-radius: 10px;
    padding: 10px 18px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Geist', sans-serif;
    color: var(--sub);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .rc-btn-secondary:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text);
    border-color: rgba(255,255,255,0.15);
  }

  /* ── Toast ── */
  .rc-toast {
    position: fixed;
    bottom: 90px;
    right: 24px;
    background: var(--green);
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 18px;
    border-radius: 10px;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(52,217,138,0.35);
    animation: rc-fadein 0.2s ease;
  }

  @keyframes rc-fadein {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .rc-grid { grid-template-columns: 1fr; padding: 0 16px; }
    .rc-header { padding: 24px 16px 0; }
    .rc-propbar { padding: 14px 16px; gap: 12px; }
    .rc-section-heading { padding: 0 16px; }
    .rc-notes-wrap { padding: 0 16px; }
    .rc-summary-bar { gap: 14px; padding: 12px 16px; }
    .rc-summary-actions { margin-left: 0; width: 100%; }
    .rc-btn-primary, .rc-btn-secondary { flex: 1; text-align: center; }
    .rc-header-title { font-size: 20px; }
    .rc-summary-value.big { font-size: 17px; }
    .rc-nav-links { display: none; }
  }

  @media (max-width: 480px) {
    .rc-field-row { grid-template-columns: 1fr; }
    .rc-custom-row { grid-template-columns: 1fr; }
  }
`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RehabCalculator() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [sqft, setSqft] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState(false);
  const toastTimer = useRef(null);

  // Initialize items from categories
  const [items, setItems] = useState(() => buildInitialItems(""));

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rde_prefill");
      if (!raw) return;
      const pf = JSON.parse(raw);
      if (pf.address) setAddress(pf.address);
      if (pf.squareFootage) {
        setSqft(String(pf.squareFootage));
        // Pre-fill sqft qty for flooring items
        setItems((prev) =>
          prev.map((item) => {
            const cat = CATEGORIES.find((c) => c.id === item.id);
            if (cat && cat.qtyType === "sqft") {
              return { ...item, qty: pf.squareFootage };
            }
            return item;
          })
        );
      }
    } catch {}
  }, []);

  // Sync sqft to flooring items
  useEffect(() => {
    const sf = num(sqft);
    if (!sf) return;
    setItems((prev) =>
      prev.map((item) => {
        const cat = CATEGORIES.find((c) => c.id === item.id);
        if (cat && cat.qtyType === "sqft") {
          return { ...item, qty: sf };
        }
        return item;
      })
    );
  }, [sqft]);

  // Item updater helper
  const updateItem = (id, patch) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  // Compute totals
  const totals = useMemo(() => {
    let subtotalLow = 0;
    let subtotalHigh = 0;

    items.forEach((item) => {
      if (!item.checked) return;
      const cat = CATEGORIES.find((c) => c.id === item.id);
      if (!cat) return;
      const { low, high } = computeItem(cat, item, sqft);
      subtotalLow += low;
      subtotalHigh += high;
    });

    const contingencyLow = Math.round(subtotalLow * 0.1);
    const contingencyHigh = Math.round(subtotalHigh * 0.15);
    const grandLow = subtotalLow + contingencyLow;
    const grandHigh = subtotalHigh + contingencyHigh;
    const midpoint = Math.round((grandLow + grandHigh) / 2);

    return {
      subtotalLow,
      subtotalHigh,
      contingencyLow,
      contingencyHigh,
      grandLow,
      grandHigh,
      midpoint,
    };
  }, [items, sqft]);

  // Checked item summary for export
  const checkedItems = useMemo(() => {
    return items
      .filter((item) => item.checked)
      .map((item) => {
        const cat = CATEGORIES.find((c) => c.id === item.id);
        const scope = cat?.scopes[item.scopeIdx];
        const { low, high } = computeItem(cat, item, sqft);
        return {
          category: cat?.name,
          scope: scope?.label,
          low,
          high,
        };
      });
  }, [items, sqft]);

  const sendToAnalyzer = () => {
    const { grandLow, grandHigh, midpoint } = totals;
    try {
      const existing = JSON.parse(localStorage.getItem("rde_prefill") || "{}");
      localStorage.setItem(
        "rde_prefill",
        JSON.stringify({
          ...existing,
          repairCosts: midpoint,
          timestamp: Date.now(),
        })
      );
      localStorage.setItem(
        "rde_repair_estimate",
        JSON.stringify({
          low: grandLow,
          high: grandHigh,
          midpoint,
          items: checkedItems,
        })
      );
    } catch {}

    // Show toast then navigate
    setToast(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(false);
      navigate("/app");
    }, 900);
  };

  const exportPDF = () => {
    alert("PDF export coming soon");
  };

  const checkedCount = items.filter((i) => i.checked).length;

  // Group categories for section headings
  const interiorCats = ["kitchen", "bathroom", "master_bath", "interior_paint", "flooring", "basement"];
  const systemsCats = ["roof", "hvac", "electrical", "plumbing"];
  const exteriorCats = ["exterior_paint", "windows", "doors", "landscaping"];
  const otherCats = ["permits", "misc"];

  const sections = [
    { label: "Interior & Rooms", ids: interiorCats },
    { label: "Systems & Structure", ids: systemsCats },
    { label: "Exterior", ids: exteriorCats },
    { label: "Other Costs", ids: otherCats },
  ];

  return (
    <>
      <style>{CSS}</style>

      <div className="rc-wrap">
        {/* ── Nav ── */}
        <TopNav />

        {/* ── Page Header ── */}
        <div className="rc-header">
          <div className="rc-header-title">Rehab Cost Estimator</div>
          <div className="rc-header-sub">
            Select the items you plan to renovate, choose the scope, and get an instant cost range. Send the total directly to your Flip Analyzer.
          </div>

          {/* ── Property Info Bar ── */}
          <div className="rc-propbar">
            <div className="rc-propbar-field" style={{ flex: 2, minWidth: 220 }}>
              <div className="rc-propbar-label">Property Address</div>
              <AddressAutocomplete
                className="rc-input"
                placeholder="123 Main St, City, Province / State"
                value={address}
                onChange={setAddress}
                onSelect={(addr) => setAddress(addr)}
                style={{ flex: 1 }}
              />
            </div>
            <div className="rc-propbar-field" style={{ flex: "0 1 180px", minWidth: 140 }}>
              <div className="rc-propbar-label">Square Footage</div>
              <input
                className="rc-input"
                type="number"
                placeholder="e.g. 1800"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
              />
            </div>
            {checkedCount > 0 && (
              <div className="rc-propbar-field" style={{ flex: "0 0 auto", minWidth: "auto" }}>
                <div className="rc-propbar-label">Items Selected</div>
                <div className="rc-propbar-value" style={{ color: "var(--blue)" }}>
                  {checkedCount} item{checkedCount !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Category Sections ── */}
        {sections.map((section) => {
          const sectionItems = items.filter((item) =>
            section.ids.includes(item.id)
          );
          const sectionCats = sectionItems.map((item) =>
            CATEGORIES.find((c) => c.id === item.id)
          );

          return (
            <div key={section.label}>
              <div className="rc-section-heading">{section.label}</div>
              <div className="rc-grid">
                {sectionItems.map((item, idx) => {
                  const cat = sectionCats[idx];
                  if (!cat) return null;
                  const scope = cat.scopes[item.scopeIdx];
                  const { low, high } = computeItem(cat, item, sqft);
                  const isCustomScope = scope?.custom;

                  return (
                    <div
                      key={cat.id}
                      className={`rc-card${item.checked ? " checked" : ""}`}
                      onClick={(e) => {
                        // Only toggle if click was not on an interactive element
                        if (
                          e.target.tagName === "INPUT" ||
                          e.target.tagName === "SELECT"
                        )
                          return;
                        updateItem(cat.id, { checked: !item.checked });
                      }}
                    >
                      {/* Card Header */}
                      <div className="rc-card-header">
                        <div className="rc-checkbox-wrap">
                          <input
                            type="checkbox"
                            className="rc-checkbox"
                            checked={item.checked}
                            onChange={(e) =>
                              updateItem(cat.id, { checked: e.target.checked })
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="rc-card-emoji">{cat.emoji}</div>
                        <div className="rc-card-name">{cat.name}</div>
                      </div>

                      {/* Card Body */}
                      <div
                        className={`rc-card-body${!item.checked ? " rc-disabled-overlay" : ""}`}
                      >
                        {/* Scope */}
                        <div>
                          <div className="rc-field-label">Scope</div>
                          <select
                            className="rc-select"
                            value={item.scopeIdx}
                            onChange={(e) => {
                              updateItem(cat.id, {
                                scopeIdx: parseInt(e.target.value, 10),
                                customLow: "",
                                customHigh: "",
                              });
                            }}
                          >
                            {cat.scopes.map((s, i) => (
                              <option key={i} value={i}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity field (for count or sqft types) */}
                        {(cat.qtyType === "count" ||
                          cat.qtyType === "sqft") && (
                          <div>
                            <div className="rc-field-label">
                              {cat.qtyLabel || "Quantity"}
                            </div>
                            <input
                              type="number"
                              className="rc-input-sm"
                              min="1"
                              value={item.qty}
                              placeholder={cat.qtyType === "sqft" ? sqft || "Sq Ft" : "1"}
                              onChange={(e) =>
                                updateItem(cat.id, {
                                  qty: e.target.value,
                                  customLow: "",
                                  customHigh: "",
                                })
                              }
                            />
                          </div>
                        )}

                        {/* Estimates */}
                        {!isCustomScope ? (
                          <div className="rc-field-row">
                            <div>
                              <div className="rc-field-label">Low Estimate</div>
                              <div className="rc-estimate-box">
                                <span className="rc-estimate-low">
                                  {fmt(low)}
                                </span>
                                {(scope?.perSqft || scope?.perUnit) && (
                                  <span className="rc-estimate-range">
                                    {fmt(scope.low)}/{scope.perSqft ? "sqft" : "unit"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="rc-field-label">High Estimate</div>
                              <div className="rc-estimate-box">
                                <span className="rc-estimate-high">
                                  {fmt(high)}
                                </span>
                                {(scope?.perSqft || scope?.perUnit) && (
                                  <span className="rc-estimate-range">
                                    {fmt(scope.high)}/{scope.perSqft ? "sqft" : "unit"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Custom Override / Custom input */}
                        {isCustomScope ? (
                          <div className="rc-custom-row">
                            <div>
                              <div className="rc-field-label">Your Low ($)</div>
                              <input
                                type="number"
                                className="rc-input-sm"
                                placeholder="0"
                                value={item.customLow}
                                onChange={(e) =>
                                  updateItem(cat.id, {
                                    customLow: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <div className="rc-field-label">Your High ($)</div>
                              <input
                                type="number"
                                className="rc-input-sm"
                                placeholder="0"
                                value={item.customHigh}
                                onChange={(e) =>
                                  updateItem(cat.id, {
                                    customHigh: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          /* Custom override fields for non-custom scopes */
                          <div>
                            <div
                              className="rc-field-label"
                              style={{ marginBottom: 6 }}
                            >
                              Custom Override{" "}
                              <span
                                style={{
                                  fontWeight: 400,
                                  color: "var(--dim)",
                                  textTransform: "none",
                                  letterSpacing: 0,
                                }}
                              >
                                (optional — leave blank to use estimate)
                              </span>
                            </div>
                            <div className="rc-custom-row">
                              <input
                                type="number"
                                className="rc-input-sm"
                                placeholder={`Low ${fmt(low)}`}
                                value={item.customLow}
                                onChange={(e) =>
                                  updateItem(cat.id, {
                                    customLow: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="number"
                                className="rc-input-sm"
                                placeholder={`High ${fmt(high)}`}
                                value={item.customHigh}
                                onChange={(e) =>
                                  updateItem(cat.id, {
                                    customHigh: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Line total badge */}
                        {item.checked && (low > 0 || high > 0) && (
                          <div
                            style={{
                              marginTop: 4,
                              padding: "6px 10px",
                              background: "rgba(59,158,255,0.07)",
                              borderRadius: 7,
                              border: "1px solid rgba(59,158,255,0.15)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--sub)",
                                textTransform: "uppercase",
                                letterSpacing: 0.6,
                              }}
                            >
                              Line Total
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--blue)",
                              }}
                            >
                              {fmtRange(low, high)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Contractor Notes ── */}
        <div className="rc-notes-wrap" style={{ marginBottom: 16 }}>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--borderf)",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <label className="rc-notes-label">
              Contractor Notes &amp; Comments
            </label>
            <textarea
              className="rc-textarea"
              placeholder="Add any notes about your scope of work, contractor quotes, special conditions, or deal-specific details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* ── Spacer for sticky bar ── */}
        <div style={{ height: 24 }} />
      </div>

      {/* ── Sticky Summary Bar ── */}
      <div className="rc-summary-bar">
        {/* Subtotal */}
        <div className="rc-summary-col">
          <div className="rc-summary-label">Subtotal</div>
          <div className="rc-summary-value">
            {checkedCount > 0
              ? fmtRange(totals.subtotalLow, totals.subtotalHigh)
              : "—"}
          </div>
        </div>

        <div className="rc-summary-divider" />

        {/* Contingency */}
        <div className="rc-summary-col">
          <div className="rc-summary-label">Contingency (10–15%)</div>
          <div className="rc-summary-value">
            {checkedCount > 0
              ? fmtRange(totals.contingencyLow, totals.contingencyHigh)
              : "—"}
          </div>
        </div>

        <div className="rc-summary-divider" />

        {/* Grand Total */}
        <div className="rc-summary-col">
          <div className="rc-summary-label">Grand Total</div>
          <div className="rc-summary-value big">
            {checkedCount > 0
              ? fmtRange(totals.grandLow, totals.grandHigh)
              : "No items selected"}
          </div>
        </div>

        {checkedCount > 0 && (
          <>
            <div className="rc-summary-divider" />
            <div className="rc-summary-col">
              <div className="rc-summary-label">Midpoint</div>
              <div
                className="rc-summary-value"
                style={{ color: "var(--amber)" }}
              >
                {fmt(totals.midpoint)}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="rc-summary-actions">
          <button className="rc-btn-secondary" onClick={exportPDF}>
            Export PDF
          </button>
          <button
            className="rc-btn-primary"
            onClick={sendToAnalyzer}
            disabled={checkedCount === 0}
            style={{ opacity: checkedCount === 0 ? 0.45 : 1 }}
          >
            Use in Flip Analyzer →
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="rc-toast">Repair estimate saved — opening Flip Analyzer...</div>
      )}
    </>
  );
}
