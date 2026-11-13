import { useState, useEffect, useCallback, useRef, Component } from "react";
import { supabase } from './supabase.js';
import RepsTab, { REPS_STORAGE_KEY } from './RepsTab.jsx';
import MobilityTab, { MOBILITY_STORAGE_KEY } from './MobilityTab.jsx';
import { C, font, mono, inp } from './tokens.js';

// ─── WEEKPLAN ─────────────────────────────────────────────────────────────────

const DAYS       = ["ma","di","wo","do","vr","za","zo"];
const DAY_LABELS = { ma:"Maandag", di:"Dinsdag", wo:"Woensdag", do:"Donderdag", vr:"Vrijdag", za:"Zaterdag", zo:"Zondag" };
const DAY_SHORT  = { ma:"Ma", di:"Di", wo:"Wo", do:"Do", vr:"Vr", za:"Za", zo:"Zo" };

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY    = "training_v5";
const DB_KEY         = "training_db_v1";
const ROUTINES_KEY   = "training_routines_v1";
const REST_KEY       = "training_rest_v1";
const SYNC_KEY_LOCAL = "training_sync_key";
const BACKUP_KEY     = "training_v5_backup";

// Bewaar de ruwe inhoud vóór elke stap die hem kan vervangen: een sync die
// overschrijft, of een reparatie die op week 1 terugvalt. Zonder dit is een
// kapot gelezen weekplan onherroepelijk weg.
function backupWeeks(reason){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw || raw==="[]" || raw==="null") return;
    const prev = localStorage.getItem(BACKUP_KEY);
    if(prev && JSON.parse(prev).raw === raw) return;   // niets nieuws te bewaren
    localStorage.setItem(BACKUP_KEY, JSON.stringify({at:new Date().toISOString(), reason, raw}));
  }catch{}
}
function readBackup(){
  try{
    const b = localStorage.getItem(BACKUP_KEY);
    if(!b) return null;
    const {at, reason, raw} = JSON.parse(b);
    const weeks = migrateWeeks(JSON.parse(raw));
    return {at, reason, weeks};
  }catch{ return null; }
}

const DEFAULT_REST = { side:30, set:60, ex:90 };
function loadRest(){
  try{ const r=localStorage.getItem(REST_KEY); return r?{...DEFAULT_REST,...JSON.parse(r)}:DEFAULT_REST; }
  catch{ return DEFAULT_REST; }
}
function saveRest(d){ try{ localStorage.setItem(REST_KEY,JSON.stringify(d)); }catch{} }

function getSyncKey(){
  let k = localStorage.getItem(SYNC_KEY_LOCAL);
  if(!k){ k = crypto.randomUUID(); localStorage.setItem(SYNC_KEY_LOCAL,k); }
  return k;
}

let lastLocalSaveMs = 0;

function pushToSupabase(patch){
  lastLocalSaveMs = Date.now();
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
    if(data.weeks)       { backupWeeks("sync-overschrijft"); localStorage.setItem(STORAGE_KEY,  JSON.stringify(data.weeks)); }
    if(data.exercise_db) localStorage.setItem(DB_KEY,       JSON.stringify(data.exercise_db));
    if(data.routines)    localStorage.setItem(ROUTINES_KEY, JSON.stringify(data.routines));
    if(data.reps)        localStorage.setItem(REPS_STORAGE_KEY, JSON.stringify(data.reps));
    if(data.mobility)    localStorage.setItem(MOBILITY_STORAGE_KEY, JSON.stringify(data.mobility));
  } else {
    // No remote row yet → upload whatever is in localStorage
    const w=localStorage.getItem(STORAGE_KEY);
    const d=localStorage.getItem(DB_KEY);
    const r=localStorage.getItem(ROUTINES_KEY);
    const rp=localStorage.getItem(REPS_STORAGE_KEY);
    const mb=localStorage.getItem(MOBILITY_STORAGE_KEY);
    supabase.from('trainingsplan').upsert({
      sync_key:key,
      weeks:      w?JSON.parse(w):[],
      exercise_db:d?JSON.parse(d):DEFAULT_DB,
      routines:   r?JSON.parse(r):[],
      reps:       rp?JSON.parse(rp):null,
      mobility:   mb?JSON.parse(mb):null,
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
  morning:null, morningDone:false,   // "reps" | "mobility" | "ssmobility"
  evening:null, eveningDone:false,   // "kracht" | "conditioning" | "rope" | "hardlopen" | "zwemmen"
  note:"",
});
const mkWeek = (n) => ({
  weekNum:n, days:Object.fromEntries(DAYS.map(d=>[d,mkDay()])),
  note:"", done:false,
});

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
  if(!Array.isArray(data)) return [mkWeek(1)];
  const out = data.filter(w=>w&&typeof w==="object").map(week=>({
    ...week,
    weekNum: Number.isFinite(week.weekNum) ? week.weekNum : 1,
    // Altijd alle zeven dagen, en elke dag met alle velden: een ontbrekende
    // dag of een ontbrekend veld liet het renderen eerder klappen.
    days:Object.fromEntries(DAYS.map(k=>{
      const src = (week.days&&typeof week.days==="object"&&week.days[k]) || {};
      // Oudere dagen hadden oefenlijsten, routines en een stemming. Die
      // velden blijven staan in de opslag maar worden nergens meer gelezen;
      // alleen de nieuwe keuzevelden worden afgedwongen.
      return [k,{
        ...mkDay(),
        ...src,
        morning:     typeof src.morning==="string" ? src.morning : null,
        evening:     typeof src.evening==="string" ? src.evening : null,
        morningDone: !!src.morningDone,
        eveningDone: !!src.eveningDone,
        note:        typeof src.note==="string" ? src.note : "",
      }];
    }))
  }));
  // Een lege lijst is truthy en glipte door de laadcheck heen; dan viel er
  // niets te tonen en klapte het renderen eruit, ook na herladen.
  return out.length ? out : [mkWeek(1)];
}
async function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return [mkWeek(1)];
  try{
    const parsed = JSON.parse(raw);
    const weeks  = migrateWeeks(parsed);
    // Viel de reparatie terug op een lege week? Dan was er iets mis met de
    // opgeslagen inhoud: eerst veiligstellen, dan pas verder.
    const leeg = !Array.isArray(parsed) || parsed.filter(w=>w&&typeof w==="object").length===0;
    if(leeg) backupWeeks("reparatie-terugval");
    return weeks;
  }catch{
    backupWeeks("onleesbaar");
    return [mkWeek(1)];
  }
}
async function saveData(d){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); }catch{} pushToSupabase({weeks:d}); }
async function loadDb(){ try{ const r=localStorage.getItem(DB_KEY); return r?JSON.parse(r):DEFAULT_DB; }catch{ return DEFAULT_DB; } }
async function saveDb(d){ try{ localStorage.setItem(DB_KEY,JSON.stringify(d)); }catch{} pushToSupabase({exercise_db:d}); }
async function loadRoutines(){ try{ const r=localStorage.getItem(ROUTINES_KEY); return r?JSON.parse(r):[]; }catch{ return []; } }
async function saveRoutines(d){ try{ localStorage.setItem(ROUTINES_KEY,JSON.stringify(d)); }catch{} pushToSupabase({routines:d}); }
function mkId(){ return Math.random().toString(36).slice(2,8); }

// Welke dag van de week is het nu; JS telt zondag als 0.
const TODAY_KEY = DAYS[(new Date().getDay() + 6) % 7];
const ISO_TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
// Heb je de sessie van vandaag in die app al afgerond? Beide apps slaan de
// datum van hun laatste afgeronde dag op.
function readAppDone(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return false;
    return JSON.parse(raw).lastCompletedDate === ISO_TODAY();
  }catch{ return false; }
}


// Video-ID uit een YouTube-URL (watch, youtu.be, embed of shorts) voor de thumbnail.
function ytId(url){
  if(!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m?m[1]:null;
}

// Design tokens staan in tokens.js, gedeeld met RepsTab.jsx.

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Tag = ({color,bg,children}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:bg,color,whiteSpace:"nowrap"}}>{children}</span>
);

const DoneToggle = ({done,color,bg,onClick}) => (
  <button onClick={onClick} style={{
    display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,
    border:`1.5px solid ${done?color:C.border}`,
    background:done?bg:"transparent",
    color:done?color:C.textMuted,
    fontFamily:font,fontSize:11,fontWeight:done?700:500,
    cursor:"pointer",transition:"all .15s",flexShrink:0,
  }}>
    <span style={{fontSize:12,lineHeight:1}}>{done?"✓":"○"}</span>
    {done?"Gedaan":"Afvinken"}
  </button>
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
    primary:  {background:C.purple,color:"#0A0A0A",border:"none"},
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
    <Sheet title="Kies oefening" onClose={onClose} zIndex={Z_PICKER}
      headerExtra={
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Zoeken…" autoFocus
          style={inp({fontSize:14,padding:"9px 12px"})} />
      }>
      <>
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
      </>
    </Sheet>
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
// Gecentreerde modal — één plek voor alle dialogen in de app.
// `zIndex` stapelt: een modal die vanuit een andere wordt geopend moet hoger.
const Z_SHEET = 1000, Z_PICKER = 1200;

function Sheet({title,accent,onClose,children,zIndex=Z_SHEET,headerExtra}) {
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, width:"100%", maxWidth:560, maxHeight:"85vh",
        borderRadius:16, display:"flex", flexDirection:"column",
        boxShadow:C.shadowLg, overflow:"hidden",
      }}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <span style={{fontSize:16,fontWeight:700,color:accent||C.text}}>{title}</span>
            <button onClick={onClose} style={{background:C.surfaceAlt,border:"none",borderRadius:20,width:28,height:28,cursor:"pointer",fontSize:16,color:C.textMuted,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
          </div>
          {headerExtra&&<div style={{marginTop:10}}>{headerExtra}</div>}
        </div>
        <div style={{overflowY:"auto",padding:"14px 16px 18px",WebkitOverflowScrolling:"touch"}}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Videokaartje met thumbnail; valt terug op een ▶-vlak als de URL geen
// YouTube-video is of de afbeelding niet laadt.
function VideoLink({url,title}) {
  const id = ytId(url);
  const [failed,setFailed] = useState(false);
  useEffect(()=>{ setFailed(false); },[id]);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display:"flex",alignItems:"center",gap:10,textDecoration:"none",
      background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:8,
    }}>
      {id&&!failed?(
        <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt=""
          onError={()=>setFailed(true)}
          style={{width:80,height:45,objectFit:"cover",borderRadius:6,flexShrink:0,background:C.surfaceAlt}} />
      ):(
        <div style={{width:80,height:45,borderRadius:6,flexShrink:0,background:C.surfaceAlt,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:C.textMuted}}>▶</div>
      )}
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:13,fontWeight:600,color:C.text,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title||"Video"}</span>
        <span style={{display:"block",fontSize:11,color:C.green,marginTop:2,fontWeight:500}}>↗ Open op YouTube</span>
      </span>
    </a>
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
      if(data.reps)        localStorage.setItem(REPS_STORAGE_KEY, JSON.stringify(data.reps));
      if(data.mobility)    localStorage.setItem(MOBILITY_STORAGE_KEY, JSON.stringify(data.mobility));
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

        {/* Steps */}
        <div style={{background:C.surfaceAlt,borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,color:C.textMuted,lineHeight:1.6}}>
          <strong style={{color:C.text,display:"block",marginBottom:4}}>Zo koppel je twee apparaten:</strong>
          <div>1. Kopieer jouw sync code hieronder (op dit apparaat).</div>
          <div>2. Open de app op het andere apparaat, tik op ⇄ en plak de code.</div>
          <div>3. Bevestig — daarna deelt alles dezelfde data.</div>
          <div style={{marginTop:6,borderTop:`1px solid ${C.border}`,paddingTop:6}}>Wijzigingen zijn meteen zichtbaar zodra je terugkeert naar de tab.</div>
        </div>

        {/* Current key */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Jouw sync code (kopieer dit)</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{
              flex:1,fontFamily:mono,fontSize:13,color:C.text,
              background:C.surface,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"10px 12px",wordBreak:"break-all",letterSpacing:0.5,
            }}>{syncKey}</div>
            <button onClick={copy} style={{
              background:copied?C.greenLight:C.purpleLight,color:copied?C.green:C.purple,
              border:"none",borderRadius:8,padding:"10px 14px",fontFamily:font,
              fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0,transition:"all .2s",
            }}>{copied?"✓ Gekopieerd":"Kopieer"}</button>
          </div>
        </div>

        {/* Switch key */}
        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Code van ander apparaat invoeren</div>
          <input value={input} onChange={e=>{setInput(e.target.value);setPhase("idle");}}
            placeholder="Plak hier de sync code van het andere apparaat"
            style={inp({fontSize:13,marginBottom:8})} />
          {phase==="error"&&<div style={{fontSize:12,color:C.red,marginBottom:8}}>Code niet gevonden. Controleer of je de juiste code hebt ingevoerd.</div>}
          {phase==="confirm"&&<div style={{fontSize:12,color:C.amber,marginBottom:8}}>Je huidige data op dit apparaat wordt vervangen. Klik nogmaals om te bevestigen.</div>}
          <Btn
            onClick={handleSwitch}
            variant={phase==="confirm"?"amber":input.trim()&&input.trim()!==syncKey?"primary":"subtle"}
            size="sm"
          >
            {phase==="loading"?"Laden…":phase==="confirm"?"Bevestigen – data overnemen":"Code instellen en data laden"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE ROW ─────────────────────────────────────────────────────────────
function ExRow({ex,onUpdate,onDelete,db,onSaveToDb,setsPlaceholder="3×5",setsEditor=false}) {
  const [showSets,setShowSets] = useState(false);
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
        {setsEditor?(
          <button onClick={()=>setShowSets(p=>!p)} style={{
            flexShrink:0,minWidth:52,height:36,padding:"0 9px",borderRadius:8,cursor:"pointer",
            fontFamily:mono,fontSize:13,fontWeight:ex.sets?700:400,whiteSpace:"nowrap",
            border:`1px solid ${showSets?C.purple:(ex.sets?C.borderMid:C.border)}`,
            background:showSets?C.purpleLight:C.surfaceAlt,
            color:showSets?C.purple:(ex.sets?C.text:C.textMuted),
            transition:"all .15s",
          }}>{ex.sets||setsPlaceholder}</button>
        ):ex.sets?(
          <span style={{fontSize:12,color:C.textSub,flexShrink:0,fontFamily:mono,
            background:C.surfaceAlt,border:`1px solid ${C.border}`,
            borderRadius:5,padding:"3px 7px",whiteSpace:"nowrap"}}>
            {ex.sets}
          </span>
        ):null}
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
      {setsEditor&&showSets&&(
        <div style={{marginTop:6,padding:"10px 12px",background:C.purpleLight,borderRadius:10}}>
          <SetsEditor value={ex.sets} onChange={v=>onUpdate({...ex,sets:v})} />
        </div>
      )}
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

// ─── SETS PARSER ──────────────────────────────────────────────────────────────
function parseSets(str) {
  if (!str || !str.trim()) return { numSets:1, value:null, isTime:false, perSide:false };
  const perSide = /e\/s|\s+e\s*$|per\s*(kant|zijde)/i.test(str);
  const s = str.replace(/e\/s|\s+e\s*$|per\s*(kant|zijde)/gi,'').trim();
  let m;
  if ((m=s.match(/^(\d+)\s*[×xX]\s*(\d+)\s*s$/i))) return {numSets:+m[1],value:+m[2],isTime:true, perSide};
  if ((m=s.match(/^(\d+)\s*s$/i)))                  return {numSets:1,    value:+m[1],isTime:true, perSide};
  if ((m=s.match(/^(\d+)\s*[×xX]\s*(\d+)$/)))      return {numSets:+m[1],value:+m[2],isTime:false,perSide};
  if ((m=s.match(/^(\d+)$/)))                       return {numSets:1,    value:+m[1],isTime:false,perSide};
  return {numSets:1,value:null,isTime:false,perSide};
}

// ─── SETS EDITOR ──────────────────────────────────────────────────────────────
function SetsEditor({value,onChange}) {
  const parse = str => {
    const p = parseSets(str||"");
    return {s:p.numSets||1, v:p.value!=null?p.value:10, t:!!p.isTime, p:!!p.perSide};
  };
  const fmt = ({s,v,t,p}) => {
    let str = s>1?`${s}×${v}`:`${v}`;
    if(t) str += " s";
    if(p) str += " e/s";
    return str;
  };
  const [st,setSt] = useState(()=>parse(value));
  useEffect(()=>{
    const next=parse(value);
    setSt(prev=>
      prev.s===next.s&&prev.v===next.v&&prev.t===next.t&&prev.p===next.p?prev:next
    );
  },[value]);

  const emit = ns => { setSt(ns); onChange(fmt(ns)); };
  const step = st.t?5:1, minV = st.t?5:1;

  const pbS = {
    width:28,height:28,borderRadius:6,border:`1px solid ${C.border}`,
    background:C.surfaceAlt,color:C.text,cursor:"pointer",fontSize:14,
    display:"flex",alignItems:"center",justifyContent:"center",fontFamily:font,lineHeight:1,flexShrink:0,
  };
  const chipS = active => ({
    height:28,borderRadius:6,padding:"0 9px",
    border:`1px solid ${active?C.purple:C.border}`,
    background:active?C.purpleLight:C.surfaceAlt,
    color:active?C.purple:C.textMuted,
    cursor:"pointer",fontSize:12,fontWeight:active?700:400,
    fontFamily:font,display:"flex",alignItems:"center",flexShrink:0,
  });

  return (
    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",paddingTop:5}}>
      <span style={{fontSize:11,color:C.textMuted,flexShrink:0,minWidth:28}}>Sets</span>
      <button style={pbS} onClick={()=>emit({...st,s:Math.max(1,st.s-1)})}>−</button>
      <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:14,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{st.s}</span>
      <button style={pbS} onClick={()=>emit({...st,s:Math.min(10,st.s+1)})}>+</button>
      <span style={{fontSize:11,color:C.textMuted,margin:"0 2px"}}>×</span>
      <button style={pbS} onClick={()=>emit({...st,v:Math.max(minV,st.v-step)})}>−</button>
      <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:28,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{st.v}</span>
      <button style={pbS} onClick={()=>emit({...st,v:st.v+step})}>+</button>
      <button style={chipS(st.t)} onClick={()=>{
        const t=!st.t; const v=t?Math.max(5,Math.round(st.v/5)*5||30):st.v;
        emit({...st,t,v});
      }}>{st.t?"sec.":"herh."}</button>
      <button style={chipS(st.p)} onClick={()=>emit({...st,p:!st.p})}>e/s</button>
    </div>
  );
}

// ─── WORKOUT MODE ─────────────────────────────────────────────────────────────
// Rusttijden instellen vóór de workout begint.
function WorkoutStartModal({exercises,onStart,onClose}) {
  const [rest,setRest] = useState(loadRest);
  const valid = exercises.filter(e=>e.name&&e.name.trim());
  const anyPerSide = valid.some(e=>parseSets(e.sets).perSide);

  const rows = [
    {key:"set",  label:"Tussen sets",        hint:"Rust na elke set van dezelfde oefening"},
    {key:"ex",   label:"Tussen oefeningen",  hint:"Rust voor je aan de volgende oefening begint"},
    ...(anyPerSide?[{key:"side", label:"Kant-wissel", hint:"Korte rust bij oefeningen per kant (e/s)"}]:[]),
  ];

  const go = () => { saveRest(rest); onStart(rest); };

  return (
    <Sheet title="Workout starten" accent={C.purple} onClose={onClose}>
      <div style={{fontSize:13,color:C.textMuted,marginBottom:16}}>
        {valid.length} {valid.length===1?"oefening":"oefeningen"} · rusttijden worden onthouden
      </div>
      {rows.map(({key,label,hint})=>(
        <div key={key} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <span style={{fontSize:14,fontWeight:600,color:C.text}}>{label}</span>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <button onClick={()=>setRest(r=>({...r,[key]:Math.max(0,r[key]-5)}))} style={{
                width:34,height:34,borderRadius:9,border:`1px solid ${C.border}`,background:C.surfaceAlt,
                color:C.text,cursor:"pointer",fontSize:17,fontFamily:font,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>−</button>
              <span style={{fontSize:16,fontWeight:700,color:C.text,minWidth:48,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{rest[key]}s</span>
              <button onClick={()=>setRest(r=>({...r,[key]:r[key]+5}))} style={{
                width:34,height:34,borderRadius:9,border:`1px solid ${C.border}`,background:C.surfaceAlt,
                color:C.text,cursor:"pointer",fontSize:17,fontFamily:font,fontWeight:700,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>+</button>
            </div>
          </div>
          <div style={{fontSize:11,color:C.textMuted,marginTop:3}}>{hint}</div>
        </div>
      ))}
      <div style={{marginTop:20}}>
        <Btn onClick={go} variant="primary" full size="lg">▶ Start workout</Btn>
      </div>
    </Sheet>
  );
}

function WorkoutMode({exercises, onClose, initialRest}) {
  const validExs = exercises.filter(e=>e.name&&e.name.trim());

  const buildStep = (eIdx, sIdx, siIdx) => {
    const ex = validExs[eIdx];
    const p  = ex ? parseSets(ex.sets) : {numSets:1,value:null,isTime:false,perSide:false};
    return {eIdx, sIdx, siIdx, p, timeLeft: p.isTime ? p.value : null, running: p.isTime};
  };

  const [cur,      setCur]      = useState(() => buildStep(0,0,0));
  const [phase,    setPhase]    = useState('exercise');
  const [restSec,  setRestSec]  = useState(60);
  const [speechOn, setSpeechOn] = useState(true);
  const [showRestCfg, setShowRestCfg] = useState(false);
  const [restDef,  setRestDef]  = useState(()=>initialRest||loadRest());

  const nextRef     = useRef(null);
  const speechOnRef = useRef(true);
  const restDefRef  = useRef(restDef);
  useEffect(() => { restDefRef.current = restDef; saveRest(restDef); }, [restDef]);
  const sides        = ['Links','Rechts'];
  const ex           = validExs[cur.eIdx];
  const sideLabel    = cur.p.perSide ? sides[cur.siIdx] : null;

  useEffect(() => { speechOnRef.current = speechOn; }, [speechOn]);

  // ── speech ────────────────────────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!speechOnRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL'; u.rate = 1.1;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    if (phase === 'exercise' && ex)
      speak(cur.p.perSide ? `${ex.name} — ${sides[cur.siIdx]}` : ex.name);
  }, [phase, cur.eIdx, cur.siIdx]);

  useEffect(() => { if (phase === 'rest') speak('Rust'); }, [phase]);

  useEffect(() => {
    if (phase !== 'rest') return;
    if (restSec === 3) speak('3');
    else if (restSec === 2) speak('2');
    else if (restSec === 1) speak('1');
    else if (restSec === 0) speak('Begin!');
  }, [restSec, phase]);


  // ── advance / skipRest ────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setCur(prev => {
      const p = prev.p;
      const totalSides = p.perSide ? 2 : 1;
      if (prev.siIdx + 1 < totalSides) {
        nextRef.current = {eIdx: prev.eIdx, sIdx: prev.sIdx, siIdx: prev.siIdx+1};
        setPhase('rest'); setRestSec(restDefRef.current.side);
        return {...prev, running:false};
      }
      const nextSIdx = prev.sIdx + 1;
      if (nextSIdx < p.numSets) {
        nextRef.current = {eIdx: prev.eIdx, sIdx: nextSIdx, siIdx:0};
        setPhase('rest'); setRestSec(restDefRef.current.set);
        return {...prev, running:false};
      }
      const nextEIdx = prev.eIdx + 1;
      if (nextEIdx < validExs.length) {
        nextRef.current = {eIdx: nextEIdx, sIdx:0, siIdx:0};
        setPhase('rest'); setRestSec(restDefRef.current.ex);
        return {...prev, running:false};
      }
      setPhase('done');
      return {...prev, running:false};
    });
  }, [validExs.length]);

  const skipRest = useCallback(() => {
    const n = nextRef.current;
    if (!n) return;
    setCur(buildStep(n.eIdx, n.sIdx, n.siIdx??0));
    setPhase('exercise');
  }, []);

  // ── timers ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'exercise' || !cur.running || cur.timeLeft === null) return;
    const id = setInterval(() => setCur(prev => {
      if (!prev.running || prev.timeLeft === null) return prev;
      if (prev.timeLeft <= 1) return {...prev, running:false, timeLeft:0};
      return {...prev, timeLeft: prev.timeLeft-1};
    }), 1000);
    return () => clearInterval(id);
  }, [phase, cur.running, cur.eIdx, cur.sIdx, cur.siIdx]);

  useEffect(() => {
    if (phase === 'exercise' && cur.timeLeft === 0 && !cur.running && cur.p.isTime) advance();
  }, [cur.timeLeft, cur.running, phase]);

  useEffect(() => {
    if (phase !== 'rest') return;
    const id = setInterval(() => setRestSec(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => { if (phase === 'rest' && restSec === 0) skipRest(); }, [restSec, phase]);

  if (!validExs.length) return null;

  // ── derived ───────────────────────────────────────────────────────────────
  const totalSets    = cur.p.numSets;
  const setLabel     = totalSets > 1 ? `Set ${cur.sIdx+1} van ${totalSets}` : null;
  const exLabel      = `${cur.eIdx+1} / ${validExs.length}`;
  const pct          = ((cur.eIdx*100)/validExs.length) + ((cur.sIdx*100)/(validExs.length*totalSets));
  const progress     = Math.min(100, pct);
  const nextStep     = nextRef.current;
  const nextEx       = nextStep ? validExs[nextStep.eIdx] : null;
  const isSideSwitch = nextStep && nextStep.eIdx===cur.eIdx && nextStep.sIdx===cur.sIdx;
  const isNewEx      = nextStep && nextStep.eIdx!==cur.eIdx;
  const nextSide     = isSideSwitch ? sides[nextStep.siIdx] : null;

  return (
    <div style={{
      position:"fixed",inset:0,background:"#0f0f13",zIndex:3000,
      display:"flex",flexDirection:"column",fontFamily:font,
      WebkitUserSelect:"none",userSelect:"none",
    }}>
      {/* progress bar */}
      <div style={{height:3,background:"#1e1e2a",flexShrink:0}}>
        <div style={{height:"100%",background:C.purple,width:`${progress}%`,transition:"width .4s"}} />
      </div>

      {/* header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",flexShrink:0}}>
        <div style={{fontSize:13,color:"#888",fontWeight:500}}>
          {phase==='done'?'Klaar':`Oefening ${exLabel}`}{setLabel&&phase==='exercise'&&` · ${setLabel}`}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setSpeechOn(s=>!s)} style={{
            background:"#1e1e2a",border:"none",borderRadius:20,width:32,height:32,
            cursor:"pointer",fontSize:16,color:speechOn?C.purple:"#444",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>{speechOn?"🔊":"🔇"}</button>
          <button onClick={()=>setShowRestCfg(s=>!s)} style={{
            background:showRestCfg?"#2a2a3a":"#1e1e2a",border:"none",borderRadius:20,width:32,height:32,
            cursor:"pointer",fontSize:15,color:showRestCfg?C.purple:"#666",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>⏱</button>
          <button onClick={onClose} style={{
            background:"#1e1e2a",border:"none",borderRadius:20,width:32,height:32,
            cursor:"pointer",fontSize:18,color:"#888",display:"flex",alignItems:"center",justifyContent:"center",
          }}>×</button>
        </div>
      </div>

      {/* rust-instellingen */}
      {showRestCfg&&(
        <div style={{background:"#16161f",borderBottom:"1px solid #2a2a2a",padding:"12px 20px",flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Rusttijd instellen</div>
          {[
            {label:"Kant-wissel",key:"side"},
            {label:"Volgende set",key:"set"},
            {label:"Volgende oefening",key:"ex"},
          ].map(({label,key})=>(
            <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:13,color:"#aaa",minWidth:140}}>{label}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>setRestDef(d=>({...d,[key]:Math.max(5,d[key]-5)}))} style={{
                  background:"#1e1e2a",color:"#aaa",border:"1px solid #333",borderRadius:8,
                  width:30,height:30,fontSize:16,cursor:"pointer",fontFamily:font,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
                }}>−</button>
                <span style={{fontSize:15,fontWeight:700,color:"#fff",minWidth:36,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{restDef[key]}s</span>
                <button onClick={()=>setRestDef(d=>({...d,[key]:d[key]+5}))} style={{
                  background:"#1e1e2a",color:"#aaa",border:"1px solid #333",borderRadius:8,
                  width:30,height:30,fontSize:16,cursor:"pointer",fontFamily:font,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
                }}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 24px",textAlign:"center"}}>

        {phase==='done' ? (
          <>
            <div style={{fontSize:56,marginBottom:16}}>🎉</div>
            <div style={{fontSize:24,fontWeight:700,color:"#fff",marginBottom:8}}>Workout klaar!</div>
            <div style={{fontSize:14,color:"#888",marginBottom:40}}>{validExs.length} oefeningen afgerond</div>
            <button onClick={onClose} style={{
              background:C.purple,color:"#0A0A0A",border:"none",borderRadius:14,
              padding:"16px 40px",fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:font,
            }}>Afsluiten</button>
          </>

        ) : phase==='rest' ? (
          <>
            <div style={{fontSize:13,fontWeight:600,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:16}}>
              {nextSide ? 'Wissel kant' : isNewEx ? 'Volgende oefening' : 'Rust'}
            </div>
            {nextSide ? (
              <div style={{fontSize:28,fontWeight:800,color:"#fff",marginBottom:20}}>
                → {nextSide}e kant
              </div>
            ) : nextEx && isNewEx ? (
              <div style={{fontSize:15,color:"#aaa",marginBottom:20}}>
                Daarna: <span style={{color:"#fff",fontWeight:600}}>{nextEx.name}</span>
              </div>
            ) : null}
            <div style={{
              fontSize:88,fontWeight:800,lineHeight:1,marginBottom:20,
              fontVariantNumeric:"tabular-nums",
              color: restSec>5?"#fff":C.red,
            }}>{restSec}</div>
            <div style={{display:"flex",gap:12,marginBottom:24}}>
              <button onClick={()=>setRestSec(s=>Math.max(5,s-10))} style={{
                background:"#1e1e2a",color:"#aaa",border:"1px solid #333",borderRadius:10,
                padding:"8px 20px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:font,
              }}>−10s</button>
              <button onClick={()=>setRestSec(s=>s+10)} style={{
                background:"#1e1e2a",color:"#aaa",border:"1px solid #333",borderRadius:10,
                padding:"8px 20px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:font,
              }}>+10s</button>
            </div>
            <button onClick={skipRest} style={{
              background:"#1e1e2a",color:"#aaa",border:"1px solid #333",borderRadius:12,
              padding:"12px 28px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:font,
            }}>Overslaan →</button>
          </>

        ) : (
          <>
            {sideLabel&&(
              <div style={{fontSize:13,fontWeight:600,color:C.purple,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
                {sideLabel}e kant
              </div>
            )}
            <div style={{fontSize:26,fontWeight:700,color:"#fff",marginBottom:24,lineHeight:1.3}}>
              {ex?.name}
            </div>

            {cur.p.isTime ? (
              /* timed exercise */
              <div style={{marginBottom:36}}>
                <div style={{
                  fontSize:100,fontWeight:800,lineHeight:1,fontVariantNumeric:"tabular-nums",transition:"color .3s",
                  color: cur.timeLeft!==null&&cur.timeLeft<=5 ? C.red : "#fff",
                }}>{cur.timeLeft??cur.p.value}</div>
                <div style={{fontSize:14,color:"#666",marginTop:8}}>seconden</div>
                <button onClick={()=>setCur(p=>({...p,running:!p.running}))} style={{
                  marginTop:20,background:"#1e1e2a",color:cur.running?"#aaa":C.purple,
                  border:"1px solid #333",borderRadius:12,padding:"10px 24px",
                  fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:font,
                }}>{cur.running?'⏸ Pauzeer':'▶ Start'}</button>
              </div>

            ) : cur.p.value !== null ? (
              /* rep exercise — toon doel, gebruiker klikt zelf door */
              <div style={{marginBottom:36}}>
                <div style={{
                  fontSize:100,fontWeight:800,lineHeight:1,fontVariantNumeric:"tabular-nums",
                  color:"#fff",
                }}>{cur.p.value}</div>
                <div style={{fontSize:14,color:"#666",marginTop:8}}>herhalingen</div>
              </div>

            ) : ex?.sets ? (
              <div style={{fontSize:18,color:"#aaa",marginBottom:36,background:"#1e1e2a",padding:"12px 20px",borderRadius:10}}>
                {ex.sets}
              </div>
            ) : null}

            <button onClick={advance} style={{
              background:C.purple,color:"#0A0A0A",border:"none",borderRadius:16,
              padding:"18px 48px",fontSize:18,fontWeight:700,cursor:"pointer",fontFamily:font,
              boxShadow:"0 4px 20px "+C.purple+"55",marginTop:8,
            }}>
              {cur.p.perSide&&cur.siIdx===0?`Wissel → Rechterkant`:
               cur.sIdx+1<cur.p.numSets?`Set ${cur.sIdx+2} →`:
               cur.eIdx+1<validExs.length?`Volgende oefening →`:`Klaar 🎉`}
            </button>
          </>
        )}
      </div>

      {/* exercise pills */}
      {phase==='exercise'&&(
        <div style={{padding:"12px 20px 28px",display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",flexShrink:0}}>
          {validExs.map((e,i)=>(
            <div key={i} style={{
              fontSize:11,padding:"3px 10px",borderRadius:20,
              background:i<cur.eIdx?"#1e1e2a":i===cur.eIdx?C.purple+"33":"#1e1e2a",
              color:i<cur.eIdx?"#444":i===cur.eIdx?C.purple:"#555",
              border:i===cur.eIdx?`1px solid ${C.purple}33`:"1px solid transparent",
              fontWeight:i===cur.eIdx?600:400,
            }}>{e.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}



// ─── DAGKAART ─────────────────────────────────────────────────────────────────
// Per dag kies je één ochtend- en één avondonderdeel uit een vaste lijst.
// Reps en Mobiliteit zijn eigen apps; de dagkaart verwijst ernaar en vinkt
// vanzelf af zodra je die dag daar hebt afgerond.

const MORNING_OPTS = [
  { id:"reps",       label:"Reps",                  icon:"🔁", tab:"reps", desc:"De sessie van vandaag in de Reps-app" },
  { id:"mobility",   label:"Mobiliteit",            icon:"🧘", tab:"mob",  desc:"De sessie van vandaag in de Mobiliteit-app" },
  { id:"ssmobility", label:"Strength Side mobility",icon:"▶️", tab:null,   desc:"Je eigen follow-along mobiliteitsroutine" },
];
const EVENING_OPTS = [
  { id:"kracht",       label:"Kracht",       icon:"🏋️" },
  { id:"conditioning", label:"Conditioning", icon:"🔥" },
  { id:"rope",         label:"Rope",         icon:"🪢" },
  { id:"hardlopen",    label:"Hardlopen",    icon:"🏃" },
  { id:"zwemmen",      label:"Zwemmen",      icon:"🏊" },
];
const optById = (opts,id) => opts.find(o=>o.id===id) || null;

// Eén rij keuzeknoppen; nog een keer tikken op wat al aan staat zet hem uit.
function OptionPicker({opts,value,onPick,color,bg}) {
  return (
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {opts.map(o=>{
        const on = value===o.id;
        return (
          <button key={o.id} onClick={()=>onPick(on?null:o.id)} style={{
            display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:font,
            fontSize:13,fontWeight:on?600:400,padding:"9px 12px",borderRadius:9,
            background:on?bg:C.surfaceAlt,
            border:`1px solid ${on?color:C.border}`,
            color:on?color:C.textSub,
          }}>
            <span style={{fontSize:14}}>{o.icon}</span>{o.label}
          </button>
        );
      })}
    </div>
  );
}

function DayCard({dayKey,day,onChange,onOpenTab,autoDone}) {
  const [open,setOpen] = useState(false);
  const upd = (patch) => onChange({...day,...patch});

  const morning = optById(MORNING_OPTS, day.morning);
  const evening = optById(EVENING_OPTS, day.evening);
  // Afgerond in de Reps- of Mobiliteit-app telt als gedaan, zonder dat je het
  // hier nog eens hoeft aan te vinken.
  const morningAuto = !!(morning && morning.tab && autoDone && autoDone[morning.id]);
  const morningDone = !!day.morningDone || morningAuto;
  const eveningDone = !!day.eveningDone;
  const hasNote = day.note && day.note.trim();

  const chip = (opt,done,color,bg) => opt && (
    <span style={{fontSize:11,color,background:bg,padding:"2px 7px",borderRadius:5,fontWeight:done?700:400}}>
      {done?"✓":opt.icon} {opt.label}
    </span>
  );

  const blok = (titel,kleur,bg,opts,value,doneVal,autoVal,onPick,onToggle) => (
    <div style={{padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:9}}>
        <div style={{fontSize:11,fontWeight:700,color:kleur,textTransform:"uppercase",letterSpacing:0.5}}>{titel}</div>
        {value&&(
          autoVal
            ? <span style={{fontSize:11,color:C.green,fontWeight:600}}>✓ afgerond in de app</span>
            : <DoneToggle done={doneVal} color={kleur} bg={bg} onClick={onToggle} />
        )}
      </div>
      <OptionPicker opts={opts} value={value} onPick={onPick} color={kleur} bg={bg} />
    </div>
  );

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:C.shadow}}>
      <button onClick={()=>setOpen(p=>!p)} style={{
        display:"flex",alignItems:"center",gap:12,padding:"13px 14px",
        width:"100%",background:"none",border:"none",cursor:"pointer",fontFamily:font,textAlign:"left",
      }}>
        <div style={{width:40,height:40,borderRadius:10,background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase"}}>{DAY_SHORT[dayKey]}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:600,color:C.text}}>{DAY_LABELS[dayKey]}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
            {chip(morning,morningDone,C.amber,C.amberLight)}
            {chip(evening,eveningDone,C.purple,C.purpleLight)}
            {!morning&&!evening&&<span style={{fontSize:12,color:C.textMuted}}>Niets ingepland</span>}
            {hasNote&&<span style={{fontSize:11,color:C.textMuted}}>📝</span>}
          </div>
        </div>
        <span style={{fontSize:16,color:C.textMuted,flexShrink:0,transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)"}}>⌄</span>
      </button>

      {open&&(
        <div style={{borderTop:`1px solid ${C.border}`}}>
          {blok("☀️ Ochtend",C.amber,C.amberLight,MORNING_OPTS,day.morning,morningDone,morningAuto,
            v=>upd({morning:v}), ()=>upd({morningDone:!day.morningDone}))}

          {/* Doorklikken naar de app waar deze sessie in staat. */}
          {morning&&morning.tab&&(
            <div style={{padding:"0 14px 12px"}}>
              <Btn onClick={()=>onOpenTab&&onOpenTab(morning.tab)} variant="subtle" size="sm">
                {morning.label} openen ›
              </Btn>
            </div>
          )}

          <div style={{height:1,background:C.border,margin:"0 14px"}} />
          {blok("🌙 Avond",C.purple,C.purpleLight,EVENING_OPTS,day.evening,eveningDone,false,
            v=>upd({evening:v}), ()=>upd({eveningDone:!day.eveningDone}))}

          <div style={{padding:"0 14px 14px"}}>
            <textarea value={day.note||""} onChange={e=>upd({note:e.target.value})}
              placeholder="📝 Optionele notitie…" rows={2}
              style={inp({resize:"vertical",fontSize:13,lineHeight:1.5})} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WEEK EVAL ────────────────────────────────────────────────────────────────
function WeekEval({week,onSave,extraDone=0}) {
  const [note,setNote] = useState(week.note||"");

  // Wat er deze week daadwerkelijk is afgevinkt.
  // extraDone is wat vandaag in de Reps- of Mobiliteit-app is afgerond en
  // daarom vanzelf afgevinkt staat, zonder dat het in de dag is opgeslagen.
  const gedaan = DAYS.reduce((n,d)=>{
    const x = week.days[d]||{};
    return n + (x.morningDone?1:0) + (x.eveningDone?1:0);
  },0) + extraDone;
  const gepland = DAYS.reduce((n,d)=>{
    const x = week.days[d]||{};
    return n + (x.morning?1:0) + (x.evening?1:0);
  },0);

  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginTop:16,boxShadow:C.shadowLg}}>
      <div style={{padding:"14px 16px",background:C.purpleLight,borderBottom:`1px solid ${C.purpleMid}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.purple}}>Week {week.weekNum} afsluiten</div>
        <div style={{fontSize:13,color:C.purple+"99",marginTop:2}}>Leg vast hoe de week ging en maak week {week.weekNum+1} aan.</div>
      </div>
      <div style={{padding:"16px"}}>
        {gepland>0&&(
          <div style={{marginBottom:16,padding:"10px 12px",background:C.surfaceAlt,borderRadius:10}}>
            <div style={{fontSize:13,color:C.textSub}}>
              <span style={{fontWeight:700,color:gedaan===gepland?C.green:C.text}}>{gedaan}</span>
              <span style={{color:C.textMuted}}> van {gepland} ingepland{gepland===1?" onderdeel":"e onderdelen"} afgevinkt</span>
            </div>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.textSub,marginBottom:6}}>Notitie</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)}
            placeholder="Hoe ging de week? Wat viel op?" rows={3}
            style={inp({resize:"vertical",lineHeight:1.5})} />
        </div>
        <Btn onClick={()=>onSave(note)} variant="primary" full size="lg">
          Week afsluiten → Week {week.weekNum+1} aanmaken
        </Btn>
      </div>
    </div>
  );
}

// ─── ROUTINES TAB ─────────────────────────────────────────────────────────────
function RoutineCard({routine,onChangeName,onChangeExercises,onChangeType,onChangeNotes,onChangeLinks,onPatch,onDelete,db}) {
  const [open,setOpen]           = useState(true);
  const [showDbModal,setShowDbModal] = useState(false);
  const [pendingExs,setPendingExs] = useState(null);   // wacht op de rusttijden
  const [workout,setWorkout]       = useState(null);   // {exercises, rest}
  const isVideo = routine.kind==="video";

  const addEx = () => onChangeExercises([...routine.exercises,{name:"",sets:""}]);
  const updEx = (i,v) => { const e=[...routine.exercises]; e[i]=v; onChangeExercises(e); };
  const delEx = i => onChangeExercises(routine.exercises.filter((_,j)=>j!==i));

  const links = routine.links||[];
  const addLink = () => onChangeLinks([...links,{label:"",url:""}]);
  const updLink = (i,v) => { const l=[...links]; l[i]=v; onChangeLinks(l); };
  const delLink = i => onChangeLinks(links.filter((_,j)=>j!==i));

  const typeIcon  = routine.type==="ochtend"?"☀️":routine.type==="avond"?"🌙":"·";

  return (
    <>
    {pendingExs&&(
      <WorkoutStartModal exercises={pendingExs}
        onClose={()=>setPendingExs(null)}
        onStart={rest=>{ setWorkout({exercises:pendingExs,rest}); setPendingExs(null); }} />
    )}
    {workout&&(
      <WorkoutMode exercises={workout.exercises} initialRest={workout.rest}
        onClose={()=>setWorkout(null)} />
    )}
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8,overflow:"hidden",boxShadow:C.shadow}}>
      <div style={{
        display:"flex",alignItems:"center",gap:8,padding:"12px 14px",
        background:open?C.surfaceAlt:C.surface,
        borderBottom:open?`1px solid ${C.border}`:"none",
      }}>
        <button onClick={()=>setOpen(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",color:C.textMuted,fontSize:14,padding:0,flexShrink:0,lineHeight:1,transition:"transform .15s",transform:open?"rotate(90deg)":"rotate(0deg)"}}>▶</button>
        <span style={{fontSize:13,flexShrink:0,lineHeight:1}}>{isVideo?"▶️":typeIcon}</span>
        <input value={routine.name} onChange={e=>onChangeName(e.target.value)}
          style={{fontFamily:font,fontSize:14,fontWeight:600,color:C.text,background:"transparent",border:"none",outline:"none",flex:1,minWidth:0}} />
        <span style={{fontSize:12,color:C.textMuted,flexShrink:0}}>
          {isVideo?"Video":`${routine.exercises.length} oef.`}
        </span>
        <button onClick={onDelete} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button>
      </div>
      {open&&(
        <div style={{padding:"12px 14px 14px"}}>
          {/* Soort: oefeningenlijst of follow-along video */}
          <div style={{display:"flex",gap:4,background:C.surfaceAlt,borderRadius:10,padding:3,marginBottom:10}}>
            <Seg active={!isVideo} color={C.green}  bg={C.greenLight}  onClick={()=>onPatch({kind:"exercises"})}>📋 Oefeningen</Seg>
            <Seg active={isVideo}  color={C.purple} bg={C.purpleLight} onClick={()=>onPatch({kind:"video"})}>▶️ Video</Seg>
          </div>
          {/* Type selector */}
          <div style={{display:"flex",gap:4,background:C.surfaceAlt,borderRadius:10,padding:3,marginBottom:12}}>
            <Seg active={routine.type==="ochtend"} color={C.amber}  bg={C.amberLight}  onClick={()=>onChangeType("ochtend")}>☀️ Ochtend</Seg>
            <Seg active={routine.type==="avond"}   color={C.purple} bg={C.purpleLight} onClick={()=>onChangeType("avond")}>🌙 Avond</Seg>
            <Seg active={!routine.type}                                                 onClick={()=>onChangeType(null)}>Beide</Seg>
          </div>

          {isVideo?(
            <>
              <input value={routine.videoUrl||""} onChange={e=>onPatch({videoUrl:e.target.value})}
                placeholder="https://www.youtube.com/watch?v=…"
                style={inp({fontSize:13,padding:"9px 11px"})} />
              {(routine.videoUrl||"").trim()&&(
                <div style={{marginTop:8}}>
                  <VideoLink url={routine.videoUrl} title={routine.name} />
                </div>
              )}
            </>
          ):(
            <>
              {/* Exercises */}
              {routine.exercises.length===0&&(
                <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",padding:"4px 0 8px"}}>Nog geen oefeningen</div>
              )}
              {routine.exercises.map((ex,i)=>(
                <ExRow key={i} ex={ex} onUpdate={v=>updEx(i,v)} onDelete={()=>delEx(i)} setsPlaceholder="3×5" setsEditor={true} />
              ))}
              {/* Action buttons */}
              <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                <Btn onClick={addEx} variant="green" size="sm">+ Nieuw</Btn>
                {db&&<Btn onClick={()=>setShowDbModal(true)} variant="subtle" size="sm">⊕ Uit database</Btn>}
                {routine.exercises.some(e=>e.name&&e.name.trim())&&(
                  <Btn onClick={()=>setPendingExs(routine.exercises.filter(e=>e.name&&e.name.trim()))}
                    variant="primary" size="sm">▶ Start</Btn>
                )}
              </div>
            </>
          )}

          {/* Notities */}
          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>
              📝 Notities
            </div>
            <textarea value={routine.notes||""} onChange={e=>onChangeNotes(e.target.value)}
              placeholder="Aandachtspunten, cues, blessures om rekening mee te houden…"
              rows={3} style={inp({resize:"vertical",lineHeight:1.5,fontSize:13,color:C.textSub})} />
          </div>

          {/* Links */}
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:7}}>
              🔗 Links
            </div>
            {links.length===0&&(
              <div style={{fontSize:13,color:C.textMuted,fontStyle:"italic",marginBottom:8}}>Nog geen links</div>
            )}
            {links.map((l,i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={l.label} onChange={e=>updLink(i,{...l,label:e.target.value})}
                    placeholder="Naam" style={inp({flex:1,fontSize:13,padding:"8px 10px",minWidth:0})} />
                  {l.url&&(
                    <a href={l.url} target="_blank" rel="noopener noreferrer" style={{
                      width:34,height:34,borderRadius:8,flexShrink:0,textDecoration:"none",
                      background:C.greenLight,border:`1px solid ${C.green}`,color:C.green,fontSize:14,
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }}>↗</a>
                  )}
                  <button onClick={()=>delLink(i)} style={{
                    width:34,height:34,borderRadius:8,flexShrink:0,background:"transparent",
                    border:`1px solid ${C.border}`,color:C.textMuted,cursor:"pointer",fontSize:17,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>×</button>
                </div>
                <input value={l.url} onChange={e=>updLink(i,{...l,url:e.target.value})}
                  placeholder="https://…" style={inp({width:"100%",fontSize:12,padding:"7px 10px",marginTop:5,color:C.textSub})} />
              </div>
            ))}
            <Btn onClick={addLink} variant="subtle" size="sm">+ Link</Btn>
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
    </>
  );
}

function RoutinesTab({routines,onChange,db}) {
  const mkRoutine = (kind) => ({
    id:mkId(), kind,
    name: kind==="video" ? "Nieuwe video" : "Nieuwe routine",
    type:null, exercises:[], videoUrl:"", notes:"", links:[],
  });
  const addRoutine    = () => onChange([...routines,mkRoutine("exercises")]);
  const addVideo      = () => onChange([...routines,mkRoutine("video")]);
  const removeRoutine = (id) => onChange(routines.filter(r=>r.id!==id));
  const updateRoutine = (id,patch) => onChange(routines.map(r=>r.id===id?{...r,...patch}:r));

  const videos = routines.filter(r=>r.kind==="video");
  const lists  = routines.filter(r=>r.kind!=="video");

  const card = (r) => (
    <RoutineCard key={r.id} routine={r}
      onChangeName={name=>updateRoutine(r.id,{name})}
      onChangeExercises={exs=>updateRoutine(r.id,{exercises:exs})}
      onChangeType={type=>updateRoutine(r.id,{type})}
      onChangeNotes={notes=>updateRoutine(r.id,{notes})}
      onChangeLinks={links=>updateRoutine(r.id,{links})}
      onPatch={patch=>updateRoutine(r.id,patch)}
      onDelete={()=>removeRoutine(r.id)}
      db={db} />
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:16}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>Routines</div>
          <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>Oefenlijsten en follow-along video's om in dagen te laden</div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <Btn onClick={addVideo}   variant="purple"  size="sm">+ Video</Btn>
          <Btn onClick={addRoutine} variant="primary" size="sm">+ Routine</Btn>
        </div>
      </div>

      {routines.length===0&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"32px 20px",textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:10}}>📋</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Nog niets aangemaakt</div>
          <div style={{fontSize:13,color:C.textMuted,marginBottom:16}}>
            Maak een oefenroutine, of verzamel je follow-along video's als losse items.
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn onClick={addRoutine} variant="primary">+ Eerste routine</Btn>
            <Btn onClick={addVideo}   variant="purple">+ Eerste video</Btn>
          </div>
        </div>
      )}

      {videos.length>0&&(
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
            ▶️ Video's · {videos.length}
          </div>
          {videos.map(card)}
        </div>
      )}

      {lists.length>0&&(
        <div>
          {videos.length>0&&(
            <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
              📋 Oefenroutines · {lists.length}
            </div>
          )}
          {lists.map(card)}
        </div>
      )}
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
          <div style={{background:C.purple,color:"#0A0A0A",borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600,boxShadow:C.shadowLg,opacity:0.9}}>
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
// Vangnet: zonder dit haalt React bij een renderfout de hele boom weg en hou
// je een wit scherm over, zonder enige aanwijzing wat er mis is.
export class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = {err:null}; }
  static getDerivedStateFromError(err){ return {err}; }
  componentDidCatch(err, info){ console.error("Grondvorm liep vast:", err, info); }
  render(){
    if(!this.state.err) return this.props.children;
    return (
      <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",color:C.text,
        display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{maxWidth:420,width:"100%",background:C.surface,border:`1px solid ${C.border}`,
          borderRadius:12,padding:"20px 18px",boxShadow:C.shadow}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>Er ging iets mis</div>
          <div style={{fontSize:13,color:C.textSub,lineHeight:1.55,marginBottom:12}}>
            De app liep vast bij het tekenen van dit scherm. Je gegevens staan nog gewoon
            opgeslagen.
          </div>
          <div style={{fontSize:12,color:C.red,background:C.redLight,borderRadius:8,
            padding:"9px 11px",marginBottom:14,fontFamily:mono,wordBreak:"break-word"}}>
            {String(this.state.err?.message || this.state.err)}
          </div>
          <button onClick={()=>window.location.reload()} style={{
            fontFamily:font,fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",
            padding:"11px 16px",borderRadius:8,border:"none",background:C.purple,color:"#0A0A0A",
          }}>Opnieuw laden</button>
          <button onClick={()=>{
            navigator.clipboard?.writeText(String(this.state.err?.stack||this.state.err));
            this.setState({copied:true});
          }} style={{
            fontFamily:font,fontSize:13,cursor:"pointer",width:"100%",marginTop:8,
            padding:"11px 16px",borderRadius:8,border:`1px solid ${C.border}`,
            background:"transparent",color:C.textSub,
          }}>{this.state.copied?"Gekopieerd":"Kopieer foutmelding"}</button>

          {/* Komt de fout na herladen terug, dan zit hij in het opgeslagen
              weekplan. Dit wist alleen dat — routines, database en Reps blijven. */}
          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>
              Blijft de fout terugkomen na herladen? Dan zit er iets mis in je opgeslagen
              weekplan. Wissen helpt dan — je routines, oefeningendatabase en de Reps- en Mobiliteit-tab
              blijven staan.
            </div>
            {!this.state.confirm?(
              <button onClick={()=>this.setState({confirm:true})} style={{
                fontFamily:font,fontSize:12,cursor:"pointer",padding:"8px 12px",borderRadius:8,
                border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,
              }}>Weekplan wissen</button>
            ):(
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>{
                  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
                  window.location.reload();
                }} style={{
                  fontFamily:font,fontSize:12,fontWeight:600,cursor:"pointer",
                  padding:"8px 12px",borderRadius:8,border:"none",background:C.red,color:"#0A0A0A",
                }}>Ja, wissen en herladen</button>
                <button onClick={()=>this.setState({confirm:false})} style={{
                  fontFamily:font,fontSize:12,cursor:"pointer",padding:"8px 12px",borderRadius:8,
                  border:`1px solid ${C.border}`,background:"transparent",color:C.textSub,
                }}>Annuleer</button>
              </div>
            )}
          </div>

          <details style={{marginTop:14}}>
            <summary style={{fontSize:12,color:C.textMuted,cursor:"pointer"}}>Technische details</summary>
            <pre style={{fontSize:11,color:C.textMuted,whiteSpace:"pre-wrap",wordBreak:"break-word",
              marginTop:8,fontFamily:mono}}>{String(this.state.err?.stack || this.state.err)}</pre>
          </details>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [weeks,setWeeks]         = useState(null);
  const [activeIdx,setActiveIdx] = useState(0);
  const [tab,setTab]             = useState("plan");
  // Reps en Mobiliteit staan niet alleen lokaal: elke wijziging gaat ook naar de cloud.
  const persistReps     = useCallback((reps)=>{ pushToSupabase({reps}); },[]);
  const persistMobility = useCallback((mobility)=>{ pushToSupabase({mobility}); },[]);
  const [db,setDb]               = useState(null);
  const [routines,setRoutines]   = useState(null);
  const [syncKey,setSyncKey]     = useState("");
  const [showSync,setShowSync]   = useState(false);
  const [showMore,setShowMore]   = useState(false);
  // Wat je vandaag in de Reps- en Mobiliteit-app hebt afgerond, zodat de
  // dagkaart zichzelf kan afvinken. Opnieuw lezen bij het terugkeren naar
  // de tab, want daar verandert het.
  const [appsDone,setAppsDone]   = useState({reps:false,mobility:false});
  const refreshAppsDone = useCallback(()=>{
    setAppsDone({reps:readAppDone(REPS_STORAGE_KEY), mobility:readAppDone(MOBILITY_STORAGE_KEY)});
  },[]);

  const loadAll = useCallback(async()=>{
    await initSync();
    const [w,d,r] = await Promise.all([loadData(),loadDb(),loadRoutines()]);
    setWeeks(w);
    setActiveIdx(w.length-1);
    setDb(d);
    setRoutines(r);
    setSyncKey(getSyncKey());
    refreshAppsDone();
  },[refreshAppsDone]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // Re-pull from Supabase when the user switches back to this tab.
  // Skip if we just wrote data locally — the Supabase write may still be in flight
  // and we'd risk overwriting our own unsaved changes with stale remote data.
  const pullSync = useCallback(async()=>{
    if(!supabase) return;
    if(Date.now() - lastLocalSaveMs < 5000) return;
    try{
      const key = getSyncKey();
      const {data} = await supabase.from('trainingsplan').select('*').eq('sync_key',key).maybeSingle();
      if(!data) return;
      // Een leeg of kapot antwoord mag nooit de werkende staat vervangen.
      if(Array.isArray(data.weeks)&&data.weeks.length){
        const w = migrateWeeks(data.weeks);
        backupWeeks("sync-overschrijft");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.weeks));
        setWeeks(w);
        setActiveIdx(i=>Math.min(i, w.length-1));
      }
      if(data.exercise_db) { localStorage.setItem(DB_KEY,       JSON.stringify(data.exercise_db)); setDb(data.exercise_db); }
      if(data.routines)    { localStorage.setItem(ROUTINES_KEY, JSON.stringify(data.routines));    setRoutines(data.routines); }
      // De Reps- en Mobiliteit-tab lezen hun eigen opslag bij het openen,
      // dus bijwerken volstaat.
      if(data.reps)        localStorage.setItem(REPS_STORAGE_KEY, JSON.stringify(data.reps));
      if(data.mobility)    localStorage.setItem(MOBILITY_STORAGE_KEY, JSON.stringify(data.mobility));
    }catch(e){
      console.error("Sync overgeslagen:", e);
    }
  },[]);

  useEffect(()=>{
    const onVisible = ()=>{ if(document.visibilityState==='visible'){ pullSync(); refreshAppsDone(); } };
    document.addEventListener('visibilitychange', onVisible);
    return ()=> document.removeEventListener('visibilitychange', onVisible);
  },[pullSync,refreshAppsDone]);

  const persist         = useCallback((w)=>{setWeeks(w);saveData(w);},[]);

  // Nieuwe cyclus: alleen de weken gaan weg, routines en database blijven.
  const [confirmReset,setConfirmReset] = useState(false);
  const [confirmRestore,setConfirmRestore] = useState(false);
  const restartPlan = () => {
    const w = [mkWeek(1)];
    persist(w);
    setActiveIdx(0);
    setConfirmReset(false);
    setTab("plan");
  };

  // Plan van de vorige week overnemen: wat je van plan wás, niet wat je deed.
  // Afvinken en notities blijven dus leeg.
  const [confirmCopy,setConfirmCopy] = useState(false);
  const copyPrevWeek = (wi) => {
    if(wi<1) return;
    const from = weeks[wi-1];
    const next = weeks.map((wk,i)=> i!==wi ? wk : {
      ...wk,
      days: Object.fromEntries(DAYS.map(d=>{
        const src = from.days[d] || mkDay();
        const cur = wk.days[d]   || mkDay();
        return [d, { ...cur, morning: src.morning ?? null, evening: src.evening ?? null }];
      })),
    });
    persist(next);
    setConfirmCopy(false);
  };
  const persistDb       = useCallback((d)=>{setDb(d);saveDb(d);},[]);
  const persistRoutines = useCallback((r)=>{setRoutines(r);saveRoutines(r);},[]);

  const updateDay = useCallback((wi,dk,val) => {
    setWeeks(prev => {
      const next = prev.map((wk,i)=>i!==wi?wk:{...wk,days:{...wk.days,[dk]:val}});
      saveData(next);
      return next;
    });
  }, []);
  // Week afsluiten en de volgende aanmaken. Er is geen bovengrens meer: het
  // plan is een weekplanner, geen programma van tien weken.
  const closeWeek = (wi,note) => {
    const closed = {...weeks[wi],note,done:true};
    const w = weeks.map((wk,i)=>i!==wi?wk:closed);
    const next = closed.weekNum+1;
    if(!w.find(wk=>wk.weekNum===next)) w.push(mkWeek(next));
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

  // Een sync kan minder weken terugsturen dan er stonden (bijvoorbeeld na een
  // reset op een ander apparaat). activeIdx wees dan naar een week die niet
  // meer bestaat en het renderen klapte eruit — vandaar een leeg scherm.
  const safeIdx = Math.max(0, Math.min(activeIdx, weeks.length-1));
  const aw      = weeks[safeIdx];
  // Automatisch afvinken geldt alleen voor de week waar je nu in zit.
  const isCurrentWeek = safeIdx === weeks.length-1 && !!aw && !aw.done;
  // Telt ook mee in de weeksamenvatting, anders zegt die nul terwijl de dag
  // een vinkje toont.
  const autoExtraDone = (()=>{
    if(!isCurrentWeek) return 0;
    const d = (aw.days&&aw.days[TODAY_KEY]) || {};
    if(!d.morning || d.morningDone) return 0;
    return appsDone[d.morning] ? 1 : 0;
  })();

  // Laatste vangnet: liever een knop om door te gaan dan een vastgelopen scherm.
  if(!aw) return (
    <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",color:C.text,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:420,width:"100%",background:C.surface,border:`1px solid ${C.border}`,
        borderRadius:12,padding:"20px 18px",boxShadow:C.shadow}}>
        <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>Geen weken gevonden</div>
        <div style={{fontSize:13,color:C.textSub,lineHeight:1.55,marginBottom:14}}>
          Je weekplan is leeg geraakt. Je routines, oefeningendatabase en de Reps- en Mobiliteit-tab
          staan er nog gewoon.
        </div>
        <Btn onClick={restartPlan} variant="primary" full>Begin bij week 1</Btn>
      </div>
    </div>
  );

  // Reps is een eigen app met eigen navigatie en schermvullende sheets; die
  // neemt het hele scherm over. De "Plan"-knop in zijn navigatie brengt je terug.
  if(tab==="reps") return (
    <div id="reps-root">
      <RepsTab onExit={()=>{ refreshAppsDone(); setTab("plan"); }} onPersist={persistReps} />
    </div>
  );

  if(tab==="mob") return (
    <div id="mob-root">
      <MobilityTab onExit={()=>{ refreshAppsDone(); setTab("plan"); }} onPersist={persistMobility} />
    </div>
  );

  // Dagelijks in de balk; wat je af en toe nodig hebt achter "Meer".
  const TABS = [["plan","Plan"],["reps","Reps"],["mob","Mobiliteit"]];
  const MORE = [
    ["routines", "Routines",     "Oefenlijsten en video's, met begeleide workout"],
    ["history",  "Geschiedenis", "Afgesloten weken, back-up en opnieuw beginnen"],
    ["database", "Database",     "Je eigen oefeningen, per lichaamsdeel"],
  ];
  const inMore = MORE.find(([id])=>id===tab);

  return (
    <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",color:C.text}}>

      {/* ── Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 0"}}>
            <div>
              <h1 style={{fontSize:18,fontWeight:700,color:C.text,margin:0,letterSpacing:"-0.3px"}}>Grondvorm</h1>
              <div style={{fontSize:12,color:C.textMuted,marginTop:1}}>Plan · Reps · Mobiliteit</div>
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
          {/* Tab bar — drie dagelijkse tabbladen plus één knop voor de rest.
              De vierde toont de naam van het onderdeel waar je in zit, zodat
              je ook achter "Meer" ziet waar je bent. */}
          <div style={{display:"flex",marginTop:6}}>
            {TABS.map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1,padding:"10px 4px",background:"none",border:"none",
                borderBottom:`2px solid ${tab===id?C.purple:"transparent"}`,
                color:tab===id?C.purple:C.textMuted,
                cursor:"pointer",fontSize:13,fontFamily:font,fontWeight:tab===id?600:400,
                transition:"color .15s",whiteSpace:"nowrap",
              }}>{l}</button>
            ))}
            <button onClick={()=>setShowMore(true)} style={{
              flex:1,padding:"10px 4px",background:"none",border:"none",
              borderBottom:`2px solid ${inMore?C.purple:"transparent"}`,
              color:inMore?C.purple:C.textMuted,
              cursor:"pointer",fontSize:13,fontFamily:font,fontWeight:inMore?600:400,
              transition:"color .15s",whiteSpace:"nowrap",
              display:"flex",alignItems:"center",justifyContent:"center",gap:3,
            }}>
              {inMore?inMore[1]:"Meer"}
              <span style={{fontSize:9,opacity:0.7}}>▾</span>
            </button>
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
                <button key={i} onClick={()=>{setActiveIdx(i);setConfirmCopy(false);}} style={{
                  width:36,height:36,borderRadius:9,border:`1.5px solid ${safeIdx===i?C.purple:C.border}`,
                  background:safeIdx===i?C.purple:w.done?C.surfaceAlt:C.surface,
                  color:safeIdx===i?"#fff":w.done?C.textMuted:C.text,
                  cursor:"pointer",fontSize:13,fontFamily:font,fontWeight:600,position:"relative",
                  boxShadow:safeIdx===i?`0 0 0 3px ${C.purple}22`:"none",transition:"all .15s",
                }}>
                  {w.weekNum}
                  {w.done&&<span style={{position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:C.green,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:"#fff"}}>✓</span>}
                </button>
              ))}
            </div>

            {/* Week title bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:12,boxShadow:C.shadow}}>
              <div style={{fontSize:19,fontWeight:700,color:C.text}}>Week {aw.weekNum}</div>
              {aw.done&&<Tag color={C.green} bg={C.greenLight}>Afgesloten</Tag>}
            </div>

            {/* Vorige week overnemen als startpunt, daarna per dag bijschaven. */}
            {safeIdx>0&&!aw.done&&(()=>{
              const prev = weeks[safeIdx-1];
              const gevuld = DAYS.some(d=>{
                const x = aw.days[d]||{};
                return x.morning!=null || x.evening!=null;
              });
              return (
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
                  padding:"12px 14px",marginBottom:12,boxShadow:C.shadow}}>
                  {!confirmCopy?(
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:170}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>Week {prev.weekNum} overnemen</div>
                        <div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.45}}>
                          Kopieert per dag je ochtend- en avondkeuze. Afvinken en notities blijven leeg.
                        </div>
                      </div>
                      <Btn onClick={()=>gevuld?setConfirmCopy(true):copyPrevWeek(safeIdx)}
                        variant="subtle" size="sm">⎘ Overnemen</Btn>
                    </div>
                  ):(
                    <div>
                      <div style={{fontSize:13,color:C.textSub,lineHeight:1.5,marginBottom:10}}>
                        Week {aw.weekNum} is al ingevuld. Overnemen overschrijft die invulling met die van
                        week {prev.weekNum}.
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <button onClick={()=>copyPrevWeek(safeIdx)} style={{
                          fontFamily:font,fontSize:12,fontWeight:600,cursor:"pointer",
                          padding:"7px 12px",borderRadius:8,border:"none",background:C.purple,color:"#0A0A0A",
                        }}>Ja, overschrijven</button>
                        <Btn onClick={()=>setConfirmCopy(false)} variant="ghost" size="sm">Annuleer</Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {DAYS.map(d=>(
              <DayCard key={d} dayKey={d} day={aw.days[d]}
                onChange={v=>updateDay(safeIdx,d,v)}
                onOpenTab={setTab}
                autoDone={isCurrentWeek&&d===TODAY_KEY ? appsDone : null} />
            ))}

            {!aw.done&&<WeekEval week={aw} extraDone={autoExtraDone} onSave={n=>closeWeek(safeIdx,n)} />}

            {aw.done&&(
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginTop:14}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:C.green,display:"inline-block"}} />
                  <span style={{fontSize:13,fontWeight:600,color:C.green}}>Week afgesloten</span>
                </div>
                {aw.note&&<div style={{fontSize:13,color:C.textSub,fontStyle:"italic",marginBottom:10}}>"{aw.note}"</div>}
              </div>
            )}
          </div>
        )}

        {/* Reps en Mobiliteit vullen hierboven al het hele scherm. */}
        {tab==="reps"&&null}
        {tab==="mob"&&null}

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
              return (
                <div key={w.weekNum} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:10,boxShadow:C.shadow}}>
                  <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:C.text}}>Week {w.weekNum}</div>
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

            {/* Back-up terugzetten — gemaakt vlak voor een sync of reparatie
                het weekplan verving. */}
            {(()=>{
              const bu = readBackup();
              if(!bu) return null;
              const zelfde = bu.weeks.length===weeks.length &&
                             bu.weeks.every((w,i)=>w.weekNum===weeks[i]?.weekNum);
              if(zelfde) return null;
              return (
                <div style={{marginTop:28,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                    Back-up gevonden
                  </div>
                  <div style={{fontSize:13,color:C.textSub,lineHeight:1.55,marginBottom:12}}>
                    Er staat een kopie van {bu.weeks.length} {bu.weeks.length===1?"week":"weken"} van
                    vlak voordat je weekplan werd vervangen
                    ({new Date(bu.at).toLocaleString("nl-NL")}). Je hebt er nu {weeks.length}.
                  </div>
                  {!confirmRestore?(
                    <Btn onClick={()=>setConfirmRestore(true)} variant="subtle" size="sm">Back-up bekijken en terugzetten</Btn>
                  ):(
                    <div>
                      <div style={{fontSize:12,color:C.textMuted,marginBottom:10,fontFamily:mono}}>
                        {bu.weeks.map(w=>`week ${w.weekNum}${w.done?" ✓":""}`).join(" · ")}
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <button onClick={()=>{ persist(bu.weeks); setActiveIdx(bu.weeks.length-1); setConfirmRestore(false); setTab("plan"); }} style={{
                          fontFamily:font,fontSize:12,fontWeight:600,cursor:"pointer",
                          padding:"7px 12px",borderRadius:8,border:"none",background:C.purple,color:"#0A0A0A",
                        }}>Deze terugzetten</button>
                        <Btn onClick={()=>setConfirmRestore(false)} variant="ghost" size="sm">Annuleer</Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Opnieuw beginnen — alleen de weken, niet je routines of database. */}
            <div style={{marginTop:28,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>
                Opnieuw beginnen
              </div>
              <div style={{fontSize:13,color:C.textSub,lineHeight:1.55,marginBottom:12}}>
                Start een nieuwe cyclus bij week 1. Je routines, oefeningendatabase en de Reps- en Mobiliteit-tab
                blijven staan — alleen je weken verdwijnen, met de dagen, notities en beoordelingen.
              </div>
              {!confirmReset?(
                <Btn onClick={()=>setConfirmReset(true)} variant="ghost" size="sm">Terug naar week 1</Btn>
              ):(
                <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <button onClick={restartPlan} style={{
                    fontFamily:font,fontSize:12,fontWeight:600,cursor:"pointer",
                    padding:"7px 12px",borderRadius:8,border:"none",
                    background:C.red,color:"#0A0A0A",
                  }}>
                    Ja, {weeks.length} {weeks.length===1?"week":"weken"} wissen
                  </button>
                  <Btn onClick={()=>setConfirmReset(false)} variant="ghost" size="sm">Annuleer</Btn>
                </div>
              )}
            </div>
          </div>
        )}
        {tab==="database"&&db&&<DatabaseTab db={db} onChange={persistDb} />}

      </div>

      {/* Meer — alles wat je niet elke dag nodig hebt */}
      {showMore&&(
        <Sheet title="Meer" onClose={()=>setShowMore(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {MORE.map(([id,label,uitleg])=>{
              const actief = tab===id;
              return (
                <button key={id} onClick={()=>{setTab(id);setShowMore(false);}} style={{
                  display:"block",width:"100%",textAlign:"left",cursor:"pointer",fontFamily:font,
                  background:actief?C.purpleLight:C.surface,
                  border:`1px solid ${actief?C.purple:C.border}`,borderRadius:10,padding:"12px 14px",
                }}>
                  <div style={{fontSize:14,fontWeight:600,color:actief?C.purple:C.text}}>{label}</div>
                  <div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.45}}>{uitleg}</div>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {/* Sync modal */}
      {showSync&&syncKey&&(
        <SyncModal syncKey={syncKey} onClose={()=>setShowSync(false)}
          onSwitch={()=>{ setShowSync(false); loadAll(); }} />
      )}
    </div>
  );
}
