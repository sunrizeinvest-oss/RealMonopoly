import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .quiz-root {
    min-height: 100vh;
    background: #07090f;
    font-family: 'DM Sans', sans-serif;
    color: var(--text);
    display: flex;
    flex-direction: column;
  }

  .quiz-nav {
    position: sticky;
    top: 0;
    z-index: 200;
    background: rgba(7,9,15,0.97);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.07);
    padding: 0 24px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .quiz-nav-logo {
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    text-decoration: none;
    letter-spacing: -0.5px;
  }

  .quiz-nav-logo span { color: var(--blue); }

  .quiz-nav-back {
    font-size: 13px;
    font-weight: 600;
    color: var(--sub);
    text-decoration: none;
    padding: 5px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px;
    transition: color 0.15s, border-color 0.15s;
  }

  .quiz-nav-back:hover {
    color: var(--text);
    border-color: rgba(255,255,255,0.2);
  }

  .quiz-body {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 20px 80px;
  }

  .quiz-container {
    width: 100%;
    max-width: 640px;
  }

  /* Progress */
  .quiz-progress-wrap {
    margin-bottom: 36px;
  }

  .quiz-progress-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .quiz-progress-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--sub);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .quiz-progress-step {
    font-size: 12px;
    font-weight: 700;
    color: var(--blue);
  }

  .quiz-progress-track {
    height: 4px;
    background: rgba(255,255,255,0.07);
    border-radius: 9999px;
    overflow: hidden;
  }

  .quiz-progress-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, var(--blue), var(--purple));
    transition: width 0.35s ease;
  }

  /* Question Card */
  .quiz-question-card {
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 36px 32px;
    margin-bottom: 24px;
  }

  .quiz-question-num {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--blue);
    margin-bottom: 12px;
  }

  .quiz-question-text {
    font-size: 22px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.4px;
    line-height: 1.3;
    margin-bottom: 28px;
  }

  /* Options Grid */
  .quiz-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 540px) {
    .quiz-options { grid-template-columns: 1fr; }
    .quiz-question-card { padding: 24px 20px; }
    .quiz-question-text { font-size: 18px; }
  }

  .quiz-option {
    background: #0a0e18;
    border: 1.5px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 16px 18px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    text-align: left;
    outline: none;
    font-family: inherit;
  }

  .quiz-option:hover {
    border-color: rgba(59,158,255,0.35);
    background: rgba(59,158,255,0.05);
  }

  .quiz-option.selected {
    border-color: var(--blue);
    background: rgba(59,158,255,0.1);
    box-shadow: 0 0 0 3px rgba(59,158,255,0.12);
  }

  .quiz-option-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .quiz-option.selected .quiz-option-label {
    color: #93c5fd;
  }

  .quiz-option-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.15);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, background 0.15s;
  }

  .quiz-option.selected .quiz-option-dot {
    border-color: var(--blue);
    background: var(--blue);
  }

  .quiz-option-dot-inner {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .quiz-option.selected .quiz-option-dot-inner {
    opacity: 1;
  }

  /* Nav Buttons */
  .quiz-nav-btns {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .quiz-btn-back {
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 13px 22px;
    font-size: 14px;
    font-weight: 600;
    color: var(--sub);
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .quiz-btn-back:hover {
    color: var(--text);
    border-color: rgba(255,255,255,0.2);
  }

  .quiz-btn-next {
    flex: 1;
    background: var(--blue);
    border: none;
    border-radius: 10px;
    padding: 13px 22px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s, background 0.15s;
  }

  .quiz-btn-next:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .quiz-btn-next:not(:disabled):hover {
    background: #5aaeff;
  }

  /* ─── Result Page ─── */
  .quiz-result-card {
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 20px;
  }

  .quiz-result-hero {
    padding: 36px 32px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .quiz-result-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .quiz-result-icon {
    font-size: 44px;
    line-height: 1;
    margin-bottom: 12px;
  }

  .quiz-result-title {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.2;
    margin-bottom: 8px;
  }

  .quiz-result-subtitle {
    font-size: 15px;
    color: var(--sub);
    line-height: 1.6;
  }

  /* Tie result */
  .quiz-result-heroes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    padding: 28px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  @media (max-width: 540px) {
    .quiz-result-heroes { grid-template-columns: 1fr; }
    .quiz-result-hero { padding: 24px 20px 20px; }
  }

  .quiz-tie-card {
    background: #0a0e18;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.07);
    text-align: center;
  }

  .quiz-tie-icon { font-size: 34px; margin-bottom: 8px; }

  .quiz-tie-name {
    font-size: 15px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 4px;
  }

  /* Score Bars */
  .quiz-scores {
    padding: 24px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .quiz-scores-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--sub);
    margin-bottom: 16px;
  }

  .quiz-score-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .quiz-score-label {font-family:'Fira Code',ui-monospace,monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    width: 120px;
    flex-shrink: 0;
  }

  .quiz-score-track {
    flex: 1;
    height: 10px;
    background: rgba(255,255,255,0.06);
    border-radius: 9999px;
    overflow: hidden;
  }

  .quiz-score-bar {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.6s ease;
  }

  .quiz-score-val {font-family:'Fira Code',ui-monospace,monospace;
    font-size: 13px;
    font-weight: 700;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }

  /* Reasons */
  .quiz-reasons {
    padding: 24px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .quiz-reasons-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--sub);
    margin-bottom: 16px;
  }

  .quiz-reason-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .quiz-reason-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 7px;
  }

  .quiz-reason-text {
    font-size: 14px;
    color: #8b9db5;
    line-height: 1.6;
  }

  .quiz-reason-text strong { color: var(--text); }

  /* CTA */
  .quiz-cta {
    padding: 24px 32px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  @media (max-width: 540px) {
    .quiz-scores { padding: 20px; }
    .quiz-reasons { padding: 20px; }
    .quiz-cta { padding: 20px; flex-direction: column; }
    .quiz-score-label {font-family:'Fira Code',ui-monospace,monospace; width: 90px; font-size: 12px; }
  }

  .quiz-btn-primary {
    flex: 1;
    min-width: 160px;
    background: var(--blue);
    border: none;
    border-radius: 10px;
    padding: 14px 22px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s;
  }

  .quiz-btn-primary:hover { background: #5aaeff; }

  .quiz-btn-secondary {
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 14px 22px;
    font-size: 14px;
    font-weight: 600;
    color: var(--sub);
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
  }

  .quiz-btn-secondary:hover {
    color: var(--text);
    border-color: rgba(255,255,255,0.2);
  }

  /* Intro screen */
  .quiz-intro {
    text-align: center;
    padding: 20px 0 0;
  }

  .quiz-intro-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(59,158,255,0.1);
    border: 1px solid rgba(59,158,255,0.2);
    border-radius: 9999px;
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    color: var(--blue);
    letter-spacing: 0.3px;
    margin-bottom: 20px;
  }

  .quiz-intro-title {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.8px;
    color: var(--text);
    line-height: 1.2;
    margin-bottom: 14px;
  }

  @media (max-width: 540px) {
    .quiz-intro-title { font-size: 24px; }
  }

  .quiz-intro-desc {
    font-size: 16px;
    color: var(--sub);
    line-height: 1.7;
    margin-bottom: 32px;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }

  .quiz-intro-pills {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 36px;
  }

  .quiz-intro-pill {
    background: #0d1119;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 9999px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #8b9db5;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .quiz-intro-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--blue);
    border: none;
    border-radius: 12px;
    padding: 16px 36px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    margin-bottom: 12px;
  }

  .quiz-intro-btn:hover { background: #5aaeff; }

  .quiz-intro-note {
    font-size: 12px;
    color: var(--dim);
    margin-top: 12px;
  }
`;

const QUESTIONS = [
  {
    id: "q1",
    num: 1,
    text: "How much cash can you invest in a single deal?",
    options: [
      { label: "Under $25K", scores: { flip: 1, brrrr: 1, mf: 0 } },
      { label: "$25K – $75K", scores: { flip: 2, brrrr: 2, mf: 1 } },
      { label: "$75K – $200K", scores: { flip: 2, brrrr: 2, mf: 2 } },
      { label: "$200K+", scores: { flip: 1, brrrr: 2, mf: 3 } },
    ],
  },
  {
    id: "q2",
    num: 2,
    text: "When do you need returns?",
    options: [
      { label: "3–9 months (quick win)", scores: { flip: 3, brrrr: 0, mf: 0 } },
      { label: "1–2 years", scores: { flip: 1, brrrr: 2, mf: 0 } },
      { label: "5+ years (wealth building)", scores: { flip: 0, brrrr: 2, mf: 3 } },
      { label: "No preference", scores: { flip: 1, brrrr: 1, mf: 1 } },
    ],
  },
  {
    id: "q3",
    num: 3,
    text: "How involved do you want to be?",
    options: [
      { label: "Very hands-on, I want to manage everything", scores: { flip: 2, brrrr: 2, mf: 0 } },
      { label: "Moderate involvement", scores: { flip: 0, brrrr: 2, mf: 1 } },
      { label: "As passive as possible", scores: { flip: 0, brrrr: 0, mf: 3 } },
      { label: "Not sure yet", scores: { flip: 1, brrrr: 1, mf: 1 } },
    ],
  },
  {
    id: "q4",
    num: 4,
    text: "Do you have experience managing renovations?",
    options: [
      { label: "Yes, I've done multiple projects", scores: { flip: 3, brrrr: 3, mf: 0 } },
      { label: "Some experience", scores: { flip: 2, brrrr: 2, mf: 0 } },
      { label: "No experience, but willing to learn", scores: { flip: 1, brrrr: 1, mf: 0 } },
      { label: "Prefer no renovation", scores: { flip: 0, brrrr: 0, mf: 2 } },
    ],
  },
  {
    id: "q5",
    num: 5,
    text: "What's your approximate credit score?",
    options: [
      { label: "Excellent (720+)", scores: { flip: 2, brrrr: 2, mf: 2 } },
      { label: "Good (680–719)", scores: { flip: 2, brrrr: 2, mf: 1 } },
      { label: "Fair (620–679)", scores: { flip: 2, brrrr: 1, mf: 0 } },
      { label: "Below 620", scores: { flip: 2, brrrr: 0, mf: 0 } },
    ],
  },
  {
    id: "q6",
    num: 6,
    text: "What's most important to you?",
    options: [
      { label: "Quick cash / profit now", scores: { flip: 3, brrrr: 0, mf: 0 } },
      { label: "Build long-term wealth", scores: { flip: 0, brrrr: 2, mf: 3 } },
      { label: "Monthly passive income", scores: { flip: 0, brrrr: 0, mf: 3 } },
      { label: "Scalability / repeat system", scores: { flip: 0, brrrr: 3, mf: 0 } },
    ],
  },
  {
    id: "q7",
    num: 7,
    text: "What market are you investing in?",
    options: [
      { label: "High-value market ($500K+ median)", scores: { flip: 0, brrrr: 1, mf: 2 } },
      { label: "Mid-range market ($200K–$500K)", scores: { flip: 2, brrrr: 2, mf: 2 } },
      { label: "Affordable market (under $200K)", scores: { flip: 3, brrrr: 2, mf: 0 } },
      { label: "Not sure yet", scores: { flip: 1, brrrr: 1, mf: 1 } },
    ],
  },
];

const TOTAL_STEPS = QUESTIONS.length;

const STRATEGIES = {
  flip: {
    icon: "🏚️",
    name: "Fix & Flip",
    color: "var(--amber)",
    colorDim: "rgba(240,160,48,0.15)",
    colorBorder: "rgba(240,160,48,0.3)",
    link: "/app",
    linkLabel: "Open Flip Analyzer",
  },
  brrrr: {
    icon: "🔄",
    name: "BRRRR Strategy",
    color: "var(--purple)",
    colorDim: "rgba(167,130,255,0.15)",
    colorBorder: "rgba(167,130,255,0.3)",
    link: "/brrrr",
    linkLabel: "Open BRRRR Calculator",
  },
  mf: {
    icon: "🏢",
    name: "Multifamily / Rental",
    color: "var(--green)",
    colorDim: "rgba(52,217,138,0.15)",
    colorBorder: "rgba(52,217,138,0.3)",
    link: "/commercial",
    linkLabel: "Open Multifamily Analyzer",
  },
};

function buildReasons(winner, answers) {
  const reasons = [];

  if (winner === "flip") {
    const budgetAnswer = answers[0];
    const timelineAnswer = answers[1];
    const remodelAnswer = answers[3];

    if (budgetAnswer !== null && [1, 2].includes(budgetAnswer)) {
      reasons.push(
        <>Your <strong>investment budget</strong> is well-suited for Fix &amp; Flip projects, which typically require less upfront capital than buy-and-hold strategies.</>
      );
    }
    if (timelineAnswer === 0) {
      reasons.push(
        <>You prefer <strong>quick returns</strong> — Fix &amp; Flip is built for investors who want to turn a profit in 3–9 months rather than waiting years.</>
      );
    }
    if (remodelAnswer !== null && remodelAnswer <= 2) {
      reasons.push(
        <>Your <strong>renovation experience</strong> (or willingness to learn) is a core asset in flipping, where managing the rehab is where value is created.</>
      );
    }
    reasons.push(
      <>Fix &amp; Flip lets you <strong>recycle your capital</strong> quickly — close, renovate, sell, and roll profits into the next deal.</>
    );
  } else if (winner === "brrrr") {
    const activityAnswer = answers[2];
    const goalAnswer = answers[5];
    const remodelAnswer = answers[3];

    if (remodelAnswer !== null && remodelAnswer <= 1) {
      reasons.push(
        <>Your <strong>renovation experience</strong> is a major advantage — BRRRR relies on adding value through rehab before refinancing at ARV.</>
      );
    }
    if (activityAnswer !== null && activityAnswer <= 1) {
      reasons.push(
        <>You're comfortable with <strong>active management</strong>, which suits BRRRR's hands-on acquisition and rehab phase before settling into landlord mode.</>
      );
    }
    if (goalAnswer === 3) {
      reasons.push(
        <>You want a <strong>repeatable, scalable system</strong> — BRRRR is designed to recycle capital so each deal funds the next one.</>
      );
    }
    reasons.push(
      <>BRRRR lets you <strong>build a rental portfolio</strong> while pulling your original cash back out via cash-out refinancing, compounding your growth.</>
    );
  } else {
    const passiveAnswer = answers[2];
    const goalAnswer = answers[5];
    const budgetAnswer = answers[0];
    const marketAnswer = answers[6];

    if (passiveAnswer === 2) {
      reasons.push(
        <>You prefer a <strong>passive or low-involvement</strong> approach — Multifamily with professional property management delivers income without daily headaches.</>
      );
    }
    if (goalAnswer === 2) {
      reasons.push(
        <>You're focused on <strong>monthly passive income</strong> — Multifamily properties generate consistent rental cash flow from day one.</>
      );
    }
    if (budgetAnswer === 3) {
      reasons.push(
        <>Your larger <strong>investment budget</strong> unlocks Multifamily deals that smaller investors can't access, often with better per-unit economics.</>
      );
    }
    if (marketAnswer === 0) {
      reasons.push(
        <>In <strong>high-value markets</strong>, Multifamily properties offer strong appreciation potential alongside rental income, maximizing total returns.</>
      );
    }
    reasons.push(
      <>Multifamily is the <strong>ultimate wealth-building vehicle</strong> — scale from a duplex to a 10-unit building while tenants pay down your mortgage.</>
    );
  }

  return reasons.slice(0, 4);
}

export default function Quiz() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("intro"); // "intro" | "quiz" | "result"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(Array(TOTAL_STEPS).fill(null));
  const [selected, setSelected] = useState(null);

  const totalScore = TOTAL_STEPS > 0
    ? answers.reduce(
        (acc, ansIdx, qIdx) => {
          if (ansIdx === null) return acc;
          const s = QUESTIONS[qIdx].options[ansIdx].scores;
          return { flip: acc.flip + s.flip, brrrr: acc.brrrr + s.brrrr, mf: acc.mf + s.mf };
        },
        { flip: 0, brrrr: 0, mf: 0 }
      )
    : { flip: 0, brrrr: 0, mf: 0 };

  function handleStart() {
    setPhase("quiz");
    setStep(0);
    setAnswers(Array(TOTAL_STEPS).fill(null));
    setSelected(null);
  }

  function handleSelect(optIdx) {
    setSelected(optIdx);
  }

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);

    if (step < TOTAL_STEPS - 1) {
      const nextSelected = newAnswers[step + 1] !== null ? newAnswers[step + 1] : null;
      setStep(step + 1);
      setSelected(nextSelected);
    } else {
      setPhase("result");
    }
  }

  function handleBack() {
    if (step === 0) {
      setPhase("intro");
      return;
    }
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);
    const prevStep = step - 1;
    setStep(prevStep);
    setSelected(newAnswers[prevStep]);
  }

  function handleRetake() {
    setPhase("intro");
    setStep(0);
    setAnswers(Array(TOTAL_STEPS).fill(null));
    setSelected(null);
  }

  const maxScore = Math.max(totalScore.flip, totalScore.brrrr, totalScore.mf);
  const winners = Object.entries(totalScore)
    .filter(([, v]) => v === maxScore)
    .map(([k]) => k);
  const isTie = winners.length > 1;
  const primaryWinner = winners[0];

  const barMax = Math.max(totalScore.flip, totalScore.brrrr, totalScore.mf, 1);

  const progressPct = phase === "quiz"
    ? Math.round(((step) / TOTAL_STEPS) * 100)
    : phase === "result" ? 100 : 0;

  return (
    <div className="quiz-root">
      <style>{CSS}</style>

      {/* Nav */}
      <nav className="quiz-nav">
        <a href="/" className="quiz-nav-logo">
          <span>Real</span> Deal
        </a>
        <a href="/analyze" className="quiz-nav-back">
          ← Back to Tools
        </a>
      </nav>

      <div className="quiz-body">
        <div className="quiz-container">

          {/* ── INTRO ── */}
          {phase === "intro" && (
            <div className="quiz-intro">
              <div className="quiz-intro-eyebrow">
                <span>🎯</span> Strategy Fit Quiz
              </div>
              <h1 className="quiz-intro-title">
                Which real estate strategy<br />is right for you?
              </h1>
              <p className="quiz-intro-desc">
                Answer 7 quick questions about your budget, goals, and experience. We'll match you to the investing strategy that fits your profile — Fix &amp; Flip, BRRRR, or Multifamily.
              </p>
              <div className="quiz-intro-pills">
                <span className="quiz-intro-pill">🏚️ Fix &amp; Flip</span>
                <span className="quiz-intro-pill">🔄 BRRRR</span>
                <span className="quiz-intro-pill">🏢 Multifamily</span>
              </div>
              <button className="quiz-intro-btn" onClick={handleStart}>
                Start Quiz <span style={{ fontSize: 18 }}>→</span>
              </button>
              <p className="quiz-intro-note">7 questions · Takes about 2 minutes · No sign-up needed</p>
            </div>
          )}

          {/* ── QUIZ ── */}
          {phase === "quiz" && (
            <>
              {/* Progress */}
              <div className="quiz-progress-wrap">
                <div className="quiz-progress-meta">
                  <span className="quiz-progress-label">Strategy Fit Quiz</span>
                  <span className="quiz-progress-step">
                    Question {step + 1} of {TOTAL_STEPS}
                  </span>
                </div>
                <div className="quiz-progress-track">
                  <div
                    className="quiz-progress-fill"
                    style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="quiz-question-card">
                <div className="quiz-question-num">Question {step + 1} — Investment Profile</div>
                <h2 className="quiz-question-text">{QUESTIONS[step].text}</h2>

                <div className="quiz-options">
                  {QUESTIONS[step].options.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`quiz-option${selected === idx ? " selected" : ""}`}
                      onClick={() => handleSelect(idx)}
                    >
                      <span className="quiz-option-label">
                        <span className="quiz-option-dot">
                          <span className="quiz-option-dot-inner" />
                        </span>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="quiz-nav-btns">
                <button className="quiz-btn-back" onClick={handleBack}>
                  ← Back
                </button>
                <button
                  className="quiz-btn-next"
                  disabled={selected === null}
                  onClick={handleNext}
                >
                  {step < TOTAL_STEPS - 1 ? "Next Question →" : "See My Results →"}
                </button>
              </div>
            </>
          )}

          {/* ── RESULT ── */}
          {phase === "result" && (
            <>
              {/* Progress — complete */}
              <div className="quiz-progress-wrap">
                <div className="quiz-progress-meta">
                  <span className="quiz-progress-label">Quiz Complete</span>
                  <span className="quiz-progress-step" style={{ color: "var(--green)" }}>100%</span>
                </div>
                <div className="quiz-progress-track">
                  <div className="quiz-progress-fill" style={{ width: "100%", background: "linear-gradient(90deg, var(--green), var(--blue))" }} />
                </div>
              </div>

              <div className="quiz-result-card">

                {/* Hero */}
                {!isTie ? (
                  <div
                    className="quiz-result-hero"
                    style={{ background: STRATEGIES[primaryWinner].colorDim }}
                  >
                    <div
                      className="quiz-result-badge"
                      style={{
                        background: STRATEGIES[primaryWinner].colorDim,
                        border: `1px solid ${STRATEGIES[primaryWinner].colorBorder}`,
                        color: STRATEGIES[primaryWinner].color,
                      }}
                    >
                      <span>Best Match</span>
                    </div>
                    <div className="quiz-result-icon">{STRATEGIES[primaryWinner].icon}</div>
                    <div
                      className="quiz-result-title"
                      style={{ color: STRATEGIES[primaryWinner].color }}
                    >
                      {STRATEGIES[primaryWinner].name} is your best fit
                    </div>
                    <div className="quiz-result-subtitle">
                      Based on your answers, this strategy aligns best with your budget, timeline, experience, and goals.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="quiz-result-hero">
                      <div
                        className="quiz-result-badge"
                        style={{
                          background: "rgba(59,158,255,0.1)",
                          border: "1px solid rgba(59,158,255,0.3)",
                          color: "var(--blue)",
                        }}
                      >
                        <span>Strong Match</span>
                      </div>
                      <div
                        className="quiz-result-title"
                        style={{ color: "var(--text)", fontSize: 20 }}
                      >
                        These two strategies both fit you well
                      </div>
                      <div className="quiz-result-subtitle">
                        Your profile scored equally across two strategies — explore both to find the best starting point.
                      </div>
                    </div>
                    <div className="quiz-result-heroes">
                      {winners.map((w) => (
                        <div key={w} className="quiz-tie-card" style={{ borderColor: STRATEGIES[w].colorBorder }}>
                          <div className="quiz-tie-icon">{STRATEGIES[w].icon}</div>
                          <div className="quiz-tie-name" style={{ color: STRATEGIES[w].color }}>
                            {STRATEGIES[w].name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Score Bars */}
                <div className="quiz-scores">
                  <div className="quiz-scores-title">Your Score Breakdown</div>
                  {[
                    { key: "flip", label: "Fix & Flip", color: STRATEGIES.flip.color },
                    { key: "brrrr", label: "BRRRR", color: STRATEGIES.brrrr.color },
                    { key: "mf", label: "Multifamily", color: STRATEGIES.mf.color },
                  ].map(({ key, label, color }) => (
                    <div key={key} className="quiz-score-row">
                      <span className="quiz-score-label">{label}</span>
                      <div className="quiz-score-track">
                        <div
                          className="quiz-score-bar"
                          style={{
                            width: `${Math.round((totalScore[key] / barMax) * 100)}%`,
                            background: color,
                            opacity: winners.includes(key) ? 1 : 0.45,
                          }}
                        />
                      </div>
                      <span
                        className="quiz-score-val"
                        style={{ color: winners.includes(key) ? color : "var(--sub)" }}
                      >
                        {totalScore[key]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reasons */}
                <div className="quiz-reasons">
                  <div className="quiz-reasons-title">Why this fits you</div>
                  {buildReasons(primaryWinner, answers).map((reason, i) => (
                    <div key={i} className="quiz-reason-item">
                      <div
                        className="quiz-reason-dot"
                        style={{ background: STRATEGIES[primaryWinner].color }}
                      />
                      <p className="quiz-reason-text">{reason}</p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="quiz-cta">
                  {!isTie ? (
                    <a
                      href={STRATEGIES[primaryWinner].link}
                      className="quiz-btn-primary"
                      style={{ background: STRATEGIES[primaryWinner].color }}
                    >
                      {STRATEGIES[primaryWinner].linkLabel} →
                    </a>
                  ) : (
                    winners.map((w) => (
                      <a
                        key={w}
                        href={STRATEGIES[w].link}
                        className="quiz-btn-primary"
                        style={{ background: STRATEGIES[w].color }}
                      >
                        {STRATEGIES[w].linkLabel} →
                      </a>
                    ))
                  )}
                  <button className="quiz-btn-secondary" onClick={handleRetake}>
                    Retake Quiz
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
