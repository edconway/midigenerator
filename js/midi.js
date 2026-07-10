/* TuneForge — Standard MIDI File (Type 1) writer.
 * Produces bytes any DAW (Ableton, Logic, FL, Cubase…) imports directly:
 * one conductor track (tempo/time-sig) plus one track per part, drums on
 * channel 10 (0-indexed 9), program changes so GM synths pick sane sounds.
 */

const Midi = (() => {
  const PPQ = 480;

  function vlq(value) { // variable-length quantity
    const bytes = [value & 0x7f];
    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80);
      value >>= 7;
    }
    return bytes;
  }

  function str(s) {
    return [...s].map((c) => c.charCodeAt(0) & 0x7f);
  }

  function u32(v) { return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]; }
  function u16(v) { return [(v >>> 8) & 0xff, v & 0xff]; }

  function chunk(tag, data) {
    return [...str(tag), ...u32(data.length), ...data];
  }

  function meta(delta, type, data) {
    return [...vlq(delta), 0xff, type, ...vlq(data.length), ...data];
  }

  function trackBytes(events) {
    // events: [{tick, data:[...status+payload]}] — sort, then delta-encode.
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const out = [];
    let last = 0;
    for (const ev of events) {
      out.push(...vlq(Math.max(0, ev.tick - last)), ...ev.data);
      last = ev.tick;
    }
    out.push(...vlq(0), 0xff, 0x2f, 0x00); // end of track
    return out;
  }

  /** song -> Uint8Array of a complete .mid file */
  function build(song) {
    const toTick = (beats) => Math.round(beats * PPQ);
    const chunks = [];

    // Conductor track: name, tempo, time signature.
    const usPerBeat = Math.round(60000000 / song.tempo);
    const conductor = [];
    conductor.push(...meta(0, 0x03, str(song.name || 'TuneForge')));
    conductor.push(...meta(0, 0x51, [(usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff]));
    conductor.push(...meta(0, 0x58, [4, 2, 24, 8])); // 4/4
    conductor.push(...vlq(0), 0xff, 0x2f, 0x00);
    chunks.push(chunk('MTrk', conductor));

    for (const track of song.tracks) {
      const ch = track.channel & 0x0f;
      const events = [];
      let order = 0;
      // Track name + program change at tick 0. (No delta prefix here —
      // trackBytes() encodes deltas itself.)
      const nameBytes = str(track.name);
      events.push({ tick: 0, order: order++, data: [0xff, 0x03, ...vlq(nameBytes.length), ...nameBytes] });
      if (ch !== 9) {
        events.push({ tick: 0, order: order++, data: [0xc0 | ch, track.program & 0x7f] });
      }
      for (const n of track.notes) {
        const on = toTick(n.start);
        const off = Math.max(on + 10, toTick(n.start + n.dur));
        events.push({ tick: on, order: order++, data: [0x90 | ch, n.pitch & 0x7f, n.vel & 0x7f] });
        events.push({ tick: off, order: order++, data: [0x80 | ch, n.pitch & 0x7f, 0x40] });
      }
      chunks.push(chunk('MTrk', trackBytes(events)));
    }

    const header = chunk('MThd', [...u16(1), ...u16(1 + song.tracks.length), ...u16(PPQ)]);
    const total = [...header, ...chunks.flat()];
    return new Uint8Array(total.flat ? total.flat(Infinity) : total);
  }

  function filename(song) {
    const key = Theory.NOTE_NAMES[song.key].replace('#', 's');
    return `tuneforge-${song.genreId}-${key}${song.scale}-${song.tempo}bpm-seed${song.seed}.mid`;
  }

  return { build, filename, PPQ };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Midi;
