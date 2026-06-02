'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { LogOut, Coins, Flame, Award, ShieldAlert } from 'lucide-react';

export default function Header() {
  const { user } = useStore();
  const { logout, isDevMode } = useAuth();

  if (!user) return null;

  // Compute highest ELO or JS ELO as representative
  const highestElo = Math.max(user.eloJS, user.eloPython, user.eloJava);

  return (
    <header className="nav-header">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div className="logo">
          <span>⚔️ DebugDuel</span>
        </div>
      </Link>

      <div className="nav-user">
        {isDevMode && (
          <div className="flex-center" style={{
            gap: '4px',
            fontSize: '11px',
            background: 'rgba(139, 92, 246, 0.1)',
            color: 'var(--accent-purple)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 'bold'
          }}>
            <ShieldAlert size={12} /> DEV MODE
          </div>
        )}

        <div className="flex-center" style={{ gap: '16px' }}>
          {/* Tokens */}
          <div className="flex-center" style={{
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <Coins size={16} color="var(--accent-amber)" />
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
              {user.tokens}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>tokens</span>
          </div>

          {/* Streak */}
          {user.currentStreak > 0 && (
            <div className="flex-center pulse-glow" style={{
              gap: '4px',
              background: 'rgba(255, 68, 68, 0.1)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 68, 68, 0.2)'
            }}>
              <Flame size={16} color="var(--accent-red)" />
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--accent-red)' }}>
                {user.currentStreak}
              </span>
            </div>
          )}

          {/* ELO / Rank */}
          <Link href={`/profile/${user.username}`} className="flex-center" style={{
            gap: '8px',
            textDecoration: 'none',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            color: '#fff'
          }}>
            <Award size={16} color="var(--accent-blue)" />
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
              @{user.username}
            </span>
            <span style={{
              fontSize: '11px',
              background: 'var(--accent-purple)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 'bold'
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
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
