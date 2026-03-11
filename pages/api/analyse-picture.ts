import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { description, type } = req.body

  let prompt = ''

  if (type === 'picture') {
    prompt = `You are a clinical neuropsychologist scoring the Boston Cookie Theft picture description test.
The patient described a kitchen scene (woman at sink possibly overflowing, boy standing on stool stealing cookies from jar, girl watching).
Patient's description: "${description}"

SCORE 0-5 using these STRICT clinical criteria:
- 5: Names ALL elements: woman+sink+overflow+boy+stool+cookie jar+girl. Uses complete sentences. Describes actions fluently.
- 4: Names most elements (5-6). Minor omissions. Sentences reasonably complete.
- 3: Names 3-4 elements. Some fragmentation. Adequate but not rich.
- 2: Names only 1-2 elements OR description is very fragmented/sparse.
- 1: Very minimal. Only 1 vague observation. Almost no detail.
- 0: Off-topic, refuses, or completely blank.

IMPORTANT: If description is under 15 words, max score is 2. If blank or "nothing", score is 0.

Reply ONLY with JSON: {"score":N,"note":"one clinical sentence"}`

  } else if (type === 'clock') {
    prompt = `You are a clinical neuropsychologist scoring a clock drawing test.
The patient was asked to draw a clock showing 10:10.
Patient described their drawing: "${description}"

SCORE 0-5 STRICTLY:
- 5: Circle + all 12 numbers correct + hands pointing to 10 and 2. Perfect.
- 4: Circle + all numbers + hands present but one minor error.
- 3: Circle + numbers present BUT hands significantly wrong or missing one hand.
- 2: Circle drawn BUT numbers severely wrong OR both hands wrong/missing.
- 1: Attempted but severely distorted. Numbers disorganised. Hands absent.
- 0: Cannot draw clock. Scribbles. Refuses. Blank.

NEVER give 3 or above if hands are wrong or missing.
NEVER give 5 if any error is mentioned.
If they say they struggled → score 1 or 2 maximum.

Reply ONLY with JSON: {"score":N,"note":"one clinical sentence"}`

  } else if (type === 'pentagon') {
    prompt = `You are a clinical neuropsychologist scoring a pentagon copying test.
The patient was asked to copy two overlapping pentagons.
Patient described their drawing: "${description}"

SCORE 0-2 STRICTLY:
- 2: Both pentagons drawn, they overlap, each has 5 sides. Correct.
- 1: Two shapes overlap BUT not clearly 5 sides each.
- 0: Only one shape, no overlap, scribbles, or could not do it.

Reply ONLY with JSON: {"score":N,"note":"one clinical sentence"}`

  } else if (type === 'speech') {
    prompt = `You are a clinical neuropsychologist scoring speech fluency.
The patient read this sentence: "The weather was warm and sunny, so the children played happily in the park all afternoon."
Patient described how their speech went: "${description}"

SCORE 0-5 STRICTLY:
- 5: Clear, fluent, no hesitation, normal pace, all words correct.
- 4: Mostly fluent, one minor hesitation, self-corrected.
- 3: Noticeable hesitation on 2-3 words OR slightly slow.
- 2: Multiple hesitations, halting, several word errors.
- 1: Very halting, fragmented, many errors.
- 0: Unable to read, completely garbled, refused.

Do NOT default to 3. Use the full range based on what they describe.

Reply ONLY with JSON: {"score":N,"note":"one clinical sentence"}`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json({ score: parsed.score ?? 0, note: parsed.note ?? 'Analysis complete.' })
  } catch {
    res.json({ score: 0, note: 'Analysis recorded.' })
  }
}