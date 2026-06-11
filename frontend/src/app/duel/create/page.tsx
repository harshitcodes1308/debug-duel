'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Swords, Info } from 'lucide-react';

export default function CreateDuel() {
  const { user } = useStore();
  const router = useRouter();
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
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
      const res = await fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          language,
          difficulty,
          betAmount
        })
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/duel/lobby/${data.duelId}`);
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
            <Swords size={28} color="var(--accent-blue)" /> Configure Battle
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Set the parameters for your coding duel. Both players will wager the same token bet.
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
          
          {/* Language Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>SELECT LANGUAGE</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setLanguage('javascript')}
                className={`btn ${language === 'javascript' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '48px' }}
              >
                JavaScript
              </button>
              <button 
                type="button" 
                onClick={() => setLanguage('python')}
                className={`btn ${language === 'python' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '48px' }}
              >
                Python
              </button>
              <button 
                type="button" 
                onClick={() => setLanguage('java')}
                className={`btn ${language === 'java' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ height: '48px' }}
              >
                Java
              </button>
            </div>
          </div>

          {/* Difficulty Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>DIFFICULTY</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setDifficulty('easy')}
                className={`btn ${difficulty === 'easy' ? 'btn-success' : 'btn-secondary'} interactive-lift`}
                style={{ height: '48px', color: difficulty === 'easy' ? 'black' : 'var(--text-primary)', gap: '8px' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                Easy
              </button>
              <button 
                type="button" 
                onClick={() => setDifficulty('medium')}
                className={`btn ${difficulty === 'medium' ? 'btn-primary' : 'btn-secondary'} interactive-lift`}
                style={{
                  height: '48px',
                  background: difficulty === 'medium' ? 'var(--accent-amber)' : 'transparent',
                  color: difficulty === 'medium' ? 'black' : 'var(--text-primary)',
                  borderColor: difficulty === 'medium' ? 'var(--accent-amber)' : 'var(--border)',
                  gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)', display: 'inline-block' }} />
                Medium
              </button>
              <button 
                type="button" 
                onClick={() => setDifficulty('hard')}
                className={`btn ${difficulty === 'hard' ? 'btn-danger' : 'btn-secondary'} interactive-lift`}
                style={{ height: '48px', color: difficulty === 'hard' ? 'white' : 'var(--text-primary)', gap: '8px' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block' }} />
                Hard
              </button>
            </div>
          </div>

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
                className="input-base"
                style={{ flex: 1 }}
              />
              <span className="flex-center" style={{ color: 'var(--accent-amber)', fontWeight: 'bold', fontSize: '14px', paddingRight: '12px' }}>tokens</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
              <Info size={12} /> Minimum bet is 25. Winner takes the entire pot (e.g. {betAmount * 2} tokens).
            </div>
          </div>

        </div>

        {/* Submit */}
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', height: '52px', fontWeight: 'bold', fontSize: '16px' }}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating room..." : "Generate Lobby Room"}
        </button>

      </div>
    </div>
  );
}
