/**
 * AnimationSystem — Lightweight tweening engine for smooth game animations.
 * Supports easing functions, chaining, delays, and looping.
 */

/** Easing functions for different animation feels. */
export const Easing = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t) => {
    const s = 1.70158;
    return (t -= 1) * t * ((s + 1) * t + s) + 1;
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

/** Represents a single tween animation. */
class Tween {
  /**
   * @param {object} target - Object whose properties to animate.
   * @param {object} to - Target values { prop: endValue }.
   * @param {object} options - { duration, easing, delay, onUpdate, onComplete, loop }
   */
  constructor(target, to, options = {}) {
    this.target = target;
    this.to = to;
    this.duration = options.duration || 300;
    this.easingFn = options.easing || Easing.easeOutCubic;
    this.delay = options.delay || 0;
    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;
    this.loop = options.loop || false;
    this.yoyo = options.yoyo || false;

    this.from = {};
    this.elapsed = 0;
    this.delayRemaining = this.delay;
    this.completed = false;
    this.paused = false;
    this._direction = 1; // 1 = forward, -1 = reverse (yoyo)

    // Capture starting values
    for (const prop in this.to) {
      this.from[prop] = target[prop] ?? 0;
    }
  }

  /**
   * Advance tween by deltaTime (ms).
   * @param {number} deltaTime - Milliseconds since last frame.
   * @returns {boolean} True if tween is still active.
   */
  update(deltaTime) {
    if (this.completed || this.paused) return !this.completed;

    // Handle delay
    if (this.delayRemaining > 0) {
      this.delayRemaining -= deltaTime;
      return true;
    }

    this.elapsed += deltaTime * this._direction;

    // Clamp progress
    let progress = Math.max(0, Math.min(1, this.elapsed / this.duration));
    const easedProgress = this.easingFn(progress);

    // Interpolate properties
    for (const prop in this.to) {
      const start = this.from[prop];
      const end = this.to[prop];
      this.target[prop] = start + (end - start) * easedProgress;
    }

    if (this.onUpdate) {
      this.onUpdate(this.target, easedProgress);
    }

    // Check completion
    if (progress >= 1) {
      if (this.yoyo) {
        this._direction = -1;
        this.elapsed = this.duration;
        if (this.loop) return true;
      }

      if (this.loop && !this.yoyo) {
        this.elapsed = 0;
        return true;
      }

      this.completed = true;
      if (this.onComplete) this.onComplete(this.target);
      return false;
    }

    if (this._direction === -1 && progress <= 0) {
      if (this.loop) {
        this._direction = 1;
        this.elapsed = 0;
        return true;
      }
      this.completed = true;
      if (this.onComplete) this.onComplete(this.target);
      return false;
    }

    return true;
  }

  /** Cancel this tween immediately. */
  cancel() {
    this.completed = true;
  }
}

/**
 * AnimationSystem — Manages a collection of active tweens.
 */
export class AnimationSystem {
  constructor() {
    /** @type {Tween[]} */
    this.tweens = [];
  }

  /**
   * Create and register a new tween.
   * @param {object} target - Object to animate.
   * @param {object} to - Target property values.
   * @param {object} [options] - Tween options.
   * @returns {Tween} The created tween (can be cancelled).
   */
  tween(target, to, options = {}) {
    const tw = new Tween(target, to, options);
    this.tweens.push(tw);
    return tw;
  }

  /**
   * Create a delayed callback (like setTimeout but synced to game loop).
   * @param {Function} callback - Function to call after delay.
   * @param {number} delayMs - Delay in milliseconds.
   * @returns {Tween}
   */
  delay(callback, delayMs) {
    const dummy = { _v: 0 };
    return this.tween(dummy, { _v: 1 }, {
      duration: 1,
      delay: delayMs,
      onComplete: callback,
    });
  }

  /**
   * Create a sequence of tweens on the same target.
   * @param {object} target - Object to animate.
   * @param {Array<{to: object, options: object}>} steps - Array of tween configs.
   * @returns {Tween} The last tween in the sequence.
   */
  sequence(target, steps) {
    let totalDelay = 0;
    let lastTween = null;

    for (const step of steps) {
      const options = { ...step.options, delay: totalDelay + (step.options?.delay || 0) };
      lastTween = this.tween(target, step.to, options);
      totalDelay += (step.options?.duration || 300) + (step.options?.delay || 0);
    }

    return lastTween;
  }

  /**
   * Update all active tweens.
   * @param {number} deltaTime - Milliseconds since last frame.
   */
  update(deltaTime) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const active = this.tweens[i].update(deltaTime);
      if (!active) {
        this.tweens.splice(i, 1);
      }
    }
  }

  /**
   * Cancel all tweens matching a target object.
   * @param {object} target
   */
  cancelFor(target) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (this.tweens[i].target === target) {
        this.tweens[i].cancel();
        this.tweens.splice(i, 1);
      }
    }
  }

  /** Cancel all active tweens. */
  cancelAll() {
    for (const tw of this.tweens) {
      tw.cancel();
    }
    this.tweens.length = 0;
  }

  /** @returns {number} Count of active tweens. */
  get activeCount() {
    return this.tweens.length;
  }
}
