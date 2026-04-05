import React from 'react';

const SeverityBadge = ({ severity, style }) => {
  const normalized = (severity || 'low').toLowerCase();
  
  const colors = {
    low: '#27AE60',
    medium: '#F39C12',
    high: '#E67E22',
    critical: '#C0392B',
    pending: '#808080'
  };

  const badgeStyle = {
    backgroundColor: `${colors[normalized]}20`,
    color: colors[normalized],
    border: `1px solid ${colors[normalized]}`,
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    display: 'inline-block',
    ...style
  };

  return <div style={badgeStyle}>{normalized}</div>;
};

export default SeverityBadge;
