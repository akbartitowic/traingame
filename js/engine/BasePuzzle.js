/**
 * BasePuzzle — Base class for all puzzle types.
 * Defines the lifecycle and common utilities for puzzles.
 */

export class BasePuzzle {
  /**
   * @param {import('./GameEngine.js').GameEngine} engine 
   * @param {object} levelConfig 
   */
  constructor(engine, levelConfig) {
    this.engine = engine;
    this.levelConfig = levelConfig;
    
    // Standard metrics
    this.moves = 0;
    this.hintsUsed = 0;
    this.startTime = performance.now();
    
    // State
    this.isSolved = false;
    this.isInteractive = true;
    
    // Bounds for gameplay area (defaults to center of screen)
    this.bounds = {
      x: 100,
      y: 100,
      width: 600,
      height: 400
    };
  }

  /**
   * Initialize puzzle state.
   */
  init() {
    // Override in subclasses
  }

  /**
   * Called every frame.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    // Override in subclasses
  }

  /**
   * Render the puzzle to the canvas.
   * @param {CanvasRenderingContext2D} ctx 
   */
  render(ctx) {
    // Override in subclasses
  }

  /**
   * Handle user input events.
   * @param {import('./InputManager.js').PointerEvent} event 
   */
  handleInput(event) {
    if (!this.isInteractive || this.isSolved) return;
    // Override in subclasses
  }

  /**
   * Check if the win condition is met.
   * @returns {boolean}
   */
  checkWinCondition() {
    return false; // Override in subclasses
  }

  /**
   * Trigger a hint for the user.
   */
  showHint() {
    this.hintsUsed++;
    // Override in subclasses
  }

  /**
   * Get the current score / result object.
   * @returns {{ moves: number, time: number, hintsUsed: number, stars: number }}
   */
  getResult() {
    const timeSpent = Math.floor((performance.now() - this.startTime) / 1000);
    
    // Simple 3-star logic based on moves and hints
    // Override in subclasses for puzzle-specific logic if needed
    let stars = 3;
    
    if (this.moves > this.levelConfig.targetMoves * 1.5 || this.hintsUsed > 0) {
      stars = 2;
    }
    if (this.moves > this.levelConfig.targetMoves * 2 || this.hintsUsed > 2) {
      stars = 1;
    }
    
    // Minimum 1 star for completion
    stars = Math.max(1, stars);

    return {
      moves: this.moves,
      time: timeSpent,
      hintsUsed: this.hintsUsed,
      stars: stars
    };
  }

  /**
   * Called when puzzle is complete and should clean up.
   */
  destroy() {
    // Override in subclasses
  }
}
