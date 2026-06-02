'use client';

import React, { useEffect, useState } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Award, Flame, Zap, Shield, 
  History, Swords, TrendingUp, Sparkles 
} from 'lucide-react';

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

      {/* Banner info */}
      <div className="glass-panel" style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(20, 20, 25, 0.8) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '36px',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Avatar frame */}
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '42px',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
          }}>
            {profile.username[0].toUpperCase()}
          </div>

          <div>
            <h1 style={{ fontSize: '32px' }}>@{profile.username}</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <span className="badge" style={{ background: 'var(--accent-purple)', color: '#fff', fontWeight: 'bold' }}>
                {profile.rank}
              </span>
              {profile.currentStreak >= 3 && (
                <div className="flex-center" style={{ gap: '2px', color: 'var(--accent-red)' }} title="On a Win Streak!">
                  <Flame size={14} fill="var(--accent-red)" />
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{profile.currentStreak}x Streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ELO Banner Stat */}
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: 'Space Grotesk' }}>
              {highestElo}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PEAK ELO</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-amber)', fontFamily: 'Space Grotesk' }}>
              {profile.tokens}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOKENS</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Stats (left) & History (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
        
        {/* STATS BREAKDOWN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Battle Stats
          </h2>

          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Win rate block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>WIN RATE</span>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '2px' }}>{winRate}%</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px 16px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-green)' }}>{profile.totalWins} W</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Wins</div>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-red)' }}>{profile.totalDuels - profile.totalWins} L</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Losses</div>
                </div>
              </div>
            </div>

            {/* Progress line */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${winRate}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '4px' }}></div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>LANGUAGE RATINGS</span>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                <span>JavaScript ELO</span>
                <strong style={{ color: 'var(--accent-amber)' }}>{profile.eloJS} ELO</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                <span>Python ELO</span>
                <strong style={{ color: 'var(--accent-blue)' }}>{profile.eloPython} ELO</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                <span>Java ELO</span>
                <strong style={{ color: 'var(--accent-red)' }}>{profile.eloJava} ELO</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Best Win Streak</span>
              <strong style={{ color: 'var(--accent-red)' }}>{profile.bestStreak} wins</strong>
            </div>

          </div>

          {!isOwnProfile && (
            <Link href={`/duel/create`} className="btn btn-primary" style={{ gap: '8px', justifyContent: 'center' }}>
              <Swords size={16} fill="black" /> Challenge Player
            </Link>
          )}
        </div>

        {/* MATCH HISTORY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Battle History
          </h2>

          {profile.duels.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <History size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No duels recorded on this profile yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {profile.duels.map((item) => {
                const battle = item.duel;
                const isWinner = battle.winnerId === profile.id;
                const opponentName = battle.participants.find(p => p.userId !== profile.id)?.user.username || "Challenger";
                const langBadge = battle.language === 'javascript' ? 'badge-js' : battle.language === 'python' ? 'badge-py' : 'badge-java';

                return (
                  <div key={battle.id} className="glass-panel" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderColor: isWinner ? 'rgba(0, 255, 148, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                    background: 'rgba(255,255,255,0.01)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className={`badge ${langBadge}`} style={{ fontSize: '10px' }}>{battle.language}</span>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          vs <span style={{ color: 'var(--accent-blue)' }}>@{opponentName}</span>
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
