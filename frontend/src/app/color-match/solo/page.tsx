'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { ArrowLeft, RotateCcw, Trophy, Zap, Award, Sparkles, AlertCircle, Palette } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Color {
  r: number;
  g: number;
  b: number;
}

export default function ColorMatchSolo() {
  const { user } = useStore();
  const [gameState, setGameState] = useState<'idle' | 'memorize' | 'guess' | 'result'>('idle');
  const [targetColor, setTargetColor] = useState<Color>({ r: 0, g: 0, b: 0 });
  const [guessColor, setGuessColor] = useState<Color>({ r: 128, g: 128, b: 128 });
  const [hsvState, setHsvState] = useState({ h: 0, s: 0, v: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [score, setScore] = useState<number | null>(null);
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('dd_colormatch_highscore');
    if (saved) {
      setHighScore(parseInt(saved));
    }
  }, []);

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
      e.preventDefault(); // Prevent page scroll on touch drag
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

  const generateRandomColor = () => {
    return {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256)
    };
  };

  const startNewGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const nextColor = generateRandomColor();
    setTargetColor(nextColor);
    setGuessColor({ r: 128, g: 128, b: 128 });
    setHsvState({ h: 0, s: 0, v: 50 });
    setCountdown(6);
    setScore(null);
    setGameState('memorize');

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('guess');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmitGuess = () => {
    // Calculate Euclidean distance
    const rDiff = guessColor.r - targetColor.r;
    const gDiff = guessColor.g - targetColor.g;
    const bDiff = guessColor.b - targetColor.b;
    
    const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    const maxDistance = Math.sqrt(255 * 255 * 3); // ~441.67
    
    const finalScore = Math.max(0, Math.round(1000 * (1 - distance / maxDistance)));
    setScore(finalScore);
    setGameState('result');

    // Trigger confetti if score is high
    if (finalScore >= 920) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // Save high score
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('dd_colormatch_highscore', finalScore.toString());
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'result' || score === null) {
      setAnimatedScore(0);
      return;
    }
    
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return;
    }

    const duration = 1200; // 1.2s count up
    const startTime = performance.now();

    let animId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad
      
      setAnimatedScore(Math.round(easeProgress * end));

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, score]);

  const rgbString = (c: Color) => `rgb(${c.r}, ${c.g}, ${c.b})`;

  // Calculate coordinates for the dot indicator on the wheel
  const maxRadius = 90; // radius of the wheel (180px diameter)
  const xOffset = (hsvState.s / 100) * maxRadius * Math.cos((hsvState.h * Math.PI) / 180);
  const yOffset = (hsvState.s / 100) * maxRadius * Math.sin((hsvState.h * Math.PI) / 180);

  return (
    <div className="container" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)', justifyContent: 'center' }}>
      
      {/* Back to Dashboard */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        alignSelf: 'flex-start',
        marginBottom: '24px'
      }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '28px', padding: '32px' }}>
        
        {/* Title / Info Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={24} color="var(--accent-amber)" /> ColorMatch Solo
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
              Train your eye to guess color codes in RGB
            </p>
          </div>
          <div style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.2)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={16} color="var(--accent-amber)" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-amber)' }}>Best: {highScore}</span>
          </div>
        </div>

        {/* ================= STATE 1: IDLE / START ================= */}
        {gameState === 'idle' && (
          <div style={{ textAlign: 'center', padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="float-anim" style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-amber)', marginBottom: '8px' }}>
              <Palette size={64} />
            </div>
            <h3 style={{ fontSize: '18px' }}>Ready to test your visual memory?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', lineHeight: '20px' }}>
              You will be shown a target color for 6 seconds. Once it disappears, match it as closely as possible using the Red, Green, and Blue sliders.
            </p>
            <button
              className="btn interactive-lift"
              style={{
                width: '100%',
                maxWidth: '240px',
                height: '48px',
                fontWeight: 'bold',
                background: 'var(--accent-amber)',
                borderColor: 'var(--accent-amber)',
                color: 'black'
              }}
              onClick={startNewGame}
            >
              Start Match
            </button>
          </div>
        )}

        {/* ================= STATE 2: MEMORIZE ================= */}
        {gameState === 'memorize' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              Memorize this color!
            </div>
            
            {/* Color card */}
            <div style={{
              width: '100%',
              height: '240px',
              backgroundColor: rgbString(targetColor),
              borderRadius: '16px',
              boxShadow: `0 12px 40px rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.4)`,
              border: '2px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
                    strokeDashoffset={(2 * Math.PI * 42) * (1 - countdown / 6)}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
                      stroke: countdown <= 2 ? 'var(--accent-red)' : 'var(--accent-amber)',
                    }}
                  />
                </svg>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  fontFamily: 'Space Grotesk, sans-serif',
                  color: countdown <= 2 ? 'var(--accent-red)' : '#fff',
                  transition: 'color 0.3s',
                  zIndex: 1
                }}>
                  {countdown}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 3: GUESS ================= */}
        {gameState === 'guess' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 'bold', letterSpacing: '0.1em', textAlign: 'center' }}>
              Recreate the color!
            </div>

            {/* Comparison boxes */}
            <div className="form-row-grid">
              {/* Target box (Hidden) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TARGET COLOR</span>
                <div style={{
                  width: '100%',
                  height: '120px',
                  backgroundColor: '#141419',
                  borderRadius: '12px',
                  border: '1px dashed var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <AlertCircle size={28} style={{ opacity: 0.5 }} />
                </div>
              </div>
              
              {/* Guess box (Live Preview with dynamic glow shadow) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>YOUR GUESS</span>
                <div style={{
                  width: '100%',
                  height: '120px',
                  backgroundColor: rgbString(guessColor),
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

            <button
              className="btn interactive-lift"
              style={{
                width: '100%',
                height: '48px',
                fontWeight: 'bold',
                marginTop: '10px',
                background: 'var(--accent-amber)',
                borderColor: 'var(--accent-amber)',
                color: 'black'
              }}
              onClick={handleSubmitGuess}
            >
              Submit Guess
            </button>
          </div>
        )}

        {/* ================= STATE 4: RESULT ================= */}
        {gameState === 'result' && score !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Score header */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)'
              }}>
                <Award size={32} />
              </div>
              <h2 style={{ fontSize: '32px', color: score >= 900 ? 'var(--accent-green)' : score >= 750 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                Score: {animatedScore}/1000
              </h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {score >= 950 ? 'Spectacular eye! Absolute zero-day matcher.' :
                 score >= 900 ? 'Incredible accuracy! Zero-Day God standard.' :
                 score >= 800 ? 'Great job! Very close match.' :
                 score >= 650 ? 'Decent match. Try tuning the channels finer.' :
                 'A bit far off. Warm up and try again!'}
              </span>
            </div>

            {/* Side-by-side color reveal */}
            <div className="form-row-grid">
              {/* Target color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>TARGET COLOR</span>
                <div style={{
                  width: '100%',
                  height: '110px',
                  backgroundColor: rgbString(targetColor),
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: `0 4px 20px rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.2)`
                }} />
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  rgb({targetColor.r}, {targetColor.g}, {targetColor.b})
                </span>
              </div>

              {/* Guessed color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>YOUR GUESS</span>
                <div style={{
                  width: '100%',
                  height: '110px',
                  backgroundColor: rgbString(guessColor),
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: `0 4px 20px rgba(${guessColor.r}, ${guessColor.g}, ${guessColor.b}, 0.2)`
                }} />
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  rgb({guessColor.r}, {guessColor.g}, {guessColor.b})
                </span>
              </div>
            </div>

            {/* Error channels breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Error breakdown</span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                    {guessColor.r - targetColor.r > 0 ? `+${guessColor.r - targetColor.r}` : guessColor.r - targetColor.r}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Red Delta</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                    {guessColor.g - targetColor.g > 0 ? `+${guessColor.g - targetColor.g}` : guessColor.g - targetColor.g}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Green Delta</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                    {guessColor.b - targetColor.b > 0 ? `+${guessColor.b - targetColor.b}` : guessColor.b - targetColor.b}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Blue Delta</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn interactive-lift"
                style={{
                  flex: 1,
                  height: '48px',
                  gap: '8px',
                  background: 'var(--accent-amber)',
                  borderColor: 'var(--accent-amber)',
                  color: 'black'
                }}
                onClick={startNewGame}
              >
                <RotateCcw size={16} /> Play Again
              </button>
              <Link href="/" className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px' }}>
                Dashboard
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
