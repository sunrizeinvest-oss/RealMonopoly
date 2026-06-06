import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import './index.css'
import Login from './Login.jsx'
import Hub from './Hub.jsx'
import PropertyHub from './PropertyHub.jsx'
import BRRRRCalculator from './BRRRRCalculator.jsx'
import Pricing from './Pricing.jsx'
import Dashboard from './Dashboard.jsx'
import SharedDeal from './SharedDeal.jsx'
import App from './App.jsx'
import DealAnalyzer from './DealAnalyzer.jsx'
import CommercialAnalyzer from './CommercialAnalyzer.jsx'
import DealComparison from './DealComparison.jsx'
import PropertyWorth from './PropertyWorth.jsx'
import ForgotPassword from './ForgotPassword.jsx'
import ResetPassword from './ResetPassword.jsx'
import PrivacyPolicy from './PrivacyPolicy.jsx'
import Terms from './Terms.jsx'
import Landing from './Landing.jsx'
import RehabCalculator from './RehabCalculator.jsx'
import Learn from './Learn.jsx'
import Quiz from './Quiz.jsx'
import TaxCalculator from './TaxCalculator.jsx'
import IntercomProvider from './IntercomProvider.jsx'
import Portfolio from './Portfolio.jsx'
import Pipeline from './Pipeline.jsx'
import NetWorth from './NetWorth.jsx'
import DistressChecker from './DistressChecker.jsx'
import MortgageQualifier from './MortgageQualifier.jsx'
import SubmitDeal from './SubmitDeal.jsx'
import BudgetTracker from './BudgetTracker.jsx'
import DealScreener from './DealScreener.jsx'
import DealAlerts from './DealAlerts.jsx'
import PropertyIntelligence from './PropertyIntelligence.jsx'

// Logged-in users go straight to the analyzer, visitors see the landing page
function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/analyze" replace /> : <Landing />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IntercomProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/app" element={<App />} />
          <Route path="/app/*" element={<App />} />
          <Route path="/analyze" element={<PropertyHub />} />
          <Route path="/commercial" element={<CommercialAnalyzer />} />
          <Route path="/brrrr" element={<BRRRRCalculator />} />
          <Route path="/compare" element={<DealComparison />} />
          <Route path="/worth" element={<PropertyWorth />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </IntercomProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
