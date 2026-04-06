// ELEVATED: POLISH_6 — DarkSkeleton loading placeholder matching the dark theme
import React from 'react';
import { Skeleton } from 'antd';

const DarkSkeleton = ({ rows = 4 }) => (
  <div style={{
    padding: '1.5rem',
    background: 'var(--bg-elevated)',
    borderRadius: '8px',
    border: '1px solid #222'
  }}>
    <Skeleton
      active
      paragraph={{ rows }}
      style={{ filter: 'invert(0.9) hue-rotate(180deg) brightness(0.3)' }}
    />
  </div>
);

export default DarkSkeleton;
