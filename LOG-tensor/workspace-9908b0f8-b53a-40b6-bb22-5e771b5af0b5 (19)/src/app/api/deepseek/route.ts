import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Configuration
// ============================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your_api_key_here'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
}

// ============================================================================
// GET Handler - API Info
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'DeepSeek API Proxy',
    version: '1.0.0',
    description: 'Proxy for DeepSeek AI model inference',
    models: [
      'deepseek-chat',
      'deepseek-coder'
    ],
    capabilities: [
      'Chat completions',
      'Code generation',
      'Reasoning tasks',
      'Function calling'
    ],
    usage: {
      endpoint: '/api/deepseek',
      method: 'POST',
      body: {
        messages: 'Array of { role, content } objects',
        model: 'Model name (default: deepseek-chat)',
        temperature: 'Sampling temperature (0-2)',
        max_tokens: 'Maximum tokens in response'
      }
    }
  })
}

// ============================================================================
// POST Handler - Chat Completion
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid messages array' },
        { status: 400 }
      )
    }

    // Prepare request to DeepSeek
    const deepseekRequest = {
      model: body.model || 'deepseek-chat',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      top_p: body.top_p ?? 0.9,
      max_tokens: body.max_tokens ?? 2048,
      stream: false
    }

    // Call DeepSeek API
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(deepseekRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', errorText)
      return NextResponse.json(
        { 
          success: false, 
          error: `DeepSeek API error: ${response.status}`,
          details: errorText
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      completion: {
        id: data.id,
        model: data.model,
        message: data.choices?.[0]?.message,
        usage: data.usage,
        created: data.created
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('DeepSeek proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Proxy request failed' 
      },
      { status: 500 }
    )
  }
}
