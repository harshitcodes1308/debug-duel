'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, Award, Coins, Clock } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';

interface LeaderboardEntry {
  id: string;
  username: string;
  eloJS: number;
  eloPython: number;
  eloJava: number;
  eloUIUX: number;
  tokens: number;
  rank: string;
  totalWins: number;
  totalDuels: number;
}

interface SeasonalLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  tier: string;
  rp: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const { user } = useStore();
  const [leaderboardType, setLeaderboardType] = useState<'classic' | 'seasonal'>('classic');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'uiux'>('javascript');
  
  // Data lists
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [seasonalList, setSeasonalList] = useState<SeasonalLeaderboardEntry[]>([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  // Fetch Classic ELO Leaderboard
  useEffect(() => {
    if (leaderboardType !== 'classic') return;
    
    async function fetchClassicLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001'}/api/leaderboard?language=${language}`);
        if (res.ok) {
          const data = await res.json();
          setList(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchClassicLeaderboard();
  }, [language, leaderboardType]);

  // Fetch Seasonal Ranked Leaderboard & Active Season details
  useEffect(() => {
    if (leaderboardType !== 'seasonal') return;

    async function fetchSeasonalData() {
      setLoading(true);
      try {
        const [leaderboardRes, activeSeasonRes] = await Promise.all([
          fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/season/leaderboard'),
          fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/season/active')
        ]);

        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          setSeasonalList(data);
        }
        if (activeSeasonRes.ok) {
          const data = await activeSeasonRes.json();
          setActiveSeason(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchSeasonalData();
  }, [leaderboardType]);

  if (!user) return null;

  const activeList = leaderboardType === 'classic' ? list : seasonalList;

  return (
    <div className="container" style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Back Link */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '14px',
        alignSelf: 'flex-start'
      }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          background: leaderboardType === 'classic' ? 'rgba(245, 166, 35, 0.1)' : 'rgba(123, 147, 219, 0.1)',
          border: `1px solid ${leaderboardType === 'classic' ? 'rgba(245, 166, 35, 0.2)' : 'rgba(123, 147, 219, 0.2)'}`,
          padding: '12px',
          borderRadius: '10px'
        }}>
          <Trophy size={28} color={leaderboardType === 'classic' ? 'var(--accent-amber)' : 'var(--accent-purple)'} />
        </div>
        <div>
          <h1 style={{ fontSize: '28px' }}>
            {leaderboardType === 'classic' ? 'Global Leaderboards' : 'Seasonal Ranked Leaderboard'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {leaderboardType === 'classic' 
              ? 'Climb the ELO rankings in JavaScript, Python, or Java and claim your crown as the Zero-Day God.'
              : 'Climb the divisions from Bronze to Grandmaster. Ranked points (RP) are at stake in the arena.'}
          </p>
        </div>
      </div>

      {/* Leaderboard Type Toggle Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '16px',
        marginBottom: '4px'
      }}>
        <button 
          onClick={() => setLeaderboardType('classic')}
          className={`btn ${leaderboardType === 'classic' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 600, border: 'none' }}
        >
          Classic ELO
        </button>
        <button 
          onClick={() => setLeaderboardType('seasonal')}
          className={`btn ${leaderboardType === 'seasonal' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Award size={16} /> Seasonal Ranked
        </button>
      </div>

      {/* Conditional Sub-selectors: Language for Classic ELO, Active Season info for Seasonal */}
      {leaderboardType === 'classic' ? (
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: '8px',
          maxWidth: '480px',
          border: '1px solid var(--border)'
        }}>
          <button 
            onClick={() => setLanguage('javascript')} 
            className={`btn ${language === 'javascript' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
          >
            JavaScript
          </button>
          <button 
            onClick={() => setLanguage('python')} 
            className={`btn ${language === 'python' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
          >
            Python
          </button>
          <button 
            onClick={() => setLanguage('java')} 
            className={`btn ${language === 'java' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
          >
            Java
          </button>
          <button 
            onClick={() => setLanguage('uiux')} 
            className={`btn ${language === 'uiux' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
          >
            UI/UX
          </button>
        </div>
      ) : (
        activeSeason && (
          <div style={{
            background: 'rgba(123, 147, 219, 0.05)',
            border: '1px solid rgba(123, 147, 219, 0.15)',
            borderRadius: '10px',
            padding: '12px 18px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            maxWidth: '600px'
          }}>
            <span>Active Season: <strong style={{ color: 'var(--accent-purple)' }}>{activeSeason.name}</strong></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600 }}>
              <Clock size={15} color="var(--accent-amber)" /> {activeSeason.countdown}
            </span>
          </div>
        )
      )}

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header row skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 1fr 1fr 1fr 100px', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-box" style={{ height: '14px' }} />
              ))}
            </div>
            {/* 5 data row skeletons */}
            {[...Array(5)].map((_, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 1fr 1fr 1fr 100px', gap: '12px', alignItems: 'center' }}>
                <div className="skeleton-circle" style={{ width: '28px', height: '28px' }} />
                <div className="skeleton-box" style={{ height: '18px', width: '120px' }} />
                <div className="skeleton-box" style={{ height: '18px', width: '80px' }} />
                <div className="skeleton-box" style={{ height: '18px', width: '100px' }} />
                <div className="skeleton-box" style={{ height: '18px', width: '60px' }} />
                <div className="skeleton-box" style={{ height: '18px', width: '60px', justifySelf: 'end' }} />
              </div>
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            No rankings logged yet. Be the first to win a duel!
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>RANK</th>
                  <th style={{ padding: '16px 24px', fontWeight: '600' }}>PLAYER</th>
                  <th className="hidden-mobile" style={{ padding: '16px 24px', fontWeight: '600' }}>
                    {leaderboardType === 'classic' ? 'TIER' : 'RANK TIER'}
                  </th>
                  <th className="hidden-mobile" style={{ padding: '16px 24px', fontWeight: '600' }}>
                    {leaderboardType === 'classic' ? 'DUELS (W/L)' : 'MATCHES (W/L)'}
                  </th>
                  <th className={leaderboardType === 'classic' ? "hidden-tablet" : "hidden-mobile"} style={{ padding: '16px 24px', fontWeight: '600' }}>
                    {leaderboardType === 'classic' ? 'TOKENS' : 'WIN RATE'}
                  </th>
                  <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>
                    {leaderboardType === 'classic' ? 'ELO RATING' : 'RANK POINTS (RP)'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((entry: any, index) => {
                  const elo = leaderboardType === 'classic' 
                    ? (language === 'javascript' ? entry.eloJS : language === 'python' ? entry.eloPython : language === 'java' ? entry.eloJava : entry.eloUIUX)
                    : entry.rp;
                  
                  const isCurrentUser = entry.username === user.username;
                  const isTopThree = index < 3;

                  // Custom row background and left border accent for Top 3 Podium
                  let rowBackground = isCurrentUser ? 'rgba(74, 158, 255, 0.04)' : 'transparent';
                  let borderLeftStyle = '4px solid transparent';
                  
                  if (isTopThree) {
                    if (index === 0) {
                      rowBackground = 'linear-gradient(90deg, rgba(245, 158, 11, 0.06) 0%, rgba(20, 20, 25, 0.2) 100%)';
                      borderLeftStyle = '4px solid var(--accent-amber)';
                    } else if (index === 1) {
                      rowBackground = 'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, rgba(20, 20, 25, 0.2) 100%)';
                      borderLeftStyle = '4px solid #94A3B8';
                    } else if (index === 2) {
                      rowBackground = 'linear-gradient(90deg, rgba(205, 127, 50, 0.03) 0%, rgba(20, 20, 25, 0.2) 100%)';
                      borderLeftStyle = '4px solid #B45309';
                    }
                  }

                  return (
                    <tr key={entry.id || entry.userId} style={{
                      borderBottom: '1px solid var(--border)',
                      background: rowBackground,
                      borderLeft: borderLeftStyle,
                      transition: 'var(--transition)',
                      animationDelay: `${index * 40}ms`,
                      opacity: 0
                    }} className={`slide-up-anim ${isCurrentUser ? 'pulse-glow' : ''}`}>
                      {/* Rank Number */}
                      <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>
                        {isTopThree ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            background: index === 0 ? 'rgba(245, 158, 11, 0.1)' : index === 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(205, 127, 50, 0.1)',
                            border: `1px solid ${index === 0 ? 'var(--accent-amber)' : index === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(205, 127, 50, 0.3)'}`,
                            borderRadius: '50%'
                          }}>
                            <Medal size={16} color={index === 0 ? 'var(--accent-amber)' : index === 1 ? '#E5E7EB' : '#CD7F32'} />
                          </span>
                        ) : (
                          <span style={{ paddingLeft: '10px', color: 'var(--text-secondary)', fontFamily: 'Rajdhani, sans-serif' }}>{index + 1}</span>
                        )}
                      </td>

                      {/* Username */}
                      <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>
                        <Link href={`/profile/${entry.username}`} className="flex-center" style={{ color: '#fff', textDecoration: 'none', gap: '6px', justifyContent: 'flex-start', transition: 'var(--transition)' }}>
                          <span onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue)'} onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}>
                            @{entry.username}
                          </span>
                          {isCurrentUser && <span style={{ fontSize: '9px', background: 'rgba(74, 158, 255, 0.1)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(74, 158, 255, 0.2)', fontWeight: 'bold' }}>YOU</span>}
                        </Link>
                      </td>

                      {/* Tier badge */}
                      <td className="hidden-mobile" style={{ padding: '16px 24px' }}>
                        <span className="badge" style={{
                          background: leaderboardType === 'classic' ? 'rgba(123, 147, 219, 0.06)' : 'rgba(123, 147, 219, 0.06)',
                          border: `1px solid ${leaderboardType === 'classic' ? 'rgba(123, 147, 219, 0.15)' : 'rgba(123, 147, 219, 0.15)'}`,
                          color: leaderboardType === 'classic' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {leaderboardType === 'classic' ? entry.rank : entry.tier}
                        </span>
                      </td>

                      {/* Duels (W/L) or Matches (W/L) */}
                      <td className="hidden-mobile" style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {leaderboardType === 'classic' 
                          ? `${entry.totalDuels} (${entry.totalWins}W / ${entry.totalDuels - entry.totalWins}L)`
                          : `${entry.matchesPlayed} (${entry.wins}W / ${entry.losses}L)`
                        }
                      </td>

                      {/* Tokens or Win Rate */}
                      {leaderboardType === 'classic' ? (
                        <td className="hidden-tablet" style={{ padding: '16px 24px' }}>
                          <div className="flex-center" style={{ gap: '6px', justifyContent: 'flex-start' }}>
                            <Coins size={14} color="var(--accent-amber)" />
                            <span style={{ fontWeight: 'bold' }}>
                              <AnimatedCounter value={entry.tokens} />
                            </span>
                          </div>
                        </td>
                      ) : (
                        <td className="hidden-mobile" style={{ padding: '16px 24px', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                          <AnimatedCounter value={entry.winRate} />%
                        </td>
                      )}

                      {/* Rating score */}
                      <td style={{ padding: '16px 24px', fontWeight: 'bold', color: leaderboardType === 'classic' ? 'var(--accent-blue)' : 'var(--accent-purple)', textAlign: 'right', fontSize: '16px' }}>
                        <AnimatedCounter value={elo} /> {leaderboardType === 'seasonal' && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>RP</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
