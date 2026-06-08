'use client';

import React, { useEffect, useState } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Award, Flame, Zap, Shield, 
  History, Swords, TrendingUp, Sparkles,
  Trophy, Play, Calendar, Users, Lock
} from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';

interface ParticipantDetails {
  userId: string;
  isWinner: boolean;
  user: {
    username: string;
  };
}

interface DuelHistoryItem {
  id: string;
  startedAt: string;
  endedAt: string;
  language: string;
  difficulty: string;
  winnerId: string;
  betAmount: number;
  participants: ParticipantDetails[];
}

interface ProfileResponse extends UserProfile {
  duels: Array<{
    id: string;
    duelId: string;
    userId: string;
    duel: DuelHistoryItem;
  }>;
}

const ALL_ACHIEVEMENTS = [
  {
    id: "combat_first_blood",
    title: "First Blood",
    description: "Win your first duel",
    icon: "Swords",
    rarity: "Common",
    category: "Combat",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "combat_exterminator",
    title: "Bug Exterminator",
    description: "Win 10 duels",
    icon: "Zap",
    rarity: "Rare",
    category: "Combat",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "combat_veteran",
    title: "Arena Veteran",
    description: "Win 50 duels",
    icon: "Trophy",
    rarity: "Epic",
    category: "Combat",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "combat_legend",
    title: "Debug Legend",
    description: "Win 100 duels",
    icon: "Award",
    rarity: "Legendary",
    category: "Combat",
    xpReward: 250,
    tokenReward: 100
  },
  {
    id: "streak_on_fire",
    title: "On Fire",
    description: "3 win streak",
    icon: "Flame",
    rarity: "Common",
    category: "Streak",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "streak_unstoppable",
    title: "Unstoppable",
    description: "7 win streak",
    icon: "Flame",
    rarity: "Rare",
    category: "Streak",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "streak_monster_run",
    title: "Monster Run",
    description: "15 win streak",
    icon: "Flame",
    rarity: "Epic",
    category: "Streak",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "progression_level_5",
    title: "Level 5",
    description: "Reach Level 5",
    icon: "Shield",
    rarity: "Common",
    category: "Progression",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "progression_level_10",
    title: "Level 10",
    description: "Reach Level 10",
    icon: "Shield",
    rarity: "Rare",
    category: "Progression",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "progression_level_25",
    title: "Level 25",
    description: "Reach Level 25",
    icon: "Shield",
    rarity: "Epic",
    category: "Progression",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "progression_level_50",
    title: "Level 50",
    description: "Reach Level 50",
    icon: "Shield",
    rarity: "Legendary",
    category: "Progression",
    xpReward: 250,
    tokenReward: 100
  },
  {
    id: "kbc_hot_seat",
    title: "Hot Seat",
    description: "Complete first KBC run",
    icon: "Play",
    rarity: "Common",
    category: "KBC",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "kbc_quiz_master",
    title: "Quiz Master",
    description: "Win 10 KBC matches",
    icon: "Trophy",
    rarity: "Rare",
    category: "KBC",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "kbc_millionaire",
    title: "Code Millionaire",
    description: "Reach highest KBC tier",
    icon: "Award",
    rarity: "Epic",
    category: "KBC",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "consistency_grinder",
    title: "Daily Grinder",
    description: "Claim daily reward 7 days",
    icon: "Calendar",
    rarity: "Rare",
    category: "Consistency",
    xpReward: 50,
    tokenReward: 25
  },
  {
    id: "consistency_dedication",
    title: "Dedication",
    description: "Claim daily reward 30 days",
    icon: "Calendar",
    rarity: "Epic",
    category: "Consistency",
    xpReward: 100,
    tokenReward: 50
  },
  {
    id: "social_first_friend",
    title: "First Friend",
    description: "Add first friend",
    icon: "Users",
    rarity: "Common",
    category: "Social",
    xpReward: 25,
    tokenReward: 10
  },
  {
    id: "social_rival_hunter",
    title: "Rival Hunter",
    description: "Play first friend duel",
    icon: "Swords",
    rarity: "Common",
    category: "Social",
    xpReward: 25,
    tokenReward: 10
  }
];

const RARITY_WEIGHT: { [key: string]: number } = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4
};

const getRarityStyles = (rarity: string, isUnlocked: boolean) => {
  if (!isUnlocked) {
    return {
      borderColor: 'rgba(255, 255, 255, 0.05)',
      backgroundColor: 'rgba(255, 255, 255, 0.01)',
      textColor: 'var(--text-secondary)',
      iconColor: 'rgba(255, 255, 255, 0.1)',
      shadow: 'none',
      badgeBg: 'rgba(255, 255, 255, 0.03)',
      badgeBorder: 'rgba(255, 255, 255, 0.05)'
    };
  }

  switch (rarity) {
    case 'Rare':
      return {
        borderColor: 'rgba(96, 165, 250, 0.3)',
        backgroundColor: 'rgba(96, 165, 250, 0.04)',
        textColor: '#60A5FA',
        iconColor: '#60A5FA',
        shadow: '0 0 12px rgba(96, 165, 250, 0.15)',
        badgeBg: 'rgba(96, 165, 250, 0.1)',
        badgeBorder: 'rgba(96, 165, 250, 0.2)'
      };
    case 'Epic':
      return {
        borderColor: 'rgba(192, 132, 252, 0.4)',
        backgroundColor: 'rgba(192, 132, 252, 0.05)',
        textColor: '#C084FC',
        iconColor: '#C084FC',
        shadow: '0 0 15px rgba(192, 132, 252, 0.2)',
        badgeBg: 'rgba(192, 132, 252, 0.12)',
        badgeBorder: 'rgba(192, 132, 252, 0.25)'
      };
    case 'Legendary':
      return {
        borderColor: 'rgba(251, 191, 36, 0.5)',
        backgroundColor: 'rgba(251, 191, 36, 0.06)',
        textColor: '#FBBF24',
        iconColor: '#FBBF24',
        shadow: '0 0 20px rgba(251, 191, 36, 0.25)',
        badgeBg: 'rgba(251, 191, 36, 0.15)',
        badgeBorder: 'rgba(251, 191, 36, 0.35)'
      };
    case 'Common':
    default:
      return {
        borderColor: 'rgba(148, 163, 184, 0.25)',
        backgroundColor: 'rgba(148, 163, 184, 0.03)',
        textColor: '#94A3B8',
        iconColor: '#94A3B8',
        shadow: '0 0 10px rgba(148, 163, 184, 0.1)',
        badgeBg: 'rgba(148, 163, 184, 0.08)',
        badgeBorder: 'rgba(148, 163, 184, 0.15)'
      };
  }
};

const renderIcon = (iconName: string, className?: string, size = 18) => {
  switch (iconName) {
    case 'Swords': return <Swords size={size} className={className} />;
    case 'Zap': return <Zap size={size} className={className} />;
    case 'Trophy': return <Trophy size={size} className={className} />;
    case 'Award': return <Award size={size} className={className} />;
    case 'Flame': return <Flame size={size} className={className} />;
    case 'Shield': return <Shield size={size} className={className} />;
    case 'Play': return <Play size={size} className={className} />;
    case 'Calendar': return <Calendar size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    default: return <Award size={size} className={className} />;
  }
};

export default function PlayerProfile() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser } = useStore();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`http://localhost:5001/api/profile/${username}`);
        if (res.ok) {
          const data: ProfileResponse = await res.json();
          setProfile(data);
        } else {
          setError("User profile not found.");
        }
        setLoading(false);
      } catch (e) {
        setError("Failed connecting to profile server.");
        setLoading(false);
      }
    }

    if (username) {
      fetchProfile();
    }
  }, [username]);

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
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-red)' }}>{error || "Profile Not Found"}</h2>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Dashboard</Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === profile.username;
  const highestElo = Math.max(profile.eloJS, profile.eloPython, profile.eloJava);

  // Compute stats
  const winRate = profile.totalDuels > 0 
    ? Math.round((profile.totalWins / profile.totalDuels) * 100) 
    : 0;

  const unlockedAchievements = profile.achievements || [];
  const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));
  const count = unlockedAchievements.length;
  const total = ALL_ACHIEVEMENTS.length;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const latestUnlock = [...unlockedAchievements].sort((a, b) => 
    new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
  )[0];

  const rarestUnlock = [...unlockedAchievements].sort((a, b) => {
    const weightA = RARITY_WEIGHT[a.achievement.rarity] || 0;
    const weightB = RARITY_WEIGHT[b.achievement.rarity] || 0;
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
  })[0];

  return (
    <div className="container" style={{ padding: 'var(--space-10) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      
      {/* Back Link */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        color: 'var(--text-secondary)',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 500,
        alignSelf: 'flex-start',
        transition: 'var(--transition)'
      }}
      className="btn-ghost"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Banner info */}
      <div className="card-base" style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(20, 20, 25, 0.6) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-8)',
        flexWrap: 'wrap',
        gap: 'var(--space-6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
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
            color: '#FFFFFF',
            boxShadow: 'var(--shadow-md)'
          }}>
            {profile.username[0].toUpperCase()}
          </div>

          <div>
            <h1 style={{ fontSize: '28px', fontFamily: 'Space Grotesk, sans-serif' }}>@{profile.username}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-2)' }}>
              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
                {profile.rank}
              </span>
              {profile.currentStreak >= 3 && (
                <div className="flex-center" style={{ gap: '2px', color: 'var(--accent-red)' }} title="On a Win Streak!">
                  <Flame size={13} fill="var(--accent-red)" />
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{profile.currentStreak}x Streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ELO Banner Stat */}
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: 'Space Grotesk' }}>
              <AnimatedCounter value={highestElo} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Peak ELO</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Space Grotesk' }}>
              <AnimatedCounter value={profile.tokens} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Tokens</div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 'var(--space-3)',
        marginBottom: '2px'
      }}>
        <button 
          onClick={() => setActiveTab('stats')}
          style={{
            background: activeTab === 'stats' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeTab === 'stats' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'var(--transition)'
          }}
          className={activeTab === 'stats' ? '' : 'btn-ghost'}
        >
          Stats & History
        </button>
        <button 
          onClick={() => setActiveTab('achievements')}
          style={{
            background: activeTab === 'achievements' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeTab === 'achievements' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'var(--transition)'
          }}
          className={activeTab === 'achievements' ? '' : 'btn-ghost'}
        >
          Achievements
        </button>
      </div>

      {activeTab === 'stats' ? (
        /* Main Grid: Stats (left) & History (right) */
        <div className="profile-grid">
          
          {/* STATS BREAKDOWN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Battle Stats
            </h2>

            <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              {/* Win rate block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                    <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        stroke="var(--accent-green)"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - winRate / 100)}
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', fontFamily: 'Space Grotesk' }}>
                        <AnimatedCounter value={winRate} />%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Win Rate</span>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Based on <strong style={{ color: '#fff' }}><AnimatedCounter value={profile.totalDuels} /></strong> duels
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                      <AnimatedCounter value={profile.totalWins} /> W
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px', fontWeight: 600, letterSpacing: '0.05em' }}>WINS</div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-red)' }}>
                      <AnimatedCounter value={profile.totalDuels - profile.totalWins} /> L
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '1px', fontWeight: 600, letterSpacing: '0.05em' }}>LOSSES</div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'var(--space-2)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Language Ratings</span>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>JavaScript Rating</span>
                  <strong style={{ color: 'var(--accent-amber)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.eloJS} /> ELO</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Python Rating</span>
                  <strong style={{ color: 'var(--accent-blue)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.eloPython} /> ELO</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Java Rating</span>
                  <strong style={{ color: 'var(--accent-red)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.eloJava} /> ELO</strong>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: 'var(--space-2)', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Best Win Streak</span>
                <strong style={{ color: 'var(--accent-red)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.bestStreak} /> wins</strong>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'var(--space-2)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Quest Progress</span>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Daily Quests Completed</span>
                  <strong style={{ color: 'var(--accent-blue)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.dailyQuestsCompleted || 0} /></strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Weekly Quests Completed</span>
                  <strong style={{ color: 'var(--accent-purple)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.weeklyQuestsCompleted || 0} /></strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Lifetime Quests Completed</span>
                  <strong style={{ color: 'var(--accent-green)', fontFamily: 'Space Grotesk' }}><AnimatedCounter value={profile.lifetimeQuestsCompleted || 0} /></strong>
                </div>
              </div>

            </div>

            {!isOwnProfile && (
              <Link href={`/duel/create`} className="btn btn-primary" style={{ gap: 'var(--space-2)', justifyContent: 'center' }}>
                <Swords size={14} fill="currentColor" /> Challenge Player
              </Link>
            )}
          </div>

          {/* MATCH HISTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <h2 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Battle History
            </h2>

            {profile.duels.length === 0 ? (
              <div className="card-base" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
                <History size={36} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} />
                <p style={{ fontSize: '13px' }}>No duels recorded on this profile yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {profile.duels.map((item) => {
                  const battle = item.duel;
                  const isWinner = battle.winnerId === profile.id;
                  const opponentName = battle.participants.find(p => p.userId !== profile.id)?.user.username || "Challenger";
                  const langBadge = battle.language === 'javascript' ? 'badge-js' : battle.language === 'python' ? 'badge-py' : 'badge-java';

                  return (
                    <div key={battle.id} className={isWinner ? 'card-success' : 'card-danger'} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-4) var(--space-5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <span className={`badge ${langBadge}`} style={{ fontSize: '10px' }}>{battle.language}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                            vs <span style={{ color: 'var(--accent-blue)' }}>@{opponentName}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Difficulty: {battle.difficulty} • Bet: {battle.betAmount} tokens
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isWinner ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          {isWinner ? 'VICTORY' : 'DEFEAT'}
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
      ) : (
        /* Achievements view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Overview cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
            width: '100%'
          }}>
            {/* Progress Card */}
            <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Rate</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk' }}>{count} / {total}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{ flexGrow: 1, height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', borderRadius: '3px', transition: 'width 0.5s ease-out' }}></div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-purple)', fontFamily: 'Space Grotesk' }}>{percentage}%</span>
              </div>
            </div>

            {/* Latest Unlocked */}
            <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Unlocked</span>
              {latestUnlock ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '2px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: `1px solid ${getRarityStyles(latestUnlock.achievement.rarity, true).borderColor}`,
                    background: getRarityStyles(latestUnlock.achievement.rarity, true).backgroundColor,
                    boxShadow: getRarityStyles(latestUnlock.achievement.rarity, true).shadow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getRarityStyles(latestUnlock.achievement.rarity, true).textColor
                  }}>
                    {renderIcon(latestUnlock.achievement.icon)}
                  </div>
                  <div style={{ minWidth: 0, flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {latestUnlock.achievement.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Unlocked {new Date(latestUnlock.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>None unlocked yet</div>
              )}
            </div>

            {/* Rarest Unlocked */}
            <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-5)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rarest Unlocked</span>
              {rarestUnlock ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '2px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: `1px solid ${getRarityStyles(rarestUnlock.achievement.rarity, true).borderColor}`,
                    background: getRarityStyles(rarestUnlock.achievement.rarity, true).backgroundColor,
                    boxShadow: getRarityStyles(rarestUnlock.achievement.rarity, true).shadow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getRarityStyles(rarestUnlock.achievement.rarity, true).textColor
                  }}>
                    {renderIcon(rarestUnlock.achievement.icon)}
                  </div>
                  <div style={{ minWidth: 0, flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rarestUnlock.achievement.title}
                    </div>
                    <div style={{ fontSize: '11px', color: getRarityStyles(rarestUnlock.achievement.rarity, true).textColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '2px' }}>
                      {rarestUnlock.achievement.rarity}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>None unlocked yet</div>
              )}
            </div>
          </div>

          {/* Unlocked Achievements Section */}
          <h2 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 'var(--space-2)' }}>
            Unlocked Achievements ({ALL_ACHIEVEMENTS.filter(ach => unlockedIds.has(ach.id)).length})
          </h2>

          {ALL_ACHIEVEMENTS.filter(ach => unlockedIds.has(ach.id)).length === 0 ? (
            <div className="card-base" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No achievements unlocked yet.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
              width: '100%'
            }}>
              {ALL_ACHIEVEMENTS.filter(ach => unlockedIds.has(ach.id)).map((ach) => {
                const userAch = unlockedAchievements.find(ua => ua.achievementId === ach.id);
                const styles = getRarityStyles(ach.rarity, true);

                return (
                  <div 
                    key={ach.id} 
                    className="card-base"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 'var(--space-5)',
                      gap: 'var(--space-3)',
                      borderColor: styles.borderColor,
                      backgroundColor: styles.backgroundColor,
                      boxShadow: styles.shadow,
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        border: `1px solid ${styles.borderColor}`,
                        background: 'rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: styles.iconColor
                      }}>
                        {renderIcon(ach.icon, undefined, 20)}
                      </div>

                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: styles.badgeBg,
                        border: `1px solid ${styles.badgeBorder}`,
                        color: styles.textColor
                      }}>
                        {ach.rarity}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                        {ach.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                        {ach.description}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 'auto',
                      paddingTop: 'var(--space-2)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                          +{ach.xpReward} XP
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                          +{ach.tokenReward} Tokens
                        </span>
                      </div>

                      {userAch && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {new Date(userAch.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Locked Achievements Section */}
          <h2 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 'var(--space-5)' }}>
            Locked Achievements ({ALL_ACHIEVEMENTS.filter(ach => !unlockedIds.has(ach.id)).length})
          </h2>

          {ALL_ACHIEVEMENTS.filter(ach => !unlockedIds.has(ach.id)).length === 0 ? (
            <div className="card-base" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)', fontSize: '13px' }}>
              All achievements unlocked!
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-4)',
              width: '100%'
            }}>
              {ALL_ACHIEVEMENTS.filter(ach => !unlockedIds.has(ach.id)).map((ach) => {
                const styles = getRarityStyles(ach.rarity, false);

                return (
                  <div 
                    key={ach.id} 
                    className="card-base"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 'var(--space-5)',
                      gap: 'var(--space-3)',
                      borderColor: styles.borderColor,
                      backgroundColor: styles.backgroundColor,
                      opacity: 0.45,
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        border: `1px solid ${styles.borderColor}`,
                        background: 'rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: styles.iconColor
                      }}>
                        <Lock size={20} className="text-secondary" />
                      </div>

                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: styles.badgeBg,
                        border: `1px solid ${styles.badgeBorder}`,
                        color: 'var(--text-secondary)'
                      }}>
                        {ach.rarity}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {ach.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                        {ach.description}
                      </p>
                    </div>

                    <div style={{
                      marginTop: 'auto',
                      paddingTop: 'var(--space-2)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                          +{ach.xpReward} XP
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                          +{ach.tokenReward} Tokens
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
