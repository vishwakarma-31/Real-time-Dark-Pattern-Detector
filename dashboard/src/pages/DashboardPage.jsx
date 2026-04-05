import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Space, Button } from 'antd';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import api from '../services/api';
import SeverityBadge from '../components/SeverityBadge';

const { Title } = Typography;

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, histRes] = await Promise.all([
          api.get('/stats'),
          api.get('/history')
        ]);
        setStats(statsRes.data);
        setHistory(histRes.data.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatter = (value) => <CountUp end={value} separator="," />;

  const columns = [
    { title: 'Site', dataIndex: 'url', key: 'url', render: text => <strong>{new URL(text).hostname}</strong> },
    { title: 'Score', dataIndex: 'overallScore', key: 'score', render: val => <span style={{color: 'var(--gold-accent)'}}>{Math.round(val || 0)}</span>, sorter: (a,b) => a.overallScore - b.overallScore },
    { title: 'Patterns Found', key: 'patternsFound', render: (_, r) => r.detectedPatterns?.length || 0 },
    { title: 'Severity', dataIndex: 'severityLevel', key: 'severity', render: val => <SeverityBadge severity={val} /> },
    { title: 'Date', dataIndex: 'timestamp', key: 'date', render: val => new Date(val).toLocaleDateString() },
    { title: 'Action', key: 'action', render: (_, r) => <Button type="primary" size="small" onClick={() => navigate(`/report/${r._id}`)}>View Report</Button> }
  ];

  // Radar chart formatting
  const radarData = stats?.categoryFrequency ? Object.entries(stats.categoryFrequency).map(([key, val]) => ({
    category: key.replace(/_/g, ' ').toUpperCase(),
    count: val,
    fullMark: Math.max(...Object.values(stats.categoryFrequency))
  })) : [];

  return (
    <div className="layout-container">
      <Title level={2} style={{ marginBottom: '2rem' }}>Audit Analytics</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '2rem' }}>
        <Col xs={12} md={6}>
          <Card loading={loading}><Statistic title="Total Audits Run" value={stats?.totalAudits || 0} formatter={formatter} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}><Statistic title="Unique Sites" value={stats?.uniqueSites || 0} formatter={formatter} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}><Statistic title="Average Score" value={Math.round(stats?.averageScore || 0)} formatter={formatter} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card loading={loading}><Statistic title="Critical Sites" value={stats?.criticalSites || 0} formatter={formatter} valueStyle={{ color: 'var(--severity-critical)' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: '2rem' }}>
        <Col xs={24} lg={16}>
          <Card title="Manipulation Trends (30 Days)" loading={loading} style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.recentActivity || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: 'none' }} />
                <Line type="monotone" dataKey="avgScore" stroke="var(--gold-accent)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Category Breakdown" loading={loading} style={{ height: '400px' }}>
             <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                  <Radar name="Patterns" dataKey="count" stroke="var(--gold-accent)" fill="var(--gold-accent)" fillOpacity={0.4} />
                </RadarChart>
             </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
         <Col xs={24} lg={16}>
           <Card title="Recent Audits" bodyStyle={{ padding: 0 }}>
             <Table 
               columns={columns} 
               dataSource={history} 
               rowKey="_id" 
               pagination={{ pageSize: 5 }} 
               loading={loading} 
             />
           </Card>
         </Col>
         <Col xs={24} lg={8}>
            <Card title="Worst Offenders" loading={loading} style={{ height: '100%' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.worstSites || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="url" type="category" width={100} tickFormatter={(val) => new URL(val).hostname.replace('www.', '')} tick={{ fill: 'var(--text-main)', fontSize: 12 }} />
                  <Tooltip cursor={{fill: 'var(--bg-elevated)'}} />
                  <Bar dataKey="overallScore" fill="var(--severity-critical)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
         </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
