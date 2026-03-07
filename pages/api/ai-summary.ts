import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { answers, results } = req.body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a compassionate clinical AI. A patient completed an Alzheimer's pre-screening. Write a 3-paragraph doctor's report.

Patient: ${answers.name}, Age: ${answers.age}, Gender: ${answers.gender}
MMSE Score: ${results.mmse}/30
Risk Level: ${results.level} (composite score: ${results.total})

Key findings:
- Memory recall: "${answers.memory_recall || "blank"}"
- Orientation: year=${answers.orient_year}, month=${answers.orient_month}, day=${answers.orient_day}
- Serial 7s: ${[answers.s7_1,answers.s7_2,answers.s7_3,answers.s7_4,answers.s7_5].join(", ")}
- Clock drawing score: ${answers.clock_score || "N/A"}/5
- Pentagon copy: ${answers.pentagon_score || "N/A"}/2
- Picture description score: ${answers.picture_describe || "N/A"}/5
- Speech fluency: ${answers.speech_record || "N/A"}/5
- Story recall: name=${answers.sr_name}, day=${answers.sr_day}, forgot=${answers.sr_forgot}, neighbour=${answers.sr_neighbour}
- Family history: ${answers.family_history}
- Memory complaint: ${answers.memory_complaint}

Para 1: Cognitive and visuospatial performance.
Para 2: Language, speech, and memory findings.
Para 3: Risk factors and recommended next steps in warm, plain language.

Under 220 words. No bullet points.`
        }]
      })
    })
    const data = await response.json()
    const summary = data.content?.map((c: any) => c.text || '').join('') || ''
    res.json({ summary })
  } catch (e) {
    res.json({ summary: 'AI summary could not be generated. Please review the scores above.' })
  }
}
