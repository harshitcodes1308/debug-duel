'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Trophy, AlertTriangle, ArrowLeft, RefreshCw, 
  Palette, Sliders, Clock, Sparkles, Check, Award, Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ParticipantDetails {
  userId: string;
  isWinner: boolean;
  submittedColor: string | null;
  colorScore: number | null;
  submitTime: number | null;
  user: {
    username: string;
    eloUIUX: number;
    currentStreak: number;
  };
}

interface DuelResultData {
  id: string;
  status: string;
  betAmount: number;
  winnerId: string | null;
  targetColor: string;
  participants: ParticipantDetails[];
  isRanked?: boolean;
  seasonId?: string | null;
}

export default function ColorMatchResult() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [duel, setDuel] = useState<DuelResultData | null>(null);
  const [rematching, setRematching] = useState(false);

  const rpChange = searchParams.get('rpChange') ? parseInt(searchParams.get('rpChange')!) : null;
  const newRank = searchParams.get('newRank') || null;
  const rankedEloChange = searchParams.get('eloChange') ? parseInt(searchParams.get('eloChange')!) : null;
  const [animatedUserScore, setAnimatedUserScore] = useState<number>(0);
  const [animatedOpponentScore, setAnimatedOpponentScore] = useState<number>(0);

  useEffect(() => {
    if (!duel || loading) return;

    const pUser = duel.participants.find(p => p.userId === user?.id);
    const pOpponent = duel.participants.find(p => p.userId !== user?.id);

    const userTarget = pUser?.colorScore ?? 0;
    const opponentTarget = pOpponent?.colorScore ?? 0;

    const duration = 1200; // 1.2s count up
    const startTime = performance.now();
    let animId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad

      setAnimatedUserScore(Math.round(easeProgress * userTarget));
      setAnimatedOpponentScore(Math.round(easeProgress * opponentTarget));

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [duel, loading, user?.id]);

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (res.ok) {
          const data: DuelResultData = await res.json();
          setDuel(data);

          // If current user is winner, trigger confetti
          const userParticipant = data.participants.find(p => p.userId === user?.id);
          if (userParticipant?.isWinner) {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
          }
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }

    if (duelId && user) {
      fetchResult();
    }
  }, [duelId, user]);

  const handleRematch = async () => {
    if (!duel || !user || rematching) return;
    setRematching(true);
    try {
      const res = await fetch('http://localhost:5001/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameType: 'color_match',
          betAmount: duel.betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/color-match/lobby/${data.duelId}`);
      } else {
        alert("Failed to create rematch. Make sure you have enough tokens.");
      }
    } catch (e) {
      alert("Error initiating rematch.");
    } finally {
      setRematching(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D12',
        color: '#8888A0'
      }}>
        <h2>Fetching chromatic duel results...</h2>
      </div>
    );
  }

  if (!duel || !user) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2>Duel Not Found</h2>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Back Home</Link>
      </div>
    );
  }

  const pUser = duel.participants.find(p => p.userId === user.id);
  const pOpponent = duel.participants.find(p => p.userId !== user.id);
  const isWinner = pUser?.isWinner;
  const isDraw = duel.winnerId === null && duel.status === 'completed' && pUser?.colorScore === pOpponent?.colorScore;

  // Helper to parse RGB color string
  const parseRGB = (rgbStr: string | null) => {
    if (!rgbStr) return { r: 128, g: 128, b: 128 };
    const match = rgbStr.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!match) return { r: 128, g: 128, b: 128 };
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    };
  };

  const targetColor = parseRGB(duel.targetColor);
  const userColor = parseRGB(pUser?.submittedColor || null);
  const opponentColor = parseRGB(pOpponent?.submittedColor || null);

  // ELO calculation
  const getEloChange = () => {
    if (isDraw) return 0;
    if (isWinner) {
      // expected change calculation helper
      const ratingW = pUser?.user.eloUIUX || 1000;
      const ratingL = pOpponent?.user.eloUIUX || 1000;
      const K = 32;
      const expectedA = 1 / (1 + Math.pow(10, (ratingL - ratingW) / 400));
      return Math.round(K * (1 - expectedA));
    } else {
      const ratingW = pOpponent?.user.eloUIUX || 1000;
      const ratingL = pUser?.user.eloUIUX || 1000;
      const K = 32;
      const expectedA = 1 / (1 + Math.pow(10, (ratingW - ratingL) / 400));
      return Math.round(K * (0 - expectedA)); // will be negative
    }
  };

  const getTokensChange = () => {
    if (isDraw) return 0;
    const bet = duel.betAmount;
    if (isWinner) {
      const streakBonus = (pUser?.user.currentStreak || 0) >= 2 ? 15 : 0;
      const closenessBonus = Math.round((pUser?.colorScore || 0) / 50);
      return 50 + bet + streakBonus + closenessBonus;
    } else {
      return -bet;
    }
  };

  const eloChange = getEloChange();
  const tokenChange = getTokensChange();

  return (
    <div className="container" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. OUTCOME HEADER BAR */}
      <div className="glass-panel" style={{
        background: isDraw
          ? 'linear-gradient(135deg, rgba(74, 158, 255, 0.1) 0%, rgba(13, 13, 18, 0.6) 100%)'
          : isWinner 
            ? 'linear-gradient(135deg, rgba(0, 255, 148, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(255, 68, 68, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)',
        borderColor: isDraw 
          ? 'rgba(74, 158, 255, 0.3)' 
          : isWinner 
            ? 'rgba(0, 255, 148, 0.3)' 
            : 'rgba(255, 68, 68, 0.3)',
        padding: '32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isDraw 
            ? 'rgba(74, 158, 255, 0.1)' 
            : isWinner 
              ? 'rgba(0, 255, 148, 0.1)' 
              : 'rgba(255, 68, 68, 0.1)',
          border: `1px solid ${
            isDraw 
              ? 'var(--accent-blue)' 
              : isWinner 
                ? 'var(--accent-green)' 
                : 'var(--accent-red)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isDraw ? (
            <Sparkles size={30} color="var(--accent-blue)" />
          ) : isWinner ? (
            <Trophy size={30} color="var(--accent-green)" />
          ) : (
            <AlertTriangle size={30} color="var(--accent-red)" />
          )}
        </div>

        <div>
          <h1 style={{
            fontSize: '40px',
            color: isDraw 
              ? 'var(--accent-blue)' 
              : isWinner 
                ? 'var(--accent-green)' 
                : 'var(--accent-red)',
            textShadow: isWinner ? '0 0 25px rgba(0, 255, 148, 0.2)' : 'none',
            fontFamily: 'Space Grotesk, sans-serif'
          }}>
            {isDraw ? "DRAW BATTLE" : isWinner ? "VICTORY!" : "DEFEAT."}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Color Match Battle Room
          </p>
        </div>

        {duel.isRanked ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
            maxWidth: '500px',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            paddingTop: '20px'
          }}>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: (rpChange ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {(rpChange ?? 0) >= 0 ? `+${rpChange ?? 0}` : rpChange} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>RP</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PROGRESS ADJUSTMENT</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }}></div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                  {(rankedEloChange ?? 0) >= 0 ? `+${rankedEloChange ?? 0}` : rankedEloChange} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>ELO</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MATCHMAKING MMR</div>
              </div>
            </div>

            {newRank && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}>
                <Award size={14} color="var(--accent-purple)" />
                <span>New Rank Standing: <strong style={{ color: 'var(--accent-purple)' }}>{newRank}</strong></span>
              </div>
            )}

            {/* Promotion / Demotion alert */}
            {newRank && user?.currentRank && newRank !== user.currentRank && (
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                padding: '6px 12px',
                borderRadius: '4px',
                background: (rpChange ?? 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: (rpChange ?? 0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                border: `1px solid ${(rpChange ?? 0) > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                {(rpChange ?? 0) > 0 ? "PROMOTED!" : "DEMOTED!"}
              </div>
            )}

            {/* Demotion Warning panel */}
            {(!rpChange || rpChange < 0) && user && (
              (() => {
                const currentRP = user.rankPoints || 0;
                const newRP = Math.max(0, currentRP + (rpChange || 0));
                const isLowRP = newRP === 0 || (newRP % 100 < 15);
                if (isLowRP) {
                  return (
                    <div style={{
                      padding: '8px 14px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.15)',
                      color: 'var(--accent-amber)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '4px'
                    }}>
                      <Info size={13} /> Warning: You are near division demotion! Win the next match to secure your tier.
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '24px',
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            width: '100%',
            maxWidth: '400px',
            justifyContent: 'center'
          }}>
            <div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: isDraw ? 'var(--text-primary)' : tokenChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
              }}>
                {isDraw ? '0' : tokenChange > 0 ? `+${tokenChange}` : `${tokenChange}`} tokens
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>TOKEN ALLOCATION</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }}></div>
            <div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: isDraw ? 'var(--text-primary)' : eloChange > 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
              }}>
                {isDraw ? '0' : eloChange > 0 ? `+${eloChange}` : `${eloChange}`} ELO
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>UI/UX RATING CHANGE</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. COLOR VISUAL COMPARISON CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        {/* Target Color Card */}
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderWidth: '2px',
          borderColor: 'rgba(255, 255, 255, 0.15)'
        }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Target Color
          </h3>
          <div style={{
            width: '100%',
            height: '140px',
            backgroundColor: duel.targetColor,
            borderRadius: '10px',
            boxShadow: `0 8px 24px ${duel.targetColor.replace('rgb', 'rgba').replace(')', ', 0.25)')}`,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 'bold' }}>
              {duel.targetColor}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Reference Target
            </div>
          </div>
        </div>

        {/* Your Color Guess Card */}
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderWidth: '2px',
          borderColor: isWinner ? 'rgba(0, 255, 148, 0.2)' : 'rgba(255, 255, 255, 0.08)'
        }}>
          <h3 style={{ fontSize: '14px', color: isWinner ? 'var(--accent-green)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Guess
          </h3>
          <div style={{
            width: '100%',
            height: '140px',
            backgroundColor: pUser?.submittedColor || 'rgb(128, 128, 128)',
            borderRadius: '10px',
            boxShadow: pUser?.submittedColor ? `0 8px 24px ${pUser.submittedColor.replace('rgb', 'rgba').replace(')', ', 0.25)')}` : 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            {!pUser?.submittedColor && "No Submission"}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 'bold' }}>
              {pUser?.submittedColor || 'rgb(N/A)'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '6px', fontSize: '12px' }}>
              <span style={{ color: 'var(--accent-amber)' }}>Score: <strong>{animatedUserScore}/1000</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>|</span>
              <span style={{ color: 'var(--accent-blue)' }}>Time: <strong>{pUser?.submitTime ?? 0}s</strong></span>
            </div>
          </div>
        </div>

        {/* Opponent's Guess Card */}
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderWidth: '2px',
          borderColor: !isWinner && !isDraw ? 'rgba(0, 255, 148, 0.2)' : 'rgba(255, 255, 255, 0.08)'
        }}>
          <h3 style={{ fontSize: '14px', color: !isWinner && !isDraw ? 'var(--accent-green)' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            @{pOpponent?.user.username || 'Opponent'}&apos;s Guess
          </h3>
          <div style={{
            width: '100%',
            height: '140px',
            backgroundColor: pOpponent?.submittedColor || 'rgb(128, 128, 128)',
            borderRadius: '10px',
            boxShadow: pOpponent?.submittedColor ? `0 8px 24px ${pOpponent.submittedColor.replace('rgb', 'rgba').replace(')', ', 0.25)')}` : 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)'
          }}>
            {!pOpponent?.submittedColor && "No Submission"}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 'bold' }}>
              {pOpponent?.submittedColor || 'rgb(N/A)'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '6px', fontSize: '12px' }}>
              <span style={{ color: 'var(--accent-amber)' }}>Score: <strong>{animatedOpponentScore}/1000</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>|</span>
              <span style={{ color: 'var(--accent-blue)' }}>Time: <strong>{pOpponent?.submitTime ?? 0}s</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHROMATIC BREAKDOWN TABLE */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--accent-amber)" /> RGB Channel Deviation
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>Channel</th>
                <th style={{ padding: '12px' }}>Target</th>
                <th style={{ padding: '12px' }}>Your Guess</th>
                <th style={{ padding: '12px' }}>Your Delta</th>
                <th style={{ padding: '12px' }}>Opponent Guess</th>
                <th style={{ padding: '12px' }}>Opponent Delta</th>
              </tr>
            </thead>
            <tbody>
              {/* Red Row */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-red)' }}>Red</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{targetColor.r}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pUser?.submittedColor ? userColor.r : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pUser?.submittedColor ? (
                    <span style={{ color: Math.abs(userColor.r - targetColor.r) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(userColor.r - targetColor.r) === 0 ? 'Perfect!' : `±${Math.abs(userColor.r - targetColor.r)}`}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pOpponent?.submittedColor ? opponentColor.r : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pOpponent?.submittedColor ? (
                    <span style={{ color: Math.abs(opponentColor.r - targetColor.r) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(opponentColor.r - targetColor.r) === 0 ? 'Perfect!' : `±${Math.abs(opponentColor.r - targetColor.r)}`}
                    </span>
                  ) : '-'}
                </td>
              </tr>

              {/* Green Row */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-green)' }}>Green</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{targetColor.g}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pUser?.submittedColor ? userColor.g : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pUser?.submittedColor ? (
                    <span style={{ color: Math.abs(userColor.g - targetColor.g) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(userColor.g - targetColor.g) === 0 ? 'Perfect!' : `±${Math.abs(userColor.g - targetColor.g)}`}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pOpponent?.submittedColor ? opponentColor.g : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pOpponent?.submittedColor ? (
                    <span style={{ color: Math.abs(opponentColor.g - targetColor.g) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(opponentColor.g - targetColor.g) === 0 ? 'Perfect!' : `±${Math.abs(opponentColor.g - targetColor.g)}`}
                    </span>
                  ) : '-'}
                </td>
              </tr>

              {/* Blue Row */}
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>Blue</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{targetColor.b}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pUser?.submittedColor ? userColor.b : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pUser?.submittedColor ? (
                    <span style={{ color: Math.abs(userColor.b - targetColor.b) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(userColor.b - targetColor.b) === 0 ? 'Perfect!' : `±${Math.abs(userColor.b - targetColor.b)}`}
                    </span>
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{pOpponent?.submittedColor ? opponentColor.b : '-'}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {pOpponent?.submittedColor ? (
                    <span style={{ color: Math.abs(opponentColor.b - targetColor.b) <= 15 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {Math.abs(opponentColor.b - targetColor.b) === 0 ? 'Perfect!' : `±${Math.abs(opponentColor.b - targetColor.b)}`}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ACTIONS FOOTER PANEL */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            className="btn interactive-lift" 
            style={{ minWidth: '180px', background: 'var(--accent-amber)', borderColor: 'var(--accent-amber)', color: 'black', fontWeight: 'bold' }}
            onClick={handleRematch}
            disabled={rematching}
          >
            <RefreshCw size={16} />
            {rematching ? "Creating Rematch..." : "Play Rematch"}
          </button>
        </div>
      </div>

    </div>
  );
}
