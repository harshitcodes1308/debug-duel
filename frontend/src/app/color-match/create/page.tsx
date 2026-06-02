'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Swords, Info, Palette } from 'lucide-react';

export default function CreateColorMatch() {
  const { user } = useStore();
  const router = useRouter();
  const [betAmount, setBetAmount] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleCreate = async () => {
    if (betAmount < 25) {
      setError("Minimum bet amount is 25 tokens.");
      return;
    }
    if (betAmount > user.tokens) {
      setError(`Insufficient tokens. You only have ${user.tokens} tokens.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5001/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameType: 'color_match',
          betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/color-match/lobby/${data.duelId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create duel room.");
      }
    } catch (e) {
      setError("Server connection failed. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Back Link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: '14px',
          alignSelf: 'flex-start'
        }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Heading */}
        <div>
          <h1 style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Palette size={28} color="var(--accent-purple)" /> Configure ColorMatch
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Wager your tokens in a 1v1 visual color matching speed battle with a friend.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--accent-red)',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            {error}
          </div>
        )}

        {/* Form Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bet size */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>TOKEN BET AMOUNT</label>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Your Balance: <strong style={{ color: 'var(--accent-amber)' }}>{user.tokens}</strong>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {[25, 50, 100, 250].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBetAmount(val)}
                  className={`btn ${betAmount === val ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ height: '40px', fontSize: '13px', borderStyle: 'dashed' }}
                  disabled={val > user.tokens}
                >
                  {val}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="25"
                max={user.tokens}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
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
              />
              <span className="flex-center" style={{ color: 'var(--accent-amber)', fontWeight: 'bold', fontSize: '14px', paddingRight: '12px' }}>tokens</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
              <Info size={12} /> Minimum bet is 25. Winner takes the entire pot (e.g. {betAmount * 2} tokens).
            </div>
          </div>

          {/* Quick rules */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px dashed rgba(139, 92, 246, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '12px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--accent-purple)', display: 'block', marginBottom: '6px' }}>CHROMATIC ARENA RULES</strong>
            1. Memorize the card color shown for 6 seconds.<br />
            2. Once hidden, you have 30 seconds to set the Red, Green, and Blue sliders.<br />
            3. Accuracy determines score. Ties are broken by submission speed.
          </div>

        </div>

        {/* Submit */}
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', height: '52px', fontWeight: 'bold', fontSize: '16px', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', color: '#fff' }}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating color room..." : "Create ColorMatch Lobby"}
        </button>

      </div>
    </div>
  );
}
