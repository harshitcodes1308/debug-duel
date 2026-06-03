'use client';

import React, { useEffect, useState } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Award, Flame, Zap, Shield, 
  History, Swords, TrendingUp, Sparkles 
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

export default function PlayerProfile() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser } = useStore();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      {/* Main Grid: Stats (left) & History (right) */}
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

    </div>
  );
}
