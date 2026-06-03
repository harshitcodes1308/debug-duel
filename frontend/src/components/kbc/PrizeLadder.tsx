'use client';

import React, { useEffect, useRef } from 'react';

export interface LadderStep {
  level: number;
  xp: number;
  isMilestone: boolean;
}

export const PRIZE_LADDER: LadderStep[] = [
  { level: 15, xp: 1000000, isMilestone: true },
  { level: 14, xp: 500000, isMilestone: false },
  { level: 13, xp: 250000, isMilestone: false },
  { level: 12, xp: 125000, isMilestone: false },
  { level: 11, xp: 64000, isMilestone: false },
  { level: 10, xp: 32000, isMilestone: true },
  { level: 9, xp: 16000, isMilestone: false },
  { level: 8, xp: 8000, isMilestone: false },
  { level: 7, xp: 4000, isMilestone: false },
  { level: 6, xp: 2000, isMilestone: false },
  { level: 5, xp: 1000, isMilestone: true },
  { level: 4, xp: 500, isMilestone: false },
  { level: 3, xp: 300, isMilestone: false },
  { level: 2, xp: 200, isMilestone: false },
  { level: 1, xp: 100, isMilestone: false }
];

interface PrizeLadderProps {
  currentStepIndex: number; // 0 to 14
}

export default function PrizeLadder({ currentStepIndex }: PrizeLadderProps) {
  const activeLevelNumber = currentStepIndex + 1;
  const activeStepRef = useRef<HTMLDivElement | null>(null);

  // Centering scroll after level transitions
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentStepIndex]);

  return (
    <div className="card-base" style={{
      width: '100%',
      background: 'var(--bg-secondary)',
      borderColor: 'var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <style>{`
        @keyframes activePulse {
          0% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 16px rgba(245, 158, 11, 0.5); border-color: rgba(245, 158, 11, 0.8); }
          100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.4); }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
          XP Prize Ladder
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '12px' }}>
          <span>Level {activeLevelNumber}/15</span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>
            {PRIZE_LADDER.find(s => s.level === activeLevelNumber)?.xp.toLocaleString() || 0} XP
          </span>
        </div>
      </div>

      {/* Ladder container */}
      <div className="ladder-steps" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: '380px',
        overflowY: 'auto',
        paddingRight: '4px',
        scrollBehavior: 'smooth'
      }}>
        {PRIZE_LADDER.map((step) => {
          const isActive = step.level === activeLevelNumber;
          const isCleared = step.level < activeLevelNumber;

          // Color themes based on milestones or active state
          let textColor = 'var(--text-secondary)';
          let bgColor = 'rgba(255, 255, 255, 0.01)';
          let borderStyle = '1px solid rgba(255, 255, 255, 0.03)';

          if (isActive) {
            textColor = '#FFFFFF';
            bgColor = 'var(--accent-amber)';
            borderStyle = '1px solid var(--accent-amber)';
          } else if (step.isMilestone) {
            textColor = 'var(--accent-amber)';
            borderStyle = '1px solid rgba(245, 158, 11, 0.35)';
            bgColor = 'rgba(245, 158, 11, 0.05)';
          } else if (isCleared) {
            textColor = 'rgba(255, 255, 255, 0.2)';
          } else {
            textColor = 'var(--text-primary)';
          }

          return (
            <div 
              key={step.level} 
              ref={isActive ? activeStepRef : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: bgColor,
                border: borderStyle,
                color: textColor,
                fontSize: '12px',
                fontWeight: step.isMilestone || isActive ? 600 : 400,
                opacity: isCleared ? 0.4 : 1,
                boxShadow: step.isMilestone && !isCleared && !isActive ? '0 0 12px rgba(245, 158, 11, 0.08), inset 0 0 8px rgba(245, 158, 11, 0.03)' : 'none',
                animation: isActive ? 'activePulse 2s infinite ease-in-out' : 'none',
                transition: 'var(--transition)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  opacity: isActive ? 0.8 : 0.4,
                  minWidth: '20px'
                }}>
                  {step.level.toString().padStart(2, '0')}
                </span>
                <span>{step.isMilestone ? '💎 Safety Milestone' : 'Question'}</span>
              </div>
              <span style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px'
              }}>
                {step.xp.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ 
        marginTop: 'var(--space-2)', 
        fontSize: '11px', 
        color: 'var(--text-secondary)', 
        borderTop: '1px dashed var(--border)',
        paddingTop: 'var(--space-3)',
        lineHeight: '16px'
      }}>
        Milestone levels (05 & 10) act as safety guarantees. Once crossed, your XP cannot fall below them.
      </div>
    </div>
  );
}
