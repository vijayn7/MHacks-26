import type { OnboardingPreference, RestrictionLevel } from './types'

export type OnboardingStep = 'category' | 'trigger' | 'goal' | 'recommend' | 'friend' | 'consent' | 'done'

export type OnboardingDraft = {
  step: OnboardingStep
  categories: Array<'shopping' | 'betting'>
  triggers: string[]
  goals: string[]
  recommendedLevel: RestrictionLevel | null
  chosenLevel: RestrictionLevel | null
  wantsTrustedContact: boolean | null
  consentToStore: boolean | null
}

export const SUGGESTED_PROMPTS = [
  'I shop when I am bored',
  'I bet when I cannot sleep',
  'I want a friend to slow me down',
  'A reminder is enough',
] as const

export function emptyDraft(): OnboardingDraft {
  return {
    step: 'category',
    categories: [],
    triggers: [],
    goals: [],
    recommendedLevel: null,
    chosenLevel: null,
    wantsTrustedContact: null,
    consentToStore: null,
  }
}

export function recommendLevel(draft: Pick<OnboardingDraft, 'categories' | 'triggers' | 'goals'>): RestrictionLevel {
  const text = [...draft.triggers, ...draft.goals].join(' ').toLowerCase()
  if (draft.categories.includes('betting') || /can.?t stop|every day|friend|approval|high/.test(text)) {
    return 'high'
  }
  if (/remind|aware|gentle|enough/.test(text) && !draft.categories.includes('betting')) return 'low'
  return 'medium'
}

export function advanceOnboarding(draft: OnboardingDraft, message: string): {
  draft: OnboardingDraft
  reply: string
  suggestions: string[]
  done: boolean
} {
  const text = message.trim()
  const lower = text.toLowerCase()
  const next = { ...draft, categories: [...draft.categories], triggers: [...draft.triggers], goals: [...draft.goals] }

  if (draft.step === 'category') {
    if (/both|shop|bet/.test(lower)) {
      if (/shop/.test(lower) || /both/.test(lower)) next.categories.push('shopping')
      if (/bet/.test(lower) || /both/.test(lower)) next.categories.push('betting')
      next.categories = [...new Set(next.categories)]
    }
    if (next.categories.length === 0) {
      return {
        draft,
        reply: 'Where does the urge usually show up — shopping, betting, or both?',
        suggestions: ['Shopping', 'Betting', 'Both'],
        done: false,
      }
    }
    next.step = 'trigger'
    return {
      draft: next,
      reply: 'What usually starts it? A time of day, a feeling, a tab you already had open.',
      suggestions: [...SUGGESTED_PROMPTS],
      done: false,
    }
  }

  if (draft.step === 'trigger') {
    if (text) next.triggers.push(text)
    next.step = 'goal'
    return {
      draft: next,
      reply: 'What do you want to be different the next time that page loads?',
      suggestions: ['A pause before I pay', 'Someone I trust in the loop', 'Just to notice it'],
      done: false,
    }
  }

  if (draft.step === 'goal') {
    if (text) next.goals.push(text)
    next.recommendedLevel = recommendLevel(next)
    next.step = 'recommend'
    return {
      draft: next,
      reply: recommendationCopy(next.recommendedLevel),
      suggestions: ['Use this', 'Low', 'Mid', 'High'],
      done: false,
    }
  }

  if (draft.step === 'recommend') {
    next.chosenLevel = parseLevel(lower) ?? next.recommendedLevel ?? 'medium'
    next.step = 'friend'
    return {
      draft: next,
      reply: 'Do you want a trusted contact who can approve a single purchase when you ask? They never get control of your account. You can skip this.',
      suggestions: ['Yes, invite someone', 'Skip for now'],
      done: false,
    }
  }

  if (draft.step === 'friend') {
    next.wantsTrustedContact = /yes|invite|friend/.test(lower)
    next.step = 'consent'
    return {
      draft: next,
      reply: 'Can Impulse store these answers on your account so the extension and the app share them? If you say no, only the restriction level is kept.',
      suggestions: ['Store my answers', 'Only keep the level'],
      done: false,
    }
  }

  if (draft.step === 'consent') {
    next.consentToStore = /store my answers|yes|store/.test(lower)
    next.step = 'done'
    return {
      draft: next,
      reply: 'That is enough to start. You can change every one of these choices later.',
      suggestions: [],
      done: true,
    }
  }

  return { draft, reply: 'Onboarding is already finished.', suggestions: [], done: true }
}

export function preferenceFromDraft(draft: OnboardingDraft): OnboardingPreference {
  const recommended = draft.recommendedLevel ?? recommendLevel(draft)
  return {
    categories: draft.categories,
    triggers: draft.consentToStore ? draft.triggers : [],
    goals: draft.consentToStore ? draft.goals : [],
    recommendedLevel: recommended,
    chosenLevel: draft.chosenLevel ?? recommended,
    wantsTrustedContact: Boolean(draft.wantsTrustedContact),
    consentToStore: Boolean(draft.consentToStore),
  }
}

function recommendationCopy(level: RestrictionLevel): string {
  if (level === 'high') {
    return 'I would start on High. A purchase waits for a pause, and if you have a trusted contact, you can ask them before continuing. You can reject this.'
  }
  if (level === 'low') {
    return 'I would start on Low. A reminder, and an optional moment to reflect. Nothing is held unless you want it held. You can reject this.'
  }
  return 'I would start on Mid. Continuing takes a short wait you configure. You can reject this and pick another level.'
}

function parseLevel(text: string): RestrictionLevel | null {
  if (/\bhigh\b/.test(text)) return 'high'
  if (/\bmid\b|\bmedium\b/.test(text)) return 'medium'
  if (/\blow\b/.test(text)) return 'low'
  if (/use this/.test(text)) return null
  return null
}
