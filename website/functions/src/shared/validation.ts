import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email().min(3).max(255)
export const passwordSchema = z.string().min(8).max(100).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
)

// User schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(2).max(100).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  preferences: z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    topics: z.array(z.string()).optional(),
    notifications: z.boolean().optional(),
  }).optional(),
})

// Progress schemas
export const tutorialProgressSchema = z.object({
  tutorialId: z.string().min(1),
  completed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  stateData: z.record(z.any()).optional(),
})

export const pathwayProgressSchema = z.object({
  pathwayId: z.string().min(1),
  currentStep: z.number().min(0),
  completedSteps: z.array(z.string()).optional(),
})

// Content schemas
export const contentAccessSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['whitepaper', 'tutorial', 'demo']),
})

// Analytics schemas
export const pageViewSchema = z.object({
  path: z.string().min(1),
  title: z.string().optional(),
  referrer: z.string().optional(),
  duration: z.number().min(0).optional(),
})

export const eventSchema = z.object({
  eventName: z.string().min(1),
  eventData: z.record(z.any()).optional(),
  category: z.string().optional(),
})

// Helper functions
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    return { success: false, errors }
  }
}

export function validateRequest<T>(schema: z.ZodSchema<T>, c: any): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  return c.req.json().then((body: unknown) => {
    const validation = validateSchema(schema, body)

    if (validation.success) {
      return { success: true, data: validation.data }
    } else {
      return {
        success: false,
        response: c.json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: validation.errors,
        }, 400)
      }
    }
  }).catch(() => {
    return {
      success: false,
      response: c.json({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON',
      }, 400)
    }
  })
}
export const userPreferenceSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['en', 'es', 'fr', 'de']).optional(),
  notifications: z.boolean().optional(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
})

export const newsletterSignupSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional(),
})
