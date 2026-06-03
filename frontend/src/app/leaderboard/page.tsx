'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { ArrowLeft, Trophy, Medal, Award, Coins } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';

interface LeaderboardEntry {
  id: string;
  username: string;
  eloJS: number;
  eloPython: number;
  eloJava: number;
  tokens: number;
  rank: string;
  totalWins: number;
  totalDuels: number;
}

export default function LeaderboardPage() {
  const { user } = useStore();
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5001/api/leaderboard?language=${language}`);
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

    fetchLeaderboard();
  }, [language]);

  if (!user) return null;

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
          background: 'rgba(245, 166, 35, 0.1)',
          border: '1px solid rgba(245, 166, 35, 0.2)',
          padding: '12px',
          borderRadius: '10px'
        }}>
          <Trophy size={28} color="var(--accent-amber)" />
        </div>
        <div>
          <h1 style={{ fontSize: '28px' }}>Global Leaderboards</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Climb the ELO rankings in JavaScript, Python, or Java and claim your crown as the Zero-Day God.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        padding: '4px',
        borderRadius: '8px',
        maxWidth: '360px',
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
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            Loading rankings...
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            No rankings logged yet. Be the first to win a duel!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>RANK</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>PLAYER</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>TIER</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>DUELS (W/L)</th>
                <th style={{ padding: '16px 24px', fontWeight: '600' }}>TOKENS</th>
                <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>ELO RATING</th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, index) => {
                const elo = language === 'javascript' ? entry.eloJS : language === 'python' ? entry.eloPython : entry.eloJava;
                const isCurrentUser = entry.username === user.username;
                const isTopThree = index < 3;

                return (
                  <tr key={entry.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: isCurrentUser ? 'rgba(74, 158, 255, 0.04)' : 'transparent',
                    transition: 'var(--transition)',
                    animationDelay: `${index * 40}ms`,
                    opacity: 0
                  }} className={`slide-up-anim ${isCurrentUser ? 'pulse-glow' : ''}`}>
                    {/* Rank Number */}
                    <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>
                      {isTopThree ? (
                        <span style={{
                          fontSize: '18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px'
                        }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>{index + 1}</span>
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
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge" style={{
                        background: 'rgba(139, 92, 246, 0.06)',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                        color: 'var(--accent-purple)',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {entry.rank}
                      </span>
                    </td>

                    {/* Duels (W/L) */}
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                      {entry.totalDuels} ({entry.totalWins}W / {entry.totalDuels - entry.totalWins}L)
                    </td>

                    {/* Tokens */}
                    <td style={{ padding: '16px 24px' }}>
                      <div className="flex-center" style={{ gap: '6px', justifyContent: 'flex-start' }}>
                        <Coins size={14} color="var(--accent-amber)" />
                        <span style={{ fontWeight: 'bold' }}>
                          <AnimatedCounter value={entry.tokens} />
                        </span>
                      </div>
                    </td>

                    {/* ELO Rating */}
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: 'var(--accent-blue)', textAlign: 'right', fontSize: '16px' }}>
                      <AnimatedCounter value={elo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
