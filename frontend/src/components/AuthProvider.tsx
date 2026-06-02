'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useUser, useClerk } from '@clerk/nextjs';
import { io } from 'socket.io-client';

interface AuthContextType {
  isDevMode: boolean;
  loginAsDev: (username: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// Common sync profile function
const syncUserWithBackend = async (username: string, clerkId: string, setUser: (u: UserProfile) => void) => {
  try {
    const response = await fetch('http://localhost:5001/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkId, username })
    });
    if (response.ok) {
      const data: UserProfile = await response.json();
      setUser(data);
      return data;
    } else {
      console.error("Failed to sync user profile");
    }
  } catch (e) {
    console.error("Error syncing profile with backend", e);
  }
  return null;
};

function SocketNotificationWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const [invite, setInvite] = useState<{
    duelId: string;
    hostUsername: string;
    language: string;
    difficulty: string;
    betAmount: number;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5001');

    socket.emit('register_user', { userId: user.id });

    socket.on('duel_invite_received', (data) => {
      setInvite(data);
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        console.warn(e);
      }
    });

    socket.on('duel_invite_accepted', ({ duelId }) => {
      window.location.href = `/duel/lobby/${duelId}`;
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleAccept = () => {
    if (!invite || !user) return;
    const socket = io('http://localhost:5001');
    socket.emit('accept_duel_invite', { duelId: invite.duelId, friendId: user.id });
    
    socket.once('invite_accepted_confirm', ({ duelId }) => {
      socket.disconnect();
      window.location.href = `/duel/lobby/${duelId}`;
    });
    
    setInvite(null);
  };

  const handleDecline = () => {
    if (!invite) return;
    const socket = io('http://localhost:5001');
    socket.emit('decline_duel_invite', { duelId: invite.duelId });
    socket.disconnect();
    setInvite(null);
  };

  return (
    <>
      {children}
      {invite && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '360px',
          background: 'rgba(26, 26, 34, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '2px solid var(--accent-purple)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.25)',
          zIndex: 9999,
          fontFamily: 'Inter, sans-serif',
          animation: 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateY(100px) scale(0.9); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', marginBottom: '6px' }}>⚔️ CHALLENGE RECEIVED!</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '14px' }}>
            <strong style={{ color: 'var(--accent-blue)' }}>@{invite.hostUsername}</strong> has challenged you to a{' '}
            <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{invite.language}</span>{' '}
            <strong style={{ color: 'var(--accent-amber)' }}>{invite.difficulty}</strong> duel wagering{' '}
            <strong style={{ color: 'var(--accent-green)' }}>{invite.betAmount}</strong> tokens!
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAccept}
              className="btn btn-success"
              style={{ flex: 1, height: '36px', fontSize: '13px', padding: 0 }}
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              className="btn btn-secondary"
              style={{ flex: 1, height: '36px', fontSize: '13px', padding: 0 }}
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 1. CLERK AUTH PROVIDER COMPONENT
function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const clerk = useClerk();
  const { setUser } = useStore();
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const sync = async () => {
      if (clerkUser) {
        const username = clerkUser.username || clerkUser.firstName || `user_${clerkUser.id.substring(5, 12)}`;
        await syncUserWithBackend(username, clerkUser.id, setUser);
      } else {
        setUser(null);
      }
      setSyncing(false);
    };

    sync();
  }, [clerkUser, isLoaded, setUser]);

  const logout = () => {
    clerk.signOut();
  };

  const loginAsDev = async () => {
    // No-op in Clerk mode
  };

  if (!isLoaded || syncing) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{ isDevMode: false, loginAsDev, logout, loading: false }}>
      <SocketNotificationWrapper>{children}</SocketNotificationWrapper>
    </AuthContext.Provider>
  );
}

// 2. DEV MODE AUTH PROVIDER COMPONENT
function DevModeAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: storeUser, setUser } = useStore();
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');

  const sync = useCallback(async (username: string) => {
    setLoading(true);
    const data = await syncUserWithBackend(username, `mock-clerk-${username}`, setUser);
    if (data) {
      localStorage.setItem('dd_dev_user', username);
    }
    setLoading(false);
  }, [setUser]);

  useEffect(() => {
    const cached = localStorage.getItem('dd_dev_user');
    if (cached) {
      sync(cached);
    } else {
      setLoading(false);
    }
  }, [sync]);

  const loginAsDev = async (username: string) => {
    const formatted = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!formatted) return;
    await sync(formatted);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dd_dev_user');
    setUsernameInput('');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!storeUser) {
    const presets = ['cyber_ninja', 'bug_slayer', 'code_guru', 'syntax_master'];
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D12',
        fontFamily: 'Inter, sans-serif',
        padding: '24px'
      }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
          <div>
            <h1 className="logo" style={{ fontSize: '28px', justifyContent: 'center', marginBottom: '8px' }}>⚔️ DEBUGDUEL</h1>
            <div style={{ fontSize: '11px', color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
              Developer Fallback Mode Active
            </div>
          </div>

          <p style={{ color: '#8888A0', fontSize: '14px', lineHeight: '20px' }}>
            Choose a mock developer profile or enter a custom username to start dueling locally.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {presets.map((p) => (
              <button
                key={p}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '13px' }}
                onClick={() => loginAsDev(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#8888A0', fontWeight: 'bold' }}>CUSTOM USERNAME</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. code_pilot"
                style={{
                  flex: 1,
                  background: '#141419',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
                onKeyDown={(e) => e.key === 'Enter' && loginAsDev(usernameInput)}
              />
              <button
                className="btn btn-primary"
                onClick={() => loginAsDev(usernameInput)}
                disabled={!usernameInput.trim()}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isDevMode: true, loginAsDev, logout, loading: false }}>
      <SocketNotificationWrapper>{children}</SocketNotificationWrapper>
    </AuthContext.Provider>
  );
}

// 3. MASTER WRAPPER
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkPublishableKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY : null;

  if (clerkPublishableKey) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }

  return <DevModeAuthProvider>{children}</DevModeAuthProvider>;
}

// Reusable Loading Component
function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0D0D12',
      color: '#F0F0F0',
      fontFamily: 'Space Grotesk, sans-serif'
    }}>
      <div className="logo pulse-glow" style={{ fontSize: '32px', marginBottom: '16px' }}>⚔️ DEBUGDUEL</div>
      <div style={{ color: '#8888A0', fontSize: '14px' }}>Loading session...</div>
    </div>
  );
}
