import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
const Hub                  = lazy(() => import('./Hub.jsx'))
const PropertyHub          = lazy(() => import('./PropertyHub.jsx'))
const BRRRRCalculator      = lazy(() => import('./BRRRRCalculator.jsx'))
const Pricing              = lazy(() => import('./Pricing.jsx'))
const Dashboard            = lazy(() => import('./Dashboard.jsx'))
const SharedDeal           = lazy(() => import('./SharedDeal.jsx'))
const DealAnalyzer         = lazy(() => import('./DealAnalyzer.jsx'))
const CommercialAnalyzer   = lazy(() => import('./CommercialAnalyzer.jsx'))
const DealComparison       = lazy(() => import('./DealComparison.jsx'))
const PropertyWorth        = lazy(() => import('./PropertyWorth.jsx'))
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

// Logged-in users go straight to the analyzer, visitors see the landing page
function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/analyze" replace /> : <Landing />
}

// /worth was a basic AVM-only page; /property does everything it did and more.
// Forwards any ?address= deep-link through so existing bookmarks still work.
function WorthRedirect() {
  const search = typeof window !== "undefined" ? window.location.search : ""
  return <Navigate to={`/property${search}`} replace />
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/app" element={<App />} />
            <Route path="/app/*" element={<App />} />
            <Route path="/analyze" element={<PropertyHub />} />
            <Route path="/commercial" element={<CommercialAnalyzer />} />
            <Route path="/brrrr" element={<BRRRRCalculator />} />
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
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/share/read/:payload" element={<SharedRead />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </IntercomProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
