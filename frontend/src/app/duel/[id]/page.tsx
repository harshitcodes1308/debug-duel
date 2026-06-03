'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore, DuelState } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { 
  Timer, Flame, Award, Swords, HelpCircle, 
  Send, AlertTriangle, Play, Sparkles, CheckCircle2 
} from 'lucide-react';

export default function DuelArena() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const { 
    user, setUser, currentDuel, setCurrentDuel, 
    secondsLeft, setSecondsLeft, tickTimer, 
    fomoMessage, setFomo, opponentProgress,
    opponentSubmitted, setOpponentSubmitted
  } = useStore();

  const [code, setCode] = useState<string>('');
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [loading, setLoading] = useState(true);
  const [judgingCode, setJudgingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  
  // Explanation Modal State
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submittingExplanation, setSubmittingExplanation] = useState(false);

  // Hint State
  const [showHint, setShowHint] = useState(false);
  const [hintCostDeducted, setHintCostDeducted] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // 1. Initial Load & Sync
  useEffect(() => {
    async function loadDuel() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data: DuelState = await res.json();
        setCurrentDuel(data);
        if (data.bug) {
          setCode(data.bug.brokenCode);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        router.push('/');
      }
    }

    if (!currentDuel) {
      loadDuel();
    } else {
      if (currentDuel.bug) {
        setCode(currentDuel.bug.brokenCode);
      }
      setLoading(false);
    }
  }, [duelId]);

  // 2. Timer Tick Loop
  useEffect(() => {
    if (loading || !currentDuel || currentDuel.status !== 'active') return;
    
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, currentDuel]);

  // 3. Auto forfeit if timer runs out
  useEffect(() => {
    if (secondsLeft === 0 && currentDuel?.status === 'active') {
      handleForfeit();
    }
  }, [secondsLeft]);

  // 4. Socket Connection inside Arena
  useEffect(() => {
    if (!user || !duelId || loading) return;

    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('join_duel', { duelId, userId: user.id });

    // FOMO updates
    socket.on('fomo_update', ({ message, opponentProgress: progress }) => {
      setFomo(message, progress);
    });

    // Opponent submitted alert
    socket.on('opponent_submitted', () => {
      setOpponentSubmitted(true);
      setFomo("Your opponent submitted a fix! They are writing their explanation! HURRY!", 95);
    });

    // Opponent forfeited
    socket.on('opponent_forfeited', ({ winnerId, eloChanges, tokenChanges }) => {
      alert("Your opponent has forfeited! You win!");
      if (user && tokenChanges[user.id]) {
        setUser({
          ...user,
          tokens: user.tokens + tokenChanges[user.id]
        });
      }
      router.push(`/duel/${duelId}/result`);
    });

    // Final result broadcast
    socket.on('duel_result', () => {
      router.push(`/duel/${duelId}/result`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, duelId, loading]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  // Submit Code Fix
  const handleSubmitCode = () => {
    if (!socketRef.current || judgingCode) return;
    setJudgingCode(true);
    setCodeError('');

    socketRef.current.emit('submit_code', {
      duelId,
      userId: user?.id,
      code
    });

    // Listener for response
    socketRef.current.once('code_judged', (result) => {
      setJudgingCode(false);
      if (result.passed) {
        setShowExplanationModal(true);
      } else {
        setCodeError(result.reason || "Your solution did not fix the bug. Try again!");
      }
    });
  };

  // Submit Explanation
  const handleExplanationSubmit = () => {
    if (!socketRef.current || submittingExplanation || !explanation.trim()) return;
    setSubmittingExplanation(true);

    socketRef.current.emit('submit_explanation', {
      duelId,
      userId: user?.id,
      explanation
    });
  };

  // Forfeit
  const handleForfeit = () => {
    const confirmForfeit = window.confirm(
      `Are you sure you want to forfeit? You will lose your bet of ${currentDuel?.betAmount || 50} tokens.`
    );
    if (!confirmForfeit) return;

    if (socketRef.current) {
      socketRef.current.emit('forfeit', {
        duelId,
        userId: user?.id
      });
    }
    router.push(`/duel/${duelId}/result`);
  };

  // Get Hint
  const handleGetHint = () => {
    if (!user || !currentDuel) return;
    if (user.tokens < 15) {
      alert("Insufficient tokens! Hints cost 15 tokens.");
      return;
    }
    const confirmHint = window.confirm("Reveal hint? This will cost 15 tokens.");
    if (!confirmHint) return;

    setUser({
      ...user,
      tokens: user.tokens - 15
    });
    setHintCostDeducted(true);
    setShowHint(true);
  };

  // Format Time (seconds to mm:ss)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading || !currentDuel) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D12',
        color: '#8888A0'
      }}>
        <h2>Entering Battle Arena...</h2>
      </div>
    );
  }

  const opponent = currentDuel.participants.find(p => p.userId !== user?.id)?.user || { username: 'Opponent' };

  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'grid',
      gridTemplateRows: '50px 1fr 64px',
      backgroundColor: '#0D0D12',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* 1. TOP STATS BAR */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Swords size={16} color="var(--accent-blue)" />
          <span>Arena Duel: <span style={{ color: 'var(--accent-blue)' }}>{currentDuel.bug?.title}</span></span>
        </div>

        <div className="flex-center" style={{
          gap: '8px',
          color: secondsLeft < 30 ? 'var(--accent-red)' : secondsLeft < 60 ? 'var(--accent-amber)' : 'var(--text-primary)',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          <Timer size={18} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatTime(secondsLeft)}</span>
        </div>

        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Bet: </span>
          <strong style={{ color: 'var(--accent-amber)' }}>{currentDuel.betAmount} Tokens</strong>
        </div>
      </div>

      {/* 2. BODY GRID: EDITOR (LEFT) & FOMO PANEL (RIGHT) */}
      <div className="duel-page-grid">
        
        {/* Monaco Editor Container */}
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {codeError && (
            <div style={{
              background: 'rgba(255, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(255, 68, 68, 0.2)',
              padding: '10px 24px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={14} /> {codeError}
            </div>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            <Editor
              height="100%"
              language={currentDuel.language}
              theme={editorTheme}
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                lineHeight: 22,
                minimap: { enabled: false },
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                snippetSuggestions: "none",
                wordBasedSuggestions: "off",
                tabSize: 2,
                automaticLayout: true
              }}
            />
          </div>
        </div>

        {/* Right Sidebar: FOMO signals */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflowY: 'auto'
        }}>
          
          {/* Rival block */}
          <div>
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Rival State</h3>
            <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.01)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>@{opponent?.username || 'Opponent'}</span>
                {opponentSubmitted && <span className="badge badge-js" style={{ fontSize: '9px', background: 'rgba(0, 255, 148, 0.1)', color: 'var(--accent-green)', borderColor: 'rgba(0, 255, 148, 0.2)' }}>SUBMITTED</span>}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Progress estimation</span>
                  <span style={{ fontWeight: 'bold' }}>{opponentProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${opponentProgress}%`,
                    height: '100%',
                    background: opponentSubmitted ? 'var(--accent-green)' : 'linear-gradient(to right, var(--accent-purple), var(--accent-red))',
                    borderRadius: '3px',
                    transition: 'width 0.8s ease-in-out'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* FOMO Signal Ticker */}
          <div>
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>FOMO Signals</h3>
            <div className="pulse-glow" style={{
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              color: 'var(--accent-purple)',
              fontWeight: '500',
              lineHeight: 1.5,
              minHeight: '70px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {fomoMessage}
            </div>
          </div>

          {/* Hints Section */}
          <div style={{ marginTop: 'auto' }}>
            {showHint ? (
              <div className="glass-panel" style={{ padding: '14px', background: 'rgba(245, 166, 35, 0.05)', borderColor: 'rgba(245, 166, 35, 0.2)', fontSize: '12px', lineHeight: '18px' }}>
                <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '4px' }}>HINT REVEALED:</strong>
                Category is <strong>{currentDuel.bug?.category}</strong>. Analyze the code syntax around data validation or structure checks.
              </div>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '13px', borderStyle: 'dashed', gap: '4px' }}
                onClick={handleGetHint}
              >
                <HelpCircle size={14} /> Buy Hint (-15 tokens)
              </button>
            )}
          </div>

        </div>

      </div>

      {/* 3. BOTTOM BUTTONS BAR */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
        zIndex: 10
      }}>
        <button 
          onClick={handleForfeit} 
          className="btn btn-danger"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Forfeit Match 🏳️
        </button>

        <button 
          onClick={handleSubmitCode} 
          className="btn btn-success"
          style={{ padding: '10px 28px', fontSize: '15px', color: 'black', gap: '8px' }}
          disabled={judgingCode}
        >
          <Play size={16} fill="black" /> 
          {judgingCode ? "Judging solution..." : "SUBMIT FIX"}
        </button>
      </div>

      {/* 4. EXPLANATION MODAL (ON CODE PASS) */}
      {showExplanationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(13, 13, 18, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div className="flex-center" style={{ gap: '8px', color: 'var(--accent-green)', marginBottom: '8px' }}>
                <CheckCircle2 size={28} />
                <h2 style={{ fontSize: '24px', color: '#fff' }}>Code Passed!</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Your fix is correct! To lock in your victory, explain the bug.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                EXPLAIN THE BUG (1-2 SENTENCES)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="What was the root cause? Why did it break, and how does your fix resolve it?"
                style={{
                  height: '120px',
                  background: '#0D0D12',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                AI judge scores explanation quality (0-20 points) for bonus tokens.
              </span>
            </div>

            <button
              onClick={handleExplanationSubmit}
              className="btn btn-success"
              style={{ width: '100%', height: '48px', color: 'black', gap: '8px' }}
              disabled={submittingExplanation || !explanation.trim()}
            >
              <Send size={14} />
              {submittingExplanation ? "Scoring explanation..." : "SUBMIT & CLAIM WIN"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
