import { useNavigate } from "react-router-dom";

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{overflow-x:hidden}
  body{background:var(--bg);color:var(--text);font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
  .lp-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--borderf);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
  .lp-logo{font-size:16px;font-weight:800;color:var(--text);text-decoration:none;cursor:pointer}
  .lp-logo span{color:var(--blue)}
  .lp-nav-btn{background:var(--blue);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Geist',sans-serif;text-decoration:none}
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
  .lp-highlight{background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:6px;padding:16px 20px;margin:20px 0}
  .lp-highlight p{font-size:14px;color:var(--text);line-height:1.65;margin:0}
  footer{border-top:1px solid var(--borderf);padding:20px 40px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
  .f-logo{font-size:13px;font-weight:700;color:var(--dim)}.f-logo span{color:var(--blue)}
  .f-links{display:flex;gap:20px}
  .f-link{font-size:12px;color:var(--dim);text-decoration:none;cursor:pointer}
  .f-link:hover{color:var(--sub)}
`;

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div style={{minHeight:"100vh",background:"#ffffff"}}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />

      <nav className="lp-nav">
        <span className="lp-logo" onClick={() => navigate("/")}><span>Real</span> Deal</span>
        <a href="/analyze" className="lp-nav-btn">Go to app →</a>
      </nav>

      <div className="lp-body">
        <div className="lp-eyebrow">Legal</div>
        <div className="lp-title">Terms of Service</div>
        <div className="lp-date">Last updated: April 5, 2026 · Effective immediately</div>

        <div className="lp-highlight">
          <p>The short version: RizeAI is a deal analysis tool for informational purposes only — it is not financial or investment advice. Use the numbers as a starting point, not a guarantee. You're responsible for doing your own due diligence before making any real estate decision.</p>
        </div>

        <div className="lp-h2">1. Acceptance of terms</div>
        <div className="lp-p">By creating an account or using rizeai.co ("RizeAI", "the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We may update these terms from time to time — continued use of the Service after changes constitutes acceptance.</div>

        <div className="lp-h2">2. Description of service</div>
        <div className="lp-p">RizeAI provides real estate deal analysis tools including single-family flip analysis, multi-family commercial analysis, deal scoring, PDF exports, and deal saving features. The Service is provided on a freemium basis — certain features require a paid Pro subscription.</div>

        <div className="lp-h2">3. No financial or investment advice</div>
        <div className="lp-p">All outputs produced by RizeAI — including deal scores, profit estimates, ROI figures, cap rates, cash flow projections, and any other metrics — are for <strong>informational and educational purposes only</strong>. They do not constitute financial, investment, legal, or tax advice.</div>
        <div className="lp-p">Real estate investment involves significant risk, including the potential loss of capital. You should consult a qualified financial advisor, real estate professional, accountant, or lawyer before making any investment decision. RizeAI and its operators assume no liability for decisions made based on the Service's outputs.</div>

        <div className="lp-h2">4. Accuracy of information</div>
        <div className="lp-p">Deal analysis results are only as accurate as the information you input. RizeAI does not verify property values, rental rates, construction costs, or any other data you provide. Market conditions change — projections made today may not reflect future reality. Always verify figures independently with licensed professionals.</div>

        <div className="lp-h2">5. User accounts</div>
        <ul className="lp-ul">
          <li>You must be 18 years of age or older to create an account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must provide accurate information when creating your account.</li>
          <li>You may not share your account with others or use another person's account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
        </ul>

        <div className="lp-h2">6. Subscriptions and billing</div>
        <div className="lp-p">The Pro plan is billed monthly at the rate displayed on our Pricing page. Payments are processed by Stripe. By subscribing, you authorize us to charge your payment method on a recurring monthly basis until you cancel.</div>
        <ul className="lp-ul">
          <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Your Pro access continues until the end of the current billing period.</li>
          <li><strong>Refunds:</strong> We offer a 7-day money-back guarantee for new Pro subscribers. Email <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a> within 7 days of your first charge to request a full refund.</li>
          <li><strong>Price changes:</strong> We will notify you at least 30 days before any price increase takes effect.</li>
          <li><strong>Free tier:</strong> Free accounts are limited to 3 saved deals. We reserve the right to adjust free tier limits with reasonable notice.</li>
        </ul>

        <div className="lp-h2">7. Acceptable use</div>
        <div className="lp-p">You agree not to:</div>
        <ul className="lp-ul">
          <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
          <li>Attempt to reverse engineer, scrape, or reproduce the Service or its underlying code</li>
          <li>Use automated tools to access the Service in ways that exceed normal human usage</li>
          <li>Share, resell, or sublicense access to the Service to third parties</li>
          <li>Attempt to circumvent subscription paywalls or access Pro features without a valid subscription</li>
          <li>Input false or misleading data with the intent to manipulate outputs for fraudulent purposes</li>
        </ul>

        <div className="lp-h2">8. Intellectual property</div>
        <div className="lp-p">All content, design, algorithms, scoring models, and code comprising the RizeAI Service are the intellectual property of RizeAI Estate App and its operators. You may not copy, reproduce, or distribute any part of the Service without written permission.</div>
        <div className="lp-p">You retain ownership of all deal data you input. By saving deals to the Service, you grant us a limited license to store and display that data to you within the application.</div>

        <div className="lp-h2">9. Limitation of liability</div>
        <div className="lp-p">To the maximum extent permitted by applicable law, RizeAI and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to lost profits, lost data, or financial losses arising from your use of or inability to use the Service.</div>
        <div className="lp-p">Our total liability to you for any claim arising from these terms or your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100 CAD, whichever is greater.</div>

        <div className="lp-h2">10. Disclaimer of warranties</div>
        <div className="lp-p">The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that any particular output will be accurate or reliable for your specific situation.</div>

        <div className="lp-h2">11. Governing law</div>
        <div className="lp-p">These terms are governed by the laws of the Province of Alberta, Canada, without regard to conflict of law principles. Any disputes arising from these terms or the Service shall be resolved in the courts of Alberta.</div>

        <div className="lp-h2">12. Contact</div>
        <div className="lp-p">Questions about these terms? Email us at <a href="mailto:kaelan@chmic.ca">kaelan@chmic.ca</a> or call <a href="tel:5875854571">587-585-4571</a>.</div>
      </div>

      <footer>
        <span className="f-logo"><span>Real</span> Deal — rizeai.co</span>
        <div className="f-links">
          <a href="/privacy" className="f-link">Privacy</a>
          <a href="/terms" className="f-link">Terms</a>
          <a href="mailto:kaelan@chmic.ca" className="f-link">Contact</a>
        </div>
      </footer>
    </div>
  );
}
