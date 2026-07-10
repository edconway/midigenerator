/* TuneForge — optional AI composer.
 * Calls Claude (Anthropic) or OpenAI straight from the browser — no server.
 * The model returns a JSON composition in the same shape the rule engine
 * produces, so playback, piano roll and MIDI export are identical paths.
 *
 * Keys are stored in localStorage on this machine only and sent only to the
 * provider you picked.
 */

const AI = (() => {
  const STORE_KEY = 'tuneforge-ai-settings';

  const DEFAULTS = {
    provider: 'anthropic',
    anthropicKey: '',
    openaiKey: '',
    anthropicModel: 'claude-opus-4-8',
    openaiModel: 'gpt-4.1',
  };

  const ANTHROPIC_MODELS = ['claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'];

  function getSettings() {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE_KEY)) || {}) };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(s) {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  }

  function isConfigured() {
    const s = getSettings();
    return s.provider === 'anthropic' ? !!s.anthropicKey : !!s.openaiKey;
  }

  /* --------------------------------------------------- prompt + schema */

  // JSON schema shared by both providers (enforced server-side for Claude
  // via structured outputs; advisory for OpenAI json_object mode).
  const SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['tempo', 'tracks'],
    properties: {
      tempo: { type: 'integer' },
      tracks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'role', 'program', 'notes'],
          properties: {
            name: { type: 'string' },
            role: { type: 'string', enum: ['drums', 'bass', 'chords', 'melody', 'pads', 'arp', 'other'] },
            program: { type: 'integer' },
            notes: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['s', 'd', 'p', 'v'],
                properties: {
                  s: { type: 'number' },  // start, in beats
                  d: { type: 'number' },  // duration, in beats
                  p: { type: 'integer' }, // MIDI pitch 0-127
                  v: { type: 'integer' }, // velocity 1-127
                },
              },
            },
          },
        },
      },
    },
  };

  const SYSTEM_PROMPT = `You are an expert composer and producer writing multi-track MIDI arrangements.
Respond ONLY with JSON matching the schema you were given. Conventions:
- Times are in beats (quarter notes), 4/4 time; a bar is 4 beats. "s" = start beat, "d" = duration in beats.
- The piece must fill exactly the requested number of bars and loop seamlessly (land back on the downbeat, resolve harmonically).
- role "drums" plays on GM percussion: 36 kick, 38 snare, 37 rimshot, 39 clap, 42 closed hat, 44 pedal hat, 46 open hat, 49 crash, 51 ride, 45/47/50 low/mid/high toms, 54 tambourine, 56 cowbell, 63 conga, 70 shaker, 75 clave. program is ignored for drums (use 0).
- For melodic roles pick an appropriate General MIDI program number (0-127).
- Write real musicianship: coherent chord progression, voice-leading, a memorable melodic motif that develops, humanized velocities (accents, ghost notes), idiomatic rhythms for the genre, occasional fills.
- Keep the TOTAL note count across all tracks under 900. Prefer fewer, better notes.`;

  function buildUserPrompt(settings, genre, brief) {
    const keyName = Theory.NOTE_NAMES[settings.key];
    const scaleName = Theory.SCALES[settings.scale].name;
    const parts = Object.keys(settings.parts).filter((p) => settings.parts[p]);
    const pct = (v) => Math.round(v * 100) + '%';
    let p = `Compose a ${settings.bars}-bar ${genre.name} piece (${genre.desc})
- Tempo: ${settings.tempo} BPM
- Key: ${keyName} ${scaleName}
- Parts to include (one track each): ${parts.join(', ')}
- Energy: ${pct(settings.energy)}, Complexity/density: ${pct(settings.complexity)}, Timbre: ${pct(settings.timbre)} (0% = dark/soft instruments, 100% = bright/hard)
- Swing feel: ${pct(settings.swing)}`;
    if (brief && brief.trim()) p += `\n- Creative brief from the user: ${brief.trim()}`;
    p += `\nReturn the JSON composition now.`;
    return p;
  }

  /* ----------------------------------------------------- provider calls */

  async function callAnthropic(cfg, userPrompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.anthropicKey,
        'anthropic-version': '2023-06-01',
        // Required opt-in for calling the API directly from a browser.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.anthropicModel || DEFAULTS.anthropicModel,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json && json.error && json.error.message ? json.error.message : `HTTP ${res.status}`;
      throw new Error('Claude API: ' + msg);
    }
    if (json.stop_reason === 'refusal') throw new Error('Claude declined this request.');
    if (json.stop_reason === 'max_tokens') throw new Error('Response was truncated — try fewer bars or parts.');
    const block = (json.content || []).find((b) => b.type === 'text');
    if (!block) throw new Error('Claude returned no text content.');
    return block.text;
  }

  async function callOpenAI(cfg, userPrompt) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + cfg.openaiKey,
      },
      body: JSON.stringify({
        model: cfg.openaiModel || DEFAULTS.openaiModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + '\nOutput must be a single JSON object with fields: tempo (integer), tracks (array of {name, role, program, notes:[{s,d,p,v}]}).' },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json && json.error && json.error.message ? json.error.message : `HTTP ${res.status}`;
      throw new Error('OpenAI API: ' + msg);
    }
    const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!text) throw new Error('OpenAI returned no content.');
    return text;
  }

  /* -------------------------------------------------------- conversion */

  function parseJson(text) {
    // Strip markdown fences if a model added them anyway.
    const cleaned = text.replace(/^```(json)?/m, '').replace(/```\s*$/m, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('AI response was not JSON.');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  function toSong(data, settings, genre) {
    const clamp = Theory.clamp;
    const totalBeats = settings.bars * 4;
    const tracks = [];
    let melodicCh = 0;
    const nextChannel = () => {
      const ch = melodicCh === 9 ? ++melodicCh : melodicCh;
      melodicCh = ch + 1;
      return ch % 16;
    };
    for (const t of (data.tracks || []).slice(0, 12)) {
      const role = ['drums', 'bass', 'chords', 'melody', 'pads', 'arp'].includes(t.role) ? t.role : 'other';
      const notes = (t.notes || [])
        .filter((n) => typeof n.s === 'number' && typeof n.p === 'number' && n.s >= 0 && n.s < totalBeats)
        .slice(0, 3000)
        .map((n) => ({
          start: Math.max(0, n.s),
          dur: clamp(typeof n.d === 'number' ? n.d : 0.25, 0.05, totalBeats - Math.max(0, n.s)),
          pitch: clamp(Math.round(n.p), 0, 127),
          vel: clamp(Math.round(n.v || 90), 1, 127),
        }))
        .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
      if (!notes.length) continue;
      tracks.push({
        id: role + '-' + tracks.length,
        name: String(t.name || role).slice(0, 40),
        role,
        channel: role === 'drums' ? 9 : nextChannel(),
        program: role === 'drums' ? 0 : clamp(Math.round(t.program || 0), 0, 127),
        notes,
      });
    }
    if (!tracks.length) throw new Error('AI composition contained no usable notes.');
    return {
      name: `AI ${genre.name} in ${Theory.NOTE_NAMES[settings.key]} ${Theory.SCALES[settings.scale].name}`,
      genreId: genre.id,
      tempo: clamp(Math.round(data.tempo || settings.tempo), 40, 240),
      bars: settings.bars,
      key: settings.key,
      scale: settings.scale,
      seed: settings.seed,
      ai: true,
      tracks,
    };
  }

  /** Main entry: compose with the configured provider. Returns a Song. */
  async function compose(settings, genre, brief) {
    const cfg = getSettings();
    const userPrompt = buildUserPrompt(settings, genre, brief);
    const text = cfg.provider === 'anthropic'
      ? await callAnthropic(cfg, userPrompt)
      : await callOpenAI(cfg, userPrompt);
    return toSong(parseJson(text), settings, genre);
  }

  return { getSettings, saveSettings, isConfigured, compose, ANTHROPIC_MODELS };
})();
