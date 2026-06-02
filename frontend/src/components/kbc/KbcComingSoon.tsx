'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface KbcComingSoonProps {
  title: string;
  description: string;
  backUrl: string;
}

export default function KbcComingSoon({ title, description, backUrl }: KbcComingSoonProps) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'radial-gradient(circle at center, #141033 0%, #0A0618 100%)',
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '48px 40px',
          textAlign: 'center',
          background: 'rgba(20, 16, 45, 0.4)',
          border: '1px solid rgba(245, 166, 35, 0.15)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(245, 166, 35, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}
      >
        {/* Animated Icon Container */}
        <div style={{ position: 'relative' }}>
          <div 
            className="pulse-glow" 
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'rgba(245, 166, 35, 0.1)',
              border: '2px solid var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(245, 166, 35, 0.2)'
            }}
          >
            <Clock size={40} color="var(--accent-amber)" />
          </div>
          <div className="float-anim" style={{ position: 'absolute', top: -5, right: -5 }}>
            <Sparkles size={20} color="var(--accent-green)" />
          </div>
        </div>

        {/* Text Details */}
        <div>
          <span 
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--accent-amber)',
              background: 'rgba(245, 166, 35, 0.08)',
              padding: '6px 14px',
              borderRadius: '99px',
              border: '1px solid rgba(245, 166, 35, 0.2)'
            }}
          >
            Coming Soon
          </span>
          <h2 style={{ fontSize: '32px', marginTop: '20px', color: '#FFF', fontFamily: 'Space Grotesk, sans-serif' }}>
            {title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '15px', lineHeight: '24px' }}>
            {description}
          </p>
        </div>

        {/* Interactive Features Mock */}
        <div style={{
          width: '100%',
          borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-green)' }}>✓</span> Isolated, high-performance gameplay module
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-green)' }}>✓</span> Climbing ELO ladder, streaks, and lifelines
          </div>
        </div>

        {/* Back Button */}
        <Link 
          href={backUrl} 
          className="btn btn-secondary" 
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '14px',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <ArrowLeft size={18} />
          Go Back
        </Link>
      </div>
    </div>
  );
}
