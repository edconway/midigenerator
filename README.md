# 🎛️ TuneForge

A free-standing MIDI tune generator. Pick a genre, shape the sound with dials,
listen to a preview in the browser, and download a standard `.mid` file you can
drop straight into **Ableton Live, Logic Pro, GarageBand, FL Studio, Cubase** —
any DAW.

No install, no server, no dependencies: it's a static web page.

## Quick start (macOS)

**Option A — just open it:**

1. Double-click `index.html` (or drag it onto your browser).

**Option B — tiny local server** (nicer URL, identical behaviour):

```sh
./run.sh          # serves on http://localhost:8765 and opens your browser
```

## How it works

1. **Pick a genre** — House, Techno, Trap, Lo-fi, Drum & Bass, Jazz, Funk,
   Synthwave, Ambient, Pop/Rock, Reggaetón, Cinematic. Each genre carries its
   own built-in corpus: tempo range, scales, chord progressions, drum grooves,
   bass styles and instrument palettes. Selecting one sets sensible defaults.
2. **Shape the sound** with the dials:
   - **Tempo / Bars** — speed and length (4–32 bars).
   - **Instruments** — how many parts play (drums, bass, chords, melody, pads,
     arp — added in the order that suits the genre). Toggle individual parts
     with the chips, and optionally pin a specific General MIDI instrument
     per part.
   - **Energy** — how busy and loud the groove is.
   - **Complexity** — note density, syncopation, fills, extra colour tones.
   - **Swing** — straight ↔ shuffled feel (uses the genre's natural swing
     unit: 16ths for house/funk, 8ths for jazz).
   - **Humanize** — timing and velocity looseness, from machine-tight to lazy.
   - **Timbre** — dark/soft ↔ bright/hard instrument choices (affects both the
     GM programs written into the file and the preview synth).
   - **Key / Scale / Seed** — the same seed always reproduces the same tune,
     so you can tweak one dial at a time and compare.
3. **Generate** (`G` key or 🎲) — a new seed, a new tune. **Play** (`Space`)
   auditions it with the built-in synth; the piano roll shows every part.
4. **Download MIDI** — a Type-1 multi-track file. Every part is a separate
   track (drums on channel 10 with GM drum mapping), so your DAW splits them
   onto separate lanes automatically. Swap the sounds for your own synths —
   the notes are the point.

## ✨ Optional: AI compositions

For a more sophisticated arrangement, click **Compose with AI**. TuneForge
sends your current dial settings (plus an optional text brief, e.g. *"moody
detective jazz, walking bass solo in the last 8 bars"*) to either:

- **Claude (Anthropic)** — default model `claude-opus-4-8`; uses structured
  outputs so the composition always comes back as valid JSON, and the
  direct-browser-access mode so no proxy server is needed.
- **OpenAI** — default model `gpt-4.1` (editable).

Setup: click **⚙️ AI setup**, pick a provider and paste an API key.

> **Key handling:** your key is stored in this browser's `localStorage` only
> and is sent only to the provider you selected. Nothing else ever sees it.
> The rule-based generator works fully offline without any key.

The AI returns notes in the same internal format the rule engine uses, so
preview, piano roll and MIDI export behave identically.

## Files

```
index.html        app shell
css/style.css     dark studio theme
js/theory.js      scales, chords, voice-leading, seeded RNG
js/genres.js      the genre corpus (grooves, progressions, palettes)
js/engine.js      rule-based composition engine
js/midi.js        Standard MIDI File (Type 1) writer
js/synth.js       WebAudio preview synth + drum machine
js/ai.js          Claude / OpenAI integration
js/ui.js          knobs, genre grid, piano roll, transport
```

## Notes & tips

- **Loopable by design** — generated clips resolve back to the downbeat, so
  they loop cleanly as session clips.
- **Same seed = same tune.** Change only Timbre or instruments to re-skin a
  tune you like without changing a note.
- Browsers that support WebAudio (Safari, Chrome, Firefox, Edge — all current
  versions) are fine. The AI feature needs network access; everything else
  runs offline.
