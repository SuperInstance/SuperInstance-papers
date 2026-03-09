# POLLN Spreadsheet Plugin - Installation & Onboarding UX Research

**Date**: 2026-03-08
**Status**: Installation UX Design Specification
**Product**: POLLN Spreadsheet Plugin (LOG Tool)
**Target Users**: Spreadsheet users, NOT AI developers
**Core Philosophy**: Plug-and-play. Install, set API keys, start using.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Installation Flow](#installation-flow)
3. [API Key Setup](#api-key-setup)
4. [First Run Experience](#first-run-experience)
5. [Side Panel Setup](#side-panel-setup)
6. [Right-Click Integration](#right-click-integration)
7. [Fine-Tuning Interface](#fine-tuning-interface)
8. [First Agent Creation](#first-agent-creation)
9. [Error States & Recovery](#error-states--recovery)
10. [Accessibility Considerations](#accessibility-considerations)
11. [Success Metrics](#success-metrics)

---

## Executive Summary

### Design Philosophy

**"Plug-and-Play in Under 2 Minutes"**

The POLLN spreadsheet plugin must feel like installing any other Excel add-in or Google Sheets extension. No AI expertise required. No technical setup. Just install, add your API key, and start creating agents.

### Key Design Principles

1. **Speed First**: From store install to first agent in < 120 seconds
2. **Clarity Over Completeness**: Show only what's needed, when it's needed
3. **Progressive Disclosure**: Advanced features appear after first successful use
4. **Forgiving**: No irreversible actions, always can reset or undo
5. **Transparent**: Always clear what's happening and why

### Target Platforms

| Platform | Store | Installation Method | First-Run Trigger |
|----------|-------|---------------------|-------------------|
| **Excel** | Office Add-in Store | One-click install | Ribbon button or first `=AGENT()` |
| **Google Sheets** | Workspace Marketplace | One-click install | Extension menu or first `=AGENT()` |

---

## Installation Flow

### Stage 1: Store Discovery & Install (0-30 seconds)

#### Excel Add-in Store Experience

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    POLLN for Excel                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🐝 POLLN - Understandable AI Agents for Spreadsheets    │   │
│  │                                                            │   │
│  │  ⭐⭐⭐⭐⭐ 4.8/5 from 234 reviews                    │   │
│  │                                                            │   │
│  │  Create AI agents that learn your workflow.              │   │
│  │  Double-click any cell to see the reasoning.             │   │
│  │                                                            │   │
│  │  [Screenshots: Agent creation, Inspector panel, Results] │   │
│  │                                                            │   │
│  │  Features:                                                │   │
│  │  ✓ Natural language agent creation                        │   │
│  │  ✓ Inspect reasoning traces                               │   │
│  │  ✓ Automatic learning & optimization                     │   │
│  │  ✓ Cost transparency & caching                             │   │
│  │                                                            │   │
│  │  Permissions:                                            │   │
│  │  • Access to this spreadsheet only                       │   │
│  │  • Internet connection for AI features                    │   │
│  │                                                            │   │
│  │  Developer: SuperInstance (Open Source)                  │   │
│  │  Privacy Policy | Terms | Support Website                  │   │
│  │                                                            │   │
│  │                    [Add] [Try Free]                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Copywriting**:

**Title (60 chars max)**:
```
POLLN - Understandable AI Agents for Spreadsheets
```

**Short Description (200 chars max)**:
```
Create AI agents that learn your workflow. Double-click any cell to see the reasoning. Automatic learning, cost transparency, full control. Free & open source.
```

**Long Description**:
```
POLLN brings understandable AI to your spreadsheets. Unlike black-box AI tools, every POLLN agent is fully inspectable—double-click any cell to see the complete reasoning trace.

Key Features:
• Create agents in plain English—no coding required
• Agents learn your patterns and optimize over time
• See exactly how decisions are made (full transparency)
• Cost dashboard shows every API call and savings from caching
• Bring Your Own Key—your data stays private

How It Works:
1. Type =AGENT("task", range) in any cell
2. POLLN analyzes your data and learns patterns
3. Agents get faster and smarter with use
4. Double-click to inspect the reasoning trace

Perfect for:
• Business analysts automating reports
• Operations managers tracking metrics
• Data-driven entrepreneurs forecasting sales
• Anyone who wants AI they can trust and understand

Free forever. Open source (MIT license).
```

**Permission Dialog**:
```
┌─────────────────────────────────────────────────────────────────┐
│  POLLN would like to:                                         │
│                                                                 │
│  ✓ Read and modify this spreadsheet                           │
│  ✓ Display agent results in cells                              │
│  ✓ Connect to AI providers (OpenAI, Anthropic, etc.)          │
│  ✓ Store agent states locally (offline support)               │
│                                                                 │
│  Your data stays in your spreadsheet. Agents run locally     │
│  when possible. API calls only happen for complex tasks.     │
│                                                                 │
│  Privacy Policy | Learn More                                  │
│                                                                 │
│  [Cancel]                   [Allow All]                          │
└─────────────────────────────────────────────────────────────────┘
```

#### Google Workspace Marketplace Experience

**Visual Layout** (similar to Excel):
```
┌─────────────────────────────────────────────────────────────────┐
│                    POLLN for Google Sheets                     │
│  [Similar layout with screenshots, features, permissions]        │
└─────────────────────────────────────────────────────────────────┘
```

**Key Differences**:
- Smaller screenshots (Sheets UI constraints)
- Emphasis on offline-first (since Sheets has quotas)
- Clear explanation of Apps Script permissions

---

### Stage 2: Post-Install Success Confirmation (30-45 seconds)

#### Excel: First Open Trigger

**When**: User opens Excel after installation

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 POLLN is installed!                                       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  You're 30 seconds away from your first AI agent.            │
│                                                                 │
│  Quick setup:                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Add your OpenAI or Anthropic API key                  │   │
│  │     [One-click setup from your account]                    │   │
│  │                                                             │   │
│  │  2. Type =AGENT("task", range) in any cell                │   │
│  │     Example: =AGENT("Summarize sales", A2:A100)           │   │
│  │                                                             │   │
│  │  3. Double-click the cell to see the reasoning            │   │
│  │                                                             │   │
│  │  [Try a demo]  [Set up API key]  [Skip, I'll explore]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Tip: Agents learn your data patterns and get faster       │
│     with use. First run uses the API, then results are         │
│     cached for free.                                          │
│                                                                 │
│  [Close and let me explore]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Non-blocking modal (can dismiss with Esc or click outside)
- Reappears on 2nd and 3rd spreadsheet open if not dismissed
- After 3rd dismiss, switches to subtle ribbon hint (see below)

**Ribbon Hint** (after 3 dismissals):
```
┌────────────── Excel Ribbon ─────────────────────────────────────┐
│ [Home] [Insert] [POLLN 🎯] [Data] [Review] [View] ...           │
│           ↑ "New! Create your first agent"                      │
└───────────────────────────────────────────────────────────────────┘
```

#### Google Sheets: First Open Trigger

**When**: User opens Sheets after installation, opens any spreadsheet

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 Welcome to POLLN!                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your AI-powered spreadsheet assistant is ready.               │
│                                                                 │
│  [Watch 60-second demo]  [Get started in 3 steps]              │
│                                                                 │
│  Quick setup:                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Add your API key (OpenAI, Anthropic, etc.)             │   │
│  │  2. Try the formula: =AGENT("Summarize", A1:A100)        │   │
│  │  3. Double-click to see how it works                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Start tutorial]  [I'll explore myself]  [Don't show again]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Side panel (not blocking)
- Can be dismissed by clicking "I'll explore myself" or "Don't show again"
- Reappears as a subtle notification bell after 1 week if no agents created

---

## API Key Setup

### Stage 3: API Key Configuration (30-60 seconds)

#### Why Do We Need API Keys? (Optional Explanation)

**Show This**: Only if user clicks "Why do I need this?" link

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Why does POLLN need an API key?                               │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  POLLN is an AI assistant that runs in your spreadsheet.       │
│  It uses powerful AI models (like GPT-4) to understand and    │
│  analyze your data.                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔒 Your data is private                                  │   │
│  │                                                             │   │
│  │  POLLN never sees your API key. It's stored securely on   │   │
│  │  your device. All AI calls happen directly between       │   │
│  │  your spreadsheet and the AI provider.                    │   │
│  │                                                             │   │
│  │  Your spreadsheet data is ONLY sent to the AI provider   │   │
│  │  you choose. It's never stored on POLLN servers.         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💰 Cost transparency                                     │   │
│  │                                                             │   │
│  │  • See every API call in the Cost Dashboard              │   │
│  │  • Set monthly budgets to avoid surprises                 │   │
│  │  • Results are cached—pay once, reuse forever          │   │
│  │  • Typical usage: $0.01-0.10 per agent run                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Back to setup]                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### Supported Providers

**Primary Providers** (shown first):
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3 Opus, Claude 3 Sonnet)

**Secondary Providers** (in "More options"):
- Google (Gemini Pro)
- Mistral AI
- Cohere
- Local models (LM Studio, Ollama)

**API Key Setup Dialog - Step 1: Choose Provider**

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1 of 2: Choose your AI provider                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  POLLN works with any AI provider. Choose one to add:         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  Recommended: OpenAI GPT-4                        [Best]  │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  • Best for reasoning and complex tasks                   │   │
│  │  • Fast response times                                    │   │
│  │  • Cost: ~$0.03-0.10 per agent run                      │   │
│  │                                                             │   │
│  │  [Get API key →]                                           │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Anthropic Claude 3 Opus                             [Fast]  │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  • Excellent for analysis and writing                     │   │
│  │  • Very fast response times                             │   │
│  │  • Cost: ~$0.02-0.08 per agent run                       │   │
│  │                                                             │   │
│  │  [Get API key →]                                           │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Show all providers ↓]                                         │
│                                                                 │
│  Already have an API key? [Sign in with existing key →]        │
│                                                                 │
│  [Cancel]                    [Next: Enter API key →]             │
└─────────────────────────────────────────────────────────────────┘
```

**API Key Setup Dialog - Step 2: Enter API Key**

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 2: Add your OpenAI API key                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Paste your API key below:                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  sk-...                                                     │   │
│  │                                                             │   │
│  │  [Paste key]          [× Clear]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Where do I get an API key?                                  │
│  1. Go to platform.openai.com                                 │
│  2. Sign in or create an account                              │
│  3. Navigate to API → Create new secret key                   │
│  4. Copy and paste it here                                   │
│                                                                 │
│  🔒 Your API key is stored:                                   │
│  • Encrypted on your device (AES-256)                        │
│  • Never sent to POLLN servers                               │
│  • Only shared with OpenAI when making API calls             │
│                                                                 │
│  [← Back]              [Test connection]         [Finish →]   │
└─────────────────────────────────────────────────────────────────┘
```

#### Testing the Connection

**On "Test connection" click**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Testing connection...                                         │
│                                                                 │
│  [Spinner] Connecting to OpenAI...                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

↓ (2-3 seconds later, if successful)

┌─────────────────────────────────────────────────────────────────┐
│  ✓ Connected!                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your API key is working. You can now create agents.         │
│                                                                 │
│  Estimated costs:                                               │
│  • Simple tasks: $0.01-0.03 per run                          │
│  • Complex tasks: $0.05-0.15 per run                         │
│  • Caching saves 80-90% on repeated tasks                     │
│                                                                 │
│  [Set monthly budget →]    [Finish and create agent →]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Error States**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ✗ Connection failed                                            │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  The API key doesn't appear to be working. This could be:     │
│  • A typo in the API key (check for extra spaces)              │
│  • The API key has been revoked                                │
│  • No internet connection                                     │
│  • API provider is experiencing issues                          │
│                                                                 │
│  Troubleshooting:                                             │
│  [Verify my key] [Contact support] [Try again]               │
│                                                                 │
│  [← Back to API key entry]                                     │
└─────────────────────────────────────────────────────────────────┘
```

#### Secure Storage Explained

**When**: User asks "Where is my API key stored?"

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 How your API key is protected                              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your API key is encrypted and stored locally:                │
│                                                                 │
│  Platform: Windows                                              │
│  Location: %APPDATA%\POLLN\credentials.encrypted              │
│  Encryption: AES-256-GCM (same as banks use)                  │
│  Key derivation: OS-level key store (DPAPI on Windows)         │
│                                                                 │
│  What this means:                                               │
│  ✓ Only POLLN on this device can read the key                 │
│  ✓ Malware can't steal the key (it's encrypted)               │
│  ✓ Anyone with access to your device can use POLLN             │
│  ✗ The key isn't protected if someone logs into your computer│
│                                                                 │
│  Best practices:                                               │
│  • Don't share your API key with others                       │
│  • Use a dedicated API key (not your main account key)        │
│  • Set usage limits on the API provider's website             │
│  • Revoke keys you're no longer using                         │
│                                                                 │
│  [Manage my API keys →]  [I understand, close]                │
└─────────────────────────────────────────────────────────────────┘
```

#### "Bring Your Own Key" Philosophy

**When**: Implicitly addressed during setup, explicit in settings

**Messaging**:
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Your API key, your control                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  POLLN is designed with your privacy and budget in mind:       │
│                                                                 │
│  1. You pay the AI provider directly                            │
│     • POLLN adds no markup or fees                              │
│     • See exact costs in the Cost Dashboard                   │
│     • Set budgets to control spending                         │
│                                                                 │
│  2. Your data stays private                                    │
│     • POLLN servers never see your data or API key            │
│     • Data only goes to the AI provider you choose           │
│     • You can delete the API key anytime                       │
│                                                                 │
│  3. You're in control                                          │
│     • Use any AI provider you want                            │
│     • Switch providers anytime                                 │
│     • Use local models for complete privacy                    │
│     • Export your agents and use them elsewhere               │
│                                                                 │
│  This is "Bring Your Own Key" (BYOK) computing—you own        │
│  the infrastructure, we just provide the tools.              │
│                                                                 │
│  [Learn more about BYOK]  [Close]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## First Run Experience

### Stage 4: First Agent Creation Tutorial (30-60 seconds)

#### Interactive Tutorial Overlay

**Trigger**: First time user types `=AGENT(` or clicks "Create agent"

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  👋 Welcome to POLLN! Let's create your first agent           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  We'll create an agent that summarizes your data. Just       │
│  follow these 3 steps:                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Step 1: Select your data                                │   │
│  │                                                             │   │
│  │  [Highlight cells A2:A100 in the spreadsheet]           │   │
│  │                                                             │   │
│  │  ✓ I've selected the sales data column                  │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Previous]  [Next →]  [Skip tutorial]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2: Describe what you want**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 2 of 3: Describe what you want the agent to do           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  What should this agent do with your data?                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  e.g., "Summarize the quarterly sales data"               │   │
│  │  or "Find trends in the customer reviews"                │   │
│  │                                                             │   │
│  │  [Examples: "Summarize", "Find trends", "Categorize"]    │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Previous]  [Next →]  [Skip tutorial]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3: See the magic**
```
┌─────────────────────────────────────────────────────────────────┐
│  Step 3 of 3: Watch your agent work                           │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your agent is now running:                                    │
│                                                                 │
│  [Cell animation showing processing]                            │
│  │ • Reading 99 rows of data...                               │
│  │  • Analyzing patterns...                                    │
│  │  • Generating summary...                                   │
│                                                                 │
│  ✓ Done! Here's what your agent found:                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Q3 sales increased by 15.2% compared to Q2.          │   │
│  │  Strong performance in Western region (+23%).          │   │
│  │  Category B showed highest growth (+18%).               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🎉 Congratulations! You created your first agent.            │
│                                                                 │
│  Next steps:                                                   │
│  • Double-click the cell to see the reasoning trace         │
│  • Modify the prompt to try different analyses               │
│  • Create more agents for other tasks                         │
│                                                                 │
│  [View reasoning]  [Create another agent]  [Finish]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Aha Moment: Agent Inspector

**Trigger**: User clicks "View reasoning" or double-clicks the agent cell

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Sales Summary Agent                                    [×] [⋮]      │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Network] [Performance] [Settings]                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 What the agent found                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Q3 sales increased by 15.2% compared to Q2           │   │
│  │                                                             │   │
│  │  Key findings:                                            │   │
│  │  • Western region led growth (+23%)                      │   │
│  │  • Category B showed highest growth (+18%)               │   │
│  │  • Overall trend: Positive momentum                      │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🧠 How the agent reached this conclusion                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. DataFetcher identified 99 rows of sales data      │   │
│  │     → Checked for dates, confirmed time-series data    │   │
│  │                                                             │   │
│  │  2. TrendAnalyzer computed month-over-month growth    │   │
│  │     → Calculated: Q3 total vs Q2 total                  │   │
│  │     → Result: +15.2% growth                             │   │
│  │                                                             │   │
│  │  3. OutputFormatter formatted the summary             │   │
│  │     → Used "business-friendly" tone                      │   │
│  │     • Concise summary (2 bullet points)                │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚡ Performance                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Total runtime: 0.8 seconds                              │   │
│  │  API calls: 1 (GPT-4)                                    │   │
│  │  Cost: $0.05                                              │   │
│  │  Cache status: Not cached (first run)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Tip: Next run will be free (cached result)!              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [▶ Run again]  [⚙️ Configure]  [📋 Copy result]                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- **Visual reasoning trace**: Shows the step-by-step process
- **Performance transparency**: Cost, runtime, cache status
- **Next action guidance**: Clear what to do next
- **Progressive disclosure**: Network/Settings tabs available but not overwhelming

---

## Side Panel Setup

### Stage 5: POLLN Task Panel (Always Available)

#### How Panel Appears (Non-intrusive)

**Excel**: Ribbon button opens panel
```
┌────────────── Excel Ribbon ─────────────────────────────────────┐
│ [Home] [Insert] [Data] [POLLN 🐝] [Review] [View] ...           │
│                      ↑ Click to open POLLN panel               │
└───────────────────────────────────────────────────────────────────┘
```

**Google Sheets**: Extension menu icon
```
┌─────────────────────────────────────────────────────────────────┐
│  Extensions: [🔔] [POLLN 🐝] [⋯]                              │
│                        ↑ Click to open POLLN panel          │
└─────────────────────────────────────────────────────────────────┘
```

#### Side Panel Initial State

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  POLLN Agents                                          [⋮] [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Quick Actions                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [+ Create new agent]                                  │   │
│  │  [📋 Browse templates]                                  │   │
│  │  [⚙️ Settings]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Your Agents (3)                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Sales Summary Agent                               │   │
│  │  Cell: A1  •  Last run: 2 min ago  •  Cost: $0.05       │   │
│  │  Status: ✓ Ready  •  Cache: ⚡ Hit (saved 0.8s)        │   │
│  │  [▶ Run] [⚙️ Edit] [📋 Copy]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔍 Expense Categorizer                                │   │
│  │  Cell: B5  •  Last run: 1 hour ago  •  Cost: $0.02     │   │
│  │  Status: ✓ Ready  •  Cache: ⚡ Hit (saved 0.3s)        │   │
│  │  [▶ Run] [⚙️ Edit] [📋 Copy]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📝 Report Generator                                   │   │
│  │  Cell: C10  •  Last run: Yesterday  •  Cost: Free      │   │
│  │  Status: ✓ Ready  •  Cache: ⚡ Hit (saved 2.1s)        │   │
│  │  [▶ Run] [⚙️ Edit] [📋 Copy]                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Show all agents →]                                          │
│                                                                 │
│  💡 Tip: Agents get faster with use as they learn your data.   │
│                                                                 │
│  ───────────────────────────────────────────────────────────── │
│  Budget this month: $1.50 / $10.00                             │
│  [Adjust budget]  [View detailed costs]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### How to Dismiss/Hide

**Methods**:
1. Click × in top-right corner
2. Press Esc key
3. Click outside panel (Excel: on worksheet, Sheets: close sidebar)
4. Ribbon: Click POLLN button again to toggle

**How to Reopen**:
- **Excel**: Click POLLN button in ribbon
- **Google Sheets**: Click POLLN icon in extension menu
- **Keyboard shortcut**: `Ctrl+Shift+P` (optional, shown in tooltip)

---

## Right-Click Integration

### Stage 6: Context Menu Integration (Opt-in)

#### When Right-Click is Enabled

**Trigger**: User right-clicks on any cell

**Visual Layout****:
```
┌─────────────────────────────────────────────────────────────────┐
│  Context Menu (truncated for brevity)                         │
│  ─────────────────────────────────────────────────────────────  │
│  Copy                                                            │
│  Paste                                                            │
│  ─────────────────────────────────────────────────────────────  │
│  Insert POLLN Agent                                            │
│    ├─ Summarize data...                                        │
│  │    ├─ Analyze trends...                                     │
│  │    ├─ Categorize items...                                   │
│  │    ├─ Custom agent...                                      │
│  │    └─ Configure agents...                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Inspect Agent (if agent exists in cell)                        │
│  Run Agent (if agent exists in cell)                           │
│  ─────────────────────────────────────────────────────────────  │
│  POLLN Settings...                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### First-Time Right-Click Prompt

**Trigger**: User right-clicks for the first time after installation

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Enable right-click for POLLN?                              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Would you like to add POLLN options to your right-click      │
│  menu? This makes it faster to create and manage agents.      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Before:                                             │   │
│  │  [Screenshot of standard Excel context menu]              │   │
│  │                                                             │   │
│  │  After:                                              │   │
│  │  [Screenshot showing POLLN options added]                │   │
│  │  • Insert POLLN Agent                                    │   │
│  │  • Inspect Agent                                         │   │
│  │  • Quick actions                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☐ Don't show this prompt again                               │
│                                                                 │
│  [Enable]          [No thanks, keep using the ribbon]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Non-blocking (can be dismissed)
- Reappears once per week if not enabled
- Can be enabled later in Settings

---

## Fine-Tuning Interface

### Stage 7: Agent Configuration (Advanced, After First Use)

#### When to Show Fine-Tuning

**Trigger**: After first successful agent run, show subtle prompt

**Visual Layout** (in Inspector panel):
```
┌─────────────────────────────────────────────────────────────────┐
│  Sales Summary Agent                                    [×] [⋮]      │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Network] [Performance] [Settings]                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚙️ Agent Settings                                              │
│                                                                 │
│  General:                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Name: [Sales Summary Agent________________]           │   │
│  │  Description: [Analyzes quarterly sales data_______]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Behavior:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Creativity:                                              │   │
│  │  More Precise ●━━━━━━━━━━━━● More Creative               │   │
│  │  0.7                                                    │   │
│  │                                                             │   │
│  │  Learning rate:                                          │   │
│ │  Fast learning ●━━━━━━━● Stable results                 │   │
│  │  0.5                                                    │   │
│  │                                                             │   │
│  │  Error handling: [Retry automatically ▼]              │   │
│  │                                                             │   │
│  │  Cache results: [✓] Enable                            │   │
│  │  Refresh trigger: [On data change ▼]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☐ Show advanced options                                      │
│                                                                 │
│  [Cancel]  [Reset to defaults]  [Save changes]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Advanced Options (Progressive Disclosure)

**When**: User clicks "Show advanced options"

```
┌─────────────────────────────────────────────────────────────────┐
│  Advanced Options                                              │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Model Selection:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Provider: [OpenAI ▼]                                    │   │
│  │  Model: [GPT-4 Turbo ▼]                                   │   │
│  │  Max tokens: [4096___]                                     │   │
│  │                                                             │   │
│  │  [Cost estimate: ~$0.03-0.05 per run]                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Optimization:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Enable automatic distillation [✓]                     │   │
│  │  Distill after [50] executions                            │   │
│  │  Target accuracy: [95%]                                   │   │
│  │                                                             │   │
│  │  Enable dreaming optimization [✓]                       │   │
│  │  Run dreams at [2:00 AM] (daily)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Output format:                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Style: [Concise ▼]                                       │   │
│  │  Format: [Bullet points ▼]                                 │   │
│  │  Tone: [Professional ▼]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [← Back to basic settings]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Reset to Defaults

**When**: User clicks "Reset to defaults"

**Confirmation Dialog**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Reset agent settings?                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  This will restore all settings to their default values:       │
│                                                                 │
│  • Creativity: 0.7 (balanced)                                  │
│  • Learning rate: 0.5 (moderate)                               │
│  • Error handling: Retry automatically                       │
│  • Cache: Enabled                                            │
│  • Refresh trigger: On data change                          │
│                                                                 │
│  Your custom configurations will be lost.                        │
│                                                                 │
│  [Cancel]  [Reset]                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## First Agent Creation

### Stage 8: Guided Agent Creation (Beyond Tutorial)

#### Agent Creation Dialog (After Tutorial)

**Trigger**: User clicks "Create new agent" or types `=AGENT(`

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Create a POLLN Agent                                         [×]    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  What should this agent do?                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Describe in plain English:                               │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │ e.g., "Summarize the quarterly sales        │   │   │
│  │  │ data and identify key trends"             │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                             │   │
│  │  Examples: "Summarize", "Categorize",            │   │
│  │  "Find trends", "Extract insights"              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Data source:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Range: [A2:A100_______________] [📋 Browse]          │   │
│  │  Auto-detect format: [✓]                               │   │
│  │                                                             │   │
│  │  Preview: 99 rows detected (dates, sales figures)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Advanced options ▼]                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  Estimated cost: $0.05 (first run)                       │   │
│  │  Subsequent runs: Free (cached) ⚡                        │   │
│  │                                                             │   │
│  │  [Create agent]  [Try with demo data]  [Cancel]           │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Suggested Starter Templates

**Show This**: If user clicks "Try with demo data"

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Starter Templates                                             [×]    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Quick-start templates with demo data:                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Sales Trend Analysis                               │   │
│  │  Analyze sales data over time, identify trends          │   │
│  │  [Use this]                                            │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Demo: 12 months of sales data, 500 rows              │   │
│  │  Result: Trend chart + summary                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔍 Expense Categorizer                                │   │
│  │  Automatically categorize expenses by type               │   │
│  │  [Use this]                                            │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Demo: 200 expense line items                           │   │
│  │  Result: Categorized with labels                         │   │
│  └─────────────────────────────────────────────────────────�   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📝 Report Generator                                   │   │
│  │  Create formatted reports from raw data                   │   │
│  │  [Use this]                                            │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Demo: Monthly metrics data                              │   │
│  │  Result: Executive summary + key metrics                │   │
│  └─────────────────────────────────────────────────────────�   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🧹 Data Cleaner                                       │   │
│  │  Clean and standardize messy data                         │   │
│  │  [Use this]                                            │   │
│  │  ─────────────────────────────────────────────────────   │
│  │  Demo: Names, addresses, phone numbers (messy)          │   │
│  │  Result: Cleaned, standardized data                      │   │
│  └─────────────────────────────────────────────────────────�   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📈 Forecasting                                        │   │
│  │  Predict future values based on historical data            │   │
│  │  [Use this]                                            │   │
│  │  ─────────────────────────────────────────────────────   │
│  │  Demo: 24 months of historical sales                     │   │
│  │  Result: 3-month forecast with confidence interval       │   │
│  └─────────────────────────────────────────────────────────�   │
│                                                                 │
│  [← Back to creation]  [Browse all templates →]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Immediate "Aha Moment"

**When**: Agent finishes running for the first time

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 Your agent is ready!                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Celebration animation: Confetti + success sound]             │
│                                                                 │
│  Your agent successfully analyzed your data and found:         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✓ Q3 sales increased by 15.2% compared to Q2           │   │
│  │  ✓ Western region showed strongest performance (+23%)      │   │
│  │  ✓ Category B emerged as top seller                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  What's next:                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Double-click the cell to see the reasoning trace      │   │
│  │  • Modify the agent to ask different questions          │   │
│  │  • Create more agents for other data ranges             │   │
│  │  • Browse templates for more use cases                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [View reasoning trace]  [Create another agent]  [Done]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error States & Recovery

### Stage 9: User-Friendly Error Handling

#### Error Type 1: API Key Missing

**When**: User tries to create agent without API key

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ API key required                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  To create agents, you need to add an API key from an AI       │
│  provider (like OpenAI or Anthropic).                            │
│                                                                 │
│  Why do I need this?  [Learn more →]                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Recommended: OpenAI GPT-4                               │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  [Add OpenAI key]  [I have a different provider ↓]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Recovery Flow**:
1. User clicks "Add OpenAI key"
2. Opens API key setup dialog (see Stage 3)
3. After key added, automatically retries agent creation

#### Error Type 2: Insufficient Credits

**When**: API returns error about insufficient credits

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  💳 Insufficient API credits                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your API key works, but there are insufficient credits     │
│  to complete this task.                                        │
│                                                                 │
│  What you can do:                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Add credits to your account at platform.openai.com    │   │
│  │     [Open billing page →]                                │   │
│  │                                                             │   │
│  │  2. Use a simpler task (fewer tokens):                    │   │
│  │     [Try simpler task]                                    │   │
│  │                                                             │   │
│  │  3. Switch to a different provider:                       │   │
│ │     [Switch provider]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Estimated cost for this task: $0.05                         │
│                                                                 │
│  [Close]  [Try again]  [Switch provider]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Error Type 3: Data Format Mismatch

**When**: Agent can't process the data format

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Data format issue                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  The agent couldn't process the data in range A2:A100.        │
│                                                                 │
│  Problem found:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Row 50: Expected date, got "N/A"                        │   │
│  │  • Row 75: Empty cell                                       │   │
│  │  • Row 102: Invalid date format ("Janry 15")               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Quick fixes:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Fix automatically]  [Exclude problematic rows]      │   │
│  │  [Show me the data]    [Cancel]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Help docs]  [Contact support]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Auto-Fix Dialog**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Fixing data issues...                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ✓ Excluded 3 problematic rows                                │
│  ✓ Cleaned 2 invalid dates                                    │
│  ✓ Filled 1 empty cell with "N/A"                            │
│                                                                 │
│  Fixed! Your agent is now running...                          │
│  [Spinner] Processing 96 rows...                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Error Type 4: Network Timeout

**When**: API call takes too long (> 30 seconds)

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⏱ Taking longer than expected...                             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your agent is still working, but it's taking longer than    │
│  usual. This can happen with:                                  │
│  • Large datasets (1000+ rows)                                │
│  • Slow API response (provider is busy)                        │
│  • Complex analysis tasks                                     │
│                                                                 │
│  Current status:                                               │
│  [Spinner] Processing 500 rows... (45 seconds)              │
│                                                                 │
│  What would you like to do?                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [⏳ Keep waiting]  [Try with less data]              │   │
│  │  [✂️ Use a simpler task]  [Cancel]                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Estimated time remaining: ~30 seconds                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility Considerations

### Stage 10: Inclusive Design

#### Keyboard Navigation

**Full Keyboard Support**:
- `Tab`: Navigate through all UI elements
- `Enter` / `Space`: Activate buttons and options
- `Esc`: Close modals and panels
- `Arrow keys`: Navigate within lists and grids
- `Ctrl+Shift+P`: Open POLLN panel
- `Ctrl+Shift+A`: Create new agent
- `F2`: Edit agent formula (focus formula bar)
- `Ctrl+Shift+I`: Open inspector

**Focus Indicators**:
```css
/* High-contrast focus ring for all interactive elements */
:focus-visible {
  outline: 3px solid #8B5CF6;
  outline-offset: 2px;
  border-radius: 4px;
}
```

#### Screen Reader Support

**ARIA Labels** (examples):
```html
<!-- Agent cell -->
<div
  role="button"
  tabindex="0"
  aria-label="Sales Summary Agent. Last ran 2 minutes ago. Double-click to inspect."
  aria-describedby="agent-status-tooltip"
>
  Sales: +15.2% Q3
</div>

<!-- Inspector panel -->
<div
  role="dialog"
  aria-label="Agent Inspector for Sales Summary Agent"
  aria-modal="true"
>
  <div role="document">
    <h2 id="inspector-title">Sales Summary Agent</h2>
    <div aria-live="polite" aria-atomic="true">
      Loading agent details...
    </div>
  </div>
</div>

<!-- Loading state -->
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  Processing 99 rows of data...
</div>

<!-- Error state -->
<div
  role="alert"
  aria-live="assertive"
>
  Error: Data format mismatch in row 50
</div>
```

#### High Contrast Mode Support

**CSS Media Query**:
```css
@media (prefers-contrast: high) {
  /* Increase border widths */
  .agent-cell {
    border-width: 3px;
  }

  /* Remove gradients, use solid colors */
  .agent-cell-ready {
    background: #FFFFFF;
    border-color: #000000;
  }

  /* Increase focus indicators */
  :focus-visible {
    outline-width: 4px;
  }

  /* Ensure text meets WCAG AAA standards */
  .text-primary {
    color: #000000;
  }
  .text-secondary {
    color: #1a1a1a;
  }
}
```

#### Reduced Motion Support

**CSS Media Query**:
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  .agent-cell,
  .network-node,
  .badge-learning,
  .status-icon-processing,
  .checkmark-path,
  .spinner-path {
    animation: none !important;
    transition: none !important;
  }

  /* Use static indicators instead */
  .agent-cell-processing::before {
    content: "Processing...";
    font-size: 10px;
    color: #8B5CF6;
  }

  /* Instant transitions (no fade) */
  .inspector-panel,
  .modal-overlay {
    transition: none;
  }
}
```

#### Color Blindness Support

**Design Principles**:
1. **Never rely on color alone** - Always pair colors with:
   - Icons (🐝, ✓, ❌, ⚡, 💰, 🔒)
   - Text labels ("Ready", "Error", "Cached", "Private")
   - Patterns (stripes, dots) for data visualization

2. **Accessible color palette**:
   - Primary: #8B5CF6 (purple) - Always paired with icon
   - Success: #10B981 (green) - Always paired with ✓
   - Error: #EF4444 (red) - Always paired with ❌
   - Warning: #F59E0B (orange) - Always paired with ⚠️

3. **Data visualization**:
   - Use shapes + colors for line charts
   - Use patterns + colors for bar charts
   - Provide text alternatives for all charts

---

## Success Metrics

### Stage 11: Measuring Success

### Quantitative Metrics

**Installation Success**:
- ✓ Install to first agent < 2 minutes: 80% of users
- ✓ API key setup completion rate: 90%+
- ✓ Tutorial completion rate: 70%+
- ✓ First agent success rate: 95%+

**Engagement Metrics** (7-day):
- ✓ Second agent creation: 60%+ of users
- ✓ Inspector panel usage: 50%+ of agent runs
- ✓ Template exploration: 40%+ of users
- ✓ Settings modification: 30%+ of users

**User Satisfaction**:
- ✓ NPS score: > 50
- ✓ SUS score: > 70
- ✓ "I would recommend POLLN" > 75%
- ✓ Installation ease rating > 4.5/5

### Qualitative Metrics

**Success Indicators**:
- Users express surprise/delight ("This is magic!")
- Users spontaneously suggest use cases
- Users teach colleagues without being asked
- Users request more features (not complain)
- Users return to create more agents

**Red Flags**:
- "This is too complicated"
- "I don't understand what's happening"
- "I'd rather just use formulas"
- "I'm worried about costs"
- "I don't trust the results"

### A/B Testing Plan

**Test 1: API Key Setup Flow**
- **Variant A**: Inline in first-run dialog
- **Variant B**: Separate modal triggered before first agent
- **Metric**: Higher completion rate, lower time-to-first-agent

**Test 2: Tutorial Style**
- **Variant A**: Interactive overlay with steps
- **Variant B**: Side panel with guided walkthrough
- **Metric**: Higher completion rate, better retention

**Test 3: Error Display**
- **Variant A**: Inline error with tooltip explanation
- **Variant B**: Modal dialog with troubleshooting steps
- **Metric**: Faster error recovery, higher success rate

**Test 4: Onboarding Trigger**
- **Variant A**: Force show after install
- **Variant B**: Gentle notification, opt-in
- **Metric**: Higher engagement without annoyance

---

## Appendix: Copywriting Guidelines

### Voice & Tone

**Principles**:
1. **Clear over clever**: Users want understanding, not entertainment
2. **Action-oriented**: Tell users what to do, not just what happened
3. **Reassuring**: Acknowledge concerns, provide confidence
4. **Concise**: Respect users' time, get to the point

**Do**:
- ✓ "Create your first agent in 30 seconds"
- ✓ "Your agent is learning your data patterns"
- ✓ "Results cached—90% faster next time"

**Don't**:
- ✗ "Unleash the power of emergent intelligence"
- ✗ "Our revolutionary agent distillation framework"
- ✗ "Harnessing the collective intelligence of the colony"

### Microcopy Examples

**Buttons**:
- ✓ "Create agent" (not "Spawn agent")
- ✓ "View reasoning" (not "Inspect trace")
- ✓ "Run agent" (not "Execute inference")
- ✓ "Settings" (not "Configuration")

**Tooltips**:
- ✓ "See how the agent made this decision"
- ✓ "This agent ran 2 minutes ago"
- ✓ "Results cached—saved you $0.05"

**Error Messages**:
- ✓ "We couldn't process row 50. Expected a date, but found 'N/A'."
- ✗ "Error: Invalid data format in cell A50"
- ✓ "This task requires an API key. Add one in Settings."
- ✗ "Authentication failed"

**Success Messages**:
- ✓ "Your agent analyzed 99 rows in 0.8 seconds"
- ✓ "Cached result—saved 0.7 seconds!"
- ✓ "Agent learned your data format (next run will be faster)"

---

## Implementation Checklist

### Phase 1: Core Installation (Week 1-2)
- [ ] Store listing pages (Excel, Sheets)
- [ ] Permission dialogs
- [ ] Install success confirmation
- [ ] First-run modal

### Phase 2: API Key Setup (Week 2-3)
- [ ] API key provider selection
- [ ] Secure storage implementation
- [ ] Connection testing
- [ ] Error handling for invalid keys

### Phase 3: First Run Experience (Week 3-4)
- [ ] Interactive tutorial overlay
- [ ] Demo data templates
- [ ] Agent creation dialog
- [ ] Success celebration

### Phase 4: UI Components (Week 4-5)
- [ ] Side panel task pane
- [ ] Agent inspector panel
- [ ] Right-click integration
- [ ] Settings interface

### Phase 5: Error Handling (Week 5-6)
- [ ] Error state dialogs
- [ ] Auto-fix suggestions
- [ ] Recovery flows
- [ ] Help documentation links

### Phase 6: Accessibility (Week 6-7)
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Reduced motion
- [ ] Color blindness support

### Phase 7: Testing & Iteration (Week 7-8)
- [ ] Usability testing with target users
- [ ] A/B testing key flows
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Conclusion

The POLLN spreadsheet plugin installation UX is designed to be:

1. **Fast**: Under 2 minutes from install to first agent
2. **Clear**: Non-technical users understand every step
3. **Reassuring**: Privacy, costs, and data control are transparent
4. **Forgiving**: Easy to recover from errors, always can reset
5. **Accessible**: Works for users with disabilities

The key insight: **Spreadsheet users are not AI developers.** They want tools that just work. The installation flow should feel like installing any other add-in—quick, intuitive, and painless.

---

**Document Version**: 1.0
**Last Updated**: 2026-03-08
**Status**: ✅ Ready for Design Review
**Next**: Handoff to UI/UX team for visual design
**Dependencies**:
- Technical Specifications (TECHNICAL_SPECS.md)
- UI Mockups (UI_MOCKUPS.md)
- User Research Plan (USER_RESEARCH_PLAN.md)
