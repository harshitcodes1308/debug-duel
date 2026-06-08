'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Swords, Info, Palette } from 'lucide-react';

export default function CreateChangeDesign() {
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
          gameType: 'change_design',
          betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/change-design/lobby/${data.duelId}`);
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
    <div className="container" style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center', backgroundColor: '#0D0D12', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '28px', border: '1px solid #1f1f2e', background: '#13131a', padding: '32px', borderRadius: '12px' }}>
        
        {/* Back Link */}
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#71717a',
          textDecoration: 'none',
          fontSize: '14px',
          alignSelf: 'flex-start'
        }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Heading */}
        <div>
          <h1 style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontWeight: 'bold', margin: 0 }}>
            <Palette size={28} color="#38bdf8" /> Configure Design Duel
          </h1>
          <p style={{ color: '#71717a', fontSize: '14px', marginTop: '8px', lineHeight: 1.5 }}>
            Wager your tokens in a 1v1 design battle with a friend. Tweak CSS properties, fix layout structures, satisfy accessibility guidelines, and get graded by our AI evaluator!
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#ef4444',
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
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#71717a' }}>TOKEN BET AMOUNT</label>
              <span style={{ fontSize: '12px', color: '#71717a' }}>
                Your Balance: <strong style={{ color: '#eab308' }}>{user.tokens}</strong>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {[25, 50, 100, 250].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBetAmount(val)}
                  style={{
                    height: '40px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    background: betAmount === val ? '#38bdf8' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: betAmount === val ? '#38bdf8' : '#27272a',
                    color: betAmount === val ? '#000' : '#fff',
                    fontWeight: 'bold',
                    transition: 'all 0.2s'
                  }}
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
                style={{ flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '10px 12px', outline: 'none' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', color: '#eab308', fontWeight: 'bold', fontSize: '14px', paddingRight: '12px' }}>tokens</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#71717a', fontSize: '11px', marginTop: '4px' }}>
              <Info size={12} /> Minimum bet is 25. Winner takes the entire pot (e.g. {betAmount * 2} tokens).
            </div>
          </div>

          {/* Quick rules */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px dashed rgba(56, 189, 248, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#a1a1aa'
          }}>
            <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '6px' }}>DESIGN BATTLE RULES</strong>
            1. Select layer elements on the canvas or side tree list.<br />
            2. Tweak properties to satisfy layout contrast, size, alignment, and UX goals.<br />
            3. AI grades both layouts out of 100. Higher score wins. Speed breaks ties.
          </div>

        </div>

        {/* Submit */}
        <button 
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%',
            height: '52px',
            fontWeight: 'bold',
            fontSize: '16px',
            background: '#38bdf8',
            border: 'none',
            color: '#000',
            borderRadius: '6px',
            cursor: loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Creating design room..." : "Create Design Lobby"}
        </button>

      </div>
    </div>
  );
}
