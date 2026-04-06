// ELEVATED: POLISH_6 — ErrorBoundary catches component crashes and shows a clean recovery UI
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[DarkScan ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h2 style={{ color: 'var(--gold-accent)', fontFamily: 'var(--font-display)' }}>Something went wrong</h2>
          <p style={{ color: '#A0A09A', marginBottom: '1.5rem' }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--gold-accent)',
              color: '#0A0A0A',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              transition: 'opacity 0.2s'
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
