'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Zap, Brain, Activity, Layers, Database, CheckCircle2,
  CircleDot, Waves, ArrowRight, Play, Pause, RefreshCw,
  Grid3X3, Box, Timer, Cpu, Lock, Key, Settings
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface ProbabilityState {
  initial: number[]
  current: number[]
  opened: number | null
}

interface ChannelVisit {
  timestamp: number
  intensity: number
}

interface SMPCell {
  id: string
  fingerprint: string
  lockStatus: string
  seed: { value: string; entropy: number }
  model: { provider: string; modelName: string; temperature: number }
}

interface CheckResult {
  overallPassed: boolean
  results: Record<string, { passed: boolean; score: number; issues: string[] }>
}

// ============================================================================
// Probability Distribution Visualization
// ============================================================================

function ProbabilityVisualization({ probs, opened }: { probs: number[]; opened: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    const barWidth = width / probs.length - 10
    
    ctx.fillStyle = '#0c0c0c'
    ctx.fillRect(0, 0, width, height)
    
    probs.forEach((p, i) => {
      const x = i * (barWidth + 10) + 5
      const barHeight = p * (height - 60)
      const y = height - 30 - barHeight
      
      // Bar color
      const color = opened === i ? '#ef4444' : '#f97316'
      
      // Glow
      const gradient = ctx.createLinearGradient(x, y, x, height - 30)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, `${color}40`)
      ctx.fillStyle = gradient
      
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 4)
      ctx.fill()
      
      // Label
      ctx.fillStyle = '#a8a29e'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Door ${i + 1}`, x + barWidth / 2, height - 10)
      
      // Probability value
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(`${(p * 100).toFixed(1)}%`, x + barWidth / 2, y - 8)
    })
    
    // Formula
    ctx.fillStyle = '#a855f7'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('T_fold(p)_i = p_i + p_opened', width / 2, 20)
  }, [probs, opened])
  
  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={200}
      className="rounded-lg border border-orange-500/30"
    />
  )
}

// ============================================================================
// Learning Curve Visualization
// ============================================================================

function LearningCurveVisualization({ 
  depths, 
  costs 
}: { 
  depths: number[]
  costs: number[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || depths.length === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    const padding = 40
    
    ctx.fillStyle = '#0c0c0c'
    ctx.fillRect(0, 0, width, height)
    
    // Draw grid
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * i / 5
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }
    
    // Draw depth curve (orange)
    const maxDepth = Math.max(...depths)
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    depths.forEach((d, i) => {
      const x = padding + (width - 2 * padding) * i / (depths.length - 1)
      const y = height - padding - (d / maxDepth) * (height - 2 * padding)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    
    // Draw cost curve (purple)
    ctx.strokeStyle = '#a855f7'
    ctx.beginPath()
    
    costs.forEach((c, i) => {
      const x = padding + (width - 2 * padding) * i / (costs.length - 1)
      const y = height - padding - c * (height - 2 * padding)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    
    // Labels
    ctx.fillStyle = '#f97316'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Depth', width - padding + 5, padding + 20)
    
    ctx.fillStyle = '#a855f7'
    ctx.fillText('Cost', width - padding + 5, padding + 40)
    
    // Axis labels
    ctx.fillStyle = '#a8a29e'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Visits →', width / 2, height - 10)
  }, [depths, costs])
  
  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={250}
      className="rounded-lg border border-orange-500/30"
    />
  )
}

// ============================================================================
// Tensor Fold Visualization
// ============================================================================

function TensorFoldVisualization({ shape, flatShape }: { shape: number[]; flatShape: [number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => setRotation(r => (r + 0.5) % 360), 30)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    
    ctx.fillStyle = '#0c0c0c'
    ctx.fillRect(0, 0, width, height)
    
    // Draw 3D tensor representation
    const cosR = Math.cos(rotation * Math.PI / 180)
    const sinR = Math.sin(rotation * Math.PI / 180)
    
    const project3D = (x: number, y: number, z: number) => {
      const rx = x * cosR - z * sinR
      const rz = x * sinR + z * cosR
      const scale = 120 / (rz + 5)
      return { x: centerX + rx * scale, y: centerY - y * scale }
    }
    
    // Draw cube representation
    const size = 50
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ].map(([x, y, z]) => project3D(x * size, y * size, z * size))
    
    // Draw edges
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 2
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ]
    
    edges.forEach(([a, b]) => {
      ctx.beginPath()
      ctx.moveTo(vertices[a].x, vertices[a].y)
      ctx.lineTo(vertices[b].x, vertices[b].y)
      ctx.stroke()
    })
    
    // Draw shape label
    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`[${shape.join(', ')}]`, centerX, 30)
    
    // Draw arrow to flat
    ctx.strokeStyle = '#a855f7'
    ctx.beginPath()
    ctx.moveTo(centerX + 80, centerY)
    ctx.lineTo(centerX + 120, centerY)
    ctx.stroke()
    
    // Arrowhead
    ctx.beginPath()
    ctx.moveTo(centerX + 115, centerY - 5)
    ctx.lineTo(centerX + 125, centerY)
    ctx.lineTo(centerX + 115, centerY + 5)
    ctx.stroke()
    
    // Draw flat representation
    const flatX = centerX + 150
    const flatW = 60
    const flatH = flatShape[0] / flatShape[1] * 30
    
    ctx.fillStyle = '#a855f7'
    ctx.fillRect(flatX, centerY - flatH / 2, flatW, flatH)
    
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`[${flatShape.join(', ')}]`, flatX + flatW / 2, centerY + flatH / 2 + 20)
    
    // Formula
    ctx.fillStyle = '#a8a29e'
    ctx.font = '12px monospace'
    ctx.fillText('F = (F_flat, C, P, K)', centerX, height - 20)
    
  }, [rotation, shape, flatShape])
  
  return (
    <canvas
      ref={canvasRef}
      width={450}
      height={250}
      className="rounded-lg border border-orange-500/30"
    />
  )
}

// ============================================================================
// SMP Cell Editor
// ============================================================================

function SMPCellEditor({ 
  cell, 
  onLock, 
  onExecute 
}: { 
  cell: SMPCell | null
  onLock: () => void
  onExecute: (vars: Record<string, string>) => void
}) {
  const [vars, setVars] = useState<Record<string, string>>({ input: 'test' })
  
  return (
    <div className="space-y-4">
      {cell ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-stone-400 text-xs">Cell ID</Label>
              <div className="text-white font-mono text-sm">{cell.id}</div>
            </div>
            <div>
              <Label className="text-stone-400 text-xs">Fingerprint</Label>
              <div className="text-purple-400 font-mono text-sm truncate">{cell.fingerprint}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-stone-400 text-xs">Seed</Label>
              <div className="text-orange-400 text-sm">{cell.seed.value}</div>
              <div className="text-xs text-stone-500">Entropy: {cell.seed.entropy}</div>
            </div>
            <div>
              <Label className="text-stone-400 text-xs">Model</Label>
              <div className="text-green-400 text-sm truncate">{cell.model.modelName}</div>
              <div className="text-xs text-stone-500">Temp: {cell.model.temperature}</div>
            </div>
          </div>
          
          <div>
            <Label className="text-stone-400 text-xs">Lock Status</Label>
            <Badge variant={cell.lockStatus === 'locked' ? 'default' : 'outline'}>
              {cell.lockStatus}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="input value"
              value={vars.input || ''}
              onChange={(e) => setVars({ ...vars, input: e.target.value })}
              className="bg-stone-800 border-stone-700"
            />
            <Button onClick={() => onExecute(vars)} size="sm">
              <Play className="w-4 h-4 mr-1" />
              Execute
            </Button>
          </div>
        </>
      ) : (
        <div className="text-stone-400 text-center py-8">
          Create an SMP Cell to begin
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function POLLNPage() {
  // Conditional Geometry State
  const [probState, setProbState] = useState<ProbabilityState>({
    initial: [1/3, 1/3, 1/3],
    current: [1/3, 1/3, 1/3],
    opened: null
  })
  
  // Channel Depth State
  const [channelParams, setChannelParams] = useState({ lambda: 0.1, alpha: 0.5, visits: 20 })
  const [learningCurve, setLearningCurve] = useState({ depths: [] as number[], costs: [] as number[] })
  
  // Foldable Tensor State
  const [tensorShape, setTensorShape] = useState<number[]>([4, 4, 4])
  const [assemblyKey, setAssemblyKey] = useState<string>('')
  
  // SMP State
  const [smpCell, setSmpCell] = useState<SMPCell | null>(null)
  const [smpBot, setSmpBot] = useState<{ id: string; executionCount: number } | null>(null)
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  
  // Loading states
  const [loading, setLoading] = useState<string | null>(null)
  
  // API calls
  const runMontyHall = useCallback(async (door: number) => {
    setLoading('monty_hall')
    try {
      const response = await fetch('/api/conditional-geometry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monty_hall',
          probabilities: probState.current,
          conditions: { openedDoor: door }
        })
      })
      const data = await response.json()
      if (data.success) {
        setProbState(prev => ({
          ...prev,
          current: data.result_probs,
          opened: door
        }))
      }
    } finally {
      setLoading(null)
    }
  }, [probState.current])
  
  const runLearningCurve = useCallback(async () => {
    setLoading('learning_curve')
    try {
      const response = await fetch('/api/channel-depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'learning_curve',
          n_visits: channelParams.visits,
          params: { lambda: channelParams.lambda, alpha: channelParams.alpha }
        })
      })
      const data = await response.json()
      if (data.success) {
        setLearningCurve({ depths: data.depths, costs: data.costs })
      }
    } finally {
      setLoading(null)
    }
  }, [channelParams])
  
  const createTensor = useCallback(async () => {
    setLoading('tensor')
    try {
      const response = await fetch('/api/foldable-tensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          shape: tensorShape
        })
      })
      const data = await response.json()
      if (data.success) {
        setAssemblyKey(data.initial_key)
      }
    } finally {
      setLoading(null)
    }
  }, [tensorShape])
  
  const createSMPCell = useCallback(async () => {
    setLoading('smp')
    try {
      const response = await fetch('/api/smp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_cell' })
      })
      const data = await response.json()
      if (data.success) {
        setSmpCell(data.cell)
      }
    } finally {
      setLoading(null)
    }
  }, [])
  
  const lockCell = useCallback(async () => {
    if (!smpCell) return
    setLoading('lock')
    try {
      const response = await fetch('/api/smp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock_cell', cellId: smpCell.id })
      })
      const data = await response.json()
      if (data.success) {
        setSmpCell(prev => prev ? { ...prev, lockStatus: data.lockStatus } : null)
      }
    } finally {
      setLoading(null)
    }
  }, [smpCell])
  
  const executeBot = useCallback(async (vars: Record<string, string>) => {
    if (!smpBot) return
    setLoading('execute')
    try {
      const response = await fetch('/api/smp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', botId: smpBot.id, variables: vars })
      })
      const data = await response.json()
      if (data.success) {
        setSmpBot(prev => prev ? { ...prev, executionCount: data.executionCount } : null)
      }
    } finally {
      setLoading(null)
    }
  }, [smpBot])
  
  const checkBot = useCallback(async () => {
    if (!smpBot) return
    setLoading('check')
    try {
      const response = await fetch('/api/smp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', botId: smpBot.id })
      })
      const data = await response.json()
      if (data.success) {
        setCheckResult(data.checkResult)
      }
    } finally {
      setLoading(null)
    }
  }, [smpBot])
  
  // Initialize
  useEffect(() => {
    runLearningCurve()
    createTensor()
    
    // Create SMP cell and bot
    const initSMP = async () => {
      await createSMPCell()
      const response = await fetch('/api/smp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_bot', cellId: 'cell_001' })
      })
      const data = await response.json()
      if (data.success) {
        setSmpBot({ id: data.bot.id, executionCount: 0 })
      }
    }
    initSMP()
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-purple-950/20 to-stone-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
            <Zap className="w-3 h-3 mr-1" />
            POLLN-RTT Round 5
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            LOG-Tensor Foundation
          </h1>
          <p className="text-lg text-stone-400 mb-6">
            Ledger-Origin-Geometry • Geometry that breathes probability
          </p>
          
          {/* Core Equations */}
          <Card className="max-w-4xl mx-auto bg-stone-900/50 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                <div className="text-center">
                  <span className="text-purple-400">Ψ: (X, P, C)</span>
                  <span className="text-stone-400"> → </span>
                  <span className="text-pink-400">(X', P', C')</span>
                  <div className="text-xs text-stone-500 mt-1">Conditional Geometry</div>
                </div>
                <div className="text-center">
                  <span className="text-orange-400">F</span>
                  <span className="text-stone-400"> = </span>
                  <span className="text-amber-400">(F_flat, C, P, K)</span>
                  <div className="text-xs text-stone-500 mt-1">Foldable Tensors</div>
                </div>
                <div className="text-center">
                  <span className="text-green-400">Depth(s)</span>
                  <span className="text-stone-400"> = ∫ visits(τ) × e</span>
                  <span className="text-xs align-super">-λ(t-τ)</span>
                  <div className="text-xs text-stone-500 mt-1">Channel Depth</div>
                </div>
                <div className="text-center">
                  <span className="text-blue-400">SMP</span>
                  <span className="text-stone-400"> = Seed + Model + Prompt</span>
                  <div className="text-xs text-stone-500 mt-1">Locked Static Program</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Main Content Tabs */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="geometry" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-stone-900/50">
              <TabsTrigger value="geometry" className="data-[state=active]:bg-purple-500/20">
                <Brain className="w-4 h-4 mr-2" />
                Conditional Geometry
              </TabsTrigger>
              <TabsTrigger value="tensors" className="data-[state=active]:bg-orange-500/20">
                <Layers className="w-4 h-4 mr-2" />
                Foldable Tensors
              </TabsTrigger>
              <TabsTrigger value="depth" className="data-[state=active]:bg-green-500/20">
                <Timer className="w-4 h-4 mr-2" />
                Channel Depth
              </TabsTrigger>
              <TabsTrigger value="smp" className="data-[state=active]:bg-blue-500/20">
                <Cpu className="w-4 h-4 mr-2" />
                SMP Architecture
              </TabsTrigger>
            </TabsList>
            
            {/* Conditional Geometry Tab */}
            <TabsContent value="geometry">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-stone-900/50 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-400">Monty Hall Fold</CardTitle>
                    <CardDescription>
                      Opening a door redistributes probability to remaining options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ProbabilityVisualization probs={probState.current} opened={probState.opened} />
                    
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2].map(i => (
                        <Button
                          key={i}
                          onClick={() => runMontyHall(i)}
                          disabled={loading !== null || probState.opened !== null}
                          variant={probState.opened === i ? 'destructive' : 'outline'}
                          size="sm"
                        >
                          Open Door {i + 1}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => setProbState({ initial: [1/3, 1/3, 1/3], current: [1/3, 1/3, 1/3], opened: null })}
                      variant="ghost"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    
                    <div className="text-xs text-stone-500 text-center">
                      Key insight: Probability flows to unchosen options when a door opens
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-stone-900/50 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-400">What This Means</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-purple-400 font-medium mb-1">Geometric Transformation</div>
                        <div className="text-stone-300">Folding space along an axis transforms coordinates through reflection</div>
                      </div>
                      
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-pink-400 font-medium mb-1">Probability Redistribution</div>
                        <div className="text-stone-300">Each fold is a conditional probability transformation</div>
                      </div>
                      
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-orange-400 font-medium mb-1">Condition Updates</div>
                        <div className="text-stone-300">Constraints evolve with each transformation</div>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/5">
                      <div className="text-sm font-medium text-purple-300 mb-2">
                        "Geometry that breathes probability"
                      </div>
                      <div className="text-xs text-stone-400">
                        Every fold simultaneously transforms space, redistributes probability, 
                        and updates conditions—creating a unified geometric-probabilistic framework.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Foldable Tensors Tab */}
            <TabsContent value="tensors">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-stone-900/50 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-400">Tensor Folding</CardTitle>
                    <CardDescription>
                      High-dimensional tensors encoded in 2D with folding instructions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <TensorFoldVisualization 
                      shape={tensorShape} 
                      flatShape={[16, 4]}
                    />
                    
                    <div className="flex justify-center gap-2">
                      <Button onClick={createTensor} disabled={loading === 'tensor'} size="sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Generate New
                      </Button>
                    </div>
                    
                    <div className="text-center">
                      <Label className="text-stone-400 text-xs">Assembly Key</Label>
                      <div className="text-orange-400 font-mono text-sm">{assemblyKey}</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-stone-900/50 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-400">Components</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-orange-500/20">
                          <TableHead className="text-stone-400">Component</TableHead>
                          <TableHead className="text-stone-400">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-stone-800">
                          <TableCell className="text-orange-400 font-medium">F_flat</TableCell>
                          <TableCell className="text-stone-300">Flattened 2D representation</TableCell>
                        </TableRow>
                        <TableRow className="border-stone-800">
                          <TableCell className="text-amber-400 font-medium">C</TableCell>
                          <TableCell className="text-stone-300">Crease pattern (fold topology)</TableCell>
                        </TableRow>
                        <TableRow className="border-stone-800">
                          <TableCell className="text-pink-400 font-medium">P</TableCell>
                          <TableCell className="text-stone-300">Permutation group operations</TableCell>
                        </TableRow>
                        <TableRow className="border-stone-800">
                          <TableCell className="text-purple-400 font-medium">K</TableCell>
                          <TableCell className="text-stone-300">Assembly keys (blockchain hashes)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    <div className="mt-4 p-4 border border-orange-500/30 rounded-lg bg-orange-500/5">
                      <div className="text-sm font-medium text-orange-300 mb-2">
                        Folding Group: G_F ≅ (Z₂)^(n-1) ⋊ S_n
                      </div>
                      <div className="text-xs text-stone-400">
                        Semidirect product of binary fold choices with permutations.
                        Order: |G_F| = 2^(n-1) × n!
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Channel Depth Tab */}
            <TabsContent value="depth">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-stone-900/50 border-green-500/30">
                  <CardHeader>
                    <CardTitle className="text-green-400">Learning Curve</CardTitle>
                    <CardDescription>
                      Repeated visits exponentially reduce cognitive cost
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <LearningCurveVisualization 
                      depths={learningCurve.depths}
                      costs={learningCurve.costs}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-stone-400 text-xs">Decay (λ): {channelParams.lambda}</Label>
                        <Slider
                          value={[channelParams.lambda]}
                          onValueChange={([v]) => setChannelParams(p => ({ ...p, lambda: v }))}
                          min={0.01}
                          max={0.5}
                          step={0.01}
                        />
                      </div>
                      <div>
                        <Label className="text-stone-400 text-xs">Visits: {channelParams.visits}</Label>
                        <Slider
                          value={[channelParams.visits]}
                          onValueChange={([v]) => setChannelParams(p => ({ ...p, visits: v }))}
                          min={5}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={runLearningCurve} disabled={loading === 'learning_curve'} className="w-full">
                      Simulate Learning
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-stone-900/50 border-green-500/30">
                  <CardHeader>
                    <CardTitle className="text-green-400">Water Metaphor</CardTitle>
                    <CardDescription>
                      Channels carved → thoughts find ocean with NO WORK
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-green-400 font-medium mb-1">Mastery Pattern</div>
                        <div className="text-stone-300">
                          Like water carving channels in rock—repeated paths of least resistance 
                          become deep channels that require no conscious effort to follow.
                        </div>
                      </div>
                      
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-blue-400 font-medium mb-1">Channel Depth</div>
                        <div className="text-stone-300">
                          Each visit deepens the channel exponentially. Older visits decay 
                          but still contribute to overall depth.
                        </div>
                      </div>
                      
                      <div className="p-3 bg-stone-800/50 rounded-lg">
                        <div className="text-purple-400 font-medium mb-1">Cognitive Cost</div>
                        <div className="text-stone-300">
                          As depth increases, cognitive cost decreases exponentially.
                          Mastered skills require minimal mental energy.
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 border border-green-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">
                          {learningCurve.depths.length > 0 
                            ? learningCurve.depths[learningCurve.depths.length - 1].toFixed(2)
                            : '---'}
                        </div>
                        <div className="text-xs text-stone-400">Final Depth</div>
                      </div>
                      <div className="p-3 border border-purple-500/30 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">
                          {learningCurve.costs.length > 0
                            ? ((1 - learningCurve.costs[learningCurve.costs.length - 1]) * 100).toFixed(0) + '%'
                            : '---'}
                        </div>
                        <div className="text-xs text-stone-400">Cost Reduction</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* SMP Architecture Tab */}
            <TabsContent value="smp">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-stone-900/50 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-blue-400">SMP Cell</CardTitle>
                    <CardDescription>
                      Seed + Model + Prompt = Locked Static Program
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SMPCellEditor
                      cell={smpCell}
                      onLock={lockCell}
                      onExecute={executeBot}
                    />
                  </CardContent>
                </Card>
                
                <Card className="bg-stone-900/50 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-blue-400">Cold Logic Checking</CardTitle>
                    <CardDescription>
                      Scripts that check down the chain for problems
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {smpBot && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-stone-800/50 rounded-lg">
                          <div className="text-xs text-stone-400">Bot ID</div>
                          <div className="text-blue-400 font-mono text-sm">{smpBot.id}</div>
                        </div>
                        <div className="p-3 bg-stone-800/50 rounded-lg">
                          <div className="text-xs text-stone-400">Executions</div>
                          <div className="text-green-400 font-mono text-sm">{smpBot.executionCount}</div>
                        </div>
                      </div>
                    )}
                    
                    <Button onClick={checkBot} disabled={loading === 'check' || !smpBot} className="w-full">
                      <Activity className="w-4 h-4 mr-1" />
                      Run Cold Logic Check
                    </Button>
                    
                    {checkResult && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {checkResult.overallPassed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <CircleDot className="w-5 h-5 text-orange-400" />
                          )}
                          <span className={checkResult.overallPassed ? 'text-green-400' : 'text-orange-400'}>
                            {checkResult.overallPassed ? 'All checks passed' : 'Issues found'}
                          </span>
                        </div>
                        
                        {Object.entries(checkResult.results).map(([type, result]) => (
                          <div key={type} className="p-2 bg-stone-800/50 rounded text-sm">
                            <div className="flex justify-between">
                              <span className="text-stone-300 capitalize">{type}</span>
                              <span className={result.passed ? 'text-green-400' : 'text-orange-400'}>
                                {result.score.toFixed(2)}
                              </span>
                            </div>
                            {result.issues.length > 0 && (
                              <div className="text-xs text-orange-400 mt-1">
                                {result.issues.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="p-4 border border-blue-500/30 rounded-lg bg-blue-500/5">
                      <div className="text-sm font-medium text-blue-300 mb-2">
                        SMPbot GPU Advantages
                      </div>
                      <div className="text-xs text-stone-400 space-y-1">
                        <div>• Parallel inference on multiple cells</div>
                        <div>• Native batch processing</div>
                        <div>• Tensor operation acceleration</div>
                        <div>• High memory bandwidth</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      
      {/* Key Insights */}
      <section className="py-8 px-4 bg-stone-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">
            <Zap className="inline-block mr-2 text-purple-400" />
            Key Insights
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-stone-900/50 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">∞</div>
                <div className="text-purple-400 font-medium">Probability Breathes</div>
                <div className="text-xs text-stone-400 mt-1">
                  Geometry and probability transform together
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-stone-900/50 border-orange-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">≋</div>
                <div className="text-orange-400 font-medium">Channels Carve</div>
                <div className="text-xs text-stone-400 mt-1">
                  Water finds ocean with NO WORK
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-stone-900/50 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🔒</div>
                <div className="text-blue-400 font-medium">Programs Lock</div>
                <div className="text-xs text-stone-400 mt-1">
                  SMP = Seed + Model + Prompt
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
