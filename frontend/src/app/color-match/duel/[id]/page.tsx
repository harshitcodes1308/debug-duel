'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Timer, Flame, Award, Swords, HelpCircle, 
  Send, AlertTriangle, Play, Sparkles, CheckCircle2,
  Palette, RefreshCw, LogOut, Flag
} from 'lucide-react';

interface Color {
  r: number;
  g: number;
  b: number;
}

export default function ColorMatchArena() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const { 
    user, setUser, currentDuel, setCurrentDuel, 
    fomoMessage, setFomo, opponentProgress,
    opponentSubmitted, setOpponentSubmitted
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'memorize' | 'guess' | 'submitted'>('memorize');
  const [opponentOffline, setOpponentOffline] = useState(false);
  
  // Color challenges state
  const [targetColorString, setTargetColorString] = useState<string>('rgb(0, 0, 0)');
  const [guessColor, setGuessColor] = useState<Color>({ r: 128, g: 128, b: 128 });
  const [hsvState, setHsvState] = useState({ h: 0, s: 0, v: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const hsvToRgb = (h: number, s: number, v: number) => {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else if (h >= 300 && h <= 360) {
      r = c; g = 0; b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    setGuessColor(prev => {
      const nextRgb = { ...prev, [channel]: value };
      const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
      setHsvState(nextHsv);
      return nextRgb;
    });
  };

  const handleColorSelection = (clientX: number, clientY: number, rect: DOMRect) => {
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    const distance = Math.sqrt(x * x + y * y);
    const maxRadius = rect.width / 2;
    const boundedDistance = Math.min(distance, maxRadius);
    const sVal = Math.round((boundedDistance / maxRadius) * 100);

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const hVal = Math.round(angle);

    setHsvState(prev => {
      const nextHsv = { ...prev, h: hVal, s: sVal };
      const nextRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
      setGuessColor(nextRgb);
      return nextHsv;
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    handleColorSelection(e.clientX, e.clientY, rect);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    handleColorSelection(e.touches[0].clientX, e.touches[0].clientY, rect);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const wheelEl = document.getElementById('color-wheel-container');
      if (!wheelEl) return;
      const rect = wheelEl.getBoundingClientRect();
      handleColorSelection(e.clientX, e.clientY, rect);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      e.preventDefault();
      const wheelEl = document.getElementById('color-wheel-container');
      if (!wheelEl) return;
      const rect = wheelEl.getBoundingClientRect();
      handleColorSelection(e.touches[0].clientX, e.touches[0].clientY, rect);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Timers
  const [phaseTimer, setPhaseTimer] = useState(6); // 6s for memorization, 30s for guess
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const resultHandledRef = useRef(false);

  // 1. Initial Load & Sync
  useEffect(() => {
    async function loadDuel() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        setTargetColorString(data.targetColor || 'rgb(128, 128, 128)');
        setCurrentDuel(data);
        setLoading(false);
      } catch (e) {
        console.error(e);
        router.push('/');
      }
    }
    loadDuel();
  }, [duelId]);

  // 2. Timer Tick Loop
  useEffect(() => {
    if (loading || !currentDuel) return;
    
    // Clear existing interval
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          if (gameState === 'memorize') {
            setGameState('guess');
            return 30; // 30 seconds for guessing
          } else if (gameState === 'guess') {
            // Auto submit when guess timer expires
            handleAutoSubmit();
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, currentDuel, gameState]);

  // 3. Socket Connection inside Arena
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

    // Opponent submitted guess alert
    socket.on('opponent_submitted', ({ message }) => {
      setOpponentSubmitted(true);
      setFomo(message || "Your opponent locked in their color guess! HURRY!", 95);
    });

    // Opponent forfeited
    socket.on('opponent_forfeited', (payload) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
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
      router.push(`/color-match/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Final result broadcast
    socket.on('duel_result', (payload) => {
      if (resultHandledRef.current) return;
      resultHandledRef.current = true;
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/color-match/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Opponent online/offline state sync
    socket.on('opponent_offline', ({ userId, offline }) => {
      if (userId !== user?.id) {
        setOpponentOffline(offline);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, duelId, loading]);

  // Auto-Submit current guess on timeout
  const handleAutoSubmit = () => {
    if (gameState !== 'guess') return;
    setGameState('submitted');
    
    if (socketRef.current) {
      socketRef.current.emit('submit_color_guess', {
        duelId,
        userId: user?.id,
        r: guessColor.r,
        g: guessColor.g,
        b: guessColor.b
      });
    }
  };

  // Manual Submit Guess
  const handleSubmitGuess = () => {
    if (gameState !== 'guess') return;
    setGameState('submitted');

    if (socketRef.current) {
      socketRef.current.emit('submit_color_guess', {
        duelId,
        userId: user?.id,
        r: guessColor.r,
        g: guessColor.g,
        b: guessColor.b
      });
    }

    // Wait for acknowledgment from socket
    socketRef.current?.once('color_guess_submitted', (result) => {
      if (result.success) {
        setScore(result.score);
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
    router.push(`/color-match/duel/${duelId}/result`);
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
        <h2>Entering Chromatic Arena...</h2>
      </div>
    );
  }

  const opponent = currentDuel.participants?.find(p => p.userId !== user?.id)?.user || { username: 'Opponent' };

  // Calculate coordinates for the dot indicator on the wheel
  const maxRadius = 90; // radius of the wheel (180px diameter)
  const xOffset = (hsvState.s / 100) * maxRadius * Math.cos((hsvState.h * Math.PI) / 180);
  const yOffset = (hsvState.s / 100) * maxRadius * Math.sin((hsvState.h * Math.PI) / 180);

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
          <Palette size={16} color="var(--accent-amber)" />
          <span>ColorMatch Battle Room</span>
        </div>

        <div className="flex-center" style={{
          gap: '8px',
          color: phaseTimer < 10 ? 'var(--accent-red)' : 'var(--text-primary)',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          <Timer size={18} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {gameState === 'memorize' ? `Memorize: ${phaseTimer}s` : `Guess Time: ${phaseTimer}s`}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Bet: </span>
          <strong style={{ color: 'var(--accent-amber)' }}>{currentDuel.betAmount} Tokens</strong>
        </div>
      </div>

      <div className="duel-page-grid">
        
        {/* Game Area */}
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}>
          
          {opponentOffline && (
            <div className="alert-priority-flash" style={{
              width: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
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
              fontFamily: 'JetBrains Mono, monospace',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} className="pulse-glow" style={{ color: 'var(--accent-red)' }} />
                <span>RIVAL DISCONNECTED! Auto-forfeit in progress, waiting 20s for reconnection...</span>
              </div>
              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>DISCONNECTED</span>
            </div>
          )}

          {/* ================= STATE 1: MEMORIZE ================= */}
          {gameState === 'memorize' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '480px', animation: 'fadeIn 0.3s ease-out' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 'bold', letterSpacing: '0.15em' }}>
                MEMORIZE THIS COLOR CARD
              </span>
              
              <div style={{
                width: '100%',
                height: '220px',
                backgroundColor: targetColorString,
                borderRadius: '16px',
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 12px 40px ${targetColorString.replace('rgb', 'rgba').replace(')', ', 0.4)')}`,
                transition: 'all 0.3s ease-in-out'
              }}>
                {/* Countdown circular SVG indicator */}
                <div style={{
                  position: 'relative',
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="rgba(0, 0, 0, 0.4)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="var(--accent-amber)"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(2 * Math.PI * 42) * (1 - phaseTimer / 6)}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
                        stroke: phaseTimer <= 2 ? 'var(--accent-red)' : 'var(--accent-amber)',
                      }}
                    />
                  </svg>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    fontFamily: 'Rajdhani, sans-serif',
                    color: phaseTimer <= 2 ? 'var(--accent-red)' : '#fff',
                    transition: 'color 0.3s',
                    zIndex: 1
                  }}>
                    {phaseTimer}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STATE 2: GUESS ================= */}
          {gameState === 'guess' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '480px', animation: 'fadeIn 0.3s ease-out' }}>
              
              <div className="form-row-grid">
                {/* Target box (Hidden) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TARGET COLOR</span>
                  <div style={{
                    width: '100%',
                    height: '110px',
                    backgroundColor: '#141419',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <HelpCircle size={28} style={{ opacity: 0.4 }} />
                  </div>
                </div>
                
                {/* Guess box (Live Preview with dynamic glow shadow) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>YOUR GUESS</span>
                  <div style={{
                    width: '100%',
                    height: '110px',
                    backgroundColor: `rgb(${guessColor.r}, ${guessColor.g}, ${guessColor.b})`,
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: `0 8px 30px rgba(${guessColor.r}, ${guessColor.g}, ${guessColor.b}, 0.35)`,
                    transition: 'background-color 0.05s ease-out, box-shadow 0.05s ease-out'
                  }} />
                </div>
              </div>

              {/* Controls Layout */}
              <div className="color-match-controls-grid">
                
                {/* Left Column: Redesigned Chromatic Donut Wheel */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>
                    COLOR WHEEL RING
                  </span>
                  
                  <div className="color-wheel-outer">
                    <div 
                      id="color-wheel-container"
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      className="color-wheel-dial"
                    >
                      {/* Selector indicator target reticle */}
                      <div 
                        className="color-wheel-pointer"
                        style={{
                          left: `calc(50% + ${xOffset}px)`,
                          top: `calc(50% + ${yOffset}px)`,
                        }}
                      >
                        <div className="color-wheel-pointer-inner" />
                      </div>
                    </div>
                    
                    {/* Clean donut mask in center */}
                    <div className="color-wheel-inner">
                      <span className="color-wheel-inner-label">HEX</span>
                      <span className="color-wheel-inner-value">
                        {rgbToHex(guessColor.r, guessColor.g, guessColor.b)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Clean Lightness Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>
                      BRIGHTNESS (VALUE)
                    </span>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={hsvState.v}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value);
                        setHsvState(prev => {
                          const nextHsv = { ...prev, v: newVal };
                          const nextRgb = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
                          setGuessColor(nextRgb);
                          return nextHsv;
                        });
                      }}
                      className="clean-slider"
                      style={{
                        cursor: 'pointer',
                        background: `linear-gradient(to right, #000000, rgb(${hsvToRgb(hsvState.h, hsvState.s, 100).r}, ${hsvToRgb(hsvState.h, hsvState.s, 100).g}, ${hsvToRgb(hsvState.h, hsvState.s, 100).b}))`,
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      <span>0%</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{hsvState.v}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: RGB Sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textAlign: 'center' }}>
                    RGB CHANNELS (FINE-TUNE)
                  </span>

                  {/* Red Channel Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>RED (R)</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-red)' }}>{guessColor.r}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={guessColor.r}
                      onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '12px',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        background: `linear-gradient(to right, rgb(0, ${guessColor.g}, ${guessColor.b}), rgb(255, ${guessColor.g}, ${guessColor.b}))`,
                        borderRadius: '6px',
                        outline: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        accentColor: 'var(--accent-red)'
                      }}
                    />
                  </div>

                  {/* Green Channel Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>GREEN (G)</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-green)' }}>{guessColor.g}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={guessColor.g}
                      onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '12px',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        background: `linear-gradient(to right, rgb(${guessColor.r}, 0, ${guessColor.b}), rgb(${guessColor.r}, 255, ${guessColor.b}))`,
                        borderRadius: '6px',
                        outline: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        accentColor: 'var(--accent-green)'
                      }}
                    />
                  </div>

                  {/* Blue Channel Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>BLUE (B)</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-blue)' }}>{guessColor.b}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={guessColor.b}
                      onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '12px',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        background: `linear-gradient(to right, rgb(${guessColor.r}, ${guessColor.g}, 0), rgb(${guessColor.r}, ${guessColor.g}, 255))`,
                        borderRadius: '6px',
                        outline: 'none',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        accentColor: 'var(--accent-blue)'
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================= STATE 3: SUBMITTED ================= */}
          {gameState === 'submitted' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
              <div className="pulse-glow" style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(0, 255, 148, 0.1)',
                border: '1px solid var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-green)'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '20px', color: '#fff' }}>Guess Locked In!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', lineHeight: '20px' }}>
                Your response has been submitted successfully. Waiting for your opponent to complete their color guess...
              </p>
            </div>
          )}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>@{opponent?.username || 'Opponent'}</span>
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
                  <span className="badge badge-js" style={{ fontSize: '9px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>SUBMITTED</span>
                ) : (
                  <span className="badge" style={{ fontSize: '9px', background: 'rgba(123, 147, 219, 0.15)', color: 'var(--accent-blue)', borderColor: 'rgba(123, 147, 219, 0.2)' }}>ONLINE</span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Estimate confidence</span>
                  <span style={{ fontWeight: 'bold' }}>{opponentProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${opponentProgress}%`,
                    height: '100%',
                    background: opponentSubmitted ? 'var(--accent-amber)' : 'linear-gradient(to right, var(--accent-blue), var(--accent-amber))',
                    borderRadius: '3px',
                    transition: 'width 0.8s ease-in-out'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* FOMO Ticker */}
          <div>
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Lobby Signals</h3>
            <div className="pulse-glow" style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              color: 'var(--accent-amber)',
              fontWeight: '500',
              lineHeight: 1.5,
              minHeight: '70px',
              display: 'flex',
              alignItems: 'center'
            }}>
              {fomoMessage}
            </div>
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
          style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Flag size={14} /> Forfeit Match
        </button>

        <button 
          onClick={handleSubmitGuess} 
          className="btn interactive-lift"
          style={{ padding: '10px 28px', fontSize: '15px', gap: '8px', background: 'var(--accent-amber)', borderColor: 'var(--accent-amber)', color: 'black', fontWeight: 'bold' }}
          disabled={gameState !== 'guess'}
        >
          <Play size={16} fill="black" color="black" /> 
          Lock In Guess
        </button>
      </div>

    </div>
  );
}
