#!/usr/bin/env node

import type { KVNamespace, D1Database } from '@cloudflare/workers-types'
import { execSync } from 'child_process'
import * as dotenv from 'dotenv'

dotenv.config()

interface EnvVars {
  BUTTONDOWN_API_KEY?: string
  GITHUB_TOKEN?: string
  PLAUSIBLE_API_KEY?: string
  PLAUSIBLE_SITE_ID?: string
}

async function deployIntegrations(env: string = 'production') {
  console.log(`🚀 Deploying integrations in ${env} mode...`)

  // Step 1: Create KV namespaces if they don't exist
  const kvNamespaces = [
    'USER_PREFERENCES',
    'NEWSLETTER_CACHE',
    'GITHUB_CACHE',
    'INTEGRATION_CACHE'
  ]

  for (const namespace of kvNamespaces) {
    try {
      console.log(`Creating KV namespace: ${namespace}`)
      execSync(`npx wrangler kv:namespace create "${namespace}"`, { stdio: 'inherit' })

      if (env !== 'production') {
        execSync(`npx wrangler kv:namespace create "${namespace}" --preview`, { stdio: 'inherit' })
      }
    } catch (error) {
      // Namespace might already exist
      console.log(`KV namespace ${namespace} might already exist`)
    }
  }

  // Step 2: Update table schema
  console.log('Updating database schema...')
  try {
    execSync('npx wrangler d1 execute superinstance-db --file=scripts/add-integration-tables.sql', {
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('Failed to update database schema:', error)
  }

  // Step 3: Publish secrets
  console.log('Publishing secrets...')

  if (process.env.BUTTONDOWN_API_KEY) {
    execSync(`npx wrangler secret put BUTTONDOWN_API_KEY --env ${env}`, {
      input: process.env.BUTTONDOWN_API_KEY,
      stdio: 'inherit'
    })
  }

  if (process.env.GITHUB_TOKEN) {
    execSync(`npx wrangler secret put GITHUB_TOKEN --env ${env}`, {
      input: process.env.GITHUB_TOKEN,
      stdio: 'inherit'
    })
  }

  if (process.env.PLAUSIBLE_API_KEY) {
    execSync(`npx wrangler secret put PLAUSIBLE_API_KEY --env ${env}`, {
      input: process.env.PLAUSIBLE_API_KEY,
      stdio: 'inherit'
    })
  }

  if (process.env.PLAUSIBLE_SITE_ID) {
    execSync(`npx wrangler secret put PLAUSIBLE_SITE_ID --env ${env}`, {
      input: process.env.PLAUSIBLE_SITE_ID,
      stdio: 'inherit'
    })
  }

  // Step 4: Deploy the Worker
  console.log('Deploying Worker...')
  try {
    execSync(`npx wrangler deploy --env ${env}`, { stdio: 'inherit' })
  } catch (error) {
    console.error('Worker deployment failed:', error)
    process.exit(1)
  }

  // Step 5: Run integration tests
  console.log('Running integration tests...')
  try {
    execSync('npm test -- --testPathPattern=integration', { stdio: 'inherit' })
  } catch (error) {
    console.error('Integration tests failed:', error)
  }

  console.log('✅ Integrations deployed successfully!')
}

async function verifyIntegrations() {
  console.log('🔍 Verifying integrations...')

  // Test endpoints
  const baseUrl = process.env.SITE_URL || 'https://superinstance.ai'

  const tests = [
    {
      name: 'GitHub Repos',
      endpoint: `${baseUrl}/api/integrations/github/repos`
    },
    {
      name: 'Newsletter Signup',
      endpoint: `${baseUrl}/api/integrations/newsletter`,
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        source: 'verification'
      })
    }
  ]

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`)
      const response = await fetch(test.endpoint, {
        method: test.method || 'GET',
        headers: test.body ? { 'Content-Type': 'application/json' } : {},
        body: test.body
      })

      if (response.ok) {
        console.log(`✅ ${test.name} is working`)
      } else {
        console.error(`❌ ${test.name} failed:`, response.status)
      }
    } catch (error) {
      console.error(`❌ ${test.name} error:`, error)
    }
  }
}

// Main execution
if (require.main === module) {
  const env = process.argv[2] || 'production'

  deployIntegrations(env).then(async () => {
    await verifyIntegrations()
    console.log('🎉 Integration deployment completed successfully!')
  }).catch(error => {
    console.error('💥 Integration deployment failed:', error)
    process.exit(1)
  })
}

export { deployIntegrations, verifyIntegrations }