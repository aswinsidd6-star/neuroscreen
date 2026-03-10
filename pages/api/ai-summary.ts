import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { answers: a, results: r } = req.body

  const now = new Date()
  const correctYear  = String(now.getFullYear())
  const correctMonth = now.toLocaleString('en',{month:'long'}).toLowerCase()
  const correctDay   = now.toLocaleString('en',{weekday:'long'}).toLowerCase()

  // ── per-domain precise data ─────────────────────────────────────────────────
  const freeRecalled   = ['apple','table','penny'].filter(w=>(a.memory_recall||'').toLowerCase().includes(w))
  const freeMissed     = ['Apple','Table','Penny'].filter(w=>!freeRecalled.includes(w.toLowerCase()))
  const cuedRecalled   = ['apple','table','penny'].filter(w=>(a.cued_recall||'').toLowerCase().includes(w))
  const cuedMissed     = ['Apple','Table','Penny'].filter(w=>!cuedRecalled.includes(w.toLowerCase()))
  const cuedHelped     = freeRecalled.length<=1 && cuedRecalled.length>=2
  const bothFailed     = freeRecalled.length<=1 && cuedRecalled.length<=1

  const orientRight:string[]=[], orientWrong:string[]=[]
  ;[
    [(a.orient_year||'').trim()===correctYear,`year (${correctYear})`,`year — said "${a.orient_year}"`],
    [(a.orient_month||'').trim().toLowerCase()===correctMonth,`month (${correctMonth})`,`month — said "${a.orient_month}"`],
    [(a.orient_day||'').trim().toLowerCase()===correctDay,`day of week`,`day — said "${a.orient_day}"`],
    [(a.orient_date||'').trim()===String(now.getDate()),`today's date`,`date — said "${a.orient_date}"`],
    [(a.orient_place||'').trim().length>1,`place ("${a.orient_place}")`,`place — not answered`],
  ].forEach(([ok,g,b])=>ok?orientRight.push(g as string):orientWrong.push(b as string))

  const s7ok   = [93,86,79,72,65].filter((v,i)=>parseInt([a.s7_1,a.s7_2,a.s7_3,a.s7_4,a.s7_5][i])===v).length
  const s7str  = [a.s7_1,a.s7_2,a.s7_3,a.s7_4,a.s7_5].map((v,i)=>
    `${v||'?'} ${parseInt(v)===[93,86,79,72,65][i]?'✓':'✗'}`).join(' → ')

  const dsbOk  = ((a.dsb_2||'').replace(/[\s\-,.]/g,'') === '42' ? 1 : 0) +
                 ((a.dsb_3||'').replace(/[\s\-,.]/g,'') === '375' ? 1 : 0) +
                 ((a.dsb_4||'').replace(/[\s\-,.]/g,'') === '8421' ? 1 : 0)

  const pencilOk = (a.name_pencil||'').toLowerCase().includes('pencil')
  const watchOk  = !!(a.name_watch||'').toLowerCase().match(/watch|clock/)

  const storyRight:string[]=[],storyWrong:string[]=[]
  ;[
    [(a.sr_name||'').toLowerCase().includes('maria'),'Maria (woman\'s name)'],
    [(a.sr_day||'').toLowerCase().includes('tuesday'),'Tuesday (the day)'],
    [!!(a.sr_forgot||'').toLowerCase().match(/list|shopping/),'the shopping list (what she forgot)'],
    [(a.sr_neighbour||'').toLowerCase().includes('john'),'John (the neighbour)'],
  ].forEach(([ok,l])=>ok?storyRight.push(l as string):storyWrong.push(l as string))

  const noIntrusion = a.intrusion_check==="No, the story did not mention money"
  const animals     = parseInt(a.animal_fluency_count||'0')
  const fwords      = parseInt(a.letter_fluency_count||'0')
  const fluencyRatio= animals<fwords && animals<12

  const adlFails = ["adl_medicine","adl_money","adl_cooking","adl_lostway","adl_phone"].filter(k=>a[k]==='yes')
  const adlLabels= {adl_medicine:"managing medicines",adl_money:"handling money",adl_cooking:"cooking familiar meals",adl_lostway:"finding way in familiar places",adl_phone:"using phone/remote"} as any

  const clockPts  = parseInt(a.clock_score||'0')
  const pentPts   = parseInt(a.pentagon_score||'0')
  const speechPts = parseInt(a.speech_record||'3')

  // ── PATTERN DETERMINATION ───────────────────────────────────────────────────
  let patternNote = ""
  if(cuedHelped && a.depression==="Yes, quite often") {
    patternNote = `IMPORTANT PATTERN: The patient's memory improved WITH category cues (from ${freeRecalled.length} to ${cuedRecalled.length} words). This means their brain CAN store memories — it is having trouble RETRIEVING them. This retrieval failure pattern, combined with elevated depression, is more consistent with depression-related cognitive impairment than with Alzheimer's. Alzheimer's disease damages the memory storage process itself, so cues do NOT help — if cues help, it points AWAY from Alzheimer's. Emphasise this clearly.`
  } else if(cuedHelped) {
    patternNote = `IMPORTANT PATTERN: Memory improved WITH cues (${freeRecalled.length} → ${cuedRecalled.length} words). This is a retrieval problem, not a storage problem. This pattern is NOT typical of Alzheimer's — it suggests attention, depression, or anxiety affecting recall. Note this significant finding.`
  } else if(bothFailed) {
    patternNote = `IMPORTANT PATTERN: Memory failed BOTH free (${freeRecalled.length}/3) AND with category cues (${cuedRecalled.length}/3). This is an ENCODING failure — the brain is not storing new memories. This is the hallmark of hippocampal damage and is the most specific indicator of Alzheimer's-type memory impairment. ${fluencyRatio?'Additionally, category fluency ('+animals+' animals) is worse than letter fluency ('+fwords+' words starting with F) — this category-worse-than-letter ratio is Alzheimer\'s-specific and reflects damage to semantic memory in the temporal lobe.':''} ${!noIntrusion?'The patient also added a false detail (money) to the story — this confabulation further supports hippocampal involvement.':''}. This combination warrants urgent neurological evaluation including MRI and CSF or PET biomarkers.`
  }

  const prompt = `You are Dr. Priya Menon — one of the world's most respected neurologists, combining the precision of Mayo Clinic neurology with the warmth and clarity of a family doctor. You trained at NIMHANS Bengaluru, AIIMS Delhi, and Johns Hopkins. You are famous for one special gift: you can explain any brain condition to any person on earth — whether they are a professor or never went to school — and they understand completely.

A patient named ${a.name} (age ${a.age}, ${a.gender}) has just completed a 40-question cognitive screening battery based on MoCA 8.3, MMSE, FCSRT, ADAS-Cog 13, Boston Naming Test, DementiaBank speech protocol, and RUDAS. Their complete results are below.

══════════════════════════════════════════════
COMPLETE CLINICAL DATA
══════════════════════════════════════════════

OVERALL: MMSE equivalent ${r.mmse}/30 | Composite risk score: ${r.total} | Level: ${r.level}

── HIPPOCAMPUS (brain's memory save-button) ──
FREE RECALL (no hints): ${freeRecalled.length}/3 words
  Remembered: [${freeRecalled.join(', ')||'none'}] | Forgot: [${freeMissed.join(', ')||'none'}]
CUED RECALL (category hints given): ${cuedRecalled.length}/3 words
  With hints remembered: [${cuedRecalled.join(', ')||'none'}] | Still forgot: [${cuedMissed.join(', ')||'none'}]
CLINICAL MEANING: ${cuedHelped?'RETRIEVAL PROBLEM — cues helped, memory storage intact':'ENCODING PROBLEM — cues did NOT help, memory storage impaired'}

STORY RECALL: ${storyRight.length}/4 correct
  Got right: [${storyRight.join('; ')||'none'}]
  Got wrong/missed: [${storyWrong.join('; ')||'none'}]
  Their answers: name="${a.sr_name}" | day="${a.sr_day}" | forgot="${a.sr_forgot}" | neighbour="${a.sr_neighbour}"

INTRUSION TEST: Asked if story mentioned money (it did NOT) — said: "${a.intrusion_check}"
  Confabulation (false memory): ${!noIntrusion?'YES — added a false detail':'No — correctly said no'}

ORIENTATION: ${orientRight.length}/5 correct
  Correct: [${orientRight.join(', ')||'none'}]
  Wrong: [${orientWrong.join('; ')||'none'}]

── PREFRONTAL CORTEX (brain's manager) ──
SERIAL 7s: ${s7ok}/5 — ${s7str}
DIGIT SPAN BACKWARD: ${dsbOk}/3
  2-digit: said "${a.dsb_2}" (correct: 4-2) | 3-digit: said "${a.dsb_3}" (correct: 3-7-5) | 4-digit: said "${a.dsb_4}" (correct: 8-4-2-1)

── TEMPORAL LOBE / LANGUAGE AREAS ──
OBJECT NAMING: pencil="${a.name_pencil}" ${pencilOk?'✓':'✗'} | watch="${a.name_watch}" ${watchOk?'✓':'✗'}
WRITING: "${a.writing||'(nothing written)'}" — ${(a.writing||'').trim().split(/\s+/).length>=3?'complete ✓':'incomplete ✗'}
CATEGORY FLUENCY (animals/60s): ${animals} — ${animals>=14?'normal (14+)':animals>=10?'mild concern (10-13)':animals>=6?'notable concern (6-9)':'significant concern (<6)'}
LETTER FLUENCY (F-words/60s): ${fwords} — ${fwords>=10?'normal':'below normal'}
FLUENCY RATIO: ${fluencyRatio?'CATEGORY WORSE THAN LETTER — Alzheimer\'s-specific temporal lobe pattern':'normal ratio'}
PICTURE DESCRIPTION: ${a.picture_describe||3}/5

── BROCA'S AREA (speech centre) ──
SPEECH FLUENCY: ${speechPts}/5

── PARIETAL LOBE (spatial GPS) ──
CLOCK DRAWING: ${clockPts}/5 — ${clockPts>=5?'perfect':clockPts>=4?'minor error':clockPts>=3?'moderate errors':clockPts>=2?'significant errors':'unable/severely impaired'}
PENTAGON COPY: ${pentPts}/2 — ${pentPts===2?'correct':pentPts===1?'partially correct':'unable to copy'}

── FUNCTIONAL ABILITIES (ADL — Alzheimer's-specific early marker) ──
Difficulties reported: ${adlFails.length===0?'none':adlFails.map(k=>adlLabels[k]).join(', ')}
(${adlFails.length}/5 daily activities affected)

── RISK FACTORS ──
Age: ${a.age} | Family history: ${a.family_history} | Self-reported memory decline: ${a.memory_complaint}
Depression: ${a.depression} | Cardiovascular risks: ${a.cardiovascular} | Education: ${a.education}

── CRITICAL PATTERN FINDING ──
${patternNote || 'No single dominant pattern — mixed findings requiring professional evaluation.'}

══════════════════════════════════════════════
WRITE THE BRAIN HEALTH REPORT
══════════════════════════════════════════════

Write exactly 6 paragraphs. No headers. No bullet points inside paragraphs. Use "you" and "your brain" throughout. Use ${a.name.split(' ')[0]} by first name. Every brain region must be explained in plain words in brackets the first time. Write as if speaking slowly and clearly to someone who has never studied science — but also as if a doctor would be proud to read it.

PARAGRAPH 1 — THE FULL PICTURE (3 sentences):
Start with "${a.name.split(' ')[0]}," — state the MMSE score and what range it falls in. State the overall risk level (${r.level}) in one direct, warm sentence. End: "This screening is not a diagnosis — it is a detailed map of your thinking abilities, designed to help a doctor decide what to look at next."

PARAGRAPH 2 — YOUR MEMORY — HIPPOCAMPUS (4-5 sentences):
Begin: "Your hippocampus — the 'Save button' deep inside your brain, the part that turns today's experiences into tomorrow's memories — was tested in three different ways." State EXACTLY how many words they recalled freely (${freeRecalled.length}/3) and which ones they forgot by name. State how many they recalled WITH cues (${cuedRecalled.length}/3). Then deliver the clinical meaning of the cue result clearly: if cuedHelped="${cuedHelped}" is true, explain that getting more words with hints means the memories ARE being stored but something is blocking the retrieval — this is NOT the Alzheimer's pattern, which destroys the storage itself. If bothFailed="${bothFailed}" is true, explain that failing BOTH without AND with hints is a sign the brain is not saving new memories at all — this is the specific pattern that neurologists look for when investigating Alzheimer's. Cover story recall — state which details they got right and which they missed. Mention confabulation if present.

PARAGRAPH 3 — YOUR FOCUS AND WORKING MEMORY — PREFRONTAL CORTEX (3 sentences):
Begin: "Your prefrontal cortex — the 'manager' of your brain that keeps you focused, organised, and able to hold information while thinking — showed the following." Give the serial 7s score (${s7ok}/5) with the exact numbers they said. Give the digit span backward score (${dsbOk}/3) and explain what backward repetition tests — that it is harder than forward because it requires active mental work, not just echoing.

PARAGRAPH 4 — YOUR LANGUAGE AND WORD-FINDING — TEMPORAL + FRONTAL LOBES (4 sentences):
Begin: "The language centres of your brain — Wernicke's area (which finds the right word for what you want to say) and Broca's area (which controls speech fluency and word flow) — were tested across several tasks." Name the pencil and watch results. Give animal fluency (${animals} animals) and F-word fluency (${fwords} words) scores and explain what the ratio means — if category is worse than letter, state specifically: "When someone names fewer animals than words-starting-with-F, it points to the semantic memory network in the temporal lobe being affected — this is the exact pattern seen in early Alzheimer's and is different from what depression or stress causes." Give picture description and speech scores.

PARAGRAPH 5 — YOUR SPATIAL THINKING — PARIETAL LOBE (2-3 sentences):
Begin: "Your parietal lobe — your brain's GPS, the part that understands space, shapes, and directions — was tested with two drawing tasks." State the clock drawing score (${clockPts}/5) precisely. State the pentagon score (${pentPts}/2). If clock score is 2 or below: "A clock drawing score of ${clockPts} out of 5 is one of the clearest visuospatial signals — difficulty with this specific task is one of the most reliable indicators that neurologists look for when examining the parietal lobe for Alzheimer's-related changes."

PARAGRAPH 6 — WHAT THIS MEANS AND WHAT TO DO NEXT (5-6 sentences — most important):
This is the most important paragraph. Be completely honest. State which brain regions performed well and which showed difficulty, using the EXACT findings. If pattern is ALZHEIMERS_PATTERN: "The combination of encoding failure in memory, reduced category fluency, clock drawing difficulty, and functional changes creates a pattern that is clinically significant — not because this confirms any diagnosis, but because these specific findings together are what a neurologist would want to investigate further with MRI and blood tests." If pattern is MOOD_RELATED: "The fact that memory improved with cues is actually a reassuring sign — it suggests the memory storage itself is working, which is not consistent with Alzheimer's. However, depression is known to significantly impair memory, concentration, and word-finding, and treating it often dramatically improves cognitive performance." For all patterns: say three specific next steps directly in the paragraph. End with one sentence of genuine hope.

ABSOLUTE RULES:
- Use EXACT scores from the data — never invent or round differently
- NEVER write "you have Alzheimer's" — always "this pattern" or "warrants evaluation"
- Every brain region in brackets must be explained simply
- 540-620 words total
- Write as a trusted family doctor who is holding your hand
- No section headers, no numbered lists inside paragraphs`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:2400,
        messages:[{role:'user',content:prompt}]
      })
    })
    const data = await response.json()
    const summary = data.content?.map((c:any)=>c.text||'').join('')||''
    res.json({summary})
  } catch {
    res.json({summary:'Unable to generate AI report. Please show the scores above to a qualified doctor.'})
  }
}
