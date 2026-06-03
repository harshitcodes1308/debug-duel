'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { LogOut, Coins, Flame, Award, ShieldAlert, Terminal } from 'lucide-react';
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
        <div className="logo">
          <span>⚔️ DebugDuel</span>
        </div>
      </Link>

      {/* Global Command Center search trigger */}
      <button 
        onClick={() => setIsCommandOpen(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          transition: 'var(--transition)',
          minWidth: '180px',
          justifyContent: 'space-between',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔍</span> Search actions...
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
        {isDevMode && (
          <div className="flex-center" style={{
            gap: 'var(--space-1)',
            fontSize: '11px',
            background: 'rgba(139, 92, 246, 0.08)',
            color: 'var(--accent-purple)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 'bold'
          }}>
            <ShieldAlert size={12} /> DEV MODE
          </div>
        )}

        <div className="flex-center" style={{ gap: 'var(--space-4)' }}>
          {/* Tokens */}
          <div className="flex-center" style={{
            gap: 'var(--space-2)',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            <Coins size={15} color="var(--accent-amber)" />
            <span style={{ fontWeight: 700, fontSize: '13px', color: '#FFF' }}>
              {user.tokens}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>tokens</span>
          </div>

          {/* Streak */}
          {user.currentStreak > 0 && (
            <div className="flex-center pulse-glow" style={{
              gap: 'var(--space-1)',
              background: 'rgba(239, 68, 68, 0.08)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              <Flame size={15} color="var(--accent-red)" />
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-red)' }}>
                {user.currentStreak}
              </span>
            </div>
          )}

          {/* ELO / Rank */}
          <Link href={`/profile/${user.username}`} className="flex-center" style={{
            gap: 'var(--space-2)',
            textDecoration: 'none',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            color: '#FFF',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          }}
          >
            <Award size={15} color="var(--accent-blue)" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>
              @{user.username}
            </span>
            <span style={{
              fontSize: '10px',
              background: 'var(--accent-purple)',
              color: '#FFF',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 'bold'
            }}>
              {highestElo} ELO
            </span>
          </Link>

          {/* Logout */}
          <button 
            onClick={logout} 
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)' }}
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
