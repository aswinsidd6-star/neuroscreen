import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { description } = req.body
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 150,
        messages: [{ role: 'user', content: `Patient described a kitchen scene (woman cooking, child reaching for cookie jar, sink possibly overflowing).
Patient description: "${description}"
Rate 0-5: 5=rich detail+narrative+fluent, 3=adequate, 1=very sparse, 0=off-topic.
Reply ONLY with JSON: {"score":N,"note":"one short sentence"}` }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const parsed = JSON.parse(txt.replace(/```json|```/g, '').trim())
    res.json({ score: parsed.score ?? 3, note: parsed.note ?? 'Description recorded.' })
  } catch {
    res.json({ score: 3, note: 'Description recorded.' })
  }
}
