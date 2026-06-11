'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore, DuelState } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { 
  Timer, Flame, Award, Swords, HelpCircle, 
  Send, AlertTriangle, Play, Sparkles, CheckCircle2, Flag
} from 'lucide-react';
import { KbcAudio } from '@/utils/kbc/audio';

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
  const [opponentOffline, setOpponentOffline] = useState(false);
  
  // Explanation Modal State
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submittingExplanation, setSubmittingExplanation] = useState(false);

  // Hint State
  const [showHint, setShowHint] = useState(false);
  const [hintCostDeducted, setHintCostDeducted] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Sound effects & tension ticking
  useEffect(() => {
    KbcAudio.playReveal();
    return () => {
      KbcAudio.stopSuspense();
    };
  }, []);

  useEffect(() => {
    if (loading || !currentDuel || currentDuel.status !== 'active' || showExplanationModal || judgingCode) {
      KbcAudio.stopSuspense();
      return;
    }
    if (secondsLeft <= 30 && secondsLeft > 0) {
      KbcAudio.startSuspense(true);
    } else {
      KbcAudio.stopSuspense();
    }
    return () => {
      KbcAudio.stopSuspense();
    };
  }, [secondsLeft, currentDuel?.status, loading, showExplanationModal, judgingCode]);

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

    if (!currentDuel || !currentDuel.participants || currentDuel.participants.length < 2) {
      loadDuel();
    } else {
      if (currentDuel.bug) {
        setCode(currentDuel.bug.brokenCode);
      }
      setLoading(false);
    }
  }, [duelId, currentDuel]);

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
      if (socketRef.current) {
        socketRef.current.emit('match_timeout', { duelId });
      }
    }
  }, [secondsLeft, currentDuel?.status, duelId]);

  // 4. Socket Connection inside Arena
  useEffect(() => {
    if (!user || !duelId || loading) return;

    const socket = io('http://localhost:5001', { forceNew: true });
    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit('join_duel', { duelId, userId: user.id });
      socket.emit('register_user', { userId: user.id });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on('connect', handleConnect);

    // FOMO updates
    socket.on('fomo_update', ({ message, opponentProgress: progress }) => {
      setFomo(message, progress);
    });

    // Opponent submitted alert
    socket.on('opponent_submitted', () => {
      setOpponentSubmitted(true);
      setFomo("Your opponent submitted a fix! They are writing their explanation! HURRY!", 95);
      KbcAudio.playReveal(); // Alert sound indicating opponent has submitted
    });

    // Opponent forfeited
    socket.on('opponent_forfeited', (payload) => {
      KbcAudio.playWin(); // Win fanfare
      alert("Your opponent has forfeited! You win!");
      if (user && payload.tokenChanges?.[user.id]) {
        setUser({
          ...user,
          tokens: user.tokens + payload.tokenChanges[user.id]
        });
      }
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Final result broadcast
    socket.on('duel_result', (payload) => {
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Opponent online/offline state sync
    socket.on('opponent_offline', ({ userId, offline }) => {
      if (userId !== user?.id) {
        setOpponentOffline(offline);
      }
    });

    // Match timed out (double defeat)
    socket.on('match_timed_out', (payload) => {
      KbcAudio.playWrong(); // error buzzer sound
      alert("Time expired! Both players failed to resolve the bug in time and suffered ELO/Token deductions.");
      if (user && payload.tokenChanges?.[user.id]) {
        setUser({
          ...user,
          tokens: Math.max(0, user.tokens + payload.tokenChanges[user.id])
        });
      }
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Error handling to prevent getting stuck
    socket.on('error_message', ({ message }) => {
      alert(message);
      setSubmittingExplanation(false);
    });

    socket.on('disconnect', (reason) => {
      console.warn("Socket disconnected:", reason);
      setSubmittingExplanation(false);
    });

    socket.on('connect_error', (error) => {
      console.error("Socket connection error:", error);
      setSubmittingExplanation(false);
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
    setCodeError('');
    KbcAudio.playSelect(); // Play selection chime indicating modal is opening
    setShowExplanationModal(true);
  };

  // Submit Explanation (Triggers sequential code verification & win submission)
  const handleExplanationSubmit = () => {
    if (!socketRef.current || submittingExplanation || !explanation.trim()) return;
    setSubmittingExplanation(true);
    KbcAudio.playLock(); // Play deep dramatic lock sound

    // Setup a fallback timeout to prevent getting stuck
    const timeoutId = setTimeout(() => {
      setSubmittingExplanation(false);
      setCodeError("The verification server is not responding. Please try again!");
    }, 15000);

    // 1. Submit code first for verification
    socketRef.current.emit('submit_code', {
      duelId,
      userId: user?.id,
      code
    });

    // 2. Wait for code judgment results
    socketRef.current.once('code_judged', (result) => {
      clearTimeout(timeoutId);
      if (result.passed) {
        // Code passes validation! Proceed to finalize win with explanation
        KbcAudio.playCorrect(); // Play success fanfare
        socketRef.current?.emit('submit_explanation', {
          duelId,
          userId: user?.id,
          explanation
        });
      } else {
        // Code failed validation!
        KbcAudio.playWrong(); // Play wrong answer buzzer
        setSubmittingExplanation(false);
        setCodeError(result.reason || "Your solution did not fix the bug. Try again!");
        setShowExplanationModal(false); // Return to editor to fix code
      }
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
      KbcAudio.playWrong(); // Play buzzer sound on error
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
    KbcAudio.playLifeline(); // Play wind chime sweep on hint purchase
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

          {opponentOffline && (
            <div className="alert-priority-flash" style={{
              padding: '12px 24px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.15)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} className="pulse-glow" style={{ color: 'var(--accent-red)' }} />
                <span>RIVAL DISCONNECTED! Auto-forfeit in progress, waiting 20s for reconnection...</span>
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>DISCONNECTED</span>
            </div>
          )}

          {opponentSubmitted && (
            <div className="alert-priority-flash" style={{
              padding: '12px 24px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} className="pulse-glow" style={{ color: 'var(--accent-red)' }} />
                <span>WARNING: Opponent @{opponent?.username || 'Opponent'} has submitted a fix! They are writing their explanation! HURRY!</span>
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>CRITICAL PRIOR</span>
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
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontFamily: 'JetBrains Mono, monospace' }}>Rival State</h3>
            <div className="panel-tactical panel-accent-blue" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="panel-tactical-tr"></div>
              <div className="panel-tactical-bl"></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', fontFamily: 'JetBrains Mono, monospace' }}>@{opponent?.username || 'Opponent'}</span>
                  {opponentOffline && (
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-red)',
                      boxShadow: '0 0 8px var(--accent-red)'
                    }} />
                  )}
                </div>
                {opponentOffline ? (
                  <span className="badge" style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>OFFLINE</span>
                ) : opponentSubmitted ? (
                  <span className="badge" style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>SUBMITTED</span>
                ) : (
                  <span className="badge" style={{ fontSize: '9px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>ONLINE</span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                  <span>Progress estimation</span>
                  <span style={{ fontWeight: 'bold' }}>{opponentProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    className="progress-tactical-bar"
                    style={{
                      width: `${opponentProgress}%`,
                      height: '100%',
                      background: opponentSubmitted ? 'var(--accent-green)' : 'linear-gradient(to right, var(--accent-blue), var(--accent-red))',
                      borderRadius: '3px',
                      transition: 'width 0.8s ease-in-out'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* FOMO Signal Ticker */}
          <div>
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>FOMO Signals</h3>
            <div className="panel-tactical panel-accent-purple" style={{
              padding: '16px',
              fontSize: '13px',
              color: 'var(--accent-purple)',
              fontWeight: '500',
              lineHeight: 1.5,
              minHeight: '70px',
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <div className="panel-tactical-tr"></div>
              <div className="panel-tactical-bl"></div>
              {fomoMessage}
            </div>
          </div>

          {/* Hints Section */}
          <div style={{ marginTop: 'auto' }}>
            {showHint ? (
              <div className="panel-tactical panel-accent-amber" style={{ padding: '14px', fontSize: '12px', lineHeight: '18px' }}>
                <div className="panel-tactical-tr"></div>
                <div className="panel-tactical-bl"></div>
                <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '4px' }}>HINT REVEALED:</strong>
                Category is <strong>{currentDuel.bug?.category}</strong>. Analyze the code syntax around data validation or structure checks.
              </div>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '13px', borderStyle: 'dashed', gap: '4px', fontFamily: 'Space Grotesk, sans-serif' }}
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
          className="btn btn-secondary"
          style={{ 
            padding: '8px 16px', 
            fontSize: '13px', 
            borderColor: 'rgba(239, 68, 68, 0.4)', 
            color: 'var(--accent-red)',
            background: 'rgba(239, 68, 68, 0.05)',
            fontFamily: 'Space Grotesk, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Forfeit Match <Flag size={14} />
        </button>

        <button 
          onClick={handleSubmitCode} 
          className="btn btn-success"
          style={{ 
            padding: '10px 28px', 
            fontSize: '15px', 
            color: 'black', 
            gap: '8px',
            fontFamily: 'Space Grotesk, sans-serif',
            boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Play size={16} fill="black" /> 
          SUBMIT FIX
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
          background: 'rgba(9, 9, 13, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div className="panel-tactical panel-accent-green" style={{
            width: '100%',
            maxWidth: '520px',
            background: '#0D0D12',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '24px'
          }}>
            <div className="panel-tactical-tr"></div>
            <div className="panel-tactical-bl"></div>

            <div style={{ textAlign: 'center' }}>
              <div className="flex-center" style={{ gap: '8px', color: 'var(--accent-amber)', marginBottom: '8px' }}>
                <Sparkles size={28} className="pulse-glow" style={{ color: 'var(--accent-amber)' }} />
                <h2 style={{ fontSize: '22px', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Few moments away from result...
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
                Provide the final explanation of your fix. The test runner will verify both your code and description to score points.
              </p>
            </div>

            {/* Tactical session state */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px dashed rgba(245, 158, 11, 0.25)',
              padding: '12px 16px',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--accent-amber)',
              fontFamily: 'JetBrains Mono, monospace',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div>{"// CONSOLE SESSION STATE: VERIFICATION_PENDING"}</div>
              <div>{"// STATUS: LATCH_EXPLANATION_TO_RUN_TESTS"}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  DESCRIBE THE ROOT CAUSE & FIX
                </label>
                <span style={{ fontSize: '11px', color: explanation.length > 180 ? 'var(--accent-red)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {explanation.length}/200
                </span>
              </div>
              <textarea
                value={explanation}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setExplanation(e.target.value);
                  }
                }}
                placeholder="What was the bug? How does your fix resolve it? (1-2 sentences)"
                style={{
                  height: '120px',
                  background: '#07070a',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  padding: '12px',
                  color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'none',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                AI judge scores description quality (0-20 points) for bonus tokens.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowExplanationModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, height: '48px', fontFamily: 'Space Grotesk, sans-serif' }}
                disabled={submittingExplanation}
              >
                CANCEL
              </button>
              <button
                onClick={handleExplanationSubmit}
                className="btn btn-success"
                style={{ 
                  flex: 1, 
                  height: '48px', 
                  color: 'black', 
                  gap: '8px', 
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)'
                }}
                disabled={submittingExplanation || !explanation.trim()}
              >
                <Send size={14} />
                {submittingExplanation ? "TRANSMITTING..." : "SUBMIT & LATCH WIN"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
