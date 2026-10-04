import { aiEchoSchema, fallbackSummary, summaryIsFaithful, type InsightStats } from '@impulse/shared'

export type AiConfig = { apiKey?: string; baseUrl?: string; model?: string }

export async function summarizeStats(stats: InsightStats, config: AiConfig, fetcher: typeof fetch = fetch): Promise<{ summary: string; source: 'ai' | 'fallback' }> {
  const fallback = fallbackSummary(stats)
  if (!config.apiKey) return { summary: fallback, source: 'fallback' }
  try {
    const response = await fetcher(`${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.model ?? 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write a short reflection about spending pauses. Return JSON {summary, echo:{interventions, continued, saved, abandoned}}. The echo must copy the provided counts exactly. Do not invent dollars. Do not diagnose. Do not give financial advice.',
          },
          { role: 'user', content: JSON.stringify(stats) },
        ],
      }),
    })
    if (!response.ok) return { summary: fallback, source: 'fallback' }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const parsed = aiEchoSchema.parse(JSON.parse(body.choices?.[0]?.message?.content ?? ''))
    if (!summaryIsFaithful(stats, parsed.summary, parsed.echo)) return { summary: fallback, source: 'fallback' }
    return { summary: parsed.summary, source: 'ai' }
  } catch {
    return { summary: fallback, source: 'fallback' }
  }
}
