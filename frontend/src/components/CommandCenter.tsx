'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Search, Trophy, Sparkles, Flame, Coins, Bell, Terminal, Command } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  url: string;
  icon: React.ReactNode;
}

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandCenter({ isOpen, onClose }: CommandCenterProps) {
  const router = useRouter();
  const { user } = useStore();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const actions: ActionItem[] = [
    {
      id: 'kbc-solo',
      title: 'Play Code KBC Solo',
      subtitle: 'Answer 15 questions to claim the 1,000,000 XP jackpot',
      category: 'Game Modes',
      url: '/kbc/categories',
      icon: <Trophy size={16} color="var(--accent-amber)" />
    },
    {
      id: 'kbc-friend',
      title: 'Code KBC with Friend',
      subtitle: 'Create a lobby and invite your friends in real-time',
      category: 'Game Modes',
      url: '/kbc/multiplayer',
      icon: <Sparkles size={16} color="var(--accent-purple)" />
    },
    {
      id: 'duel-create',
      title: 'Configure 1v1 Duel',
      subtitle: 'Set language, difficulty, and wager tokens to start a battle',
      category: 'Game Modes',
      url: '/duel/create',
      icon: <Terminal size={16} color="var(--accent-blue)" />
    },
    {
      id: 'colormatch-solo',
      title: 'ColorMatch Practice Solo',
      subtitle: 'Guess RGB colors using sliders to train your visual memory',
      category: 'Practice',
      url: '/color-match/solo',
      icon: <Sparkles size={16} color="var(--accent-blue)" />
    },
    {
      id: 'colormatch-friend',
      title: 'ColorMatch with Friend',
      subtitle: '1v1 speed color matching challenge with token wagers',
      category: 'Game Modes',
      url: '/color-match/create',
      icon: <Sparkles size={16} color="var(--accent-purple)" />
    },
    {
      id: 'practice',
      title: 'Daily Solo Warmup',
      subtitle: 'Practice debugging syntax bugs for free in vs-dark editor',
      category: 'Practice',
      url: '/practice',
      icon: <Terminal size={16} color="var(--accent-green)" />
    },
    {
      id: 'leaderboard',
      title: 'View Global Leaderboard',
      subtitle: 'See top ranking Zero-Day Gods in JS, Python, and Java',
      category: 'Social',
      url: '/leaderboard',
      icon: <Trophy size={16} color="var(--accent-amber)" />
    },
    {
      id: 'profile',
      title: 'View My Profile',
      subtitle: 'Check your wins, ELO breakdown, and match history',
      category: 'User',
      url: user ? `/profile/${user.username}` : '#',
      icon: <Terminal size={16} color="var(--text-secondary)" />
    }
  ];

  // Filtered actions based on search
  const filteredActions = actions.filter(
    (action) =>
      action.title.toLowerCase().includes(search.toLowerCase()) ||
      action.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      action.category.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setSearch('');
    }
  }, [isOpen]);

  // Key navigation handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleAction(filteredActions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex]);

  const handleAction = (action: ActionItem) => {
    router.push(action.url);
    onClose();
  };

  if (!isOpen || !user) return null;

  // Mock Notifications for design completeness
  const notifications = [
    { id: 1, text: 'Daily login bonus is available to claim', time: '1h ago', read: false },
    { id: 2, text: 'You are on a 3-game win streak in KBC Solo', time: '2h ago', read: true }
  ];

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="card-base modal-enter glow-primary"
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--radius-lg)',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 1px 1px rgba(255,255,255,0.05)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <Search size={18} color="var(--text-secondary)" style={{ marginRight: '12px' }} />
          <input 
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#FFF',
              fontFamily: 'inherit',
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <div className="flex-center" style={{ gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ESC</span>
          </div>
        </div>

        {/* User Quick Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border)', padding: '12px 20px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={14} color="var(--accent-amber)" />
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Balance: </span>
              <strong style={{ color: '#FFF' }}><AnimatedCounter value={user.tokens} /> tokens</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={14} color="var(--accent-blue)" />
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Rank: </span>
              <strong style={{ color: '#FFF' }}>{user.rank}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={14} color="var(--accent-red)" />
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Streak: </span>
              <strong style={{ color: '#FFF' }}><AnimatedCounter value={user.currentStreak} /> wins</strong>
            </div>
          </div>
        </div>

        {/* Main Command Menu Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', height: '340px' }}>
          
          {/* Action List */}
          <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '12px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px', display: 'block', marginBottom: '8px' }}>Commands</span>
            
            {filteredActions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No commands match your search
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredActions.map((action, idx) => {
                  const isAct = idx === selectedIndex;
                  return (
                    <div
                      key={action.id}
                      onClick={() => handleAction(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isAct ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{
                        background: isAct ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isAct ? 'var(--accent-blue)' : 'inherit',
                        transition: 'all 0.15s ease'
                      }}>
                        {action.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: isAct ? '#FFF' : 'var(--text-primary)' }}>{action.title}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>{action.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details / Notification Sidebar */}
          <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.005)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Bell size={13} color="var(--accent-purple)" />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inbox / Alerts</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{
                    background: 'rgba(255,255,255,0.015)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    position: 'relative'
                  }}>
                    {!n.read && (
                      <span style={{
                        position: 'absolute',
                        top: '8px', right: '8px',
                        width: '5px', height: '5px',
                        borderRadius: '50%',
                        background: 'var(--accent-purple)'
                      }} />
                    )}
                    <p style={{ color: 'var(--text-primary)', paddingRight: '8px' }}>{n.text}</p>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9px', display: 'block', marginTop: '4px' }}>{n.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border)', padding: '12px', borderRadius: '8px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <Command size={10} /> Keyboard navigation
              </div>
              Use <span style={{ color: '#fff' }}>↑</span> <span style={{ color: '#fff' }}>↓</span> keys to select options, and <span style={{ color: '#fff' }}>Enter</span> to trigger them instantly.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
