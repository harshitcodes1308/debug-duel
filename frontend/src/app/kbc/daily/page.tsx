'use client';

import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Clock, AlertCircle, ChevronRight, 
  Brain, MessageSquare, Trophy, Shield, Play, Lock, Loader2 
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import QuestionCard from '@/components/kbc/QuestionCard';
import PrizeLadder, { PRIZE_LADDER } from '@/components/kbc/PrizeLadder';
import LifelinesPanel, { LifelineState } from '@/components/kbc/LifelinesPanel';
import { KbcAudio } from '@/utils/kbc/audio';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  explanation: string;
  points: number;
}

interface LeaderboardEntry {
  id: string;
  userId: string;
  questionsCleared: number;
  timeTaken: number;
  prizeEarned: number;
  createdAt: string;
  user: {
    username: string;
    avatar: string | null;
    level: number;
  };
}

function DailyChallengeGame() {
  const router = useRouter();
  const { user, setUser } = useStore();

  // Mode States: 'intro' | 'playing' | 'end' | 'leaderboard'
  const [mode, setMode] = useState<'intro' | 'playing' | 'end' | 'leaderboard'>('intro');

  // Engine States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lost' | 'timeout' | 'quit'>('playing');
  const [hasAttempted, setHasAttempted] = useState(false);

  // Question Iteration States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); 
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [lockedOptionIndex, setLockedOptionIndex] = useState<number | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);

  // Timer States
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-double-click locks
  const isLockingRef = useRef(false);
  const isTransitioningRef = useRef(false);

  // Lifelines States
  const [usedLifelines, setUsedLifelines] = useState<LifelineState>({
    fiftyFifty: false,
    audiencePoll: false,
    expertAdvice: false,
    skip: false
  });
  const [eliminatedOptionIndices, setEliminatedOptionIndices] = useState<number[]>([]);

  // Immersive Experience States
  const [hostMessage, setHostMessage] = useState('Welcome to the KBC Daily Challenge! A single attempt to etch your name in today\'s leaderboard.');
  const [timePerQuestion, setTimePerQuestion] = useState<number[]>([]);
  const [runStats, setRunStats] = useState<{
    questionsCleared: number;
    tokensEarned: number;
    xpEarned: number;
  } | null>(null);

  // Leaderboard States
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const optionLetters = ['A', 'B', 'C', 'D'];

  // Start Theme music on load
  useEffect(() => {
    KbcAudio.playIntro();
    return () => {
      KbcAudio.stopSuspense();
    };
  }, []);

  // Fetch status & questions on mount
  useEffect(() => {
    async function checkStatus() {
      if (!user) return;
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001'}/api/kbc/daily/questions?userId=${user.id}`);
        if (!res.ok) {
          const data = await res.json();
          if (data.hasAttempted) {
            setHasAttempted(true);
            setMode('leaderboard');
            await fetchLeaderboard();
          } else {
            setError(data.error || "Failed to load Daily Challenge.");
          }
        } else {
          const data = await res.json();
          if (data && data.length === 15) {
            setQuestions(data);
          } else {
            setError("Server returned an invalid question set.");
          }
        }
      } catch (err) {
        console.error("Error checking daily challenge status:", err);
        setError("Network connection failed. Unable to contact the backend server.");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [user]);

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/kbc/daily/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error("Failed to fetch daily leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Submit Run outcome to Backend
  const persistDailyRunOutcome = useCallback(async (finalState: 'win' | 'lost' | 'timeout' | 'quit', clearedLevel: number) => {
    if (!user) return;
    KbcAudio.stopSuspense();

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/kbc/daily/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          questionsCleared: clearedLevel,
          timePerQuestion,
          status: finalState
        })
      });

      if (res.ok) {
        const data = await res.json();
        const xpEarned = (finalState === 'win' || clearedLevel === 15) ? 40 : 10;
        setRunStats({
          questionsCleared: clearedLevel,
          tokensEarned: data.prizeEarned,
          xpEarned
        });
        
        // Sync user tokens in local store
        setUser({ ...user, tokens: data.newTokens });
      }
    } catch (e) {
      console.error("Failed to persist Daily Challenge stats:", e);
    }
  }, [user, timePerQuestion, setUser]);

  // Game Loop Timer logic
  useEffect(() => {
    if (mode === 'playing' && gameState === 'playing' && lockedOptionIndex === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState('timeout');
            setHostMessage("Time is up! The clock has got the better of you on this hot seat.");
            setMode('end');
            persistDailyRunOutcome('timeout', currentQuestionIndex);
            return 0;
          }
          
          if (prev <= 11) {
            KbcAudio.playSelect();
          }

          if (prev === 11) {
            KbcAudio.startSuspense(true);
          }

          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, lockedOptionIndex, mode, currentQuestionIndex, persistDailyRunOutcome]);

  // Exit Arena button handler with confirmation
  const handleExitArena = () => {
    if (mode === 'playing') {
      const confirmExit = window.confirm("Are you sure you want to exit the Hot Seat? Your current progress will be lost and count as a quit.");
      if (!confirmExit) return;
      
      // Auto-submit as quit
      handleWalkAway(true);
    } else {
      router.push('/kbc/categories');
    }
  };

  // Before unload listener
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'playing') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to exit? Today\'s attempt will be marked as a Quit.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [mode]);

  // Walk Away / Quit handler
  const handleWalkAway = async (skipConfirm = false) => {
    if (lockedOptionIndex !== null || revealedAnswer) return;
    
    if (!skipConfirm) {
      const confirmWalk = window.confirm(
        `Are you sure you want to Walk Away? You will secure your progress of ${currentQuestionIndex} cleared question(s) and claim double token rewards for your current level!`
      );
      if (!confirmWalk) return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    KbcAudio.stopSuspense();
    KbcAudio.playIntro();

    setGameState('quit');
    setMode('end');
    await persistDailyRunOutcome('quit', currentQuestionIndex);
  };

  // Circular timer color mapping
  const getTimerColor = () => {
    if (timeLeft > 15) return 'var(--accent-purple)';
    if (timeLeft > 10) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  // Start Game trigger
  const handleStartGame = () => {
    KbcAudio.playReveal();
    setMode('playing');
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setTimeLeft(30);
    setHostMessage("Level 1 loaded. Prove your skills today!");
  };

  // Option select handler
  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
    KbcAudio.playSelect();
    setHostMessage(`Option ${optionLetters[idx]} chosen. Are you ready to lock it in?`);
  };

  // Option lock handler
  const handleLockOption = () => {
    if (selectedOptionIndex === null || lockedOptionIndex !== null || isLockingRef.current) return;
    isLockingRef.current = true;
    setLockedOptionIndex(selectedOptionIndex);
    
    if (timerRef.current) clearInterval(timerRef.current);
    KbcAudio.stopSuspense();
    KbcAudio.playLock();

    const secondsTaken = 30 - timeLeft;
    setTimePerQuestion(prev => [...prev, secondsTaken]);

    setHostMessage(`Locking Option ${optionLetters[selectedOptionIndex]}... Let's see if this is correct.`);
    KbcAudio.startSuspense(false);

    setTimeout(() => {
      KbcAudio.stopSuspense();
      setRevealedAnswer(true);
      const isCorrect = currentQuestion.correctAnswer === selectedOptionIndex;
      
      if (isCorrect) {
        KbcAudio.playCorrect();
        if (activeLevelNumber === 5) {
          setHostMessage("Sensational! Level 5 safety milestone reached!");
        } else if (activeLevelNumber === 10) {
          setHostMessage("Splendid work! Level 10 safety milestone reached!");
        } else if (activeLevelNumber === 15) {
          setHostMessage("Astonishing! Daily Jackpot conquered! Double tokens secured!");
          setGameState('win');
          setMode('end');
          persistDailyRunOutcome('win', 15);
        } else {
          setHostMessage(`Correct! Level ${activeLevelNumber} cleared.`);
        }
      } else {
        KbcAudio.playWrong();
        setHostMessage(`Oh no! The correct answer was Option ${optionLetters[currentQuestion.correctAnswer]}.`);
        setTimeout(() => {
          setGameState('lost');
          setMode('end');
          persistDailyRunOutcome('lost', currentQuestionIndex);
        }, 3000);
      }
    }, 2500);
  };

  // Lifelines Activation handler
  const handleUseLifeline = async (type: keyof LifelineState) => {
    if (usedLifelines[type]) return;

    if (type === 'fiftyFifty') {
      const correctIdx = currentQuestion.correctAnswer;
      const incorrectIdxs = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
      const shuffledIncorrect = [...incorrectIdxs].sort(() => Math.random() - 0.5);
      const toEliminate = shuffledIncorrect.slice(0, 2);

      setEliminatedOptionIndices(toEliminate);
      setUsedLifelines(prev => ({ ...prev, fiftyFifty: true }));
      setHostMessage("50-50 Activated. Two incorrect options have vanished.");
      
      if (selectedOptionIndex !== null && toEliminate.includes(selectedOptionIndex)) {
        setSelectedOptionIndex(null);
      }
    } else if (type === 'skip') {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001'}/api/kbc/questions?category=general_tech`);
        if (res.ok) {
          const data: Question[] = await res.json();
          const replacement = data.find(q => 
            q.difficulty === currentQuestion.difficulty && 
            !questions.some(existing => existing.id === q.id)
          );

          if (replacement) {
            const updatedQuestions = [...questions];
            updatedQuestions[currentQuestionIndex] = replacement;
            setQuestions(updatedQuestions);
            setUsedLifelines(prev => ({ ...prev, skip: true }));
            setSelectedOptionIndex(null);
            setEliminatedOptionIndices([]);
            setTimeLeft(30);
            setHostMessage("Question Skipped. A new replacement question has been loaded.");
            KbcAudio.playReveal();
          } else {
            alert("No unused questions remaining in this category to skip.");
          }
        }
      } catch (err) {
        console.error("Failed to skip question:", err);
      }
    } else if (type === 'audiencePoll') {
      setUsedLifelines(prev => ({ ...prev, audiencePoll: true }));
      setHostMessage("Consulting the live developer audience poll...");
    } else if (type === 'expertAdvice') {
      setUsedLifelines(prev => ({ ...prev, expertAdvice: true }));
      setHostMessage("Requesting expert advisor recommendation...");
    }
  };

  // Next Question triggers
  const handleNextQuestion = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (currentQuestionIndex >= 14) {
      setGameState('win');
      setMode('end');
      persistDailyRunOutcome('win', 15);
      isTransitioningRef.current = false;
      return;
    }

    KbcAudio.playLadder();
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedOptionIndex(null);
    setLockedOptionIndex(null);
    setRevealedAnswer(false);
    setEliminatedOptionIndices([]);
    setTimeLeft(30);
    setHostMessage(`Proceeding to Level ${currentQuestionIndex + 2}. Let's see the question.`);
    isLockingRef.current = false;

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 500);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontFamily: 'Rajdhani, sans-serif'
      }}>
        <Brain size={48} color="var(--accent-purple)" className="pulse-glow" style={{ marginBottom: '16px' }} />
        <div>Verifying Daily hot seat keys...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#FFF',
        textAlign: 'center',
        fontFamily: 'Rajdhani, sans-serif'
      }}>
        <AlertCircle size={48} color="var(--accent-red)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Daily Challenge</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '14px', lineHeight: '20px', marginBottom: '24px' }}>
          {error}
        </p>
        <Link href="/kbc/categories" className="btn btn-secondary">
          Back to Arena
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const activeLevelNumber = currentQuestionIndex + 1;

  // Render Intro Screen
  if (mode === 'intro') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #0F092B 0%, #06030F 100%)',
        color: '#FFF',
        padding: '40px 24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '640px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          background: 'rgba(20, 16, 45, 0.5)',
          borderColor: 'rgba(123, 147, 219, 0.15)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(123, 147, 219, 0.1)',
            border: '1px solid rgba(123, 147, 219, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(123, 147, 219, 0.2)'
          }}>
            <Trophy size={32} color="var(--accent-amber)" />
          </div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent-purple)' }}>
              TODAY&apos;S SPECIAL
            </span>
            <h1 style={{ fontSize: '32px', color: '#FFF', marginTop: '8px', fontFamily: 'Rajdhani, sans-serif' }}>
              Daily KBC Challenge
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '22px', marginTop: '12px', maxWidth: '480px', margin: '12px auto 0' }}>
              Test your technical capabilities against a unified developer questionnaire today. Every participant gets the exact same questions. 
              Double token rewards. Zero second-attempts.
            </p>
          </div>

          <div style={{
            width: '100%',
            background: 'rgba(255,255,255,0.01)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Attempts Allowed:</span>
              <strong style={{ color: 'var(--accent-red)' }}>1 (Single Run)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Milestone Prizes:</span>
              <strong style={{ color: 'var(--accent-green)' }}>Doubled Token Rewards</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jackpot Win:</span>
              <strong style={{ color: 'var(--accent-amber)' }}>1,000 Tokens + 40 XP</strong>
            </div>
          </div>

          <button 
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-purple)', border: 'none' }}
            onClick={handleStartGame}
          >
            Enter Hot Seat
          </button>

          <Link href="/kbc/categories" className="btn-ghost" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Back to Arena
          </Link>
        </div>
      </div>
    );
  }

  // Render Game Play Screen
  if (mode === 'playing') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'var(--bg-primary)',
        padding: '40px 0',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <style>{`
          @keyframes timerFlash {
            0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.4)); }
            50% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.8)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.4)); }
          }
          .timer-warning {
            animation: timerFlash 0.5s infinite ease-in-out;
          }
        `}</style>
        <div className="container kbc-arena-grid">
          
          {/* Main game board */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={handleExitArena} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'var(--space-2)', 
                  color: 'var(--text-secondary)', 
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px', 
                  fontWeight: 600,
                  padding: 0
                }}
              >
                <ArrowLeft size={14} /> Quit Arena
              </button>
              
              <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Level:</span>
                  <strong style={{ color: 'var(--accent-amber)' }}>{activeLevelNumber}/15</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--accent-purple)' }}>DAILY CHALLENGE</strong>
                </div>
              </div>
            </div>

            {/* Virtual Host Box */}
            <div style={{
              background: 'linear-gradient(90deg, rgba(123, 147, 219, 0.06) 0%, rgba(123, 147, 219, 0.03) 100%)',
              border: '1px solid rgba(123, 147, 219, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4) var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(123, 147, 219, 0.1)',
                border: '1px solid rgba(123, 147, 219, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MessageSquare size={18} color="var(--accent-purple)" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--accent-purple)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  KBC Host
                </span>
                <p style={{ fontSize: '13px', color: '#E2E8F0', marginTop: '2px', lineHeight: '18px', fontWeight: 500 }}>
                  &ldquo;{hostMessage}&rdquo;
                </p>
              </div>
            </div>

            {/* Central Section */}
            <div className="card-base" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-6)',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border)',
              padding: 'var(--space-8)'
            }}>
              {/* Circular Timer UI */}
              <div 
                className={timeLeft <= 10 && lockedOptionIndex === null ? 'timer-warning' : ''}
                style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)' }}
              >
                <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                  <circle cx="45" cy="45" r="38" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <circle 
                    cx="45" 
                    cy="45" 
                    r="38" 
                    fill="transparent" 
                    stroke={getTimerColor()} 
                    strokeWidth="6" 
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - timeLeft / 30)}
                    style={{
                      transition: 'stroke-dashoffset 1s linear, stroke 0.2s ease',
                    }}
                  />
                </svg>
                <div className="flex-center" style={{ 
                  flexDirection: 'column', 
                  gap: '2px', 
                  zIndex: 10,
                  color: getTimerColor(),
                  fontWeight: 'bold',
                  fontFamily: 'Rajdhani, sans-serif',
                  transition: 'color 0.2s'
                }}>
                  <Clock size={14} />
                  <span style={{ fontSize: '18px' }}>{timeLeft}s</span>
                </div>
              </div>

              {/* Question & Choices */}
              <QuestionCard 
                question={currentQuestion}
                selectedOptionIndex={selectedOptionIndex}
                lockedOptionIndex={lockedOptionIndex}
                revealedAnswer={revealedAnswer}
                eliminatedOptionIndices={eliminatedOptionIndices}
                onSelectOption={handleSelectOption}
                onLockOption={handleLockOption}
                disabled={lockedOptionIndex !== null || revealedAnswer}
              />

              {/* Walk Away Button */}
              {lockedOptionIndex === null && !revealedAnswer && currentQuestionIndex > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                  <button
                    className="btn interactive-lift"
                    style={{
                      padding: '8px 24px',
                      fontSize: '13px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderColor: 'rgba(245, 158, 11, 0.4)',
                      color: 'var(--accent-amber)',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleWalkAway()}
                  >
                    Walk Away & Claim double tokens
                  </button>
                </div>
              )}

              {/* Explanations */}
              {revealedAnswer && (
                <div style={{
                  width: '100%',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-5)',
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)'
                }}>
                  <div>
                    <h4 style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Explanation
                    </h4>
                    <p style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '20px', marginTop: '6px' }}>
                      {currentQuestion.explanation}
                    </p>
                  </div>
                  <button 
                    onClick={handleNextQuestion} 
                    className="btn btn-success"
                    style={{ alignSelf: 'flex-end', padding: '10px 24px', gap: 'var(--space-2)' }}
                  >
                    {currentQuestionIndex === 14 ? 'Claim Jackpot!' : 'Proceed to Next Level'}
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Lifelines */}
            <div className="card-base" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <LifelinesPanel 
                usedLifelines={usedLifelines}
                onUseLifeline={handleUseLifeline}
                disabled={lockedOptionIndex !== null || revealedAnswer}
                correctAnswerIndex={currentQuestion.correctAnswer}
                options={currentQuestion.options}
                explanation={currentQuestion.explanation}
              />
            </div>
          </div>

          {/* Sidebar Prize Ladder */}
          <div>
            <PrizeLadder currentStepIndex={currentQuestionIndex} />
          </div>

        </div>
      </div>
    );
  }

  // Render Post Game End Screen
  if (mode === 'end') {
    const isLoss = gameState === 'lost' || gameState === 'timeout';
    const isQuit = gameState === 'quit';
    const finalCleared = gameState === 'win' ? 15 : currentQuestionIndex;
    
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'radial-gradient(circle at center, #0F092B 0%, #06030F 100%)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '600px',
          padding: '48px 40px',
          textAlign: 'center',
          background: 'rgba(20, 16, 45, 0.5)',
          borderColor: 'var(--accent-amber)',
          boxShadow: '0 20px 50px rgba(245, 166, 35, 0.1)'
        }}>
          <div className="float-anim" style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(245, 166, 35, 0.1)',
            border: '2px solid var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <Trophy size={40} color="var(--accent-amber)" />
          </div>

          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--accent-amber)',
            background: 'rgba(245, 166, 35, 0.08)',
            padding: '4px 12px',
            borderRadius: '99px'
          }}>
            {isLoss ? 'Challenge Complete' : isQuit ? 'Walked Away' : 'Jackpot Conquered'}
          </span>

          <h1 style={{ fontSize: '32px', color: '#FFF', marginTop: '20px', fontFamily: 'Rajdhani, sans-serif' }}>
            {isLoss ? 'Good Try!' : isQuit ? 'Secure Play!' : 'Jackpot Victory!'}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '10px' }}>
            Your Daily Challenge attempt is recorded in today&apos;s leaderboard.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            width: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px 0',
            margin: '30px 0',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Rajdhani, sans-serif' }}>
                +{runStats?.tokensEarned || 0}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>
                TOKENS EARNED (2X MULTIPLIER)
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FFF', fontFamily: 'Rajdhani, sans-serif' }}>
                {finalCleared} / 15
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>
                QUESTIONS CLEARED
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-blue)', border: 'none' }}
              onClick={async () => {
                setMode('leaderboard');
                await fetchLeaderboard();
              }}
            >
              View Leaderboard
            </button>

            <Link href="/kbc/categories" className="btn btn-secondary" style={{ padding: '12px', fontSize: '14px' }}>
              Back to Arena
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Leaderboard Screen
  if (mode === 'leaderboard') {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'var(--bg-primary)',
        color: '#FFF',
        padding: '60px 24px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="container" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
                Today&apos;s Standings
              </span>
              <h1 style={{ fontSize: '36px', fontFamily: 'Rajdhani, sans-serif', marginTop: '4px' }}>
                Daily Leaderboard
              </h1>
            </div>
            
            <Link href="/kbc/categories" className="btn btn-secondary" style={{ padding: '10px 20px', gap: '8px' }}>
              <ArrowLeft size={14} /> Back to Arena
            </Link>
          </div>

          {/* Attempt Warning Banner */}
          {hasAttempted && (
            <div style={{
              background: 'rgba(123, 147, 219, 0.06)',
              border: '1px solid rgba(123, 147, 219, 0.2)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              color: '#93C5FD'
            }}>
              <Shield size={18} color="var(--accent-blue)" />
              <span>You have completed today&apos;s Challenge. Come back tomorrow for the next one!</span>
            </div>
          )}

          {/* Standings List Panel */}
          <div className="card-base" style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            padding: '24px'
          }}>
            {loadingLeaderboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '12px', color: 'var(--text-secondary)' }}>
                <Loader2 size={32} className="animate-spin" color="var(--accent-purple)" />
                <span style={{ fontSize: '13px' }}>Loading today&apos;s standings...</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <Trophy size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px' }}>No runs recorded yet today. Be the first to claim a spot!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 120px 100px 100px',
                  padding: '8px 16px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '12px'
                }}>
                  <span>Rank</span>
                  <span>Username</span>
                  <span style={{ textAlign: 'center' }}>Levels Cleared</span>
                  <span style={{ textAlign: 'center' }}>Time Taken</span>
                  <span style={{ textAlign: 'right' }}>Prize</span>
                </div>

                {/* Rows */}
                {leaderboard.map((entry, idx) => {
                  const isTop3 = idx < 3;
                  const rankColors = ['#F59E0B', '#94A3B8', '#B45309'];
                  const isUser = entry.userId === user?.id;

                  return (
                    <div 
                      key={entry.id} 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 120px 100px 100px',
                        padding: '14px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        background: isUser ? 'rgba(123, 147, 219, 0.06)' : 'rgba(255, 255, 255, 0.005)',
                        border: isUser ? '1px solid rgba(123, 147, 219, 0.2)' : '1px solid transparent',
                        alignItems: 'center',
                        transition: 'var(--transition)'
                      }}
                    >
                      {/* Rank */}
                      <span style={{
                        fontFamily: 'Rajdhani, sans-serif',
                        fontWeight: 'bold',
                        color: isTop3 ? rankColors[idx] : 'var(--text-secondary)'
                      }}>
                        #{idx + 1}
                      </span>

                      {/* Username */}
                      <span style={{ fontWeight: 600, color: isUser ? 'var(--accent-purple)' : '#FFF' }}>
                        @{entry.user.username}
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: 400 }}>
                          Lvl {entry.user.level}
                        </span>
                      </span>

                      {/* Levels Cleared */}
                      <span style={{ textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 'bold' }}>
                        {entry.questionsCleared} / 15
                      </span>

                      {/* Time Taken */}
                      <span style={{ textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-secondary)' }}>
                        {entry.timeTaken.toFixed(1)}s
                      </span>

                      {/* Prize */}
                      <span style={{ textAlign: 'right', fontFamily: 'Rajdhani, sans-serif', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                        {entry.prizeEarned}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function DailyChallengePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontFamily: 'Rajdhani, sans-serif'
      }}>
        <div>Loading Daily Challenge...</div>
      </div>
    }>
      <DailyChallengeGame />
    </Suspense>
  );
}
