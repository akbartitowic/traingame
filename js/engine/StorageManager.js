/**
 * StorageManager — Manages game progress persistence via localStorage.
 * All data is stored client-side only. No server, no login.
 */

const STORAGE_PREFIX = 'choo-choo-adventure-';

const DEFAULT_STATE = {
  levelProgress: {},
  settings: {
    soundEnabled: true,
    musicEnabled: true,
  },
  totalStars: 0,
  lastPlayedLevel: 0,
  firstLaunch: true,
};

export class StorageManager {
  constructor() {
    this._cache = null;
  }

  /**
   * Load entire saved state from localStorage.
   * @returns {object} Saved game state, or defaults if none exists.
   */
  load() {
    if (this._cache) return this._cache;

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'state');
      if (raw) {
        const parsed = JSON.parse(raw);
        this._cache = { ...DEFAULT_STATE, ...parsed };
      } else {
        this._cache = { ...DEFAULT_STATE };
      }
    } catch (err) {
      console.warn('[StorageManager] Failed to load, using defaults:', err);
      this._cache = { ...DEFAULT_STATE };
    }

    return this._cache;
  }

  /**
   * Save entire state to localStorage.
   * @param {object} state - The game state to persist.
   */
  save(state) {
    try {
      this._cache = { ...state };
      localStorage.setItem(STORAGE_PREFIX + 'state', JSON.stringify(state));
    } catch (err) {
      console.warn('[StorageManager] Failed to save:', err);
    }
  }

  /**
   * Save progress for a specific level.
   * Only updates if the new score is better than the existing one.
   * @param {number} levelId - Level number (1-10).
   * @param {object} result - { completed, stars, moves, time, hintsUsed }
   */
  saveLevelProgress(levelId, result) {
    const state = this.load();
    const existing = state.levelProgress[levelId];

    if (!existing || result.stars > existing.stars) {
      state.levelProgress[levelId] = {
        completed: true,
        stars: result.stars,
        bestMoves: result.moves,
        bestTime: result.time,
        hintsUsed: result.hintsUsed,
      };
    } else if (existing && result.moves < existing.bestMoves) {
      existing.bestMoves = result.moves;
      existing.bestTime = Math.min(existing.bestTime, result.time);
    }

    // Recalculate total stars
    state.totalStars = Object.values(state.levelProgress)
      .reduce((sum, level) => sum + (level.stars || 0), 0);

    state.lastPlayedLevel = levelId;
    this.save(state);
  }

  /**
   * Get progress for a specific level.
   * @param {number} levelId - Level number (1-10).
   * @returns {object|null} Level progress or null if not played.
   */
  getLevelProgress(levelId) {
    const state = this.load();
    return state.levelProgress[levelId] || null;
  }

  /**
   * Check if a level is unlocked.
   * Level 1 is always unlocked. Others require the previous level to be completed.
   * @param {number} levelId - Level number (1-10).
   * @returns {boolean}
   */
  isLevelUnlocked(levelId) {
    if (levelId === 1) return true;
    const prevProgress = this.getLevelProgress(levelId - 1);
    return prevProgress !== null && prevProgress.completed;
  }

  /**
   * Get the highest unlocked level number.
   * @returns {number}
   */
  getHighestUnlockedLevel() {
    for (let i = 10; i >= 1; i--) {
      if (this.isLevelUnlocked(i)) return i;
    }
    return 1;
  }

  /**
   * Get or update settings.
   * @param {object} [updates] - Optional settings to merge.
   * @returns {object} Current settings.
   */
  settings(updates) {
    const state = this.load();
    if (updates) {
      state.settings = { ...state.settings, ...updates };
      this.save(state);
    }
    return state.settings;
  }

  /**
   * Mark first launch as done.
   */
  markLaunched() {
    const state = this.load();
    state.firstLaunch = false;
    this.save(state);
  }

  /**
   * Check if this is the first launch.
   * @returns {boolean}
   */
  isFirstLaunch() {
    return this.load().firstLaunch;
  }

  /**
   * Get total stars earned across all levels.
   * @returns {number}
   */
  getTotalStars() {
    return this.load().totalStars;
  }

  /**
   * Reset all progress (for testing / user request).
   */
  resetAll() {
    this._cache = null;
    localStorage.removeItem(STORAGE_PREFIX + 'state');
  }
}
