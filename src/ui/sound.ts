// The optional soundtrack: the team's track "Conflits frontaliers" (public/audio, made with Suno), looped,
// played through the Web Audio API so its tone follows the world: almost untouched while calm, slightly veiled
// as tension rises (AI power up, US–China cooperation down) and at the tipping point, darker after a bad
// ending, fully open after a good one. Soft one-shot cues (new round, request, Breaking news) are synthesised.
//
// Off by default. The player turns it on with the header's "Sound" toggle (a user gesture: the audio context
// is only ever created inside one). The choice and the volume are remembered when storage allows. The music
// fades out when the game is paused or the tab is hidden, and every change glides: no sudden loud sound.
// A handful of audio nodes, created when the music starts and released (context closed) when it stops; the
// file is fetched only when the player turns the sound on.
//
// `musicFor` is the pure part (world → musical parameters), unit-tested; `Soundtrack` plays it.

import { t } from '../i18n';
import { esc } from './format';

/** "Sound on" / "Sound off" (the toggle's name; its visible state word is stateWord). */
const soundName = (on: boolean) => (on ? t('ui.sound.on', 'Sound on') : t('ui.sound.off', 'Sound off'));
const stateWord = (on: boolean) => (on ? t('ui.sound.stateOn', 'on') : t('ui.sound.stateOff', 'off'));

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
/** The music: "Conflits frontaliers", made by the team with Suno, served with the site (same origin, so the CSP's default-src 'self' covers it). */
const TRACK = `${import.meta.env.BASE_URL}audio/conflits-frontaliers.mp3`;

/** How open the tone filter is, per mood: the track plays almost untouched while calm, slightly veiled as tension
 * rises and at the tipping point, darker after a bad ending, fully open after a good one. */
function toneFor(p: MusicParams): number {
  switch (p.mood) {
    case 'hope':
      return 18000;
    case 'sombre':
      return 1400;
    case 'tipped':
      return 3200;
    default:
      return lerp(16000, 6000, p.tension);
  }
}

interface Graph {
  ctx: Ctx;
  master: GainNode;
  tone: BiquadFilterNode;
  audio: HTMLAudioElement;
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
      else if (this.g.ctx.state === 'suspended' || this.g.audio.paused) this.sync();
    };
    for (const type of ['click', 'keydown', 'touchend']) document.addEventListener(type, unlock, true);
    // the volume popover, opened by a click or tap (see bind): a tap or click outside closes it
    document.addEventListener('pointerdown', (ev) => {
      for (const box of this.controls) if (box.classList.contains('open') && !box.contains(ev.target as Node)) this.openPop(box, false);
    });
  }

  /** Open or close a control's volume popover. It also shows on hover and keyboard focus (see styles.css); once
   *  closed by Escape or an outside tap it stays closed until the pointer comes back or the focus leaves and returns. */
  private openPop(box: HTMLElement, open: boolean) {
    box.classList.toggle('open', open && this.on);
    box.classList.toggle('shut', !open);
  }

  get supported() {
    return !!AudioCtor();
  }
  get enabled() {
    return this.on;
  }

  /** The header (or end page) controls: a toggle button and, while on, a volume slider that drops down under the
   * button (so the header keeps its rows): on hover or keyboard focus, and when a click or tap turns the sound on.
   * On touch screens (no hover; iOS does not focus a tapped button) a tap while the sound is on and the slider
   * closed opens the slider; the next tap turns the sound off. A tap outside or Escape closes it.
   * On phones the button is icon-only: a speaker with waves when on, crossed out when off; its name says
   * "Sound on" or "Sound off". */
  html(): string {
    if (!this.supported) return '';
    return `<div class="snd" role="group" aria-label="${esc(t('ui.sound.group', 'Soundtrack'))}">
      <button type="button" class="snd-btn" data-snd-toggle aria-label="${esc(soundName(this.on))}" title="${esc(t('ui.sound.word', 'Sound'))}" aria-pressed="${this.on}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="snd-wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="snd-mute" d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="snd-word">${esc(t('ui.sound.word', 'Sound'))}</span> <span class="snd-state">${esc(stateWord(this.on))}</span></button>
      <label class="snd-pop" ${this.on ? '' : 'hidden'}><span class="snd-vl">${esc(t('ui.sound.volume', 'Music volume'))}</span><input type="range" class="snd-vol" data-snd-vol min="0" max="100" step="5" value="${this.volume}" aria-valuetext="${this.volume}%" /></label>
    </div>`;
  }

  /** Wire the controls rendered by `html()` inside `root`. */
  bind(root: ParentNode) {
    const box = root.querySelector<HTMLElement>('.snd');
    if (!box) return;
    this.controls = this.controls.filter((c) => c.isConnected);
    this.controls.push(box);
    box.querySelector('[data-snd-toggle]')?.addEventListener('click', (ev) => {
      const type = (ev as PointerEvent).pointerType;
      const touch = type === 'touch' || type === 'pen' || (type === undefined && matchMedia('(hover: none)').matches);
      if (touch && this.on && !box.classList.contains('open')) return this.openPop(box, true);
      this.setOn(!this.on);
      this.openPop(box, this.on);
    });
    box.addEventListener('mouseenter', () => box.classList.remove('shut'));
    // a keyboard user who tabs to the slider sees it again
    box.addEventListener('focusin', (ev) => {
      if ((ev.target as HTMLElement).matches('[data-snd-vol]')) box.classList.remove('shut');
    });
    box.addEventListener('focusout', (ev) => {
      if (!box.contains(ev.relatedTarget as Node | null)) box.classList.remove('shut');
    });
    box.addEventListener('keydown', (ev) => {
      // focus is inside, so the slider shows (unless already closed)
      if (ev.key !== 'Escape' || !this.on || box.classList.contains('shut')) return;
      // closes the slider only (not the decisions or a dialog behind it)
      ev.stopPropagation();
      this.openPop(box, false);
      box.querySelector<HTMLElement>('[data-snd-toggle]')?.focus();
    });
    box.querySelector<HTMLInputElement>('[data-snd-vol]')?.addEventListener('input', (ev) => this.setVolume(Number((ev.target as HTMLInputElement).value)));
  }

  setOn(on: boolean) {
    this.on = on;
    save(KEY_ON, on ? 'on' : 'off');
    for (const box of this.controls) {
      const btn = box.querySelector('[data-snd-toggle]');
      btn?.setAttribute('aria-pressed', String(on));
      // the name carries the state too (it matches the visible "Sound on"; on phones the button is icon-only)
      btn?.setAttribute('aria-label', soundName(on));
      const st = box.querySelector('.snd-state');
      if (st) st.textContent = stateWord(on);
      const pop = box.querySelector<HTMLElement>('.snd-pop');
      if (pop) pop.hidden = !on;
      if (!on) this.openPop(box, false);
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

  /** The world moved: the music's tone follows, gliding (the track itself plays on). */
  setWorld(w: MusicWorld) {
    this.world = { ...w };
    this.p = musicFor(this.world);
    const g = this.g;
    if (!g) return;
    const slow = this.p.mood === 'hope' || this.p.mood === 'sombre' ? 2.5 : 1.2;
    g.tone.frequency.setTargetAtTime(toneFor(this.p), g.ctx.currentTime, slow);
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

  /** Fade to where the music should be: playing at the volume, or silent and paused. */
  private sync() {
    const g = this.g;
    if (!g) return;
    const t = g.ctx.currentTime;
    g.master.gain.cancelScheduledValues(t);
    g.master.gain.setValueAtTime(g.master.gain.value, t);
    if (this.audible()) {
      void g.ctx.resume().then(() => {
        if (this.g !== g) return;
        if (g.audio.paused) void g.audio.play().catch(() => undefined);
        g.master.gain.setTargetAtTime(this.level(), g.ctx.currentTime, FADE / 3);
      });
    } else {
      g.master.gain.setTargetAtTime(0, t, FADE / 3);
      setTimeout(() => {
        if (this.g !== g || this.audible()) return;
        g.audio.pause();
        if (g.ctx.state === 'running') void g.ctx.suspend();
      }, FADE * 1000 + 100);
    }
  }

  private start() {
    if (this.g) return this.sync();
    const Ctor = AudioCtor();
    if (!Ctor || typeof Audio === 'undefined') return;
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
    // the track, looped, through one low-pass that darkens or brightens it with the world
    const audio = new Audio();
    audio.src = TRACK;
    audio.loop = true;
    audio.preload = 'auto';
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.5;
    tone.frequency.value = toneFor(this.p);
    let source: MediaElementAudioSourceNode;
    try {
      source = ctx.createMediaElementSource(audio);
    } catch {
      void ctx.close().catch(() => undefined);
      return;
    }
    source.connect(tone).connect(master);
    this.g = { ctx, master, tone, audio };
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
    setTimeout(() => {
      g.audio.pause();
      g.audio.removeAttribute('src');
      g.audio.load();
      void g.ctx.close().catch(() => undefined);
    }, FADE * 1000 + 200);
  }
}
