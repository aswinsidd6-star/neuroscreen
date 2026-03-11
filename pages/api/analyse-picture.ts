import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { description, type } = req.body

  if (!description || description.trim().length < 2) {
    return res.json({ score: 0, note: 'No description provided.' })
  }

  let prompt = ''

  if (type === 'picture') {
    prompt = `You are a senior clinical neuropsychologist administering the Boston Cookie Theft Picture Description Test.

The patient was shown the classic Boston Cookie Theft scene which contains ALL of these elements:
PEOPLE: (1) A woman standing at a sink, (2) A boy standing on a stool stealing cookies from a jar in a cupboard, (3) A girl standing nearby watching the boy
ACTIONS: (4) The woman is drying/washing dishes, (5) The boy is reaching into/stealing from the cookie jar, (6) The stool the boy stands on is tipping/falling over, (7) The sink is overflowing with water onto the floor, (8) The woman seems unaware of the overflow
OBJECTS: (9) Cookie jar on a shelf/in cupboard, (10) Stool, (11) Dishes/plate being dried, (12) Window behind the woman, (13) Water overflowing from sink onto floor

Patient's description: "${description}"

DEEPLY ANALYSE what the patient said:
1. COUNT how many of the 13 elements above they mentioned (even approximately — "kid stealing cookies" counts for boy+cookie jar+stealing action)
2. ASSESS narrative quality: Did they describe actions or just list objects? Did they notice the overflow? Did they describe relationships between people?
3. ASSESS fluency: Are sentences complete? Is there word-finding difficulty? Tangential speech?

SCORE 0–5 using STRICT clinical criteria:
- 5: Mentions 9+ elements. Describes actions AND objects. Notices the overflow. Complete sentences. Rich narrative. ("The woman is washing dishes while the sink overflows. A boy is stealing cookies from a jar while standing on a wobbly stool. A girl watches.")
- 4: Mentions 6–8 elements. Describes most key actions. Minor omissions. Good sentence structure.
- 3: Mentions 4–5 elements. Gets the main idea (boy stealing, woman at sink) but misses details like overflow or falling stool. Adequate sentences.
- 2: Mentions only 2–3 elements. Very sparse. Only vague descriptions. ("I see a woman and a child") OR describes things that aren't there.
- 1: Mentions only 1 element OR description is extremely vague ("I see a kitchen scene") with no specific details.
- 0: Completely off-topic, blank, refuses, or describes a completely different scene.

STRICT RULE: A short description under 20 words can score maximum 2.
STRICT RULE: If they only say "I see a woman cooking and a child" → that is score 2, not 3.
STRICT RULE: Do NOT give 3 or above unless they mention at least the boy stealing AND the woman at the sink.

Reply ONLY with JSON (no markdown):
{"score":N,"note":"one detailed clinical sentence naming exactly what elements were mentioned and what was missed"}`

  } else if (type === 'clock') {
    prompt = `You are a clinical neuropsychologist scoring a Clock Drawing Test (CDT), one of the most sensitive tests for Alzheimer's disease.

The patient was asked to draw a clock showing 10:10 (ten past ten / 10 minutes after 10 o'clock).
The patient described their drawing as: "${description}"

DEEPLY ANALYSE what they said about their drawing. Look for:
- Did they mention drawing a circle/round shape?
- Did they mention writing numbers? All 12? Correct positions?
- Did they mention drawing hands/arrows? Where are they pointing?
- Any errors they admitted to?
- Did they say it looked right or wrong?

SCORE 0–5 using STRICT clinical criteria:

5/5 — PERFECT: Circle drawn. All 12 numbers present and correctly placed around the circle (1 at top-right, 12 at top, 6 at bottom etc). Two hands: one pointing to 10, one pointing to 2 (for 10:10). Patient describes it as correct with no errors.

4/5 — MINOR ERROR: Everything above BUT one small mistake: e.g. numbers slightly crowded on one side, or hands very slightly off but clearly intended for 10 and 2. Patient says it's mostly right.

3/5 — MODERATE ERROR: Circle and numbers present BUT significant hand error: e.g. hands pointing to wrong numbers (like 10 and 10 instead of 10 and 2), or only one hand drawn, or numbers present but poorly spaced. Patient acknowledges hands may be wrong.

2/5 — SIGNIFICANT ERROR: Circle drawn BUT numbers severely wrong (missing several, wrong order, all bunched together) OR both hands missing/completely wrong position. Patient describes notable difficulty.

1/5 — SEVERE ERROR: Attempted a clock but result is barely recognisable. Very few correct numbers. No proper hands. Patient describes significant struggle.

0/5 — UNABLE: Patient could not draw a clock, drew scribbles, drew something completely different, or refused.

CRITICAL RULES:
- NEVER give 3+ if the patient says the hands are missing or they could not do the hands
- NEVER give 5 if any error is mentioned at all
- NEVER give 3+ if the patient says they struggled significantly
- If patient says "I drew a clock with all numbers and hands at 10 and 2" → that is 5/5
- If patient says "I drew it but I'm not sure about the hands" → that is 3/5
- If patient says "I drew a circle with numbers but couldn't do the hands properly" → that is 2/5

Reply ONLY with JSON (no markdown):
{"score":N,"note":"one clinical sentence explaining the score based on exactly what the patient described"}`

  } else if (type === 'pentagon') {
    prompt = `You are a clinical neuropsychologist scoring the Intersecting Pentagons test from the MMSE.

The patient was asked to copy two overlapping pentagons (each with 5 sides/corners, overlapping each other).
The patient described their drawing as: "${description}"

ANALYSE deeply what they said:
- Did they draw TWO shapes or just one?
- Do the shapes OVERLAP/intersect?
- Do the shapes have roughly 5 sides/corners (pentagon shape)?
- How similar is it to the original?

SCORE 0–2 using STRICT criteria:

2/2 — CORRECT: Two pentagon-like shapes clearly drawn. They overlap each other (creating an intersection). Each shape has approximately 5 sides. Resembles the original.

1/2 — PARTIAL: Two shapes are visible AND they overlap, BUT the shapes don't look like pentagons (too round, too few sides, irregular). OR the shapes have 5 sides but barely overlap.

0/2 — INCORRECT: Only one shape drawn. No overlap present. Completely wrong shape. Could not copy it. Scribbles.

CRITICAL RULES:
- If patient only drew one shape → 0/2
- If patient drew two shapes but they don't overlap → 0/2  
- If patient says "I drew two shapes overlapping" → minimum 1/2
- If patient says "I drew two five-sided shapes overlapping like the original" → 2/2

Reply ONLY with JSON (no markdown):
{"score":N,"note":"one clinical sentence explaining the score"}`
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
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json({ score: parsed.score ?? 0, note: parsed.note ?? 'Analysis complete.' })
  } catch {
    res.json({ score: 0, note: 'Analysis could not be completed. Please show results to a doctor.' })
  }
}
