import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Typography, Card, Button, Divider, Spin, message } from 'antd';
import { ExportOutlined, ShareAltOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import ManipulationScore from '../components/ManipulationScore';
import PatternCard from '../components/PatternCard';
import SeverityBadge from '../components/SeverityBadge';
import { generatePdfReport } from '../services/reportExport';

const { Title, Text, Paragraph } = Typography;

const ReportPage = () => {
  const { auditId } = useParams();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchAudit();
  }, [auditId]);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit/${auditId}`);
      setAudit(res.data);
    } catch (e) {
      console.error(e);
      message.error('Failed to load audit report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audit?.screenshotBase64 && canvasRef.current) {
      drawScreenshotWithOverlays();
    }
  }, [audit, canvasRef]);

  const drawScreenshotWithOverlays = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes if present
      audit.detectedPatterns?.forEach(p => {
        if (p.boundingBox) {
          ctx.strokeStyle = `var(--cat-${p.category})`;
          ctx.lineWidth = 4;
          ctx.strokeRect(p.boundingBox.x, p.boundingBox.y, p.boundingBox.w, p.boundingBox.h);
          
          ctx.fillStyle = `var(--cat-${p.category})`;
          ctx.fillRect(p.boundingBox.x, p.boundingBox.y - 30, Math.max(150, p.category.length * 10), 30);
          
          ctx.fillStyle = '#fff';
          ctx.font = '16px "DM Sans"';
          ctx.fillText(`${p.category.toUpperCase()} (${Math.round(p.confidence*100)}%)`, p.boundingBox.x + 10, p.boundingBox.y - 10);
        }
      });
    };
    img.src = audit.screenshotBase64;
  };

  const handleExport = () => {
    if (!audit) return;
    generatePdfReport(audit);
  };

  const handlePublish = async () => {
    try {
      const res = await api.post(`/report/${auditId}/publish`);
      const pubUrl = `${window.location.origin}${res.data.publicUrl}`;
      navigator.clipboard.writeText(pubUrl);
      message.success('Report published and link copied to clipboard!');
    } catch (e) {
      message.error('Failed to publish report.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '10vh' }}><Spin size="large" /></div>;
  if (!audit) return <div className="layout-container"><Title level={3}>Report not found</Title></div>;

  const hostname = new URL(audit.url).hostname;

  return (
    <div className="layout-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: '2rem' }}>
         <Col>
           <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="favicon" style={{ width: 32, height: 32, borderRadius: '4px' }}/>
              {hostname} Audit
           </Title>
           <Text type="secondary">{new Date(audit.timestamp).toLocaleString()}</Text>
         </Col>
         <Col>
           <div style={{ display: 'flex', gap: '1rem' }}>
             <Button icon={<ReloadOutlined />} onClick={fetchAudit}>Refresh</Button>
             <Button icon={<ShareAltOutlined />} onClick={handlePublish}>Share</Button>
             <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>Export PDF</Button>
           </div>
         </Col>
      </Row>

      <Card style={{ marginBottom: '2rem', background: 'var(--bg-elevated)', border: 'none' }}>
        <Row align="middle" gutter={48}>
          <Col>
            <ManipulationScore score={audit.overallScore} size={150} animated={true} />
          </Col>
          <Col flex="auto">
            <Title level={4}>Overall Analysis</Title>
            <Paragraph type="secondary" style={{ fontSize: '1.1rem' }}>
              We detected <Text strong style={{color: '#fff'}}>{audit.detectedPatterns?.length || 0}</Text> manipulation patterns across this site. 
              The resulting severity classification is <SeverityBadge severity={audit.severityLevel} style={{fontSize: '1rem'}}/>.
            </Paragraph>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} md={8}>
          <Card title="DOM Detector">
             <Text type="secondary">Processing Time:</Text> <Text strong>48ms</Text><br/>
             <Text type="secondary">Status:</Text> <Text type="success">Active</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="NLP Detector">
             <Text type="secondary">Processing Time:</Text> <Text strong>2100ms</Text><br/>
             <Text type="secondary">Status:</Text> <Text type="success">Active</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Visual Detector">
             <Text type="secondary">Processing Time:</Text> <Text strong>4500ms</Text><br/>
             <Text type="secondary">Status:</Text> <Text type="success">Active</Text>
          </Card>
        </Col>
      </Row>

      <Title level={3} style={{ marginTop: '2rem' }}>Detected Patterns</Title>
      {audit.detectedPatterns?.length === 0 ? (
        <Card><Text>No dark patterns detected on this page.</Text></Card>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            {audit.detectedPatterns?.map((p, idx) => (
              <PatternCard key={idx} pattern={p} />
            ))}
          </Col>
          <Col xs={24} lg={12}>
            {audit.screenshotBase64 ? (
              <Card title="Visual Evidence Overlay" bodyStyle={{ padding: 0 }}>
                <div style={{ width: '100%', maxHeight: '600px', overflowV: 'auto', backgroundColor: '#000' }}>
                  <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </Card>
            ) : (
              <Card><Text type="secondary">No visual snapshot available for this audit.</Text></Card>
            )}
          </Col>
        </Row>
      )}

      {audit.detectedPatterns?.some(p => p.legalClause) && (
        <>
          <Divider style={{ borderColor: '#333' }} />
          <Title level={3}>Regulatory & Legal Mapping</Title>
          <Card style={{ background: 'var(--gold-dim)', borderColor: 'var(--gold-accent)' }}>
            <Paragraph style={{ color: 'var(--text-main)' }}>
              The detected patterns potentially violate the following consumer protection frameworks:
            </Paragraph>
            <ul style={{ color: 'var(--text-main)', paddingLeft: '20px' }}>
              {Array.from(new Set(audit.detectedPatterns.map(p => p.legalClause).filter(Boolean))).map((clause, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>{clause}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportPage;
