import { useState, useEffect, useCallback } from "react";
import { supabase } from './supabase.js';

// ─── SKILL DATA ───────────────────────────────────────────────────────────────
const SKILL_WEEKS = {
  1: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Val-techniek: leer cartwheel-out – 5 min dagelijks oefenen","Frog stand: rocks → hold 3×10s → leg taps (doel: 20s hold)","Pike hold (grond): schouders boven oren, armen gestrekt, 3×15s"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["Scapulaire pulls 3×10 (actief omhoog duwen)","Dead hang 3×20s","Band pull-ups 3×6"] },
  },
  2: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Shrug push-ups 3×8 (schouder primer voor elke sessie)","Pike hold (grond): max gewicht op handen, 3×20s ↑","Pike hold (voeten op box): schouders boven oren, 3×15s"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["Band pull-ups 3×8 ↑","Passief → actief hang 3×5","Negatief 3×3 – 3s neer, gecontroleerd"] },
  },
  3: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Chest-to-wall HS: begin dicht bij muur, bekken intrekken, 3×20s","Doel: 3×30s volledig geëngageerd aan de muur","Geen banana back – core actief, toes omhoog gestrekt"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["Band pull-ups 3×10 ↑","Negatief 3×5 – 4s neer ↑","Actief hang bovenkant: 2s vasthouden per rep"] },
  },
  4: {
    handstand: { label:"Handstand – Deload", color:"#7C3AED", items:["Pike hold (grond) 2×15s – onderhoud, geen progressie","Chest-to-wall 2×20s – focus op techniek","Pols & schouder stretching: butcher's block 2×30s"] },
    pullup:    { label:"Pull-ups – Deload",  color:"#059669", items:["Band pull-ups 2×6","Dead hang 2×20s","Rust – herstel prioriteit"] },
  },
  5: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Chest-to-wall 3×30s consolideren","Scissor positie naast muur: lean → gewicht verplaatsen, 3×10s","Kick-up oefenen: controle staat centraal, geen haast naar balans"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["3×3 zonder band + rest met band ↑","Negatief 3×5 – 5s neer ↑","Dead hang 3×30s"] },
  },
  6: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Scissor positie naast muur: hold 3×15s ↑","Kick-up naar scissor: 6-8 pogingen – kijk tussen duimen","Scissor → legs sluiten: eerste vrije HS balans-pogingen"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["3×5 zonder band ↑","Negatief 3×5 – 6s neer ↑","Band pull-apart 2×15"] },
  },
  7: {
    handstand: { label:"Handstand", color:"#7C3AED", items:["Vrije HS: 8-10 sets – doel 3-5s balans","Kick-up → scissor → sluiten: vloeiend maken","Eerste handstand walk pogingen – elke stap telt"] },
    pullup:    { label:"Pull-ups",  color:"#059669", items:["5×5 zonder band ↑","Negatief 3×5 – 8s neer ↑","Dead hang 3×45s"] },
  },
  8: {
    handstand: { label:"Handstand – Test", color:"#7C3AED", items:["TEST: 3× beste poging – noteer hoeveel seconden","Handstand walk: maximale afstand in één poging","Reflecteer: wat was de limiterende factor?"] },
    pullup:    { label:"Pull-ups – Test",  color:"#059669", items:["TEST: max reps zonder band – doel is 10","Noteer je score voor de volgende cyclus","Reflecteer: wat voelde zwaar?"] },
  },
};

const DAYS = ["ma","di","wo","do","vr","za","zo"];
const DAY_LABELS = { ma:"Maandag", di:"Dinsdag", wo:"Woensdag", do:"Donderdag", vr:"Vrijdag", za:"Zaterdag", zo:"Zondag" };
const DAY_SHORT  = { ma:"Ma", di:"Di", wo:"Wo", do:"Do", vr:"Vr", za:"Za", zo:"Zo" };
const DAY_SKILL  = { ma:"handstand", di:"pullup", wo:"handstand", do:"pullup", vr:"handstand", za:"pullup", zo:null };
const SKILL_KEYS = ["handstand","pullup"];
const RATINGS    = ["Te makkelijk","Goed","Zwaar","Niet gelukt"];
const RATING_COLORS = ["#059669","#7C3AED","#D97706","#DC2626"];
const PHASE_LABELS  = ["Fundament","Fundament","Opbouw","Opbouw · Deload","Intensificatie","Intensificatie","Consolidatie","Test week"];

const FB_TEMPLATES = {
  ma:[["Squat","3×5"],["Bench Press","3×5"],["Barbell Row","3×8"],["Romanian Deadlift","3×8"]],
  di:[["Deadlift","3×5"],["Overhead Press","3×5"],["Band Pull-up","3×6"],["Dips","3×8"]],
  wo:[["Front Squat","3×5"],["Incline Bench","3×8"],["Cable Row","3×10"],["Face Pull","3×15"]],
  do:[["Squat","3×5"],["Bench Press","3×5"],["Pendlay Row","3×5"],["Hip Thrust","3×10"]],
  vr:[["Deadlift","3×5"],["Overhead Press","3×5"],["Chin-up","3×6"],["Leg Curl","3×10"]],
  za:[["Goblet Squat","3×10"],["Push-up","3×15"],["Inverted Row","3×10"],["Lunge","3×8 e/s"]],
  zo:[],
};

const MOBILITY_TEMPLATES = [
  {name:"Voet onder bal rollen",sets:"60s e/s"},{name:"Heup oefening",sets:"10 e/s"},
  {name:"Sit on knees + Reverse Nordic",sets:"2×8"},{name:"Push-ups",sets:"2×10"},
  {name:"Yoga block pass-through",sets:"10 reps"},{name:"Horse stance + Cossack Squat",sets:"5 e/s"},
  {name:"Downward Dog",sets:"5 adem"},{name:"Crab",sets:"30s"},
  {name:"Deep Lunge",sets:"60s e/s"},{name:"Deep Squat",sets:"60s"},{name:"The Hang",sets:"30-60s"},
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY    = "training_v5";
const DB_KEY         = "training_db_v1";
const ROUTINES_KEY   = "training_routines_v1";
const SYNC_KEY_LOCAL = "training_sync_key";

function getSyncKey(){
  let k = localStorage.getItem(SYNC_KEY_LOCAL);
  if(!k){ k = crypto.randomUUID(); localStorage.setItem(SYNC_KEY_LOCAL,k); }
  return k;
}

function pushToSupabase(patch){
  if(!supabase) return;
  supabase.from('trainingsplan').upsert(
    {sync_key:getSyncKey(),...patch,updated_at:new Date().toISOString()},
    {onConflict:'sync_key'}
  ).then(()=>{});
}

// On first load: pull from Supabase → localStorage (or push if no remote row yet)
async function initSync(){
  if(!supabase) return;
  const key = getSyncKey();
  const {data,error} = await supabase.from('trainingsplan').select('*').eq('sync_key',key).maybeSingle();
  if(error) return;
  if(data){
    if(data.weeks)       localStorage.setItem(STORAGE_KEY,  JSON.stringify(data.weeks));
    if(data.exercise_db) localStorage.setItem(DB_KEY,       JSON.stringify(data.exercise_db));
    if(data.routines)    localStorage.setItem(ROUTINES_KEY, JSON.stringify(data.routines));
  } else {
    // No remote row yet → upload whatever is in localStorage
    const w=localStorage.getItem(STORAGE_KEY);
    const d=localStorage.getItem(DB_KEY);
    const r=localStorage.getItem(ROUTINES_KEY);
    supabase.from('trainingsplan').upsert({
      sync_key:key,
      weeks:      w?JSON.parse(w):[],
      exercise_db:d?JSON.parse(d):DEFAULT_DB,
      routines:   r?JSON.parse(r):[],
      updated_at: new Date().toISOString(),
    },{onConflict:'sync_key'}).then(()=>{});
  }
}

// Switch to a different sync key; returns the loaded data or null if not found
async function loadRemoteKey(newKey){
  if(!supabase) return null;
  const {data,error} = await supabase.from('trainingsplan').select('*').eq('sync_key',newKey).maybeSingle();
  if(error||!data) return null;
  return data;
}

const mkDay = () => ({
  morningType:null, morningExercises:[], morningRoutineName:"", morningRoutineUrl:"",
  morningRoutineId:null, morningRoutineSync:false, showMorningDbModal:false, showMorningRoutineModal:false,
  type:null, exercises:[], routineName:"", routineUrl:"",
  routineId:null, routineSync:false, note:"", showDbModal:false, showRoutineModal:false,
});
const mkWeek = (n) => ({ weekNum:n, days:Object.fromEntries(DAYS.map(d=>[d,mkDay()])), ratings:{}, note:"", done:false });

const DEFAULT_DB = {
  mobiliteit:[
    {id:"m1",name:"Heup",exercises:[
      {id:"e1",name:"90/90 Hip Stretch",uitleg:"Zit in 90/90 positie, beide knieën op 90 graden. Leun langzaam voorover.",video:""},
      {id:"e2",name:"Pigeon Pose",uitleg:"Vanuit plank, breng knie naar pols. Heup naar beneden, romp recht. 60s.",video:""},
    ]},
    {id:"m2",name:"Schouder",exercises:[
      {id:"e3",name:"Yoga Block Pass-Through",uitleg:"Houd stok of band breed vast. Beweeg van voor naar achter over het hoofd.",video:""},
      {id:"e4",name:"Shoulder CARs",uitleg:"Gecontroleerde schouderrotatie door volledig bereik. 5 reps per kant.",video:""},
    ]},
    {id:"m3",name:"Enkel",exercises:[
      {id:"e5",name:"Kuit stretch aan muur",uitleg:"Hiel op grond, knie naar de muur duwen. 90s per kant.",video:""},
      {id:"e6",name:"Heel Elevated Squat",uitleg:"Hiel op een boek (~2cm). Diep door de knieën zakken.",video:""},
    ]},
  ],
  gym:[
    {id:"g1",name:"Borst",exercises:[
      {id:"e7",name:"Bench Press",uitleg:"Schouderbladen ingedrukt. Stang tot borsthoogte, explosief omhoog.",video:""},
      {id:"e8",name:"Incline Bench Press",uitleg:"Bank op 30-45 graden. Focus op bovenste borst. Gecontroleerd neer.",video:""},
    ]},
    {id:"g2",name:"Rug",exercises:[
      {id:"e9",name:"Barbell Row",uitleg:"Romp 45 graden, stang naar navel trekken. Scapula retractie bovenaan.",video:""},
      {id:"e10",name:"Pull-up",uitleg:"Actieve schouders onderaan. Scapula neerhalen voor je trekt.",video:""},
    ]},
    {id:"g3",name:"Benen",exercises:[
      {id:"e11",name:"Squat",uitleg:"Voeten schouderbreedte. Knieën over tenen. Diep zakken.",video:""},
      {id:"e12",name:"Romanian Deadlift",uitleg:"Heupscharnier, niet squat. Stang dicht langs het lichaam.",video:""},
    ]},
  ],
};

function migrateWeeks(data){
  return data.map(week=>({
    ...week,
    days:Object.fromEntries(Object.entries(week.days).map(([k,day])=>[k,{
      ...day,
      showMorningDbModal:false, showDbModal:false,
      showMorningRoutineModal:false, showRoutineModal:false,
      morningType: day.morningType==="routine"?"video":(day.morningType||null),
      type: day.type==="routine"?"video":(day.type||null),
      morningRoutineId: day.morningRoutineId||null,
      morningRoutineSync: day.morningRoutineSync||false,
      routineId: day.routineId||null,
      routineSync: day.routineSync||false,
    }]))
  }));
}
async function loadData(){ try{ const r=localStorage.getItem(STORAGE_KEY); return r?migrateWeeks(JSON.parse(r)):[mkWeek(1)]; }catch{ return [mkWeek(1)]; } }
async function saveData(d){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); }catch{} pushToSupabase({weeks:d}); }
async function loadDb(){ try{ const r=localStorage.getItem(DB_KEY); return r?JSON.parse(r):DEFAULT_DB; }catch{ return DEFAULT_DB; } }
async function saveDb(d){ try{ localStorage.setItem(DB_KEY,JSON.stringify(d)); }catch{} pushToSupabase({exercise_db:d}); }
async function loadRoutines(){ try{ const r=localStorage.getItem(ROUTINES_KEY); return r?JSON.parse(r):[]; }catch{ return []; } }
async function saveRoutines(d){ try{ localStorage.setItem(ROUTINES_KEY,JSON.stringify(d)); }catch{} pushToSupabase({routines:d}); }
function mkId(){ return Math.random().toString(36).slice(2,8); }

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:"#F7F6F3", surface:"#FFFFFF", surfaceAlt:"#F0EEE9", surfaceHover:"#ECEAE4",
  border:"#E4E0D8", borderMid:"#D0CCBF",
  text:"#1A1814", textSub:"#6B6456", textMuted:"#A09585",
  purple:"#7C3AED", purpleLight:"#EDE9FD", purpleMid:"#DDD6FE",
  green:"#059669",  greenLight:"#D1FAE5",
  red:"#DC2626",    redLight:"#FEE2E2",
  amber:"#D97706",  amberLight:"#FEF3C7",
  shadow:"0 1px 3px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)",
  shadowLg:"0 8px 24px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.06)",
};
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const mono = "'SF Mono','Fira Mono',monospace";

const inp = (extra={}) => ({ fontFamily:font, fontSize:15, color:C.text, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", outline:"none", width:"100%", boxSizing:"border-box", WebkitAppearance:"none", ...extra });

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Tag = ({color,bg,children}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:bg,color,whiteSpace:"nowrap"}}>{children}</span>
);

const Seg = ({active,color,bg,onClick,children}) => (
  <button onClick={onClick} style={{
    flex:1, padding:"8px 4px", borderRadius:8, border:"none", fontFamily:font, fontWeight:500,
    fontSize:13, cursor:"pointer", transition:"all .15s",
    background:active?(bg||C.surface):"transparent",
    color:active?(color||C.text):C.textMuted,
    boxShadow:active?C.shadow:"none",
    minHeight:36,
  }}>{children}</button>
);

const Btn = ({onClick,children,variant="primary",full=false,size="md"}) => {
  const pad = size==="sm"?"7px 12px":size==="lg"?"13px 20px":"10px 16px";
  const fs  = size==="sm"?12:size==="lg"?15:13;
  const styles = {
    primary:  {background:C.purple,color:"#fff",border:"none"},
    ghost:    {background:"transparent",color:C.textSub,border:`1px solid ${C.border}`},
    amber:    {background:C.amberLight,color:C.amber,border:"none"},
    purple:   {background:C.purpleLight,color:C.purple,border:"none"},
    subtle:   {background:C.surfaceAlt,color:C.textSub,border:`1px solid ${C.border}`},
    green:    {background:C.greenLight,color:C.green,border:"none"},
  };
  return (
    <button onClick={onClick} style={{
      fontFamily:font, fontWeight:500, borderRadius:8, cursor:"pointer",
      padding:pad, fontSize:fs, display:"inline-flex", alignItems:"center",
      gap:5, transition:"opacity .15s", width:full?"100%":"auto",
      justifyContent:full?"center":"flex-start",
      ...styles[variant],
    }}>{children}</button>
  );
};

// ─── DB MODAL ─────────────────────────────────────────────────────────────────
function DbModal({db,onSelect,onClose,filterSection}) {
  const [query,setQuery] = useState("");
  const filteredDb = filterSection ? {[filterSection]:db[filterSection]} : db;
  const sections = [
    {key:"mobiliteit",label:"Mobiliteit",color:C.amber,icon:"🤸"},
    {key:"gym",label:"Gym",color:C.purple,icon:"🏋️"},
  ].filter(s => filteredDb[s.key] !== undefined && (filteredDb[s.key]||[]).length >= 0);

  const allEx = sections.flatMap(s=>(filteredDb[s.key]||[]).flatMap(p=>(p.exercises||[]).map(e=>({...e,sectionColor:s.color,sectionLabel:s.label,partName:p.name}))));
  const results = query.trim() ? allEx.filter(e=>e.name.toLowerCase().includes(query.toLowerCase())||e.partName.toLowerCase().includes(query.toLowerCase())) : null;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, width:"100%", maxWidth:560, maxHeight:"80vh",
        borderRadius:"16px 16px 0 0", display:"flex", flexDirection:"column",
        boxShadow:C.shadowLg, overflow:"hidden",
      }}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.borderMid}} />
        </div>
        <div style={{padding:"8px 16px 12px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text}}>Kies oefening</span>
            <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",borderRadius:20,width:28,height:28,cursor:"pointer",fontSize:16,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Zoeken…" autoFocus
            style={inp({fontSize:14,padding:"9px 12px"})} />
        </div>
        <div style={{overflowY:"auto",padding:"12px 16px",WebkitOverflowScrolling:"touch"}}>
          {results ? (
            results.length===0 ? (
              <div style={{textAlign:"center",padding:"32px 0",color:C.textMuted,fontSize:14}}>Geen resultaten voor "{query}"</div>
            ) : results.map(ex=>(
              <ExItem key={ex.id} ex={ex} onSelect={onSelect} />
            ))
          ) : (
            sections.map(s=>(
              <div key={s.key} style={{marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                  {s.icon} {s.label}
                </div>
                {(filteredDb[s.key]||[]).map(part=>(
                  <div key={part.id} style={{marginBottom:12}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.textSub,marginBottom:6,paddingLeft:4}}>{part.name}</div>
                    {(part.exercises||[]).length===0&&<div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",paddingLeft:4}}>Geen oefeningen</div>}
                    {(part.exercises||[]).map(ex=><ExItem key={ex.id} ex={{...ex,sectionColor:s.color,partName:part.name}} onSelect={onSelect} />)}
                  </div>
                ))}
              </div>
            ))
          )}
          <div style={{height:24}} />
        </div>
      </div>
    </div>
  );
}

function ExItem({ex,onSelect}) {
  return (
    <button onClick={()=>onSelect(ex)} style={{
      display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 12px",
      background:"none",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6,
      cursor:"pointer",fontFamily:font,textAlign:"left",
    }}>
      <div style={{width:7,height:7,borderRadius:"50%",background:ex.sectionColor||C.purple,flexShrink:0}} />
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,color:C.text}}>{ex.name}</div>
        {ex.partName&&<div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{ex.partName}</div>}
      </div>
      {ex.uitleg&&<div style={{fontSize:11,color:C.textMuted,flexShrink:0}}>uitleg</div>}
    </button>
  );
}

// ─── ROUTINE PICKER MODAL ─────────────────────────────────────────────────────
function RoutinePickerModal({routines,onSelect,onClose,context}) {
  // sort: matching type first, then "beide", then other
  const sorted = [...routines].sort((a,b)=>{
    const aMatch = !a.type||(a.type===context);
    const bMatch = !b.type||(b.type===context);
    return bMatch-aMatch;
  });
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, width:"100%", maxWidth:560, maxHeight:"70vh",
        borderRadius:"16px 16px 0 0", display:"flex", flexDirection:"column",
        boxShadow:C.shadowLg, overflow:"hidden",
      }}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.borderMid}} />
        </div>
        <div style={{padding:"8px 16px 12px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text}}>Kies routine</span>
            <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",borderRadius:20,width:28,height:28,cursor:"pointer",fontSize:16,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"12px 16px",WebkitOverflowScrolling:"touch"}}>
          {sorted.length===0 ? (
            <div style={{textAlign:"center",padding:"32px 0",color:C.textMuted,fontSize:14}}>
              Nog geen routines aangemaakt.<br/>
              <span style={{fontSize:12}}>Ga naar het Routines-tabblad om er een te maken.</span>
            </div>
          ) : sorted.map(r=>{
            const typeLabel = r.type==="ochtend"?"☀️ Ochtend":r.type==="avond"?"🌙 Avond":null;
            const typeColor = r.type==="ochtend"?C.amber:r.type==="avond"?C.purple:null;
            const typeBg    = r.type==="ochtend"?C.amberLight:r.type==="avond"?C.purpleLight:null;
            const mismatch  = context&&r.type&&r.type!==context;
            return (
              <button key={r.id} onClick={()=>onSelect(r)} style={{
                display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 14px",
                background:"none",border:`1px solid ${C.border}`,borderRadius:10,marginBottom:6,
                cursor:"pointer",fontFamily:font,textAlign:"left",
                opacity:mismatch?0.55:1,
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:600,color:C.text}}>{r.name||"Naamloze routine"}</span>
                    {typeLabel&&<span style={{fontSize:10,fontWeight:600,color:typeColor,background:typeBg,padding:"1px 6px",borderRadius:4,flexShrink:0}}>{typeLabel}</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{(r.exercises||[]).length} oefeningen</div>
                </div>
                <span style={{color:C.green,fontSize:13,fontWeight:500,flexShrink:0}}>Laden →</span>
              </button>
            );
          })}
          <div style={{height:24}} />
        </div>
      </div>
    </div>
  );
}

// ─── SYNC MODAL ───────────────────────────────────────────────────────────────
function SyncModal({syncKey,onSwitch,onClose}) {
  const [input,setInput]     = useState("");
  const [phase,setPhase]     = useState("idle"); // idle | confirm | loading | error | success
  const [copied,setCopied]   = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(syncKey).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const handleSwitch = async () => {
    const trimmed = input.trim();
    if(!trimmed||trimmed===syncKey) return;
    if(phase==="confirm"){
      setPhase("loading");
      const data = await loadRemoteKey(trimmed);
      if(!data){ setPhase("error"); return; }
      if(data.weeks)       localStorage.setItem(STORAGE_KEY,  JSON.stringify(data.weeks));
      if(data.exercise_db) localStorage.setItem(DB_KEY,       JSON.stringify(data.exercise_db));
      if(data.routines)    localStorage.setItem(ROUTINES_KEY, JSON.stringify(data.routines));
      localStorage.setItem(SYNC_KEY_LOCAL, trimmed);
      onSwitch(); // reloads app state
    } else {
      setPhase("confirm");
    }
  };

  const supEnabled = !!supabase;

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface,width:"100%",maxWidth:560,borderRadius:"16px 16px 0 0",
        padding:"20px 20px 36px",boxShadow:C.shadowLg,
      }}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.borderMid}} />
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>Sync code</div>
          <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",borderRadius:20,width:28,height:28,cursor:"pointer",fontSize:16,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {!supEnabled&&(
          <div style={{background:C.amberLight,border:`1px solid ${C.amber}`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.amber}}>
            Supabase is niet geconfigureerd — sync werkt niet. Zie de setup-instructies.
          </div>
        )}

        {/* Current key */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Jouw sync code</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{
              flex:1,fontFamily:mono,fontSize:13,color:C.text,
              background:C.surfaceAlt,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"10px 12px",wordBreak:"break-all",letterSpacing:0.5,
            }}>{syncKey}</div>
            <button onClick={copy} style={{
              background:copied?C.greenLight:C.purpleLight,color:copied?C.green:C.purple,
              border:"none",borderRadius:8,padding:"10px 14px",fontFamily:font,
              fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0,transition:"all .2s",
            }}>{copied?"✓ Gekopieerd":"Kopieer"}</button>
          </div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:6}}>Voer deze code in op een ander apparaat om je data te synchroniseren.</div>
        </div>

        {/* Switch key */}
        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Sync met ander apparaat</div>
          <input value={input} onChange={e=>{setInput(e.target.value);setPhase("idle");}}
            placeholder="Plak hier de sync code van een ander apparaat"
            style={inp({fontSize:13,marginBottom:8})} />
          {phase==="error"&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>Code niet gevonden. Controleer of je de juiste code hebt ingevoerd.</div>}
          {phase==="confirm"&&<div style={{fontSize:12,color:C.amber,marginBottom:8}}>Je huidige data wordt vervangen door de data van de andere code. Klik nogmaals om te bevestigen.</div>}
          <Btn
            onClick={handleSwitch}
            variant={phase==="confirm"?"amber":input.trim()&&input.trim()!==syncKey?"primary":"subtle"}
            size="sm"
          >
            {phase==="loading"?"Laden…":phase==="confirm"?"Bevestigen – data overschrijven":"Sync code instellen"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────────────────
function ExRow({ex,onUpdate,onDelete,db,onSaveToDb,setsPlaceholder="3×5"}) {
  const [showSave,setShowSave] = useState(false);
  const [saveSection,setSaveSection] = useState("gym");
  const [savePartId,setSavePartId] = useState("");
  const parts = db?(db[saveSection]||[]):[];

  const doSave = () => {
    if(!savePartId||!ex.name.trim()) return;
    onSaveToDb(saveSection,savePartId,ex.name);
    setShowSave(false);
  };

  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <input value={ex.name} onChange={e=>onUpdate({...ex,name:e.target.value})}
          placeholder="Oefening" style={inp({flex:1,fontSize:14,padding:"9px 10px",minWidth:0})} />
        <input value={ex.sets} onChange={e=>onUpdate({...ex,sets:e.target.value})}
          placeholder={setsPlaceholder} style={inp({width:64,fontSize:13,padding:"9px 8px",fontFamily:mono,textAlign:"center",flexShrink:0})} />
        {ex.name.trim()&&db&&(
          <button onClick={()=>setShowSave(p=>!p)} style={{
            width:36,height:36,borderRadius:8,flexShrink:0,
            background:showSave?C.purpleLight:"transparent",
            border:`1px solid ${showSave?C.purple:C.border}`,
            color:showSave?C.purple:C.textMuted,cursor:"pointer",fontSize:16,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>＋</button>
        )}
        <button onClick={onDelete} style={{width:36,height:36,borderRadius:8,flexShrink:0,background:"transparent",border:`1px solid ${C.border}`,color:C.textMuted,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {showSave&&db&&(
        <div style={{marginTop:6,padding:"10px 12px",background:C.purpleLight,borderRadius:10,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:600,color:C.purple}}>Opslaan in database</div>
          <div style={{display:"flex",gap:8}}>
            <select value={saveSection} onChange={e=>{setSaveSection(e.target.value);setSavePartId("");}}
              style={{fontFamily:font,fontSize:13,color:C.text,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 8px",outline:"none",flex:1}}>
              <option value="mobiliteit">Mobiliteit</option>
              <option value="gym">Gym</option>
            </select>
            <select value={savePartId} onChange={e=>setSavePartId(e.target.value)}
              style={{fontFamily:font,fontSize:13,color:C.text,background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 8px",outline:"none",flex:2}}>
              <option value="">Lichaamsdeel…</option>
              {parts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={doSave} variant={savePartId?"primary":"subtle"} size="sm">Opslaan</Btn>
            <Btn onClick={()=>setShowSave(false)} variant="ghost" size="sm">Annuleer</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SECTION BLOCK (reusable for morning + evening exercises) ─────────────────
function ExerciseBlock({exercises,onChange,db,onSaveToDb,accentColor,accentBg,genLabel,onGenerate,setsPlaceholder,onOpenDbModal}) {
  const updEx = (i,v) => { const e=[...exercises]; e[i]=v; onChange(e); };
  const delEx = i => onChange(exercises.filter((_,j)=>j!==i));
  const addEx = () => onChange([...exercises,{name:"",sets:""}]);

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {onGenerate&&<Btn onClick={onGenerate} variant="subtle" size="sm">✦ {genLabel}</Btn>}
        {onOpenDbModal&&<Btn onClick={onOpenDbModal} variant="subtle" size="sm">⊕ Uit database</Btn>}
        <Btn onClick={addEx} variant={accentBg===C.amberLight?"amber":"purple"} size="sm">+ Nieuw</Btn>
      </div>
      {exercises.length===0?(
        <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",padding:"6px 0"}}>Nog geen oefeningen toegevoegd</div>
      ):(
        exercises.map((ex,i)=>(
          <ExRow key={i} ex={ex} onUpdate={v=>updEx(i,v)} onDelete={()=>delEx(i)}
            db={db} onSaveToDb={onSaveToDb} setsPlaceholder={setsPlaceholder||"3×5"} />
        ))
      )}
    </div>
  );
}

// ─── DAY CARD ─────────────────────────────────────────────────────────────────
function DayCard({dayKey,day,weekNum,onChange,db,onSaveToDb,routines,onUpdateRoutine}) {
  const [open,setOpen] = useState(false);
  const skills = SKILL_WEEKS[Math.min(weekNum,8)];
  const skillKey = DAY_SKILL[dayKey];
  const skill = skillKey?skills[skillKey]:null;
  const isRest = dayKey==="zo";

  const upd = (patch) => onChange({...day,...patch});

  const updMEx = (exs) => {
    if(day.morningRoutineSync && day.morningRoutineId) onUpdateRoutine(day.morningRoutineId, exs);
    upd({morningExercises:exs});
  };
  const updEx = (exs) => {
    if(day.routineSync && day.routineId) onUpdateRoutine(day.routineId, exs);
    upd({exercises:exs});
  };

  const genMobility = () => {
    const dbExs = db?(db.mobiliteit||[]).flatMap(p=>p.exercises.map(e=>({name:e.name,sets:""}))):[];
    updMEx(dbExs.length>0?dbExs:MOBILITY_TEMPLATES.map(t=>({name:t.name,sets:t.sets})));
  };
  const genGym = () => {
    const t=FB_TEMPLATES[dayKey]||[];
    if(t.length) updEx(t.map(([n,s])=>({name:n,sets:s})));
  };

  const loadRoutineIntoMorning = (routine) => {
    upd({
      morningRoutineId: routine.id,
      morningExercises: [...(routine.exercises||[])],
      morningRoutineSync: false,
      showMorningRoutineModal: false,
    });
  };
  const loadRoutineIntoEvening = (routine) => {
    upd({
      routineId: routine.id,
      exercises: [...(routine.exercises||[])],
      routineSync: false,
      showRoutineModal: false,
    });
  };

  const selectedMorningRoutine = (routines||[]).find(r=>r.id===day.morningRoutineId)||null;
  const selectedEveningRoutine = (routines||[]).find(r=>r.id===day.routineId)||null;

  // Collapsed header chips
  const hasMorning = day.morningType!=null;
  const hasEvening = day.type!=null;
  const hasNote    = day.note&&day.note.trim();

  const morningChipLabel = day.morningType==="exercises"
    ? `${day.morningExercises.length} oef.`
    : day.morningType==="routine"
    ? (selectedMorningRoutine?.name||"Routine")
    : (day.morningRoutineName||"Video");

  const eveningChipLabel = day.type==="gym"
    ? `${day.exercises.length} oef.`
    : day.type==="routine"
    ? (selectedEveningRoutine?.name||"Routine")
    : (day.routineName||"Video");

  const skillDot = skill?(
    <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:skill.color,marginRight:4}} />
  ):null;

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:C.shadow}}>
      {/* ── Collapsed header */}
      <button onClick={()=>setOpen(p=>!p)} style={{
        display:"flex",alignItems:"center",gap:12,padding:"13px 14px",
        width:"100%",background:"none",border:"none",cursor:"pointer",fontFamily:font,textAlign:"left",
        borderLeft:`3px solid ${skill?skill.color:C.border}`,
      }}>
        <div style={{width:40,height:40,borderRadius:10,background:skill?skill.color+"14":C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:skill?skill.color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase"}}>{DAY_SHORT[dayKey]}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>{DAY_LABELS[dayKey]}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
            {skill&&<span style={{fontSize:12,color:skill.color,fontWeight:500}}>{skillDot}{skill.label}</span>}
            {isRest&&<span style={{fontSize:12,color:C.textMuted}}>Rust</span>}
            {hasMorning&&<span style={{fontSize:11,color:C.amber,background:C.amberLight,padding:"1px 6px",borderRadius:4}}>☀️ {morningChipLabel}</span>}
            {hasEvening&&<span style={{fontSize:11,color:C.purple,background:C.purpleLight,padding:"1px 6px",borderRadius:4}}>{day.type==="gym"?"🏋️":"📋"} {eveningChipLabel}</span>}
            {hasNote&&<span style={{fontSize:11,color:C.textMuted}}>📝</span>}
          </div>
        </div>
        <span style={{fontSize:16,color:C.textMuted,flexShrink:0,transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
      </button>

      {/* ── Expanded content */}
      {open&&(
        <div style={{borderTop:`1px solid ${C.border}`}}>

          {/* MORNING */}
          <div style={{padding:"14px 14px 0",background:"rgba(217,119,6,0.04)"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <span style={{fontSize:13}}>☀️</span>
              <span style={{fontSize:12,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:0.5}}>Ochtend · Mobiliteit</span>
            </div>
            {/* Segmented control: 4 options */}
            <div style={{display:"flex",gap:4,background:C.surfaceAlt,borderRadius:10,padding:3,marginBottom:12}}>
              <Seg active={day.morningType==="exercises"} color={C.amber}  bg={C.amberLight} onClick={()=>upd({morningType:"exercises"})}>Oefeningen</Seg>
              <Seg active={day.morningType==="routine"}   color={C.green}  bg={C.greenLight}  onClick={()=>upd({morningType:"routine"})}>Routine</Seg>
              <Seg active={day.morningType==="video"}     color={C.textSub} bg={C.surfaceHover} onClick={()=>upd({morningType:"video"})}>Video</Seg>
              <Seg active={day.morningType===null}                                              onClick={()=>upd({morningType:null})}>—</Seg>
            </div>

            {day.morningType==="exercises"&&(
              <div style={{paddingBottom:14}}>
                <ExerciseBlock exercises={day.morningExercises} onChange={updMEx}
                  db={db} onSaveToDb={onSaveToDb}
                  accentColor={C.amber} accentBg={C.amberLight}
                  genLabel="Stel voor" onGenerate={genMobility}
                  setsPlaceholder="60s"
                  onOpenDbModal={()=>upd({showMorningDbModal:true})} />
              </div>
            )}

            {day.morningType==="routine"&&(
              <div style={{paddingBottom:14,display:"flex",flexDirection:"column",gap:10}}>
                {/* Picker */}
                <button onClick={()=>upd({showMorningRoutineModal:true})} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
                  background:selectedMorningRoutine?C.greenLight:C.surfaceAlt,
                  border:`1px solid ${selectedMorningRoutine?C.green:C.border}`,
                  borderRadius:10,cursor:"pointer",fontFamily:font,textAlign:"left",width:"100%",
                }}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:selectedMorningRoutine?C.green:C.borderMid,flexShrink:0}} />
                  <span style={{fontSize:14,fontWeight:selectedMorningRoutine?600:400,color:selectedMorningRoutine?C.green:C.textMuted,flex:1}}>
                    {selectedMorningRoutine?.name||"Kies routine…"}
                  </span>
                  <span style={{fontSize:12,color:C.textMuted}}>wijzig</span>
                </button>

                {selectedMorningRoutine&&(
                  <>
                    {/* Sync checkbox */}
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}>
                      <input type="checkbox" checked={!!day.morningRoutineSync}
                        onChange={e=>upd({morningRoutineSync:e.target.checked})}
                        style={{width:16,height:16,cursor:"pointer",accentColor:C.green}} />
                      <span style={{fontSize:13,color:C.textSub}}>Wijzigingen opslaan in routine</span>
                    </label>
                    {/* Exercise list */}
                    <ExerciseBlock exercises={day.morningExercises} onChange={updMEx}
                      accentColor={C.green} accentBg={C.greenLight}
                      setsPlaceholder="60s" />
                  </>
                )}
              </div>
            )}

            {day.morningType==="video"&&(
              <div style={{paddingBottom:14,display:"flex",flexDirection:"column",gap:8}}>
                <input value={day.morningRoutineName} onChange={e=>upd({morningRoutineName:e.target.value})}
                  placeholder="Naam (bijv. Strength Side follow-along)" style={inp({fontSize:14})} />
                <input value={day.morningRoutineUrl} onChange={e=>upd({morningRoutineUrl:e.target.value})}
                  placeholder="Link (YouTube / website)" style={inp({fontSize:14})} />
                {day.morningRoutineUrl&&(
                  <a href={day.morningRoutineUrl} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:13,color:C.green,fontWeight:500,textDecoration:"none"}}>↗ Open video</a>
                )}
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div style={{height:1,background:C.border,margin:"0 14px"}} />

          {/* EVENING */}
          {!isRest&&(
            <div style={{padding:"14px 14px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{fontSize:13}}>🌙</span>
                <span style={{fontSize:12,fontWeight:700,color:C.textSub,textTransform:"uppercase",letterSpacing:0.5}}>Avond · Training</span>
              </div>
              <div style={{display:"flex",gap:4,background:C.surfaceAlt,borderRadius:10,padding:3,marginBottom:12}}>
                <Seg active={day.type==="gym"}     color={C.purple}  bg={C.purpleLight}    onClick={()=>upd({type:"gym"})}>Gym</Seg>
                <Seg active={day.type==="routine"} color={C.green}   bg={C.greenLight}     onClick={()=>upd({type:"routine"})}>Routine</Seg>
                <Seg active={day.type==="video"}   color={C.textSub} bg={C.surfaceHover}   onClick={()=>upd({type:"video"})}>Video</Seg>
                <Seg active={day.type===null}                                               onClick={()=>upd({type:null})}>—</Seg>
              </div>

              {day.type==="gym"&&(
                <div style={{paddingBottom:14}}>
                  <ExerciseBlock exercises={day.exercises} onChange={updEx}
                    db={db} onSaveToDb={onSaveToDb}
                    accentColor={C.purple} accentBg={C.purpleLight}
                    genLabel="Stel voor" onGenerate={genGym}
                    onOpenDbModal={()=>upd({showDbModal:true})} />
                </div>
              )}

              {day.type==="routine"&&(
                <div style={{paddingBottom:14,display:"flex",flexDirection:"column",gap:10}}>
                  {/* Picker */}
                  <button onClick={()=>upd({showRoutineModal:true})} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
                    background:selectedEveningRoutine?C.greenLight:C.surfaceAlt,
                    border:`1px solid ${selectedEveningRoutine?C.green:C.border}`,
                    borderRadius:10,cursor:"pointer",fontFamily:font,textAlign:"left",width:"100%",
                  }}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:selectedEveningRoutine?C.green:C.borderMid,flexShrink:0}} />
                    <span style={{fontSize:14,fontWeight:selectedEveningRoutine?600:400,color:selectedEveningRoutine?C.green:C.textMuted,flex:1}}>
                      {selectedEveningRoutine?.name||"Kies routine…"}
                    </span>
                    <span style={{fontSize:12,color:C.textMuted}}>wijzig</span>
                  </button>

                  {selectedEveningRoutine&&(
                    <>
                      {/* Sync checkbox */}
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}>
                        <input type="checkbox" checked={!!day.routineSync}
                          onChange={e=>upd({routineSync:e.target.checked})}
                          style={{width:16,height:16,cursor:"pointer",accentColor:C.green}} />
                        <span style={{fontSize:13,color:C.textSub}}>Wijzigingen opslaan in routine</span>
                      </label>
                      {/* Exercise list */}
                      <ExerciseBlock exercises={day.exercises} onChange={updEx}
                        accentColor={C.green} accentBg={C.greenLight} />
                    </>
                  )}
                </div>
              )}

              {day.type==="video"&&(
                <div style={{paddingBottom:14,display:"flex",flexDirection:"column",gap:8}}>
                  <input value={day.routineName} onChange={e=>upd({routineName:e.target.value})}
                    placeholder="Naam (bijv. Strength Side Ground)" style={inp({fontSize:14})} />
                  <input value={day.routineUrl} onChange={e=>upd({routineUrl:e.target.value})}
                    placeholder="Link (YouTube / website)" style={inp({fontSize:14})} />
                  {day.routineUrl&&(
                    <a href={day.routineUrl} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:13,color:C.green,fontWeight:500,textDecoration:"none"}}>↗ Open video</a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SKILL */}
          {skill&&(
            <div style={{margin:"0 14px",padding:"12px 14px",background:skill.color+"08",borderRadius:10,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <div style={{width:3,height:16,borderRadius:2,background:skill.color,flexShrink:0}} />
                <span style={{fontSize:12,fontWeight:700,color:skill.color,textTransform:"uppercase",letterSpacing:0.5}}>Skill · {skill.label}</span>
              </div>
              {skill.items.map((item,i)=>(
                <div key={i} style={{display:"flex",gap:8,fontSize:13,color:C.textSub,alignItems:"flex-start",marginBottom:4}}>
                  <span style={{color:skill.color,fontWeight:700,flexShrink:0}}>·</span><span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* NOTE */}
          <div style={{padding:"0 14px 14px"}}>
            <textarea value={day.note||""} onChange={e=>upd({note:e.target.value})}
              placeholder="📝 Notitie voor deze dag…"
              rows={2} style={inp({resize:"vertical",lineHeight:1.5,fontSize:13,color:C.textSub})} />
          </div>
        </div>
      )}

      {/* Modals */}
      {day.showMorningDbModal&&db&&(
        <DbModal db={db} filterSection="mobiliteit"
          onClose={()=>upd({showMorningDbModal:false})}
          onSelect={ex=>upd({morningExercises:[...day.morningExercises,{name:ex.name,sets:""}],showMorningDbModal:false})} />
      )}
      {day.showMorningRoutineModal&&(
        <RoutinePickerModal routines={routines||[]} context="ochtend"
          onClose={()=>upd({showMorningRoutineModal:false})}
          onSelect={loadRoutineIntoMorning} />
      )}
      {day.showDbModal&&db&&(
        <DbModal db={db}
          onClose={()=>upd({showDbModal:false})}
          onSelect={ex=>upd({exercises:[...day.exercises,{name:ex.name,sets:""}],showDbModal:false})} />
      )}
      {day.showRoutineModal&&(
        <RoutinePickerModal routines={routines||[]} context="avond"
          onClose={()=>upd({showRoutineModal:false})}
          onSelect={loadRoutineIntoEvening} />
      )}
    </div>
  );
}

// ─── WEEK EVAL ────────────────────────────────────────────────────────────────
function WeekEval({week,onSave}) {
  const [ratings,setRatings] = useState(week.ratings||{});
  const [note,setNote] = useState(week.note||"");
  const skills = SKILL_WEEKS[Math.min(week.weekNum,8)];

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginTop:16,boxShadow:C.shadowLg}}>
      <div style={{padding:"14px 16px",background:C.purpleLight,borderBottom:`1px solid ${C.purpleMid}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.purple}}>Week {week.weekNum} afsluiten</div>
        <div style={{fontSize:13,color:C.purple+"99",marginTop:2}}>Beoordeel elke skill en maak week {week.weekNum+1} aan.</div>
      </div>
      <div style={{padding:"16px"}}>
        {SKILL_KEYS.map(k=>{
          const s=skills[k];
          return (
            <div key={k} style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:s.color,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:s.color}} />{s.label}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {RATINGS.map((r,i)=>(
                  <button key={r} onClick={()=>setRatings(p=>({...p,[k]:r}))} style={{
                    padding:"10px 8px",borderRadius:8,fontFamily:font,fontSize:13,fontWeight:ratings[k]===r?600:400,
                    border:`1.5px solid ${ratings[k]===r?RATING_COLORS[i]:C.border}`,
                    background:ratings[k]===r?RATING_COLORS[i]+"18":C.surface,
                    color:ratings[k]===r?RATING_COLORS[i]:C.textMuted,
                    cursor:"pointer",transition:"all .15s",textAlign:"center",
                  }}>{r}</button>
                ))}
              </div>
            </div>
          );
        })}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.textSub,marginBottom:6}}>Notitie</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Hoe ging de week? Wat viel op?" rows={3}
            style={inp({resize:"vertical",lineHeight:1.5})} />
        </div>
        <Btn onClick={()=>onSave(ratings,note)} variant="primary" full size="lg">
          Week afsluiten → Week {week.weekNum+1} aanmaken
        </Btn>
      </div>
    </div>
  );
}

// ─── ROUTINES TAB ─────────────────────────────────────────────────────────────
function RoutineCard({routine,onChangeName,onChangeExercises,onChangeType,onDelete,db}) {
  const [open,setOpen]           = useState(true);
  const [showDbModal,setShowDbModal] = useState(false);

  const addEx = () => onChangeExercises([...routine.exercises,{name:"",sets:""}]);
  const updEx = (i,v) => { const e=[...routine.exercises]; e[i]=v; onChangeExercises(e); };
  const delEx = i => onChangeExercises(routine.exercises.filter((_,j)=>j!==i));

  const typeIcon  = routine.type==="ochtend"?"☀️":routine.type==="avond"?"🌙":"·";

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:C.shadow}}>
      <div style={{
        display:"flex",alignItems:"center",gap:8,padding:"12px 14px",
        background:open?C.surfaceAlt:C.surface,
        borderBottom:open?`1px solid ${C.border}`:"none",
      }}>
        <button onClick={()=>setOpen(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,padding:0,flexShrink:0,lineHeight:1,transition:"transform .15s",transform:open?"rotate(90deg)":"rotate(0deg)"}}>▶</button>
        <span style={{fontSize:13,flexShrink:0,lineHeight:1}}>{typeIcon}</span>
        <input value={routine.name} onChange={e=>onChangeName(e.target.value)}
          style={{fontFamily:font,fontSize:14,fontWeight:600,color:C.text,background:"transparent",border:"none",outline:"none",flex:1,minWidth:0}} />
        <span style={{fontSize:12,color:C.textMuted,flexShrink:0}}>{routine.exercises.length} oef.</span>
        <button onClick={onDelete} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
      </div>
      {open&&(
        <div style={{padding:"12px 14px 14px"}}>
          {/* Type selector */}
          <div style={{display:"flex",gap:4,background:C.surfaceAlt,borderRadius:10,padding:3,marginBottom:12}}>
            <Seg active={routine.type==="ochtend"} color={C.amber}  bg={C.amberLight}  onClick={()=>onChangeType("ochtend")}>☀️ Ochtend</Seg>
            <Seg active={routine.type==="avond"}   color={C.purple} bg={C.purpleLight} onClick={()=>onChangeType("avond")}>🌙 Avond</Seg>
            <Seg active={!routine.type}                                                 onClick={()=>onChangeType(null)}>Beide</Seg>
          </div>
          {/* Exercises */}
          {routine.exercises.length===0&&(
            <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",padding:"4px 0 8px"}}>Nog geen oefeningen</div>
          )}
          {routine.exercises.map((ex,i)=>(
            <ExRow key={i} ex={ex} onUpdate={v=>updEx(i,v)} onDelete={()=>delEx(i)} setsPlaceholder="3×5" />
          ))}
          {/* Action buttons */}
          <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
            <Btn onClick={addEx} variant="green" size="sm">+ Nieuw</Btn>
            {db&&<Btn onClick={()=>setShowDbModal(true)} variant="subtle" size="sm">⊕ Uit database</Btn>}
          </div>
        </div>
      )}
      {showDbModal&&db&&(
        <DbModal db={db}
          filterSection={routine.type==="ochtend"?"mobiliteit":routine.type==="avond"?"gym":undefined}
          onClose={()=>setShowDbModal(false)}
          onSelect={ex=>{onChangeExercises([...routine.exercises,{name:ex.name,sets:""}]);setShowDbModal(false);}} />
      )}
    </div>
  );
}

function RoutinesTab({routines,onChange,db}) {
  const addRoutine    = () => onChange([...routines,{id:mkId(),name:"Nieuwe routine",type:null,exercises:[]}]);
  const removeRoutine = (id) => onChange(routines.filter(r=>r.id!==id));
  const updateRoutine = (id,patch) => onChange(routines.map(r=>r.id===id?{...r,...patch}:r));

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>Routines</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Maak oefenroutines die je in dagkaarten kunt laden</div>
        </div>
        <Btn onClick={addRoutine} variant="primary" size="sm">+ Routine</Btn>
      </div>
      {routines.length===0?(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"32px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Nog geen routines</div>
          <div style={{fontSize:13,color:C.textMuted,marginBottom:16}}>Maak een routine aan en laad hem in elke dag met één klik.</div>
          <Btn onClick={addRoutine} variant="primary">+ Eerste routine</Btn>
        </div>
      ):routines.map(r=>(
        <RoutineCard key={r.id} routine={r}
          onChangeName={name=>updateRoutine(r.id,{name})}
          onChangeExercises={exs=>updateRoutine(r.id,{exercises:exs})}
          onChangeType={type=>updateRoutine(r.id,{type})}
          onDelete={()=>removeRoutine(r.id)}
          db={db} />
      ))}
    </div>
  );
}

// ─── DATABASE TAB ─────────────────────────────────────────────────────────────
function DatabaseTab({db,onChange}) {
  const [expanded,setExpanded]     = useState({});
  const [exExpanded,setExExpanded] = useState({});
  const [dragging,setDragging]     = useState(null);
  const [dragOver,setDragOver]     = useState(null);

  const toggle   = id => setExpanded(p=>({...p,[id]:!p[id]}));
  const toggleEx = id => setExExpanded(p=>({...p,[id]:!p[id]}));

  const addPart    = s => onChange({...db,[s]:[...db[s],{id:mkId(),name:"Nieuw lichaamsdeel",exercises:[]}]});
  const removePart = (s,id) => onChange({...db,[s]:db[s].filter(p=>p.id!==id)});
  const renamePart = (s,id,name) => onChange({...db,[s]:db[s].map(p=>p.id===id?{...p,name}:p)});
  const addEx      = (s,pid) => onChange({...db,[s]:db[s].map(p=>p.id===pid?{...p,exercises:[...p.exercises,{id:mkId(),name:"Nieuwe oefening",uitleg:"",video:""}]}:p)});
  const removeEx   = (s,pid,eid) => onChange({...db,[s]:db[s].map(p=>p.id===pid?{...p,exercises:p.exercises.filter(e=>e.id!==eid)}:p)});
  const updateEx   = (s,pid,eid,field,val) => onChange({...db,[s]:db[s].map(p=>p.id===pid?{...p,exercises:p.exercises.map(e=>e.id===eid?{...e,[field]:val}:e)}:p)});

  const dropExercise = useCallback((toSection, toPartId, toIdx) => {
    if(!dragging) return;
    const {eid, fromSection, fromPartId} = dragging;
    const fromPart = db[fromSection].find(p=>p.id===fromPartId);
    if(!fromPart) return;
    const ex = fromPart.exercises.find(e=>e.id===eid);
    if(!ex) return;
    let newDb = {...db};
    newDb[fromSection] = newDb[fromSection].map(p=>
      p.id===fromPartId ? {...p, exercises:p.exercises.filter(e=>e.id!==eid)} : p
    );
    newDb[toSection] = newDb[toSection].map(p=>{
      if(p.id!==toPartId) return p;
      const exs = [...p.exercises.filter(e=>e.id!==eid)];
      const insertAt = Math.min(toIdx, exs.length);
      exs.splice(insertAt, 0, ex);
      return {...p, exercises:exs};
    });
    onChange(newDb);
    setDragging(null);
    setDragOver(null);
  },[dragging, db, onChange]);

  const SECTIONS = [
    {key:"mobiliteit",label:"Mobiliteit",color:C.amber,bg:C.amberLight,icon:"🤸"},
    {key:"gym",       label:"Gym",       color:C.purple,bg:C.purpleLight,icon:"🏋️"},
  ];

  return (
    <div>
      {dragging&&(
        <div style={{
          position:"fixed",top:0,left:0,right:0,zIndex:200,pointerEvents:"none",
          display:"flex",justifyContent:"center",paddingTop:60,
        }}>
          <div style={{background:C.purple,color:"#fff",borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600,boxShadow:C.shadowLg,opacity:0.9}}>
            ✥ Versleep naar lichaamsdeel
          </div>
        </div>
      )}

      {SECTIONS.map(s=>(
        <div key={s.key} style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <span style={{fontSize:17,fontWeight:700,color:C.text}}>{s.label}</span>
            </div>
            <Btn onClick={()=>addPart(s.key)} variant={s.key==="mobiliteit"?"amber":"purple"} size="sm">+ Lichaamsdeel</Btn>
          </div>

          {db[s.key].map(part=>{
            const isDropTarget = dragging && dragOver && dragOver.section===s.key && dragOver.partId===part.id;
            return (
              <div key={part.id}
                style={{
                  background:C.surface,border:`1.5px solid ${isDropTarget?C.purple:C.border}`,
                  borderRadius:12,marginBottom:8,overflow:"hidden",
                  boxShadow:isDropTarget?`0 0 0 3px ${C.purple}22`:C.shadow,
                  transition:"border-color .15s, box-shadow .15s",
                }}
                onDragOver={e=>{e.preventDefault();setDragOver({section:s.key,partId:part.id,idx:part.exercises.length});}}
                onDrop={e=>{e.preventDefault();dropExercise(s.key,part.id,part.exercises.length);}}
                onDragLeave={()=>setDragOver(null)}
              >
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:expanded[part.id]?C.surfaceAlt:C.surface,borderBottom:expanded[part.id]?`1px solid ${C.border}`:"none"}}>
                  <button onClick={()=>toggle(part.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,padding:0,flexShrink:0,lineHeight:1,transition:"transform .15s",transform:expanded[part.id]?"rotate(90deg)":"rotate(0deg)"}}>▶</button>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}} />
                  <input value={part.name} onChange={e=>renamePart(s.key,part.id,e.target.value)}
                    style={{fontFamily:font,fontSize:14,fontWeight:600,color:C.text,background:"transparent",border:"none",outline:"none",flex:1,minWidth:0}} />
                  <span style={{fontSize:12,color:C.textMuted,flexShrink:0}}>{part.exercises.length}</span>
                  <Btn onClick={()=>{addEx(s.key,part.id);setExpanded(p=>({...p,[part.id]:true}));}} variant={s.key==="mobiliteit"?"amber":"purple"} size="sm">+ Oef.</Btn>
                  <button onClick={()=>removePart(s.key,part.id)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
                </div>

                {!expanded[part.id]&&dragging&&(
                  <div style={{padding:"8px 14px",fontSize:12,color:C.purple,fontStyle:"italic",background:C.purpleLight,borderTop:`1px solid ${C.purpleMid}`}}>
                    ↓ Laat hier los om toe te voegen
                  </div>
                )}

                {expanded[part.id]&&(
                  <div style={{padding:"10px 14px 14px"}}>
                    {part.exercises.length===0&&(
                      <div style={{
                        padding:"12px",borderRadius:8,border:`2px dashed ${isDropTarget?C.purple:C.border}`,
                        fontSize:13,color:isDropTarget?C.purple:C.textMuted,textAlign:"center",
                        background:isDropTarget?C.purpleLight:"transparent",transition:"all .15s",
                      }}>
                        {isDropTarget?"Loslaten om hier neer te zetten":"Geen oefeningen — sleep er een naartoe of klik + Oef."}
                      </div>
                    )}
                    {part.exercises.map((ex,exIdx)=>{
                      const isDraggingThis = dragging?.eid===ex.id;
                      const isHoverSlot = dragOver?.section===s.key && dragOver?.partId===part.id && dragOver?.idx===exIdx;
                      return (
                        <div key={ex.id}>
                          {dragging&&!isDraggingThis&&(
                            <div
                              onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver({section:s.key,partId:part.id,idx:exIdx});}}
                              onDrop={e=>{e.preventDefault();e.stopPropagation();dropExercise(s.key,part.id,exIdx);}}
                              style={{height:isHoverSlot?28:6,borderRadius:6,background:isHoverSlot?C.purpleLight:"transparent",border:isHoverSlot?`2px dashed ${C.purple}`:"none",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {isHoverSlot&&<span style={{fontSize:11,color:C.purple,fontWeight:600}}>Hier neerzetten</span>}
                            </div>
                          )}
                          <div
                            draggable
                            onDragStart={e=>{e.dataTransfer.effectAllowed="move";setDragging({eid:ex.id,fromSection:s.key,fromPartId:part.id});}}
                            onDragEnd={()=>{setDragging(null);setDragOver(null);}}
                            style={{
                              background:isDraggingThis?"transparent":C.surfaceAlt,
                              borderRadius:10,overflow:"hidden",
                              border:`1px solid ${isDraggingThis?C.border+"40":C.border}`,
                              opacity:isDraggingThis?0.3:1,transition:"opacity .15s",
                            }}
                          >
                            <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 12px",borderBottom:exExpanded[ex.id]?`1px solid ${C.border}`:"none"}}>
                              <span
                                draggable
                                onDragStart={e=>{e.dataTransfer.effectAllowed="move";setDragging({eid:ex.id,fromSection:s.key,fromPartId:part.id});}}
                                style={{color:C.borderMid,cursor:"grab",fontSize:16,flexShrink:0,userSelect:"none",padding:"0 2px",lineHeight:1}}
                                title="Slepen">⠿</span>
                              <button onClick={()=>toggleEx(ex.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:12,padding:0,flexShrink:0,transition:"transform .15s",transform:exExpanded[ex.id]?"rotate(90deg)":"rotate(0deg)"}}>▶</button>
                              <input value={ex.name} onChange={e=>updateEx(s.key,part.id,ex.id,"name",e.target.value)}
                                style={{fontFamily:font,fontSize:14,fontWeight:500,color:C.text,background:"transparent",border:"none",outline:"none",flex:1,minWidth:0}} />
                              {ex.video&&<span style={{fontSize:11,color:C.green,flexShrink:0}}>▶</span>}
                              <button onClick={()=>removeEx(s.key,part.id,ex.id)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
                            </div>
                            {exExpanded[ex.id]&&(
                              <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
                                <div>
                                  <div style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Uitleg</div>
                                  <textarea value={ex.uitleg} onChange={e=>updateEx(s.key,part.id,ex.id,"uitleg",e.target.value)}
                                    placeholder="Beschrijf de uitvoering…" rows={3}
                                    style={inp({resize:"vertical",lineHeight:1.5,fontSize:13})} />
                                </div>
                                <div>
                                  <div style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Video (optioneel)</div>
                                  <input value={ex.video} onChange={e=>updateEx(s.key,part.id,ex.id,"video",e.target.value)}
                                    placeholder="YouTube of andere link…" style={inp({fontSize:13})} />
                                  {ex.video&&<a href={ex.video} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:5,fontSize:12,color:C.green,fontWeight:500}}>↗ Open video</a>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {dragging&&part.exercises.length>0&&(()=>{
                      const isEnd = dragOver?.section===s.key && dragOver?.partId===part.id && dragOver?.idx===part.exercises.length;
                      return (
                        <div
                          onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver({section:s.key,partId:part.id,idx:part.exercises.length});}}
                          onDrop={e=>{e.preventDefault();e.stopPropagation();dropExercise(s.key,part.id,part.exercises.length);}}
                          style={{height:isEnd?28:8,borderRadius:6,background:isEnd?C.purpleLight:"transparent",border:isEnd?`2px dashed ${C.purple}`:"none",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {isEnd&&<span style={{fontSize:11,color:C.purple,fontWeight:600}}>Hier neerzetten</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [weeks,setWeeks]         = useState(null);
  const [activeIdx,setActiveIdx] = useState(0);
  const [tab,setTab]             = useState("plan");
  const [db,setDb]               = useState(null);
  const [routines,setRoutines]   = useState(null);
  const [syncKey,setSyncKey]     = useState("");
  const [showSync,setShowSync]   = useState(false);

  const loadAll = useCallback(async()=>{
    await initSync();
    const [w,d,r] = await Promise.all([loadData(),loadDb(),loadRoutines()]);
    setWeeks(w);
    setActiveIdx(w.length-1);
    setDb(d);
    setRoutines(r);
    setSyncKey(getSyncKey());
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  const persist         = useCallback((w)=>{setWeeks(w);saveData(w);},[]);
  const persistDb       = useCallback((d)=>{setDb(d);saveDb(d);},[]);
  const persistRoutines = useCallback((r)=>{setRoutines(r);saveRoutines(r);},[]);

  const updateDay = (wi,dk,val) => persist(weeks.map((wk,i)=>i!==wi?wk:{...wk,days:{...wk.days,[dk]:val}}));
  const closeWeek = (wi,ratings,note) => {
    const w=weeks.map((wk,i)=>i!==wi?wk:{...wk,ratings,note,done:true});
    const next=w[w.length-1].weekNum+1;
    if(next<=8&&!w.find(wk=>wk.weekNum===next)) w.push(mkWeek(next));
    persist(w); setActiveIdx(w.length-1);
  };

  const updateRoutineExercises = useCallback((routineId,exercises) => {
    setRoutines(prev=>{
      const next=(prev||[]).map(r=>r.id===routineId?{...r,exercises}:r);
      saveRoutines(next);
      return next;
    });
  },[]);

  if(!weeks||!db||routines===null) return (
    <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.textMuted,fontSize:14}}>Laden…</div>
    </div>
  );

  const aw     = weeks[activeIdx];
  const skills = SKILL_WEEKS[Math.min(aw.weekNum,8)];

  const TABS = [["plan","Plan"],["routines","Routines"],["history","Geschiedenis"],["database","Database"]];

  return (
    <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",color:C.text}}>

      {/* ── Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 0"}}>
            <div>
              <h1 style={{fontSize:18,fontWeight:700,color:C.text,margin:0,letterSpacing:"-0.3px"}}>Trainingsplan</h1>
              <div style={{fontSize:12,color:C.textMuted,marginTop:1}}>Handstand · Pull-ups · 8 weken</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setShowSync(true)} title="Sync code" style={{
                background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                padding:"6px 10px",cursor:"pointer",fontSize:13,color:C.textMuted,fontFamily:font,
                display:"flex",alignItems:"center",gap:4,
              }}>
                <span style={{fontSize:14}}>⇄</span>
                <span style={{fontSize:11,display:supabase?"inline":"none",color:C.green}}>●</span>
              </button>
              <Tag color={C.purple} bg={C.purpleLight}>Week {aw.weekNum}</Tag>
            </div>
          </div>
          {/* Tab bar */}
          <div style={{display:"flex",marginTop:6}}>
            {TABS.map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1,padding:"10px 4px",background:"none",border:"none",
                borderBottom:`2px solid ${tab===id?C.purple:"transparent"}`,
                color:tab===id?C.purple:C.textMuted,
                cursor:"pointer",fontSize:13,fontFamily:font,fontWeight:tab===id?600:400,
                transition:"color .15s",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body */}
      <div style={{maxWidth:760,margin:"0 auto",padding:"16px 12px 80px"}}>

        {/* PLAN */}
        {tab==="plan"&&(
          <div>
            {/* Week pills */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
              <span style={{fontSize:12,color:C.textMuted}}>Week</span>
              {weeks.map((w,i)=>(
                <button key={i} onClick={()=>setActiveIdx(i)} style={{
                  width:36,height:36,borderRadius:9,border:`1.5px solid ${activeIdx===i?C.purple:C.border}`,
                  background:activeIdx===i?C.purple:w.done?C.surfaceAlt:C.surface,
                  color:activeIdx===i?"#fff":w.done?C.textMuted:C.text,
                  cursor:"pointer",fontSize:13,fontFamily:font,fontWeight:600,position:"relative",
                  boxShadow:activeIdx===i?`0 0 0 3px ${C.purple}22`:"none",transition:"all .15s",
                }}>
                  {w.weekNum}
                  {w.done&&<span style={{position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:C.green,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:"#fff"}}>✓</span>}
                </button>
              ))}
            </div>

            {/* Week title bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:12,boxShadow:C.shadow}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5}}>{PHASE_LABELS[aw.weekNum-1]}</div>
                <div style={{fontSize:19,fontWeight:700,color:C.text}}>Week {aw.weekNum}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <Tag color="#7C3AED" bg="#EDE9FD">🤸 3×</Tag>
                <Tag color="#059669" bg="#D1FAE5">💪 3×</Tag>
              </div>
            </div>

            {DAYS.map(d=>(
              <DayCard key={d} dayKey={d} day={aw.days[d]} weekNum={aw.weekNum}
                onChange={v=>updateDay(activeIdx,d,v)} db={db}
                routines={routines} onUpdateRoutine={updateRoutineExercises}
                onSaveToDb={(section,partId,name)=>{
                  const newEx={id:mkId(),name,uitleg:"",video:""};
                  persistDb({...db,[section]:db[section].map(p=>p.id===partId?{...p,exercises:[...p.exercises,newEx]}:p)});
                }} />
            ))}

            {!aw.done&&aw.weekNum<=8&&<WeekEval week={aw} onSave={(r,n)=>closeWeek(activeIdx,r,n)} />}

            {aw.done&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginTop:14}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:C.green,display:"inline-block"}} />
                  <span style={{fontSize:13,fontWeight:600,color:C.green}}>Week afgesloten</span>
                </div>
                {aw.note&&<div style={{fontSize:13,color:C.textSub,fontStyle:"italic",marginBottom:10}}>"{aw.note}"</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {SKILL_KEYS.map(k=>aw.ratings[k]&&(
                    <Tag key={k} color={RATING_COLORS[RATINGS.indexOf(aw.ratings[k])]} bg={RATING_COLORS[RATINGS.indexOf(aw.ratings[k])]+"18"}>
                      {skills[k].label}: {aw.ratings[k]}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROUTINES */}
        {tab==="routines"&&<RoutinesTab routines={routines} onChange={persistRoutines} db={db} />}

        {/* HISTORY */}
        {tab==="history"&&(
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.textSub,marginBottom:14}}>Afgesloten weken</div>
            {weeks.filter(w=>w.done).length===0&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"32px 20px",textAlign:"center"}}>
                <div style={{fontSize:14,color:C.textMuted}}>Nog geen weken afgesloten.</div>
                <div style={{fontSize:12,color:C.textMuted,marginTop:4}}>Sluit week 1 af via het Plan-tabblad.</div>
              </div>
            )}
            {[...weeks].reverse().filter(w=>w.done).map(w=>{
              const ws=SKILL_WEEKS[Math.min(w.weekNum,8)];
              return (
                <div key={w.weekNum} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:10,boxShadow:C.shadow}}>
                  <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:C.text}}>Week {w.weekNum}</div>
                        <div style={{fontSize:12,color:C.textMuted}}>{PHASE_LABELS[w.weekNum-1]}</div>
                      </div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {SKILL_KEYS.map(k=>w.ratings[k]&&(
                          <Tag key={k} color={RATING_COLORS[RATINGS.indexOf(w.ratings[k])]} bg={RATING_COLORS[RATINGS.indexOf(w.ratings[k])]+"18"}>
                            {ws[k].label}: {w.ratings[k]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    {w.note&&<div style={{fontSize:12,color:C.textSub,fontStyle:"italic",marginTop:6}}>"{w.note}"</div>}
                  </div>
                  <div style={{padding:"10px 14px",display:"flex",gap:5,flexWrap:"wrap"}}>
                    {DAYS.map(d=>{
                      const day=w.days[d];
                      const hasActivity = day.type==="gym"||day.type==="routine"||day.type==="video";
                      const col=day.type==="gym"?C.purple:hasActivity?C.green:C.textMuted;
                      const bg=day.type==="gym"?C.purpleLight:hasActivity?C.greenLight:C.surfaceAlt;
                      return <span key={d} style={{padding:"3px 8px",borderRadius:5,fontSize:11,fontWeight:500,background:bg,color:col}}>{DAY_SHORT[d]}</span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DATABASE */}
        {tab==="database"&&db&&<DatabaseTab db={db} onChange={persistDb} />}

      </div>

      {/* Sync modal */}
      {showSync&&syncKey&&(
        <SyncModal syncKey={syncKey} onClose={()=>setShowSync(false)}
          onSwitch={()=>{ setShowSync(false); loadAll(); }} />
      )}
    </div>
  );
}
