/**
 * Real-Time Streaming Agent Configuration
 */

export interface CustomerMessage {
  id: string;
  customerId: string;
  sessionId: string;
  content: string;
  timestamp: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  intent: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentStats {
  spawned: number;
  terminated: number;
  active: number;
  messagesProcessed: number;
}

export interface SessionStats {
  totalConnections: number;
  activeConnections: number;
  completedSessions: number;
  totalMessages: number;
  averageResponseTime: number;
}

// ============================================================================
// Server Configuration
// ============================================================================

export const serverConfig = {
  port: 8080,
  host: 'localhost',
  auth: {
    enableAuth: true,
    defaultToken: 'demo-token-12345',
    tokenExpiresIn: 3600000, // 1 hour
  },
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
  heartbeat: {
    interval: 30000, // 30 seconds
    timeout: 60000, // 60 seconds
  },
};

// ============================================================================
// Agent Types
// ============================================================================

export const agentTypes = {
  greeting: {
    name: 'GreetingAgent',
    description: 'Initial customer engagement',
    spawnOnConnect: true,
    maxInstances: 10,
  },
  support: {
    name: 'SupportAgent',
    description: 'General support queries',
    spawnOnDemand: true,
    maxInstances: 15,
  },
  technical: {
    name: 'TechnicalAgent',
    description: 'Technical issues',
    spawnOnDemand: true,
    maxInstances: 10,
  },
  billing: {
    name: 'BillingAgent',
    description: 'Billing and payments',
    spawnOnDemand: true,
    maxInstances: 8,
  },
  escalation: {
    name: 'EscalationAgent',
    description: 'Complex issue escalation',
    spawnOnDemand: true,
    maxInstances: 5,
  },
};

// ============================================================================
// Backpressure Configuration
// ============================================================================

export const backpressureConfig = {
  queueThreshold: 10,
  highPriorityThreshold: 15,
  criticalThreshold: 20,
  spawnBatchSize: 2,
  maxQueueSize: 50,
  monitoringInterval: 1000, // 1 second
};

// ============================================================================
// Customer Profiles
// ============================================================================

export const customerProfiles = [
  { id: 'cust_001', name: 'john_doe', email: 'john@example.com' },
  { id: 'cust_002', name: 'jane_smith', email: 'jane@example.com' },
  { id: 'cust_003', name: 'bob_wilson', email: 'bob@example.com' },
  { id: 'cust_004', name: 'alice_brown', email: 'alice@example.com' },
  { id: 'cust_005', name: 'charlie_davis', email: 'charlie@example.com' },
  { id: 'cust_006', name: 'diana_miller', email: 'diana@example.com' },
  { id: 'cust_007', name: 'frank_moore', email: 'frank@example.com' },
  { id: 'cust_008', name: 'grace_taylor', email: 'grace@example.com' },
  { id: 'cust_009', name: 'henry_anderson', email: 'henry@example.com' },
  { id: 'cust_010', name: 'iris_thomas', email: 'iris@example.com' },
  { id: 'cust_011', name: 'jack_white', email: 'jack@example.com' },
  { id: 'cust_012', name: 'karen_harris', email: 'karen@example.com' },
  { id: 'cust_013', name: 'leo_martinez', email: 'leo@example.com' },
  { id: 'cust_014', name: 'mia_garcia', email: 'mia@example.com' },
  { id: 'cust_015', name: 'noah_rodriguez', email: 'noah@example.com' },
  { id: 'cust_016', name: 'olivia_clark', email: 'olivia@example.com' },
  { id: 'cust_017', name: 'peter_lewis', email: 'peter@example.com' },
  { id: 'cust_018', name: 'quinn_walker', email: 'quinn@example.com' },
  { id: 'cust_019', name: 'ryan_hall', email: 'ryan@example.com' },
  { id: 'cust_020', name: 'sophia_young', email: 'sophia@example.com' },
];

// ============================================================================
// Sample Messages
// ============================================================================

export const sampleMessages = [
  { content: 'Hello, I need help with my account', sentiment: 'neutral' as const, intent: 'account_help' },
  { content: 'My bill is wrong!', sentiment: 'negative' as const, intent: 'billing_dispute' },
  { content: 'Technical error with payment', sentiment: 'negative' as const, intent: 'technical_issue' },
  { content: 'How do I reset my password?', sentiment: 'neutral' as const, intent: 'password_reset' },
  { content: 'Where\'s my refund?', sentiment: 'negative' as const, intent: 'refund_status' },
  { content: 'I\'ve been waiting for 20 minutes!', sentiment: 'negative' as const, intent: 'escalation' },
  { content: 'Your service is terrible!', sentiment: 'negative' as const, intent: 'complaint' },
  { content: 'Can you help me setup?', sentiment: 'positive' as const, intent: 'account_help' },
  { content: 'Payment not going through', sentiment: 'negative' as const, intent: 'technical_issue' },
  { content: 'I love your product!', sentiment: 'positive' as const, intent: 'feedback' },
  { content: 'Need to cancel subscription', sentiment: 'neutral' as const, intent: 'billing_dispute' },
  { content: 'App keeps crashing', sentiment: 'negative' as const, intent: 'technical_issue' },
  { content: 'Thank you for your help!', sentiment: 'positive' as const, intent: 'feedback' },
  { content: 'Overcharged on my card', sentiment: 'negative' as const, intent: 'billing_dispute' },
  { content: 'How do I change my email?', sentiment: 'neutral' as const, intent: 'account_help' },
  { content: 'Website is down', sentiment: 'negative' as const, intent: 'technical_issue' },
  { content: 'Great customer service!', sentiment: 'positive' as const, intent: 'feedback' },
  { content: 'Refund process is confusing', sentiment: 'negative' as const, intent: 'refund_status' },
  { content: 'Can\'t login to my account', sentiment: 'negative' as const, intent: 'technical_issue' },
  { content: 'You guys are awesome!', sentiment: 'positive' as const, intent: 'feedback' },
];

export function generateMessage(customerId: string, sessionId: string, index: number): CustomerMessage {
  const sample = sampleMessages[index % sampleMessages.length];

  // Calculate sentiment score (0-1, higher = more negative)
  let sentimentScore = 0.5;
  if (sample.sentiment === 'positive') sentimentScore = 0.2 + Math.random() * 0.2;
  else if (sample.sentiment === 'negative') sentimentScore = 0.7 + Math.random() * 0.25;

  // Determine priority
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
  if (sample.intent === 'escalation') priority = 'urgent';
  else if (sample.sentiment === 'negative') priority = 'high';
  else if (sample.sentiment === 'neutral') priority = 'medium';

  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    customerId,
    sessionId,
    content: sample.content,
    timestamp: Date.now(),
    sentiment: sample.sentiment,
    sentimentScore,
    intent: sample.intent,
    priority,
  };
}

// ============================================================================
// Intent to Agent Mapping
// ============================================================================

export const intentToAgent: Record<string, string> = {
  account_help: 'support',
  technical_issue: 'technical',
  billing_dispute: 'billing',
  refund_status: 'billing',
  password_reset: 'technical',
  escalation: 'escalation',
  complaint: 'support',
  feedback: 'support',
};

// ============================================================================
// Response Templates
// ============================================================================

export const responseTemplates: Record<string, string[]> = {
  greeting: [
    "Hi {name}! Welcome to our support. How can I help you today?",
    "Hello {name}! Thanks for reaching out. What can I assist you with?",
  ],
  support: [
    "I understand, {name}. Let me help you with that.",
    "Thanks for letting us know, {name}. I'll look into this right away.",
  ],
  technical: [
    "I see you're having a technical issue, {name}. Let's troubleshoot this together.",
    "I can help with that technical problem, {name}. First, let me ask a few questions.",
  ],
  billing: [
    "I'm sorry about the billing issue, {name}. Let me check that for you.",
    "I understand your concern about the charges, {name}. Let me review your account.",
  ],
  escalation: [
    "I apologize for the inconvenience, {name}. I'm escalating this to a supervisor immediately.",
    "I understand this is urgent, {name}. Let me get you to a specialist right away.",
  ],
};

export function getResponse(agentType: string, customerName: string): string {
  const templates = responseTemplates[agentType] || responseTemplates.support;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template.replace('{name}', customerName);
}
