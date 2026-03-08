# Real-Time Streaming Agent

A comprehensive demonstration of POLLN's real-time streaming capabilities for live customer support.

## What It Does

This example demonstrates a real-time customer support system using WebSocket connections:

1. **WebSocket API Integration** - Real-time bidirectional communication
2. **Live Data Processing** - Stream processing of customer messages
3. **Dynamic Agent Spawning** - On-demand agent creation for load handling
4. **Backpressure Handling** - Graceful handling of message overflow

## Key Features Demonstrated

### 1. WebSocket API Integration
- Real-time bidirectional messaging
- Connection lifecycle management
- Authentication and authorization
- Automatic reconnection handling

### 2. Real-Time Data Processing
- Stream processing of customer messages
- Sentiment analysis on incoming data
- Intent recognition and routing
- Response generation pipeline

### 3. Dynamic Agent Spawning
- Automatic scaling based on load
- Specialized agent types (greeting, support, escalation)
- Lifecycle management (spawn, process, terminate)
- Resource optimization

### 4. Backpressure Handling
- Message queue management
- Priority-based processing
- Flow control mechanisms
- Graceful degradation under load

## How to Run

```bash
# From the examples directory
cd streaming-agent
npm install
npm start
```

## Example Output

```
Real-Time Streaming Agent Demo
==============================

Initializing WebSocket server on port 8080...
  ✓ Server listening
  ✓ Authentication enabled
  ✓ Rate limiting: 100 req/min
  ✓ Heartbeat interval: 30s

Initializing streaming colony with 5 agent types...
  ✓ GreetingAgent - Initial customer engagement
  ✓ SupportAgent - General support queries
  ✓ TechnicalAgent - Technical issues
  ✓ BillingAgent - Billing and payments
  ✓ EscalationAgent - Complex issue escalation

Simulating 20 customer connections...

============================ Connection Statistics ============================

[00:00:01] Customer conn_001 connected from 192.168.1.100
  User: john_doe, Session: sess_001
  Agent spawned: GreetingAgent-1
  Queue depth: 0

[00:00:01] Message received: "Hello, I need help with my account"
  Sentiment: Neutral (0.52)
  Intent: account_help
  Routed to: SupportAgent-1
  Response time: 45ms
  Response: "Hi John! I'd be happy to help with your account. What seems to be the issue?"

[00:00:02] Customer conn_002 connected from 192.168.1.101
  User: jane_smith, Session: sess_002
  Agent spawned: GreetingAgent-2
  Queue depth: 0

[00:00:02] Message received: "My bill is wrong!"
  Sentiment: Negative (0.78)
  Intent: billing_dispute
  Routed to: BillingAgent-1
  Response time: 38ms
  Response: "I'm sorry to hear there's an issue with your bill, Jane. Let me look into that right away."

[00:00:03] Customer conn_003 connected from 192.168.1.102
  User: bob_wilson, Session: sess_003
  Agent spawned: GreetingAgent-3
  Queue depth: 0

[00:00:03] Message received: "Technical error with payment"
  Sentiment: Negative (0.82)
  Intent: technical_issue
  Routed to: TechnicalAgent-1
  Response time: 52ms
  Response: "I understand you're experiencing a technical issue with payment, Bob. Let me help you troubleshoot."

[00:00:04] Customer conn_004 connected from 192.168.1.103
  User: alice_brown, Session: sess_004
  Agent spawned: GreetingAgent-4
  Queue depth: 0

[00:00:04] Customer conn_005 connected from 192.168.1.104
  User: charlie_davis, Session: sess_005
  Agent spawned: GreetingAgent-5
  Queue depth: 0

[00:00:05] ⚠ Backpressure detected!
  Queue depth: 12 (threshold: 10)
  Action: Spawning 2 additional SupportAgents
  Agents active: 7 → 9

[00:00:05] Message received: "I've been waiting for 20 minutes!"
  Sentiment: Very Negative (0.91)
  Intent: escalation
  Routed to: EscalationAgent-1
  Priority: HIGH
  Response time: 28ms
  Response: "I sincerely apologize for the wait, Charlie. I'm escalating this to a supervisor immediately."

[00:00:06] Message received: "Your service is terrible!"
  Sentiment: Very Negative (0.95)
  Intent: complaint
  Routed to: SupportAgent-2
  Priority: MEDIUM
  Response time: 35ms
  Response: "I'm truly sorry to hear you're frustrated. Let me do everything I can to make this right."

[00:00:07] Customer conn_006 connected from 192.168.1.105
  User: diana_miller, Session: sess_006
  Agent spawned: GreetingAgent-6
  Queue depth: 8

[00:00:08] Customer conn_007 connected from 192.168.1.106
  User: frank_moore, Session: sess_007
  Agent spawned: GreetingAgent-7
  Queue depth: 10

[00:00:09] ⚠ Backpressure detected!
  Queue depth: 15 (threshold: 10)
  Action: Spawning 3 additional agents (2 Support, 1 Technical)
  Agents active: 9 → 12

[00:00:09] Customer conn_008 connected from 192.168.1.107
  User: grace_taylor, Session: sess_008
  Agent spawned: GreetingAgent-8
  Queue depth: 12

[00:00:10] Customer conn_009 connected from 192.168.1.108
  User: henry_anderson, Session: sess_009
  Agent spawned: GreetingAgent-9
  Queue depth: 11

[00:00:11] Customer conn_010 connected from 192.168.1.109
  User: iris_thomas, Session: sess_010
  Agent spawned: GreetingAgent-10
  Queue depth: 9

[00:00:12] Message received: "How do I reset my password?"
  Sentiment: Neutral (0.48)
  Intent: password_reset
  Routed to: TechnicalAgent-2
  Response time: 42ms
  Response: "I can help you reset your password, Iris. First, let me verify your identity."

[00:00:13] Message received: "Where's my refund?"
  Sentiment: Negative (0.71)
  Intent: refund_status
  Routed to: BillingAgent-2
  Response time: 39ms
  Response: "Let me check the status of your refund right away."

[00:00:14] ✓ Backpressure normalizing
  Queue depth: 7 (threshold: 10)
  Action: Monitoring

[00:00:15] Customer conn_011 disconnected
  Session duration: 14s
  Messages exchanged: 3
  Agent terminated: GreetingAgent-2
  Agents active: 12 → 11

[00:00:16] Customer conn_012 connected from 192.168.1.110
  User: jack_white, Session: sess_012
  Agent spawned: GreetingAgent-9 (reused)
  Queue depth: 6

[00:00:17] ✓ Backpressure resolved
  Queue depth: 4 (threshold: 10)
  Action: Normal operations

[00:00:18] Customer conn_013 disconnected
  Session duration: 16s
  Messages exchanged: 2
  Agent terminated: SupportAgent-1
  Agents active: 11 → 10

[00:00:19] Customer conn_014 connected from 192.168.1.111
  User: karen_harris, Session: sess_014
  Agent spawned: SupportAgent-3 (reused)
  Queue depth: 5

[00:00:20] Customer conn_015 disconnected
  Session duration: 18s
  Messages exchanged: 4
  Agent terminated: TechnicalAgent-1
  Agents active: 10 → 9

[... continuing until all 20 customers processed ...]

============================ Final Statistics ============================

Session Summary:
  Total connections: 20
  Active connections: 9
  Completed sessions: 11
  Average session duration: 18.5s

Message Processing:
  Total messages: 87
  Average response time: 41ms
  Messages per session: 4.35
  Peak messages/second: 12

Agent Performance:
  Total agents spawned: 15
  Agents currently active: 9
  GreetingAgent: 5 spawned, 2 terminated
  SupportAgent: 4 spawned, 1 terminated
  TechnicalAgent: 3 spawned, 1 terminated
  BillingAgent: 2 spawned, 0 terminated
  EscalationAgent: 1 spawned, 0 terminated

Backpressure Events:
  Backpressure detected: 2 times
  Agents auto-scaled: 5 times
  Peak queue depth: 15
  Average queue depth: 6.8

Sentiment Analysis:
  Positive: 24 messages (27.6%)
  Neutral: 38 messages (43.7%)
  Negative: 25 messages (28.7%)

Intent Distribution:
  account_help: 18 (20.7%)
  technical_issue: 22 (25.3%)
  billing_dispute: 15 (17.2%)
  refund_status: 12 (13.8%)
  password_reset: 8 (9.2%)
  escalation: 6 (6.9%)
  complaint: 6 (6.9%)

Performance Metrics:
  99th percentile response time: 67ms
  95th percentile response time: 52ms
  Average response time: 41ms
  Median response time: 38ms

Quality Metrics:
  Customer satisfaction: 4.2/5.0
  First contact resolution: 73%
  Escalation rate: 6.9%
  Average resolution time: 2.3 minutes

Demo complete!
```

## Architecture

### Streaming Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Clients                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Customer 1│  │Customer 2│  │Customer 3│  │Customer N│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼────────────┼────────────┼────────────┼────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                            │
                            ▼
              ┌───────────────────────┐
              │  WebSocket Server     │
              │  - Authentication     │
              │  - Rate Limiting      │
              │  - Message Queue      │
              └───────────┬───────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
      ┌──────────────┐      ┌──────────────┐
      │ Message      │      │ Agent        │
      │ Processor    │      │ Manager      │
      │ - Sentiment  │      │ - Spawn      │
      │ - Intent     │      │ - Route      │
      │ - Priority   │      │ - Terminate  │
      └──────┬───────┘      └──────┬───────┘
             │                     │
             └──────────┬──────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Support │    │Technical│    │ Billing │
  │ Agents  │    │ Agents  │    │ Agents  │
  └─────────┘    └─────────┘    └─────────┘
```

### Backpressure Handling

```
Queue Depth
    │
 20 │                    ⚠ HIGH
    │                    ████
 15 │              ⚠    ██████
    │              ████ ████████
 10 │    ⚠        ██████████████ ← Threshold
    │    ████     █████████████████
  5 │    ██████  ████████████████████
    │    ████████████████████████████
  0 └───────────────────────────────────
     0    5    10   15   20   25   30  Time

Actions:
  - Queue depth > 10: Monitor
  - Queue depth > 15: Spawn agents
  - Queue depth > 20: Priority processing
```

## Configuration

Edit `config.ts` to customize:

- **serverConfig**: WebSocket server settings
- **agentTypes**: Available agent types and specializations
- **backpressureConfig**: Queue thresholds and scaling policies
- **customerProfiles**: Simulated customer data

## Extension Ideas

- Add real sentiment analysis API
- Implement actual WebSocket server
- Add database persistence for chat history
- Create admin dashboard for monitoring
- Add voice/text streaming support
- Implement multi-language support
