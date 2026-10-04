import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   DAILY REPS — 8 week bodyweight program
   Single-file React app. Persists via window.storage.
   ============================================================ */

const KEY = "dailyreps:v1";
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
/* base = rep goal at week 2, standard level. unit = what you count. */

const EX = {
  pushup: {
    name: "Push-Up", type: "strength", unit: "reps", base: 30, intro: 1,
    levels: {
      easier: { name: "Incline push-up (hands on a table or bench)", f: 1.15 },
      standard: { name: "Push-up on the floor", f: 1 },
      harder: { name: "Feet-elevated push-up", f: 0.7 },
    },
    setup: "Hands under your shoulders, slightly wider than your chest. Feet together or hip-width. Squeeze your glutes so your body is one straight line from head to heels.",
    how: [
      "Point your elbows back at roughly 45°, not straight out to the sides.",
      "Lower until your chest is a fist's height from the floor.",
      "Push the floor away and return to the top without letting your hips sag.",
    ],
    cues: ["Ribs down, glutes on — the body moves as one plank.", "Full lockout at the top, chest to the floor at the bottom."],
    avoid: ["Hips dropping first, head reaching forward, half reps."],
  },
  pullup: {
    name: "Pull-Up", type: "strength", unit: "reps", base: 12, intro: 1,
    levels: {
      easier: { name: "Band-assisted pull-up, or 4-second lowers from the top", f: 1.3 },
      standard: { name: "Full pull-up, overhand grip", f: 1 },
      harder: { name: "Slow pull-up: 1s up, 3s down", f: 0.6 },
    },
    setup: "Overhand grip, hands just outside shoulder width. Start from a full hang with straight arms.",
    how: [
      "Pull your shoulder blades down first, then bend the arms.",
      "Pull until your chin clears the bar.",
      "Lower all the way back to straight arms before the next rep.",
    ],
    cues: ["Think of pulling the bar down to you, not you up to the bar.", "Keep the legs quiet — no kipping."],
    avoid: ["Stopping short of a full hang. Half range is the fastest way to stall."],
  },
  chinup: {
    name: "Chin-Up", type: "strength", unit: "reps", base: 12, intro: 1,
    levels: {
      easier: { name: "Band-assisted chin-up, or 4-second lowers", f: 1.3 },
      standard: { name: "Full chin-up, underhand grip", f: 1 },
      harder: { name: "Slow chin-up: 1s up, 3s down", f: 0.6 },
    },
    setup: "Underhand grip, hands about shoulder width. Full hang to start.",
    how: ["Pull your elbows down to your ribs.", "Chin over the bar.", "Lower under control to straight arms."],
    cues: ["Chest up towards the bar, not chin poking forward."],
    avoid: ["Swinging. If you have to swing, use the easier level."],
  },
  row: {
    name: "Row", type: "strength", unit: "reps", base: 24, intro: 1,
    levels: {
      easier: { name: "Table row with feet walked back (more upright = easier)", f: 1.15 },
      standard: { name: "Ring or table row, body at roughly 45°", f: 1 },
      harder: { name: "Feet-elevated row, body horizontal", f: 0.7 },
    },
    setup: "Grip the rings or the edge of a sturdy table. Walk your feet forward until your body is at an angle. Straight line from head to heels.",
    how: ["Pull your chest to your hands.", "Pause for a beat at the top.", "Lower until your arms are straight and your shoulder blades open."],
    cues: ["Lead with the elbows, finish with the shoulder blades squeezing.", "The lower your body, the harder it gets — use that to dial the difficulty."],
    avoid: ["Hips sagging behind the rest of the body."],
  },
  dip: {
    name: "Dip", type: "strength", unit: "reps", base: 18, intro: 1,
    levels: {
      easier: { name: "Bench dip, feet on the floor", f: 1.3 },
      standard: { name: "Parallel bar dip", f: 1 },
      harder: { name: "Ring dip", f: 0.6 },
    },
    setup: "Support yourself with straight arms, shoulders down away from your ears, legs together.",
    how: ["Lower until your upper arm is roughly parallel to the floor.", "Lean forward slightly as you descend.", "Press back to a full lockout."],
    cues: ["Shoulders stay pulled down the whole time."],
    avoid: ["Going deeper than your shoulders comfortably allow. Depth is earned."],
  },
  pikepushup: {
    name: "Pike Push-Up", type: "strength", unit: "reps", base: 15, intro: 4,
    levels: {
      easier: { name: "Pike push-up with feet on the floor", f: 1.15 },
      standard: { name: "Pike push-up, hips high", f: 1 },
      harder: { name: "Feet elevated on a chair or box", f: 0.7 },
    },
    setup: "Downward-dog shape: hips high, hands shoulder width, head between your arms.",
    how: ["Bend your elbows and lower the crown of your head towards the floor.", "Press back up to straight arms."],
    cues: ["Keep the hips stacked over the hands — that's what makes it a shoulder press."],
    avoid: ["Letting it turn into a regular push-up as you fatigue."],
  },
  squat: {
    name: "Bodyweight Squat", type: "strength", unit: "reps", base: 40, intro: 1,
    levels: {
      easier: { name: "Squat to a box or chair", f: 1.15 },
      standard: { name: "Full-depth bodyweight squat", f: 1 },
      harder: { name: "Tempo squat: 3s down, 1s pause at the bottom", f: 0.7 },
    },
    setup: "Feet shoulder-width, toes turned out slightly. Weight through the whole foot.",
    how: ["Sit down and back, knees tracking over your toes.", "Go as deep as you can keep a flat lower back.", "Stand tall and squeeze your glutes at the top."],
    cues: ["Chest proud, heels planted."],
    avoid: ["Knees caving in, heels lifting, bouncing out of the bottom."],
  },
  lunge: {
    name: "Reverse Lunge", type: "strength", unit: "reps total, alternating", base: 24, intro: 1,
    levels: {
      easier: { name: "Static split squat, hand on a wall", f: 1.15 },
      standard: { name: "Reverse lunge, alternating legs", f: 1 },
      harder: { name: "Rear-foot-elevated split squat", f: 0.7 },
    },
    setup: "Stand tall, feet hip-width.",
    how: ["Step one foot back and lower the back knee towards the floor.", "Front shin stays close to vertical.", "Drive through the front foot to stand, then alternate."],
    cues: ["Torso upright. Control the descent — no knee slamming."],
    avoid: ["Steps that are too short, which turns it into a knee-only movement."],
  },
  sldl: {
    name: "Single-Leg Deadlift", type: "strength", unit: "reps total, alternating", base: 20, intro: 1,
    levels: {
      easier: { name: "Fingertips on a wall for balance", f: 1.15 },
      standard: { name: "Bodyweight single-leg deadlift", f: 1 },
      harder: { name: "Holding a dumbbell or kettlebell", f: 0.75 },
    },
    setup: "Stand on one leg, soft knee.",
    how: ["Hinge at the hip and reach your chest forward as the back leg lifts behind you.", "Stop when you feel a strong hamstring stretch.", "Stand back up by driving the hip forward."],
    cues: ["Hips stay square to the floor — don't let the lifted hip roll open."],
    avoid: ["Rounding the lower back to reach further down."],
  },
  bridge: {
    name: "Glute Bridge", type: "strength", unit: "reps", base: 30, intro: 1,
    levels: {
      easier: { name: "Two-leg glute bridge", f: 1.15 },
      standard: { name: "Glute bridge with a 2-second squeeze at the top", f: 1 },
      harder: { name: "Single-leg glute bridge", f: 0.6 },
    },
    setup: "On your back, knees bent, heels close to your hips.",
    how: ["Push through your heels and lift your hips until your body is a straight ramp.", "Squeeze at the top.", "Lower with control."],
    cues: ["Glutes do the work, not the lower back. Ribs stay down."],
    avoid: ["Over-arching at the top to fake more height."],
  },
  hkr: {
    name: "Hanging Knee Raise", type: "strength", unit: "reps", base: 15, intro: 1,
    levels: {
      easier: { name: "Lying knee raise on the floor", f: 1.3 },
      standard: { name: "Hanging knee raise to hip height", f: 1 },
      harder: { name: "Hanging straight-leg raise", f: 0.6 },
    },
    setup: "Hang from the bar, shoulders active, legs still.",
    how: ["Curl your pelvis under and lift your knees towards your chest.", "Lower slowly without swinging."],
    cues: ["The first move is the pelvis tucking, not the hips folding."],
    avoid: ["Using momentum. A dead-stop between reps is worth more than extra reps."],
  },
  hollow: {
    name: "Hollow Rock", type: "strength", unit: "reps", base: 25, intro: 1,
    levels: {
      easier: { name: "Hollow hold with knees bent, arms by your sides", f: 1.15 },
      standard: { name: "Hollow rock, arms overhead", f: 1 },
      harder: { name: "Hollow rock, fully extended and slow", f: 0.75 },
    },
    setup: "On your back, lower back pressed flat into the floor. Lift the shoulders and legs.",
    how: ["Rock back and forth from that shape without losing the flat lower back."],
    cues: ["If your lower back lifts off the floor, bend the knees more."],
    avoid: ["Rocking from the neck or arms."],
  },

  couch: {
    name: "Couch Stretch", type: "mobility", unit: "seconds total, both sides", base: 120, intro: 1,
    levels: {
      easier: { name: "Half-kneeling hip flexor stretch, back foot on the floor", f: 1 },
      standard: { name: "Back foot against a wall or couch", f: 1 },
      harder: { name: "Torso upright, back knee close to the wall", f: 1 },
    },
    setup: "Back knee on something soft, back foot up against a wall. Front foot planted.",
    how: ["Tuck your pelvis under and squeeze the back glute.", "Slowly bring your torso upright.", "Breathe long and slow. Swap sides at halfway."],
    cues: ["The glute squeeze is what makes it work — without it you're just arching your back."],
    avoid: ["Letting the lower back take the stretch."],
  },
  deepsquat: {
    name: "Deep Squat Hold", type: "mobility", unit: "seconds", base: 90, intro: 1,
    levels: {
      easier: { name: "Heels on a book, holding a doorframe", f: 1 },
      standard: { name: "Flat-footed deep squat hold", f: 1 },
      harder: { name: "Deep squat, hands off the floor, chest tall", f: 1 },
    },
    setup: "Sink to the bottom of a squat, feet flat.",
    how: ["Sit there and breathe.", "Gently push your knees out with your elbows.", "Rock side to side and forward and back to explore the position."],
    cues: ["Break the time into chunks if you need to — total time is what counts."],
    avoid: ["Collapsing forward onto your toes."],
  },
  ninety: {
    name: "90/90 Hip Switch", type: "mobility", unit: "reps total", base: 20, intro: 1,
    levels: {
      easier: { name: "Hands on the floor behind you for support", f: 1 },
      standard: { name: "Hands light, switching side to side", f: 1 },
      harder: { name: "Hands off the floor, chest tall throughout", f: 0.8 },
    },
    setup: "Sit with front leg at 90° and back leg at 90°, both on the floor.",
    how: ["Lift both knees and rotate them to the other side.", "Lower both knees to the floor before switching back."],
    cues: ["Slow and deliberate. Every rep ends with both knees down."],
    avoid: ["Speeding through and only half-landing each side."],
  },
  openbook: {
    name: "Thoracic Open Book", type: "mobility", unit: "reps total", base: 16, intro: 1,
    levels: {
      easier: { name: "Knees stacked on a cushion", f: 1 },
      standard: { name: "Side-lying open book", f: 1 },
      harder: { name: "Open book with a 5-second hold at the end range", f: 0.8 },
    },
    setup: "Lie on your side, knees bent 90° and stacked, arms straight out in front.",
    how: ["Keep the knees pinned together.", "Open the top arm across your body and follow it with your eyes.", "Return slowly. Swap sides at halfway."],
    cues: ["The rotation comes from the ribcage, not the knees."],
    avoid: ["Letting the top knee lift off the bottom one."],
  },
  passthrough: {
    name: "Shoulder Pass-Through", type: "mobility", unit: "reps", base: 20, intro: 1,
    levels: {
      easier: { name: "Wide grip on a broomstick or towel", f: 1 },
      standard: { name: "Moderate grip on a stick or band", f: 1 },
      harder: { name: "Narrow grip, slow and controlled", f: 0.8 },
    },
    setup: "Hold a broomstick, towel or band in front of you, arms straight.",
    how: ["Lift it overhead and take it behind you, keeping the elbows locked.", "Bring it back the same way."],
    cues: ["Go only as narrow as you can keep the arms straight."],
    avoid: ["Bending the elbows to sneak through a grip that's too narrow."],
  },
  deadhang: {
    name: "Dead Hang", type: "mobility", unit: "seconds", base: 60, intro: 1,
    levels: {
      easier: { name: "Feet lightly on the floor to take some weight", f: 1 },
      standard: { name: "Full passive hang", f: 1 },
      harder: { name: "Active hang: shoulder blades pulled down", f: 0.8 },
    },
    setup: "Overhand grip, hands shoulder width.",
    how: ["Hang and let your shoulders come up towards your ears.", "Breathe. Split the total across as many sets as you need."],
    cues: ["Grip usually fails before the shoulders — that's normal and it improves fast."],
    avoid: ["Dropping off the bar in a heap. Step down."],
  },
  cossack: {
    name: "Cossack Squat", type: "mobility", unit: "reps total, alternating", base: 16, intro: 1,
    levels: {
      easier: { name: "Holding a doorframe, shallow depth", f: 1 },
      standard: { name: "Full cossack squat, heel down", f: 1 },
      harder: { name: "Hands off, pause 2 seconds at the bottom", f: 0.8 },
    },
    setup: "Wide stance, toes pointing slightly out.",
    how: ["Shift your weight onto one leg and sink down, keeping the other leg straight.", "Keep both heels on the floor.", "Push back to centre and switch sides."],
    cues: ["Chest tall. Depth follows over the weeks."],
    avoid: ["Rolling onto the outside edge of the working foot."],
  },
  jefferson: {
    name: "Jefferson Curl", type: "mobility", unit: "reps", base: 10, intro: 4,
    levels: {
      easier: { name: "Bodyweight, standing on the floor", f: 1 },
      standard: { name: "Standing on a step, light weight in your hands", f: 1 },
      harder: { name: "On a step, heavier weight, slow", f: 0.8 },
    },
    setup: "Stand tall, legs straight but not locked hard.",
    how: ["Roll down one vertebra at a time, starting with the chin.", "Let the weight hang and pull you down.", "Roll back up the same way, stacking the spine from the bottom."],
    cues: ["This is deliberate spinal flexion under a light load. Light means light — start with no weight at all."],
    avoid: ["Rushing, or loading up too soon. If your back is cranky, skip this and hold a pancake instead."],
  },
  pancake: {
    name: "Pancake Reach", type: "mobility", unit: "seconds", base: 60, intro: 1,
    levels: {
      easier: { name: "Sitting on a cushion, knees slightly bent", f: 1 },
      standard: { name: "Seated straddle, reaching forward", f: 1 },
      harder: { name: "Chest low, legs wide and straight", f: 1 },
    },
    setup: "Sit with legs wide, kneecaps pointing up.",
    how: ["Hinge from the hips and walk your hands forward.", "Hold and breathe into the stretch."],
    cues: ["Lead with the chest, not the head."],
    avoid: ["Rounding hard through the lower back to get lower."],
  },
  bearcrawl: {
    name: "Bear Crawl", type: "mobility", unit: "steps", base: 40, intro: 1,
    levels: {
      easier: { name: "Bear crawl in place, knees hovering", f: 1.15 },
      standard: { name: "Forward and backward bear crawl", f: 1 },
      harder: { name: "Slow crawl, knees an inch off the floor throughout", f: 0.75 },
    },
    setup: "Hands under shoulders, knees under hips and hovering just off the floor.",
    how: ["Move opposite hand and opposite foot together.", "Keep the hips low and level — no wagging."],
    cues: ["Small steps. Quiet hands and feet."],
    avoid: ["Hips rising up into a downward dog."],
  },
  crab: {
    name: "Crab Reach", type: "mobility", unit: "reps total, alternating", base: 16, intro: 1,
    levels: {
      easier: { name: "Table-top hip lift, no reach", f: 1.15 },
      standard: { name: "Crab reach, one arm overhead", f: 1 },
      harder: { name: "Crab reach with a pause at the top", f: 0.8 },
    },
    setup: "Sit with feet flat and hands behind you, fingers pointing back.",
    how: ["Lift your hips into a table-top.", "Reach one arm up and over, opening the chest to the ceiling.", "Lower and switch."],
    cues: ["Push the hips high before the arm reaches."],
    avoid: ["Cranking through the shoulder that's on the floor."],
  },
  sidekick: {
    name: "Side Kick Through", type: "mobility", unit: "reps total, alternating", base: 20, intro: 4,
    levels: {
      easier: { name: "Slow, knee stays bent", f: 1.15 },
      standard: { name: "Side kick through from the bear position", f: 1 },
      harder: { name: "Long extension, hips high, pause at the end", f: 0.8 },
    },
    setup: "Start in the bear position, knees hovering.",
    how: ["Lift one hand and the opposite foot.", "Kick that leg through underneath your body while turning your hips to the ceiling.", "Return to bear and alternate."],
    cues: ["Eyes follow the reaching hand. Move at a speed you can stop at."],
    avoid: ["Throwing the leg through and landing on your hip."],
  },
  wallslide: {
    name: "Scap Wall Slide", type: "mobility", unit: "reps", base: 15, intro: 1,
    levels: {
      easier: { name: "Standing a step away from the wall", f: 1 },
      standard: { name: "Back flat against the wall", f: 1 },
      harder: { name: "Lower back pressed to the wall throughout, slow", f: 0.8 },
    },
    setup: "Back against a wall, elbows and wrists touching the wall in a goalpost shape.",
    how: ["Slide the arms up as far as you can while keeping contact.", "Slide back down and squeeze the shoulder blades."],
    cues: ["Ribs stay down. If the lower back arches, you've gone too far."],
    avoid: ["Letting the wrists peel off the wall."],
  },

  /* --- Pelvic floor: a separate daily track, not part of the rotation --- */
  pfQuick: {
    name: "Quick Flicks", type: "pelvic", unit: "reps", base: 30, intro: 1,
    levels: {
      easier: { name: "Lying on your back, knees bent", f: 1 },
      standard: { name: "Sitting upright", f: 1 },
      harder: { name: "Standing", f: 1 },
    },
    setup: "Find the muscle first. It's the one you'd use to hold back wind, or to make the base of the penis lift slightly. Put a hand on your belly — it should stay soft.",
    how: [
      "Squeeze for about a second, then let go completely.",
      "The release matters as much as the squeeze. Let it drop all the way back before the next rep.",
      "Keep breathing normally the whole time.",
    ],
    cues: [
      "Glutes, belly and thighs stay out of it. If they're joining in, you're squeezing harder than you need to.",
      "Spread these through the day. Nobody can tell you're doing them.",
    ],
    avoid: [
      "Holding your breath, or bearing down instead of lifting.",
      "Practising while peeing. That's a one-time way to find the muscle, not a way to train it.",
    ],
  },
  pfHold: {
    name: "Long Holds", type: "pelvic", unit: "reps", base: 12, intro: 1,
    levels: {
      easier: { name: "3-second holds, lying down", f: 1 },
      standard: { name: "5-second holds, sitting", f: 1 },
      harder: { name: "10-second holds, standing", f: 1 },
    },
    setup: "Same muscle as the quick flicks, held instead of flicked.",
    how: [
      "Lift and hold without letting the squeeze fade halfway through.",
      "Breathe through the hold — in and out, not held.",
      "Rest at least as long as you held before the next rep.",
    ],
    cues: [
      "A clean 3-second hold beats a sloppy 10. Move up a level only when the full hold stays steady.",
      "If the squeeze keeps fading, you've found your real starting point. That's useful information, not failure.",
    ],
    avoid: ["Squeezing so hard the rest of you tenses up. Aim for about half of your maximum effort."],
  },
  pfRelease: {
    name: "Reverse Kegel", type: "pelvic", unit: "reps", base: 12, intro: 1,
    levels: {
      easier: { name: "Lying down, long slow breaths", f: 1 },
      standard: { name: "Sitting, breathing into the belly", f: 1 },
      harder: { name: "In a deep squat", f: 1 },
    },
    setup: "This is the other half of the work. A pelvic floor that only ever squeezes ends up tight, not strong — and tight is its own problem.",
    how: [
      "Breathe in slowly and let the whole area widen and drop, like the moment just before you let go.",
      "It's a release, not a push. No straining.",
      "Breathe out and come back to neutral. That's one rep.",
    ],
    cues: [
      "If you can't feel anything happening, lie down and put a hand low on your belly. The movement is small.",
      "Do these after the squeezing work, not before.",
    ],
    avoid: ["Bearing down hard. If you feel pressure pushing outwards, back off — you've gone past releasing."],
  },

  jumprope: {
    name: "Jump Rope", type: "conditioning", unit: "skips", base: 300, intro: 1,
    levels: {
      easier: { name: "No rope — shadow skipping with wrist circles", f: 1.15 },
      standard: { name: "Basic two-foot bounce", f: 1 },
      harder: { name: "Alternating feet or higher tempo", f: 0.9 },
    },
    setup: "Rope handles at hip height when you stand on the middle of the rope.",
    how: ["Small bounces, an inch off the floor.", "Turn the rope from the wrists, elbows close to the body.", "Break the total into sets of 50–100."],
    cues: ["Land quietly through the balls of your feet."],
    avoid: ["Big knee-tuck jumps. Low and fast beats high and slow."],
  },
  burpee: {
    name: "Burpee", type: "conditioning", unit: "reps", base: 30, intro: 1,
    levels: {
      easier: { name: "Step back, step in, no jump", f: 1.15 },
      standard: { name: "Jump back, jump in, jump at the top", f: 1 },
      harder: { name: "Full chest-to-floor burpee", f: 0.75 },
    },
    setup: "Stand tall with room in front of you.",
    how: ["Hands down, feet back to a plank.", "Chest towards the floor if you're doing the full version.", "Feet back in and stand or jump."],
    cues: ["Pick a pace you can hold for the whole set."],
    avoid: ["Sagging hips in the plank position."],
  },
  mountainclimber: {
    name: "Mountain Climber", type: "conditioning", unit: "reps total", base: 60, intro: 1,
    levels: {
      easier: { name: "Hands elevated on a bench, slow tempo", f: 1.15 },
      standard: { name: "Standard tempo on the floor", f: 1 },
      harder: { name: "Fast tempo, hips low", f: 0.9 },
    },
    setup: "Push-up position, hands under shoulders.",
    how: ["Drive one knee towards your chest and swap.", "Keep the hips at shoulder height."],
    cues: ["Shoulders stay stacked over the hands."],
    avoid: ["Hips bouncing up and down."],
  },
  stepup: {
    name: "Step-Up", type: "conditioning", unit: "reps total, alternating", base: 40, intro: 4,
    levels: {
      easier: { name: "Low step, hand on a wall", f: 1.15 },
      standard: { name: "Knee-height step", f: 1 },
      harder: { name: "Higher step, no push off the back foot", f: 0.8 },
    },
    setup: "Find a stable box, step or bench.",
    how: ["Plant the whole foot on the step.", "Drive through that leg to stand tall.", "Lower under control and switch."],
    cues: ["Minimal push from the trailing foot."],
    avoid: ["Bouncing off the bottom leg."],
  },
};

/* Movements named on the original Strength Side page. Everything else is our own
   addition, chosen to fill out the strength / mobility / conditioning rotation. */
const FROM_SOURCE = new Set(["squat", "lunge", "pushup", "pullup", "row", "hkr", "couch", "bearcrawl", "crab", "jumprope", "burpee"]);

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
  { weeks: [1, 2, 3], name: "Basics Mastery", note: "Build the foundation. Quality over quantity — every rep should look like the one before it." },
  { weeks: [4, 5, 6], name: "Reps & Variation", note: "Rep goals climb and new variations appear. Pick the level that makes the last few reps hard but clean." },
  { weeks: [7, 8], name: "Densification", note: "Same movements, bigger sets. Try to finish your reps in fewer, longer sets than last week." },
];

const roundGoal = (n) => (n >= 100 ? Math.round(n / 10) * 10 : n >= 30 ? Math.round(n / 5) * 5 : Math.round(n));

function weekOf(day) { return Math.min(8, Math.floor((day - 1) / 7) + 1); }
function phaseOf(day) { const w = weekOf(day); return PHASES.find((p) => p.weeks.includes(w)); }

const PELVIC = ["pfQuick", "pfHold", "pfRelease"];

/* Pelvic floor runs every single day, so it sits outside the weekly rotation. */
function buildDaily(day, levels) {
  const week = weekOf(day);
  return PELVIC.map((id) => {
    const ex = EX[id];
    const level = levels[id] || "standard";
    return { id, level, goal: roundGoal(ex.base * WEEK_MULT[week - 1] * ex.levels[level].f) };
  });
}

function buildDay(day, levels) {
  if (day === 1) return { day, focus: "test", kind: "baseline", exercises: [] };
  if (day === TOTAL_DAYS) return { day, focus: "test", kind: "retest", exercises: [] };

  const week = weekOf(day);
  const focus = WEEK_PATTERN[(day - 1) % 7];

  // count how many days of this focus have come before, to rotate templates
  let count = 0;
  for (let d = 2; d < day; d++) if (d !== TOTAL_DAYS && WEEK_PATTERN[(d - 1) % 7] === focus) count++;

  const pool = TEMPLATES[focus].filter((t) => t.every((id) => EX[id].intro <= week));
  const ids = pool[count % pool.length];

  const exercises = ids.map((id) => {
    const ex = EX[id];
    const level = levels[id] || "standard";
    const goal = roundGoal(ex.base * WEEK_MULT[week - 1] * ex.levels[level].f);
    return { id, level, goal };
  });

  return { day, focus, kind: "workout", exercises };
}

/* ---------- Baseline / retest ---------- */

const TEST_FIELDS = [
  { id: "pushups", label: "Max push-ups", hint: "One set. Stop when your hips start to sag.", unit: "reps" },
  { id: "pullups", label: "Max pull-ups", hint: "Full hang to chin over the bar. Zero is a valid answer.", unit: "reps" },
  { id: "squats", label: "Bodyweight squats in 60 seconds", hint: "Full depth, steady pace.", unit: "reps" },
  { id: "hang", label: "Dead hang", hint: "One hang, as long as you can hold on.", unit: "sec" },
  { id: "squathold", label: "Deep squat hold", hint: "Heels down, one unbroken hold.", unit: "sec" },
];

const GROUP_LABELS = { push: "Pushing", pull: "Pulling", legs: "Legs and core", mobility: "Mobility" };
const GROUP_HINTS = {
  push: "Push-ups, dips, pike push-ups",
  pull: "Pull-ups, chin-ups, rows, hangs",
  legs: "Squats, lunges, bridges, burpees",
  mobility: "Holds, stretches, crawls",
};

const LEVEL_ORDER = ["easier", "standard", "harder"];

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
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

const FOCUS = {
  strength: { label: "Strength", color: "#FF5C00" },
  mobility: { label: "Mobility", color: "#5AA9E6" },
  conditioning: { label: "Conditioning", color: "#E4C05A" },
  pelvic: { label: "Pelvic floor", color: "#9AA0A6" },
  test: { label: "Test", color: "#FAFAFA" },
};

const GROUP_OF = { pushup: "push", dip: "push", pikepushup: "push", pullup: "pull", chinup: "pull", row: "pull", hkr: "pull" };
const groupOf = (id) => {
  if (GROUP_OF[id]) return GROUP_OF[id];
  const t = EX[id].type;
  return t === "mobility" ? "mobility" : t === "pelvic" ? "pelvic" : "legs";
};

const EQUIPMENT = [
  { id: "bar", label: "Pull-up bar", note: "Required. A doorway bar or a bar at the park both work.", required: true },
  { id: "rings", label: "Gymnastics rings", note: "For rows. A sturdy table works instead." },
  { id: "rope", label: "Jump rope", note: "For conditioning days. We show a no-rope version too." },
  { id: "band", label: "Resistance band", note: "For assisted pull-ups and chin-ups." },
  { id: "weight", label: "Dumbbell, kettlebell or vest", note: "Optional. Used on a few harder levels." },
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

export default function RepsTab({ onExit }) {
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

  const save = useCallback((next) => {
    setState(next);
    (async () => {
      try {
        await storage.set(KEY, JSON.stringify(next));
        setSaveError(false);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, []);

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
  const workout = buildDay(state.currentDay, state.levels);
  const daily = buildDaily(state.currentDay, state.levels);
  const logged = state.loggedDay === state.currentDay ? state.logged : {};

  const missed = state.lastCompletedDate ? Math.max(0, dayDiff(state.lastCompletedDate, today) - 1) : 0;
  const showGap = missed > 0 && state.gapHandledOn !== today && state.history.length > 0;

  const setLevel = (id, level) =>
    save({ ...state, levels: { ...state.levels, [id]: level }, seen: { ...state.seen, [id]: true } });

  const addReps = (id, n) => {
    const ex = [...workout.exercises, ...daily].find((e) => e.id === id);
    if (!ex) return;
    const next = Math.max(0, Math.min(ex.goal, (logged[id] || 0) + n));
    save({
      ...state,
      loggedDay: state.currentDay,
      logged: { ...logged, [id]: next },
      seen: { ...state.seen, [id]: true },
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
      save({ ...state, currentDay: Math.min(TOTAL_DAYS, state.currentDay + missed), gapHandledOn: today, logged: {}, loggedDay: null });
    } else {
      save({ ...state, gapHandledOn: today });
    }
  };

  const resetAll = () =>
    save({ ...DEFAULT_STATE, onboarded: true, equipment: state.equipment, levels: state.levels, seen: state.seen });

  const sheetEntry = sheet
    ? sheet.mode === "log"
      ? [...workout.exercises, ...daily].find((e) => e.id === sheet.id)
      : { id: sheet.id, level: state.levels[sheet.id] || "standard", goal: null }
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
            onOpen={(id) => setSheet({ id, mode: "log" })}
            onComplete={completeDay} onSaveTest={saveTest}
          />
        )}
        {tab === "moves" && <Moves levels={state.levels} onOpen={(id) => setSheet({ id, mode: "read" })} />}
        {tab === "progress" && <ProgressTab state={state} onPick={setReviewDay} onReset={resetAll} />}
      </div>

      <Nav tab={tab} setTab={setTab} onExit={onExit} />

      {sheetEntry && (
        <ExerciseSheet
          entry={sheetEntry}
          logged={logged[sheetEntry.id] || 0}
          firstTime={!state.seen[sheetEntry.id]}
          readOnly={sheet.mode === "read" || doneToday}
          onLevel={(l) => setLevel(sheetEntry.id, l)}
          onAdd={(n) => addReps(sheetEntry.id, n)}
          onClose={() => setSheet(null)}
        />
      )}

      {reviewDay && <Review entry={reviewDay} onClose={() => setReviewDay(null)} />}
      {showGap && <GapModal missed={missed} onChoose={handleGap} />}
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
          <span className="tabular-nums" style={{ color: ACCENT }}>{streak}</span> in a row
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

/* ---------- Today ---------- */

function Today({ state, workout, daily, logged, doneToday, onOpen, onComplete, onSaveTest }) {
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
      <Eyebrow>Day {state.currentDay} · Week {week}</Eyebrow>
      <h1 className="mt-2 flex items-center gap-2.5 text-[32px] font-bold leading-none tracking-tight">
        <span className="h-3 w-3" style={{ backgroundColor: f.color }} />
        {f.label}
      </h1>

      <div className="mt-5">
        <DayBar exercises={workout.exercises} logged={logged} />
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xs tabular-nums text-neutral-400">{finished} of {workout.exercises.length} finished</span>
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
          <Eyebrow>Every day · Pelvic floor</Eyebrow>
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-700">Separate track</span>
        </div>
        <ul className="space-y-px overflow-hidden rounded-2xl border border-neutral-800">
          {daily.map((e) => (
            <li key={e.id}>
              <ExerciseRow entry={e} logged={logged[e.id] || 0} isNew={!state.seen[e.id]} onOpen={() => onOpen(e.id)} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Runs every day, strength or mobility. Invisible from the outside — do them at a desk, in the car, on the sofa. Give it eight weeks before you judge it.
        </p>
      </section>

      <button
        onClick={onComplete}
        disabled={!anyLogged}
        className={`mt-5 w-full rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:bg-transparent disabled:text-neutral-700 ${RING}`}
        style={anyLogged ? { backgroundColor: allDone ? ACCENT : "#1F1F1F", color: allDone ? "#0A0A0A" : "#FAFAFA" } : { border: "1px solid #1F1F1F" }}
      >
        {allDone ? "Finish day" : anyLogged ? "Finish day early" : "Log a rep to finish the day"}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-neutral-600">
        You don't have to do this in one go. Split the reps across the day — they count the same.
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
            {isNew && <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>New</span>}
          </div>
          <div className="mt-1 truncate text-xs text-neutral-500">{ex.levels[entry.level].name}</div>
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
      <Eyebrow>Day {day} logged</Eyebrow>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-tight">That's today's<br />work in.</h1>
      <p className="mt-5 text-[13px] leading-relaxed text-neutral-400">
        Tomorrow's session unlocks in the morning. Nothing left to do today — that's the whole idea.
      </p>
      <p className="mt-4 text-xs leading-relaxed text-neutral-600">
        Progress has your last sessions and the full eight weeks. Movements has the instructions for everything.
      </p>
    </main>
  );
}

/* ---------- Exercise sheet ---------- */

function ExerciseSheet({ entry, logged, firstTime, readOnly, onLevel, onAdd, onClose }) {
  const ex = EX[entry.id];
  const browse = entry.goal == null;
  const timed = ex.unit.indexOf("sec") !== -1;
  const remaining = browse ? 0 : Math.max(0, entry.goal - logged);
  const steps = browse ? [] : entry.goal >= 200 ? [50, 25, 10] : entry.goal >= 60 ? [20, 10, 5] : [10, 5, 1];

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
      <Eyebrow>{showLevelFirst ? "First time with this one — pick your level" : "Your level"}</Eyebrow>
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
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: on ? ACCENT : "#737373" }}>{l}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-200">{ex.levels[l].name}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!browse && <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">Changing this adjusts today's rep goal and is remembered from here on.</p>}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <Eyebrow>{FOCUS[ex.type].label}</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Close</button>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-10">
        <h2 className="mt-6 text-[30px] font-bold leading-none tracking-tight">{ex.name}</h2>
        <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: FROM_SOURCE.has(entry.id) ? "#525252" : ACCENT }}>
          {FROM_SOURCE.has(entry.id) ? "From the original program" : "Added movement"}
        </div>

        {browse && (
          <p className="mt-5 border-l-2 border-neutral-800 pl-3 text-[13px] leading-relaxed text-neutral-500">
            Reading only. Rep goals appear on the day this movement comes up.
          </p>
        )}

        {showLevelFirst && <div className="mt-7">{levelPicker}</div>}

        {!browse && (
          <section className="mt-7 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-[56px] font-bold leading-none tabular-nums tracking-tighter" style={{ color: remaining === 0 ? ACCENT : "#FAFAFA" }}>
                {remaining}
              </span>
              <span className="text-xs text-neutral-500">left of {entry.goal} {ex.unit}</span>
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
                      {running ? "Pause" : elapsed ? "Resume" : "Start"}
                    </button>
                    <button onClick={() => { onAdd(elapsed); setElapsed(0); setRunning(false); }} disabled={elapsed === 0}
                      className={`rounded-lg px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] disabled:opacity-30 ${RING}`}
                      style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
                      Log
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

                {logged > 0 && (
                  <button onClick={() => onAdd(-(timed ? 15 : steps[steps.length - 1]))}
                    className={`mt-3 text-[11px] uppercase tracking-[0.16em] text-neutral-600 ${RING}`}>
                    Undo {timed ? "15 sec" : steps[steps.length - 1]}
                  </button>
                )}
              </>
            )}

            {timed && !readOnly && (
              <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">Hold as long as you can, then log it. Several holds add up to the goal.</p>
            )}
          </section>
        )}

        <Block title="Set up"><p className="text-[13px] leading-relaxed text-neutral-300">{ex.setup}</p></Block>

        <Block title="How to do it">
          <ol className="space-y-3">
            {ex.how.map((h, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-4 shrink-0 pt-0.5 text-[11px] font-bold tabular-nums text-neutral-600">{i + 1}</span>
                <span className="text-[13px] leading-relaxed text-neutral-300">{h}</span>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Cues">
          <ul className="space-y-2.5">{ex.cues.map((c, i) => <li key={i} className="text-[13px] leading-relaxed text-neutral-300">{c}</li>)}</ul>
        </Block>

        <Block title="Watch out for">
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
        <Eyebrow>Calibrated</Eyebrow>
        <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">Here's where<br />you start.</h1>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
          Set from your test, not from a guess. Nudge anything that feels wrong — and every movement stays adjustable once you're in.
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
                      {l}
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
          Start day 2
        </button>
        <p className="mt-3 text-xs leading-relaxed text-neutral-600">
          Day 1 is the test. Your first session is tomorrow.
        </p>
      </main>
    );
  }

  return (
    <main className="px-5">
      <Eyebrow>{kind === "baseline" ? "Day 1" : "Day 56"}</Eyebrow>
      <h1 className="mt-2 text-[30px] font-bold leading-[1.08] tracking-tight">
        {kind === "baseline" ? "Five numbers." : "The same five numbers."}
      </h1>
      <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
        {kind === "baseline"
          ? "Rest as long as you need between them. These set your starting variations, and they're what you'll beat in eight weeks."
          : "Same tests, same conditions. This is where the eight weeks show up."}
      </p>

      <div className="mt-6 space-y-px overflow-hidden rounded-2xl border border-neutral-800">
        {TEST_FIELDS.map((f) => (
          <div key={f.id} className="flex items-center gap-4 bg-neutral-900 px-4 py-4">
            <div className="min-w-0 flex-1">
              <label htmlFor={f.id} className="block text-[14px] font-bold leading-snug">{f.label}</label>
              <div className="mt-1 text-xs leading-relaxed text-neutral-500">{f.hint}</div>
              {kind === "retest" && baseline && (
                <div className="mt-1 text-xs tabular-nums text-neutral-600">Baseline: {baseline[f.id]}</div>
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
        {ready ? (kind === "baseline" ? "See where I start" : "Save the retest") : "Fill in all five"}
      </button>
    </main>
  );
}

/* ---------- Movements ---------- */

function Moves({ levels, onOpen }) {
  const groups = [["strength", "Strength"], ["mobility", "Mobility"], ["conditioning", "Conditioning"], ["pelvic", "Pelvic floor"]];

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Movements</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-neutral-400">
        All {Object.keys(EX).length} movements in the program. Read the instructions any time, not just on the day.
      </p>

      <div className="mt-4 flex gap-5">
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />From the original
        </span>
        <span className="flex items-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />Added by us
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

function ProgressTab({ state, onPick, onReset }) {
  const done = state.history.length;
  const totalReps = state.history.reduce((s, h) => s + h.done, 0);
  const last = state.history.slice(-14);
  const max = Math.max(1, ...last.map((h) => h.goal));
  const byDay = Object.fromEntries(state.history.map((h) => [h.day, h]));

  return (
    <main className="px-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight">Progress</h1>

      <div className="mt-5 flex gap-8 border-y border-neutral-800 py-5">
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{done}</div>
          <Eyebrow className="mt-2">of {TOTAL_DAYS} days</Eyebrow>
        </div>
        <div>
          <div className="text-[34px] font-bold leading-none tabular-nums tracking-tight">{totalReps.toLocaleString()}</div>
          <Eyebrow className="mt-2">reps logged</Eyebrow>
        </div>
      </div>

      <section className="mt-7">
        <Eyebrow>Last sessions</Eyebrow>
        {last.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">Finish your first day and it turns up here.</p>
        ) : (
          <div className="mt-4 flex h-24 items-end gap-1">
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
        <Eyebrow>Eight weeks</Eyebrow>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">Tap a finished day to look back at it. Days ahead stay locked.</p>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, wi) => (
            <div key={wi} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-[10px] font-bold tabular-nums text-neutral-600">{wi + 1}</span>
              <div className="grid flex-1 grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, di) => {
                  const day = wi * 7 + di + 1;
                  const entry = byDay[day];
                  const isToday = day === state.currentDay;
                  const color = FOCUS[buildDay(day, state.levels).focus].color;
                  return (
                    <button key={day} onClick={() => entry && onPick(entry)} disabled={!entry}
                      aria-label={`Day ${day}`}
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
          <Eyebrow>Baseline → retest</Eyebrow>
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

      <button onClick={onReset} className={`mt-10 w-full border border-neutral-800 py-3.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600 ${RING}`}>
        Start the eight weeks over
      </button>
      <p className="mt-2.5 text-center text-[11px] text-neutral-700">Your levels are kept, so a repeat run picks up where you left off.</p>
    </main>
  );
}

function Review({ entry, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950" style={{ fontFamily: FONT }}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
        <Eyebrow>Day {entry.day} · {entry.date}</Eyebrow>
        <button onClick={onClose} className={`-mr-2 px-2 py-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400 ${RING}`}>Close</button>
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
        <Eyebrow>{missed} {missed === 1 ? "day" : "days"} missed</Eyebrow>
        <h3 className="mt-2 text-xl font-bold tracking-tight">Where do you want to pick up?</h3>
        <div className="mt-5 space-y-2">
          <button onClick={() => onChoose("catch")} className={`w-full rounded-xl p-4 text-left ${RING}`} style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em]">Catch up</div>
            <div className="mt-1 text-[13px] leading-relaxed">Carry on with the next session in order. Nothing gets skipped.</div>
          </button>
          <button onClick={() => onChoose("skip")} disabled={tooFar} className={`w-full rounded-xl border border-neutral-700 p-4 text-left disabled:opacity-40 ${RING}`}>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-200">Skip ahead</div>
            <div className="mt-1 text-[13px] leading-relaxed text-neutral-400">
              {tooFar
                ? "Not available past seven missed days — you'd skip too much of the program."
                : "Jump to the session scheduled for today and stay on the weekly structure."}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Nav({ tab, setTab, onExit }) {
  const items = [["today", "Today"], ["moves", "Movements"], ["progress", "Progress"]];
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
                Eight weeks.<br />One short session<br />a day.
              </h1>
              <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-neutral-400">
                <p>Each day gives you three or four movements and a rep goal for each. Twenty to twenty-five minutes if you do it in one go.</p>
                <p>You don't have to do it in one go. Split the reps across the day — morning coffee, lunch, after work. They count the same.</p>
                <p>A new session unlocks each morning. You can't run ahead, and that's deliberate.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-[30px] font-bold leading-[1.08] tracking-tight">What have you got?</h1>
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">One question, then a short test that sets your starting variations.</p>
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
                            {eq.required && <span className="ml-2 text-[9px] uppercase tracking-[0.16em]" style={{ color: ACCENT }}>Required</span>}
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
                  Pull-ups, rows and hangs run through the whole program. Get a doorway bar, or find one at a park, before day 2.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-8">
          {step > 0 && (
            <button onClick={() => setStep(0)} className={`px-5 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 ${RING}`}>Back</button>
          )}
          <button onClick={() => (step === 1 ? onDone(equipment) : setStep(1))}
            className={`flex-1 rounded-xl py-4 text-xs font-bold uppercase tracking-[0.18em] ${RING}`}
            style={{ backgroundColor: ACCENT, color: "#0A0A0A" }}>
            {step === 1 ? "Take the baseline test" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
