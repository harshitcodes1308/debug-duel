'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useStore, UserProfile } from '@/store/useStore';
import { useUser, useClerk } from '@clerk/nextjs';
import { io } from 'socket.io-client';
import { 
  Swords, Zap, Trophy, Award, Flame, 
  Shield, Play, Calendar, Users, Lock, X, Crown, AlertTriangle
} from 'lucide-react';
import { KbcAudio } from '../utils/kbc/audio';

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

const getQuestIcon = (type: string) => {
  switch (type) {
    case 'play_duel': return 'Play';
    case 'win_duel': return 'Trophy';
    case 'play_kbc': return 'Award';
    case 'claim_daily_reward': return 'Calendar';
    case 'gain_xp': return 'Zap';
    case 'add_friend': return 'Users';
    default: return 'Award';
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

    socket.on('connect', () => {
      socket.emit('register_user', { userId: user.id });
    });

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
      addToast({ ...data, toastType: 'achievement' });
      playUnlockSound();
    });

    socket.on('quest_completed', (data) => {
      addToast({ ...data.quest, toastType: 'quest' });
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
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Swords size={18} color="var(--accent-blue)" /> CHALLENGE RECEIVED!
          </div>
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
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={18} color="var(--accent-amber)" /> KBC INVITE RECEIVED!
          </div>
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
          const isQuest = toast.toastType === 'quest';
          const rarityForStyle = isQuest ? (toast.category === 'DAILY' ? 'Common' : 'Epic') : toast.rarity;
          const styles = getToastRarityStyles(rarityForStyle);
          const iconName = isQuest ? getQuestIcon(toast.type) : toast.icon;
          const titleLabel = isQuest ? `${toast.category === 'DAILY' ? 'Daily' : 'Weekly'} Quest Completed` : 'Achievement Unlocked';
          const xpReward = isQuest ? toast.rewardXP : toast.xpReward;
          const tokenReward = isQuest ? toast.rewardTokens : toast.tokenReward;

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
                {renderToastIcon(iconName)}
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
                    {titleLabel}
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
                    +{xpReward} XP
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    +{tokenReward} Tokens
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
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');

  // Availability / checking states
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Requirement counting for sound cues
  const [prevRequirementsCount, setPrevRequirementsCount] = useState(0);

  // Google Auth states
  const [showGoogleSandboxModal, setShowGoogleSandboxModal] = useState(false);
  const [sandboxEmail, setSandboxEmail] = useState('');
  const [sandboxName, setSandboxName] = useState('');

  // Google Registration states
  const [googleRegisterData, setGoogleRegisterData] = useState<{
    email: string;
    fullName: string;
    googleId: string;
    accessToken?: string | null;
    isSandbox: boolean;
  } | null>(null);
  const [googleUsername, setGoogleUsername] = useState('');
  const [googleUsernameAvailable, setGoogleUsernameAvailable] = useState<boolean | null>(null);
  const [checkingGoogleUsername, setCheckingGoogleUsername] = useState(false);

  // Persistence
  useEffect(() => {
    async function loadSession() {
      const cachedId = localStorage.getItem('dd_user_id');
      if (cachedId) {
        try {
          const res = await fetch(`http://localhost:5001/api/auth/me/${cachedId}`);
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            localStorage.removeItem('dd_user_id');
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
    loadSession();
  }, [setUser]);

  const googleClientId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID : null;

  useEffect(() => {
    if (!googleClientId) return;

    // Load GIS script dynamically
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId]);

  const handleGoogleSignIn = () => {
    KbcAudio.playSelect();
    if (googleClientId) {
      if (typeof window !== 'undefined' && (window as any).google) {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'openid email profile',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                console.error("Google Auth error:", tokenResponse.error);
                setErrorMsg(`Google Auth error: ${tokenResponse.error}`);
                KbcAudio.playWrong();
                return;
              }
              if (!tokenResponse.access_token) return;

              setLoading(true);
              try {
                const res = await fetch('http://localhost:5001/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: tokenResponse.access_token,
                    isSandbox: false
                  })
                });

                if (res.ok) {
                  const userProfile = await res.json();
                  if (userProfile.registrationRequired) {
                    KbcAudio.playSelect();
                    setGoogleRegisterData({
                      email: userProfile.email,
                      fullName: userProfile.fullName,
                      googleId: userProfile.googleId,
                      accessToken: tokenResponse.access_token,
                      isSandbox: false
                    });
                  } else {
                    localStorage.setItem('dd_user_id', userProfile.id);
                    KbcAudio.playCorrect();
                    setUser(userProfile);
                  }
                } else {
                  const errData = await res.json();
                  setErrorMsg(errData.error || "Google login failed");
                  KbcAudio.playWrong();
                }
              } catch (e) {
                setErrorMsg("Server error connecting to Google Auth");
                KbcAudio.playWrong();
              } finally {
                setLoading(false);
              }
            }
          });
          client.requestAccessToken();
        } catch (err) {
          console.error("Failed to initialize Google token client:", err);
          setErrorMsg("Failed to launch Google Auth window.");
          KbcAudio.playWrong();
        }
      } else {
        setErrorMsg("Google Sign-In SDK is still loading. Try again in a second!");
        KbcAudio.playWrong();
      }
    } else {
      setShowGoogleSandboxModal(true);
    }
  };

  const handleSandboxSelect = async (email: string, name: string) => {
    KbcAudio.playLock();
    setShowGoogleSandboxModal(false);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName: name,
          isSandbox: true
        })
      });
      if (res.ok) {
        const userProfile = await res.json();
        if (userProfile.registrationRequired) {
          KbcAudio.playSelect();
          setGoogleRegisterData({
            email: userProfile.email,
            fullName: userProfile.fullName,
            googleId: userProfile.googleId,
            accessToken: null,
            isSandbox: true
          });
        } else {
          localStorage.setItem('dd_user_id', userProfile.id);
          KbcAudio.playCorrect();
          setUser(userProfile);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Sandbox login failed");
        KbcAudio.playWrong();
      }
    } catch (e) {
      setErrorMsg("Server connection error during sandbox auth");
      KbcAudio.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxEmail.trim() || !sandboxName.trim()) return;
    handleSandboxSelect(sandboxEmail.trim(), sandboxName.trim());
  };

  // Audio cue on screen mount (runs when not logged in)
  useEffect(() => {
    if (!storeUser && !loading) {
      // Play a short intro fanfare on startup
      KbcAudio.playIntro();
    }
  }, [storeUser, loading]);

  // Username check effect
  useEffect(() => {
    if (mode !== 'signup' || !username.trim()) {
      setUsernameAvailable(null);
      return;
    }
    if (username.trim().length < 3) {
      setUsernameAvailable(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const res = await fetch('http://localhost:5001/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          setUsernameAvailable(data.available);
          if (data.available) {
            KbcAudio.playSelect(); // Tick sound indicating username is valid
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [username, mode]);

  // Google Username check effect
  useEffect(() => {
    if (!googleRegisterData || !googleUsername.trim()) {
      setGoogleUsernameAvailable(null);
      return;
    }
    if (googleUsername.trim().length < 3) {
      setGoogleUsernameAvailable(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingGoogleUsername(true);
      try {
        const res = await fetch('http://localhost:5001/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: googleUsername.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          setGoogleUsernameAvailable(data.available);
          if (data.available) {
            KbcAudio.playSelect(); // Tick sound indicating username is valid
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingGoogleUsername(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [googleUsername, googleRegisterData]);

  const handleGoogleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    KbcAudio.playLock();

    if (!googleRegisterData) return;
    if (googleUsernameAvailable === false || !googleUsername.trim()) {
      setErrorMsg("Please select a valid, available username");
      KbcAudio.playWrong();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleRegisterData.email,
          fullName: googleRegisterData.fullName,
          googleId: googleRegisterData.googleId,
          accessToken: googleRegisterData.accessToken,
          isSandbox: googleRegisterData.isSandbox,
          username: googleUsername.trim()
        })
      });

      if (res.ok) {
        const userProfile = await res.json();
        localStorage.setItem('dd_user_id', userProfile.id);
        KbcAudio.playCorrect();
        setUser(userProfile);
        setGoogleRegisterData(null);
        setGoogleUsername('');
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Google registration failed");
        KbcAudio.playWrong();
      }
    } catch (err) {
      setErrorMsg("Server error completing registration");
      KbcAudio.playWrong();
    } finally {
      setLoading(false);
    }
  };

  // Password constraint helpers
  const passLength = password.length >= 8;
  const passCapital = /[A-Z]/.test(password);
  const passNumber = /[0-9]/.test(password);
  const passSpecial = /[^A-Za-z0-9]/.test(password);

  const passwordValid = passLength && passCapital && passNumber && passSpecial;

  // Sound cue whenever a password requirement is checked off
  const currentRequirementsCount = [passLength, passCapital, passNumber, passSpecial].filter(Boolean).length;
  useEffect(() => {
    if (password && mode === 'signup') {
      if (currentRequirementsCount > prevRequirementsCount) {
        KbcAudio.playLadder(); // Rising pitch fanfare when meeting a condition
      } else if (currentRequirementsCount < prevRequirementsCount) {
        KbcAudio.playSelect(); // Pluck tick when losing a condition
      }
    }
    setPrevRequirementsCount(currentRequirementsCount);
  }, [currentRequirementsCount, prevRequirementsCount, password, mode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    KbcAudio.playLock(); // Dramatic lock sound on submit

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg("All fields are mandatory");
      KbcAudio.playWrong();
      return;
    }

    if (usernameAvailable === false) {
      setErrorMsg("Username is taken");
      KbcAudio.playWrong();
      return;
    }

    if (!passwordValid) {
      setErrorMsg("Password does not meet requirements");
      KbcAudio.playWrong();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          password
        })
      });

      if (res.ok) {
        const userProfile = await res.json();
        localStorage.setItem('dd_user_id', userProfile.id);
        KbcAudio.playCorrect(); // Triumphant sound on success
        setUser(userProfile);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Signup failed");
        KbcAudio.playWrong();
      }
    } catch (err) {
      setErrorMsg("Server connection error during registration");
      KbcAudio.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    KbcAudio.playLock(); // Dynamic lock sound on submit

    if (!usernameOrEmail.trim() || !password) {
      setErrorMsg("Please enter both credentials");
      KbcAudio.playWrong();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password
        })
      });

      if (res.ok) {
        const userProfile = await res.json();
        localStorage.setItem('dd_user_id', userProfile.id);
        KbcAudio.playCorrect(); // Success chime
        setUser(userProfile);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "Invalid username/email or password");
        KbcAudio.playWrong();
      }
    } catch (err) {
      setErrorMsg("Server connection error during login");
      KbcAudio.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    KbcAudio.playSelect();
    setUser(null);
    localStorage.removeItem('dd_user_id');
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setUsernameOrEmail('');
    setErrorMsg('');
  };

  // Mock dev login action for backward compatibility
  const loginAsDev = async (usr: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: usr, password: 'DevUserPassword123!' })
      });
      if (res.ok) {
        const userProfile = await res.json();
        localStorage.setItem('dd_user_id', userProfile.id);
        setUser(userProfile);
      } else {
        const regRes = await fetch('http://localhost:5001/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: usr.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            username: usr,
            email: `${usr}@debugduel.dev`,
            password: 'DevUserPassword123!'
          })
        });
        if (regRes.ok) {
          const userProfile = await regRes.json();
          localStorage.setItem('dd_user_id', userProfile.id);
          setUser(userProfile);
        }
      }
    } catch (e) {
      console.error("Mock login fallback failed", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: 'login' | 'signup') => {
    if (newMode !== mode) {
      KbcAudio.playSelect(); // Play click sound
      setMode(newMode);
      setErrorMsg('');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!storeUser) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent', // Let standard grid background from body show through
        fontFamily: 'Inter, sans-serif',
        padding: '24px',
        overflowY: 'auto'
      }}>
        
        <div className="card-tactical" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}>
          
          {/* Logo & Header (No inheritance from .logo class to prevent SVG transparency) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <div className="logo" style={{ fontSize: '32px' }}>
              ⚔️ DebugDuel
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
              Arena Client v1.0.0
            </div>
          </div>

          {googleRegisterData ? (
            <>
              {errorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> {errorMsg}
                  </div>
                </div>
              )}

              <form onSubmit={handleGoogleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Authenticated as <strong style={{ color: '#fff' }}>{googleRegisterData.email}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Choose your tactical username to complete registration in DebugDuel.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>USERNAME</label>
                    {googleUsername.trim().length >= 3 && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' }}>
                        {checkingGoogleUsername ? (
                          <span style={{ color: 'var(--text-muted)' }}>Checking...</span>
                        ) : googleUsernameAvailable ? (
                          <span style={{ color: 'var(--success)' }}>✓ Available</span>
                        ) : (
                          <span style={{ color: 'var(--danger)' }}>✗ Taken</span>
                        )}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. cyber_ninja"
                    value={googleUsername}
                    onChange={(e) => setGoogleUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="input-tactical"
                    style={{ height: '42px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={googleUsernameAvailable === false || checkingGoogleUsername || !googleUsername.trim()}
                  className="btn btn-success"
                  style={{ height: '42px', marginTop: '8px', fontSize: '14px' }}
                >
                  Complete Registration
                </button>

                <button
                  type="button"
                  onClick={() => {
                    KbcAudio.playSelect();
                    setGoogleRegisterData(null);
                    setGoogleUsername('');
                    setErrorMsg('');
                  }}
                  className="btn btn-secondary"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <button 
                  onClick={() => toggleMode('login')}
                  className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, border: 'none', height: '36px', fontSize: '13px' }}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => toggleMode('signup')}
                  className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, border: 'none', height: '36px', fontSize: '13px' }}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> {errorMsg}
                  </div>
                </div>
              )}

              {/* Tab Forms */}
              {mode === 'login' ? (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>USERNAME OR EMAIL</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. cyber_ninja"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>PASSWORD</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ height: '42px', marginTop: '8px', fontSize: '14px' }}
                  >
                    Authenticate & Connect
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>FULL NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>USERNAME</label>
                      {username.trim().length >= 3 && (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' }}>
                          {checkingUsername ? (
                            <span style={{ color: 'var(--text-muted)' }}>Checking...</span>
                          ) : usernameAvailable ? (
                            <span style={{ color: 'var(--success)' }}>✓ Available</span>
                          ) : (
                            <span style={{ color: 'var(--danger)' }}>✗ Taken</span>
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. cyber_ninja"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>EMAIL ADDRESS</label>
                    <input
                      type="email"
                      required
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif' }}>PASSWORD</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-tactical"
                      style={{ height: '42px' }}
                    />

                    {/* Password validation feedback checklist */}
                    {password && (
                      <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '2px', fontFamily: 'Space Grotesk, sans-serif' }}>
                          REQUIREMENTS:
                        </div>
                        <div style={{ color: passLength ? 'var(--success)' : 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: passLength ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)', display: 'inline-block' }} /> 8+ Characters
                        </div>
                        <div style={{ color: passCapital ? 'var(--success)' : 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: passCapital ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)', display: 'inline-block' }} /> Capital Letter (A-Z)
                        </div>
                        <div style={{ color: passNumber ? 'var(--success)' : 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: passNumber ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)', display: 'inline-block' }} /> Number (0-9)
                        </div>
                        <div style={{ color: passSpecial ? 'var(--success)' : 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: passSpecial ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)', display: 'inline-block' }} /> Special Sign (@, $, !, etc.)
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!passwordValid || usernameAvailable === false || checkingUsername}
                    className="btn btn-success"
                    style={{ height: '42px', marginTop: '8px', fontSize: '14px' }}
                  >
                    Register Account
                  </button>
                </form>
              )}

              {/* Google Connect Divider & Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>OR CONNECT VIA</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="btn btn-secondary"
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  fontFamily: 'Space Grotesk, sans-serif',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                {mode === 'login' ? 'SIGN IN WITH GOOGLE' : 'SIGN UP USING GOOGLE'}
              </button>
            </>
          )}

        </div>

        {/* Sandbox Modal Overlay */}
        {showGoogleSandboxModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            fontFamily: 'Inter, sans-serif'
          }}>
            <div className="card-tactical" style={{
              width: '100%',
              maxWidth: '400px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '2px solid var(--accent-blue)',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25)'
            }}>
              <div className="panel-tactical-tr"></div>
              <div className="panel-tactical-bl"></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={18} color="var(--accent-blue)" /> GOOGLE AUTH SANDBOX
                </h3>
                <button
                  onClick={() => {
                    KbcAudio.playSelect();
                    setShowGoogleSandboxModal(false);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', margin: 0 }}>
                No Client ID configured in <code>.env.local</code>. Choose a preset account below or input mock credentials to simulate Google sign-in.
              </p>

              {/* Preset buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleSandboxSelect('cyber_dev@gmail.com', 'Cyber Developer')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px' }}
                >
                  👤 cyber_dev@gmail.com (Cyber Developer)
                </button>
                <button
                  onClick={() => handleSandboxSelect('code_wizard@gmail.com', 'Code Wizard')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '13px' }}
                >
                  👤 code_wizard@gmail.com (Code Wizard)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>OR CUSTOM</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              {/* Custom Mock Input Form */}
              <form onSubmit={handleSandboxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MOCK EMAIL</label>
                  <input
                    type="email"
                    required
                    placeholder="custom_user@gmail.com"
                    value={sandboxEmail}
                    onChange={(e) => setSandboxEmail(e.target.value)}
                    className="input-tactical"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>MOCK NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="Custom User"
                    value={sandboxName}
                    onChange={(e) => setSandboxName(e.target.value)}
                    className="input-tactical"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '38px', marginTop: '4px', fontSize: '13px', background: 'var(--accent-blue)', color: '#fff' }}
                >
                  Bypass & Authenticate
                </button>
              </form>

            </div>
          </div>
        )}

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
      <div className="logo pulse-glow" style={{ fontSize: '32px', marginBottom: '16px' }}>
        ⚔️ DEBUGDUEL
      </div>
      <div style={{ color: '#8888A0', fontSize: '14px' }}>Loading session...</div>
    </div>
  );
}
