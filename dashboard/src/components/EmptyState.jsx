// ELEVATED: POLISH_6 — EmptyState component for meaningful empty dashboard prompts
import React from 'react';

const EmptyState = ({ title = 'No data yet', message = 'Run your first analysis to see results here.', action }) => (
  <div style={{
    padding: '4rem 2rem',
    textAlign: 'center',
    border: '1px dashed #333',
    borderRadius: '8px',
    background: 'var(--bg-elevated)'
  }}>
    <div style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: 'var(--gold-dim)',
      margin: '0 auto 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 20,
        height: 20,
        border: '2px solid var(--gold-accent)',
        borderRadius: '50%'
      }} />
    </div>
    <h3 style={{
      color: 'var(--gold-accent)',
      fontFamily: 'var(--font-display)',
      marginBottom: '0.5rem'
    }}>
      {title}
    </h3>
    <p style={{ color: '#A0A09A', marginBottom: action ? '1.5rem' : 0 }}>{message}</p>
    {action}
  </div>
);

export default EmptyState;
