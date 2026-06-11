'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Trophy, AlertTriangle, ArrowLeft, RefreshCw, 
  Layout, Eye, Sparkles, Check, Award, Sliders, Info,
  ListPlus, ThumbsUp, ThumbsDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UiNode {
  id: string;
  type: 'container' | 'text' | 'button' | 'input' | 'image';
  text?: string;
  props: {
    placeholder?: string;
    src?: string;
    style: React.CSSProperties;
  };
  children?: UiNode[];
}

interface ParticipantDetails {
  userId: string;
  isWinner: boolean;
  submittedDesign: string | null;
  designScore: number | null;
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
  designChallengeId: string;
  participants: ParticipantDetails[];
  isRanked?: boolean;
  seasonId?: string | null;
}

export default function DesignDuelResult() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [duel, setDuel] = useState<DuelResultData | null>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [rematching, setRematching] = useState(false);

  const rpChange = searchParams.get('rpChange') ? parseInt(searchParams.get('rpChange')!) : null;
  const newRank = searchParams.get('newRank') || null;
  const rankedEloChange = searchParams.get('eloChange') ? parseInt(searchParams.get('eloChange')!) : null;
  const [animatedUserScore, setAnimatedUserScore] = useState<number>(0);
  const [animatedOpponentScore, setAnimatedOpponentScore] = useState<number>(0);

  // AI evaluation details derived locally or from grade result
  const [aiDetails, setAiDetails] = useState<any>(null);
  const [opponentDetails, setOpponentDetails] = useState<any>(null);

  // 1. Initial Load & Fetch
  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (res.ok) {
          const data: DuelResultData = await res.json();
          setDuel(data);

          // Fetch challenge info
          const challengeId = data.designChallengeId || 'senior_login';
          const challengeRes = await fetch(`http://localhost:5001/api/design-challenge/${challengeId}`);
          if (challengeRes.ok) {
            const challengeData = await challengeRes.json();
            setChallenge(challengeData);
          }

          // If current user is winner, trigger confetti
          const userParticipant = data.participants.find(p => p.userId === user?.id);
          if (userParticipant?.isWinner) {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 }
            });
          }

          // Fetch AI Evaluation Details
          const pUser = data.participants.find(p => p.userId === user?.id);
          const pOpponent = data.participants.find(p => p.userId !== user?.id);

          // Since both scores are generated via designJudge, let's grade locally if details not fully saved,
          // or simulate the grading report for the result page to present visual elegance
          if (pUser && pUser.submittedDesign) {
            // Request a grade evaluation details report
            try {
              const gradingRes = await fetch('http://localhost:5001/api/design-challenge/solo/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  challengeId: challengeId,
                  submittedDesign: JSON.parse(pUser.submittedDesign)
                })
              });
              if (gradingRes.ok) {
                const gradeReport = await gradingRes.json();
                setAiDetails(gradeReport.grade);
              }
            } catch (err) {
              console.error("Failed to fetch user grade report details", err);
            }
          }

          if (pOpponent && pOpponent.submittedDesign) {
            try {
              const gradingRes = await fetch('http://localhost:5001/api/design-challenge/solo/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  challengeId: challengeId,
                  submittedDesign: JSON.parse(pOpponent.submittedDesign)
                })
              });
              if (gradingRes.ok) {
                const gradeReport = await gradingRes.json();
                setOpponentDetails(gradeReport.grade);
              }
            } catch (err) {
              console.error("Failed to fetch opponent grade report details", err);
            }
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

  // Animated Scores Ticker
  useEffect(() => {
    if (!duel || loading) return;

    const pUser = duel.participants.find(p => p.userId === user?.id);
    const pOpponent = duel.participants.find(p => p.userId !== user?.id);

    const userTarget = pUser?.designScore ?? 0;
    const opponentTarget = pOpponent?.designScore ?? 0;

    const duration = 1200;
    const startTime = performance.now();
    let animId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);

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

  const handleRematch = async () => {
    if (!duel || !user || rematching) return;
    setRematching(true);
    try {
      const res = await fetch('http://localhost:5001/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameType: 'change_design',
          betAmount: duel.betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/change-design/duel/${data.duelId}`); // Wait, matchmaker redirect or go to queue/lobby
      } else {
        alert("Failed to create rematch. Make sure you have enough tokens.");
      }
    } catch (e) {
      alert("Error initiating rematch.");
    } finally {
      setRematching(false);
    }
  };

  const renderCanvasStatic = (node: UiNode) => {
    const { id, type, text, props, children } = node;
    const style: React.CSSProperties = {
      ...props.style,
      boxSizing: 'border-box',
      transform: 'scale(0.85)',
      transformOrigin: 'top center',
      maxWidth: '100%'
    };

    if (type === 'container') {
      return (
        <div id={id} style={style}>
          {children?.map(child => (
            <React.Fragment key={child.id}>
              {renderCanvasStatic(child)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (type === 'text') {
      return <span id={id} style={style}>{text}</span>;
    }

    if (type === 'button') {
      return <button id={id} style={style} type="button">{text}</button>;
    }

    if (type === 'input') {
      return <input id={id} type="text" placeholder={props.placeholder} value={text} readOnly style={style} />;
    }

    if (type === 'image') {
      return <img id={id} src={props.src} alt={text} style={style} />;
    }

    return null;
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
        <h2>Evaluating design submissions...</h2>
      </div>
    );
  }

  if (!duel || !user) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', backgroundColor: '#0D0D12', height: '100vh' }}>
        <h2>Duel Not Found</h2>
        <Link href="/" style={{ marginTop: '20px', display: 'inline-block', color: '#38bdf8' }}>Back Home</Link>
      </div>
    );
  }

  const pUser = duel.participants.find(p => p.userId === user.id);
  const pOpponent = duel.participants.find(p => p.userId !== user.id);
  const isWinner = pUser?.isWinner;
  const isDraw = duel.winnerId === null && duel.status === 'completed' && pUser?.designScore === pOpponent?.designScore;

  // Manual fallback payouts
  const getEloChange = () => {
    if (isDraw) return 0;
    if (isWinner) {
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
      return Math.round(K * (0 - expectedA));
    }
  };

  const getTokensChange = () => {
    if (isDraw) return 0;
    const bet = duel.betAmount;
    if (isWinner) {
      const streakBonus = (pUser?.user.currentStreak || 0) >= 2 ? 15 : 0;
      const closenessBonus = Math.round((pUser?.designScore || 0) / 5);
      return 50 + bet + streakBonus + closenessBonus;
    } else {
      return -bet;
    }
  };

  const eloChange = getEloChange();
  const tokenChange = getTokensChange();

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'Inter, sans-serif',
      color: '#f4f4f5',
      backgroundColor: '#0D0D12'
    }}>
      
      {/* 1. OUTCOME HEADER BAR */}
      <div style={{
        background: isDraw
          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(13, 13, 18, 0.6) 100%)'
          : isWinner 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(13, 13, 18, 0.6) 100%)',
        border: `1px solid ${isDraw ? 'rgba(56, 189, 248, 0.3)' : isWinner ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        borderRadius: '12px',
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
          background: isDraw ? 'rgba(56, 189, 248, 0.1)' : isWinner ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isDraw ? '#38bdf8' : isWinner ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isDraw ? (
            <Sparkles size={30} color="#38bdf8" />
          ) : isWinner ? (
            <Trophy size={30} color="#10b981" />
          ) : (
            <AlertTriangle size={30} color="#ef4444" />
          )}
        </div>

        <div>
          <h1 style={{
            fontSize: '40px',
            color: isDraw ? '#38bdf8' : isWinner ? '#10b981' : '#ef4444',
            textShadow: isWinner ? '0 0 25px rgba(16, 185, 129, 0.2)' : 'none',
            fontWeight: 'bold',
            margin: 0
          }}>
            {isDraw ? "DRAW DUEL" : isWinner ? "DESIGN VICTORY!" : "DESIGN DEFEAT."}
          </h1>
          <p style={{ color: '#71717a', fontSize: '13px', marginTop: '6px' }}>
            Change That Design Ranked Arena
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
            borderTop: '1px solid #1f1f2e',
            paddingTop: '20px',
            marginTop: '8px'
          }}>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: (rpChange ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                  {(rpChange ?? 0) >= 0 ? `+${rpChange ?? 0}` : rpChange} <span style={{ fontSize: '14px', color: '#71717a' }}>RP</span>
                </div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>DIVISION PROGRESS</div>
              </div>
              <div style={{ width: '1px', background: '#1f1f2e' }}></div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>
                  {(rankedEloChange ?? 0) >= 0 ? `+${rankedEloChange ?? 0}` : rankedEloChange} <span style={{ fontSize: '14px', color: '#71717a' }}>ELO</span>
                </div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>RATING POOL</div>
              </div>
            </div>

            {newRank && (
              <div style={{
                background: 'rgba(123, 147, 219, 0.05)',
                border: '1px solid rgba(123, 147, 219, 0.15)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px'
              }}>
                <Award size={14} color="#8b5cf6" />
                <span>Current Tier Standing: <strong style={{ color: '#8b5cf6' }}>{newRank}</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '24px',
            borderTop: '1px solid #1f1f2e',
            paddingTop: '16px',
            width: '100%',
            maxWidth: '400px',
            justifyContent: 'center',
            marginTop: '8px'
          }}>
            <div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: isDraw ? '#f4f4f5' : tokenChange > 0 ? '#10b981' : '#ef4444' 
              }}>
                {isDraw ? '0' : tokenChange > 0 ? `+${tokenChange}` : `${tokenChange}`} tokens
              </div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>PAYOUT</div>
            </div>
            <div style={{ width: '1px', background: '#1f1f2e' }}></div>
            <div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: isDraw ? '#f4f4f5' : eloChange > 0 ? '#10b981' : '#ef4444' 
              }}>
                {isDraw ? '0' : eloChange > 0 ? `+${eloChange}` : `${eloChange}`} ELO
              </div>
              <div style={{ fontSize: '10px', color: '#71717a' }}>UI/UX ELO</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUBMISSIONS VISUAL DISPLAY */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {/* Your Submission preview */}
        <div style={{
          background: '#13131a',
          border: '1px solid #1f1f2e',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 'bold' }}>
            Your Submission ({animatedUserScore} pts)
          </h3>
          <div style={{
            width: '100%',
            height: '320px',
            backgroundColor: '#000',
            borderRadius: '8px',
            border: '1px solid #27272a',
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {pUser?.submittedDesign ? renderCanvasStatic(JSON.parse(pUser.submittedDesign)) : <span>No Design Submitted</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', textAlign: 'center' }}>
            Submitted in <strong>{pUser?.submitTime ?? 0}s</strong>
          </div>
        </div>

        {/* Opponent Submission preview */}
        <div style={{
          background: '#13131a',
          border: '1px solid #1f1f2e',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '14px', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 'bold' }}>
            @{pOpponent?.user.username || 'Opponent'}&apos;s Submission ({animatedOpponentScore} pts)
          </h3>
          <div style={{
            width: '100%',
            height: '320px',
            backgroundColor: '#000',
            borderRadius: '8px',
            border: '1px solid #27272a',
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {pOpponent?.submittedDesign ? renderCanvasStatic(JSON.parse(pOpponent.submittedDesign)) : <span>No Design Submitted</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#a1a1aa', textAlign: 'center' }}>
            Submitted in <strong>{pOpponent?.submitTime ?? 0}s</strong>
          </div>
        </div>
      </div>

      {/* 3. AI JUDGING REPORT & SCORES */}
      {aiDetails && (
        <div style={{
          background: '#13131a',
          border: '1px solid #1f1f2e',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1f1f2e', paddingBottom: '12px' }}>
            <Sliders size={18} color="#38bdf8" /> AI Judge Grader Report
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 4fr',
            gap: '32px'
          }}>
            {/* Scores breakdown column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold' }}>Metric Scores</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Visual Hierarchy */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>Visual Hierarchy</span>
                    <strong>{aiDetails.visualHierarchy}/20</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(aiDetails.visualHierarchy / 20) * 100}%`, height: '100%', background: '#38bdf8' }} />
                  </div>
                </div>

                {/* Accessibility */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>Accessibility</span>
                    <strong>{aiDetails.accessibility}/20</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(aiDetails.accessibility / 20) * 100}%`, height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                {/* Usability */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>Usability</span>
                    <strong>{aiDetails.usability}/20</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(aiDetails.usability / 20) * 100}%`, height: '100%', background: '#f59e0b' }} />
                  </div>
                </div>

                {/* Goal Completion */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>Goal Completion</span>
                    <strong>{aiDetails.goalCompletion}/20</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(aiDetails.goalCompletion / 20) * 100}%`, height: '100%', background: '#a78bfa' }} />
                  </div>
                </div>

                {/* Style & Aesthetics */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span>Style & Aesthetics</span>
                    <strong>{aiDetails.styleAesthetics}/20</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(aiDetails.styleAesthetics / 20) * 100}%`, height: '100%', background: '#ec4899' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Critique Strengths / Weaknesses column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>AI Feedback Summary</span>
                <p style={{ margin: 0, fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>{aiDetails.feedback}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Strengths */}
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <ThumbsUp size={12} /> Key Strengths
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {aiDetails.strengths?.map((str: string, i: number) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <ThumbsDown size={12} /> Weaknesses
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {aiDetails.weaknesses?.map((weak: string, i: number) => (
                      <li key={i}>{weak}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. ACTIONS FOOTER PANEL */}
      <div style={{
        background: '#13131a',
        border: '1px solid #1f1f2e',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', textDecoration: 'none', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <button 
          style={{
            minWidth: '180px',
            background: '#38bdf8',
            border: 'none',
            color: '#0d0d12',
            fontWeight: 'bold',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: rematching ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            opacity: rematching ? 0.6 : 1
          }}
          onClick={handleRematch}
          disabled={rematching}
        >
          <RefreshCw size={16} />
          {rematching ? "Initiating Rematch..." : "Play Rematch"}
        </button>
      </div>

    </div>
  );
}
