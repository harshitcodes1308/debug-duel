'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { 
  Play, Users, Award, Trophy, Zap, 
  Calendar, History, ShieldAlert, Sparkles, Flame,
  Swords, UserPlus, Copy, Check, Code, Palette, TrendingUp,
  Clock, Coins, Activity
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
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
}

interface RecentBattle {
  id: string;
  startedAt: string;
  endedAt?: string;
  createdAt?: string;
  gameType?: string;
  status?: string;
  language: string;
  difficulty: string;
  winnerId: string;
  betAmount: number;
  participants: Array<{
    userId: string;
    isWinner: boolean;
    submitTime?: number;
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
  const [showLevelUpEffect, setShowLevelUpEffect] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      const currentLevel = user.level || 1;
      if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
        setShowLevelUpEffect(true);
        const timer = setTimeout(() => {
          setShowLevelUpEffect(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
      prevLevelRef.current = currentLevel;
    }
  }, [user?.level]);

  // Friends System states
  const [friends, setFriends] = useState<any[]>([]);
  const [friendKeyInput, setFriendKeyInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [addFriendError, setAddFriendError] = useState('');
  const [addFriendSuccess, setAddFriendSuccess] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Challenge Modal states
  const [challengeFriend, setChallengeFriend] = useState<any | null>(null);
  const [challengeLang, setChallengeLang] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [challengeDifficulty, setChallengeDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [challengeBet, setChallengeBet] = useState(50);
  const [challengeError, setChallengeError] = useState('');
  const [challengeLoading, setChallengeLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket for invites
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('register_user', { userId: user.id });

    socket.on('invite_sent', ({ duelId }) => {
      window.location.href = `/duel/lobby/${duelId}`;
    });

    socket.on('invite_failed', ({ error }) => {
      setChallengeError(error);
      setChallengeLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5001/api/friends?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (e) {
      console.error("Failed to fetch friends list", e);
    }
  };

  // Poll friends list
  useEffect(() => {
    fetchFriends();
    const interval = setInterval(fetchFriends, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAddFriend = async () => {
    if (!user || !friendKeyInput.trim()) return;
    setAddingFriend(true);
    setAddFriendError('');
    setAddFriendSuccess('');
    try {
      const res = await fetch('http://localhost:5001/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendKey: friendKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setAddFriendSuccess(`Added @${data.friend.username}!`);
        setFriendKeyInput('');
        fetchFriends();
      } else {
        setAddFriendError(data.error || "Failed to add friend.");
      }
    } catch (e) {
      setAddFriendError("Failed to connect to backend.");
    } finally {
      setAddingFriend(false);
    }
  };

  const handleCopyFriendKey = () => {
    if (!user?.friendKey) return;
    navigator.clipboard.writeText(user.friendKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSendChallenge = () => {
    if (!socketRef.current || !challengeFriend || !user) return;
    setChallengeLoading(true);
    setChallengeError('');

    socketRef.current.emit('send_duel_invite', {
      hostId: user.id,
      hostUsername: user.username,
      friendId: challengeFriend.id,
      language: challengeLang,
      difficulty: challengeDifficulty,
      betAmount: challengeBet
    });
  };

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
        setUser({ ...user, tokens: data.tokens, xp: data.xp, level: data.level });
        setClaimMessage(`Daily Bonus claimed! +${data.added || 50} Tokens (Streak: ${data.streak || 1} day${(data.streak || 1) > 1 ? 's' : ''})`);
      } else {
        try {
          const data = await res.json();
          setClaimMessage(data.error || 'Already claimed today!');
        } catch {
          setClaimMessage('Already claimed today!');
        }
      }
    } catch (e) {
      setClaimMessage('Error claiming daily bonus.');
    } finally {
      setClaiming(false);
      setTimeout(() => setClaimMessage(''), 3000);
    }
  };

  if (!user) return null;

  // Calculations for Performance Overview
  const totalTokensWon = recentBattles.reduce((acc, battle) => {
    const myParticipant = battle.participants?.find(p => p.userId === user?.id);
    if (myParticipant?.isWinner) {
      return acc + (battle.betAmount || 0) + 50; // bet amount + 50 base bonus
    }
    return acc;
  }, 0);

  const solveTimes = recentBattles
    .map(battle => {
      const myParticipant = battle.participants?.find(p => p.userId === user?.id);
      return myParticipant?.submitTime;
    })
    .filter((time): time is number => typeof time === 'number' && time > 0);

  const averageSolveTime = solveTimes.length > 0
    ? Math.round(solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length)
    : 0;

  const getEloTrendPoints = () => {
    const currentElo = user.eloJS;
    const points = [currentElo];
    let tempElo = currentElo;
    
    for (let i = recentBattles.length - 1; i >= 0; i--) {
      const battle = recentBattles[i];
      const myParticipant = battle.participants?.find(p => p.userId === user.id);
      const isWinner = myParticipant?.isWinner;
      const isDraw = !isWinner && (!battle.participants?.find(p => p.userId !== user.id) || !battle.participants?.find(p => p.userId !== user.id)?.isWinner) && battle.status === 'completed';
      
      if (isWinner) {
        tempElo -= 20;
      } else if (!isDraw && battle.status === 'completed') {
        tempElo += 15;
      }
      points.unshift(tempElo);
    }
    return points;
  };

  const renderSparkline = () => {
    const points = getEloTrendPoints();
    const width = 140;
    const height = 44;
    const padding = 4;
    
    if (points.length < 2) {
      return (
        <svg width={width} height={height} style={{ opacity: 0.3 }}>
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="var(--accent-blue)" strokeWidth="2" strokeDasharray="3,3" />
        </svg>
      );
    }
    
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min === 0 ? 1 : max - min;
    
    const coords = points.map((p, index) => {
      const x = padding + (index / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - min) / range) * (height - 2 * padding);
      return { x, y };
    });
    
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
    
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkline-grad)" />
        <path d={linePath} fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill="var(--accent-blue)" />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="6" fill="var(--accent-blue)" opacity="0.3" />
      </svg>
    );
  };

  return (
    <div className="container dashboard-grid">
      
      <div className="dashboard-column-left">
        {/* 1. HERO WELCOME BANNER */}
        <div className="dashboard-hero">
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
            <div className="float-anim" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Swords size={48} color="var(--accent-blue)" />
            </div>
          </div>
        </div>

        {/* PERFORMANCE OVERVIEW SECTION */}
        <div className="glass-panel card-shine" style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Activity size={14} color="var(--accent-blue)" /> Performance Overview
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Recent ELO Trend
            </span>
          </div>

          <div className="performance-overview-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* 2-column Stat Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))',
              gap: '16px 24px',
              flex: 1
            }}>
              {/* Stat 1: Win Rate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <Award size={18} color="var(--accent-green)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Win Rate</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    <AnimatedCounter value={user.totalDuels > 0 ? Math.round((user.totalWins / user.totalDuels) * 100) : 0} />%
                  </span>
                </div>
              </div>

              {/* Stat 2: Current Streak */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <Flame size={18} color="var(--accent-red)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current Streak</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-red)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    <AnimatedCounter value={user.currentStreak} />
                  </span>
                </div>
              </div>

              {/* Stat 3: Total Tokens Won */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <Coins size={18} color="var(--accent-amber)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Recent Winnings</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    <AnimatedCounter value={totalTokensWon} />
                  </span>
                </div>
              </div>

              {/* Stat 4: Average Solve Time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <Clock size={18} color="var(--accent-blue)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Solve Time</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {averageSolveTime > 0 ? `${averageSolveTime}s` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visualization Component */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '140px' }}>
              {renderSparkline()}
            </div>

          </div>
        </div>

      {/* 2. GAME ARENAS CATEGORIES & CARDS */}
      <div className="dashboard-games" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Game Arenas categories */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Battle Arenas</h2>
          
          {/* Category Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', marginBottom: '20px', maxWidth: '400px', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setGameCategory('coders')}
              className={`btn ${gameCategory === 'coders' ? 'btn-primary' : 'btn-secondary'} interactive-lift`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px', gap: '6px' }}
            >
              <Code size={14} /> Coders
            </button>
            <button 
              onClick={() => setGameCategory('uiux')}
              className={`btn ${gameCategory === 'uiux' ? 'btn-primary' : 'btn-secondary'} interactive-lift`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px', gap: '6px' }}
            >
              <Palette size={14} /> UI/UX
            </button>
            <button 
              onClick={() => setGameCategory('growth')}
              className={`btn ${gameCategory === 'growth' ? 'btn-primary' : 'btn-secondary'} interactive-lift`}
              style={{ flex: 1, border: 'none', height: '40px', fontSize: '13px', gap: '6px' }}
            >
              <TrendingUp size={14} /> Growth
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {gameCategory === 'coders' && (
              <>
                {/* DebugDuel Card */}
                <div className="glass-panel card-shine glow-primary theme-debug-duel interactive-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Zap size={24} color="var(--accent-blue)" />
                      <span className="badge" style={{ borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.04)', fontSize: '10px', fontWeight: 'bold' }}>Active</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>DebugDuel</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      1v1 real-time debugging battle. Two developers enter a shared broken codebase — first to find, fix, and explain the bug wins the wager.
                    </p>
                  </div>
                  <Link href="/duel/create" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '20px', gap: '8px' }}>
                    <Play size={14} fill="currentColor" /> Enter Arena
                  </Link>
                </div>

                {/* Code KBC Card */}
                <div className="glass-panel card-shine glow-purple theme-kbc interactive-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Trophy size={24} color="var(--accent-purple)" />
                      <span className="badge" style={{ borderColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.04)', fontSize: '10px', fontWeight: 'bold' }}>Active</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>Code KBC</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      Test your coding knowledge. Climb the ladder. Beat your friends.
                    </p>
                  </div>
                  <Link href="/kbc" className="btn" style={{ alignSelf: 'flex-start', marginTop: '20px', gap: '8px', background: 'var(--accent-purple)', color: '#FFF', borderColor: 'rgba(139, 92, 246, 0.4)' }}>
                    <Play size={14} fill="currentColor" /> Play Now
                  </Link>
                </div>

                {/* QueryWar Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px', opacity: 0.65 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Users size={24} color="var(--text-secondary)" />
                      <span className="badge" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', fontSize: '10px', fontWeight: 'bold' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>QueryWar</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      SQL query optimization battle. Optimize queries on massive datasets. Lowest execution time and cleanest cost metrics wins.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '20px' }} disabled>
                    Locked
                  </button>
                </div>
              </>
            )}

            {gameCategory === 'uiux' && (
              <>
                {/* ColorMatch Card */}
                <div className="glass-panel card-shine glow-warning theme-color-match interactive-lift" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Zap size={24} color="var(--accent-amber)" />
                      <span className="badge" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.04)', fontSize: '10px', fontWeight: 'bold' }}>Active</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>ColorMatch</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      Vibrant memorization and color matching battle. Memorize the color card for 6 seconds, then adjust RGB sliders to guess it exactly. Closeness determines the score!
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <Link href="/color-match/solo" className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', fontSize: '13px' }}>
                      Practice Solo
                    </Link>
                    <Link href="/color-match/create" className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', fontSize: '13px', background: 'var(--accent-amber)', color: '#000', borderColor: 'rgba(245, 158, 11, 0.4)', gap: '6px' }}>
                      <Play size={14} fill="currentColor" /> Battle Friends
                    </Link>
                  </div>
                </div>

                {/* Info Box */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', minHeight: '230px', padding: '24px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UI/UX Arena Status</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Your current ColorMatch ELO: <strong style={{ color: 'var(--accent-purple)', fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif' }}>{user.eloUIUX || 1000}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      Train your visual memory and RGB composition speed. Match with others to climb the Zero-Day God ranks in styling!
                    </p>
                  </div>
                </div>
              </>
            )}

            {gameCategory === 'growth' && (
              <>
                {/* MarketingBattle Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px', opacity: 0.65 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Users size={24} color="var(--text-secondary)" />
                      <span className="badge" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', fontSize: '10px', fontWeight: 'bold' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>MarketingBattle</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      Copywriting battle. Write highly converting headlines or email hooks based on product specs. AI judged.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '20px' }} disabled>
                    Locked
                  </button>
                </div>

                {/* PitchArena Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px', padding: '24px', opacity: 0.65 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <Users size={24} color="var(--text-secondary)" />
                      <span className="badge" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', fontSize: '10px', fontWeight: 'bold' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '8px' }}>PitchArena</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                      60-second pitch elevator battle. Submit your hook and description for a startup idea. AI judges structure + impact.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '20px' }} disabled>
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
      </div>

      {/* 3. PERFORMANCE STATS & RECENT BATTLES */}
      <div className="dashboard-stats" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Recent Battles */}
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Recent Battles</h2>
          {recentBattles.length === 0 ? (
            <div className="glass-panel glow-primary" style={{ textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', padding: '16px', borderRadius: '50%' }}>
                <History size={36} style={{ opacity: 0.5, color: 'var(--accent-blue)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>No duels recorded yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '300px', margin: '0 auto', lineHeight: '18px' }}>
                  Challenge an online friend from your list or generate a lobby to log your first match!
                </p>
              </div>
              <Link href="/duel/create" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', gap: '6px', borderRadius: 'var(--radius-md)' }}>
                Create Duel Room
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentBattles.map((battle) => {
                const myParticipant = battle.participants.find(p => p.userId === user.id);
                const isWinner = myParticipant?.isWinner;
                const opponentParticipant = battle.participants.find(p => p.userId !== user.id);
                const isDraw = !isWinner && (!opponentParticipant || !opponentParticipant.isWinner) && battle.status === 'completed';
                const isLoss = !isWinner && !isDraw && battle.status === 'completed';
                const isOngoing = battle.status !== 'completed';

                const opponent = opponentParticipant?.user?.username || "Opponent";
                const dateToUse = battle.endedAt || battle.startedAt || battle.createdAt;
                const formattedDate = dateToUse ? new Date(dateToUse).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Unknown Date';

                // Game Type styling
                let gameLabel = 'DebugDuel';
                let gameColor = 'var(--accent-blue)';
                if (battle.gameType === 'color_match') {
                  gameLabel = 'ColorMatch';
                  gameColor = 'var(--accent-amber)';
                } else if (battle.gameType === 'kbc') {
                  gameLabel = 'Code KBC';
                  gameColor = 'var(--accent-purple)';
                }

                // Category or language details
                const detailLabel = battle.gameType === 'color_match' ? 'RGB' : (battle.language ? battle.language.toUpperCase() : 'UIUX');
                const langBadgeClass = battle.language === 'javascript' ? 'badge-js' : battle.language === 'python' ? 'badge-py' : 'badge-java';

                return (
                  <div key={battle.id} 
                    className="interactive-lift"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border)',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: gameColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          {gameLabel}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${langBadgeClass}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{detailLabel}</span>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#FFF' }}>
                            vs <span style={{ color: 'var(--accent-blue)' }}>@{opponent}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {battle.difficulty ? battle.difficulty.toUpperCase() : 'MEDIUM'} • {battle.betAmount} Tokens
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {formattedDate}
                        </span>
                      </div>

                      {/* Outcome Badge */}
                      <div style={{ minWidth: '85px', textAlign: 'center' }}>
                        {isOngoing ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            textTransform: 'uppercase'
                          }}>
                            Active
                          </span>
                        ) : isWinner ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.08)',
                            color: 'var(--accent-green)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            textTransform: 'uppercase'
                          }}>
                            Win
                          </span>
                        ) : isLoss ? (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--accent-red)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            textTransform: 'uppercase'
                          }}>
                            Loss
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(245, 158, 11, 0.08)',
                            color: 'var(--accent-amber)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            textTransform: 'uppercase'
                          }}>
                            Draw
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Performance Overview & Visualization */}
        <div style={{ marginTop: '16px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Performance & Analytics</h2>
          
          <div className="performance-visualization-grid">
            {/* Stats Cards Grid */}
            <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', padding: '24px' }}>
              {/* Stat 1: Win Rate */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Win Rate</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-green)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AnimatedCounter value={user.totalDuels > 0 ? Math.round((user.totalWins / user.totalDuels) * 1000) / 10 : 0} />%
                </span>
              </div>

              {/* Stat 2: Total Matches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Matches</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AnimatedCounter value={user.totalDuels} />
                </span>
              </div>

              {/* Stat 3: Current Streak */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Streak</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-red)', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AnimatedCounter value={user.currentStreak} />
                  {user.currentStreak >= 3 && <Flame size={20} fill="var(--accent-red)" style={{ display: 'inline' }} />}
                </span>
              </div>

              {/* Stat 4: Best Streak */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Best Streak</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AnimatedCounter value={user.bestStreak || 0} />
                </span>
              </div>

              {/* Stat 5: Tokens Earned/Balance */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Token Balance</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: 'Space Grotesk, sans-serif' }}>
                  <AnimatedCounter value={user.tokens} />
                </span>
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: '8px' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const winRate = user.totalDuels > 0 ? (user.totalWins / user.totalDuels) * 100 : 0;
                  const radius = 38;
                  const circumference = 2 * Math.PI * radius; // 238.76
                  const strokeDashoffset = circumference - (circumference * winRate) / 100;
                  return (
                    <>
                      <svg width="110" height="110" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                        {/* Background track circle */}
                        <circle
                          cx="55"
                          cy="55"
                          r={radius}
                          fill="transparent"
                          stroke="rgba(239, 68, 68, 0.15)"
                          strokeWidth="10"
                        />
                        {/* Wins circle */}
                        <circle
                          cx="55"
                          cy="55"
                          r={radius}
                          fill="transparent"
                          stroke="var(--accent-green)"
                          strokeWidth="10"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                        />
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, fontFamily: 'Space Grotesk, sans-serif' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#FFF' }}>
                          {user.totalDuels > 0 ? Math.round((user.totalWins / user.totalDuels) * 100) : 0}%
                        </span>
                        <span style={{ fontSize: '8px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Win rate
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '10px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }} /> Wins ({user.totalWins})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.7)' }} /> Losses ({user.totalDuels - user.totalWins})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div> {/* End of dashboard-column-left */}

      <div className="dashboard-column-right">

      {/* 4. PLAYER PROFILE SUMMARY CARD */}
      <div className="dashboard-profile">
        
        {/* Player Profile Summary */}
        <div className="card-base card-shine glow-purple" style={{
          background: 'linear-gradient(to bottom, #15151C, #0F0F15)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          transition: 'var(--transition)'
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
            boxShadow: '0 0 24px rgba(139, 92, 246, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.1)'
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
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>
                    <AnimatedCounter value={user.currentStreak} />x
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* XP and Level progress */}
          {(() => {
            const level = user.level || 1;
            const currentXp = user.xp || 0;
            const minXpForCurrentLevel = Math.pow(level - 1, 2) * 100;
            const minXpForNextLevel = Math.pow(level, 2) * 100;
            const xpRangeForLevel = minXpForNextLevel - minXpForCurrentLevel;
            const xpEarnedInLevel = Math.max(0, currentXp - minXpForCurrentLevel);
            const progressPercent = Math.min(100, Math.max(0, (xpEarnedInLevel / xpRangeForLevel) * 100));

            return (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>LEVEL {level}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {currentXp} / {minXpForNextLevel} XP
                  </span>
                </div>
                {/* Progress Bar Container */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease-out'
                  }} />
                </div>
                {showLevelUpEffect && (
                  <div className="pulse-glow" style={{
                    color: 'var(--accent-amber)',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    justifyContent: 'center',
                    animation: 'slideUp 0.3s ease-out'
                  }}>
                    <Sparkles size={14} color="var(--accent-amber)" /> LEVEL UP! LEVEL {level} REACHED
                  </div>
                )}
              </div>
            );
          })()}

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
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                <AnimatedCounter value={user.totalWins} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL WINS</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <AnimatedCounter value={user.totalDuels} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL DUELS</div>
            </div>
          </div>

          {/* ELO List */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>ELO BREAKDOWN</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Javascript</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                <AnimatedCounter value={user.eloJS} />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Python</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                <AnimatedCounter value={user.eloPython} />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Java</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-red)' }}>
                <AnimatedCounter value={user.eloJava} />
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>UI/UX (ColorMatch)</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                <AnimatedCounter value={user.eloUIUX} />
              </span>
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
      </div>

      {/* 5. LEADERBOARD & FRIENDS LIST */}
      <div className="dashboard-leaderboard">

        {/* Friends list panel */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex-center" style={{ gap: '8px' }}>
              <Users size={18} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '18px' }}>Friends List</h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{friends.length} Friends</span>
          </div>

          {/* Copy Key */}
          {user.friendKey && (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>YOUR FRIEND KEY</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <code style={{ fontSize: '12px', color: 'var(--accent-blue)', wordBreak: 'break-all' }}>{user.friendKey}</code>
                <button 
                  onClick={handleCopyFriendKey}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedKey ? 'var(--accent-green)' : 'var(--text-secondary)' }}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Add Friend Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Paste Friend Key sk_dd_..."
                value={friendKeyInput}
                onChange={(e) => setFriendKeyInput(e.target.value)}
                style={{
                  flex: 1,
                  background: '#141419',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAddFriend}
                disabled={addingFriend || !friendKeyInput.trim()}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px' }}
              >
                Add
              </button>
            </div>
            {addFriendError && <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>{addFriendError}</span>}
            {addFriendSuccess && <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>{addFriendSuccess}</span>}
          </div>

          {/* Friends List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {friends.length === 0 ? (
              <div className="flex-center" style={{ 
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'center', 
                padding: '24px 16px', 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                border: '1px dashed rgba(255, 255, 255, 0.1)', 
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255, 255, 255, 0.005)',
                width: '100%'
              }}>
                <Users size={24} style={{ opacity: 0.4, color: 'var(--accent-purple)' }} />
                <div>
                  <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No friends added yet</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '15px' }}>
                    Share your friend key with a rival or paste theirs to start battling!
                  </p>
                </div>
              </div>
            ) : (
              friends.map((friend) => {
                const maxElo = Math.max(friend.eloJS, friend.eloPython, friend.eloJava);
                const statusColors = {
                  online: 'var(--accent-green)',
                  ingame: 'var(--accent-amber)',
                  offline: 'var(--text-secondary)'
                };
                const statusLabel = {
                  online: 'Online',
                  ingame: 'In Game',
                  offline: 'Offline'
                };
                
                return (
                  <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                        border: `1px solid ${statusColors[friend.status as 'online'|'ingame'|'offline']}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        position: 'relative'
                      }}>
                        {friend.username[0].toUpperCase()}
                        <div style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: statusColors[friend.status as 'online'|'ingame'|'offline'],
                          border: '1px solid var(--bg-primary)'
                        }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>@{friend.username}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {friend.rank} • {maxElo} ELO
                        </div>
                      </div>
                    </div>

                    <div>
                      {friend.status === 'online' ? (
                        <button
                          onClick={() => setChallengeFriend(friend)}
                          className="btn btn-primary"
                          style={{ padding: '6px 10px', fontSize: '11px', height: '28px', borderRadius: '4px' }}
                        >
                          <Swords size={12} /> Challenge
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                          {statusLabel[friend.status as 'online'|'ingame'|'offline']}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
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

      </div> {/* End of dashboard-column-right */}

      {/* Challenge Invitation Modal */}
      {challengeFriend && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(13, 13, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Swords size={22} color="var(--accent-purple)" /> Challenge @{challengeFriend.username}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Configure the duel parameters. Both players must wager the specified tokens.
            </p>

            {challengeError && (
              <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '6px', padding: '10px', color: 'var(--accent-red)', fontSize: '12px' }}>
                {challengeError}
              </div>
            )}

            {/* Language */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>LANGUAGE</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['javascript', 'python', 'java'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setChallengeLang(lang as any)}
                    className={`btn ${challengeLang === lang ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '36px', fontSize: '12px', textTransform: 'capitalize' }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>DIFFICULTY</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setChallengeDifficulty(diff as any)}
                    className={`btn ${
                      challengeDifficulty === diff 
                        ? (diff === 'easy' ? 'btn-success' : diff === 'medium' ? 'btn-primary' : 'btn-danger') 
                        : 'btn-secondary'
                    }`}
                    style={{
                      height: '36px',
                      fontSize: '12px',
                      textTransform: 'capitalize',
                      background: challengeDifficulty === diff && diff === 'medium' ? 'var(--accent-amber)' : undefined,
                      borderColor: challengeDifficulty === diff && diff === 'medium' ? 'var(--accent-amber)' : undefined,
                      color: challengeDifficulty === diff && diff !== 'hard' ? 'black' : 'white'
                    }}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>WAGER BET (TOKENS)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                {[25, 50, 100, 250].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setChallengeBet(val)}
                    className={`btn ${challengeBet === val ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '36px', fontSize: '12px' }}
                    disabled={val > user.tokens}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleSendChallenge}
                disabled={challengeLoading}
                className="btn btn-success"
                style={{ flex: 1, height: '44px' }}
              >
                {challengeLoading ? "Sending invite..." : "Send Invitation"}
              </button>
              <button
                type="button"
                onClick={() => { setChallengeFriend(null); setChallengeError(''); }}
                disabled={challengeLoading}
                className="btn btn-secondary"
                style={{ flex: 1, height: '44px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
