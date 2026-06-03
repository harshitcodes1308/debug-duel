'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { io, Socket } from 'socket.io-client';
import { 
  ArrowLeft, Clock, AlertCircle, Sparkles, Trophy, 
  Coins, Check, Users, Brain, ShieldAlert, Award, Star
} from 'lucide-react';
import QuestionCard from '@/components/kbc/QuestionCard';
import PrizeLadder, { PRIZE_LADDER } from '@/components/kbc/PrizeLadder';
import LifelinesPanel, { LifelineState } from '@/components/kbc/LifelinesPanel';

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

export default function KbcMultiplayerGame() {
  const params = useParams();
  const roomCode = (params.roomCode as string).toUpperCase();
  const router = useRouter();
  const { user } = useStore();

  // Socket Connection Ref
  const socketRef = useRef<Socket | null>(null);

  // Match Engine States
  const [room, setRoom] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError] = useState('');

  // UI Selection States
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [lockedOptionIndex, setLockedOptionIndex] = useState<number | null>(null);
  
  // Round Outcome States
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [roundTickDown, setRoundTickDown] = useState<number | null>(null);

  // Lifelines
  const [fiftyFiftyEliminated, setFiftyFiftyEliminated] = useState<number[]>([]);
  const [pollData, setPollData] = useState<number[] | null>(null);
  const [expertMessage, setExpertMessage] = useState<string | null>(null);

  // Match Over Results
  const [gameEnded, setGameEnded] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [hostRewards, setHostRewards] = useState<any>(null);
  const [guestRewards, setGuestRewards] = useState<any>(null);

  // Disconnect Alert
  const [opponentOffline, setOpponentOffline] = useState(false);

  // Initialize socket
  useEffect(() => {
    if (!user || !roomCode) return;

    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('kbc_join_lobby', { roomCode, userId: user.id });

    // Initial state load
    socket.on('kbc_room_joined', ({ room: initialRoom, currentQuestion: initialQ }) => {
      setRoom(initialRoom);
      setCurrentQuestion(initialQ ? {
        ...initialQ,
        correctAnswer: -1,
        explanation: ''
      } : null);
      setTimeLeft(initialRoom.timeLeft);
      if (initialRoom.status === 'completed') {
        setGameEnded(true);
        setWinnerId(initialRoom.winnerId);
      }
    });

    // Room update events
    socket.on('kbc_room_updated', (updatedRoom) => {
      setRoom(updatedRoom);
      const isHost = updatedRoom.host.userId === user.id;
      const opp = isHost ? updatedRoom.guest : updatedRoom.host;
      if (opp) {
        setOpponentOffline(!opp.online);
      }
    });

    // Time ticker
    socket.on('kbc_timer_tick', ({ timeLeft: time }) => {
      setTimeLeft(time);
    });

    // Locked indicators
    socket.on('kbc_player_locked', ({ userId, username }) => {
      // Just refresh room details from backend
    });

    // Reconnect alerts
    socket.on('kbc_player_disconnected', ({ userId, username }) => {
      if (userId !== user.id) {
        setOpponentOffline(true);
      }
    });

    socket.on('kbc_player_reconnected', ({ userId, username }) => {
      if (userId !== user.id) {
        setOpponentOffline(false);
      }
    });

    socket.on('kbc_player_left', ({ userId, username }) => {
      if (userId !== user.id) {
        alert(`${username} has left the match permanently.`);
      }
    });

    // Lifeline triggers
    socket.on('kbc_lifeline_used', ({ userId, username, lifelineType, room: updatedRoom }) => {
      setRoom(updatedRoom);
    });

    socket.on('kbc_lifeline_result', ({ lifelineType, data }) => {
      if (lifelineType === 'fiftyFifty') {
        setFiftyFiftyEliminated(data);
        if (selectedOptionIndex !== null && data.includes(selectedOptionIndex)) {
          setSelectedOptionIndex(null);
        }
      } else if (lifelineType === 'audiencePoll') {
        setPollData(data);
      } else if (lifelineType === 'expertAdvice') {
        setExpertMessage(data);
      }
    });

    socket.on('kbc_question_skipped', ({ userWhoSkipped, question, room: updatedRoom }) => {
      setCurrentQuestion(question ? {
        ...question,
        correctAnswer: -1,
        explanation: ''
      } : null);
      setRoom(updatedRoom);
      
      // Reset lock options for skipped question
      setSelectedOptionIndex(null);
      setLockedOptionIndex(null);
      setFiftyFiftyEliminated([]);
      setPollData(null);
      setExpertMessage(null);

      alert(`Question swapped! @${userWhoSkipped} activated their SKIP lifeline.`);
    });

    // Round resolved trigger
    socket.on('kbc_round_resolved', ({ correctAnswer, explanation, hostResult, guestResult, room: updatedRoom }) => {
      setCorrectAnswerIndex(correctAnswer);
      setExplanationText(explanation);
      setRevealedAnswer(true);
      setRoom(updatedRoom);

      setCurrentQuestion(prev => {
        if (!prev) return null;
        return {
          ...prev,
          correctAnswer,
          explanation
        };
      });

      // Auto-lock option view for display consistency
      const isHost = updatedRoom.host.userId === user.id;
      const myResult = isHost ? hostResult : guestResult;
      const myLockedOpt = isHost ? updatedRoom.host.lockedOption : updatedRoom.guest.lockedOption;
      setLockedOptionIndex(myLockedOpt);

      // 7-second round resolved progression tick
      let count = 7;
      setRoundTickDown(count);
      const interval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          setRoundTickDown(null);
        } else {
          setRoundTickDown(count);
        }
      }, 1000);
    });

    // Next question trigger
    socket.on('kbc_next_question', ({ room: updatedRoom, question }) => {
      setRoom(updatedRoom);
      setCurrentQuestion(question ? {
        ...question,
        correctAnswer: -1,
        explanation: ''
      } : null);
      
      // Reset UI States
      setSelectedOptionIndex(null);
      setLockedOptionIndex(null);
      setRevealedAnswer(false);
      setCorrectAnswerIndex(null);
      setExplanationText('');
      setFiftyFiftyEliminated([]);
      setPollData(null);
      setExpertMessage(null);
      setRoundTickDown(null);
    });

    // End match trigger
    socket.on('kbc_game_ended', ({ room: updatedRoom, winnerId: winId, hostRewards: hr, guestRewards: gr }) => {
      setRoom(updatedRoom);
      setWinnerId(winId);
      setHostRewards(hr);
      setGuestRewards(gr);
      setGameEnded(true);

      // Clean timer ticks
      setRoundTickDown(null);
    });

    // Rematch triggers
    socket.on('kbc_rematch_started', (updatedRoom) => {
      setRoom(updatedRoom);
      setGameEnded(false);
      setWinnerId(null);
      setHostRewards(null);
      setGuestRewards(null);
      
      // Reset arena states
      setSelectedOptionIndex(null);
      setLockedOptionIndex(null);
      setRevealedAnswer(false);
      setCorrectAnswerIndex(null);
      setExplanationText('');
      setFiftyFiftyEliminated([]);
      setPollData(null);
      setExpertMessage(null);
      setRoundTickDown(null);
    });

    socket.on('kbc_error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, roomCode]);

  // Option select handler
  const handleSelectOption = (idx: number) => {
    setSelectedOptionIndex(idx);
  };

  // Lock answer handler (validated by server)
  const handleLockOption = () => {
    if (selectedOptionIndex === null || !socketRef.current) return;
    setLockedOptionIndex(selectedOptionIndex);
    socketRef.current.emit('kbc_lock_option', { roomCode, optionIndex: selectedOptionIndex });
  };

  // Lifelines handlers
  const handleUseLifeline = (type: keyof LifelineState) => {
    if (socketRef.current) {
      socketRef.current.emit('kbc_use_lifeline', { roomCode, lifelineType: type });
    }
  };

  // Rematch handler
  const handleRematch = () => {
    if (socketRef.current) {
      socketRef.current.emit('kbc_rematch', { roomCode });
    }
  };

  // Exit match
  const handleExitMatch = () => {
    if (socketRef.current) {
      socketRef.current.emit('kbc_leave', { roomCode });
    }
    router.push('/kbc');
  };

  if (!user || !room) return null;

  const isHost = room.host.userId === user.id;
  const me = isHost ? room.host : room.guest;
  const opponent = isHost ? room.guest : room.host;

  // Render game ended results view
  if (gameEnded) {
    const isWinner = winnerId === user.id;
    const isDraw = winnerId === null;
    const rewards = isHost ? hostRewards : guestRewards;

    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        color: '#FFF',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(20, 16, 40, 0.45)',
          borderColor: isWinner ? 'var(--accent-amber)' : isDraw ? 'var(--accent-blue)' : 'rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          padding: '36px',
          textAlign: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.2)'
        }}>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>

          {/* Trophy/Header Icons */}
          {isWinner ? (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(245, 166, 35, 0.1)',
              border: '2px solid var(--accent-amber)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(245, 166, 35, 0.3)'
            }}>
              <Trophy size={42} color="var(--accent-amber)" className="float-anim" />
            </div>
          ) : isDraw ? (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(74, 158, 255, 0.1)',
              border: '2px solid var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={42} color="var(--accent-blue)" />
            </div>
          ) : (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '2px solid var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldAlert size={42} color="var(--accent-red)" />
            </div>
          )}

          <div>
            <h1 style={{ fontSize: '32px', fontFamily: 'Space Grotesk, sans-serif' }}>
              {isWinner ? "Jackpot Winner!" : isDraw ? "It's a Perfect Draw!" : "Game Over"}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
              {isWinner 
                ? "You cleared more levels or locked correct answers faster!" 
                : isDraw 
                  ? "Both players matched scores and response times perfectly." 
                  : "Your opponent outplayed you this match!"}
            </p>
          </div>

          {/* Scores matchup card */}
          <div style={{
            width: '100%',
            background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>YOUR CLEARANCE</span>
              <strong style={{ fontSize: '20px', color: 'var(--accent-blue)', marginTop: '2px' }}>
                Lvl {me?.score} / 15
              </strong>
            </div>
            <div style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>vs</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>@{opponent?.username || "Opponent"}</span>
              <strong style={{ fontSize: '20px', color: 'var(--accent-purple)', marginTop: '2px' }}>
                Lvl {opponent?.score || 0} / 15
              </strong>
            </div>
          </div>

          {/* Speed tiebreaker details if applicable */}
          {me?.score === opponent?.score && opponent && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 16px', borderRadius: '6px', width: '100%', border: '1px solid rgba(255, 255, 255, 0.03)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} /> Speed tiebreaker: You took <strong>{Math.round(me.totalTimeTaken)}s</strong> total vs opponent&apos;s <strong>{Math.round(opponent.totalTimeTaken)}s</strong>.
            </div>
          )}

          {/* Tokens / Rewards display */}
          {rewards && (
            <div style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              justifyContent: 'center',
              marginTop: '8px'
            }}>
              <div className="flex-center" style={{ gap: '8px', background: rewards.tokenChange >= 0 ? 'rgba(0, 255, 148, 0.05)' : 'rgba(255, 68, 68, 0.05)', padding: '10px 20px', borderRadius: '8px', border: rewards.tokenChange >= 0 ? '1px solid rgba(0, 255, 148, 0.2)' : '1px solid rgba(255, 68, 68, 0.2)' }}>
                <Coins size={18} color={rewards.tokenChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
                <strong style={{ color: rewards.tokenChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '15px' }}>
                  {rewards.tokenChange >= 0 ? `+${rewards.tokenChange}` : `${rewards.tokenChange}`} Tokens
                </strong>
              </div>
              <div className="flex-center" style={{ gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Star size={18} color="var(--accent-blue)" />
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{isWinner ? "+1 Win" : "+0 Win"}</span>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
            <button
              onClick={handleRematch}
              className="btn btn-success"
              style={{
                flex: 1,
                background: 'var(--accent-amber)',
                color: '#000',
                fontWeight: 'bold',
                height: '44px',
                border: 'none'
              }}
            >
              Challenge Again (Rematch)
            </button>
            <button
              onClick={handleExitMatch}
              className="btn btn-secondary"
              style={{
                flex: 1,
                height: '44px'
              }}
            >
              Exit Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Spectator View Mode
  const isEliminated = me?.eliminated;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F32 0%, #0A0618 100%)',
      padding: '30px 24px',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px' }}>
        
        {/* Connection Failure banner */}
        {opponentOffline && (
          <div style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.3)', padding: '10px 16px', borderRadius: '8px', color: 'var(--accent-amber)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
            <span className="pulse-glow" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
            <span>Connection lost to opponent. Waiting 20s for reconnection...</span>
          </div>
        )}

        {/* Elimination Alert banner */}
        {isEliminated && (
          <div style={{ background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', fontWeight: 'bold' }}>
            <ShieldAlert size={18} />
            <span>You have been eliminated! Currently spectating @{opponent?.username || "opponent"}...</span>
          </div>
        )}

        {/* Dynamic Split Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '24px',
          alignItems: 'start'
        }}>
          
          {/* Main Gameplay Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={handleExitMatch} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', background: 'none', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                <ArrowLeft size={16} /> Quit Game
              </button>
              
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span>Level:</span>
                  <strong style={{ color: 'var(--accent-amber)' }}>{room.currentQuestionIndex + 1}/15</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span>Topic:</span>
                  <strong style={{ color: 'var(--accent-blue)' }}>{room.category}</strong>
                </div>
              </div>
            </div>

            {/* Arena Board: Timer + Question */}
            {currentQuestion ? (
              <div className="glass-panel" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                background: 'rgba(15, 11, 41, 0.4)',
                borderColor: 'rgba(245, 166, 35, 0.1)',
                padding: '36px',
                position: 'relative'
              }}>
                {/* Timer Circle */}
                <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="90" height="90" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                    <circle cx="45" cy="45" r="38" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                    <circle 
                      cx="45" 
                      cy="45" 
                      r="38" 
                      fill="transparent" 
                      stroke={timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-purple)'} 
                      strokeWidth="6" 
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={2 * Math.PI * 38 * (1 - timeLeft / 30)}
                      style={{
                        transition: 'stroke-dashoffset 1s linear',
                        filter: timeLeft <= 10 ? 'drop-shadow(0 0 5px rgba(255,68,68,0.5))' : 'none'
                      }}
                    />
                  </svg>
                  
                  <div className="flex-center" style={{ 
                    flexDirection: 'column', 
                    gap: '2px', 
                    zIndex: 10,
                    color: timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-purple)',
                    fontWeight: 'bold',
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '18px' }}>{timeLeft}s</span>
                  </div>
                </div>

                {/* Central Question renderer */}
                <QuestionCard 
                  question={currentQuestion}
                  selectedOptionIndex={selectedOptionIndex}
                  lockedOptionIndex={lockedOptionIndex}
                  revealedAnswer={revealedAnswer}
                  eliminatedOptionIndices={fiftyFiftyEliminated}
                  onSelectOption={handleSelectOption}
                  onLockOption={handleLockOption}
                  disabled={isEliminated || lockedOptionIndex !== null || revealedAnswer}
                />

                {/* Auto-advance notification banner */}
                {revealedAnswer && roundTickDown !== null && (
                  <div style={{
                    width: '100%',
                    background: 'rgba(0, 255, 148, 0.04)',
                    border: '1px solid rgba(0, 255, 148, 0.15)',
                    borderRadius: '8px',
                    padding: '20px',
                    marginTop: '12px',
                    textAlign: 'left'
                  }}>
                    <h4 style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Explanation
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '20px', marginTop: '6px' }}>
                      {explanationText}
                    </p>
                    
                    <div style={{
                      marginTop: '14px',
                      fontSize: '13px',
                      color: 'var(--accent-amber)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'flex-end',
                      fontWeight: 'bold'
                    }}>
                      <Clock size={14} />
                      Next question loading in {roundTickDown}s...
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Waiting for KBC question set generation...
              </div>
            )}

            {/* Lifelines board */}
            <div className="glass-panel" style={{ background: 'rgba(13, 9, 36, 0.4)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <LifelinesPanel 
                usedLifelines={me?.lifelines || { fiftyFifty: false, audiencePoll: false, expertAdvice: false, skip: false }}
                onUseLifeline={handleUseLifeline}
                disabled={isEliminated || lockedOptionIndex !== null || revealedAnswer}
                correctAnswerIndex={correctAnswerIndex || 0}
                options={currentQuestion?.options || []}
                explanation={explanationText || currentQuestion?.question || ''}
              />
            </div>

          </div>

          {/* Sidebar Area: Live Progress & Opponent Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '100px' }}>
            
            {/* Live Progress Ladder */}
            <PrizeLadder currentStepIndex={room.currentQuestionIndex} />

            {/* Live Opponent Tracker */}
            <div className="glass-panel" style={{
              background: 'rgba(20, 16, 40, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                MATCH PLAYERS STATUS
              </h4>

              {/* Me Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-blue)' }}>@You</span>
                  <span style={{ fontSize: '11px', color: me?.eliminated ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 'bold' }}>
                    {me?.eliminated ? "ELIMINATED" : "PLAYING"}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>Cleared Lvl:</span>
                  <strong style={{ color: '#FFF' }}>{me?.score}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Answer Lock:</span>
                  <strong style={{ color: me?.isLocked ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                    {me?.isLocked ? "LOCKED" : "PENDING"}
                  </strong>
                </div>
              </div>

              {/* Opponent Stats */}
              {opponent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-purple)' }}>@{opponent.username}</span>
                    <span style={{ fontSize: '11px', color: opponent.eliminated ? 'var(--accent-red)' : opponent.online ? 'var(--accent-green)' : 'var(--accent-amber)', fontWeight: 'bold' }}>
                      {opponent.eliminated ? "ELIMINATED" : opponent.online ? "PLAYING" : "OFFLINE"}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>Cleared Lvl:</span>
                    <strong style={{ color: '#FFF' }}>{opponent.score}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Answer Lock:</span>
                    <strong style={{ color: opponent.isLocked ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                      {opponent.isLocked ? "LOCKED" : "PENDING"}
                    </strong>
                  </div>

                  {/* Opponent Lifelines tracker */}
                  <div style={{
                    marginTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    paddingTop: '8px'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>OPPONENT LIFELINES:</span>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-around' }}>
                      <span style={{ fontSize: '11px', color: opponent.lifelines.fiftyFifty ? 'var(--accent-red)' : 'var(--accent-green)', textDecoration: opponent.lifelines.fiftyFifty ? 'line-through' : 'none' }}>50:50</span>
                      <span style={{ fontSize: '11px', color: opponent.lifelines.audiencePoll ? 'var(--accent-red)' : 'var(--accent-green)', textDecoration: opponent.lifelines.audiencePoll ? 'line-through' : 'none' }}>Aud</span>
                      <span style={{ fontSize: '11px', color: opponent.lifelines.expertAdvice ? 'var(--accent-red)' : 'var(--accent-green)', textDecoration: opponent.lifelines.expertAdvice ? 'line-through' : 'none' }}>Exp</span>
                      <span style={{ fontSize: '11px', color: opponent.lifelines.skip ? 'var(--accent-red)' : 'var(--accent-green)', textDecoration: opponent.lifelines.skip ? 'line-through' : 'none' }}>Skip</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px' }}>
                  No opponent registered in room.
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
