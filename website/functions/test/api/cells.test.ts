import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest'
import type { UnstableDevWorker } from 'wrangler'
import type { Env } from '../../src/env.d.ts'

describe('SuperInstance Cells API', () => {
  let worker: UnstableDevWorker
  let testToken: string
  let testUserId: string
  let testOriginId: string
  let testCellId: string

  beforeAll(async () => {
    // Start the worker
    worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      local: true,
    })

    // Create a test user
    const registerResponse = await worker.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@superinstance.ai',
        password: 'TestPass123!',
        username: 'testuser',
      }),
    })

    const { data } = await registerResponse.json()
    testToken = data.token
    testUserId = data.user.id
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Origins API', () => {
    it('should create a new origin', async () => {
      const response = await worker.fetch('/api/cells/origins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          name: 'Test Origin',
          transformationMatrix: [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
          ],
          uncertainty: 0.01,
        }),
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('Test Origin')
      expect(data.transformationMatrix).toEqual([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ])

      testOriginId = data.id
    })

    it('should list all origins', async () => {
      const response = await worker.fetch('/api/cells/origins', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].id).toBeDefined()
      expect(data[0].name).toBeDefined()
    })

    it('should get origins with pagination', async () => {
      const response = await worker.fetch('/api/cells/origins?limit=5&offset=0', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Cells API', () => {
    it('should create a new cell', async () => {
      const response = await worker.fetch('/api/cells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          name: 'Test Value Cell',
          originId: testOriginId,
          cellType: 'value',
          initialState: {
            value: 42,
            confidence: 0.95
          },
          rateOfChange: {
            value: 1.5,
            acceleration: 0.1
          },
          uncertainty: 0.02,
          influenceRadius: 50,
          deadband: 0.01,
        }),
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.id).toBeDefined()
      expect(data.name).toBe('Test Value Cell')
      expect(data.cellType).toBe('value')
      expect(data.localState.value).toBe(42)
      expect(data.localState.confidence).toBe(0.95)

      testCellId = data.id
    })

    it('should list all cells', async () => {
      const response = await worker.fetch('/api/cells', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data.find((c: any) => c.id === testCellId)).toBeDefined()
    })

    it('should get a specific cell', async () => {
      const response = await worker.fetch(`/api/cells/${testCellId}`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.id).toBe(testCellId)
      expect(data.name).toBe('Test Value Cell')
      expect(data.cellType).toBe('value')
      expect(data.localState.value).toBe(42)
      expect(data.recentHistory).toBeDefined()
      expect(Array.isArray(data.recentHistory)).toBe(true)
    })

    it('should update a cell', async () => {
      const response = await worker.fetch(`/api/cells/${testCellId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          name: 'Updated Test Cell',
          localState: {
            value: 43,
            confidence: 0.96
          },
          rateOfChange: {
            value: 1.6,
            acceleration: 0.15
          }
        }),
      })

      expect(response.status).toBe(200)
      const { success, message } = await response.json()
      expect(success).toBe(true)
      expect(message).toBe('Cell updated successfully')

      // Verify update
      const getResponse = await worker.fetch(`/api/cells/${testCellId}`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      const { data } = await getResponse.json()
      expect(data.name).toBe('Updated Test Cell')
      expect(data.localState.value).toBe(43)
      expect(data.localState.confidence).toBe(0.96)
    })

    it('should delete a cell', async () => {
      const deleteResponse = await worker.fetch(`/api/cells/${testCellId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(deleteResponse.status).toBe(200)
      const { success, message } = await deleteResponse.json()
      expect(success).toBe(true)
      expect(message).toBe('Cell deleted successfully')

      // Verify deletion
      const getResponse = await worker.fetch(`/api/cells/${testCellId}`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(getResponse.status).toBe(404)
    })
  })

  describe('Rate-Based Mechanics API', () => {
    let rateCellId: string

    beforeAll(async () => {
      // Create a test cell for rate calculations
      const createResponse = await worker.fetch('/api/cells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          name: 'Rate Test Cell',
          originId: testOriginId,
          cellType: 'rate',
          initialState: {
            value: 100,
            confidence: 0.95
          },
          rateOfChange: {
            value: 2.0,
            acceleration: 0.1
          },
          uncertainty: 0.01,
        }),
      })

      const { data } = await createResponse.json()
      rateCellId = data.id

      // Create some history
      for (let i = 0; i < 5; i++) {
        await worker.fetch(`/api/cells/${rateCellId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
          },
          body: JSON.stringify({
            localState: {
              value: 100 + i * 10,
              confidence: 0.95 - i * 0.01
            }
          }),
        })
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    })

    it('should get cell rate information', async () => {
      const response = await worker.fetch(`/api/cells/${rateCellId}/rates`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.currentRates).toBeDefined()
      expect(data.currentRates.instantaneous).toBe(2.0)
      expect(data.currentRates.acceleration).toBe(0.1)
      expect(data.stateEvolution).toBeDefined()
      expect(data.integration).toBeDefined()
      expect(data.historyMetrics).toBeDefined()
    })

    it('should calculate rates from history', async () => {
      const response = await worker.fetch(`/api/cells/${rateCellId}/rates/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.rates).toBeDefined()
      expect(data.rates.value).toBeDefined()
      expect(data.rates.acceleration).toBeDefined()
    })

    it('should generate predictions', async () => {
      const response = await worker.fetch(`/api/cells/${rateCellId}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          timeHorizon: 5000,
          predictionModel: 'quadratic'
        }),
      })

      expect(response.status).toBe(200)
      const { success, data } = await response.json()
      expect(success).toBe(true)
      expect(data.predictions).toBeDefined()
      expect(data.predictions.t1).toBeDefined()
      expect(data.predictions.t2).toBeDefined()
      expect(data.predictions.t).toBeDefined()
      expect(data.uncertaintyGrowth).toBeDefined()
      expect(data.model).toBe('quadratic')
    })
  })

  describe('Error Handling', () => {
    it('should return 401 without authentication', async () => {
      const response = await worker.fetch('/api/cells/origins')
      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent cell', async () => {
      const response = await worker.fetch('/api/cells/non-existent-cell', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
        },
      })
      expect(response.status).toBe(404)
    })

    it('should validate required fields', async () => {
      const response = await worker.fetch('/api/cells', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          // Missing required fields
          cellType: 'value'
        }),
      })

      expect(response.status).toBe(400)
      const { error } = await response.json()
      expect(error).toBe('Validation Error')
    })
  })
})

describe('Rate-Based Mechanics Integration', () => {
  it('should demonstrate the complete rate-based workflow', async () => {
    expect(worker).toBeDefined()

    // This test demonstrates the complete workflow:
    // 1. Create cell with initial state and rate
    // 2. Update cell multiple times to create history
    // 3. Calculate rates from history
    // 4. Generate predictions
    // 5. Verify predictions make sense

    const worker = await unstable_dev('src/index.ts', {
      config: 'wrangler.toml',
      local: true,
    })

    // Authenticate
    const authResponse = await worker.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@superinstance.ai',
        password: 'TestPass123!',
      }),
    })

    const { data: { token } } = await authResponse.json()

    // Get user's first origin
    const originsResponse = await worker.fetch('/api/cells/origins', {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    const { data: origins } = await originsResponse.json()
    const originId = origins[0].id

    // Create a rate-based cell
    const createResponse = await worker.fetch('/api/cells', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Cell',
        originId,
        cellType: 'rate',
        initialState: { value: 0, confidence: 1.0 },
        rateOfChange: { value: 1.0, acceleration: 0.1 },
        uncertainty: 0.001,
      }),
    })

    const { data: cell } = await createResponse.json()

    // Create history by updating cell multiple times
    for (let i = 1; i <= 10; i++) {
      await worker.fetch(`/api/cells/${cell.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          localState: { value: i * 10, confidence: 1.0 - i * 0.01 },
        }),
      })
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Calculate rates from history
    const calcResponse = await worker.fetch(`/api/cells/${cell.id}/rates/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const { data: calcData } = await calcResponse.json()
    expect(calcData.rates.value).toBeGreaterThan(8) // Should detect increasing trend
    expect(calcData.rates.value).toBeLessThan(12) // But not too extreme

    // Generate predictions
    const predictResponse = await worker.fetch(`/api/cells/${cell.id}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        timeHorizon: 1000,
        predictionModel: 'ensemble'
      }),
    })

    const { data: predData } = await predictResponse.json()
    expect(predData.predictions.ensemble.t).toBeGreaterThan(90) // Predicted value at t
    expect(predData.predictions.ensemble.t).toBeLessThan(130)
    expect(predData.uncertaintyGrowth).toBeDefined()
  })
})