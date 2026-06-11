'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Copy, Check, Users, Palette, ArrowLeft } from 'lucide-react';

export default function ColorMatchLobby() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const { user, setCurrentDuel, resetDuelState } = useStore();
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('waiting');
  const [standbyCountdown, setStandbyCountdown] = useState<number | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [receivedCountdown, setReceivedCountdown] = useState<number | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial details
  const [duelDetails, setDuelDetails] = useState<any>(null);
  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (res.ok) {
          const data = await res.json();
          setDuelDetails(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchDetails();
  }, [duelId, participants]);

  useEffect(() => {
    if (!user || !duelId) return;

    // Reset store state on entering new lobby
    resetDuelState();

    // Connect to WebSocket server
    const socket = io('http://localhost:5001', { forceNew: true });
    socketRef.current = socket;

    const handleConnect = () => {
      socket.emit('join_duel', { duelId, userId: user.id });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on('connect', handleConnect);

    socket.on('lobby_update', ({ participants: newParticipants, status: newStatus }) => {
      setParticipants(newParticipants);
      setStatus(newStatus);
    });

    socket.on('countdown_started', ({ duration }) => {
      setReceivedCountdown(duration);
      setReceivedAt(Date.now());
    });

    socket.on('duel_started', ({ targetColor }) => {
      // Store current duel data
      setCurrentDuel({
        id: duelId as string,
        bugId: '',
        status: 'active',
        betAmount: duelDetails?.betAmount || 50,
        language: 'uiux',
        difficulty: 'medium',
        participants: participants
      });
      
      // Navigate to the color match arena
      router.push(`/color-match/duel/${duelId}`);
    });

    socket.on('error_message', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, duelId, duelDetails?.betAmount, participants]);

  // Sync and reset states on opponent disconnect
  useEffect(() => {
    const opp = participants.find((p: any) => p.userId !== user?.id);
    if (!opp) {
      setStandbyCountdown(null);
      setShowOverlay(false);
      setCountdown(null);
      setReceivedCountdown(null);
      setReceivedAt(null);
    }
  }, [participants, user?.id]);

  // Standby name reveal effect (glowing card banner countdown for 3 seconds)
  useEffect(() => {
    const opp = participants.find((p: any) => p.userId !== user?.id);
    if (opp && receivedCountdown !== null && standbyCountdown === null && !showOverlay) {
      setStandbyCountdown(3);
      const interval = setInterval(() => {
        setStandbyCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setShowOverlay(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [participants, receivedCountdown, showOverlay, user?.id]);

  // Local countdown starting after the overlay is triggered
  useEffect(() => {
    if (showOverlay && receivedCountdown !== null && receivedAt !== null && countdown === null) {
      const elapsed = (Date.now() - receivedAt) / 1000;
      // Calculate remaining time for the 12-second total duration
      const remaining = Math.max(1, Math.round(receivedCountdown - elapsed - 0.5));

      let localTimer = remaining;
      setCountdown(localTimer);

      const interval = setInterval(() => {
        localTimer -= 1;
        if (localTimer <= 0) {
          clearInterval(interval);
          setCountdown(0);
        } else {
          setCountdown(localTimer);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showOverlay, receivedCountdown, receivedAt]);

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/color-match/lobby/${duelId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  const opponent = participants.find((p: any) => p.userId !== user.id);
  const host = participants.find((p: any) => p.userId === user.id) || { user };

  return (
    <div className="container" style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 'calc(100vh - 64px)', justifyContent: 'center' }}>
      
      {showOverlay && countdown !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(13, 13, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          fontFamily: 'Space Grotesk, sans-serif'
        }}>
          <span style={{ fontSize: '14px', color: 'var(--accent-amber)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '16px' }}>MATCH READY. INITIATING...</span>
          <h1 style={{
            fontSize: '120px',
            color: countdown === 0 ? 'var(--accent-amber)' : 'var(--text-primary)',
            textShadow: countdown === 0 ? '0 0 40px rgba(245, 158, 11, 0.4)' : '0 0 20px rgba(255,255,255,0.1)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {countdown === 0 ? "FIGHT!" : countdown}
          </h1>
        </div>
      )}

      <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div className="logo pulse-glow" style={{ fontSize: '24px', justifyContent: 'center', marginBottom: '8px', color: 'var(--accent-amber)' }}>ColorMatch Lobby</div>
          {duelDetails && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span className="badge badge-js" style={{
                color: 'var(--accent-amber)',
                borderColor: 'rgba(245, 158, 11, 0.2)',
                background: 'rgba(245, 158, 11, 0.02)'
              }}>
                UI/UX Game
              </span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>Difficulty: Medium</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>{duelDetails.betAmount} Tokens Bet</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--accent-red)',
            fontSize: '13px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {error}
            <div style={{ marginTop: '8px' }}>
              <Link href="/" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>Back Home</Link>
            </div>
          </div>
        )}

        {opponent && standbyCountdown !== null && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '8px',
            padding: '16px',
            color: 'var(--accent-amber)',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            marginBottom: '16px',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.1)'
          }}>
            ⚡ COMBATANTS LOCKED IN! DUEL BEGINS IN {standbyCountdown}...
          </div>
        )}

        <div className="matchup-grid">
          
          {/* Host Player */}
          <div className="glass-panel" style={{
            background: 'rgba(255,255,255,0.02)',
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
              justifyContent: 'center'
            }}>
              {host.user.username[0].toUpperCase()}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>@{host.user.username}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Host • {host.user.rank}</div>
            </div>
          </div>

          {/* VS Divider */}
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 'bold',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            background: 'rgba(255,255,255,0.04)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}>VS</div>

          {/* Opponent Player */}
          <div className="glass-panel" style={{
            background: opponent ? 'rgba(255,255,255,0.02)' : 'rgba(255, 255, 255, 0.01)',
            borderStyle: opponent ? 'solid' : 'dashed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '24px 16px',
            borderColor: opponent ? 'var(--border)' : 'rgba(255,255,255,0.1)'
          }}>
            {opponent ? (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {opponent.user.username[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px' }}>@{opponent.user.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Opponent • {opponent.user.rank}</div>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1px dashed rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={20} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-secondary)' }}>Waiting for challenger...</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Ready to battle</div>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Invite Link copy */}
        {!opponent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>INVITE YOUR FRIEND</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/color-match/lobby/${duelId}`}
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
                className="btn interactive-lift"
                onClick={handleCopyLink}
                style={{ gap: '6px', padding: '12px 16px', background: copied ? 'var(--accent-green)' : 'var(--accent-amber)', color: copied ? 'white' : 'black' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Send this link to anyone. When they click it, they will join the battle instantly.
            </p>
          </div>
        )}

        {/* Back Link */}
        {!opponent && (
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '14px',
            alignSelf: 'center',
            marginTop: '8px'
          }}>
            <ArrowLeft size={16} /> Leave Lobby
          </Link>
        )}

      </div>
    </div>
  );
}
