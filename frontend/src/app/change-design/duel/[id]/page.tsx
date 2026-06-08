'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  Timer, Swords, Play, Sparkles, CheckCircle2,
  Layout, Type, Palette, Sparkle, AlertTriangle, Check,
  Smartphone, Tablet as TabletIcon, Monitor, Layers, Eye,
  AlertCircle, ChevronRight, HelpCircle, Flag
} from 'lucide-react';

interface UiNode {
  id: string;
  type: 'container' | 'text' | 'button' | 'input' | 'image';
  text?: string;
  props: {
    placeholder?: string;
    src?: string;
    style: React.CSSProperties;
  };
  children?: UiNode[];
}

interface AccessibilityIssue {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  type: 'contrast' | 'size' | 'spacing';
  severity: 'warning' | 'error' | 'info';
  message: string;
}

// Helper: Parse color to RGB
function parseColor(colorStr: string): { r: number; g: number; b: number } | null {
  if (!colorStr) return null;
  const cleanColor = colorStr.trim().toLowerCase();
  
  if (cleanColor.startsWith('#')) {
    let hex = cleanColor.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  const match = cleanColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    };
  }

  // Common colors fallback
  const commonColors: Record<string, { r: number; g: number; b: number }> = {
    transparent: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 255, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    gray: { r: 128, g: 128, b: 128 }
  };
  return commonColors[cleanColor] || null;
}

// Helper: Calculate relative luminance
function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Helper: Get contrast ratio
function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  if (!c1 || !c2) return 5.0; // Default pass if unparseable
  
  // If one of the colors is transparent, treat it as a pass since background shows through
  if (color1 === 'transparent' || color2 === 'transparent') return 5.0;

  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

// Recursive Accessibility Checker
function runAccessibilityCheck(node: UiNode, parentBg: string = '#ffffff'): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const currentBg = (node.props.style?.backgroundColor as string) || parentBg;

  if (node.type === 'text' || node.type === 'button') {
    const textColor = (node.props.style?.color as string) || '#000000';
    const ratio = getContrastRatio(textColor, currentBg);
    if (ratio < 4.5) {
      issues.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.text || node.id,
        type: 'contrast',
        severity: ratio < 3.0 ? 'error' : 'warning',
        message: `Contrast is ${ratio.toFixed(1)}:1 (Minimum 4.5:1 required).`
      });
    }
  }

  if (node.type === 'button' || node.type === 'input') {
    const heightStr = node.props.style?.height as string;
    const height = heightStr ? parseInt(heightStr) : 32;
    const widthStr = node.props.style?.width as string;
    const width = widthStr ? parseInt(widthStr) : 48;
    
    if (height < 44 || (widthStr && width < 44)) {
      issues.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.text || node.id || 'Button/Input',
        type: 'size',
        severity: 'warning',
        message: `Clickable target area is too small (${height}px height). Target should be >= 44px.`
      });
    }
  }

  const padding = node.props.style?.padding as string;
  if (node.type === 'container' && (!padding || padding === '0px' || padding === '0')) {
    issues.push({
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.id,
      type: 'spacing',
      severity: 'info',
      message: `Container has no padding. Add spacing to prevent squishing layout.`
    });
  }

  if (node.children) {
    node.children.forEach(child => {
      issues.push(...runAccessibilityCheck(child, currentBg === 'transparent' ? parentBg : currentBg));
    });
  }

  return issues;
}

export default function DesignArena() {
  const { id: duelId } = useParams();
  const router = useRouter();
  const { 
    user, setUser, currentDuel, setCurrentDuel, 
    fomoMessage, setFomo, opponentProgress,
    opponentSubmitted, setOpponentSubmitted
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'edit' | 'submitted'>('edit');
  const [challenge, setChallenge] = useState<any>(null);
  
  // Design Workspace State
  const [designTree, setDesignTree] = useState<UiNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'style' | 'layout' | 'content'>('style');
  const [a11yIssues, setA11yIssues] = useState<AccessibilityIssue[]>([]);
  const [opponentOffline, setOpponentOffline] = useState(false);
  
  // Timer State
  const [phaseTimer, setPhaseTimer] = useState(180); // 3 minutes for design challenge
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch Challenge Details
  useEffect(() => {
    async function fetchChallengeAndDuel() {
      try {
        const duelRes = await fetch(`http://localhost:5001/api/duel/${duelId}`);
        if (!duelRes.ok) {
          router.push('/');
          return;
        }
        const duelData = await duelRes.json();
        setCurrentDuel(duelData);

        const challengeId = duelData.designChallengeId || 'senior_login';
        const challengeRes = await fetch(`http://localhost:5001/api/design-challenge/${challengeId}`);
        if (!challengeRes.ok) {
          router.push('/');
          return;
        }
        const challengeData = await challengeRes.json();
        setChallenge(challengeData);
        setDesignTree(challengeData.initialDesign);
        setLoading(false);
      } catch (e) {
        console.error(e);
        router.push('/');
      }
    }
    fetchChallengeAndDuel();
  }, [duelId]);

  // 2. Perform live Accessibility Checks
  useEffect(() => {
    if (!designTree) return;
    const issues = runAccessibilityCheck(designTree);
    setA11yIssues(issues);
  }, [designTree]);

  // 3. Timer countdown loop
  useEffect(() => {
    if (loading || !currentDuel) return;
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, currentDuel]);

  // 4. Socket Listeners
  useEffect(() => {
    if (!user || !duelId || loading) return;

    const socket = io('http://localhost:5001');
    socketRef.current = socket;

    socket.emit('join_duel', { duelId, userId: user.id });
    socket.emit('register_user', { userId: user.id });

    socket.on('fomo_update', ({ message, opponentProgress: progress }) => {
      setFomo(message, progress);
    });

    socket.on('opponent_submitted', ({ message }) => {
      setOpponentSubmitted(true);
      setFomo(message || "Your opponent locked in their design! 60s remaining!", 95);
    });

    socket.on('opponent_forfeited', (payload) => {
      alert("Your opponent has forfeited! You win!");
      if (user && payload.tokenChanges?.[user.id]) {
        setUser({
          ...user,
          tokens: user.tokens + payload.tokenChanges[user.id]
        });
      }
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/change-design/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    socket.on('duel_result', (payload) => {
      const myRpChange = payload.rpChanges?.[user.id] || 0;
      const myNewRank = payload.newRanks?.[user.id] || '';
      const myEloChange = payload.eloChanges?.[user.id] || 0;
      router.push(`/change-design/duel/${duelId}/result?rpChange=${myRpChange}&newRank=${encodeURIComponent(myNewRank)}&eloChange=${myEloChange}`);
    });

    // Opponent online/offline state sync
    socket.on('opponent_offline', ({ userId, offline }) => {
      if (userId !== user?.id) {
        setOpponentOffline(offline);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, duelId, loading]);

  // Find Node recursively
  const findNode = (tree: UiNode | null, id: string): UiNode | null => {
    if (!tree) return null;
    if (tree.id === id) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNode(designTree, selectedNodeId) : null;

  // Deep update tree
  const updateNodeInTree = (
    tree: UiNode, 
    targetId: string, 
    updates: Partial<UiNode> | ((node: UiNode) => Partial<UiNode>)
  ): UiNode => {
    if (tree.id === targetId) {
      const nextUpdates = typeof updates === 'function' ? updates(tree) : updates;
      return { ...tree, ...nextUpdates };
    }
    if (tree.children) {
      return {
        ...tree,
        children: tree.children.map(child => updateNodeInTree(child, targetId, updates))
      };
    }
    return tree;
  };

  const updateNodeStyle = (styleKey: string, styleValue: any) => {
    if (!selectedNodeId) return;
    setDesignTree(prev => {
      if (!prev) return prev;
      return updateNodeInTree(prev, selectedNodeId, (node) => ({
        props: {
          ...node.props,
          style: {
            ...node.props.style,
            [styleKey]: styleValue
          }
        }
      }));
    });
  };

  const updateNodeMeta = (key: 'text' | 'placeholder' | 'src', value: string) => {
    if (!selectedNodeId) return;
    setDesignTree(prev => {
      if (!prev) return prev;
      if (key === 'text') {
        return updateNodeInTree(prev, selectedNodeId, { text: value });
      } else {
        return updateNodeInTree(prev, selectedNodeId, (node) => ({
          props: {
            ...node.props,
            [key]: value
          }
        }));
      }
    });
  };

  const handleAutoSubmit = () => {
    if (gameState !== 'edit') return;
    setGameState('submitted');
    
    if (socketRef.current) {
      socketRef.current.emit('submit_design', {
        duelId,
        userId: user?.id,
        submittedDesign: designTree
      });
    }
  };

  const handleSubmitDesign = () => {
    if (gameState !== 'edit') return;
    setGameState('submitted');

    if (socketRef.current) {
      socketRef.current.emit('submit_design', {
        duelId,
        userId: user?.id,
        submittedDesign: designTree
      });
    }
  };

  const handleForfeit = () => {
    const confirmForfeit = window.confirm(
      `Are you sure you want to forfeit? You will lose your bet of ${currentDuel?.betAmount || 50} tokens.`
    );
    if (!confirmForfeit) return;

    if (socketRef.current) {
      socketRef.current.emit('forfeit', {
        duelId,
        userId: user?.id
      });
    }
    router.push(`/change-design/duel/${duelId}/result`);
  };

  // Layers Tree Renderer (Left panel)
  const renderLayersList = (node: UiNode, depth = 0) => {
    const isSelected = selectedNodeId === node.id;
    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div 
          onClick={() => setSelectedNodeId(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            paddingLeft: `${depth * 14 + 12}px`,
            backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
            color: isSelected ? '#38bdf8' : '#a1a1aa',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: isSelected ? 'bold' : 'normal',
            transition: 'all 0.15s ease',
            border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
          }}
        >
          <Layers size={13} style={{ opacity: 0.6 }} />
          <span style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.5, fontWeight: 'bold' }}>
            [{node.type}]
          </span>
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {node.id}
          </span>
        </div>
        {node.children?.map(child => renderLayersList(child, depth + 1))}
      </div>
    );
  };

  // Canvas Recursive Renderer (Center panel)
  const renderCanvasNode = (node: UiNode) => {
    const { id, type, text, props, children } = node;
    const isSelected = selectedNodeId === id;
    
    const style: React.CSSProperties = {
      ...props.style,
      outline: isSelected ? '2px solid #38bdf8' : '1px dashed rgba(255, 255, 255, 0.05)',
      outlineOffset: '-1px',
      cursor: 'pointer',
      transition: 'outline 0.15s ease',
      boxSizing: 'border-box'
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedNodeId(id);
    };

    if (type === 'container') {
      return (
        <div id={id} style={style} onClick={handleClick}>
          {children?.map(child => (
            <React.Fragment key={child.id}>
              {renderCanvasNode(child)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    if (type === 'text') {
      return (
        <span id={id} style={style} onClick={handleClick}>
          {text}
        </span>
      );
    }

    if (type === 'button') {
      return (
        <button id={id} style={style} onClick={handleClick} type="button">
          {text}
        </button>
      );
    }

    if (type === 'input') {
      return (
        <input
          id={id}
          type="text"
          placeholder={props.placeholder}
          value={text}
          readOnly
          style={style}
          onClick={handleClick}
        />
      );
    }

    if (type === 'image') {
      return (
        <img
          id={id}
          src={props.src || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=150'}
          alt={text}
          style={style}
          onClick={handleClick}
        />
      );
    }

    return null;
  };

  if (loading || !currentDuel || !challenge || !designTree) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D12',
        color: '#8888A0'
      }}>
        <h2>Loading Design Studio Arena...</h2>
      </div>
    );
  }

  const opponent = currentDuel.participants?.find(p => p.userId !== user?.id)?.user || { username: 'Opponent' };

  return (
    <div style={{
      height: 'calc(100vh - 64px)',
      display: 'grid',
      gridTemplateRows: '50px 1fr 64px',
      backgroundColor: '#0D0D12',
      color: '#f4f4f5',
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* 1. TOP HEADER BAR */}
      <div style={{
        borderBottom: '1px solid #1f1f2e',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#13131a',
        fontSize: '14px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Swords size={16} color="#38bdf8" />
          <span>Change That Design Studio</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: phaseTimer < 30 ? '#ef4444' : '#38bdf8',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>
          <Timer size={18} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Time Remaining: {Math.floor(phaseTimer / 60)}:{(phaseTimer % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span style={{ color: '#71717a' }}>Bet: </span>
            <strong style={{ color: '#eab308' }}>{currentDuel.betAmount} Tokens</strong>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE PANELS */}
      {gameState === 'edit' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr 320px',
          height: '100%',
          overflow: 'hidden'
        }}>
          
          {/* LEFT SIDEBAR: Layers List & Challenge Prompt */}
          <div style={{
            borderRight: '1px solid #1f1f2e',
            backgroundColor: '#0d0d12',
            display: 'grid',
            gridTemplateRows: '1fr 1.5fr',
            overflow: 'hidden'
          }}>
            
            {/* Layers Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1f1f2e', overflow: 'hidden' }}>
              <div style={{ padding: '12px', fontWeight: 'bold', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1f1f2e' }}>
                Layers / Elements
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {renderLayersList(designTree)}
              </div>
            </div>

            {/* Prompt & Goals Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto', gap: '12px', background: '#111118' }}>
              <div>
                <h4 style={{ color: '#38bdf8', fontSize: '15px', margin: '0 0 6px 0', fontWeight: 'bold' }}>{challenge.title}</h4>
                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>{challenge.description}</p>
              </div>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold' }}>Target Audience</span>
                <div style={{ fontSize: '12px', color: '#f4f4f5', fontWeight: 'bold', marginTop: '2px' }}>{challenge.targetAudience}</div>
              </div>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>UX Goals</span>
                <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                  {challenge.goals.map((g: string, idx: number) => (
                    <li key={idx}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* CENTER PANEL: Interactive Canvas & Viewport Selectors */}
          <div style={{
            backgroundColor: '#18181b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {opponentOffline && (
              <div className="alert-priority-flash" style={{
                width: '100%',
                padding: '12px 24px',
                color: 'var(--accent-red)',
                fontSize: '13px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.15)',
                fontFamily: 'JetBrains Mono, monospace',
                zIndex: 100
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} className="pulse-glow" style={{ color: 'var(--accent-red)' }} />
                  <span>RIVAL DISCONNECTED! Auto-forfeit in progress, waiting 20s for reconnection...</span>
                </div>
                <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>DISCONNECTED</span>
              </div>
            )}
            
            {/* Viewport bar */}
            <div style={{
              height: '40px',
              borderBottom: '1px solid #27272a',
              backgroundColor: '#13131a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <button 
                onClick={() => setViewportWidth('desktop')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: viewportWidth === 'desktop' ? '#27272a' : 'transparent',
                  border: 'none',
                  color: viewportWidth === 'desktop' ? '#38bdf8' : '#71717a',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Monitor size={14} /> Desktop (100%)
              </button>
              <button 
                onClick={() => setViewportWidth('tablet')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: viewportWidth === 'tablet' ? '#27272a' : 'transparent',
                  border: 'none',
                  color: viewportWidth === 'tablet' ? '#38bdf8' : '#71717a',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <TabletIcon size={14} /> Tablet (768px)
              </button>
              <button 
                onClick={() => setViewportWidth('mobile')} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: viewportWidth === 'mobile' ? '#27272a' : 'transparent',
                  border: 'none',
                  color: viewportWidth === 'mobile' ? '#38bdf8' : '#71717a',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={14} /> Mobile (400px)
              </button>
            </div>

            {/* Live Canvas Area */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <div 
                style={{
                  width: viewportWidth === 'desktop' ? '100%' : viewportWidth === 'tablet' ? '768px' : '400px',
                  maxWidth: '100%',
                  height: '100%',
                  maxHeight: '550px',
                  backgroundColor: '#000000',
                  borderRadius: '8px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  overflow: 'auto',
                  border: '1px solid #27272a',
                  transition: 'width 0.3s ease',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {renderCanvasNode(designTree)}
              </div>
            </div>

            {/* Floating Live Accessibility Auditor */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '12px',
              maxHeight: '140px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', color: '#a1a1aa', borderBottom: '1px solid #27272a', paddingBottom: '6px', marginBottom: '6px' }}>
                <AlertCircle size={14} color="#f43f5e" />
                <span>Accessibility & Usability Auditor</span>
                <span style={{ fontSize: '10px', background: a11yIssues.length > 0 ? '#f43f5e' : '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '10px', marginLeft: 'auto' }}>
                  {a11yIssues.length} issues
                </span>
              </div>
              {a11yIssues.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Nice! No accessibility issues detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {a11yIssues.map((issue, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: issue.severity === 'error' ? '#ef4444' : issue.severity === 'warning' ? '#f59e0b' : '#38bdf8' }}>
                      <AlertTriangle size={10} />
                      <strong style={{ textTransform: 'uppercase', fontSize: '9px' }}>[{issue.nodeId}]</strong>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR: Property Inspector & Rival Status */}
          <div style={{
            borderLeft: '1px solid #1f1f2e',
            backgroundColor: '#0d0d12',
            display: 'grid',
            gridTemplateRows: '1fr auto',
            overflow: 'hidden'
          }}>
            
            {/* Inspector Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f1f2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Inspector
                </span>
                {selectedNode && (
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>
                    {selectedNode.id}
                  </span>
                )}
              </div>

              {selectedNode ? (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Category Tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #1f1f2e', fontSize: '12px' }}>
                    <button 
                      onClick={() => setActiveInspectorTab('style')}
                      style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', color: activeInspectorTab === 'style' ? '#38bdf8' : '#71717a', borderBottom: activeInspectorTab === 'style' ? '2px solid #38bdf8' : 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Style
                    </button>
                    <button 
                      onClick={() => setActiveInspectorTab('layout')}
                      style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', color: activeInspectorTab === 'layout' ? '#38bdf8' : '#71717a', borderBottom: activeInspectorTab === 'layout' ? '2px solid #38bdf8' : 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Layout
                    </button>
                    <button 
                      onClick={() => setActiveInspectorTab('content')}
                      style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', color: activeInspectorTab === 'content' ? '#38bdf8' : '#71717a', borderBottom: activeInspectorTab === 'content' ? '2px solid #38bdf8' : 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Content
                    </button>
                  </div>

                  {/* Properties editors */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* STYLE TAB */}
                    {activeInspectorTab === 'style' && (
                      <>
                        {/* Background Color */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Background Color</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              type="color" 
                              value={selectedNode.props.style?.backgroundColor?.toString().startsWith('rgb') ? '#000000' : (selectedNode.props.style?.backgroundColor?.toString() || '#000000')}
                              onChange={(e) => updateNodeStyle('backgroundColor', e.target.value)}
                              style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                            />
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.backgroundColor?.toString() || ''}
                              onChange={(e) => updateNodeStyle('backgroundColor', e.target.value)}
                              placeholder="e.g. #ffffff or rgb(0,0,0)"
                              style={{ flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '0 8px', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        {/* Text Color (Not container) */}
                        {selectedNode.type !== 'container' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Text/Foreground Color</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input 
                                type="color" 
                                value={selectedNode.props.style?.color?.toString().startsWith('rgb') ? '#ffffff' : (selectedNode.props.style?.color?.toString() || '#ffffff')}
                                onChange={(e) => updateNodeStyle('color', e.target.value)}
                                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                              />
                              <input 
                                type="text" 
                                value={selectedNode.props.style?.color?.toString() || ''}
                                onChange={(e) => updateNodeStyle('color', e.target.value)}
                                placeholder="e.g. #ffffff or rgb(0,0,0)"
                                style={{ flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '0 8px', fontSize: '13px' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Borders group */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Border Radius</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.borderRadius?.toString() || '0px'}
                              onChange={(e) => updateNodeStyle('borderRadius', e.target.value)}
                              placeholder="e.g. 8px"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Border Width</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.borderWidth?.toString() || '0px'}
                              onChange={(e) => updateNodeStyle('borderWidth', e.target.value)}
                              placeholder="e.g. 1px"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        {/* Border Color */}
                        {selectedNode.props.style?.borderWidth && selectedNode.props.style.borderWidth !== '0px' && selectedNode.props.style.borderWidth !== '0' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Border Color</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.borderColor?.toString() || ''}
                              onChange={(e) => updateNodeStyle('borderColor', e.target.value)}
                              placeholder="e.g. #3f3f46"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* LAYOUT TAB */}
                    {activeInspectorTab === 'layout' && (
                      <>
                        {/* Width & Height */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Width</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.width?.toString() || 'auto'}
                              onChange={(e) => updateNodeStyle('width', e.target.value)}
                              placeholder="e.g. 100% or auto"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Height</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.height?.toString() || 'auto'}
                              onChange={(e) => updateNodeStyle('height', e.target.value)}
                              placeholder="e.g. 48px or auto"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        {/* Margins & Paddings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Padding</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.padding?.toString() || '0px'}
                              onChange={(e) => updateNodeStyle('padding', e.target.value)}
                              placeholder="e.g. 12px 24px"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Margin</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.style?.margin?.toString() || '0px'}
                              onChange={(e) => updateNodeStyle('margin', e.target.value)}
                              placeholder="e.g. 10px 0"
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        </div>

                        {/* Container specific properties */}
                        {selectedNode.type === 'container' && (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Flex Direction</label>
                              <select 
                                value={selectedNode.props.style?.flexDirection?.toString() || 'column'}
                                onChange={(e) => updateNodeStyle('flexDirection', e.target.value)}
                                style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                              >
                                <option value="column">Column (Vertical)</option>
                                <option value="row">Row (Horizontal)</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Align Items</label>
                              <select 
                                value={selectedNode.props.style?.alignItems?.toString() || 'stretch'}
                                onChange={(e) => updateNodeStyle('alignItems', e.target.value)}
                                style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                              >
                                <option value="stretch">Stretch</option>
                                <option value="center">Center</option>
                                <option value="flex-start">Flex Start (Left)</option>
                                <option value="flex-end">Flex End (Right)</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Justify Content</label>
                              <select 
                                value={selectedNode.props.style?.justifyContent?.toString() || 'flex-start'}
                                onChange={(e) => updateNodeStyle('justifyContent', e.target.value)}
                                style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                              >
                                <option value="flex-start">Flex Start</option>
                                <option value="center">Center</option>
                                <option value="flex-end">Flex End</option>
                                <option value="space-between">Space Between</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Gap</label>
                              <input 
                                type="text" 
                                value={selectedNode.props.style?.gap?.toString() || '0px'}
                                onChange={(e) => updateNodeStyle('gap', e.target.value)}
                                placeholder="e.g. 12px"
                                style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* CONTENT TAB */}
                    {activeInspectorTab === 'content' && (
                      <>
                        {/* Text (if applicable) */}
                        {selectedNode.type !== 'container' && selectedNode.type !== 'image' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Text Contents</label>
                            <textarea 
                              rows={3}
                              value={selectedNode.text || ''}
                              onChange={(e) => updateNodeMeta('text', e.target.value)}
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                            />
                          </div>
                        )}

                        {/* Font Options (Typography) */}
                        {selectedNode.type !== 'container' && selectedNode.type !== 'image' && (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Font Size</label>
                                <input 
                                  type="text" 
                                  value={selectedNode.props.style?.fontSize?.toString() || '14px'}
                                  onChange={(e) => updateNodeStyle('fontSize', e.target.value)}
                                  placeholder="e.g. 18px"
                                  style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Font Weight</label>
                                <select 
                                  value={selectedNode.props.style?.fontWeight?.toString() || 'normal'}
                                  onChange={(e) => updateNodeStyle('fontWeight', e.target.value)}
                                  style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                                >
                                  <option value="normal">Normal</option>
                                  <option value="bold">Bold</option>
                                </select>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Text Align</label>
                              <select 
                                value={selectedNode.props.style?.textAlign?.toString() || 'left'}
                                onChange={(e) => updateNodeStyle('textAlign', e.target.value)}
                                style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                              >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                          </>
                        )}

                        {/* Input specifics */}
                        {selectedNode.type === 'input' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Placeholder</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.placeholder || ''}
                              onChange={(e) => updateNodeMeta('placeholder', e.target.value)}
                              placeholder="Placeholder text..."
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        )}

                        {/* Image specifics */}
                        {selectedNode.type === 'image' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Image URL</label>
                            <input 
                              type="text" 
                              value={selectedNode.props.src || ''}
                              onChange={(e) => updateNodeMeta('src', e.target.value)}
                              placeholder="https://..."
                              style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                            />
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#71717a', padding: '24px', textAlign: 'center', fontSize: '13px', gap: '8px' }}>
                  <HelpCircle size={32} style={{ opacity: 0.3 }} />
                  <span>Select an element in layers list or canvas to start styling.</span>
                </div>
              )}
            </div>

            {/* Opponent Status panel */}
            <div style={{
              borderTop: '1px solid #1f1f2e',
              background: '#111118',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px' }}>@{opponent?.username || 'Opponent'}</span>
                  {opponentOffline && (
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-red)',
                      boxShadow: '0 0 8px var(--accent-red)'
                    }} />
                  )}
                </div>
                {opponentOffline ? (
                  <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.2)' }}>OFFLINE</span>
                ) : opponentSubmitted ? (
                  <span style={{ fontSize: '9px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(234, 179, 8, 0.2)' }}>SUBMITTED</span>
                ) : (
                  <span style={{ fontSize: '9px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(56, 189, 248, 0.2)' }}>ONLINE</span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a', marginBottom: '4px' }}>
                  <span>Progress Estimate</span>
                  <span style={{ fontWeight: 'bold', color: '#a1a1aa' }}>{opponentProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${opponentProgress}%`,
                    height: '100%',
                    background: opponentSubmitted ? '#eab308' : 'linear-gradient(to right, #38bdf8, #eab308)',
                    borderRadius: '3px',
                    transition: 'width 0.8s ease'
                  }}></div>
                </div>
              </div>

              <div style={{
                background: 'rgba(234, 179, 8, 0.04)',
                border: '1px solid rgba(234, 179, 8, 0.12)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#eab308',
                lineHeight: 1.4
              }}>
                {fomoMessage || "Refining element coordinates..."}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* SUBMITTED STATE */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '20px',
          height: '100%'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            animation: 'pulse 2s infinite'
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>Design Locked In!</h3>
          <p style={{ color: '#71717a', fontSize: '14px', maxWidth: '360px', lineHeight: 1.5 }}>
            Your custom layout has been uploaded and graded by our UI/UX judge. Waiting for your rival to finish submit...
          </p>
        </div>
      )}

      {/* 3. BOTTOM BUTTONS BAR */}
      <div style={{
        borderTop: '1px solid #1f1f2e',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#13131a',
        zIndex: 10
      }}>
        <button 
          onClick={handleForfeit} 
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          <Flag size={14} /> Forfeit Duel
        </button>

        <button 
          onClick={handleSubmitDesign} 
          style={{
            padding: '10px 28px',
            fontSize: '15px',
            gap: '8px',
            background: '#38bdf8',
            border: 'none',
            color: '#0d0d12',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: gameState === 'edit' ? 'pointer' : 'default',
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'opacity 0.2s, transform 0.2s',
            opacity: gameState === 'edit' ? 1 : 0.6
          }}
          disabled={gameState !== 'edit'}
        >
          <Play size={16} fill="#0d0d12" /> 
          Lock In Design
        </button>
      </div>

    </div>
  );
}
