'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, BookOpen, ChevronRight, Brain, MessageSquare } from 'lucide-react';
import { useStore } from '@/store/useStore';
import QuestionCard from '@/components/kbc/QuestionCard';
import PrizeLadder, { PRIZE_LADDER } from '@/components/kbc/PrizeLadder';
import LifelinesPanel, { LifelineState } from '@/components/kbc/LifelinesPanel';
import EndScreen from '@/components/kbc/EndScreen';
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

function SoloChallengeGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, setUser } = useStore();

  // Engine States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lost' | 'timeout'>('playing');

  // Question Iteration States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); 
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [lockedOptionIndex, setLockedOptionIndex] = useState<number | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState(false);

  // Timer States
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lifelines States
  const [usedLifelines, setUsedLifelines] = useState<LifelineState>({
    fiftyFifty: false,
    audiencePoll: false,
    expertAdvice: false,
    skip: false
  });
  const [eliminatedOptionIndices, setEliminatedOptionIndices] = useState<number[]>([]);

  // Immersive Experience States
  const [hostMessage, setHostMessage] = useState('Welcome to the Hot Seat! Ready to prove your coding supremacy?');
  const [timePerQuestion, setTimePerQuestion] = useState<number[]>([]);
  const [persistedStats, setPersistedStats] = useState<{
    accuracy: number;
    fastestAnswerTime: number;
    lifelinesUsedCount: number;
    tokensEarned: number;
  } | null>(null);

  const optionLetters = ['A', 'B', 'C', 'D'];

  // Start Theme music on load
  useEffect(() => {
    KbcAudio.playIntro();
    return () => {
      // Audio cleanup on route change
      KbcAudio.stopSuspense();
    };
  }, []);

  // Load questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      setError(null);
      const category = searchParams.get('category') || 'general_tech';
      
      try {
        const res = await fetch(`http://localhost:5001/api/kbc/questions?category=${category}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length === 15) {
            setQuestions(data);
            setHostMessage(`We have loaded 15 progressive ${category} questions. Let's start with Level 1.`);
            KbcAudio.playReveal();
          } else {
            setError("Server returned an invalid question set. Ensure the seed data is populated.");
          }
        } else {
          setError("Failed to fetch questions. Check if the server is running on port 5001.");
        }
      } catch (err) {
        console.error("Error loading questions:", err);
        setError("Network connection failed. Unable to contact the backend server.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [searchParams]);

  // Submit Run outcome to Backend
  const persistSoloRunOutcome = async (finalState: 'win' | 'lost' | 'timeout', clearedLevel: number) => {
    if (!user) return;

    KbcAudio.stopSuspense();

    const lifelinesArray = Object.keys(usedLifelines).filter(
      k => usedLifelines[k as keyof typeof usedLifelines]
    );

    try {
      const res = await fetch('http://localhost:5001/api/kbc/solo/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          questionsCleared: clearedLevel,
          timePerQuestion,
          lifelinesUsed: lifelinesArray,
          status: finalState
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPersistedStats({
          accuracy: data.accuracy,
          fastestAnswerTime: data.fastestAnswerTime,
          lifelinesUsedCount: lifelinesArray.length,
          tokensEarned: data.prizeEarned
        });
        
        // Sync user tokens in local store
        setUser({ ...user, tokens: data.newTokens });
      }
    } catch (e) {
      console.error("Failed to persist KBC Solo Stats:", e);
    }
  };

  // Game Loop Timer logic
  useEffect(() => {
    if (gameState === 'playing' && lockedOptionIndex === null && !loading && !error) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState('timeout');
            setHostMessage("Time is up! The clock has got the better of you on this hot seat.");
            persistSoloRunOutcome('timeout', currentQuestionIndex);
            return 0;
          }
          
          // Play countdown tick on last 10 seconds
          if (prev <= 11) {
            KbcAudio.playSelect(); // high pitch pluck as tick sound
          }

          // Suspense ticking sound for last 10 seconds
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
  }, [gameState, lockedOptionIndex, loading, error, currentQuestionIndex, timePerQuestion]);

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
        fontFamily: 'Space Grotesk, sans-serif'
      }}>
        <Brain size={48} color="var(--accent-amber)" className="pulse-glow" style={{ marginBottom: '16px' }} />
        <div>Preparing the Hot Seat...</div>
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
        fontFamily: 'Space Grotesk, sans-serif'
      }}>
        <AlertCircle size={48} color="var(--accent-red)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Setup Error</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '14px', lineHeight: '20px', marginBottom: '24px' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ background: 'var(--accent-blue)', border: 'none', color: '#FFF' }}>
            Retry Loading
          </button>
          <Link href="/kbc/categories" className="btn btn-secondary">
            Select Category
          </Link>
        </div>
      </div>
    );
  }

  // End screens handler (won, lost, timeout)
  if (gameState !== 'playing') {
    const isLoss = gameState === 'lost' || gameState === 'timeout';
    return (
      <EndScreen 
        status={gameState}
        questionsCleared={isLoss ? currentQuestionIndex : 15}
        failedQuestion={isLoss ? questions[currentQuestionIndex] : null}
        userAnswerIndex={isLoss ? lockedOptionIndex : null}
        onReset={() => {
          setCurrentQuestionIndex(0);
          setSelectedOptionIndex(null);
          setLockedOptionIndex(null);
          setRevealedAnswer(false);
          setTimeLeft(30);
          setUsedLifelines({
            fiftyFifty: false,
            audiencePoll: false,
            expertAdvice: false,
            skip: false
          });
          setEliminatedOptionIndices([]);
          setTimePerQuestion([]);
          setPersistedStats(null);
          setGameState('playing');
          KbcAudio.playIntro();
        }}
        accuracy={persistedStats?.accuracy}
        fastestAnswerTime={persistedStats?.fastestAnswerTime}
        lifelinesUsedCount={persistedStats?.lifelinesUsedCount}
        tokensEarned={persistedStats?.tokensEarned}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const activeLevelNumber = currentQuestionIndex + 1;

  // Option select handler
  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
    KbcAudio.playSelect();
    setHostMessage(`Option ${optionLetters[idx]} chosen. Are you ready to lock it in?`);
  };

  // Option lock handler
  const handleLockOption = () => {
    if (selectedOptionIndex === null) return;
    setLockedOptionIndex(selectedOptionIndex);
    
    // Stop the timer
    if (timerRef.current) clearInterval(timerRef.current);
    KbcAudio.stopSuspense();
    KbcAudio.playLock();

    // Track answer speed
    const secondsTaken = 30 - timeLeft;
    setTimePerQuestion(prev => [...prev, secondsTaken]);

    setHostMessage(`Locking Option ${optionLetters[selectedOptionIndex]}... Let's see if this is correct.`);

    // Start suspense ticker loop
    KbcAudio.startSuspense(false);

    // Simulate suspense, then check correctness
    setTimeout(() => {
      KbcAudio.stopSuspense();
      setRevealedAnswer(true);
      const isCorrect = currentQuestion.correctAnswer === selectedOptionIndex;
      
      if (isCorrect) {
        KbcAudio.playCorrect();
        if (activeLevelNumber === 5) {
          setHostMessage("Sensational! You have cleared Level 5 and reached your first safety milestone!");
        } else if (activeLevelNumber === 10) {
          setHostMessage("Splendid work! Level 10 cleared. Milestone safety guaranteed!");
        } else if (activeLevelNumber === 15) {
          setHostMessage("Astonishing! Jackpot cleared! You are officially an Expert KBC Developer!");
          setGameState('win');
          persistSoloRunOutcome('win', 15);
        } else {
          setHostMessage(`Correct answer! You have cleared Level ${activeLevelNumber} and unlocked more XP.`);
        }
      } else {
        KbcAudio.playWrong();
        setHostMessage(`Oh no! Option ${optionLetters[selectedOptionIndex]} is incorrect. The correct answer was Option ${optionLetters[currentQuestion.correctAnswer]}.`);
        setTimeout(() => {
          setGameState('lost');
          persistSoloRunOutcome('lost', currentQuestionIndex);
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
        const category = searchParams.get('category') || 'general_tech';
        const res = await fetch(`http://localhost:5001/api/kbc/questions?category=${category}`);
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
            setHostMessage("Question Skipped. A new technical puzzle has been loaded in its place.");
            KbcAudio.playReveal();
          } else {
            alert("No unused questions remaining in this category/difficulty to skip.");
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
      setHostMessage("Requesting consulting recommendations from our expert engineer...");
    }
  };

  // Next Question triggers
  const handleNextQuestion = () => {
    if (currentQuestionIndex >= 14) {
      setGameState('win');
      persistSoloRunOutcome('win', 15);
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
  };

  // Circular timer color mapping
  const getTimerColor = () => {
    if (timeLeft > 15) return 'var(--accent-green)';
    if (timeLeft > 10) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F32 0%, #0A0618 100%)',
      padding: '40px 24px',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        @keyframes timerFlash {
          0% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 68, 68, 0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 15px rgba(255, 68, 68, 0.8)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(255, 68, 68, 0.4)); }
        }
        .timer-warning {
          animation: timerFlash 0.5s infinite ease-in-out;
        }
      `}</style>

      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Main Game Play Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href="/kbc/categories" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
              <ArrowLeft size={16} /> Exit Arena
            </Link>
            
            {/* Round info */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span>Level:</span>
                <strong style={{ color: 'var(--accent-amber)' }}>{activeLevelNumber}/15</strong>
              </div>
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span>Topic:</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{currentQuestion.category}</strong>
              </div>
            </div>
          </div>

          {/* Virtual Host Box */}
          <div style={{
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(74, 158, 255, 0.05) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
            }}>
              🎙️
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-purple)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                KBC Host
              </span>
              <p style={{ fontSize: '13.5px', color: '#E2E8F0', marginTop: '2px', lineHeight: '18px', fontWeight: '500' }}>
                &ldquo;{hostMessage}&rdquo;
              </p>
            </div>
          </div>

          {/* Central Section: Timer & Question */}
          <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            background: 'rgba(15, 11, 41, 0.4)',
            borderColor: 'rgba(245, 166, 35, 0.1)',
            padding: '36px'
          }}>
            {/* Circular Timer UI */}
            <div 
              className={timeLeft <= 10 && lockedOptionIndex === null ? 'timer-warning' : ''}
              style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
            >
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="45" cy="45" r="38" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
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
                    transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                  }}
                />
              </svg>
              {/* Numeric indicator */}
              <div className="flex-center" style={{ 
                flexDirection: 'column', 
                gap: '2px', 
                zIndex: 10,
                color: getTimerColor(),
                fontWeight: 'bold',
                fontFamily: 'Space Grotesk, sans-serif',
                transition: 'color 0.3s'
              }}>
                <Clock size={16} />
                <span style={{ fontSize: '18px' }}>{timeLeft}s</span>
              </div>
            </div>

            {/* Question Box & Answer Choices */}
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

            {/* Post-reveal explanation box & next question action */}
            {revealedAnswer && (
              <div style={{
                width: '100%',
                background: 'rgba(0, 255, 148, 0.04)',
                border: '1px solid rgba(0, 255, 148, 0.15)',
                borderRadius: '8px',
                padding: '24px',
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                textAlign: 'left'
              }}>
                <div>
                  <h4 style={{ fontSize: '14px', color: 'var(--accent-green)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Correct Answer Explanation
                  </h4>
                  <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '22px', marginTop: '6px' }}>
                    {currentQuestion.explanation}
                  </p>
                </div>
                <button 
                  onClick={handleNextQuestion} 
                  className="btn btn-success"
                  style={{
                    alignSelf: 'flex-end',
                    background: 'var(--accent-green)',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '12px 32px',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {currentQuestionIndex === 14 ? 'Claim Jackpot!' : 'Proceed to Next Level'}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

          </div>

          {/* Lifelines row */}
          <div className="glass-panel" style={{ background: 'rgba(13, 9, 36, 0.4)', borderColor: 'rgba(255,255,255,0.06)' }}>
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

        {/* RIGHT COLUMN: Prize Ladder Sidebar */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <PrizeLadder currentStepIndex={currentQuestionIndex} />
        </div>

      </div>
    </div>
  );
}

export default function SoloChallengePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontFamily: 'Space Grotesk, sans-serif'
      }}>
        <div>Loading arena resources...</div>
      </div>
    }>
      <SoloChallengeGame />
    </Suspense>
  );
}
