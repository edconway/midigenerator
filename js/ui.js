/* TuneForge — UI wiring: genre grid, knobs, piano roll, transport, AI modal. */

(() => {
  const $ = (sel) => document.querySelector(sel);
  const clamp = Theory.clamp;

  const ROLE_COLORS = {
    drums: '#e5484d', bass: '#f5a524', chords: '#46a758',
    melody: '#52a9ff', pads: '#8e4ec6', arp: '#f76b15', other: '#9ba1a6',
  };

  const PART_ORDER = ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'];

  // Curated GM picks for the per-part instrument override.
  const GM_CHOICES = [0, 4, 5, 7, 11, 16, 17, 24, 25, 26, 27, 30, 32, 33, 35, 36, 38, 39,
    42, 46, 48, 49, 50, 52, 54, 56, 61, 62, 66, 73, 80, 81, 84, 87, 88, 89, 90, 91, 94, 98, 104, 108, 114];

  /* ------------------------------------------------------------- state */

  const state = {
    genreId: 'house',
    tempo: 124, bars: 8, key: 9, scale: 'minor',
    energy: 0.65, complexity: 0.5, swing: 0.18, humanize: 0.25, timbre: 0.5,
    seed: 1 + Math.floor(Math.random() * 99999),
    parts: { drums: true, bass: true, chords: true, melody: true, pads: false, arp: false },
    instruments: {},
    loop: true,
  };

  let song = null;
  let knobs = {};
  let regenTimer = null;
  let rafId = null;

  const genre = () => Genres.find((g) => g.id === state.genreId) || Genres[0];

  function settingsSnapshot() {
    return {
      genreId: state.genreId, tempo: state.tempo, bars: state.bars,
      key: state.key, scale: state.scale,
      energy: state.energy, complexity: state.complexity, swing: state.swing,
      humanize: state.humanize, timbre: state.timbre,
      parts: { ...state.parts }, instruments: { ...state.instruments },
      seed: state.seed,
    };
  }

  /* ------------------------------------------------------------- knobs */

  function makeKnob(opts) {
    const el = document.createElement('div');
    el.className = 'knob-wrap';
    el.innerHTML = `
      <div class="knob" tabindex="0" role="slider" aria-label="${opts.label}">
        <div class="knob-dial"></div>
      </div>
      <div class="knob-value"></div>
      <div class="knob-label">${opts.label}</div>`;
    const knob = el.querySelector('.knob');
    const dial = el.querySelector('.knob-dial');
    const valEl = el.querySelector('.knob-value');
    let value = opts.value;

    const toT = (v) => opts.values
      ? opts.values.indexOf(v) / (opts.values.length - 1)
      : (v - opts.min) / (opts.max - opts.min);

    function render() {
      dial.style.transform = `rotate(${-135 + clamp(toT(value), 0, 1) * 270}deg)`;
      valEl.textContent = opts.format ? opts.format(value) : value;
      knob.setAttribute('aria-valuetext', valEl.textContent);
    }

    function setFromT(t, fire = true) {
      t = clamp(t, 0, 1);
      let v;
      if (opts.values) {
        v = opts.values[Math.round(t * (opts.values.length - 1))];
      } else {
        v = opts.min + t * (opts.max - opts.min);
        if (opts.step) v = Math.round(v / opts.step) * opts.step;
        v = clamp(Number(v.toFixed(4)), opts.min, opts.max);
      }
      if (v !== value) {
        value = v;
        render();
        if (fire) opts.onChange(v);
      }
    }

    let dragging = false, startY = 0, startT = 0;
    knob.addEventListener('pointerdown', (e) => {
      dragging = true; startY = e.clientY; startT = clamp(toT(value), 0, 1);
      knob.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (dragging) setFromT(startT + (startY - e.clientY) / 160);
    });
    knob.addEventListener('pointerup', () => { dragging = false; });
    knob.addEventListener('wheel', (e) => {
      e.preventDefault();
      setFromT(clamp(toT(value), 0, 1) + (e.deltaY < 0 ? 1 : -1) * 0.04);
    }, { passive: false });
    knob.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { setFromT(clamp(toT(value), 0, 1) + 0.04); e.preventDefault(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { setFromT(clamp(toT(value), 0, 1) - 0.04); e.preventDefault(); }
    });

    render();
    return {
      el,
      get: () => value,
      set(v) { value = v; render(); },
    };
  }

  const pct = (v) => Math.round(v * 100) + '%';

  function buildKnobs() {
    const host = $('#knobs');
    host.innerHTML = '';
    knobs = {
      tempo: makeKnob({ label: 'Tempo', min: 60, max: 190, step: 1, value: state.tempo, format: (v) => v + ' bpm', onChange: (v) => { state.tempo = v; scheduleRegen(); } }),
      bars: makeKnob({ label: 'Bars', values: [4, 8, 16, 32], value: state.bars, format: (v) => v + ' bars', onChange: (v) => { state.bars = v; scheduleRegen(); } }),
      partsCount: makeKnob({ label: 'Instruments', min: 1, max: 6, step: 1, value: countParts(), format: (v) => String(v), onChange: (v) => { setPartsFromCount(v); scheduleRegen(); } }),
      energy: makeKnob({ label: 'Energy', min: 0, max: 1, step: 0.01, value: state.energy, format: pct, onChange: (v) => { state.energy = v; scheduleRegen(); } }),
      complexity: makeKnob({ label: 'Complexity', min: 0, max: 1, step: 0.01, value: state.complexity, format: pct, onChange: (v) => { state.complexity = v; scheduleRegen(); } }),
      swing: makeKnob({ label: 'Swing', min: 0, max: 1, step: 0.01, value: state.swing, format: pct, onChange: (v) => { state.swing = v; scheduleRegen(); } }),
      humanize: makeKnob({ label: 'Humanize', min: 0, max: 1, step: 0.01, value: state.humanize, format: pct, onChange: (v) => { state.humanize = v; scheduleRegen(); } }),
      timbre: makeKnob({ label: 'Timbre', min: 0, max: 1, step: 0.01, value: state.timbre, format: (v) => (v < 0.34 ? 'dark' : v < 0.67 ? 'warm' : 'bright') + ' ' + pct(v), onChange: (v) => { state.timbre = v; scheduleRegen(); } }),
    };
    for (const k of Object.values(knobs)) host.appendChild(k.el);
  }

  function countParts() {
    return PART_ORDER.filter((p) => state.parts[p]).length || 1;
  }

  function setPartsFromCount(n) {
    const pri = genre().priority;
    PART_ORDER.forEach((p) => { state.parts[p] = false; });
    pri.slice(0, n).forEach((p) => { state.parts[p] = true; });
    renderParts();
  }

  /* ------------------------------------------------------------- genres */

  function buildGenres() {
    const host = $('#genre-grid');
    host.innerHTML = '';
    for (const g of Genres) {
      const btn = document.createElement('button');
      btn.className = 'genre-card' + (g.id === state.genreId ? ' active' : '');
      btn.dataset.id = g.id;
      btn.innerHTML = `<span class="genre-icon">${g.icon}</span>
        <span class="genre-name">${g.name}</span>
        <span class="genre-bpm">${g.tempo[0]}–${g.tempo[1]} bpm</span>`;
      btn.title = g.desc;
      btn.addEventListener('click', () => selectGenre(g.id));
      host.appendChild(btn);
    }
  }

  function selectGenre(id) {
    state.genreId = id;
    const g = genre();
    state.tempo = g.tempo[2];
    state.swing = g.swing;
    state.energy = g.energy;
    state.complexity = g.complexity;
    state.humanize = g.humanize;
    state.scale = g.scales[0];
    state.instruments = {};
    setPartsFromCount(countParts()); // re-map the enabled count onto this genre's priority order
    knobs.tempo.set(state.tempo);
    knobs.swing.set(state.swing);
    knobs.energy.set(state.energy);
    knobs.complexity.set(state.complexity);
    knobs.humanize.set(state.humanize);
    knobs.partsCount.set(countParts());
    $('#scale-select').value = state.scale;
    document.querySelectorAll('.genre-card').forEach((el) =>
      el.classList.toggle('active', el.dataset.id === id));
    renderParts();
    regenerate();
  }

  /* -------------------------------------------------------------- parts */

  function renderParts() {
    const host = $('#parts');
    host.innerHTML = '';
    for (const part of PART_ORDER) {
      const wrap = document.createElement('div');
      wrap.className = 'part-chip' + (state.parts[part] ? ' on' : '');
      const btn = document.createElement('button');
      btn.className = 'part-toggle';
      btn.textContent = Engine.PART_LABELS[part];
      btn.style.setProperty('--part-color', ROLE_COLORS[part]);
      btn.addEventListener('click', () => {
        state.parts[part] = !state.parts[part];
        if (!PART_ORDER.some((p) => state.parts[p])) state.parts[part] = true; // keep ≥1
        knobs.partsCount.set(countParts());
        renderParts();
        scheduleRegen();
      });
      wrap.appendChild(btn);
      if (part !== 'drums') {
        const sel = document.createElement('select');
        sel.className = 'part-instrument';
        sel.title = 'Instrument (General MIDI)';
        const auto = document.createElement('option');
        auto.value = 'auto';
        auto.textContent = 'Auto';
        sel.appendChild(auto);
        for (const p of GM_CHOICES) {
          const o = document.createElement('option');
          o.value = p;
          o.textContent = Engine.GM_NAMES[p];
          sel.appendChild(o);
        }
        sel.value = state.instruments[part] !== undefined ? String(state.instruments[part]) : 'auto';
        sel.addEventListener('change', () => {
          if (sel.value === 'auto') delete state.instruments[part];
          else state.instruments[part] = Number(sel.value);
          scheduleRegen();
        });
        wrap.appendChild(sel);
      }
      host.appendChild(wrap);
    }
  }

  /* ---------------------------------------------------- key/scale/seed */

  function buildKeyScale() {
    const keySel = $('#key-select');
    Theory.NOTE_NAMES.forEach((n, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = n;
      keySel.appendChild(o);
    });
    keySel.value = state.key;
    keySel.addEventListener('change', () => { state.key = Number(keySel.value); scheduleRegen(); });

    const scaleSel = $('#scale-select');
    Object.entries(Theory.SCALES).forEach(([id, s]) => {
      const o = document.createElement('option');
      o.value = id; o.textContent = s.name;
      scaleSel.appendChild(o);
    });
    scaleSel.value = state.scale;
    scaleSel.addEventListener('change', () => { state.scale = scaleSel.value; scheduleRegen(); });

    const seedInput = $('#seed-input');
    seedInput.value = state.seed;
    seedInput.addEventListener('change', () => {
      state.seed = Math.max(1, Math.floor(Number(seedInput.value) || 1));
      seedInput.value = state.seed;
      scheduleRegen();
    });
  }

  /* --------------------------------------------------------- generation */

  function regenerate() {
    song = Engine.generate(settingsSnapshot());
    $('#song-title').textContent = song.name + ' · ' + song.tempo + ' bpm · seed ' + song.seed;
    renderLegend();
    drawRoll();
    if (Synth.isPlaying()) startPlayback();
  }

  function scheduleRegen() {
    clearTimeout(regenTimer);
    regenTimer = setTimeout(regenerate, 120);
  }

  function newSeed() {
    state.seed = 1 + Math.floor(Math.random() * 999999);
    $('#seed-input').value = state.seed;
    regenerate();
  }

  /* ---------------------------------------------------------- piano roll */

  function drawRoll() {
    const canvas = $('#roll');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!song) return;

    const totalBeats = song.bars * 4;
    let lo = 127, hi = 0;
    for (const t of song.tracks) for (const n of t.notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); }
    if (lo > hi) { lo = 36; hi = 84; }
    lo -= 2; hi += 2;
    const px = (beat) => (beat / totalBeats) * w;
    const py = (pitch) => h - ((pitch - lo) / (hi - lo)) * h;
    const rowH = Math.max(2, h / (hi - lo) - 1);

    // Bar grid
    for (let b = 0; b <= song.bars; b++) {
      const x = px(b * 4);
      g.strokeStyle = b % 4 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
    // Beat grid (only when zoomed enough)
    if (w / totalBeats > 14) {
      g.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let b = 0; b < totalBeats; b++) {
        const x = px(b);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      }
    }

    for (const track of song.tracks) {
      g.fillStyle = ROLE_COLORS[track.role] || ROLE_COLORS.other;
      for (const n of track.notes) {
        const x = px(n.start);
        const nw = Math.max(2, px(n.start + n.dur) - x - 1);
        g.globalAlpha = 0.35 + (n.vel / 127) * 0.6;
        g.fillRect(x, py(n.pitch) - rowH / 2, nw, rowH);
      }
    }
    g.globalAlpha = 1;
  }

  function renderLegend() {
    const host = $('#legend');
    host.innerHTML = '';
    if (!song) return;
    for (const t of song.tracks) {
      const el = document.createElement('span');
      el.className = 'legend-item';
      el.innerHTML = `<i style="background:${ROLE_COLORS[t.role] || ROLE_COLORS.other}"></i>${t.name}`;
      host.appendChild(el);
    }
  }

  function tickPlayhead() {
    const canvas = $('#playhead');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (Synth.isPlaying() && song) {
      const x = (Synth.positionBeats() / (song.bars * 4)) * w;
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
      rafId = requestAnimationFrame(tickPlayhead);
    } else {
      rafId = null;
      updatePlayButton();
    }
  }

  /* ----------------------------------------------------------- transport */

  function startPlayback() {
    if (!song) return;
    Synth.play(song, { loop: state.loop, timbre: state.timbre });
    updatePlayButton();
    if (!rafId) rafId = requestAnimationFrame(tickPlayhead);
  }

  function stopPlayback() {
    Synth.stop();
    updatePlayButton();
  }

  function updatePlayButton() {
    $('#play-btn').innerHTML = Synth.isPlaying() ? '&#9632; Stop' : '&#9654; Play';
  }

  function download() {
    if (!song) return;
    const bytes = Midi.build(song);
    const blob = new Blob([bytes], { type: 'audio/midi' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = Midi.filename(song);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('MIDI saved — drag it into your DAW 🎛️');
  }

  /* ----------------------------------------------------------------- AI */

  function openAiModal() {
    const cfg = AI.getSettings();
    $('#ai-provider').value = cfg.provider;
    $('#ai-anthropic-key').value = cfg.anthropicKey;
    $('#ai-openai-key').value = cfg.openaiKey;
    $('#ai-anthropic-model').value = cfg.anthropicModel;
    $('#ai-openai-model').value = cfg.openaiModel;
    syncAiModalRows();
    $('#ai-modal').classList.add('open');
  }

  function syncAiModalRows() {
    const p = $('#ai-provider').value;
    $('#anthropic-rows').style.display = p === 'anthropic' ? '' : 'none';
    $('#openai-rows').style.display = p === 'openai' ? '' : 'none';
  }

  function saveAiModal() {
    AI.saveSettings({
      provider: $('#ai-provider').value,
      anthropicKey: $('#ai-anthropic-key').value.trim(),
      openaiKey: $('#ai-openai-key').value.trim(),
      anthropicModel: $('#ai-anthropic-model').value.trim() || 'claude-opus-4-8',
      openaiModel: $('#ai-openai-model').value.trim() || 'gpt-4.1',
    });
    $('#ai-modal').classList.remove('open');
    toast('AI settings saved (stored only in this browser).');
  }

  async function aiCompose() {
    if (!AI.isConfigured()) { openAiModal(); return; }
    const btn = $('#ai-btn');
    btn.disabled = true;
    btn.classList.add('busy');
    toast('Composing with AI — this can take up to a minute…', 60000);
    try {
      const result = await AI.compose(settingsSnapshot(), genre(), $('#ai-brief').value);
      song = result;
      $('#song-title').textContent = '✨ ' + song.name + ' · ' + song.tempo + ' bpm';
      renderLegend();
      drawRoll();
      toast('AI composition ready.');
      if (Synth.isPlaying()) startPlayback();
    } catch (err) {
      console.error(err);
      toast('AI error: ' + err.message, 8000);
    } finally {
      btn.disabled = false;
      btn.classList.remove('busy');
    }
  }

  /* -------------------------------------------------------------- toast */

  let toastTimer = null;
  function toast(msg, ms = 3500) {
    const el = $('#status');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* --------------------------------------------------------------- init */

  function init() {
    buildGenres();
    buildKnobs();
    buildKeyScale();
    renderParts();

    $('#generate-btn').addEventListener('click', newSeed);
    $('#dice-btn').addEventListener('click', newSeed);
    $('#play-btn').addEventListener('click', () => (Synth.isPlaying() ? stopPlayback() : startPlayback()));
    $('#loop-btn').addEventListener('click', () => {
      state.loop = !state.loop;
      $('#loop-btn').classList.toggle('on', state.loop);
    });
    $('#download-btn').addEventListener('click', download);
    $('#ai-btn').addEventListener('click', aiCompose);
    $('#ai-settings-btn').addEventListener('click', openAiModal);
    $('#ai-provider').addEventListener('change', syncAiModalRows);
    $('#ai-save').addEventListener('click', saveAiModal);
    $('#ai-close').addEventListener('click', () => $('#ai-modal').classList.remove('open'));
    $('#ai-modal').addEventListener('click', (e) => {
      if (e.target === $('#ai-modal')) $('#ai-modal').classList.remove('open');
    });

    const modelList = $('#anthropic-models');
    AI.ANTHROPIC_MODELS.forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      modelList.appendChild(o);
    });

    window.addEventListener('resize', () => drawRoll());
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        Synth.isPlaying() ? stopPlayback() : startPlayback();
      } else if (e.key === 'g') {
        newSeed();
      }
    });

    $('#loop-btn').classList.toggle('on', state.loop);
    selectGenre(state.genreId);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
