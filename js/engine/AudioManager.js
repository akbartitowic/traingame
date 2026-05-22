/**
 * AudioManager — Hybrid audio system: loads WAV files + Web Audio API fallback.
 * Preloads all sound assets for instant playback.
 * Supports SFX and music with independent enable/disable controls.
 */

/** Sound asset definitions: name → file path */
const SOUND_FILES = {
  click:      'assets/audio/click.wav',
  snap:       'assets/audio/snap.wav',
  success:    'assets/audio/success.wav',
  error:      'assets/audio/error.wav',
  whistle:    'assets/audio/whistle.wav',
  fanfare:    'assets/audio/fanfare.wav',
  star:       'assets/audio/star.wav',
  button:     'assets/audio/button.wav',
  chug:       'assets/audio/chug.wav',
  pop:        'assets/audio/pop.wav',
  slide:      'assets/audio/slide.wav',
  correct:    'assets/audio/correct.wav',
  wrong:      'assets/audio/wrong.wav',
  levelstart: 'assets/audio/levelstart.wav',
  hint:       'assets/audio/hint.wav',
};

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

    /** @type {Map<string, AudioBuffer>} Decoded audio buffers */
    this._buffers = new Map();
    this._loaded = false;
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

      // Load audio buffers if not already loaded
      if (!this._loaded) {
        this._loadAllSounds();
      }
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

  /**
   * Preload all sound files into AudioBuffers.
   * @returns {Promise<void>}
   */
  async _loadAllSounds() {
    if (!this.ctx) return;

    const entries = Object.entries(SOUND_FILES);
    const promises = entries.map(async ([name, path]) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this._buffers.set(name, audioBuffer);
      } catch (err) {
        console.warn(`[AudioManager] Failed to load ${name}:`, err);
      }
    });

    await Promise.all(promises);
    this._loaded = true;
    console.log(`[AudioManager] Loaded ${this._buffers.size}/${entries.length} sounds`);
  }

  /**
   * Preload sounds without requiring AudioContext (called during asset loading).
   * AudioContext will be created on first user gesture.
   * @returns {Promise<string[]>} List of sound file paths for service worker caching.
   */
  getSoundPaths() {
    return Object.values(SOUND_FILES);
  }

  /**
   * Play a loaded sound by name.
   * @param {string} name - Sound name (key from SOUND_FILES).
   * @param {number} [volume=1] - Volume multiplier 0-1.
   */
  _playBuffer(name, volume = 1) {
    if (!this._canPlay()) return;

    const buffer = this._buffers.get(name);
    if (!buffer) {
      // Fallback to procedural if file not loaded
      this._playProceduralFallback(name);
      return;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this._sfxGain);
    source.start(0);
  }

  // ============================================================
  // Public Play Methods
  // ============================================================

  /** Play a short click sound — for piece placement. */
  playClick() { this._playBuffer('click'); }

  /** Play a snap sound — piece snapping into grid. */
  playSnap() { this._playBuffer('snap'); }

  /** Play a success chime — ascending three notes. */
  playSuccess() { this._playBuffer('success'); }

  /** Play an error/bonk sound — single low tone. */
  playError() { this._playBuffer('error'); }

  /** Play a train whistle — frequency sweep. */
  playWhistle() { this._playBuffer('whistle'); }

  /** Play a level complete fanfare. */
  playFanfare() { this._playBuffer('fanfare'); }

  /** Play a star earning sound. */
  playStar() { this._playBuffer('star'); }

  /** Play a button press sound. */
  playButton() { this._playBuffer('button'); }

  /** Play a train chugging sound. */
  playChug() { this._playBuffer('chug'); }

  /** Play a pop sound — UI element appearing. */
  playPop() { this._playBuffer('pop'); }

  /** Play a sliding sound — piece being dragged. */
  playSlide() { this._playBuffer('slide'); }

  /** Play a correct match sound. */
  playCorrect() { this._playBuffer('correct'); }

  /** Play a wrong/gentle buzz sound. */
  playWrong() { this._playBuffer('wrong'); }

  /** Play a level start jingle. */
  playLevelStart() { this._playBuffer('levelstart'); }

  /** Play a hint notification. */
  playHint() { this._playBuffer('hint'); }

  // ============================================================
  // Toggle Controls
  // ============================================================

  /** Toggle sound effects on/off. @returns {boolean} New state. */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /** Toggle music on/off. @returns {boolean} New state. */
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

  // ============================================================
  // Internal
  // ============================================================

  /** @private Check if we can play sounds. */
  _canPlay() {
    return this._initialized && this.soundEnabled && this.ctx;
  }

  /**
   * @private Procedural fallback when WAV file isn't loaded yet.
   * @param {string} name - Sound name.
   */
  _playProceduralFallback(name) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    switch (name) {
      case 'click':
      case 'snap':
        this._tone(800, 0.06, 'sine', 0.3, now);
        break;
      case 'success':
      case 'correct':
        this._tone(523, 0.15, 'sine', 0.25, now);
        this._tone(659, 0.15, 'sine', 0.25, now + 0.12);
        this._tone(784, 0.25, 'sine', 0.3, now + 0.24);
        break;
      case 'error':
      case 'wrong':
        this._tone(200, 0.15, 'triangle', 0.2, now);
        break;
      case 'button':
      case 'pop':
        this._tone(440, 0.05, 'sine', 0.15, now);
        break;
      case 'star':
        this._tone(1047, 0.1, 'sine', 0.2, now);
        this._tone(1319, 0.2, 'sine', 0.25, now + 0.08);
        break;
      case 'fanfare':
      case 'levelstart':
        [523, 587, 659, 784, 880, 1047].forEach((f, i) => {
          this._tone(f, 0.12, 'sine', 0.2, now + i * 0.1);
        });
        break;
      case 'whistle':
      case 'hint':
        this._tone(800, 0.3, 'sine', 0.2, now);
        break;
      default:
        this._tone(440, 0.1, 'sine', 0.15, now);
    }
  }

  /**
   * @private Play a single procedural tone.
   */
  _tone(freq, dur, type, vol, startTime) {
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
