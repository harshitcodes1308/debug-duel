'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { io, Socket } from 'socket.io-client';
import { 
  Users, Key, Play, Plus, ArrowLeft, Trophy, Coins, 
  Sparkles, Check, Send, AlertCircle 
} from 'lucide-react';

const CATEGORIES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'react', name: 'React' },
  { id: 'nodejs', name: 'Node.js' },
  { id: 'python', name: 'Python' },
  { id: 'sql', name: 'SQL' },
  { id: 'git', name: 'Git & GitHub' },
  { id: 'ai_llm', name: 'AI & LLMs' },
  { id: 'sys_design', name: 'System Design' }
];

const WAGERS = [0, 50, 100, 250];

export default function KbcMultiplayerHub() {
  const router = useRouter();
  const { user } = useStore();

  // Create Room States
  const [selectedCategory, setSelectedCategory] = useState('javascript');
  const [selectedWager, setSelectedWager] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Room States
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Friends States
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [invitingFriendId, setInvitingFriendId] = useState<string | null>(null);
  const [inviteSuccessId, setInviteSuccessId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket for sending invites
  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5001');
    socketRef.current = socket;
    socket.emit('register_user', { userId: user.id });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch and poll friends
  const fetchFriends = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:5001/api/friends?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (e) {
      console.error("Failed to load friends", e);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    const interval = setInterval(fetchFriends, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Create Room handler
  const handleCreateRoom = async (category = selectedCategory, wager = selectedWager) => {
    if (!user) return;
    setCreating(true);
    setCreateError('');

    if (user.tokens < wager) {
      setCreateError(`Insufficient tokens. You have ${user.tokens} tokens.`);
      setCreating(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/kbc/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, category, wager })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/kbc/multiplayer/lobby/${data.roomCode}`);
      } else {
        setCreateError(data.error || "Failed to create room.");
      }
    } catch (err) {
      setCreateError("Network error. Check backend server.");
    } finally {
      setCreating(false);
    }
  };

  // Join Room handler
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim() || !user) return;

    setJoining(true);
    setJoinError('');
    const code = roomCodeInput.trim().toUpperCase();

    try {
      const res = await fetch(`http://localhost:5001/api/kbc/room/verify/${code}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        if (user.tokens < data.wager) {
          setJoinError(`This room requires a ${data.wager} token wager. You only have ${user.tokens}.`);
          setJoining(false);
          return;
        }
        router.push(`/kbc/multiplayer/lobby/${code}`);
      } else {
        setJoinError(data.error || "Invalid room code.");
      }
    } catch (err) {
      setJoinError("Network error. Check connection.");
    } finally {
      setJoining(false);
    }
  };

  // Direct invite friend handler
  const handleInviteFriend = async (friendId: string, friendUsername: string) => {
    if (!user || !socketRef.current) return;
    setInvitingFriendId(friendId);

    try {
      // 1. Create KBC Room first
      const res = await fetch('http://localhost:5001/api/kbc/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, category: selectedCategory, wager: selectedWager })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        // 2. Emit invite message to friend
        socketRef.current.emit('kbc_send_invite', {
          hostUsername: user.username,
          friendId,
          roomCode: data.roomCode
        });

        setInviteSuccessId(friendId);
        setTimeout(() => {
          router.push(`/kbc/multiplayer/lobby/${data.roomCode}`);
        }, 1200);
      } else {
        alert(data.error || "Failed to create room for invite.");
        setInvitingFriendId(null);
      }
    } catch (err) {
      alert("Network error creating invite.");
      setInvitingFriendId(null);
    }
  };

  if (!user) return null;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F35 0%, #0A0618 100%)',
      padding: '40px 24px',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/kbc" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '13px', fontWeight: '600' }}>
            <ArrowLeft size={14} /> Back to KBC Hub
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontFamily: 'Space Grotesk, sans-serif', color: '#FFF' }}>
                Play With Friend
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Host custom showdowns, wage tokens, and challenge your friends in real-time.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="flex-center" style={{ gap: '8px', background: 'rgba(245, 166, 35, 0.05)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(245, 166, 35, 0.2)' }}>
                <Coins size={16} color="var(--accent-amber)" />
                <span style={{ fontSize: '13px', color: 'var(--accent-amber)', fontWeight: 'bold' }}>{user.tokens} Tokens</span>
              </div>
              <div className="flex-center" style={{ gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <Trophy size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>KBC Arena</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inner Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
          
          {/* Main Area: Room Creation and Joining */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Create Lobby Panel */}
            <div className="glass-panel" style={{ background: 'rgba(20, 16, 40, 0.35)', display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--accent-purple)' }}>
                  <Plus size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#FFF' }}>Create Private Lobby</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Host a new game and get a room code</p>
                </div>
              </div>

              {createError && (
                <div style={{ background: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>SELECT TOPIC</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      background: '#141419',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#FFF',
                      fontFamily: 'inherit',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>TOKEN WAGER (BET)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {WAGERS.map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSelectedWager(w)}
                        style={{
                          flex: 1,
                          height: '42px',
                          borderRadius: '8px',
                          border: selectedWager === w ? '1px solid var(--accent-amber)' : '1px solid rgba(255,255,255,0.08)',
                          background: selectedWager === w ? 'rgba(245, 166, 35, 0.1)' : '#141419',
                          color: selectedWager === w ? 'var(--accent-amber)' : 'var(--text-secondary)',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {w === 0 ? "Free" : w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCreateRoom()}
                disabled={creating}
                className="btn btn-primary"
                style={{
                  height: '48px',
                  background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)',
                  border: 'none',
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)'
                }}
              >
                <Sparkles size={18} />
                {creating ? "Generating Lobby..." : "Create Lobby"}
              </button>
            </div>

            {/* Join Lobby Panel */}
            <div className="glass-panel" style={{ background: 'rgba(20, 16, 40, 0.35)', display: 'flex', flexDirection: 'column', gap: '20px', padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(74, 158, 255, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--accent-blue)' }}>
                  <Key size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#FFF' }}>Join Private Lobby</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Enter room code to join a friend</p>
                </div>
              </div>

              {joinError && (
                <div style={{ background: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{joinError}</span>
                </div>
              )}

              <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. H7X9K2"
                  style={{
                    flex: 1,
                    background: '#141419',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#FFF',
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    letterSpacing: '0.1em',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
                <button
                  type="submit"
                  disabled={joining || !roomCodeInput.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '0 32px',
                    background: 'var(--accent-blue)',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Play size={16} />
                  {joining ? "Joining..." : "Join Match"}
                </button>
              </form>
            </div>

          </div>

          {/* Sidebar: Online Friends Inviter */}
          <div className="glass-panel" style={{ background: 'rgba(20, 16, 40, 0.35)', height: '100%', minHeight: '430px', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#FFF' }}>Online Friends</h3>
            </div>

            {loadingFriends ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading friends list...
              </div>
            ) : friends.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                <span style={{ fontSize: '24px' }}>👥</span>
                <span style={{ fontSize: '13px' }}>No friends added yet.</span>
                <Link href="/" style={{ color: 'var(--accent-blue)', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>Add Friends on Dashboard</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '420px' }}>
                {friends.map((friend) => {
                  const isOnline = friend.status === 'online';
                  const inMatch = friend.status === 'in-game';

                  const isInviting = invitingFriendId === friend.id;
                  const isSuccess = inviteSuccessId === friend.id;

                  return (
                    <div 
                      key={friend.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#FFF',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {friend.username[0].toUpperCase()}
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '9px',
                            height: '9px',
                            borderRadius: '50%',
                            background: isOnline ? 'var(--accent-green)' : inMatch ? 'var(--accent-amber)' : 'rgba(255,255,255,0.2)',
                            border: '2px solid #0D0D12'
                          }} />
                        </div>
                        
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>@{friend.username}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {inMatch ? "In a Match" : isOnline ? "Online" : "Offline"}
                          </div>
                        </div>
                      </div>

                      {isOnline && !inMatch && (
                        <button
                          disabled={invitingFriendId !== null}
                          onClick={() => handleInviteFriend(friend.id, friend.username)}
                          style={{
                            padding: '6px 12px',
                            background: isSuccess ? 'var(--accent-green)' : 'rgba(139, 92, 246, 0.1)',
                            border: isSuccess ? 'none' : '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '6px',
                            color: isSuccess ? '#000' : 'var(--accent-purple)',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isSuccess ? (
                            <>
                              <Check size={12} />
                              Sent
                            </>
                          ) : isInviting ? (
                            "Inviting..."
                          ) : (
                            <>
                              <Send size={11} />
                              Invite
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
