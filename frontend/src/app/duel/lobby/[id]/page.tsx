'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore, Participant } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Copy, Check, Users, ShieldAlert, Zap, ArrowLeft } from 'lucide-react';

const MOCK_PROFILES = [
  { username: 'stack_overflow', color: 'var(--accent-blue)' },
  { username: 'caffeine_dev', color: 'var(--accent-purple)' },
  { username: 'debugger_x', color: 'var(--accent-amber)' },
  { username: 'bug_slayer', color: 'var(--accent-red)' },
  { username: 'binary_beast', color: 'var(--accent-green)' },
  { username: 'byte_bandit', color: '#ff6b6b' },
  { username: 'curly_brackets', color: '#4ecdc4' },
  { username: 'sudo_solve', color: '#ffe66d' }
];

const playSound = (type: 'tick' | 'match' | 'countdown') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    switch (type) {
      case 'tick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
        break;
      }
      case 'match': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
        break;
      }
      case 'countdown': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        break;
      }
    }
  } catch (e) {
    console.warn(e);
  }
};

export default function DuelLobby() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const { user, setCurrentDuel, resetDuelState } = useStore();
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('waiting');
  const [error, setError] = useState('');
  
  // Spinning Slot Machine states
  const [mockIndex, setMockIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [realOpponent, setRealOpponent] = useState<any>(null);
  const [activeOpponent, setActiveOpponent] = useState<any>(null);
  const [receivedCountdown, setReceivedCountdown] = useState<number | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [standbyCountdown, setStandbyCountdown] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !duelId) return;

    resetDuelState();

    const socket = io('http://localhost:5001', { forceNew: true });
    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit('join_duel', { duelId, userId: user.id });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on('connect', handleConnect);

    socket.on('lobby_update', ({ participants: newParticipants, status: newStatus }) => {
      setParticipants(newParticipants);
      setStatus(newStatus);
    });

    socket.on('countdown_started', ({ duration }) => {
      setReceivedCountdown(duration);
      setReceivedAt(Date.now());
    });

    socket.on('duel_started', ({ bug }) => {
      setCurrentDuel({
        id: duelId as string,
        bugId: bug.id,
        bug,
        status: 'active',
        betAmount: 50,
        language: bug.language,
        difficulty: bug.difficulty,
        participants: participants
      });
      router.push(`/duel/${duelId}`);
    });

    socket.on('error_message', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, duelId]);

  // Spinning Reel effect
  useEffect(() => {
    if (!isSpinning) return;
    
    let delay = 150;
    let timerId: NodeJS.Timeout;
    
    const tick = () => {
      setMockIndex((prev) => (prev + 1) % MOCK_PROFILES.length);
      playSound('tick');
      
      if (realOpponent) {
        delay += 100;
        if (delay >= 600) {
          setIsSpinning(false);
          setActiveOpponent(realOpponent);
          playSound('match');
          return;
        }
      }
      
      timerId = setTimeout(tick, delay);
    };
    
    timerId = setTimeout(tick, delay);
    return () => clearTimeout(timerId);
  }, [isSpinning, realOpponent]);

  // Sync real opponent
  useEffect(() => {
    const opp = participants.find((p: any) => p.userId !== user?.id);
    if (opp) {
      setRealOpponent(opp);
    } else {
      setRealOpponent(null);
      setIsSpinning(true);
      setActiveOpponent(null);
      setStandbyCountdown(null);
      setShowOverlay(false);
      setCountdown(null);
      setReceivedCountdown(null);
      setReceivedAt(null);
    }
  }, [participants, user?.id]);

  // Standby name reveal effect (glowing card banner countdown for 3 seconds)
  useEffect(() => {
    if (!isSpinning && realOpponent && standbyCountdown === null && !showOverlay) {
      setStandbyCountdown(3);
      const interval = setInterval(() => {
        setStandbyCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setShowOverlay(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSpinning, realOpponent, showOverlay]);

  // Local countdown starting after the overlay is triggered
  useEffect(() => {
    if (showOverlay && receivedCountdown !== null && receivedAt !== null && countdown === null) {
      const elapsed = (Date.now() - receivedAt) / 1000;
      // Calculate remaining time for the 12-second total duration
      const remaining = Math.max(1, Math.round(receivedCountdown - elapsed - 0.5));

      let localTimer = remaining;
      setCountdown(localTimer);
      playSound('countdown');

      const interval = setInterval(() => {
        localTimer -= 1;
        if (localTimer <= 0) {
          clearInterval(interval);
          setCountdown(0);
        } else {
          setCountdown(localTimer);
          playSound('countdown');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showOverlay, receivedCountdown, receivedAt]);

  // Fetch initial details
  const [duelDetails, setDuelDetails] = useState<any>(null);
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (res.ok) {
          const data = await res.json();
          setDuelDetails(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchDetails();
  }, [duelId, participants]);

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/duel/lobby/${duelId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  const opponent = participants.find((p: any) => p.userId !== user.id);
  const host = participants.find((p: any) => p.userId === user.id) || { user };

  return (
    <div className="container" style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)', justifyContent: 'center' }}>
      
      {showOverlay && countdown !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(13, 13, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          fontFamily: 'Space Grotesk, sans-serif'
        }}>
          <span style={{ fontSize: '14px', color: 'var(--accent-blue)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px' }}>MATCH READY. INITIATING...</span>
          <h1 style={{
            fontSize: '120px',
            color: countdown === 0 ? 'var(--accent-green)' : 'var(--text-primary)',
            textShadow: countdown === 0 ? '0 0 40px rgba(0, 255, 148, 0.4)' : '0 0 20px rgba(255,255,255,0.1)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {countdown === 0 ? "FIGHT!" : countdown}
          </h1>
        </div>
      )}

      <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div className="logo pulse-glow" style={{ fontSize: '24px', justifyContent: 'center', marginBottom: '8px' }}>Lobby Room</div>
          {duelDetails && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span className="badge badge-js" style={{
                color: duelDetails.language === 'javascript' ? 'var(--accent-amber)' : duelDetails.language === 'python' ? 'var(--accent-blue)' : 'var(--accent-red)',
                borderColor: duelDetails.language === 'javascript' ? 'rgba(245, 166, 35, 0.2)' : duelDetails.language === 'python' ? 'rgba(74, 158, 255, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                background: 'rgba(255,255,255,0.01)'
              }}>
                {duelDetails.language}
              </span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>Difficulty: {duelDetails.difficulty}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{duelDetails.betAmount} Tokens Bet</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--accent-red)',
            fontSize: '13px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {error}
            <div style={{ marginTop: '8px' }}>
              <Link href="/" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>Back Home</Link>
            </div>
          </div>
        )}

        {realOpponent && !isSpinning && standbyCountdown !== null && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            padding: '16px',
            color: 'var(--accent-blue)',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '16px',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)'
          }}>
            ⚡ COMBATANTS LOCKED IN! DUEL BEGINS IN {standbyCountdown}...
          </div>
        )}

        <div className="matchup-grid">
          
          {/* Host Player */}
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {host.user.username[0].toUpperCase()}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>@{host.user.username}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Host • {host.user.rank}</div>
            </div>
          </div>

          {/* VS Divider */}
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 'bold',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            background: 'rgba(255,255,255,0.04)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}>VS</div>
          {/* Opponent Player */}
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.02)',
            borderStyle: 'solid',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px',
            borderColor: activeOpponent && !isSpinning ? 'var(--border)' : 'var(--accent-purple)',
            boxShadow: activeOpponent && !isSpinning ? 'none' : '0 0 15px rgba(139, 92, 246, 0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}>
            {isSpinning && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent-purple), transparent)',
                animation: 'scannerLine 2s infinite linear'
              }}>
                <style>{`
                  @keyframes scannerLine {
                    0% { transform: translateY(0); opacity: 0.2; }
                    50% { transform: translateY(140px); opacity: 0.8; }
                    100% { transform: translateY(0); opacity: 0.2; }
                  }
                `}</style>
              </div>
            )}

            {activeOpponent && !isSpinning ? (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)'
                }}>
                  {activeOpponent.user.username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--accent-green)' }}>@{activeOpponent.user.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Opponent • {activeOpponent.user.rank}</div>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: MOCK_PROFILES[mockIndex].color,
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.1s ease',
                  opacity: 0.6
                }}>
                  {MOCK_PROFILES[mockIndex].username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'center', opacity: 0.8 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    @{MOCK_PROFILES[mockIndex].username}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {realOpponent ? "LOCKING IN MATCH..." : "WAITING FOR FRIEND..."}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Invite Link copy */}
        {!realOpponent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>INVITE YOUR FRIEND</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/duel/lobby/${duelId}`}
                style={{
                  flex: 1,
                  background: '#141419',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  fontSize: '13px'
                }}
                onClick={handleCopyLink}
              />
              <button
                className="btn btn-primary"
                onClick={handleCopyLink}
                style={{ gap: '6px', padding: '12px 16px', background: copied ? 'var(--accent-green)' : 'var(--accent-blue)', color: 'black' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Send this link to anyone. When they click it, they will join the battle instantly.
            </p>
          </div>
        )}

        {/* Back Link */}
        {!realOpponent && (
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '14px',
            alignSelf: 'center',
            marginTop: '8px'
          }}>
            <ArrowLeft size={16} /> Leave Lobby
          </Link>
        )}

      </div>
    </div>
  );
}
