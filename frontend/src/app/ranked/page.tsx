'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { 
  ArrowLeft, Swords, Shield, Trophy, Crown, 
  Flame, Clock, Users, Play, X, TrendingUp, AlertTriangle
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import RankedProgressWidget from '@/components/RankedProgressWidget';

export default function RankedHub() {
  const { user } = useStore();
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [seasonStats, setSeasonStats] = useState<any>(null);
  const [loadingSeason, setLoadingSeason] = useState(true);

  // Queue state
  const [selectedGame, setSelectedGame] = useState<'debug' | 'color_match' | 'kbc'>('debug');
  const [selectedLang, setSelectedLang] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [queueStatus, setQueueStatus] = useState<'idle' | 'searching' | 'match_found' | 'accepted'>('idle');
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState('0:45');
  const [queueSize, setQueueSize] = useState(1);
  const [matchFoundDetails, setMatchFoundDetails] = useState<any>(null);
  const [matchSeconds, setMatchSeconds] = useState(15);
  const [queueError, setQueueError] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const queueTimerRef = useRef<any>(null);
  const matchTimerRef = useRef<any>(null);

  // Sound helpers
  const playSound = (type: 'found' | 'start' | 'tick' | 'cancel') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const now = ctx.currentTime;
      if (type === 'found') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(783.99, now + 0.15); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.4);
      } else if (type === 'start') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440.00, now);
        osc.frequency.setValueAtTime(880.00, now + 0.1);
        osc.frequency.setValueAtTime(1760.00, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.5);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.08);
      } else if (type === 'cancel') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(329.63, now); // E4
        osc.frequency.setValueAtTime(220.00, now + 0.15); // A3
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Fetch season & stats
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [seasonRes, statsRes] = await Promise.all([
          fetch('http://localhost:5001/api/season/active'),
          fetch(`http://localhost:5001/api/season/stats/${user.username}`)
        ]);

        if (seasonRes.ok) setActiveSeason(await seasonRes.json());
        if (statsRes.ok) setSeasonStats(await statsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSeason(false);
      }
    }
    loadData();
  }, [user]);

  // Socket setup
  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('register_user', { userId: user.id });

    // Queue Sockets listeners
    socket.on('ranked_queue_joined', ({ gameType, elo }) => {
      setQueueStatus('searching');
      setQueueSeconds(0);
      setQueueError('');
      
      // Start queue elapsed timer
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      queueTimerRef.current = setInterval(() => {
        setQueueSeconds(prev => prev + 1);
      }, 1000);
    });

    socket.on('ranked_queue_status', ({ elapsedSeconds, queueSize }) => {
      setQueueSize(queueSize || 1);
      // Adjust estimated wait dynamically or statically
      if (elapsedSeconds > 45) {
        setEstimatedWait('1:15');
      } else {
        setEstimatedWait('0:45');
      }
    });

    socket.on('ranked_queue_error', ({ message }) => {
      setQueueError(message || "Matchmaking queue error");
      setQueueStatus('idle');
      playSound('cancel');
    });

    // Match Found
    socket.on('ranked_match_found', (data) => {
      // Clear queue timer
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      
      setQueueStatus('match_found');
      setMatchFoundDetails(data);
      setMatchSeconds(data.timeoutSeconds || 15);
      playSound('found');

      // Start accept countdown timer
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      matchTimerRef.current = setInterval(() => {
        setMatchSeconds(prev => {
          if (prev <= 1) {
            clearInterval(matchTimerRef.current);
            return 0;
          }
          if (prev <= 5) playSound('tick');
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('ranked_match_requeued', ({ reason }) => {
      setQueueStatus('searching');
      setMatchFoundDetails(null);
      setQueueSeconds(0);
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      
      // Re-trigger queue elapsed timer
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      queueTimerRef.current = setInterval(() => {
        setQueueSeconds(prev => prev + 1);
      }, 1000);
    });

    socket.on('ranked_match_cancelled', ({ reason }) => {
      setQueueStatus('idle');
      setMatchFoundDetails(null);
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      playSound('cancel');
    });

    // Match Start (redirect)
    socket.on('ranked_match_start', (payload) => {
      playSound('start');
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);

      // Redirect to the appropriate arena
      setTimeout(() => {
        if (payload.gameType === 'kbc') {
          window.location.href = `/kbc/multiplayer/lobby/${payload.roomCode}`;
        } else if (payload.gameType === 'color_match') {
          window.location.href = `/color-match/duel/${payload.duelId}`;
        } else {
          // Debug Duel
          window.location.href = `/duel/lobby/${payload.duelId}`;
        }
      }, 1000);
    });

    return () => {
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      if (matchTimerRef.current) clearInterval(matchTimerRef.current);
      socket.disconnect();
    };
  }, [user]);

  // Queue Handlers
  const handleJoinQueue = () => {
    if (!socketRef.current || !user) return;
    setQueueError('');
    socketRef.current.emit('ranked_queue_join', {
      userId: user.id,
      username: user.username,
      gameType: selectedGame,
      language: selectedLang
    });
  };

  const handleLeaveQueue = () => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit('ranked_queue_leave', { userId: user.id });
    setQueueStatus('idle');
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    playSound('cancel');
  };

  const handleAcceptMatch = () => {
    if (!socketRef.current || !user || !matchFoundDetails) return;
    setQueueStatus('accepted');
    socketRef.current.emit('ranked_match_accept', {
      matchId: matchFoundDetails.matchId,
      userId: user.id
    });
  };

  const handleDeclineMatch = () => {
    if (!socketRef.current || !user || !matchFoundDetails) return;
    socketRef.current.emit('ranked_match_decline', {
      matchId: matchFoundDetails.matchId,
      userId: user.id
    });
    setQueueStatus('idle');
    setMatchFoundDetails(null);
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Back to Dashboard Link */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        alignSelf: 'flex-start'
      }} className="btn-ghost">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '2px solid var(--accent-purple)',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 0 16px rgba(139, 92, 246, 0.2)'
          }}>
            <Swords size={28} color="var(--accent-purple)" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: '#fff', margin: 0 }}>
              Ranked Arena
            </h1>
            {activeSeason && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Active Season: <strong style={{ color: 'var(--accent-blue)' }}>{activeSeason.name}</strong> • {activeSeason.countdown}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        {/* Left Column: Queue controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', fontFamily: 'Space Grotesk' }}>
              Select Ranked Mode
            </h2>

            {queueStatus === 'idle' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Game mode selector cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Debug Duel Ranked option */}
                  <div 
                    onClick={() => setSelectedGame('debug')}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: selectedGame === 'debug' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      border: `1.5px solid ${selectedGame === 'debug' ? 'var(--accent-blue)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>Debug Duel Ranked</h4>
                      <Shield size={16} color="var(--accent-blue)" />
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px' }}>
                      1v1 syntax and logic debugging challenge.
                    </p>
                  </div>

                  {/* Color Match Ranked option */}
                  <div 
                    onClick={() => setSelectedGame('color_match')}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: selectedGame === 'color_match' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      border: `1.5px solid ${selectedGame === 'color_match' ? 'var(--accent-amber)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>Color Match Ranked</h4>
                      <Shield size={16} color="var(--accent-amber)" />
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px' }}>
                      Test your RGB memorization and precision.
                    </p>
                  </div>

                  {/* KBC Ranked option */}
                  <div 
                    onClick={() => setSelectedGame('kbc')}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: selectedGame === 'kbc' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.01)',
                      border: `1.5px solid ${selectedGame === 'kbc' ? 'var(--accent-purple)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontWeight: 'bold', color: '#fff' }}>KBC Quiz Ranked</h4>
                      <Shield size={16} color="var(--accent-purple)" />
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px' }}>
                      Fast-paced technical trivia faceoff.
                    </p>
                  </div>

                </div>

                {/* Sub-language selector for Debug Duel */}
                {selectedGame === 'debug' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Select Code Language</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['javascript', 'python', 'java'].map((lang: any) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLang(lang)}
                          className={`btn ${selectedLang === lang ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, border: 'none', height: '38px', fontSize: '12px', textTransform: 'capitalize' }}
                        >
                          {lang === 'javascript' ? 'JavaScript' : lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Queue join error */}
                {queueError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <AlertTriangle size={14} /> {queueError}
                  </div>
                )}

                {/* Start Queue Matchmaking button */}
                <button 
                  onClick={handleJoinQueue}
                  className="btn btn-success interactive-lift"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px', fontSize: '15px', fontWeight: 'bold', gap: '10px', marginTop: '8px' }}
                >
                  <Play size={16} fill="currentColor" /> Find Ranked Match
                </button>
              </div>
            ) : (
              /* Searching state UI */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', gap: '20px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    border: '3px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: '50%'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    border: '3px solid transparent',
                    borderTopColor: 'var(--accent-blue)',
                    borderRadius: '50%',
                    animation: 'spin 1.2s linear infinite'
                  }} />
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-blue)'
                  }}>
                    <Swords size={28} />
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                    Searching for Rivals...
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Queue: <span style={{ textTransform: 'capitalize', color: '#fff', fontWeight: '600' }}>{selectedGame}</span>{' '}
                    {selectedGame === 'debug' && `(${selectedLang.toUpperCase()})`}
                  </p>
                </div>

                {/* Matchmaking metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 0'
                }}>
                  <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Time</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', marginTop: '4px', fontFamily: 'Space Grotesk' }}>
                      {formatTime(queueSeconds)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Est. Wait</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-amber)', marginTop: '4px', fontFamily: 'Space Grotesk' }}>
                      {estimatedWait}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>In Queue</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-blue)', marginTop: '4px', fontFamily: 'Space Grotesk' }}>
                      {queueSize}
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  Expanding search ELO range over time (+50 every 5s)...
                </p>

                <button 
                  onClick={handleLeaveQueue}
                  className="btn btn-secondary interactive-lift"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', fontSize: '13px', width: '150px', gap: '6px' }}
                >
                  <X size={14} /> Cancel Search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player standing and stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Dynamic Rank Progress Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Current Standing
            </span>
            <RankedProgressWidget 
              rank={user.currentRank || "Bronze III"} 
              rp={user.rankPoints || 0}
              showDetails={true}
            />
          </div>

          {/* Seasonal Stats details */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Space Grotesk' }}>
              Season Performance
            </h3>

            {loadingSeason ? (
              <div className="skeleton-box" style={{ width: '100%', height: '100px' }} />
            ) : seasonStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ranked Matches</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', fontFamily: 'Space Grotesk' }}>
                    {seasonStats.matchesPlayed}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Win Rate</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'Space Grotesk' }}>
                    {seasonStats.winRate}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Wins</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                    {seasonStats.wins} W
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Losses</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                    {seasonStats.losses} L
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Peak Rank This Season</span>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                    {seasonStats.peakRank}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                No ranked stats recorded yet. Play a match to log stats!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL SCREEN MATCH ACCEPTANCE DIALOG OVERLAY */}
      {(queueStatus === 'match_found' || queueStatus === 'accepted') && matchFoundDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(9, 9, 13, 0.95)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          
          <div style={{
            background: 'rgba(20, 20, 28, 0.8)',
            border: '2px solid var(--accent-blue)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.25)',
            borderRadius: '24px',
            padding: '40px 32px',
            width: '100%',
            maxWidth: '440px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            fontFamily: 'Inter, sans-serif'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1.5px solid var(--accent-blue)',
                padding: '16px',
                borderRadius: '50%',
                color: 'var(--accent-blue)',
                marginBottom: '16px',
                animation: 'pulseGlow 2s infinite'
              }}>
                <Swords size={36} />
              </div>
              <style>{`
                @keyframes pulseGlow {
                  0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(59, 130, 246, 0.1); }
                  50% { transform: scale(1.05); box-shadow: 0 0 24px rgba(59, 130, 246, 0.4); }
                }
              `}</style>
              <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', color: '#fff', margin: '0 0 8px 0' }}>
                MATCH FOUND!
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                Rival matched: <strong style={{ color: 'var(--accent-blue)' }}>@{matchFoundDetails.opponentUsername}</strong>
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Mode: <span style={{ textTransform: 'capitalize', color: '#fff', fontWeight: 'bold' }}>{matchFoundDetails.gameType}</span>{' '}
                {matchFoundDetails.gameType === 'debug' && `(${matchFoundDetails.language.toUpperCase()})`}
              </p>
            </div>

            {/* Accept Timer countdown circle */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: `3px solid ${queueStatus === 'accepted' ? 'var(--accent-green)' : 'var(--accent-amber)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'Space Grotesk'
              }}>
                {queueStatus === 'accepted' ? (
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-green)', textTransform: 'uppercase' }}>Ready</span>
                ) : (
                  <>
                    <span style={{ fontSize: '26px', fontWeight: 'bold' }}>{matchSeconds}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '-2px' }}>secs</span>
                  </>
                )}
              </div>
            </div>

            {queueStatus === 'accepted' ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                Waiting for the opponent to accept the match...
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <button
                  onClick={handleAcceptMatch}
                  className="btn btn-success interactive-lift"
                  style={{ flex: 2, height: '48px', fontSize: '15px', fontWeight: 'bold' }}
                >
                  Accept Match
                </button>
                <button
                  onClick={handleDeclineMatch}
                  className="btn btn-secondary interactive-lift"
                  style={{ flex: 1, height: '48px', fontSize: '15px', fontWeight: 'bold' }}
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
