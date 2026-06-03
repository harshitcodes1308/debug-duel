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
    let background = 'rgba(26, 26, 34, 0.4)';
    let color = 'var(--text-primary)';
    let cursor = disabled ? 'not-allowed' : 'pointer';

    if (revealedAnswer) {
      if (isCorrect) {
        border = '1px solid var(--accent-green)';
        background = 'rgba(0, 255, 148, 0.15)';
        color = 'var(--accent-green)';
        cursor = 'default';
      } else if (isLocked && !isCorrect) {
        border = '1px solid var(--accent-red)';
        background = 'rgba(255, 68, 68, 0.15)';
        color = 'var(--accent-red)';
        cursor = 'default';
      } else {
        color = 'rgba(255, 255, 255, 0.2)';
        cursor = 'default';
      }
    } else if (isLocked) {
      border = '1px solid var(--accent-amber)';
      background = 'rgba(245, 166, 35, 0.2)';
      color = 'var(--accent-amber)';
      cursor = 'default';
    } else if (isSelected) {
      border = '1px solid var(--accent-blue)';
      background = 'rgba(74, 158, 255, 0.15)';
      color = '#FFF';
    }

    return {
      display: 'flex',
      alignItems: 'center',
      padding: '18px 24px',
      borderRadius: '8px',
      border,
      background,
      color,
      cursor,
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      textAlign: 'left',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      gap: '12px',
      opacity: isEliminated ? 0 : 1,
      transform: isEliminated ? 'scale(0.92)' : 'scale(1)',
      pointerEvents: isEliminated ? 'none' : undefined,
      animation: revealedAnswer 
        ? (isCorrect ? 'revealCorrect 0.6s ease forwards' : 'none')
        : (isLocked ? 'pulseGlow 1.5s infinite ease-in-out' : 'fadeInUp 0.6s ease forwards'),
      animationDelay: revealedAnswer ? '0s' : `${idx * 0.15}s`
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
            box-shadow: 0 0 5px rgba(245, 166, 35, 0.3), inset 0 0 5px rgba(245, 166, 35, 0.1);
            border-color: rgba(245, 166, 35, 0.4);
          }
          50% {
            box-shadow: 0 0 25px rgba(245, 166, 35, 0.7), inset 0 0 12px rgba(245, 166, 35, 0.3);
            border-color: rgba(245, 166, 35, 1);
          }
          100% {
            box-shadow: 0 0 5px rgba(245, 166, 35, 0.3), inset 0 0 5px rgba(245, 166, 35, 0.1);
            border-color: rgba(245, 166, 35, 0.4);
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
        className="glass-panel" 
        style={{
          background: 'rgba(20, 16, 40, 0.6)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 0 15px rgba(255,255,255,0.02)',
          padding: '36px',
          textAlign: 'center',
          position: 'relative',
          animation: 'textReveal 0.8s ease-out'
        }}
      >
        <span style={{
          position: 'absolute',
          top: '12px',
          left: '20px',
          fontSize: '11px',
          color: 'var(--accent-blue)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 'bold'
        }}>
          {question.category} • {question.difficulty}
        </span>
        <h2 style={{ 
          fontSize: '20px', 
          lineHeight: '30px', 
          color: '#FFF', 
          fontFamily: 'Space Grotesk, sans-serif',
          marginTop: '8px'
        }}>
          {question.question}
        </h2>
      </div>

      {/* Grid options A, B, C, D */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {question.options.map((opt, idx) => (
          <button
            key={`${question.id}-${idx}`}
            onClick={() => handleOptionClick(idx)}
            style={getOptionStyle(idx)}
            disabled={disabled || lockedOptionIndex !== null || revealedAnswer || eliminatedOptionIndices.includes(idx)}
            onMouseEnter={(e) => {
              if (disabled || lockedOptionIndex !== null || revealedAnswer || selectedOptionIndex === idx) return;
              e.currentTarget.style.borderColor = 'rgba(74, 158, 255, 0.5)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(74, 158, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              if (disabled || lockedOptionIndex !== null || revealedAnswer || selectedOptionIndex === idx) return;
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'rgba(26, 26, 34, 0.4)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ 
              fontWeight: 'bold', 
              color: selectedOptionIndex === idx || lockedOptionIndex === idx ? 'inherit' : 'var(--accent-amber)',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '16px'
            }}>
              {optionLetters[idx]}
            </span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {/* Action lock button */}
      {selectedOptionIndex !== null && lockedOptionIndex === null && !revealedAnswer && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <button 
            className="btn btn-success" 
            style={{
              padding: '14px 48px',
              fontSize: '15px',
              background: 'var(--accent-amber)',
              color: '#000',
              fontWeight: 'bold',
              gap: '10px',
              boxShadow: '0 0 20px rgba(245, 166, 35, 0.3)',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center'
            }}
            onClick={onLockOption}
          >
            <Lock size={16} />
            Lock Option {optionLetters[selectedOptionIndex]}
          </button>
        </div>
      )}
    </div>
  );
}
