'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { Play, Users, Trophy, Calendar, Sparkles, Flame, Coins, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function KbcLandingPage() {
  const { user } = useStore();

  if (!user) return null;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F35 0%, #0A0618 100%)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Banner Header */}
        <div 
          className="glass-panel" 
          style={{
            background: 'linear-gradient(135deg, rgba(245, 166, 35, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            borderColor: 'rgba(245, 166, 35, 0.2)',
            padding: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glowing effects in background */}
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            background: 'var(--accent-amber)',
            filter: 'blur(120px)',
            opacity: 0.15,
            top: '-50px',
            right: '-50px',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={16} color="var(--accent-amber)" className="pulse-glow" />
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-amber)', fontWeight: 'bold', letterSpacing: '0.15em' }}>
                INTENSE CODING TRIVIA ARENA
              </span>
            </div>
            <h1 style={{ fontSize: '42px', fontFamily: 'Space Grotesk, sans-serif', color: '#FFF' }}>
              Code <span style={{ color: 'var(--accent-amber)' }}>KBC</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '15px', maxWidth: '600px', lineHeight: '24px' }}>
              Welcome to the hot seat! Answer debugging, language, and system design questions. Climb the points ladder, activate lifelines, and show your friends who is the ultimate developer.
            </p>
          </div>
          <div className="float-anim" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '20px' }}>
            <Trophy size={48} color="var(--accent-amber)" />
          </div>
        </div>

        {/* Info Grid / Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Streak details */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(26, 26, 34, 0.4)' }}>
            <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
              <Flame size={28} color="var(--accent-red)" className={user.currentStreak > 0 ? "pulse-glow" : ""} />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>CURRENT STREAK</span>
              <h3 style={{ fontSize: '24px', marginTop: '2px', color: '#FFF' }}>{user.currentStreak} Wins</h3>
            </div>
          </div>

          {/* Tokens / Coins details */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(26, 26, 34, 0.4)' }}>
            <div style={{ background: 'rgba(245, 166, 35, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(245, 166, 35, 0.2)' }}>
              <Coins size={28} color="var(--accent-amber)" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>COIN BALANCE</span>
              <h3 style={{ fontSize: '24px', marginTop: '2px', color: '#FFF' }}>{user.tokens} Tokens</h3>
            </div>
          </div>

          {/* Leaderboard stats */}
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(26, 26, 34, 0.4)' }}>
            <div style={{ background: 'rgba(74, 158, 255, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(74, 158, 255, 0.2)' }}>
              <Trophy size={28} color="var(--accent-blue)" />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>CURRENT RANK</span>
              <h3 style={{ fontSize: '24px', marginTop: '2px', color: '#FFF' }}>{user.rank}</h3>
            </div>
          </div>

        </div>

        {/* Game Mode Selection */}
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '20px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            Choose Game Mode
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            
            {/* Solo Challenge Card */}
            <div 
              className="glass-panel card-shine glow-purple theme-kbc" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                minHeight: '260px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <Play size={24} color="var(--accent-purple)" />
                  </div>
                  <span className="badge" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Active</span>
                </div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#FFF' }}>Solo Challenge</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '20px' }}>
                  Answer 15 consecutive trivia questions. Each correct answer pushes you higher up the points ladder. Lifelines included.
                </p>
              </div>
              <Link href="/kbc/categories" className="btn interactive-lift" style={{ width: '100%', marginTop: '20px', background: 'var(--accent-purple)', color: '#FFF', borderColor: 'rgba(139, 92, 246, 0.5)' }}>
                Play Solo
              </Link>
            </div>

            {/* Ranked Arena Card */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', opacity: 0.8 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(74, 158, 255, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <Trophy size={24} color="var(--accent-blue)" />
                  </div>
                  <span className="badge" style={{ borderColor: 'rgba(74, 158, 255, 0.3)', color: 'var(--accent-blue)', background: 'rgba(74, 158, 255, 0.05)' }}>Coming Soon</span>
                </div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#FFF' }}>Ranked Arena</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '20px' }}>
                  Battle random developers in real-time. Fast answers, high-stakes tokens, and direct ELO leaderboards.
                </p>
              </div>
              <Link href="/kbc/ranked" className="btn btn-secondary" style={{ width: '100%', marginTop: '20px' }}>
                Locked
              </Link>
            </div>

            {/* Play With Friend Card */}
            <div 
              className="glass-panel card-shine glow-purple theme-kbc" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                minHeight: '260px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <Users size={24} color="var(--accent-purple)" />
                  </div>
                  <span className="badge" style={{ borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--accent-purple)', background: 'rgba(139, 92, 246, 0.05)' }}>Active</span>
                </div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#FFF' }}>Play With Friend</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '20px' }}>
                  Create a custom lobby code, invite your friends, and host private coding showdowns in real-time.
                </p>
              </div>
              <Link href="/kbc/multiplayer" className="btn interactive-lift" style={{ width: '100%', marginTop: '20px', background: 'var(--accent-purple)', borderColor: 'rgba(139, 92, 246, 0.5)', color: '#fff' }}>
                Play with Friend
              </Link>
            </div>

            {/* Daily Challenge Card */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', opacity: 0.8 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ background: 'rgba(245, 166, 35, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <Calendar size={24} color="var(--accent-amber)" />
                  </div>
                  <span className="badge" style={{ borderColor: 'rgba(245, 166, 35, 0.3)', color: 'var(--accent-amber)', background: 'rgba(245, 166, 35, 0.05)' }}>Coming Soon</span>
                </div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#FFF' }}>Daily Challenge</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '20px' }}>
                  One specific high-difficulty coding question curated daily. Earn double coins and unique badges.
                </p>
              </div>
              <Link href="/kbc/daily" className="btn btn-secondary" style={{ width: '100%', marginTop: '20px' }}>
                Locked
              </Link>
            </div>

          </div>
        </div>

        {/* Back to main dashboard link */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <Link href="/" className="btn btn-secondary interactive-lift" style={{ padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to DebugDuel Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
