'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { 
  Play, Users, Award, Trophy, Zap, 
  Calendar, History, ShieldAlert, Sparkles, Flame,
  Swords, UserPlus, Copy, Check
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface LeaderboardEntry {
  id: string;
  username: string;
  eloJS: number;
  eloPython: number;
  eloJava: number;
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
  const [leaderboardLang, setLeaderboardLang] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [gameCategory, setGameCategory] = useState<'coders' | 'uiux' | 'growth'>('coders');

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
                {/* DesignDuel Card */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', opacity: 0.7 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <Users size={24} color="var(--accent-purple)" />
                      <span className="badge badge-py" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Coming Soon</span>
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>DesignDuel</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '18px' }}>
                      UI/UX design challenge. Translate user requirements into a mock wireframe or design under 10 minutes. Peer voted.
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '16px' }} disabled>
                    Locked
                  </button>
                </div>

                {/* Info Box */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', fontSize: '13px' }}>
                  More UI/UX minigames in development...
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
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                No friends added yet.<br/>Share your key to start dueling!
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
          </div>

          {/* Leaderboard entries */}
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              Loading leaderboard...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.slice(0, 5).map((entry, index) => {
                const elo = leaderboardLang === 'javascript' ? entry.eloJS : leaderboardLang === 'python' ? entry.eloPython : entry.eloJava;
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
