import { useState, useEffect, useCallback, useMemo } from "react";
import { C, font, mono } from "./tokens.js";

/* ───────────────────────────────────────────────────────────────────────────
   REPS TAB — dagdoelen die je door de dag heen afwerkt.
   Twee blokken: de bekkenbodem-track (verhuisd uit SKILL_WEEKS) en vrije
   repdoelen die je zelf toevoegt. Teller loopt áf: je ziet wat er nog ligt.
   Opslag: localStorage key `reps_v1`, los van training_v5 en training_db_v1.
   ─────────────────────────────────────────────────────────────────────────── */

const KEY = "reps_v1";
const MAX_LEVEL = 10;

/* ─── BEKKENBODEM ──────────────────────────────────────────────────────────
   Tien niveaus. De progressie zit in drie dingen tegelijk: meer reps, langere
   holds, en een zwaardere houding (liggend → zittend → staand). De reverse
   kegel staat er vanaf niveau 1 in — alleen aanspannen maakt een bekkenbodem
   strak in plaats van sterk, en bij vroege zaadlozing is spanning vaak juist
   een deel van het probleem.                                                */

const POSITION = {
  1:"Liggend", 2:"Liggend", 3:"Liggend + zittend", 4:"Zittend", 5:"Zittend",
  6:"Zittend", 7:"Zittend + staand", 8:"Staand", 9:"Staand", 10:"Onderhoud",
};

const PELVIC_TABLE = {
  1:  { quick:30, hold:24, holdSec:3,  release:15 },
  2:  { quick:45, hold:24, holdSec:5,  release:20 },
  3:  { quick:45, hold:24, holdSec:8,  release:20 },
  4:  { quick:60, hold:30, holdSec:8,  release:25 },
  5:  { quick:60, hold:30, holdSec:10, release:25 },
  6:  { quick:75, hold:30, holdSec:12, release:30 },
  7:  { quick:75, hold:36, holdSec:12, release:30 },
  8:  { quick:90, hold:36, holdSec:15, release:35 },
  9:  { quick:90, hold:40, holdSec:15, release:35 },
  10: { quick:60, hold:24, holdSec:15, release:25 },
};

function pelvicPlan(level) {
  const t = PELVIC_TABLE[level] || PELVIC_TABLE[1];
  const pos = POSITION[level];
  return [
    {
      id:"pf_quick", name:"Snelle knijpen", goal:t.quick, unit:"knijpen", pos,
      steps:[
        "Span 1 seconde maximaal aan, laat 1 seconde volledig los.",
        "Het loslaten telt net zo zwaar als het aanspannen. Laat hem echt helemaal zakken.",
        "Blijf doorademen — houd je adem niet in.",
      ],
      watch:"Billen, buik en dijen blijven ontspannen. Doen die mee, dan knijp je harder dan nodig.",
    },
    {
      id:"pf_hold", name:`Holds van ${t.holdSec} sec`, goal:t.hold, unit:"holds", pos,
      steps:[
        `Span aan en houd ${t.holdSec} seconden vast zonder dat de kracht wegzakt.`,
        `Rust minstens ${t.holdSec} seconden voor je opnieuw aanspant.`,
        "Adem gewoon door tijdens de hold.",
      ],
      watch:"Zakt de spanning halverwege weg, dan is dat je echte startpunt. Ga een niveau terug.",
    },
    {
      id:"pf_release", name:"Reverse kegel", goal:t.release, unit:"reps", pos,
      steps:[
        "Adem rustig in en laat het hele gebied verwijden en zakken — alsof je op het punt staat los te laten.",
        "Het is loslaten, niet persen.",
        "Adem uit en kom terug naar neutraal. Dat is één rep.",
      ],
      watch:"Voel je naar buiten gerichte druk, dan ga je te ver. Doe deze ná het knijpwerk, niet ervoor.",
    },
  ];
}

/* ─── OPSLAG ─────────────────────────────────────────────────────────────── */

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const EMPTY = { date:today(), level:1, logged:{}, custom:[], history:[] };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const d = { ...EMPTY, ...JSON.parse(raw) };
    if (d.date === today()) return d;
    // Dagwissel: gisteren naar de historie, tellers op nul, doelen blijven staan.
    const totals = Object.values(d.logged || {}).reduce((s,n)=>s+n, 0);
    return {
      ...d,
      date: today(),
      logged: {},
      custom: (d.custom || []).map(c => ({ ...c, logged:0 })),
      history: [...(d.history || []), { date:d.date, done:totals }].slice(-28),
    };
  } catch { return { ...EMPTY }; }
}

function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

const mkId = () => Math.random().toString(36).slice(2,8);

/* ─── TELBALK ────────────────────────────────────────────────────────────── */
/* Op een lichte achtergrond heeft de lege staat meer contrast nodig dan op
   donker: borderMid in plaats van border, anders verdwijnt de balk.         */

function Ticks({ goal, logged, color }) {
  if (goal <= 30) {
    return (
      <div style={{display:"flex",gap:2,height:6}}>
        {Array.from({length:goal}).map((_,i)=>(
          <div key={i} style={{flex:1,borderRadius:1,background:i<logged?color:C.borderMid}} />
        ))}
      </div>
    );
  }
  return (
    <div style={{height:6,borderRadius:1,background:C.borderMid,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,(logged/goal)*100)}%`,background:color}} />
    </div>
  );
}

/* ─── REGEL ──────────────────────────────────────────────────────────────── */

function RepRow({ item, logged, color, bg, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const remaining = Math.max(0, item.goal - logged);
  const done = remaining === 0;
  const steps = item.goal >= 60 ? [20,10,5] : item.goal >= 30 ? [10,5,1] : [5,1];

  return (
    <div style={{borderBottom:`1px solid ${C.border}`,padding:"14px 16px"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:font,fontSize:15,fontWeight:600,color:C.text}}>{item.name}</div>
          <div style={{fontFamily:font,fontSize:12,color:C.textMuted,marginTop:2}}>
            {logged} / {item.goal} {item.unit}{item.pos ? ` · ${item.pos}` : ""}
          </div>
        </div>
        <div style={{
          fontFamily:mono,fontSize:24,fontWeight:700,lineHeight:1,
          color:done?color:C.text,fontVariantNumeric:"tabular-nums",flexShrink:0,
        }}>
          {done ? "✓" : remaining}
        </div>
      </div>

      <div style={{marginTop:10}}>
        <Ticks goal={item.goal} logged={logged} color={color} />
      </div>

      <div style={{display:"flex",gap:6,marginTop:10,alignItems:"center"}}>
        {steps.map((s,i)=>(
          <button key={s} onClick={()=>onAdd(s)} style={{
            fontFamily:font,fontSize:i===0?15:13,fontWeight:600,cursor:"pointer",
            padding:i===0?"9px 18px":"9px 14px",borderRadius:8,border:"none",
            background:i===0?color:bg, color:i===0?"#fff":color,
          }}>+{s}</button>
        ))}
        {logged > 0 && (
          <button onClick={()=>onAdd(-steps[steps.length-1])} style={{
            fontFamily:font,fontSize:13,cursor:"pointer",padding:"9px 12px",borderRadius:8,
            border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,
          }}>−{steps[steps.length-1]}</button>
        )}
        <div style={{flex:1}} />
        {item.steps && (
          <button onClick={()=>setOpen(!open)} style={{
            fontFamily:font,fontSize:12,cursor:"pointer",padding:"9px 10px",borderRadius:8,
            border:"none",background:"transparent",color:C.textSub,
          }}>{open ? "Sluit" : "Uitleg"}</button>
        )}
        {onRemove && (
          <button onClick={onRemove} style={{
            fontFamily:font,fontSize:12,cursor:"pointer",padding:"9px 10px",borderRadius:8,
            border:"none",background:"transparent",color:C.textMuted,
          }}>Verwijder</button>
        )}
      </div>

      {open && item.steps && (
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          {item.steps.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
              <span style={{fontFamily:mono,fontSize:11,color:C.textMuted,flexShrink:0,paddingTop:2}}>
                {String(i+1).padStart(2,"0")}
              </span>
              <span style={{fontFamily:font,fontSize:13,lineHeight:1.55,color:C.textSub}}>{s}</span>
            </div>
          ))}
          {item.watch && (
            <div style={{
              marginTop:10,padding:"10px 12px",borderRadius:8,background:C.amberLight,
              fontFamily:font,fontSize:12,lineHeight:1.5,color:"#92400E",
            }}>{item.watch}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── HOOFDCOMPONENT ─────────────────────────────────────────────────────── */

export default function RepsTab({ db }) {
  const [d, setD] = useState(load);
  const [picker, setPicker] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftGoal, setDraftGoal] = useState("");

  useEffect(()=>{ save(d); }, [d]);

  // Dagwissel terwijl de app open staat (bijv. 's nachts).
  useEffect(()=>{
    const t = setInterval(()=>{ setD(cur => cur.date === today() ? cur : load()); }, 60000);
    return ()=>clearInterval(t);
  }, []);

  const plan = useMemo(()=>pelvicPlan(d.level), [d.level]);

  const addPelvic = useCallback((id, n, goal)=>{
    setD(cur => ({ ...cur, logged:{ ...cur.logged, [id]: Math.max(0, Math.min(goal, (cur.logged[id]||0) + n)) } }));
  }, []);

  const addCustom = useCallback((id, n)=>{
    setD(cur => ({ ...cur, custom: cur.custom.map(c =>
      c.id === id ? { ...c, logged: Math.max(0, Math.min(c.goal, (c.logged||0) + n)) } : c) }));
  }, []);

  const createCustom = () => {
    const goal = parseInt(draftGoal, 10);
    if (!draftName.trim() || !goal || goal < 1) return;
    setD(cur => ({ ...cur, custom:[...cur.custom, { id:mkId(), name:draftName.trim(), goal, unit:"reps", logged:0 }] }));
    setDraftName(""); setDraftGoal(""); setPicker(false);
  };

  const removeCustom = (id) => setD(cur => ({ ...cur, custom: cur.custom.filter(c => c.id !== id) }));
  const setLevel = (lv) => setD(cur => ({ ...cur, level: Math.max(1, Math.min(MAX_LEVEL, lv)) }));

  const pelvicDone = plan.reduce((s,i)=>s + Math.min(i.goal, d.logged[i.id]||0), 0);
  const pelvicGoal = plan.reduce((s,i)=>s + i.goal, 0);
  const pelvicPct = Math.round((pelvicDone / pelvicGoal) * 100);

  const streak = useMemo(()=>{
    let n = 0;
    for (let i = d.history.length - 1; i >= 0; i--) { if (d.history[i].done > 0) n++; else break; }
    return pelvicPct === 100 ? n + 1 : n;
  }, [d.history, pelvicPct]);

  const dbItems = useMemo(()=>{
    if (!db) return [];
    const out = [];
    for (const section of Object.values(db)) {
      for (const part of (section || [])) {
        for (const ex of (part.exercises || [])) {
          if (ex?.name) out.push(ex.name);
        }
      }
    }
    return [...new Set(out)];
  }, [db]);

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:C.shadow, overflow:"hidden" };
  const label = { fontFamily:font, fontSize:11, fontWeight:600, letterSpacing:.6, textTransform:"uppercase", color:C.textMuted };

  return (
    <div style={{padding:"16px 0 32px"}}>

      {/* Kop */}
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:6}}>
        <div style={label}>Vandaag</div>
        {streak > 1 && (
          <div style={{fontFamily:font,fontSize:12,color:C.textMuted}}>
            <span style={{fontFamily:mono,fontWeight:700,color:C.purple}}>{streak}</span> dagen op rij
          </div>
        )}
      </div>
      <p style={{fontFamily:font,fontSize:13,lineHeight:1.6,color:C.textSub,marginBottom:18}}>
        Deze doelen hoef je niet in één sessie te halen. Verdeel ze over de dag — koffie, lunch, 's avonds op de bank.
        De teller loopt af, dus je ziet altijd wat er nog ligt.
      </p>

      {/* Bekkenbodem */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:8,height:8,borderRadius:2,background:C.cyan}} />
          <span style={label}>Bekkenbodem · elke dag</span>
        </div>
        <span style={{fontFamily:mono,fontSize:12,color:C.textMuted}}>{pelvicPct}%</span>
      </div>

      <div style={card}>
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
          padding:"12px 16px",background:C.cyanLight,borderBottom:`1px solid ${C.border}`,
        }}>
          <div>
            <div style={{fontFamily:font,fontSize:13,fontWeight:600,color:"#0E5C70"}}>Niveau {d.level}</div>
            <div style={{fontFamily:font,fontSize:11,color:"#0E5C70",opacity:.75,marginTop:1}}>{POSITION[d.level]}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setLevel(d.level-1)} disabled={d.level<=1} style={{
              fontFamily:font,fontSize:16,fontWeight:600,width:36,height:36,borderRadius:8,cursor:"pointer",
              border:`1px solid ${C.border}`,background:C.surface,color:C.textSub,opacity:d.level<=1?.35:1,
            }}>−</button>
            <button onClick={()=>setLevel(d.level+1)} disabled={d.level>=MAX_LEVEL} style={{
              fontFamily:font,fontSize:16,fontWeight:600,width:36,height:36,borderRadius:8,cursor:"pointer",
              border:`1px solid ${C.border}`,background:C.surface,color:C.textSub,opacity:d.level>=MAX_LEVEL?.35:1,
            }}>+</button>
          </div>
        </div>

        {plan.map(item => (
          <RepRow
            key={item.id} item={item} logged={d.logged[item.id]||0}
            color={C.cyan} bg={C.cyanLight}
            onAdd={(n)=>addPelvic(item.id, n, item.goal)}
          />
        ))}
      </div>

      <p style={{fontFamily:font,fontSize:12,lineHeight:1.55,color:C.textMuted,margin:"10px 2px 0"}}>
        Ga pas een niveau omhoog als je een week lang alle drie de doelen haalt zonder dat de kracht wegzakt.
        Twijfel je of je de goede spier aanspant, dan is één sessie bij een bekkenfysiotherapeut de snelste manier om dat te checken.
      </p>

      {/* Vrije repdoelen */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"28px 0 8px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{width:8,height:8,borderRadius:2,background:C.purple}} />
          <span style={label}>Eigen repdoelen</span>
        </div>
        <button onClick={()=>setPicker(!picker)} style={{
          fontFamily:font,fontSize:12,fontWeight:500,cursor:"pointer",padding:"6px 12px",
          borderRadius:20,border:"none",background:C.purpleLight,color:C.purple,
        }}>{picker ? "Annuleer" : "+ Toevoegen"}</button>
      </div>

      {picker && (
        <div style={{...card, padding:16, marginBottom:10}}>
          <input
            value={draftName} onChange={e=>setDraftName(e.target.value)} placeholder="Oefening"
            list="reps-db-list"
            style={{fontFamily:font,fontSize:15,color:C.text,background:C.surfaceAlt,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"10px 12px",outline:"none",width:"100%",boxSizing:"border-box",WebkitAppearance:"none"}}
          />
          <datalist id="reps-db-list">
            {dbItems.map(n => <option key={n} value={n} />)}
          </datalist>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input
              value={draftGoal} onChange={e=>setDraftGoal(e.target.value)} placeholder="Doel" type="number" inputMode="numeric"
              style={{fontFamily:mono,fontSize:15,color:C.text,background:C.surfaceAlt,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"10px 12px",outline:"none",width:110,boxSizing:"border-box",WebkitAppearance:"none"}}
            />
            <button onClick={createCustom} style={{
              flex:1,fontFamily:font,fontSize:14,fontWeight:500,cursor:"pointer",padding:"10px 16px",
              borderRadius:8,border:"none",background:C.purple,color:"#fff",
            }}>Zet erbij</button>
          </div>
          {dbItems.length > 0 && (
            <div style={{fontFamily:font,fontSize:11,color:C.textMuted,marginTop:8}}>
              Je oefeningendatabase staat in het naamveld als suggestie.
            </div>
          )}
        </div>
      )}

      {d.custom.length === 0 ? (
        <div style={{...card, padding:"20px 16px"}}>
          <p style={{fontFamily:font,fontSize:13,lineHeight:1.6,color:C.textMuted,margin:0}}>
            Nog niks. Dit is voor oefeningen die je niet in één sessie doet maar door de dag heen wegtikt —
            pull-ups onder de deurpost, squats tussen meetings door.
          </p>
        </div>
      ) : (
        <div style={card}>
          {d.custom.map(c => (
            <RepRow
              key={c.id} item={c} logged={c.logged||0}
              color={C.purple} bg={C.purpleLight}
              onAdd={(n)=>addCustom(c.id, n)}
              onRemove={()=>removeCustom(c.id)}
            />
          ))}
        </div>
      )}

      {/* Laatste dagen */}
      {d.history.length > 0 && (
        <>
          <div style={{...label, margin:"28px 0 10px"}}>Laatste dagen</div>
          <div style={{...card, padding:16}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:4,height:64}}>
              {d.history.slice(-14).map(h => {
                const max = Math.max(1, ...d.history.slice(-14).map(x=>x.done));
                return (
                  <div key={h.date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                    <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",borderRadius:"2px 2px 0 0",
                        height:`${Math.max(4,(h.done/max)*100)}%`,
                        background:h.done>0?C.purpleMid:C.border}} />
                    </div>
                    <span style={{fontFamily:mono,fontSize:9,color:C.textMuted}}>{h.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
