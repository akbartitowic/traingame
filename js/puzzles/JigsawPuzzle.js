import { BasePuzzle } from '../engine/BasePuzzle.js';
import { Easing } from '../engine/AnimationSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/GameEngine.js';

export class JigsawPuzzle extends BasePuzzle {
  constructor(engine, levelConfig) {
    super(engine, levelConfig);
    
    this.cols = levelConfig.config.grid.cols;
    this.rows = levelConfig.config.grid.rows;
    this.imageName = levelConfig.config.image;
    
    this.pieces = [];
    this.slots = [];
    
    this.draggedPiece = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    this.pieceWidth = 0;
    this.pieceHeight = 0;
    
    this.snapRadius = 40;
  }

  init() {
    const img = this.engine.getImage(this.imageName);
    if (!img) return; // Image not loaded yet
    
    // Calculate dimensions
    const maxGridWidth = 400;
    const maxGridHeight = 300;
    
    // Scale image to fit max dimensions while maintaining aspect ratio
    const imgRatio = img.width / img.height;
    let gridWidth = maxGridWidth;
    let gridHeight = maxGridWidth / imgRatio;
    
    if (gridHeight > maxGridHeight) {
      gridHeight = maxGridHeight;
      gridWidth = gridHeight * imgRatio;
    }
    
    this.pieceWidth = gridWidth / this.cols;
    this.pieceHeight = gridHeight / this.rows;
    
    // Position grid on the right side
    const gridStartX = GAME_WIDTH - gridWidth - 50;
    const gridStartY = (GAME_HEIGHT - gridHeight) / 2 + 20;
    
    // Create slots and pieces
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const id = r * this.cols + c;
        
        // Slot position
        const slotX = gridStartX + c * this.pieceWidth;
        const slotY = gridStartY + r * this.pieceHeight;
        
        this.slots.push({
          id,
          col: c,
          row: r,
          x: slotX,
          y: slotY
        });
        
        // Piece initial position (scattered on the left)
        const startX = 50 + Math.random() * (GAME_WIDTH / 2 - this.pieceWidth - 100);
        const startY = 100 + Math.random() * (GAME_HEIGHT - this.pieceHeight - 150);
        
        this.pieces.push({
          id,
          col: c,
          row: r,
          startX, // Remember starting pos for reset
          startY,
          x: startX,
          y: startY,
          isPlaced: false,
          isHovered: false,
          animScale: 1
        });
      }
    }
    
    // Shuffle pieces so they draw randomly
    this.pieces.sort(() => Math.random() - 0.5);
  }

  update(deltaTime) {
    // Logic is mostly event-driven (handleInput) and tween-driven
  }

  render(ctx) {
    const img = this.engine.getImage(this.imageName);
    if (!img) return;
    
    // Draw slots (Grid)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    for (const slot of this.slots) {
      // Draw grid cell
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(slot.x, slot.y, this.pieceWidth, this.pieceHeight);
      ctx.strokeRect(slot.x, slot.y, this.pieceWidth, this.pieceHeight);
      
      // Draw ghost image inside grid (faint)
      ctx.globalAlpha = 0.15;
      this._drawPieceContent(ctx, img, slot.col, slot.row, slot.x, slot.y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    
    // Draw placed pieces first
    for (const p of this.pieces) {
      if (p.isPlaced) {
        this._drawPiece(ctx, img, p);
      }
    }
    
    // Draw unplaced pieces (so they appear above grid and placed pieces)
    for (const p of this.pieces) {
      if (!p.isPlaced && p !== this.draggedPiece) {
        this._drawPiece(ctx, img, p);
      }
    }
    
    // Draw dragged piece last (on top of everything)
    if (this.draggedPiece) {
      // Add a slight drop shadow and scale up
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;
      this._drawPiece(ctx, img, this.draggedPiece);
      ctx.restore();
    }
  }
  
  _drawPiece(ctx, img, p) {
    ctx.save();
    
    // Move to piece center for scaling
    const cx = p.x + this.pieceWidth / 2;
    const cy = p.y + this.pieceHeight / 2;
    ctx.translate(cx, cy);
    ctx.scale(p.animScale, p.animScale);
    ctx.translate(-cx, -cy);
    
    // Outline if hovered and not placed
    if (p.isHovered && !p.isPlaced) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
    }
    
    this._drawPieceContent(ctx, img, p.col, p.row, p.x, p.y);
    
    // White border for kids' puzzle feel
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, this.pieceWidth, this.pieceHeight);
    
    ctx.restore();
  }
  
  _drawPieceContent(ctx, img, col, row, x, y) {
    const srcW = img.width / this.cols;
    const srcH = img.height / this.rows;
    const srcX = col * srcW;
    const srcY = row * srcH;
    
    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      x, y, this.pieceWidth, this.pieceHeight
    );
  }

  handleInput(event) {
    super.handleInput(event);
    if (!this.isInteractive || this.isSolved) return;

    if (event.type === 'down') {
      // Find top-most unplaced piece under cursor
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        if (!p.isPlaced && event.x >= p.x && event.x <= p.x + this.pieceWidth && 
            event.y >= p.y && event.y <= p.y + this.pieceHeight) {
          
          this.draggedPiece = p;
          this.dragOffsetX = event.x - p.x;
          this.dragOffsetY = event.y - p.y;
          
          // Animate pickup
          this.engine.animation.cancelFor(p);
          this.engine.animation.tween(p, { animScale: 1.1 }, { duration: 150 });
          this.engine.audio.playSlide();
          
          // Bring to front
          this.pieces.splice(i, 1);
          this.pieces.push(p);
          break;
        }
      }
    } 
    else if (event.type === 'drag' && this.draggedPiece) {
      // Update position
      this.draggedPiece.x = event.x - this.dragOffsetX;
      this.draggedPiece.y = event.y - this.dragOffsetY;
    } 
    else if (event.type === 'up' && this.draggedPiece) {
      const p = this.draggedPiece;
      this.draggedPiece = null;
      this.moves++;
      
      // Animate drop
      this.engine.animation.cancelFor(p);
      this.engine.animation.tween(p, { animScale: 1 }, { duration: 150 });
      
      // Check for snap
      const targetSlot = this.slots.find(s => s.id === p.id);
      
      const cx = p.x + this.pieceWidth / 2;
      const cy = p.y + this.pieceHeight / 2;
      const tx = targetSlot.x + this.pieceWidth / 2;
      const ty = targetSlot.y + this.pieceHeight / 2;
      
      const dist = Math.sqrt((cx - tx)**2 + (cy - ty)**2);
      
      if (dist < this.snapRadius) {
        // Correct placement
        p.isPlaced = true;
        
        this.engine.animation.tween(p, { x: targetSlot.x, y: targetSlot.y }, { 
          duration: 200, 
          easing: Easing.easeOutBack,
          onComplete: () => {
            this.engine.particles.sparkle(cx, cy, 8);
          }
        });
        
        this.engine.audio.playSnap();
        this.engine.audio.playCorrect();
        
        // Check win
        if (this.checkWinCondition()) {
          this._handleWin();
        }
      } else {
        // Wrong placement - animate back to start
        this.engine.audio.playError();
        
        // Wiggle and slide back
        this.engine.animation.sequence(p, [
          { to: { x: p.x - 10 }, options: { duration: 50 } },
          { to: { x: p.x + 10 }, options: { duration: 50 } },
          { to: { x: p.x - 5 }, options: { duration: 50 } },
          { to: { x: p.x + 5 }, options: { duration: 50 } },
          { to: { x: p.startX, y: p.startY }, options: { duration: 300, easing: Easing.easeOutQuad } }
        ]);
      }
    }
    
    // Hover logic
    if (event.type === 'move' && !this.draggedPiece) {
      let hoveredFound = false;
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        p.isHovered = false; // Reset all
        
        if (!hoveredFound && !p.isPlaced && 
            event.x >= p.x && event.x <= p.x + this.pieceWidth && 
            event.y >= p.y && event.y <= p.y + this.pieceHeight) {
          p.isHovered = true;
          hoveredFound = true;
        }
      }
    }
  }

  showHint() {
    super.showHint();
    if (this.isSolved) return;
    
    // Find first unplaced piece
    const p = this.pieces.find(p => !p.isPlaced);
    if (!p) return;
    
    const targetSlot = this.slots.find(s => s.id === p.id);
    if (!targetSlot) return;
    
    // Animate piece
    this.engine.animation.sequence(p, [
      { to: { animScale: 1.2 }, options: { duration: 200 } },
      { to: { animScale: 1.0 }, options: { duration: 200 } },
      { to: { animScale: 1.2 }, options: { duration: 200 } },
      { to: { animScale: 1.0 }, options: { duration: 200 } }
    ]);
    
    // Create some sparkle particles at the target slot
    const tx = targetSlot.x + this.pieceWidth / 2;
    const ty = targetSlot.y + this.pieceHeight / 2;
    this.engine.particles.sparkle(tx, ty, 5);
  }

  checkWinCondition() {
    return this.pieces.every(p => p.isPlaced);
  }

  _handleWin() {
    this.isSolved = true;
    this.isInteractive = false;
    
    // Wait a bit, then trigger win screen
    setTimeout(() => {
      this.engine.audio.playFanfare();
      this.engine.particles.celebrate(GAME_WIDTH, GAME_HEIGHT);
      
      const result = this.getResult();
      this.engine.completeLevel(this.levelConfig.id, result);
      
      setTimeout(() => {
        this.engine.screens.goTo('victory', { level: this.levelConfig.id, result });
      }, 1500);
      
    }, 500);
  }
}
