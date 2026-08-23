/**
 * Zero-dependency Web Audio API Sound Effects Synthesizer
 * Provides crisp audio cues for actions: present, absent, celebrations, and tab clicks.
 */

class SoundEffectsEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mits_sound_enabled');
      this.enabled = saved !== null ? saved === 'true' : true;
    }
  }

  init() {
    if (typeof window === 'undefined') return false;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return !!this.audioCtx;
  }

  toggleSound(forceState) {
    if (forceState !== undefined) {
      this.enabled = forceState;
    } else {
      this.enabled = !this.enabled;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('mits_sound_enabled', String(this.enabled));
    }
    return this.enabled;
  }

  isSoundEnabled() {
    return this.enabled;
  }

  playPresentSound() {
    if (!this.enabled || !this.init()) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignore audio synthesis errors on restricted environments
    }
  }

  playAbsentSound() {
    if (!this.enabled || !this.init()) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(220.00, now + 0.18); // A3

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  playClickSound() {
    if (!this.enabled || !this.init()) return;
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  playCelebrationFanfare() {
    if (!this.enabled || !this.init()) return;
    try {
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
        { freq: 783.99, time: 0.24, dur: 0.14 }, // G5
        { freq: 1046.50, time: 0.38, dur: 0.45 }, // C6
      ];

      const now = this.audioCtx.currentTime;

      notes.forEach((n) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.exponentialRampToValueAtTime(0.2, now + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.02);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundFx = new SoundEffectsEngine();
