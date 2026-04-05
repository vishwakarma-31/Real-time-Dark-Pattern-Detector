import React, { useState } from 'react';
import { Card, Typography, Tooltip, Tag, Collapse } from 'antd';
import { WarningOutlined, EyeOutlined, BuildOutlined, FileTextOutlined } from '@ant-design/icons';
import SeverityBadge from './SeverityBadge';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Helper to format category nicely
const formatCategory = (cat) => cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const PatternCard = ({ pattern, showEvidence = true, showLegal = true }) => {
  if (!pattern) return null;
  const catColor = `var(--cat-${pattern.category})`;

  const renderDetectors = () => {
    return pattern.detectedBy?.map(d => {
      let icon, color;
      if (d === 'dom') { icon = <BuildOutlined />; color = '#3498DB'; }
      if (d === 'nlp') { icon = <FileTextOutlined />; color = '#9B59B6'; }
      if (d === 'visual') { icon = <EyeOutlined />; color = '#E67E22'; }
      return (
        <Tooltip title={`${d.toUpperCase()} Detector`} key={d}>
          <Tag color={color} icon={icon}>{d.toUpperCase()}</Tag>
        </Tooltip>
      );
    });
  };

  return (
    <Card 
      size="small" 
      style={{ borderLeft: `4px solid ${catColor}`, marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text strong style={{ fontSize: '1.1rem', color: '#fff' }}>
            {formatCategory(pattern.category)}
          </Text>
          <SeverityBadge severity={pattern.severity || 'medium'} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {renderDetectors()}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">Confidence:</Text>{' '}
        <Text style={{ color: catColor }}>{Math.round(pattern.confidence * 100)}%</Text>
        {pattern.corroborationBonus > 0 && (
          <Tooltip title={`+${Math.round(pattern.corroborationBonus*100)}% multi-modal boost`}>
            <Text style={{ color: '#C9A96E', marginLeft: 8 }}>⚡ Boosted</Text>
          </Tooltip>
        )}
      </div>

      {showEvidence && (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ color: '#ccc', backgroundColor: '#1A1A1A', padding: '8px', borderRadius: '4px', fontSize: '0.9rem' }}>
          {pattern.evidenceText || pattern.domEvidence || pattern.nlpEvidence || 'Visual evidence extracted.'}
        </Paragraph>
      )}

      {showLegal && pattern.legalClause && (
        <Collapse ghost size="small">
          <Panel header={<span style={{ color: 'var(--gold-accent)' }}><WarningOutlined /> Regulatory Violation</span>} key="1">
            <div style={{ border: '1px solid var(--gold-accent)', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--gold-dim)' }}>
              <Text style={{ fontSize: '0.85rem' }}>{pattern.legalClause}</Text>
            </div>
          </Panel>
        </Collapse>
      )}
    </Card>
  );
};

export default PatternCard;
