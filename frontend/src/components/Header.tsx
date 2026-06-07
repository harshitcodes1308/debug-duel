'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { LogOut, Coins, Flame, Award, Terminal, Swords, Search } from 'lucide-react';
import CommandCenter from './CommandCenter';

export default function Header() {
  const { user } = useStore();
  const { logout, isDevMode } = useAuth();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!user) return null;

  // Compute highest ELO or JS ELO as representative
  const highestElo = Math.max(user.eloJS, user.eloPython, user.eloJava);

  return (
    <>
      <header className="nav-header">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div className="logo" style={{ fontSize: '19px' }}>
          ⚔️ DebugDuel
        </div>
      </Link>

      {/* Global Command Center search trigger */}
      <button 
        onClick={() => setIsCommandOpen(true)}
        className="header-search-btn"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} /> Search actions...
        </span>
        <span style={{
          fontSize: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          <span>⌘</span><span>K</span>
        </span>
      </button>

      <div className="nav-user">

        <div className="flex-center" style={{ gap: 'var(--space-4)' }}>
          {/* Tokens */}
          <div className="flex-center" style={{
            gap: 'var(--space-2)',
            background: 'var(--bg-tertiary)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <Coins size={15} color="var(--warning)" />
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#FFF', fontFamily: 'JetBrains Mono, monospace' }}>
              {user.tokens}
            </span>
            <span className="header-tokens-label" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>tokens</span>
          </div>

          {/* Streak */}
          {user.currentStreak > 0 && (
            <div className="flex-center" style={{
              gap: 'var(--space-1)',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              <Flame size={15} color="var(--danger)" />
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--danger)', fontFamily: 'JetBrains Mono, monospace' }}>
                {user.currentStreak}
              </span>
            </div>
          )}

          {/* ELO / Rank */}
          <Link href={`/profile/${user.username}`} className="flex-center" style={{
            gap: 'var(--space-2)',
            textDecoration: 'none',
            background: 'var(--bg-tertiary)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            color: '#FFF',
            transition: 'var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-focus)';
            e.currentTarget.style.background = 'var(--card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }}
          >
            <Award size={15} color="var(--rating)" />
            <span className="header-username" style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'Space Grotesk, sans-serif' }}>
              @{user.username}
            </span>
            <span className="badge-tactical" style={{
              fontSize: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              color: 'var(--rating)',
              padding: '2px 6px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {highestElo} ELO
            </span>
          </Link>

          {/* Logout */}
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', borderRadius: '8px' }}
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
      <CommandCenter isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  );
}
