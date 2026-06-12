'use client';

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: 'calc(100vh - 120px)', padding: '24px' }}>
      <div className="card-base" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div 
          style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(248, 113, 113, 0.1)', 
            border: '1px solid rgba(248, 113, 113, 0.2)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#F87171'
          }}
        >
          <WifiOff size={32} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF' }}>Connection Lost</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            You are currently offline. DebugDuel requires an active internet connection to synchronize real-time matches, matchmaking, and leaderboard scores.
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', width: '100%', padding: '16px 0 8px 0', textAlign: 'left' }}>
          <h4 style={{ color: 'var(--accent-blue)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: '600' }}>
            What you can do:
          </h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Check your Wi-Fi or cellular network settings.</li>
            <li>Once reconnected, click the retry button below.</li>
            <li>The game client will automatically re-establish socket connections.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
          <button 
            onClick={handleRetry} 
            className="btn btn-primary" 
            style={{ flex: 1 }}
          >
            <RefreshCw size={16} />
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}
