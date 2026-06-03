'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { 
  Play, RefreshCw, ArrowLeft, CheckCircle2, 
  HelpCircle, Eye, AlertCircle, BookOpen 
} from 'lucide-react';

interface PracticeBug {
  id: string;
  language: string;
  difficulty: string;
  title: string;
  brokenCode: string;
  fixedCode: string;
  explanation: string;
  category: string;
}

export default function PracticeArena() {
  const { user } = useStore();
  const [bug, setBug] = useState<PracticeBug | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'javascript' | 'python' | 'java'>('javascript');
  const [diff, setDiff] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSolution, setShowSolution] = useState(false);

  async function loadPracticeBug(selectedLang = lang, selectedDiff = diff) {
    setLoading(true);
    setSuccess(false);
    setErrorMsg('');
    setShowSolution(false);
    try {
      const res = await fetch(`http://localhost:5001/api/bugs/random?language=${selectedLang}&difficulty=${selectedDiff}`);
      if (res.ok) {
        const data: PracticeBug = await res.json();
        setBug(data);
        setCode(data.brokenCode);
      } else {
        setErrorMsg("Failed to load a challenge. Ensure backend is running and seeded.");
      }
      setLoading(false);
    } catch (e) {
      setErrorMsg("Connection error loading challenge.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPracticeBug();
  }, []);

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as any;
    setLang(selected);
    loadPracticeBug(selected, diff);
  };

  const handleDiffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as any;
    setDiff(selected);
    loadPracticeBug(lang, selected);
  };

  // Normalized Code Check Helpers
  function cleanCode(code: string) {
    if (!code) return '';
    return code
      .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '') // comments
      .replace(/\s+/g, ' ')                                 // spaces
      .trim();
  }

  const handleVerify = () => {
    if (!bug) return;
    setErrorMsg('');
    setSuccess(false);

    const cleanSubmitted = cleanCode(code);
    const cleanFixed = cleanCode(bug.fixedCode);
    const cleanBroken = cleanCode(bug.brokenCode);

    if (cleanSubmitted === cleanFixed) {
      setSuccess(true);
      return;
    }

    // Heuristic fallback matching
    if (cleanSubmitted !== cleanBroken && (cleanSubmitted.includes(cleanFixed.substring(0, 15)) || cleanFixed.includes(cleanSubmitted.substring(0, 15)))) {
      setSuccess(true);
      return;
    }

    setErrorMsg("Bug check failed. The code structure doesn't match the expected fix. Check logic!");
  };

  if (!user) return null;

  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'grid',
      gridTemplateRows: '56px 1fr',
      backgroundColor: '#0D0D12',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* 1. TOP HEADER SELECTORS BAR */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}>
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} color="var(--accent-blue)" />
            Solo Practice Warmup
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={lang} 
            onChange={handleLangChange}
            className="select-base"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>

          <select 
            value={diff} 
            onChange={handleDiffChange}
            className="select-base"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="practice-page-grid">
        
        {/* Editor Area */}
        <div style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(255, 68, 68, 0.1)',
              borderBottom: '1px solid rgba(255, 68, 68, 0.2)',
              padding: '10px 24px',
              color: 'var(--accent-red)',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(0, 255, 148, 0.15)',
              borderBottom: '1px solid rgba(0, 255, 148, 0.2)',
              padding: '12px 24px',
              color: 'var(--accent-green)',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> Bug Solved! Great job warm-up coder.
              </div>
              <button 
                className="btn btn-success" 
                style={{ padding: '4px 12px', fontSize: '12px', color: 'black' }}
                onClick={() => loadPracticeBug(lang, diff)}
              >
                Next Challenge
              </button>
            </div>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            {loading ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Loading editor...
              </div>
            ) : (
              <Editor
                height="100%"
                language={bug?.language}
                theme="vs-dark"
                value={code}
                onChange={(val) => val !== undefined && setCode(val)}
                options={{
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  minimap: { enabled: false },
                  automaticLayout: true
                }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflowY: 'auto'
        }}>
          {bug ? (
            <>
              <div>
                <span className="badge badge-js" style={{ fontSize: '9px', marginBottom: '8px' }}>
                  {bug.category.toUpperCase()}
                </span>
                <h2 style={{ fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {bug.title}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn btn-success" 
                  style={{ width: '100%', color: 'black', gap: '8px' }}
                  onClick={handleVerify}
                  disabled={success}
                >
                  <Play size={14} fill="black" /> Verify Code Fix
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', gap: '8px' }}
                  onClick={() => setShowSolution(!showSolution)}
                >
                  <Eye size={14} /> {showSolution ? "Hide Solution" : "Reveal Solution"}
                </button>
              </div>

              {showSolution && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-green)', display: 'block', marginBottom: '6px' }}>
                      EXPECTED CODE:
                    </label>
                    <pre style={{
                      background: '#0D0D12',
                      border: '1px solid var(--border)',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      overflowX: 'auto',
                      color: '#fff',
                      maxHeight: '180px'
                    }}><code>{bug.fixedCode}</code></pre>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      EXPLANATION:
                    </label>
                    <p style={{ fontSize: '12px', lineHeight: '18px', color: 'var(--text-secondary)' }}>
                      {bug.explanation}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              Loading challenge data...
            </div>
          )}

          <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)', padding: '16px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <BookOpen size={16} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Warmup mode</strong> is non-competitive. You can edit the code, verify matches, or inspect expected solutions to learn how to debug faster.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
