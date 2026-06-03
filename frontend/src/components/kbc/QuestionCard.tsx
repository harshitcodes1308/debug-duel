'use client';

import React from 'react';
import { Lock } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  explanation: string;
}

interface QuestionCardProps {
  question: Question;
  selectedOptionIndex: null | number;
  lockedOptionIndex: null | number;
  revealedAnswer: boolean;
  eliminatedOptionIndices: number[];
  onSelectOption: (index: number) => void;
  onLockOption: () => void;
  disabled: boolean;
}

export default function QuestionCard({
  question,
  selectedOptionIndex,
  lockedOptionIndex,
  revealedAnswer,
  eliminatedOptionIndices,
  onSelectOption,
  onLockOption,
  disabled
}: QuestionCardProps) {
  const optionLetters = ['A', 'B', 'C', 'D'];

  const getOptionStyle = (idx: number): React.CSSProperties => {
    const isEliminated = eliminatedOptionIndices.includes(idx);
    const isSelected = selectedOptionIndex === idx;
    const isLocked = lockedOptionIndex === idx;
    const isCorrect = question.correctAnswer === idx;

    // Base Styles
    let border = '1px solid var(--border)';
    let background = 'rgba(255, 255, 255, 0.01)';
    let color = 'var(--text-primary)';
    let cursor = disabled ? 'not-allowed' : 'pointer';

    if (revealedAnswer) {
      if (isCorrect) {
        border = '1px solid var(--accent-green)';
        background = 'rgba(16, 185, 129, 0.08)';
        color = 'var(--accent-green)';
        cursor = 'default';
      } else if (isLocked && !isCorrect) {
        border = '1px solid var(--accent-red)';
        background = 'rgba(239, 68, 68, 0.08)';
        color = 'var(--accent-red)';
        cursor = 'default';
      } else {
        color = 'var(--text-secondary)';
        background = 'rgba(255, 255, 255, 0.005)';
        cursor = 'default';
      }
    } else if (isLocked) {
      border = '1px solid var(--accent-purple)';
      background = 'rgba(139, 92, 246, 0.15)';
      color = 'var(--accent-purple)';
      cursor = 'default';
    } else if (isSelected) {
      border = '1px solid var(--accent-purple)';
      background = 'rgba(139, 92, 246, 0.08)';
      color = '#FFF';
    }

    return {
      display: 'flex',
      alignItems: 'center',
      padding: 'var(--space-4) var(--space-5)',
      borderRadius: 'var(--radius-md)',
      border,
      background,
      color,
      cursor,
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      textAlign: 'left',
      transition: 'var(--transition)',
      position: 'relative',
      gap: 'var(--space-3)',
      opacity: isEliminated ? 0 : 1,
      transform: isEliminated ? 'scale(0.92)' : 'scale(1)',
      pointerEvents: isEliminated ? 'none' : undefined,
      animation: revealedAnswer 
        ? (isCorrect ? 'revealCorrect 0.6s ease forwards' : 'none')
        : (isLocked ? 'pulseGlow 1.5s infinite ease-in-out' : 'fadeInUp 0.6s ease forwards'),
      animationDelay: revealedAnswer ? '0s' : `${idx * 0.1}s`
    };
  };

  const handleOptionClick = (idx: number) => {
    if (disabled || lockedOptionIndex !== null || revealedAnswer || eliminatedOptionIndices.includes(idx)) return;
    onSelectOption(idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), inset 0 0 5px rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 25px rgba(139, 92, 246, 0.7), inset 0 0 12px rgba(139, 92, 246, 0.3);
            border-color: rgba(139, 92, 246, 1);
          }
          100% {
            box-shadow: 0 0 5px rgba(139, 92, 246, 0.3), inset 0 0 5px rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.4);
          }
        }
        @keyframes revealCorrect {
          0% { background: rgba(26, 26, 34, 0.4); border-color: var(--border); }
          50% { background: rgba(0, 255, 148, 0.35); border-color: var(--accent-green); box-shadow: 0 0 20px rgba(0, 255, 148, 0.4); }
          100% { background: rgba(0, 255, 148, 0.15); border-color: var(--accent-green); }
        }
        @keyframes textReveal {
          from { opacity: 0; filter: blur(4px); }
          to { opacity: 1; filter: blur(0); }
        }
      `}</style>

      {/* Question statement frame */}
      <div 
        className="card-base" 
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-md)',
          padding: 'var(--space-8)',
          textAlign: 'center',
          position: 'relative',
          animation: 'textReveal 0.8s ease-out'
        }}
      >
        <span style={{
          position: 'absolute',
          top: '12px',
          left: '20px',
          fontSize: '10px',
          color: 'var(--accent-purple)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700
        }}>
          {question.category} • {question.difficulty}
        </span>
        <h2 style={{ 
          fontSize: '18px', 
          lineHeight: '28px', 
          color: '#FFF', 
          fontFamily: 'Space Grotesk, sans-serif',
          marginTop: '8px'
        }}>
          {question.question}
        </h2>
      </div>

      {/* Grid options A, B, C, D */}
      <div className="kbc-options-grid">
        {question.options.map((opt, idx) => (
          <button
            key={`${question.id}-${idx}`}
            onClick={() => handleOptionClick(idx)}
            style={getOptionStyle(idx)}
            disabled={disabled || lockedOptionIndex !== null || revealedAnswer || eliminatedOptionIndices.includes(idx)}
            onMouseEnter={(e) => {
              if (disabled || lockedOptionIndex !== null || revealedAnswer || selectedOptionIndex === idx) return;
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              if (disabled || lockedOptionIndex !== null || revealedAnswer || selectedOptionIndex === idx) return;
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ 
              fontWeight: 700, 
              color: selectedOptionIndex === idx || lockedOptionIndex === idx ? 'inherit' : 'var(--accent-purple)',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '15px'
            }}>
              {optionLetters[idx]}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {/* Action lock button */}
      {selectedOptionIndex !== null && lockedOptionIndex === null && !revealedAnswer && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
          <button 
            className="btn interactive-lift" 
            style={{
              padding: '12px 36px',
              fontSize: '14px',
              background: 'var(--accent-purple)',
              borderColor: 'rgba(139, 92, 246, 0.4)',
              color: '#FFFFFF',
              fontWeight: 700,
              gap: 'var(--space-2)',
              boxShadow: 'var(--shadow-md)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={onLockOption}
          >
            <Lock size={15} />
            Lock Option {optionLetters[selectedOptionIndex]}
          </button>
        </div>
      )}

      {/* Locked Suspense Banner */}
      {lockedOptionIndex !== null && !revealedAnswer && (
        <div 
          className="slide-up-anim"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px dashed rgba(139, 92, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px var(--space-4)',
            color: 'var(--accent-purple)',
            fontSize: '13px',
            fontWeight: '600',
            marginTop: '8px'
          }}
        >
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-purple)',
            display: 'inline-block'
          }} className="pulse-glow" />
          <span>Lock Confirmed. Processing answer...</span>
        </div>
      )}
    </div>
  );
}
