import React, { useState } from 'react';
import { Row, Col, Typography, Input, Button, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      // Calls existing AI Interview auth endpoint
      const res = await api.post('/auth/login', { email, password });
      if (res.data.token) {
         localStorage.setItem('token', res.data.token);
         navigate('/dashboard');
      }
    } catch (e) {
      console.error(e);
      message.error('Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setEmail('demo@darkscan.io');
    setPassword('demo123!');
    // If we wanted to directly login:
    // handleLogin()
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <Card style={{ width: 400, background: 'var(--bg-elevated)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Title level={2} style={{ margin: 0, color: 'var(--gold-accent)' }}>DarkScan</Title>
          <Text type="secondary">Sign in to your dashboard</Text>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            size="large" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <Input.Password 
            size="large" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <Button type="primary" size="large" block loading={loading} onClick={handleLogin}>
            Sign In
          </Button>
          <Button type="default" size="large" block onClick={handleDemo}>
            Try Demo Account
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
