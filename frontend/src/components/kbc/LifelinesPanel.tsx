'use client';

import React, { useState } from 'react';
import { HelpCircle, Users, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export interface LifelineState {
  fiftyFifty: boolean;
  audiencePoll: boolean;
  expertAdvice: boolean;
  skip: boolean;
}

interface LifelinesPanelProps {
  usedLifelines: LifelineState;
  onUseLifeline: (type: keyof LifelineState) => void;
  disabled: boolean;
  correctAnswerIndex: number;
  options: string[];
  explanation: string;
}

export default function LifelinesPanel({
  usedLifelines,
  onUseLifeline,
  disabled,
  correctAnswerIndex,
  options,
  explanation
}: LifelinesPanelProps) {
  const [showPoll, setShowPoll] = useState(false);
  const [showExpert, setShowExpert] = useState(false);
  const [pollData, setPollData] = useState<number[]>([]);
  const [expertMessage, setExpertMessage] = useState('');

  const optionLetters = ['A', 'B', 'C', 'D'];

  const handleUseLifeline = (type: keyof LifelineState) => {
    if (usedLifelines[type] || disabled) return;

    onUseLifeline(type);

    if (type === 'audiencePoll') {
      // Simulate audience poll data
      const data = [0, 0, 0, 0];
      let remaining = 100;

      // Correct answer gets the lion's share
      const correctShare = Math.floor(Math.random() * 25) + 55; // 55% - 80%
      data[correctAnswerIndex] = correctShare;
      remaining -= correctShare;

      // Distribute the remaining among other options
      const incorrectIndices = [0, 1, 2, 3].filter(i => i !== correctAnswerIndex);
      
      const share1 = Math.floor(Math.random() * (remaining - 5));
      data[incorrectIndices[0]] = share1;
      remaining -= share1;

      const share2 = Math.floor(Math.random() * remaining);
      data[incorrectIndices[1]] = share2;
      remaining -= share2;

      data[incorrectIndices[2]] = remaining; // rest to last

      setPollData(data);
      setShowPoll(true);
    } else if (type === 'expertAdvice') {
      // Create expert recommendation text
      const letter = optionLetters[correctAnswerIndex];
      const message = `I've analyzed the stack traces and standard specifications. The correct answer is definitely option ${letter}. ${explanation}`;
      setExpertMessage(message);
      setShowExpert(true);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Lifelines Available
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {/* 50-50 */}
        <button
          onClick={() => handleUseLifeline('fiftyFifty')}
          disabled={usedLifelines.fiftyFifty || disabled}
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 8px',
            fontSize: '12px',
            position: 'relative',
            opacity: usedLifelines.fiftyFifty ? 0.4 : 1,
            cursor: usedLifelines.fiftyFifty ? 'not-allowed' : 'pointer',
            borderColor: usedLifelines.fiftyFifty ? 'transparent' : 'rgba(74, 158, 255, 0.2)',
            background: 'rgba(26, 26, 34, 0.4)',
            height: '80px',
            gap: '6px'
          }}
          title="Eliminate two incorrect options"
        >
          <HelpCircle size={20} color={usedLifelines.fiftyFifty ? 'var(--text-secondary)' : 'var(--accent-blue)'} />
          <span>50 - 50</span>
          {usedLifelines.fiftyFifty && (
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              USED
            </div>
          )}
        </button>

        {/* Audience Poll */}
        <button
          onClick={() => handleUseLifeline('audiencePoll')}
          disabled={usedLifelines.audiencePoll || disabled}
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 8px',
            fontSize: '12px',
            position: 'relative',
            opacity: usedLifelines.audiencePoll ? 0.4 : 1,
            cursor: usedLifelines.audiencePoll ? 'not-allowed' : 'pointer',
            borderColor: usedLifelines.audiencePoll ? 'transparent' : 'rgba(0, 255, 148, 0.2)',
            background: 'rgba(26, 26, 34, 0.4)',
            height: '80px',
            gap: '6px'
          }}
          title="Ask the audience for their opinion"
        >
          <Users size={20} color={usedLifelines.audiencePoll ? 'var(--text-secondary)' : 'var(--accent-green)'} />
          <span>Audience</span>
          {usedLifelines.audiencePoll && (
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              USED
            </div>
          )}
        </button>

        {/* Expert Advice */}
        <button
          onClick={() => handleUseLifeline('expertAdvice')}
          disabled={usedLifelines.expertAdvice || disabled}
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 8px',
            fontSize: '12px',
            position: 'relative',
            opacity: usedLifelines.expertAdvice ? 0.4 : 1,
            cursor: usedLifelines.expertAdvice ? 'not-allowed' : 'pointer',
            borderColor: usedLifelines.expertAdvice ? 'transparent' : 'rgba(139, 92, 246, 0.2)',
            background: 'rgba(26, 26, 34, 0.4)',
            height: '80px',
            gap: '6px'
          }}
          title="Consult with an expert software developer"
        >
          <CheckCircle size={20} color={usedLifelines.expertAdvice ? 'var(--text-secondary)' : 'var(--accent-purple)'} />
          <span>Expert</span>
          {usedLifelines.expertAdvice && (
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              USED
            </div>
          )}
        </button>

        {/* Skip Question */}
        <button
          onClick={() => handleUseLifeline('skip')}
          disabled={usedLifelines.skip || disabled}
          className="btn btn-secondary"
          style={{
            flexDirection: 'column',
            padding: '16px 8px',
            fontSize: '12px',
            position: 'relative',
            opacity: usedLifelines.skip ? 0.4 : 1,
            cursor: usedLifelines.skip ? 'not-allowed' : 'pointer',
            borderColor: usedLifelines.skip ? 'transparent' : 'rgba(245, 166, 35, 0.2)',
            background: 'rgba(26, 26, 34, 0.4)',
            height: '80px',
            gap: '6px'
          }}
          title="Skip to a different question of same difficulty"
        >
          <ArrowRight size={20} color={usedLifelines.skip ? 'var(--text-secondary)' : 'var(--accent-amber)'} />
          <span>Skip</span>
          {usedLifelines.skip && (
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid var(--accent-red)',
              borderRadius: '8px',
              top: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              USED
            </div>
          )}
        </button>
      </div>

      {/* Audience Poll Modal */}
      {showPoll && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            background: '#141030',
            borderColor: 'var(--accent-green)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Users size={32} color="var(--accent-green)" />
              <h2 style={{ fontSize: '22px', marginTop: '12px', color: '#FFF' }}>Audience Poll Results</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                The audience has cast their votes on this question.
              </p>
            </div>

            {/* Chart representation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pollData.map((pct, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      Option {optionLetters[idx]}: <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)' }}>{options[idx].substring(0, 40)}{options[idx].length > 40 ? '...' : ''}</span>
                    </span>
                    <span style={{ color: idx === correctAnswerIndex ? 'var(--accent-green)' : '#FFF', fontWeight: 'bold' }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#0D0D12', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${pct}%`, 
                      height: '100%', 
                      background: idx === correctAnswerIndex ? 'var(--accent-green)' : 'var(--accent-blue)',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', background: 'var(--accent-green)', color: '#000' }}
              onClick={() => setShowPoll(false)}
            >
              Back to Game
            </button>
          </div>
        </div>
      )}

      {/* Expert Advice Modal */}
      {showExpert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            background: '#141030',
            borderColor: 'var(--accent-purple)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '28px',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
              }}>
                👨‍💻
              </div>
              <h2 style={{ fontSize: '22px', color: '#FFF' }}>Expert Developer Advice</h2>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-purple)', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                Senior Dev Consultant
              </span>
            </div>

            {/* Bubble */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '20px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '22px',
              position: 'relative'
            }}>
              {expertMessage}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', background: 'var(--accent-purple)', color: '#FFF', border: 'none' }}
              onClick={() => setShowExpert(false)}
            >
              Thank You, Expert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
