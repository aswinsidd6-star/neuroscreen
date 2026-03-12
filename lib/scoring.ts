export const MEMORY_WORDS = ["Apple","Table","Penny"]
export const MEMORY_CUES  = ["a fruit","a piece of furniture","a coin"]

export function getNow() {
  const d = new Date()
  return {
    year:  String(d.getFullYear()),
    month: d.toLocaleString("en",{month:"long"}).toLowerCase(),
    day:   d.toLocaleString("en",{weekday:"long"}).toLowerCase(),
    date:  String(d.getDate()),
  }
}

export function computeScore(ans: Record<string,string>) {
  const now = getNow()
  let pts = 0, max = 0
  const check = (cond:boolean) => { max++; if(cond) pts++ }

  // ── SECTION SCORES (tracked separately for section-wise display) ──────────
  let memPts=0, memMax=0
  let oriPts=0, oriMax=0
  let attPts=0, attMax=0
  let langPts=0, langMax=0
  let visPts=0,  visMax=0
  let spkPts=0,  spkMax=0

  const checkSec=(cond:boolean,sec:string)=>{
    max++
    if(sec==="mem"){memMax++;if(cond){pts++;memPts++}}
    else if(sec==="ori"){oriMax++;if(cond){pts++;oriPts++}}
    else if(sec==="att"){attMax++;if(cond){pts++;attPts++}}
    else if(sec==="lang"){langMax++;if(cond){pts++;langPts++}}
    else if(sec==="vis"){visMax++;if(cond){pts++;visPts++}}
    else if(sec==="spk"){spkMax++;if(cond){pts++;spkPts++}}
    else{if(cond)pts++}
  }

  // 1. ORIENTATION 5pts
  checkSec(ans.orient_year?.trim().toLowerCase()  === now.year,  "ori")
  checkSec(ans.orient_month?.trim().toLowerCase() === now.month, "ori")
  checkSec(ans.orient_day?.trim().toLowerCase()   === now.day,   "ori")
  checkSec(ans.orient_date?.trim()                === now.date,  "ori")
  checkSec((ans.orient_place||"").trim().length > 1,             "ori")

  // 2. SERIAL 7s 5pts
  const serialCorrect: number[] = ans._serial_answers
    ? JSON.parse(ans._serial_answers)
    : [93,86,79,72,65]
  ;(["s7_1","s7_2","s7_3","s7_4","s7_5"] as string[])
    .forEach((k,i)=>checkSec(parseInt(ans[k])===serialCorrect[i],"att"))

  // 3. DIGIT SPAN BACKWARD — now 4 levels (d2, d3, d4, d5)
  const digitCorrect = ans._digit_answers
    ? JSON.parse(ans._digit_answers)
    : { d2:"42", d3:"375", d4:"8421", d5:"72491" }
  checkSec((ans.dsb_2||"").replace(/[\s\-,.]/g,"") === digitCorrect.d2, "att")
  checkSec((ans.dsb_3||"").replace(/[\s\-,.]/g,"") === digitCorrect.d3, "att")
  checkSec((ans.dsb_4||"").replace(/[\s\-,.]/g,"") === digitCorrect.d4, "att")
  checkSec((ans.dsb_5||"").replace(/[\s\-,.]/g,"") === digitCorrect.d5, "att")

  // 4. NAMING — now 6 objects
  checkSec((ans.name_pencil||"").toLowerCase().includes("pencil"),                      "lang")
  checkSec(!!(ans.name_watch||"").toLowerCase().match(/watch|clock/),                   "lang")
  checkSec(!!(ans.name_key||"").toLowerCase().match(/key|keys/),                        "lang")
  checkSec(!!(ans.name_scissors||"").toLowerCase().match(/scissor|scissors|shears/),   "lang")
  checkSec(!!(ans.name_thermometer||"").toLowerCase().match(/thermo|temperature|fever/),"lang")
  checkSec(!!(ans.name_compass||"").toLowerCase().match(/compass|direction|bearing/),   "lang")

  // 5. COMMAND 1pt
  checkSec(ans.command==="done","lang")

  // 6. WRITING 1pt
  checkSec((ans.writing||"").trim().split(/\s+/).length>=3,"lang")

  // 7. FREE RECALL 3pts
  const activeWords: string[] = ans._word_set
    ? JSON.parse(ans._word_set)
    : MEMORY_WORDS
  const recalled = (ans.memory_recall||"").toLowerCase()
  const freeHit = activeWords.filter(w=>recalled.includes(w.toLowerCase()))
  pts += freeHit.length; max += 3; memPts += freeHit.length; memMax += 3

  // 8. CUED RECALL 3pts
  const cueText = (ans.cued_recall||"").toLowerCase()
  const cuedHit = activeWords.filter(w=>cueText.includes(w.toLowerCase()))
  pts += cuedHit.length; max += 3; memPts += cuedHit.length; memMax += 3

  // 9. STORY RECALL 4pts
  checkSec((ans.sr_name||"").toLowerCase().includes("maria") ||
           (ans.sr_name||"").toLowerCase().includes("james") ||
           (ans.sr_name||"").toLowerCase().includes("priya"), "mem")
  checkSec((ans.sr_day||"").toLowerCase().includes("tuesday") ||
           (ans.sr_day||"").toLowerCase().includes("friday")  ||
           (ans.sr_day||"").toLowerCase().includes("monday"),  "mem")
  checkSec(!!(ans.sr_forgot||"").toLowerCase().match(/list|shopping|card|library|document|insurance|paper/), "mem")
  checkSec((ans.sr_neighbour||"").toLowerCase().includes("john") ||
           (ans.sr_neighbour||"").toLowerCase().includes("sarah") ||
           (ans.sr_neighbour||"").toLowerCase().includes("raju"), "mem")

  // 10. INTRUSION CHECK 1pt
  const noIntrusion = (ans.intrusion_check||"") === "No, the story did not mention money"
  checkSec(noIntrusion, "mem")

  // 11. PROSPECTIVE MEMORY 1pt
  checkSec(ans.prospective_memory==="remembered", "mem")

  // 12. CATEGORY FLUENCY 0–5pts
  const animals = parseInt(ans.animal_fluency_count||"0")
  const aScore  = animals>=18?5:animals>=14?4:animals>=10?3:animals>=7?2:animals>=4?1:0
  pts += aScore; max += 5; langPts += aScore; langMax += 5

  // 13. LETTER FLUENCY 0–4pts
  const fwords  = parseInt(ans.letter_fluency_count||"0")
  const fScore  = fwords>=15?4:fwords>=10?3:fwords>=7?2:fwords>=4?1:0
  pts += fScore; max += 4; langPts += fScore; langMax += 4

  // 14. VISUOSPATIAL 7pts
  const clockPts = Math.min(parseInt(ans.clock_score||"0"),5)
  const pentPts  = Math.min(parseInt(ans.pentagon_score||"0"),2)
  pts += clockPts; max += 5; visPts += clockPts; visMax += 5
  pts += pentPts;  max += 2; visPts += pentPts;  visMax += 2

  // 15. SPEECH 5pts
  const speechPts = Math.min(parseInt(ans.speech_record||"0"),5)
  pts += speechPts; max += 5; spkPts += speechPts; spkMax += 5

  // ── RESPONSE TIME ANALYSIS ─────────────────────────────────────────────────
  // Times stored as _time_<stepId> = milliseconds
  const timings: Record<string,number> = {}
  Object.keys(ans).forEach(k=>{
    if(k.startsWith("_time_")) timings[k.replace("_time_","")] = parseInt(ans[k])||0
  })
  const slowThreshold = 20000  // 20 seconds = delayed response
  const slowQuestions = Object.entries(timings).filter(([,ms])=>ms>slowThreshold).map(([k])=>k)
  const avgTimeMs = Object.values(timings).length
    ? Object.values(timings).reduce((a,b)=>a+b,0)/Object.values(timings).length
    : 0

  // Slow response penalty: each slow answer on a cognitive question = -0.5 risk pts (stored for use below)
  const cognitiveKeys = ["s7_1","s7_2","s7_3","s7_4","s7_5","dsb_2","dsb_3","dsb_4","dsb_5","name_pencil","name_watch","name_key","name_scissors","name_thermometer","name_compass"]
  const slowCognitive = slowQuestions.filter(k=>cognitiveKeys.includes(k)).length

  const mmse = Math.round((pts/max)*30)

  // ── RISK FACTORS ───────────────────────────────────────────────────────────
  let risk = 0
  const age = parseInt(ans.age||"0")
  if(age>=80)risk+=3; else if(age>=70)risk+=2; else if(age>=65)risk+=1
  if(ans.family_history==="Yes, my parent or sibling")risk+=3
  else if(ans.family_history==="Yes, a distant relative")risk+=1
  if(ans.memory_complaint==="Yes, noticeably worse")risk+=2
  else if(ans.memory_complaint==="A little bit, maybe")risk+=1
  if(ans.depression==="Yes, quite often")risk+=2
  else if(ans.depression==="Sometimes")risk+=1
  if(ans.cardiovascular==="Two or more of these")risk+=2
  else if(ans.cardiovascular==="One of them")risk+=1
  if(ans.education==="Less than 6 years")risk+=2
  else if(ans.education==="Between 6 and 12 years")risk+=1

  const adlKeys  = ["adl_medicine","adl_money","adl_cooking","adl_lostway","adl_phone"]
  const adlFails = adlKeys.filter(k=>ans[k]==="yes").length
  risk += adlFails

  // ── PATTERN ANALYSIS ───────────────────────────────────────────────────────
  const freeWordsHit     = freeHit.length
  const cuedWordsHit     = cuedHit.length
  const cuedHelpedMemory = freeWordsHit<=1 && cuedWordsHit>=2
  const bothRecallFailed = freeWordsHit<=1 && cuedWordsHit<=1
  const fluencyAlzFlag   = animals<fwords && animals<12
  const depressionHigh   = ans.depression==="Yes, quite often"
  const clockSevere      = parseInt(ans.clock_score||"5")<=2
  const adlImpaired      = adlFails>=2
  const confabulation    = !noIntrusion

  // Naming difficulty score (0–6): how many objects they failed
  const namingFailed = [
    !(ans.name_pencil||"").toLowerCase().includes("pencil"),
    !!!(ans.name_watch||"").toLowerCase().match(/watch|clock/),
    !!!(ans.name_key||"").toLowerCase().match(/key|keys/),
    !!!(ans.name_scissors||"").toLowerCase().match(/scissor|scissors|shears/),
    !!!(ans.name_thermometer||"").toLowerCase().match(/thermo|temperature|fever/),
    !!!(ans.name_compass||"").toLowerCase().match(/compass|direction|bearing/),
  ].filter(Boolean).length

  const cogPenalty  = mmse<24 ? (24-mmse)*0.5 : 0
  const cuedProtect = cuedHelpedMemory ? -2 : 0
  const alzBoost    = (bothRecallFailed?1.5:0)+(fluencyAlzFlag?1.5:0)+(confabulation?1.0:0)+(clockSevere&&adlImpaired?1.0:0)
  const timingBoost = slowCognitive>=3 ? 1.0 : slowCognitive>=5 ? 2.0 : 0
  const namingBoost = namingFailed>=4 ? 1.5 : namingFailed>=2 ? 0.5 : 0
  const baseTotal   = Math.max(0, risk+cogPenalty+alzBoost+cuedProtect+timingBoost+namingBoost)

  const mmseRiskBoost   = mmse < 20 ? 4 : mmse < 24 ? 2 : 0
  const clockRiskBoost  = clockPts <= 1 ? 3 : clockPts <= 2 ? 1.5 : 0
  const recallRiskBoost = bothRecallFailed ? 2 : 0
  const total = Math.max(0, baseTotal + mmseRiskBoost + clockRiskBoost + recallRiskBoost)

  let pattern = "GENERAL_CONCERN"
  if(cuedHelpedMemory && depressionHigh) pattern="MOOD_RELATED"
  else if(cuedHelpedMemory)              pattern="ATTENTION_RETRIEVAL"
  else if(bothRecallFailed && (clockSevere||fluencyAlzFlag)) pattern="ALZHEIMERS_PATTERN"
  else if(depressionHigh && freeWordsHit>=2) pattern="MOOD_RELATED"
  else if(adlImpaired)                   pattern="EARLY_DECLINE"

  let level:"LOW"|"MODERATE"|"HIGH", color:string, emoji:string, rec:string
  if(total<=3){
    level="LOW"; color="#10b981"; emoji="✅"
    rec="No significant concerns found. Your brain health looks good. Recheck in 12 months."
  } else if(total<=7){
    level="MODERATE"; color="#f59e0b"; emoji="⚠️"
    rec="Some thinking patterns are worth discussing with a doctor. This is not a diagnosis — a professional should take a closer look."
  } else {
    level="HIGH"; color="#ef4444"; emoji="🔴"
    rec="Several thinking areas show patterns that need prompt medical review. Please see a neurologist — early evaluation gives the best outcomes."
  }

  return {
    mmse, pts, max, risk, total, level, color, emoji, rec, pattern,
    freeWordsHit, cuedWordsHit, cuedHelpedMemory, bothRecallFailed,
    fluencyAlzFlag, adlImpaired, depressionHigh, clockSevere, confabulation,
    animals, fwords, adlFails, namingFailed,
    // Section-wise scores
    sectionScores: {
      memory:      { pts: memPts,  max: memMax  },
      orientation: { pts: oriPts,  max: oriMax  },
      attention:   { pts: attPts,  max: attMax  },
      language:    { pts: langPts, max: langMax },
      visuospatial:{ pts: visPts,  max: visMax  },
      speech:      { pts: spkPts,  max: spkMax  },
    },
    // Timing info
    slowQuestions, avgTimeMs, slowCognitive,
  }
}

export const SECTION_STYLE: Record<string,{bg:string;border:string;text:string}> = {
  Memory:       {bg:"rgba(99,102,241,0.1)",  border:"rgba(99,102,241,0.25)",  text:"#a5b4fc"},
  Orientation:  {bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.25)",  text:"#6ee7b7"},
  Attention:    {bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)",  text:"#fcd34d"},
  Language:     {bg:"rgba(236,72,153,0.1)",  border:"rgba(236,72,153,0.25)",  text:"#f9a8d4"},
  Visuospatial: {bg:"rgba(59,130,246,0.1)",  border:"rgba(59,130,246,0.25)",  text:"#93c5fd"},
  Speech:       {bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)",   text:"#fca5a5"},
  History:      {bg:"rgba(156,163,175,0.1)", border:"rgba(156,163,175,0.2)",  text:"#d1d5db"},
  Function:     {bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.25)",  text:"#fde68a"},
}