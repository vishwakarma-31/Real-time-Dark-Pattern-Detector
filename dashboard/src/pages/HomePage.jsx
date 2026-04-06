import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Input, Button, Statistic, Space } from 'antd';
import { motion } from 'framer-motion';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAnalysis } from '../contexts/AnalysisContext';
import LiveAnalysisPanel from '../components/LiveAnalysisPanel';
import api from '../services/api';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

// WS connects to backend port 5000, not Vite dev server port 5174.
const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : 'ws://localhost:5000/ws');

const HomePage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalAudits: 0, uniqueSites: 0, mostCommonPattern: '-' });
  const { currentSessionId, setCurrentSessionId } = useAnalysis();
  
  const sessionId = currentSessionId || Math.random().toString(36).substring(7);
  const { connected, analysisState, setAnalysisState } = useWebSocket(WS_URL, sessionId);

  useEffect(() => {
    if (!currentSessionId) setCurrentSessionId(sessionId);
    api.get('/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

  const handleAnalyze = async (value) => {
    if (!value) return;
    try {
      setLoading(true);
      setAnalysisState(null); // Reset
      await api.post('/analyze', { url: value, sessionId });
    } catch (e) {
      console.error(e);
      setAnalysisState({ status: 'error', error: 'Failed to start analysis.' });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="layout-container" style={{ padding: '4rem 2rem' }}>
      <Row justify="center" style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <Col span={24}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Title level={1} style={{ fontSize: '4rem', marginBottom: '1rem' }}>The web is manipulating you.</Title>
            <Paragraph style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>
              Real-time dark pattern detection powered by multi-modal AI.
            </Paragraph>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <Space size="large" style={{ marginTop: '2rem' }}>
              <Button type="primary" size="large" href="#">Install Extension</Button>
              <Button size="large" onClick={() => document.getElementById('demo-input').focus()}>Try Demo</Button>
              <Button size="large" href="/dashboard" type="link">Dashboard</Button>
            </Space>
          </motion.div>
        </Col>
      </Row>

      <Row justify="center" style={{ marginBottom: '4rem' }}>
        <Col xs={24} md={16} lg={12}>
          <Search
            id="demo-input"
            placeholder="Enter URL to analyze (e.g. https://amazon.in)"
            enterButton="Analyze"
            size="large"
            loading={loading}
            onSearch={handleAnalyze}
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </Col>
      </Row>

      {analysisState && (
        <Row justify="center">
          <Col xs={24} md={20}>
            <LiveAnalysisPanel analysisState={analysisState} connected={connected} />
          </Col>
        </Row>
      )}

      {!analysisState && (
        <>
          <Row justify="space-around" style={{ marginTop: '6rem', marginBottom: '4rem' }}>
             <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic title="Total Sites Analyzed" value={stats.totalAudits || 0} />
             </Col>
             <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic title="Patterns Detected" value={(stats.totalAudits || 0) * 3} /* Mocked patterns count */ />
             </Col>
             <Col span={6} style={{ textAlign: 'center' }}>
                <Statistic title="Most Common Pattern" value={stats.mostCommonPattern || '-'} />
             </Col>
          </Row>

          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Row gutter={[24, 24]}>
              {['fake_countdown', 'hidden_cost', 'roach_motel', 'trick_question', 'forced_continuity', 'confirm_shaming'].map((cat, idx) => (
                <Col xs={24} md={12} lg={8} key={idx}>
                  <motion.div variants={itemVariants}>
                    <div style={{ padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '8px', borderLeft: `4px solid var(--cat-${cat})` }}>
                      <Title level={4}>{cat.replace('_', ' ').toUpperCase()}</Title>
                      <Paragraph type="secondary" style={{color: '#ccc'}}>
                        Detected via DOM and algorithmic manipulation parsing. Violates consumer trust and DPDP Act standards.
                      </Paragraph>
                    </div>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </>
      )}
      
      <footer style={{ marginTop: '6rem', textAlign: 'center', borderTop: '1px solid #333', padding: '2rem 0' }}>
        <Text type="secondary">DarkScan - Real-time Dark Pattern Detection</Text>
      </footer>
    </div>
  );
};

export default HomePage;
