// ELEVATED: POLISH_6 — ErrorBoundary, Framer Motion page transitions
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import HeatmapPage from './pages/HeatmapPage';
import LoginPage from './pages/LoginPage';
import { AnalysisProvider } from './contexts/AnalysisContext';
import ErrorBoundary from './components/ErrorBoundary';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};

const pageTransition = { duration: 0.2, ease: 'easeInOut' };

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:auditId" element={<ReportPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AnalysisProvider>
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>
      </AnalysisProvider>
    </Router>
  );
}

export default App;
