import React from 'react';
import { Card, Row, Col, Typography, Spin, Steps } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import ManipulationScore from './ManipulationScore';
import PatternCard from './PatternCard';
import { useWebSocket } from '../hooks/useWebSocket';

const { Title, Text } = Typography;

const getDetectorStatus = (analysisState, detector) => {
  if (!analysisState) return 'wait';
  if (analysisState.status === 'error') return 'error';
  // analysisStarted means running
  if (analysisState.status === 'running') {
     if (analysisState[detector]) return 'finish';
     return 'process';
  }
  if (analysisState.status === 'complete') {
     return analysisState.final?.activeDetectors?.includes(detector) ? 'finish' : 'error';
  }
  return 'wait';
};

const LiveAnalysisPanel = ({ analysisState, connected }) => {
  if (!analysisState) return null;

  const isComplete = analysisState.status === 'complete';
  const score = isComplete ? analysisState.final.manipulationIndex : (analysisState.partialScore || 0);
  
  // Aggregate patterns across states for live updating
  let activePatterns = [];
  if (isComplete) {
    activePatterns = analysisState.final.patterns || [];
  } else {
    if (analysisState.dom?.patterns) activePatterns.push(...analysisState.dom.patterns);
    if (analysisState.nlp?.patterns) activePatterns.push(...analysisState.nlp.patterns);
    if (analysisState.visual?.patterns) activePatterns.push(...analysisState.visual.patterns);
  }

  return (
    <Card style={{ marginTop: '2rem', background: 'var(--bg-elevated)' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} style={{ textAlign: 'center', borderRight: '1px solid #333' }}>
          <Title level={4} style={{ color: 'var(--text-main)' }}>Manipulation Index</Title>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
            <ManipulationScore score={score} size={160} />
          </div>
          
          <div style={{ textAlign: 'left', padding: '0 20px' }}>
            <Title level={5} style={{ color: 'var(--gold-accent)' }}>Detectors</Title>
            <Steps
              direction="vertical"
              size="small"
              current={isComplete ? 3 : (analysisState.visual ? 2 : (analysisState.nlp ? 1 : 0))}
              items={[
                { title: 'DOM Structure', status: getDetectorStatus(analysisState, 'dom'), description: analysisState.dom ? `${analysisState.dom.processingTimeMs}ms` : 'Pending' },
                { title: 'NLP Semantic', status: getDetectorStatus(analysisState, 'nlp'), description: analysisState.nlp ? `${analysisState.nlp.processingTimeMs}ms` : 'Pending' },
                { title: 'Visual Analysis', status: getDetectorStatus(analysisState, 'visual'), description: analysisState.visual ? `${analysisState.visual.processingTimeMs}ms` : 'Pending' },
              ]}
              status={analysisState.status === 'error' ? 'error' : 'process'}
            />
          </div>
        </Col>
        
        <Col xs={24} md={16}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={4} style={{ margin: 0, color: 'var(--text-main)' }}>Detected Patterns</Title>
            {analysisState.status === 'running' && <Spin size="small" />}
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            <AnimatePresence>
              {activePatterns.length === 0 ? (
                <Text type="secondary">Waiting for patterns...</Text>
              ) : (
                activePatterns.map((p, i) => (
                  <motion.div
                    key={`${p.category}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PatternCard pattern={p} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default LiveAnalysisPanel;
