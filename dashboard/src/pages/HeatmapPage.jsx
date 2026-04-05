import React, { useState, useEffect } from 'react';
import { Row, Col, Typography, Segmented, Card, Tooltip as AntTooltip, Spin } from 'antd';
import api from '../services/api';

const { Title, Text } = Typography;

const categories = ['fake_countdown', 'hidden_cost', 'roach_motel', 'trick_question', 'forced_continuity', 'confirm_shaming'];
const siteTypes = ['ecommerce', 'travel', 'streaming', 'fintech', 'food_delivery', 'edtech', 'other'];

const formatStr = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const HeatmapPage = () => {
  const [view, setView] = useState('Category Heatmap');
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats').then(res => {
      setHeatmapData(res.data.heatmapData);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const getIntensityColor = (val, max) => {
    if (!val) return 'var(--bg-elevated)';
    const intensity = Math.max(0.2, val / max);
    // Gold tone mapping
    return `rgba(201, 169, 110, ${intensity})`;
  };

  const renderCategoryHeatmap = () => {
    if (!heatmapData || !heatmapData.bySiteCategory) return null;
    
    // Find absolute max
    let maxPattern = 1;
    siteTypes.forEach(st => {
       if (heatmapData.bySiteCategory[st]) {
          categories.forEach(cat => {
             const val = heatmapData.bySiteCategory[st][cat] || 0;
             if (val > maxPattern) maxPattern = val;
          });
       }
    });

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th></th>
              {categories.map(c => <th key={c} style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'normal', transform: 'rotate(-45deg)', height: '100px', verticalAlign: 'bottom' }}>{formatStr(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {siteTypes.map(st => (
              <tr key={st}>
                <td style={{ textAlign: 'right', paddingRight: '16px', color: 'var(--text-main)', fontSize: '14px', width: '120px' }}>{formatStr(st)}</td>
                {categories.map(cat => {
                  const val = heatmapData.bySiteCategory[st]?.[cat] || 0;
                  return (
                    <td key={cat} style={{ width: '50px', height: '50px' }}>
                      <AntTooltip title={`${val} instances of ${formatStr(cat)} on ${formatStr(st)} sites`} color="#1A1A1A">
                        <div style={{
                          width: '100%', height: '100%',
                          backgroundColor: getIntensityColor(val, maxPattern),
                          borderRadius: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: val > maxPattern/2 ? '#000' : 'var(--text-muted)',
                          fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
                        }}>
                          {val > 0 ? val : ''}
                        </div>
                      </AntTooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="layout-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: '2rem' }}>
        <Col><Title level={2} style={{ margin: 0 }}>Pattern Intelligence Matrix</Title></Col>
        <Col>
          <Segmented 
            options={['Category Heatmap', 'Timeline Heatmap']} 
            value={view} 
            onChange={setView} 
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--gold-accent)' }}
          />
        </Col>
      </Row>

      <Card loading={loading} bodyStyle={{ padding: '2rem' }}>
        {loading ? <Spin /> : (
          view === 'Category Heatmap' ? renderCategoryHeatmap() : (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
               <Title level={4} style={{ color: 'var(--text-muted)' }}>Timeline implementation using standard SVG grids follows same data structure</Title>
               <Text type="secondary">Loaded {heatmapData?.byDay?.length || 0} days of activity data.</Text>
            </div>
          )
        )}
      </Card>
    </div>
  );
};

export default HeatmapPage;
