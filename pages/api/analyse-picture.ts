import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { description, type } = req.body

  // If completely empty
  if (!description || description.trim().length < 2) {
    return res.json({ score: 0, note: 'No description was provided.' })
  }

  let prompt = ''

  if (type === 'picture') {
    prompt = `You are a clinical neuropsychologist scoring the Boston Cookie Theft Picture Description Test.

The picture shows a kitchen scene with these elements:
- A WOMAN standing at a sink washing/drying dishes
- The sink is OVERFLOWING with water onto the floor
- A BOY standing on a STOOL reaching up to steal COOKIES from a jar in a cupboard
- The STOOL is tipping over / wobbling
- A GIRL standing nearby watching the boy
- A WINDOW on the wall
- DISHES and plates

Patient's description: "${description}"

YOUR JOB: Read what the patient said and count how many things from the scene they mentioned.

SCORING — be FAIR and GENEROUS. If they mentioned it even approximately, count it:
- "child" or "kid" or "boy" = boy counted
- "cookies" or "biscuits" or "jar" = cookie jar counted
- "water" or "flood" or "sink" or "tap" = sink/overflow counted
- "woman" or "lady" or "mother" = woman counted
- "stool" or "chair" or "standing on something" = stool counted
- "girl" or "another child" = girl counted
- "stealing" or "reaching" or "taking" = stealing action counted

SCORE:
5 = mentioned 7+ elements with good detail and described actions
4 = mentioned 5-6 elements, described some actions
3 = mentioned 3-4 elements, got the main idea
2 = mentioned 2 elements vaguely
1 = mentioned only 1 element OR very vague like "I see a kitchen"
0 = said nothing relevant, completely wrong, or blank

IMPORTANT: Even "a boy stealing cookies and a woman at the sink" = score 3 minimum.
Do NOT give 0 unless the answer is truly blank or completely irrelevant.

Reply ONLY with JSON: {"score":N,"note":"one sentence saying what elements the patient mentioned and what they missed"}`

  } else if (type === 'clock') {
    prompt = `You are a clinical neuropsychologist scoring a Clock Drawing Test.

The patient was asked to draw a clock showing 10:10 (ten past ten).
The patient described their clock drawing: "${description}"

SCORE FAIRLY:
5 = Perfect: circle + all 12 numbers + two hands pointing to 10 and 2. No errors.
4 = Nearly perfect: circle + numbers + hands present, one small error
3 = Partial: circle + numbers present BUT hands wrong or missing one hand
2 = Poor: circle drawn but numbers wrong AND hands missing or wrong
1 = Very poor: attempted but barely looks like a clock
0 = Could not draw at all or drew something completely different

FAIR RULES:
- "I drew a circle with numbers and two hands" = minimum score 4
- "I drew a clock" with no errors mentioned = score 4
- "I drew it but hands might be off" = score 3
- "I struggled" or "couldn't do the hands" = score 2
- Do NOT give 0 unless they truly could not draw anything

Reply ONLY with JSON: {"score":N,"note":"one clinical sentence explaining the score"}`

  } else if (type === 'pentagon') {
    prompt = `You are a clinical neuropsychologist scoring the Intersecting Pentagons test.

The patient was asked to copy two overlapping five-sided shapes.
The patient described their drawing: "${description}"

SCORE FAIRLY:
2 = Drew two shapes that overlap, each roughly five-sided
1 = Drew two shapes that overlap BUT not clearly five-sided OR barely overlap
0 = Only one shape, shapes do not overlap, could not do it

FAIR RULES:
- "I drew two shapes overlapping" = score 1 minimum
- "I drew two five-sided shapes that overlap" = score 2
- "I could only draw one shape" = score 0

Reply ONLY with JSON: {"score":N,"note":"one sentence explaining the score"}`
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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    let finalScore = parsed.score ?? 0
    const wordCount = description.trim().split(/\s+/).length

    // Safety net — if AI gives 0 but person wrote real words, give at least 1
    if (finalScore === 0 && wordCount >= 4) {
      finalScore = 1
    }

    // Extra safety for picture — check keywords directly
    if (type === 'picture' && finalScore <= 1 && wordCount >= 3) {
      const desc = description.toLowerCase()
      const keywords = ['woman','man','boy','girl','child','kid','cookie','water','sink','stool','chair','kitchen','dish','overflow','steal','reach','wash','window','jar','tap','flood']
      const matched = keywords.filter((k: string) => desc.includes(k)).length
      if (matched >= 5 && finalScore < 4) finalScore = Math.max(finalScore, 4)
      else if (matched >= 3 && finalScore < 3) finalScore = Math.max(finalScore, 3)
      else if (matched >= 2 && finalScore < 2) finalScore = Math.max(finalScore, 2)
      else if (matched >= 1 && finalScore < 1) finalScore = 1
    }

    res.json({
      score: Math.min(type === 'pentagon' ? 2 : 5, Math.max(0, finalScore)),
      note: parsed.note ?? 'Analysis complete.'
    })
  } catch {
    // Fallback keyword scoring if AI fails completely
    const desc = (description || '').toLowerCase()
    let score = 0
    let note = 'Analysis complete.'

    if (type === 'picture') {
      const keywords = ['woman','man','boy','girl','child','kid','cookie','water','sink','stool','overflow','steal','reach','wash','dish','window']
      const matched = keywords.filter((k: string) => desc.includes(k)).length
      score = matched >= 7 ? 5 : matched >= 5 ? 4 : matched >= 3 ? 3 : matched >= 2 ? 2 : matched >= 1 ? 1 : 0
      note = `Identified ${matched} scene elements in description.`
    } else if (type === 'clock') {
      const hasCircle = desc.includes('circle') || desc.includes('round') || desc.includes('clock')
      const hasNumbers = desc.includes('number') || desc.includes('12') || desc.includes('1')
      const hasHands = desc.includes('hand') || desc.includes('arrow') || desc.includes('pointing')
      score = hasCircle && hasNumbers && hasHands ? 4 : hasCircle && hasNumbers ? 3 : hasCircle ? 2 : desc.length > 5 ? 1 : 0
      note = 'Clock drawing evaluated from description.'
    } else if (type === 'pentagon') {
      const hasTwo = desc.includes('two') || desc.includes('both') || desc.includes('2')
      const hasOverlap = desc.includes('overlap') || desc.includes('together') || desc.includes('cross')
      score = hasTwo && hasOverlap ? 2 : hasTwo || hasOverlap ? 1 : 0
      note = 'Pentagon drawing evaluated from description.'
    }

    res.json({ score, note })
  }
}