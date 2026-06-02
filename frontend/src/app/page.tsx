'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { 
  Play, Users, Award, Trophy, Zap, 
  Calendar, History, ShieldAlert, Sparkles, Flame 
} from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  eloJS: number;
  eloPython: number;
  eloJava: number;
  eloUIUX: number;
  tokens: number;
  rank: string;
}

interface RecentBattle {
  id: string;
  startedAt: string;
  language: string;
  difficulty: string;
  winnerId: string;
  betAmount: number;
  participants: Array<{
    userId: string;
    isWinner: boolean;
    user: {
      username: string;
    }
  }>
}

export default function Dashboard() {
  const { user, setUser } = useStore();
  const [leaderboardLang, setLeaderboardLang] = useState<'javascript' | 'python' | 'java' | 'uiux'>('javascript');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [gameCategory, setGameCategory] = useState<'coders' | 'uiux' | 'growth'>('coders');

  // Fetch Leaderboard
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch(`http://localhost:5001/api/leaderboard?language=${leaderboardLang}`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
        }
      } catch (e) {
        console.error("Failed to load leaderboard", e);
      }
    }
    fetchLeaderboard();
  }, [leaderboardLang]);

  // Fetch Latest Stats and Recent Battles
  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      try {
        const res = await fetch(`http://localhost:5001/api/profile/${user?.username}`);
        if (res.ok) {
          const data = await res.json();
          // Update store user state
          setUser(data);
          // Set recent battles
          if (data.duels) {
            setRecentBattles(data.duels.map((d: any) => d.duel));
          }
        }
      } catch (e) {
        console.error("Failed to fetch latest profile info", e);
      }
    }
    fetchProfile();
  }, [user?.username]);

  const handleDailyClaim = async () => {
    if (!user || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('http://localhost:5001/api/user/dailylogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ ...user, tokens: data.tokens });
        setClaimMessage('Daily Bonus claimed! +10 Tokens 🪙');
      } else {
        setClaimMessage('Already claimed today!');
      }
    } catch (e) {
      setClaimMessage('Error claiming daily bonus.');
    } finally {
      setClaiming(false);
      setTimeout(() => setClaimMessage(''), 3000);
    }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '40px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '32px' }}>
      
      {/* LEFT COLUMN: Main dashboard options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Banner header */}
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(74, 158, 255, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderColor: 'rgba(74, 158, 255, 0.2)',
          padding: '36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 'bold', letterSpacing: '0.1em' }}>WELCOME BACK TO THE ARENA</span>
            <h1 style={{ fontSize: '36px', marginTop: '8px', fontFamily: 'Space Grotesk, sans-serif' }}>
              Ready to code, <span style={{ color: 'var(--accent-green)' }}>@{user.username}</span>?
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px', maxWidth: '500px' }}>
              Choose Javascript, Python, or Java. Pick your bet size, invite a rival, and race to debug in real-time.
            </p>
          </div>
          <div className="float-anim" style={{ fontSize: '64px' }}>⚔️</div>
        </div>

        {/* Game Arenas categories */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Battle Arenas</h2>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', marginBottom: '20px', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setGameCategory('coders')}
              className={`btn ${gameCategory === 'coders' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
            >
              👩‍💻 Coders
            </button>
            <button 
              onClick={() => setGameCategory('uiux')}
              className={`btn ${gameCategory === 'uiux' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
            >
              🎨 UI/UX
            </button>
            <button 
              onClick={() => setGameCategory('growth')}
              className={`btn ${gameCategory === 'growth' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px' }}
            >
              📈 Growth
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
            {gameCategory === 'coders' && (
              <>
                {/* DebugDuel Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Zap size={24} color="var(--accent-green)" />
                      <span className="badge badge-js" style={{ borderColor: 'rgba(0, 255, 148, 0.3)', color: 'var(--accent-green)', background: 'rgba(0, 255, 148, 0.05)' }}>Active</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>DebugDuel</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      1v1 real-time debugging battle. Two developers enter a shared broken codebase — first to find, fix, and explain the bug wins the wager.
                    </p>
                  </div>
                  <Link href="/duel/create" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '16px' }}>
                    <Play size={16} fill="black" /> Enter Arena
                  </Link>
                </div>

                {/* QueryWar Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', opacity: 0.7 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Users size={24} color="var(--accent-purple)" />
                      <span className="badge badge-py" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>QueryWar</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      SQL query optimization battle. Optimize queries on massive datasets. Lowest execution time and cleanest cost metrics wins.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '16px' }} disabled>
                    Locked
                  </button>
                </div>
              </>
            )}

            {gameCategory === 'uiux' && (
              <>
                {/* ColorMatch Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Zap size={24} color="var(--accent-blue)" />
                      <span className="badge badge-js" style={{ borderColor: 'rgba(74, 158, 255, 0.3)', color: 'var(--accent-blue)', background: 'rgba(74, 158, 255, 0.05)' }}>Active</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>ColorMatch</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      Vibrant memorization and color matching battle. Memorize the color card for 6 seconds, then adjust RGB sliders to guess it exactly. Closeness determines the score!
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <Link href="/color-match/solo" className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', fontSize: '13px' }}>
                      Practice Solo
                    </Link>
                    <Link href="/color-match/create" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', fontSize: '13px' }}>
                      <Play size={14} fill="black" style={{ marginRight: '4px' }} /> Battle Friends
                    </Link>
                  </div>
                </div>

                {/* Info Box */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minHeight: '220px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UI/UX Arena Status</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Your current ColorMatch ELO: <strong style={{ color: 'var(--accent-purple)' }}>{user.eloUIUX || 1000}</strong>
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Train your visual memory and RGB composition speed. Match with others to climb the Zero-Day God ranks in styling!
                  </p>
                </div>
              </>
            )}

            {gameCategory === 'growth' && (
              <>
                {/* MarketingBattle Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', opacity: 0.7 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Users size={24} color="var(--accent-purple)" />
                      <span className="badge badge-py" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>MarketingBattle</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      Copywriting battle. Write highly converting headlines or email hooks based on product specs. AI judged.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '16px' }} disabled>
                    Locked
                  </button>
                </div>

                {/* PitchArena Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', opacity: 0.7 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Users size={24} color="var(--accent-purple)" />
                      <span className="badge badge-py" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>PitchArena</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      60-second pitch elevator battle. Submit your hook and description for a startup idea. AI judges structure + impact.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '16px' }} disabled>
                    Locked
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Practice Mode (Daily Challenge) */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(245, 166, 35, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(245, 166, 35, 0.2)' }}>
              <Calendar size={24} color="var(--accent-amber)" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px' }}>Daily Solo Warmup</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Practice solving bugs for free. No ELO or token bets, just clean daily training.</p>
            </div>
          </div>
          <Link href="/practice" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Warm Up
          </Link>
        </div>

        {/* Recent Battles */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Recent Battles</h2>
          {recentBattles.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <History size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No duels recorded yet. Challenge a friend to log your first match!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentBattles.map((battle) => {
                const isWinner = battle.winnerId === user.id;
                const opponent = battle.participants.find(p => p.userId !== user.id)?.user.username || "Unknown Opponent";
                const langBadgeClass = battle.language === 'javascript' ? 'badge-js' : battle.language === 'python' ? 'badge-py' : 'badge-java';

                return (
                  <div key={battle.id} className="glass-panel" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderColor: isWinner ? 'rgba(0, 255, 148, 0.2)' : 'rgba(255, 68, 68, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={`badge ${langBadgeClass}`} style={{ fontSize: '10px' }}>{battle.language}</span>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          vs <span style={{ color: 'var(--accent-blue)' }}>@{opponent}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Difficulty: {battle.difficulty} • Bet: {battle.betAmount} tokens
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: isWinner ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {isWinner ? 'WINNER +50' : 'DEFEAT'}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {new Date(battle.startedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Player Card & Leaderboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Player Profile Summary */}
        <div className="glass-panel" style={{
          background: 'linear-gradient(to bottom, #1A1A22, #141419)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Avatar frame */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: 'bold',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
          }}>
            {user.username[0].toUpperCase()}
          </div>

          <div>
            <h2 style={{ fontSize: '22px' }}>@{user.username}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <span style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'var(--accent-purple)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {user.rank}
              </span>
              {user.currentStreak >= 3 && (
                <div className="flex-center" style={{ gap: '2px', color: 'var(--accent-red)' }} title="Hot Win Streak!">
                  <Flame size={14} fill="var(--accent-red)" />
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{user.currentStreak}x</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats block */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            width: '100%',
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            marginTop: '8px',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{user.totalWins}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL WINS</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.totalDuels}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL DUELS</div>
            </div>
          </div>

          {/* ELO List */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginTop: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ELO BREAKDOWN</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px' }}>
              <span>Javascript</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>{user.eloJS}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px' }}>
              <span>Python</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{user.eloPython}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px' }}>
              <span>Java</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>{user.eloJava}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px' }}>
              <span>UI/UX (ColorMatch)</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>{user.eloUIUX}</span>
            </div>
          </div>

          {/* Daily login button */}
          <button 
            className="btn btn-success" 
            style={{ width: '100%', marginTop: '8px', gap: '8px' }}
            onClick={handleDailyClaim}
            disabled={claiming}
          >
            <Sparkles size={16} /> Claim Daily Reward (+10)
          </button>
          {claimMessage && (
            <div style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 'bold' }}>{claimMessage}</div>
          )}
        </div>

        {/* Leaderboard panel */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="flex-center" style={{ gap: '8px' }}>
              <Trophy size={18} color="var(--accent-amber)" />
              <h2 style={{ fontSize: '18px' }}>Leaderboard</h2>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#141419', padding: '2px', borderRadius: '6px', marginBottom: '12px' }}>
            <button 
              onClick={() => setLeaderboardLang('javascript')} 
              style={{
                flex: 1,
                background: leaderboardLang === 'javascript' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              JS
            </button>
            <button 
              onClick={() => setLeaderboardLang('python')} 
              style={{
                flex: 1,
                background: leaderboardLang === 'python' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              PY
            </button>
            <button 
              onClick={() => setLeaderboardLang('java')} 
              style={{
                flex: 1,
                background: leaderboardLang === 'java' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              JV
            </button>
            <button 
              onClick={() => setLeaderboardLang('uiux')} 
              style={{
                flex: 1,
                background: leaderboardLang === 'uiux' ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                color: '#fff',
                padding: '6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              UX
            </button>
          </div>

          {/* Leaderboard entries */}
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Loading leaderboard...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.slice(0, 5).map((entry, index) => {
                const elo = leaderboardLang === 'javascript' ? entry.eloJS : 
                            leaderboardLang === 'python' ? entry.eloPython : 
                            leaderboardLang === 'java' ? entry.eloJava : 
                            entry.eloUIUX;
                const isCurrentUser = entry.username === user.username;
                return (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: isCurrentUser ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
                    borderRadius: '6px',
                    border: isCurrentUser ? '1px solid rgba(74, 158, 255, 0.2)' : '1px solid transparent'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: index === 0 ? 'var(--accent-amber)' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text-secondary)',
                        width: '16px'
                      }}>
                        #{index + 1}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
                        @{entry.username} {isCurrentUser && ' (You)'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{elo} ELO</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
