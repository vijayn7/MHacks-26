// Only explicit shopper opt-outs earn points. Legacy purchase_dropped events
// may include automatic friend decisions and must not count.
export function optOutIds(events: readonly { id: string; type: string }[]): string[] {
  return [...new Set(events.filter(e => e.type === 'impulse_opt_out').map(e => e.id))];
}
