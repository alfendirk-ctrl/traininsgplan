import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   DAGELIJKSE MOBILITEIT — 8 weken, één korte sessie per dag
   Zelfde vorm als de Reps-app: 56 dagen, een nulmeting op dag 1,
   een hermeting op dag 56 en per week iets meer werk.
   Het verschil: je kiest één hoofdfocus — het lichaamsdeel waar je
   nu het meeste last van hebt. Dat gebied komt elke dag terug en
   krijgt het grootste deel van de sessie; de andere gebieden
   rouleren eromheen zodat je niet eenzijdig wordt.
   ============================================================ */

export const MOBILITY_STORAGE_KEY = "dailymobility:v1";
const KEY = MOBILITY_STORAGE_KEY;
const TOTAL_DAYS = 56;
const ACCENT = "#5AA9E6";

/* window.storage bestaat niet in deze app; val terug op localStorage met
   dezelfde vorm ({value} terug uit get). */
const storage =
  (typeof window !== "undefined" && window.storage) || {
    async get(k) { const v = localStorage.getItem(k); return v == null ? null : { value: v }; },
    async set(k, v) { localStorage.setItem(k, v); },
  };

/* ---------- Lichaamsdelen ---------- */

const REGIONS = {
  hip:       { label: "Heup",         short: "Heup",     color: "#5AA9E6", hint: "Heupbuigers, liezen, rotatie" },
  hamstring: { label: "Hamstrings",   short: "Hams",     color: "#6FD3C7", hint: "Achterketen: hamstrings en bilspieren" },
  spine:     { label: "Rug",          short: "Rug",      color: "#B79BE8", hint: "Onderrug en borstwervelkolom" },
  shoulder:  { label: "Schouder",     short: "Schouder", color: "#E8A05A", hint: "Schouders, borst en lats" },
  ankle:     { label: "Enkel & voet", short: "Enkel",    color: "#E4C05A", hint: "Enkelbuiging, kuit en voetboog" },
  wrist:     { label: "Pols",         short: "Pols",     color: "#D98A9E", hint: "Polsen en onderarmen" },
  flow:      { label: "Flow",         short: "Flow",     color: "#9AA0A6", hint: "Doorlopende beweging over het hele lichaam" },
};
const FOCUS_REGIONS = ["hip", "hamstring", "spine", "shoulder", "ankle", "wrist"];

const ROLES = {
  prep: { label: "Opwarmen", note: "Het gewricht wakker maken door je eigen bereik." },
  open: { label: "Openen",   note: "Houden op lengte. Hier wordt het bereik groter." },
  load: { label: "Belasten", note: "Kracht aan het einde van je bereik, zodat het blijft." },
  flow: { label: "Flow",     note: "Doorlopende beweging waarin alles samenkomt." },
};

/* ---------- Oefeningen ----------
   base = doel in week 3 op standaardniveau. Bij perSide geldt het doel
   voor beide kanten samen: 60 s betekent 2 × 30 s.
   from: "routine" = stond in je eigen ochtendroutines, "db" = uit je
   oefeningendatabase. De rest is toegevoegd om de gebieden rond te maken. */

const EX = {
  /* ── HEUP ─────────────────────────────────────────────────── */
  hipcars: {
    name: "Hip CARs", region: "hip", role: "prep", unit: "reps", perSide: true, base: 10,
    from: "routine", video: "https://youtu.be/JlxndP60w8E?t=336",
    levels: {
      easier:   { name: "Liggend op je rug, knie gebogen", f: 1.2 },
      standard: { name: "Staand, hand aan de muur", f: 1 },
      harder:   { name: "Staand zonder steun, been gestrekt", f: 0.8 },
    },
    setup: "Sta rechtop, gewicht op één been. Span je buik en billen aan zodat alleen je heup beweegt en je romp stil blijft.",
    how: [
      "Breng je knie zo hoog mogelijk recht voor je omhoog.",
      "Draai de knie langzaam naar buiten, zo ver als je komt zonder dat je romp meedraait.",
      "Breng het been achter je langs naar beneden en sluit de cirkel.",
    ],
    cues: ["Zo langzaam dat je elke graad voelt — tien seconden per cirkel is prima.", "Spanning in je hele lichaam, beweging alleen in de heup."],
    avoid: ["Met je romp meeleunen om de cirkel groter te maken. Dan train je je rug, niet je heup."],
  },
  shinbox: {
    name: "Shin Box Swivels", region: "hip", role: "prep", unit: "sec", perSide: false, base: 40,
    from: "routine",
    levels: {
      easier:   { name: "Handen achter je op de grond als steun", f: 1.15 },
      standard: { name: "Handen los, romp rechtop", f: 1 },
      harder:   { name: "Handen op je borst, zonder tempo", f: 0.85 },
    },
    setup: "Zit op de grond met één been voor je op 90° en het andere naast je op 90°. Zit rechtop op je zitbotten.",
    how: [
      "Laat beide knieën naar de andere kant vallen zodat je van 90/90 links naar 90/90 rechts gaat.",
      "Hou je romp rechtop en zo stil mogelijk.",
      "Wissel rustig heen en weer voor de hele tijd.",
    ],
    cues: ["Dit is je warming-up: beweging boven rek.", "Borst omhoog, je zit níét achterover gezakt."],
    avoid: ["Jezelf omhoog duwen met je handen als dat niet nodig is."],
  },
  ninety: {
    name: "90/90 Hold", region: "hip", role: "open", unit: "sec", perSide: true, base: 60,
    from: "routine", video: "https://www.youtube.com/watch?v=jJn2ijaiir0&t=39s",
    levels: {
      easier:   { name: "Op een kussen of blok, handen achter je", f: 1.15 },
      standard: { name: "Op de grond, romp rechtop", f: 1 },
      harder:   { name: "Rechtop zonder handen, borst omhoog", f: 0.85 },
    },
    setup: "Voorste been op 90° voor je, achterste been op 90° naast je. Beide knieën op de grond.",
    how: [
      "Zit zo rechtop als je kunt. Zakt je onderrug weg, ga dan op een kussen zitten.",
      "Hou de positie stil vast en adem laag in je buik.",
      "Wissel na de helft van kant.",
    ],
    cues: ["Beide zitbotten naar de grond — niet wegleunen van de stugge kant.", "Rustige neusademhaling maakt het bereik groter dan duwen."],
    avoid: ["De voorste enkel laten slappen. Hou je voet actief zodat je knie beschermd blijft."],
  },
  pigeon: {
    name: "90-90 Pigeon Lean", region: "hip", role: "open", unit: "sec", perSide: true, base: 90,
    from: "routine",
    levels: {
      easier:   { name: "Onderarmen op een blok of bank", f: 1.15 },
      standard: { name: "Onderarmen naar de grond", f: 1 },
      harder:   { name: "Borst naar het voorste scheenbeen", f: 0.8 },
    },
    setup: "Vanuit 90/90: leun over je voorste been naar voren. Hou je heupen recht naar voren gericht.",
    how: [
      "Zak met een rechte rug voorover tot je de rek diep in de bil voelt.",
      "Hou de positie stil vast, niet veren.",
      "Kom langzaam omhoog en wissel van kant.",
    ],
    cues: ["De rek hoort in het midden van je bil te zitten, niet in de knie.", "Adem uit en laat op elke uitademing een stukje zakken."],
    avoid: ["Pijn aan de binnenkant van de voorste knie. Zet dan je voet dichter bij je lichaam."],
  },
  shinboxlift: {
    name: "Shin Box Hip Lift", region: "hip", role: "load", unit: "reps", perSide: true, base: 10,
    from: "routine",
    levels: {
      easier:   { name: "Met een hand op de grond als steun", f: 1.2 },
      standard: { name: "Handen los, tot op je knieën", f: 1 },
      harder:   { name: "Boven stilhouden, 2 tellen per herhaling", f: 0.8 },
    },
    setup: "Zit in 90/90. Handen los, borst omhoog.",
    how: [
      "Duw je heupen naar voren en kom op je knieën omhoog.",
      "Knijp bovenaan je billen aan tot je een rechte lijn maakt van knie tot schouder.",
      "Zak gecontroleerd terug in 90/90 en herhaal.",
    ],
    cues: ["Dit is de oefening die je nieuwe bereik vasthoudt — doe hem ook als hij zwaar is.", "Billen knijpen, onderrug niet hol trekken."],
    avoid: ["Jezelf omhoog zwaaien met een slinger. Rustig omhoog, rustig terug."],
  },
  couch: {
    name: "Couch Stretch", region: "hip", role: "open", unit: "sec", perSide: true, base: 90,
    levels: {
      easier:   { name: "Achterste voet op de grond, knie laag", f: 1.15 },
      standard: { name: "Achterste voet tegen de muur of bank", f: 1 },
      harder:   { name: "Romp rechtop, billen aangespannen", f: 0.8 },
    },
    setup: "Achterste knie tegen de muur of tegen de bank, scheenbeen omhoog. Voorste voet plat op de grond.",
    how: [
      "Knijp je bil van het achterste been aan en kantel je bekken naar achteren.",
      "Kom met je romp zo rechtop als je kunt houden.",
      "Hou de positie en adem laag door.",
    ],
    cues: ["De bil aanspannen is wat het van een rek een mobilisatie maakt.", "Onderrug lang houden, niet hol trekken om verder te komen."],
    avoid: ["Pijn in de knieschijf. Leg er een handdoek onder of zak lager."],
  },
  hipext: {
    name: "Externe rotatie op de bank", region: "hip", role: "load", unit: "reps", perSide: true, base: 10,
    from: "routine",
    levels: {
      easier:   { name: "Alleen optillen en 1 tel houden", f: 1.2 },
      standard: { name: "Optillen en 3 tellen houden", f: 1 },
      harder:   { name: "5 tellen houden, zo hoog als je kunt", f: 0.8 },
    },
    setup: "Lig op je buik op een bank of bed, één knie 90° gebogen en het onderbeen over de rand.",
    how: [
      "Draai je onderbeen naar binnen toe zodat je heup naar buiten roteert.",
      "Hou de eindstand actief vast zonder je bekken te laten kantelen.",
      "Laat langzaam zakken en herhaal.",
    ],
    cues: ["Klein bereik, maximale inspanning. Dit is krachttraining voor je heuprotatie.", "Heup blijft op de bank plakken."],
    avoid: ["Met je bekken meedraaien — dan haal je het bereik uit je onderrug."],
  },
  deepsquat: {
    name: "Deep Squat Hold", region: "hip", role: "open", unit: "sec", perSide: false, base: 60,
    from: "routine",
    levels: {
      easier:   { name: "Hielen op een boek, vasthouden aan een deurpost", f: 1.15 },
      standard: { name: "Hielen plat, ellebogen binnen je knieën", f: 1 },
      harder:   { name: "Borst omhoog, handen los voor je", f: 0.85 },
    },
    setup: "Voeten iets breder dan je schouders, tenen licht naar buiten. Zak zo diep mogelijk.",
    how: [
      "Zak met je heupen tussen je hielen, hielen plat op de grond.",
      "Duw met je ellebogen je knieën naar buiten en breng je borst omhoog.",
      "Hou de positie vast en adem rustig door.",
    ],
    cues: ["Lukken je hielen niet? Boek eronder, en elke week iets lager.", "Zak niet in elkaar: actief rechtop blijven telt dubbel."],
    avoid: ["Knieën die naar binnen vallen."],
  },
  cossack: {
    name: "Cossack Squat", region: "hip", role: "load", unit: "reps", perSide: true, base: 12,
    levels: {
      easier:   { name: "Vasthouden aan een paal of deurpost", f: 1.2 },
      standard: { name: "Handen los, hiel blijft op de grond", f: 1 },
      harder:   { name: "Onderaan 2 tellen stil, dan omhoog", f: 0.8 },
    },
    setup: "Voeten ver uit elkaar, tenen recht vooruit. Gewicht naar één kant.",
    how: [
      "Zak zijwaarts over één been en strek het andere been.",
      "Hou de hiel van het gebogen been op de grond en je borst omhoog.",
      "Duw jezelf terug naar het midden en wissel.",
    ],
    cues: ["Zak maar zo diep als je met je hiel op de grond kunt.", "De tenen van het gestrekte been mogen omhoog wijzen."],
    avoid: ["Rondrollen van de onderrug onderaan."],
  },

  /* ── HAMSTRINGS ───────────────────────────────────────────── */
  floss: {
    name: "Morning Floss", region: "hamstring", role: "prep", unit: "reps", perSide: true, base: 10,
    from: "routine",
    levels: {
      easier:   { name: "Liggend, been met de handen gesteund", f: 1.2 },
      standard: { name: "Liggend, been los", f: 1 },
      harder:   { name: "Staand, been op een stoel", f: 0.9 },
    },
    setup: "Lig op je rug, één been omhoog. Dit is zenuwmobilisatie: het gaat om de beweging, niet om de rek.",
    how: [
      "Strek je knie en trek tegelijk je tenen naar je toe.",
      "Buig dan je knie en strek je tenen weg.",
      "Blijf in een rustig tempo wisselen, nooit tot in de pijn.",
    ],
    cues: ["Nooit vasthouden aan het eind — dit is een pomp, geen stretch.", "Tintelingen betekenen: kleiner bereik."],
    avoid: ["Doorzetten bij uitstralende pijn in je been."],
  },
  pancake: {
    name: "Horse Stance + Pancake", region: "hamstring", role: "open", unit: "sec", perSide: false, base: 60,
    from: "routine",
    levels: {
      easier:   { name: "Zittend op een kussen, handen voor je", f: 1.15 },
      standard: { name: "Zittend op de grond, onderarmen naar beneden", f: 1 },
      harder:   { name: "Borst naar de grond, rug lang", f: 0.8 },
    },
    setup: "Zit met gestrekte benen wijd uit elkaar, knieschijven naar het plafond.",
    how: [
      "Kantel je bekken naar voren zodat de beweging uit je heup komt, niet uit je rug.",
      "Zak met een lange rug naar voren tot je de rek in je binnenbenen voelt.",
      "Hou vast en adem laag door.",
    ],
    cues: ["Eerst bekken kantelen, dán pas zakken.", "Knieën blijven naar boven wijzen."],
    avoid: ["Met een bolle rug naar voren hangen."],
  },
  straddle: {
    name: "Straddle → kleermaker → op de knieën", region: "hamstring", role: "open", unit: "sec", perSide: false, base: 90,
    from: "routine",
    levels: {
      easier:   { name: "3 × 20 s, op een kussen", f: 1.15 },
      standard: { name: "3 × 30 s, de drie posities na elkaar", f: 1 },
      harder:   { name: "3 × 40 s, zonder handsteun", f: 0.85 },
    },
    setup: "Drie zitposities achter elkaar, elk ongeveer even lang. Zet een timer en wissel door.",
    how: [
      "Straddle: benen wijd, rustig voorover met een lange rug.",
      "Kleermaker: benen gekruist, voorover buigen en je rug laten rekken.",
      "Op je knieën zitten: billen op je hielen, wreven plat, rechtop blijven.",
    ],
    cues: ["Drie posities, één doel: lang zitten zonder te verkrampen.", "Doe hem 's ochtends — dan telt hij dubbel."],
    avoid: ["Knieklachten bij het knielen. Leg dan een opgerolde handdoek onder je enkels."],
  },
  sldl: {
    name: "One-leg stiff-leg deadlift", region: "hamstring", role: "load", unit: "reps", perSide: true, base: 10,
    from: "routine",
    levels: {
      easier:   { name: "Vingertoppen aan de muur voor balans", f: 1.2 },
      standard: { name: "Vrij, zonder gewicht", f: 1 },
      harder:   { name: "Met een gewicht in de tegenovergestelde hand", f: 0.8 },
    },
    setup: "Sta op één been, knie heel licht gebogen. Het andere been strekt naar achteren als tegenwicht.",
    how: [
      "Scharnier vanuit je heup naar voren, rug recht.",
      "Zak tot je de hamstring strak voelt staan, niet verder.",
      "Kom omhoog door je bil aan te spannen.",
    ],
    cues: ["Heup scharniert, rug blijft recht — dit is geen squat.", "Heupen blijven vlak, niet openklappen naar de zijkant."],
    avoid: ["Snelheid. Het evenwicht zoeken hoort bij de oefening."],
  },
  jefferson: {
    name: "Jefferson Curl", region: "hamstring", role: "load", unit: "reps", perSide: false, base: 8,
    levels: {
      easier:   { name: "Op de grond, zonder gewicht", f: 1.2 },
      standard: { name: "Op een verhoging, zonder gewicht", f: 1 },
      harder:   { name: "Op een verhoging met een licht gewicht", f: 0.8 },
    },
    setup: "Sta met gestrekte benen op een verhoging. Dit is bewust een rondrollende rug — met weinig of geen gewicht.",
    how: [
      "Rol wervel voor wervel naar beneden, beginnend bij je nek.",
      "Laat je hoofd en armen hangen en zak zo ver als je rustig komt.",
      "Rol in dezelfde volgorde weer omhoog, onderste wervel het laatst.",
    ],
    cues: ["Tien seconden omlaag, tien omhoog. Tempo is de hele oefening.", "Licht beginnen en pas opbouwen als het soepel gaat."],
    avoid: ["Zwaar gewicht of haast. Bij rugklachten: overslaan en bij de pancake blijven."],
  },

  /* ── RUG ──────────────────────────────────────────────────── */
  catcow: {
    name: "Cat-Cow", region: "spine", role: "prep", unit: "reps", perSide: false, base: 16,
    levels: {
      easier:   { name: "Zittend op een stoel", f: 1.2 },
      standard: { name: "Op handen en knieën", f: 1 },
      harder:   { name: "Segment voor segment, 5 tellen per kant", f: 0.8 },
    },
    setup: "Op handen en knieën, handen onder je schouders, knieën onder je heupen.",
    how: [
      "Adem in en laat je buik zakken, borst omhoog, stuit omhoog.",
      "Adem uit en duw je rug bol, kin naar je borst.",
      "Blijf rustig wisselen op het ritme van je ademhaling.",
    ],
    cues: ["Beweeg wervel voor wervel in plaats van in één blok.", "Adem stuurt de beweging aan."],
    avoid: ["Alleen je onderrug bewegen. De borstwervels zijn hier het doel."],
  },
  openbook: {
    name: "Open Book", region: "spine", role: "prep", unit: "reps", perSide: true, base: 16,
    levels: {
      easier:   { name: "Knieën op een kussen, kleine draai", f: 1.2 },
      standard: { name: "Zijlig, knieën 90°, arm volgt je blik", f: 1 },
      harder:   { name: "Boven 3 tellen stilhouden", f: 0.85 },
    },
    setup: "Lig op je zij, knieën gebogen op 90°, armen recht voor je tegen elkaar.",
    how: [
      "Til je bovenste arm op en draai hem in een grote boog naar de andere kant.",
      "Volg je hand met je ogen en laat je borstkas meedraaien.",
      "Hou je knieën op de grond en kom rustig terug.",
    ],
    cues: ["De knieën blijven liggen — anders draait je onderrug mee.", "Uitademen terwijl je openklapt."],
    avoid: ["Trekken met je schouder. De draai komt uit je borstwervels."],
  },
  tspine: {
    name: "Borstwervel-extensie over een rol", region: "spine", role: "open", unit: "sec", perSide: false, base: 60,
    levels: {
      easier:   { name: "Over een opgerolde handdoek", f: 1.15 },
      standard: { name: "Over een foamroller, handen achter je hoofd", f: 1 },
      harder:   { name: "Armen gestrekt boven je hoofd", f: 0.85 },
    },
    setup: "Leg een foamroller dwars onder je bovenrug, voeten plat, handen achter je hoofd.",
    how: [
      "Laat je bovenrug over de rol naar achteren zakken.",
      "Hou je billen op de grond en span je buik licht aan zodat je onderrug niet meedoet.",
      "Schuif de rol na elke 20 seconden een paar centimeter op.",
    ],
    cues: ["Drie posities over je bovenrug, niet één plek platdrukken.", "Adem uit en laat verder zakken."],
    avoid: ["Over je onderrug rollen."],
  },
  seal: {
    name: "Seal / Cobra", region: "spine", role: "open", unit: "sec", perSide: false, base: 45,
    levels: {
      easier:   { name: "Op je onderarmen (sphinx)", f: 1.15 },
      standard: { name: "Op gestrekte armen, heupen op de grond", f: 1 },
      harder:   { name: "Gestrekte armen, hoofd rustig achterover", f: 0.85 },
    },
    setup: "Lig op je buik, handen onder je schouders.",
    how: [
      "Duw je bovenlichaam omhoog en hou je heupen op de grond.",
      "Laat je schouders laag en weg van je oren.",
      "Hou de positie vast en adem rustig in je buik.",
    ],
    cues: ["Billen zacht, niet knijpen — anders blokkeer je de strekking.", "Lang maken vanaf je kruin."],
    avoid: ["Knijpende pijn laag in je rug. Zak dan terug op je onderarmen."],
  },
  arch: {
    name: "Arch Hold", region: "spine", role: "load", unit: "sec", perSide: false, base: 45,
    levels: {
      easier:   { name: "Alleen bovenlichaam omhoog", f: 1.2 },
      standard: { name: "Armen en benen los van de grond", f: 1 },
      harder:   { name: "Armen gestrekt vooruit, benen hoog", f: 0.8 },
    },
    setup: "Lig op je buik, armen vooruit gestrekt.",
    how: [
      "Til armen, borst en benen tegelijk van de grond.",
      "Knijp je billen aan en kijk naar de grond, nek lang.",
      "Hou vast en adem door; zak tussendoor even als het moet.",
    ],
    cues: ["Billen aan is wat je onderrug beschermt.", "Lang maken in plaats van hoog komen."],
    avoid: ["Je nek in je nek leggen om hoger te lijken."],
  },

  /* ── SCHOUDER ─────────────────────────────────────────────── */
  shouldercars: {
    name: "Shoulder CARs", region: "shoulder", role: "prep", unit: "reps", perSide: true, base: 10,
    from: "db",
    levels: {
      easier:   { name: "Kleine cirkel, elleboog gebogen", f: 1.2 },
      standard: { name: "Volledige cirkel met gestrekte arm", f: 1 },
      harder:   { name: "Tien tellen per cirkel, maximale spanning", f: 0.8 },
    },
    setup: "Sta rechtop, span je buik en billen aan zodat alleen je schouder beweegt.",
    how: [
      "Breng je arm recht voor je omhoog, duim naar voren.",
      "Draai boven je hoofd je arm naar binnen en breng hem achterlangs naar beneden.",
      "Sluit de cirkel voor je en begin opnieuw.",
    ],
    cues: ["Zo langzaam dat je de haperingen voelt. Daar zit je winst.", "Ribben laag, geen holle rug om verder te komen."],
    avoid: ["Met je romp meedraaien."],
  },
  passthrough: {
    name: "Pass-Through met stok of band", region: "shoulder", role: "prep", unit: "reps", perSide: false, base: 12,
    from: "db",
    levels: {
      easier:   { name: "Brede greep met een band", f: 1.2 },
      standard: { name: "Band of stok, handen schouderbreedte + 50 cm", f: 1 },
      harder:   { name: "Smallere greep, 3 tellen per passage", f: 0.8 },
    },
    setup: "Pak een bezemsteel of band breed vast, armen gestrekt voor je.",
    how: [
      "Breng de stok met gestrekte armen over je hoofd naar achteren.",
      "Ga alleen zo ver als je kunt zonder je ellebogen te buigen.",
      "Breng hem in hetzelfde tempo weer terug naar voren.",
    ],
    cues: ["Armen blijven recht — buigen is vals spelen.", "Elke week een paar centimeter smaller pakken."],
    avoid: ["De onderrug hol trekken om de stok rond te krijgen."],
  },
  deadhang: {
    name: "Dead Hang", region: "shoulder", role: "open", unit: "sec", perSide: false, base: 45,
    levels: {
      easier:   { name: "Voeten aan de grond, deels gewicht dragend", f: 1.15 },
      standard: { name: "Vrij hangen aan gestrekte armen", f: 1 },
      harder:   { name: "Aan één arm wisselen, of met extra gewicht", f: 0.75 },
    },
    setup: "Hang aan een rekstok met een bovenhandse greep, iets breder dan je schouders.",
    how: [
      "Laat je schouders eerst volledig ontspannen in de hang.",
      "Adem rustig door en hou je ribben laag.",
      "Verdeel de tijd over meerdere hangen als één lange niet lukt.",
    ],
    cues: ["Dit is de beste oefening voor een stijve schouder die er is.", "Grip is meestal eerder op dan je schouder; dat mag."],
    avoid: ["Met opgetrokken schouders blijven hangen zonder te ontspannen."],
  },
  chestdoor: {
    name: "Borstopener in de deuropening", region: "shoulder", role: "open", unit: "sec", perSide: true, base: 60,
    levels: {
      easier:   { name: "Onderarm op de deurpost, elleboog laag", f: 1.15 },
      standard: { name: "Onderarm op de deurpost, elleboog op schouderhoogte", f: 1 },
      harder:   { name: "Elleboog hoog, romp weggedraaid", f: 0.85 },
    },
    setup: "Zet je onderarm tegen een deurpost, elleboog ongeveer op schouderhoogte.",
    how: [
      "Stap met de voet aan dezelfde kant door de deuropening.",
      "Draai je romp rustig van je arm weg tot je de rek in je borst voelt.",
      "Hou de positie vast en wissel daarna van kant.",
    ],
    cues: ["De rek hoort in je borst te zitten, niet voor in je schouder.", "Ribben laag, schouder van je oor af."],
    avoid: ["Stekende pijn voor in de schouder. Zet dan je elleboog lager."],
  },
  wallslide: {
    name: "Wall Slide", region: "shoulder", role: "load", unit: "reps", perSide: false, base: 12,
    levels: {
      easier:   { name: "Alleen onderarmen tegen de muur", f: 1.2 },
      standard: { name: "Onderarmen en polsen aan de muur", f: 1 },
      harder:   { name: "Bovenaan 3 tellen stilhouden", f: 0.8 },
    },
    setup: "Sta met je rug tegen de muur, onderarmen tegen de muur, ellebogen op ribbenhoogte.",
    how: [
      "Schuif je armen omhoog zonder dat je polsen de muur verlaten.",
      "Hou je onderrug plat tegen de muur door je buik aan te spannen.",
      "Schuif langzaam terug naar beneden.",
    ],
    cues: ["Onderrug tegen de muur is de hele moeilijkheid.", "Kom alleen zo hoog als je contact houdt."],
    avoid: ["Met je ribben naar voren komen om hoger te komen."],
  },
  ytw: {
    name: "Prone Y-T-W", region: "shoulder", role: "load", unit: "reps", perSide: false, base: 18,
    levels: {
      easier:   { name: "Duimen omhoog, kleine beweging", f: 1.2 },
      standard: { name: "Drie standen, 1 tel houden per herhaling", f: 1 },
      harder:   { name: "3 tellen houden per herhaling", f: 0.8 },
    },
    setup: "Lig op je buik, voorhoofd op de grond of op een handdoek.",
    how: [
      "Y: armen schuin boven je hoofd van de grond tillen, duimen omhoog.",
      "T: armen recht opzij tillen.",
      "W: ellebogen gebogen naar je ribben trekken en de schouderbladen knijpen.",
    ],
    cues: ["Lage schouders: trek ze niet naar je oren.", "Hoogte doet er niet toe, de knijp wel."],
    avoid: ["Je hoofd optillen en je nek aanspannen."],
  },

  /* ── ENKEL & VOET ─────────────────────────────────────────── */
  rollfoot: {
    name: "Bal onder je voet rollen", region: "ankle", role: "prep", unit: "sec", perSide: true, base: 60,
    from: "routine",
    levels: {
      easier:   { name: "Zittend, lichte druk", f: 1.15 },
      standard: { name: "Staand, halve lichaamsgewicht", f: 1 },
      harder:   { name: "Staand, volle druk op de gevoelige plekken", f: 0.9 },
    },
    setup: "Een tennis- of lacrossebal onder je blote voet.",
    how: [
      "Rol langzaam van je hiel naar je tenen over de hele voetzool.",
      "Blijf vijf tellen hangen op elke plek die gevoelig is.",
      "Wissel daarna van voet.",
    ],
    cues: ["Je voet is de basis van je heup en je rug — niet overslaan.", "Langzaam rollen, niet heen en weer schrobben."],
    avoid: ["Zo hard drukken dat je gaat verkrampen."],
  },
  kneewall: {
    name: "Knie-naar-muur", region: "ankle", role: "load", unit: "reps", perSide: true, base: 20,
    levels: {
      easier:   { name: "Voet dicht bij de muur", f: 1.2 },
      standard: { name: "Tenen een vuistbreedte van de muur", f: 1 },
      harder:   { name: "Verder weg, 2 tellen houden per herhaling", f: 0.8 },
    },
    setup: "Sta met één voet voor een muur, tenen ongeveer een vuistbreedte ervan af.",
    how: [
      "Duw je knie recht over je tweede teen naar de muur toe.",
      "Hou je hiel op de grond — dat is de hele oefening.",
      "Kom terug en herhaal; wissel daarna van kant.",
    ],
    cues: ["Hiel los van de grond = te ver. Schuif een stukje naar achteren.", "Knie recht vooruit, niet naar binnen laten vallen."],
    avoid: ["De voet naar buiten laten draaien om de muur te halen."],
  },
  calfwall: {
    name: "Kuitstretch aan de muur", region: "ankle", role: "open", unit: "sec", perSide: true, base: 90,
    from: "db",
    levels: {
      easier:   { name: "Knie licht gebogen (soleus)", f: 1.15 },
      standard: { name: "Been gestrekt, hiel op de grond", f: 1 },
      harder:   { name: "Voorvoet op een verhoging", f: 0.85 },
    },
    setup: "Handen tegen de muur, één been ver naar achteren, hiel op de grond.",
    how: [
      "Duw je achterste hiel naar de grond en je heup naar voren.",
      "Hou het achterste been gestrekt en je voet recht vooruit.",
      "Hou vast en wissel daarna van kant.",
    ],
    cues: ["Doe ook een ronde met gebogen knie: dat raakt de diepere kuitspier.", "Voet recht vooruit, niet naar buiten."],
    avoid: ["De hiel laten loskomen zodra het trekt."],
  },
  toesit: {
    name: "Op je knieën zitten", region: "ankle", role: "open", unit: "sec", perSide: false, base: 60,
    from: "routine",
    levels: {
      easier:   { name: "Wreven plat, handen als steun achter je", f: 1.15 },
      standard: { name: "Wreven plat, billen op je hielen", f: 1 },
      harder:   { name: "Op je tenen zitten, tenen gebogen", f: 0.75 },
    },
    setup: "Kniel met je wreven plat op de grond en zak met je billen op je hielen.",
    how: [
      "Zak rustig achterover tot je op je hielen zit.",
      "Hou je romp rechtop en adem door.",
      "Wissel halverwege naar de tenenversie als dat kan.",
    ],
    cues: ["Begin met 20 seconden als het nieuw is. Het went snel.", "Handen achter je op de grond maakt het meteen draaglijk."],
    avoid: ["Knieklachten. Leg een kussen tussen je hielen en je billen."],
  },
  heelsquat: {
    name: "Heel Elevated Squat", region: "ankle", role: "load", unit: "reps", perSide: false, base: 15,
    from: "db",
    levels: {
      easier:   { name: "Hielen op een boek van 4 cm, vasthouden", f: 1.2 },
      standard: { name: "Hielen op 2 cm, handen voor je", f: 1 },
      harder:   { name: "Vlakke grond, onderaan 2 tellen stil", f: 0.8 },
    },
    setup: "Hielen op een boek of plankje, voeten op schouderbreedte.",
    how: [
      "Zak zo diep als je kunt met je borst omhoog.",
      "Hou onderaan even stil en duw jezelf omhoog.",
      "Maak elke week de verhoging iets lager.",
    ],
    cues: ["De verhoging is tijdelijk gereedschap, geen eindstation.", "Knieën mogen ver over je tenen."],
    avoid: ["Onderaan in je rug doorzakken."],
  },

  /* ── POLS ─────────────────────────────────────────────────── */
  wristcars: {
    name: "Pols-CARs", region: "wrist", role: "prep", unit: "reps", perSide: false, base: 20,
    levels: {
      easier:   { name: "Losse cirkels, vuist dicht", f: 1.2 },
      standard: { name: "Grote cirkels, vingers gestrekt", f: 1 },
      harder:   { name: "Met spanning, 5 tellen per cirkel", f: 0.8 },
    },
    setup: "Armen voor je uit, ellebogen gestrekt.",
    how: [
      "Maak zo grote mogelijke cirkels met je handen, alleen uit de pols.",
      "Doe de helft van de herhalingen de ene kant op, de helft de andere.",
      "Hou je onderarmen stil.",
    ],
    cues: ["Voor de handstand is dit je warming-up — altijd vóór het steunen.", "Groot bereik boven snelheid."],
    avoid: ["Met je hele onderarm meedraaien."],
  },
  wristrock: {
    name: "Polsrockers", region: "wrist", role: "open", unit: "sec", perSide: false, base: 60,
    levels: {
      easier:   { name: "Op de tafel, weinig gewicht", f: 1.15 },
      standard: { name: "Op handen en knieën, voor- en achterwaarts", f: 1 },
      harder:   { name: "Vingers naar je knieën, achterover leunen", f: 0.85 },
    },
    setup: "Op handen en knieën, handen plat op de grond.",
    how: [
      "Rock met je schouders naar voren tot over je handen en weer terug.",
      "Draai daarna je handen om, vingers naar je knieën, en rock opnieuw rustig.",
      "Verdeel de tijd over beide standen.",
    ],
    cues: ["Handpalmen blijven plat, ook als het trekt.", "Twee richtingen: strekkers én buigers."],
    avoid: ["Scherpe pijn in het polsgewricht. Dan minder gewicht erop."],
  },
  wristload: {
    name: "Polsbelasting, handen omgedraaid", region: "wrist", role: "load", unit: "sec", perSide: false, base: 45,
    levels: {
      easier:   { name: "Zittend, handen op de tafel", f: 1.2 },
      standard: { name: "Op handen en knieën, vingers naar achteren", f: 1 },
      harder:   { name: "Gewicht naar achteren, armen gestrekt", f: 0.8 },
    },
    setup: "Op handen en knieën, handen omgedraaid zodat je vingers naar je knieën wijzen.",
    how: [
      "Breng langzaam gewicht op je handen tot je de rek in je onderarmen voelt.",
      "Hou de positie en adem door.",
      "Verdeel de tijd over meerdere kortere holds.",
    ],
    cues: ["Dit is wat je polsen handstand-bestendig maakt.", "Elleboogplooien naar voren draaien geeft meer rek."],
    avoid: ["Doorbijten bij tintelende vingers."],
  },

  /* ── FLOW ─────────────────────────────────────────────────── */
  bearcrawl: {
    name: "Bear Crawl", region: "flow", role: "flow", unit: "sec", perSide: false, base: 60,
    levels: {
      easier:   { name: "Op de plaats, knieën net van de grond", f: 1.15 },
      standard: { name: "Vooruit en achteruit kruipen", f: 1 },
      harder:   { name: "Heel langzaam, knieën laag bij de grond", f: 0.85 },
    },
    setup: "Op handen en voeten, knieën een vuist boven de grond.",
    how: [
      "Beweeg tegenovergestelde hand en voet tegelijk.",
      "Hou je heupen laag en je rug vlak.",
      "Kruip vooruit en achteruit over de hele tijd.",
    ],
    cues: ["Een glas water op je onderrug zou niet mogen omvallen.", "Kleine passen, rustig tempo."],
    avoid: ["Heupen die omhoog of van links naar rechts schieten."],
  },
  crab: {
    name: "Crab Reach", region: "flow", role: "flow", unit: "reps", perSide: true, base: 16,
    levels: {
      easier:   { name: "Alleen heupen optillen, geen reach", f: 1.2 },
      standard: { name: "Heupen omhoog en met één arm over je hoofd reiken", f: 1 },
      harder:   { name: "Bovenaan 3 tellen stilhouden", f: 0.8 },
    },
    setup: "Zit op de grond, handen achter je, voeten plat voor je.",
    how: [
      "Duw je heupen omhoog tot je een tafel maakt.",
      "Reik met één arm over je hoofd naar achteren en kijk je hand na.",
      "Zak terug en wissel van arm.",
    ],
    cues: ["Billen aanspannen bovenaan — anders hangt het in je onderrug.", "Borst openen is het doel, niet hoogte."],
    avoid: ["Schouderklachten. Reik dan minder ver."],
  },
  animalflow: {
    name: "Animal Flow", region: "flow", role: "flow", unit: "sec", perSide: false, base: 180,
    from: "routine", video: "https://www.youtube.com/watch?v=4jlwG7JPCns",
    levels: {
      easier:   { name: "Twee bewegingen afwisselen", f: 1.15 },
      standard: { name: "Doorlopend wisselen tussen vier standen", f: 1 },
      harder:   { name: "Doorlopend, zonder je knieën te laten landen", f: 0.85 },
    },
    setup: "Ruimte van twee matten. Volg de video, of wissel vrij tussen beer, krab, aap en scorpion reach.",
    how: [
      "Begin in bear en wissel naar crab, terug naar bear, dan naar ape.",
      "Blijf laag bij de grond en adem door.",
      "Zoek geen perfectie — doorgaan is belangrijker dan netjes.",
    ],
    cues: ["Dit is je speeldag. Alles wat je deze week los hebt gemaakt, gebruik je hier.", "Langzaam bewegen is zwaarder dan snel."],
    avoid: ["Stoppen zodra het zwaar wordt. Zak liever even door op je knieën en ga door."],
  },
  sunsalute: {
    name: "Zonnegroet", region: "flow", role: "flow", unit: "reps", perSide: false, base: 6,
    levels: {
      easier:   { name: "Met knieën op de grond bij de chaturanga", f: 1.2 },
      standard: { name: "Volledige ronde, rustig tempo", f: 1 },
      harder:   { name: "Vijf ademhalingen per positie", f: 0.7 },
    },
    setup: "Sta aan het begin van je mat, voeten naast elkaar.",
    how: [
      "Armen omhoog, voorover vouwen, half omhoog kijken.",
      "Stap of spring naar plank, zak naar beneden, cobra, downward dog.",
      "Loop terug naar voren en kom omhoog. Dat is één ronde.",
    ],
    cues: ["Eén beweging per ademhaling.", "Downward dog: hielen zoeken de grond, rug lang."],
    avoid: ["Haasten. Een ronde duurt ongeveer een minuut."],
  },
};

const EX_IDS = Object.keys(EX);
const FROM_LABEL = { routine: "Uit je eigen routines", db: "Uit je oefeningendatabase" };

/* ---------- Programma ----------
   Vier gerichte dagen, twee volledige dagen en één flowdag per week.
   De gerichte dagen draaien om je hoofdfocus, de volledige dagen gaan het
   hele lichaam langs zodat de rest niet stilvalt. */

const DAY_PATTERN = ["gericht", "volledig", "gericht", "gericht", "volledig", "flow", "gericht"];

/* Mobiliteit wint het van frequentie, niet van volume: de opbouw is
   bewust vlakker dan bij de Reps-app. */
const WEEK_MULT = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];

/* Je hoofdfocus krijgt per oefening ook iets meer werk dan onderhoud. */
const FOCUS_BOOST = 1.25;

const KINDS = {
  gericht:  { label: "Gericht",  note: "Drie oefeningen voor je focus, twee voor de rest." },
  volledig: { label: "Volledig", note: "Eén oefening per lichaamsdeel. Het hele lichaam langs." },
  flow:     { label: "Flow",     note: "Doorlopend bewegen, plus twee oefeningen voor je focus." },
  test:     { label: "Meting",   note: "Vijf getallen." },
};

const PHASES = [
  { weeks: [1, 2, 3], name: "Bereik verkennen", note: "Leer de posities kennen en kom er rustig in. Het gaat nu om de houding, nog niet om hoe diep je komt." },
  { weeks: [4, 5, 6], name: "Bereik vergroten", note: "De tijden en herhalingen lopen op. Zoek de rand van je bereik op en blijf daar rustig ademen." },
  { weeks: [7, 8],    name: "Bereik vasthouden", note: "Nu vooral belasten: kracht in de nieuwe eindstanden, want alleen dat maakt het blijvend." },
];

const roundGoal = (n, unit) => {
  if (unit === "sec") return n >= 60 ? Math.round(n / 10) * 10 : Math.round(n / 5) * 5;
  return n >= 30 ? Math.round(n / 5) * 5 : Math.max(1, Math.round(n));
};

function weekOf(day) { return Math.min(8, Math.floor((day - 1) / 7) + 1); }
function phaseOf(day) { const w = weekOf(day); return PHASES.find((p) => p.weeks.includes(w)); }

const poolOf = (region, role) => EX_IDS.filter((id) => EX[id].region === region && EX[id].role === role);

/* Deterministisch kiezen: dezelfde dag geeft altijd dezelfde oefening,
   maar over de dagen heen rouleert het door de hele regio. */
/* De keuze binnen een lijst loopt op een eigen teller, niet op het dagnummer.
   Een teller die per plek met precies één oploopt rouleert netjes door de
   hele lijst; met het dagnummer viel de keuze samen met het ritme van de week
   en bleven er oefeningen voorgoed ongebruikt. */
function pickAt(region, role, n, taken) {
  const pool = poolOf(region, role);
  if (!pool.length) return null;
  for (let i = 0; i < pool.length; i++) {
    const id = pool[(n + i) % pool.length];
    if (!taken.has(id)) { taken.add(id); return id; }
  }
  return null;
}

/* Hoeveel dagen van ditzelfde soort gingen eraan vooraf. */
function occurrenceOf(day, kind) {
  let n = 0;
  for (let d = 2; d < day; d++) if (d !== TOTAL_DAYS && DAY_PATTERN[(d - 1) % 7] === kind) n++;
  return n;
}

const ROLE_CYCLE = ["open", "load", "prep"];

/* Alle onderhoudsplekken op een rij: elk ander lichaamsdeel in elke rol.
   De dagen lopen deze ronde af; bij elke volgende ronde schuift de keuze
   binnen de lijst een plaats op, zodat uiteindelijk alles aan bod komt.
   Rol voor lichaamsdeel, zodat twee plekken op dezelfde dag niet in hetzelfde
   lichaamsdeel vallen. */
function maintSlots(focus) {
  const out = [];
  const rest = FOCUS_REGIONS.filter((r) => r !== focus);
  ROLE_CYCLE.forEach((role) => rest.forEach((r) => out.push([r, role])));
  return out;
}

function addMaint(slots, idx, taken, add) {
  const [region, role] = slots[((idx % slots.length) + slots.length) % slots.length];
  const lap = Math.floor(idx / slots.length);
  add(pickAt(region, role, lap, taken) || pickAt(region, "open", lap, taken));
}

function entryFor(id, day, levels, focus) {
  const ex = EX[id];
  const level = levels[id] || "standard";
  const boost = ex.region === focus ? FOCUS_BOOST : 1;
  const goal = roundGoal(ex.base * WEEK_MULT[weekOf(day) - 1] * ex.levels[level].f * boost, ex.unit);
  return { id, level, goal };
}

function buildDay(day, levels, focus) {
  if (day === 1) return { day, kind: "test", test: "baseline", exercises: [] };
  if (day === TOTAL_DAYS) return { day, kind: "test", test: "retest", exercises: [] };

  const kind = DAY_PATTERN[(day - 1) % 7];
  const seq = occurrenceOf(day, kind);
  const others = FOCUS_REGIONS.filter((r) => r !== focus);
  const slots = maintSlots(focus);
  const taken = new Set();
  const ids = [];
  const add = (id) => { if (id) ids.push(id); };

  if (kind === "gericht") {
    add(pickAt(focus, "prep", seq, taken));
    add(pickAt(focus, "open", seq, taken));
    add(pickAt(focus, "load", seq, taken));
    addMaint(slots, seq * 2, taken, add);
    addMaint(slots, seq * 2 + 1, taken, add);
  } else if (kind === "volledig") {
    add(pickAt(focus, "open", seq, taken));
    others.forEach((r, i) => {
      const t = seq + i;
      add(pickAt(r, ROLE_CYCLE[t % 3], Math.floor(t / 3), taken) || pickAt(r, "open", t, taken));
    });
  } else {
    add(pickAt("flow", "flow", seq, taken));
    add(pickAt(focus, "open", seq, taken));
    add(pickAt(focus, "load", seq, taken));
    addMaint(slots, seq * 3, taken, add);
  }

  return { day, kind, exercises: ids.map((id) => entryFor(id, day, levels, focus)) };
}

/* ---------- Nulmeting ----------
   Vijf getallen die je zelf kunt meten met een rolmaat en een stopwatch.
   better: "up" = hoger is beter, "down" = lager is beter. */

const TEST_FIELDS = [
  { id: "squathold", label: "Diepe squat, hielen plat", hint: "Eén hold, zo lang als je het rechtop volhoudt.", unit: "sec", better: "up", region: "hip" },
  { id: "ninety",    label: "90/90 rechtop zitten", hint: "Zonder handsteun, je slechtste kant.", unit: "sec", better: "up", region: "hip" },
  { id: "sitreach",  label: "Zit-en-reik", hint: "Cm voorbij je tenen. Kom je er niet bij: hoeveel cm je tekortkomt, als min-getal.", unit: "cm", better: "up", region: "hamstring" },
  { id: "kneewall",  label: "Knie-naar-muur", hint: "Cm tussen je grote teen en de muur, hiel op de grond. Je slechtste kant.", unit: "cm", better: "up", region: "ankle" },
  { id: "shoulder",  label: "Handen achter je rug", hint: "Cm tussen je vingertoppen, één hand over je schouder. 0 = ze raken elkaar.", unit: "cm", better: "down", region: "shoulder" },
];

const LEVEL_ORDER = ["easier", "standard", "harder"];
const LEVEL_LABEL = { easier: "Makkelijker", standard: "Standaard", harder: "Zwaarder" };

/* Je meting zet je startniveau per lichaamsdeel. */
function calibrate(t) {
  const up = (v, a, b) => (v < a ? "easier" : v <= b ? "standard" : "harder");
  const down = (v, a, b) => (v > b ? "easier" : v >= a ? "standard" : "harder");
  const lower = (a, b) => LEVEL_ORDER[Math.min(LEVEL_ORDER.indexOf(a), LEVEL_ORDER.indexOf(b))];
  return {
    hip:       lower(up(t.squathold, 30, 90), up(t.ninety, 20, 60)),
    hamstring: up(t.sitreach, 0, 12),
    spine:     up(t.sitreach, -5, 10),
    shoulder:  down(t.shoulder, 0, 15),
    ankle:     up(t.kneewall, 8, 13),
    wrist:     "standard",
    flow:      "standard",
  };
}

/* ---------- Datum ---------- */

const iso = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

const unitShort = (u) => (u === "sec" ? "s" : "herh.");
const goalText = (entry) => {
  const ex = EX[entry.id];
  const u = unitShort(ex.unit);
  return ex.perSide ? `2 × ${Math.round(entry.goal / 2)} ${u}` : `${entry.goal} ${u}`;
};
/* Ruwe schatting voor "tijd per lichaamsdeel": een herhaling kost ongeveer
   vier seconden. Het gaat om de verhouding, niet om de exacte minuut. */
const toSeconds = (id, n) => (EX[id].unit === "sec" ? n : n * 4);

const DEFAULT_STATE = {
  v: 1,
  onboarded: false,
  focus: "hip",
  pendingFocus: null,
  focusLog: [],
  seen: {},
  startedAt: null,
  currentDay: 1,
  levels: {},
  logged: {},
  loggedDay: null,
  lastCompletedDate: null,
  gapHandledOn: null,
  history: [],
  baseline: null,
  retest: null,
};

/* ============================================================
   App
   ============================================================ */

export default function MobilityTab({ onExit, onPersist }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("today");
  const [sheet, setSheet] = useState(null);     // { id, mode: 'log' | 'read' }
  const [focusSheet, setFocusSheet] = useState(false);
  const [reviewDay, setReviewDay] = useState(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = { ...DEFAULT_STATE };
      try {
        const r = await storage.get(KEY);
        if (r && r.value) loaded = { ...DEFAULT_STATE, ...JSON.parse(r.value) };
      } catch (e) {
        /* eerste keer */
      }
      if (!cancelled) setState(loaded);
    })();
    return () => { cancelled = true; };
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

  if (!state.onboarded) {
    return (
      <Onboarding
        onExit={onExit}
        onDone={(focus) => {
          const levels = {};
          EX_IDS.forEach((id) => { levels[id] = "standard"; });
          save({ ...state, onboarded: true, focus, levels, focusLog: [{ day: 1, date: iso(), region: focus }] });
        }}
      />
    );
  }

  const today = iso();
  const doneToday = state.lastCompletedDate === today;
  const workout = buildDay(state.currentDay, state.levels, state.focus);
  const logged = state.loggedDay === state.currentDay ? state.logged : {};
  const anyLoggedToday = Object.values(logged).some((v) => v > 0);

  const missed = state.lastCompletedDate ? Math.max(0, dayDiff(state.lastCompletedDate, today) - 1) : 0;
  const showGap = missed > 0 && state.gapHandledOn !== today && state.history.length > 0;

  const setLevel = (id, level) =>
    save({ ...state, levels: { ...state.levels, [id]: level }, seen: { ...state.seen, [id]: true } });

  const add = (id, n) => {
    const ex = workout.exercises.find((e) => e.id === id);
    if (!ex) return;
    const next = Math.max(0, Math.min(ex.goal, (logged[id] || 0) + n));
    save({
      ...state,
      loggedDay: state.currentDay,
      logged: { ...logged, [id]: next },
      seen: { ...state.seen, [id]: true },
    });
  };

  /* Focus wisselen bouwt de sessie opnieuw op. Heb je vandaag al gelogd,
     dan zou dat werk van het scherm verdwijnen — dan gaat het morgen in. */
  const chooseFocus = (region) => {
    setFocusSheet(false);
    if (region === state.focus && !state.pendingFocus) return;
    if (anyLoggedToday && region !== state.focus) {
      save({ ...state, pendingFocus: region });
    } else {
      save({
        ...state,
        focus: region,
        pendingFocus: null,
        focusLog: [...state.focusLog, { day: state.currentDay, date: today, region }],
      });
    }
  };

  const completeDay = () => {
    const entry = {
      day: state.currentDay,
      date: today,
      kind: workout.kind,
      focus: state.focus,
      done: workout.exercises.reduce((s, e) => s + (logged[e.id] || 0), 0),
      goal: workout.exercises.reduce((s, e) => s + e.goal, 0),
      exercises: workout.exercises.map((e) => ({ ...e, logged: logged[e.id] || 0 })),
    };
    const focus = state.pendingFocus || state.focus;
    save({
      ...state,
      focus,
      pendingFocus: null,
      focusLog: state.pendingFocus
        ? [...state.focusLog, { day: state.currentDay + 1, date: today, region: focus }]
        : state.focusLog,
      startedAt: state.startedAt || today,
      history: [...state.history.filter((h) => h.day !== state.currentDay), entry],
      lastCompletedDate: today,
      currentDay: Math.min(TOTAL_DAYS, state.currentDay + 1),
      logged: {},
      loggedDay: null,
    });
  };

  const saveTest = (which, values, calibrated) => {
    const entry = { day: state.currentDay, date: today, kind: "test", focus: state.focus, done: 0, goal: 0, exercises: [], test: values };
    const levels = { ...state.levels };
    if (calibrated) EX_IDS.forEach((id) => { levels[id] = calibrated[EX[id].region] || levels[id] || "standard"; });
    save({
      ...state,
      [which]: values,
      levels,
      startedAt: state.startedAt || today,
      history: [...state.history.filter((h) => h.day !== state.currentDay), entry],
      lastCompletedDate: today,
      currentDay: Math.min(TOTAL_DAYS, state.currentDay + 1),
    });
  };

  const handleGap = (choice) => {
    if (choice === "skip" && missed <= 7) {
      save({ ...state, currentDay: Math.min(TOTAL_DAYS, state.currentDay + missed), gapHandledOn: today, logged: {}, loggedDay: null });
    } else {
      save({ ...state, gapHandledOn: today });
    }
  };

  const resetAll = () =>
    save({ ...DEFAULT_STATE, onboarded: true, focus: state.focus, levels: state.levels, seen: state.seen });

  const sheetEntry = sheet
    ? sheet.mode === "log"
      ? workout.exercises.find((e) => e.id === sheet.id)
      : { id: sheet.id, level: state.levels[sheet.id] || "standard", goal: null }
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50" style={{ fontFamily: FONT }}>
      <div className="mx-auto max-w-md pb-28">
        <Header state={state} onExit={onExit} />

        {saveError && (
          <p className="mx-5 mb-4 border-l-2 border-neutral-700 pl-3 text-xs leading-relaxed text-neutral-400">
            Het opslaan lukt nu niet. Je invoer blijft op het scherm staan, maar overleeft een herlaadbeurt misschien niet.
          </p>
        )}

        {tab === "today" && (
          <Today
            state={state} workout={workout} logged={logged} doneToday={doneToday}
            onOpen={(id) => setSheet({ id, mode: "log" })}
            onFocus={() => setFocusSheet(true)}
            onComplete={completeDay} onSaveTest={saveTest}
          />
        )}
        {tab === "moves" && <Moves levels={state.levels} focus={state.focus} onOpen={(id) => setSheet({ id, mode: "read" })} />}
        {tab === "progress" && <ProgressTab state={state} onPick={setReviewDay} onFocus={() => setFocusSheet(true)} onReset={resetAll} />}
      </div>

      <Nav tab={tab} setTab={setTab} onExit={onExit} />

      {sheetEntry && (
        <ExerciseSheet
          entry={sheetEntry}
          logged={logged[sheetEntry.id] || 0}
          firstTime={!state.seen[sheetEntry.id]}
          readOnly={sheet.mode === "read" || doneToday}
          isFocus={EX[sheetEntry.id].region === state.focus}
          onLevel={(l) => setLevel(sheetEntry.id, l)}
          onAdd={(n) => add(sheetEntry.id, n)}
          onClose={() => setSheet(null)}
        />
      )}

      {focusSheet && (
        <FocusSheet
          current={state.focus} pending={state.pendingFocus} blocked={anyLoggedToday}
          onChoose={chooseFocus} onClose={() => setFocusSheet(false)}
        />
      )}

      {reviewDay && <Review entry={reviewDay} onClose={() => setReviewDay(null)} />}
      {showGap && <GapModal missed={missed} onChoose={handleGap} />}
    </div>
  );
}

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

/* ---------- Kleine onderdelen ---------- */

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-neutral-700">Mobiliteit</div>
    </div>
  );
}

function Eyebrow({ children, className = "" }) {
  return <div className={`text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500 ${className}`}>{children}</div>;
}

function Header({ state, onExit }) {
  const streak = useMemo(() => {
    const dates = new Set(state.history.map((h) => h.date));
    let cur = iso();
    if (!dates.has(cur)) {
      const y = new Date(); y.setDate(y.getDate() - 1); cur = iso(y);
      if (!dates.has(cur)) return 0;
    }
    let s = 0;
    while (dates.has(cur)) {
      s++;
      const d = new Date(cur + "T00:00:00"); d.setDate(d.getDate() - 1); cur = iso(d);
    }
    return s;
  }, [state.history]);

  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-6 pt-7">
      <div className="flex min-w-0 items-center gap-3">
        {onExit && (
          <button onClick={onExit}
            className={`flex min-h-[44px] shrink-0 items-center rounded-lg border border-neutral-700 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-300 active:bg-neutral-800 ${RING}`}>
            ← Plan
          </button>
        )}
        <div className="truncate text-[11px] font-bold uppercase tracking-[0.3em]">Mobiliteit</div>
      </div>
      {streak > 1 && (
        <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          <span className="tabular-nums" style={{ color: ACCENT }}>{streak}</span> op rij
        </div>
      )}
    </header>
  );
}

/* De dag als één balk, elk blok zo breed als zijn aandeel in het werk. */
function DayBar({ exercises, logged }) {
  const total = exercises.reduce((s, e) => s + e.goal, 0) || 1;
  return (
    <div className="flex h-2.5 w-full gap-[3px]" aria-hidden="true">
      {exercises.map((e) => {
        const done = Math.min(e.goal, logged[e.id] || 0);
        return (
          <div key={e.id} style={{ flexGrow: e.goal / total, flexBasis: 0, backgroundColor: "#282828" }}>
            <div className="h-full" style={{ width: `${(done / e.goal) * 100}%`, backgroundColor: REGIONS[EX[e.id].region].color }} />
          </div>
        );
      })}
    </div>
  );
}

function Bar({ goal, logged, color }) {
  return (
    <div className="h-1.5 w-full" style={{ backgroundColor: "#282828" }} aria-hidden="true">
      <div className="h-full" style={{ width: `${Math.min(100, (logged / goal) * 100)}%`, backgroundColor: color }} />
    </div>
  );
}

/* ---------- Vandaag ---------- */

function Today({ state, workout, logged, doneToday, onOpen, onFocus, onComplete, onSaveTest }) {
  if (workout.kind === "test") {
    return <TestScreen kind={workout.test} baseline={state.baseline} onSave={onSaveTest} />;
  }

  if (doneToday) return <RestOfDay day={state.currentDay - 1} state={state} onFocus={onFocus} />;

  const week = weekOf(state.currentDay);
  const phase = phaseOf(state.currentDay);
  const kind = KINDS[workout.kind];
  const focusRegion = REGIONS[state.focus];
  const finished = workout.exercises.filter((e) => (logged[e.id] || 0) >= e.goal).length;
  const allDone = finished === workout.exercises.length;
  const anyLogged = workout.exercises.some((e) => (logged[e.id] || 0) > 0);
  const focusItems = workout.exercises.filter((e) => EX[e.id].region === state.focus);
  const restItems = workout.exercises.filter((e) => EX[e.id].region !== state.focus);

  return (
    <main className="px-5">
      <Eyebrow>Dag {state.currentDay} · Week {week}</Eyebrow>
      <h1 className="mt-2 flex items-center gap-2.5 text-[32px] font-bold leading-none tracking-tight">
        <span className="h-3 w-3" style={{ backgroundColor: focusRegion.color }} />
        {kind.label}
      </h1>

      <button onClick={onFocus}
        className={`mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left ${RING}`}>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Hoofdfocus</span>
          <span className="mt-0.5 block text-[15px] font-bold" style={{ color: focusRegion.color }}>{focusRegion.label}</span>
          {state.pendingFocus && (
            <span className="mt-0.5 block text-[11px] text-neutral-500">
              Vanaf morgen: {REGIONS[state.pendingFocus].label}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Wissel</span>
      </button>

      <div className="mt-5">
        <DayBar exercises={workout.exercises} logged={logged} />
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xs tabular-nums text-neutral-400">{finished} van {workout.exercises.length} af</span>
          <span className="text-xs text-neutral-600">{phase.name}</span>
        </div>
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">{kind.note} {phase.note}</p>

      {focusItems.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Focus · {focusRegion.label}</Eyebrow>
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-700">Elke dag</span>
          </div>
          <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
            {focusItems.map((e) => (
              <li key={e.id}>
                <ExerciseRow entry={e} logged={logged[e.id] || 0} isNew={!state.seen[e.id]} onOpen={() => onOpen(e.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {restItems.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <Eyebrow>Onderhoud</Eyebrow>
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-700">Rouleert</span>
          </div>
          <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
            {restItems.map((e) => (
              <li key={e.id}>
                <ExerciseRow entry={e} logged={logged[e.id] || 0} isNew={!state.seen[e.id]} onOpen={() => onOpen(e.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={onComplete}
        disabled={!anyLogged}
        className={`mt-6 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
        style={anyLogged ? { backgroundColor: allDone ? ACCENT : "#1F1F1F", color: allDone ? "#0A0A0A" : "#FAFAFA" } : { border: "1px solid #1F1F1F" }}
      >
        {allDone ? "Dag afronden" : anyLogged ? "Dag nu al afronden" : "Log iets om de dag af te ronden"}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
        Je hoeft dit niet in één keer te doen. Verdeel het over de dag — het telt hetzelfde.
      </p>
    </main>
  );
}

function ExerciseRow({ entry, logged, isNew, onOpen }) {
  const ex = EX[entry.id];
  const region = REGIONS[ex.region];
  const remaining = Math.max(0, entry.goal - logged);
  const done = remaining === 0;

  return (
    <button onClick={onOpen} className={`w-full bg-neutral-900 px-4 py-4 text-left active:bg-neutral-800 ${RING}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: region.color }} />
            <span className="truncate text-[15px] font-bold leading-tight">{ex.name}</span>
            {isNew && <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Nieuw</span>}
          </div>
          <div className="mt-1 truncate text-xs text-neutral-500">{ROLES[ex.role].label} · {ex.levels[entry.level].name}</div>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <div className="text-[26px] font-bold leading-none tabular-nums tracking-tight" style={{ color: done ? ACCENT : "#FAFAFA" }}>
            {done ? "✓" : remaining}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Bar goal={entry.goal} logged={logged} color={region.color} />
      </div>
      <div className="mt-2 text-[11px] tabular-nums text-neutral-600">{logged} / {goalText(entry)}</div>
    </button>
  );
}

function RestOfDay({ day, state, onFocus }) {
  return (
    <main className="px-5">
      <Eyebrow>Dag {day} gelogd</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">Dat was het<br />voor vandaag.</h1>
      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
        De sessie van morgen staat er morgenochtend. Verder hoef je vandaag niets meer — dat is precies de bedoeling.
      </p>
      {state.pendingFocus && (
        <p className="mt-4 border-l-2 pl-3 text-[13px] leading-relaxed text-neutral-300" style={{ borderColor: ACCENT }}>
          Je hoofdfocus gaat morgen naar {REGIONS[state.pendingFocus].label}.
        </p>
      )}
      <button onClick={onFocus}
        className={`mt-6 w-full rounded-xl border border-neutral-800 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>
        Hoofdfocus wisselen
      </button>
      <p className="mt-4 text-xs leading-relaxed text-neutral-600">
        Bij Voortgang zie je je laatste sessies en hoeveel je per lichaamsdeel hebt gedaan. Bij Oefeningen staat de uitleg van alles.
      </p>
    </main>
  );
}

/* ---------- Oefening-sheet ---------- */

function ExerciseSheet({ entry, logged, firstTime, readOnly, isFocus, onLevel, onAdd, onClose }) {
  const ex = EX[entry.id];
  const region = REGIONS[ex.region];
  const browse = entry.goal == null;
  const timed = ex.unit === "sec";
  const remaining = browse ? 0 : Math.max(0, entry.goal - logged);
  const steps = browse ? [] : timed ? [30, 15, 5] : entry.goal >= 30 ? [10, 5, 1] : [5, 2, 1];

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const showLevelFirst = firstTime && !browse;

  const levelPicker = (
    <section>
      <Eyebrow>{showLevelFirst ? "Eerste keer — kies je niveau" : "Jouw niveau"}</Eyebrow>
      <div className="mt-3 space-y-px overflow-hidden rounded-xl border border-neutral-800">
        {LEVEL_ORDER.map((l) => {
          const on = entry.level === l;
          return (
            <button key={l} onClick={() => onLevel(l)}
              className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-3.5 text-left ${RING}`}
              style={on ? { backgroundColor: "#0C1824" } : undefined}>
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border"
                style={{ borderColor: on ? ACCENT : "#4A4A4A", backgroundColor: on ? ACCENT : "transparent" }} />
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: on ? ACCENT : "#737373" }}>{LEVEL_LABEL[l]}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-200">{ex.levels[l].name}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!browse && <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">Dit past het doel van vandaag aan en wordt vanaf nu onthouden.</p>}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2" style={{ backgroundColor: region.color }} />
          <Eyebrow>{region.label} · {ROLES[ex.role].label}</Eyebrow>
        </div>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Sluiten</button>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mt-6 text-[30px] font-bold leading-none tracking-tight">{ex.name}</h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ex.from ? ACCENT : "#525252" }}>
            {ex.from ? FROM_LABEL[ex.from] : "Toegevoegd"}
          </span>
          {isFocus && !browse && (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">Focusgebied · extra volume</span>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">{ROLES[ex.role].note}</p>

        {ex.video && (
          <a href={ex.video} target="_blank" rel="noreferrer"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-300 ${RING}`}>
            ▶ Video bekijken
          </a>
        )}

        {browse && (
          <p className="mt-5 border-l-2 border-neutral-800 pl-3 text-[13px] leading-relaxed text-neutral-500">
            Alleen lezen. Het doel verschijnt op de dag dat deze oefening aan de beurt is.
          </p>
        )}

        {showLevelFirst && <div className="mt-7">{levelPicker}</div>}

        {!browse && (
          <section className="mt-7 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[56px] font-bold leading-none tabular-nums tracking-tighter" style={{ color: remaining === 0 ? ACCENT : "#FAFAFA" }}>
                {remaining}
              </span>
              <span className="text-xs text-neutral-500">te gaan van {goalText(entry)}</span>
            </div>
            {ex.perSide && (
              <div className="mt-1 text-[11px] text-neutral-600">Het doel geldt voor beide kanten samen.</div>
            )}

            <div className="mt-4">
              <Bar goal={entry.goal} logged={logged} color={region.color} />
            </div>

            {!readOnly && (
              <>
                {timed && (
                  <div className="mt-5 flex items-center gap-2 border-t border-neutral-800 pt-5">
                    <span className="flex-1 text-[32px] font-bold leading-none tabular-nums tracking-tight text-neutral-200">{mmss(elapsed)}</span>
                    <button onClick={() => setRunning(!running)}
                      className={`rounded-lg border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] ${RING}`}
                      style={{ borderColor: "#333", color: "#FAFAFA" }}>
                      {running ? "Pauze" : elapsed ? "Verder" : "Start"}
                    </button>
                    <button onClick={() => { onAdd(elapsed); setElapsed(0); setRunning(false); }} disabled={elapsed === 0}
                      className={`rounded-lg px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] disabled:opacity-30 ${RING}`}
                      style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
                      Log
                    </button>
                  </div>
                )}

                {/* Tailwind scant de bron op hele klassenamen, dus geen mt-${n} hier. */}
                <div className={timed ? "mt-3 flex gap-2" : "mt-5 flex gap-2 border-t border-neutral-800 pt-5"}>
                  <button onClick={() => onAdd(steps[0])}
                    className={`flex-[2] rounded-xl py-4 text-xl font-bold tabular-nums ${RING}`}
                    style={timed
                      ? { border: "1px solid #404040", color: "#E5E5E5" }
                      : { backgroundColor: ACCENT, color: "#0A0A0A" }}>
                    +{steps[0]}{timed ? "s" : ""}
                  </button>
                  {steps.slice(1).map((s) => (
                    <button key={s} onClick={() => onAdd(s)}
                      className={`flex-1 rounded-xl border border-neutral-700 py-4 text-base font-bold tabular-nums text-neutral-200 ${RING}`}>
                      +{s}{timed ? "s" : ""}
                    </button>
                  ))}
                </div>

                {logged > 0 && (
                  <button onClick={() => onAdd(-steps[steps.length - 1])}
                    className={`mt-3 text-[11px] uppercase tracking-[0.16em] text-neutral-600 ${RING}`}>
                    {steps[steps.length - 1]}{timed ? " sec" : ""} terug
                  </button>
                )}
              </>
            )}

            {timed && !readOnly && (
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
                Hou vast zolang het goed voelt en log het. Meerdere holds tellen bij elkaar op.
              </p>
            )}
          </section>
        )}

        <Block title="Opstelling"><p className="text-[13px] leading-relaxed text-neutral-300">{ex.setup}</p></Block>

        <Block title="Zo doe je hem">
          <ol className="space-y-3">
            {ex.how.map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 shrink-0 pt-0.5 text-[11px] font-bold tabular-nums text-neutral-600">{i + 1}</span>
                <span className="text-[13px] leading-relaxed text-neutral-300">{h}</span>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Let op">
          <ul className="space-y-2.5">{ex.cues.map((c, i) => <li key={i} className="text-[13px] leading-relaxed text-neutral-300">{c}</li>)}</ul>
        </Block>

        <Block title="Niet doen">
          <ul className="space-y-2.5">{ex.avoid.map((c, i) => <li key={i} className="text-[13px] leading-relaxed text-neutral-400">{c}</li>)}</ul>
        </Block>

        {!showLevelFirst && <div className="mt-8 border-t border-neutral-800 pt-7">{levelPicker}</div>}
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="mt-8 border-t border-neutral-800 pt-7">
      <Eyebrow className="mb-3">{title}</Eyebrow>
      {children}
    </section>
  );
}

/* ---------- Focus ---------- */

function FocusSheet({ current, pending, blocked, onChoose, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <Eyebrow>Hoofdfocus</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Sluiten</button>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mt-6 text-[30px] font-bold leading-[1.08] tracking-tight">Waar heb je<br />het meeste last van?</h2>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
          Dat gebied komt elke dag terug met drie oefeningen en krijgt een kwart meer volume. De rest houd je op peil
          met twee oefeningen per dag, die langs alle andere gebieden rouleren.
        </p>
        {blocked && (
          <p className="mt-4 border-l-2 pl-3 text-[13px] leading-relaxed text-neutral-300" style={{ borderColor: ACCENT }}>
            Je hebt vandaag al gelogd. Een nieuwe focus gaat daarom morgen in, zodat de sessie van vandaag blijft staan.
          </p>
        )}

        <ul className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
          {FOCUS_REGIONS.map((r) => {
            const on = (pending || current) === r;
            const region = REGIONS[r];
            const count = EX_IDS.filter((id) => EX[id].region === r).length;
            return (
              <li key={r}>
                <button onClick={() => onChoose(r)}
                  className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-4 text-left ${RING}`}
                  style={on ? { backgroundColor: "#0C1824" } : undefined}>
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0" style={{ backgroundColor: on ? region.color : "#3D3D3D" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{region.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{region.hint} · {count} oefeningen</span>
                  </span>
                  {on && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: region.color }}>
                      {pending && pending !== current ? "Vanaf morgen" : "Nu"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-xs leading-relaxed text-neutral-600">
          Wisselen mag zo vaak als je wilt. Je niveaus en je geschiedenis blijven staan, en bij Voortgang zie je hoeveel
          werk er per lichaamsdeel in zit.
        </p>
      </div>
    </div>
  );
}

/* ---------- Meting ---------- */

function TestScreen({ kind, baseline, onSave }) {
  const [vals, setVals] = useState({});
  const [phase, setPhase] = useState("input");
  const [levels, setLevels] = useState(null);

  const ready = TEST_FIELDS.every((f) => vals[f.id] !== undefined && vals[f.id] !== "");
  const numbers = () => Object.fromEntries(TEST_FIELDS.map((f) => [f.id, Number(vals[f.id]) || 0]));

  if (phase === "calibrate") {
    return (
      <main className="px-5">
        <Eyebrow>Ingesteld</Eyebrow>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">Hier begin je.</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
          Afgeleid uit je meting, niet uit een gok. Zet bij wat niet klopt — en per oefening kun je het altijd nog bijstellen.
        </p>

        <div className="mt-6 space-y-3">
          {FOCUS_REGIONS.map((r) => (
            <div key={r} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2" style={{ backgroundColor: REGIONS[r].color }} />
                <div className="text-[15px] font-bold">{REGIONS[r].label}</div>
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">{REGIONS[r].hint}</div>
              <div className="mt-3 flex gap-1.5">
                {LEVEL_ORDER.map((l) => {
                  const on = levels[r] === l;
                  return (
                    <button key={l} onClick={() => setLevels({ ...levels, [r]: l })}
                      className={`flex-1 rounded-lg border py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] ${RING}`}
                      style={{
                        borderColor: on ? ACCENT : "#2E2E2E",
                        backgroundColor: on ? ACCENT : "transparent",
                        color: on ? "#0A0A0A" : "#737373",
                      }}>
                      {LEVEL_LABEL[l]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => onSave("baseline", numbers(), { ...levels, flow: levels.hip })}
          className={`mt-6 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
          style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
          Begin aan dag 2
        </button>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">Dag 1 is de meting. Je eerste sessie is morgen.</p>
      </main>
    );
  }

  return (
    <main className="px-5">
      <Eyebrow>{kind === "baseline" ? "Dag 1" : "Dag 56"}</Eyebrow>
      <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">
        {kind === "baseline" ? "Vijf getallen." : "Dezelfde vijf getallen."}
      </h1>
      <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
        {kind === "baseline"
          ? "Een rolmaat en een stopwatch is alles wat je nodig hebt. Hieruit volgt je startniveau, en dit is wat je over acht weken verslaat."
          : "Zelfde metingen, zelfde omstandigheden. Hier worden de acht weken zichtbaar."}
      </p>

      <div className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
        {TEST_FIELDS.map((f) => (
          <div key={f.id} className="flex items-center gap-4 bg-neutral-900 px-4 py-4">
            <div className="min-w-0 flex-1">
              <label htmlFor={f.id} className="block text-[14px] font-bold leading-snug">{f.label}</label>
              <div className="mt-1 text-xs leading-relaxed text-neutral-500">{f.hint}</div>
              {kind === "retest" && baseline && (
                <div className="mt-1 text-xs tabular-nums text-neutral-600">Nulmeting: {baseline[f.id]}</div>
              )}
            </div>
            <div className="flex shrink-0 items-baseline gap-1.5">
              <input id={f.id} type="number" inputMode="numeric" placeholder="0"
                value={vals[f.id] ?? ""}
                onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })}
                className={`w-16 border-b border-neutral-700 bg-transparent pb-1 text-right text-2xl font-bold tabular-nums text-neutral-50 placeholder-neutral-700 ${RING}`} />
              <span className="text-[10px] uppercase tracking-widest text-neutral-600">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          if (kind === "baseline") { setLevels(calibrate(numbers())); setPhase("calibrate"); }
          else onSave("retest", numbers(), null);
        }}
        disabled={!ready}
        className={`mt-6 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
        style={ready ? { backgroundColor: ACCENT, color: "#0A0A0A" } : { border: "1px solid #1F1F1F" }}>
        {ready ? (kind === "baseline" ? "Laat zien waar ik sta" : "Hermeting opslaan") : "Vul alle vijf in"}
      </button>
    </main>
  );
}

/* ---------- Oefeningen ---------- */

function Moves({ levels, focus, onOpen }) {
  const order = [...FOCUS_REGIONS, "flow"];

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Oefeningen</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
        Alle {EX_IDS.length} oefeningen, op lichaamsdeel. De uitleg kun je altijd lezen, niet alleen op de dag zelf.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />Uit je eigen routines
        </span>
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />Toegevoegd
        </span>
      </div>

      {order.map((r) => {
        const ids = EX_IDS.filter((id) => EX[id].region === r);
        return (
          <section key={r} className="mt-7">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2" style={{ backgroundColor: REGIONS[r].color }} />
              <Eyebrow>{REGIONS[r].label}</Eyebrow>
              {r === focus && <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Focus</span>}
            </div>
            <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
              {ids.map((id) => {
                const e = EX[id];
                return (
                  <li key={id}>
                    <button onClick={() => onOpen(id)} className={`flex w-full items-center gap-3 bg-neutral-900 px-4 py-3.5 text-left active:bg-neutral-800 ${RING}`}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.from ? ACCENT : "#525252" }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold">{e.name}</span>
                        <span className="block truncate text-xs text-neutral-500">{ROLES[e.role].label} · {e.levels[levels[id] || "standard"].name}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}

/* ---------- Voortgang ---------- */

function ProgressTab({ state, onPick, onFocus, onReset }) {
  const done = state.history.length;
  const last = state.history.slice(-14);
  const max = Math.max(1, ...last.map((h) => h.goal));
  const byDay = Object.fromEntries(state.history.map((h) => [h.day, h]));

  /* Tijd per lichaamsdeel: het antwoord op "doe ik wel genoeg aan mijn heup?" */
  const perRegion = useMemo(() => {
    const acc = {};
    FOCUS_REGIONS.concat("flow").forEach((r) => { acc[r] = 0; });
    state.history.forEach((h) => (h.exercises || []).forEach((e) => {
      if (!EX[e.id]) return;
      acc[EX[e.id].region] += toSeconds(e.id, e.logged || 0);
    }));
    return acc;
  }, [state.history]);
  const regionMax = Math.max(1, ...Object.values(perRegion));
  const totalMin = Math.round(Object.values(perRegion).reduce((s, v) => s + v, 0) / 60);

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Voortgang</h1>

      <div className="mt-5 flex gap-8 border-y border-neutral-800 py-5">
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{done}</div>
          <Eyebrow className="mt-2">van {TOTAL_DAYS} dagen</Eyebrow>
        </div>
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{totalMin}</div>
          <Eyebrow className="mt-2">minuten mobiliteit</Eyebrow>
        </div>
      </div>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Per lichaamsdeel</Eyebrow>
          <button onClick={onFocus} className={`text-[10px] font-bold uppercase tracking-[0.16em] ${RING}`} style={{ color: ACCENT }}>
            Focus wisselen
          </button>
        </div>
        <div className="mt-4 space-y-2.5">
          {FOCUS_REGIONS.concat("flow").map((r) => {
            const min = Math.round(perRegion[r] / 60);
            return (
              <div key={r} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[11px]" style={{ color: r === state.focus ? REGIONS[r].color : "#A3A3A3" }}>
                  {REGIONS[r].short}
                </span>
                <div className="h-3 flex-1" style={{ backgroundColor: "#1A1A1A" }}>
                  <div className="h-full" style={{ width: `${Math.max(1, (perRegion[r] / regionMax) * 100)}%`, backgroundColor: REGIONS[r].color }} />
                </div>
                <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-neutral-500">{min} min</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
          Herhalingen zijn omgerekend naar ongeveer vier seconden per stuk, dus lees dit als een verhouding.
        </p>
      </section>

      <section className="mt-8">
        <Eyebrow>Laatste sessies</Eyebrow>
        {last.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">Rond je eerste dag af, dan verschijnt hij hier.</p>
        ) : (
          <div className="mt-4 flex h-24 items-stretch gap-1">
            {last.map((h) => (
              <div key={h.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full" style={{ height: `${Math.max(3, (h.done / max) * 100)}%`, backgroundColor: REGIONS[h.focus || "hip"].color }} />
                </div>
                <span className="text-[9px] tabular-nums text-neutral-700">{h.day}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <Eyebrow>Acht weken</Eyebrow>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">Tik een afgeronde dag aan om terug te kijken. Dagen die nog komen blijven dicht.</p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, wi) => (
            <div key={wi} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-[10px] font-bold tabular-nums text-neutral-600">{wi + 1}</span>
              <div className="grid flex-1 grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = wi * 7 + di + 1;
                  const entry = byDay[day];
                  const isToday = day === state.currentDay;
                  const color = REGIONS[entry?.focus || state.focus].color;
                  return (
                    <button key={day} onClick={() => entry && onPick(entry)} disabled={!entry}
                      aria-label={`Dag ${day}`}
                      className={`h-7 text-[10px] font-bold tabular-nums ${RING}`}
                      style={{
                        backgroundColor: entry ? color : "#161616",
                        color: entry ? "#0A0A0A" : isToday ? ACCENT : "#3D3D3D",
                        boxShadow: isToday ? `inset 0 0 0 1px ${ACCENT}` : undefined,
                      }}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {state.focusLog.length > 1 && (
        <section className="mt-8">
          <Eyebrow>Focus door de weken</Eyebrow>
          <div className="mt-3 space-y-2">
            {state.focusLog.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-[12px]">
                <span className="w-14 shrink-0 tabular-nums text-neutral-600">Dag {f.day}</span>
                <span className="h-2 w-2 shrink-0" style={{ backgroundColor: REGIONS[f.region].color }} />
                <span className="text-neutral-300">{REGIONS[f.region].label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {state.baseline && (
        <section className="mt-8">
          <Eyebrow>Nulmeting → hermeting</Eyebrow>
          <div className="mt-4 space-y-3">
            {TEST_FIELDS.map((f) => {
              const a = state.baseline[f.id];
              const b = state.retest ? state.retest[f.id] : null;
              const better = b != null && (f.better === "up" ? b > a : b < a);
              return (
                <div key={f.id} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-2">
                  <span className="min-w-0 text-[13px] text-neutral-300">{f.label}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="text-sm text-neutral-500">{a}</span>
                    <span className="mx-2 text-xs text-neutral-700">→</span>
                    <span className="text-lg font-bold" style={{ color: b == null ? "#3D3D3D" : better ? ACCENT : "#A3A3A3" }}>{b ?? "—"}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
            Bij "handen achter je rug" is een lager getal beter; bij de rest hoger.
          </p>
        </section>
      )}

      <button onClick={onReset} className={`mt-10 w-full border border-neutral-800 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600 ${RING}`}>
        Acht weken opnieuw beginnen
      </button>
      <p className="mt-2.5 text-center text-[11px] text-neutral-700">Je niveaus en je focus blijven staan, dus een tweede ronde pakt op waar je gebleven was.</p>
    </main>
  );
}

function Review({ entry, onClose }) {
  const region = REGIONS[entry.focus || "hip"];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <Eyebrow>Dag {entry.day} · {entry.date}</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Sluiten</button>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 py-6">
        <h2 className="flex items-center gap-2.5 text-[30px] font-bold leading-none tracking-tight">
          <span className="h-3 w-3" style={{ backgroundColor: region.color }} />
          {KINDS[entry.kind]?.label || "Sessie"}
        </h2>
        <div className="mt-2 text-xs text-neutral-500">Focus: {region.label}</div>
        {entry.test ? (
          <div className="mt-6 space-y-3">
            {TEST_FIELDS.map((f) => (
              <div key={f.id} className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-2">
                <span className="text-[13px] text-neutral-300">{f.label}</span>
                <span className="shrink-0 text-lg font-bold tabular-nums">{entry.test[f.id]}</span>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {entry.exercises.filter((e) => EX[e.id]).map((e) => (
              <li key={e.id} className="border-b border-neutral-800 pb-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-bold">{EX[e.id].name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-400">{e.logged} / {e.goal} {unitShort(EX[e.id].unit)}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">{REGIONS[EX[e.id].region].label} · {EX[e.id].levels[e.level].name}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Modals en navigatie ---------- */

function GapModal({ missed, onChoose }) {
  const tooFar = missed > 7;
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/80 p-4" style={{ fontFamily: FONT }}>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <Eyebrow>{missed} {missed === 1 ? "dag" : "dagen"} gemist</Eyebrow>
        <h3 className="mt-2 text-xl font-bold tracking-tight">Waar wil je verder?</h3>
        <div className="mt-5 space-y-2">
          <button onClick={() => onChoose("catch")} className={`w-full rounded-xl p-4 text-left ${RING}`} style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em]">Verder waar ik was</div>
            <div className="mt-1 text-[13px] leading-relaxed">Gewoon de volgende sessie op volgorde. Er wordt niets overgeslagen.</div>
          </button>
          <button onClick={() => onChoose("skip")} disabled={tooFar} className={`w-full rounded-xl border border-neutral-700 p-4 text-left disabled:opacity-40 ${RING}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-200">Doorspoelen naar vandaag</div>
            <div className="mt-1 text-[13px] leading-relaxed text-neutral-400">
              {tooFar
                ? "Niet beschikbaar na meer dan zeven gemiste dagen — dan sla je te veel over."
                : "Spring naar de sessie die vandaag aan de beurt was en blijf in het weekritme."}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Nav({ tab, setTab, onExit }) {
  const items = [["today", "Vandaag"], ["moves", "Oefening"], ["progress", "Voortgang"]];
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

/* ---------- Onboarding ---------- */

function Onboarding({ onDone, onExit }) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState("hip");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50" style={{ fontFamily: FONT }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-7 pt-8">
        {onExit && (
          <button onClick={onExit}
            className={`mb-5 flex min-h-[44px] shrink-0 items-center self-start rounded-lg border border-neutral-700 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-300 active:bg-neutral-800 ${RING}`}>
            ← Plan
          </button>
        )}
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-px flex-1" style={{ backgroundColor: i <= step ? ACCENT : "#262626" }} />
          ))}
        </div>

        <div className="flex-1 pt-12">
          {step === 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Mobiliteit</div>
              <h1 className="mt-5 text-[38px] font-bold leading-[1.02] tracking-tight">
                Acht weken.<br />Eén korte sessie<br />per dag.
              </h1>
              <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-neutral-400">
                <p>Vier of vijf oefeningen per dag met een doel in tijd of herhalingen. Tien tot vijftien minuten als je het in één keer doet.</p>
                <p>Je kiest één hoofdfocus: het lichaamsdeel waar je nu het meeste last van hebt. Dat komt elke dag terug met drie oefeningen. De rest van je lichaam houd je ondertussen op peil.</p>
                <p>Elke ochtend staat er een nieuwe sessie klaar. Vooruitwerken kan niet, en dat is expres.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-[30px] font-bold leading-[1.08] tracking-tight">Waar heb je het meeste last van?</h1>
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
                Eén gebied. Je kunt het later altijd wisselen — bij Voortgang zie je dan hoeveel werk er per lichaamsdeel in zit.
              </p>
              <ul className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
                {FOCUS_REGIONS.map((r) => {
                  const on = focus === r;
                  return (
                    <li key={r}>
                      <button onClick={() => setFocus(r)} aria-pressed={on}
                        className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-4 text-left ${RING}`}
                        style={on ? { backgroundColor: "#0C1824" } : undefined}>
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] font-bold leading-none text-neutral-950"
                          style={{ borderColor: on ? ACCENT : "#4A4A4A", backgroundColor: on ? ACCENT : "transparent" }}>
                          {on ? "✓" : ""}
                        </span>
                        <span>
                          <span className="block text-[14px] font-bold">{REGIONS[r].label}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{REGIONS[r].hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-neutral-500">
                Hierna doe je een korte meting van vijf getallen. Daaruit volgt je startniveau per lichaamsdeel.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-8">
          {step > 0 && (
            <button onClick={() => setStep(0)} className={`px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 ${RING}`}>Terug</button>
          )}
          <button onClick={() => (step === 1 ? onDone(focus) : setStep(1))}
            className={`flex-1 rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
            style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            {step === 1 ? "Naar de nulmeting" : "Verder"}
          </button>
        </div>
      </div>
    </div>
  );
}
