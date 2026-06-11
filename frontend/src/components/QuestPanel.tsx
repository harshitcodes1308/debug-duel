'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { 
  Check, Play, Trophy, Award, Calendar, 
  Zap, Users, Sparkles, Coins, ShieldAlert
} from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  target: number;
  rewardXP: number;
  rewardTokens: number;
  category: 'DAILY' | 'WEEKLY';
}

interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  completedAt?: string;
  expiresAt: string;
  quest: Quest;
}

export default function QuestPanel() {
  const { user, setUser } = useStore();
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQuests = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5001/api/quests?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (error) {
      console.error("Failed to fetch quests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
    // Refresh quests every 15 seconds to sync progress
    const interval = setInterval(fetchQuests, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleClaim = async (userQuestId: string) => {
    if (!user || claimingId) return;
    setClaimingId(userQuestId);
    try {
      const res = await fetch(`http://localhost:5001/api/quests/claim/${userQuestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const data = await res.json();
        // Update Zustand store
        setUser({
          ...user,
          xp: data.xp,
          level: data.level,
          tokens: data.tokens
        });
        // Update local state to show claimed
        setQuests(prev => prev.map(uq => uq.id === userQuestId ? { ...uq, claimed: true } : uq));
      }
    } catch (error) {
      console.error("Error claiming quest rewards:", error);
    } finally {
      setClaimingId(null);
    }
  };

  if (!user) return null;

  const filteredQuests = quests.filter(uq => uq.quest.category === activeTab);

  const getQuestIconComponent = (type: string, size = 16) => {
    switch (type) {
      case 'play_duel': return <Play size={size} />;
      case 'win_duel': return <Trophy size={size} />;
      case 'play_kbc': return <Award size={size} />;
      case 'claim_daily_reward': return <Calendar size={size} />;
      case 'gain_xp': return <Zap size={size} />;
      case 'add_friend': return <Users size={size} />;
      default: return <Award size={size} />;
    }
  };

  // Styles matching the rarity requested: Slate for Dailies/Common, Purple/Gold for Weeklies/Epic
  const getTabStyles = () => {
    if (activeTab === 'DAILY') {
      return {
        accentColor: 'var(--text-secondary)',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        bgGlow: 'rgba(148, 163, 184, 0.02)',
        glowShadow: '0 4px 20px rgba(148, 163, 184, 0.05)'
      };
    } else {
      return {
        accentColor: 'var(--accent-purple)',
        borderColor: 'rgba(192, 132, 252, 0.25)',
        bgGlow: 'rgba(192, 132, 252, 0.03)',
        glowShadow: '0 4px 24px rgba(192, 132, 252, 0.08)'
      };
    }
  };

  const styles = getTabStyles();

  return (
    <div className="glass-panel" style={{ 
      padding: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      borderColor: styles.borderColor,
      background: `linear-gradient(to bottom, ${styles.bgGlow}, rgba(13, 13, 18, 0.4))`,
      boxShadow: styles.glowShadow,
      transition: 'all 0.3s ease-in-out'
    }}>
      <style>{`
        .quest-tab-btn {
          flex: 1;
          border: none;
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          background: transparent;
          transition: all 0.2s ease;
          letter-spacing: 0.05em;
        }
        .quest-tab-btn.active-daily {
          background: rgba(148, 163, 184, 0.1);
          color: #fff;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .quest-tab-btn.active-weekly {
          background: rgba(123, 147, 219, 0.12);
          color: var(--accent-purple);
          border: 1px solid rgba(123, 147, 219, 0.25);
        }
        .quest-card {
          background: transparent;
          border-bottom: 1px solid #1E2737;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: background 150ms ease;
        }
        .quest-card:hover {
          background: #0D1117;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex-center" style={{ gap: '8px' }}>
          <Sparkles size={18} color={activeTab === 'DAILY' ? '#94A3B8' : '#C084FC'} />
          <h2 style={{ fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif' }}>Quests</h2>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', background: '#141419', padding: '2px', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('DAILY')}
          className={`quest-tab-btn ${activeTab === 'DAILY' ? 'active-daily' : ''}`}
        >
          Daily Quests
        </button>
        <button 
          onClick={() => setActiveTab('WEEKLY')}
          className={`quest-tab-btn ${activeTab === 'WEEKLY' ? 'active-weekly' : ''}`}
        >
          Weekly Quests
        </button>
      </div>

      {/* Quest list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '180px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '12px' }}>
            Loading active quests...
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="flex-center" style={{ 
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center', 
            padding: '36px 16px', 
            color: 'var(--text-secondary)', 
            fontSize: '12px', 
            border: '1px dashed rgba(255, 255, 255, 0.08)', 
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(255, 255, 255, 0.003)'
          }}>
            <ShieldAlert size={24} style={{ opacity: 0.3 }} />
            <div>
              <p style={{ fontWeight: '600' }}>No quests assigned</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Check back again later.</p>
            </div>
          </div>
        ) : (
          filteredQuests.map((uq) => {
            const progressPercent = Math.min(100, (uq.progress / uq.quest.target) * 100);
            const isCompleted = uq.completed;
            const isClaimed = uq.claimed;
            const canClaim = isCompleted && !isClaimed;

            // Rarity / tab borders
            const borderLeftColor = isClaimed 
              ? '#4ade80'
              : canClaim
                ? '#3B82F6'
                : '#1E2737';

            return (
              <div 
                key={uq.id} 
                className="quest-card"
                style={{
                  borderLeft: `3px solid ${borderLeftColor}`,
                  opacity: isClaimed ? 0.5 : 1
                }}
              >
                {/* Quest Header Info */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '10px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: `1px solid ${canClaim ? styles.borderColor : 'rgba(255, 255, 255, 0.06)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: canClaim ? styles.accentColor : 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {getQuestIconComponent(uq.quest.type)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: '13px', 
                        color: isClaimed ? 'var(--text-secondary)' : '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {uq.quest.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '14px' }}>
                        {uq.quest.description}
                      </div>
                    </div>
                  </div>

                  {/* Actions / Claim / Status */}
                  <div style={{ flexShrink: 0 }}>
                    {isClaimed ? (
                      <span style={{ fontSize: '10px', color: 'var(--accent-green)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Claimed
                      </span>
                    ) : canClaim ? (
                      <button
                        onClick={() => handleClaim(uq.id)}
                        disabled={claimingId !== null}
                        className="btn"
                        style={{
                          height: '24px',
                          fontSize: '10px',
                          padding: '0 10px',
                          background: activeTab === 'DAILY' ? 'var(--text-primary)' : 'var(--accent-purple)',
                          color: activeTab === 'DAILY' ? '#000' : '#fff',
                          fontWeight: 'bold',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {claimingId === uq.id ? 'Claiming...' : 'Claim'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                        {uq.progress} / {uq.quest.target}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar (hidden if claimed) */}
                {!isClaimed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: activeTab === 'DAILY' 
                          ? 'linear-gradient(90deg, #64748B 0%, #94A3B8 100%)' 
                          : 'linear-gradient(90deg, #C084FC 0%, #E879F9 100%)',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease-out'
                      }} />
                    </div>
                  </div>
                )}

                {/* Rewards display */}
                {!isClaimed && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.02)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Rewards:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                      +{uq.quest.rewardXP} XP
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Coins size={10} /> +{uq.quest.rewardTokens}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
