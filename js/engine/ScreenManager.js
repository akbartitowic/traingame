/**
 * ScreenManager — Manages game screens and transitions between them.
 * Handles title, level select, game, and victory screens.
 */

import { Easing } from './AnimationSystem.js';

/**
 * @typedef {object} Screen
 * @property {string} id - Unique screen identifier.
 * @property {Function} init - Called when screen is first created.
 * @property {Function} enter - Called when screen becomes active.
 * @property {Function} exit - Called when screen is leaving.
 * @property {Function} update - Called every frame while active.
 * @property {Function} render - Called every frame while active.
 * @property {Function} [handleInput] - Called for input events while active.
 * @property {Function} [resize] - Called when canvas resizes.
 * @property {Function} [destroy] - Called when screen is removed.
 */

export class ScreenManager {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./AnimationSystem.js').AnimationSystem} animationSystem
   */
  constructor(ctx, animationSystem) {
    this.ctx = ctx;
    this.animationSystem = animationSystem;

    /** @type {Map<string, Screen>} */
    this.screens = new Map();

    /** @type {Screen|null} */
    this.currentScreen = null;
    this.currentScreenId = '';

    /** @type {Screen|null} */
    this.previousScreen = null;

    // Transition state
    this._transitioning = false;
    this._transitionAlpha = 0;
    this._transitionTarget = '';
    this._transitionData = null;
    this._transitionPhase = 'none'; // 'fadeOut' | 'fadeIn' | 'none'

    // Transition duration (ms per phase)
    this.transitionDuration = 300;
  }

  /**
   * Register a screen.
   * @param {string} id - Screen ID (e.g. 'title', 'levelSelect', 'game', 'victory').
   * @param {Screen} screen - Screen object with lifecycle methods.
   */
  register(id, screen) {
    screen.id = id;
    this.screens.set(id, screen);
  }

  /**
   * Transition to a new screen with fade effect.
   * @param {string} screenId - Target screen ID.
   * @param {object} [data] - Optional data to pass to the new screen's enter().
   */
  goTo(screenId, data = null) {
    if (this._transitioning) return;
    if (!this.screens.has(screenId)) {
      console.error(`[ScreenManager] Screen "${screenId}" not registered.`);
      return;
    }

    this._transitioning = true;
    this._transitionTarget = screenId;
    this._transitionData = data;

    if (this.currentScreen) {
      // Fade out current screen, then fade in new one
      this._transitionPhase = 'fadeOut';
      this._transitionAlpha = 0;

      const fadeObj = { alpha: 0 };
      this.animationSystem.tween(fadeObj, { alpha: 1 }, {
        duration: this.transitionDuration,
        easing: Easing.easeInOutQuad,
        onUpdate: () => {
          this._transitionAlpha = fadeObj.alpha;
        },
        onComplete: () => {
          this._switchScreen();
          this._fadeIn();
        },
      });
    } else {
      // No current screen — just fade in directly
      this._switchScreen();
      this._fadeIn();
    }
  }

  /** @private Fade in the new screen. */
  _fadeIn() {
    this._transitionPhase = 'fadeIn';
    this._transitionAlpha = 1;

    const fadeObj = { alpha: 1 };
    this.animationSystem.tween(fadeObj, { alpha: 0 }, {
      duration: this.transitionDuration,
      easing: Easing.easeInOutQuad,
      onUpdate: () => {
        this._transitionAlpha = fadeObj.alpha;
      },
      onComplete: () => {
        this._transitionPhase = 'none';
        this._transitionAlpha = 0;
        this._transitioning = false;
      },
    });
  }

  /** @private Actually switch the current screen. */
  _switchScreen() {
    // Exit old screen
    if (this.currentScreen && this.currentScreen.exit) {
      this.currentScreen.exit();
    }

    this.previousScreen = this.currentScreen;
    this.currentScreenId = this._transitionTarget;
    this.currentScreen = this.screens.get(this._transitionTarget);

    // Enter new screen
    if (this.currentScreen.enter) {
      this.currentScreen.enter(this._transitionData);
    }
  }

  /**
   * Go back to the previous screen.
   * @param {object} [data] - Optional data.
   */
  goBack(data = null) {
    if (this.previousScreen) {
      this.goTo(this.previousScreen.id, data);
    }
  }

  /**
   * Update current screen + transition.
   * @param {number} deltaTime - Milliseconds since last frame.
   */
  update(deltaTime) {
    if (this.currentScreen && this.currentScreen.update) {
      this.currentScreen.update(deltaTime);
    }
  }

  /**
   * Render current screen + transition overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  render(ctx, canvasWidth, canvasHeight) {
    // Render current screen
    if (this.currentScreen && this.currentScreen.render) {
      this.currentScreen.render(ctx);
    }

    // Render transition overlay (dark fade)
    if (this._transitionAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this._transitionAlpha;
      ctx.fillStyle = '#1a0533'; // Deep purple-black for kid-friendly feel
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  }

  /**
   * Forward input to current screen.
   * @param {object} event - Input event from InputManager.
   */
  handleInput(event) {
    if (this._transitioning) return; // Block input during transitions
    if (this.currentScreen && this.currentScreen.handleInput) {
      this.currentScreen.handleInput(event);
    }
  }

  /**
   * Notify current screen of resize.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    if (this.currentScreen && this.currentScreen.resize) {
      this.currentScreen.resize(width, height);
    }
  }

  /** @returns {boolean} True if currently transitioning between screens. */
  get isTransitioning() {
    return this._transitioning;
  }
}
