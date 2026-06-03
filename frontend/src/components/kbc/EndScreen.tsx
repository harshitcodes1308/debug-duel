'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { Trophy, ShieldAlert, RotateCcw, Home, BookOpen, AlertCircle, Sparkles, Clock, Percent, ShieldCheck } from 'lucide-react';
import { KbcAudio } from '@/utils/kbc/audio';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

interface EndScreenProps {
  status: 'win' | 'lost' | 'timeout';
  questionsCleared: number;
  failedQuestion: Question | null;
  userAnswerIndex: number | null;
  onReset: () => void;
  // Persistent backend stats
  accuracy?: number;
  fastestAnswerTime?: number;
  lifelinesUsedCount?: number;
  tokensEarned?: number;
}

export default function EndScreen({
  status,
  questionsCleared,
  failedQuestion,
  userAnswerIndex,
  onReset,
  accuracy = 0,
  fastestAnswerTime = 0,
  lifelinesUsedCount = 0,
  tokensEarned = 0
}: EndScreenProps) {
  
  // Safety Milestone XP calculation
  const calculateFinalXp = (): number => {
    if (status === 'win') return 1000000;
    if (questionsCleared >= 10) return 32000; 
    if (questionsCleared >= 5) return 1000;   
    return 0;
  };

  const finalXp = calculateFinalXp();
  const optionLetters = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    if (status === 'win') {
      // Trigger game win fanfare sound
      KbcAudio.playWin();

      // Trigger fireworks confetti
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    } else {
      // Trigger game over sound
      KbcAudio.playGameOver();
    }
  }, [status]);

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'radial-gradient(circle at center, #0F092B 0%, #06030F 100%)'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '680px',
          padding: '48px 40px',
          textAlign: 'center',
          background: 'rgba(20, 16, 45, 0.55)',
          borderColor: status === 'win' ? 'var(--accent-amber)' : 'rgba(255,255,255,0.08)',
          boxShadow: status === 'win' 
            ? '0 20px 50px rgba(245, 166, 35, 0.15), inset 0 0 30px rgba(245, 166, 35, 0.05)' 
            : '0 12px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          borderRadius: '12px'
        }}
      >
        {/* Banner Graphics */}
        {status === 'win' ? (
          <div>
            <div className="float-anim" style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'rgba(245, 166, 35, 0.1)',
              border: '2px solid var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(245, 166, 35, 0.3)'
            }}>
              <Trophy size={48} color="var(--accent-amber)" />
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent-amber)',
              background: 'rgba(245, 166, 35, 0.08)',
              padding: '6px 16px',
              borderRadius: '99px',
              border: '1px solid rgba(245, 166, 35, 0.2)'
            }}>
              Master Developer
            </span>
            <h1 style={{ fontSize: '38px', marginTop: '20px', color: '#FFF', fontFamily: 'Space Grotesk, sans-serif' }}>
              Congratulations!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '8px' }}>
              You answered all 15 questions correctly and conquered the Code KBC ladder!
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '2px solid var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 30px rgba(255, 68, 68, 0.2)'
            }}>
              <ShieldAlert size={48} color="var(--accent-red)" />
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent-red)',
              background: 'rgba(255, 68, 68, 0.08)',
              padding: '6px 16px',
              borderRadius: '99px',
              border: '1px solid rgba(255, 68, 68, 0.2)'
            }}>
              {status === 'timeout' ? 'Time Expired' : 'Game Over'}
            </span>
            <h1 style={{ fontSize: '38px', marginTop: '20px', color: '#FFF', fontFamily: 'Space Grotesk, sans-serif' }}>
              {status === 'timeout' ? 'Out of Time!' : 'Incorrect Answer!'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '8px' }}>
              {status === 'timeout' 
                ? 'Your 30-second timer ticked down before option confirmation.' 
                : 'That choice was incorrect. The game show run has finished.'}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          width: '100%',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px 0',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Space Grotesk, sans-serif' }}>
              {finalXp.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              XP EARNED
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFF', fontFamily: 'Space Grotesk, sans-serif' }}>
              {questionsCleared} / 15
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              LEVELS CLEARED
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              +{tokensEarned} 🪙
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              TOKENS REWARD
            </div>
          </div>

          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: 'Space Grotesk, sans-serif' }}>
              {accuracy}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              ACCURACY
            </div>
          </div>
        </div>

        {/* Extended Stats Panel */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          width: '100%',
          gap: '12px',
          marginTop: '-12px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <Clock size={20} color="var(--accent-blue)" />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fastest Answer</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFF' }}>
                {fastestAnswerTime > 0 ? `${fastestAnswerTime}s` : 'N/A'}
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <ShieldCheck size={20} color="var(--accent-purple)" />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lifelines Used</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFF' }}>
                {lifelinesUsedCount} / 4
              </div>
            </div>
          </div>
        </div>

        {/* Failed Question Detail Panel */}
        {status !== 'win' && failedQuestion && (
          <div style={{
            width: '100%',
            background: 'rgba(26, 26, 34, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertCircle size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                Review Question
              </span>
            </div>
            <p style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold', lineHeight: '22px' }}>
              {failedQuestion.question}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', fontSize: '13px' }}>
              {userAnswerIndex !== null && (
                <div style={{ color: 'var(--accent-red)' }}>
                  Your Choice: <strong>Option {optionLetters[userAnswerIndex]}</strong> ({failedQuestion.options[userAnswerIndex]})
                </div>
              )}
              <div style={{ color: 'var(--accent-green)' }}>
                Correct Answer: <strong>Option {optionLetters[failedQuestion.correctAnswer]}</strong> ({failedQuestion.options[failedQuestion.correctAnswer]})
              </div>
              <div style={{ 
                marginTop: '12px', 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                lineHeight: '18px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '10px'
              }}>
                <strong>Explanation:</strong> {failedQuestion.explanation}
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: '12px'
        }}>
          <button 
            onClick={onReset}
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              background: status === 'win' ? 'var(--accent-green)' : 'var(--accent-blue)', 
              color: status === 'win' ? '#000' : '#FFF',
              border: 'none',
              padding: '16px',
              fontWeight: 'bold',
              gap: '10px',
              fontSize: '16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCcw size={18} />
            {status === 'win' ? 'Play Again' : 'Try Again'}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Link 
              href="/kbc/categories" 
              className="btn btn-secondary"
              style={{ padding: '14px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BookOpen size={16} />
              Categories
            </Link>
            <Link 
              href="/" 
              className="btn btn-secondary"
              style={{ padding: '14px', fontSize: '14px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Home size={16} />
              Home Dashboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
