import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from './supabase.js';

// ─── SKILL DATA ───────────────────────────────────────────────────────────────
const SKILL_WEEKS = {
  1: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Polsopwarming", steps:[
        "Wrist circles: handen plat op grond, maak cirkels met je gewicht. 10 per richting.",
        "Vingers naar achteren: handen plat, vingers richting lichaam, licht druk. 30 sec.",
        "Doe dit vóór elke handstand-sessie — beschermt je polsen op lange termijn.",
      ], goal:"Vaste routine vóór elke sessie" },
      { name:"Chest-to-wall handstand", steps:[
        "Zet handen ±10 cm van de muur. Loop je voeten langs de muur omhoog.",
        "Borst raakt de muur — dit is de startpositie.",
        "Duw de grond actief van je af: schouders naar oren, armen volledig gestrekt. Core en billen aanspannen.",
      ], goal:"3 sets van 30 seconden — dit is de belangrijkste oefening van het hele programma" },
      { name:"Actieve schouderhouding", steps:[
        "Sta in chest-to-wall positie.",
        "Duw je schouders actief naar je oren — alsof je de grond van je af wil duwen.",
        "Houd dit actief door de hele hold. Inzakken = terug naar begin.",
      ], goal:"Schouders actief = kracht. Inzakken = hangen. Voel het verschil." },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Scapulaire pulls", steps:[
        "Hang aan de stang met rechte armen.",
        "Trek je schouderbladen omlaag — armen blijven gestrekt, je gaat iets omhoog.",
        "Laat ze weer ontspannen omhoog zakken.",
      ], goal:"3 sets van 10 herhalingen" },
      { name:"Dead hang", steps:[
        "Hang stil aan de stang, armen gestrekt.",
        "Trek je schouders actief omlaag — niet laten optrekken naar je oren.",
        "Houd deze spanning vast gedurende de hele hang.",
      ], goal:"3 sets van 20 seconden" },
      { name:"Band pull-ups", steps:[
        "Hang een weerstandsband over de stang, steun met je knie erin.",
        "Trek jezelf omhoog tot je kin boven de stang is.",
        "Laat jezelf volledig terug naar beneden zakken — armen helemaal gestrekt.",
      ], goal:"3 sets van 6 herhalingen" },
    ]},
  },
  2: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Chest-to-wall handstand (opbouwen)", steps:[
        "Polsopwarming eerst. Dan chest-to-wall positie: borst aan de muur.",
        "Duw de grond actief van je af, schouders naar oren, core strak.",
        "Probeer elke set iets langer vast te houden dan vorige week.",
      ], goal:"3 sets van 45 seconden" },
      { name:"Kickup niveau 1: split-leg hold", steps:[
        "Ga in pikestand, één been iets voor het andere.",
        "Gooi het achterste been omhoog — stop halverwege in split-leg positie.",
        "Houd de split-leg positie zo lang als je kunt. Terugzetten, herhaal.",
      ], goal:"8-10 pogingen per sessie — focus op stabiele split-leg, niet op volledig omhoog" },
      { name:"Schouders verbinden", steps:[
        "Ga in chest-to-wall. Trek je schouderbladen licht samen vóórdat je de hold begint.",
        "Dan duw je ze omhoog naar oren — dit is de 'vergrendelde' positie.",
        "Houd dit gevoel door de hele set. Schouders = de ruggengraat van je handstand.",
      ], goal:"Voel het verschil tussen los en vergrendeld — zorg voor vergrendeld bij elke hold" },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Band pull-ups (minder steun)", steps:[
        "Gebruik een dunnere band, of steek je knie minder ver erdoorheen.",
        "Trek omhoog tot kin boven stang.",
        "Volledig naar beneden zakken — armen gestrekt.",
      ], goal:"3 sets van 8 herhalingen" },
      { name:"Passief → actief hang", steps:[
        "Hang ontspannen: schouders optrekken naar oren (passief).",
        "Trek nu bewust je schouderbladen omlaag (actief) — voel hoe je iets omhoog gaat.",
        "Wissel dit 5 keer af en voel het verschil.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Negatieve pull-up", steps:[
        "Spring of stap naar bovenpositie: kin boven de stang.",
        "Laat jezelf in 3 seconden gecontroleerd neer — zo langzaam mogelijk.",
        "Laat los, herhaal.",
      ], goal:"3 sets van 3 herhalingen" },
    ]},
  },
  3: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Chest-to-wall handstand (60 sec doel)", steps:[
        "Polsopwarming eerst. Dan chest-to-wall: borst aan de muur.",
        "Actieve schouders, strakke core, billen aanspannen — rechte lijn van hielen tot pols.",
        "Bouw naar 60 seconden toe — doe 2 sets als 60 sec te lang is.",
      ], goal:"3 sets van 45-60 seconden" },
      { name:"Kickup niveau 2: split → langzaam volledig", steps:[
        "Gooi het achterste been omhoog naar split-leg positie.",
        "Breng het voorste been langzaam omhoog tot naast het andere — zo langzaam als je kunt.",
        "Houd de volledige handstand zo lang mogelijk. Val gecontroleerd terug.",
      ], goal:"8-10 pogingen — focus op beheersing van de overgang, niet de tijd boven" },
      { name:"Split-leg muur drill", steps:[
        "Zet handen ±15-20 cm van de muur. Kickup naar split-leg positie.",
        "Tik je achterste teen even van de muur — dan zweven. Zet hem terug.",
        "Volgende poging: laat die voet een seconde hangen zonder muur. Dan steeds langer.",
      ], goal:"10 pogingen per sessie — brug tussen muur en vrije handstand" },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Band pull-ups (nog minder steun)", steps:[
        "Gebruik een nog dunnere band dan vorige week.",
        "Trek omhoog tot kin boven stang.",
        "Volledig naar beneden zakken.",
      ], goal:"3 sets van 10 herhalingen" },
      { name:"Negatieve pull-up (4 sec)", steps:[
        "Spring naar bovenpositie: kin boven de stang.",
        "Laat jezelf in 4 seconden gecontroleerd neer.",
        "Laat los, herhaal.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Vasthouden boven", steps:[
        "Trek jezelf op tot kin boven de stang.",
        "Houd de bovenpositie 2 seconden vast.",
        "Laat daarna gecontroleerd zakken.",
      ], goal:"3 sets van 5 herhalingen" },
    ]},
  },
  4: {
    handstand: { label:"Handstand – Deload", color:"#7C3AED", items:[
      { name:"Lichte chest-to-wall (herstel)", steps:[
        "Chest-to-wall: borst aan de muur, actieve schouders, core strak.",
        "Geen nieuwe doelen — houd de vorm die je hebt opgebouwd.",
        "Stop als iets pijnlijk voelt. Herstel staat centraal.",
      ], goal:"2 sets van 30 seconden" },
      { name:"Polsmobiliteit", steps:[
        "Wrist circles: handen plat op de grond, maak cirkels met je gewicht. 10 per richting.",
        "Vingers naar achteren: handen plat, vingers richting lichaam, licht druk zetten. 30 sec.",
        "Knokkel-steun: steun op gebalde vuisten, zet gewicht erop. 30 sec.",
      ], goal:"2 sets per oefening" },
      { name:"Schoudermobiliteit", steps:[
        "Arm circles: grote cirkels met gestrekte armen, 10 per richting.",
        "Doorway stretch: ellebogen op deurpost schouderhoogte, leun er doorheen. 30 sec.",
        "Overhead reach: armen omhoog gestrekt, leun zijwaarts. 20 sec per kant.",
      ], goal:"2 sets per oefening" },
    ]},
    pullup: { label:"Pull-ups – Deload", color:"#059669", items:[
      { name:"Lichte band pull-ups", steps:[
        "Gebruik de lichtste band die je hebt.",
        "Trek omhoog tot kin boven stang, laat gecontroleerd zakken.",
        "Geen maximale inspanning — herstel staat centraal.",
      ], goal:"2 sets van 6 herhalingen op gevoel" },
      { name:"Dead hang (herstel)", steps:[
        "Hang stil aan de stang, armen gestrekt.",
        "Schouders actief omlaag — niet laten optrekken.",
        "Adem rustig in en uit.",
      ], goal:"2 sets van 20 seconden" },
      { name:"Prioriteit: rust", steps:[
        "Je lichaam wordt sterker in de rustperiodes, niet tijdens de training.",
        "Slaap 7-9 uur per nacht deze week.",
        "Pijn ≠ vooruitgang — sla een oefening over als iets pijnlijk aanvoelt.",
      ], goal:"Fris en uitgerust beginnen aan week 5" },
    ]},
  },
  5: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Chest-to-wall: minimaal muurcontact", steps:[
        "Begin in chest-to-wall. Duw schouders actief naar oren.",
        "Probeer je borst 1-2 cm van de muur te halen — gebruik de muur alleen als vangnet.",
        "Dit bouwt het gevoel voor vrije balans zonder volledig los te zijn.",
      ], goal:"3 sets van 45 seconden" },
      { name:"Kickup niveau 3: efficiënte kick-up", steps:[
        "Gooi het achterste been omhoog — ander been volgt direct en snel.",
        "Benen sluiten in één vloeiende beweging: niet split vasthouden, maar snel sluiten.",
        "Herhaalbaar en consistent maken — dit is de kick-up die je overal gebruikt.",
      ], goal:"10-12 pogingen per sessie" },
      { name:"Heel pull drill (overbalance correctie)", steps:[
        "Kom in handstand (muur of vrij). Ga bewust iets te ver — overbalance.",
        "Grijp de grond met je vingertoppen en druk je voorste knokkels neer.",
        "Voel hoe de druk je terugtrekt. Dit is je reddingslijn bij overbalance.",
      ], goal:"8-10 pogingen — overbalance leren corrigeren via hand/vingerkracht" },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Pull-ups zonder band", steps:[
        "Hang aan de stang zonder hulp.",
        "Trek omhoog tot kin boven stang.",
        "Vul de rest van de set aan met band als je er niet genoeg haalt.",
      ], goal:"3 sets van 3 herhalingen zonder band" },
      { name:"Negatieve pull-up (5 sec)", steps:[
        "Spring naar bovenpositie: kin boven stang.",
        "Laat jezelf in 5 seconden gecontroleerd neer.",
        "Houd spanning in je rug — niet slap neerhangen.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Dead hang", steps:[
        "Hang stil, schouders actief omlaag.",
        "Adem rustig in en uit.",
        "Houd zo lang mogelijk vast.",
      ], goal:"3 sets van 30 seconden" },
    ]},
  },
  6: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Overbalance drill", steps:[
        "Kom in handstand (vrij of muur dichtbij). Ga bewust te ver — overbalance.",
        "Grijp de grond met je vingertips en druk knokkels neer om terug te sturen.",
        "Doel: overbalance herkennen én corrigeren voordat je valt.",
      ], goal:"8-10 pogingen — bewust oefenen is sneller leren dan per ongeluk vallen" },
      { name:"Underbalance strategie 1: schouders", steps:[
        "Kom in handstand. Laat je bewust te veel terugkantelen — underbalance.",
        "Herstel: plant je schouders neer (borst sluiten) om voorwaarts gewicht te pakken.",
        "Dit is de snelste correctie voor kleine underbalance — leer het als reflex.",
      ], goal:"6-8 pogingen per sessie" },
      { name:"Underbalance strategie 2: heup/onderrug", steps:[
        "Kom in handstand. Laat je opnieuw te ver terug kantelen.",
        "Herstel: activeer je onderrug en heupen om je lichaam terug te buigen.",
        "Verschilt van schouderstrategie — grotere correctie, meer tijd. Combineer beide.",
      ], goal:"6-8 pogingen per sessie" },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Pull-ups zonder band", steps:[
        "Hang zonder hulp.",
        "Trek omhoog — schouderbladen eerst omlaag, dan omhoog trekken.",
        "Kin boven stang, dan volledig naar beneden.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Negatieve pull-up (6 sec)", steps:[
        "Spring naar bovenpositie.",
        "Laat jezelf in 6 seconden gecontroleerd neer.",
        "Houd spanning in je rug — niet slap neerhangen.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Band pull-aparts", steps:[
        "Houd een band voor je op schouderbreedte, armen gestrekt.",
        "Trek de band uiteen tot armen gestrekt naar de zijkanten zijn.",
        "Houd 1 sec vast, dan terug.",
      ], goal:"2 sets van 15 herhalingen" },
    ]},
  },
  7: {
    handstand: { label:"Handstand", color:"#7C3AED", items:[
      { name:"Vrije handstand (volume)", steps:[
        "Kick-up (niveau 3) → benen sluiten → balanceer zo lang je kunt.",
        "Stuur bij met vingertips (overbalance) of schouders/heupen (underbalance).",
        "Rust 60 sec tussen pogingen. Film jezelf als je kunt — check je lijn van opzij.",
      ], goal:"8-10 pogingen per sessie, doel: 3-5 seconden aaneengesloten" },
      { name:"Kick-up als één vloeiende beweging", steps:[
        "Niet drie losse stappen. Been omhoog → ander been volgt direct → sluiten: één flow.",
        "Gooi bewust iets te ver om te zoeken naar de 'sweet spot' van equilibrium.",
        "Herhaalbaar en consistent maken — dit is jouw standaard kick-up.",
      ], goal:"10+ pogingen — focus op herhaling en consistentie" },
      { name:"Chest-to-wall onderhoud", steps:[
        "Chest-to-wall: borst aan de muur, actieve schouders, strakke lijn.",
        "Minimaal muurcontact — gebruik hem alleen als vangnet.",
        "Dit houdt je basissterkte en lichaamsgevoel scherp.",
      ], goal:"2 sets van 45 seconden" },
    ]},
    pullup: { label:"Pull-ups", color:"#059669", items:[
      { name:"Pull-ups zonder band", steps:[
        "Hang zonder hulp.",
        "Trek omhoog — kin boven stang.",
        "Volledig naar beneden, herhaal.",
      ], goal:"5 sets van 5 herhalingen" },
      { name:"Negatieve pull-up (8 sec)", steps:[
        "Spring naar bovenpositie.",
        "Laat jezelf in 8 seconden gecontroleerd neer — zo langzaam als je kunt.",
        "Houd spanning in je rug.",
      ], goal:"3 sets van 5 herhalingen" },
      { name:"Dead hang", steps:[
        "Hang stil, schouders actief omlaag.",
        "Probeer zo lang mogelijk vast te houden.",
        "Adem rustig.",
      ], goal:"3 sets van 45 seconden" },
    ]},
  },
  8: {
    handstand: { label:"Handstand – Testweek", color:"#7C3AED", items:[
      { name:"TEST: vrije handstand", steps:[
        "Warm op: polsopwarming + 5 chest-to-wall (30 sec).",
        "Doe je beste kick-up en balanceer zo lang als je kunt.",
        "Noteer de seconden van je beste poging. Rust 2-3 minuten. 3 pogingen totaal.",
      ], goal:"Noteer je beste poging — eerlijk meten, geen hulp van muur" },
      { name:"TEST: kick-up efficiëntie", steps:[
        "Doe 5 kick-ups zo consistent en efficiënt mogelijk.",
        "Noteer: hoe snel sluiten je benen? Kom je direct in evenwicht of moet je veel bijsturen?",
        "Dit laat zien of de kick-up je sterke of zwakke schakel is.",
      ], goal:"Reflecteer op je kick-up kwaliteit — schrijf het op in de notitie" },
      { name:"Reflecteer op de cyclus", steps:[
        "Wat was de limiterende factor: kracht, balans, angst of techniek?",
        "Overbalance of underbalance — welke kant val je vaker op?",
        "Dit bepaalt de focus van week 9-10.",
      ], goal:"Inzicht voor de eindsprint" },
    ]},
    pullup: { label:"Pull-ups – Testweek", color:"#059669", items:[
      { name:"TEST: maximaal aantal pull-ups", steps:[
        "Doe de test als allereerste oefening — volledig uitgerust.",
        "Hang zonder band, trek omhoog tot kin boven stang, herhaal tot je niet meer kunt.",
        "Noteer het aantal.",
      ], goal:"Doel: 10 herhalingen — noteer je score" },
      { name:"Reflecteer op de pull-up progressie", steps:[
        "Wat voelde zwaar — de start, de bovenkant of de uithouding?",
        "Hoe verliep het vergeleken met week 1?",
        "Dit helpt bij de eindsprint.",
      ], goal:"Inzicht voor week 9-10" },
      { name:"Score vastleggen", steps:[
        "Noteer je tussentijdse resultaten.",
        "Vergelijk met week 1.",
        "Pas je schema voor week 9 aan op basis van je scores.",
      ], goal:"Startpunt eindsprint" },
    ]},
  },
  9: {
    handstand: { label:"Handstand – Verdieping", color:"#7C3AED", items:[
      { name:"Vrije handstand (hoog volume)", steps:[
        "15+ pogingen per sessie. Rust 45-60 sec tussen pogingen.",
        "Doel: 5-8 seconden op je beste poging. Film jezelf om je lijn te checken.",
        "Zoek actief de grens van over- en underbalance op — zo leer je sneller.",
      ], goal:"15+ pogingen, beste poging ≥ 5 seconden" },
      { name:"Beide correctiestrategieën combineren", steps:[
        "Bij overbalance: vingertips grijpen, knokkels drukken — halt.",
        "Bij underbalance: schouders eerst (snel), dan heupen als extra correctie.",
        "Wissel bewust van strategie per poging om beide te automatiseren.",
      ], goal:"Per poging: benoem welke strategie je gebruikte. Zo bouw je bewuste reflex op." },
      { name:"Split-leg muur drill verfijnen", steps:[
        "Handen 15-20 cm van muur. Kickup naar split-leg.",
        "Laat de achterste voet langer zweven — bouw op van 1 naar 3 seconden.",
        "Poging: beide benen in één beweging sluiten zonder muurcontact.",
      ], goal:"10 pogingen — dit is de brug naar volledig vrij" },
    ]},
    pullup: { label:"Pull-ups – Verdieping", color:"#059669", items:[
      { name:"Pull-ups (volume)", steps:[
        "Trek omhoog tot kin boven stang — schone herhaling, geen kip.",
        "Volledig naar beneden — armen helemaal gestrekt.",
        "Rust 90 seconden tussen sets.",
      ], goal:"4 sets van 8 herhalingen" },
      { name:"Archer pull-up (introductie)", steps:[
        "Hang met brede grip.",
        "Trek één arm recht, buig de andere — kin beweegt naar de gebogen kant.",
        "Wissel kant per set.",
      ], goal:"3 sets van 5 herhalingen per kant" },
      { name:"L-sit hang", steps:[
        "Hang aan de stang, hef benen gestrekt tot horizontaal.",
        "Core stijf — geen zwaaien.",
        "Zo lang mogelijk vasthouden.",
      ], goal:"3 sets van 10 seconden" },
    ]},
  },
  10: {
    handstand: { label:"Handstand – Finale", color:"#7C3AED", items:[
      { name:"TEST: vrije handstand 10 seconden", steps:[
        "Warm op: polsopwarming + 3 chest-to-wall (30 sec).",
        "Doe je beste kick-up en balanceer zo lang als je kunt.",
        "3 pogingen met 2 minuten rust — noteer je beste tijd in de notitie.",
      ], goal:"Doel: 10 seconden aaneengesloten" },
      { name:"TEST: handstand walk", steps:[
        "Kick-up → balanceer → zet stappen op je handen.",
        "Verplaats gewicht via je vingertoppen — kleine, gecontroleerde stappen.",
        "3 pogingen met 2 minuten rust — noteer stappen of afstand.",
      ], goal:"Doel: zo ver als je kunt — elke stap is vooruitgang" },
      { name:"Terugblik en cyclus 2", steps:[
        "Vergelijk je score van week 8 (tussentest) met nu — wat is verbeterd?",
        "Wat was de limiterende factor: overbalance, underbalance, kick-up of kracht?",
        "Noteer je startpunt voor cyclus 2 — dit is waar week 1 van de volgende cyclus begint.",
      ], goal:"Startpunt cyclus 2 bepalen" },
    ]},
    pullup: { label:"Pull-ups – Finale", color:"#059669", items:[
      { name:"TEST: maximaal pull-ups", steps:[
        "Eerste oefening — volledig uitgerust.",
        "Hang zonder band, trek tot kin boven stang, herhaal tot je niet meer kunt.",
        "Noteer het exacte aantal.",
      ], goal:"Doel: 15 herhalingen" },
      { name:"Terugblik pull-up progressie", steps:[
        "Vergelijk: week 1 vs. nu — hoeveel meer?",
        "Zwaarste moment: start, bovenkant of uithouding?",
        "Dit bepaalt de focus van cyclus 2.",
      ], goal:"Inzicht voor cyclus 2" },
      { name:"Scores vastleggen", steps:[
        "Noteer beide testresultaten in het notitiefeld.",
        "Vergelijk met je startsituatie 10 weken geleden.",
        "Plan je volgende 10 weken op basis hiervan.",
      ], goal:"Cyclus 2 startpunt gereed" },
    ]},
  },
};

const DAYS       = ["ma","di","wo","do","vr","za","zo"];
const SKILL_DAYS = ["ma","di","wo","do","vr","za"]; // no sunday for skill planning
const DAY_LABELS = { ma:"Maandag", di:"Dinsdag", wo:"Woensdag", do:"Donderdag", vr:"Vrijdag", za:"Zaterdag", zo:"Zondag" };
const DAY_SHORT  = { ma:"Ma", di:"Di", wo:"Wo", do:"Do", vr:"Vr", za:"Za", zo:"Zo" };
const SKILL_KEYS = ["handstand","pullup"];
const RATINGS    = ["Te makkelijk","Goed","Zwaar","Niet gelukt"];
const RATING_COLORS = ["#059669","#7C3AED","#D97706","#DC2626"];
const PHASE_LABELS  = ["Fundament","Fundament","Opbouw","Opbouw · Deload","Intensificatie","Intensificatie","Consolidatie","Testweek","Verdieping","Finale"];

const DEFAULT_SKILL_SCHEDULE = { handstand:["ma","wo","vr"], pullup:["di","do","za"] };
const DEFAULT_SKILL_LEVEL    = { handstand:1, pullup:1 };

function adaptSkillSchedule(prevSchedule, prevLevel, ratings) {
  const schedule = {}, level = {}, reasons = {};
  const usedSoFar = new Set();
  for (const skill of SKILL_KEYS) {
    const curDays  = (prevSchedule||DEFAULT_SKILL_SCHEDULE)[skill] || [];
    const curLevel = (prevLevel||DEFAULT_SKILL_LEVEL)[skill] || 1;
    const ri       = RATINGS.indexOf(ratings[skill]);
    let newLevel = curLevel, newDays = [...curDays], reason = "";
    if (ri === 0) { // Te makkelijk → niveau omhoog + dag erbij
      newLevel = Math.min(10, curLevel + 1);
      if (newDays.length < 5) {
        const extra = SKILL_DAYS.find(d => !newDays.includes(d) && !usedSoFar.has(d));
        if (extra) newDays = [...newDays, extra].sort((a,b)=>SKILL_DAYS.indexOf(a)-SKILL_DAYS.indexOf(b));
      }
      reason = "te makkelijk → niveau omhoog, +1 dag";
    } else if (ri === 1) { // Goed → niveau omhoog
      newLevel = Math.min(10, curLevel + 1);
      reason = "goed → niveau omhoog";
    } else if (ri === 2) { // Zwaar → zelfde niveau bewaren
      reason = "zwaar → zelfde niveau bewaren";
    } else if (ri === 3) { // Niet gelukt → zelfde niveau, 1 dag minder
      if (newDays.length > 1) newDays = newDays.slice(0,-1);
      reason = "niet gelukt → herhalen, 1 dag minder";
    } else {
      reason = "geen beoordeling, zelfde schema";
    }
    newDays.forEach(d => usedSoFar.add(d));
    schedule[skill] = newDays;
    level[skill]    = newLevel;
    reasons[skill]  = reason;
  }
  return { schedule, level, reasons };
}

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
const mkWeek = (n, skillSchedule=DEFAULT_SKILL_SCHEDULE, skillLevel=DEFAULT_SKILL_LEVEL, adaptReason=null) => ({
  weekNum:n, days:Object.fromEntries(DAYS.map(d=>[d,mkDay()])),
  ratings:{}, note:"", done:false, skillSchedule, skillLevel, adaptReason,
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
  return data.map(week=>({
    ...week,
    skillSchedule: week.skillSchedule || DEFAULT_SKILL_SCHEDULE,
    skillLevel:    week.skillLevel    || DEFAULT_SKILL_LEVEL,
    adaptReason:   week.adaptReason   || null,
    days:Object.fromEntries(Object.entries(week.days).map(([k,day])=>[k,{
      ...day,
      showMorningDbModal:false, showDbModal:false,
      showMorningRoutineModal:false, showRoutineModal:false,
      morningType: day.morningType||null,
      type: day.type||null,
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

// ─── WORKOUT MODE ─────────────────────────────────────────────────────────────
function WorkoutMode({exercises, onClose}) {
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
  const [restDef,  setRestDef]  = useState({side:30, set:60, ex:90});

  const nextRef     = useRef(null);
  const speechOnRef = useRef(true);
  const restDefRef  = useRef(restDef);
  useEffect(() => { restDefRef.current = restDef; }, [restDef]);
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
              background:C.purple,color:"#fff",border:"none",borderRadius:14,
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
              background:C.purple,color:"#fff",border:"none",borderRadius:16,
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

// ─── SECTION BLOCK (reusable for morning + evening exercises) ─────────────────
function ExerciseBlock({exercises,onChange,db,onSaveToDb,accentColor,accentBg,genLabel,onGenerate,setsPlaceholder,onOpenDbModal,onStartWorkout}) {
  const updEx = (i,v) => { const e=[...exercises]; e[i]=v; onChange(e); };
  const delEx = i => onChange(exercises.filter((_,j)=>j!==i));
  const addEx = () => onChange([...exercises,{name:"",sets:""}]);
  const validCount = exercises.filter(e=>e.name&&e.name.trim()).length;

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        {onGenerate&&<Btn onClick={onGenerate} variant="subtle" size="sm">✦ {genLabel}</Btn>}
        {onOpenDbModal&&<Btn onClick={onOpenDbModal} variant="subtle" size="sm">⊕ Uit database</Btn>}
        <Btn onClick={addEx} variant={accentBg===C.amberLight?"amber":"purple"} size="sm">+ Nieuw</Btn>
        {onStartWorkout&&validCount>0&&(
          <Btn onClick={()=>onStartWorkout(exercises)} variant="primary" size="sm">▶ Start</Btn>
        )}
      </div>
      {exercises.length>0&&(
        <div style={{fontSize:11,color:C.textMuted,marginBottom:10,fontFamily:mono}}>
          <span style={{color:C.textMuted,fontFamily:font,fontStyle:"italic"}}>Sets: </span>
          3×10 herh. · 3×30s tijd · e/s per zijde
        </div>
      )}
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

// ─── SKILL PLANNER ────────────────────────────────────────────────────────────
const SKILL_INFO = {
  handstand:{label:"Handstand",color:"#7C3AED",bg:"#EDE9FD",emoji:"🤸"},
  pullup:{label:"Pull-ups",color:"#059669",bg:"#D1FAE5",emoji:"💪"},
};

function SkillPlanner({week, onChangeSchedule}) {
  const schedule = week.skillSchedule || DEFAULT_SKILL_SCHEDULE;
  const level    = week.skillLevel    || DEFAULT_SKILL_LEVEL;

  const toggleDay = (skill, day) => {
    const cur  = schedule[skill] || [];
    const next = cur.includes(day)
      ? cur.filter(d=>d!==day)
      : [...cur,day].sort((a,b)=>SKILL_DAYS.indexOf(a)-SKILL_DAYS.indexOf(b));
    onChangeSchedule({...schedule,[skill]:next});
  };

  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12,boxShadow:C.shadow}}>
      {week.adaptReason&&!week.done&&(
        <div style={{fontSize:11,color:C.textMuted,marginBottom:10,padding:"6px 10px",background:C.surfaceAlt,borderRadius:7,lineHeight:1.6}}>
          ↻ Aangepast op basis van vorige week: {week.adaptReason}
        </div>
      )}
      <div style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Skill planning</div>
      {SKILL_KEYS.map((skill,si)=>{
        const info = SKILL_INFO[skill];
        const days = schedule[skill]||[];
        const lvl  = level[skill]||1;
        return (
          <div key={skill} style={{display:"flex",alignItems:"center",gap:8,marginBottom:si<SKILL_KEYS.length-1?8:0}}>
            <div style={{minWidth:88,fontSize:12,fontWeight:600,color:info.color}}>
              {info.emoji} {info.label}
            </div>
            <div style={{display:"flex",gap:3,flex:1}}>
              {SKILL_DAYS.map(d=>{
                const active=days.includes(d);
                return (
                  <button key={d} onClick={()=>!week.done&&toggleDay(skill,d)} style={{
                    width:34,height:28,borderRadius:6,border:"none",fontFamily:font,
                    background:active?info.color:C.surfaceAlt,
                    color:active?"#fff":C.textMuted,
                    fontSize:11,fontWeight:600,cursor:week.done?"default":"pointer",
                    transition:"all .15s",opacity:week.done?0.6:1,
                  }}>{DAY_SHORT[d]}</button>
                );
              })}
            </div>
            <div style={{fontSize:11,color:C.textMuted,whiteSpace:"nowrap"}}>niv.{lvl} · {days.length}×</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DAY CARD ─────────────────────────────────────────────────────────────────
function DayCard({dayKey,day,weekNum,skillSchedule,skillLevel,onChange,db,onSaveToDb,routines,onUpdateRoutine}) {
  const [open,setOpen] = useState(false);
  const [workoutExs,setWorkoutExs] = useState(null);
  const sched    = skillSchedule || DEFAULT_SKILL_SCHEDULE;
  const lvls     = skillLevel    || DEFAULT_SKILL_LEVEL;
  const skillKey = SKILL_KEYS.find(sk=>(sched[sk]||[]).includes(dayKey)) || null;
  const skillLvl = skillKey ? Math.min(lvls[skillKey]||weekNum, 10) : weekNum;
  const skill    = skillKey ? (SKILL_WEEKS[skillLvl]?.[skillKey]||null) : null;
  const isRest   = dayKey==="zo";

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
    <>
    {workoutExs&&<WorkoutMode exercises={workoutExs} onClose={()=>setWorkoutExs(null)} />}
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
                  onOpenDbModal={()=>upd({showMorningDbModal:true})}
                  onStartWorkout={setWorkoutExs} />
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
                      setsPlaceholder="60s"
                      onStartWorkout={setWorkoutExs} />
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
                    onOpenDbModal={()=>upd({showDbModal:true})}
                    onStartWorkout={setWorkoutExs} />
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
                        accentColor={C.green} accentBg={C.greenLight}
                        onStartWorkout={setWorkoutExs} />
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
                <div key={i} style={{marginBottom: i<skill.items.length-1?12:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:skill.color,marginBottom:5}}>{item.name}</div>
                  {item.steps.map((step,j)=>(
                    <div key={j} style={{display:"flex",gap:7,fontSize:12,color:C.textSub,alignItems:"flex-start",marginBottom:3}}>
                      <span style={{color:skill.color,fontWeight:700,flexShrink:0,minWidth:16,opacity:0.7}}>{j+1}.</span>
                      <span style={{lineHeight:1.5}}>{step}</span>
                    </div>
                  ))}
                  {item.goal&&(
                    <div style={{fontSize:11,color:C.textMuted,marginTop:5,paddingLeft:23,fontStyle:"italic"}}>
                      → {item.goal}
                    </div>
                  )}
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
    </>
  );
}

// ─── WEEK EVAL ────────────────────────────────────────────────────────────────
function WeekEval({week,onSave}) {
  const [ratings,setRatings] = useState(week.ratings||{});
  const [note,setNote] = useState(week.note||"");
  const skills = SKILL_WEEKS[Math.min(week.weekNum,10)];

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

  // Re-pull from Supabase when the user switches back to this tab.
  // Skip if we just wrote data locally — the Supabase write may still be in flight
  // and we'd risk overwriting our own unsaved changes with stale remote data.
  const pullSync = useCallback(async()=>{
    if(!supabase) return;
    if(Date.now() - lastLocalSaveMs < 5000) return;
    const key = getSyncKey();
    const {data} = await supabase.from('trainingsplan').select('*').eq('sync_key',key).maybeSingle();
    if(!data) return;
    if(data.weeks)       { localStorage.setItem(STORAGE_KEY,   JSON.stringify(data.weeks));       setWeeks(migrateWeeks(data.weeks)); }
    if(data.exercise_db) { localStorage.setItem(DB_KEY,        JSON.stringify(data.exercise_db)); setDb(data.exercise_db); }
    if(data.routines)    { localStorage.setItem(ROUTINES_KEY,  JSON.stringify(data.routines));    setRoutines(data.routines); }
  },[]);

  useEffect(()=>{
    const onVisible = ()=>{ if(document.visibilityState==='visible') pullSync(); };
    document.addEventListener('visibilitychange', onVisible);
    return ()=> document.removeEventListener('visibilitychange', onVisible);
  },[pullSync]);

  const persist         = useCallback((w)=>{setWeeks(w);saveData(w);},[]);
  const persistDb       = useCallback((d)=>{setDb(d);saveDb(d);},[]);
  const persistRoutines = useCallback((r)=>{setRoutines(r);saveRoutines(r);},[]);

  const updateSkillSchedule = useCallback((wi,schedule) => {
    setWeeks(prev=>{
      const next=prev.map((wk,i)=>i!==wi?wk:{...wk,skillSchedule:schedule});
      saveData(next);
      return next;
    });
  },[]);

  const updateDay = useCallback((wi,dk,val) => {
    setWeeks(prev => {
      const next = prev.map((wk,i)=>i!==wi?wk:{...wk,days:{...wk.days,[dk]:val}});
      saveData(next);
      return next;
    });
  }, []);
  const closeWeek = (wi,ratings,note) => {
    const closed = {...weeks[wi],ratings,note,done:true};
    const w = weeks.map((wk,i)=>i!==wi?wk:closed);
    const next = closed.weekNum+1;
    if(next<=10&&!w.find(wk=>wk.weekNum===next)){
      const {schedule,level,reasons} = adaptSkillSchedule(closed.skillSchedule,closed.skillLevel,ratings);
      const reason = SKILL_KEYS.map(k=>`${SKILL_WEEKS[1][k].label}: ${reasons[k]}`).join(' · ');
      w.push(mkWeek(next,schedule,level,reason));
    }
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
  const skills = SKILL_WEEKS[Math.min(aw.weekNum,10)];

  const TABS = [["plan","Plan"],["routines","Routines"],["history","Geschiedenis"],["database","Database"]];

  return (
    <div style={{fontFamily:font,background:C.bg,minHeight:"100vh",color:C.text}}>

      {/* ── Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 0"}}>
            <div>
              <h1 style={{fontSize:18,fontWeight:700,color:C.text,margin:0,letterSpacing:"-0.3px"}}>Trainingsplan</h1>
              <div style={{fontSize:12,color:C.textMuted,marginTop:1}}>Handstand · Pull-ups · 10 weken</div>
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
            {(()=>{
              const awSched = aw.skillSchedule||DEFAULT_SKILL_SCHEDULE;
              return (
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,marginBottom:12,boxShadow:C.shadow}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5}}>{PHASE_LABELS[Math.min(aw.weekNum-1,9)]}</div>
                    <div style={{fontSize:19,fontWeight:700,color:C.text}}>Week {aw.weekNum}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {SKILL_KEYS.map(sk=>(
                      <Tag key={sk} color={SKILL_INFO[sk].color} bg={SKILL_INFO[sk].bg}>
                        {SKILL_INFO[sk].emoji} {(awSched[sk]||[]).length}×
                      </Tag>
                    ))}
                  </div>
                </div>
              );
            })()}

            <SkillPlanner week={aw} onChangeSchedule={s=>updateSkillSchedule(activeIdx,s)} />

            {DAYS.map(d=>(
              <DayCard key={d} dayKey={d} day={aw.days[d]} weekNum={aw.weekNum}
                skillSchedule={aw.skillSchedule} skillLevel={aw.skillLevel}
                onChange={v=>updateDay(activeIdx,d,v)} db={db}
                routines={routines} onUpdateRoutine={updateRoutineExercises}
                onSaveToDb={(section,partId,name)=>{
                  const newEx={id:mkId(),name,uitleg:"",video:""};
                  persistDb({...db,[section]:db[section].map(p=>p.id===partId?{...p,exercises:[...p.exercises,newEx]}:p)});
                }} />
            ))}

            {!aw.done&&aw.weekNum<=10&&<WeekEval week={aw} onSave={(r,n)=>closeWeek(activeIdx,r,n)} />}

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
