/* TuneForge — WebAudio preview player.
 * A small subtractive synth + drum machine so you can audition the tune
 * before dragging the MIDI into a DAW. Playback uses the same note data as
 * the MIDI export, so what you hear is what you get (timbre aside).
 */

const Synth = (() => {
  let ctx = null;
  let master = null;
  let bus = null;              // per-playback gain node (instant stop)
  let noiseBuf = null;
  let timer = null;
  let playing = false;
  let t0 = 0;                  // audio-clock time of playback start
  let spb = 0.5;               // seconds per beat
  let totalBeats = 0;
  let loop = true;
  let timbre = 0.5;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -14;
      master.knee.value = 10;
      master.ratio.value = 10;
      master.attack.value = 0.003;
      master.release.value = 0.2;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* ------------------------------------------------------------- voices */

  function env(g, when, peak, attack, holdEnd, release) {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.setValueAtTime(peak, Math.max(when + attack, holdEnd));
    g.gain.exponentialRampToValueAtTime(0.0001, holdEnd + release);
  }

  function noiseVoice(when, { hp = 0, bp = 0, dur = 0.1, gain = 0.3, pan = 0 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    let node = src;
    if (hp) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      node.connect(f); node = f;
    }
    if (bp) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 1.2;
      node.connect(f); node = f;
    }
    const g = ctx.createGain();
    env(g, when, gain, 0.002, when + dur * 0.3, dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    node.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
    src.start(when);
    src.stop(when + dur + 0.4);
  }

  function pitchDropVoice(when, { from, to, dur, gain, type = 'sine' }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(to, 20), when + dur * 0.45);
    const g = ctx.createGain();
    env(g, when, gain, 0.002, when + 0.01, dur);
    o.connect(g); g.connect(bus);
    o.start(when); o.stop(when + dur + 0.2);
  }

  function metalVoice(when, { freqs, dur, gain, bp }) {
    const g = ctx.createGain();
    env(g, when, gain, 0.002, when + 0.005, dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = bp; f.Q.value = 2;
    f.connect(g); g.connect(bus);
    for (const fr of freqs) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = fr;
      o.connect(f);
      o.start(when); o.stop(when + dur + 0.1);
    }
  }

  function drumVoice(pitch, vel, when) {
    const v = Math.pow(vel / 127, 1.4);
    switch (pitch) {
      case 35: case 36: // kick
        pitchDropVoice(when, { from: 150, to: 44, dur: 0.4, gain: 0.9 * v });
        noiseVoice(when, { hp: 6000, dur: 0.015, gain: 0.15 * v });
        break;
      case 38: case 40: // snare
        noiseVoice(when, { bp: 2000, hp: 700, dur: 0.18, gain: 0.5 * v });
        pitchDropVoice(when, { from: 210, to: 160, dur: 0.1, gain: 0.25 * v, type: 'triangle' });
        break;
      case 37: // rimshot
        metalVoice(when, { freqs: [1720], dur: 0.035, gain: 0.35 * v, bp: 1800 });
        break;
      case 39: // clap
        [0, 0.012, 0.026].forEach((off, i) =>
          noiseVoice(when + off, { bp: 1350, hp: 500, dur: i === 2 ? 0.16 : 0.03, gain: 0.4 * v }));
        break;
      case 42: noiseVoice(when, { hp: 8200, dur: 0.045, gain: 0.28 * v, pan: 0.2 }); break;   // closed hat
      case 44: noiseVoice(when, { hp: 7800, dur: 0.035, gain: 0.2 * v, pan: 0.2 }); break;    // pedal hat
      case 46: noiseVoice(when, { hp: 7000, dur: 0.38, gain: 0.24 * v, pan: 0.2 }); break;    // open hat
      case 45: pitchDropVoice(when, { from: 130, to: 85, dur: 0.32, gain: 0.55 * v }); break; // low tom
      case 47: pitchDropVoice(when, { from: 175, to: 115, dur: 0.28, gain: 0.5 * v }); break; // mid tom
      case 50: pitchDropVoice(when, { from: 230, to: 150, dur: 0.24, gain: 0.45 * v }); break;// high tom
      case 49: case 57: // crash
        noiseVoice(when, { hp: 4800, dur: 1.3, gain: 0.3 * v, pan: -0.15 });
        break;
      case 51: case 59: // ride
        noiseVoice(when, { hp: 6500, dur: 0.5, gain: 0.14 * v, pan: -0.2 });
        metalVoice(when, { freqs: [3100], dur: 0.2, gain: 0.05 * v, bp: 3200 });
        break;
      case 53: metalVoice(when, { freqs: [2900, 4300], dur: 0.4, gain: 0.12 * v, bp: 3400 }); break; // ride bell
      case 54: noiseVoice(when, { bp: 6200, hp: 3800, dur: 0.1, gain: 0.2 * v, pan: 0.3 }); break;   // tambourine
      case 56: metalVoice(when, { freqs: [562, 845], dur: 0.16, gain: 0.35 * v, bp: 900 }); break;   // cowbell
      case 63: case 62: case 64: pitchDropVoice(when, { from: 320, to: 240, dur: 0.14, gain: 0.4 * v, type: 'triangle' }); break; // conga
      case 70: case 69: noiseVoice(when, { bp: 5600, hp: 3000, dur: 0.06, gain: 0.16 * v, pan: -0.3 }); break; // shaker
      case 75: metalVoice(when, { freqs: [2540], dur: 0.06, gain: 0.3 * v, bp: 2600 }); break; // clave
      default: noiseVoice(when, { bp: 1500, dur: 0.08, gain: 0.2 * v });
    }
  }

  const ROLE_PATCH = {
    bass:   { gain: 0.30, pan: 0,     detune: 0,  attack: 0.006, release: 0.08, cutoff: (t) => 180 + t * 1100, sub: true },
    chords: { gain: 0.12, pan: -0.15, detune: 7,  attack: 0.008, release: 0.1,  cutoff: (t) => 800 + t * 2800 },
    pads:   { gain: 0.055, pan: -0.3, detune: 11, attack: 0.35,  release: 0.7,  cutoff: (t) => 420 + t * 1600 },
    melody: { gain: 0.20, pan: 0.12,  detune: 5,  attack: 0.005, release: 0.12, cutoff: (t) => 1400 + t * 4200 },
    arp:    { gain: 0.10, pan: 0.28,  detune: 4,  attack: 0.003, release: 0.06, cutoff: (t) => 1100 + t * 3600 },
    other:  { gain: 0.15, pan: 0,     detune: 5,  attack: 0.006, release: 0.1,  cutoff: (t) => 1000 + t * 3000 },
  };

  function toneVoice(role, note, when, durSec) {
    const patch = ROLE_PATCH[role] || ROLE_PATCH.other;
    const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
    const v = Math.pow(note.vel / 127, 1.3);
    const wave = role === 'bass' ? 'sawtooth'
      : timbre < 0.33 ? 'triangle' : timbre > 0.72 ? 'square' : 'sawtooth';

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(patch.cutoff(timbre) + note.vel * 6, 12000);
    filter.Q.value = 0.8;

    const g = ctx.createGain();
    const holdEnd = when + Math.max(durSec, 0.03);
    env(g, when, patch.gain * v, Math.min(patch.attack, durSec * 0.5 + 0.003), holdEnd, patch.release);

    filter.connect(g);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = patch.pan; g.connect(p); p.connect(bus); } else g.connect(bus);

    const stopAt = holdEnd + patch.release + 0.15;
    for (const cents of [patch.detune, -patch.detune]) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(filter);
      o.start(when); o.stop(stopAt);
      if (patch.detune === 0) break; // bass: single osc
    }
    if (patch.sub) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const sg = ctx.createGain();
      sg.gain.value = 0.7;
      o.connect(sg); sg.connect(filter);
      o.start(when); o.stop(stopAt);
    }
  }

  /* ---------------------------------------------------------- transport */

  let events = [];   // flattened, sorted [{beat, dur, role, note}]
  let evIdx = 0;
  let iterStart = 0; // audio-clock time of the current loop iteration

  function scheduler() {
    const horizon = ctx.currentTime + 0.35;
    while (true) {
      if (evIdx >= events.length) {
        if (loop) {
          iterStart += totalBeats * spb;
          evIdx = 0;
          if (iterStart > horizon) break;
        } else {
          if (ctx.currentTime > iterStart + totalBeats * spb + 1) stop();
          break;
        }
      }
      const ev = events[evIdx];
      const when = iterStart + ev.note.start * spb;
      if (when > horizon) break;
      const durSec = ev.note.dur * spb;
      if (ev.role === 'drums') drumVoice(ev.note.pitch, ev.note.vel, Math.max(when, ctx.currentTime));
      else toneVoice(ev.role, ev.note, Math.max(when, ctx.currentTime), durSec);
      evIdx++;
    }
  }

  function play(song, opts = {}) {
    ensureCtx();
    stop();
    loop = opts.loop !== false;
    timbre = opts.timbre !== undefined ? opts.timbre : 0.5;
    spb = 60 / song.tempo;
    totalBeats = song.bars * 4;

    events = [];
    for (const track of song.tracks) {
      for (const note of track.notes) events.push({ role: track.role, note });
    }
    events.sort((a, b) => a.note.start - b.note.start);

    bus = ctx.createGain();
    bus.gain.value = 0.9;
    bus.connect(master);

    t0 = ctx.currentTime + 0.08;
    iterStart = t0;
    evIdx = 0;
    playing = true;
    scheduler();
    timer = setInterval(scheduler, 60);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (bus) {
      const b = bus;
      const now = ctx ? ctx.currentTime : 0;
      try {
        b.gain.setValueAtTime(b.gain.value, now);
        b.gain.linearRampToValueAtTime(0.0001, now + 0.06);
      } catch (e) { /* context may be closed */ }
      setTimeout(() => { try { b.disconnect(); } catch (e) {} }, 150);
      bus = null;
    }
    playing = false;
  }

  function isPlaying() { return playing; }

  /** Current position in beats (for the playhead). */
  function positionBeats() {
    if (!playing || !ctx) return 0;
    const elapsed = (ctx.currentTime - t0) / spb;
    if (elapsed < 0) return 0;
    return loop ? elapsed % totalBeats : Math.min(elapsed, totalBeats);
  }

  return { play, stop, isPlaying, positionBeats };
})();
