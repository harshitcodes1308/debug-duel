'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertCircle, BookOpen, ChevronRight, Brain } from 'lucide-react';
import QuestionCard from '@/components/kbc/QuestionCard';
import PrizeLadder, { PRIZE_LADDER } from '@/components/kbc/PrizeLadder';
import LifelinesPanel, { LifelineState } from '@/components/kbc/LifelinesPanel';
import EndScreen from '@/components/kbc/EndScreen';

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

  // Engine States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'win' | 'lost' | 'timeout'>('playing');

  // Question Iteration States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 0 to 14
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

  // Game Loop Timer logic
  useEffect(() => {
    // Start countdown timer if we are playing and haven't locked an answer yet
    if (gameState === 'playing' && lockedOptionIndex === null && !loading && !error) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState('timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, lockedOptionIndex, loading, error, currentQuestionIndex]);

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
          // Reset game states
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
          setGameState('playing');
          // Reload page
          router.refresh();
        }}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const activeLevelNumber = currentQuestionIndex + 1;

  // Option select handler
  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
  };

  // Option lock handler
  const handleLockOption = () => {
    if (selectedOptionIndex === null) return;
    setLockedOptionIndex(selectedOptionIndex);
    
    // Stop the timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Pause briefly to simulate suspense, then check correctness
    setTimeout(() => {
      setRevealedAnswer(true);
      const isCorrect = currentQuestion.correctAnswer === selectedOptionIndex;
      if (!isCorrect) {
        setGameState('lost');
      }
    }, 1500);
  };

  // Lifelines Activation handler
  const handleUseLifeline = async (type: keyof LifelineState) => {
    if (usedLifelines[type]) return;

    if (type === 'fiftyFifty') {
      // Find two incorrect options
      const correctIdx = currentQuestion.correctAnswer;
      const incorrectIdxs = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
      
      // Shuffle incorrect and select two
      const shuffledIncorrect = [...incorrectIdxs].sort(() => Math.random() - 0.5);
      const toEliminate = shuffledIncorrect.slice(0, 2);

      setEliminatedOptionIndices(toEliminate);
      setUsedLifelines(prev => ({ ...prev, fiftyFifty: true }));
      
      // If the selected option is one of the eliminated ones, deselect it
      if (selectedOptionIndex !== null && toEliminate.includes(selectedOptionIndex)) {
        setSelectedOptionIndex(null);
      }
    } else if (type === 'skip') {
      // Fetch a replacement question from same category/difficulty
      try {
        const category = searchParams.get('category') || 'general_tech';
        const res = await fetch(`http://localhost:5001/api/kbc/questions?category=${category}`);
        if (res.ok) {
          const data: Question[] = await res.json();
          // Find replacement with matching difficulty not already in set
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
          } else {
            alert("No unused questions remaining in this category/difficulty to skip.");
          }
        }
      } catch (err) {
        console.error("Failed to skip question:", err);
      }
    } else {
      // For Audience and Expert, LifelinesPanel manages the mock modal triggers
      setUsedLifelines(prev => ({ ...prev, [type]: true }));
    }
  };

  // Next Question triggers
  const handleNextQuestion = () => {
    if (currentQuestionIndex >= 14) {
      setGameState('win');
      return;
    }

    // Go to next level
    setCurrentQuestionIndex(prev => prev + 1);
    
    // Clear question status
    setSelectedOptionIndex(null);
    setLockedOptionIndex(null);
    setRevealedAnswer(false);
    setEliminatedOptionIndices([]);
    setTimeLeft(30);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F32 0%, #0A0618 100%)',
      padding: '40px 24px',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* LEFT COLUMN: Main Game Play Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
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
            <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
              {/* Circular track */}
              <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="45" cy="45" r="38" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle 
                  cx="45" 
                  cy="45" 
                  r="38" 
                  fill="transparent" 
                  stroke={timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-amber)'} 
                  strokeWidth="6" 
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - timeLeft / 30)}
                  style={{
                    transition: 'stroke-dashoffset 1s linear',
                    filter: timeLeft <= 10 ? 'drop-shadow(0 0 5px rgba(255,68,68,0.5))' : 'none'
                  }}
                />
              </svg>
              {/* Numeric indicator */}
              <div className="flex-center" style={{ 
                flexDirection: 'column', 
                gap: '2px', 
                zIndex: 10,
                color: timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-amber)',
                fontWeight: 'bold',
                fontFamily: 'Space Grotesk, sans-serif'
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
                    gap: '6px'
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
