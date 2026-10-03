import { emptyDraft, type OnboardingDraft, type RestrictionLevel } from '@impulse/shared'

let draft: OnboardingDraft = emptyDraft()

export function getDraft(): OnboardingDraft {
  return draft
}

export function setDraft(next: OnboardingDraft): void {
  draft = next
}

export function chooseLevel(level: RestrictionLevel): void {
  draft = { ...draft, chosenLevel: level }
}
