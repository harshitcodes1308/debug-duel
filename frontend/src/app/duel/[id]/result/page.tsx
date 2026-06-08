'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Trophy, AlertTriangle, ArrowLeft, RefreshCw, 
  Check, Info, FileText, ChevronRight, Award 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ParticipantDetails {
  userId: string;
  isWinner: boolean;
  submittedCode: string;
  explanation: string;
  explanationScore: number;
  user: {
    username: string;
  };
}

interface DuelResultData {
  id: string;
  status: string;
  betAmount: number;
  winnerId: string;
  language: string;
  difficulty: string;
  bug: {
    title: string;
    brokenCode: string;
    fixedCode: string;
    explanation: string;
  };
  participants: ParticipantDetails[];
  isRanked?: boolean;
  seasonId?: string | null;
}

export default function DuelResult() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [duel, setDuel] = useState<DuelResultData | null>(null);
  const [rematching, setRematching] = useState(false);

  const rpChange = searchParams.get('rpChange') ? parseInt(searchParams.get('rpChange')!) : null;
  const newRank = searchParams.get('newRank') || null;
  const eloChange = searchParams.get('eloChange') ? parseInt(searchParams.get('eloChange')!) : null;

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
              particleCount: 100,
              spread: 70,
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
          language: duel.language,
          difficulty: duel.difficulty,
          betAmount: duel.betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/duel/lobby/${data.duelId}`);
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
        <h2>Fetching duel results...</h2>
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

  return (
    <div className="container" style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 1. OUTCOME HEADER BAR */}
      <div className="glass-panel" style={{
        background: isWinner 
          ? 'linear-gradient(135deg, rgba(0, 255, 148, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)'
          : 'linear-gradient(135deg, rgba(255, 68, 68, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)',
        borderColor: isWinner ? 'rgba(0, 255, 148, 0.3)' : 'rgba(255, 68, 68, 0.3)',
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: isWinner ? 'rgba(0, 255, 148, 0.1)' : 'rgba(255, 68, 68, 0.1)',
          border: `1px solid ${isWinner ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isWinner ? <Trophy size={36} color="var(--accent-green)" /> : <AlertTriangle size={36} color="var(--accent-red)" />}
        </div>

        <div>
          <h1 style={{
            fontSize: '48px',
            color: isWinner ? 'var(--accent-green)' : 'var(--accent-red)',
            textShadow: isWinner ? '0 0 25px rgba(0, 255, 148, 0.2)' : 'none',
            fontFamily: 'Space Grotesk, sans-serif'
          }}>
            {isWinner ? "VICTORY!" : "DEFEAT."}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Battle for Bug: <strong style={{ color: '#fff' }}>{duel.bug.title}</strong>
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
                  {(eloChange ?? 0) >= 0 ? `+${eloChange ?? 0}` : eloChange} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>ELO</span>
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
            paddingTop: '20px',
            width: '100%',
            maxWidth: '400px',
            justifyContent: 'center'
          }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: isWinner ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {isWinner ? `+${50 + duel.betAmount} tokens` : `-${duel.betAmount} tokens`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOKEN ALLOCATION</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }}></div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                {isWinner ? "+18 ELO" : "-14 ELO"}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>RATING CHANGE</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. REPLAY & JUDGE SUMMARY PANEL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '30px' }}>
        
        {/* Code Comparison block */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            Solution Analysis
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
            {/* Expected Fixed Code */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-green)', display: 'block', marginBottom: '8px' }}>
                EXPECTED SOLUTION
              </label>
              <pre style={{
                background: '#0D0D12',
                border: '1px solid rgba(0, 255, 148, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                color: '#fff',
                maxHeight: '260px'
              }}><code>{duel.bug.fixedCode}</code></pre>
            </div>

            {/* Submitted Code */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: isWinner ? 'var(--accent-green)' : 'var(--accent-red)', display: 'block', marginBottom: '8px' }}>
                {isWinner ? "YOUR CORRECT FIX" : "YOUR SUBMISSION"}
              </label>
              <pre style={{
                background: '#0D0D12',
                border: `1px solid ${isWinner ? 'rgba(0, 255, 148, 0.1)' : 'rgba(255, 68, 68, 0.1)'}`,
                padding: '16px',
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                color: '#fff',
                maxHeight: '260px'
              }}><code>{pUser?.submittedCode || '// Did not submit code.'}</code></pre>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              BUG ANALYSIS
            </span>
            <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
              {duel.bug.explanation}
            </p>
          </div>
        </div>

        {/* Sidebar: Explanation and Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* AI Score panel */}
          {pUser?.explanation && (
            <div className="glass-panel" style={{
              background: 'linear-gradient(to bottom, #1A1A22, #141419)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} color="var(--accent-purple)" /> AI Explanation Judge
              </h3>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Score</span>
                  <strong style={{ color: 'var(--accent-purple)', fontSize: '14px' }}>{pUser.explanationScore}/20</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(pUser.explanationScore / 20) * 100}%`,
                    height: '100%',
                    background: 'var(--accent-purple)',
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Your Explanation:</strong>
                &quot;{pUser.explanation}&quot;
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-success" 
              style={{ width: '100%', gap: '8px', color: 'black' }}
              onClick={handleRematch}
              disabled={rematching}
            >
              <RefreshCw size={16} />
              {rematching ? "Creating rematch..." : "Play Rematch"}
            </button>
            <Link href="/" className="btn btn-secondary" style={{ width: '100%' }}>
              Back to Dashboard
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
