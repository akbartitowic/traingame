/**
 * GameEngine — Main game engine coordinating all subsystems.
 * Runs the game loop, manages state, and connects all engine modules.
 */

import { AnimationSystem } from './AnimationSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { InputManager } from './InputManager.js';
import { ScreenManager } from './ScreenManager.js';
import { StorageManager } from './StorageManager.js';
import { AudioManager } from './AudioManager.js';

/** Logical game canvas dimensions. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export class GameEngine {
  constructor() {
    // Canvas
    /** @type {HTMLCanvasElement} */
    this.canvas = null;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = null;

    // Subsystems
    this.animation = new AnimationSystem();
    this.particles = new ParticleSystem();
    this.storage = new StorageManager();
    this.audio = new AudioManager();
    /** @type {InputManager} */
    this.input = null;
    /** @type {ScreenManager} */
    this.screens = null;

    // Game state
    this.state = {
      currentScreen: 'title',
      currentLevel: 1,
      levelProgress: {},
      settings: { soundEnabled: true, musicEnabled: true },
    };

    // Loop state
    this._running = false;
    this._rafId = null;
    this._lastTime = 0;
    this._accumulator = 0;
    this._frameTime = 1000 / 60; // Target 60fps

    // Asset loading
    /** @type {Map<string, HTMLImageElement>} */
    this.images = new Map();
    this._loadProgress = 0;
    this._totalAssets = 0;
    this._loadedAssets = 0;
  }

  /**
   * Initialize the game engine.
   * Call this after DOM is ready.
   */
  async init() {
    // Get canvas
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set logical size
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    // Fit canvas to window
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());

    // Load saved state
    const saved = this.storage.load();
    this.state = {
      currentScreen: 'title',
      currentLevel: saved.lastPlayedLevel || 1,
      levelProgress: saved.levelProgress || {},
      settings: saved.settings || { soundEnabled: true, musicEnabled: true },
    };

    // Init subsystems
    this.input = new InputManager(this.canvas, GAME_WIDTH, GAME_HEIGHT);
    this.screens = new ScreenManager(this.ctx, this.animation);

    // Apply audio settings
    this.audio.applySettings(this.state.settings);

    // Connect input to screen manager
    this.input.onTap((e) => this.screens.handleInput({ ...e, type: 'tap' }));
    this.input.onDown((e) => this.screens.handleInput({ ...e, type: 'down' }));
    this.input.onMove((e) => this.screens.handleInput({ ...e, type: 'move' }));
    this.input.onUp((e) => this.screens.handleInput({ ...e, type: 'up' }));
    this.input.onDragStart((e) => this.screens.handleInput({ ...e, type: 'dragStart' }));
    this.input.onDrag((e) => this.screens.handleInput({ ...e, type: 'drag' }));
    this.input.onDragEnd((e) => this.screens.handleInput({ ...e, type: 'dragEnd' }));

    // Init audio on first user interaction
    const initAudio = () => {
      this.audio.init();
      this.audio.resume();
      document.removeEventListener('pointerdown', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('pointerdown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    // Load assets
    await this.loadAssets();
  }

  /**
   * Preload all game images.
   * Updates loading bar UI during load.
   */
  async loadAssets() {
    const assetList = [
      ['train_engine', 'assets/images/train_engine.png'],
      ['train_tracks', 'assets/images/train_tracks.png'],
      ['game_background', 'assets/images/game_background.png'],
      ['train_wagons', 'assets/images/train_wagons.png'],
      ['game_ui_elements', 'assets/images/game_ui_elements.png'],
      ['level_select_map', 'assets/images/level_select_map.png'],
      ['celebration_confetti', 'assets/images/celebration_confetti.png'],
      ['train_station', 'assets/images/train_station.png'],
      ['game_characters', 'assets/images/game_characters.png'],
      ['title_logo', 'assets/images/title_logo.png'],
      ['scenery_elements', 'assets/images/scenery_elements.png'],
    ];

    this._totalAssets = assetList.length;
    this._loadedAssets = 0;

    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    const promises = assetList.map(([name, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(name, img);
          this._loadedAssets++;
          this._loadProgress = this._loadedAssets / this._totalAssets;

          if (loadingBar) {
            loadingBar.style.width = `${this._loadProgress * 100}%`;
          }
          if (loadingText) {
            loadingText.textContent = `Memuat... ${Math.round(this._loadProgress * 100)}%`;
          }
          resolve();
        };
        img.onerror = () => {
          console.warn(`[GameEngine] Failed to load: ${src}`);
          this._loadedAssets++;
          this._loadProgress = this._loadedAssets / this._totalAssets;
          resolve(); // Don't block on missing assets
        };
        img.src = src;
      });
    });

    await Promise.all(promises);

    if (loadingText) {
      loadingText.textContent = 'Siap bermain! 🚂';
    }
  }

  /**
   * Get a loaded image by name.
   * @param {string} name - Asset name.
   * @returns {HTMLImageElement|null}
   */
  getImage(name) {
    return this.images.get(name) || null;
  }

  /**
   * Start the game loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Main game loop — called every frame via requestAnimationFrame.
   * @param {number} timestamp - High-resolution timestamp.
   * @private
   */
  _loop(timestamp) {
    if (!this._running) return;

    const deltaTime = Math.min(timestamp - this._lastTime, 50); // Cap at 50ms (20fps min)
    this._lastTime = timestamp;

    // Update
    this._update(deltaTime);

    // Render
    this._render();

    // Schedule next frame
    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  /**
   * Update all game systems.
   * @param {number} deltaTime - Milliseconds since last frame.
   * @private
   */
  _update(deltaTime) {
    this.animation.update(deltaTime);
    this.particles.update(deltaTime);
    this.screens.update(deltaTime);
  }

  /**
   * Render everything to canvas.
   * @private
   */
  _render() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B6E3F4');
    gradient.addColorStop(1, '#E8F5E9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Render current screen (with transition)
    this.screens.render(ctx, GAME_WIDTH, GAME_HEIGHT);

    // Render particles on top
    this.particles.render(ctx);
  }

  /**
   * Resize canvas to fit window while maintaining aspect ratio.
   * @private
   */
  _resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const targetRatio = GAME_WIDTH / GAME_HEIGHT;
    const containerRatio = containerWidth / containerHeight;

    let displayWidth, displayHeight;

    if (containerRatio > targetRatio) {
      // Window is wider — fit to height
      displayHeight = containerHeight;
      displayWidth = displayHeight * targetRatio;
    } else {
      // Window is taller — fit to width
      displayWidth = containerWidth;
      displayHeight = displayWidth / targetRatio;
    }

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Update input manager dimensions
    if (this.input) {
      this.input.updateDimensions(GAME_WIDTH, GAME_HEIGHT);
    }

    // Notify current screen
    if (this.screens) {
      this.screens.resize(GAME_WIDTH, GAME_HEIGHT);
    }
  }

  /**
   * Hide the loading screen and show the game.
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('active');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 400);
    }
  }

  /**
   * Save current settings to storage.
   */
  saveSettings() {
    this.storage.settings(this.state.settings);
  }

  /**
   * Complete a level and save progress.
   * @param {number} levelId - Level number.
   * @param {{ stars: number, moves: number, time: number, hintsUsed: number }} result
   */
  completeLevel(levelId, result) {
    this.storage.saveLevelProgress(levelId, result);
    this.state.levelProgress = this.storage.load().levelProgress;
  }
}
