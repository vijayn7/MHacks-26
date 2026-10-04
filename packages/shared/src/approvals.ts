import type { ApprovalStatus } from './types'

export type ApprovalAction = 'approve' | 'decline' | 'cancel' | 'expire'

export function transitionApproval(input: {
  status: ApprovalStatus
  action: ApprovalAction
  now: Date
  expiresAt: Date
  actorIsContact: boolean
  actorIsOwner: boolean
}): { ok: true; status: ApprovalStatus } | { ok: false; code: string } {
  const expired = input.now.getTime() > input.expiresAt.getTime()
  if (input.status === 'pending' && expired && input.action !== 'cancel') {
    return { ok: true, status: 'expired' }
  }
  if (input.status !== 'pending') return { ok: false, code: 'already_resolved' }

  if (input.action === 'expire') return { ok: true, status: 'expired' }

  if (input.action === 'cancel') {
    if (!input.actorIsOwner) return { ok: false, code: 'forbidden' }
    return { ok: true, status: 'canceled' }
  }

  if (!input.actorIsContact) return { ok: false, code: 'forbidden' }
  if (input.action === 'approve') return { ok: true, status: 'approved' }
  if (input.action === 'decline') return { ok: true, status: 'declined' }
  return { ok: false, code: 'forbidden' }
}
