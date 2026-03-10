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

  // 1. ORIENTATION 5pts — Hippocampus + Parietal
  check(ans.orient_year?.trim().toLowerCase()  === now.year)
  check(ans.orient_month?.trim().toLowerCase() === now.month)
  check(ans.orient_day?.trim().toLowerCase()   === now.day)
  check(ans.orient_date?.trim()                === now.date)
  check((ans.orient_place||"").trim().length > 1)

  // 2. SERIAL 7s 5pts — Prefrontal Cortex
  ;([[93,"s7_1"],[86,"s7_2"],[79,"s7_3"],[72,"s7_4"],[65,"s7_5"]] as [number,string][])
    .forEach(([v,k])=>check(parseInt(ans[k])===v))

  // 3. DIGIT SPAN BACKWARD 3pts — Prefrontal (Alzheimer's fails backward MORE than forward)
  check((ans.dsb_2||"").replace(/[\s\-,.]/g,"") === "42")
  check((ans.dsb_3||"").replace(/[\s\-,.]/g,"") === "375")
  check((ans.dsb_4||"").replace(/[\s\-,.]/g,"") === "8421")

  // 4. NAMING 2pts — Left Temporal (Wernicke's Area)
  check((ans.name_pencil||"").toLowerCase().includes("pencil"))
  check(!!(ans.name_watch||"").toLowerCase().match(/watch|clock/))

  // 5. COMMAND 1pt — Frontal Lobe
  check(ans.command==="done")

  // 6. WRITING 1pt — Frontal + Language
  check((ans.writing||"").trim().split(/\s+/).length>=3)

  // 7. FREE RECALL 3pts — Hippocampus (FCSRT)
  const recalled = (ans.memory_recall||"").toLowerCase()
  const freeHit = MEMORY_WORDS.filter(w=>recalled.includes(w.toLowerCase()))
  pts += freeHit.length; max += 3

  // 8. CUED RECALL 3pts — FCSRT (THE key Alzheimer's differentiator)
  const cueText = (ans.cued_recall||"").toLowerCase()
  const cuedHit = MEMORY_WORDS.filter(w=>cueText.includes(w.toLowerCase()))
  pts += cuedHit.length; max += 3

  // 9. STORY RECALL 4pts — Hippocampus + Temporal
  check((ans.sr_name||"").toLowerCase().includes("maria"))
  check((ans.sr_day||"").toLowerCase().includes("tuesday"))
  check(!!(ans.sr_forgot||"").toLowerCase().match(/list|shopping/))
  check((ans.sr_neighbour||"").toLowerCase().includes("john"))

  // 10. INTRUSION CHECK 1pt — Confabulation (Alzheimer's-specific)
  const noIntrusion = (ans.intrusion_check||"") === "No, the story did not mention money"
  check(noIntrusion)

  // 11. PROSPECTIVE MEMORY 1pt — Frontal + Hippocampus
  check(ans.prospective_memory==="remembered")

  // 12. CATEGORY FLUENCY 0-5pts — Temporal Lobe (Semantic Memory)
  const animals = parseInt(ans.animal_fluency_count||"0")
  const aScore  = animals>=18?5:animals>=14?4:animals>=10?3:animals>=7?2:animals>=4?1:0
  pts += aScore; max += 5

  // 13. LETTER FLUENCY 0-4pts — Frontal Lobe
  const fwords  = parseInt(ans.letter_fluency_count||"0")
  const fScore  = fwords>=15?4:fwords>=10?3:fwords>=7?2:fwords>=4?1:0
  pts += fScore; max += 4

  // 14. VISUOSPATIAL 7pts — Parietal Lobe
  const clockPts = Math.min(parseInt(ans.clock_score||"0"),5); pts += clockPts; max += 5
  const pentPts  = Math.min(parseInt(ans.pentagon_score||"0"),2); pts += pentPts; max += 2

  // 15. SPEECH 5pts — Broca's Area
  const speechPts = Math.min(parseInt(ans.speech_record||"3"),5); pts += speechPts; max += 5

  const mmse = Math.round((pts/max)*30)

  // RISK FACTORS
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

  const adlKeys = ["adl_medicine","adl_money","adl_cooking","adl_lostway","adl_phone"]
  const adlFails = adlKeys.filter(k=>ans[k]==="yes").length
  risk += adlFails

  // PATTERN ANALYSIS
  const freeWordsHit    = freeHit.length
  const cuedWordsHit    = cuedHit.length
  const cuedHelpedMemory = freeWordsHit<=1 && cuedWordsHit>=2
  const bothRecallFailed = freeWordsHit<=1 && cuedWordsHit<=1
  const fluencyAlzFlag   = animals<fwords && animals<12
  const depressionHigh   = ans.depression==="Yes, quite often"
  const clockSevere      = parseInt(ans.clock_score||"5")<=2
  const adlImpaired      = adlFails>=2
  const confabulation    = !noIntrusion

  const cogPenalty    = mmse<24 ? (24-mmse)*0.5 : 0
  const cuedProtect   = cuedHelpedMemory ? -2 : 0
  const alzBoost      = (bothRecallFailed?1.5:0)+(fluencyAlzFlag?1.5:0)+(confabulation?1.0:0)+(clockSevere&&adlImpaired?1.0:0)
  const total         = Math.max(0, risk+cogPenalty+alzBoost+cuedProtect)

  let pattern = "GENERAL_CONCERN"
  if(cuedHelpedMemory && depressionHigh) pattern="MOOD_RELATED"
  else if(cuedHelpedMemory)              pattern="ATTENTION_RETRIEVAL"
  else if(bothRecallFailed && (clockSevere||fluencyAlzFlag)) pattern="ALZHEIMERS_PATTERN"
  else if(depressionHigh && freeWordsHit>=2) pattern="MOOD_RELATED"
  else if(adlImpaired)                   pattern="EARLY_DECLINE"

  let level:"LOW"|"MODERATE"|"HIGH", color:string, emoji:string, rec:string
  if(total<=4){
    level="LOW"; color="#10b981"; emoji="✅"
    rec="No significant concerns found. Your brain health looks good. Recheck in 12 months."
  } else if(total<=9){
    level="MODERATE"; color="#f59e0b"; emoji="⚠️"
    rec="Some thinking patterns are worth discussing with a doctor. This is not a diagnosis — a professional should take a closer look."
  } else {
    level="HIGH"; color="#ef4444"; emoji="🔴"
    rec="Several thinking areas show patterns that need prompt medical review. Please see a neurologist — early evaluation gives the best outcomes."
  }

  return { mmse,pts,max,risk,total,level,color,emoji,rec,pattern,
    freeWordsHit,cuedWordsHit,cuedHelpedMemory,bothRecallFailed,
    fluencyAlzFlag,adlImpaired,depressionHigh,clockSevere,confabulation,
    animals,fwords,adlFails }
}

export const SECTION_STYLE: Record<string,{bg:string;border:string;text:string}> = {
  Memory:       {bg:"rgba(99,102,241,0.1)", border:"rgba(99,102,241,0.25)", text:"#a5b4fc"},
  Orientation:  {bg:"rgba(16,185,129,0.1)",border:"rgba(16,185,129,0.25)",text:"#6ee7b7"},
  Attention:    {bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.25)",text:"#fcd34d"},
  Language:     {bg:"rgba(236,72,153,0.1)",border:"rgba(236,72,153,0.25)",text:"#f9a8d4"},
  Visuospatial: {bg:"rgba(59,130,246,0.1)",border:"rgba(59,130,246,0.25)",text:"#93c5fd"},
  Speech:       {bg:"rgba(239,68,68,0.1)", border:"rgba(239,68,68,0.25)", text:"#fca5a5"},
  History:      {bg:"rgba(156,163,175,0.1)",border:"rgba(156,163,175,0.2)",text:"#d1d5db"},
  Function:     {bg:"rgba(251,191,36,0.1)",border:"rgba(251,191,36,0.25)",text:"#fde68a"},
}
