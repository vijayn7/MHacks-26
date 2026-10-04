import { z } from 'zod'
import { restrictionLevels } from './types'

export const settingsPatchSchema = z.object({
  restrictionLevel: z.enum(restrictionLevels).optional(),
  reflectionSeconds: z.number().int().min(3).max(180).optional(),
  cooldownSeconds: z.number().int().min(0).max(60 * 60 * 24 * 30).optional(),
  approvalRequired: z.boolean().optional(),
  monitoringEnabled: z.boolean().optional(),
  leaderboardOptIn: z.boolean().optional(),
  profileVisibility: z.enum(['private', 'friends', 'public']).optional(),
  socialEnabled: z.boolean().optional(),
  notifySaved: z.boolean().optional(),
  notifyApprovals: z.boolean().optional(),
  notifyChallenges: z.boolean().optional(),
})

export const interventionSchema = z.object({
  idempotencyKey: z.string().min(8).max(200),
  url: z.string().url().max(2000),
  itemName: z.string().max(180).optional(),
  amountCents: z.number().int().nonnegative().max(100_000_000).nullable().optional(),
  decision: z.enum(['continue', 'save', 'drop']),
  reflectionCompleted: z.boolean().optional(),
  overrideEssential: z.boolean().optional(),
  shareDetails: z.boolean().optional(),
})

export const devAuthSchema = z.object({
  displayName: z.string().min(1).max(80),
  email: z.string().email().optional(),
})

export const onboardingMessageSchema = z.object({
  message: z.string().max(500),
})

export const siteSchema = z.object({
  domain: z.string().min(3).max(200),
  category: z.enum(['shopping', 'betting', 'custom']).optional(),
  enabled: z.boolean().optional(),
})

export const trustedInviteSchema = z.object({
  displayName: z.string().min(1).max(80),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
})

export const approvalCreateSchema = z.object({
  interventionId: z.string().uuid(),
  contactId: z.string().uuid(),
})

export const approvalRespondSchema = z.object({
  token: z.string().min(20),
  decision: z.enum(['approve', 'decline']),
})

export const challengeSchema = z.object({
  title: z.string().min(1).max(80),
  goalType: z.enum(['reflection_complete', 'defer', 'revisit', 'abandon']),
  goalCount: z.number().int().min(1).max(100),
  days: z.number().int().min(1).max(60).default(7),
  inviteUserIds: z.array(z.string().uuid()).max(20).optional(),
})

export const pairSchema = z.object({
  code: z.string().min(6).max(12),
  deviceLabel: z.string().max(80).optional(),
})

export const aiEchoSchema = z.object({
  summary: z.string().min(1).max(800),
  echo: z.object({
    interventions: z.number().int(),
    continued: z.number().int(),
    saved: z.number().int(),
    abandoned: z.number().int(),
  }),
})

export const preferenceSchema = z.object({
  categories: z.array(z.enum(['shopping', 'betting'])),
  triggers: z.array(z.string()),
  goals: z.array(z.string()),
  recommendedLevel: z.enum(restrictionLevels),
  chosenLevel: z.enum(restrictionLevels),
  wantsTrustedContact: z.boolean(),
  consentToStore: z.boolean(),
})
