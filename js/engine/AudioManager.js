/**
 * AudioManager — Web Audio API based sound effects generator.
 * All sounds are generated programmatically — no external audio files needed.
 * Supports SFX and music with independent enable/disable controls.
 */

export class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
    this._initialized = false;
    this._masterGain = null;
    this._sfxGain = null;
    this._musicGain = null;
  }

  /**
   * Initialize audio context. Must be called after a user gesture.
   */
  init() {
    if (this._initialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.connect(this.ctx.destination);

      this._sfxGain = this.ctx.createGain();
      this._sfxGain.connect(this._masterGain);

      this._musicGain = this.ctx.createGain();
      this._musicGain.connect(this._masterGain);

      this._initialized = true;
    } catch (err) {
      console.warn('[AudioManager] Web Audio not available:', err);
    }
  }

  /**
   * Resume audio context if suspended (mobile autoplay policy).
   */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /** Play a short click/snap sound — for piece placement. */
  playClick() {
    if (!this._canPlay()) return;
    this._playTone(800, 0.06, 'sine', 0.3);
  }

  /** Play a success chime — ascending three notes. */
  playSuccess() {
    if (!this._canPlay()) return;
    const now = this.ctx.currentTime;
    this._playToneAt(523, 0.15, 'sine', 0.25, now);        // C5
    this._playToneAt(659, 0.15, 'sine', 0.25, now + 0.12);  // E5
    this._playToneAt(784, 0.25, 'sine', 0.3, now + 0.24);   // G5
  }

  /** Play an error/bonk sound — single low tone. */
  playError() {
    if (!this._canPlay()) return;
    this._playTone(200, 0.15, 'triangle', 0.2);
  }

  /** Play a train whistle — frequency sweep. */
  playWhistle() {
    if (!this._canPlay()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(700, this.ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.8);
  }

  /** Play a level complete fanfare — happy ascending melody. */
  playFanfare() {
    if (!this._canPlay()) return;
    const now = this.ctx.currentTime;
    const notes = [523, 587, 659, 784, 880, 1047]; // C5 to C6
    notes.forEach((freq, i) => {
      this._playToneAt(freq, 0.12, 'sine', 0.2, now + i * 0.1);
    });
    // Final sustained note
    this._playToneAt(1047, 0.5, 'sine', 0.3, now + 0.6);
  }

  /** Play a star earning sound. */
  playStar() {
    if (!this._canPlay()) return;
    const now = this.ctx.currentTime;
    this._playToneAt(1047, 0.1, 'sine', 0.2, now);
    this._playToneAt(1319, 0.2, 'sine', 0.25, now + 0.08);
  }

  /** Play a button press sound. */
  playButton() {
    if (!this._canPlay()) return;
    this._playTone(440, 0.05, 'sine', 0.15);
  }

  /** Toggle sound effects. */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /** Toggle music. */
  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this._musicGain) {
      this._musicGain.gain.value = this.musicEnabled ? 1 : 0;
    }
    return this.musicEnabled;
  }

  /**
   * Apply saved settings.
   * @param {{ soundEnabled: boolean, musicEnabled: boolean }} settings
   */
  applySettings(settings) {
    this.soundEnabled = settings.soundEnabled;
    this.musicEnabled = settings.musicEnabled;
    if (this._musicGain) {
      this._musicGain.gain.value = this.musicEnabled ? 1 : 0;
    }
  }

  /** @private Check if we can play sounds. */
  _canPlay() {
    return this._initialized && this.soundEnabled && this.ctx;
  }

  /**
   * @private Play a single tone immediately.
   * @param {number} freq - Frequency in Hz.
   * @param {number} dur - Duration in seconds.
   * @param {OscillatorType} type - 'sine', 'triangle', 'square', 'sawtooth'.
   * @param {number} vol - Volume 0-1.
   */
  _playTone(freq, dur, type, vol) {
    this._playToneAt(freq, dur, type, vol, this.ctx.currentTime);
  }

  /**
   * @private Play a single tone at a specific time.
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} type
   * @param {number} vol
   * @param {number} startTime
   */
  _playToneAt(freq, dur, type, vol, startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }
}
