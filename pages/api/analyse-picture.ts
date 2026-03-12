import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { description, type } = req.body

  if (!description || description.trim().length < 1) {
    return res.json({ score: 0, note: 'No description was provided.' })
  }

  let prompt = ''

  if (type === 'picture') {
    prompt = `You are a clinical neuropsychologist scoring the Boston Cookie Theft Picture Description Test for an INDIAN POPULATION screening test.

The picture shows a kitchen scene:
- A WOMAN at a sink washing/drying dishes
- The sink is OVERFLOWING — water spilling onto the floor
- A BOY standing on a STOOL reaching up stealing COOKIES from a jar in a cupboard
- The STOOL is tipping/falling over
- A GIRL standing watching the boy
- A WINDOW on the wall
- DISHES and plates visible

Patient said: "${description}"

IMPORTANT CONTEXT:
- Patients may be elderly, uneducated, or describe in broken English
- Patients may use Indian English ("aunty", "amma", "child", "small boy", "vessel", "tumbler", "biscuits" instead of cookies)
- Short answers are okay — score based on what they noticed, not how they said it
- Even one correct observation deserves a score of 1

SCORE 1 TO 5 — here are MANY examples for each level so you understand the range:

SCORE 5 — Rich, detailed description. Mentioned 6 or more elements. Described actions, relationships, problems.
Examples of score 5 answers:
- "A woman is washing dishes at the sink but the water is overflowing onto the floor. A boy is standing on a stool stealing cookies from a jar in the cupboard. The stool is about to fall. A girl is watching the boy steal."
- "Lady washing utensils, water is flooding. Boy climbing stool to take biscuits from jar. Girl watching. Stool falling down."
- "Amma at sink, water spilling. Boy on chair stealing cookies, stool tipping. Girl standing and looking."
- "Woman drying plate, sink overflow on floor. Child on stool reaching cookie jar, another child watching him steal."
- "I see a woman near the tap with water overflowing. A boy is on a stool taking cookies and the stool is tilting. A girl is watching."

SCORE 4 — Good description. Mentioned 4-5 elements. Got main actions but missed 1-2 things.
Examples of score 4 answers:
- "A woman washing dishes, water overflowing. A boy stealing cookies while standing on a stool. A girl watching."
- "Lady at sink with overflow. Boy on stool taking biscuits from cupboard. Girl nearby."
- "Woman near tap, water spilling on floor. Boy climbing to get cookies. Another child watching."
- "Aunty washing vessels, water is coming out. Boy stealing biscuits, standing on stool."
- "Woman at sink. Boy on stool stealing cookies from jar. Stool falling. Girl watching."

SCORE 3 — Noticed main story. Mentioned 3 elements. Got the key idea but missed several details.
Examples of score 3 answers:
- "A boy is stealing cookies and a woman is at the sink"
- "Boy taking biscuits from jar. Lady washing dishes. Water overflowing."
- "Child stealing cookies. Woman at sink. Stool tipping."
- "Boy on stool getting cookies. Woman washing. Another child there."
- "Kid climbing and taking something. Lady doing dishes. Water coming out."
- "Boy stealing. Woman at tap. Girl watching."
- "A child is taking cookies from a box and a woman is washing utensils"
- "Small boy getting biscuits. Amma near sink."

SCORE 2 — Basic observation. Mentioned 1-2 things but vague or incomplete.
Examples of score 2 answers:
- "I see a woman and a child in the kitchen"
- "A boy and a lady"
- "Someone stealing cookies"
- "Water is overflowing in the kitchen"
- "A child is climbing something"
- "Lady washing, boy doing something"
- "Kitchen scene with people"
- "Boy and girl in kitchen"
- "Woman doing household work"
- "Child is taking something from shelf"

SCORE 1 — Very vague. Only mentioned the setting or one very general thing. No specific details.
Examples of score 1 answers:
- "I see a kitchen"
- "A house"
- "Some people"
- "A room"
- "People doing things"
- "I see a family"
- "Looks like a home"
- "I don't know exactly but I see some people in a room"
- "A lady is there"
- "Something is happening"

SCORE 0 — Blank, completely off-topic, or says they cannot see anything.
Examples of score 0 answers:
- "" (empty)
- "I don't know"
- "I cannot see"
- "I see a car" (completely wrong)
- "Nothing"

NOW score the patient's description: "${description}"

Be GENEROUS and FAIR. When in doubt, give the HIGHER score.
If the patient is elderly or using simple language, be extra generous.
Short answers that correctly identify the main scene elements should score 3.

Reply ONLY with JSON (no markdown, no extra text):
{"score":N,"note":"one warm clinical sentence acknowledging what they got right and what was missed"}`

  } else if (type === 'clock') {
    prompt = `You are a clinical neuropsychologist scoring a Clock Drawing Test for an Indian population screening.

The patient drew a clock showing 10:10 and described their drawing: "${description}"

SCORE 1 TO 5 with many possible ways to achieve each score:

SCORE 5 — Perfect clock. Circle + all 12 numbers in right places + two hands clearly at 10 and 2.
Examples:
- "I drew a circle, put all numbers 1 to 12, drew two hands pointing to 10 and 2"
- "Circle with all numbers, hands at 10:10"
- "Drew proper clock with numbers and hands showing ten past ten"
- "Round shape, all 12 numbers, two arrows at 10 and 2"

SCORE 4 — Nearly perfect. Minor issue only.
Examples:
- "I drew the clock with all numbers and hands, but the numbers are a little crowded"
- "Circle with numbers and two hands, hands are slightly off but mostly right"
- "Drew a clock, all numbers there, hands roughly at 10 and 2 but not perfect"
- "Clock with numbers, hands at 10 and 2 but 12 is at wrong position slightly"

SCORE 3 — Decent attempt. Circle and numbers done but hands wrong or missing one.
Examples:
- "I drew a circle and wrote all numbers but I'm not sure the hands are right"
- "Clock with numbers but only drew one hand"
- "Circle with numbers, put hands but they might be pointing wrong"
- "Drew the clock, numbers okay, but hands confused me"
- "Circle with numbers 1-12, hands at 10 and 10 instead of 10 and 2"

SCORE 2 — Partial attempt. Circle exists but numbers or hands have major problems.
Examples:
- "I drew a circle but couldn't place all the numbers correctly"
- "Circle is there but numbers are all on one side"
- "Drew circle and some numbers but couldn't draw the hands"
- "I made a clock but the numbers are missing some and no hands"
- "Circle drawn, only wrote a few numbers, no hands"

SCORE 1 — Very poor attempt. Tried but result looks nothing like a clock.
Examples:
- "I tried to draw but it doesn't look like a clock"
- "I drew something but couldn't do the numbers or hands"
- "I made a shape but very rough"
- "Drew a circle only, nothing inside"
- "Could not draw properly, just scribbles"

SCORE 0 — Could not draw at all.
Examples:
- "I could not draw"
- "I don't know how to draw a clock"
- "I left it blank"

Score the patient's description: "${description}"
Be fair. If they tried and described a reasonable attempt, give them appropriate credit.

Reply ONLY with JSON: {"score":N,"note":"one sentence explaining what they drew well and what was wrong"}`

  } else if (type === 'pentagon') {
    prompt = `You are scoring the Intersecting Pentagons test for an Indian population screening.

The patient was asked to copy two overlapping five-sided shapes.
Patient described their drawing: "${description}"

SCORE 0, 1, or 2:

SCORE 2 — Two five-sided shapes that clearly overlap. Resembles original.
Examples:
- "I drew two five-sided shapes overlapping each other"
- "Two pentagons crossing each other like the original"
- "Drew two shapes with five sides, they overlap in the middle"
- "Two shapes overlapping, each has five corners"
- "I copied the shapes, both overlap and have five sides"

SCORE 1 — Two shapes that overlap but not clearly five-sided, OR five-sided but barely overlap.
Examples:
- "I drew two shapes overlapping but they look more like squares"
- "Two shapes crossing but I couldn't make them five-sided"
- "Drew two overlapping shapes, not sure about the sides"
- "Two shapes, they touch a little"
- "I drew two shapes but they don't look exactly like the picture"
- "Two five-sided shapes but they barely overlap"

SCORE 0 — Only one shape, no overlap, or could not do it.
Examples:
- "I could only draw one shape"
- "I drew two shapes but they don't overlap"
- "I couldn't copy it"
- "Drew something but nothing like the original"
- "Left it blank"

Score the patient's description: "${description}"

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
        max_tokens: 250,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    const txt = data.content?.map((c: any) => c.text || '').join('') || '{}'
    const clean = txt.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    let finalScore = parsed.score ?? 0
    const wordCount = description.trim().split(/\s+/).length

    // Safety net — real words written = never 0 unless truly blank
    if (finalScore === 0 && wordCount >= 3) finalScore = 1

    // Extra keyword safety for picture
    if (type === 'picture') {
      const desc = description.toLowerCase()
      const highKeywords = ['overflow','overflowing','spill','flood','stool','tipping','falling','stealing','reaching','girl','watching']
      const midKeywords  = ['woman','lady','aunty','amma','mother','boy','child','kid','cookie','biscuit','jar','sink','tap','water','dish','vessel','tumbler','wash','kitchen']
      const highMatched = highKeywords.filter((k:string) => desc.includes(k)).length
      const midMatched  = midKeywords.filter((k:string) => desc.includes(k)).length
      const totalMatched = highMatched * 2 + midMatched

      // Only override if AI severely underscoredst
      if (finalScore === 0 && totalMatched >= 1) finalScore = 1
      if (finalScore <= 1 && totalMatched >= 4) finalScore = 2
      if (finalScore <= 2 && totalMatched >= 7) finalScore = 3
      if (finalScore <= 3 && totalMatched >= 11) finalScore = 4
      if (finalScore <= 4 && totalMatched >= 15) finalScore = 5
    }

    const maxScore = type === 'pentagon' ? 2 : 5
    res.json({
      score: Math.min(maxScore, Math.max(0, finalScore)),
      note: parsed.note ?? 'Analysis complete.'
    })

  } catch {
    // Full fallback — keyword scoring if AI completely fails
    const desc = (description || '').toLowerCase()
    let score = 0
    let note = ''

    if (type === 'picture') {
      const elements: string[][] = [
        ['woman','lady','aunty','amma','mother'],
        ['boy','child','kid','son','small boy'],
        ['cookie','biscuit','jar','tin'],
        ['stool','chair','ladder','standing on'],
        ['sink','tap','water','overflow','flood','spill'],
        ['girl','daughter','watching','another child'],
        ['dish','plate','vessel','tumbler','washing'],
        ['window'],
        ['steal','taking','reaching','climbing'],
        ['falling','tipping','wobbling'],
      ]
      const matched = elements.filter(group => group.some((k:string) => desc.includes(k))).length
      score = matched >= 7 ? 5 : matched >= 5 ? 4 : matched >= 3 ? 3 : matched >= 2 ? 2 : matched >= 1 ? 1 : 0
      note = `Identified ${matched} scene elements. ${matched < 5 ? 'Try to describe more details like the water overflowing and the stool tipping.' : 'Good observation of the scene.'}`
    } else if (type === 'clock') {
      const hasCircle  = /circle|round|oval|clock/.test(desc)
      const hasNumbers = /number|1|2|3|12|digit/.test(desc)
      const hasHands   = /hand|arrow|point|needle|minute|hour/.test(desc)
      const hasError   = /wrong|not sure|couldn't|cannot|missed|off/.test(desc)
      score = hasCircle && hasNumbers && hasHands && !hasError ? 4
            : hasCircle && hasNumbers && hasHands ? 3
            : hasCircle && hasNumbers ? 2
            : hasCircle ? 1 : desc.length > 4 ? 1 : 0
      note = 'Clock drawing evaluated from your description.'
    } else if (type === 'pentagon') {
      const hasTwo     = /two|both|2|pair/.test(desc)
      const hasOverlap = /overlap|cross|together|intersect|inside/.test(desc)
      const hasFive    = /five|5|pentagon|sided/.test(desc)
      score = hasTwo && hasOverlap && hasFive ? 2 : hasTwo && hasOverlap ? 1 : hasTwo || hasOverlap ? 1 : desc.length > 4 ? 0 : 0
      note = 'Pentagon drawing evaluated from your description.'
    }

    res.json({ score, note })
  }
}
