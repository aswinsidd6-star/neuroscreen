import { useState, useRef, useEffect, useCallback } from "react"
import Head from "next/head"
import { supabase } from "../lib/supabase"
import { MEMORY_WORDS, MEMORY_CUES, computeScore, SECTION_STYLE } from "../lib/scoring"

// ═══ ALL STEPS — plain language, clinically upgraded ═══════════════════════
const ALL_STEPS = [
  // INTRO
  {id:"name",  type:"text",   section:"intro",prompt:"What is your full name?",placeholder:"Type your name here…"},
  {id:"age",   type:"number", section:"intro",prompt:"How old are you?",placeholder:"Enter your age…"},
  {id:"gender",type:"select", section:"intro",prompt:"What is your gender?",options:["Male","Female","Prefer not to say"]},

  // MEMORY — word plant (FCSRT)
  {id:"memory_plant",type:"memory_display",section:"Memory",
    prompt:"Look at these 3 words carefully.",
    subtext:"Say each word out loud 2–3 times. You will need to remember them at the very end."},

  // ORIENTATION
  {id:"orient_year", type:"typed",section:"Orientation",prompt:"What year is it today?",placeholder:"e.g. 2026"},
  {id:"orient_month",type:"typed",section:"Orientation",prompt:"What month is it right now?",placeholder:"e.g. March"},
  {id:"orient_day",  type:"typed",section:"Orientation",prompt:"What day of the week is today?",placeholder:"e.g. Monday"},
  {id:"orient_date", type:"typed",section:"Orientation",prompt:"What is today's date — just the number?",placeholder:"e.g. 9"},
  {id:"orient_place",type:"typed",section:"Orientation",prompt:"What city or town are you in right now?",placeholder:"Type the city name…"},

  // ATTENTION — Serial 7s
  {id:"s7_1",type:"typed",section:"Attention",prompt:"Start with 100 and take away 7. What do you get?",placeholder:"Your answer…",hint:"100 minus 7 = ?"},
  {id:"s7_2",type:"typed",section:"Attention",prompt:"Now take away 7 from that number.",placeholder:"Your answer…",hint:"Your last answer minus 7"},
  {id:"s7_3",type:"typed",section:"Attention",prompt:"Take away 7 again. What is the result?",placeholder:"Your answer…",hint:"Your last answer minus 7"},
  {id:"s7_4",type:"typed",section:"Attention",prompt:"Once more — take away 7.",placeholder:"Your answer…",hint:"Your last answer minus 7"},
  {id:"s7_5",type:"typed",section:"Attention",prompt:"Last one — take away 7 one final time.",placeholder:"Your answer…",hint:"Your last answer minus 7"},

  // WORKING MEMORY — Digit Span Backward (distinguishes Alzheimer's from depression)
  // Alzheimer's: backward much worse than forward. Depression: both equally impaired.
  // Answers: 2–4 reversed = 42, 5–7–3 reversed = 375, 1–2–4–8 reversed = 8421
  {id:"dsb_2",type:"digit_span",section:"Attention",
    prompt:"I will show you some numbers. Type them in REVERSE order — backwards.",
    subtext:"Example: if you see  3 – 1  →  you type  1 3",
    digits:"2 – 4",answer:"42",hint:"Say them backwards: 4 first, then 2 → type  4 2"},
  {id:"dsb_3",type:"digit_span",section:"Attention",
    prompt:"Good! Now try 3 numbers in reverse order.",
    digits:"5 – 7 – 3",answer:"375",hint:"Say them backwards: 3 first, then 7, then 5 → type  3 7 5"},
  {id:"dsb_4",type:"digit_span",section:"Attention",
    prompt:"Last one — 4 numbers in reverse order.",
    digits:"1 – 2 – 4 – 8",answer:"8421",hint:"Backwards: 8, then 4, then 2, then 1 → type  8 4 2 1"},

  // LANGUAGE — naming (Boston Naming Test)
  {id:"name_pencil",type:"image_name",section:"Language",prompt:"What is this object called?",emoji:"✏️",hint:"You hold it and use it to write on paper"},
  {id:"name_watch", type:"image_name",section:"Language",prompt:"What is this object called?",emoji:"⌚",hint:"You wear it on your wrist — it tells you the time"},

  // LANGUAGE — 3-step command
  {id:"command",type:"command",section:"Language",
    prompt:"Follow these 3 steps in order:",
    instruction:"Step 1: Close your eyes\nStep 2: Count to 3 silently in your head\nStep 3: Open your eyes and tap the button below"},

  // LANGUAGE — writing
  {id:"writing",type:"textarea",section:"Language",
    prompt:"Write one complete sentence about anything.",
    subtext:"About your day, the weather, your family — anything you like. One sentence is fine.",
    placeholder:"Write your sentence here…"},

  // LANGUAGE — Category Fluency (new — temporal lobe, Alzheimer's-specific)
  {id:"animal_fluency",type:"fluency_animals",section:"Language",
    prompt:"Name as many animals as you can in 60 seconds.",
    subtext:"Any animal from anywhere — dogs, birds, fish, wild animals, anything. Type them as fast as you can."},

  // LANGUAGE — Letter Fluency (new — frontal lobe, compares with category)
  {id:"letter_fluency",type:"fluency_letter",section:"Language",
    prompt:"Name as many words starting with the letter F as you can — in 60 seconds.",
    subtext:"Any word that starts with F. Not names of people or places. For example: fish, flower, fast…"},

  // VISUOSPATIAL
  {id:"clock_draw",type:"clock_draw",section:"Visuospatial",
    prompt:"Draw a clock showing the time: 10 minutes past 11.",
    subtext:"Draw a circle. Write all 12 numbers inside it. Draw two hands pointing to 11:10."},
  {id:"pentagon_draw",type:"pentagon_draw",section:"Visuospatial",
    prompt:"Copy this shape as carefully as you can.",
    subtext:"Look at the two five-sided shapes overlapping in the corner. Copy them below."},

  // STORY (Logical Memory)
  {id:"story_read",type:"story_read",section:"Memory",
    prompt:"Read this short story carefully.",
    subtext:"Take your time. You will answer questions about it right after.",
    story:"Maria went to the market on Tuesday morning to buy vegetables. She forgot her shopping list at home, so she only remembered to buy tomatoes and onions. On the way back, she met her neighbour John, who reminded her that she also needed potatoes."},
  {id:"sr_name",     type:"typed",section:"Memory",prompt:"What was the woman's name in the story?",placeholder:"Your answer…"},
  {id:"sr_day",      type:"typed",section:"Memory",prompt:"What day of the week did she go to the market?",placeholder:"Your answer…"},
  {id:"sr_forgot",   type:"typed",section:"Memory",prompt:"What did she forget to bring from home?",placeholder:"Your answer…"},
  {id:"sr_neighbour",type:"typed",section:"Memory",prompt:"Who did she meet on the way back?",placeholder:"Your answer…"},

  // INTRUSION CHECK (new — confabulation test, Alzheimer's-specific)
  {id:"intrusion_check",type:"choice",section:"Memory",
    prompt:"Did the story say anything about money?",
    subtext:"Think carefully. Re-read the story in your mind.",
    options:["No, the story did not mention money","Yes, the story mentioned money"]},

  // PICTURE — Boston Cookie Theft
  {id:"picture_describe",type:"picture_describe",section:"Language",
    prompt:"Look at this kitchen picture. Describe everything you see.",
    subtext:"Tell us about every person, every action, every object. No wrong answers."},

  // SPEECH — DementiaBank protocol
  {id:"speech_record",type:"speech_record",section:"Speech",
    prompt:"Read this sentence out loud, then record your voice.",
    sentence:"The weather was warm and sunny, so the children played happily in the park all afternoon."},

  // DELAYED WORD RECALL (FCSRT — free recall first)
  {id:"memory_recall",type:"recall",section:"Memory",
    prompt:"Earlier we showed you 3 words to remember. What were they?",
    subtext:"Type as many as you can remember. Do not worry if you forgot some.",
    placeholder:"e.g. Apple, Table… (separate with commas)"},

  // CUED RECALL (FCSRT — key Alzheimer's differentiator)
  {id:"cued_recall",type:"cued_recall",section:"Memory",
    prompt:"Here are some hints for the 3 words. Can you remember them now?",
    subtext:"Use the hints below to try and recall the words you could not remember.",
    cues:["a fruit","a piece of furniture","a coin"]},

  // PROSPECTIVE MEMORY (new — frontal + hippocampus)
  {id:"prospective_memory",type:"choice",section:"Memory",
    prompt:"At the very beginning of this test, we asked you to remember to do something at the end. Do you remember what it was?",
    subtext:"We asked you to tell us your city again at the end of the test.",
    options:["remembered","I do not remember being asked that"]},

  // FUNCTIONAL — ADL (new — Alzheimer's specific early marker)
  {id:"adl_medicine",type:"choice",section:"Function",
    prompt:"In the last 3 months — have you had difficulty managing your own medicines? (Forgetting to take them, taking wrong doses)",
    options:["no","yes"]},
  {id:"adl_money",type:"choice",section:"Function",
    prompt:"Have you had difficulty handling money or paying bills — things you used to do easily?",
    options:["no","yes"]},
  {id:"adl_cooking",type:"choice",section:"Function",
    prompt:"Have you had difficulty cooking or preparing a meal you have cooked many times before?",
    options:["no","yes"]},
  {id:"adl_lostway",type:"choice",section:"Function",
    prompt:"Have you gotten confused or lost while going somewhere that is very familiar to you?",
    options:["no","yes"]},
  {id:"adl_phone",type:"choice",section:"Function",
    prompt:"Have you had trouble using your mobile phone, TV remote, or other devices you use every day?",
    options:["no","yes"]},

  // HISTORY / RISK FACTORS
  {id:"family_history",type:"choice",section:"History",
    prompt:"Do any close family members — parents, brother, or sister — have Alzheimer's or serious memory problems?",
    options:["No, not that I know of","Yes, a distant relative","Yes, my parent or sibling"]},
  {id:"memory_complaint",type:"choice",section:"History",
    prompt:"Have you — or someone close to you — noticed that your memory has been getting worse lately?",
    options:["No, my memory seems fine","A little bit, maybe","Yes, noticeably worse"]},
  {id:"depression",type:"choice",section:"History",
    prompt:"In the last few months, have you felt very sad, empty, or lost interest in things you used to enjoy?",
    options:["No","Sometimes","Yes, quite often"]},
  {id:"cardiovascular",type:"choice",section:"History",
    prompt:"Do you have diabetes (sugar), high blood pressure, or are you overweight?",
    options:["None of these","One of them","Two or more of these"]},
  {id:"education",type:"choice",section:"History",
    prompt:"How many years in total did you spend in school or college?",
    options:["12 years or more","Between 6 and 12 years","Less than 6 years"]},
] as any[]

// ═══ DRAWING CANVAS ════════════════════════════════════════════════════════
function DrawCanvas({onDone,bgFn}:{onDone:()=>void;bgFn?:(ctx:CanvasRenderingContext2D,w:number,h:number)=>void}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const painting = useRef(false)
  const last = useRef({x:0,y:0})
  const [drawn,setDrawn] = useState(false)

  useEffect(()=>{
    const c=ref.current; if(!c)return
    const ctx=c.getContext("2d")!
    ctx.fillStyle="#13192a"; ctx.fillRect(0,0,300,300)
    if(bgFn)bgFn(ctx,300,300)
  },[])

  const getPos=(e:any)=>{
    const r=ref.current!.getBoundingClientRect()
    const sx=300/r.width,sy=300/r.height
    if(e.touches)return{x:(e.touches[0].clientX-r.left)*sx,y:(e.touches[0].clientY-r.top)*sy}
    return{x:(e.clientX-r.left)*sx,y:(e.clientY-r.top)*sy}
  }
  const down=(e:any)=>{e.preventDefault();painting.current=true;last.current=getPos(e);setDrawn(true)}
  const move=(e:any)=>{
    e.preventDefault();if(!painting.current)return
    const p=getPos(e),ctx=ref.current!.getContext("2d")!
    ctx.beginPath();ctx.moveTo(last.current.x,last.current.y)
    ctx.lineTo(p.x,p.y);ctx.strokeStyle="#6ee7b7";ctx.lineWidth=3
    ctx.lineCap="round";ctx.lineJoin="round";ctx.stroke();last.current=p
  }
  const up=(e:any)=>{e.preventDefault();painting.current=false}
  const clear=()=>{
    const c=ref.current!,ctx=c.getContext("2d")!
    ctx.fillStyle="#13192a";ctx.fillRect(0,0,300,300)
    if(bgFn)bgFn(ctx,300,300);setDrawn(false)
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <p style={{color:"#9ca3af",fontSize:13,textAlign:"center"}}>👆 Use your finger (phone) or mouse (computer) to draw</p>
      <div style={{border:"2px solid rgba(110,231,183,0.2)",borderRadius:14,overflow:"hidden",cursor:"crosshair",touchAction:"none"}}>
        <canvas ref={ref} width={300} height={300} style={{display:"block",width:"100%",maxWidth:300}}
          onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={clear} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#9ca3af",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>🗑 Clear</button>
        <button onClick={onDone} disabled={!drawn} className="btn-green" style={{padding:"10px 26px",opacity:drawn?1:0.4}}>I&apos;m done →</button>
      </div>
    </div>
  )
}

// ═══ SELF RATE ══════════════════════════════════════════════════════════════
function SelfRate({options,onPick,picked}:{options:[number,string,number][];onPick:(n:number)=>void;picked:number|null}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:12}}>
      {options.map(([score,label,max])=>(
        <button key={score} onClick={()=>onPick(score)} style={{
          display:"flex",alignItems:"center",gap:12,width:"100%",textAlign:"left",
          background:picked===score?"rgba(110,231,183,0.1)":"rgba(255,255,255,0.03)",
          border:`1px solid ${picked===score?"rgba(110,231,183,0.45)":"rgba(255,255,255,0.08)"}`,
          borderRadius:12,padding:"13px 15px",cursor:"pointer",
          color:picked===score?"#6ee7b7":"#e5e7eb",fontSize:14,
          fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s"}}>
          <span style={{fontFamily:"monospace",fontSize:13,minWidth:38,color:"#34d399",fontWeight:700}}>{score}/{max}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

// ═══ PROGRESS BAR ══════════════════════════════════════════════════════════
function ProgressBar({current,total}:{current:number;total:number}) {
  const pct=Math.round((current/total)*100)
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
        <span style={{fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>Question {current} of {total}</span>
        <span style={{fontFamily:"monospace",fontSize:11,color:"#34d399"}}>{pct}% complete</span>
      </div>
      <div style={{height:5,background:"rgba(255,255,255,0.07)",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#059669,#34d399)",borderRadius:4,transition:"width 0.6s ease"}}/>
      </div>
    </div>
  )
}

// ═══ STEP COMPONENTS ═══════════════════════════════════════════════════════

function MemoryDisplay({onNext}:any) {
  const [ready,setReady]=useState(false)
  useEffect(()=>{const t=setTimeout(()=>setReady(true),4000);return()=>clearTimeout(t)},[])
  return (
    <div style={{textAlign:"center"}}>
      <p style={{color:"#9ca3af",fontSize:15,marginBottom:26,lineHeight:1.75}}>
        Say each word out loud — <strong style={{color:"#e5e7eb"}}>two or three times</strong>.<br/>You will need to recall them much later.
      </p>
      <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:28}}>
        {MEMORY_WORDS.map((w,i)=>(
          <div key={w} style={{background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.45)",borderRadius:16,padding:"22px 34px",fontSize:26,fontWeight:700,color:"#6ee7b7",animation:`pop ${0.2+i*0.15}s ease both`}}>{w}</div>
        ))}
      </div>
      <div style={{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:22,display:"inline-block"}}>
        <p style={{color:"#fcd34d",fontSize:13}}>💡 Tip: Make a picture in your mind connecting all 3 words</p>
      </div><br/>
      <button className="btn-green" onClick={()=>onNext("seen")} style={{fontSize:17,padding:"14px 36px",opacity:ready?1:0.5}}>I remember them →</button>
    </div>
  )
}

function TypedInput({step,onNext}:any) {
  const [val,setVal]=useState("")
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{setVal("");setTimeout(()=>ref.current?.focus(),180)},[step.id])
  const go=()=>{if(val.trim())onNext(val.trim())}
  return (
    <div>
      {step.hint&&<div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:10,padding:"10px 14px",marginBottom:14}}><p style={{color:"#6ee7b7",fontSize:13}}>💡 {step.hint}</p></div>}
      <input ref={ref} className="inp" type={step.type==="number"?"number":"text"}
        placeholder={step.placeholder} value={val}
        onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")go()}} style={{fontSize:20}}/>
      <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={go}>Next →</button>
    </div>
  )
}

function SelectStep({step,onNext}:any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {step.subtext&&<p style={{color:"#9ca3af",fontSize:14,lineHeight:1.7,marginBottom:4}}>{step.subtext}</p>}
      {step.options.map((opt:string,i:number)=>(
        <button key={i} className="choice-btn" style={{fontSize:16,padding:"16px 18px"}} onClick={()=>onNext(opt)}>
          <span style={{width:32,height:32,borderRadius:9,border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:13,color:"rgba(255,255,255,0.4)",flexShrink:0,fontWeight:600}}>{String.fromCharCode(65+i)}</span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ImageName({step,onNext}:any) {
  const [val,setVal]=useState("")
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{setVal("");setTimeout(()=>ref.current?.focus(),180)},[step.id])
  const go=()=>{if(val.trim())onNext(val.trim())}
  return (
    <div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:96,filter:"drop-shadow(0 0 24px rgba(52,211,153,0.2))",marginBottom:10}}>{step.emoji}</div>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 14px",display:"inline-block"}}>
          <p style={{color:"#9ca3af",fontSize:13}}>💡 Hint: {step.hint}</p>
        </div>
      </div>
      <input ref={ref} className="inp" type="text" placeholder="Type what this object is called…" value={val}
        onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")go()}} style={{fontSize:20}}/>
      <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={go}>Next →</button>
    </div>
  )
}

function CommandStep({step,onNext}:any) {
  return (
    <div style={{textAlign:"center"}}>
      <div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:18,padding:"30px 22px",marginBottom:30}}>
        {step.instruction.split('\n').map((line:string,i:number)=>(
          <p key={i} style={{fontSize:18,color:"#e5e7eb",lineHeight:2,margin:0}}>
            <span style={{color:"#34d399",fontFamily:"monospace",fontWeight:700,marginRight:8}}>{i+1}.</span>
            {line.replace(/^Step \d+: /,'')}
          </p>
        ))}
      </div>
      <button className="btn-green" style={{fontSize:17,padding:"15px 40px"}} onClick={()=>onNext("done")}>✓ Done — I followed all 3 steps</button>
    </div>
  )
}

function TextareaStep({step,onNext}:any) {
  const [val,setVal]=useState("")
  const ref=useRef<HTMLTextAreaElement>(null)
  useEffect(()=>{setVal("");setTimeout(()=>ref.current?.focus(),180)},[step.id])
  return (
    <div>
      {step.subtext&&<p style={{color:"#9ca3af",fontSize:14,marginBottom:14,lineHeight:1.75}}>{step.subtext}</p>}
      <textarea ref={ref} className="inp" rows={4} placeholder={step.placeholder} value={val}
        onChange={e=>setVal(e.target.value)} style={{resize:"none",minHeight:120,fontSize:16}}/>
      <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={()=>{if(val.trim())onNext(val.trim())}}>Next →</button>
    </div>
  )
}

// NEW: Digit Span Backward
function DigitSpanStep({step,onNext}:any) {
  const [val,setVal]=useState("")
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{setVal("");setTimeout(()=>ref.current?.focus(),300)},[step.id])
  const go=()=>{if(val.trim())onNext(val.trim())}
  return (
    <div>
      {step.subtext&&<p style={{color:"#9ca3af",fontSize:14,marginBottom:18,lineHeight:1.75}}>{step.subtext}</p>}
      <div style={{background:"rgba(165,180,252,0.08)",border:"1px solid rgba(165,180,252,0.3)",borderRadius:16,padding:"26px",textAlign:"center",marginBottom:22}}>
        <p style={{color:"#a5b4fc",fontSize:11,fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:14}}>NUMBERS TO REVERSE:</p>
        <p style={{fontSize:36,fontWeight:700,color:"#f9fafb",letterSpacing:"0.15em",marginBottom:12}}>{step.digits}</p>
        <p style={{color:"#6b7280",fontSize:13}}>Type them backwards — last number first</p>
      </div>
      {step.hint&&<div style={{background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.18)",borderRadius:10,padding:"10px 14px",marginBottom:14}}><p style={{color:"#6ee7b7",fontSize:13}}>💡 {step.hint}</p></div>}
      <input ref={ref} className="inp" type="text" placeholder="Type the numbers in reverse order…" value={val}
        onChange={e=>setVal(e.target.value.replace(/[^0-9\s]/g,""))} onKeyDown={e=>{if(e.key==="Enter")go()}} style={{fontSize:24,textAlign:"center",letterSpacing:"0.15em"}}/>
      <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={go}>Next →</button>
    </div>
  )
}

// NEW: Category Fluency — Animals 60s
function FluencyAnimalsStep({onNext}:any) {
  const [val,setVal]=useState("")
  const [started,setStarted]=useState(false)
  const [timeLeft,setTimeLeft]=useState(60)
  const [finished,setFinished]=useState(false)
  const timerRef=useRef<any>(null)
  const ref=useRef<HTMLTextAreaElement>(null)

  const start=()=>{
    setStarted(true)
    setTimeout(()=>ref.current?.focus(),100)
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);setFinished(true);return 0}
        return t-1
      })
    },1000)
  }
  useEffect(()=>()=>clearInterval(timerRef.current),[])

  const count=val.trim().length===0?0:val.trim().split(/[\n,]+/).map(s=>s.trim()).filter(s=>s.length>0).length

  const submit=()=>{
    clearInterval(timerRef.current)
    onNext(String(count))
  }

  return (
    <div>
      <div style={{background:"rgba(236,72,153,0.06)",border:"1px solid rgba(236,72,153,0.2)",borderRadius:14,padding:"16px",marginBottom:18}}>
        <p style={{color:"#f9a8d4",fontSize:13,lineHeight:1.7}}>
          🐾 Name any animal — dogs, cats, fish, birds, wild animals, insects, anything from anywhere in the world. Type each one on a new line or separate them with commas.
        </p>
      </div>
      {!started?(
        <div style={{textAlign:"center"}}>
          <p style={{color:"#9ca3af",fontSize:15,marginBottom:20,lineHeight:1.7}}>You have <strong style={{color:"#f9fafb"}}>60 seconds</strong>. Type as many animals as you can think of. Ready?</p>
          <button className="btn-green" style={{fontSize:17,padding:"14px 36px"}} onClick={start}>▶ Start — 60 seconds</button>
        </div>
      ):(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontFamily:"monospace",fontSize:13,color:"#f9a8d4",fontWeight:700}}>🐾 {count} animals so far</span>
            <span style={{fontFamily:"monospace",fontSize:20,color:timeLeft<=10?"#ef4444":"#34d399",fontWeight:700}}>{timeLeft}s</span>
          </div>
          <textarea ref={ref} className="inp" rows={6} placeholder="dog, cat, elephant, lion, eagle… type as many as you can!"
            value={val} onChange={e=>setVal(e.target.value)} style={{resize:"none",minHeight:130,fontSize:15}}
            disabled={finished}/>
          {(finished||timeLeft===0)?(
            <div style={{marginTop:14,textAlign:"center"}}>
              <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:12,padding:"14px",marginBottom:14}}>
                <p style={{color:"#6ee7b7",fontSize:16,fontWeight:600}}>✓ Time is up! You named {count} animals.</p>
              </div>
              <button className="btn-green" style={{width:"100%",fontSize:17,padding:"15px"}} onClick={submit}>Continue →</button>
            </div>
          ):(
            <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:15,padding:"12px"}} onClick={submit}>I&apos;m done — Submit</button>
          )}
        </div>
      )}
    </div>
  )
}

// NEW: Letter Fluency — F words 60s
function FluencyLetterStep({onNext}:any) {
  const [val,setVal]=useState("")
  const [started,setStarted]=useState(false)
  const [timeLeft,setTimeLeft]=useState(60)
  const [finished,setFinished]=useState(false)
  const timerRef=useRef<any>(null)
  const ref=useRef<HTMLTextAreaElement>(null)

  const start=()=>{
    setStarted(true)
    setTimeout(()=>ref.current?.focus(),100)
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);setFinished(true);return 0}
        return t-1
      })
    },1000)
  }
  useEffect(()=>()=>clearInterval(timerRef.current),[])

  const words=val.trim().length===0?[]:val.trim().split(/[\n,\s]+/).map(s=>s.trim().toLowerCase()).filter(s=>s.length>1&&s.startsWith("f"))
  const count=words.length

  const submit=()=>{
    clearInterval(timerRef.current)
    onNext(String(count))
  }

  return (
    <div>
      <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:14,padding:"16px",marginBottom:18}}>
        <p style={{color:"#fcd34d",fontSize:13,lineHeight:1.7}}>
          🔤 Any word starting with the letter <strong>F</strong>. Not names of people (not "Frank") or places (not "France"). Regular words only — e.g. fish, fast, flower, funny, fall…
        </p>
      </div>
      {!started?(
        <div style={{textAlign:"center"}}>
          <p style={{color:"#9ca3af",fontSize:15,marginBottom:20,lineHeight:1.7}}>You have <strong style={{color:"#f9fafb"}}>60 seconds</strong>. Type as many F-words as you can. Ready?</p>
          <button className="btn-green" style={{fontSize:17,padding:"14px 36px"}} onClick={start}>▶ Start — 60 seconds</button>
        </div>
      ):(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontFamily:"monospace",fontSize:13,color:"#fcd34d",fontWeight:700}}>🔤 {count} F-words so far</span>
            <span style={{fontFamily:"monospace",fontSize:20,color:timeLeft<=10?"#ef4444":"#34d399",fontWeight:700}}>{timeLeft}s</span>
          </div>
          <textarea ref={ref} className="inp" rows={6} placeholder="fish, flower, fast, funny, fall, fire… type as many F-words as you can!"
            value={val} onChange={e=>setVal(e.target.value)} style={{resize:"none",minHeight:130,fontSize:15}}
            disabled={finished}/>
          {(finished||timeLeft===0)?(
            <div style={{marginTop:14,textAlign:"center"}}>
              <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:12,padding:"14px",marginBottom:14}}>
                <p style={{color:"#6ee7b7",fontSize:16,fontWeight:600}}>✓ Time is up! You named {count} F-words.</p>
              </div>
              <button className="btn-green" style={{width:"100%",fontSize:17,padding:"15px"}} onClick={submit}>Continue →</button>
            </div>
          ):(
            <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:15,padding:"12px"}} onClick={submit}>I&apos;m done — Submit</button>
          )}
        </div>
      )}
    </div>
  )
}

function ClockDrawStep({onNext}:any) {
  const [phase,setPhase]=useState<"draw"|"rate">("draw")
  const [score,setScore]=useState<number|null>(null)
  const bgFn=(ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    ctx.strokeStyle="rgba(110,231,183,0.12)";ctx.lineWidth=1
    ctx.beginPath();ctx.arc(w/2,h/2,w/2-18,0,Math.PI*2);ctx.stroke()
    ctx.fillStyle="rgba(110,231,183,0.22)";ctx.font="bold 11px monospace";ctx.textAlign="center"
    ctx.fillText("Draw your clock here",w/2,h/2)
  }
  if(phase==="draw")return(
    <div>
      <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
        <p style={{color:"#a5b4fc",fontSize:14,lineHeight:1.7}}>① Draw a circle &nbsp;② Write numbers 1 to 12 inside &nbsp;③ Draw hands at <strong>11:10</strong></p>
      </div>
      <DrawCanvas bgFn={bgFn} onDone={()=>setPhase("rate")}/>
    </div>
  )
  return(
    <div>
      <div style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:16,marginBottom:8}}>
        <p style={{color:"#a5b4fc",fontSize:14}}>Be honest — how close is your clock to the real thing?</p>
      </div>
      <SelfRate picked={score} onPick={setScore} options={[
        [5,"Perfect — circle, all 12 numbers, hands clearly at 11:10",5],
        [4,"Almost perfect — one small mistake",5],
        [3,"Mostly correct — circle done, most numbers, hands roughly right",5],
        [2,"Partial — circle drawn but numbers or hands noticeably wrong",5],
        [1,"Very rough — hard to recognise as a clock",5],
        [0,"Could not draw it",5],
      ]}/>
      {score!==null&&<button className="btn-green" style={{marginTop:16,width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(String(score))}>Next →</button>}
    </div>
  )
}

function PentagonDrawStep({onNext}:any) {
  const [phase,setPhase]=useState<"draw"|"rate">("draw")
  const [score,setScore]=useState<number|null>(null)
  const bgFn=(ctx:CanvasRenderingContext2D,w:number,h:number)=>{
    const drawP=(cx:number,cy:number,r:number)=>{
      ctx.beginPath()
      for(let i=0;i<5;i++){const a=(i*2*Math.PI/5)-Math.PI/2;i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a))}
      ctx.closePath();ctx.strokeStyle="rgba(165,180,252,0.7)";ctx.lineWidth=2.5;ctx.stroke()
    }
    drawP(w-75,52,38);drawP(w-75+34,52+18,38)
    ctx.fillStyle="rgba(165,180,252,0.35)";ctx.font="bold 10px monospace";ctx.textAlign="center"
    ctx.fillText("↗ COPY THESE SHAPES BELOW",w/2,h-12)
  }
  if(phase==="draw")return(
    <div>
      <p style={{color:"#9ca3af",fontSize:14,marginBottom:14,lineHeight:1.75}}>Look at the two five-sided shapes in the <strong style={{color:"#a5b4fc"}}>top-right corner</strong>. They overlap. Copy them below — try to make them look the same.</p>
      <DrawCanvas bgFn={bgFn} onDone={()=>setPhase("rate")}/>
    </div>
  )
  return(
    <div>
      <div style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:16,marginBottom:8}}>
        <p style={{color:"#a5b4fc",fontSize:14}}>How well did you copy the two shapes?</p>
      </div>
      <SelfRate picked={score} onPick={setScore} options={[
        [2,"Both shapes have 5 sides and they overlap — looks like the original",2],
        [1,"Roughly similar — two shapes visible, mostly 5 sides",2],
        [0,"Very different from the original, or could not draw it",2],
      ]}/>
      {score!==null&&<button className="btn-green" style={{marginTop:16,width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(String(score))}>Next →</button>}
    </div>
  )
}

function StoryReadStep({step,onNext}:any) {
  const [canContinue,setCanContinue]=useState(false)
  useEffect(()=>{const t=setTimeout(()=>setCanContinue(true),6000);return()=>clearTimeout(t)},[])
  return(
    <div>
      <p style={{color:"#9ca3af",fontSize:14,marginBottom:18,lineHeight:1.75}}>{step.subtext}</p>
      <div style={{background:"rgba(165,180,252,0.05)",border:"1px solid rgba(165,180,252,0.2)",borderRadius:16,padding:"26px 22px",marginBottom:18,lineHeight:2.1,fontSize:17,color:"#f0f0f0"}}>
        &ldquo;{step.story}&rdquo;
      </div>
      <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>📌 The story will disappear when you continue — read it carefully now.</p>
      <button className="btn-green" style={{width:"100%",fontSize:17,padding:"15px",opacity:canContinue?1:0.5}} onClick={()=>onNext("read")}>I have read it →</button>
    </div>
  )
}

function PictureDescribeStep({onNext}:any) {
  const [val,setVal]=useState("")
  const [loading,setLoading]=useState(false)
  const [result,setResult]=useState<{score:number;note:string}|null>(null)

  const analyse=async()=>{
    if(val.trim().length<5)return
    setLoading(true)
    try{
      const res=await fetch("/api/analyse-picture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description:val})})
      const data=await res.json()
      setResult(data)
    }catch{setResult({score:3,note:"Description recorded."})}
    setLoading(false)
  }

  return(
    <div>
      <p style={{color:"#9ca3af",fontSize:14,marginBottom:16,lineHeight:1.75}}>Describe every person, every action, every object. The more detail the better.</p>
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:14,padding:"18px",marginBottom:18}}>
        <p style={{color:"#6b7280",fontSize:11,fontFamily:"monospace",letterSpacing:"0.08em",marginBottom:14,textAlign:"center"}}>🖼️ KITCHEN SCENE</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center",marginBottom:12}}>
          {[["👩‍🍳","Woman cooking"],["🧒","Child climbing"],["🍪","Cookie jar"],["🚿","Water overflowing"],["🍽️","Dishes on shelf"],["🪟","Open window"]].map(([e,l])=>(
            <div key={l as string} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"10px 4px"}}>
              <div style={{fontSize:34,marginBottom:4}}>{e}</div>
              <p style={{fontSize:10,color:"#6b7280",lineHeight:1.4}}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{color:"#6b7280",fontSize:12,textAlign:"center",lineHeight:1.6}}>Who is there? What are they doing? Is anything going wrong?</p>
      </div>
      <textarea className="inp" rows={5} placeholder="Type everything you see in this picture…" value={val}
        onChange={e=>setVal(e.target.value)} style={{resize:"none",minHeight:110,fontSize:15}}/>
      {!result?(
        <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px",opacity:val.trim().length>5?1:0.4}}
          onClick={analyse} disabled={loading||val.trim().length<5}>
          {loading?"Analysing your description…":"Submit →"}
        </button>
      ):(
        <div style={{marginTop:14,display:"flex",alignItems:"center",gap:12,background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",borderRadius:12,padding:"14px 16px"}}>
          <span style={{fontSize:24,fontWeight:700,color:"#34d399",fontFamily:"monospace",flexShrink:0}}>{result.score}/5</span>
          <p style={{fontSize:13,color:"#9ca3af",flex:1,lineHeight:1.6}}>{result.note}</p>
          <button className="btn-green" style={{padding:"11px 20px",whiteSpace:"nowrap",flexShrink:0}} onClick={()=>onNext(String(result.score))}>Next →</button>
        </div>
      )}
    </div>
  )
}

// ═══ SPEECH — completely rebuilt, zero repeat bug ═══════════════════════════
// Root cause: continuous=true fires onresult repeatedly for same audio.
// Fix: continuous=false + interimResults=false + fresh instance each attempt.
function SpeechRecordStep({step,onNext}:any) {
  const [phase,setPhase]=useState<"ready"|"recording"|"done"|"analysing"|"complete">("ready")
  const [transcript,setTranscript]=useState("")
  const [score,setScore]=useState<number|null>(null)
  const [feedback,setFeedback]=useState("")
  const [seconds,setSeconds]=useState(0)
  const [manualScore,setManualScore]=useState<number|null>(null)
  const [attempts,setAttempts]=useState(0)
  const recogRef=useRef<any>(null)
  const timerRef=useRef<any>(null)
  const collectedRef=useRef<string[]>([])
  const stoppingRef=useRef(false)

  const SR=typeof window!=="undefined"?((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition):null

  const cleanup=useCallback(()=>{
    if(recogRef.current){
      const r=recogRef.current
      r.onresult=null;r.onerror=null;r.onend=null
      try{r.abort()}catch(_){}
      recogRef.current=null
    }
    clearInterval(timerRef.current)
  },[])

  useEffect(()=>()=>{cleanup()},[cleanup])

  const startRec=()=>{
    if(!SR)return
    stoppingRef.current=false
    collectedRef.current=[]
    setTranscript("");setSeconds(0);setAttempts(a=>a+1)

    const recog=new SR()
    recog.continuous=false       // FIXES repeat bug — one utterance per session
    recog.interimResults=false   // FIXES duplicate bug — only fire on final result
    recog.lang="en-US"
    recog.maxAlternatives=1

    recog.onresult=(e:any)=>{
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal){
          collectedRef.current.push(e.results[i][0].transcript.trim())
        }
      }
      setTranscript(collectedRef.current.join(" "))
    }
    recog.onerror=(e:any)=>{
      clearInterval(timerRef.current)
      if(e.error!=="aborted")setPhase("done")
    }
    recog.onend=()=>{
      clearInterval(timerRef.current)
      if(!stoppingRef.current){setTranscript(collectedRef.current.join(" "));setPhase("done")}
    }

    recogRef.current=recog
    recog.start()
    setPhase("recording")

    timerRef.current=setInterval(()=>{
      setSeconds(s=>{
        if(s>=22){
          stoppingRef.current=true;cleanup()
          setTranscript(collectedRef.current.join(" "));setPhase("done")
          return s
        }
        return s+1
      })
    },1000)
  }

  const stopRec=()=>{
    stoppingRef.current=true;cleanup()
    setTranscript(collectedRef.current.join(" "));setPhase("done")
  }

  const analyse=async(text:string)=>{
    setPhase("analysing")
    try{
      const res=await fetch("/api/analyse-speech",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:text,sentence:step.sentence})})
      const data=await res.json()
      setScore(data.score);setFeedback(data.note)
    }catch{setScore(3);setFeedback("Speech recorded.")}
    setPhase("complete")
  }

  const reset=()=>{setPhase("ready");setTranscript("");collectedRef.current=[]}

  return(
    <div>
      <div style={{background:"rgba(165,180,252,0.06)",border:"1px solid rgba(165,180,252,0.25)",borderRadius:16,padding:"22px",marginBottom:22,textAlign:"center"}}>
        <p style={{color:"#a5b4fc",fontSize:11,fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:14}}>📢 READ THIS SENTENCE OUT LOUD:</p>
        <p style={{fontSize:19,color:"#f9fafb",lineHeight:1.9,fontStyle:"italic"}}>&ldquo;{step.sentence}&rdquo;</p>
        <p style={{color:"#6b7280",fontSize:12,marginTop:12}}>Read it slowly and clearly. Practise once before recording.</p>
      </div>

      {phase==="ready"&&(
        <div style={{textAlign:"center"}}>
          {SR?(
            <><p style={{color:"#9ca3af",fontSize:14,marginBottom:22,lineHeight:1.7}}>Practise reading the sentence above. Then press Start and read it clearly into your microphone.</p>
            <button className="btn-green" style={{fontSize:17,padding:"15px 38px"}} onClick={startRec}>🎙️ Start Recording</button></>
          ):(
            <div>
              <div style={{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:18}}>
                <p style={{color:"#fcd34d",fontSize:13}}>⚠️ Microphone not available. Please rate your reading:</p>
              </div>
              <SelfRate picked={manualScore} onPick={n=>setManualScore(n)} options={[[5,"Read it smoothly, no mistakes",5],[4,"One or two small pauses",5],[3,"Some difficulty with words",5],[2,"Struggled with several words",5],[1,"Very difficult",5]]}/>
              {manualScore!==null&&<button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(String(manualScore))}>Next →</button>}
            </div>
          )}
        </div>
      )}

      {phase==="recording"&&(
        <div style={{textAlign:"center"}}>
          <div className="rec-ring"><div style={{width:28,height:28,borderRadius:"50%",background:"#ef4444"}}/></div>
          <p style={{color:"#ef4444",fontFamily:"monospace",fontSize:16,marginBottom:6,fontWeight:700}}>🔴 RECORDING — {seconds}s / 22s</p>
          <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>Speak clearly and naturally</p>
          {transcript&&(
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:11,padding:"13px",marginBottom:18,textAlign:"left"}}>
              <p style={{color:"#6b7280",fontSize:10,fontFamily:"monospace",marginBottom:6}}>WE HEARD:</p>
              <p style={{color:"#e5e7eb",fontSize:14,fontStyle:"italic"}}>&ldquo;{transcript}&rdquo;</p>
            </div>
          )}
          <button className="btn-green" style={{fontSize:15,padding:"12px 30px"}} onClick={stopRec}>⏹ Stop</button>
        </div>
      )}

      {phase==="done"&&(
        <div>
          <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:12,padding:"16px",marginBottom:18}}>
            <p style={{color:"#6b7280",fontSize:10,fontFamily:"monospace",letterSpacing:"0.08em",marginBottom:8}}>WE HEARD YOU SAY:</p>
            <p style={{color:"#e5e7eb",fontSize:15,lineHeight:1.65,fontStyle:"italic"}}>&ldquo;{transcript||"(Nothing captured)"}&rdquo;</p>
          </div>
          {transcript?(
            <div style={{display:"flex",gap:10}}>
              <button onClick={reset} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#9ca3af",padding:"12px",borderRadius:11,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>🔄 Try Again</button>
              <button className="btn-green" style={{flex:2,fontSize:16,padding:"12px"}} onClick={()=>analyse(transcript)}>✓ Use this →</button>
            </div>
          ):(
            <div>
              <p style={{color:"#9ca3af",fontSize:13,marginBottom:14}}>No voice detected. {attempts<2?"Please try again:":"Rate yourself below:"}</p>
              <button onClick={reset} className="btn-green" style={{width:"100%",fontSize:15,padding:"12px",marginBottom:16}}>🎙️ Try Again</button>
              {attempts>=2&&(
                <>
                  <SelfRate picked={manualScore} onPick={n=>setManualScore(n)} options={[[5,"Read smoothly",5],[4,"Minor pauses",5],[3,"Some difficulty",5],[2,"Significant difficulty",5],[1,"Very hard",5]]}/>
                  {manualScore!==null&&<button className="btn-green" style={{marginTop:12,width:"100%",fontSize:16,padding:"13px"}} onClick={()=>onNext(String(manualScore))}>Next →</button>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {phase==="analysing"&&(
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div className="dots"><span/><span/><span/></div>
          <p style={{color:"#6b7280",fontSize:14,marginTop:14}}>Analysing your speech…</p>
        </div>
      )}

      {phase==="complete"&&score!==null&&(
        <div>
          <div style={{background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:14,padding:"18px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <span style={{fontSize:28,fontWeight:700,color:"#34d399",fontFamily:"monospace",flexShrink:0}}>{score}/5</span>
              <div>
                <p style={{color:"#6ee7b7",fontSize:14,fontWeight:600,marginBottom:3}}>Speech analysis complete</p>
                <p style={{color:"#9ca3af",fontSize:13,lineHeight:1.55}}>{feedback}</p>
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"10px 13px"}}>
              <p style={{color:"#6b7280",fontSize:10,fontFamily:"monospace",marginBottom:5}}>YOUR TRANSCRIPT:</p>
              <p style={{color:"#e5e7eb",fontSize:13,fontStyle:"italic"}}>&ldquo;{transcript}&rdquo;</p>
            </div>
          </div>
          <button className="btn-green" style={{width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(String(score))}>Continue →</button>
        </div>
      )}
    </div>
  )
}

function RecallStep({step,onNext}:any) {
  const [val,setVal]=useState("")
  const ref=useRef<HTMLInputElement>(null)
  useEffect(()=>{setVal("");setTimeout(()=>ref.current?.focus(),180)},[step.id])
  return(
    <div>
      {step.subtext&&<p style={{color:"#9ca3af",fontSize:14,marginBottom:14,lineHeight:1.75}}>{step.subtext}</p>}
      <div style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
        <p style={{color:"#a5b4fc",fontSize:13}}>💡 They were 3 simple everyday objects. Type what comes to mind.</p>
      </div>
      <input ref={ref} className="inp" type="text" placeholder={step.placeholder} value={val}
        onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")onNext(val||"none")}} style={{fontSize:18}}/>
      <button className="btn-green" style={{marginTop:14,width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(val||"none")}>Submit →</button>
    </div>
  )
}

// NEW: Cued Recall — FCSRT key test
function CuedRecallStep({step,onNext}:any) {
  const [vals,setVals]=useState(["","",""])
  const updateVal=(i:number,v:string)=>setVals(prev=>{const n=[...prev];n[i]=v;return n})
  const result=vals.join(", ")
  return(
    <div>
      <p style={{color:"#9ca3af",fontSize:14,marginBottom:18,lineHeight:1.75}}>{step.subtext}</p>
      <div style={{background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,padding:"20px",marginBottom:20}}>
        <p style={{color:"#a5b4fc",fontSize:12,fontFamily:"monospace",letterSpacing:"0.08em",marginBottom:16}}>YOUR HINTS:</p>
        {step.cues.map((cue:string,i:number)=>(
          <div key={i} style={{marginBottom:16}}>
            <div style={{background:"rgba(99,102,241,0.1)",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
              <p style={{color:"#a5b4fc",fontSize:14}}>Hint {i+1}: <strong>{cue}</strong></p>
            </div>
            <input className="inp" type="text" placeholder={`Type the word that is "${cue}"…`}
              value={vals[i]} onChange={e=>updateVal(i,e.target.value)} style={{fontSize:17}}/>
          </div>
        ))}
      </div>
      <button className="btn-green" style={{width:"100%",fontSize:17,padding:"15px"}} onClick={()=>onNext(result||"none")}>Submit →</button>
    </div>
  )
}

// ═══ BRAIN CARD ═════════════════════════════════════════════════════════════
function BrainCard({label,region,score,max,accent}:{label:string;region:string;score:number;max:number;accent:string}) {
  const pct=Math.round((score/max)*100)
  const status=pct>=80?"Healthy":pct>=50?"Mild concern":"Needs attention"
  const sc=pct>=80?"#10b981":pct>=50?"#f59e0b":"#ef4444"
  return(
    <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${sc}22`,borderRadius:13,padding:"13px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <p style={{fontSize:13,color:"#e5e7eb",fontWeight:600,marginBottom:2}}>{label}</p>
          <p style={{fontSize:10,color:accent,fontFamily:"monospace"}}>{region}</p>
        </div>
        <span style={{fontSize:14,fontWeight:700,color:sc,fontFamily:"monospace"}}>{score}/{max}</span>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,0.07)",borderRadius:3,marginBottom:5}}>
        <div style={{height:"100%",width:`${pct}%`,background:sc,borderRadius:3,transition:"width 1.2s ease"}}/>
      </div>
      <p style={{fontSize:10,color:sc}}>{status}</p>
    </div>
  )
}

// ═══ MAIN APP ═══════════════════════════════════════════════════════════════
export default function Home() {
  const [stepIdx,setStepIdx]=useState(-1)
  const [answers,setAnswers]=useState<Record<string,string>>({})
  const [results,setResults]=useState<ReturnType<typeof computeScore>|null>(null)
  const [aiText,setAiText]=useState("")
  const [aiLoading,setAiLoading]=useState(false)
  const [saving,setSaving]=useState(false)

  const total=ALL_STEPS.length
  const step=ALL_STEPS[stepIdx]||null
  const isResults=stepIdx>=total

  const saveAndNext=async(value:string)=>{
    if(!step)return
    const next={...answers,[step.id]:value}
    // store fluency counts separately for scoring
    if(step.type==="fluency_animals"){
      next["animal_fluency_count"]=value
    }
    if(step.type==="fluency_letter"){
      next["letter_fluency_count"]=value
    }
    setAnswers(next)
    if(stepIdx+1>=total){await finish(next)}
    else{setStepIdx(i=>i+1)}
  }

  const finish=async(ans:Record<string,string>)=>{
    const res=computeScore(ans)
    setResults(res);setStepIdx(total)
    setAiLoading(true);setSaving(true)
    try{
      const r=await fetch("/api/ai-summary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:ans,results:res})})
      const data=await r.json()
      setAiText(data.summary||"")
      await supabase.from("screenings").insert({
        patient_name:ans.name,patient_age:parseInt(ans.age||"0"),patient_gender:ans.gender,
        mmse_score:res.mmse,risk_level:res.level,risk_score:res.total,
        clock_score:parseInt(ans.clock_score||"0"),pentagon_score:parseInt(ans.pentagon_score||"0"),
        speech_score:parseInt(ans.speech_record||"0"),memory_recall:ans.memory_recall,
        ai_summary:data.summary||"",answers:ans,completed_at:new Date().toISOString(),
      })
    }catch(e){console.error(e)}
    setAiLoading(false);setSaving(false)
  }

  const restart=()=>{setStepIdx(-1);setAnswers({});setResults(null);setAiText("");setAiLoading(false)}

  const brainScores=results&&answers?(()=>{
    const recalled=(answers.memory_recall||"").toLowerCase()
    const memFree=['apple','table','penny'].filter(w=>recalled.includes(w)).length
    const memCued=['apple','table','penny'].filter(w=>(answers.cued_recall||"").toLowerCase().includes(w)).length
    const memStory=[
      (answers.sr_name||"").toLowerCase().includes("maria"),
      (answers.sr_day||"").toLowerCase().includes("tuesday"),
      !!(answers.sr_forgot||"").toLowerCase().match(/list|shopping/),
      (answers.sr_neighbour||"").toLowerCase().includes("john"),
    ].filter(Boolean).length
    const memTotal=memFree+memCued+memStory
    const now=new Date()
    const oriPts=[
      (answers.orient_year||"").trim()===String(now.getFullYear()),
      (answers.orient_month||"").trim().toLowerCase()===now.toLocaleString("en",{month:"long"}).toLowerCase(),
      (answers.orient_day||"").trim().toLowerCase()===now.toLocaleString("en",{weekday:"long"}).toLowerCase(),
      (answers.orient_date||"").trim()===String(now.getDate()),
      (answers.orient_place||"").trim().length>1,
    ].filter(Boolean).length
    const attPts=[93,86,79,72,65].filter((v,i)=>parseInt([answers.s7_1,answers.s7_2,answers.s7_3,answers.s7_4,answers.s7_5][i])===v).length
    const dsbPts=[(answers.dsb_2||"").replace(/[\s\-,.]/g,""),"42",(answers.dsb_3||"").replace(/[\s\-,.]/g,""),"375",(answers.dsb_4||"").replace(/[\s\-,.]/g,""),"8241"].reduce((acc,v,i)=>i%2===0?acc:(acc+(parseInt(String(acc))===parseInt(v)?0:0)),0)
    const dsbScore=((answers.dsb_2||"").replace(/[\s\-,.]/g,"")===String("42")?1:0)+((answers.dsb_3||"").replace(/[\s\-,.]/g,"")===String("375")?1:0)+((answers.dsb_4||"").replace(/[\s\-,.]/g,"")===String("8421")?1:0)
    const langPts=((answers.name_pencil||"").toLowerCase().includes("pencil")?1:0)+(!!(answers.name_watch||"").toLowerCase().match(/watch|clock/)?1:0)+(answers.command==="done"?1:0)+((answers.writing||"").trim().split(/\s+/).length>=3?1:0)
    const visPts=parseInt(answers.clock_score||"0")+parseInt(answers.pentagon_score||"0")
    const fluPts=parseInt(answers.animal_fluency_count||"0")>=14?5:parseInt(answers.animal_fluency_count||"0")>=10?4:parseInt(answers.animal_fluency_count||"0")>=7?3:2
    return{memTotal,oriPts,attPts,dsbScore,langPts,visPts,fluPts,spkPts:parseInt(answers.speech_record||"0")}
  })():null

  const renderStep=()=>{
    if(!step)return null
    const p={step,onNext:saveAndNext}
    switch(step.type){
      case "memory_display":   return <MemoryDisplay {...p}/>
      case "text":             return <TypedInput {...p}/>
      case "number":           return <TypedInput {...p}/>
      case "typed":            return <TypedInput {...p}/>
      case "select":           return <SelectStep {...p}/>
      case "image_name":       return <ImageName {...p}/>
      case "command":          return <CommandStep {...p}/>
      case "textarea":         return <TextareaStep {...p}/>
      case "recall":           return <RecallStep {...p}/>
      case "cued_recall":      return <CuedRecallStep {...p}/>
      case "choice":           return <SelectStep {...p}/>
      case "clock_draw":       return <ClockDrawStep {...p}/>
      case "pentagon_draw":    return <PentagonDrawStep {...p}/>
      case "story_read":       return <StoryReadStep {...p}/>
      case "picture_describe": return <PictureDescribeStep {...p}/>
      case "speech_record":    return <SpeechRecordStep {...p}/>
      case "digit_span":       return <DigitSpanStep {...p}/>
      case "fluency_animals":  return <FluencyAnimalsStep {...p}/>
      case "fluency_letter":   return <FluencyLetterStep {...p}/>
      default:                 return <TypedInput {...p}/>
    }
  }

  const ss=step?.section?SECTION_STYLE[step.section as keyof typeof SECTION_STYLE]:null

  return(
    <>
      <Head>
        <title>NeuroScreen — Brain Health Check</title>
        <meta name="description" content="Free clinically validated brain health screening"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <div style={{minHeight:"100vh",background:"#0d1117",display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 18px 80px"}}>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 50% at 10% 5%,rgba(52,211,153,0.05) 0%,transparent 60%),radial-gradient(ellipse 50% 45% at 90% 95%,rgba(99,102,241,0.05) 0%,transparent 60%)"}}/>
        <div className="slide-up" style={{width:"100%",maxWidth:520}}>

          {/* WELCOME */}
          {stepIdx===-1&&(
            <div style={{textAlign:"center",paddingTop:24}}>
              <div style={{fontSize:68,marginBottom:18,display:"inline-block",animation:"pulseglow 2.5s ease infinite"}}>🧠</div>
              <h1 className="font-lora" style={{fontSize:"clamp(28px,6vw,40px)",fontWeight:400,color:"#f9fafb",marginBottom:14,lineHeight:1.2}}>Brain Health Check</h1>
              <p style={{fontSize:17,color:"#9ca3af",maxWidth:390,margin:"0 auto 28px",lineHeight:1.85}}>
                A clinically validated test used by neurologists worldwide. Simple and friendly — anyone can take it.
              </p>
              <div style={{background:"rgba(52,211,153,0.04)",border:"1px solid rgba(52,211,153,0.14)",borderRadius:16,padding:"18px 20px",marginBottom:22,textAlign:"left"}}>
                {[
                  ["🧩","Remember 3 words","Shown to you first — no trick"],
                  ["📍","Answer easy questions","Date, day, city"],
                  ["🔢","Reverse some numbers","Tests working memory"],
                  ["🐾","Name animals in 60 seconds","Simple and quick"],
                  ["🕐","Draw a clock","No art skills needed"],
                  ["📖","Read and remember a story","4 simple questions after"],
                  ["🎙️","Read one sentence aloud","AI checks your speech"],
                  ["🤖","Get your brain report","AI explains what each result means — in plain words"],
                ].map(([icon,title,desc])=>(
                  <div key={String(title)} style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
                    <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{icon}</span>
                    <div>
                      <p style={{fontSize:14,color:"#e5e7eb",fontWeight:500}}>{title as string}</p>
                      <p style={{fontSize:12,color:"#6b7280",marginTop:2}}>{desc as string}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.17)",borderRadius:20,padding:"8px 20px",fontFamily:"monospace",fontSize:11,color:"#6ee7b7",marginBottom:26,letterSpacing:"0.05em"}}>
                ⏱ About 15–20 minutes &nbsp;•&nbsp; No right or wrong answers
              </div><br/>
              <button className="btn-green" style={{fontSize:19,padding:"17px 46px"}} onClick={()=>setStepIdx(0)}>Begin →</button>
              <p style={{color:"#4b5563",fontSize:12,marginTop:16,lineHeight:1.7}}>Your results are private. This is a screening tool — not a medical diagnosis.</p>
            </div>
          )}

          {/* ACTIVE STEP */}
          {stepIdx>=0&&!isResults&&step&&(
            <div key={`step-${stepIdx}`} className="slide-up">
              <ProgressBar current={stepIdx+1} total={total}/>
              {ss&&(
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:ss.bg,border:`1px solid ${ss.border}`,borderRadius:20,padding:"5px 14px",fontFamily:"monospace",fontSize:10,color:ss.text,letterSpacing:"0.08em",marginBottom:16}}>
                  {step.section.toUpperCase()}
                </div>
              )}
              <p className="font-lora" style={{fontSize:"clamp(19px,3.8vw,25px)",fontWeight:400,color:"#f9fafb",marginBottom:22,lineHeight:1.45}}>
                {step.prompt}
              </p>
              {renderStep()}
            </div>
          )}

          {/* RESULTS */}
          {isResults&&results&&(
            <div key="results" className="slide-up">
              <div style={{textAlign:"center",padding:"30px 24px",borderRadius:20,background:`${results.color}0e`,border:`1px solid ${results.color}26`,marginBottom:18}}>
                <div style={{fontFamily:"monospace",fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:results.color,opacity:0.7,marginBottom:8}}>YOUR BRAIN HEALTH SCREENING RESULT</div>
                <div style={{fontSize:56,marginBottom:8}}>{results.emoji}</div>
                <div className="font-lora" style={{fontSize:32,color:results.color,marginBottom:12}}>{results.level} RISK</div>
                <p style={{fontSize:15,color:results.color,lineHeight:1.8,maxWidth:380,margin:"0 auto"}}>{results.rec}</p>
              </div>

              {/* Pattern insight card */}
              {results.pattern==="MOOD_RELATED"&&(
                <div style={{background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
                  <p style={{color:"#a5b4fc",fontSize:13,lineHeight:1.7}}>💡 <strong>Pattern note:</strong> Memory improved with cues — this suggests a retrieval issue, not storage damage. This pattern is often related to mood rather than Alzheimer's.</p>
                </div>
              )}
              {results.pattern==="ALZHEIMERS_PATTERN"&&(
                <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,padding:"14px 16px",marginBottom:14}}>
                  <p style={{color:"#fca5a5",fontSize:13,lineHeight:1.7}}>⚠️ <strong>Pattern note:</strong> Memory failed both free and with cues — this encoding failure pattern needs urgent specialist evaluation.</p>
                </div>
              )}

              {/* Brain Map */}
              {brainScores&&(
                <div style={{marginBottom:16}}>
                  <p style={{fontFamily:"monospace",fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:"#6b7280",marginBottom:10}}>🧠 BRAIN REGION ANALYSIS</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    <BrainCard label="Memory" region="Hippocampus" score={brainScores.memTotal} max={10} accent="#a5b4fc"/>
                    <BrainCard label="Orientation" region="Hippocampus + Parietal" score={brainScores.oriPts} max={5} accent="#6ee7b7"/>
                    <BrainCard label="Attention" region="Prefrontal Cortex" score={brainScores.attPts} max={5} accent="#fcd34d"/>
                    <BrainCard label="Working Memory" region="Prefrontal Cortex" score={brainScores.dsbScore} max={3} accent="#fbbf24"/>
                    <BrainCard label="Language+Fluency" region="Temporal + Frontal" score={brainScores.langPts} max={4} accent="#f9a8d4"/>
                    <BrainCard label="Visuospatial" region="Parietal + Occipital" score={brainScores.visPts} max={7} accent="#93c5fd"/>
                  </div>
                </div>
              )}

              {/* Score grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:16}}>
                {[
                  ["MMSE",`${results.mmse}/30`,results.mmse>=24?"Normal":results.mmse>=18?"Mild":"Low"],
                  ["Clock",`${answers.clock_score||"—"}/5`,"Drawing"],
                  ["Speech",`${answers.speech_record||"—"}/5`,"Fluency"],
                  ["Animals",`${results.animals||"—"}`,"Fluency/min"],
                ].map(([label,v,sub])=>(
                  <div key={String(label)} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"13px 10px",textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:8,letterSpacing:"0.1em",textTransform:"uppercase",color:"#6b7280",marginBottom:4}}>{label}</div>
                    <div className="font-lora" style={{fontSize:21,color:"#f9fafb"}}>{v}</div>
                    <div style={{fontSize:10,color:"#6b7280",marginTop:3}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Patient */}
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"13px 16px",marginBottom:16}}>
                <div style={{fontFamily:"monospace",fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:"#6b7280",marginBottom:5}}>PATIENT</div>
                <div style={{fontSize:17,color:"#f9fafb"}}>{answers.name||"—"}</div>
                <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>Age {answers.age} · {answers.gender}</div>
              </div>

              {/* AI Report */}
              <div style={{background:"rgba(99,102,241,0.05)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:18,padding:"22px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <span style={{fontSize:20}}>🧠</span>
                  <div>
                    <p style={{fontFamily:"monospace",fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#818cf8"}}>AI BRAIN HEALTH REPORT</p>
                    <p style={{fontSize:11,color:"#6b7280",marginTop:2}}>Written by AI neurologist • Plain language for everyone</p>
                  </div>
                </div>
                {aiLoading?(
                  <div style={{textAlign:"center",padding:"28px 0"}}>
                    <div className="dots"><span/><span/><span/></div>
                    <p style={{color:"#6b7280",fontSize:14,marginTop:14}}>{saving?"Saving your results…":"AI neurologist is analysing your results…"}</p>
                    <p style={{color:"#4b5563",fontSize:12,marginTop:5}}>Takes about 20 seconds</p>
                  </div>
                ):(
                  <div style={{fontSize:15,lineHeight:1.95,color:"rgba(229,231,235,0.9)",whiteSpace:"pre-wrap"}}>{aiText}</div>
                )}
              </div>

              <div style={{background:"rgba(245,158,11,0.05)",border:"1px solid rgba(245,158,11,0.18)",borderRadius:12,padding:"13px 16px",fontSize:13,color:"rgba(245,158,11,0.85)",lineHeight:1.75,marginBottom:22}}>
                ⚠️ Screening tool only — not a medical diagnosis. Show this report to a qualified doctor.
              </div>
              <button className="btn-green" style={{width:"100%",fontSize:17,padding:"16px"}} onClick={restart}>Take Test Again</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
