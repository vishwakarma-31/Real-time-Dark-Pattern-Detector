import React, { useEffect, useState } from 'react';

const ManipulationScore = ({ score = 0, size = 120, animated = true }) => {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }
    
    const start = displayScore;
    const end = Math.round(score);
    if (start === end) return;
    
    let startTime = null;
    const duration = 400; // ms
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const current = Math.floor(progress * (end - start) + start);
      setDisplayScore(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score, animated]);

  // Color mapping
  let color = '#27AE60'; // low
  if (displayScore >= 30) color = '#F39C12'; // medium
  if (displayScore >= 60) color = '#E67E22'; // high
  if (displayScore >= 80) color = '#C0392B'; // critical

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke="#333"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease-out, stroke 0.4s ease' }}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 'bold', color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
          {displayScore}
        </span>
        <span style={{ fontSize: size * 0.1, color: '#A0A09A', marginTop: '2px' }}>/ 100</span>
      </div>
    </div>
  );
};

export default ManipulationScore;
