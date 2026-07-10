/* TuneForge — genre corpus (soundtrack edition).
 *
 * Everything the rule-based engine knows about each style lives here:
 * tempo ranges, scales, chord progressions (scale degrees, 0-based),
 * drum grids, bass/chord/melody styles and GM instrument palettes.
 *
 * Drum grids are 16-step strings (one bar of 16ths):
 *   'X' accent   'x' normal   '-' ghost   '?' maybe (probability)   '.' rest
 *
 * Instrument palettes are General MIDI programs (0-based), ordered
 * dark/soft -> bright/hard; the Timbre dial indexes into them.
 *
 * The set is tuned for scoring film & podcasts: mood/function genres
 * (tension, drones, emotional, noir, action, uplifting) plus a
 * handful of electronic beds (synthwave, techno, trap, dnb).
 */

const Genres = [

  /* ============================ SCORING / MOOD ============================ */

  {
    id: 'cinematic', name: 'Cinematic', icon: '🎬',
    desc: 'Orchestral swells, taiko pulses, epic heroic themes.',
    tempo: [70, 112, 90], swing: 0.0, swingUnit: 8, humanize: 0.5,
    scales: ['minor', 'harmonicMinor', 'lydian', 'dorian'],
    priority: ['pads', 'chords', 'melody', 'bass', 'drums', 'arp'],
    progressions: [[0, 5, 2, 6], [0, 3, 5, 6], [0, 4, 5, 3], [0, 5, 3, 6], [0, 6, 5, 4]],
    chordSize: 3, barsPerChord: 2, chordStyle: 'pad', chordRange: [48, 74],
    bassStyle: 'drone', bassOctave: 2,
    melody: { octave: 5, style: 'theme' },
    arp: { rate: 8, pattern: 'up' },
    energy: 0.5, complexity: 0.5,
    instruments: {
      bass: [43, 48, 42], chords: [48, 49, 61], melody: [42, 60, 40],
      pads: [49, 52, 91], arp: [46, 98, 108],
    },
    drums: {
      variants: [
        { kick: 'X.......X.......', ltom: '....x.......x...', mtom: '..........?...?.' },
        { kick: 'X.......X...X...', ltom: 'x...x...x...x...', mtom: '..x...?...x...?.' },
        { kick: 'X.......X.......', ltom: 'x...x...x...x...', mtom: '..x...x...x...x.', crash: 'X...............' },
      ],
      fill: { ltom: '........x.x.x.x.', mtom: '.........x.x.x.x', snare: '..............xX' },
      crashOnOne: true,
    },
  },

  {
    id: 'ambient', name: 'Ambient', icon: '🌫️',
    desc: 'Slow evolving pads, sparse melody, weightless calm bed.',
    tempo: [58, 84, 70], swing: 0.0, swingUnit: 16, humanize: 0.6,
    scales: ['lydian', 'major', 'minor', 'dorian'],
    priority: ['pads', 'melody', 'chords', 'arp', 'bass', 'drums'],
    progressions: [[0, 3], [0, 4], [0, 5, 3, 4], [0, 1], [0, 4, 5, 3]],
    chordSize: 4, barsPerChord: 2, chordStyle: 'pad', chordRange: [50, 76],
    bassStyle: 'drone', bassOctave: 2,
    melody: { octave: 5, style: 'sparse' },
    arp: { rate: 8, pattern: 'updown' },
    energy: 0.2, complexity: 0.35,
    instruments: {
      bass: [89, 92, 38], chords: [89, 91, 94], melody: [73, 54, 98],
      pads: [88, 91, 94], arp: [98, 88, 108],
    },
    drums: {
      variants: [
        { shaker: '?...?...?...?...', phh: '........?.......' },
        { shaker: '?...?...?...?...', bell: '........?.......' },
      ],
      fill: {},
      crashOnOne: false,
    },
  },

  {
    id: 'tension', name: 'Tension / Suspense', icon: '🕰️',
    desc: 'Ticking-clock percussion, a heartbeat pedal, dread that never resolves.',
    tempo: [58, 88, 72], swing: 0.0, swingUnit: 16, humanize: 0.4,
    scales: ['minor', 'phrygian', 'harmonicMinor'],
    priority: ['pads', 'bass', 'melody', 'arp', 'drums', 'chords'],
    // Oscillating, unresolved motion — phrygian bII (deg 1) is the unease.
    progressions: [[0, 0, 1, 0], [0, 5, 0, 1], [0, 6, 0, 5], [0, 1, 0, 6], [0, 0, 0, 0], [0, 0, 5, 1]],
    chordSize: 3, barsPerChord: 2, chordStyle: 'pad', chordRange: [48, 72],
    bassStyle: 'pulse', bassOctave: 1,
    melody: { octave: 5, style: 'sparse' },
    arp: { rate: 8, pattern: 'up' },
    energy: 0.3, complexity: 0.4,
    instruments: {
      bass: [43, 42, 38], chords: [50, 92, 48], melody: [40, 59, 8],
      pads: [94, 92, 95], arp: [8, 10, 98],
    },
    drums: {
      variants: [
        { rim: 'x...x...x...x...', shaker: '?.......?.......', kick: '..........?.....' },
        { clave: 'x...x...x...x...', chh: '..?...?...?...?.', kick: 'X.........X.....' },
        { rim: 'x.x.x.x.x.x.x.x.', tamb: '.......?.......?', kick: '..........?.....' },
      ],
      fill: { ltom: '............?.?X', kick: '..............X.' },
      crashOnOne: false,
    },
  },

  {
    id: 'drones', name: 'Drones', icon: '🌀',
    desc: 'Slow sustained tones, layered harmonic beds — vast, weightless atmosphere.',
    tempo: [40, 58, 48], swing: 0.0, swingUnit: 16, humanize: 0.65,
    scales: ['lydian', 'minor', 'dorian', 'mixolydian', 'phrygian'],
    priority: ['pads', 'bass', 'chords', 'arp', 'melody', 'drums'],
    // Glacial harmonic stasis — long pedal points with the occasional modal drift.
    progressions: [[0, 0, 0, 0], [0, 0], [0, 4], [0, 5], [0, 3, 0], [0, 6, 0, 0], [0, 4, 0, 0], [0, 5, 0, 0]],
    chordSize: 4, barsPerChord: 4, chordStyle: 'drone', chordRange: [44, 72],
    bassStyle: 'drone', bassOctave: 1,
    melody: { octave: 6, style: 'sparse' },
    arp: { rate: 8, pattern: 'random' },
    energy: 0.15, complexity: 0.28,
    instruments: {
      bass: [89, 43, 38], chords: [89, 91, 52], melody: [73, 92, 54],
      pads: [89, 94, 91], arp: [95, 98, 88],
    },
    drums: {
      variants: [
        { shaker: '?.......?.......', phh: '........?.......' },
        { bell: '?.......?.......', shaker: '?.......?.......' },
        { phh: '....?.......?...', shaker: '?.......?.......' },
      ],
      fill: {},
      crashOnOne: false,
    },
  },

  {
    id: 'emotional', name: 'Emotional / Sad', icon: '🕊️',
    desc: 'Solo piano & strings, broken chords, intimate character-moment cue.',
    tempo: [58, 84, 68], swing: 0.0, swingUnit: 8, humanize: 0.55,
    scales: ['minor', 'major', 'dorian'],
    priority: ['chords', 'melody', 'pads', 'bass', 'arp', 'drums'],
    progressions: [[0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4], [0, 4, 5, 5], [1, 4, 0, 5], [0, 5, 1, 4]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'broken', chordRange: [50, 76],
    bassStyle: 'arco', bassOctave: 2,
    melody: { octave: 5, style: 'theme' },
    arp: { rate: 8, pattern: 'up' },
    energy: 0.3, complexity: 0.4,
    instruments: {
      bass: [42, 32, 43], chords: [0, 4, 1], melody: [42, 40, 68],
      pads: [48, 89, 52], arp: [46, 8, 10],
    },
    drums: {
      variants: [
        { ltom: 'X...............', shaker: '..?...?...?...?.' },
        { kick: 'X.......X.......', phh: '....?.......?...' },
      ],
      fill: {},
      crashOnOne: false,
    },
  },

  {
    id: 'noir', name: 'Mystery / Noir', icon: '🕵️',
    desc: 'Walking bass, brushed drums, smoky minor comping for detective beats.',
    tempo: [88, 124, 104], swing: 0.6, swingUnit: 8, humanize: 0.6,
    scales: ['minor', 'dorian', 'harmonicMinor'],
    priority: ['bass', 'drums', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[1, 4, 0, 0], [0, 5, 1, 4], [2, 5, 1, 0], [0, 3, 5, 4], [1, 4, 0, 5]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'comp', chordRange: [50, 74],
    bassStyle: 'walking', bassOctave: 2,
    melody: { octave: 5, style: 'noodle' },
    arp: { rate: 8, pattern: 'updown' },
    energy: 0.4, complexity: 0.55,
    instruments: {
      bass: [32, 35, 33], chords: [4, 26, 11], melody: [59, 66, 71],
      pads: [48, 89, 50], arp: [11, 8, 98],
    },
    drums: {
      variants: [
        { ride: 'x..x.xx..x..x.x.', phh: '....x.......x...', rim: '......?.....?...', kick: '-.......-.......' },
        { ride: 'x..x.xx..x..x.xx', phh: '....x.......x...', shaker: '?.?.?.?.?.?.?.?.', kick: '-.....?.-.......' },
      ],
      fill: { rim: '..........x.-x-X', ltom: '............?.?.' },
      crashOnOne: false,
    },
  },

  {
    id: 'action', name: 'Action / Chase', icon: '🏃',
    desc: 'Propulsive ostinato strings, taiko drive, insistent heroic push.',
    tempo: [124, 164, 142], swing: 0.0, swingUnit: 8, humanize: 0.25,
    scales: ['minor', 'phrygian', 'harmonicMinor', 'dorian'],
    priority: ['bass', 'drums', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[0, 6, 5, 0], [0, 5, 6, 5], [0, 0, 6, 5], [0, 3, 6, 5], [0, 6, 3, 4]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'stabs', chordRange: [50, 74],
    bassStyle: 'ostinato', bassOctave: 1,
    melody: { octave: 5, style: 'motif' },
    arp: { rate: 16, pattern: 'up' },
    energy: 0.85, complexity: 0.6,
    instruments: {
      bass: [43, 58, 38], chords: [48, 61, 62], melody: [60, 56, 48],
      pads: [49, 92, 55], arp: [44, 48, 98],
    },
    drums: {
      variants: [
        { kick: 'X.X.X.X.X.X.X.X.', ltom: 'X...X...X...X...', mtom: '..x...x...x...x.', snare: '....X.......X...', crash: 'X...............' },
        { kick: 'X..X..X.X..X..X.', ltom: 'X..X..X.X..X..X.', snare: '....X.......X...', mtom: '......?.......?.' },
        { kick: 'XXXXXXXXXXXXXXXX', snare: '....X.......X...', crash: 'X.......X.......', mtom: '..x...x...x...x.' },
      ],
      fill: { ltom: 'x.x.x.x.x.x.x.x.', mtom: '..x...x.x.x.xxxX', snare: '............xxxX' },
      crashOnOne: true,
    },
  },

  {
    id: 'uplifting', name: 'Uplifting / Corporate', icon: '☀️',
    desc: 'Bright major beds, gentle claps, plucky ostinato — sits under narration.',
    tempo: [96, 124, 110], swing: 0.08, swingUnit: 16, humanize: 0.25,
    scales: ['major', 'mixolydian', 'lydian'],
    priority: ['drums', 'chords', 'bass', 'arp', 'melody', 'pads'],
    progressions: [[0, 4, 5, 3], [0, 3, 0, 4], [3, 4, 0, 0], [0, 4, 3, 4], [0, 3, 4, 4]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'pluck8', chordRange: [52, 74],
    bassStyle: 'halfNote', bassOctave: 2,
    melody: { octave: 5, style: 'hook' },
    arp: { rate: 16, pattern: 'up' },
    energy: 0.55, complexity: 0.4,
    instruments: {
      bass: [33, 34, 38], chords: [4, 0, 1], melody: [12, 9, 27],
      pads: [89, 48, 91], arp: [10, 8, 98],
    },
    drums: {
      variants: [
        { kick: 'X.......X.......', clap: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', shaker: '..x...x...x...x.' },
        { kick: 'X...X...X...X...', clap: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', tamb: '..?...?...?...?.' },
        { kick: 'X.....x.X...X...', clap: '....X.......X...', chh: 'xxxxxxxxxxxxxxxx', shaker: '?.?.?.?.?.?.?.?.' },
      ],
      fill: { clap: '..........x.x.xX', tamb: '............xxxx' },
      crashOnOne: true,
    },
  },

  /* ============================== ELECTRONIC ============================== */

  {
    id: 'synthwave', name: 'Synthwave', icon: '🌆',
    desc: 'Retro-80s pulse bass, gated snare, neon arps.',
    tempo: [100, 118, 108], swing: 0.05, swingUnit: 16, humanize: 0.15,
    scales: ['minor', 'dorian'],
    priority: ['drums', 'bass', 'arp', 'pads', 'melody', 'chords'],
    progressions: [[0, 5, 2, 6], [0, 5, 3, 4], [5, 3, 0, 4], [0, 2, 5, 6], [0, 3, 4, 5]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'pluck8', chordRange: [55, 76],
    bassStyle: 'synth8', bassOctave: 2,
    melody: { octave: 5, style: 'theme' },
    arp: { rate: 16, pattern: 'up' },
    energy: 0.6, complexity: 0.45,
    instruments: {
      bass: [39, 38, 87], chords: [90, 50, 62], melody: [81, 80, 84],
      pads: [89, 50, 94], arp: [98, 90, 81],
    },
    drums: {
      variants: [
        { kick: 'X...X...X...X...', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.' },
        { kick: 'X.....x.X...X...', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', mtom: '..............?.' },
        { kick: 'X...X...X...X...', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', tamb: '..?...?...?...?.' },
      ],
      fill: { mtom: '........x.x.....', ltom: '............x.x.', snare: '..............xX' },
      crashOnOne: true,
    },
  },

  {
    id: 'techno', name: 'Techno', icon: '🤖',
    desc: 'Driving kick, hypnotic percussion, static dark harmony.',
    tempo: [126, 140, 132], swing: 0.08, swingUnit: 16, humanize: 0.15,
    scales: ['minor', 'phrygian'],
    priority: ['drums', 'bass', 'arp', 'chords', 'pads', 'melody'],
    progressions: [[0, 0, 0, 0], [0, 3, 0, 4], [0, 0, 6, 5], [0, 5, 0, 6], [0, 1, 0, 0]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'stabs', chordRange: [50, 70],
    bassStyle: 'rolling16', bassOctave: 2,
    melody: { octave: 5, style: 'sparse' },
    arp: { rate: 16, pattern: 'up' },
    energy: 0.75, complexity: 0.45,
    instruments: {
      bass: [38, 39, 87], chords: [90, 62, 81], melody: [81, 87, 80],
      pads: [95, 89, 92], arp: [90, 98, 81],
    },
    drums: {
      variants: [
        { kick: 'X...X...X...X...', chh: 'X-x-x-x-X-x-x-x-', ohh: '..x...x...x...x.', rim: '...x..x....x..x.' },
        { kick: 'X...X...X...X...', clap: '....X.......X...', chh: 'x-x-x-x-x-x-x-x-', ohh: '..x...x...x...x.', tamb: '?.x.?.x.?.x.?.x.' },
        { kick: 'X...X...X...X...', chh: 'xxxxxxxxxxxxxxxx', ohh: '..x...x...x...x.', rim: '..x..x..x..x..x.', clap: '....X.......X...' },
      ],
      fill: { rim: '........x.x.xxxX', ohh: '..............X.' },
      crashOnOne: false,
    },
  },

  {
    id: 'trap', name: 'Trap / Hip-Hop', icon: '💎',
    desc: 'Half-time snares, rolling hats, deep 808 bass.',
    tempo: [130, 160, 142], swing: 0.05, swingUnit: 16, humanize: 0.2,
    scales: ['minor', 'harmonicMinor', 'phrygian'],
    priority: ['drums', 'bass', 'melody', 'chords', 'pads', 'arp'],
    progressions: [[0, 5, 4, 4], [0, 3, 4, 0], [0, 1, 0, 6], [0, 5, 3, 4], [0, 3, 5, 4]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'pad', chordRange: [55, 78],
    bassStyle: 'sub808', bassOctave: 1,
    melody: { octave: 6, style: 'sparse' },
    arp: { rate: 8, pattern: 'down' },
    energy: 0.55, complexity: 0.5,
    hatRoll: true,
    instruments: {
      bass: [38, 39, 87], chords: [4, 89, 98], melody: [80, 81, 98],
      pads: [91, 89, 54], arp: [98, 108, 80],
    },
    drums: {
      variants: [
        { kick: 'X.....x...X.....', snare: '........X.......', chh: 'x.x.x.x.x.x.x.x.' },
        { kick: 'X....x....X..x..', snare: '........X.......', chh: 'xxx.x.xxx.x.xx.x', ohh: '......x.........' },
        { kick: 'X....x..X...x...', snare: '........X.......', chh: 'xx.xx.xxxx.xx.xx', ohh: '..........x.....' },
      ],
      fill: { snare: '............x.xX', chh: '............xxxx' },
      crashOnOne: false,
    },
  },

  {
    id: 'dnb', name: 'Drum & Bass', icon: '⚡',
    desc: 'Fast breakbeats, rolling sub bass, airy pads.',
    tempo: [168, 178, 174], swing: 0.1, swingUnit: 16, humanize: 0.3,
    scales: ['minor', 'dorian'],
    priority: ['drums', 'bass', 'pads', 'melody', 'chords', 'arp'],
    progressions: [[0, 5, 3, 4], [0, 6, 5, 4], [0, 3, 4, 5], [0, 5, 4, 3], [0, 6, 3, 4]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'pad', chordRange: [57, 80],
    bassStyle: 'rolling16', bassOctave: 1,
    melody: { octave: 6, style: 'sparse' },
    arp: { rate: 16, pattern: 'random' },
    energy: 0.8, complexity: 0.6,
    instruments: {
      bass: [38, 39, 87], chords: [89, 90, 4], melody: [81, 80, 87],
      pads: [94, 89, 92], arp: [98, 90, 81],
    },
    drums: {
      variants: [
        { kick: 'X.........x.....', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', shaker: 'x?x?x?x?x?x?x?x?' },
        { kick: 'X.......x.x.....', snare: '....X..-....X..-', chh: 'x.x.x.x.x.x.x.x.', ohh: '..............x.' },
        { kick: 'X.......x.x.....', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', ohh: '..............x.' },
      ],
      fill: { snare: '........x.x.-xxX' },
      crashOnOne: true,
    },
  },
];

if (typeof module !== 'undefined' && module.exports) module.exports = Genres;
