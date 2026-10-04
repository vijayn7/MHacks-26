import type { SendSms } from '@impulse/api'

export const sendSms: SendSms = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) throw new Error('SMS is not configured.')
  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
  if (!response.ok) throw new Error('SMS delivery failed.')
}
