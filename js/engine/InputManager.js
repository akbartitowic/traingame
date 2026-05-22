/**
 * InputManager — Unified mouse + touch input system with drag-and-drop.
 * Translates screen coordinates to canvas logical coordinates.
 * Provides a clean event interface for game puzzles.
 */

/**
 * @typedef {object} PointerEvent
 * @property {number} x - Logical X in canvas space.
 * @property {number} y - Logical Y in canvas space.
 * @property {number} rawX - Raw screen X.
 * @property {number} rawY - Raw screen Y.
 * @property {string} type - 'down' | 'move' | 'up' | 'tap'
 * @property {boolean} isDragging - True if currently dragging.
 */

export class InputManager {
  /**
   * @param {HTMLCanvasElement} canvas - The game canvas element.
   * @param {number} logicalWidth - Logical game width.
   * @param {number} logicalHeight - Logical game height.
   */
  constructor(canvas, logicalWidth, logicalHeight) {
    this.canvas = canvas;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;

    // State
    this.isDown = false;
    this.isDragging = false;
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { x: 0, y: 0 };
    this.lastPos = { x: 0, y: 0 };

    // Drag threshold (pixels in screen space)
    this.dragThreshold = 8;

    // Event callbacks
    this._onDown = null;
    this._onMove = null;
    this._onUp = null;
    this._onTap = null;
    this._onDragStart = null;
    this._onDrag = null;
    this._onDragEnd = null;

    // Bound handlers (for cleanup)
    this._boundHandlers = {};
    this._setupListeners();
  }

  /** Set callback for pointer down. */
  onDown(cb) { this._onDown = cb; }
  /** Set callback for pointer move (always fires when down). */
  onMove(cb) { this._onMove = cb; }
  /** Set callback for pointer up. */
  onUp(cb) { this._onUp = cb; }
  /** Set callback for tap (down + up without significant movement). */
  onTap(cb) { this._onTap = cb; }
  /** Set callback for drag start (when movement exceeds threshold). */
  onDragStart(cb) { this._onDragStart = cb; }
  /** Set callback for drag (continuous movement while dragging). */
  onDrag(cb) { this._onDrag = cb; }
  /** Set callback for drag end (release after dragging). */
  onDragEnd(cb) { this._onDragEnd = cb; }

  /**
   * Convert screen/client coordinates to canvas logical coordinates.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, y: number }}
   */
  screenToCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.logicalWidth / rect.width;
    const scaleY = this.logicalHeight / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  /**
   * Update logical dimensions (call when canvas resizes).
   * @param {number} logicalWidth
   * @param {number} logicalHeight
   */
  updateDimensions(logicalWidth, logicalHeight) {
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
  }

  /** @private */
  _setupListeners() {
    // --- Mouse events ---
    this._boundHandlers.mousedown = (e) => {
      e.preventDefault();
      this._handleDown(e.clientX, e.clientY);
    };
    this._boundHandlers.mousemove = (e) => {
      e.preventDefault();
      this._handleMove(e.clientX, e.clientY);
    };
    this._boundHandlers.mouseup = (e) => {
      e.preventDefault();
      this._handleUp(e.clientX, e.clientY);
    };

    // --- Touch events ---
    this._boundHandlers.touchstart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._handleDown(touch.clientX, touch.clientY);
    };
    this._boundHandlers.touchmove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._handleMove(touch.clientX, touch.clientY);
    };
    this._boundHandlers.touchend = (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this._handleUp(touch.clientX, touch.clientY);
    };
    this._boundHandlers.touchcancel = (e) => {
      this._handleUp(this.currentPos.x, this.currentPos.y);
    };

    this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    window.addEventListener('mousemove', this._boundHandlers.mousemove);
    window.addEventListener('mouseup', this._boundHandlers.mouseup);

    this.canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
    window.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    window.addEventListener('touchend', this._boundHandlers.touchend, { passive: false });
    window.addEventListener('touchcancel', this._boundHandlers.touchcancel);
  }

  /** @private */
  _handleDown(clientX, clientY) {
    const pos = this.screenToCanvas(clientX, clientY);
    this.isDown = true;
    this.isDragging = false;
    this.startPos = { ...pos };
    this.currentPos = { ...pos };
    this.lastPos = { ...pos };

    const event = this._makeEvent(pos, 'down');
    if (this._onDown) this._onDown(event);
  }

  /** @private */
  _handleMove(clientX, clientY) {
    const pos = this.screenToCanvas(clientX, clientY);
    this.lastPos = { ...this.currentPos };
    this.currentPos = { ...pos };

    if (!this.isDown) return;

    const event = this._makeEvent(pos, 'move');
    if (this._onMove) this._onMove(event);

    // Check drag threshold
    if (!this.isDragging) {
      const dx = pos.x - this.startPos.x;
      const dy = pos.y - this.startPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.dragThreshold) {
        this.isDragging = true;
        const dragEvent = this._makeEvent(pos, 'move');
        dragEvent.startX = this.startPos.x;
        dragEvent.startY = this.startPos.y;
        if (this._onDragStart) this._onDragStart(dragEvent);
      }
    }

    if (this.isDragging) {
      const dragEvent = this._makeEvent(pos, 'move');
      dragEvent.deltaX = pos.x - this.lastPos.x;
      dragEvent.deltaY = pos.y - this.lastPos.y;
      dragEvent.totalDeltaX = pos.x - this.startPos.x;
      dragEvent.totalDeltaY = pos.y - this.startPos.y;
      if (this._onDrag) this._onDrag(dragEvent);
    }
  }

  /** @private */
  _handleUp(clientX, clientY) {
    if (!this.isDown) return;

    const pos = this.screenToCanvas(clientX, clientY);
    const event = this._makeEvent(pos, 'up');

    if (this.isDragging) {
      event.startX = this.startPos.x;
      event.startY = this.startPos.y;
      if (this._onDragEnd) this._onDragEnd(event);
    } else {
      // It was a tap
      const tapEvent = this._makeEvent(this.startPos, 'tap');
      if (this._onTap) this._onTap(tapEvent);
    }

    if (this._onUp) this._onUp(event);

    this.isDown = false;
    this.isDragging = false;
  }

  /** @private */
  _makeEvent(pos, type) {
    return {
      x: pos.x,
      y: pos.y,
      rawX: pos.x,
      rawY: pos.y,
      type,
      isDragging: this.isDragging,
    };
  }

  /**
   * Check if a point is inside a rectangle.
   * Useful for hit-testing game objects.
   * @param {number} px - Point X.
   * @param {number} py - Point Y.
   * @param {number} rx - Rect X (top-left).
   * @param {number} ry - Rect Y (top-left).
   * @param {number} rw - Rect width.
   * @param {number} rh - Rect height.
   * @returns {boolean}
   */
  static hitTestRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /**
   * Check if a point is inside a circle.
   * @param {number} px - Point X.
   * @param {number} py - Point Y.
   * @param {number} cx - Circle center X.
   * @param {number} cy - Circle center Y.
   * @param {number} radius - Circle radius.
   * @returns {boolean}
   */
  static hitTestCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  }

  /** Remove all event listeners (cleanup). */
  destroy() {
    this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
    window.removeEventListener('mousemove', this._boundHandlers.mousemove);
    window.removeEventListener('mouseup', this._boundHandlers.mouseup);

    this.canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
    window.removeEventListener('touchmove', this._boundHandlers.touchmove);
    window.removeEventListener('touchend', this._boundHandlers.touchend);
    window.removeEventListener('touchcancel', this._boundHandlers.touchcancel);

    this._onDown = null;
    this._onMove = null;
    this._onUp = null;
    this._onTap = null;
    this._onDragStart = null;
    this._onDrag = null;
    this._onDragEnd = null;
  }
}
