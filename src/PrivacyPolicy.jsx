import { useNavigate } from "react-router-dom";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#07090f;--card:#0d1119;--border:rgba(59,158,255,0.12);--borderf:rgba(255,255,255,0.07);--text:#dde4ef;--sub:#6b7d96;--dim:#3a4a60;--blue:#3b9eff}
  html,body{overflow-x:hidden}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased}
  .lp-nav{position:sticky;top:0;z-index:100;background:rgba(7,9,15,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .lp-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;cursor:pointer}
  .lp-logo span{color:var(--blue)}
  .lp-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none}
  .lp-body{max-width:740px;margin:0 auto;padding:56px 24px 96px}
  .lp-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue);margin-bottom:14px}
  .lp-title{font-size:36px;font-weight:800;color:var(--text);letter-spacing:-1px;line-height:1.1;margin-bottom:10px}
  .lp-date{font-size:13px;color:var(--sub);margin-bottom:48px;padding-bottom:24px;border-bottom:1px solid var(--borderf)}
  .lp-section{margin-bottom:36px}
  .lp-h2{font-size:18px;font-weight:700;color:var(--text);margin-bottom:12px;margin-top:36px}
  .lp-p{font-size:15px;color:var(--sub);line-height:1.75;margin-bottom:12px}
  .lp-p a{color:var(--blue);text-decoration:none}
  .lp-p a:hover{text-decoration:underline}
  .lp-ul{margin:10px 0 14px 20px;display:flex;flex-direction:column;gap:8px}
  .lp-ul li{font-size:15px;color:var(--sub);line-height:1.7}
  .lp-highlight{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:10px;padding:16px 20px;margin:20px 0}
  .lp-highlight p{font-size:14px;color:var(--text);line-height:1.65;margin:0}
  footer{border-top:1px solid var(--borderf);padding:20px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
  .f-logo{font-size:13px;font-weight:700;color:var(--dim)}.f-logo span{color:var(--blue)}
  .f-links{display:flex;gap:20px}
  .f-link{font-size:12px;color:var(--dim);text-decoration:none;cursor:pointer}
  .f-link:hover{color:var(--sub)}
`;

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div style={{minHeight:"100vh",background:"#07090f"}}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />

      <nav className="lp-nav">
        <span className="lp-logo" onClick={() => navigate("/")}><span>Real</span> Deal</span>
        <a href="/analyze" className="lp-nav-btn">Go to app →</a>
      </nav>

      <div className="lp-body">
        <div className="lp-eyebrow">Legal</div>
        <div className="lp-title">Privacy Policy</div>
        <div className="lp-date">Last updated: April 5, 2026 · Effective immediately</div>

        <div className="lp-highlight">
          <p>The short version: we collect only what we need to run the service, we don't sell your data, and you can delete your account and data at any time by emailing <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a>.</p>
        </div>

        <div className="lp-h2">1. Who we are</div>
        <div className="lp-p">Real Deal Estate App ("Real Deal", "we", "us", "our") operates the website realdealestate.app and the deal analysis tools available on it. Our primary contact is <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a>.</div>

        <div className="lp-h2">2. Information we collect</div>
        <div className="lp-p">We collect information you provide directly and information generated as you use the service:</div>
        <ul className="lp-ul">
          <li><strong>Account information:</strong> Your email address and password (stored securely by Supabase) when you create an account.</li>
          <li><strong>Deal data:</strong> Property addresses, financial figures, and analysis results you enter and choose to save.</li>
          <li><strong>Payment information:</strong> When you upgrade to Pro, your payment is processed by Stripe. We never see or store your full card number — Stripe handles all payment data under their own privacy policy.</li>
          <li><strong>Usage data:</strong> Standard web server logs including IP addresses and browser type. We do not use advertising trackers or third-party analytics.</li>
        </ul>

        <div className="lp-h2">3. How we use your information</div>
        <ul className="lp-ul">
          <li>To provide and operate the Real Deal service</li>
          <li>To process your subscription and manage billing</li>
          <li>To send transactional emails (password resets, receipts)</li>
          <li>To respond to support requests</li>
          <li>To improve the product based on aggregated, non-identifiable usage patterns</li>
        </ul>
        <div className="lp-p">We do not sell, rent, or share your personal information with third parties for marketing purposes.</div>

        <div className="lp-h2">4. Data storage and security</div>
        <div className="lp-p">Your account and saved deal data is stored on Supabase, which hosts data on AWS infrastructure with encryption at rest and in transit. Supabase is SOC 2 Type II compliant. We use Vercel to serve the application and Stripe for payment processing — both maintain their own security programs.</div>
        <div className="lp-p">We take reasonable steps to protect your data but cannot guarantee absolute security. If you become aware of a security issue, please contact us immediately at <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a>.</div>

        <div className="lp-h2">5. Cookies</div>
        <div className="lp-p">We use only essential cookies required for authentication (session tokens managed by Supabase). We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</div>

        <div className="lp-h2">6. Your rights</div>
        <div className="lp-p">You have the right to access, correct, or delete your personal data at any time. To exercise these rights, email <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a> and we will respond within 30 days. You can also delete your saved deals directly from your dashboard.</div>

        <div className="lp-h2">7. Data retention</div>
        <div className="lp-p">We retain your account and deal data for as long as your account is active. If you cancel your subscription, your account and saved deals remain accessible on the free tier. If you request account deletion, we will permanently delete your data within 30 days.</div>

        <div className="lp-h2">8. Children</div>
        <div className="lp-p">Real Deal is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with their data, contact us and we will delete it.</div>

        <div className="lp-h2">9. Changes to this policy</div>
        <div className="lp-p">We may update this policy from time to time. We will notify you of material changes by email or by posting a notice on the app. Continued use of the service after changes take effect constitutes acceptance of the updated policy.</div>

        <div className="lp-h2">10. Contact</div>
        <div className="lp-p">Questions about this policy? Email us at <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a> or call <a href="tel:5875854571">587-585-4571</a>.</div>
      </div>

      <footer>
        <span className="f-logo"><span>Real</span> Deal — realdealestate.app</span>
        <div className="f-links">
          <a href="/privacy" className="f-link">Privacy</a>
          <a href="/terms" className="f-link">Terms</a>
          <a href="mailto:kaelan@chmic.ca" className="f-link">Contact</a>
        </div>
      </footer>
    </div>
  );
}
