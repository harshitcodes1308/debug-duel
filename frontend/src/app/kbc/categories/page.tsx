'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Code, Atom, Server, Binary, Database, 
  GitBranch, Cpu, Layers, ArrowLeft, BookOpen 
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  questionCount: number;
  icon: React.ReactNode;
  color: string;
}

export default function CategorySelectionPage() {
  const categories: CategoryItem[] = [
    {
      id: 'javascript',
      name: 'JavaScript',
      description: 'Scope, closures, event loop, promises, and tricky JS interview syntax.',
      difficulty: 'Intermediate',
      questionCount: 15,
      icon: <Code size={24} />,
      color: 'var(--accent-amber)'
    },
    {
      id: 'react',
      name: 'React',
      description: 'Hooks lifecycle, fiber engine, virtual DOM diffing, and state flow.',
      difficulty: 'Intermediate',
      questionCount: 12,
      icon: <Atom size={24} />,
      color: '#4A9EFF'
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'Event-driven architecture, streams, buffer, clustering, and path utilities.',
      difficulty: 'Expert',
      questionCount: 15,
      icon: <Server size={24} />,
      color: 'var(--accent-green)'
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Decorators, generators, OOP concepts, list comprehensions, and GIL details.',
      difficulty: 'Beginner',
      questionCount: 12,
      icon: <Binary size={24} />,
      color: 'var(--accent-blue)'
    },
    {
      id: 'sql',
      name: 'SQL',
      description: 'Queries optimization, joins, indexing strategies, transactions, and ACID.',
      difficulty: 'Intermediate',
      questionCount: 15,
      icon: <Database size={24} />,
      color: '#A5B4FC'
    },
    {
      id: 'git',
      name: 'Git & GitHub',
      description: 'Branching, rebase vs merge, cherry-pick, conflict resolution, and internal reflog.',
      difficulty: 'Beginner',
      questionCount: 10,
      icon: <GitBranch size={24} />,
      color: '#F472B6'
    },
    {
      id: 'ai_llm',
      name: 'AI & LLMs',
      description: 'Prompt engineering, tokenization, embeddings, temperature, and context windows.',
      difficulty: 'Intermediate',
      questionCount: 12,
      icon: <Cpu size={24} />,
      color: 'var(--accent-purple)'
    },
    {
      id: 'sys_design',
      name: 'System Design',
      description: 'Caching, load balancers, database sharding, microservices, and message queues.',
      difficulty: 'Expert',
      questionCount: 15,
      icon: <Layers size={24} />,
      color: 'var(--accent-red)'
    }
  ];

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(circle at center, #141030 0%, #0A0618 100%)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Back and Page Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link 
            href="/kbc" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: 'var(--text-secondary)', 
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={14} /> Back to KBC Hub
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontFamily: 'Rajdhani, sans-serif', color: '#FFF' }}>
                Select Category
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Choose a programming language or topic to start your Solo Challenge.
              </p>
            </div>
            <div className="flex-center" style={{ gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <BookOpen size={16} color="var(--accent-amber)" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>All categories unlock full xp</span>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '12px'
        }}>
          {categories.map((cat) => {
            // Difficulty color mapping
            const diffColor = cat.difficulty === 'Beginner' 
              ? 'var(--accent-green)' 
              : cat.difficulty === 'Intermediate' 
                ? 'var(--accent-blue)' 
                : 'var(--accent-red)';
            
            const diffBg = cat.difficulty === 'Beginner' 
              ? 'rgba(0, 255, 148, 0.05)' 
              : cat.difficulty === 'Intermediate' 
                ? 'rgba(74, 158, 255, 0.05)' 
                : 'rgba(255, 68, 68, 0.05)';

            const diffBorder = cat.difficulty === 'Beginner' 
              ? 'rgba(0, 255, 148, 0.2)' 
              : cat.difficulty === 'Intermediate' 
                ? 'rgba(74, 158, 255, 0.2)' 
                : 'rgba(255, 68, 68, 0.2)';

            return (
              <Link 
                href={`/kbc/solo?category=${cat.id}`} 
                key={cat.id} 
                style={{ textDecoration: 'none' }}
              >
                <div 
                  className="glass-panel" 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '200px',
                    height: '100%',
                    background: 'rgba(20, 16, 40, 0.3)',
                    borderColor: 'var(--border)',
                    transition: 'var(--transition)',
                    cursor: 'pointer',
                    padding: '24px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cat.color;
                    e.currentTarget.style.boxShadow = `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px ${cat.color}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    {/* Top layout: Icon and difficulty */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ 
                        background: `${cat.color}15`, 
                        padding: '10px', 
                        borderRadius: '8px', 
                        border: `1px solid ${cat.color}30`,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {cat.icon}
                      </div>
                      <span 
                        className="badge" 
                        style={{ 
                          fontSize: '10px', 
                          color: diffColor, 
                          background: diffBg,
                          borderColor: diffBorder
                        }}
                      >
                        {cat.difficulty}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#FFF' }}>
                      {cat.name}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '18px' }}>
                      {cat.description}
                    </p>
                  </div>

                  {/* Bottom details */}
                  <div style={{
                    marginTop: '20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>Questions Pool:</span>
                    <span style={{ fontWeight: 'bold', color: '#FFF' }}>{cat.questionCount} Questions</span>
                  </div>

                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
