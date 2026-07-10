/* TuneForge — genre corpus.
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
 */

const Genres = [
  {
    id: 'house', name: 'House', icon: '🏠',
    desc: 'Four-on-the-floor, offbeat hats, warm stab chords.',
    tempo: [118, 128, 124], swing: 0.18, swingUnit: 16, humanize: 0.25,
    scales: ['minor', 'dorian'],
    priority: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 3], [0, 5, 0, 4]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'stabs', chordRange: [55, 76],
    bassStyle: 'offbeat8', bassOctave: 2,
    melody: { octave: 5, style: 'hook' },
    arp: { rate: 16, pattern: 'updown' },
    energy: 0.65, complexity: 0.5,
    instruments: {
      bass: [38, 39, 33], chords: [89, 4, 5, 90], melody: [81, 80, 90],
      pads: [89, 91, 94], arp: [90, 81, 98],
    },
    drums: {
      variants: [
        { kick: 'X...X...X...X...', clap: '....X.......X...', ohh: '..x...x...x...x.', chh: 'x...x...x...x...' },
        { kick: 'X...X...X...X...', clap: '....X.......X...', ohh: '..x...x...x...x.', chh: 'x.?xx.?xx.?xx.?x', shaker: '?x?x?x?x?x?x?x?x' },
      ],
      fill: { clap: '..........x.x.xX', snare: '............x.x.' },
      crashOnOne: true,
    },
  },

  {
    id: 'techno', name: 'Techno', icon: '🤖',
    desc: 'Driving kick, hypnotic percussion, static dark harmony.',
    tempo: [126, 140, 132], swing: 0.08, swingUnit: 16, humanize: 0.15,
    scales: ['minor', 'phrygian'],
    priority: ['drums', 'bass', 'arp', 'chords', 'pads', 'melody'],
    progressions: [[0, 0, 0, 0], [0, 3, 0, 4], [0, 0, 6, 5]],
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
    progressions: [[0, 5, 4, 4], [0, 3, 4, 0], [0, 1, 0, 6], [0, 5, 3, 4]],
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
      ],
      fill: { snare: '............x.xX', chh: '............xxxx' },
      crashOnOne: false,
    },
  },

  {
    id: 'lofi', name: 'Lo-fi Beats', icon: '📼',
    desc: 'Dusty boom-bap, jazzy 7th chords, lazy swing.',
    tempo: [70, 92, 82], swing: 0.45, swingUnit: 16, humanize: 0.6,
    scales: ['dorian', 'major', 'minor'],
    priority: ['drums', 'chords', 'bass', 'melody', 'pads', 'arp'],
    progressions: [[1, 4, 0, 0], [3, 2, 1, 0], [0, 5, 3, 4], [1, 4, 0, 5]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'comp', chordRange: [52, 74],
    bassStyle: 'boombap', bassOctave: 2,
    melody: { octave: 5, style: 'noodle' },
    arp: { rate: 8, pattern: 'updown' },
    energy: 0.4, complexity: 0.55,
    instruments: {
      bass: [32, 33, 35], chords: [4, 11, 26], melody: [11, 4, 73],
      pads: [89, 52, 49], arp: [108, 11, 98],
    },
    drums: {
      variants: [
        { kick: 'X......x..x.....', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', shaker: '..?...?...?...?.' },
        { kick: 'X.....x...x..x..', snare: '....X.......X..-', chh: 'x.x.x-x.x.x.x-x.' },
      ],
      fill: { snare: '............-.xX' },
      crashOnOne: false,
    },
  },

  {
    id: 'dnb', name: 'Drum & Bass', icon: '⚡',
    desc: 'Fast breakbeats, rolling sub bass, airy pads.',
    tempo: [168, 178, 174], swing: 0.1, swingUnit: 16, humanize: 0.3,
    scales: ['minor', 'dorian'],
    priority: ['drums', 'bass', 'pads', 'melody', 'chords', 'arp'],
    progressions: [[0, 5, 3, 4], [0, 6, 5, 4], [0, 3, 4, 5]],
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
      ],
      fill: { snare: '........x.x.-xxX' },
      crashOnOne: true,
    },
  },

  {
    id: 'jazz', name: 'Jazz', icon: '🎷',
    desc: 'Swung ride, walking bass, ii-V-I comping.',
    tempo: [100, 160, 126], swing: 0.65, swingUnit: 8, humanize: 0.7,
    scales: ['major', 'dorian'],
    priority: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[1, 4, 0, 0], [1, 4, 0, 5], [0, 5, 1, 4], [2, 5, 1, 4]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'comp', chordRange: [52, 76],
    bassStyle: 'walking', bassOctave: 2,
    melody: { octave: 5, style: 'noodle' },
    arp: { rate: 8, pattern: 'updown' },
    energy: 0.5, complexity: 0.7,
    instruments: {
      bass: [32, 32, 35], chords: [0, 4, 11], melody: [66, 56, 73],
      pads: [48, 49, 52], arp: [11, 0, 98],
    },
    drums: {
      variants: [
        { ride: 'x...x.x.x...x.x.', phh: '....x.......x...', kick: '-.......-.......', rim: '......?.....?...' },
        { ride: 'x...x.x.x...x.x.', phh: '....x.......x...', snare: '..?....-..?..-..', kick: '-.....?.-.......' },
      ],
      fill: { snare: '..........x.-x-X' },
      crashOnOne: false,
    },
  },

  {
    id: 'funk', name: 'Funk', icon: '🕺',
    desc: 'Syncopated 16ths, ghost-note snare, slap bass.',
    tempo: [96, 116, 106], swing: 0.25, swingUnit: 16, humanize: 0.5,
    scales: ['dorian', 'mixolydian', 'minorPent'],
    priority: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[0, 0, 0, 3], [0, 0, 3, 4], [0, 3, 0, 4]],
    chordSize: 4, barsPerChord: 1, chordStyle: 'funkstab', chordRange: [55, 76],
    bassStyle: 'funk16', bassOctave: 2,
    melody: { octave: 5, style: 'groove' },
    arp: { rate: 16, pattern: 'random' },
    energy: 0.7, complexity: 0.7,
    instruments: {
      bass: [36, 33, 34], chords: [7, 17, 4], melody: [61, 56, 80],
      pads: [16, 50, 61], arp: [7, 4, 90],
    },
    drums: {
      variants: [
        { kick: 'X..x..x...x.....', snare: '....X..-.-..X..-', chh: 'x-xxx-xxx-xxx-xx', ohh: '..............x.' },
        { kick: 'X..x..x...x..x..', snare: '....X-.-.-..X.-.', chh: 'x-x-x-xxx-x-x-xx' },
      ],
      fill: { snare: '........x-x-xxxX' },
      crashOnOne: true,
    },
  },

  {
    id: 'synthwave', name: 'Synthwave', icon: '🌆',
    desc: 'Retro-80s pulse bass, gated snare, neon arps.',
    tempo: [100, 118, 108], swing: 0.05, swingUnit: 16, humanize: 0.15,
    scales: ['minor', 'dorian'],
    priority: ['drums', 'bass', 'arp', 'pads', 'melody', 'chords'],
    progressions: [[0, 5, 2, 6], [0, 5, 3, 4], [5, 3, 0, 4], [0, 2, 5, 6]],
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
      ],
      fill: { mtom: '........x.x.....', ltom: '............x.x.', snare: '..............xX' },
      crashOnOne: true,
    },
  },

  {
    id: 'ambient', name: 'Ambient', icon: '🌫️',
    desc: 'Slow evolving pads, sparse melody, weightless.',
    tempo: [60, 84, 72], swing: 0.0, swingUnit: 16, humanize: 0.6,
    scales: ['lydian', 'major', 'minor'],
    priority: ['pads', 'melody', 'chords', 'arp', 'bass', 'drums'],
    progressions: [[0, 3], [0, 4], [0, 5, 3, 4], [0, 1]],
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
      ],
      fill: {},
      crashOnOne: false,
    },
  },

  {
    id: 'poprock', name: 'Pop / Rock', icon: '🎸',
    desc: 'Backbeat drums, anthem chords, singable hooks.',
    tempo: [104, 132, 118], swing: 0.05, swingUnit: 8, humanize: 0.4,
    scales: ['major', 'mixolydian'],
    priority: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [0, 3, 4, 4]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'anthem', chordRange: [52, 72],
    bassStyle: 'pick8', bassOctave: 2,
    melody: { octave: 5, style: 'hook' },
    arp: { rate: 8, pattern: 'up' },
    energy: 0.65, complexity: 0.4,
    instruments: {
      bass: [33, 34, 36], chords: [0, 25, 27], melody: [27, 80, 81],
      pads: [48, 50, 89], arp: [0, 25, 98],
    },
    drums: {
      variants: [
        { kick: 'X.......x.......', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.' },
        { kick: 'X.....x.x.....x.', snare: '....X.......X...', chh: 'x.x.x.x.x.x.x.x.', ohh: '..............x.' },
      ],
      fill: { snare: '........x.x.xxxX', htom: '..........x.....', mtom: '............x...' },
      crashOnOne: true,
    },
  },

  {
    id: 'reggaeton', name: 'Reggaetón', icon: '🔥',
    desc: 'Dembow groove, punchy bass, tropical plucks.',
    tempo: [88, 100, 94], swing: 0.12, swingUnit: 16, humanize: 0.3,
    scales: ['minor', 'harmonicMinor'],
    priority: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'],
    progressions: [[0, 5, 3, 4], [0, 3, 6, 4], [0, 6, 5, 4]],
    chordSize: 3, barsPerChord: 1, chordStyle: 'pluck8', chordRange: [55, 76],
    bassStyle: 'dembow', bassOctave: 2,
    melody: { octave: 5, style: 'hook' },
    arp: { rate: 16, pattern: 'down' },
    energy: 0.65, complexity: 0.45,
    instruments: {
      bass: [38, 33, 39], chords: [4, 25, 114], melody: [80, 114, 73],
      pads: [89, 50, 91], arp: [114, 98, 80],
    },
    drums: {
      variants: [
        { kick: 'X...X...X...X...', snare: '...x..x....x..x.', chh: 'x.x.x.x.x.x.x.x.', shaker: '..?...?...?...?.' },
        { kick: 'X...X...X...X...', snare: '...x..x....x..x.', chh: 'x.xxx.x.x.xxx.x.', conga: '......x.......x.' },
      ],
      fill: { snare: '...x..x....xx.xX' },
      crashOnOne: false,
    },
  },

  {
    id: 'cinematic', name: 'Cinematic', icon: '🎬',
    desc: 'Orchestral swells, taiko pulses, epic themes.',
    tempo: [70, 112, 90], swing: 0.0, swingUnit: 8, humanize: 0.5,
    scales: ['minor', 'harmonicMinor', 'lydian'],
    priority: ['pads', 'chords', 'melody', 'bass', 'drums', 'arp'],
    progressions: [[0, 5, 2, 6], [0, 3, 5, 6], [0, 4, 5, 3], [0, 5, 3, 6]],
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
      ],
      fill: { ltom: '........x.x.x.x.', mtom: '.........x.x.x.x' },
      crashOnOne: true,
    },
  },
];

if (typeof module !== 'undefined' && module.exports) module.exports = Genres;
