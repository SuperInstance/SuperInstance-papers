import { createRoute } from '@hono/zod-openapi'
import { z } from 'zod'

// Stripe payment schemas
export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
})

export const stripeWebhookEventSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
})

export const setupIntentSchema = z.object({
  customerId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

export const customerPortalSchema = z.object({
  returnUrl: z.string().url(),
  customerId: z.string().min(1),
})