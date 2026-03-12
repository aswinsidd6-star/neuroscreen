import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { transcript, sentence } = req.body

  if (!transcript || transcript.trim().length < 2) {
    return res.json({ score: 0, note: 'No speech was captured — unable to evaluate.' })
  }

  const prompt = `You are a clinical speech-language pathologist evaluating a patient's spoken reading for Alzheimer's screening in India.

TARGET SENTENCE (what the patient was asked to read):
"${sentence}"

WHAT THE PATIENT ACTUALLY SAID (captured by microphone):
"${transcript}"

IMPORTANT CONTEXT:
- Patients may have Indian accents — speech recognition may mishear some words
- Patients may be elderly with slower speech
- Patients may skip small words like "the", "so", "was" — that is normal
- Speech recognition is imperfect — "sunny" might be captured as "Sunny", "children" as "childrens"
- Be GENEROUS and FAIR — reward what they got RIGHT, not just penalise what was wrong

SCORE 1 TO 5 — here are MANY examples for each level:

SCORE 5 — Said the sentence perfectly or almost perfectly. All important words present. Fluent.
Target: "The weather was warm and sunny, so the children played happily in the park all afternoon."
Examples of score 5 transcripts:
- "the weather was warm and sunny so the children played happily in the park all afternoon"
- "the weather was warm and sunny so the children played happily in the park all afternoon."
- "The weather was warm and Sunny so the children played happily in the park all afternoon"
- "weather was warm and sunny so the children played happily in the park all afternoon" (dropped "the")
- "the weather was warm and sunny so children played happily in the park all afternoon" (dropped "the" before children)
- "the weather was warm and sunny, so the children played happy in the park all afternoon" (happily→happy, minor)

SCORE 4 — Said most of the sentence. Missed 1-2 small words or had minor pronunciation issue. Still clearly read the sentence.
Examples of score 4 transcripts:
- "the weather was warm and sunny the children played happily in the park all afternoon" (missed "so")
- "weather warm and sunny so the children played happily in the park all afternoon" (missed "was", "the")
- "the weather was warm sunny so the children played happily in park all afternoon" (missed "and", "the")
- "the weather was warm and sunny so the children played in the park all afternoon" (missed "happily")
- "the weather was warm and sunny so children played happily in the park afternoon" (missed "all")
- "the weather was warm and sunny so the childrens played happily in the park all afternoon" (childrens vs children, accent)

SCORE 3 — Got the main content of the sentence. Missed several small/medium words. Still recognisable as the same sentence.
Examples of score 3 transcripts:
- "the weather was warm and sunny children played happily in park" (missed several words)
- "weather sunny so the children played in the park afternoon" (missed multiple words)
- "the weather was warm the children played happily in the park" (missed "sunny", "so", "all afternoon")
- "warm and sunny children played happily park" (missing many function words but key content there)
- "the weather sunny so children play in park all afternoon" (was→is, played→play, minor tense)
- "weather was warm sunny children played park" (core meaning preserved)
- "the weather warm sunny so the kids played happily in the park" (children→kids, minor substitution)

SCORE 2 — Said some words from the sentence but missed many. Only partial meaning. Clearly struggled.
Examples of score 2 transcripts:
- "the weather sunny children park" (only 4-5 isolated words, meaning fragmentary)
- "warm and sunny played in the park" (missing subject, verb, many words)
- "children played in the park" (only end of sentence, missed beginning entirely)
- "the weather was warm" (only said first part, stopped)
- "sunny children played" (3 content words, rest missing)
- "the weather and the children in the park" (no action words, mixed up)
- "so the children happily afternoon" (random words from sentence)

SCORE 1 — Said very few correct words. Sentence barely recognisable. Major confusion or difficulty.
Examples of score 1 transcripts:
- "the weather" (only 2 words, stopped)
- "children park" (only 2 isolated words)
- "warm sunny" (only 2 adjectives)
- "the the children" (repetition, very little content)
- "I cannot" (gave up)
- "weather" (single word only)
- Completely different sentence with maybe 1 matching word

SCORE 0 — Said nothing from the sentence at all. Completely different words.
Examples of score 0 transcripts:
- "hello how are you" (completely different)
- "I don't know" (did not read)
- "testing testing" (not an attempt)
- Transcript has zero words from the target sentence

NOW evaluate: 
TARGET: "${sentence}"
TRANSCRIPT: "${transcript}"

Step 1: List the key content words from target (weather, warm, sunny, children, played, happily, park, afternoon)
Step 2: Check which ones appear in transcript (even approximate matches count)
Step 3: Check fluency — is it mostly complete or very fragmented?
Step 4: Give a fair score

Be GENEROUS. If the patient said most of the sentence, give 4-5.
If they said the main words, give 3.
Only give 1-2 if they clearly struggled and missed most of the sentence.

Reply ONLY with JSON (no markdown):
{"score":N,"note":"one warm clinical sentence explaining what the patient read correctly and what was missed"}`

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
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Word match calculation as safety check
    const targetWords = sentence.toLowerCase().replace(/[.,!?]/g,'').split(' ').filter((w:string) => w.length > 2)
    const transcriptLower = transcript.toLowerCase().replace(/[.,!?]/g,'')
    const matchedWords = targetWords.filter((w:string) => transcriptLower.includes(w))
    const matchPct = matchedWords.length / targetWords.length

    let finalScore = parsed.score ?? 0

    // Safety boosts — if AI underscoredst but word match is high
    if (matchPct >= 0.95 && finalScore < 5) finalScore = 5
    else if (matchPct >= 0.85 && finalScore < 4) finalScore = 4
    else if (matchPct >= 0.65 && finalScore < 3) finalScore = 3
    else if (matchPct >= 0.40 && finalScore < 2) finalScore = 2
    else if (matchPct >= 0.15 && finalScore < 1) finalScore = 1

    // Safety floor — if they said real words, minimum 1
    const wordCount = transcript.trim().split(/\s+/).length
    if (finalScore === 0 && wordCount >= 2) finalScore = 1

    res.json({
      score: Math.min(5, Math.max(0, finalScore)),
      note: parsed.note ?? `Speech matched approximately ${Math.round(matchPct * 100)}% of target words.`
    })

  } catch {
    // Full fallback — pure word matching if AI fails
    const targetWords = sentence.toLowerCase().replace(/[.,!?]/g,'').split(' ').filter((w:string) => w.length > 2)
    const transcriptLower = (transcript || '').toLowerCase().replace(/[.,!?]/g,'')
    const matched = targetWords.filter((w:string) => transcriptLower.includes(w)).length
    const pct = matched / targetWords.length

    // Also check for key content words specifically
    const keyWords = ['weather','warm','sunny','children','played','happily','park','afternoon']
    const keyMatched = keyWords.filter((k:string) => transcriptLower.includes(k)).length
    const keyPct = keyMatched / keyWords.length

    const bestPct = Math.max(pct, keyPct)
    const score = bestPct >= 0.90 ? 5
                : bestPct >= 0.75 ? 4
                : bestPct >= 0.55 ? 3
                : bestPct >= 0.30 ? 2
                : transcript.trim().length > 3 ? 1 : 0

    res.json({
      score,
      note: `Speech evaluated — matched ${Math.round(bestPct * 100)}% of key words from the target sentence.`
    })
  }
}