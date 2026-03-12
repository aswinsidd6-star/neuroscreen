import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { answers: a, results: r } = req.body

  const now = new Date()
  const correctYear  = String(now.getFullYear())
  const correctMonth = now.toLocaleString('en',{month:'long'}).toLowerCase()
  const correctDay   = now.toLocaleString('en',{weekday:'long'}).toLowerCase()

  // ── DYNAMIC WORD SET (uses whichever group was shown this session) ─────────
  const activeWords: string[] = a._word_set ? JSON.parse(a._word_set) : ['Apple','Table','Penny']
  const wordsLower = activeWords.map((w:string)=>w.toLowerCase())

  const freeRecalled   = wordsLower.filter((w:string)=>(a.memory_recall||'').toLowerCase().includes(w))
  const freeMissed     = activeWords.filter((_:string,i:number)=>!freeRecalled.includes(wordsLower[i]))
  const cuedRecalled   = wordsLower.filter((w:string)=>(a.cued_recall||'').toLowerCase().includes(w))
  const cuedMissed     = activeWords.filter((_:string,i:number)=>!cuedRecalled.includes(wordsLower[i]))
  const cuedHelped     = freeRecalled.length<=1 && cuedRecalled.length>=2
  const bothFailed     = freeRecalled.length<=1 && cuedRecalled.length<=1

  // ── ORIENTATION ────────────────────────────────────────────────────────────
  const orientRight:string[]=[], orientWrong:string[]=[]
  ;[
    [(a.orient_year||'').trim()===correctYear,           `year (${correctYear})`,              `year — said "${a.orient_year}"`],
    [(a.orient_month||'').trim().toLowerCase()===correctMonth, `month (${correctMonth})`,       `month — said "${a.orient_month}"`],
    [(a.orient_day||'').trim().toLowerCase()===correctDay,     `day of week`,                   `day — said "${a.orient_day}"`],
    [(a.orient_date||'').trim()===String(now.getDate()),       `today's date`,                  `date — said "${a.orient_date}"`],
    [(a.orient_place||'').trim().length>1,                     `place ("${a.orient_place}")`,   `place — not answered`],
  ].forEach(([ok,g,b])=>ok?orientRight.push(g as string):orientWrong.push(b as string))

  // ── SERIAL 7s (uses session-specific correct answers) ─────────────────────
  const serialCorrect: number[] = a._serial_answers ? JSON.parse(a._serial_answers) : [93,86,79,72,65]
  const s7ok = serialCorrect.filter((v:number,i:number)=>parseInt([a.s7_1,a.s7_2,a.s7_3,a.s7_4,a.s7_5][i])===v).length
  const s7str = [a.s7_1,a.s7_2,a.s7_3,a.s7_4,a.s7_5].map((v:string,i:number)=>
    `${v||'?'} ${parseInt(v)===serialCorrect[i]?'✓':'✗'}`).join(' → ')

  // ── DIGIT SPAN (now 4 levels including 5-digit) ───────────────────────────
  const digitCorrect = a._digit_answers ? JSON.parse(a._digit_answers) : {d2:'42',d3:'375',d4:'8421',d5:'72491'}
  const dsbOk = ((a.dsb_2||'').replace(/[\s\-,.]/g,'')=== digitCorrect.d2 ? 1 : 0) +
                ((a.dsb_3||'').replace(/[\s\-,.]/g,'')=== digitCorrect.d3 ? 1 : 0) +
                ((a.dsb_4||'').replace(/[\s\-,.]/g,'')=== digitCorrect.d4 ? 1 : 0) +
                ((a.dsb_5||'').replace(/[\s\-,.]/g,'')=== digitCorrect.d5 ? 1 : 0)

  // ── NAMING — all 6 objects ─────────────────────────────────────────────────
  const pencilOk      = (a.name_pencil||'').toLowerCase().includes('pencil')
  const watchOk       = !!(a.name_watch||'').toLowerCase().match(/watch|clock/)
  const keyOk         = !!(a.name_key||'').toLowerCase().match(/key|keys/)
  const scissorsOk    = !!(a.name_scissors||'').toLowerCase().match(/scissor|scissors|shears/)
  const thermoOk      = !!(a.name_thermometer||'').toLowerCase().match(/thermo|temperature|fever/)
  const compassOk     = !!(a.name_compass||'').toLowerCase().match(/compass|direction|bearing/)
  const namingScore   = [pencilOk,watchOk,keyOk,scissorsOk,thermoOk,compassOk].filter(Boolean).length
  const namingFailed  = [
    !pencilOk   && `pencil (said: "${a.name_pencil||'—'}")`,
    !watchOk    && `watch (said: "${a.name_watch||'—'}")`,
    !keyOk      && `key (said: "${a.name_key||'—'}")`,
    !scissorsOk && `scissors (said: "${a.name_scissors||'—'}")`,
    !thermoOk   && `thermometer (said: "${a.name_thermometer||'—'}")`,
    !compassOk  && `compass (said: "${a.name_compass||'—'}")`,
  ].filter(Boolean)

  // ── STORY RECALL ──────────────────────────────────────────────────────────
  const storyRight:string[]=[], storyWrong:string[]=[]
  ;[
    [(a.sr_name||'').toLowerCase().includes('maria') ||
     (a.sr_name||'').toLowerCase().includes('james') ||
     (a.sr_name||'').toLowerCase().includes('priya'),      `name (${a.sr_name||'—'})`],
    [(a.sr_day||'').toLowerCase().includes('tuesday') ||
     (a.sr_day||'').toLowerCase().includes('friday')  ||
     (a.sr_day||'').toLowerCase().includes('monday'),       `day (${a.sr_day||'—'})`],
    [!!(a.sr_forgot||'').toLowerCase().match(/list|shopping|card|library|document|insurance|paper/),
                                                              `what they forgot`],
    [(a.sr_neighbour||'').toLowerCase().includes('john') ||
     (a.sr_neighbour||'').toLowerCase().includes('sarah') ||
     (a.sr_neighbour||'').toLowerCase().includes('raju'),   `neighbour (${a.sr_neighbour||'—'})`],
  ].forEach(([ok,l])=>ok?storyRight.push(l as string):storyWrong.push(l as string))

  const noIntrusion = a.intrusion_check==="No, the story did not mention money"
  const animals     = parseInt(a.animal_fluency_count||'0')
  const fwords      = parseInt(a.letter_fluency_count||'0')
  const fluencyRatio= animals<fwords && animals<12

  const adlFails    = ["adl_medicine","adl_money","adl_cooking","adl_lostway","adl_phone"].filter(k=>a[k]==='yes')
  const adlLabels   = {adl_medicine:"managing medicines",adl_money:"handling money",adl_cooking:"cooking familiar meals",adl_lostway:"finding way in familiar places",adl_phone:"using phone/remote"} as any

  const clockPts  = parseInt(a.clock_score||'0')
  const pentPts   = parseInt(a.pentagon_score||'0')
  const speechPts = parseInt(a.speech_record||'0')

  // ── RESPONSE TIME ANALYSIS ─────────────────────────────────────────────────
  const timings: Record<string,number> = {}
  Object.keys(a).forEach(k=>{
    if(k.startsWith('_time_')) timings[k.replace('_time_','')] = parseInt(a[k])||0
  })
  const slowThreshold = 20000
  const slowItems = Object.entries(timings).filter(([,ms])=>ms>slowThreshold)
  const avgSec    = Object.values(timings).length
    ? Math.round(Object.values(timings).reduce((a,b)=>a+b,0)/Object.values(timings).length/1000)
    : 0
  const fastestSec = Object.values(timings).length ? Math.round(Math.min(...Object.values(timings))/1000) : 0
  const slowestSec = Object.values(timings).length ? Math.round(Math.max(...Object.values(timings))/1000) : 0

  const timingNote = slowItems.length===0
    ? `Response timing was consistently quick (average ${avgSec}s per question). No hesitation pattern detected.`
    : `${slowItems.length} question(s) took over 20 seconds each (avg ${avgSec}s overall, slowest ${slowestSec}s). Slow responses were noted on: ${slowItems.map(([k])=>k).join(', ')}. Response latency on cognitive tasks is clinically significant — hesitation on naming or arithmetic tasks can indicate early processing speed decline.`

  // ── SECTION-WISE SCORES ───────────────────────────────────────────────────
  const ss = r.sectionScores || {}
  const sectionSummary = `
Memory (hippocampus): ${ss.memory?.pts||0}/${ss.memory?.max||16} | Orientation: ${ss.orientation?.pts||0}/${ss.orientation?.max||5} | Attention/Working Memory: ${ss.attention?.pts||0}/${ss.attention?.max||9} | Language/Naming/Fluency: ${ss.language?.pts||0}/${ss.language?.max||18} | Visuospatial: ${ss.visuospatial?.pts||0}/${ss.visuospatial?.max||7} | Speech: ${ss.speech?.pts||0}/${ss.speech?.max||5}`

  // ── PATTERN NOTE ──────────────────────────────────────────────────────────
  let patternNote = ""
  if(cuedHelped && a.depression==="Yes, quite often") {
    patternNote = `IMPORTANT PATTERN: The patient recalled ${freeRecalled.length}/3 words without help but ${cuedRecalled.length}/3 with category cues. This means the brain CAN store memories — it is having trouble RETRIEVING them. This retrieval failure, combined with significant depression, is more consistent with mood-related cognitive impairment than Alzheimer's. Alzheimer's destroys the storage process itself, so cues do NOT help — cue responsiveness here points AWAY from Alzheimer's. Emphasise this distinction clearly.`
  } else if(cuedHelped) {
    patternNote = `IMPORTANT PATTERN: Memory improved WITH cues (${freeRecalled.length} → ${cuedRecalled.length} words). This is a retrieval problem, not a storage problem. This pattern is NOT typical of Alzheimer's — it suggests attention, depression, or anxiety affecting recall.`
  } else if(bothFailed) {
    patternNote = `IMPORTANT PATTERN: Memory failed BOTH free (${freeRecalled.length}/3) AND with category cues (${cuedRecalled.length}/3). This is an ENCODING failure — the brain is not saving new memories. This is the hallmark of hippocampal damage and is the most specific indicator of Alzheimer's-type memory impairment.${fluencyRatio?` Additionally, category fluency (${animals} animals) is worse than letter fluency (${fwords} words) — this category-worse-than-letter ratio is Alzheimer's-specific and reflects damage to semantic memory in the temporal lobe.`:''}${!noIntrusion?' The patient also added a false detail (money) to the story — this confabulation further supports hippocampal involvement.':''} This combination warrants urgent neurological evaluation.`
  }

  // ── RISK FACTOR SUMMARY ───────────────────────────────────────────────────
  const riskItems: string[] = []
  if(parseInt(a.age||'0')>=65) riskItems.push(`age ${a.age} (elevated baseline risk)`)
  if(a.family_history==="Yes, my parent or sibling") riskItems.push("first-degree family history of Alzheimer's (3× increased risk)")
  else if(a.family_history==="Yes, a distant relative") riskItems.push("family history of Alzheimer's (distant relative)")
  if(a.depression==="Yes, quite often") riskItems.push("frequent low mood/depression (bidirectional relationship with cognitive decline)")
  if(a.cardiovascular==="Two or more of these") riskItems.push("multiple cardiovascular risk factors (diabetes/hypertension/obesity — vascular dementia risk)")
  else if(a.cardiovascular==="One of them") riskItems.push("one cardiovascular risk factor")
  if(a.education==="Less than 6 years") riskItems.push("low educational attainment (lower cognitive reserve)")
  if(a.memory_complaint==="Yes, noticeably worse") riskItems.push("subjective memory complaint (self-reported decline is an independent risk marker)")
  if(adlFails.length>0) riskItems.push(`functional difficulties in: ${adlFails.map(k=>adlLabels[k]).join(', ')}`)
  const riskSummary = riskItems.length===0
    ? "No significant modifiable risk factors identified."
    : `Risk factors present: ${riskItems.join('; ')}.`

  const prompt = `You are Dr. Priya Menon — one of the world's most respected neurologists, combining the precision of Mayo Clinic neurology with the warmth and clarity of a family doctor. You trained at NIMHANS Bengaluru, AIIMS Delhi, and Johns Hopkins. You are famous for explaining any brain condition to any person — whether a professor or someone who never went to school — so they understand completely.

A patient named ${a.name} (age ${a.age}, ${a.gender}) has completed a 45-question cognitive screening battery based on MoCA 8.3, MMSE, FCSRT, ADAS-Cog 13, Boston Naming Test, DementiaBank speech protocol, and RUDAS. Complete results are below.

══════════════════════════════════════════════
COMPLETE CLINICAL DATA
══════════════════════════════════════════════

OVERALL: MMSE equivalent ${r.mmse}/30 | Composite risk score: ${r.total} | Level: ${r.level}

SECTION-WISE PERFORMANCE:
${sectionSummary}

── HIPPOCAMPUS (brain's memory save-button) ──
FREE RECALL (no hints): ${freeRecalled.length}/3 words — remembered: [${freeRecalled.join(', ')||'none'}] | forgot: [${freeMissed.join(', ')||'none'}]
CUED RECALL (category hints given): ${cuedRecalled.length}/3 words — with hints: [${cuedRecalled.join(', ')||'none'}] | still forgot: [${cuedMissed.join(', ')||'none'}]
CLINICAL MEANING: ${cuedHelped?'RETRIEVAL PROBLEM — cues helped, memory storage intact':'ENCODING PROBLEM — cues did NOT help, memory storage impaired'}
STORY RECALL: ${storyRight.length}/4 — correct: [${storyRight.join('; ')||'none'}] | missed: [${storyWrong.join('; ')||'none'}]
INTRUSION (false memory): ${!noIntrusion?'YES — added false detail "money"':'No — correctly said no'}

── ORIENTATION ──
${orientRight.length}/5 correct | Correct: [${orientRight.join(', ')||'none'}] | Wrong: [${orientWrong.join('; ')||'none'}]

── PREFRONTAL CORTEX (brain's manager) ──
SERIAL 7s: ${s7ok}/5 — ${s7str}
DIGIT SPAN BACKWARD: ${dsbOk}/4 (now includes 5-digit level)

── NAMING TEST — 6 OBJECTS ──
Score: ${namingScore}/6
Correctly named: ${[pencilOk&&'pencil ✏️',watchOk&&'watch ⌚',keyOk&&'key 🔑',scissorsOk&&'scissors ✂️',thermoOk&&'thermometer 🌡️',compassOk&&'compass 🧭'].filter(Boolean).join(', ')||'none'}
Failed to name: ${namingFailed.join(', ')||'none'}
(Difficulty pattern: easy objects [pencil/watch/key] vs medium [scissors/thermometer] vs hard [compass])

── LANGUAGE ──
Category fluency (animals/60s): ${animals} — ${animals>=14?'normal (14+)':animals>=10?'mild concern':animals>=6?'notable concern':'significant concern'}
Letter fluency (words/60s): ${fwords} — ${fwords>=10?'normal':'below normal'}
Fluency ratio: ${fluencyRatio?'CATEGORY WORSE THAN LETTER — Alzheimer\'s-specific temporal lobe pattern':'normal ratio'}

── VISUOSPATIAL ──
Clock drawing: ${clockPts}/5
Pentagon copy: ${pentPts}/2

── SPEECH ──
Speech fluency: ${speechPts}/5

── ADL FUNCTION ──
Difficulties: ${adlFails.length===0?'none':adlFails.map(k=>adlLabels[k]).join(', ')} (${adlFails.length}/5 affected)

── RESPONSE TIMING ANALYSIS ──
${timingNote}

── RISK FACTORS ──
Age: ${a.age} | Family history: ${a.family_history} | Memory complaint: ${a.memory_complaint}
Depression: ${a.depression} | Cardiovascular: ${a.cardiovascular} | Education: ${a.education}
${riskSummary}

── CRITICAL PATTERN FINDING ──
${patternNote || 'No single dominant pattern — mixed findings requiring professional evaluation.'}

══════════════════════════════════════════════
WRITE THE BRAIN HEALTH REPORT — EXACTLY 7 PARAGRAPHS
══════════════════════════════════════════════

Use "you" and "your brain" throughout. Use ${a.name.split(' ')[0]} by first name. Every brain region explained in plain words in brackets first time. Write as if speaking slowly and clearly to someone who has never studied science.

PARAGRAPH 1 — THE FULL PICTURE (3 sentences):
Start with "${a.name.split(' ')[0]}," — state the MMSE score and range. State overall risk level (${r.level}). End: "This screening is not a diagnosis — it is a detailed map of your thinking abilities, designed to help a doctor decide what to look at next."

PARAGRAPH 2 — MEMORY — HIPPOCAMPUS (4–5 sentences):
Begin: "Your hippocampus — the 'Save button' deep inside your brain — was tested in three ways."
State EXACTLY how many words they recalled freely (${freeRecalled.length}/3) and which they forgot by name.
State cued recall (${cuedRecalled.length}/3) and its clinical meaning (storage vs retrieval).
Cover story recall (${storyRight.length}/4) and mention confabulation if present.

PARAGRAPH 3 — FOCUS AND WORKING MEMORY — PREFRONTAL CORTEX (3 sentences):
Begin: "Your prefrontal cortex — the 'manager' of your brain — showed the following."
Give serial 7s (${s7ok}/5) with exact sequence. Give digit span (${dsbOk}/4) including whether they managed the 5-digit level.

PARAGRAPH 4 — WORD-FINDING AND NAMING — TEMPORAL LOBE (4 sentences):
Begin: "Your ability to recognise and name objects — controlled by your temporal lobe — was tested with six objects."
Name the score (${namingScore}/6). Specifically mention which harder objects (thermometer, compass) were named correctly or failed.
State: if ${namingFailed.length}>=3, explain that difficulty with object names is an early language-area sign neurologists watch closely.
Give fluency scores (${animals} animals, ${fwords} ${a._letter_used||'F'}-words) and explain the ratio.

PARAGRAPH 5 — SPATIAL THINKING — PARIETAL LOBE (2–3 sentences):
Begin: "Your parietal lobe — your brain's GPS for space and shapes — was tested with two drawing tasks."
State clock score (${clockPts}/5) and pentagon score (${pentPts}/2). If clock ≤2: add the clinical significance sentence.

PARAGRAPH 6 — RESPONSE TIMING ANALYSIS (2–3 sentences):
Begin: "Something worth noting is how quickly you responded to each question."
State clearly whether timing was normal, mildly slow, or significantly delayed.
${slowItems.length>0?`Note that ${slowItems.length} question(s) required over 20 seconds — and explain that processing speed is itself a cognitive marker that neurologists track separately from accuracy.`:'If timing was consistently quick, say this is a reassuring sign that processing speed is intact.'}

PARAGRAPH 7 — RISK FACTORS AND WHAT TO DO NEXT (5–6 sentences — most important):
State the risk factors found: ${riskSummary}
Be completely honest. Name which brain regions performed well and which showed difficulty.
If ALZHEIMERS_PATTERN: state the combination of findings that warrants specialist evaluation.
If MOOD_RELATED: explain the reassurance of cue responsiveness and the role of depression.
State three specific next steps directly. End with one sentence of genuine hope.

ABSOLUTE RULES:
- EXACT scores only — never invent or round differently
- NEVER write "you have Alzheimer's" — always "this pattern" or "warrants evaluation"
- 600–680 words total
- No section headers, no numbered lists inside paragraphs
- Write as a trusted family doctor holding your hand`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY||'','anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:2600,
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
