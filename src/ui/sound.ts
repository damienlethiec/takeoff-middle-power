// The optional soundtrack: generative ambient music made in the browser with the Web Audio API (no audio
// files, nothing fetched, so nothing for the CSP to allow). Slow pads and a soft pulse, a "situation room"
// mood. It follows the world: tension rises gently with AI power and as US–China cooperation falls (faster
// pulse, brighter filter, wider detune, a dissonant shadow voice), turns darker at the tipping point, and
// resolves on the ending (hopeful for a good one, sombre for a bad one).
//
// Off by default. The player turns it on with the header's "Sound" toggle (a user gesture: the audio context
// is only ever created inside one). The choice and the volume are remembered when storage allows. The music
// fades out when the game is paused or the tab is hidden, and every change glides: no sudden loud sound.
// About twenty audio nodes, created when the music starts and released (context closed) when it stops.
//
// `musicFor` is the pure part (world → musical parameters), unit-tested; `Soundtrack` plays it.

export type Mood = 'calm' | 'tense' | 'tipped' | 'hope' | 'sombre';
export interface MusicWorld {
  aiPower: number;
  cooperation: number;
  tipping: boolean;
  /** Set once the game is over. */
  ending?: 'good' | 'bad' | null;
}
export interface MusicParams {
  mood: Mood;
  /** 0 (calm) to 1 (tense). */
  tension: number;
  /** Pulse tempo in beats per minute (0: no pulse). */
  bpm: number;
  /** Pulse loudness, 0 to 1 (relative). */
  pulse: number;
  /** Pad low-pass cutoff in Hz: brighter is tenser. */
  cutoff: number;
  /** Detune spread between pad voices, in cents. */
  detune: number;
  /** Loudness of the dissonant shadow voice, 0 to 1 (relative). */
  shadow: number;
  /** Seconds per chord. */
  chordSecs: number;
  /** The chord progression: each chord is four voices, in semitones from D3. */
  chords: number[][];
}

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Original progressions in D (Aeolian for the game, suspended for the tipping point, major for a good end). */
const PROGRESSIONS: Record<Mood, number[][]> = {
  calm: [[-12, 3, 7, 14], [-16, 2, 5, 9], [-9, 0, 7, 12], [-14, 2, 5, 10]],
  tense: [[-12, 3, 7, 14], [-16, 2, 5, 9], [-11, 3, 8, 12], [-14, 2, 5, 10]],
  tipped: [[-12, 5, 7, 14], [-12, 1, 5, 10], [-12, 3, 8, 12], [-12, 3, 6, 12]],
  hope: [[-12, 4, 7, 14], [-7, 0, 4, 9], [-3, 2, 7, 11], [-5, 4, 7, 12]],
  sombre: [[-12, 3, 7, 10], [-16, 3, 6, 10], [-12, 3, 6, 13], [-14, 3, 7, 10]],
};

/** World → musical parameters. Pure: same world, same music. */
export function musicFor(w: MusicWorld): MusicParams {
  // AI power drives most of the tension (it nears the tipping point at 80); falling cooperation adds the rest
  const ai = clamp01(((Number(w.aiPower) || 0) - 20) / 60);
  const rift = clamp01((70 - (Number(w.cooperation) || 0)) / 60);
  let tension = clamp01(0.62 * ai + 0.38 * rift);
  let mood: Mood = tension >= 0.55 ? 'tense' : 'calm';
  if (w.tipping) {
    mood = 'tipped';
    tension = Math.max(tension, 0.75);
  }
  if (w.ending === 'good') return { mood: 'hope', tension: 0, bpm: 0, pulse: 0, cutoff: 1500, detune: 4, shadow: 0, chordSecs: 9, chords: PROGRESSIONS.hope };
  if (w.ending === 'bad') return { mood: 'sombre', tension: 0.6, bpm: 40, pulse: 0.45, cutoff: 520, detune: 9, shadow: 0.35, chordSecs: 11, chords: PROGRESSIONS.sombre };
  const r = (x: number) => Math.round(x * 100) / 100;
  return {
    mood,
    tension: r(tension),
    bpm: Math.round(lerp(50, 80, tension)),
    pulse: r(lerp(0.45, 0.85, tension)),
    cutoff: Math.round(lerp(650, 2000, tension)),
    detune: r(lerp(3, 16, tension)),
    shadow: r(clamp01((tension - 0.45) / 0.55)),
    chordSecs: r(lerp(9, 6, tension)),
    chords: PROGRESSIONS[mood],
  };
}

// ------------------------------------------------------------------ preferences

const KEY_ON = 'takeoff.sound';
const KEY_VOL = 'takeoff.soundVolume';
function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage blocked: the setting lasts for this page only */
  }
}

// ------------------------------------------------------------------ player

type Ctx = AudioContext;
const AudioCtor = (): (new () => Ctx) | undefined =>
  typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: new () => Ctx }).webkitAudioContext);
const D3 = 146.83;
const hz = (semi: number) => D3 * Math.pow(2, semi / 12);
const FADE = 0.6; // seconds (time constant ×3 ≈ the fade)

interface Graph {
  ctx: Ctx;
  master: GainNode;
  filter: BiquadFilterNode;
  voices: OscillatorNode[];
  shadowOsc: OscillatorNode;
  shadowGain: GainNode;
  pulseOsc: OscillatorNode;
  pulseEnv: GainNode;
  bellOsc: OscillatorNode;
  bellEnv: GainNode;
  lfo: OscillatorNode;
  timer: ReturnType<typeof setInterval>;
  nextBeat: number;
  nextChord: number;
  chordIx: number;
}

export class Soundtrack {
  private on = load(KEY_ON) === 'on';
  private volume = (() => {
    const v = Number(load(KEY_VOL));
    return load(KEY_VOL) !== null && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 60;
  })();
  private g: Graph | null = null;
  private world: MusicWorld = { aiPower: 0, cooperation: 70, tipping: false, ending: null };
  private p: MusicParams = musicFor(this.world);
  private paused = false;
  private controls: HTMLElement[] = [];

  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => this.sync());
    // remembered "on": browsers let audio start only from a gesture, so the music starts (or wakes up) on the
    // player's next click or key press
    const unlock = () => {
      if (!this.on || !this.audible()) return;
      if (!this.g) this.start();
      else if (this.g.ctx.state === 'suspended') this.sync();
    };
    for (const type of ['click', 'keydown', 'touchend']) document.addEventListener(type, unlock, true);
  }

  get supported() {
    return !!AudioCtor();
  }
  get enabled() {
    return this.on;
  }

  /** The header (or end page) controls: a toggle button and, while on, a volume slider (on wide screens it
   * drops down under the button on hover or keyboard focus, so the header keeps its rows). On phones the button
   * is icon-only: a speaker with waves when on, crossed out when off; its name says "Sound on" or "Sound off". */
  html(): string {
    if (!this.supported) return '';
    return `<div class="snd" role="group" aria-label="Soundtrack">
      <button type="button" class="snd-btn" data-snd-toggle aria-label="Sound ${this.on ? 'on' : 'off'}" title="Sound" aria-pressed="${this.on}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="snd-wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="snd-mute" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="snd-word">Sound</span> <span class="snd-state">${this.on ? 'on' : 'off'}</span></button>
      <label class="snd-pop" ${this.on ? '' : 'hidden'}><span class="snd-vl">Music volume</span><input type="range" class="snd-vol" data-snd-vol min="0" max="100" step="5" value="${this.volume}" aria-valuetext="${this.volume}%" /></label>
    </div>`;
  }

  /** Wire the controls rendered by `html()` inside `root`. */
  bind(root: ParentNode) {
    const box = root.querySelector<HTMLElement>('.snd');
    if (!box) return;
    this.controls = this.controls.filter((c) => c.isConnected);
    this.controls.push(box);
    box.querySelector('[data-snd-toggle]')?.addEventListener('click', () => this.setOn(!this.on));
    box.querySelector<HTMLInputElement>('[data-snd-vol]')?.addEventListener('input', (ev) => this.setVolume(Number((ev.target as HTMLInputElement).value)));
  }

  setOn(on: boolean) {
    this.on = on;
    save(KEY_ON, on ? 'on' : 'off');
    for (const box of this.controls) {
      const btn = box.querySelector('[data-snd-toggle]');
      btn?.setAttribute('aria-pressed', String(on));
      // the name carries the state too (it matches the visible "Sound on"; on phones the button is icon-only)
      btn?.setAttribute('aria-label', `Sound ${on ? 'on' : 'off'}`);
      const st = box.querySelector('.snd-state');
      if (st) st.textContent = on ? 'on' : 'off';
      const pop = box.querySelector<HTMLElement>('.snd-pop');
      if (pop) pop.hidden = !on;
    }
    if (on) this.start();
    else this.stop();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(100, Number.isFinite(v) ? v : 60));
    save(KEY_VOL, String(this.volume));
    for (const box of this.controls) {
      const vol = box.querySelector<HTMLInputElement>('[data-snd-vol]');
      if (vol) {
        vol.value = String(this.volume);
        vol.setAttribute('aria-valuetext', `${this.volume}%`);
      }
    }
    this.sync();
  }

  /** The game's clock was paused or resumed by the player. */
  setPaused(p: boolean) {
    if (p === this.paused) return;
    this.paused = p;
    this.sync();
  }

  /** The world moved: the music follows, gliding. */
  setWorld(w: MusicWorld) {
    const prev = this.p;
    this.world = { ...w };
    this.p = musicFor(this.world);
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime;
    const slow = this.p.mood === 'hope' || this.p.mood === 'sombre' ? 2.5 : 1.2;
    g.filter.frequency.setTargetAtTime(this.p.cutoff, t, slow);
    g.voices.forEach((o, i) => o.detune.setTargetAtTime((i % 2 ? 1 : -1) * this.p.detune, t, slow));
    g.shadowGain.gain.setTargetAtTime(0.05 * this.p.shadow, t, slow);
    // a new mood starts its progression now rather than at the next bar
    if (prev.mood !== this.p.mood) {
      g.chordIx = 0;
      g.nextChord = t + 0.05;
    }
  }

  /** A soft one-shot: a new round, a request, Breaking news. Subtle, faded in, never on top of a pause. */
  cue(kind: 'round' | 'request' | 'breaking') {
    const g = this.g;
    if (!g || g.ctx.state !== 'running' || !this.audible()) return;
    const t = g.ctx.currentTime + 0.03;
    const notes: [number, number, number][] =
      kind === 'round' ? [[19, 0, 0.05], [24, 0.22, 0.04]] : kind === 'request' ? [[21, 0, 0.04]] : [[13, 0, 0.06], [12, 0.35, 0.06]];
    for (const [semi, at, level] of notes) {
      const o = g.ctx.createOscillator();
      const e = g.ctx.createGain();
      o.type = kind === 'breaking' ? 'triangle' : 'sine';
      o.frequency.value = hz(semi);
      e.gain.setValueAtTime(0, t + at);
      e.gain.linearRampToValueAtTime(level, t + at + (kind === 'breaking' ? 0.12 : 0.03));
      e.gain.exponentialRampToValueAtTime(0.0001, t + at + 1.8);
      o.connect(e).connect(g.master);
      o.start(t + at);
      o.stop(t + at + 1.9);
      o.onended = () => {
        o.disconnect();
        e.disconnect();
      };
    }
  }

  // ---------------------------------------------------------------- internals

  private level() {
    const v = this.volume / 100;
    return 0.42 * v * v;
  }
  private audible() {
    return this.on && !this.paused && !(typeof document !== 'undefined' && document.hidden);
  }

  /** Fade to where the music should be: playing at the volume, or silent and suspended. */
  private sync() {
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(g.master.gain.value, t);
    if (this.audible()) {
      void g.ctx.resume().then(() => {
        if (this.g !== g) return;
        const now = g.ctx.currentTime;
        g.master.gain.setTargetAtTime(this.level(), now, FADE / 3);
        if (g.nextBeat < now) g.nextBeat = now + 0.1;
        if (g.nextChord < now) g.nextChord = now + 0.05;
      });
    } else {
      g.master.gain.setTargetAtTime(0, t, FADE / 3);
      setTimeout(() => {
        if (this.g === g && !this.audible() && g.ctx.state === 'running') void g.ctx.suspend();
      }, FADE * 1000 + 100);
    }
  }

  private start() {
    if (this.g) return this.sync();
    const Ctor = AudioCtor();
    if (!Ctor) return;
    let ctx: Ctx;
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
    // master: a gentle limiter so nothing can come out loud
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);
    // a little room: one feedback delay
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(master);
    // the pad: four voices through one low-pass, which breathes slowly
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.8;
    filter.frequency.value = this.p.cutoff;
    const pad = ctx.createGain();
    pad.gain.value = 0.11;
    filter.connect(pad);
    pad.connect(master);
    pad.connect(delay);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 180;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const chord = this.p.chords[0];
    const voices = chord.map((semi, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = hz(semi);
      o.detune.value = (i % 2 ? 1 : -1) * this.p.detune;
      o.connect(filter);
      return o;
    });
    // the shadow: a minor second above the top voice, heard only as tension rises
    const shadowOsc = ctx.createOscillator();
    shadowOsc.type = 'sine';
    shadowOsc.frequency.value = hz(chord[3] + 1);
    const shadowGain = ctx.createGain();
    shadowGain.gain.value = 0.05 * this.p.shadow;
    shadowOsc.connect(shadowGain).connect(filter);
    // the pulse: a soft low heartbeat, one oscillator and its envelope
    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 70;
    const pulseEnv = ctx.createGain();
    pulseEnv.gain.value = 0;
    pulseOsc.connect(pulseEnv).connect(master);
    // a high glint now and then, from the chord
    const bellOsc = ctx.createOscillator();
    bellOsc.type = 'sine';
    const bellEnv = ctx.createGain();
    bellEnv.gain.value = 0;
    bellOsc.connect(bellEnv);
    bellEnv.connect(master);
    bellEnv.connect(delay);
    const all = [lfo, ...voices, shadowOsc, pulseOsc, bellOsc];
    all.forEach((o) => o.start());
    const now = ctx.currentTime;
    this.g = { ctx, master, filter, voices, shadowOsc, shadowGain, pulseOsc, pulseEnv, bellOsc, bellEnv, lfo, timer: setInterval(() => this.schedule(), 120), nextBeat: now + 0.4, nextChord: now + this.p.chordSecs, chordIx: 0 };
    this.sync();
  }

  private stop() {
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(g.master.gain.value, t);
    g.master.gain.setTargetAtTime(0, t, FADE / 3);
    // this graph only finishes fading, then everything is released (a fresh start builds a new one)
    this.g = null;
    clearInterval(g.timer);
    setTimeout(() => void g.ctx.close().catch(() => undefined), FADE * 1000 + 200);
  }

  /** Look-ahead scheduler: chords and pulse beats due in the next 0.4 s. */
  private schedule() {
    const g = this.g;
    if (!g || g.ctx.state !== 'running') return;
    const now = g.ctx.currentTime;
    const ahead = now + 0.4;
    const p = this.p;
    while (g.nextChord < ahead) {
      const chord = p.chords[g.chordIx % p.chords.length];
      const at = Math.max(now, g.nextChord);
      const glide = p.mood === 'hope' || p.mood === 'sombre' ? 1.2 : 0.7;
      g.voices.forEach((o, i) => o.frequency.setTargetAtTime(hz(chord[i]), at, glide));
      g.shadowOsc.frequency.setTargetAtTime(hz(chord[3] + 1), at, glide);
      // a glint from the chord on some bars (more often when calm)
      if (Math.random() < (p.mood === 'hope' ? 0.8 : 0.55 - 0.3 * p.tension)) {
        const t0 = at + p.chordSecs * (0.25 + 0.5 * Math.random());
        g.bellOsc.frequency.setValueAtTime(hz(chord[1 + Math.floor(Math.random() * 3)] + 24), t0);
        g.bellEnv.gain.setValueAtTime(0, t0);
        g.bellEnv.gain.linearRampToValueAtTime(0.022, t0 + 0.04);
        g.bellEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
        g.bellEnv.gain.setValueAtTime(0, t0 + 2.7);
      }
      g.chordIx += 1;
      g.nextChord = at + p.chordSecs;
    }
    if (p.bpm <= 0) {
      g.nextBeat = ahead;
      return;
    }
    const beat = 60 / p.bpm;
    let n = 0;
    while (g.nextBeat < ahead && n++ < 8) {
      const t0 = Math.max(now, g.nextBeat);
      // a heartbeat: the second beat of each pair softer
      const lvl = 0.16 * p.pulse * (g.chordIx % 2 === 0 && Math.round(t0 / beat) % 2 ? 0.6 : 1);
      g.pulseOsc.frequency.setValueAtTime(96, t0);
      g.pulseOsc.frequency.exponentialRampToValueAtTime(52, t0 + 0.18);
      g.pulseEnv.gain.setValueAtTime(0, t0);
      g.pulseEnv.gain.linearRampToValueAtTime(lvl, t0 + 0.02);
      g.pulseEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(0.5, beat * 0.8));
      g.pulseEnv.gain.setValueAtTime(0, t0 + Math.min(0.52, beat * 0.82));
      g.nextBeat = t0 + beat;
    }
  }
}
