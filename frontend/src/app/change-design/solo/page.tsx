'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Timer, Play, Sparkles, CheckCircle2,
  Layout, Type, Palette, Sparkle, AlertTriangle, Check,
  Smartphone, Tablet as TabletIcon, Monitor, Layers, Eye,
  AlertCircle, ChevronRight, HelpCircle, Trophy, RefreshCw,
  ThumbsUp, ThumbsDown, Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';

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

// Helpers: Same contrast checking logic
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

function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(color1: string, color2: string): number {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  if (!c1 || !c2) return 5.0;
  if (color1 === 'transparent' || color2 === 'transparent') return 5.0;

  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

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

export default function SoloDesignSandbox() {
  const router = useRouter();
  const { user, setUser } = useStore();

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  
  // Design Workspace State
  const [designTree, setDesignTree] = useState<UiNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'style' | 'layout' | 'content'>('style');
  const [a11yIssues, setA11yIssues] = useState<AccessibilityIssue[]>([]);
  
  // Grading Modal State
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [rewardDetails, setRewardDetails] = useState<any>(null);

  // 1. Fetch Challenges list
  useEffect(() => {
    async function loadChallenges() {
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/design-challenge');
        if (res.ok) {
          const data = await res.json();
          setChallenges(data);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    }
    loadChallenges();
  }, []);

  // 2. Select and Load Challenge
  const handleSelectChallenge = (challengeItem: any) => {
    setSelectedChallenge(challengeItem);
    // Deep clone initialDesign
    setDesignTree(JSON.parse(JSON.stringify(challengeItem.initialDesign)));
    setSelectedNodeId(null);
    setGradeResult(null);
    setRewardDetails(null);
  };

  // 3. Live Accessibility auditor
  useEffect(() => {
    if (!designTree) return;
    const issues = runAccessibilityCheck(designTree);
    setA11yIssues(issues);
  }, [designTree]);

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

  // Deep update tree helper
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

  // Submit to AI judge
  const handleGradeDesign = async () => {
    if (!designTree || !selectedChallenge || grading) return;
    setGrading(true);
    setGradeResult(null);

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:5001') + '/api/design-challenge/solo/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          submittedDesign: designTree,
          userId: user?.id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGradeResult(data.grade);
        setRewardDetails(data.rewards);

        if (data.userStats && user) {
          setUser({
            ...user,
            xp: data.userStats.xp,
            tokens: data.userStats.tokens,
            level: data.userStats.level
          });
        }

        if (data.grade.score >= 75) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      } else {
        alert("Failed to grade design layout. Make sure the server is active.");
      }
    } catch (err) {
      alert("Error grading design.");
    } finally {
      setGrading(false);
    }
  };

  // Layers Tree Renderer (Left sidebar)
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
      return <span id={id} style={style} onClick={handleClick}>{text}</span>;
    }

    if (type === 'button') {
      return <button id={id} style={style} onClick={handleClick} type="button">{text}</button>;
    }

    if (type === 'input') {
      return <input id={id} type="text" placeholder={props.placeholder} value={text} readOnly style={style} onClick={handleClick} />;
    }

    if (type === 'image') {
      return <img id={id} src={props.src} alt={text} style={style} onClick={handleClick} />;
    }

    return null;
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D0D12',
        color: '#8888A0'
      }}>
        <h2>Entering practice sandbox...</h2>
      </div>
    );
  }

  // Render Challenge Select page if none selected
  if (!selectedChallenge || !designTree) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px',
        fontFamily: 'Inter, sans-serif',
        color: '#f4f4f5',
        backgroundColor: '#0D0D12',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/" style={{ color: '#71717a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Design Duels Practice Sandbox</h1>
        </div>
        <p style={{ color: '#71717a', margin: 0, fontSize: '14px' }}>
          Sharpen your UI design, accessibility, and visual hierarchy skills. Choose a poorly designed template, refine its properties, and get graded by our AI evaluator. You can earn XP and Tokens for high-quality designs!
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '16px'
        }}>
          {challenges.map((c) => (
            <div 
              key={c.id}
              onClick={() => handleSelectChallenge(c)}
              style={{
                background: '#13131a',
                border: '1px solid #1f1f2e',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'transform 0.2s, border-color 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1f1f2e';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  {c.category}
                </span>
                <span style={{ fontSize: '11px', color: c.difficulty === 'Easy' ? '#10b981' : c.difficulty === 'Medium' ? '#f59e0b' : '#ef4444', fontWeight: 'bold' }}>
                  {c.difficulty}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{c.title}</h3>
              <p style={{ fontSize: '12px', color: '#71717a', margin: 0, lineHeight: 1.4 }}>{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => setSelectedChallenge(null)}
            style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>Practice: {selectedChallenge.title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            Practice Sandbox
          </span>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '250px 1fr 320px',
        height: '100%',
        overflow: 'hidden'
      }}>
        
        {/* LEFT SIDEBAR: Layers & Challenge prompt */}
        <div style={{
          borderRight: '1px solid #1f1f2e',
          backgroundColor: '#0d0d12',
          display: 'grid',
          gridTemplateRows: '1fr 1.5fr',
          overflow: 'hidden'
        }}>
          
          {/* Layers panel */}
          <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1f1f2e', overflow: 'hidden' }}>
            <div style={{ padding: '12px', fontWeight: 'bold', fontSize: '12px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1f1f2e' }}>
              Layers
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {renderLayersList(designTree)}
            </div>
          </div>

          {/* Prompt panel */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto', gap: '12px', background: '#111118' }}>
            <div>
              <h4 style={{ color: '#38bdf8', fontSize: '15px', margin: '0 0 6px 0', fontWeight: 'bold' }}>Prompt</h4>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0, lineHeight: 1.5 }}>{selectedChallenge.description}</p>
            </div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold' }}>Target Audience</span>
              <div style={{ fontSize: '12px', color: '#f4f4f5', fontWeight: 'bold', marginTop: '2px' }}>{selectedChallenge.targetAudience}</div>
            </div>
            <div>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>UX Goals</span>
              <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                {selectedChallenge.goals.map((g: string, idx: number) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* CENTER PANEL: Interactive canvas */}
        <div style={{
          backgroundColor: '#18181b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}>
          
          {/* Viewport Selectors */}
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

          {/* Canvas Wrapper */}
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
                maxHeight: '520px',
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

          {/* Floating Accessibility Panel */}
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
              <span>Accessibility Auditor</span>
              <span style={{ fontSize: '10px', background: a11yIssues.length > 0 ? '#f43f5e' : '#10b981', color: '#fff', padding: '1px 6px', borderRadius: '10px', marginLeft: 'auto' }}>
                {a11yIssues.length} issues
              </span>
            </div>
            {a11yIssues.length === 0 ? (
              <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> Standard guidelines met.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {a11yIssues.map((issue, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: issue.severity === 'error' ? '#ef4444' : '#f59e0b' }}>
                    <AlertTriangle size={10} />
                    <strong style={{ textTransform: 'uppercase', fontSize: '9px' }}>[{issue.nodeId}]</strong>
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDEBAR: Property Inspector */}
        <div style={{
          borderLeft: '1px solid #1f1f2e',
          backgroundColor: '#0d0d12',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
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

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* STYLE */}
                {activeInspectorTab === 'style' && (
                  <>
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
                          placeholder="e.g. #ffffff"
                          style={{ flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '0 8px', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    {selectedNode.type !== 'container' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Text Color</label>
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
                            placeholder="e.g. #ffffff"
                            style={{ flex: 1, backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '0 8px', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                    )}

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

                    {selectedNode.props.style?.borderWidth && selectedNode.props.style.borderWidth !== '0px' && selectedNode.props.style.borderWidth !== '0' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Border Color</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.style?.borderColor?.toString() || ''}
                          onChange={(e) => updateNodeStyle('borderColor', e.target.value)}
                          placeholder="e.g. #333333"
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* LAYOUT */}
                {activeInspectorTab === 'layout' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Width</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.style?.width?.toString() || 'auto'}
                          onChange={(e) => updateNodeStyle('width', e.target.value)}
                          placeholder="e.g. 100%"
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Height</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.style?.height?.toString() || 'auto'}
                          onChange={(e) => updateNodeStyle('height', e.target.value)}
                          placeholder="e.g. 48px"
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Padding</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.style?.padding?.toString() || '0px'}
                          onChange={(e) => updateNodeStyle('padding', e.target.value)}
                          placeholder="e.g. 12px"
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Margin</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.style?.margin?.toString() || '0px'}
                          onChange={(e) => updateNodeStyle('margin', e.target.value)}
                          placeholder="e.g. 8px"
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    {selectedNode.type === 'container' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Direction</label>
                          <select 
                            value={selectedNode.props.style?.flexDirection?.toString() || 'column'}
                            onChange={(e) => updateNodeStyle('flexDirection', e.target.value)}
                            style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px' }}
                          >
                            <option value="column">Column</option>
                            <option value="row">Row</option>
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

                {/* CONTENT */}
                {activeInspectorTab === 'content' && (
                  <>
                    {selectedNode.type !== 'container' && selectedNode.type !== 'image' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Text contents</label>
                        <textarea 
                          rows={3}
                          value={selectedNode.text || ''}
                          onChange={(e) => updateNodeMeta('text', e.target.value)}
                          style={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', padding: '6px 8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      </div>
                    )}

                    {selectedNode.type !== 'container' && selectedNode.type !== 'image' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Font Size</label>
                          <input 
                            type="text" 
                            value={selectedNode.props.style?.fontSize?.toString() || '14px'}
                            onChange={(e) => updateNodeStyle('fontSize', e.target.value)}
                            placeholder="e.g. 16px"
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
                    )}

                    {selectedNode.type === 'input' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 'bold' }}>Placeholder</label>
                        <input 
                          type="text" 
                          value={selectedNode.props.placeholder || ''}
                          onChange={(e) => updateNodeMeta('placeholder', e.target.value)}
                          placeholder="Type input placeholder"
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
              <span>Select an element layer to start refining its details.</span>
            </div>
          )}
        </div>

      </div>

      {/* 3. BOTTOM ACTIONS FOOTER BAR */}
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
          onClick={() => setSelectedChallenge(null)}
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            fontSize: '13px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          Exit Practice
        </button>

        <button 
          onClick={handleGradeDesign} 
          style={{
            padding: '10px 28px',
            fontSize: '15px',
            gap: '8px',
            background: '#10b981',
            border: 'none',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '6px',
            cursor: grading ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            opacity: grading ? 0.6 : 1
          }}
          disabled={grading}
        >
          <Trophy size={16} /> 
          {grading ? "AI Evaluating..." : "Grade Layout"}
        </button>
      </div>

      {/* MODAL / BOTTOM SLIDE: AI GRADING REPORT OUTCOME */}
      {gradeResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            backgroundColor: '#13131a',
            border: '1px solid #1f1f2e',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f1f2e', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="#eab308" />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Practice Grade Report</h3>
              </div>
              <button 
                onClick={() => setGradeResult(null)}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '20px' }}
              >
                &times;
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: gradeResult.score >= 75 ? '#10b981' : gradeResult.score >= 50 ? '#eab308' : '#ef4444' }}>
                {gradeResult.score}<span style={{ fontSize: '20px', color: '#71717a' }}>/100</span>
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px' }}>
                Overall Design Score
              </div>

              {rewardDetails && rewardDetails.xp > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  marginTop: '16px'
                }}>
                  <div style={{ fontSize: '13px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    +{rewardDetails.xp} XP Received
                  </div>
                  <div style={{ fontSize: '13px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    +{rewardDetails.tokens} Tokens Received
                  </div>
                </div>
              )}
            </div>

            {/* Metrics and lists */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderTop: '1px solid #1f1f2e', paddingTop: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold' }}>Sub-metric Details</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Visual Hierarchy */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                      <span>Visual Hierarchy</span>
                      <strong>{gradeResult.visualHierarchy}/20</strong>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(gradeResult.visualHierarchy / 20) * 100}%`, height: '100%', background: '#38bdf8' }} />
                    </div>
                  </div>

                  {/* Accessibility */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                      <span>Accessibility</span>
                      <strong>{gradeResult.accessibility}/20</strong>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(gradeResult.accessibility / 20) * 100}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>

                  {/* Usability */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                      <span>Usability</span>
                      <strong>{gradeResult.usability}/20</strong>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${(gradeResult.usability / 20) * 100}%`, height: '100%', background: '#f59e0b' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#71717a', fontWeight: 'bold' }}>Critique Bulletpoints</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      <ThumbsUp size={11} /> Strengths
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#a1a1aa' }}>
                      {gradeResult.strengths?.slice(0, 3).map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      <ThumbsDown size={11} /> Weaknesses
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: '#a1a1aa' }}>
                      {gradeResult.weaknesses?.slice(0, 3).map((w: string, idx: number) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ background: '#18181b', borderRadius: '6px', padding: '12px', fontSize: '12px', color: '#d1d5db', lineHeight: 1.5 }}>
              <strong>AI Reviewer: </strong> {gradeResult.feedback}
            </div>

            <button 
              onClick={() => setGradeResult(null)}
              style={{
                width: '100%',
                background: '#38bdf8',
                border: 'none',
                color: '#0d0d12',
                fontWeight: 'bold',
                padding: '10px 0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Continue Tweaking Design
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
