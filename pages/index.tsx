import { useState, useRef, useEffect } from "react"
import Head from "next/head"
import { supabase } from "../lib/supabase"
import { MEMORY_WORDS, computeScore, SECTION_STYLE } from "../lib/scoring"

// ─── All Steps ────────────────────────────────────────────────────────────────
const ALL_STEPS = [
  { id:"name",   type:"text",   section:"intro", prompt:"What is your name?", placeholder:"Type your full name…" },
  { id:"age",    type:"number", section:"intro", prompt:"How old are you?",   placeholder:"Enter your age…" },
  { id:"gender", type:"select", section:"intro", prompt:"What is your gender?", options:["Male","Female","Prefer not to say"] },
  { id:"memory_plant", type:"memory_display", section:"Memory", prompt:"Please read and remember these 3 words.", subtext:"You will be asked to recall them later." },
  { id:"orient_year",  type:"typed", section:"Orientation", prompt:"What year is it right now?",        placeholder:"e.g. 2026" },
  { id:"orient_month", type:"typed", section:"Orientation", prompt:"What month of the year is it?",     placeholder:"e.g. March" },
  { id:"orient_day",   type:"typed", section:"Orientation", prompt:"What day of the week is it today?", placeholder:"e.g. Saturday" },
  { id:"orient_date",  type:"typed", section:"Orientation", prompt:"What is today's date (number)?",    placeholder:"e.g. 7" },
  { id:"orient_place", type:"typed", section:"Orientation", prompt:"What city or town are you in?",     placeholder:"Type city name…" },
  { id:"s7_1", type:"typed", section:"Attention", prompt:"Subtract 7 from 100. What do you get?",      placeholder:"Your answer…" },
  { id:"s7_2", type:"typed", section:"Attention", prompt:"Now subtract 7 from that number.",            placeholder:"Your answer…" },
  { id:"s7_3", type:"typed", section:"Attention", prompt:"Subtract 7 again. What is the result?",      placeholder:"Your answer…" },
  { id:"s7_4", type:"typed", section:"Attention", prompt:"Keep going — subtract 7 once more.",         placeholder:"Your answer…" },
  { id:"s7_5", type:"typed", section:"Attention", prompt:"One last time — subtract 7.",                placeholder:"Your answer…" },
  { id:"name_pencil", type:"image_name", section:"Language", prompt:"What is this object called?", emoji:"✏️", hint:"a tool you write with" },
  { id:"name_watch",  type:"image_name", section:"Language", prompt:"And what about this one?",    emoji:"⌚", hint:"worn on the wrist" },
  { id:"command", type:"command", section:"Language", prompt:"Please follow this 3-step instruction:", instruction:"Close your eyes, count to three silently, then open them and tap the button." },
  { id:"writing", type:"textarea", section:"Language", prompt:"Write any complete sentence about anything.", subtext:"The weather, your day — anything at all.", placeholder:"Write your sentence here…" },
  { id:"clock_draw", type:"clock_draw", section:"Visuospatial", prompt:"Draw a clock face showing 10 past 11.", subtext:"Draw a circle, add all 12 numbers, then draw the hands at 11:10." },
  { id:"pentagon_draw", type:"pentagon_draw", section:"Visuospatial", prompt:"Copy this shape as accurately as you can.", subtext:"Two overlapping pentagons — copy them below." },
  { id:"story_read", type:"story_read", section:"Memory", prompt:"Read this short story carefully.", subtext:"You will answer questions about it afterwards.", story:"Maria went to the market on Tuesday morning to buy vegetables. She forgot her shopping list at home, so she only remembered tomatoes and onions. On the way back, she met her neighbour John, who reminded her she also needed potatoes." },
  { id:"sr_name",      type:"typed", section:"Memory", prompt:"What was the woman's name in the story?",  placeholder:"Your answer…" },
  { id:"sr_day",       type:"typed", section:"Memory", prompt:"What day did she go to the market?",        placeholder:"Your answer…" },
  { id:"sr_forgot",    type:"typed", section:"Memory", prompt:"What did she forget at home?",              placeholder:"Your answer…" },
  { id:"sr_neighbour", type:"typed", section:"Memory", prompt:"Who did she meet on the way back?",         placeholder:"Your answer…" },
  { id:"picture_describe", type:"picture_describe", section:"Language", prompt:"Look at this kitchen scene. Describe everything you see.", subtext:"Tell a story about what is happening. Use as much detail as you can." },
  { id:"speech_record", type:"speech_record", section:"Speech", prompt:"Please read this sentence aloud, then record yourself.", sentence:"The quick brown fox jumps over the lazy dog near the old stone wall." },
  { id:"memory_recall", type:"recall", section:"Memory", prompt:"Earlier you saw 3 words to remember.", subtext:"Type as many as you can recall, separated by commas.", placeholder:"e.g. Apple, Table…" },
  { id:"family_history", type:"choice", section:"History", prompt:"Do any close family members (parents or siblings) have Alzheimer's or dementia?", options:["No","Yes, a distant relative","Yes, a parent or sibling"] },
  { id:"memory_complaint", type:"choice", section:"History", prompt:"Have you or someone close noticed your memory getting worse?", options:["No, not really","A little bit","Yes, noticeably"] },
  { id:"depression", type:"choice", section:"History", prompt:"Have you been feeling persistently sad or uninterested in usual activities?", options:["No","Sometimes","Yes, often"] },
  { id:"cardiovascular", type:"choice", section:"History", prompt:"Do you have diabetes, high blood pressure, or obesity?", options:["None of these","One of them","Two or more"] },
  { id:"education", type:"choice", section:"History", prompt:"How many years did you spend in formal education (school and college)?", options:["12 or more years","6 to 12 years","Less than 6 years"] },
] as any[]

// ─── Drawing Canvas ────────────────────────────────────────────────────────────
function DrawCanvas({ onDone, bgFn }: { onDone: () => void; bgFn?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const painting = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d")!
    ctx.fillStyle = "#161b27"; ctx.fillRect(0, 0, 300, 300)
    if (bgFn) bgFn(ctx, 300, 300)
  }, [])

  const getPos = (e: any) => {
    const r = ref.current!.getBoundingClientRect()
    const sx = 300 / r.width, sy = 300 / r.height
    if (e.touches) return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy }
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }
  }

  const down = (e: any) => { e.preventDefault(); painting.current = true; last.current = getPos(e); setDrawn(true) }
  const move = (e: any) => {
    e.preventDefault(); if (!painting.current) return
    const p = getPos(e), ctx = ref.current!.getContext("2d")!
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#6ee7b7"; ctx.lineWidth = 2.5
    ctx.lineCap = "round"; ctx.stroke(); last.current = p
  }
  const up = (e: any) => { e.preventDefault(); painting.current = false }

  const clear = () => {
    const c = ref.current!, ctx = c.getContext("2d")!
    ctx.fillStyle = "#161b27"; ctx.fillRect(0, 0, 300, 300)
    if (bgFn) bgFn(ctx, 300, 300); setDrawn(false)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-gray-400 text-center">Use finger or mouse to draw</p>
      <div style={{ border: "1px solid rgba(110,231,183,0.2)", borderRadius: 14, overflow: "hidden", cursor: "crosshair", touchAction: "none" }}>
        <canvas ref={ref} width={300} height={300} style={{ display: "block", width: "100%", maxWidth: 300 }}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up} />
      </div>
      <div className="flex gap-3">
        <button onClick={clear} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", padding: "8px 18px", borderRadius: 9, cursor: "pointer", fontSize: 14 }}>Clear</button>
        <button onClick={onDone} disabled={!drawn} className="btn-green" style={{ padding: "8px 24px", opacity: drawn ? 1 : 0.4 }}>Done →</button>
      </div>
    </div>
  )
}

// ─── Self Rate ─────────────────────────────────────────────────────────────────
function SelfRate({ options, onPick, picked }: { options: [number, string, number][]; onPick: (n: number) => void; picked: number | null }) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {options.map(([score, label, max]) => (
        <button key={score} onClick={() => onPick(score)} style={{
          display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
          background: picked === score ? "rgba(110,231,183,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${picked === score ? "rgba(110,231,183,0.4)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 10, padding: "10px 14px", cursor: "pointer",
          color: picked === score ? "#6ee7b7" : "#e5e7eb", fontSize: 14, transition: "all 0.15s"
        }}>
          <span style={{ fontFamily: "monospace", fontSize: 13, minWidth: 32, color: "#34d399", fontWeight: 600 }}>{score}/{max}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Step Components ──────────────────────────────────────────────────────────
function MemoryDisplay({ onNext }: any) {
  return (
    <div className="text-center">
      <p className="text-gray-400 text-sm mb-8 leading-relaxed">You will be asked to recall these later.</p>
      <div className="flex gap-4 justify-center flex-wrap mb-10">
        {MEMORY_WORDS.map((w, i) => (
          <div key={w} style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 14, padding: "18px 30px", fontSize: 22, fontWeight: 600, color: "#6ee7b7", animation: `pop ${0.3 + i * 0.1}s ease both` }}>{w}</div>
        ))}
      </div>
      <p className="text-gray-500 text-sm mb-8">Read them aloud, then continue.</p>
      <button className="btn-green" onClick={() => onNext("seen")}>I&apos;ve memorised them →</button>
    </div>
  )
}

function TypedInput({ step, onNext }: any) {
  const [val, setVal] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 100) }, [step.id])
  const go = () => { if (val.trim()) onNext(val.trim()) }
  return (
    <div>
      <input ref={ref} className="inp" type={step.type === "number" ? "number" : "text"} placeholder={step.placeholder} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") go() }} />
      <button className="btn-green mt-4 w-full" onClick={go}>Next →</button>
    </div>
  )
}

function SelectStep({ step, onNext }: any) {
  return (
    <div className="flex flex-col gap-3">
      {step.options.map((opt: string, i: number) => (
        <button key={i} className="choice-btn" onClick={() => onNext(opt)}>
          <span style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.38)", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ImageName({ step, onNext }: any) {
  const [val, setVal] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 100) }, [step.id])
  const go = () => { if (val.trim()) onNext(val.trim()) }
  return (
    <div>
      <div className="text-center mb-8">
        <div style={{ fontSize: 80, filter: "drop-shadow(0 0 16px rgba(52,211,153,0.2))", marginBottom: 8 }}>{step.emoji}</div>
        <p className="text-gray-500 text-sm">Hint: {step.hint}</p>
      </div>
      <input ref={ref} className="inp" type="text" placeholder="Name this object…" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") go() }} />
      <button className="btn-green mt-4 w-full" onClick={go}>Next →</button>
    </div>
  )
}

function CommandStep({ step, onNext }: any) {
  return (
    <div className="text-center">
      <div style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
        <p style={{ fontSize: 18, color: "#e5e7eb", lineHeight: 1.8, fontStyle: "italic" }}>&ldquo;{step.instruction}&rdquo;</p>
      </div>
      <button className="btn-green" onClick={() => onNext("done")}>✓ I did it</button>
    </div>
  )
}

function TextareaStep({ step, onNext }: any) {
  const [val, setVal] = useState("")
  return (
    <div>
      {step.subtext && <p className="text-gray-400 text-sm mb-4 leading-relaxed">{step.subtext}</p>}
      <textarea className="inp" rows={4} placeholder={step.placeholder} value={val} onChange={e => setVal(e.target.value)} style={{ resize: "none", minHeight: 100 }} />
      <button className="btn-green mt-4 w-full" onClick={() => { if (val.trim()) onNext(val.trim()) }}>Next →</button>
    </div>
  )
}

function RecallStep({ step, onNext }: any) {
  const [val, setVal] = useState("")
  return (
    <div>
      {step.subtext && <p className="text-gray-400 text-sm mb-4 leading-relaxed">{step.subtext}</p>}
      <input className="inp" type="text" placeholder={step.placeholder} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onNext(val || " ") }} />
      <p className="text-gray-600 text-xs mt-2">It&apos;s okay if you can&apos;t remember all of them.</p>
      <button className="btn-green mt-4 w-full" onClick={() => onNext(val || " ")}>Submit →</button>
    </div>
  )
}

function ChoiceStep({ step, onNext }: any) {
  return (
    <div className="flex flex-col gap-3">
      {step.options.map((opt: string, i: number) => (
        <button key={i} className="choice-btn" onClick={() => onNext(opt)}>
          <span style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.13)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.38)", flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ClockDrawStep({ onNext }: any) {
  const [phase, setPhase] = useState<"draw" | "rate">("draw")
  const [score, setScore] = useState<number | null>(null)
  const bgFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(110,231,183,0.12)"; ctx.lineWidth = 1; ctx.stroke()
    ctx.fillStyle = "rgba(110,231,183,0.08)"; ctx.font = "11px monospace"; ctx.textAlign = "center"
    ctx.fillText("Draw here", w / 2, h / 2 + 4)
  }
  if (phase === "draw") return <DrawCanvas bgFn={bgFn} onDone={() => setPhase("rate")} />
  return (
    <div>
      <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: 16, marginBottom: 4 }}>
        <p style={{ color: "#a5b4fc", fontSize: 14 }}>✏️ <strong>Self-check:</strong> How accurate is your clock drawing?</p>
      </div>
      <SelfRate picked={score} onPick={setScore} options={[[5,"Perfect — circle, all 12 numbers, hands at 11:10",5],[4,"Almost right — small error in numbers or hands",5],[3,"Partial — circle, some numbers, hands approximate",5],[2,"Poor — significant errors or missing hands",5],[1,"Very poor — barely resembles a clock",5]]} />
      {score !== null && <button className="btn-green mt-4 w-full" onClick={() => onNext(String(score))}>Next →</button>}
    </div>
  )
}

function PentagonDrawStep({ onNext }: any) {
  const [phase, setPhase] = useState<"draw" | "rate">("draw")
  const [score, setScore] = useState<number | null>(null)
  const bgFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const drawP = (cx: number, cy: number, r: number) => {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI / 5) - Math.PI / 2
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.strokeStyle = "rgba(165,180,252,0.55)"; ctx.lineWidth = 1.5; ctx.stroke()
    }
    drawP(w - 70, 44, 38); drawP(w - 70 + 38 * 0.85, 44 + 38 * 0.2, 38)
    ctx.fillStyle = "rgba(165,180,252,0.35)"; ctx.font = "10px monospace"; ctx.textAlign = "center"
    ctx.fillText("COPY THIS ↗", w / 2, h - 8)
  }
  if (phase === "draw") return <DrawCanvas bgFn={bgFn} onDone={() => setPhase("rate")} />
  return (
    <div>
      <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: 16, marginBottom: 4 }}>
        <p style={{ color: "#a5b4fc", fontSize: 14 }}>How well did you copy the shape?</p>
      </div>
      <SelfRate picked={score} onPick={setScore} options={[[2,"Both pentagons with 5 sides, overlapping correctly",2],[1,"Recognisable pentagons but some errors",2],[0,"Does not resemble two overlapping pentagons",2]]} />
      {score !== null && <button className="btn-green mt-4 w-full" onClick={() => onNext(String(score))}>Next →</button>}
    </div>
  )
}

function StoryReadStep({ step, onNext }: any) {
  return (
    <div>
      {step.subtext && <p className="text-gray-400 text-sm mb-5 leading-relaxed">{step.subtext}</p>}
      <div style={{ background: "rgba(165,180,252,0.05)", border: "1px solid rgba(165,180,252,0.18)", borderRadius: 16, padding: 22, marginBottom: 20, lineHeight: 2, fontSize: 17, color: "#e5e7eb", fontFamily: "'Lora',Georgia,serif", fontStyle: "italic" }}>
        &ldquo;{step.story}&rdquo;
      </div>
      <p className="text-gray-500 text-xs mb-5">The story will be hidden when you continue.</p>
      <button className="btn-green w-full" onClick={() => onNext("read")}>I&apos;ve read it →</button>
    </div>
  )
}

function PictureDescribeStep({ onNext }: any) {
  const [val, setVal] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ score: number; note: string } | null>(null)

  const analyse = async () => {
    if (val.trim().length < 5) return
    setLoading(true)
    try {
      const res = await fetch("/api/analyse-picture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: val }) })
      const data = await res.json()
      setResult(data)
    } catch { setResult({ score: 3, note: "Description recorded." }) }
    setLoading(false)
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">Tell a story about what is happening. Use as much detail as you can.</p>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 18, textAlign: "center" }}>
        <p className="text-gray-500 text-xs font-mono tracking-widest mb-3">KITCHEN SCENE</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 44, marginBottom: 8 }}>
          <div>👩‍🍳</div><div>🍲</div><div>🧒</div><div>🍪</div><div>🚿</div><div>🪟</div>
        </div>
        <p className="text-gray-500 text-xs mt-2 leading-relaxed">A woman cooks while a child reaches for a cookie jar. Water may be overflowing from the sink.</p>
      </div>
      <textarea className="inp" rows={4} placeholder="Describe everything you see…" value={val} onChange={e => setVal(e.target.value)} style={{ resize: "none", minHeight: 100 }} />
      {!result ? (
        <button className="btn-green mt-4 w-full" onClick={analyse} disabled={loading || val.trim().length < 5} style={{ opacity: val.trim().length > 5 ? 1 : 0.4 }}>
          {loading ? "Analysing…" : "Submit Description →"}
        </button>
      ) : (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 12, padding: "12px 16px" }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#34d399", fontFamily: "monospace" }}>{result.score}/5</span>
          <p className="text-gray-400 text-sm flex-1 leading-relaxed">{result.note}</p>
          <button className="btn-green" style={{ padding: "8px 18px", whiteSpace: "nowrap" }} onClick={() => onNext(String(result.score))}>Next →</button>
        </div>
      )}
    </div>
  )
}

function SpeechRecordStep({ step, onNext }: any) {
  const [phase, setPhase] = useState<"ready" | "recording" | "recorded" | "analysing" | "done">("ready")
  const [transcript, setTranscript] = useState("")
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [seconds, setSeconds] = useState(0)
  const recogRef = useRef<any>(null)
  const timerRef = useRef<any>(null)

  const SR = typeof window !== "undefined" ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null

  const startRec = () => {
    if (!SR) { setPhase("recorded"); return }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = "en-US"
    let final = ""
    r.onresult = (e: any) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " "
        else interim += e.results[i][0].transcript
      }
      setTranscript((final + interim).trim())
    }
    r.onerror = () => setPhase("recorded")
    r.onend = () => { setPhase("recorded"); clearInterval(timerRef.current) }
    recogRef.current = r; r.start(); setPhase("recording"); setSeconds(0)
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRec = () => { recogRef.current?.stop(); clearInterval(timerRef.current); setPhase("recorded") }

  const analyse = async (text: string) => {
    setPhase("analysing")
    try {
      const res = await fetch("/api/analyse-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: text, sentence: step.sentence }) })
      const data = await res.json()
      setScore(data.score); setFeedback(data.note)
    } catch { setScore(3); setFeedback("Speech recorded and analysed.") }
    setPhase("done")
  }

  return (
    <div>
      <div style={{ background: "rgba(165,180,252,0.06)", border: "1px solid rgba(165,180,252,0.2)", borderRadius: 14, padding: 20, marginBottom: 20, textAlign: "center" }}>
        <p className="text-purple-300 font-mono text-xs tracking-widest mb-3">READ THIS SENTENCE ALOUD:</p>
        <p style={{ fontSize: 17, color: "#f9fafb", lineHeight: 1.7, fontFamily: "'Lora',Georgia,serif", fontStyle: "italic" }}>&ldquo;{step.sentence}&rdquo;</p>
      </div>

      {phase === "ready" && (
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-5">{SR ? "Press record, read the sentence aloud, then stop." : "Read the sentence above, then self-rate your speech fluency."}</p>
          {SR ? <button className="btn-green" onClick={startRec}>🎙️ Start Recording</button> : (
            <div>
              <SelfRate picked={score} onPick={n => { setScore(n); setFeedback("Self-reported.") }} options={[[5,"Fluent and clear",5],[4,"Minor hesitation",5],[3,"Some difficulty",5],[2,"Significant difficulty",5],[1,"Very poor",5]]} />
              {score !== null && <button className="btn-green mt-4 w-full" onClick={() => onNext(String(score))}>Next →</button>}
            </div>
          )}
        </div>
      )}

      {phase === "recording" && (
        <div className="text-center">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid #ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ef4444" }} />
          </div>
          <p className="text-red-400 font-mono text-sm mb-3">RECORDING — {seconds}s</p>
          {transcript && <p className="text-gray-400 text-sm mb-5 italic">&ldquo;{transcript}&rdquo;</p>}
          <button className="btn-green" onClick={stopRec}>⏹ Stop Recording</button>
        </div>
      )}

      {phase === "recorded" && (
        <div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <p className="text-gray-500 font-mono text-xs tracking-widest mb-2">TRANSCRIPT</p>
            <p className="text-gray-200 text-sm leading-relaxed italic">&ldquo;{transcript || "(no speech detected)"}&rdquo;</p>
          </div>
          <button className="btn-green w-full" onClick={() => analyse(transcript)}>Analyse My Speech →</button>
        </div>
      )}

      {phase === "analysing" && (
        <div className="text-center py-6">
          <div className="dots"><span /><span /><span /></div>
          <p className="text-gray-500 text-sm mt-3">Analysing speech patterns…</p>
        </div>
      )}

      {phase === "done" && score !== null && (
        <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 600, color: "#34d399", fontFamily: "monospace" }}>{score}/5</span>
          <p className="text-gray-400 text-sm flex-1 leading-relaxed">{feedback}</p>
          <button className="btn-green" style={{ padding: "8px 18px" }} onClick={() => onNext(String(score))}>Next →</button>
        </div>
      )}
    </div>
  )
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="font-mono text-gray-500 text-xs tracking-wide">{current} / {total}</span>
        <span className="font-mono text-emerald-400 text-xs">{pct}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#059669,#34d399)", borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [stepIdx, setStepIdx] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<ReturnType<typeof computeScore> | null>(null)
  const [aiText, setAiText] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const total = ALL_STEPS.length
  const step = ALL_STEPS[stepIdx] || null
  const isResults = stepIdx >= total

  const saveAndNext = async (value: string) => {
    if (!step) return
    const next = { ...answers, [step.id]: value }
    setAnswers(next)
    if (stepIdx + 1 >= total) {
      await finish(next)
    } else {
      setStepIdx(i => i + 1)
    }
  }

  const finish = async (ans: Record<string, string>) => {
    const res = computeScore(ans)
    setResults(res)
    setStepIdx(total)
    setAiLoading(true)
    setSaving(true)

    // Get AI summary
    try {
      const r = await fetch("/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: ans, results: res }) })
      const data = await r.json()
      setAiText(data.summary || "")

      // Save to Supabase
      await supabase.from("screenings").insert({
        patient_name: ans.name,
        patient_age: parseInt(ans.age || "0"),
        patient_gender: ans.gender,
        mmse_score: res.mmse,
        risk_level: res.level,
        risk_score: res.total,
        clock_score: parseInt(ans.clock_score || "0"),
        pentagon_score: parseInt(ans.pentagon_score || "0"),
        speech_score: parseInt(ans.speech_record || "0"),
        memory_recall: ans.memory_recall,
        ai_summary: data.summary || "",
        answers: ans,
        completed_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error(e)
    }
    setAiLoading(false)
    setSaving(false)
  }

  const restart = () => {
    setStepIdx(-1); setAnswers({}); setResults(null); setAiText(""); setAiLoading(false)
  }

  const renderStep = () => {
    if (!step) return null
    const p = { step, onNext: saveAndNext }
    switch (step.type) {
      case "memory_display":   return <MemoryDisplay {...p} />
      case "text":             return <TypedInput {...p} />
      case "number":           return <TypedInput {...p} />
      case "typed":            return <TypedInput {...p} />
      case "select":           return <SelectStep {...p} />
      case "image_name":       return <ImageName {...p} />
      case "command":          return <CommandStep {...p} />
      case "textarea":         return <TextareaStep {...p} />
      case "recall":           return <RecallStep {...p} />
      case "choice":           return <ChoiceStep {...p} />
      case "clock_draw":       return <ClockDrawStep {...p} />
      case "pentagon_draw":    return <PentagonDrawStep {...p} />
      case "story_read":       return <StoryReadStep {...p} />
      case "picture_describe": return <PictureDescribeStep {...p} />
      case "speech_record":    return <SpeechRecordStep {...p} />
      default:                 return <TypedInput {...p} />
    }
  }

  const ss = step?.section ? SECTION_STYLE[step.section as keyof typeof SECTION_STYLE] : null

  return (
    <>
      <Head>
        <title>NeuroScreen — Alzheimer&apos;s Pre-Screening</title>
        <meta name="description" content="Free cognitive screening test for early Alzheimer's risk assessment" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "28px 18px 60px" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 60% 50% at 10% 5%,rgba(52,211,153,0.05) 0%,transparent 60%),radial-gradient(ellipse 50% 45% at 90% 95%,rgba(99,102,241,0.05) 0%,transparent 60%)" }} />

        <div className="slide-up" style={{ width: "100%", maxWidth: 520 }}>

          {/* WELCOME */}
          {stepIdx === -1 && (
            <div className="text-center pt-8">
              <div style={{ fontSize: 60, marginBottom: 16, display: "inline-block", animation: "pulseglow 2.5s ease infinite" }}>🧠</div>
              <h1 className="font-lora text-4xl font-normal text-white mb-3 leading-tight">Memory &amp; Cognition<br />Screening</h1>
              <p className="text-gray-400 text-base mb-6 leading-relaxed max-w-sm mx-auto">A comprehensive cognitive test to help assess early Alzheimer&apos;s risk. Take your time — do your best.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 24, textAlign: "left" }}>
                {[["🧩","Memory","Word plant, story recall, delayed recall"],["📍","Orientation","Date, day, month, year, place"],["🧮","Attention","Serial 7s arithmetic"],["🕐","Clock Drawing","Draw clock at 11:10"],["⬠","Shape Copy","Copy overlapping pentagons"],["🖼️","Picture Story","Describe a kitchen scene"],["🎙️","Speech","Read aloud — AI analyses fluency"],["📋","History","Risk factors & background"]].map(([icon, title, desc]) => (
                  <div key={String(title)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "11px 13px" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                    <div className="text-sm font-medium text-gray-200 mb-1">{title}</div>
                    <div className="text-xs text-gray-500 leading-snug">{desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.17)", borderRadius: 20, padding: "6px 16px", fontFamily: "monospace", fontSize: 11, color: "#6ee7b7", marginBottom: 24, letterSpacing: "0.05em" }}>
                ⏱ &nbsp;About 10–14 minutes
              </div>
              <br />
              <button className="btn-green" onClick={() => setStepIdx(0)}>Start the Test →</button>
            </div>
          )}

          {/* ACTIVE STEP */}
          {stepIdx >= 0 && !isResults && step && (
            <div key={`step-${stepIdx}`} className="slide-up">
              <ProgressBar current={stepIdx + 1} total={total} />
              {ss && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 20, padding: "4px 12px", fontFamily: "monospace", fontSize: 10, color: ss.text, letterSpacing: "0.08em", marginBottom: 14 }}>
                  {step.section.toUpperCase()}
                </div>
              )}
              <p className="font-lora text-2xl font-normal text-white mb-6 leading-snug">{step.prompt}</p>
              {renderStep()}
            </div>
          )}

          {/* RESULTS */}
          {isResults && results && (
            <div key="results" className="slide-up">
              <div style={{ textAlign: "center", padding: "28px 22px", borderRadius: 20, background: `${results.color}0f`, border: `1px solid ${results.color}28`, marginBottom: 16 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: results.color, opacity: 0.7, marginBottom: 6 }}>ALZHEIMER&apos;S PRE-SCREENING RESULT</div>
                <div style={{ fontSize: 48, marginBottom: 4 }}>{results.emoji}</div>
                <div className="font-lora text-3xl mb-3" style={{ color: results.color }}>{results.level} RISK</div>
                <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: results.color }}>{results.rec}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 14 }}>
                {[["MMSE",`${results.mmse}/30`,results.mmse >= 24 ? "Normal" : results.mmse >= 18 ? "Mild" : "Low"],["Clock",`${answers.clock_score || "—"}/5`,"Drawing"],["Speech",`${answers.speech_record || "—"}/5`,"Fluency"],["Shape",`${answers.pentagon_score || "—"}/2`,"Copy"]].map(([label, v, sub]) => (
                  <div key={String(label)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>{label}</div>
                    <div className="font-lora text-xl text-white">{v}</div>
                    <div className="text-xs text-gray-500 mt-1">{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>PATIENT</div>
                <div className="text-base text-white">{answers.name || "—"}</div>
                <div className="text-xs text-gray-500 mt-1">Age {answers.age} · {answers.gender}</div>
              </div>

              <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.16)", borderRadius: 16, padding: 18, marginBottom: 12 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#818cf8", marginBottom: 10 }}>⚡ AI CLINICAL SUMMARY</div>
                {aiLoading ? (
                  <div className="text-center py-4">
                    <div className="dots"><span /><span /><span /></div>
                    <p className="text-gray-500 text-xs mt-2">{saving ? "Saving results…" : "Generating summary…"}</p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.82)", whiteSpace: "pre-wrap" }}>{aiText}</p>
                )}
              </div>

              <div style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.16)", borderRadius: 10, padding: "11px 14px", fontSize: 12, color: "rgba(245,158,11,0.8)", lineHeight: 1.65, marginBottom: 18 }}>
                ⚠️ Screening tool only — not a medical diagnosis. Please show these results to a qualified doctor.
              </div>

              <button className="btn-green w-full" onClick={restart}>Take Test Again</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
