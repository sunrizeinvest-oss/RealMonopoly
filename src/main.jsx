import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './AuthContext'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'
import { installGlobalErrorCapture } from './lib/errors'
// Defer to next tick so React boots first — if errors.js itself ever throws
// (e.g., Supabase client init issue), the page still renders.
setTimeout(() => {
  try { installGlobalErrorCapture() } catch (e) { console.warn("error-capture install failed:", e?.message) }
}, 0)

// ── Eager imports (first-paint critical) ─────────────────────────────────
// Landing + Login + Auth context infrastructure. Everything else is lazy.
import Landing from './Landing.jsx'
import Login from './Login.jsx'
import IntercomProvider from './IntercomProvider.jsx'

// ── Lazy route components ────────────────────────────────────────────────
// Each route ships as its own chunk. The bundler splits these out and
// fetches them on demand when the user navigates. First paint loads ~250KB
// instead of ~600KB gzipped.
const App                  = lazy(() => import('./App.jsx'))
const PropertyHub          = lazy(() => import('./PropertyHub.jsx'))
const BRRRRCalculator      = lazy(() => import('./BRRRRCalculator.jsx'))
const Pricing              = lazy(() => import('./Pricing.jsx'))
const Dashboard            = lazy(() => import('./Dashboard.jsx'))
const SharedDeal           = lazy(() => import('./SharedDeal.jsx'))
const DealAnalyzer         = lazy(() => import('./DealAnalyzer.jsx'))
const CommercialAnalyzer   = lazy(() => import('./CommercialAnalyzer.jsx'))
const DealComparison       = lazy(() => import('./DealComparison.jsx'))
// PropertyWorth removed — /worth just redirects to /property (see WorthRedirect below)
const ForgotPassword       = lazy(() => import('./ForgotPassword.jsx'))
const ResetPassword        = lazy(() => import('./ResetPassword.jsx'))
const PrivacyPolicy        = lazy(() => import('./PrivacyPolicy.jsx'))
const Terms                = lazy(() => import('./Terms.jsx'))
const RehabCalculator      = lazy(() => import('./RehabCalculator.jsx'))
const Learn                = lazy(() => import('./Learn.jsx'))
const Quiz                 = lazy(() => import('./Quiz.jsx'))
const TaxCalculator        = lazy(() => import('./TaxCalculator.jsx'))
const Portfolio            = lazy(() => import('./Portfolio.jsx'))
const Pipeline             = lazy(() => import('./Pipeline.jsx'))
const NetWorth             = lazy(() => import('./NetWorth.jsx'))
const DistressChecker      = lazy(() => import('./DistressChecker.jsx'))
const MortgageQualifier    = lazy(() => import('./MortgageQualifier.jsx'))
const SubmitDeal           = lazy(() => import('./SubmitDeal.jsx'))
const BudgetTracker        = lazy(() => import('./BudgetTracker.jsx'))
const DealScreener         = lazy(() => import('./DealScreener.jsx'))
const DealAlerts           = lazy(() => import('./DealAlerts.jsx'))
const PropertyIntelligence = lazy(() => import('./PropertyIntelligence.jsx'))
const LoanCompare          = lazy(() => import('./LoanCompare.jsx'))
const MarketTriggers       = lazy(() => import('./MarketTriggers.jsx'))
const MarketBrief          = lazy(() => import('./MarketBrief.jsx'))
const Unsubscribe          = lazy(() => import('./Unsubscribe.jsx'))
const SharedRead           = lazy(() => import('./SharedRead.jsx'))
const Admin                = lazy(() => import('./Admin.jsx'))
const About                = lazy(() => import('./About.jsx'))
const Brokers              = lazy(() => import('./Brokers.jsx'))
const Investors            = lazy(() => import('./Investors.jsx'))
const Demo                 = lazy(() => import('./Demo.jsx'))
const Changelog            = lazy(() => import('./Changelog.jsx'))
const CaseStudy            = lazy(() => import('./CaseStudy.jsx'))
const VsBiggerPockets      = lazy(() => import('./VsBiggerPockets.jsx'))
const BuyBox               = lazy(() => import('./BuyBox.jsx'))
const SharedVerdict        = lazy(() => import('./SharedVerdict.jsx'))
const CityLanding          = lazy(() => import('./CityLanding.jsx'))
const CompareDeals         = lazy(() => import('./CompareDeals.jsx'))
const VoiceVerdict         = lazy(() => import('./VoiceVerdict.jsx'))
const ApiKeys              = lazy(() => import('./ApiKeys.jsx'))
const ApiDocs              = lazy(() => import('./ApiDocs.jsx'))
const Branding             = lazy(() => import('./Branding.jsx'))
const Pitch                = lazy(() => import('./Pitch.jsx'))
const Live                 = lazy(() => import('./Live.jsx'))
const CaseStudies          = lazy(() => import('./CaseStudies.jsx'))
const CaseStudyDetail      = lazy(() => import('./CaseStudyDetail.jsx'))
const PitchDeck            = lazy(() => import('./PitchDeck.jsx'))
const Roadmap              = lazy(() => import('./Roadmap.jsx'))
const PitchFaq             = lazy(() => import('./PitchFaq.jsx'))
const Story                = lazy(() => import('./Story.jsx'))
const PitchTeam            = lazy(() => import('./PitchTeam.jsx'))
const PitchWhyNow          = lazy(() => import('./PitchWhyNow.jsx'))
const PitchDataRoom        = lazy(() => import('./PitchDataRoom.jsx'))
const PitchUnitEconomics   = lazy(() => import('./PitchUnitEconomics.jsx'))
const PitchPipeline        = lazy(() => import('./PitchPipeline.jsx'))
const PitchSecurity        = lazy(() => import('./PitchSecurity.jsx'))
const Angel                = lazy(() => import('./Angel.jsx'))
const PitchBackers         = lazy(() => import('./PitchBackers.jsx'))
const PitchTimeline        = lazy(() => import('./PitchTimeline.jsx'))
const PitchComparables     = lazy(() => import('./PitchComparables.jsx'))
const Updates              = lazy(() => import('./Updates.jsx'))
const Press                = lazy(() => import('./Press.jsx'))
const Thanks               = lazy(() => import('./Thanks.jsx'))
const PitchReferences      = lazy(() => import('./PitchReferences.jsx'))
const Community            = lazy(() => import('./Community.jsx'))
const PitchVision          = lazy(() => import('./PitchVision.jsx'))
const VsCoStar             = lazy(() => import('./VsCoStar.jsx'))
const PitchThreats         = lazy(() => import('./PitchThreats.jsx'))
const VsDealCheck          = lazy(() => import('./VsDealCheck.jsx'))
const Blog                 = lazy(() => import('./Blog.jsx'))
const ForFirms             = lazy(() => import('./ForFirms.jsx'))
const Careers              = lazy(() => import('./Careers.jsx'))
const PitchProductVault    = lazy(() => import('./PitchProductVault.jsx'))
const Legal                = lazy(() => import('./Legal.jsx'))
const PitchDeliverables    = lazy(() => import('./PitchDeliverables.jsx'))
const Testimonials         = lazy(() => import('./Testimonials.jsx'))
const Founder              = lazy(() => import('./Founder.jsx'))
const Refer                = lazy(() => import('./Refer.jsx'))
const NotFound             = lazy(() => import('./NotFound.jsx'))

// Landing page is the home for everyone — logged-in users still see the
// marketing surface (and can copy URLs, share the X-Ray, etc.). The TopNav
// already adapts to show "Sign out" + the user's account when signed in,
// and logged-in visitors can click "Analyze" in the nav to jump to /analyze.
function Home() {
  const { loading } = useAuth()
  if (loading) return null
  return <Landing />
}

// /worth was a basic AVM-only page; /property does everything it did and more.
// Forwards any ?address= deep-link through so existing bookmarks still work.
function WorthRedirect() {
  const search = typeof window !== "undefined" ? window.location.search : ""
  return <Navigate to={`/property${search}`} replace />
}

// Re-mounts its children on every route change so the .rde-route CSS
// animation (fade + 6px rise) fires on navigation. Keyed on pathname —
// same path, no re-mount. Different path, subtree unmounts and remounts.
// Cheap: React's reconciler handles this in microseconds; the visual
// polish is worth far more than the render cost.
function RouteFade({ children }) {
  const location = useLocation()
  return <div key={location.pathname} className="rde-route">{children}</div>
}

// Tiny indeterminate progress bar at the top of the viewport. Used as the
// Suspense fallback during route chunk fetches — ~200ms on first visit to a
// route, instant on subsequent visits (browser caches the chunk).
function RouteLoader() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 2,
      background: "linear-gradient(90deg, transparent 0%, #34d98a 50%, transparent 100%)",
      backgroundSize: "200% 100%",
      animation: "rde-loader-slide 1s linear infinite",
      zIndex: 10000,
      pointerEvents: "none",
    }}>
      <style>{`@keyframes rde-loader-slide{from{background-position:200% 0}to{background-position:-200% 0}}`}</style>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <IntercomProvider>
        <Suspense fallback={<RouteLoader />}>
          <RouteFade>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/app" element={<App />} />
            <Route path="/app/*" element={<App />} />
            <Route path="/analyze" element={<PropertyHub />} />
            <Route path="/commercial" element={<CommercialAnalyzer />} />
            <Route path="/brrrr" element={<BRRRRCalculator />} />
            <Route path="/flip" element={<DealAnalyzer />} />
            <Route path="/loans" element={<LoanCompare />} />
            <Route path="/compare" element={<DealComparison />} />
            {/* /worth was a basic AVM-only page; all its functionality and more
                lives at /property now (Canadian open-data + RentCast + zoning +
                CMHC + AI thesis). Forwards any ?address= deep-link through. */}
            <Route path="/worth" element={<WorthRedirect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deal/:shareId" element={<SharedDeal />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/rehab" element={<RehabCalculator />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/tax" element={<TaxCalculator />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/networth" element={<NetWorth />} />
            <Route path="/distress" element={<DistressChecker />} />
            <Route path="/qualify" element={<MortgageQualifier />} />
            <Route path="/submit" element={<SubmitDeal />} />
            <Route path="/budget" element={<BudgetTracker />} />
            <Route path="/screen" element={<DealScreener />} />
            <Route path="/alerts" element={<DealAlerts />} />
            <Route path="/property" element={<PropertyIntelligence />} />
            <Route path="/triggers" element={<MarketTriggers />} />
            <Route path="/market-brief" element={<MarketBrief />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/case-study" element={<CaseStudy />} />
            <Route path="/vs-biggerpockets" element={<VsBiggerPockets />} />
            <Route path="/buybox" element={<BuyBox />} />
            <Route path="/deals" element={<BuyBox />} />
            <Route path="/verdict/:payload" element={<SharedVerdict />} />
            <Route path="/canada/:citySlug" element={<CityLanding />} />
            <Route path="/compare-deals" element={<CompareDeals />} />
            <Route path="/voice" element={<VoiceVerdict />} />
            <Route path="/voice-verdict" element={<VoiceVerdict />} />
            <Route path="/settings/api-keys" element={<ApiKeys />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/docs" element={<ApiDocs />} />
            <Route path="/settings/branding" element={<Branding />} />
            <Route path="/branding" element={<Branding />} />
            <Route path="/pitch" element={<Pitch />} />
            <Route path="/live" element={<Live />} />
            <Route path="/metrics" element={<Live />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/case-studies/:slug" element={<CaseStudyDetail />} />
            <Route path="/pitch/deck" element={<PitchDeck />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/pitch/faq" element={<PitchFaq />} />
            <Route path="/story" element={<Story />} />
            <Route path="/pitch/team" element={<PitchTeam />} />
            <Route path="/pitch/why-now" element={<PitchWhyNow />} />
            <Route path="/pitch/data-room" element={<PitchDataRoom />} />
            <Route path="/pitch/unit-economics" element={<PitchUnitEconomics />} />
            <Route path="/pitch/pipeline" element={<PitchPipeline />} />
            <Route path="/pitch/security" element={<PitchSecurity />} />
            <Route path="/angel" element={<Angel />} />
            <Route path="/invest" element={<Angel />} />
            <Route path="/pitch/backers" element={<PitchBackers />} />
            <Route path="/pitch/timeline" element={<PitchTimeline />} />
            <Route path="/pitch/comparables" element={<PitchComparables />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/press" element={<Press />} />
            <Route path="/thanks" element={<Thanks />} />
            <Route path="/pitch/references" element={<PitchReferences />} />
            <Route path="/community" element={<Community />} />
            <Route path="/pitch/vision" element={<PitchVision />} />
            <Route path="/vs-costar" element={<VsCoStar />} />
            <Route path="/pitch/threats" element={<PitchThreats />} />
            <Route path="/vs-dealcheck" element={<VsDealCheck />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/for-firms" element={<ForFirms />} />
            <Route path="/firms" element={<ForFirms />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/jobs" element={<Careers />} />
            <Route path="/pitch/product-vault" element={<PitchProductVault />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/pitch/deliverables" element={<PitchDeliverables />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/founder" element={<Founder />} />
            <Route path="/about-sunni" element={<Founder />} />
            <Route path="/sunni" element={<Founder />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/vs/biggerpockets" element={<VsBiggerPockets />} />
            <Route path="/compare/biggerpockets" element={<VsBiggerPockets />} />
            <Route path="/about" element={<About />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/investors" element={<Investors />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/share/read/:payload" element={<SharedRead />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RouteFade>
        </Suspense>
        </IntercomProvider>
      </AuthProvider>
      {/* Vercel Analytics — auto-tracks page views per route. Free 2.5k events/mo
          on Hobby. View at vercel.com → flip-analyzer → Analytics tab. */}
      <Analytics />
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
