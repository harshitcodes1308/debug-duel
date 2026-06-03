'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { ArrowLeft, RotateCcw, Trophy, Zap, Award, Sparkles, AlertCircle } from 'lucide-react';
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
      window.addEventListener('touchmove', handleGlobalTouchMove);
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

  const rgbString = (c: Color) => `rgb(${c.r}, ${c.g}, ${c.b})`;

  // Calculate coordinates for the dot indicator on the wheel
  const maxRadius = 90; // Let's make the wheel 180px wide (radius 90px) to fit beautifully
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
              <Sparkles size={24} color="var(--accent-blue)" /> ColorMatch Solo
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
            <div className="float-anim" style={{ fontSize: '64px' }}>🎨</div>
            <h3 style={{ fontSize: '18px' }}>Ready to test your visual memory?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '380px', lineHeight: '20px' }}>
              You will be shown a target color for 6 seconds. Once it disappears, match it as closely as possible using the Red, Green, and Blue sliders.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', maxWidth: '240px', height: '48px', fontWeight: 'bold' }} onClick={startNewGame}>
              Start Match
            </button>
          </div>
        )}

        {/* ================= STATE 2: MEMORIZE ================= */}
        {gameState === 'memorize' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold', letterSpacing: '0.1em' }}>
              Memorize this color!
            </div>
            
            {/* Color card */}
            <div style={{
              width: '100%',
              height: '240px',
              backgroundColor: rgbString(targetColor),
              borderRadius: '16px',
              boxShadow: `0 8px 32px rgba(${targetColor.r}, ${targetColor.g}, ${targetColor.b}, 0.25)`,
              border: '2px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.3s'
            }}>
              {/* Countdown circle */}
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                fontFamily: 'Space Grotesk, sans-serif',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                {countdown}
              </div>
            </div>
          </div>
        )}

        {/* ================= STATE 3: GUESS ================= */}
        {gameState === 'guess' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 'bold', letterSpacing: '0.1em', textAlign: 'center' }}>
              Recreate the color!
            </div>

            {/* Comparison boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              
              {/* Guess box (Live Preview) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>YOUR GUESS</span>
                <div style={{
                  width: '100%',
                  height: '120px',
                  backgroundColor: rgbString(guessColor),
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: `0 4px 20px rgba(${guessColor.r}, ${guessColor.g}, ${guessColor.b}, 0.2)`
                }} />
              </div>
            </div>

            {/* Color Wheel Picker & Lightness Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '32px', width: '100%' }}>
                
                {/* Wheel Container */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>DRAG TO SELECT HUE & SATURATION</span>
                  <div 
                    id="color-wheel-container"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    style={{
                      position: 'relative',
                      width: '180px',
                      height: '180px',
                      borderRadius: '50%',
                      cursor: 'crosshair',
                      background: `
                        radial-gradient(circle, #ffffff 0%, transparent 100%),
                        conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)
                      `,
                      border: '3px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 2px 6px rgba(0,0,0,0.3)',
                      userSelect: 'none',
                      touchAction: 'none'
                    }}
                  >
                    {/* Selector indicator */}
                    <div style={{
                      position: 'absolute',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 3px rgba(0, 0, 0, 0.7), inset 0 0 1px rgba(0,0,0,0.5)',
                      left: `calc(50% + ${xOffset}px - 7px)`,
                      top: `calc(50% + ${yOffset}px - 7px)`,
                      pointerEvents: 'none',
                      backgroundColor: `rgb(${guessColor.r}, ${guessColor.g}, ${guessColor.b})`,
                      transition: isDragging ? 'none' : 'all 0.15s ease-out'
                    }} />
                  </div>
                </div>

                {/* Lightness (Value) Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, minWidth: '160px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ADJUST BRIGHTNESS (VALUE)</span>
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
                    style={{
                      width: '100%',
                      height: '18px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      background: `linear-gradient(to right, #000000, rgb(${hsvToRgb(hsvState.h, hsvState.s, 100).r}, ${hsvToRgb(hsvState.h, hsvState.s, 100).g}, ${hsvToRgb(hsvState.h, hsvState.s, 100).b}))`,
                      borderRadius: '9px',
                      outline: 'none',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      accentColor: 'var(--accent-blue)'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>0% (Black)</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{hsvState.v}%</span>
                    <span>100% (Full Color)</span>
                  </div>
                </div>
              </div>

              {/* RGB Value Display */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 24px',
                display: 'flex',
                gap: '24px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '13px',
                marginTop: '6px'
              }}>
                <div><span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>R:</span> {guessColor.r}</div>
                <div><span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>G:</span> {guessColor.g}</div>
                <div><span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>B:</span> {guessColor.b}</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', height: '48px', fontWeight: 'bold', marginTop: '10px' }} onClick={handleSubmitGuess}>
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
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-purple)'
              }}>
                <Award size={32} />
              </div>
              <h2 style={{ fontSize: '32px', color: score >= 900 ? 'var(--accent-green)' : score >= 750 ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                Score: {score}/1000
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              <button className="btn btn-primary" style={{ flex: 1, height: '48px', gap: '8px' }} onClick={startNewGame}>
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
