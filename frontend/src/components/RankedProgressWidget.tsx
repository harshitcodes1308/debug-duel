'use client';

import React from 'react';
import { Shield, Trophy, Crown, Award, Star } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface RankedProgressWidgetProps {
  rank: string;
  rp: number;
  showDetails?: boolean;
}

export default function RankedProgressWidget({ rank, rp, showDetails = true }: RankedProgressWidgetProps) {
  // Parse rank name, e.g., "Silver II" -> tier: "Silver", division: "II"
  const parts = rank.split(' ');
  const tier = parts[0] || 'Bronze';
  const division = parts[1] || '';

  // Get tier theme (colors, gradients, glows)
  const getTierTheme = (tierName: string) => {
    switch (tierName) {
      case 'Silver':
        return {
          color: '#CBD5E1',
          bg: 'linear-gradient(135deg, #64748B 0%, #1E293B 100%)',
          border: 'rgba(148, 163, 184, 0.3)',
          glow: 'rgba(148, 163, 184, 0.15)',
          icon: Shield
        };
      case 'Gold':
        return {
          color: '#F59E0B',
          bg: 'linear-gradient(135deg, #B45309 0%, #1E1B4B 100%)',
          border: 'rgba(245, 158, 11, 0.4)',
          glow: 'rgba(245, 158, 11, 0.25)',
          icon: Trophy
        };
      case 'Platinum':
        return {
          color: '#10B981',
          bg: 'linear-gradient(135deg, #047857 0%, #064E3B 100%)',
          border: 'rgba(16, 185, 129, 0.4)',
          glow: 'rgba(16, 185, 129, 0.25)',
          icon: Star
        };
      case 'Diamond':
        return {
          color: '#3B82F6',
          bg: 'linear-gradient(135deg, #1D4ED8 0%, #1E1B4B 100%)',
          border: 'rgba(123, 147, 219, 0.4)',
          glow: 'rgba(123, 147, 219, 0.3)',
          icon: Award
        };
      case 'Master':
        return {
          color: '#A855F7',
          bg: 'linear-gradient(135deg, #7E22CE 0%, #2E1065 100%)',
          border: 'rgba(168, 85, 247, 0.5)',
          glow: 'rgba(168, 85, 247, 0.35)',
          icon: Crown
        };
      case 'Grandmaster':
        return {
          color: '#EF4444',
          bg: 'linear-gradient(135deg, #B91C1C 0%, #450A0A 100%)',
          border: 'rgba(239, 68, 68, 0.6)',
          glow: 'rgba(239, 68, 68, 0.45)',
          icon: Crown,
          pulse: true
        };
      case 'Bronze':
      default:
        return {
          color: '#B45309',
          bg: 'linear-gradient(135deg, #78350F 0%, #1E293B 100%)',
          border: 'rgba(180, 83, 9, 0.3)',
          glow: 'rgba(180, 83, 9, 0.15)',
          icon: Shield
        };
    }
  };

  const theme = getTierTheme(tier);
  const IconComponent = theme.icon;

  // Calculate division progress bar percentage
  let progressPercent = 0;
  let progressText = '';

  if (rp >= 2000) {
    // Grandmaster: no cap
    progressPercent = 100;
    progressText = `${rp} RP (Max Rank)`;
  } else if (rp >= 1500) {
    // Master: 1500 - 1999 (500 RP range)
    const pointsInMaster = rp - 1500;
    progressPercent = Math.min(100, Math.round((pointsInMaster / 500) * 100));
    progressText = `${pointsInMaster} / 500 RP to Grandmaster`;
  } else {
    // Bronze to Diamond: divisions every 100 RP
    const pointsInDivision = rp % 100;
    progressPercent = pointsInDivision;
    progressText = `${pointsInDivision} / 100 RP to next rank`;
  }

  return (
    <div style={{
      background: 'rgba(26, 26, 36, 0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '20px 24px',
      fontFamily: 'Inter, sans-serif',
      boxShadow: theme.pulse ? `0 0 20px ${theme.glow}` : 'none',
      animation: theme.pulse ? 'rankedPulse 3s infinite ease-in-out' : 'none'
    }}>
      <style>{`
        @keyframes rankedPulse {
          0%, 100% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 28px rgba(239, 68, 68, 0.45); border-color: rgba(239, 68, 68, 0.75); }
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Tier Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: theme.bg,
          border: `2px solid ${theme.border}`,
          boxShadow: `0 0 16px ${theme.glow}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.color,
          flexShrink: 0
        }}>
          <IconComponent size={32} />
        </div>

        {/* Text Details */}
        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Rank Tier</span>
              <h3 style={{ fontSize: '22px', color: '#fff', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {tier} <span style={{ color: theme.color }}>{division}</span>
              </h3>
            </div>
            {showDetails && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>Rating</span>
                <div style={{ fontSize: '20px', color: theme.color, fontWeight: 'bold', fontFamily: 'Space Grotesk' }}>
                  <AnimatedCounter value={rp} /> <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>RP</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {showDetails && (
            <div>
              <div style={{
                height: '6px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '3px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: theme.bg,
                  borderRadius: '3px',
                  boxShadow: `0 0 8px ${theme.color}`,
                  transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>{progressText}</span>
                {rp < 2000 && <span style={{ color: '#fff', fontWeight: '500' }}>{progressPercent}%</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
