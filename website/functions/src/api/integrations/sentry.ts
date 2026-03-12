import { z } from 'zod'

// Error tracking schemas
export const captureErrorSchema = z.object({
  message: z.string().min(1).max(2000),
  level: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),
  tags: z.record(z.string()).optional(),
  extra: z.record(z.any()).optional(),
  environment: z.string().optional(),
  release: z.string().optional(),
  userId: z.string().optional(),
})

export const addContextSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]).or(z.array(z.string())).or(z.record(z.any())),
})

export const setUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  username: z.string().optional(),
  ip_address: z.string().optional(),
})