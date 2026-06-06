import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "./AuthContext"

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0)
const fmtC = (n) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n || 0)
const fmtPct = (n) => (isNaN(n) || !isFinite(n)) ? "—" : `${(n * 100).toFixed(2)}%`
const fmtNum = (n) => new Intl.NumberFormat("en-US").format(n || 0)
const num = (v) => parseFloat(v) || 0

// ─── Canadian Detection ───────────────────────────────────────────────────────
function isCanadian(addr) {
  if (!addr) return false
  if (/[A-Z]\d[A-Z]\s*\d[A-Z]\d/i.test(addr)) return true
  if (/\bcanada\b/i.test(addr)) return true
  return ["AB","BC","ON","QC","MB","SK","NS","NB","PE","NL"].some(p => new RegExp(`,\\s*${p}\\b`,"i").test(addr))
}

// ─── Deal Grade ───────────────────────────────────────────────────────────────
function getDealGrade(roi, margin, aboveMAO, annualCoc) {
  let score = 0
  if (roi > 0.15) score += 30; else if (roi > 0.10) score += 20; else if (roi > 0.05) score += 10
  if (margin > 0.20) score += 25; else if (margin > 0.15) score += 18; else if (margin > 0.08) score += 10
  if (!aboveMAO) score += 25; else score += 5
  if (annualCoc > 0.20) score += 20; else if (annualCoc > 0.12) score += 14; else if (annualCoc > 0.06) score += 8
  const grade = score >= 85 ? "A" : score >= 68 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F"
  const color = score >= 85 ? "#34d98a" : score >= 68 ? "#3b9eff" : score >= 50 ? "#f0a030" : score >= 30 ? "#ff8c42" : "#f25c5c"
  return { grade, score, color }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  :root {
    --bg: #07090f;
    --card: #0d1119;
    --card2: #0a0e18;
    --borderf: rgba(255,255,255,0.07);
    --border: rgba(59,158,255,0.12);
    --text: #dde4ef;
    --sub: #6b7d96;
    --dim: #3a4a60;
    --blue: #3b9eff;
    --green: #34d98a;
    --red: #f25c5c;
    --amber: #f0a030;
    --purple: #a782ff;
  }

  .pi-root {
    min-height: 100vh;
    background: var(--bg);
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
  }

  /* Nav */
  .pi-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(7,9,15,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--borderf);
    display: flex;
    align-items: center;
    padding: 0 24px;
    height: 54px;
    gap: 24px;
  }
  .pi-logo {
    font-size: 18px;
    font-weight: 800;
    color: var(--blue);
    text-decoration: none;
    letter-spacing: -0.5px;
  }
  .pi-nav-links {
    display: flex;
    gap: 4px;
    margin-left: 8px;
    flex: 1;
  }
  .pi-nav-link {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--sub);
    text-decoration: none;
    transition: all 0.15s;
  }
  .pi-nav-link:hover { background: rgba(255,255,255,0.05); color: var(--text); }
  .pi-nav-link.active { background: rgba(59,158,255,0.12); color: var(--blue); }
  .pi-nav-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
  .pi-nav-user { font-size: 12px; color: var(--sub); }
  .pi-signout {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--borderf);
    color: var(--sub);
    cursor: pointer;
    transition: all 0.15s;
  }
  .pi-signout:hover { color: var(--red); border-color: rgba(242,92,92,0.3); }

  /* Layout */
  .pi-body {
    display: flex;
    gap: 0;
    min-height: calc(100vh - 54px);
  }
  .pi-main {
    flex: 1;
    min-width: 0;
    padding: 28px 28px 60px 28px;
    max-width: calc(100% - 320px);
  }
  .pi-sidebar {
    width: 320px;
    flex-shrink: 0;
    position: sticky;
    top: 54px;
    height: calc(100vh - 54px);
    border-left: 1px solid var(--borderf);
    background: var(--card2);
    display: flex;
    flex-direction: column;
  }

  /* Search Bar */
  .pi-search-wrap {
    display: flex;
    gap: 10px;
    align-items: center;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 6px 8px 6px 16px;
    margin-bottom: 28px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .pi-search-wrap:focus-within {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(59,158,255,0.1);
  }
  .pi-search-icon { color: var(--sub); font-size: 18px; flex-shrink: 0; }
  .pi-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    color: var(--text);
    padding: 6px 0;
  }
  .pi-search-input::placeholder { color: var(--dim); }
  .pi-search-btn {
    padding: 9px 20px;
    border-radius: 10px;
    background: var(--blue);
    color: #fff;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .pi-search-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .pi-search-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  /* Spinner */
  .pi-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(59,158,255,0.2);
    border-top-color: var(--blue);
    border-radius: 50%;
    animation: pi-spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes pi-spin { to { transform: rotate(360deg); } }

  /* Property Header */
  .pi-prop-header {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .pi-prop-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(59,158,255,0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .pi-prop-title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 4px; }
  .pi-prop-sub { font-size: 13px; color: var(--sub); }
  .pi-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .pi-badge-blue { background: rgba(59,158,255,0.15); color: var(--blue); }
  .pi-badge-green { background: rgba(52,217,138,0.13); color: var(--green); }
  .pi-badge-amber { background: rgba(240,160,48,0.13); color: var(--amber); }

  /* Fact Grid */
  .pi-fact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }
  .pi-fact-card {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 12px;
    padding: 14px 16px;
  }
  .pi-fact-label { font-size: 10.5px; color: var(--sub); font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 6px; }
  .pi-fact-value { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .pi-fact-value.green { color: var(--green); }
  .pi-fact-sub { font-size: 11px; color: var(--dim); margin-top: 3px; }

  /* Section headings */
  .pi-section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--sub);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 12px;
    margin-top: 8px;
  }

  /* Valuation Row */
  .pi-val-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 20px;
  }

  /* Card */
  .pi-card {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 18px;
  }
  .pi-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Confidence bar */
  .pi-conf-bar-bg {
    height: 5px;
    background: rgba(255,255,255,0.07);
    border-radius: 3px;
    margin: 8px 0 4px;
    overflow: hidden;
  }
  .pi-conf-bar-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--blue);
    transition: width 0.6s ease;
  }

  /* Market stats */
  .pi-market-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .pi-market-stat {
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 12px;
    padding: 14px 16px;
    text-align: center;
  }
  .pi-market-val { font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 4px; }
  .pi-market-lbl { font-size: 10.5px; color: var(--sub); font-weight: 600; }

  /* Calculator Tabs */
  .pi-tabs {
    display: flex;
    gap: 4px;
    background: var(--card2);
    border: 1px solid var(--borderf);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 18px;
  }
  .pi-tab {
    flex: 1;
    padding: 8px 10px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
    color: var(--sub);
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .pi-tab:hover { color: var(--text); background: rgba(255,255,255,0.04); }
  .pi-tab.active { background: var(--card); color: var(--blue); box-shadow: 0 1px 4px rgba(0,0,0,0.2); }

  /* Calc Input Row */
  .pi-calc-inputs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }
  .pi-field label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--sub);
    margin-bottom: 5px;
    letter-spacing: 0.2px;
  }
  .pi-field-wrap { position: relative; }
  .pi-field-wrap .prefix {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--dim);
    font-size: 13px;
    pointer-events: none;
  }
  .pi-field-wrap .suffix {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--dim);
    font-size: 12px;
    pointer-events: none;
  }
  .pi-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--card2);
    border: 1px solid var(--borderf);
    border-radius: 9px;
    padding: 9px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .pi-input.has-prefix { padding-left: 24px; }
  .pi-input.has-suffix { padding-right: 28px; }
  .pi-input:focus { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(59,158,255,0.1); }

  /* Calc Results */
  .pi-results {
    background: rgba(13,17,25,0.8);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 18px;
    margin-bottom: 14px;
  }
  .pi-result-main {
    text-align: center;
    margin-bottom: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--borderf);
  }
  .pi-result-label { font-size: 11px; font-weight: 600; color: var(--sub); text-transform: uppercase; letter-spacing: 0.5px; }
  .pi-result-big { font-size: 36px; font-weight: 800; letter-spacing: -1px; margin: 4px 0; }
  .pi-results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .pi-result-item { padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; }
  .pi-result-item-label { font-size: 10px; font-weight: 600; color: var(--sub); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .pi-result-item-val { font-size: 14px; font-weight: 700; color: var(--text); }

  .pi-grade-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    font-size: 22px;
    font-weight: 900;
    margin: 0 auto 4px;
  }
  .pi-mao {
    padding: 10px 14px;
    background: rgba(52,217,138,0.07);
    border: 1px solid rgba(52,217,138,0.15);
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .pi-mao-label { font-size: 11px; font-weight: 700; color: var(--sub); text-transform: uppercase; }
  .pi-mao-val { font-size: 18px; font-weight: 800; color: var(--green); }

  .pi-goto-btn {
    width: 100%;
    padding: 11px;
    border-radius: 10px;
    background: rgba(59,158,255,0.1);
    border: 1px solid rgba(59,158,255,0.2);
    color: var(--blue);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }
  .pi-goto-btn:hover { background: rgba(59,158,255,0.18); }

  /* Comps Table */
  .pi-table-wrap { overflow-x: auto; margin-bottom: 18px; }
  .pi-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .pi-table th {
    padding: 8px 12px;
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--sub);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid var(--borderf);
    white-space: nowrap;
  }
  .pi-table td {
    padding: 9px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: var(--text);
  }
  .pi-table tr:last-child td { border-bottom: none; }
  .pi-table tr:hover td { background: rgba(255,255,255,0.02); }

  /* Map */
  .pi-map-wrap {
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 18px;
    border: 1px solid var(--borderf);
  }
  .pi-map-wrap iframe { display: block; width: 100%; }

  /* External links */
  .pi-ext-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 28px;
  }
  .pi-ext-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 9px;
    background: var(--card);
    border: 1px solid var(--borderf);
    color: var(--text);
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.15s;
  }
  .pi-ext-link:hover { border-color: var(--blue); color: var(--blue); }

  /* CMHC / Canadian section */
  .pi-ca-section {
    background: rgba(167,130,255,0.05);
    border: 1px solid rgba(167,130,255,0.15);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 18px;
  }
  .pi-ca-title { font-size: 13px; font-weight: 700; color: #a782ff; margin-bottom: 14px; }
  .pi-cmhc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
  .pi-cmhc-item { background: rgba(167,130,255,0.07); border-radius: 9px; padding: 10px 12px; }
  .pi-cmhc-lbl { font-size: 10px; font-weight: 700; color: #a782ff; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .pi-cmhc-val { font-size: 15px; font-weight: 800; color: var(--text); }

  /* AI Sidebar */
  .pi-chat-header {
    padding: 16px 18px 14px;
    border-bottom: 1px solid var(--borderf);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pi-chat-header-title { font-size: 14px; font-weight: 700; color: var(--text); flex: 1; }
  .pi-online-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
    animation: pi-pulse 2s ease-in-out infinite;
  }
  @keyframes pi-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  .pi-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 14px 14px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pi-chat-messages::-webkit-scrollbar { width: 4px; }
  .pi-chat-messages::-webkit-scrollbar-track { background: transparent; }
  .pi-chat-messages::-webkit-scrollbar-thumb { background: var(--dim); border-radius: 2px; }

  .pi-msg-user {
    align-self: flex-end;
    background: var(--blue);
    color: #fff;
    border-radius: 12px 12px 3px 12px;
    padding: 9px 13px;
    font-size: 13px;
    max-width: 88%;
    line-height: 1.5;
  }
  .pi-msg-ai {
    align-self: flex-start;
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 12px 12px 12px 3px;
    padding: 10px 13px;
    font-size: 13px;
    max-width: 92%;
    line-height: 1.6;
    color: var(--text);
  }
  .pi-msg-ai-label { font-size: 10px; font-weight: 700; color: var(--sub); margin-bottom: 5px; }

  .pi-chat-dots span {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--sub);
    animation: pi-dots 1.2s ease-in-out infinite;
    margin: 0 2px;
  }
  .pi-chat-dots span:nth-child(2) { animation-delay: 0.2s; }
  .pi-chat-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pi-dots { 0%,100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-5px); opacity: 1; } }

  .pi-chat-starters {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    justify-content: center;
  }
  .pi-chat-no-prop {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    gap: 12px;
  }
  .pi-chat-no-prop-icon {
    font-size: 36px;
    animation: pi-float 2.5s ease-in-out infinite;
  }
  @keyframes pi-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  .pi-chat-no-prop-text { font-size: 13px; color: var(--sub); line-height: 1.6; }

  .pi-starter-btn {
    padding: 8px 12px;
    background: rgba(59,158,255,0.06);
    border: 1px solid rgba(59,158,255,0.15);
    border-radius: 9px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    line-height: 1.4;
  }
  .pi-starter-btn:hover { background: rgba(59,158,255,0.12); border-color: rgba(59,158,255,0.3); color: var(--blue); }

  .pi-chat-input-area {
    padding: 12px 14px;
    border-top: 1px solid var(--borderf);
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .pi-chat-textarea {
    flex: 1;
    background: var(--card);
    border: 1px solid var(--borderf);
    border-radius: 10px;
    padding: 9px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: var(--text);
    outline: none;
    resize: none;
    max-height: 100px;
    line-height: 1.5;
    transition: border-color 0.15s;
  }
  .pi-chat-textarea:focus { border-color: var(--blue); }
  .pi-chat-textarea::placeholder { color: var(--dim); }
  .pi-chat-send {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: var(--blue);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }
  .pi-chat-send:hover { opacity: 0.85; }
  .pi-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Empty state */
  .pi-empty {
    text-align: center;
    padding: 60px 24px;
    color: var(--sub);
  }
  .pi-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.6; }
  .pi-empty-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .pi-empty-sub { font-size: 14px; color: var(--sub); line-height: 1.7; max-width: 420px; margin: 0 auto; }

  /* Row util */
  .pi-row { display: flex; align-items: center; gap: 8px; }
  .pi-spacer { flex: 1; }

  /* Infinite CoC badge */
  .pi-infinite-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(167,130,255,0.13);
    border: 1px solid rgba(167,130,255,0.25);
    color: #a782ff;
    font-size: 11px;
    font-weight: 700;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .pi-body { flex-direction: column; }
    .pi-main { max-width: 100%; padding: 18px 16px 40px; }
    .pi-sidebar {
      position: static;
      width: 100%;
      height: 520px;
      border-left: none;
      border-top: 1px solid var(--borderf);
    }
    .pi-market-grid { grid-template-columns: repeat(2, 1fr); }
    .pi-val-row { grid-template-columns: 1fr; }
    .pi-tabs { flex-wrap: wrap; }
    .pi-tab { flex: none; min-width: calc(50% - 4px); }
    .pi-nav-links { display: none; }
  }
`

// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, prefix, suffix }) {
  return (
    <div className="pi-field">
      <label>{label}</label>
      <div className="pi-field-wrap">
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          type="number"
          className={`pi-input${prefix ? " has-prefix" : ""}${suffix ? " has-suffix" : ""}`}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
    </div>
  )
}

function ResultItem({ label, value, color }) {
  return (
    <div className="pi-result-item">
      <div className="pi-result-item-label">{label}</div>
      <div className="pi-result-item-val" style={color ? { color } : {}}>{value}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PropertyIntelligence() {
  const navigate = useNavigate()
  const { user, signOut, getAccessToken } = useAuth()

  // Search
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // Property data
  const [property, setProperty] = useState(null)
  const [saleComps, setSaleComps] = useState(null)
  const [rentComps, setRentComps] = useState(null)
  const [caComps, setCaComps] = useState(null)
  const [cmhcData, setCmhcData] = useState(null)

  // Calculator
  const [activeTab, setActiveTab] = useState("flip")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [arv, setArv] = useState("")
  const [repairCosts, setRepairCosts] = useState("")
  const [holdMonths, setHoldMonths] = useState("6")
  const [monthlyRent, setMonthlyRent] = useState("")
  const [monthlyExpenses, setMonthlyExpenses] = useState("")
  const [vacancyRate, setVacancyRate] = useState("5")
  const [downPaymentPct, setDownPaymentPct] = useState("20")
  const [refiRate, setRefiRate] = useState("7")
  const [refiLtv, setRefiLtv] = useState("75")
  const [annualNoi, setAnnualNoi] = useState("")
  const [capRateTarget, setCapRateTarget] = useState("6")

  // Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef(null)
  const searchInputRef = useRef(null)

  // ─── Prefill from localStorage ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefill = JSON.parse(localStorage.getItem("rde_prefill") || "{}")
      const addr = prefill.address || prefill.searchQuery
      if (addr) {
        setQuery(addr)
        setTimeout(() => handleSearch(addr), 200)
      }
    } catch {}
  }, [])

  // ─── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages, chatLoading])

  // ─── Property Search ───────────────────────────────────────────────────────
  async function handleSearch(overrideAddr) {
    const addr = overrideAddr || query
    if (!addr.trim()) return
    setLoading(true)
    setProperty(null)
    setSaleComps(null)
    setRentComps(null)
    setCaComps(null)
    setCmhcData(null)

    const ca = isCanadian(addr)

    try {
      // Always fetch base property
      const propRes = await fetch(`/api/property-lookup?address=${encodeURIComponent(addr)}`)
      const propData = propRes.ok ? await propRes.json() : null
      setProperty(propData)

      if (ca) {
        // Canadian: Realtor.ca + CMHC
        const [caRes, cmhcRes] = await Promise.allSettled([
          fetch(`/api/realtor-ca?address=${encodeURIComponent(addr)}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/cmhc-rental?city=${encodeURIComponent(addr.split(",")[1]?.trim() || addr)}`).then(r => r.ok ? r.json() : null),
        ])
        if (caRes.status === "fulfilled") setCaComps(caRes.value)
        if (cmhcRes.status === "fulfilled") setCmhcData(cmhcRes.value)
      } else {
        // US: sale comps + rental comps
        const [saleRes, rentRes] = await Promise.allSettled([
          fetch(`/api/comps?type=sale&address=${encodeURIComponent(addr)}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/comps?type=rental&address=${encodeURIComponent(addr)}`).then(r => r.ok ? r.json() : null),
        ])
        if (saleRes.status === "fulfilled") setSaleComps(saleRes.value)
        if (rentRes.status === "fulfilled") setRentComps(rentRes.value)
      }

      // Pre-fill calculator inputs
      if (propData) {
        if (propData.lastSalePrice) setPurchasePrice(String(propData.lastSalePrice))
        if (propData.estimatedValue) setArv(String(propData.estimatedValue))
        if (propData.rentEstimate) setMonthlyRent(String(propData.rentEstimate))
      }
    } catch (err) {
      setProperty({ error: true, address: addr })
    }

    setLoading(false)
  }

  // ─── Calc: Flip ────────────────────────────────────────────────────────────
  const flipCalc = useMemo(() => {
    const pp = num(purchasePrice), a = num(arv), r = num(repairCosts), h = num(holdMonths)
    const sellingCosts = a * 0.085
    const holdingCosts = pp * 0.015 * h / 12
    const profit = a - pp - r - sellingCosts - holdingCosts
    const totalIn = pp + r
    const roi = totalIn > 0 ? profit / totalIn : 0
    const margin = a > 0 ? profit / a : 0
    const mao = a * 0.70 - r
    const annualCoc = totalIn > 0 && h > 0 ? (profit / totalIn) * (12 / h) : 0
    const { grade, score, color } = getDealGrade(roi, margin, pp > mao, annualCoc)
    return { profit, roi, margin, mao, annualCoc, grade, score, gradeColor: color }
  }, [purchasePrice, arv, repairCosts, holdMonths])

  // ─── Calc: BRRRR ──────────────────────────────────────────────────────────
  const brrrrCalc = useMemo(() => {
    const pp = num(purchasePrice), r = num(repairCosts), a = num(arv)
    const rent = num(monthlyRent), rate = num(refiRate) / 100, ltv = num(refiLtv) / 100
    const refiAmt = a * ltv
    const cashIn = (pp + r) - refiAmt
    const monthlyMortgage = refiAmt > 0 ? (refiAmt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -360)) : 0
    const noi = rent * 12 * 0.62
    const dscr = monthlyMortgage > 0 ? (noi / 12) / monthlyMortgage : 0
    const monthlyCF = rent - monthlyMortgage - (rent * 0.38)
    const cashRecycled = (pp + r) > 0 ? refiAmt / (pp + r) : 0
    const infiniteBrrrr = cashIn <= 0
    const annualCoc = !infiniteBrrrr && cashIn > 0 ? (monthlyCF * 12) / cashIn : null
    return { refiAmt, cashIn, monthlyMortgage, noi, dscr, monthlyCF, cashRecycled, infiniteBrrrr, annualCoc }
  }, [purchasePrice, repairCosts, arv, monthlyRent, refiRate, refiLtv])

  // ─── Calc: Rental ─────────────────────────────────────────────────────────
  const rentalCalc = useMemo(() => {
    const pp = num(purchasePrice), rent = num(monthlyRent)
    const exp = num(monthlyExpenses), vac = num(vacancyRate) / 100
    const dp = num(downPaymentPct) / 100
    const effectiveRent = rent * (1 - vac)
    const annualNOI = (effectiveRent - exp) * 12
    const capRate = pp > 0 ? annualNOI / pp : 0
    const downAmt = pp * dp
    const loanAmt = pp - downAmt
    const monthlyMortgage = loanAmt > 0 ? (loanAmt * (0.07 / 12)) / (1 - Math.pow(1 + 0.07 / 12, -360)) : 0
    const monthlyCF = effectiveRent - exp - monthlyMortgage
    const coc = downAmt > 0 ? (monthlyCF * 12) / downAmt : 0
    const grm = rent > 0 ? pp / (rent * 12) : 0
    const dscr = monthlyMortgage > 0 ? (annualNOI / 12) / monthlyMortgage : 0
    return { capRate, monthlyCF, coc, grm, dscr, annualNOI, downAmt }
  }, [purchasePrice, monthlyRent, monthlyExpenses, vacancyRate, downPaymentPct])

  // ─── Calc: Commercial ─────────────────────────────────────────────────────
  const commercialCalc = useMemo(() => {
    const pp = num(purchasePrice), noi = num(annualNoi), target = num(capRateTarget) / 100
    const impliedValue = target > 0 ? noi / target : 0
    const capRate = pp > 0 ? noi / pp : 0
    const grm = num(monthlyRent) > 0 ? pp / (num(monthlyRent) * 12) : 0
    return { impliedValue, capRate, grm }
  }, [purchasePrice, annualNoi, capRateTarget, monthlyRent])

  // ─── Market snapshot from comps ───────────────────────────────────────────
  const marketSnapshot = useMemo(() => {
    if (!saleComps?.sold?.length) return null
    const prices = saleComps.sold.map(c => c.price).filter(Boolean)
    const psfs = saleComps.sold.map(c => c.pricePerSqft).filter(Boolean)
    const days = saleComps.sold.map(c => c.daysOnMarket).filter(Boolean)
    const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2 }
    return {
      medianSoldPrice: median(prices),
      medianSoldPsf: median(psfs),
      activeCount: saleComps.active?.length || 0,
      avgDaysOnMarket: days.length ? Math.round(days.reduce((a,b)=>a+b,0)/days.length) : 0,
    }
  }, [saleComps])

  // ─── Confidence bar ───────────────────────────────────────────────────────
  const confidenceWidth = useMemo(() => {
    if (!property?.estimatedValueLow || !property?.estimatedValueHigh || !property?.estimatedValue) return 60
    const range = property.estimatedValueHigh - property.estimatedValueLow
    const pct = range / property.estimatedValue
    return Math.max(10, Math.min(95, 95 - pct * 100))
  }, [property])

  // ─── AI Chat ───────────────────────────────────────────────────────────────
  async function sendChat(text) {
    const msg = text || chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput("")
    const userMsg = { role: "user", content: msg }
    setChatMessages(prev => [...prev, userMsg])
    setChatLoading(true)

    const currentCalcs = activeTab === "flip" ? flipCalc
      : activeTab === "brrrr" ? brrrrCalc
      : activeTab === "rental" ? rentalCalc
      : commercialCalc

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          property: { ...property, ...cmhcData },
          calcs: {
            ...currentCalcs,
            medianSoldPrice: marketSnapshot?.medianSoldPrice,
            medianSoldPsf: marketSnapshot?.medianSoldPsf,
            activeCount: marketSnapshot?.activeCount,
            avgDaysOnMarket: marketSnapshot?.avgDaysOnMarket,
            activeTab,
          },
        }),
      })
      const data = await res.json()
      const aiContent = data.message || data.response || data.content || "I couldn't process that request."
      setChatMessages(prev => [...prev, { role: "assistant", content: aiContent }])
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect to the AI service right now. Please try again." }])
    }
    setChatLoading(false)
  }

  // ─── Pre-fill to /app ──────────────────────────────────────────────────────
  function goToFullAnalysis(strategy) {
    const data = {
      address: property?.address || query,
      purchasePrice: num(purchasePrice),
      arv: num(arv),
      repairCosts: num(repairCosts),
      holdMonths: num(holdMonths),
      monthlyRent: num(monthlyRent),
    }
    localStorage.setItem("rde_prefill", JSON.stringify(data))
    if (strategy === "brrrr") navigate("/brrrr")
    else if (strategy === "commercial") navigate("/commercial")
    else navigate("/app")
  }

  const ca = isCanadian(query)
  const currency = ca ? fmtC : fmt

  // ─── Address for maps ─────────────────────────────────────────────────────
  const encodedAddr = encodeURIComponent(property?.address || query)

  return (
    <>
      <style>{CSS}</style>
      <div className="pi-root">
        {/* Nav */}
        <nav className="pi-nav">
          <a href="/" className="pi-logo">Real Deal</a>
          <div className="pi-nav-links">
            <a href="/property" className="pi-nav-link active">Search</a>
            <a href="/pipeline" className="pi-nav-link">Pipeline</a>
            <a href="/portfolio" className="pi-nav-link">Portfolio</a>
          </div>
          <div className="pi-nav-right">
            {user && <span className="pi-nav-user">{user.email}</span>}
            {user && (
              <button className="pi-signout" onClick={() => signOut()}>Sign out</button>
            )}
          </div>
        </nav>

        <div className="pi-body">
          {/* ── LEFT: Main Content ── */}
          <div className="pi-main">
            {/* Search Bar */}
            <div className="pi-search-wrap">
              <span className="pi-search-icon">🔍</span>
              <input
                ref={searchInputRef}
                className="pi-search-input"
                placeholder="Enter any address — US or Canadian property"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              {loading
                ? <div className="pi-spinner" />
                : (
                  <button className="pi-search-btn" onClick={() => handleSearch()} disabled={!query.trim()}>
                    Analyze →
                  </button>
                )
              }
            </div>

            {/* Empty state */}
            {!loading && !property && (
              <div className="pi-empty">
                <div className="pi-empty-icon">🏠</div>
                <div className="pi-empty-title">Property Intelligence Command Center</div>
                <div className="pi-empty-sub">
                  Enter any US or Canadian address above to instantly get estimated value,
                  rental income, comparable sales, deal analysis calculators, and AI-powered insights — all in one place.
                </div>
              </div>
            )}

            {/* ── Property Data (after search) ── */}
            {property && (
              <>
                {/* Property Header */}
                <div className="pi-prop-header">
                  <div className="pi-prop-icon">🏠</div>
                  <div style={{ flex: 1 }}>
                    <div className="pi-prop-title">{property.address || query}</div>
                    <div className="pi-prop-sub" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {property.propertyType && (
                        <span className="pi-badge pi-badge-blue">{property.propertyType}</span>
                      )}
                      {ca && <span className="pi-badge" style={{ background: "rgba(167,130,255,0.13)", color: "#a782ff" }}>🍁 Canada</span>}
                      <span className="pi-badge pi-badge-green">
                        {property.source === "public" ? "📋 Public Records" : property.error ? "⚠️ Not in Records" : "✓ Data Loaded"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Property Facts Grid */}
                {!property.error && (
                  <div className="pi-fact-grid">
                    {property.estimatedValue && (
                      <div className="pi-fact-card" style={{ borderTop: "2px solid var(--green)" }}>
                        <div className="pi-fact-label">🏠 Estimated Value (AVM)</div>
                        <div className="pi-fact-value green">{currency(property.estimatedValue)}</div>
                        {property.estimatedValueLow && property.estimatedValueHigh && (
                          <div className="pi-fact-sub">Low: {currency(property.estimatedValueLow)} · High: {currency(property.estimatedValueHigh)}</div>
                        )}
                      </div>
                    )}
                    {(property.bedrooms || property.bathrooms) && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">🛏️ Beds / Baths</div>
                        <div className="pi-fact-value">{property.bedrooms || "—"} bd / {property.bathrooms || "—"} ba</div>
                      </div>
                    )}
                    {property.squareFootage && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">📐 Square Footage</div>
                        <div className="pi-fact-value">{fmtNum(property.squareFootage)} sqft</div>
                        {property.estimatedValue && (
                          <div className="pi-fact-sub">{currency(Math.round(property.estimatedValue / property.squareFootage))}/sqft</div>
                        )}
                      </div>
                    )}
                    {property.yearBuilt && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">📅 Year Built</div>
                        <div className="pi-fact-value">{property.yearBuilt}</div>
                        <div className="pi-fact-sub">{new Date().getFullYear() - property.yearBuilt} years old</div>
                      </div>
                    )}
                    {property.lastSalePrice && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">🏷️ Last Sale</div>
                        <div className="pi-fact-value">{currency(property.lastSalePrice)}</div>
                        {property.lastSaleDate && <div className="pi-fact-sub">{property.lastSaleDate}</div>}
                      </div>
                    )}
                    {property.propertyTaxAnnual && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">💰 Property Taxes</div>
                        <div className="pi-fact-value">{currency(property.propertyTaxAnnual)}/yr</div>
                        <div className="pi-fact-sub">{currency(Math.round(property.propertyTaxAnnual / 12))}/mo</div>
                      </div>
                    )}
                    {property.lotSize && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">🌳 Lot Size</div>
                        <div className="pi-fact-value">{property.lotSize}</div>
                      </div>
                    )}
                    {property.assessedValue && (
                      <div className="pi-fact-card">
                        <div className="pi-fact-label">🏛️ Assessed Value</div>
                        <div className="pi-fact-value">{currency(property.assessedValue)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Valuation + Rent Row */}
                {(property.estimatedValue || property.rentEstimate) && (
                  <div className="pi-val-row">
                    {property.estimatedValue && (
                      <div className="pi-card" style={{ margin: 0 }}>
                        <div className="pi-card-title">📈 Market Value</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--green)", marginBottom: 4 }}>
                          {currency(property.estimatedValue)}
                        </div>
                        {property.estimatedValueLow && property.estimatedValueHigh && (
                          <>
                            <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 8 }}>
                              Range: {currency(property.estimatedValueLow)} – {currency(property.estimatedValueHigh)}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--sub)", marginBottom: 4 }}>Confidence</div>
                            <div className="pi-conf-bar-bg">
                              <div className="pi-conf-bar-fill" style={{ width: `${confidenceWidth}%` }} />
                            </div>
                            <div style={{ fontSize: 10, color: "var(--dim)" }}>{Math.round(confidenceWidth)}% confidence</div>
                          </>
                        )}
                        {property.lastSalePrice && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--borderf)", fontSize: 12, color: "var(--sub)" }}>
                            Last sale: <strong style={{ color: "var(--text)" }}>{currency(property.lastSalePrice)}</strong>
                            {property.lastSaleDate ? ` · ${property.lastSaleDate}` : ""}
                          </div>
                        )}
                      </div>
                    )}
                    {property.rentEstimate && (
                      <div className="pi-card" style={{ margin: 0 }}>
                        <div className="pi-card-title">🏘️ Rental Estimate</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--blue)", marginBottom: 4 }}>
                          {currency(property.rentEstimate)}/mo
                        </div>
                        {property.rentEstimateLow && property.rentEstimateHigh && (
                          <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 8 }}>
                            Range: {currency(property.rentEstimateLow)} – {currency(property.rentEstimateHigh)}
                          </div>
                        )}
                        {property.estimatedValue && (
                          <>
                            <div style={{ fontSize: 12, color: "var(--sub)" }}>
                              Annual yield: <strong style={{ color: "var(--green)" }}>
                                {fmtPct((property.rentEstimate * 12) / property.estimatedValue)}
                              </strong>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 4 }}>
                              GRM: <strong style={{ color: "var(--text)" }}>
                                {property.rentEstimate > 0 ? (property.estimatedValue / (property.rentEstimate * 12)).toFixed(1) : "—"}x
                              </strong>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Market Snapshot */}
                {marketSnapshot && (
                  <>
                    <div className="pi-section-title">Market Snapshot</div>
                    <div className="pi-market-grid" style={{ marginBottom: 20 }}>
                      <div className="pi-market-stat">
                        <div className="pi-market-val">{fmt(marketSnapshot.medianSoldPrice)}</div>
                        <div className="pi-market-lbl">Median Sold Price</div>
                      </div>
                      <div className="pi-market-stat">
                        <div className="pi-market-val">${fmtNum(Math.round(marketSnapshot.medianSoldPsf))}</div>
                        <div className="pi-market-lbl">Median $/sqft</div>
                      </div>
                      <div className="pi-market-stat">
                        <div className="pi-market-val">{fmtNum(marketSnapshot.activeCount)}</div>
                        <div className="pi-market-lbl">Active Listings</div>
                      </div>
                      <div className="pi-market-stat">
                        <div className="pi-market-val">{marketSnapshot.avgDaysOnMarket}</div>
                        <div className="pi-market-lbl">Avg Days on Market</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Calculator Section */}
                <div className="pi-section-title">Deal Calculators</div>
                <div className="pi-tabs">
                  {[
                    { id: "flip", label: "Flip Analysis" },
                    { id: "brrrr", label: "BRRRR" },
                    { id: "rental", label: "Rental / Buy & Hold" },
                    { id: "commercial", label: "Commercial" },
                  ].map(t => (
                    <button
                      key={t.id}
                      className={`pi-tab${activeTab === t.id ? " active" : ""}`}
                      onClick={() => setActiveTab(t.id)}
                    >{t.label}</button>
                  ))}
                </div>

                {/* ── FLIP TAB ── */}
                {activeTab === "flip" && (
                  <div className="pi-card">
                    <div className="pi-calc-inputs">
                      <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
                      <Field label="ARV" value={arv} onChange={setArv} prefix="$" />
                      <Field label="Repair Costs" value={repairCosts} onChange={setRepairCosts} prefix="$" />
                      <Field label="Hold Months" value={holdMonths} onChange={setHoldMonths} suffix="mo" />
                    </div>
                    <div className="pi-results">
                      <div className="pi-result-main">
                        <div className="pi-result-label">Net Profit</div>
                        <div className="pi-result-big" style={{ color: flipCalc.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                          {currency(flipCalc.profit)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                          <div
                            className="pi-grade-badge"
                            style={{ background: `${flipCalc.gradeColor}20`, color: flipCalc.gradeColor }}
                          >
                            {flipCalc.grade}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--sub)", marginTop: 4 }}>Deal Grade · Score {flipCalc.score}/100</div>
                      </div>
                      <div className="pi-results-grid">
                        <ResultItem label="ROI %" value={fmtPct(flipCalc.roi)} color={flipCalc.roi > 0 ? "var(--green)" : "var(--red)"} />
                        <ResultItem label="Profit Margin" value={fmtPct(flipCalc.margin)} color={flipCalc.margin > 0 ? "var(--green)" : "var(--red)"} />
                        <ResultItem label="Annualized CoC" value={fmtPct(flipCalc.annualCoc)} />
                        <ResultItem label="Hold Period" value={`${holdMonths} months`} />
                      </div>
                    </div>
                    <div className="pi-mao">
                      <div>
                        <div className="pi-mao-label">Maximum Allowable Offer (MAO)</div>
                        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>70% of ARV minus repairs</div>
                      </div>
                      <div className="pi-mao-val">{currency(flipCalc.mao)}</div>
                    </div>
                    <button className="pi-goto-btn" onClick={() => goToFullAnalysis("flip")}>
                      View Full Analysis →
                    </button>
                  </div>
                )}

                {/* ── BRRRR TAB ── */}
                {activeTab === "brrrr" && (
                  <div className="pi-card">
                    <div className="pi-calc-inputs">
                      <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
                      <Field label="Repair Costs" value={repairCosts} onChange={setRepairCosts} prefix="$" />
                      <Field label="ARV" value={arv} onChange={setArv} prefix="$" />
                      <Field label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} prefix="$" />
                      <Field label="Refi Rate (%)" value={refiRate} onChange={setRefiRate} suffix="%" />
                      <Field label="Refi LTV (%)" value={refiLtv} onChange={setRefiLtv} suffix="%" />
                    </div>
                    <div className="pi-results">
                      <div className="pi-result-main">
                        <div className="pi-result-label">Monthly Cash Flow</div>
                        <div className="pi-result-big" style={{ color: brrrrCalc.monthlyCF >= 0 ? "var(--green)" : "var(--red)" }}>
                          {currency(brrrrCalc.monthlyCF)}/mo
                        </div>
                        {brrrrCalc.infiniteBrrrr && (
                          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                            <span className="pi-infinite-badge">♾️ True BRRRR — Infinite CoC</span>
                          </div>
                        )}
                      </div>
                      <div className="pi-results-grid">
                        <ResultItem label="Refi Amount" value={currency(brrrrCalc.refiAmt)} />
                        <ResultItem
                          label="Cash Left In"
                          value={brrrrCalc.cashIn <= 0 ? "None (all recycled)" : currency(brrrrCalc.cashIn)}
                          color={brrrrCalc.cashIn <= 0 ? "var(--green)" : undefined}
                        />
                        <ResultItem label="DSCR" value={brrrrCalc.dscr.toFixed(2)} color={brrrrCalc.dscr >= 1.25 ? "var(--green)" : "var(--amber)"} />
                        <ResultItem label="Cash Recycled" value={fmtPct(brrrrCalc.cashRecycled)} color={brrrrCalc.cashRecycled >= 0.8 ? "var(--green)" : undefined} />
                        {!brrrrCalc.infiniteBrrrr && brrrrCalc.annualCoc !== null && (
                          <ResultItem label="Annual CoC" value={fmtPct(brrrrCalc.annualCoc)} />
                        )}
                      </div>
                    </div>
                    <button className="pi-goto-btn" onClick={() => goToFullAnalysis("brrrr")}>
                      Full BRRRR Analysis →
                    </button>
                  </div>
                )}

                {/* ── RENTAL TAB ── */}
                {activeTab === "rental" && (
                  <div className="pi-card">
                    <div className="pi-calc-inputs">
                      <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
                      <Field label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} prefix="$" />
                      <Field label="Monthly Expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} prefix="$" />
                      <Field label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} suffix="%" />
                      <Field label="Down Payment" value={downPaymentPct} onChange={setDownPaymentPct} suffix="%" />
                    </div>
                    <div className="pi-results">
                      <div className="pi-result-main">
                        <div className="pi-result-label">Monthly Cash Flow</div>
                        <div className="pi-result-big" style={{ color: rentalCalc.monthlyCF >= 0 ? "var(--green)" : "var(--red)" }}>
                          {currency(rentalCalc.monthlyCF)}/mo
                        </div>
                      </div>
                      <div className="pi-results-grid">
                        <ResultItem label="Cap Rate" value={fmtPct(rentalCalc.capRate)} color={rentalCalc.capRate >= 0.06 ? "var(--green)" : "var(--amber)"} />
                        <ResultItem label="Cash-on-Cash" value={fmtPct(rentalCalc.coc)} color={rentalCalc.coc >= 0.08 ? "var(--green)" : "var(--amber)"} />
                        <ResultItem label="GRM" value={`${rentalCalc.grm.toFixed(1)}x`} />
                        <ResultItem label="DSCR" value={rentalCalc.dscr.toFixed(2)} color={rentalCalc.dscr >= 1.25 ? "var(--green)" : "var(--amber)"} />
                        <ResultItem label="Annual NOI" value={currency(rentalCalc.annualNOI)} />
                        <ResultItem label="Down Payment" value={currency(rentalCalc.downAmt)} />
                      </div>
                    </div>
                    <button className="pi-goto-btn" onClick={() => goToFullAnalysis("commercial")}>
                      Full Rental Analysis →
                    </button>
                  </div>
                )}

                {/* ── COMMERCIAL TAB ── */}
                {activeTab === "commercial" && (
                  <div className="pi-card">
                    <div className="pi-calc-inputs">
                      <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
                      <Field label="Annual NOI" value={annualNoi} onChange={setAnnualNoi} prefix="$" />
                      <Field label="Cap Rate Target" value={capRateTarget} onChange={setCapRateTarget} suffix="%" />
                    </div>
                    <div className="pi-results">
                      <div className="pi-result-main">
                        <div className="pi-result-label">Implied Value @ Target Cap Rate</div>
                        <div className="pi-result-big" style={{ color: "var(--blue)" }}>
                          {currency(commercialCalc.impliedValue)}
                        </div>
                      </div>
                      <div className="pi-results-grid">
                        <ResultItem label="Actual Cap Rate" value={fmtPct(commercialCalc.capRate)} color={commercialCalc.capRate >= 0.06 ? "var(--green)" : "var(--amber)"} />
                        <ResultItem label="GRM" value={commercialCalc.grm > 0 ? `${commercialCalc.grm.toFixed(1)}x` : "—"} />
                        <ResultItem label="Annual NOI" value={currency(num(annualNoi))} />
                        <ResultItem
                          label="vs Purchase Price"
                          value={num(purchasePrice) > 0 ? (commercialCalc.impliedValue >= num(purchasePrice) ? "✓ Under Value" : "⚠ Over Value") : "—"}
                          color={commercialCalc.impliedValue >= num(purchasePrice) ? "var(--green)" : "var(--amber)"}
                        />
                      </div>
                    </div>
                    <button className="pi-goto-btn" onClick={() => goToFullAnalysis("commercial")}>
                      Full Commercial Analysis →
                    </button>
                  </div>
                )}

                {/* Sold Comps Table */}
                {saleComps?.sold?.length > 0 && (
                  <>
                    <div className="pi-section-title">Sold Comps</div>
                    <div className="pi-table-wrap" style={{ background: "var(--card)", border: "1px solid var(--borderf)", borderRadius: 12, marginBottom: 18 }}>
                      <table className="pi-table">
                        <thead>
                          <tr>
                            <th>Address</th>
                            <th>Price</th>
                            <th>Beds</th>
                            <th>$/sqft</th>
                            <th>Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saleComps.sold.slice(0, 5).map((c, i) => (
                            <tr key={i}>
                              <td>{c.address || "—"}</td>
                              <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(c.price)}</td>
                              <td>{c.bedrooms ?? "—"}</td>
                              <td>{c.pricePerSqft ? `$${fmtNum(c.pricePerSqft)}` : "—"}</td>
                              <td>{c.daysOnMarket ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Active Listings Table */}
                {saleComps?.active?.length > 0 && (
                  <>
                    <div className="pi-section-title">Active Listings</div>
                    <div className="pi-table-wrap" style={{ background: "var(--card)", border: "1px solid var(--borderf)", borderRadius: 12, marginBottom: 18 }}>
                      <table className="pi-table">
                        <thead>
                          <tr>
                            <th>Address</th>
                            <th>Price</th>
                            <th>Beds</th>
                            <th>$/sqft</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saleComps.active.slice(0, 5).map((c, i) => (
                            <tr key={i}>
                              <td>{c.address || "—"}</td>
                              <td style={{ fontWeight: 700, color: "var(--blue)" }}>{fmt(c.price)}</td>
                              <td>{c.bedrooms ?? "—"}</td>
                              <td>{c.pricePerSqft ? `$${fmtNum(c.pricePerSqft)}` : "—"}</td>
                              <td><span className="pi-badge pi-badge-blue">Active</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Canadian Section */}
                {ca && (caComps || cmhcData) && (
                  <div className="pi-ca-section">
                    <div className="pi-ca-title">🍁 Canadian Market Data</div>
                    {caComps?.listings?.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Realtor.ca Nearby Listings
                        </div>
                        <div className="pi-table-wrap" style={{ background: "rgba(167,130,255,0.05)", borderRadius: 10, marginBottom: 14 }}>
                          <table className="pi-table">
                            <thead>
                              <tr>
                                <th>Address</th>
                                <th>Price (CAD)</th>
                                <th>Beds</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {caComps.listings.slice(0, 5).map((l, i) => (
                                <tr key={i}>
                                  <td>{l.address || "—"}</td>
                                  <td style={{ fontWeight: 700, color: "#a782ff" }}>{fmtC(l.price)}</td>
                                  <td>{l.bedrooms ?? "—"}</td>
                                  <td><span className="pi-badge" style={{ background: "rgba(167,130,255,0.13)", color: "#a782ff" }}>{l.status || "Active"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                    {cmhcData && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--sub)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 }}>
                          CMHC Rental Market Data
                        </div>
                        <div className="pi-cmhc-grid">
                          {cmhcData.vacancyRate != null && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">Vacancy Rate</div>
                              <div className="pi-cmhc-val">{(cmhcData.vacancyRate * 100).toFixed(1)}%</div>
                            </div>
                          )}
                          {cmhcData.avgRentBachelor != null && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">Bachelor Avg Rent</div>
                              <div className="pi-cmhc-val">{fmtC(cmhcData.avgRentBachelor)}/mo</div>
                            </div>
                          )}
                          {cmhcData.avgRent1Bed != null && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">1-Bed Avg Rent</div>
                              <div className="pi-cmhc-val">{fmtC(cmhcData.avgRent1Bed)}/mo</div>
                            </div>
                          )}
                          {cmhcData.avgRent2Bed != null && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">2-Bed Avg Rent</div>
                              <div className="pi-cmhc-val">{fmtC(cmhcData.avgRent2Bed)}/mo</div>
                            </div>
                          )}
                          {cmhcData.avgRent3Bed != null && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">3-Bed Avg Rent</div>
                              <div className="pi-cmhc-val">{fmtC(cmhcData.avgRent3Bed)}/mo</div>
                            </div>
                          )}
                          {cmhcData.city && (
                            <div className="pi-cmhc-item">
                              <div className="pi-cmhc-lbl">Market</div>
                              <div className="pi-cmhc-val" style={{ fontSize: 13 }}>{cmhcData.city}</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Map */}
                <div className="pi-section-title">Location</div>
                <div className="pi-map-wrap">
                  <iframe
                    title="Property Map"
                    height="260"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodedAddr}&output=embed&z=15`}
                  />
                </div>

                {/* External Links */}
                <div className="pi-section-title">View On</div>
                <div className="pi-ext-links">
                  <a className="pi-ext-link" href={`https://maps.google.com/?q=${encodedAddr}`} target="_blank" rel="noreferrer">🗺️ Google Maps</a>
                  {!ca && <a className="pi-ext-link" href={`https://www.redfin.com/search?location=${encodedAddr}`} target="_blank" rel="noreferrer">🔴 Redfin</a>}
                  {!ca && <a className="pi-ext-link" href={`https://www.realtor.com/realestateandhomes-search/${encodedAddr}`} target="_blank" rel="noreferrer">🏠 Realtor.com</a>}
                  {!ca && <a className="pi-ext-link" href={`https://www.zillow.com/homes/${encodedAddr}_rb/`} target="_blank" rel="noreferrer">🔵 Zillow</a>}
                  {ca && <a className="pi-ext-link" href={`https://www.realtor.ca/map#view=list&lat=0&lng=0&zoom=10&hPropType=1&wd=${encodedAddr}`} target="_blank" rel="noreferrer">🍁 Realtor.ca</a>}
                  {ca && /,\s*BC\b/i.test(query) && (
                    <a className="pi-ext-link" href={`https://www.bcassessment.ca/`} target="_blank" rel="noreferrer" style={{ color: "#a782ff", borderColor: "rgba(167,130,255,0.2)" }}>
                      🏛️ BC Assessment
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── RIGHT: AI Chat Sidebar ── */}
          <div className="pi-sidebar">
            <div className="pi-chat-header">
              <div style={{ fontSize: 18 }}>🤖</div>
              <div className="pi-chat-header-title">AI Property Advisor</div>
              <div className="pi-online-dot" title="Online" />
            </div>

            {!property ? (
              <div className="pi-chat-no-prop">
                <div className="pi-chat-no-prop-icon">🏠</div>
                <div className="pi-chat-no-prop-text">
                  Search an address above to get AI analysis for that specific property
                </div>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="pi-chat-starters">
                <div style={{ fontSize: 12, color: "var(--sub)", fontWeight: 600, textAlign: "center", marginBottom: 6 }}>
                  Ask me anything about this deal
                </div>
                {[
                  "Is this a good deal?",
                  "What should I offer?",
                  "Best strategy for this property?",
                  "What's the cap rate?",
                  "Would BRRRR work here?",
                ].map(q => (
                  <button key={q} className="pi-starter-btn" onClick={() => sendChat(q)}>
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              <div className="pi-chat-messages">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={msg.role === "user" ? "pi-msg-user" : "pi-msg-ai"}>
                    {msg.role === "assistant" && <div className="pi-msg-ai-label">🤖 AI Advisor</div>}
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="pi-msg-ai">
                    <div className="pi-msg-ai-label">🤖 AI Advisor</div>
                    <div className="pi-chat-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            <div className="pi-chat-input-area">
              <textarea
                className="pi-chat-textarea"
                rows={2}
                placeholder={property ? "Ask anything about this deal…" : "Search a property first…"}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={!property}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendChat()
                  }
                }}
              />
              <button
                className="pi-chat-send"
                disabled={!property || !chatInput.trim() || chatLoading}
                onClick={() => sendChat()}
                title="Send"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
