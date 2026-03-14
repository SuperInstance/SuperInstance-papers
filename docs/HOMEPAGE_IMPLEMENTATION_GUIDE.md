# SuperInstance Homepage Implementation Guide

**Companion to:** SUPERINSTANCE_HOMEPAGE_STRATEGY.md
**Date:** 2026-03-14
**Status:** Ready for Development

---

## Quick Start Implementation

### Phase 1: Foundation (Week 1)

**Step 1: Update Astro Configuration**

```typescript
// website/astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://superinstance.ai',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  compress: true,
  vite: {
    build: {
      cssMinify: true,
      minify: 'terser',
    },
  },
});
```

**Step 2: Create Homepage Layout**

```astro
// website/src/layouts/HomeLayout.astro
---
interface Props {
  title: string;
  description: string;
  image?: string;
}

const {
  title = 'SuperInstance | Mathematical Framework for Universal Computation',
  description = 'Discover SuperInstance\'s mathematical framework for universal computation. 60+ academic papers, hardware innovation, and visual AI education.',
  image = '/images/og-default.jpg'
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="canonical" href={canonicalURL} />
    <meta name="description" content={description} />
    <meta name="generator" content={Astro.generator} />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={new URL(image, Astro.url)} />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content={canonicalURL} />
    <meta property="twitter:title" content={title} />
    <meta property="twitter:description" content={description} />
    <meta property="twitter:image" content={new URL(image, Astro.url)} />

    <!-- Preload Critical Resources -->
    <link rel="preload" as="font" href="/fonts/inter.woff2" type="font/woff2" crossorigin />

    <!-- Plausible Analytics -->
    <script defer data-domain="superinstance.ai" src="https://plausible.io/js/script.js"></script>

    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  @import '/src/styles/global.css';
</style>
```

**Step 3: Create Hero Section Component**

```astro
// website/src/components/hero/HeroSection.astro
---
const papersCount = 60;
const completePapers = 30;
const simulationsCount = 45;
---

<section class="hero-section">
  <div class="hero-container">
    <div class="hero-content">
      <h1 class="hero-title">
        Mathematical Framework for
        <span class="highlight">Universal Computation</span>
      </h1>

      <p class="hero-subtitle">
        From 3.5 billion years of cellular evolution to the future of AI.
        <span class="stats">
          {papersCount}+ academic papers. Hardware innovation. Visual learning for everyone.
        </span>
      </p>

      <div class="hero-ctas">
        <a href="/papers" class="cta-button primary">
          <svg><!-- papers icon --></svg>
          Explore the Papers
        </a>
        <a href="/spreadsheet-moment/demo" class="cta-button secondary">
          <svg><!-- play icon --></svg>
          Try SpreadsheetMoment
        </a>
        <a href="/lucineer" class="cta-button tertiary">
          <svg><!-- chip icon --></svg>
          Discover Lucineer
        </a>
      </div>
    </div>

    <div class="hero-visual">
      <div class="cellular-network-animation">
        <!-- Animated cellular network visualization -->
        <div class="cell"></div>
        <div class="cell"></div>
        <div class="cell"></div>
        <!-- More cells -->
      </div>

      <div class="confidence-flow">
        <!-- Confidence cascade visualization -->
        <div class="confidence-line"></div>
        <div class="confidence-line"></div>
      </div>
    </div>
  </div>

  <div class="hero-scroll-indicator">
    <span>Scroll to explore</span>
    <svg><!-- chevron down --></svg>
  </div>
</section>

<style>
  .hero-section {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
    position: relative;
    overflow: hidden;
  }

  .hero-title {
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    color: #ffffff;
  }

  .highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: clamp(1rem, 2vw, 1.25rem);
    line-height: 1.6;
    color: #a0aec0;
    max-width: 800px;
    margin-bottom: 2rem;
  }

  .stats {
    display: block;
    color: #667eea;
    font-weight: 600;
  }

  .hero-ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
  }

  .cta-button.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }

  .cta-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }

  .cta-button.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .cta-button.secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .cta-button.tertiary {
    background: transparent;
    color: #a0aec0;
    border: 2px solid #4a5568;
  }

  .cta-button.tertiary:hover {
    color: white;
    border-color: #667eea;
  }

  @media (max-width: 768px) {
    .hero-ctas {
      flex-direction: column;
    }

    .cta-button {
      width: 100%;
      justify-content: center;
    }
  }
</style>
```

---

## Component Implementation Guide

### 1. Papers Explorer Component

```astro
// website/src/components/papers/PaperExplorer.astro
---
import papers from '../../data/papers.json';

const phases = [
  { id: 'phase1', name: 'Phase 1', range: 'P1-P23', complete: 18, total: 23 },
  { id: 'phase2', name: 'Phase 2', range: 'P24-P30', complete: 7, total: 7 },
  { id: 'phase3', name: 'Phase 3', range: 'P31-P40', complete: 0, total: 10 },
  { id: 'phase4', name: 'Phase 4', range: 'P41-P47', complete: 5, total: 7 },
  { id: 'phase5', name: 'Phase 5', range: 'P51-P60', complete: 0, total: 10 }
];

let selectedPhase = 'all';
let selectedTopic = 'all';
---

<section id="papers" class="papers-section">
  <div class="section-container">
    <header class="section-header">
      <h2>The Papers</h2>
      <p class="section-subtitle">
        60+ white papers establishing mathematical foundations for
        cellularized instances, origin-centric data, and distributed intelligence
      </p>
    </header>

    <!-- Phase Progress Visualization -->
    <div class="phase-progress">
      {phases.map(phase => (
        <div class={`phase-item ${phase.id === selectedPhase ? 'active' : ''}`}>
          <div class="phase-header">
            <h3>{phase.name}</h3>
            <span class="phase-range">{phase.range}</span>
            <span class="phase-stats">
              {phase.complete}/{phase.total} Complete
            </span>
          </div>
          <div class="phase-bar">
            <div
              class="phase-progress-bar"
              style={`width: ${(phase.complete / phase.total) * 100}%`}
            ></div>
          </div>
        </div>
      ))}
    </div>

    <!-- Filter Controls -->
    <div class="paper-filters">
      <select id="phase-filter">
        <option value="all">All Phases</option>
        {phases.map(phase => (
          <option value={phase.id}>{phase.name}</option>
        ))}
      </select>

      <select id="topic-filter">
        <option value="all">All Topics</option>
        <option value="type-systems">Type Systems</option>
        <option value="distributed">Distributed Systems</option>
        <option value="hardware">Hardware</option>
        <option value="education">Education</option>
      </select>

      <input
        type="search"
        id="paper-search"
        placeholder="Search papers..."
        aria-label="Search papers"
      />
    </div>

    <!-- Paper Grid -->
    <div class="paper-grid" id="paper-grid">
      {papers.map(paper => (
        <article class={`paper-card ${paper.status.toLowerCase()}`}>
          <div class="paper-card-header">
            <span class="paper-id">{paper.id}</span>
            <span class={`paper-status ${paper.status.toLowerCase()}`}>
              {paper.status}
            </span>
          </div>

          <h3 class="paper-title">{paper.title}</h3>

          <p class="paper-abstract">{paper.abstract.substring(0, 150)}...</p>

          <div class="paper-meta">
            <span class="paper-phase">{paper.phase}</span>
            <span class="paper-simulations">
              {paper.simulations.length} simulations
            </span>
          </div>

          <div class="paper-actions">
            <a href={`/papers/${paper.id}`} class="paper-link primary">
              Read Paper
            </a>
            {paper.simulations.length > 0 && (
              <a href={`/simulations/${paper.simulations[0]}`} class="paper-link secondary">
                View Simulation
              </a>
            )}
          </div>
        </article>
      ))}
    </div>

    <!-- Load More Button -->
    <div class="load-more-container">
      <button id="load-more-papers" class="load-more-button">
        Load More Papers
      </button>
    </div>
  </div>
</section>

<style>
  .papers-section {
    padding: 6rem 2rem;
    background: #ffffff;
  }

  .phase-progress {
    margin-bottom: 3rem;
  }

  .phase-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .phase-item:hover {
    background: #edf2f7;
  }

  .phase-item.active {
    background: #e6f2ff;
    border-left: 4px solid #667eea;
  }

  .phase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .phase-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .phase-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
  }

  .paper-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .paper-filters select,
  .paper-filters input {
    padding: 0.75rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .paper-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
  }

  .paper-card {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .paper-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    border-color: #667eea;
  }

  .paper-status.complete {
    background: #c6f6d5;
    color: #22543d;
  }

  .paper-status.in-progress {
    background: #feebc8;
    color: #7c2d12;
  }

  .paper-status.proposed {
    background: #bee3f8;
    color: #1e40af;
  }

  @media (max-width: 768px) {
    .paper-grid {
      grid-template-columns: 1fr;
    }

    .paper-filters {
      flex-direction: column;
    }

    .paper-filters select,
    .paper-filters input {
      width: 100%;
    }
  }
</style>

<script>
  // Filter functionality
  const phaseFilter = document.getElementById('phase-filter');
  const topicFilter = document.getElementById('topic-filter');
  const searchInput = document.getElementById('paper-search');
  const paperGrid = document.getElementById('paper-grid');

  function filterPapers() {
    // Implementation here
  }

  phaseFilter?.addEventListener('change', filterPapers);
  topicFilter?.addEventListener('change', filterPapers);
  searchInput?.addEventListener('input', filterPapers);
</script>
```

### 2. Lucineer Hardware Showcase

```astro
// website/src/components/lucineer/LucineerShowcase.astro
---
const innovations = [
  {
    id: 'mask-locked',
    title: 'Mask-Locked Type Systems',
    description: 'Hardware-enforced type safety through metal-layer weight encoding',
    paper: 'P51',
    icon: 'lock',
    specs: ['50× efficiency', 'Zero runtime overhead', 'Physical impossibility of violations']
  },
  {
    id: 'thermal',
    title: 'Neuromorphic Thermal Geometry',
    description: 'Bio-inspired cooling using dendritic spine structures',
    paper: 'P52',
    icon: 'fire',
    specs: ['3.2× thermal isolation', '2.1W @ 85°C', 'Eliminates thermal vias']
  },
  {
    id: 'educational',
    title: 'Educational AI Platform',
    description: '127K+ cross-cultural learning samples across 8 languages',
    paper: 'P53',
    icon: 'graduation-cap',
    specs: ['127K+ ML samples', '10 teacher personalities', '94% cultural authenticity']
  }
];
---

<section id="lucineer" class="lucineer-section">
  <div class="section-container">
    <header class="section-header">
      <h2>Lucineer: Hardware That Learns</h2>
      <p class="section-subtitle">
        Mask-locked inference chips achieving 50× efficiency with educational AI
        that teaches across cultures and languages
      </p>
    </header>

    <!-- Interactive Chip Visualization -->
    <div class="chip-visual-container">
      <div class="chip-visual">
        <svg viewBox="0 0 400 400" class="chip-svg">
          <!-- Silicon wafer base -->
          <rect x="50" y="50" width="300" height="300" fill="#2d3748" rx="10"/>

          <!-- Metal layer patterns -->
          <g class="metal-layers">
            {Array.from({ length: 8 }, (_, i) => (
              <rect
                x={80 + i * 30}
                y={80 + i * 20}
                width={40}
                height={40}
                fill={i % 2 === 0 ? '#667eea' : '#764ba2'}
                opacity={0.8}
                class="metal-block"
                data-layer={i}
              />
            ))}
          </g>

          <!-- Ternary weight encoding -->
          <g class="weight-encoding">
            {Array.from({ length: 16 }, (_, i) => (
              <circle
                cx={120 + (i % 4) * 40}
                cy={200 + Math.floor(i / 4) * 40}
                r={8}
                fill={i === 0 ? '#48bb78' : i === 1 ? '#f56565' : '#718096'}
                class="weight-node"
                data-value={i === 0 ? '+1' : i === 1 ? '-1' : '0'}
              />
            ))}
          </g>

          <!-- Thermal spine structures -->
          <g class="thermal-spines">
            {Array.from({ length: 6 }, (_, i) => (
              <ellipse
                cx={320}
                cy={100 + i * 40}
                rx={10}
                ry={20}
                fill="none"
                stroke="#ed8936"
                stroke-width={2}
                class="spine-structure"
              />
            ))}
          </g>
        </svg>
      </div>

      <div class="chip-info">
        <h3>Interactive Chip Explorer</h3>
        <p>Click on different layers to explore mask-locked weight encoding</p>

        <div class="chip-specs">
          <div class="spec-item">
            <span class="spec-label">Process:</span>
            <span class="spec-value">28nm CMOS</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Synapse Area:</span>
            <span class="spec-value">0.12 μm²</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Power:</span>
            <span class="spec-value">2.1W @ 85°C</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Efficiency:</span>
            <span class="spec-value">50× vs software</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Innovation Cards -->
    <div class="innovations-grid">
      {innovations.map(innovation => (
        <article class="innovation-card">
          <div class="innovation-icon">
            <svg><!-- icon based on innovation.icon --></svg>
          </div>

          <h3>{innovation.title}</h3>
          <p>{innovation.description}</p>

          <ul class="innovation-specs">
            {innovation.specs.map(spec => (
              <li>{spec}</li>
            ))}
          </ul>

          <a href={`/papers/${innovation.paper}`} class="innovation-link">
            Read {innovation.paper} →
          </a>
        </article>
      ))}
    </div>

    <!-- Educational Demo Teaser -->
    <div class="educational-teaser">
      <div class="teaser-content">
        <h3>Experience Educational AI</h3>
        <p>
          Try our cross-cultural dialogue system with 10 teacher personalities
          and 15 teaching methods across 8 languages
        </p>

        <div class="teaser-stats">
          <div class="stat">
            <span class="stat-value">127K+</span>
            <span class="stat-label">ML Samples</span>
          </div>
          <div class="stat">
            <span class="stat-value">10</span>
            <span class="stat-label">Teacher Personalities</span>
          </div>
          <div class="stat">
            <span class="stat-value">8</span>
            <span class="stat-label">Languages</span>
          </div>
        </div>

        <a href="/lucineer/educational" class="cta-button">
          Try Educational Demo
        </a>
      </div>
    </div>
  </div>
</section>

<style>
  .lucineer-section {
    padding: 6rem 2rem;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    color: white;
  }

  .chip-visual-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    margin-bottom: 4rem;
    align-items: center;
  }

  .chip-svg {
    width: 100%;
    height: auto;
    filter: drop-shadow(0 20px 40px rgba(102, 126, 234, 0.3));
  }

  .metal-block {
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .metal-block:hover {
    opacity: 1;
    filter: brightness(1.2);
  }

  .weight-node {
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .weight-node:hover {
    r: 12;
  }

  .chip-specs {
    display: grid;
    gap: 1rem;
  }

  .spec-item {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 0.5rem;
  }

  .innovations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 4rem;
  }

  .innovation-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    padding: 2rem;
    transition: all 0.3s ease;
  }

  .innovation-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.08);
    border-color: #667eea;
  }

  @media (max-width: 768px) {
    .chip-visual-container {
      grid-template-columns: 1fr;
    }

    .innovations-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

### 3. SpreadsheetMoment Interactive Demo

```tsx
// website/src/components/spreadsheet-moment/SpreadsheetDemo.tsx
import React, { useState, useEffect } from 'react';
import './SpreadsheetDemo.css';

interface Cell {
  id: string;
  value: string;
  confidence: number;
  type: 'data' | 'formula' | 'ai';
  pattern?: string;
}

export const SpreadsheetDemo: React.FC = () => {
  const [cells, setCells] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [audienceLevel, setAudienceLevel] = useState<'technical' | 'general' | 'educational'>('general');

  // Initialize demo spreadsheet
  useEffect(() => {
    const demoCells: Cell[][] = [];
    for (let row = 0; row < 10; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < 6; col++) {
        rowCells.push({
          id: `${row}-${col}`,
          value: '',
          confidence: Math.random() > 0.5 ? Math.random() : 0,
          type: 'data',
          pattern: Math.random() > 0.7 ? 'detected' : undefined
        });
      }
      demoCells.push(rowCells);
    }
    setCells(demoCells);
  }, []);

  const handleCellClick = (cell: Cell) => {
    setSelectedCell(cell);
    // Plausible event tracking
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('DemoAction', {
        action: 'cell-click',
        confidence: cell.confidence,
        type: cell.type
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence === 0) return 'transparent';
    if (confidence < 0.5) return 'rgba(245, 101, 101, 0.3)'; // red
    if (confidence < 0.8) return 'rgba(237, 137, 54, 0.3)'; // orange
    return 'rgba(72, 187, 120, 0.3)'; // green
  };

  const getExplanation = () => {
    if (!selectedCell) return '';

    const explanations = {
      technical: `Cell ${selectedCell.id} has ${(selectedCell.confidence * 100).toFixed(0)}% confidence.
                  This confidence level is calculated through the origin-centric data flow system,
                  tracking the complete provenance of this cell's value.`,
      general: `This cell is ${(selectedCell.confidence * 100).toFixed(0)}% confident in its value.
                   Think of it like a student raising their hand - the more confident they are,
                   the more likely they're right!`,
      educational: `Meet Cell ${selectedCell.id}! It's ${(selectedCell.confidence * 100).toFixed(0)}% sure
                   about its answer. When cells are really sure, they turn green. When they're not sure,
                   they turn red. It's like a traffic light for learning!`
    };

    return explanations[audienceLevel];
  };

  return (
    <div className="spreadsheet-demo">
      <div className="demo-controls">
        <h3>Interactive Tensor Spreadsheet</h3>
        <p>Click any cell to see its confidence level</p>

        <div className="audience-selector">
          <label>Explanation Level:</label>
          <button
            className={audienceLevel === 'educational' ? 'active' : ''}
            onClick={() => setAudienceLevel('educational')}
          >
            5th Grade
          </button>
          <button
            className={audienceLevel === 'general' ? 'active' : ''}
            onClick={() => setAudienceLevel('general')}
          >
            General
          </button>
          <button
            className={audienceLevel === 'technical' ? 'active' : ''}
            onClick={() => setAudienceLevel('technical')}
          >
            Technical
          </button>
        </div>
      </div>

      <div className="spreadsheet-container">
        <div className="spreadsheet">
          {cells.map((row, rowIndex) => (
            <div key={rowIndex} className="spreadsheet-row">
              {row.map((cell) => (
                <div
                  key={cell.id}
                  className={`spreadsheet-cell ${cell.pattern ? 'pattern-detected' : ''}`}
                  style={{
                    backgroundColor: getConfidenceColor(cell.confidence)
                  }}
                  onClick={() => handleCellClick(cell)}
                >
                  {cell.value || (cell.confidence > 0 ? 'AI' : '')}
                  {cell.confidence > 0 && (
                    <span className="confidence-indicator">
                      {(cell.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {selectedCell && (
          <div className="cell-explanation">
            <h4>Cell {selectedCell.id}</h4>
            <p>{getExplanation()}</p>

            {selectedCell.pattern && (
              <div className="pattern-info">
                <strong>Pattern Detected:</strong> This cell follows a recognized pattern
                that could be automated!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## Deployment Guide

### 1. Cloudflare Pages Setup

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Pages
cd website
wrangler pages deploy dist --project-name=superinstance-website
```

### 2. Environment Variables

Create `.env.production`:
```env
PUBLIC_SITE_URL=https://superinstance.ai
PUBLIC_API_URL=https://api.superinstance.ai
CLOUDFLARE_ZONE_ID=your_zone_id
PLAUSIBLE_DOMAIN=superinstance.ai
```

### 3. Build Configuration

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy:staging": "wrangler pages deploy dist --project-name=superinstance-website --env=staging",
    "deploy:production": "wrangler pages deploy dist --project-name=superinstance-website --env=production"
  }
}
```

### 4. Performance Optimization

```javascript
// website/astro.config.mjs
import compress from 'astro-compress';

export default defineConfig({
  integrations: [
    compress({
      CSS: true,
      HTML: {
        removeAttributeQuotes: false,
        removeOptionalTags: false
      },
      Image: true,
      JavaScript: true,
      SVG: true
    })
  ]
});
```

---

## Testing Checklist

### Pre-Launch Testing

**Functionality:**
- [ ] All links work correctly
- [ ] Forms submit properly
- [ ] Simulations run without errors
- [ ] Interactive elements respond
- [ ] Mobile menus function
- [ ] Search/filter works
- [ ] Analytics tracking fires

**Performance:**
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Images optimized (WebP)
- [ ] JavaScript minified
- [ ] CSS minified
- [ ] Gzip/Brotli enabled

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader tests pass
- [ ] Color contrast ratios meet WCAG AA
- [ ] Alt text on all images
- [ ] ARIA labels on interactive elements
- [ ] Focus indicators visible

**SEO:**
- [ ] Title tags unique and descriptive
- [ ] Meta descriptions present
- [ ] Structured data valid
- [ ] Sitemap generated
- [ ] Robots.txt configured
- [ ] Canonical URLs set

**Cross-Browser:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Analytics Implementation

### Plausible Setup

```html
<!-- Add to <head> in Layout.astro -->
<script defer data-domain="superinstance.ai" src="https://plausible.io/js/script.js"></script>
```

### Custom Events

```typescript
// website/src/lib/analytics.ts
export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, { props });
  }
};

// Usage examples
trackEvent('PaperView', { paperId: 'P2', phase: 'Phase1' });
trackEvent('SimulationStart', { simulation: 'confidence-cascade' });
trackEvent('DemoAction', { action: 'cell-click', confidence: 0.95 });
```

### Goal Tracking

Configure in Plausible dashboard:
1. **Paper Downloads:** Track visits to `/papers/*/download`
2. **Demo Completions:** Track custom event `DemoComplete`
3. **GitHub Clicks:** Track outbound clicks to github.com
4. **Form Submissions:** Track submissions on contact forms

---

## Maintenance Guide

### Regular Updates

**Weekly:**
- Review analytics dashboard
- Check for broken links
- Monitor performance metrics
- Review security logs

**Monthly:**
- Update dependencies
- Review and optimize content
- A/B test new features
- Generate performance reports

**Quarterly:**
- Major feature releases
- Content audit and updates
- Security audit
- User feedback review

### Content Updates

**Adding New Papers:**
1. Update `papers.json` with new paper metadata
2. Create new paper page in `/papers/[id]/`
3. Add simulation if applicable
4. Update sitemap
5. Deploy to production

**Adding New Simulations:**
1. Create simulation component in `/components/simulations/`
2. Add to `simulations.json`
3. Create simulation page
4. Link from relevant papers
5. Test and deploy

---

## Conclusion

This implementation guide provides the technical foundation for bringing the SuperInstance homepage strategy to life. Follow the phased approach:

1. **Week 1:** Foundation setup and hero section
2. **Week 2:** Papers explorer and Lucineer showcase
3. **Week 3:** SpreadsheetMoment demo and simulations
4. **Week 4:** Testing, optimization, and launch

For questions or contributions, please refer to the main strategy document or open a discussion on GitHub.

---

**Status:** Ready for Development
**Next Steps:** Begin Phase 1 implementation
**Estimated Timeline:** 4 weeks to launch
