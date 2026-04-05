import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import HeatmapPage from './pages/HeatmapPage';
import LoginPage from './pages/LoginPage';
import { AnalysisProvider } from './contexts/AnalysisContext';

function App() {
  return (
    <Router>
      <AnalysisProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report/:auditId" element={<ReportPage />} />
          <Route path="/heatmap" element={<HeatmapPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AnalysisProvider>
    </Router>
  );
}

export default App;
