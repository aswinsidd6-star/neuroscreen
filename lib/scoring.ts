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

  // 1. ORIENTATION 5pts
  check(ans.orient_year?.trim().toLowerCase()  === now.year)
  check(ans.orient_month?.trim().toLowerCase() === now.month)
  check(ans.orient_day?.trim().toLowerCase()   === now.day)
  check(ans.orient_date?.trim()                === now.date)
  check((ans.orient_place||"").trim().length > 1)

  // 2. SERIAL 7s 5pts — reads correct answers from session (rotating questions)
  const serialCorrect: number[] = ans._serial_answers
    ? JSON.parse(ans._serial_answers)
    : [93,86,79,72,65]
  ;(["s7_1","s7_2","s7_3","s7_4","s7_5"] as string[])
    .forEach((k,i)=>check(parseInt(ans[k])===serialCorrect[i]))

  // 3. DIGIT SPAN BACKWARD 3pts
  const digitCorrect = ans._digit_answers
    ? JSON.parse(ans._digit_answers)
    : { d2:"42", d3:"375", d4:"8421" }
  check((ans.dsb_2||"").replace(/[\s\-,.]/g,"") === digitCorrect.d2)
  check((ans.dsb_3||"").replace(/[\s\-,.]/g,"") === digitCorrect.d3)
  check((ans.dsb_4||"").replace(/[\s\-,.]/g,"") === digitCorrect.d4)

  // 4. NAMING 2pts
  check((ans.name_pencil||"").toLowerCase().includes("pencil"))
  check(!!(ans.name_watch||"").toLowerCase().match(/watch|clock/))

  // 5. COMMAND 1pt
  check(ans.command==="done")

  // 6. WRITING 1pt
  check((ans.writing||"").trim().split(/\s+/).length>=3)

  // 7. FREE RECALL 3pts
  const activeWords: string[] = ans._word_set
    ? JSON.parse(ans._word_set)
    : MEMORY_WORDS
  const recalled = (ans.memory_recall||"").toLowerCase()
  const freeHit = activeWords.filter(w=>recalled.includes(w.toLowerCase()))
  pts += freeHit.length; max += 3

  // 8. CUED RECALL 3pts
  const cueText = (ans.cued_recall||"").toLowerCase()
  const cuedHit = activeWords.filter(w=>cueText.includes(w.toLowerCase()))
  pts += cuedHit.length; max += 3

  // 9. STORY RECALL 4pts
  check((ans.sr_name||"").toLowerCase().includes("maria") ||
        (ans.sr_name||"").toLowerCase().includes("james") ||
        (ans.sr_name||"").toLowerCase().includes("priya"))
  check((ans.sr_day||"").toLowerCase().includes("tuesday") ||
        (ans.sr_day||"").toLowerCase().includes("friday") ||
        (ans.sr_day||"").toLowerCase().includes("monday"))
  check(!!(ans.sr_forgot||"").toLowerCase().match(/list|shopping|card|library|document|insurance|paper/))
  check((ans.sr_neighbour||"").toLowerCase().includes("john") ||
        (ans.sr_neighbour||"").toLowerCase().includes("sarah") ||
        (ans.sr_neighbour||"").toLowerCase().includes("raju"))

  // 10. INTRUSION CHECK 1pt
  const noIntrusion = (ans.intrusion_check||"") === "No, the story did not mention money"
  check(noIntrusion)

  // 11. PROSPECTIVE MEMORY 1pt
  check(ans.prospective_memory==="remembered")

  // 12. CATEGORY FLUENCY 0-5pts
  const animals = parseInt(ans.animal_fluency_count||"0")
  const aScore  = animals>=18?5:animals>=14?4:animals>=10?3:animals>=7?2:animals>=4?1:0
  pts += aScore; max += 5

  // 13. LETTER FLUENCY 0-4pts
  const fwords  = parseInt(ans.letter_fluency_count||"0")
  const fScore  = fwords>=15?4:fwords>=10?3:fwords>=7?2:fwords>=4?1:0
  pts += fScore; max += 4

  // 14. VISUOSPATIAL 7pts
  const clockPts = Math.min(parseInt(ans.clock_score||"0"),5); pts += clockPts; max += 5
  const pentPts  = Math.min(parseInt(ans.pentagon_score||"0"),2); pts += pentPts; max += 2

  // 15. SPEECH 5pts — default 0 (not 3, so blank = no free points)
  const speechPts = Math.min(parseInt(ans.speech_record||"0"),5); pts += speechPts; max += 5

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
  const freeWordsHit     = freeHit.length
  const cuedWordsHit     = cuedHit.length
  const cuedHelpedMemory = freeWordsHit<=1 && cuedWordsHit>=2
  const bothRecallFailed = freeWordsHit<=1 && cuedWordsHit<=1
  const fluencyAlzFlag   = animals<fwords && animals<12
  const depressionHigh   = ans.depression==="Yes, quite often"
  const clockSevere      = parseInt(ans.clock_score||"5")<=2
  const adlImpaired      = adlFails>=2
  const confabulation    = !noIntrusion

  const cogPenalty  = mmse<24 ? (24-mmse)*0.5 : 0
  const cuedProtect = cuedHelpedMemory ? -2 : 0
  const alzBoost    = (bothRecallFailed?1.5:0)+(fluencyAlzFlag?1.5:0)+(confabulation?1.0:0)+(clockSevere&&adlImpaired?1.0:0)
  const baseTotal   = Math.max(0, risk+cogPenalty+alzBoost+cuedProtect)

  // STRICTER THRESHOLDS — poor test scores now push toward HIGH
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