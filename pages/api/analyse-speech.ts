import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { transcript, sentence } = req.body

  // If no transcript captured at all
  if (!transcript || transcript.trim().length < 3) {
    return res.json({ score: 0, note: 'No speech was captured — unable to evaluate.' })
  }

  const prompt = `You are a clinical speech-language pathologist evaluating a patient's speech for Alzheimer's screening.

TARGET SENTENCE the patient was asked to read:
"${sentence}"

WHAT THE PATIENT ACTUALLY SAID (transcribed by speech recognition):
"${transcript}"

COMPARE them word by word and SCORE 0–5 using these STRICT criteria:

SCORING RULES:
- 5: Patient said the sentence almost identically. All key words present. Fluent. Natural pace. Minor word like "and"→"and sunny" difference is fine.
- 4: Patient said all major content words correctly but missed 1 small word OR slightly reordered. Still clearly fluent.
- 3: Patient got most of the sentence but missed 2-3 words OR hesitated noticeably OR substituted 1-2 words with similar meaning.
- 2: Patient missed several words, said them out of order, OR repeated sections. Meaning partially lost.
- 1: Patient said very few correct words. Sentence barely recognisable. Many substitutions or omissions.
- 0: Patient said nothing relevant or transcript is completely different from target.

IMPORTANT — DO NOT default to 3. Score honestly based on the actual comparison.
If the transcript matches the target sentence closely → give 4 or 5.
If "the weather was warm and sunny" appears in transcript → that alone is a strong 4+.
Look for: word omissions, word substitutions, wrong word order, repetitions.

TARGET: "${sentence}"
TRANSCRIPT: "${transcript}"

Reply ONLY with JSON (no markdown, no extra text):
{"score":N,"note":"one clinical sentence explaining exactly what matched and what did not"}`

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Extra safety: if transcript closely matches, boost score
    const targetWords = sentence.toLowerCase().split(' ')
    const transcriptLower = transcript.toLowerCase()
    const matchedWords = targetWords.filter(w => transcriptLower.includes(w.replace(/[.,]/g,'')))
    const matchPct = matchedWords.length / targetWords.length

    let finalScore = parsed.score ?? 0
    // If AI gave 3 but word match is >85%, boost to 4
    if (finalScore === 3 && matchPct >= 0.85) finalScore = 4
    // If AI gave 3 but word match is >95%, boost to 5
    if (finalScore <= 4 && matchPct >= 0.95) finalScore = 5

    res.json({
      score: Math.min(5, Math.max(0, finalScore)),
      note: parsed.note ?? `Speech matched ${Math.round(matchPct*100)}% of target words.`
    })
  } catch {
    // On error, do basic word matching instead of defaulting to 3
    const targetWords = sentence.toLowerCase().split(' ')
    const transcriptLower = (transcript||'').toLowerCase()
    const matched = targetWords.filter(w => transcriptLower.includes(w.replace(/[.,]/g,''))).length
    const pct = matched / targetWords.length
    const score = pct >= 0.95 ? 5 : pct >= 0.85 ? 4 : pct >= 0.65 ? 3 : pct >= 0.4 ? 2 : 1
    res.json({ score, note: `Speech captured and evaluated — matched ${Math.round(pct*100)}% of target words.` })
  }
}
