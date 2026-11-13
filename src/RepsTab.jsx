import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   DAILY REPS — 8 week bodyweight program
   Single-file React app. Persists via window.storage.
   ============================================================ */

export const REPS_STORAGE_KEY = "dailyreps:v1";
const KEY = REPS_STORAGE_KEY;
/* Het plan stuurt dit event als de sync een nieuwere versie van deze opslag
   heeft binnengehaald; detail.key zegt welke. */
export const APP_STATE_EVENT = "training:app-state";
const TOTAL_DAYS = 56;
const ACCENT = "#FF5C00";

/* window.storage bestaat niet in deze app; val terug op localStorage met
   dezelfde vorm ({value} terug uit get), zodat de code eronder ongewijzigd blijft. */
const storage =
  (typeof window !== "undefined" && window.storage) || {
    async get(k) { const v = localStorage.getItem(k); return v == null ? null : { value: v }; },
    async set(k, v) { localStorage.setItem(k, v); },
  };

/* ---------- Exercise library ---------- */
/* base = doel in week 2 op standaardniveau. unit = wat je telt; een eenheid
   met "sec" erin (seconden) krijgt een stopwatch in plaats van tellers. */

const EX = {
  pushup: {
    name: "Push-up", type: "strength", unit: "herhalingen", base: 30, intro: 1,
    levels: {
      easier: { name: "Schuine push-up (handen op een tafel of bank)", f: 1.15 },
      standard: { name: "Push-up op de grond", f: 1 },
      harder: { name: "Push-up met je voeten hoger", f: 0.7 },
    },
    setup: "Handen onder je schouders, iets breder dan je borst. Voeten tegen elkaar of op heupbreedte. Span je billen aan zodat je lichaam één rechte lijn is van hoofd tot hielen.",
    how: [
      "Ellebogen ongeveer 45° naar achteren, niet recht opzij.",
      "Zak tot je borst een vuist boven de grond is.",
      "Duw de grond weg en kom terug omhoog zonder dat je heupen doorzakken.",
    ],
    cues: ["Ribben omlaag, billen aan — je lichaam beweegt als één plank.", "Bovenin helemaal gestrekt, onderin met je borst bij de grond."],
    avoid: ["Heupen die als eerste zakken, je hoofd naar voren steken, halve herhalingen."],
  },
  pullup: {
    name: "Pull-up", type: "strength", unit: "herhalingen", base: 12, intro: 1,
    levels: {
      easier: { name: "Pull-up met een elastiek, of vanaf boven in 4 tellen zakken", f: 1.3 },
      standard: { name: "Volledige pull-up, bovenhandse greep", f: 1 },
      harder: { name: "Langzame pull-up: 1 tel omhoog, 3 tellen omlaag", f: 0.6 },
    },
    setup: "Bovenhandse greep, handen net buiten schouderbreedte. Begin hangend met gestrekte armen.",
    how: [
      "Trek eerst je schouderbladen omlaag, buig dan pas je armen.",
      "Trek tot je kin boven de stang is.",
      "Zak helemaal terug tot gestrekte armen voor de volgende herhaling.",
    ],
    cues: ["Denk aan de stang naar je toe trekken, niet jezelf omhoog.", "Benen stil — niet zwaaien."],
    avoid: ["Stoppen voordat je weer helemaal hangt. Half bereik is de snelste weg naar stilstand."],
  },
  chinup: {
    name: "Chin-up", type: "strength", unit: "herhalingen", base: 12, intro: 1,
    levels: {
      easier: { name: "Chin-up met een elastiek, of in 4 tellen zakken", f: 1.3 },
      standard: { name: "Volledige chin-up, onderhandse greep", f: 1 },
      harder: { name: "Langzame chin-up: 1 tel omhoog, 3 tellen omlaag", f: 0.6 },
    },
    setup: "Onderhandse greep, handen ongeveer op schouderbreedte. Begin helemaal hangend.",
    how: ["Trek je ellebogen omlaag naar je ribben.", "Kin boven de stang.", "Gecontroleerd zakken tot gestrekte armen."],
    cues: ["Borst omhoog naar de stang, niet je kin naar voren steken."],
    avoid: ["Zwaaien. Moet je zwaaien, neem dan het makkelijkere niveau."],
  },
  row: {
    name: "Roeien", type: "strength", unit: "herhalingen", base: 24, intro: 1,
    levels: {
      easier: { name: "Aan een tafel, voeten dichterbij (rechter = makkelijker)", f: 1.15 },
      standard: { name: "Aan ringen of een tafel, lichaam ongeveer op 45°", f: 1 },
      harder: { name: "Voeten hoger, lichaam horizontaal", f: 0.7 },
    },
    setup: "Pak de ringen of de rand van een stevige tafel. Loop met je voeten naar voren tot je schuin hangt. Rechte lijn van hoofd tot hielen.",
    how: ["Trek je borst naar je handen.", "Houd bovenin even vast.", "Zak tot je armen gestrekt zijn en je schouderbladen open."],
    cues: ["Ellebogen gaan voorop, je schouderbladen knijpen het af.", "Hoe lager je lichaam, hoe zwaarder — zo stel je de moeite in."],
    avoid: ["Heupen die achterblijven en doorzakken."],
  },
  dip: {
    name: "Dip", type: "strength", unit: "herhalingen", base: 18, intro: 1,
    levels: {
      easier: { name: "Dip op een bank, voeten op de grond", f: 1.3 },
      standard: { name: "Dip aan een dipstation of brug", f: 1 },
      harder: { name: "Dip aan ringen", f: 0.6 },
    },
    setup: "Steun op gestrekte armen, schouders omlaag weg van je oren, benen tegen elkaar.",
    how: ["Zak tot je bovenarm ongeveer evenwijdig aan de grond is.", "Leun iets voorover terwijl je zakt.", "Duw terug tot je armen helemaal gestrekt zijn."],
    cues: ["Schouders blijven de hele tijd omlaag."],
    avoid: ["Dieper gaan dan je schouders prettig vinden. Diepte moet je verdienen."],
  },
  pikepushup: {
    name: "Pike push-up", type: "strength", unit: "herhalingen", base: 15, intro: 4,
    levels: {
      easier: { name: "Pike push-up met je voeten op de grond", f: 1.15 },
      standard: { name: "Pike push-up, heupen hoog", f: 1 },
      harder: { name: "Voeten op een stoel of kist", f: 0.7 },
    },
    setup: "Hond-naar-beneden-houding: heupen hoog, handen op schouderbreedte, hoofd tussen je armen.",
    how: ["Buig je ellebogen en breng je kruin naar de grond.", "Duw terug tot gestrekte armen."],
    cues: ["Houd je heupen boven je handen — dat maakt er een schouderdruk van."],
    avoid: ["Dat het een gewone push-up wordt naarmate je moe wordt."],
  },
  squat: {
    name: "Squat", type: "strength", unit: "herhalingen", base: 40, intro: 1,
    levels: {
      easier: { name: "Squat tot op een kist of stoel", f: 1.15 },
      standard: { name: "Volle squat op lichaamsgewicht", f: 1 },
      harder: { name: "Tempo-squat: 3 tellen omlaag, 1 tel stil onderin", f: 0.7 },
    },
    setup: "Voeten op schouderbreedte, tenen iets naar buiten. Gewicht over je hele voet.",
    how: ["Zak naar beneden en naar achteren, knieën in de lijn van je tenen.", "Ga zo diep als je met een vlakke onderrug kunt.", "Kom helemaal rechtop en span bovenin je billen aan."],
    cues: ["Borst trots, hielen aan de grond."],
    avoid: ["Knieën die naar binnen knikken, hielen die loskomen, onderin terugveren."],
  },
  lunge: {
    name: "Achterwaartse lunge", type: "strength", unit: "herhalingen totaal, afwisselend", base: 24, intro: 1,
    levels: {
      easier: { name: "Statische split squat, hand aan de muur", f: 1.15 },
      standard: { name: "Achterwaartse lunge, benen afwisselend", f: 1 },
      harder: { name: "Split squat met je achterste voet hoger", f: 0.7 },
    },
    setup: "Sta rechtop, voeten op heupbreedte.",
    how: ["Stap met één voet naar achteren en laat de achterste knie naar de grond zakken.", "Je voorste scheenbeen blijft bijna verticaal.", "Duw via je voorste voet omhoog en wissel."],
    cues: ["Romp rechtop. Gecontroleerd zakken — de knie niet neerploffen."],
    avoid: ["Te korte stappen; dan wordt het alleen kniewerk."],
  },
  sldl: {
    name: "Eenbenige deadlift", type: "strength", unit: "herhalingen totaal, afwisselend", base: 20, intro: 1,
    levels: {
      easier: { name: "Vingertoppen aan de muur voor je balans", f: 1.15 },
      standard: { name: "Eenbenige deadlift op lichaamsgewicht", f: 1 },
      harder: { name: "Met een dumbbell of kettlebell", f: 0.75 },
    },
    setup: "Sta op één been, knie licht gebogen.",
    how: ["Scharnier vanuit je heup en breng je borst naar voren terwijl je achterste been omhoog komt.", "Stop als je je hamstring stevig voelt rekken.", "Kom omhoog door je heup naar voren te duwen."],
    cues: ["Heupen blijven recht naar de grond — laat de opgetilde heup niet openkantelen."],
    avoid: ["Je onderrug rond maken om verder te reiken."],
  },
  bridge: {
    name: "Bilbrug", type: "strength", unit: "herhalingen", base: 30, intro: 1,
    levels: {
      easier: { name: "Bilbrug op twee benen", f: 1.15 },
      standard: { name: "Bilbrug met bovenin 2 tellen aanspannen", f: 1 },
      harder: { name: "Bilbrug op één been", f: 0.6 },
    },
    setup: "Op je rug, knieën gebogen, hielen dicht bij je billen.",
    how: ["Duw via je hielen je heupen omhoog tot je lichaam een rechte helling is.", "Span bovenin aan.", "Gecontroleerd zakken."],
    cues: ["Je billen doen het werk, niet je onderrug. Ribben blijven omlaag."],
    avoid: ["Bovenin hol trekken om hoger te lijken."],
  },
  hkr: {
    name: "Hangend knieheffen", type: "strength", unit: "herhalingen", base: 15, intro: 1,
    levels: {
      easier: { name: "Liggend knieheffen op de grond", f: 1.3 },
      standard: { name: "Hangend knieheffen tot heuphoogte", f: 1 },
      harder: { name: "Hangend gestrekte benen heffen", f: 0.6 },
    },
    setup: "Hang aan de stang, schouders actief, benen stil.",
    how: ["Krul je bekken onder je en breng je knieën naar je borst.", "Langzaam zakken zonder te zwaaien."],
    cues: ["De eerste beweging is je bekken dat kantelt, niet je heupen die buigen."],
    avoid: ["Vaart gebruiken. Stilstaan tussen de herhalingen is meer waard dan extra herhalingen."],
  },
  hollow: {
    name: "Hollow rock", type: "strength", unit: "herhalingen", base: 25, intro: 1,
    levels: {
      easier: { name: "Hollow hold met gebogen knieën, armen langs je lichaam", f: 1.15 },
      standard: { name: "Hollow rock, armen boven je hoofd", f: 1 },
      harder: { name: "Hollow rock, helemaal gestrekt en langzaam", f: 0.75 },
    },
    setup: "Op je rug, onderrug plat tegen de grond gedrukt. Til je schouders en benen op.",
    how: ["Wieg heen en weer in die vorm zonder dat je onderrug loskomt."],
    cues: ["Komt je onderrug los van de grond, buig dan je knieën meer."],
    avoid: ["Wiegen vanuit je nek of armen."],
  },

  couch: {
    name: "Couch stretch", type: "mobility", unit: "seconden totaal, beide kanten", base: 120, intro: 1,
    levels: {
      easier: { name: "Halfgeknielde heupbuigerstretch, achterste voet op de grond", f: 1 },
      standard: { name: "Achterste voet tegen een muur of bank", f: 1 },
      harder: { name: "Romp rechtop, achterste knie dicht bij de muur", f: 1 },
    },
    setup: "Achterste knie op iets zachts, achterste voet omhoog tegen een muur. Voorste voet plat op de grond.",
    how: ["Kantel je bekken onder je en span je achterste bil aan.", "Breng je romp langzaam rechtop.", "Adem lang en rustig. Halverwege van kant wisselen."],
    cues: ["Het aanspannen van je bil maakt het werkzaam — zonder dat trek je alleen je rug hol."],
    avoid: ["Je onderrug de rek laten opvangen."],
  },
  deepsquat: {
    name: "Diepe squat houden", type: "mobility", unit: "seconden", base: 90, intro: 1,
    levels: {
      easier: { name: "Hielen op een boek, deurpost vasthouden", f: 1 },
      standard: { name: "Diepe squat met platte voeten", f: 1 },
      harder: { name: "Diepe squat, handen los, borst hoog", f: 1 },
    },
    setup: "Zak naar de bodem van een squat, voeten plat.",
    how: ["Blijf daar zitten en adem.", "Duw je knieën zachtjes naar buiten met je ellebogen.", "Wieg van links naar rechts en van voor naar achter om de houding te verkennen."],
    cues: ["Knip de tijd op in stukken als dat nodig is — de totale tijd telt."],
    avoid: ["Voorover op je tenen inzakken."],
  },
  ninety: {
    name: "90/90-heupwissel", type: "mobility", unit: "herhalingen totaal", base: 20, intro: 1,
    levels: {
      easier: { name: "Handen achter je op de grond als steun", f: 1 },
      standard: { name: "Handen licht, van kant naar kant wisselen", f: 1 },
      harder: { name: "Handen los, borst de hele tijd hoog", f: 0.8 },
    },
    setup: "Zit met je voorste been op 90° en je achterste been op 90°, allebei op de grond.",
    how: ["Til beide knieën op en draai ze naar de andere kant.", "Leg beide knieën op de grond voordat je terugwisselt."],
    cues: ["Langzaam en bewust. Elke herhaling eindigt met beide knieën neer."],
    avoid: ["Erdoorheen jagen en elke kant maar half neerkomen."],
  },
  openbook: {
    name: "Open boek", type: "mobility", unit: "herhalingen totaal", base: 16, intro: 1,
    levels: {
      easier: { name: "Knieën op een kussen", f: 1 },
      standard: { name: "Open boek in zijlig", f: 1 },
      harder: { name: "Open boek met 5 tellen vasthouden aan het eind", f: 0.8 },
    },
    setup: "Lig op je zij, knieën 90° gebogen en op elkaar, armen gestrekt voor je uit.",
    how: ["Houd je knieën op elkaar.", "Draai je bovenste arm open over je lichaam en volg hem met je ogen.", "Langzaam terug. Halverwege van kant wisselen."],
    cues: ["De draai komt uit je borstkas, niet uit je knieën."],
    avoid: ["Je bovenste knie van de onderste laten loskomen."],
  },
  passthrough: {
    name: "Schouderdoorhaal", type: "mobility", unit: "herhalingen", base: 20, intro: 1,
    levels: {
      easier: { name: "Brede greep aan een bezemsteel of handdoek", f: 1 },
      standard: { name: "Gemiddelde greep aan een stok of elastiek", f: 1 },
      harder: { name: "Smalle greep, langzaam en gecontroleerd", f: 0.8 },
    },
    setup: "Houd een bezemsteel, handdoek of elastiek voor je, armen gestrekt.",
    how: ["Breng hem over je hoofd naar achter je, ellebogen gestrekt.", "Breng hem langs dezelfde weg terug."],
    cues: ["Ga maar zo smal als je met gestrekte armen kunt."],
    avoid: ["Je ellebogen buigen om een te smalle greep toch door te komen."],
  },
  deadhang: {
    name: "Dead hang", type: "mobility", unit: "seconden", base: 60, intro: 1,
    levels: {
      easier: { name: "Voeten licht op de grond om wat gewicht weg te nemen", f: 1 },
      standard: { name: "Helemaal passief hangen", f: 1 },
      harder: { name: "Actief hangen: schouderbladen omlaag getrokken", f: 0.8 },
    },
    setup: "Bovenhandse greep, handen op schouderbreedte.",
    how: ["Hang en laat je schouders naar je oren komen.", "Adem. Verdeel de totale tijd over zoveel sets als je nodig hebt."],
    cues: ["Je grip geeft meestal eerder op dan je schouders — dat is normaal en gaat snel vooruit."],
    avoid: ["Als een zak van de stang vallen. Stap eraf."],
  },
  cossack: {
    name: "Kozakkensquat", type: "mobility", unit: "herhalingen totaal, afwisselend", base: 16, intro: 1,
    levels: {
      easier: { name: "Deurpost vasthouden, niet te diep", f: 1 },
      standard: { name: "Volle kozakkensquat, hiel aan de grond", f: 1 },
      harder: { name: "Handen los, onderin 2 tellen stil", f: 0.8 },
    },
    setup: "Brede stand, tenen iets naar buiten.",
    how: ["Verplaats je gewicht naar één been en zak, het andere been gestrekt.", "Houd beide hielen aan de grond.", "Duw terug naar het midden en wissel."],
    cues: ["Borst hoog. De diepte komt in de loop van de weken."],
    avoid: ["Op de buitenkant van je werkende voet rollen."],
  },
  jefferson: {
    name: "Jefferson curl", type: "mobility", unit: "herhalingen", base: 10, intro: 4,
    levels: {
      easier: { name: "Zonder gewicht, op de grond", f: 1 },
      standard: { name: "Op een trede, licht gewicht in je handen", f: 1 },
      harder: { name: "Op een trede, zwaarder gewicht, langzaam", f: 0.8 },
    },
    setup: "Sta rechtop, benen gestrekt maar niet hard op slot.",
    how: ["Rol wervel voor wervel naar beneden, te beginnen met je kin.", "Laat het gewicht hangen en je omlaag trekken.", "Rol op dezelfde manier terug omhoog, je wervelkolom van onderaf opstapelend."],
    cues: ["Dit is bewust je rug buigen onder een lichte last. Licht is licht — begin zonder gewicht."],
    avoid: ["Haasten, of te snel zwaarder gaan. Zeurt je rug, sla dit dan over en doe een pancake."],
  },
  pancake: {
    name: "Pancake-reik", type: "mobility", unit: "seconden", base: 60, intro: 1,
    levels: {
      easier: { name: "Op een kussen, knieën licht gebogen", f: 1 },
      standard: { name: "Zittende spreidzit, naar voren reiken", f: 1 },
      harder: { name: "Borst laag, benen wijd en gestrekt", f: 1 },
    },
    setup: "Zit met je benen wijd, knieschijven naar boven.",
    how: ["Scharnier vanuit je heupen en loop met je handen naar voren.", "Houd vast en adem in de rek."],
    cues: ["Je borst gaat voorop, niet je hoofd."],
    avoid: ["Je onderrug hard rond maken om lager te komen."],
  },
  bearcrawl: {
    name: "Berenloop", type: "mobility", unit: "stappen", base: 40, intro: 1,
    levels: {
      easier: { name: "Berenhouding op de plek, knieën net van de grond", f: 1.15 },
      standard: { name: "Berenloop vooruit en achteruit", f: 1 },
      harder: { name: "Langzaam, knieën de hele tijd een paar centimeter van de grond", f: 0.75 },
    },
    setup: "Handen onder je schouders, knieën onder je heupen en net boven de grond.",
    how: ["Beweeg tegenovergestelde hand en voet tegelijk.", "Houd je heupen laag en recht — niet kwispelen."],
    cues: ["Kleine stapjes. Stille handen en voeten."],
    avoid: ["Heupen die omhoog gaan naar een hond-naar-beneden."],
  },
  crab: {
    name: "Krabreik", type: "mobility", unit: "herhalingen totaal, afwisselend", base: 16, intro: 1,
    levels: {
      easier: { name: "Heupen heffen tot tafelblad, zonder reik", f: 1.15 },
      standard: { name: "Krabreik, één arm over je hoofd", f: 1 },
      harder: { name: "Krabreik met bovenin even stil", f: 0.8 },
    },
    setup: "Zit met je voeten plat en je handen achter je, vingers naar achteren.",
    how: ["Til je heupen op tot een tafelblad.", "Reik met één arm omhoog en over je heen, borst open naar het plafond.", "Zak en wissel."],
    cues: ["Duw je heupen hoog voordat je arm reikt."],
    avoid: ["Doorhangen in de schouder die op de grond staat."],
  },
  sidekick: {
    name: "Side kick-through", type: "mobility", unit: "herhalingen totaal, afwisselend", base: 20, intro: 4,
    levels: {
      easier: { name: "Langzaam, knie blijft gebogen", f: 1.15 },
      standard: { name: "Side kick-through vanuit de berenhouding", f: 1 },
      harder: { name: "Lang uitstrekken, heupen hoog, even stil aan het eind", f: 0.8 },
    },
    setup: "Begin in de berenhouding, knieën net van de grond.",
    how: ["Til één hand en de tegenovergestelde voet op.", "Schop dat been onder je lichaam door terwijl je heupen naar het plafond draaien.", "Terug naar de berenhouding en wissel."],
    cues: ["Je ogen volgen de reikende hand. Beweeg in een tempo waarin je kunt stoppen."],
    avoid: ["Het been erdoor gooien en op je heup landen."],
  },
  wallslide: {
    name: "Muurglijders", type: "mobility", unit: "herhalingen", base: 15, intro: 1,
    levels: {
      easier: { name: "Een stap van de muur af", f: 1 },
      standard: { name: "Rug plat tegen de muur", f: 1 },
      harder: { name: "Onderrug de hele tijd tegen de muur, langzaam", f: 0.8 },
    },
    setup: "Rug tegen een muur, ellebogen en polsen tegen de muur in een doelpaalvorm.",
    how: ["Schuif je armen zo ver omhoog als je kunt terwijl ze de muur blijven raken.", "Schuif terug omlaag en knijp je schouderbladen samen."],
    cues: ["Ribben blijven omlaag. Trekt je onderrug hol, dan ben je te ver."],
    avoid: ["Je polsen van de muur laten loskomen."],
  },

  /* --- Bekkenbodem: een apart dagelijks spoor, geen deel van de rotatie --- */
  pfQuick: {
    name: "Snelle knijpers", type: "pelvic", unit: "herhalingen", base: 60, intro: 1,
    levels: {
      easier: { name: "Op je rug, knieën gebogen", f: 1 },
      standard: { name: "Rechtop zittend", f: 1 },
      harder: { name: "Staand", f: 1 },
    },
    setup: "Zoek eerst de spier. Het is de spier waarmee je een wind tegenhoudt, of waarmee de basis van je penis iets omhoog komt. Leg een hand op je buik — die moet zacht blijven.",
    how: [
      "Knijp ongeveer een seconde en laat dan helemaal los.",
      "Het loslaten is net zo belangrijk als het knijpen. Laat hem helemaal terugzakken voor de volgende.",
      "Blijf de hele tijd gewoon ademen.",
    ],
    cues: [
      "Billen, buik en bovenbenen doen niet mee. Doen ze dat wel, dan knijp je harder dan nodig.",
      "Verdeel ze over de dag. Niemand ziet dat je ze doet.",
    ],
    avoid: [
      "Je adem inhouden, of persen in plaats van optillen.",
      "Oefenen tijdens het plassen. Dat is een eenmalige manier om de spier te vinden, geen manier om hem te trainen.",
    ],
  },
  pfHold: {
    name: "Lang vasthouden", type: "pelvic", unit: "herhalingen", base: 25, intro: 1,
    levels: {
      easier: { name: "3 tellen vasthouden, liggend", f: 1 },
      standard: { name: "5 tellen vasthouden, zittend", f: 1 },
      harder: { name: "10 tellen vasthouden, staand", f: 1 },
    },
    setup: "Dezelfde spier als bij de snelle knijpers, nu vastgehouden in plaats van kort geknepen.",
    how: [
      "Til op en houd vast zonder dat het knijpen halverwege wegzakt.",
      "Adem door de hold heen — in en uit, niet inhouden.",
      "Rust minstens zo lang als je vasthield voor de volgende.",
    ],
    cues: [
      "Een zuivere hold van 3 tellen wint van een slordige van 10. Ga pas een niveau omhoog als de hele hold stabiel blijft.",
      "Zakt het knijpen steeds weg, dan heb je je echte beginpunt gevonden. Dat is nuttige informatie, geen falen.",
    ],
    avoid: ["Zo hard knijpen dat de rest van je lichaam meespant. Mik op ongeveer de helft van je maximale kracht."],
  },
  pfRelease: {
    name: "Omgekeerde kegel", type: "pelvic", unit: "herhalingen", base: 20, intro: 1,
    levels: {
      easier: { name: "Liggend, lange rustige ademhalingen", f: 1 },
      standard: { name: "Zittend, ademen naar je buik", f: 1 },
      harder: { name: "In een diepe squat", f: 1 },
    },
    setup: "Dit is de andere helft van het werk. Een bekkenbodem die alleen maar knijpt wordt gespannen, niet sterk — en gespannen is een probleem op zich.",
    how: [
      "Adem langzaam in en laat het hele gebied breder worden en zakken, zoals vlak voordat je loslaat.",
      "Het is loslaten, geen persen. Niet forceren.",
      "Adem uit en kom terug naar neutraal. Dat is één herhaling.",
    ],
    cues: [
      "Voel je niets gebeuren, ga dan liggen en leg een hand laag op je buik. De beweging is klein.",
      "Doe deze na het knijpwerk, niet ervoor.",
    ],
    avoid: ["Hard persen. Voel je druk naar buiten, doe dan rustiger — dan ben je voorbij het loslaten."],
  },

  jumprope: {
    name: "Touwtjespringen", type: "conditioning", unit: "sprongen", base: 300, intro: 1,
    levels: {
      easier: { name: "Zonder touw — springen met polsrondjes", f: 1.15 },
      standard: { name: "Gewoon op twee voeten", f: 1 },
      harder: { name: "Wisselende voeten of hoger tempo", f: 0.9 },
    },
    setup: "De handvatten komen tot je heupen als je op het midden van het touw staat.",
    how: ["Kleine sprongetjes, een paar centimeter van de grond.", "Draai het touw vanuit je polsen, ellebogen dicht bij je lichaam.", "Verdeel het totaal in sets van 50–100."],
    cues: ["Land zacht op de bal van je voet."],
    avoid: ["Grote sprongen met je knieën omhoog. Laag en snel wint van hoog en traag."],
  },
  burpee: {
    name: "Burpee", type: "conditioning", unit: "herhalingen", base: 30, intro: 1,
    levels: {
      easier: { name: "Stap naar achteren, stap terug, niet springen", f: 1.15 },
      standard: { name: "Spring naar achteren, spring terug, spring bovenin", f: 1 },
      harder: { name: "Volle burpee met je borst op de grond", f: 0.75 },
    },
    setup: "Sta rechtop met ruimte voor je.",
    how: ["Handen neer, voeten naar achteren tot een plank.", "Borst naar de grond als je de volle versie doet.", "Voeten terug en sta op of spring."],
    cues: ["Kies een tempo dat je de hele set volhoudt."],
    avoid: ["Doorzakkende heupen in de plank."],
  },
  mountainclimber: {
    name: "Mountain climber", type: "conditioning", unit: "herhalingen totaal", base: 60, intro: 1,
    levels: {
      easier: { name: "Handen op een bank, rustig tempo", f: 1.15 },
      standard: { name: "Gewoon tempo op de grond", f: 1 },
      harder: { name: "Hoog tempo, heupen laag", f: 0.9 },
    },
    setup: "Push-uphouding, handen onder je schouders.",
    how: ["Breng één knie naar je borst en wissel.", "Houd je heupen op schouderhoogte."],
    cues: ["Schouders blijven boven je handen."],
    avoid: ["Heupen die op en neer stuiteren."],
  },
  stepup: {
    name: "Opstappen", type: "conditioning", unit: "herhalingen totaal, afwisselend", base: 40, intro: 4,
    levels: {
      easier: { name: "Lage trede, hand aan de muur", f: 1.15 },
      standard: { name: "Trede op kniehoogte", f: 1 },
      harder: { name: "Hogere trede, niet afzetten met je achterste voet", f: 0.8 },
    },
    setup: "Zoek een stevige kist, trede of bank.",
    how: ["Zet je hele voet op de trede.", "Duw via dat been omhoog tot je rechtop staat.", "Gecontroleerd terug en wissel."],
    cues: ["Zo min mogelijk afzetten met je achterste voet."],
    avoid: ["Afveren van je onderste been."],
  },

  /* ── Vervangers zonder stang. Komen in plaats van de hangoefeningen als je
     aangeeft dat je geen optrekstang hebt. Een deur, een tafel en de vloer is
     alles wat ze nodig hebben. ──────────────────────────────────────────── */
  towelrow: {
    name: "Handdoekroeien aan de deur", type: "strength", unit: "herhalingen", base: 24, intro: 1,
    levels: {
      easier: { name: "Voeten dicht bij de deur, lichaam rechtop", f: 1.15 },
      standard: { name: "Voeten verder weg, lichaam ongeveer op 45°", f: 1 },
      harder: { name: "Voeten ver weg, lichaam bijna horizontaal", f: 0.7 },
    },
    setup: "Haal een stevige handdoek om beide klinken van een dichte, vergrendelde deur en sta aan de kant waar de deur van je af opengaat, zodat je trek hem in de sponning drukt. Eén uiteinde in elke hand, armen gestrekt, leun achterover.",
    how: [
      "Loop met je voeten naar de deur tot je gewicht via je armen naar achteren hangt.",
      "Trek je borst naar je handen, ellebogen dicht bij je ribben.",
      "Gecontroleerd terug tot je armen weer gestrekt zijn.",
    ],
    cues: ["Eerst bewegen je schouderbladen, dan je armen.", "Je lichaam blijft één rechte lijn — span je billen aan."],
    avoid: ["Een holle deur of een losse klink. Hang er eerst één keer met je volle gewicht aan voor je een set begint.", "Heupen die naar achteren zakken als de set zwaar wordt."],
  },
  pronepull: {
    name: "Lattrek in buiklig", type: "strength", unit: "herhalingen", base: 24, intro: 1,
    levels: {
      easier: { name: "Armen wijd, duimen omhoog, klein optillen", f: 1.2 },
      standard: { name: "Armen boven je hoofd, ellebogen naar je ribben, 1 tel aanspannen", f: 1 },
      harder: { name: "Onderin elke herhaling 3 tellen aanspannen", f: 0.75 },
    },
    setup: "Lig op je buik, voorhoofd op de grond of een opgevouwen handdoek, armen gestrekt boven je hoofd.",
    how: [
      "Til je handen net van de grond.",
      "Trek je ellebogen omlaag en naar achteren naar je ribben en knijp je schouderbladen samen.",
      "Reik terug boven je hoofd zonder je handen neer te leggen.",
    ],
    cues: ["Er is geen gewicht, dus het aanspannen is de hele oefening. Langzaam wint van veel.", "Schouders de hele tijd weg van je oren."],
    avoid: ["Je borst en kin optillen om het zwaarder te laten voelen — het werk hoort in je rug, niet in je nek."],
  },
  legraise: {
    name: "Liggend benen heffen", type: "strength", unit: "herhalingen", base: 15, intro: 1,
    levels: {
      easier: { name: "Knieën gebogen, handen onder je heupen", f: 1.3 },
      standard: { name: "Gestrekte benen, zakken tot net boven de grond", f: 1 },
      harder: { name: "Gestrekte benen, drie tellen omlaag", f: 0.7 },
    },
    setup: "Lig op je rug, handen onder je heupen of plat naast je. Druk je onderrug tegen de grond.",
    how: [
      "Til je benen op tot ze naar het plafond wijzen.",
      "Laat ze langzaam zakken terwijl je onderrug plat blijft.",
      "Stop voordat je rug loskomt van de grond — dat punt is je bereik.",
    ],
    cues: ["Onderrug vastgeplakt aan de grond. Daar draait deze oefening om.", "Buig je knieën zodra je rug hol begint te trekken."],
    avoid: ["Hol trekken en je benen omhoog sjorren met je heupbuigers."],
  },
  doorlat: {
    name: "Latstretch in de deuropening", type: "mobility", unit: "seconden", base: 60, intro: 1,
    levels: {
      easier: { name: "Handen op een tafel, knieën licht gebogen", f: 1 },
      standard: { name: "Handen op een deurpost op borsthoogte, heupen naar achteren", f: 1 },
      harder: { name: "Eén arm tegelijk, ribben wegdraaiend", f: 0.9 },
    },
    setup: "Handen op een deurpost of de rand van een tafel op ongeveer borsthoogte, voeten onder je heupen.",
    how: [
      "Loop naar achteren en laat je heupen van je handen weg zakken.",
      "Laat je borst tussen je armen zakken en je hoofd hangen.",
      "Adem laag en laat het zakken in plaats van erin te duwen.",
    ],
    cues: ["Dit geeft je wat het hangen je geeft: lengte langs je lats en je flank.", "Stuur je heupen naar achteren, duw niet met je armen."],
    avoid: ["Je onderrug laten inzakken. Houd je middel licht aangespannen."],
  },
};

/* Engelse namen alleen voor de videozoekopdracht; op YouTube vind je met de
   Engelse term veel meer uitleg. Ontbreekt een naam, dan zoekt hij op de
   Nederlandse. */
const EN_NAME = {
  row: "inverted row", lunge: "reverse lunge", sldl: "single leg deadlift", bridge: "glute bridge",
  hkr: "hanging knee raise", deepsquat: "deep squat hold", ninety: "90/90 hip switch", openbook: "thoracic open book",
  passthrough: "shoulder pass through", cossack: "cossack squat", pancake: "pancake stretch", bearcrawl: "bear crawl",
  crab: "crab reach", wallslide: "scapular wall slide", pfQuick: "pelvic floor quick flicks", pfHold: "pelvic floor long holds",
  pfRelease: "reverse kegel", jumprope: "jump rope basic bounce", stepup: "step up", towelrow: "towel door row",
  pronepull: "prone lat pull", legraise: "lying leg raise", doorlat: "doorway lat stretch",
};

/* Movements named on the original Strength Side page. Everything else is our own
   addition, chosen to fill out the strength / mobility / conditioning rotation. */
const FROM_SOURCE = new Set(["squat", "lunge", "pushup", "pullup", "row", "hkr", "couch", "bearcrawl", "crab", "jumprope", "burpee"]);

/* Without a pull-up bar, everything you'd have to hang from gets a stand-in.
   More than one, so that a day holding two hanging movements doesn't turn into
   the same row twice. */
const NO_BAR = {
  pullup: ["towelrow", "pronepull"],
  chinup: ["pronepull", "towelrow"],
  hkr: ["legraise"],
  deadhang: ["doorlat"],
};
const NEEDS_BAR = Object.keys(NO_BAR);

/* Welk soort trek het is, zodat een dag met een rij erin niet nog een rij
   als vervanger krijgt. */
const PATTERN = { row: "row", towelrow: "row", pronepull: "floorpull", legraise: "core", doorlat: "lats" };

function swapForNoBar(ids) {
  const out = [];
  const from = {};
  const patterns = new Set(ids.map((id) => PATTERN[id]).filter(Boolean));
  ids.forEach((id) => {
    if (!NO_BAR[id]) { out.push(id); return; }
    const free = NO_BAR[id].filter((a) => !out.includes(a));
    const alt = free.find((a) => !patterns.has(PATTERN[a])) || free[0] || NO_BAR[id][0];
    patterns.add(PATTERN[alt]);
    from[alt] = id;
    out.push(alt);
  });
  return { ids: out, from };
}

/* ---------- Program structure ---------- */

const WEEK_PATTERN = ["strength", "mobility", "strength", "mobility", "strength", "conditioning", "mobility"];
const WEEK_MULT = [0.85, 1.0, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9];

const TEMPLATES = {
  strength: [
    ["pushup", "row", "squat", "hollow"],
    ["pullup", "dip", "lunge", "hkr"],
    ["chinup", "pushup", "sldl", "bridge"],
    ["dip", "pullup", "squat", "hkr"],
    ["pikepushup", "chinup", "lunge", "hollow"],
    ["pullup", "row", "sldl", "hkr"],
  ],
  mobility: [
    ["couch", "deepsquat", "openbook", "deadhang"],
    ["ninety", "passthrough", "pancake", "bearcrawl"],
    ["cossack", "wallslide", "crab", "deadhang"],
    ["deepsquat", "openbook", "crab", "couch"],
    ["sidekick", "bearcrawl", "passthrough", "pancake"],
    ["couch", "ninety", "jefferson", "deepsquat"],
  ],
  conditioning: [
    ["jumprope", "burpee", "bearcrawl", "squat"],
    ["jumprope", "mountainclimber", "stepup", "pushup"],
    ["jumprope", "burpee", "hkr", "lunge"],
  ],
};

const PHASES = [
  { weeks: [1, 2, 3], name: "De basis", note: "Leg het fundament. Kwaliteit boven kwantiteit — elke herhaling ziet eruit als de vorige." },
  { weeks: [4, 5, 6], name: "Meer en anders", note: "De doelen lopen op en er komen nieuwe varianten bij. Kies het niveau waarop de laatste herhalingen zwaar maar zuiver zijn." },
  { weeks: [7, 8], name: "Verdichten", note: "Dezelfde oefeningen, grotere sets. Probeer je herhalingen in minder, langere sets te doen dan vorige week." },
];

const roundGoal = (n) => (n >= 100 ? Math.round(n / 10) * 10 : n >= 30 ? Math.round(n / 5) * 5 : Math.round(n));

function weekOf(day) { return Math.min(8, Math.floor((day - 1) / 7) + 1); }
function phaseOf(day) { const w = weekOf(day); return PHASES.find((p) => p.weeks.includes(w)); }

/* Pelvic floor runs every single day, but only one movement at a time.
   Over a seven-day cycle that works out at three days of quick flicks, two of
   long holds and two of reverse kegels — so the squeezing and the releasing
   side both keep their place. Because each one comes round less often, the
   daily goals are higher than they would be with all three every day, and the
   weekly climb still comes from WEEK_MULT. */
const PELVIC_ROTATION = ["pfQuick", "pfHold", "pfRelease", "pfQuick", "pfHold", "pfQuick", "pfRelease"];

function buildDaily(day, levels) {
  const week = weekOf(day);
  const id = PELVIC_ROTATION[(day - 1) % PELVIC_ROTATION.length];
  const ex = EX[id];
  const level = levels[id] || "standard";
  return [{ id, level, goal: roundGoal(ex.base * WEEK_MULT[week - 1] * ex.levels[level].f) }];
}

function buildDay(day, levels, equipment = {}) {
  if (day === 1) return { day, focus: "test", kind: "baseline", exercises: [] };
  if (day === TOTAL_DAYS) return { day, focus: "test", kind: "retest", exercises: [] };

  const week = weekOf(day);
  const focus = WEEK_PATTERN[(day - 1) % 7];

  // count how many days of this focus have come before, to rotate templates
  let count = 0;
  for (let d = 2; d < day; d++) if (d !== TOTAL_DAYS && WEEK_PATTERN[(d - 1) % 7] === focus) count++;

  const pool = TEMPLATES[focus].filter((t) => t.every((id) => EX[id].intro <= week));
  const planned = pool[count % pool.length];
  const { ids, from } = equipment.bar ? { ids: planned, from: {} } : swapForNoBar(planned);

  const exercises = ids.map((id) => {
    const ex = EX[id];
    const level = levels[id] || "standard";
    const goal = roundGoal(ex.base * WEEK_MULT[week - 1] * ex.levels[level].f);
    return from[id] ? { id, level, goal, sub: from[id] } : { id, level, goal };
  });

  return { day, focus, kind: "workout", exercises };
}

/* ---------- Baseline / retest ---------- */

const TEST_FIELDS = [
  { id: "pushups", label: "Max push-ups", hint: "Eén set. Stop als je heupen gaan doorzakken.", unit: "herh." },
  { id: "pullups", label: "Max pull-ups", hint: "Van helemaal hangen tot je kin boven de stang. Nul is ook een antwoord.", unit: "herh." },
  { id: "squats", label: "Squats in 60 seconden", hint: "Volle diepte, rustig tempo.", unit: "herh." },
  { id: "hang", label: "Dead hang", hint: "Eén keer hangen, zo lang als je het volhoudt.", unit: "sec" },
  { id: "squathold", label: "Diepe squat houden", hint: "Hielen aan de grond, in één keer.", unit: "sec" },
];

const GROUP_LABELS = { push: "Duwen", pull: "Trekken", legs: "Benen en romp", mobility: "Mobiliteit" };
const GROUP_HINTS = {
  push: "Push-ups, dips, pike push-ups",
  pull: "Pull-ups, chin-ups, roeien, hangen",
  legs: "Squats, lunges, bilbruggen, burpees",
  mobility: "Houdingen, stretches, kruipen",
};

const LEVEL_ORDER = ["easier", "standard", "harder"];
const LEVEL_LABEL = { easier: "Makkelijker", standard: "Standaard", harder: "Zwaarder" };

/* Your test numbers set your starting variations. */
function calibrate(t) {
  const band = (v, a, b) => (v < a ? "easier" : v <= b ? "standard" : "harder");
  const lower = (a, b) => LEVEL_ORDER[Math.min(LEVEL_ORDER.indexOf(a), LEVEL_ORDER.indexOf(b))];
  return {
    push: band(t.pushups, 8, 25),
    pull: t.pullups === 0 ? "easier" : band(t.pullups, 1, 8),
    legs: band(t.squats, 25, 45),
    mobility: lower(band(t.squathold, 30, 90), band(t.hang, 20, 60)),
  };
}

/* ---------- Date helpers ---------- */

const iso = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
/* Klaar met het programma: de hermeting op de laatste dag is opgeslagen. */
const isFinished = (state) => state.currentDay === TOTAL_DAYS && state.history.some((h) => h.day === TOTAL_DAYS);

const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

const FOCUS = {
  strength: { label: "Kracht", color: "#FF5C00" },
  mobility: { label: "Mobiliteit", color: "#5AA9E6" },
  conditioning: { label: "Conditioning", color: "#E4C05A" },
  pelvic: { label: "Bekkenbodem", color: "#9AA0A6" },
  test: { label: "Meting", color: "#FAFAFA" },
};

const GROUP_OF = { pushup: "push", dip: "push", pikepushup: "push", pullup: "pull", chinup: "pull", row: "pull", hkr: "pull", towelrow: "pull", pronepull: "pull" };
const groupOf = (id) => {
  if (GROUP_OF[id]) return GROUP_OF[id];
  const t = EX[id].type;
  return t === "mobility" ? "mobility" : t === "pelvic" ? "pelvic" : "legs";
};

const EQUIPMENT = [
  { id: "bar", label: "Optrekstang", note: "Een stang in de deuropening of eentje in het park. Zonder stang worden de hangoefeningen vervangen door versies met een deur, een tafel en de vloer.", required: false },
  { id: "rings", label: "Turnringen", note: "Voor het roeien. Een stevige tafel kan ook." },
  { id: "rope", label: "Springtouw", note: "Voor de conditiedagen. Er is ook een versie zonder touw." },
  { id: "band", label: "Weerstandselastiek", note: "Voor pull-ups en chin-ups met hulp." },
  { id: "weight", label: "Dumbbell, kettlebell of gewichtsvest", note: "Niet nodig. Komt terug bij een paar zwaardere niveaus." },
];

const DEFAULT_STATE = {
  v: 1,
  onboarded: false,
  equipment: {},
  seen: {},
  startedAt: null,
  currentDay: 1,
  levels: {},
  logged: {},
  /* Wat je vandaag per oefening los hebt gelogd, zodat één mistik eruit kan
     zonder de rest kwijt te raken. logged blijft het totaal en de waarheid;
     ontbreekt entries (oudere opslag), dan telt het totaal als één beurt. */
  entries: {},
  loggedDay: null,
  lastCompletedDate: null,
  gapHandledOn: null,
  history: [],
  baseline: null,
  retest: null,
};

/* ============================================================
   App shell
   ============================================================ */

export default function RepsTab({ onExit, onPersist }) {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("today");
  const [sheet, setSheet] = useState(null); // { id, mode: 'log' | 'read' }
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
        /* first run */
      }
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
        onPersist?.(next);          // ook naar de cloud, zodat dit niet alleen lokaal staat
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
        onDone={(equipment) => {
          const levels = {};
          Object.keys(EX).forEach((id) => { levels[id] = "standard"; });
          if (!equipment.rope) levels.jumprope = "easier";
          save({ ...state, onboarded: true, equipment, levels });
        }}
      />
    );
  }

  const today = iso();
  const doneToday = state.lastCompletedDate === today;
  const workout = buildDay(state.currentDay, state.levels, state.equipment);
  const daily = buildDaily(state.currentDay, state.levels);
  const logged = state.loggedDay === state.currentDay ? state.logged : {};
  const entries = state.loggedDay === state.currentDay ? (state.entries || {}) : {};
  const entriesFor = (id) => entries[id] || (logged[id] > 0 ? [logged[id]] : []);

  const missed = state.lastCompletedDate ? Math.max(0, dayDiff(state.lastCompletedDate, today) - 1) : 0;
  /* Na de hermeting staat currentDay nog op dag 56; zonder deze check kwam
     het testformulier steeds opnieuw terug en kon je de hermeting overschrijven. */
  const finished = isFinished(state);
  const showGap = !finished && missed > 0 && state.gapHandledOn !== today && state.history.length > 0;

  const setLevel = (id, level) =>
    save({ ...state, levels: { ...state.levels, [id]: level }, seen: { ...state.seen, [id]: true } });

  /* Kit can change any day. Today's session is rebuilt straight away; anything
     you already logged for a movement that stays in the day keeps its reps. */
  const setEquipment = (equipment) => {
    const levels = { ...state.levels };
    if (!equipment.rope) levels.jumprope = "easier";
    save({ ...state, equipment, levels });
  };

  const addReps = (id, n) => {
    const ex = [...workout.exercises, ...daily].find((e) => e.id === id);
    if (!ex) return;
    const was = logged[id] || 0;
    const next = Math.max(0, Math.min(ex.goal, was + n));
    const delta = next - was;
    if (!delta) return;
    save({
      ...state,
      loggedDay: state.currentDay,
      logged: { ...logged, [id]: next },
      entries: { ...entries, [id]: [...entriesFor(id), delta] },
      seen: { ...state.seen, [id]: true },
    });
  };

  // Eén beurt terugnemen; het totaal is de som van wat overblijft.
  const removeEntry = (id, idx) => {
    const list = entriesFor(id).filter((_, i) => i !== idx);
    save({
      ...state,
      loggedDay: state.currentDay,
      logged: { ...logged, [id]: list.reduce((a, b) => a + b, 0) },
      entries: { ...entries, [id]: list },
    });
  };

  const completeDay = () => {
    const entry = {
      day: state.currentDay,
      date: today,
      focus: workout.focus,
      done: workout.exercises.reduce((s, e) => s + (logged[e.id] || 0), 0),
      goal: workout.exercises.reduce((s, e) => s + e.goal, 0),
      exercises: [...workout.exercises, ...daily].map((e) => ({ ...e, logged: logged[e.id] || 0 })),
    };
    save({
      ...state,
      startedAt: state.startedAt || today,
      history: [...state.history.filter((h) => h.day !== state.currentDay), entry],
      lastCompletedDate: today,
      currentDay: Math.min(TOTAL_DAYS, state.currentDay + 1),
      logged: {},
      entries: {},
      loggedDay: null,
    });
  };

  const saveTest = (which, values, calibrated) => {
    const entry = { day: state.currentDay, date: today, focus: "test", done: 0, goal: 0, exercises: [], test: values };
    const levels = { ...state.levels };
    if (calibrated) Object.keys(EX).forEach((id) => { levels[id] = calibrated[groupOf(id)] || levels[id] || "standard"; });
    if (!state.equipment.rope) levels.jumprope = "easier";
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
      save({ ...state, currentDay: Math.min(TOTAL_DAYS, state.currentDay + missed), gapHandledOn: today, logged: {}, entries: {}, loggedDay: null });
    } else {
      save({ ...state, gapHandledOn: today });
    }
  };

  const resetAll = () =>
    save({ ...DEFAULT_STATE, onboarded: true, equipment: state.equipment, levels: state.levels, seen: state.seen });

  const sheetEntry = sheet
    ? sheet.mode === "log"
      ? [...workout.exercises, ...daily].find((e) => e.id === sheet.id)
      : { id: sheet.id, level: state.levels[sheet.id] || "standard", goal: null,
          ...(!state.equipment.bar && NEEDS_BAR.includes(sheet.id) ? { needsBar: true } : {}) }
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50" style={{ fontFamily: FONT }}>
      <div className="mx-auto max-w-md pb-28">
        <Header state={state} onExit={onExit} />

        {saveError && (
          <p className="mx-5 mb-4 border-l-2 border-neutral-700 pl-3 text-xs leading-relaxed text-neutral-400">
            Reps aren't saving right now. They stay on screen, but may not survive a reload.
          </p>
        )}

        {tab === "today" && (
          <Today
            state={state} workout={workout} daily={daily} logged={logged} doneToday={doneToday}
            programDone={finished} onProgress={() => setTab("progress")}
            onOpen={(id) => setSheet({ id, mode: "log" })}
            onComplete={completeDay} onSaveTest={saveTest}
          />
        )}
        {tab === "moves" && <Moves levels={state.levels} onOpen={(id) => setSheet({ id, mode: "read" })} />}
        {tab === "progress" && <ProgressTab state={state} onPick={setReviewDay} onEquipment={setEquipment} onReset={resetAll} />}
      </div>

      <Nav tab={tab} setTab={setTab} onExit={onExit} />

      {sheetEntry && (
        <ExerciseSheet
          entry={sheetEntry}
          logged={logged[sheetEntry.id] || 0}
          entries={entriesFor(sheetEntry.id)}
          previous={lastTime(state.history, sheetEntry.id, state.currentDay)}
          day={sheet.mode === "log" ? [...workout.exercises, ...daily] : null}
          allLogged={logged}
          firstTime={!state.seen[sheetEntry.id]}
          readOnly={sheet.mode === "read" || doneToday}
          onLevel={(l) => setLevel(sheetEntry.id, l)}
          onAdd={(n) => addReps(sheetEntry.id, n)}
          onRemove={(i) => removeEntry(sheetEntry.id, i)}
          onSwitch={(id) => setSheet({ id, mode: "log" })}
          onClose={() => setSheet(null)}
        />
      )}

      {reviewDay && <Review entry={reviewDay} onClose={() => setReviewDay(null)} />}
      {showGap && <GapModal missed={missed} onChoose={handleGap} />}
    </div>
  );
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const isTimed = (id) => EX[id].unit.indexOf("sec") !== -1;

/* Wat je de vorige keer bij deze oefening hebt gehaald. Staat al in je
   geschiedenis; het is het getal waar je naar zoekt als je twijfelt. */
function lastTime(history, id, currentDay) {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.day >= currentDay) continue;
    const e = (h.exercises || []).find((x) => x.id === id);
    if (e && e.logged > 0) return { logged: e.logged, goal: e.goal, day: h.day };
  }
  return null;
}

/* Ringetje met het aantal dat nog te gaan is, voor de oefeningenrij bovenin
   het venster. */
function CountRing({ pct, label, color, dim }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-10 w-10 items-center justify-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-10 w-10 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#2A2A2A" strokeWidth="2.5" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, pct))} strokeLinecap="round" />
      </svg>
      <span className="relative text-[11px] font-bold tabular-nums" style={{ color: dim ? "#A3A3A3" : "#FAFAFA" }}>{label}</span>
    </span>
  );
}

function ExerciseStrip({ day, allLogged, activeId, onSwitch }) {
  return (
    <div className="flex gap-1 overflow-x-auto px-3 pb-3 pt-1" style={{ scrollbarWidth: "none" }}>
      {day.map((e) => {
        const done = Math.min(e.goal, allLogged[e.id] || 0);
        const left = Math.max(0, e.goal - done);
        const on = e.id === activeId;
        return (
          <button key={e.id} onClick={() => onSwitch(e.id)} aria-current={on ? "true" : undefined}
            className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 ${RING}`}
            style={on ? { backgroundColor: "#1F1F1F" } : undefined}>
            <CountRing pct={done / e.goal} color={left === 0 ? "#3F8F5B" : ACCENT} dim={!on}
              label={left === 0 ? "✓" : isTimed(e.id) ? mmss(left) : String(left)} />
            <span className="w-full truncate text-center text-[9px] leading-tight"
              style={{ color: on ? "#FAFAFA" : "#737373" }}>{EX[e.id].name}</span>
          </button>
        );
      })}
    </div>
  );
}

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const RING = "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950";

/* ---------- Shared bits ---------- */

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="text-[11px] font-bold uppercase tracking-[0.35em] text-neutral-700">Daily Reps</div>
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
        {/* Altijd bereikbare uitgang bovenaan; onderaan het scherm zit de
            home-indicator van de telefoon in de weg. */}
        {onExit && (
          <button onClick={onExit}
            className={`flex min-h-[44px] shrink-0 items-center rounded-lg border border-neutral-700 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-300 active:bg-neutral-800 ${RING}`}>
            ← Plan
          </button>
        )}
        <div className="truncate text-[11px] font-bold uppercase tracking-[0.3em]">Daily Reps</div>
      </div>
      {streak > 1 && (
        <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          <span className="tabular-nums" style={{ color: ACCENT }}>{streak}</span> op rij
        </div>
      )}
    </header>
  );
}

/* Signature element: the day laid out as rep ticks, one block per movement,
   each block sized to its share of the day's work. */
function DayBar({ exercises, logged }) {
  const total = exercises.reduce((s, e) => s + e.goal, 0);
  return (
    <div className="flex h-2.5 w-full gap-[3px]" aria-hidden="true">
      {exercises.map((e) => {
        const done = Math.min(e.goal, logged[e.id] || 0);
        const ticks = e.goal <= 30;
        return (
          <div key={e.id} className="flex gap-[2px]" style={{ flexGrow: e.goal / total, flexBasis: 0 }}>
            {ticks
              ? Array.from({ length: e.goal }).map((_, i) => (
                  <div key={i} className="h-full flex-1" style={{ backgroundColor: i < done ? ACCENT : "#282828" }} />
                ))
              : (
                <div className="h-full w-full" style={{ backgroundColor: "#282828" }}>
                  <div className="h-full" style={{ width: `${(done / e.goal) * 100}%`, backgroundColor: ACCENT }} />
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}

function RepTicks({ goal, logged }) {
  if (goal <= 30) {
    return (
      <div className="flex h-1.5 gap-[2px]" aria-hidden="true">
        {Array.from({ length: goal }).map((_, i) => (
          <div key={i} className="h-full flex-1" style={{ backgroundColor: i < logged ? ACCENT : "#282828" }} />
        ))}
      </div>
    );
  }
  return (
    <div className="h-1.5 w-full" style={{ backgroundColor: "#282828" }} aria-hidden="true">
      <div className="h-full" style={{ width: `${Math.min(100, (logged / goal) * 100)}%`, backgroundColor: ACCENT }} />
    </div>
  );
}

/* Waar je staat in de acht weken: een balk per fase, en de dagen van deze
   week met een slot op wat nog niet open is. */
function ProgramBar({ history }) {
  const done = history.length;
  const pct = Math.round((done / TOTAL_DAYS) * 100);
  return (
    <div>
      <div className="flex gap-1">
        {PHASES.map((ph) => {
          const first = (ph.weeks[0] - 1) * 7 + 1;
          const last = ph.weeks[ph.weeks.length - 1] * 7;
          const span = last - first + 1;
          const filled = Math.max(0, Math.min(span, done - (first - 1)));
          return (
            <div key={ph.name} className="h-1" style={{ flexGrow: span, flexBasis: 0, backgroundColor: "#262626" }}>
              <div className="h-full" style={{ width: `${(filled / span) * 100}%`, backgroundColor: ACCENT }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
        {pct}% van het programma gedaan
      </div>
    </div>
  );
}

function WeekStrip({ currentDay, history }) {
  const week = weekOf(currentDay);
  const start = (week - 1) * 7 + 1;
  const done = new Set(history.map((h) => h.day));
  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = start + i;
        if (d > TOTAL_DAYS) return <div key={d} className="flex-1" />;
        const isDone = done.has(d);
        const isToday = d === currentDay;
        const locked = d > currentDay;
        return (
          <div key={d}
            className="flex h-7 flex-1 items-center justify-center text-[11px] font-bold tabular-nums"
            style={{
              backgroundColor: isDone ? ACCENT : isToday ? "#1F1F1F" : "#161616",
              color: isDone ? "#0A0A0A" : isToday ? ACCENT : "#3D3D3D",
              boxShadow: isToday ? `inset 0 0 0 1px ${ACCENT}` : undefined,
            }}>
            {locked ? <span className="text-[10px] leading-none">🔒</span> : d}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Today ---------- */

function Today({ state, workout, daily, logged, doneToday, programDone, onProgress, onOpen, onComplete, onSaveTest }) {
  if (programDone) return <Finished state={state} onProgress={onProgress} />;
  if (workout.kind === "baseline" || workout.kind === "retest") {
    return <TestScreen kind={workout.kind} baseline={state.baseline} onSave={onSaveTest} />;
  }

  if (doneToday) return <RestOfDay day={state.currentDay - 1} />;

  const week = weekOf(state.currentDay);
  const phase = phaseOf(state.currentDay);
  const f = FOCUS[workout.focus];
  const finished = workout.exercises.filter((e) => (logged[e.id] || 0) >= e.goal).length;
  const allDone = finished === workout.exercises.length;
  const anyLogged = workout.exercises.some((e) => (logged[e.id] || 0) > 0);

  return (
    <main className="px-5">
      <ProgramBar history={state.history} />
      <div className="mt-4">
        <WeekStrip currentDay={state.currentDay} history={state.history} />
      </div>

      <Eyebrow className="mt-6">Dag {state.currentDay} · Week {week}</Eyebrow>
      <h1 className="mt-2 flex items-center gap-2.5 text-[32px] font-bold leading-none tracking-tight">
        <span className="h-3 w-3" style={{ backgroundColor: f.color }} />
        {f.label}
      </h1>

      <div className="mt-5">
        <DayBar exercises={workout.exercises} logged={logged} />
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xs tabular-nums text-neutral-400">{finished} van {workout.exercises.length} af</span>
          <span className="text-xs text-neutral-600">{phase.name}</span>
        </div>
      </div>

      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">{phase.note}</p>

      <ul className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
        {workout.exercises.map((e) => (
          <li key={e.id}>
            <ExerciseRow entry={e} logged={logged[e.id] || 0} isNew={!state.seen[e.id]} onOpen={() => onOpen(e.id)} />
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <Eyebrow>Elke dag · Bekkenbodem</Eyebrow>
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-700">Apart spoor</span>
        </div>
        <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
          {daily.map((e) => (
            <li key={e.id}>
              <ExerciseRow entry={e} logged={logged[e.id] || 0} isNew={!state.seen[e.id]} onOpen={() => onOpen(e.id)} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Eén oefening per dag, rouleert langs de drie. Van buiten onzichtbaar — doe ze aan je bureau, in de auto, op de bank. Geef het acht weken voordat je oordeelt.
        </p>
      </section>

      <button
        onClick={onComplete}
        disabled={!anyLogged}
        className={`mt-5 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
        style={anyLogged ? { backgroundColor: allDone ? ACCENT : "#1F1F1F", color: allDone ? "#0A0A0A" : "#FAFAFA" } : { border: "1px solid #1F1F1F" }}
      >
        {allDone ? "Dag afronden" : anyLogged ? "Dag nu al afronden" : "Log iets om de dag af te ronden"}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
        Je hoeft dit niet in één keer te doen. Verdeel de herhalingen over de dag — ze tellen hetzelfde.
      </p>
    </main>
  );
}

function ExerciseRow({ entry, logged, isNew, onOpen }) {
  const ex = EX[entry.id];
  const remaining = Math.max(0, entry.goal - logged);
  const done = remaining === 0;

  return (
    <button onClick={onOpen} className={`w-full bg-neutral-900 px-4 py-4 text-left active:bg-neutral-800 ${RING}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-bold leading-tight">{ex.name}</span>
            {isNew && <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Nieuw</span>}
          </div>
          <div className="mt-1 truncate text-xs text-neutral-500">{ex.levels[entry.level].name}</div>
          {entry.sub && (
            <div className="mt-1 truncate text-[11px] text-neutral-600">Geen stang — in plaats van {EX[entry.sub].name}</div>
          )}
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <div className="text-[26px] font-bold leading-none tabular-nums tracking-tight" style={{ color: done ? ACCENT : "#FAFAFA" }}>
            {done ? "✓" : remaining}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <RepTicks goal={entry.goal} logged={logged} />
      </div>
      <div className="mt-2 text-[11px] tabular-nums text-neutral-600">{logged} / {entry.goal} {ex.unit}</div>
    </button>
  );
}

function RestOfDay({ day }) {
  return (
    <main className="px-5">
      <Eyebrow>Dag {day} gelogd</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">Dat was het<br />voor vandaag.</h1>
      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
        De sessie van morgen staat er morgenochtend. Verder hoef je vandaag niets meer — dat is precies de bedoeling.
      </p>
      <p className="mt-4 text-xs leading-relaxed text-neutral-600">
        Bij Voortgang zie je je laatste sessies en alle acht weken. Bij Oefeningen staat de uitleg van alles.
      </p>
    </main>
  );
}

function Finished({ state, onProgress }) {
  const days = state.history.filter((h) => h.focus !== "test").length;
  const totalReps = state.history.reduce((s, h) => s + h.done, 0);
  return (
    <main className="px-5">
      <Eyebrow>Dag {TOTAL_DAYS} · Hermeting gedaan</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">Acht weken,<br />klaar.</h1>
      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
        {days} trainingsdagen en {totalReps.toLocaleString("nl-NL")} herhalingen gelogd. Er komt geen volgende sessie meer — hier houdt het programma op.
      </p>
      {state.baseline && state.retest && (
        <div className="mt-6 space-y-3">
          {TEST_FIELDS.map((f) => (
            <div key={f.id} className="flex items-baseline justify-between border-b border-neutral-800 pb-2">
              <span className="text-[13px] text-neutral-300">{f.label}</span>
              <span className="tabular-nums">
                <span className="text-sm text-neutral-500">{state.baseline[f.id]}</span>
                <span className="mx-2 text-xs text-neutral-700">→</span>
                <span className="text-lg font-bold" style={{ color: ACCENT }}>{state.retest[f.id]}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onProgress}
        className={`mt-8 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
        style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
        Bekijk je voortgang
      </button>
      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
        Nog een ronde? Onderaan Voortgang kun je de acht weken opnieuw beginnen. Je niveaus blijven staan.
      </p>
    </main>
  );
}

/* ---------- Exercise sheet ---------- */

function ExerciseSheet({ entry, logged, entries = [], previous, day, allLogged, firstTime, readOnly, onLevel, onAdd, onRemove, onSwitch, onClose }) {
  const ex = EX[entry.id];
  const browse = entry.goal == null;
  const timed = ex.unit.indexOf("sec") !== -1;
  const remaining = browse ? 0 : Math.max(0, entry.goal - logged);
  const steps = browse ? [] : entry.goal >= 200 ? [50, 25, 10] : entry.goal >= 60 ? [20, 10, 5] : [10, 5, 1];

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState(null);   // null = dicht, anders de ingetikte tekst
  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  // Van oefening wisselen: timer en invoerveld horen bij de vorige.
  useEffect(() => { setElapsed(0); setRunning(false); setCustom(null); }, [entry.id]);

  const showLevelFirst = firstTime && !browse;
  const addCustom = () => {
    const n = parseInt(custom, 10);
    if (n > 0) onAdd(n);
    setCustom(null);
  };

  const levelPicker = (
    <section>
      <Eyebrow>{showLevelFirst ? "Eerste keer — kies je niveau" : "Jouw niveau"}</Eyebrow>
      <div className="mt-3 space-y-px overflow-hidden rounded-xl border border-neutral-800">
        {LEVEL_ORDER.map((l) => {
          const on = entry.level === l;
          return (
            <button key={l} onClick={() => onLevel(l)}
              className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-3.5 text-left ${RING}`}
              style={on ? { backgroundColor: "#1C1208" } : undefined}>
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
        <Eyebrow>{FOCUS[ex.type].label}</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Sluiten</button>
      </div>

      {/* De oefeningen van vandaag, zodat je niet hoeft te sluiten om door te gaan. */}
      {day && day.length > 1 && (
        <div className="mx-auto w-full max-w-md border-b border-neutral-800">
          <ExerciseStrip day={day} allLogged={allLogged} activeId={entry.id} onSwitch={onSwitch} />
        </div>
      )}

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mt-6 text-[30px] font-bold leading-none tracking-tight">{ex.name}</h2>
        {previous && (
          <div className="mt-2 text-[12px] tabular-nums text-neutral-500">
            Vorige keer: {previous.logged} van {previous.goal} {ex.unit} · dag {previous.day}
          </div>
        )}
        <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: FROM_SOURCE.has(entry.id) ? "#525252" : ACCENT }}>
          {FROM_SOURCE.has(entry.id) ? "Uit het oorspronkelijke programma" : "Toegevoegd"}
        </div>

        {entry.sub && (
          <p className="mt-4 border-l-2 pl-3 text-[13px] leading-relaxed text-neutral-300" style={{ borderColor: ACCENT }}>
            Vervangt {EX[entry.sub].name} omdat je geen optrekstang hebt. Vink de stang aan bij Voortgang
            zodra je er een hebt, dan komt {EX[entry.sub].name} meteen terug.
          </p>
        )}
        {entry.needsBar && (
          <p className="mt-4 border-l-2 border-neutral-800 pl-3 text-[13px] leading-relaxed text-neutral-500">
            Heeft een optrekstang nodig, dus wordt niet ingepland. {EX[NO_BAR[entry.id][0]].name} neemt zijn plek in.
          </p>
        )}

        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent((EN_NAME[entry.id] || ex.name) + " exercise form")}`}
          target="_blank" rel="noreferrer"
          className={`mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-300 ${RING}`}>
          ▶ Zoek een video
        </a>

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
              <span className="text-xs text-neutral-500">te gaan van {entry.goal} {ex.unit}</span>
            </div>

            <div className="mt-4">
              <RepTicks goal={entry.goal} logged={logged} />
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
                      Loggen
                    </button>
                  </div>
                )}

                {!timed && (
                  <div className="mt-5 flex gap-2 border-t border-neutral-800 pt-5">
                    <button onClick={() => onAdd(steps[0])}
                      className={`flex-[2] rounded-xl py-4 text-xl font-bold tabular-nums ${RING}`}
                      style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
                      +{steps[0]}
                    </button>
                    {steps.slice(1).map((s) => (
                      <button key={s} onClick={() => onAdd(s)}
                        className={`flex-1 rounded-xl border border-neutral-700 py-4 text-base font-bold tabular-nums text-neutral-200 ${RING}`}>
                        +{s}
                      </button>
                    ))}
                  </div>
                )}

                {custom === null && (
                  <button onClick={() => setCustom("")}
                    className={`mt-2 w-full rounded-xl border border-neutral-800 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>
                    Ander aantal
                  </button>
                )}

                {custom !== null && (
                  <div className="mt-3 flex gap-2">
                    <input type="number" inputMode="numeric" min="1" autoFocus
                      value={custom} onChange={(e) => setCustom(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustom()}
                      placeholder={timed ? "seconden" : "herhalingen"}
                      className={`min-w-0 flex-1 rounded-xl border border-neutral-700 bg-transparent px-4 py-3 text-lg font-bold tabular-nums text-neutral-50 placeholder-neutral-700 ${RING}`} />
                    <button onClick={addCustom}
                      className={`rounded-xl px-5 text-[11px] font-bold uppercase tracking-[0.16em] ${RING}`}
                      style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>Toevoegen</button>
                    <button onClick={() => setCustom(null)}
                      className={`rounded-xl border border-neutral-700 px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 ${RING}`}>Annuleren</button>
                  </div>
                )}

                {/* Elke beurt los, zodat één mistik eruit kan. */}
                {entries.length > 0 && (
                  <div className="mt-4 border-t border-neutral-800 pt-3">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">Vandaag gelogd</div>
                    <div className="flex flex-wrap gap-1.5">
                      {entries.map((n, i) => (
                        <button key={i} onClick={() => onRemove(i)}
                          aria-label={`${n} weghalen`}
                          className={`flex items-center gap-1.5 rounded-full bg-neutral-800 py-1.5 pl-3 pr-2 text-[12px] font-bold tabular-nums text-neutral-200 ${RING}`}>
                          {n}
                          <span className="text-[13px] leading-none text-neutral-500">×</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {timed && !readOnly && (
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">Houd vast zo lang je kunt en log het dan. Meerdere keren tellen op tot het doel.</p>
            )}
          </section>
        )}

        <Block title="Opstelling"><p className="text-[13px] leading-relaxed text-neutral-300">{ex.setup}</p></Block>

        <Block title="Zo doe je het">
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

        <Block title="Vermijd">
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

/* ---------- Baseline test and calibration ---------- */

function TestScreen({ kind, baseline, onSave }) {
  const [vals, setVals] = useState({});
  const [phase, setPhase] = useState("input");
  const [levels, setLevels] = useState(null);

  const ready = TEST_FIELDS.every((f) => vals[f.id] !== undefined && vals[f.id] !== "");
  const numbers = () => Object.fromEntries(TEST_FIELDS.map((f) => [f.id, Number(vals[f.id]) || 0]));

  if (phase === "calibrate") {
    return (
      <main className="px-5">
        <Eyebrow>Afgesteld</Eyebrow>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">Hier begin<br />je.</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
          Afgesteld op je meting, niet op een gok. Pas aan wat niet klopt — en elke oefening blijft later ook nog aan te passen.
        </p>

        <div className="mt-6 space-y-3">
          {Object.keys(GROUP_LABELS).map((g) => (
            <div key={g} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="text-[15px] font-bold">{GROUP_LABELS[g]}</div>
              <div className="mt-0.5 text-xs text-neutral-500">{GROUP_HINTS[g]}</div>
              <div className="mt-3 flex gap-1.5">
                {LEVEL_ORDER.map((l) => {
                  const on = levels[g] === l;
                  return (
                    <button key={l} onClick={() => setLevels({ ...levels, [g]: l })}
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

        <button onClick={() => onSave("baseline", numbers(), levels)}
          className={`mt-6 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
          style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
          Begin aan dag 2
        </button>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Dag 1 is de meting. Je eerste sessie is morgen.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5">
      <Eyebrow>{kind === "baseline" ? "Dag 1" : `Dag ${TOTAL_DAYS}`}</Eyebrow>
      <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">
        {kind === "baseline" ? "Vijf getallen." : "Dezelfde vijf getallen."}
      </h1>
      <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
        {kind === "baseline"
          ? "Rust ertussen zo lang als je nodig hebt. Ze bepalen je startniveaus, en over acht weken ga je ze verbeteren."
          : "Dezelfde tests, dezelfde omstandigheden. Hier zie je wat de acht weken hebben gedaan."}
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
              <input id={f.id} type="number" inputMode="numeric" min="0" placeholder="0"
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
        {ready ? (kind === "baseline" ? "Laat zien waar ik begin" : "Hermeting opslaan") : "Vul alle vijf in"}
      </button>
    </main>
  );
}

/* ---------- Movements ---------- */

function Moves({ levels, onOpen }) {
  const groups = ["strength", "mobility", "conditioning", "pelvic"].map((k) => [k, FOCUS[k].label]);

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Oefeningen</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
        Alle {Object.keys(EX).length} oefeningen uit het programma. Lees de uitleg wanneer je wilt, niet alleen op de dag zelf.
      </p>

      <div className="mt-4 flex gap-5">
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />Uit het origineel
        </span>
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />Toegevoegd
        </span>
      </div>

      {groups.map(([type, label]) => (
        <section key={type} className="mt-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2" style={{ backgroundColor: FOCUS[type].color }} />
            <Eyebrow>{label}</Eyebrow>
          </div>
          <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
            {Object.entries(EX).filter(([, e]) => e.type === type).map(([id, e]) => (
              <li key={id}>
                <button onClick={() => onOpen(id)} className={`flex w-full items-center gap-3 bg-neutral-900 px-4 py-3.5 text-left active:bg-neutral-800 ${RING}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: FROM_SOURCE.has(id) ? "#525252" : ACCENT }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{e.name}</span>
                    <span className="block truncate text-xs text-neutral-500">{e.levels[levels[id] || "standard"].name}</span>
                  </span>
                  {NO_BAR[id] && <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-600">Stang</span>}
                  {e.intro > 1 && <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-600">Week {e.intro}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

/* ---------- Progress ---------- */

function ProgressTab({ state, onPick, onEquipment, onReset }) {
  const done = state.history.length;
  const totalReps = state.history.reduce((s, h) => s + h.done, 0);
  const last = state.history.slice(-14);
  const max = Math.max(1, ...last.map((h) => h.goal));
  const byDay = Object.fromEntries(state.history.map((h) => [h.day, h]));

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Voortgang</h1>

      <div className="mt-5 flex gap-8 border-y border-neutral-800 py-5">
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{done}</div>
          <Eyebrow className="mt-2">van {TOTAL_DAYS} dagen</Eyebrow>
        </div>
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{totalReps.toLocaleString("nl-NL")}</div>
          <Eyebrow className="mt-2">herhalingen gelogd</Eyebrow>
        </div>
      </div>

      <section className="mt-7">
        <Eyebrow>Laatste sessies</Eyebrow>
        {last.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">Rond je eerste dag af en hij verschijnt hier.</p>
        ) : (
          // items-stretch, niet items-end: anders krimpen de kolommen naar hun
          // label en vallen de procentuele balkhoogtes op nul terug.
          <div className="mt-4 flex h-24 items-stretch gap-1">
            {last.map((h) => (
              <div key={h.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full" style={{ height: `${Math.max(3, (h.done / max) * 100)}%`, backgroundColor: FOCUS[h.focus].color }} />
                </div>
                <span className="text-[9px] tabular-nums text-neutral-700">{h.day}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <Eyebrow>Acht weken</Eyebrow>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">Tik op een afgeronde dag om terug te kijken. Komende dagen blijven op slot.</p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, wi) => (
            <div key={wi} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-[10px] font-bold tabular-nums text-neutral-600">{wi + 1}</span>
              <div className="grid flex-1 grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = wi * 7 + di + 1;
                  const entry = byDay[day];
                  const isToday = day === state.currentDay;
                  const color = FOCUS[buildDay(day, state.levels, state.equipment).focus].color;
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
        <div className="mt-4 flex flex-wrap gap-4">
          {["strength", "mobility", "conditioning"].map((k) => (
            <span key={k} className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="h-2 w-2" style={{ backgroundColor: FOCUS[k].color }} />{FOCUS[k].label}
            </span>
          ))}
        </div>
      </section>

      {state.baseline && (
        <section className="mt-8">
          <Eyebrow>Nulmeting → hermeting</Eyebrow>
          <div className="mt-4 space-y-3">
            {TEST_FIELDS.map((f) => {
              const a = state.baseline[f.id];
              const b = state.retest ? state.retest[f.id] : null;
              return (
                <div key={f.id} className="flex items-baseline justify-between border-b border-neutral-800 pb-2">
                  <span className="text-[13px] text-neutral-300">{f.label}</span>
                  <span className="tabular-nums">
                    <span className="text-sm text-neutral-500">{a}</span>
                    <span className="mx-2 text-xs text-neutral-700">→</span>
                    <span className="text-lg font-bold" style={{ color: b ? ACCENT : "#3D3D3D" }}>{b ?? "—"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-9">
        <Eyebrow>Wat je hebt</Eyebrow>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">
          Pas dit aan zodra je spullen veranderen. Zonder optrekstang wordt alles waaraan je moet hangen
          vervangen door een versie met een deur, een tafel en de vloer. Vink de stang aan zodra je er een hebt
          en het hangwerk komt meteen terug — ook in de sessie van vandaag.
        </p>
        <ul className="mt-4 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
          {EQUIPMENT.map((eq) => {
            const on = !!state.equipment[eq.id];
            return (
              <li key={eq.id}>
                <button onClick={() => onEquipment({ ...state.equipment, [eq.id]: !on })}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-4 text-left ${RING}`}
                  style={on ? { backgroundColor: "#1C1208" } : undefined}>
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] font-bold leading-none text-neutral-950"
                    style={{ borderColor: on ? ACCENT : "#4A4A4A", backgroundColor: on ? ACCENT : "transparent" }}>
                    {on ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold">{eq.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{eq.note}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!state.equipment.bar && (
          <div className="mt-3 border-l-2 pl-3 text-xs leading-relaxed text-neutral-400" style={{ borderColor: ACCENT }}>
            Je traint zonder stang. {NEEDS_BAR.map((id) => `${EX[id].name} → ${EX[NO_BAR[id][0]].name}`).join(", ")}.
          </div>
        )}
      </section>

      <button onClick={onReset} className={`mt-10 w-full border border-neutral-800 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600 ${RING}`}>
        Acht weken opnieuw beginnen
      </button>
      <p className="mt-2.5 text-center text-[11px] text-neutral-700">Je niveaus blijven staan, dus een tweede ronde pakt op waar je gebleven was.</p>
    </main>
  );
}

function Review({ entry, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <Eyebrow>Dag {entry.day} · {entry.date}</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Sluiten</button>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 py-6">
        <h2 className="flex items-center gap-2.5 text-[30px] font-bold leading-none tracking-tight">
          <span className="h-3 w-3" style={{ backgroundColor: FOCUS[entry.focus].color }} />
          {FOCUS[entry.focus].label}
        </h2>
        {entry.test ? (
          <div className="mt-6 space-y-3">
            {TEST_FIELDS.map((f) => (
              <div key={f.id} className="flex items-baseline justify-between border-b border-neutral-800 pb-2">
                <span className="text-[13px] text-neutral-300">{f.label}</span>
                <span className="text-lg font-bold tabular-nums">{entry.test[f.id]}</span>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {entry.exercises.map((e) => (
              <li key={e.id} className="border-b border-neutral-800 pb-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-bold">{EX[e.id].name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-neutral-400">{e.logged} / {e.goal}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">{EX[e.id].levels[e.level].name}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Modals and nav ---------- */

function GapModal({ missed, onChoose }) {
  const tooFar = missed > 7;
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/80 p-4" style={{ fontFamily: FONT }}>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <Eyebrow>{missed} {missed === 1 ? "dag" : "dagen"} gemist</Eyebrow>
        <h3 className="mt-2 text-xl font-bold tracking-tight">Waar wil je verder?</h3>
        <div className="mt-5 space-y-2">
          <button onClick={() => onChoose("catch")} className={`w-full rounded-xl p-4 text-left ${RING}`} style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em]">Inhalen</div>
            <div className="mt-1 text-[13px] leading-relaxed">Ga door met de volgende sessie op volgorde. Er wordt niets overgeslagen.</div>
          </button>
          <button onClick={() => onChoose("skip")} disabled={tooFar} className={`w-full rounded-xl border border-neutral-700 p-4 text-left disabled:opacity-40 ${RING}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-200">Doorschuiven</div>
            <div className="mt-1 text-[13px] leading-relaxed text-neutral-400">
              {tooFar
                ? "Kan niet na meer dan zeven gemiste dagen — dan sla je te veel van het programma over."
                : "Spring naar de sessie die voor vandaag gepland stond en blijf in het weekritme."}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Nav({ tab, setTab, onExit }) {
  const items = [["today", "Vandaag"], ["moves", "Oefeningen"], ["progress", "Voortgang"]];
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
        {/* Terug naar het trainingsplan; de Reps-tab vult het hele scherm. */}
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
  const [equipment, setEquipment] = useState({ bar: false, rings: false, rope: false, band: false, weight: false });

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
              <div className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: ACCENT }}>Daily Reps</div>
              <h1 className="mt-5 text-[38px] font-bold leading-[1.02] tracking-tight">
                Acht weken.<br />Eén korte sessie<br />per dag.
              </h1>
              <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-neutral-400">
                <p>Elke dag krijg je drie of vier oefeningen met voor elk een doel. Twintig tot vijfentwintig minuten als je het in één keer doet.</p>
                <p>Je hoeft het niet in één keer te doen. Verdeel de herhalingen over de dag — bij de koffie, in de lunch, na het werk. Ze tellen hetzelfde.</p>
                <p>Elke ochtend gaat er een nieuwe sessie open. Vooruitwerken kan niet, en dat is expres.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-[30px] font-bold leading-[1.08] tracking-tight">Wat heb je?</h1>
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">Eén vraag, dan een korte meting die je startniveaus bepaalt.</p>
              <ul className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
                {EQUIPMENT.map((eq) => {
                  const on = equipment[eq.id];
                  return (
                    <li key={eq.id}>
                      <button onClick={() => setEquipment({ ...equipment, [eq.id]: !on })}
                        aria-pressed={on}
                        className={`flex w-full items-start gap-3 bg-neutral-900 px-4 py-4 text-left ${RING}`}
                        style={on ? { backgroundColor: "#1C1208" } : undefined}>
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] font-bold leading-none text-neutral-950"
                          style={{ borderColor: on ? ACCENT : "#4A4A4A", backgroundColor: on ? ACCENT : "transparent" }}>
                          {on ? "✓" : ""}
                        </span>
                        <span>
                          <span className="block text-[14px] font-bold">
                            {eq.label}
                            {eq.required && <span className="ml-2 text-[9px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Nodig</span>}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">{eq.note}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!equipment.bar && (
                <p className="mt-3 border-l-2 pl-3 text-xs leading-relaxed text-neutral-400" style={{ borderColor: ACCENT }}>
                  Geen stang, geen probleem: pull-ups, chin-ups, hangend knieheffen en de dead hang worden vervangen
                  door versies met een deur, een tafel en de vloer. Vink de stang aan zodra je er een hebt.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-8">
          {step > 0 && (
            <button onClick={() => setStep(0)} className={`px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 ${RING}`}>Terug</button>
          )}
          <button onClick={() => (step === 1 ? onDone(equipment) : setStep(1))}
            className={`flex-1 rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
            style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            {step === 1 ? "Naar de nulmeting" : "Verder"}
          </button>
        </div>
      </div>
    </div>
  );
}
