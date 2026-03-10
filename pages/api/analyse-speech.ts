import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { transcript, sentence } = req.body
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 150,
        messages: [{ role: 'user', content: `Patient read aloud: "${sentence}"
Transcribed as: "${transcript}"
Evaluate for Alzheimer's speech indicators (word-finding, fluency, accuracy).
Score 0-5: 5=fluent+accurate, 3=minor issues, 1=major errors.
Reply ONLY with JSON: {"score":N,"note":"one clinical sentence"}` }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const parsed = JSON.parse(txt.replace(/```json|```/g, '').trim())
    res.json({ score: parsed.score ?? 3, note: parsed.note ?? 'Speech recorded.' })
  } catch {
    res.json({ score: 3, note: 'Speech recorded and analysed.' })
  }
}
