'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { io, Socket } from 'socket.io-client';
import { Copy, Check, Users, ArrowLeft, ShieldAlert, Sparkles, Clock } from 'lucide-react';

const MOCK_PROFILES = [
  { username: 'curly_brackets', color: '#4ecdc4' },
  { username: 'caffeine_dev', color: 'var(--accent-purple)' },
  { username: 'debugger_x', color: 'var(--accent-amber)' },
  { username: 'stack_overflow', color: 'var(--accent-blue)' },
  { username: 'sudo_solve', color: '#ffe66d' },
  { username: 'bug_slayer', color: 'var(--accent-red)' },
  { username: 'binary_beast', color: 'var(--accent-green)' }
];

export default function KbcLobbyRoom() {
  const params = useParams();
  const roomCode = (params.roomCode as string).toUpperCase();
  const router = useRouter();
  const { user } = useStore();

  const [copied, setCopied] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Slot Machine states
  const [mockIndex, setMockIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  // Play audio cues
  const playSound = (type: 'tick' | 'match' | 'countdown') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      switch (type) {
        case 'tick': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.015, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
          break;
        }
        case 'match': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = 'triangle';
          osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
          osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.08);
          
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 0.35);
          osc2.stop(ctx.currentTime + 0.35);
          break;
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Connect to room sockets
  useEffect(() => {
    if (!user || !roomCode) return;

    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('kbc_join_lobby', { roomCode, userId: user.id });

    socket.on('kbc_room_joined', ({ room }) => {
      setRoomState(room);
      if (room.status === 'active') {
        router.push(`/kbc/multiplayer/game/${roomCode}`);
      }
    });

    socket.on('kbc_room_updated', (updatedRoom) => {
      setRoomState(updatedRoom);
      
      // Stop spinning when guest joins
      if (updatedRoom.guest) {
        setIsSpinning(false);
        playSound('match');
      } else {
        setIsSpinning(true);
      }
    });

    socket.on('kbc_game_started', () => {
      router.push(`/kbc/multiplayer/game/${roomCode}`);
    });

    socket.on('kbc_room_closed', ({ message }) => {
      alert(message || "Lobby was closed.");
      router.push('/kbc/multiplayer');
    });

    socket.on('kbc_error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, roomCode]);

  // Spinner logic
  useEffect(() => {
    if (!isSpinning) return;
    
    const interval = setInterval(() => {
      setMockIndex((prev) => (prev + 1) % MOCK_PROFILES.length);
      playSound('tick');
    }, 150);
    
    return () => clearInterval(interval);
  }, [isSpinning]);

  // Link copy util
  const handleCopyLink = () => {
    const link = `${window.location.origin}/kbc/multiplayer/lobby/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Exit lobby
  const handleExitLobby = () => {
    if (socketRef.current) {
      socketRef.current.emit('kbc_leave', { roomCode });
    }
    router.push('/kbc/multiplayer');
  };

  // Start game trigger
  const handleStartGame = () => {
    if (socketRef.current && roomState?.guest) {
      socketRef.current.emit('kbc_start_match', { roomCode });
    }
  };

  if (!user) return null;
  if (!roomState) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at center, #140F35 0%, #0A0618 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFF',
        fontFamily: 'Rajdhani, sans-serif'
      }}>
        <div>Loading KBC Lobby Room...</div>
      </div>
    );
  }

  const isHost = roomState.host?.userId === user.id;
  const guestJoined = !!roomState.guest;

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at top, #140F32 0%, #0A0618 100%)',
      padding: '40px 24px',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '32px', background: 'rgba(20, 16, 40, 0.4)' }}>
        
        {/* Lobby Details */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-purple)', fontWeight: 'bold', letterSpacing: '0.2em' }}>
            CODE KBC SHOWDOWN LOBBY
          </span>
          <h2 style={{ fontSize: '32px', fontFamily: 'Rajdhani, sans-serif', color: '#FFF', marginTop: '6px', marginBottom: '8px' }}>
            Room Code: <span style={{ color: 'var(--accent-amber)', letterSpacing: '0.05em' }}>{roomCode}</span>
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span className="badge badge-js" style={{ textTransform: 'uppercase', borderColor: 'rgba(245, 166, 35, 0.2)', color: 'var(--accent-amber)', background: 'rgba(255,255,255,0.01)' }}>
              Category: {roomState.category}
            </span>
            {roomState.timeLeft !== undefined && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
                  {roomState.wager === 0 ? "Free Wager" : `${roomState.wager} Tokens Wager`}
                </span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px', color: 'var(--accent-red)', fontSize: '13px', textAlign: 'center' }}>
            <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px' }} />
            <span>{error}</span>
          </div>
        )}

        <div className="matchup-grid">
          
          {/* Host Display */}
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.015)',
            borderColor: 'rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(74, 158, 255, 0.2)'
            }}>
              {roomState.host?.username[0].toUpperCase()}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>@{roomState.host?.username}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Host (Player A)</div>
            </div>
          </div>

          {/* VS Divider */}
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 'bold',
            color: 'var(--text-secondary)',
            fontSize: '18px',
            background: 'rgba(255,255,255,0.03)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}>VS</div>

          {/* Guest Display */}
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.015)',
            borderStyle: 'solid',
            borderColor: guestJoined ? 'rgba(255,255,255,0.05)' : 'rgba(245, 166, 35, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px',
            boxShadow: guestJoined ? 'none' : '0 0 15px rgba(245, 166, 35, 0.05)',
            transition: 'all 0.3s ease'
          }}>
            {guestJoined ? (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(123, 147, 219, 0.2)'
                }}>
                  {roomState.guest.username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--accent-green)' }}>@{roomState.guest.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Guest (Player B)</div>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: MOCK_PROFILES[mockIndex].color,
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.35,
                  transition: 'background 0.1s ease'
                }}>
                  {MOCK_PROFILES[mockIndex].username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'center', opacity: 0.8 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    @{MOCK_PROFILES[mockIndex].username}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-amber)', marginTop: '2px', fontWeight: '500' }} className="pulse-glow">
                    WAITING FOR GUEST...
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Copy Invite Link Section */}
        {!guestJoined && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>SHARE ROOM LINK</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/kbc/multiplayer/lobby/${roomCode}`}
                style={{
                  flex: 1,
                  background: '#141419',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  fontSize: '13px'
                }}
                onClick={handleCopyLink}
              />
              <button
                className="btn btn-primary"
                onClick={handleCopyLink}
                style={{ gap: '6px', padding: '12px 16px', background: copied ? 'var(--accent-green)' : 'var(--accent-purple)', color: copied ? 'black' : 'white' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Your friend can enter room code <strong style={{ color: 'var(--accent-amber)' }}>{roomCode}</strong> or click this link to join.
            </p>
          </div>
        )}

        {/* Lobby Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {isHost ? (
            <button
              disabled={!guestJoined}
              onClick={handleStartGame}
              className="btn btn-success"
              style={{
                width: '100%',
                height: '46px',
                background: guestJoined ? 'var(--accent-green)' : 'rgba(255,255,255,0.02)',
                border: guestJoined ? 'none' : '1px solid var(--border)',
                color: guestJoined ? '#000' : 'var(--text-secondary)',
                fontWeight: 'bold',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: guestJoined ? 'pointer' : 'not-allowed'
              }}
            >
              <Sparkles size={16} />
              {guestJoined ? "Start KBC Showdown" : "Waiting for Player B..."}
            </button>
          ) : (
            <div style={{
              width: '100%',
              height: '46px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
              fontSize: '14px',
              fontWeight: '500',
              gap: '8px'
            }}>
              <Clock size={16} />
              Waiting for Host (Player A) to start...
            </div>
          )}

          <button
            onClick={handleExitLobby}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px'
            }}
          >
            <ArrowLeft size={14} /> Exit Lobby Room
          </button>
        </div>

      </div>
    </div>
  );
}
