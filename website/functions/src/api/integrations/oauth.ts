import { z } from 'zod'

// OAuth validation schemas
export const oauthProviderSchema = z.enum(['google', 'github', 'microsoft'])

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(10),
})

export const oauthConnectSchema = z.object({
  provider: oauthProviderSchema,
  returnUrl: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
})