import { z } from 'zod'

// Calendly schemas
export const createScheduledEventSchema = z.object({
  eventType: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  startTime: z.string().datetime(),
  timezone: z.string().optional(),
  duration: z.number().min(15).max(240).optional(), // in minutes
  questions: z.array(z.object({
    label: z.string(),
    answer: z.string()
  })).optional(),
  note: z.string().max(1000).optional(),
  skipInviteLinkHash: z.boolean().optional(),
})

export const listEventsSchema = z.object({
  minStartTime: z.string().datetime().optional(),
  maxStartTime: z.string().datetime().optional(),
  status: z.enum(['active', 'canceled']).optional(),
  count: z.number().min(1).max(100).optional(),
  pageToken: z.string().optional(),
})

export const rescheduleEventSchema = z.object({
  eventId: z.string().min(1),
  startTime: z.string().datetime(),
  timezone: z.string().optional(),
  rescheduledBy: z.string().min(1),
})

export const cancelEventSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().max(500).optional(),
  cancelerType: z.enum(['host', 'invite']).optional(),
})