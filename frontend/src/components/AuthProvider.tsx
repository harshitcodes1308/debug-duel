'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useUser, useClerk } from '@clerk/nextjs';
import { io } from 'socket.io-client';
import { 
  Swords, Zap, Trophy, Award, Flame, 
  Shield, Play, Calendar, Users, Lock, X
} from 'lucide-react';

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

const renderToastIcon = (iconName: string, size = 20) => {
  switch (iconName) {
    case 'Swords': return <Swords size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'Award': return <Award size={size} />;
    case 'Flame': return <Flame size={size} />;
    case 'Shield': return <Shield size={size} />;
    case 'Play': return <Play size={size} />;
    case 'Calendar': return <Calendar size={size} />;
    case 'Users': return <Users size={size} />;
    default: return <Award size={size} />;
  }
};

const getToastRarityStyles = (rarity: string) => {
  switch (rarity) {
    case 'Rare':
      return {
        borderColor: 'rgba(96, 165, 250, 0.4)',
        boxShadow: '0 8px 32px rgba(96, 165, 250, 0.2)',
        color: '#60A5FA',
        background: 'rgba(15, 23, 42, 0.95)'
      };
    case 'Epic':
      return {
        borderColor: 'rgba(192, 132, 252, 0.5)',
        boxShadow: '0 8px 32px rgba(192, 132, 252, 0.25)',
        color: '#C084FC',
        background: 'rgba(24, 15, 41, 0.95)'
      };
    case 'Legendary':
      return {
        borderColor: 'rgba(251, 191, 36, 0.6)',
        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.35)',
        color: '#FBBF24',
        background: 'rgba(28, 22, 10, 0.95)'
      };
    case 'Common':
    default:
      return {
        borderColor: 'rgba(148, 163, 184, 0.3)',
        boxShadow: '0 8px 32px rgba(148, 163, 184, 0.15)',
        color: '#94A3B8',
        background: 'rgba(30, 41, 59, 0.95)'
      };
  }
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

  const [kbcInvite, setKbcInvite] = useState<{
    roomCode: string;
    hostUsername: string;
  } | null>(null);

  const [toasts, setToasts] = useState<any[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (achievement: any) => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { ...achievement, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const playInviteSound = () => {
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
  };

  const playUnlockSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5001');

    socket.emit('register_user', { userId: user.id });

    socket.on('duel_invite_received', (data) => {
      setInvite(data);
      playInviteSound();
    });

    socket.on('kbc_invite_received', (data) => {
      setKbcInvite(data);
      playInviteSound();
    });

    socket.on('duel_invite_accepted', ({ duelId }) => {
      window.location.href = `/duel/lobby/${duelId}`;
    });

    socket.on('achievement_unlocked', (data) => {
      addToast(data);
      playUnlockSound();
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

  const handleKbcAccept = () => {
    if (!kbcInvite) return;
    window.location.href = `/kbc/multiplayer/lobby/${kbcInvite.roomCode}`;
    setKbcInvite(null);
  };

  const handleKbcDecline = () => {
    setKbcInvite(null);
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

      {kbcInvite && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '360px',
          background: 'rgba(26, 26, 34, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '2px solid var(--accent-amber)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(245, 166, 35, 0.25)',
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
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', marginBottom: '6px' }}>👑 KBC INVITE RECEIVED!</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '14px' }}>
            <strong style={{ color: 'var(--accent-amber)' }}>@{kbcInvite.hostUsername}</strong> has invited you to join a real-time **Code KBC** faceoff!
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleKbcAccept}
              className="btn btn-success"
              style={{ flex: 1, height: '36px', fontSize: '13px', padding: 0, background: 'var(--accent-amber)', color: '#000', fontWeight: 'bold' }}
            >
              Accept & Join
            </button>
            <button
              onClick={handleKbcDecline}
              className="btn btn-secondary"
              style={{ flex: 1, height: '36px', fontSize: '13px', padding: 0 }}
            >
              Decline
            </button>
          </div>
        </div>
      )}
      {/* Achievement Unlocked Toast container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10000,
        fontFamily: 'Inter, sans-serif'
      }}>
        <style>{`
          @keyframes slideUpFadeIn {
            from { transform: translateY(40px) scale(0.95); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        `}</style>
        {toasts.map((toast) => {
          const styles = getToastRarityStyles(toast.rarity);
          return (
            <div 
              key={toast.id}
              style={{
                width: '340px',
                background: styles.background,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${styles.borderColor}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: styles.boxShadow,
                animation: 'slideUpFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                display: 'flex',
                gap: '14px',
                position: 'relative'
              }}
            >
              {/* Icon Frame */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${styles.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: styles.color,
                flexShrink: 0
              }}>
                {renderToastIcon(toast.icon)}
              </div>

              {/* Text info */}
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: styles.color
                  }}>
                    Achievement Unlocked
                  </span>
                  <button 
                    onClick={() => removeToast(toast.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {toast.description}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                    +{toast.xpReward} XP
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    +{toast.tokenReward} Tokens
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
        backgroundColor: '#09090D',
        fontFamily: 'Inter, sans-serif',
        padding: '24px'
      }}>
        <div className="card-base glow-purple" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px'
            }}>
              <Swords size={28} color="var(--accent-purple)" />
            </div>
            <h1 className="logo" style={{ fontSize: '24px', justifyContent: 'center', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>
              DEBUGDUEL
            </h1>
            <div style={{ fontSize: '10px', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
              Launcher fall-back mode
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '20px' }}>
            Choose a mock profile or enter a custom handle to initialize local session.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {presets.map((p) => (
              <button
                key={p}
                className="btn btn-secondary interactive-lift"
                style={{ padding: '8px 14px', fontSize: '12px', borderRadius: 'var(--radius-md)' }}
                onClick={() => loginAsDev(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ width: '100%', height: '1px', background: 'var(--border)' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>CUSTOM HANDLE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. code_pilot"
                className="input-base"
                style={{ flex: 1, height: '40px' }}
                onKeyDown={(e) => e.key === 'Enter' && loginAsDev(usernameInput)}
              />
              <button
                className="btn btn-primary"
                style={{ height: '40px', padding: '0 16px', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                onClick={() => loginAsDev(usernameInput)}
                disabled={!usernameInput.trim()}
              >
                Launch
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
