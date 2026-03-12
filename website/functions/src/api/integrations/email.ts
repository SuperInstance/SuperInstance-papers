import { z } from 'zod'

// Email schemas
export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  from: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().optional(),
  text: z.string().min(1).max(10000),
  category: z.string().optional(),
  sendAt: z.number().optional(), // Unix timestamp
})

export const emailListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})

export const subscribeToListSchema = z.object({
  listId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  customFields: z.record(z.union([z.string(), z.number()])).optional(),
})