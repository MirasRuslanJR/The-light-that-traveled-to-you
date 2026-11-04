// Generative sound, Web Audio only: no audio files.
// A slow pad that opens up in space, a breath of air on Earth, and a soft bell for every real star
// the light front touches. Pitch comes from the star's colour: hotter, bluer stars ring higher.

const SCALE = [0, 2, 4, 7, 9];                 // major pentatonic: nothing can clash
const ROOT = 146.83;                           // D3
const noteHz = (step) => ROOT * Math.pow(2, (SCALE[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

function impulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function createAudio() {
  let ctx = null, master, pad, padFilter, air, airGain, reverb, wet, voices = 0;
  let enabled = true, started = false;
  let lastChime = 0;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 4.5, 2.6);
    wet = ctx.createGain(); wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    // Pad: root, fifth and ninth, each a pair of slightly detuned oscillators.
    pad = ctx.createGain(); pad.gain.value = 0.0;
    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass'; padFilter.frequency.value = 420; padFilter.Q.value = 0.4;
    pad.connect(padFilter);
    padFilter.connect(master);
    padFilter.connect(reverb);
    [ROOT / 2, ROOT * 0.75, ROOT * 1.125].forEach((f, k) => {
      [-4, 4].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = k === 0 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = cents;
        const g = ctx.createGain(); g.gain.value = k === 0 ? 0.32 : 0.12;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + k * 0.031;
        const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.05;
        lfo.connect(lfoAmt).connect(g.gain);
        o.connect(g).connect(pad);
        o.start(); lfo.start();
      });
    });

    // Air: pink-ish noise through a slowly wandering band-pass.
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < nd.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + 0.029591 * w; b1 = 0.985 * b1 + 0.032534 * w; b2 = 0.95 * b2 + 0.048056 * w;
      nd[i] = (b0 + b1 + b2) * 0.9;
    }
    air = ctx.createBufferSource(); air.buffer = nb; air.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.7;
    const sweep = ctx.createOscillator(); sweep.frequency.value = 0.04;
    const sweepAmt = ctx.createGain(); sweepAmt.gain.value = 350;
    sweep.connect(sweepAmt).connect(bp.frequency);
    airGain = ctx.createGain(); airGain.gain.value = 0;
    air.connect(bp).connect(airGain).connect(master);
    air.start(); sweep.start();

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else if (enabled) ctx.resume();
    });
    return true;
  }

  const now = () => ctx.currentTime;
  const ramp = (param, v, t = 1.5) => { param.cancelScheduledValues(now()); param.setTargetAtTime(v, now(), t / 3); };

  return {
    get enabled() { return enabled; },
    /** Must be called from a user gesture (click / submit). */
    start() {
      if (!started) { if (!build()) return; started = true; }
      if (ctx.state === 'suspended') ctx.resume();
      if (enabled) ramp(master.gain, 0.9, 2.5);
      ramp(pad.gain, 0.55, 4);
    },
    setEnabled(on) {
      enabled = on;
      if (!started) return;
      if (on) { ctx.resume(); ramp(master.gain, 0.9, 1.2); } else ramp(master.gain, 0, 0.6);
    },
    /** Continuous mood: earth 0..1 (standing on the ground), space 0..1 (out among the stars). */
    mood(earth, space) {
      if (!started) return;
      padFilter.frequency.setTargetAtTime(420 + 1500 * space, now(), 0.6);
      airGain.gain.setTargetAtTime(0.05 * earth, now(), 0.8);
    },
    /** A soft bell: temp 0 (red) .. 1 (blue), bright 0..1, pan -1..1. */
    chime(temp, bright, pan = 0) {
      if (!started || !enabled || voices > 14) return;
      const t = now();
      if (t - lastChime < 0.045) return;          // a light front sweeps many stars at once: keep it a shimmer
      lastChime = t;
      voices++;
      const step = Math.round(temp * 9) + (bright > 0.7 ? 5 : 0);
      const f = noteHz(step) * 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05 + 0.1 * bright, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 + bright * 1.5);
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) p.pan.value = Math.max(-0.9, Math.min(0.9, pan));
      const out = p ? (g.connect(p), p) : g;
      out.connect(master); out.connect(reverb);
      [[1, 'sine', 1], [2.76, 'sine', 0.18], [5.4, 'sine', 0.06]].forEach(([mult, type, amp]) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mult;
        const a = ctx.createGain(); a.gain.value = amp;
        o.connect(a).connect(g);
        o.start(t); o.stop(t + 4.5);
        if (mult === 1) o.onended = () => { voices--; };
      });
    },
    /** One long, clear tone for the star the light is heading to. */
    bell() {
      if (!started || !enabled) return;
      const t = now();
      [[noteHz(5), 0.16], [noteHz(7), 0.08], [noteHz(10), 0.05]].forEach(([f, amp], k) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + k * 0.12);
        g.gain.linearRampToValueAtTime(amp, t + k * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
        o.connect(g); g.connect(master); g.connect(reverb);
        o.start(t + k * 0.12); o.stop(t + 7.2);
      });
    },
    /** Rewinding time: a breath of filtered noise sweeping downward. */
    whoosh(seconds = 2.4) {
      if (!started || !enabled) return;
      const t = now();
      const src = ctx.createBufferSource(); src.buffer = air.buffer;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(180, t + seconds);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + seconds * 0.4); g.gain.linearRampToValueAtTime(0, t + seconds);
      src.connect(f).connect(g); g.connect(master); g.connect(reverb);
      src.start(t); src.stop(t + seconds + 0.1);
    },
  };
}
