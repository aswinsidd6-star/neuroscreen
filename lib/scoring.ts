export const MEMORY_WORDS = ["Apple", "Table", "Penny"]

export function getNow() {
  const d = new Date()
  return {
    year:  String(d.getFullYear()),
    month: d.toLocaleString("en", { month: "long" }).toLowerCase(),
    day:   d.toLocaleString("en", { weekday: "long" }).toLowerCase(),
    date:  String(d.getDate()),
  }
}

export function computeScore(ans: Record<string, string>) {
  const now = getNow()
  let pts = 0, max = 0
  const check = (cond: boolean) => { max++; if (cond) pts++ }

  check(ans.orient_year?.trim().toLowerCase() === now.year)
  check(ans.orient_month?.trim().toLowerCase() === now.month)
  check(ans.orient_day?.trim().toLowerCase() === now.day)
  check(ans.orient_date?.trim() === now.date)
  check((ans.orient_place || "").trim().length > 1)

  ;([[93,"s7_1"],[86,"s7_2"],[79,"s7_3"],[72,"s7_4"],[65,"s7_5"]] as [number,string][]).forEach(([v,k]) => {
    check(parseInt(ans[k]) === v)
  })

  check((ans.name_pencil || "").toLowerCase().includes("pencil"))
  check((ans.name_watch || "").toLowerCase().match(/watch|clock/) !== null)
  check(ans.command === "done")
  check((ans.writing || "").trim().split(/\s+/).length >= 3)

  const recalled = (ans.memory_recall || "").toLowerCase()
  MEMORY_WORDS.forEach(w => check(recalled.includes(w.toLowerCase())))

  check((ans.sr_name || "").toLowerCase().includes("maria"))
  check((ans.sr_day || "").toLowerCase().includes("tuesday"))
  check((ans.sr_forgot || "").toLowerCase().match(/list|shopping/) !== null)
  check((ans.sr_neighbour || "").toLowerCase().includes("john"))

  const clockPts = Math.min(parseInt(ans.clock_score || "0"), 5)
  pts += clockPts; max += 5

  const pentPts = Math.min(parseInt(ans.pentagon_score || "0"), 2)
  pts += pentPts; max += 2

  const speechPts = Math.min(parseInt(ans.speech_record || "3"), 5)
  pts += speechPts; max += 5

  const mmse = Math.round((pts / max) * 30)

  let risk = 0
  const age = parseInt(ans.age || "0")
  if (age >= 80) risk += 3; else if (age >= 70) risk += 2; else if (age >= 65) risk += 1
  if (ans.family_history === "Yes, a parent or sibling") risk += 3
  else if (ans.family_history === "Yes, a distant relative") risk += 1
  if (ans.memory_complaint === "Yes, noticeably") risk += 2
  else if (ans.memory_complaint === "A little bit") risk += 1
  if (ans.depression === "Yes, often") risk += 2
  else if (ans.depression === "Sometimes") risk += 1
  if (ans.cardiovascular === "Two or more") risk += 2
  else if (ans.cardiovascular === "One of them") risk += 1
  if (ans.education === "Less than 6 years") risk += 2
  else if (ans.education === "6 to 12 years") risk += 1

  const cogPenalty = mmse < 24 ? (24 - mmse) * 0.5 : 0
  const total = risk + cogPenalty

  let level: "LOW" | "MODERATE" | "HIGH"
  let color: string, emoji: string, rec: string
  if (total <= 4)      { level = "LOW";      color = "#10b981"; emoji = "✅"; rec = "No significant cognitive concerns detected. Routine check-up in 12 months recommended." }
  else if (total <= 9) { level = "MODERATE"; color = "#f59e0b"; emoji = "⚠️"; rec = "Some borderline indicators present. Doctor review and follow-up in 6 months advised." }
  else                 { level = "HIGH";     color = "#ef4444"; emoji = "🔴"; rec = "Multiple risk indicators detected. Please consult a doctor — MRI evaluation may be recommended." }

  return { mmse, pts, max, risk, total, level, color, emoji, rec }
}

export const SECTION_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  Memory:       { bg:"rgba(99,102,241,0.1)",  border:"rgba(99,102,241,0.25)",  text:"#a5b4fc" },
  Orientation:  { bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.25)",  text:"#6ee7b7" },
  Attention:    { bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.25)",  text:"#fcd34d" },
  Language:     { bg:"rgba(236,72,153,0.1)",  border:"rgba(236,72,153,0.25)",  text:"#f9a8d4" },
  Visuospatial: { bg:"rgba(59,130,246,0.1)",  border:"rgba(59,130,246,0.25)",  text:"#93c5fd" },
  Speech:       { bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)",   text:"#fca5a5" },
  History:      { bg:"rgba(156,163,175,0.1)", border:"rgba(156,163,175,0.2)",  text:"#d1d5db" },
}
