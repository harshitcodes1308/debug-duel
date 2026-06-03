'use client';

import React from 'react';

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
  // Translate currentStepIndex (0-14, where 0 is Q1/Level 1) to match PRIZE_LADDER index (0 is Level 15)
  const activeLevelNumber = currentStepIndex + 1;

  return (
    <div className="glass-panel" style={{
      width: '100%',
      background: 'rgba(13, 9, 36, 0.5)',
      borderColor: 'rgba(245, 166, 35, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          XP Prize Ladder
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px' }}>
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
        maxHeight: '420px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {PRIZE_LADDER.map((step) => {
          const isActive = step.level === activeLevelNumber;
          const isCleared = step.level < activeLevelNumber;

          // Color themes based on milestones or active state
          let textColor = 'var(--text-secondary)';
          let bgColor = 'transparent';
          let borderStyle = '1px solid transparent';

          if (isActive) {
            textColor = '#000';
            bgColor = 'var(--accent-amber)';
            borderStyle = '1px solid var(--accent-amber)';
          } else if (step.isMilestone) {
            textColor = 'var(--accent-amber)';
          } else if (isCleared) {
            textColor = 'rgba(255, 255, 255, 0.4)';
          } else {
            textColor = 'var(--text-primary)';
          }

          return (
            <div 
              key={step.level} 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                background: bgColor,
                border: borderStyle,
                color: textColor,
                fontSize: '13px',
                fontWeight: step.isMilestone || isActive ? 'bold' : 'normal',
                opacity: isCleared ? 0.6 : 1,
                boxShadow: isActive ? '0 0 15px rgba(245, 166, 35, 0.4)' : 'none',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  opacity: isActive ? 0.8 : 0.5,
                  minWidth: '20px'
                }}>
                  {step.level.toString().padStart(2, '0')}
                </span>
                <span>{step.isMilestone ? '💎 Milestone' : 'Question'}</span>
              </div>
              <span style={{ 
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px'
              }}>
                {step.xp.toLocaleString()} XP
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ 
        marginTop: '8px', 
        fontSize: '11px', 
        color: 'var(--text-secondary)', 
        borderTop: '1px dashed rgba(255,255,255,0.06)',
        paddingTop: '10px',
        lineHeight: '16px'
      }}>
        Milestone levels (05 & 10) act as safety guarantees. Once crossed, your XP cannot fall below them.
      </div>
    </div>
  );
}
