/**
 * Stress Test for SpreadsheetMoment
 *
 * K6 stress test pushing to 10k concurrent users:
 * - Maximum load testing
 * - Failure point identification
 * - Recovery testing
 * - Resource limits
 *
 * Run: k6 run tests/load/k6/stress-test.js
 *
 * @packageDocumentation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const websocketFailures = new Rate('websocket_failures');
const memoryUsage = new Trend('memory_usage');
const concurrentUsers = new Trend('concurrent_users');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-min-length-20';

/**
 * Stress test configuration
 */
export const options = {
  stages: [
    { duration: '1m', target: 100 },     // Warm up
    { duration: '2m', target: 1000 },    // Ramp to 1k
    { duration: '2m', target: 5000 },    // Ramp to 5k
    { duration: '2m', target: 10000 },   // Ramp to 10k (target)
    { duration: '3m', target: 10000 },   // Sustained load at 10k
    { duration: '2m', target: 5000 },    // Scale down
    { duration: '1m', target: 1000 },    // Scale down more
    { duration: '1m', target: 0 },       // Cool down
  ],
  thresholds: {
    'http_req_duration': [
      'p(95)<2000',   // 95% of requests <2s at peak load
      'p(99)<5000',   // 99% of requests <5s at peak load
    ],
    'http_req_failed': ['rate<0.1'],     // Accept 10% error rate at peak
    'errors': ['rate<0.1'],
  },
  // Graceful stop/timeout
  gracefulStop: '30s',
  timeout: '5m',
};

/**
 * Simulate realistic user session
 */
function userSession(userId) {
  const sessionStart = Date.now();

  // Login
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      username: `stress_user_${userId}`,
      password: 'test_password'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });

  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }

  sleep(Math.random() * 1);

  // Create multiple agents
  const agentCount = Math.floor(Math.random() * 5) + 1;
  const clawIds = [];

  for (let i = 0; i < agentCount; i++) {
    const clawId = `stress_claw_${userId}_${i}`;
    clawIds.push(clawId);

    const agentConfig = {
      id: clawId,
      type: ['SENSOR', 'SMP', 'BOT'][Math.floor(Math.random() * 3)],
      model: {
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        apiKey: API_KEY
      },
      seed: {
        purpose: `Stress test agent ${userId}_${i}`,
        trigger: { type: 'PERIODIC', interval: 5000 },
        learningStrategy: 'REINFORCEMENT'
      },
      equipment: ['MEMORY', 'REASONING'].slice(0, Math.floor(Math.random() * 3) + 1),
      state: 'DORMANT'
    };

    const createResponse = http.post(
      `${BASE_URL}/api/claws`,
      JSON.stringify({ config: agentConfig }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        tags: { name: 'CreateAgent' },
      }
    );

    check(createResponse, {
      'agent created': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);

    sleep(Math.random() * 0.5);
  }

  // Trigger agents in parallel
  const triggerPromises = clawIds.map(clawId =>
    http.asyncRequest(
      'POST',
      `${BASE_URL}/api/claws/trigger`,
      JSON.stringify({
        clawId: clawId,
        data: { value: Math.random() * 1000 }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        tags: { name: 'TriggerAgent' },
      }
    )
  );

  // Wait for triggers
  triggerPromises.forEach(promise => {
    try {
      const response = promise();
      check(response, {
        'agent triggered': (r) => r.status === 200,
      }) || errorRate.add(1);
    } catch (error) {
      errorRate.add(1);
    }
  });

  // Perform cell updates
  const updateCount = Math.floor(Math.random() * 10) + 1;
  for (let i = 0; i < updateCount; i++) {
    const cellId = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`[Math.floor(Math.random() * 26)] +
                   (Math.floor(Math.random() * 100) + 1);

    const updateResponse = http.put(
      `${BASE_URL}/api/sheets/cells/${cellId}`,
      JSON.stringify({ value: `Stress update ${userId}_${i}` }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        tags: { name: 'UpdateCell' },
      }
    );

    check(updateResponse, {
      'cell updated': (r) => r.status === 200,
      'cell update latency OK': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(Math.random() * 0.2);
  }

  // Query agent states
  const queryResponses = clawIds.map(clawId =>
    http.get(
      `${BASE_URL}/api/claws/${clawId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        },
        tags: { name: 'QueryAgent' },
      }
    )
  );

  queryResponses.forEach(response => {
    check(response, {
      'agent query successful': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  // Simulate WebSocket connection
  try {
    const wsConnectTime = Date.now();
    // Note: k6 doesn't natively support WebSocket, but we can test the endpoint
    const wsResponse = http.get(
      `${BASE_URL}/api/ws/health`,
      {
        tags: { name: 'WebSocketHealth' },
      }
    );

    check(wsResponse, {
      'websocket endpoint healthy': (r) => r.status === 200,
    }) || websocketFailures.add(1);

  } catch (error) {
    websocketFailures.add(1);
  }

  const sessionDuration = Date.now() - sessionStart;

  // Log session metrics
  if (__VU % 100 === 0) { // Log every 100th user
    console.log(`User ${userId} session completed in ${sessionDuration}ms`);
  }

  sleep(Math.random() * 2);
}

/**
 * Main stress test
 */
export default function () {
  const userId = `${__VU}_${__ITER}`;

  // Track concurrent users
  concurrentUsers.add(__VU);

  // Run user session
  userSession(userId);

  // Random sleep to simulate realistic usage patterns
  sleep(Math.random() * 3);
}

/**
 * Setup for stress test
 */
export function setup() {
  console.log('=== STARTING STRESS TEST ===');
  console.log(`Target: ${BASE_URL}`);
  console.log('Peak load: 10,000 concurrent users');
  console.log('Duration: ~15 minutes');

  // Pre-warm the system
  const response = http.post(
    `${BASE_URL}/api/test/stress-setup`,
    JSON.stringify({ maxUsers: 10000 }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (response.status === 200) {
    console.log('✓ System pre-warmed');
  } else {
    console.log('✗ System pre-warm failed, continuing anyway');
  }

  return { startTime: Date.now() };
}

/**
 * Teardown and reporting
 */
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  const minutes = Math.floor(duration / 60000);

  console.log('=== STRESS TEST COMPLETED ===');
  console.log(`Total duration: ${minutes} minutes`);

  // Cleanup
  http.post(
    `${BASE_URL}/api/test/stress-teardown`,
    JSON.stringify({}),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
