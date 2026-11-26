import React, { useState, useEffect, useCallback } from "react";
import { APP_STATE_EVENT } from "./RepsTab.jsx";

/* ============================================================
   SKILL CALISTHENICS — 10 weken, drie trainingen en twee keer
   balans per week.
   Week 1–6 bouw je gecontroleerd op, want pezen passen zich pas
   na 6–8 weken aan. Pas in week 7–10 komen de zwaardere stappen.
   Je schuift zelf door naar de volgende week; de app laat zien
   wanneer de bronnen dat aanraden en wanneer je beter blijft.
   ============================================================ */

export const SKILLS_STORAGE_KEY = "dailyskills:v1";
const KEY = SKILLS_STORAGE_KEY;
const TOTAL_WEEKS = 10;
const ACCENT = "#8BD17C";

const storage = {
  async get(k) { const v = localStorage.getItem(k); return v == null ? null : { value: v }; },
  async set(k, v) { localStorage.setItem(k, v); },
};

/* ---------- Weekritme ---------- */

const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const DAY_LABEL = { ma: "Maandag", di: "Dinsdag", wo: "Woensdag", do: "Donderdag", vr: "Vrijdag", za: "Zaterdag", zo: "Zondag" };
const RHYTHM = { ma: "zwaar", di: "balans", wo: "licht", do: "balans", vr: "zwaar", za: "rust", zo: "rust" };
const TRAIN_DAYS = DAYS.filter((d) => RHYTHM[d] !== "rust");

const KINDS = {
  zwaar:  { label: "Zwaar",  color: ACCENT,    note: "Skills op je grens, en de pees-variant van de basisoefeningen." },
  licht:  { label: "Licht",  color: "#5AA9E6", note: "Skills met makkelijkere varianten, en de basisoefeningen in normaal tempo." },
  balans: { label: "Balans", color: "#E4C05A", note: "10 minuten balans." },
  rust:   { label: "Rust",   color: "#525252", note: "Rustdag." },
};

const PHASES = [
  { weeks: [1, 2, 3, 4, 5, 6], name: "Gecontroleerd opbouwen", note: "De consolidatiefase. Je pezen passen zich pas na 6–8 weken aan, dus nu nog niet de zware stappen." },
  { weeks: [7, 8, 9, 10], name: "Zwaardere stappen", note: "Je pezen hebben zes weken gehad. Nu pas komen de zwaardere varianten." },
];
const phaseOf = (week) => PHASES.find((p) => p.weeks.includes(week));

/* ---------- Wat er per twee weken aan bod komt ---------- */

const PARTS = [
  ["balans", "Balans"],
  ["core", "Core en grip"],
  ["bar", "Mobiliteit en bar"],
  ["benen", "Benen"],
];

const BLOCKS = [
  {
    weeks: [1, 2],
    balans: "Frog stand: korte pogingen. Gewicht op het onderste deel van je handpalm, vingers gespreid en drukkend.",
    core: "Knieheffen vanuit een volledige dead hang, zonder zwaaien.",
    bar: "Skin the cat: ondiep, loslaten mag.",
    benen: null,
  },
  {
    weeks: [3, 4],
    balans: "Frog stand: steeds langer vasthouden.",
    core: "Benen gestrekt heffen (L raises).",
    bar: "Skin the cat: volledig en gecontroleerd. Body rows met je benen tot de stang (voorbereiding op de pullover).",
    benen: null,
  },
  {
    weeks: [5, 6],
    balans: "Frog stand: stabiel, ook net uit balans.",
    core: "Hanging L-sit vasthouden.",
    bar: "Pullover: eerst springend op een lage stang.",
    benen: "Diepe step-ups.",
  },
  {
    weeks: [7, 8],
    balans: "Handstand starten: uitlijning tegen de muur, en kick-up met zijwaarts afbreken. Frog stand blijft als warming-up.",
    core: "L-sit blijft.",
    bar: "Pullover volledig.",
    benen: "Pistols op een verhoging, met steun.",
  },
  {
    weeks: [9, 10],
    balans: "Handstand: korte holds. Af en toe een losse hold is normaal.",
    core: "L-sit blijft.",
    bar: "Werk naar 8–10 pull-ups: begin met schuine of explosieve pull-ups met band (voorbereiding op de muscle-up).",
    benen: "Verhoging en steun afbouwen.",
  },
];
const blockOf = (week) => BLOCKS.find((b) => b.weeks.includes(week));

const WARMUP = [
  "Schouders en polsen mobiliseren.",
  "De calisthenics-plank, doel 30 seconden.",
  "Planche leans. Vorm telt, niet hoe ver je leunt.",
];

const BASE_HEAVY = "Pull-ups en dips met 3 seconden zakken of een pauze halverwege. 3–6 gecontroleerde herhalingen, 3–4 sets. Gebruik een band als dat nodig is.";
const BASE_LIGHT = "Pull-ups, dips, push-ups, rows en squats in normaal tempo. 3 sets, stop 1–2 herhalingen voordat je niet meer kunt.";
const STATIC_LIMIT = "Statische oefeningen belasten dezelfde pezen, vooral rond je biceps. Doe maximaal een paar zware sets per training.";

/* ---------- Doorgaan ----------
   Wat de bronnen vragen voordat je de volgende stap zet. Alleen bij de
   weken waar een nieuwe, zwaardere stap begint. De pezencheck geldt altijd. */

const TENDON_CHECK = "Je pezen zijn niet pijnlijk, en je gaat niet erg snel.";
const GATES = {
  4: ["Skin the cat gaat gecontroleerd heen en terug."],
  6: ["Frog stand is stabiel, ook als je een beetje uit balans raakt.", "Je houdt de L-sit vast zonder te trillen."],
  8: ["Je kunt veilig uit de handstand afbreken. Eerst veilig afbreken, dan pas vasthouden."],
};

/* ---------- Tests ---------- */

const TEST_WEEKS = [6, 10];
const TEST_SKILLS = [
  { id: "frog",        label: "Frog stand, stabiel ook net uit balans", weeks: [6, 10] },
  { id: "lsit",        label: "L-sit vasthouden zonder trillen",        weeks: [6, 10] },
  { id: "skin",        label: "Skin the cat, gecontroleerd heen en terug", weeks: [6, 10] },
  { id: "pulloverJump", label: "Pullover, springend op een lage stang", weeks: [6] },
  { id: "pullover",    label: "Pullover, volledig",                     weeks: [10] },
  { id: "pistol",      label: "Pistol op een verhoging",                weeks: [10] },
  { id: "handstand",   label: "Handstand, korte hold",                  weeks: [10] },
];
const MUSCLE_UP_PULLUPS = 8;

/* ---------- Datum ---------- */

const iso = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const TODAY_KEY = () => DAYS[(new Date().getDay() + 6) % 7];
const shortDate = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
};

/* ---------- Opslag ---------- */

const DEFAULT_STATE = {
  v: 1,
  started: false,
  startedAt: null,
  week: 1,
  /* Per week de datum waarop je elke sessie afvinkte: { 3: { ma: "2026-11-23" } }.
     Herhaal je een week, dan begint die weer leeg. */
  done: {},
  /* { w6: { date, pullups, skills: { frog: true } }, w10: … } */
  tests: {},
  /* Doorgeschoven en herhaalde weken, voor bij Voortgang. */
  log: [],
  finished: false,
  /* Eerdere rondes van tien weken, met hun tests. */
  rounds: [],
  /* De laatste dag waarop je iets afvinkte; het plan vinkt daarmee de
     avond van vandaag vanzelf af. */
  lastCompletedDate: null,
};

const latestDate = (done) =>
  Object.values(done).flatMap((w) => Object.values(w || {})).sort().pop() || null;

/* ============================================================
   App
   ============================================================ */

export default function SkillsTab({ onExit, onPersist }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("week");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = { ...DEFAULT_STATE };
      try {
        const r = await storage.get(KEY);
        if (r && r.value) loaded = { ...DEFAULT_STATE, ...JSON.parse(r.value) };
      } catch (e) { /* eerste keer */ }
      if (!cancelled) setState(loaded);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Haalt de sync een nieuwere versie binnen terwijl dit scherm open is, lees
     die dan in. Anders zou de volgende tik de oude stand terugschrijven. */
  useEffect(() => {
    const onRemote = async (e) => {
      if (e.detail?.key !== KEY) return;
      try {
        const r = await storage.get(KEY);
        if (r && r.value) setState({ ...DEFAULT_STATE, ...JSON.parse(r.value) });
      } catch (err) { /* onleesbaar: houd wat er staat */ }
    };
    window.addEventListener(APP_STATE_EVENT, onRemote);
    return () => window.removeEventListener(APP_STATE_EVENT, onRemote);
  }, []);

  const save = useCallback((next) => {
    setState(next);
    (async () => {
      try {
        await storage.set(KEY, JSON.stringify(next));
        onPersist?.(next);
        setSaveError(false);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [onPersist]);

  if (!state) return <Splash />;
  if (!state.started) {
    return <Intro onExit={onExit} onStart={() => save({ ...state, started: true, startedAt: iso(), week: 1 })} />;
  }

  const today = iso();
  const week = state.week;
  const weekDone = state.done[week] || {};

  const toggle = (dk) => {
    const wk = { ...weekDone };
    if (wk[dk]) delete wk[dk]; else wk[dk] = today;
    const done = { ...state.done, [week]: wk };
    save({ ...state, done, lastCompletedDate: latestDate(done) });
  };

  const saveTest = (w, values) =>
    save({ ...state, tests: { ...state.tests, [`w${w}`]: { ...values, date: today } } });

  const sessions = TRAIN_DAYS.filter((d) => weekDone[d]).length;

  const advance = () => {
    const log = [...state.log, { week, action: "door", date: today, sessions }];
    if (week >= TOTAL_WEEKS) save({ ...state, log, finished: true });
    else save({ ...state, log, week: week + 1 });
  };

  /* Blijven op hetzelfde niveau: deze week begint opnieuw. */
  const repeat = () => {
    const done = { ...state.done, [week]: {} };
    save({
      ...state,
      done,
      log: [...state.log, { week, action: "herhaald", date: today, sessions }],
      lastCompletedDate: latestDate(done),
    });
  };

  const restart = () =>
    save({
      ...DEFAULT_STATE,
      started: true,
      startedAt: today,
      rounds: [...state.rounds, { finishedAt: today, startedAt: state.startedAt, tests: state.tests }],
    });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50" style={{ fontFamily: FONT }}>
      <div className="mx-auto max-w-md pb-28">
        <Header week={week} finished={state.finished} onExit={onExit} />

        {saveError && (
          <p className="mx-5 mb-4 border-l-2 border-neutral-700 pl-3 text-xs leading-relaxed text-neutral-400">
            Het opslaan lukt nu niet. Je invoer blijft op het scherm staan, maar overleeft een herlaadbeurt misschien niet.
          </p>
        )}

        {tab === "week" && (
          state.finished
            ? <Finished state={state} onProgress={() => setTab("progress")} onRestart={restart} />
            : <ThisWeek state={state} onToggle={toggle} onSaveTest={saveTest} onAdvance={advance} onRepeat={repeat} />
        )}
        {tab === "schema" && <Schema current={state.finished ? null : week} />}
        {tab === "progress" && <Progress state={state} />}
      </div>

      <Nav tab={tab} setTab={setTab} onExit={onExit} />
    </div>
  );
}

/* ---------- Kleine onderdelen ---------- */

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-neutral-700">Skills</div>
    </div>
  );
}

function Eyebrow({ children, className = "" }) {
  return <div className={`text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500 ${className}`}>{children}</div>;
}

function BackButton({ onExit }) {
  if (!onExit) return null;
  return (
    <button onClick={onExit}
      className={`flex min-h-[44px] shrink-0 items-center rounded-lg border border-neutral-700 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-300 active:bg-neutral-800 ${RING}`}>
      ← Plan
    </button>
  );
}

function Header({ week, finished, onExit }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-6 pt-7">
      <div className="flex min-w-0 items-center gap-3">
        {/* Altijd bereikbare uitgang bovenaan; onderaan zit de home-indicator in de weg. */}
        <BackButton onExit={onExit} />
        <div className="truncate text-[11px] font-bold uppercase tracking-[0.3em]">Skills</div>
      </div>
      <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
        {finished ? "Klaar" : <>Week <span className="tabular-nums" style={{ color: ACCENT }}>{week}</span> van {TOTAL_WEEKS}</>}
      </div>
    </header>
  );
}

function WeekBar({ week, finished }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: TOTAL_WEEKS }).map((_, i) => {
        const w = i + 1;
        const past = finished || w < week;
        return (
          <div key={w} className="h-1 flex-1"
            style={{
              backgroundColor: past ? ACCENT : w === week ? "#3A4A36" : "#262626",
              marginLeft: w === 7 ? 6 : 0,
            }} />
        );
      })}
    </div>
  );
}

function Check({ on, color = ACCENT }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold leading-none text-neutral-950"
      style={{ borderColor: on ? color : "#4A4A4A", backgroundColor: on ? color : "transparent" }}>
      {on ? "✓" : ""}
    </span>
  );
}

function Section({ title, children, className = "mt-6" }) {
  return (
    <section className={className}>
      <Eyebrow className="mb-2.5">{title}</Eyebrow>
      {children}
    </section>
  );
}

function Bullets({ items, muted = false }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className={`flex gap-2.5 text-[13px] leading-relaxed ${muted ? "text-neutral-400" : "text-neutral-300"}`}>
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-neutral-600" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Note({ children }) {
  return (
    <p className="mt-3 border-l-2 pl-3 text-[12px] leading-relaxed text-neutral-400" style={{ borderColor: ACCENT }}>
      {children}
    </p>
  );
}

/* ---------- Intro ---------- */

function Intro({ onStart, onExit }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50" style={{ fontFamily: FONT }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-7 pt-8">
        <div className="mb-5 self-start"><BackButton onExit={onExit} /></div>
        <div className="flex-1 pt-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Skill calisthenics</div>
          <h1 className="mt-5 text-[38px] font-bold leading-[1.02] tracking-tight">
            Tien weken.<br />Eerst je pezen,<br />dan de skills.
          </h1>
          <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-neutral-400">
            <p>Pezen passen zich pas na 6–8 weken aan. Daarom bouw je zes weken gecontroleerd op, en zet je pas in week 7–10 de zwaardere stappen.</p>
            <p>Elke week: zwaar op maandag en vrijdag, licht op woensdag, en op dinsdag en donderdag tien minuten balans. Het weekend is rust.</p>
            <p>Je schuift zelf door naar de volgende week. Voelen je pezen pijnlijk, of ga je erg snel? Dan herhaal je de week.</p>
          </div>
        </div>
        <button onClick={onStart}
          className={`mt-8 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
          style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
          Begin bij week 1
        </button>
      </div>
    </div>
  );
}

/* ---------- Deze week ---------- */

function ThisWeek({ state, onToggle, onSaveTest, onAdvance, onRepeat }) {
  const week = state.week;
  const phase = phaseOf(week);
  const todayKey = TODAY_KEY();
  const [open, setOpen] = useState(todayKey);
  const weekDone = state.done[week] || {};
  const sessions = TRAIN_DAYS.filter((d) => weekDone[d]).length;

  return (
    <main className="px-5">
      <WeekBar week={week} finished={false} />
      <Eyebrow className="mt-5">Week {week} · {phase.name}</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-none tracking-tight">Week {week}</h1>
      <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">{phase.note}</p>
      <div className="mt-3 text-xs tabular-nums text-neutral-500">{sessions} van {TRAIN_DAYS.length} sessies afgevinkt</div>

      <ul className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
        {DAYS.map((dk) => {
          const kind = RHYTHM[dk];
          const k = KINDS[kind];
          const isOpen = open === dk;
          const isToday = dk === todayKey;
          const doneOn = weekDone[dk];
          return (
            <li key={dk} className="bg-neutral-900">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => setOpen(isOpen ? null : dk)} aria-expanded={isOpen}
                  className={`flex min-w-0 flex-1 items-center gap-3 text-left ${RING}`}>
                  <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: k.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-bold leading-tight">{DAY_LABEL[dk]}</span>
                      {isToday && <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Vandaag</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-500">
                      {k.label}{doneOn ? ` · gedaan ${shortDate(doneOn)}` : ""}
                    </span>
                  </span>
                  {kind !== "rust" && <span className="shrink-0 text-xs text-neutral-600">{isOpen ? "▴" : "▾"}</span>}
                </button>
                {kind !== "rust" && (
                  <button onClick={() => onToggle(dk)} aria-pressed={!!doneOn} aria-label={`${DAY_LABEL[dk]} afvinken`}
                    className={`-mr-1 p-1 ${RING}`}>
                    <Check on={!!doneOn} />
                  </button>
                )}
              </div>
              {isOpen && kind !== "rust" && (
                <div className="border-t border-neutral-800 px-4 pb-5">
                  <Session kind={kind} week={week} tests={state.tests} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {TEST_WEEKS.includes(week) && (
        <TestCard key={week} week={week} saved={state.tests[`w${week}`]} onSave={(v) => onSaveTest(week, v)} />
      )}

      <Advance key={week} state={state} onAdvance={onAdvance} onRepeat={onRepeat} />
    </main>
  );
}

function Session({ kind, week, tests }) {
  const b = blockOf(week);
  const parts = PARTS.filter(([id]) => b[id]);
  const fewPullups = week >= 9 && tests.w6 && Number(tests.w6.pullups) < MUSCLE_UP_PULLUPS;

  if (kind === "balans") {
    return (
      <>
        <Section title="10 minuten">
          <p className="text-[13px] leading-relaxed text-neutral-300">{b.balans}</p>
        </Section>
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
          Vaak kort oefenen werkt beter dan af en toe lang. Verdeel de tien minuten over korte pogingen met rust ertussen.
        </p>
        {week <= 6 && (
          <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
            Loopt je frog stand vast? Een elbow lever is een optionele extra.
          </p>
        )}
      </>
    );
  }

  const heavy = kind === "zwaar";
  return (
    <>
      <Section title="Warming-up · 5–10 min">
        <Bullets items={WARMUP} />
      </Section>

      <Section title={heavy ? "Skills op je grens" : "Skills, makkelijkere variant"}>
        <ul className="space-y-3">
          {parts.map(([id, label]) => (
            <li key={id}>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</div>
              <div className="mt-0.5 text-[13px] leading-relaxed text-neutral-300">{b[id]}</div>
            </li>
          ))}
        </ul>
        {!heavy && <Note>Neem bij elke skill een stap terug naar een makkelijkere variant. Vandaag gaat het om herhalen, niet om je grens.</Note>}
        {fewPullups && (
          <Note>
            Bij de test in week 6 haalde je {tests.w6.pullups} pull-ups. Muscle-up-werk pas bij 8–10 strikte pull-ups,
            dus werk daar eerst naartoe.
          </Note>
        )}
      </Section>

      <Section title={heavy ? "Basis · pees-variant" : "Basis · normaal tempo"}>
        <p className="text-[13px] leading-relaxed text-neutral-300">{heavy ? BASE_HEAVY : BASE_LIGHT}</p>
        {heavy && <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">{STATIC_LIMIT}</p>}
      </Section>
    </>
  );
}

function TestCard({ week, saved, onSave }) {
  const skills = TEST_SKILLS.filter((s) => s.weeks.includes(week));
  const [editing, setEditing] = useState(!saved);
  const [pullups, setPullups] = useState(saved ? String(saved.pullups) : "");
  const [checked, setChecked] = useState(saved ? saved.skills || {} : {});
  const ready = pullups !== "" && Number(pullups) >= 0;

  return (
    <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <Eyebrow>Eind week {week} · Test</Eyebrow>
      <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight">
        {week === 6 ? "Max pull-ups en je skills" : "Opnieuw testen"}
      </h2>

      {!editing ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
            Opgeslagen op {shortDate(saved.date)}: <span className="font-bold text-neutral-200">{saved.pullups}</span> pull-ups,{" "}
            {skills.filter((s) => saved.skills?.[s.id]).length} van {skills.length} skills ✅.
          </p>
          <button onClick={() => setEditing(true)}
            className={`mt-4 rounded-lg border border-neutral-700 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-300 ${RING}`}>
            Aanpassen
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
            Test je max strikte pull-ups en vink aan welke skills lukken.
            {week === 10 ? " Daarna staat alles naast week 6 in Voortgang." : ""}
          </p>
          <div className="mt-5 flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <label htmlFor={`pu${week}`} className="text-[14px] font-bold">Max strikte pull-ups</label>
            <input id={`pu${week}`} type="number" inputMode="numeric" min="0" placeholder="0"
              value={pullups} onChange={(e) => setPullups(e.target.value)}
              className={`w-16 border-b border-neutral-700 bg-transparent pb-1 text-right text-2xl font-bold tabular-nums text-neutral-50 placeholder-neutral-700 ${RING}`} />
          </div>
          <ul className="mt-2">
            {skills.map((s) => {
              const on = !!checked[s.id];
              return (
                <li key={s.id}>
                  <button onClick={() => setChecked({ ...checked, [s.id]: !on })} aria-pressed={on}
                    className={`flex w-full items-center gap-3 py-3 text-left ${RING}`}>
                    <Check on={on} />
                    <span className="text-[13px] leading-snug text-neutral-200">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button disabled={!ready}
            onClick={() => { onSave({ pullups: Number(pullups), skills: checked }); setEditing(false); }}
            className={`mt-4 w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.18em] disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
            style={ready ? { backgroundColor: ACCENT, color: "#0A0A0A" } : { border: "1px solid #2A2A2A" }}>
            {ready ? "Test opslaan" : "Vul je pull-ups in"}
          </button>
        </>
      )}
    </section>
  );
}

function Advance({ state, onAdvance, onRepeat }) {
  const week = state.week;
  const last = week >= TOTAL_WEEKS;
  const items = [...(GATES[week] || []), TENDON_CHECK];
  const [ticked, setTicked] = useState({});
  const [confirmRepeat, setConfirmRepeat] = useState(false);
  const needsTest = TEST_WEEKS.includes(week) && !state.tests[`w${week}`];
  const allTicked = items.every((_, i) => ticked[i]);
  const next = week + 1;

  return (
    <section className="mt-9 border-t border-neutral-800 pt-7">
      <Eyebrow>{last ? "Afronden" : `Naar week ${next}`}</Eyebrow>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
        {last
          ? "Klaar met week 10 en de test? Dan rond je het schema af."
          : GATES[week]
            ? `In week ${next} begint een zwaardere stap. Ga pas door als dit klopt:`
            : "Ga door als dit klopt:"}
      </p>

      <ul className="mt-3">
        {items.map((t, i) => (
          <li key={i}>
            <button onClick={() => setTicked({ ...ticked, [i]: !ticked[i] })} aria-pressed={!!ticked[i]}
              className={`flex w-full items-start gap-3 py-2.5 text-left ${RING}`}>
              <span className="mt-px"><Check on={!!ticked[i]} /></span>
              <span className="text-[13px] leading-snug text-neutral-200">{t}</span>
            </button>
          </li>
        ))}
      </ul>

      {!allTicked && (
        <Note>
          Klopt iets nog niet? Blijf dan op hetzelfde niveau en zet geen stap naar zwaarder. Te vroeg te moeilijk vertraagt je of leidt tot blessures.
        </Note>
      )}

      <button onClick={onAdvance} disabled={needsTest}
        className={`mt-5 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
        style={needsTest ? { border: "1px solid #1F1F1F" } : allTicked ? { backgroundColor: ACCENT, color: "#0A0A0A" } : { backgroundColor: "#1F1F1F", color: "#FAFAFA" }}>
        {needsTest ? "Doe eerst de test hierboven" : last ? (allTicked ? "Schema afronden" : "Toch afronden") : allTicked ? `Naar week ${next}` : `Toch naar week ${next}`}
      </button>

      {!confirmRepeat ? (
        <button onClick={() => setConfirmRepeat(true)}
          className={`mt-2 w-full rounded-xl border border-neutral-800 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>
          Week {week} herhalen
        </button>
      ) : (
        <div className="mt-2 rounded-xl border border-neutral-800 p-4">
          <p className="text-[13px] leading-relaxed text-neutral-300">
            Je vinkjes van deze week gaan weg en je begint week {week} opnieuw. Je test blijft staan.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setConfirmRepeat(false); onRepeat(); }}
              className={`flex-1 rounded-lg py-3 text-[11px] font-bold uppercase tracking-[0.16em] ${RING}`}
              style={{ backgroundColor: "#1F1F1F", color: "#FAFAFA" }}>
              Herhalen
            </button>
            <button onClick={() => setConfirmRepeat(false)}
              className={`flex-1 rounded-lg border border-neutral-700 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Klaar ---------- */

function Finished({ state, onProgress, onRestart }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <main className="px-5">
      <WeekBar week={TOTAL_WEEKS} finished />
      <Eyebrow className="mt-5">Week {TOTAL_WEEKS} · Afgerond</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">Tien weken,<br />klaar.</h1>
      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
        Je tests van week 6 en 10 staan naast elkaar in Voortgang.
      </p>
      <button onClick={onProgress}
        className={`mt-6 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
        style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
        Bekijk je voortgang
      </button>
      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          className={`mt-2 w-full rounded-xl border border-neutral-800 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>
          Nieuwe ronde beginnen
        </button>
      ) : (
        <div className="mt-2 rounded-xl border border-neutral-800 p-4">
          <p className="text-[13px] leading-relaxed text-neutral-300">
            Je begint weer bij week 1. De tests van deze ronde blijven bewaard bij Voortgang.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={onRestart}
              className={`flex-1 rounded-lg py-3 text-[11px] font-bold uppercase tracking-[0.16em] ${RING}`}
              style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
              Begin bij week 1
            </button>
            <button onClick={() => setConfirm(false)}
              className={`flex-1 rounded-lg border border-neutral-700 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Schema ---------- */

function Schema({ current }) {
  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Het schema</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
        Pezen passen zich pas na 6–8 weken aan (Tendon Strength). Daarom eerst zes weken gecontroleerd opbouwen —
        de consolidatiefase die de bron aanraadt voor beginners die snel vooruitgaan — en pas in week 7–10 de zwaardere stappen.
      </p>

      <Section title="Elke week" className="mt-7">
        <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
          {DAYS.map((dk) => {
            const k = KINDS[RHYTHM[dk]];
            return (
              <li key={dk} className="flex items-start gap-3 bg-neutral-900 px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0" style={{ backgroundColor: k.color }} />
                <span className="w-9 shrink-0 text-[13px] font-bold">{dk.charAt(0).toUpperCase() + dk.slice(1)}</span>
                <span className="text-[13px] leading-relaxed text-neutral-300">{k.note}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-neutral-500">
          Afwisselend zwaar en licht trainen, en alleen kort echt zwaar gaan, komt uit de peesvideo. De basisoefeningen
          minstens twee keer per week komt van MattButtersThenics. Vaak balans oefenen komt van Jacob Juul Hansen.
        </p>
      </Section>

      <Section title="Basisoefeningen" className="mt-7">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: KINDS.zwaar.color }}>Zware dag</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-300">{BASE_HEAVY}</p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: KINDS.licht.color }}>Lichte dag</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-300">{BASE_LIGHT}</p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Warming-up · 5–10 min</div>
            <div className="mt-1"><Bullets items={WARMUP} /></div>
          </div>
        </div>
      </Section>

      <Section title="Per week" className="mt-8">
        <div className="space-y-3">
          {BLOCKS.map((b) => {
            const isNow = current && b.weeks.includes(current);
            return (
              <React.Fragment key={b.weeks[0]}>
                {b.weeks[0] === 7 && (
                  <div className="py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">Vanaf hier: zwaardere stappen</div>
                )}
                <div className="rounded-2xl border bg-neutral-900 p-4" style={{ borderColor: isNow ? ACCENT : "#262626" }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[15px] font-bold">Week {b.weeks[0]}–{b.weeks[1]}</span>
                    {isNow && <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Nu · week {current}</span>}
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {PARTS.filter(([id]) => b[id]).map(([id, label]) => (
                      <li key={id}>
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{label}</div>
                        <div className="mt-0.5 text-[13px] leading-relaxed text-neutral-300">{b[id]}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                {TEST_WEEKS.includes(b.weeks[1]) && (
                  <div className="flex items-center gap-2 px-1 text-[12px] leading-relaxed text-neutral-400">
                    <span style={{ color: ACCENT }}>◆</span>
                    {b.weeks[1] === 6
                      ? "Eind week 6: test je max pull-ups en kijk welke skills ✅ zijn."
                      : "Eind week 10: test opnieuw en werk de voortgangstabel bij."}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Section>

      <Section title="Wanneer je doorgaat" className="mt-8">
        <Bullets items={[
          "Frog stand: stabiel, ook als je een beetje uit balans raakt.",
          "L-sit: vasthouden zonder trillen.",
          "Skin the cat: gecontroleerd heen en terug.",
          "Muscle-up-werk: pas bij 8–10 strikte pull-ups (MattButtersThenics).",
          "Handstand: eerst veilig leren afbreken, dan pas vasthouden.",
        ]} />
      </Section>

      <Section title="Veiligheid" className="mt-8">
        <Bullets items={[
          "Sla geen skills over. Te vroeg te moeilijk vertraagt je of leidt tot blessures.",
          "Voelen je pezen pijnlijk, of ga je erg snel? Blijf dan op hetzelfde niveau en zet geen stap naar zwaarder (Tendon Strength).",
          STATIC_LIMIT,
        ]} />
      </Section>

      <Section title="Waar de bronnen het oneens zijn" className="mt-8">
        <Bullets muted items={[
          "Handstand: kick-up eerst of muur eerst. Dit schema combineert beide vanaf week 7.",
          "Elbow lever: optioneel. Een extra als je frog stand vastloopt.",
        ]} />
      </Section>
    </main>
  );
}

/* ---------- Voortgang ---------- */

function Progress({ state }) {
  const t6 = state.tests.w6;
  const t10 = state.tests.w10;
  const cell = (t, s) => {
    if (!t || !s.weeks.includes(t === t6 ? 6 : 10)) return <span className="text-neutral-700">—</span>;
    return t.skills?.[s.id] ? <span style={{ color: ACCENT }}>✅</span> : <span className="text-neutral-600">nog niet</span>;
  };
  const doneWeeks = state.log.filter((l) => l.action === "door").length;
  const repeats = state.log.filter((l) => l.action === "herhaald");

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Voortgang</h1>

      <div className="mt-5 flex gap-8 border-y border-neutral-800 py-5">
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{doneWeeks}</div>
          <Eyebrow className="mt-2">van {TOTAL_WEEKS} weken af</Eyebrow>
        </div>
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{repeats.length}</div>
          <Eyebrow className="mt-2">{repeats.length === 1 ? "week herhaald" : "weken herhaald"}</Eyebrow>
        </div>
      </div>

      <Section title="Voortgangstabel" className="mt-7">
        {!t6 && !t10 ? (
          <p className="text-[13px] leading-relaxed text-neutral-500">De eerste test is aan het eind van week 6. Daarna staat hij hier.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-800">
            <div className="grid grid-cols-[1fr_64px_64px] gap-2 bg-neutral-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              <span />
              <span className="text-right">Week 6</span>
              <span className="text-right">Week 10</span>
            </div>
            <div className="grid grid-cols-[1fr_64px_64px] items-baseline gap-2 border-t border-neutral-800 px-4 py-3">
              <span className="text-[13px] text-neutral-300">Max strikte pull-ups</span>
              <span className="text-right text-lg font-bold tabular-nums">{t6 ? t6.pullups : <span className="text-neutral-700">—</span>}</span>
              <span className="text-right text-lg font-bold tabular-nums" style={{ color: t10 ? ACCENT : undefined }}>{t10 ? t10.pullups : <span className="text-neutral-700">—</span>}</span>
            </div>
            {TEST_SKILLS.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_64px_64px] items-baseline gap-2 border-t border-neutral-800 px-4 py-3">
                <span className="text-[13px] leading-snug text-neutral-300">{s.label}</span>
                <span className="text-right text-[11px]">{cell(t6, s)}</span>
                <span className="text-right text-[11px]">{cell(t10, s)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {state.log.length > 0 && (
        <Section title="Verloop" className="mt-8">
          <ul className="space-y-2">
            {[...state.log].reverse().map((l, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-2 text-[13px]">
                <span className="text-neutral-300">
                  Week {l.week} {l.action === "door" ? "afgerond" : "herhaald"}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">{l.sessions} sessies · {shortDate(l.date)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {state.rounds.length > 0 && (
        <Section title="Eerdere rondes" className="mt-8">
          <ul className="space-y-2">
            {state.rounds.map((r, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-2 text-[13px]">
                <span className="text-neutral-300">Ronde {i + 1} · klaar {shortDate(r.finishedAt)}</span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  pull-ups {r.tests?.w6?.pullups ?? "—"} → {r.tests?.w10?.pullups ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}

/* ---------- Navigatie ---------- */

function Nav({ tab, setTab, onExit }) {
  const items = [["week", "Deze week"], ["schema", "Schema"], ["progress", "Voortgang"]];
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-neutral-800 bg-neutral-950">
      <div className="flex">
        {items.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
            className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-[0.16em] ${RING}`}
            style={{ color: tab === k ? ACCENT : "#525252" }}>
            {label}
          </button>
        ))}
        {onExit && (
          <button onClick={onExit}
            className={`flex-1 border-l border-neutral-800 py-4 text-[10px] font-bold uppercase tracking-[0.16em] ${RING}`}
            style={{ color: "#525252" }}>
            ← Plan
          </button>
        )}
      </div>
    </nav>
  );
}
