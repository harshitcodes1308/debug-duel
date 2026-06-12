'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { LogOut, Coins, Flame, Award, Search, Menu, X } from 'lucide-react';
import CommandCenter from './CommandCenter';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { user } = useStore();
  const { logout } = useAuth();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close mobile menu on page navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle Command Center keybinding
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

  // Compute highest ELO
  const highestElo = user ? Math.max(user.eloDebugDuel || 1000, user.eloUIUX || 1000, user.eloKbc || 1000) : 1000;

  return (
    <>
      <header className="nav-header">
        {/* Logo Section */}
        <Link href="/" style={{ textDecoration: 'none' }} onClick={() => setIsMobileMenuOpen(false)}>
          <div className="logo" style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚔️</span>
            <span className="header-logo-text">DebugDuel</span>
          </div>
        </Link>

        {/* Global Command Center Search Trigger */}
        <button 
          onClick={() => setIsCommandOpen(true)}
          className="header-search-btn"
          style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} />
            <span className="hide-on-mobile">Search actions...</span>
            <span className="show-on-mobile">Search...</span>
          </span>
          <span className="hide-on-mobile" style={{
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

        {/* Navigation Actions - Desktop */}
        <div className="nav-user hide-on-mobile">
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
              <span style={{ fontWeight: 500, fontSize: '13px', color: '#FFF', fontFamily: 'Geist Mono, monospace' }}>
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
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--danger)', fontFamily: 'Geist Mono, monospace' }}>
                  {user.currentStreak}
                </span>
              </div>
            )}

            {/* ELO / Profile */}
            <Link href={`/profile/${user.username}`} className="flex-center" style={{
              gap: 'var(--space-2)',
              textDecoration: 'none',
              background: 'var(--bg-tertiary)',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              color: '#FFF',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-focus)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'transparent';
            }}
            >
              <Award size={15} color="var(--rating)" />
              <span className="header-username" style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'Geist, sans-serif' }}>
                Overall ELO
              </span>
              <span className="badge-tactical" style={{
                fontSize: '10px',
                background: 'rgba(123, 147, 219, 0.1)',
                borderColor: 'rgba(123, 147, 219, 0.2)',
                color: 'var(--rating)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontFamily: 'Geist Mono, monospace'
              }}>
                {highestElo}
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

        {/* Hamburger Trigger - Mobile */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="btn btn-ghost show-on-mobile"
          style={{ padding: '8px', minWidth: '40px', minHeight: '40px', borderRadius: '50%' }}
          title={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={22} color="var(--text-primary)" /> : <Menu size={22} color="var(--text-primary)" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer show-on-mobile">
          {/* Tokens */}
          <div className="mobile-nav-item">
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
              <Coins size={16} color="var(--warning)" />
              Tokens Balance
            </span>
            <span style={{ fontWeight: 600, color: '#FFFFFF', fontFamily: 'Geist Mono, monospace' }}>
              {user.tokens} tokens
            </span>
          </div>

          {/* Current Streak */}
          {user.currentStreak > 0 && (
            <div className="mobile-nav-item" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)' }}>
                <Flame size={16} color="var(--danger)" />
                Current Streak
              </span>
              <span style={{ fontWeight: 700, color: 'var(--danger)', fontFamily: 'Geist Mono, monospace' }}>
                {user.currentStreak} Wins
              </span>
            </div>
          )}

          {/* ELO / Profile */}
          <Link 
            href={`/profile/${user.username}`} 
            className="mobile-nav-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--rating)' }}>
              <Award size={16} color="var(--rating)" />
              Overall ELO
            </span>
            <span className="badge-tactical" style={{
              fontSize: '11px',
              background: 'rgba(123, 147, 219, 0.1)',
              borderColor: 'rgba(123, 147, 219, 0.2)',
              color: 'var(--rating)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontFamily: 'Geist Mono, monospace'
            }}>
              {highestElo}
            </span>
          </Link>

          {/* Logout */}
          <button 
            onClick={() => {
              setIsMobileMenuOpen(false);
              logout();
            }} 
            className="mobile-nav-item mobile-nav-item-danger"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LogOut size={16} />
              Sign Out
            </span>
            <span>➔</span>
          </button>
        </div>
      )}

      {/* Action Commands Dialog */}
      <CommandCenter isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  );
}
