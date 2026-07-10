/* TuneForge — rule-based composition engine.
 * Turns settings + a genre definition into a Song:
 *   { name, tempo, bars, key, scale, tracks:[{ id, name, role, channel,
 *     program, notes:[{ start, dur, pitch, vel }] }] }
 * start/dur are in beats (quarter notes). Swing and humanization are baked
 * into the note times so the MIDI file and the preview player agree exactly.
 */

const Engine = (() => {
  const DRUM_NOTES = {
    kick: 36, rim: 37, snare: 38, clap: 39, chh: 42, phh: 44, ohh: 46,
    ltom: 45, mtom: 47, htom: 50, crash: 49, ride: 51, bell: 53, tamb: 54,
    cowbell: 56, conga: 63, shaker: 70, clave: 75,
  };

  const CHANNELS = { drums: 9, bass: 0, chords: 1, melody: 2, pads: 3, arp: 4 };
  const PART_LABELS = { drums: 'Drums', bass: 'Bass', chords: 'Chords', melody: 'Melody', pads: 'Pads', arp: 'Arp' };

  const GM_NAMES = [
    'Acoustic Grand Piano', 'Bright Piano', 'Electric Grand', 'Honky-tonk Piano', 'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet',
    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    'Nylon Guitar', 'Steel Guitar', 'Jazz Guitar', 'Clean Guitar', 'Muted Guitar', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
    'Acoustic Bass', 'Fingered Bass', 'Picked Bass', 'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
    'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
    'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
    'Square Lead', 'Saw Lead', 'Calliope Lead', 'Chiff Lead', 'Charang Lead', 'Voice Lead', 'Fifths Lead', 'Bass + Lead',
    'New Age Pad', 'Warm Pad', 'Polysynth Pad', 'Choir Pad', 'Bowed Pad', 'Metallic Pad', 'Halo Pad', 'Sweep Pad',
    'FX Rain', 'FX Soundtrack', 'FX Crystal', 'FX Atmosphere', 'FX Brightness', 'FX Goblins', 'FX Echoes', 'FX Sci-Fi',
    'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone', 'Helicopter', 'Applause', 'Gunshot',
  ];

  /* ---------------------------------------------------------- utilities */

  function velFor(char, energy) {
    const scale = 0.85 + energy * 0.3;
    if (char === 'X') return Math.round((112 + energy * 12) * Math.min(scale, 1.05));
    if (char === 'x') return Math.round(92 * scale);
    if (char === '-') return Math.round(52 * scale);
    return Math.round(80 * scale); // '?' hits
  }

  function mergeRow(base, overlay) {
    const a = (base || '................').split('');
    for (let i = 0; i < 16; i++) {
      if (overlay[i] && overlay[i] !== '.') a[i] = overlay[i];
    }
    return a.join('');
  }

  function applySwing(notes, unit, ratio) {
    if (ratio <= 0.5) return;
    const stepDur = unit === 8 ? 0.5 : 0.25;
    const shift = (2 * ratio - 1) * stepDur;
    for (const n of notes) {
      const pos = n.start / stepDur;
      const idx = Math.round(pos);
      if (Math.abs(pos - idx) < 0.02 && idx % 2 === 1) n.start += shift;
    }
  }

  function applyHumanize(notes, rand, amt, isDrums) {
    if (amt <= 0) return;
    const tAmt = amt * (isDrums ? 0.015 : 0.03);
    for (const n of notes) {
      if (n.start > 0.05) n.start = Math.max(0, n.start + (rand() * 2 - 1) * tAmt);
      n.vel = Theory.clamp(Math.round(n.vel + (rand() * 2 - 1) * amt * 12), 20, 127);
    }
  }

  /* ------------------------------------------------------------- chords */

  /** One entry per bar: which chord is sounding, its voicing, its root. */
  function buildHarmony(genre, settings, rand) {
    const prog = Theory.pick(rand, genre.progressions);
    const bpc = genre.barsPerChord || 1;
    const scaleSteps = Theory.SCALES[settings.scale].steps;
    const n = scaleSteps.length;
    const out = [];
    let prevVoicing = null;
    for (let bar = 0; bar < settings.bars; bar++) {
      const slot = Math.floor(bar / bpc);
      const deg = prog[slot % prog.length];
      const isBoundary = bar % bpc === 0;
      let entry;
      if (isBoundary || out.length === 0) {
        const degrees = Theory.chordDegrees(deg, genre.chordSize);
        const voicing = Theory.voiceChord(
          settings.key, settings.scale, degrees, prevVoicing,
          genre.chordRange[0], genre.chordRange[1]);
        prevVoicing = voicing;
        const rootPc = (settings.key + scaleSteps[((deg % n) + n) % n]) % 12;
        entry = { deg, degrees, voicing, rootPc, boundary: true, durBars: bpc };
      } else {
        entry = { ...out[out.length - 1], boundary: false };
      }
      out.push(entry);
    }
    // Next-chord root for approach notes.
    for (let i = 0; i < out.length; i++) {
      out[i].nextRootPc = out[(i + 1) % out.length].rootPc;
    }
    return out;
  }

  /* -------------------------------------------------------------- drums */

  function genDrums(genre, settings, harmony, rand) {
    const notes = [];
    const d = genre.drums;
    const { energy, complexity, bars } = settings;
    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4;
      const variant = d.variants[Math.floor(bar / 4) % d.variants.length];
      const isFill = bars > 2 && (bar % 8 === 7 || bar === bars - 1);
      let rows = { ...variant };
      if (isFill && d.fill) {
        for (const key of Object.keys(d.fill)) rows[key] = mergeRow(rows[key], d.fill[key]);
      }
      for (const [row, str] of Object.entries(rows)) {
        const pitch = DRUM_NOTES[row];
        if (!pitch || !str) continue;
        const isHat = row === 'chh' || row === 'shaker' || row === 'tamb';
        for (let s = 0; s < 16; s++) {
          const c = str[s];
          if (c === '.' || c === undefined) continue;
          if (c === '?' && !Theory.chance(rand, 0.35 + complexity * 0.35)) continue;
          // Low energy thins out non-accented hat hits.
          if (isHat && c === 'x' && energy < 0.5 && Theory.chance(rand, (0.5 - energy) * 0.5)) continue;
          const start = t0 + s * 0.25;
          // Trap-style hat rolls: subdivide the odd 16th into 32nds.
          if (genre.hatRoll && row === 'chh' && s % 4 === 3 && Theory.chance(rand, complexity * 0.35)) {
            const nRoll = Theory.chance(rand, 0.4) ? 3 : 2;
            for (let k = 0; k < nRoll; k++) {
              notes.push({ start: start + k * (0.25 / nRoll), dur: 0.08, pitch, vel: 70 + k * 8 });
            }
            continue;
          }
          const dur = row === 'ohh' ? 0.45 : (row === 'crash' || row === 'ride') ? 0.8 : 0.12;
          notes.push({ start, dur, pitch, vel: velFor(c, energy) });
        }
      }
      if (d.crashOnOne && (bar % 8 === 0)) {
        notes.push({ start: t0, dur: 1.2, pitch: DRUM_NOTES.crash, vel: Math.round(90 + energy * 20) });
      }
    }
    return notes;
  }

  /* --------------------------------------------------------------- bass */

  function bassRoot(harm, octave) {
    return Theory.clamp(harm.rootPc + 12 * (octave + 1), 12, 60);
  }

  function genBass(genre, settings, harmony, rand) {
    const notes = [];
    const { energy, complexity, bars } = settings;
    const oct = genre.bassOctave;
    const style = genre.bassStyle;
    const scaleSteps = Theory.SCALES[settings.scale].steps;

    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4;
      const h = harmony[bar];
      const root = bassRoot(h, oct);
      const fifth = root + 7;
      const nextRoot = bassRoot({ rootPc: h.nextRootPc }, oct);
      const put = (step, dur, pitch, vel) =>
        notes.push({ start: t0 + step * 0.25, dur, pitch: Theory.clamp(pitch, 12, 72), vel });

      switch (style) {
        case 'offbeat8': // pumping house bass on the off-8ths
          for (const s of [2, 6, 10, 14]) {
            let p = root;
            if (s === 14 && Theory.chance(rand, 0.3 + complexity * 0.3)) p = nextRoot > root ? root + 12 : fifth;
            put(s, 0.4, p, 96 + Math.round(energy * 14));
          }
          if (Theory.chance(rand, 0.3)) put(0, 0.3, root, 88);
          break;

        case 'rolling16': // techno / dnb 16th-note roller
          for (let s = 0; s < 16; s++) {
            const onBeat = s % 4 === 0;
            if (!onBeat && !Theory.chance(rand, 0.25 + complexity * 0.45)) continue;
            let p = root;
            if (Theory.chance(rand, 0.15 + complexity * 0.15)) p = root + 12;
            else if (Theory.chance(rand, 0.1)) p = fifth;
            put(s, 0.16, p, onBeat ? 104 : 80 + Math.round(rand() * 14));
          }
          break;

        case 'walking': { // jazz quarter notes toward the next root
          const third = root + (scaleSteps.includes(3) ? 3 : 4);
          const beats = [root, Theory.pick(rand, [third, fifth]), Theory.pick(rand, [fifth, root + 12, third])];
          const approach = Theory.chance(rand, 0.5) ? nextRoot + 1 : nextRoot - 1;
          beats.push(Theory.chance(rand, 0.75) ? approach : fifth);
          beats.forEach((p, i) => put(i * 4, 0.92 * 4 * 0.25, p, 86 + (i === 0 ? 10 : 0)));
          break;
        }

        case 'boombap': { // lo-fi: sits with the kick, lazy
          put(0, 1.4, root, 98);
          if (Theory.chance(rand, 0.7)) put(6, 0.4, Theory.pick(rand, [root, fifth]), 82);
          put(10, 0.8, root, 90);
          if (Theory.chance(rand, 0.35 + complexity * 0.3)) put(14, 0.4, nextRoot, 78);
          break;
        }

        case 'sub808': { // trap: long sub notes, occasional octave flick
          put(0, 2.6, root, 108);
          const s2 = Theory.pick(rand, [10, 11, 12]);
          if (Theory.chance(rand, 0.75)) put(s2, 1.2, Theory.chance(rand, 0.25) ? root + 12 : root, 96);
          if (Theory.chance(rand, complexity * 0.4)) put(7, 0.3, fifth, 84);
          break;
        }

        case 'funk16': { // syncopated with ghost notes and octave pops
          put(0, 0.3, root, 110);
          for (const s of [3, 4, 6, 7, 10, 11, 13, 14]) {
            if (!Theory.chance(rand, 0.2 + complexity * 0.4)) continue;
            const choice = rand();
            let p = root, v = 74;
            if (choice > 0.75) { p = root + 12; v = 92; }
            else if (choice > 0.55) { p = fifth; v = 84; }
            else if (choice > 0.4) { p = root + 10; v = 80; } // b7 colour
            put(s, 0.18, p, v);
          }
          break;
        }

        case 'synth8': // synthwave straight-8 pulse (seeded octave/passing variation)
          for (let s = 0; s < 16; s += 2) {
            let p = root;
            if ((energy > 0.55 && s % 4 === 2) || Theory.chance(rand, complexity * 0.25)) p = root + 12;
            else if (Theory.chance(rand, 0.12)) p = fifth;
            if (s === 14 && Theory.chance(rand, 0.4)) p = nextRoot > root ? nextRoot - 2 : nextRoot + 2;
            put(s, 0.42, p, s % 8 === 0 ? 102 : 86);
          }
          break;

        case 'pick8': // rock 8ths on the root, walk-up into the next bar
          for (let s = 0; s < 16; s += 2) {
            let p = root;
            if (s === 14 && Theory.chance(rand, 0.4)) p = nextRoot > root ? nextRoot - 2 : nextRoot + 2;
            put(s, 0.44, p, s % 8 === 0 ? 100 : 84);
          }
          break;

        case 'dembow': // reggaetón tumbao
          put(0, 0.7, root, 104);
          put(3, 0.25, root, 82);
          put(6, 0.45, Theory.chance(rand, 0.4) ? fifth : root, 92);
          put(8, 0.7, root, 100);
          put(11, 0.25, root, 80);
          put(14, 0.45, Theory.chance(rand, 0.4) ? root + 12 : fifth, 90);
          break;

        case 'pulse': { // tension: low pedal + heartbeat re-articulations
          if (h.boundary) put(0, 4 * h.durBars - 0.2, root, 62);
          const beat = Theory.pick(rand, [8, 9, 10, 12]);
          if (Theory.chance(rand, 0.5 + complexity * 0.3)) {
            put(beat, 0.18, root, 78);      // "lub"
            put(beat + 1, 0.22, root, 58);  // "dub"
          }
          if (Theory.chance(rand, complexity * 0.3)) put(4, 0.2, fifth, 60);
          break;
        }

        case 'ostinato': { // action: driving repeated-note ostinato
          const sub = energy > 0.7 ? 1 : 2; // 16ths at high energy, else 8ths
          for (let s = 0; s < 16; s += sub) {
            const onBeat = s % 4 === 0;
            if (!onBeat && sub === 1 && !Theory.chance(rand, 0.55 + complexity * 0.35)) continue;
            let p = root;
            if (Theory.chance(rand, 0.14 + complexity * 0.16)) p = Theory.chance(rand, 0.5) ? fifth : root + 12;
            if (s === 14 && Theory.chance(rand, 0.5)) p = nextRoot; // pull toward next chord
            put(s, sub === 1 ? 0.16 : 0.22, p, onBeat ? 108 : 84 + Math.round(rand() * 12));
          }
          break;
        }

        case 'pizz': { // bouncy staccato hops
          for (const s of [0, 4, 8, 12]) put(s, 0.14, root, 98);
          for (const s of [2, 6, 10, 14]) {
            if (!Theory.chance(rand, 0.3 + complexity * 0.4)) continue;
            put(s, 0.12, Theory.pick(rand, [fifth, root + 12, root, root + 7]), 76 + Math.round(rand() * 14));
          }
          break;
        }

        case 'halfNote': { // uplifting: clean supportive root/fifth
          put(0, 1.9, root, 92);
          put(8, 1.7, Theory.chance(rand, 0.4) ? fifth : root, 84);
          if (Theory.chance(rand, 0.3 + complexity * 0.2)) put(14, 0.4, nextRoot, 74); // walk-up
          break;
        }

        case 'arco': { // emotional: sustained bowed bass, gentle root->fifth
          if (h.boundary) {
            const half = 2 * h.durBars;
            put(0, half * 0.98, root, 68);
            put(Math.round(half / 0.25), half * 0.98, Theory.chance(rand, 0.5) ? fifth : root, 58);
          }
          break;
        }

        case 'drone': // ambient / cinematic pedal tones
        default:
          if (h.boundary) {
            const dur = 4 * h.durBars - 0.1;
            put(0, dur, root, 78);
            if (Theory.chance(rand, 0.4)) put(0, dur, fifth, 58);
          }
          break;
      }
    }
    return notes;
  }

  /* -------------------------------------------------------------- chords */

  function genChords(genre, settings, harmony, rand) {
    const notes = [];
    const { energy, complexity, bars } = settings;
    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4;
      const h = harmony[bar];
      const put = (step, dur, vel, voicing) => {
        for (const p of voicing || h.voicing) notes.push({ start: t0 + step * 0.25, dur, pitch: p, vel });
      };

      switch (genre.chordStyle) {
        case 'stabs':
          for (const s of [2, 6, 10, 14]) {
            if (!Theory.chance(rand, 0.55 + energy * 0.4)) continue;
            put(s, 0.24, 84 + Math.round(energy * 16));
          }
          break;

        case 'comp': { // jazzy: a few syncopated pushes per bar
          const cands = [0, 3, 6, 8, 10, 13, 14];
          const nHits = 2 + Math.round(complexity * 2);
          const picked = [];
          while (picked.length < nHits && picked.length < cands.length) {
            const c = Theory.pick(rand, cands);
            if (!picked.includes(c)) picked.push(c);
          }
          picked.sort((a, b) => a - b);
          picked.forEach((s, i) => {
            const next = i + 1 < picked.length ? picked[i + 1] : 16;
            const dur = Math.min((next - s) * 0.25 * 0.9, 1.6);
            put(s, Math.max(dur, 0.3), 68 + Math.round(rand() * 20));
          });
          break;
        }

        case 'pluck8':
          for (let s = 0; s < 16; s += 2) {
            if (Theory.chance(rand, (1 - energy) * 0.25)) continue;
            put(s, 0.36, s % 8 === 0 ? 84 : 70);
          }
          break;

        case 'anthem':
          put(0, 1.9, 88);
          put(8, 1.7, 80);
          if (Theory.chance(rand, 0.4)) {
            const nextBar = harmony[(bar + 1) % bars];
            put(14, 0.5, 76, nextBar.voicing); // push into the next chord
          }
          break;

        case 'funkstab': {
          const cands = [0, 3, 4, 6, 7, 10, 11, 14];
          for (const s of cands) {
            if (!Theory.chance(rand, 0.18 + complexity * 0.3)) continue;
            put(s, 0.16, 72 + Math.round(rand() * 24));
          }
          break;
        }

        case 'cluster': // sustained chord + a dissonant added tone
          if (h.boundary) {
            const dur = 4 * h.durBars - 0.15;
            put(0, dur, 52);
            const bottom = h.voicing[0];
            const diss = Theory.chance(rand, 0.5) ? bottom + 1 : bottom + 6; // b2 or tritone
            if (diss <= 96) notes.push({ start: t0, dur, pitch: diss, vel: 38 });
            if (Theory.chance(rand, complexity * 0.5)) {
              const top = h.voicing[h.voicing.length - 1] + 11; // minor-9 shimmer up top
              if (top <= 100) notes.push({ start: t0, dur, pitch: top, vel: 30 });
            }
          }
          break;

        case 'staccato': { // short playful stabs
          put(0, 0.14, 88);
          for (const s of [2, 4, 6, 8, 10, 12, 14]) {
            if (!Theory.chance(rand, 0.28 + complexity * 0.35)) continue;
            put(s, 0.13, 70 + Math.round(rand() * 22));
          }
          break;
        }

        case 'broken': { // emotional: flowing broken-chord accompaniment
          const tones = h.voicing;
          if (tones.length) {
            for (let s = 0; s < 8; s++) {
              if (Theory.chance(rand, (1 - energy) * 0.18)) continue;
              const p = tones[s % tones.length];
              notes.push({
                start: t0 + s * 0.5,
                dur: 0.9,
                pitch: p,
                vel: (s === 0 ? 70 : 56) + Math.round(rand() * 8),
              });
            }
          }
          break;
        }

        case 'drone': { // drones: soft stacked sustain with overtone doublings
          if (h.boundary) {
            const dur = 4 * h.durBars - 0.08;
            const root = h.voicing[0];
            if (root - 12 >= 36) notes.push({ start: t0, dur, pitch: root - 12, vel: 40 + Math.round(rand() * 6) });
            for (const p of h.voicing) {
              notes.push({ start: t0, dur, pitch: p, vel: 44 + Math.round(rand() * 8) });
              if (p + 12 <= 96 && Theory.chance(rand, 0.45)) {
                notes.push({ start: t0, dur, pitch: p + 12, vel: 30 + Math.round(rand() * 8) });
              }
            }
          }
          break;
        }

        case 'pad':
        default:
          if (h.boundary) put(0, 4 * h.durBars - 0.15, 64);
          break;
      }
    }
    return notes;
  }

  /* -------------------------------------------------------------- melody */

  const RHYTHMS = { // [step, durSteps] pairs per bar; 16 steps per bar
    hook: [
      [[0, 2], [2, 2], [4, 2], [8, 2], [10, 2], [12, 4]],
      [[0, 3], [3, 1], [4, 4], [8, 4], [12, 4]],
      [[0, 2], [4, 2], [6, 2], [8, 2], [12, 4]],
      [[2, 2], [4, 2], [8, 2], [10, 2], [12, 3]],
    ],
    theme: [
      [[0, 4], [4, 4], [8, 8]],
      [[0, 6], [6, 2], [8, 8]],
      [[0, 4], [4, 2], [6, 2], [8, 8]],
      [[0, 8], [8, 4], [12, 4]],
    ],
    sparse: [
      [[0, 8], [8, 8]], [[0, 4], [8, 6]], [[4, 8]], [], [[0, 12]], [[8, 8]],
    ],
    noodle: [
      [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2]],
      [[0, 2], [2, 2], [4, 1], [5, 1], [6, 2], [8, 4], [12, 2]],
      [[2, 2], [4, 2], [6, 1], [7, 1], [8, 2], [10, 2], [12, 4]],
      [[0, 4], [4, 2], [6, 2], [8, 2], [10, 1], [11, 1], [12, 4]],
    ],
    groove: [
      [[0, 1], [3, 1], [6, 2], [8, 1], [11, 1], [14, 2]],
      [[0, 2], [3, 1], [4, 2], [7, 1], [8, 2], [11, 1], [12, 2]],
      [[0, 1], [2, 1], [4, 2], [7, 1], [10, 2], [12, 2], [14, 2]],
    ],
    motif: [ // action: driving, repetitive rhythmic cells
      [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]],
      [[0, 1], [1, 1], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]],
      [[0, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]],
      [[0, 4], [4, 4], [8, 2], [10, 2], [12, 4]],
    ],
    playful: [ // skippy staccato bounce
      [[0, 1], [2, 1], [3, 1], [6, 2], [8, 1], [10, 1], [11, 1], [14, 2]],
      [[0, 2], [2, 1], [4, 1], [6, 1], [8, 2], [11, 1], [12, 2], [14, 1]],
      [[0, 1], [1, 1], [4, 2], [7, 1], [8, 1], [10, 1], [12, 2], [15, 1]],
    ],
  };

  /** All scale pitches in a playable window, plus which are chord tones. */
  function pitchField(settings, harmony, lo, hi) {
    const pcs = Theory.SCALES[settings.scale].steps.map((s) => (settings.key + s) % 12);
    const field = [];
    for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) field.push(m);
    return field;
  }

  function genMelody(genre, settings, harmony, rand) {
    const style = genre.melody.style;
    const oct = genre.melody.octave;
    const center = 12 * (oct + 1) + settings.key;
    const field = pitchField(settings, harmony, center - 10, center + 14);
    if (!field.length) return [];
    const chordToneIdx = (bar, near) => {
      const pcs = harmony[bar].degrees.map((d) => {
        const steps = Theory.SCALES[settings.scale].steps;
        return (settings.key + steps[((d % steps.length) + steps.length) % steps.length]) % 12;
      });
      let best = near, bestDist = Infinity;
      field.forEach((m, i) => {
        if (!pcs.includes(m % 12)) return;
        const dd = Math.abs(i - near);
        if (dd < bestDist) { bestDist = dd; best = i; }
      });
      return best;
    };

    const templates = RHYTHMS[style] || RHYTHMS.hook;
    const buildPhrase = (startBar, len, idxStart) => {
      const notes = [];
      let idx = idxStart;
      for (let b = 0; b < len; b++) {
        const bar = startBar + b;
        if (bar >= settings.bars) break;
        let rhythm = Theory.pick(rand, templates);
        if (style !== 'sparse' && settings.complexity < 0.4 && rhythm.length > 4) {
          rhythm = rhythm.filter(() => Theory.chance(rand, 0.75));
        }
        rhythm.forEach(([step, durSteps], i) => {
          const strong = step === 0 || step === 8;
          if (strong || i === rhythm.length - 1) {
            idx = chordToneIdx(bar, idx);
          } else if (Theory.chance(rand, 0.16)) {
            idx = chordToneIdx(bar, idx + (Theory.chance(rand, 0.5) ? 3 : -3));
          } else {
            idx += Theory.pick(rand, [-2, -1, -1, 1, 1, 2]);
          }
          idx = Theory.clamp(idx, 0, field.length - 1);
          notes.push({
            start: bar * 4 + step * 0.25,
            dur: durSteps * 0.25 * 0.92,
            pitch: field[idx],
            vel: (strong ? 96 : 84) + Math.round(rand() * 10),
          });
        });
      }
      return { notes, endIdx: idx };
    };

    const varyPhrase = (phrase) => phrase.notes.map((n) => {
      const out = { ...n };
      if (Theory.chance(rand, 0.3)) {
        const i = field.indexOf(out.pitch);
        if (i >= 0) out.pitch = field[Theory.clamp(i + Theory.pick(rand, [-1, 1]), 0, field.length - 1)];
      }
      return out;
    });

    const all = [];
    let phraseA = null, phraseB = null, idx = Math.floor(field.length / 2);
    for (let p = 0; p * 4 < settings.bars; p++) {
      const startBar = p * 4;
      let notes;
      if (p % 4 === 0 || !phraseA) {
        phraseA = buildPhrase(startBar, 4, idx);
        idx = phraseA.endIdx;
        notes = phraseA.notes;
      } else if (p % 4 === 2 || (p % 4 === 3 && !phraseB)) {
        phraseB = buildPhrase(startBar, 4, idx);
        idx = phraseB.endIdx;
        notes = phraseB.notes;
      } else {
        const src = p % 4 === 1 ? phraseA : phraseB;
        notes = varyPhrase(src).map((n) => ({ ...n, start: n.start - Math.floor(n.start / 16) * 16 + startBar * 4 }));
      }
      // Re-anchor to this phrase's bars (variations reuse earlier timings).
      for (const n of notes) {
        const local = ((n.start % 16) + 16) % 16;
        const anchored = startBar * 4 + local;
        if (anchored / 4 < settings.bars) all.push({ ...n, start: anchored });
      }
    }
    return all;
  }

  /* ----------------------------------------------------------- pads/arp */

  function genPads(genre, settings, harmony, rand) {
    const notes = [];
    for (let bar = 0; bar < settings.bars; bar++) {
      const h = harmony[bar];
      if (!h.boundary) continue;
      const dur = 4 * h.durBars - 0.1;
      const voices = [h.voicing[0] - 12, ...h.voicing];
      if (settings.complexity > 0.5 && h.voicing.length) voices.push(h.voicing[h.voicing.length - 1] + 12);
      for (const p of voices) {
        if (p < 36 || p > 96) continue;
        notes.push({ start: bar * 4, dur, pitch: p, vel: 52 + Math.round(rand() * 8) });
      }
    }
    return notes;
  }

  function genArp(genre, settings, harmony, rand) {
    const notes = [];
    const rate = genre.arp.rate;
    const stepDur = rate === 8 ? 0.5 : 0.25;
    const stepsPerBar = rate === 8 ? 8 : 16;
    for (let bar = 0; bar < settings.bars; bar++) {
      const h = harmony[bar];
      const tones = [...h.voicing, ...h.voicing.map((p) => p + 12)].filter((p) => p <= 96);
      if (!tones.length) continue;
      for (let s = 0; s < stepsPerBar; s++) {
        if (Theory.chance(rand, (1 - settings.energy) * 0.35)) continue;
        let i;
        switch (genre.arp.pattern) {
          case 'down': i = (tones.length - 1) - (s % tones.length); break;
          case 'updown': {
            const cycle = tones.length * 2 - 2 || 1;
            const k = s % cycle;
            i = k < tones.length ? k : cycle - k;
            break;
          }
          case 'random': i = Theory.rint(rand, 0, tones.length - 1); break;
          default: i = s % tones.length; // 'up'
        }
        notes.push({
          start: bar * 4 + s * stepDur,
          dur: stepDur * 0.82,
          pitch: tones[i],
          vel: (s % 4 === 0 ? 84 : 70) + Math.round(rand() * 8),
        });
      }
    }
    return notes;
  }

  /* ------------------------------------------------------------ assembly */

  const GENERATORS = {
    drums: genDrums, bass: genBass, chords: genChords,
    melody: genMelody, pads: genPads, arp: genArp,
  };

  function programFor(genre, part, timbre, override) {
    if (override !== undefined && override !== null && override !== 'auto') return Number(override);
    const palette = genre.instruments[part] || [0];
    const idx = Math.min(palette.length - 1, Math.floor(timbre * palette.length));
    return palette[idx];
  }

  function generate(settings) {
    const genre = Genres.find((g) => g.id === settings.genreId) || Genres[0];
    const rand = Theory.makeRng(settings.seed);
    const harmony = buildHarmony(genre, settings, rand);
    const swingRatio = 0.5 + Theory.clamp(settings.swing, 0, 1) * 0.17;
    const totalBeats = settings.bars * 4;

    const tracks = [];
    for (const part of genre.priority) {
      if (!settings.parts[part]) continue;
      const notes = GENERATORS[part](genre, settings, harmony, rand);
      if (!notes.length) continue;
      applySwing(notes, genre.swingUnit, swingRatio);
      applyHumanize(notes, rand, settings.humanize, part === 'drums');
      for (const n of notes) {
        n.pitch = Theory.clamp(Math.round(n.pitch), 0, 127);
        n.vel = Theory.clamp(Math.round(n.vel), 1, 127);
        n.start = Math.max(0, n.start);
        n.dur = Math.max(0.05, Math.min(n.dur, totalBeats - n.start));
      }
      notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
      const program = part === 'drums' ? 0
        : programFor(genre, part, settings.timbre, settings.instruments && settings.instruments[part]);
      tracks.push({
        id: part,
        name: PART_LABELS[part] + (part === 'drums' ? '' : ' — ' + GM_NAMES[program]),
        role: part,
        channel: CHANNELS[part],
        program,
        notes,
      });
    }

    const keyName = Theory.NOTE_NAMES[settings.key];
    const scaleName = Theory.SCALES[settings.scale].name;
    return {
      name: `${genre.name} in ${keyName} ${scaleName}`,
      genreId: genre.id,
      tempo: settings.tempo,
      bars: settings.bars,
      key: settings.key,
      scale: settings.scale,
      seed: settings.seed,
      tracks,
    };
  }

  return { generate, DRUM_NOTES, CHANNELS, GM_NAMES, PART_LABELS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
