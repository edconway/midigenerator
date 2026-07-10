/* TuneForge — music theory helpers + seeded randomness.
 * Plain script (no modules) so the app runs from file:// with no build step.
 * Node-compatible export at the bottom for the test harness. */

const Theory = (() => {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Interval sets, semitones from the root.
  const SCALES = {
    major:         { name: 'Major',          steps: [0, 2, 4, 5, 7, 9, 11] },
    minor:         { name: 'Minor',          steps: [0, 2, 3, 5, 7, 8, 10] },
    dorian:        { name: 'Dorian',         steps: [0, 2, 3, 5, 7, 9, 10] },
    phrygian:      { name: 'Phrygian',       steps: [0, 1, 3, 5, 7, 8, 10] },
    lydian:        { name: 'Lydian',         steps: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian:    { name: 'Mixolydian',     steps: [0, 2, 4, 5, 7, 9, 10] },
    harmonicMinor: { name: 'Harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11] },
    majorPent:     { name: 'Major pent.',    steps: [0, 2, 4, 7, 9] },
    minorPent:     { name: 'Minor pent.',    steps: [0, 3, 5, 7, 10] },
    blues:         { name: 'Blues',          steps: [0, 3, 5, 6, 7, 10] },
  };

  // Mulberry32 — small, fast, good-enough seeded PRNG so a seed always
  // reproduces the same tune.
  function makeRng(seed) {
    let t = (seed >>> 0) || 1;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
  const rint = (rand, a, b) => a + Math.floor(rand() * (b - a + 1)); // inclusive
  const chance = (rand, p) => rand() < p;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** MIDI note for a scale degree. degree may be negative or exceed the
   *  scale length — it wraps into neighbouring octaves. */
  function degreeToMidi(rootPc, scaleId, degree, octave) {
    const steps = SCALES[scaleId].steps;
    const n = steps.length;
    const oct = octave + Math.floor(degree / n);
    const idx = ((degree % n) + n) % n;
    return clamp(rootPc + steps[idx] + 12 * (oct + 1), 0, 127);
  }

  /** Diatonic chord on a scale degree, built by stacking thirds
   *  (every other scale step). size 3 = triad, 4 = seventh, 5 = ninth.
   *  Returns scale-degree numbers, not midi. */
  function chordDegrees(degree, size) {
    const out = [];
    for (let i = 0; i < size; i++) out.push(degree + i * 2);
    return out;
  }

  /** Voice a chord near the previous voicing (small movements sound musical).
   *  prev may be null. Returns sorted midi numbers within [lo, hi]. */
  function voiceChord(rootPc, scaleId, degrees, prev, lo, hi) {
    const base = degrees.map((d) => degreeToMidi(rootPc, scaleId, d, 3));
    const center = prev && prev.length
      ? prev.reduce((a, b) => a + b, 0) / prev.length
      : (lo + hi) / 2;
    const voiced = base.map((note) => {
      let best = note, bestDist = Infinity;
      for (let shift = -24; shift <= 24; shift += 12) {
        const cand = note + shift;
        if (cand < lo || cand > hi) continue;
        const d = Math.abs(cand - center);
        if (d < bestDist) { bestDist = d; best = cand; }
      }
      return clamp(best, lo, hi);
    });
    // De-duplicate pitches that collapsed onto each other, keep sorted.
    return [...new Set(voiced)].sort((a, b) => a - b);
  }

  function noteName(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  return {
    NOTE_NAMES, SCALES,
    makeRng, pick, rint, chance, clamp,
    degreeToMidi, chordDegrees, voiceChord, noteName,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Theory;
