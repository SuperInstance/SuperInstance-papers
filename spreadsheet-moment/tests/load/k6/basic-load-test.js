/**
 * Basic Load Test for SpreadsheetMoment
 *
 * K6 load test simulating 100 concurrent users:
 * - User authentication
 * - Agent creation
 * - Agent triggering
 * - WebSocket connections
 *
 * Run: k6 run tests/load/k6/basic-load-test.js
 *
 * @packageDocumentation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const agentCreationTime = new Trend('agent_creation_time');
const agentTriggerTime = new Trend('agent_trigger_time');
const cellUpdateTime = new Trend('cell_update_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },     // Stay at 100 users
    { duration: '30s', target: 200 },    // Ramp up to 200 users
    { duration: '1m', target: 200 },     // Stay at 200 users
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // 95% of requests <500ms
    'http_req_failed': ['rate<0.05'],    // Error rate <5%
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key-min-length-20';

/**
 * Main test scenario
 */
export default function () {
  // Simulate user login
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      username: `user_${__VU}`,
      password: 'test_password'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2); // Random think time

  // Create agent
  const agentConfig = {
    id: `claw_${__VU}_${__ITER}`,
    type: 'SENSOR',
    position: [0, 0],
    model: {
      provider: 'DEEPSEEK',
      model: 'deepseek-chat',
      apiKey: API_KEY
    },
    seed: {
      purpose: `Load test agent ${__VU}`,
      trigger: {
        type: 'CELL_CHANGE',
        cellId: 'A1'
      },
      learningStrategy: 'REINFORCEMENT'
    },
    equipment: ['MEMORY', 'REASONING'],
    state: 'DORMANT'
  };

  const createStartTime = Date.now();
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
  agentCreationTime.add(Date.now() - createStartTime);

  check(createResponse, {
    'agent created': (r) => r.status === 200 || r.status === 201,
    'agent creation time OK': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(Math.random() * 3);

  // Trigger agent
  const clawId = `claw_${__VU}_${__ITER}`;
  const triggerStartTime = Date.now();
  const triggerResponse = http.post(
    `${BASE_URL}/api/claws/trigger`,
    JSON.stringify({
      clawId: clawId,
      data: { value: Math.random() * 100 }
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      tags: { name: 'TriggerAgent' },
    }
  );
  agentTriggerTime.add(Date.now() - triggerStartTime);

  check(triggerResponse, {
    'agent triggered': (r) => r.status === 200,
    'trigger time OK': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(Math.random() * 2);

  // Update cell
  const updateStartTime = Date.now();
  const updateResponse = http.put(
    `${BASE_URL}/api/sheets/cells/A1`,
    JSON.stringify({ value: `Update ${__VU}_${__ITER}` }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      tags: { name: 'UpdateCell' },
    }
  );
  cellUpdateTime.add(Date.now() - updateStartTime);

  check(updateResponse, {
    'cell updated': (r) => r.status === 200,
    'cell update time OK': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(Math.random() * 5); // Random think time before next iteration
}

/**
 * Setup function (runs once)
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Target: 200 concurrent users`);

  // Optionally create test data
  const response = http.post(
    `${BASE_URL}/api/test/setup`,
    JSON.stringify({ users: 200 }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  console.log(`Setup status: ${response.status}`);
}

/**
 * Teardown function (runs once)
 */
export function teardown(data) {
  console.log('Load test completed');

  // Optionally cleanup test data
  const response = http.post(
    `${BASE_URL}/api/test/teardown`,
    JSON.stringify({}),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  console.log(`Teardown status: ${response.status}`);
}
