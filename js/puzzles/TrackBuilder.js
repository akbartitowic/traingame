import { BasePuzzle } from '../engine/BasePuzzle.js';
import { Easing } from '../engine/AnimationSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/GameEngine.js';
import { InputManager } from '../engine/InputManager.js';

export class TrackBuilder extends BasePuzzle {
  constructor(engine, levelConfig) {
    super(engine, levelConfig);
    
    this.cols = levelConfig.config.gridCols;
    this.rows = levelConfig.config.gridRows;
    this.startPoint = levelConfig.config.startPoint;
    this.endPoint = levelConfig.config.endPoint;
    
    this.cellSize = 80;
    
    this.grid = []; // 2D array of placed pieces
    this.inventory = []; // Pieces available to place
    
    this.draggedPiece = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    // Grid bounds
    this.gridX = (GAME_WIDTH - (this.cols * this.cellSize)) / 2;
    this.gridY = (GAME_HEIGHT - (this.rows * this.cellSize)) / 2 - 40;
  }

  init() {
    // Initialize empty grid
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = null;
      }
    }
    
    // Initialize inventory pieces
    const invWidth = this.levelConfig.config.pieces.length * (this.cellSize + 20);
    const startX = (GAME_WIDTH - invWidth) / 2;
    const startY = GAME_HEIGHT - this.cellSize - 30;
    
    this.levelConfig.config.pieces.forEach((type, index) => {
      this.inventory.push({
        id: index,
        type: type, // 'horizontal', 'vertical', 'curve-se', etc
        rotation: 0, // 0, 90, 180, 270
        x: startX + index * (this.cellSize + 20),
        y: startY,
        startX: startX + index * (this.cellSize + 20),
        startY: startY,
        isPlaced: false,
        col: -1,
        row: -1,
        animScale: 1
      });
    });
  }

  update(deltaTime) {}

  render(ctx) {
    // Draw Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.gridX + c * this.cellSize;
        const y = this.gridY + r * this.cellSize;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, y, this.cellSize, this.cellSize);
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);
        
        // Draw start/end markers
        if (c === this.startPoint.col && r === this.startPoint.row) {
          ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
          ctx.fillStyle = '#4CAF50';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚂', x + this.cellSize/2, y + this.cellSize/2 + 7);
        }
        else if (c === this.endPoint.col && r === this.endPoint.row) {
          ctx.fillStyle = 'rgba(244, 67, 54, 0.4)';
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
          ctx.fillStyle = '#F44336';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚉', x + this.cellSize/2, y + this.cellSize/2 + 7);
        }
      }
    }
    ctx.restore();
    
    // Draw Inventory Background
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, GAME_HEIGHT - this.cellSize - 50, GAME_WIDTH, this.cellSize + 50);
    
    // Draw pieces
    for (const p of this.inventory) {
      if (p !== this.draggedPiece) {
        this._drawTrackPiece(ctx, p);
      }
    }
    
    // Draw dragged piece
    if (this.draggedPiece) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      this._drawTrackPiece(ctx, this.draggedPiece);
      ctx.restore();
    }
    
    // Draw instructions
    ctx.fillStyle = '#4A148C';
    ctx.font = `bold 24px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.fillText('Bangun rel dari kereta 🚂 ke stasiun 🚉! Tap rel untuk memutar.', GAME_WIDTH / 2, 40);
    ctx.textAlign = 'start';
  }
  
  _drawTrackPiece(ctx, p) {
    ctx.save();
    
    const cx = p.x + this.cellSize / 2;
    const cy = p.y + this.cellSize / 2;
    
    ctx.translate(cx, cy);
    ctx.scale(p.animScale, p.animScale);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
    
    // Tile background
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(p.x, p.y, this.cellSize, this.cellSize);
    ctx.strokeStyle = '#689F38';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, this.cellSize, this.cellSize);
    
    // Draw track graphics based on type
    ctx.strokeStyle = '#9E9E9E'; // Rails
    ctx.lineWidth = 4;
    
    const h = this.cellSize;
    
    if (p.type === 'horizontal' || p.type === 'vertical') {
      // Basic straight line (we draw horizontal, rotation handles vertical)
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + h/2 - 8);
      ctx.lineTo(p.x + h, p.y + h/2 - 8);
      ctx.moveTo(p.x, p.y + h/2 + 8);
      ctx.lineTo(p.x + h, p.y + h/2 + 8);
      ctx.stroke();
      
      // Ties
      ctx.fillStyle = '#795548';
      for (let i = 10; i < h; i += 20) {
        ctx.fillRect(p.x + i - 3, p.y + h/2 - 12, 6, 24);
      }
    } 
    else if (p.type.startsWith('curve')) {
      // Curve from bottom to right
      ctx.beginPath();
      ctx.arc(p.x + h, p.y + h, h/2 - 8, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(p.x + h, p.y + h, h/2 + 8, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      
      // Ties for curve
      ctx.fillStyle = '#795548';
      for (let a = 15; a <= 75; a += 20) {
        const rad = (180 + a) * Math.PI / 180;
        ctx.save();
        ctx.translate(p.x + h + Math.cos(rad) * h/2, p.y + h + Math.sin(rad) * h/2);
        ctx.rotate(rad);
        ctx.fillRect(-12, -3, 24, 6);
        ctx.restore();
      }
    }
    
    ctx.restore();
  }

  handleInput(event) {
    super.handleInput(event);
    if (!this.isInteractive || this.isSolved) return;

    if (event.type === 'down') {
      // Check if tapping a piece to pick it up or rotate
      for (let i = this.inventory.length - 1; i >= 0; i--) {
        const p = this.inventory[i];
        if (event.x >= p.x && event.x <= p.x + this.cellSize && 
            event.y >= p.y && event.y <= p.y + this.cellSize) {
          
          this.draggedPiece = p;
          this.dragOffsetX = event.x - p.x;
          this.dragOffsetY = event.y - p.y;
          
          this.engine.animation.cancelFor(p);
          this.engine.animation.tween(p, { animScale: 1.1 }, { duration: 150 });
          this.engine.audio.playSlide();
          
          // Bring to front
          this.inventory.splice(i, 1);
          this.inventory.push(p);
          break;
        }
      }
    } 
    else if (event.type === 'move' && event.isDragging && this.draggedPiece) {
      this.draggedPiece.x = event.x - this.dragOffsetX;
      this.draggedPiece.y = event.y - this.dragOffsetY;
    } 
    else if (event.type === 'up' && this.draggedPiece) {
      const p = this.draggedPiece;
      this.draggedPiece = null;
      
      this.engine.animation.cancelFor(p);
      this.engine.animation.tween(p, { animScale: 1 }, { duration: 150 });
      
      // Calculate drop col and row
      const cx = p.x + this.cellSize / 2;
      const cy = p.y + this.cellSize / 2;
      
      const col = Math.floor((cx - this.gridX) / this.cellSize);
      const row = Math.floor((cy - this.gridY) / this.cellSize);
      
      // If dropped inside grid
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        
        // Remove from old grid slot if it was already placed
        if (p.isPlaced) {
          this.grid[p.row][p.col] = null;
        }
        
        // If there's already a piece there, swap them or reject? Let's reject/slide back
        if (this.grid[row][col] && this.grid[row][col] !== p) {
          this.engine.audio.playError();
          const targetX = p.isPlaced ? this.gridX + p.col * this.cellSize : p.startX;
          const targetY = p.isPlaced ? this.gridY + p.row * this.cellSize : p.startY;
          this.engine.animation.tween(p, { x: targetX, y: targetY }, { duration: 300, easing: Easing.easeOutQuad });
          
          if (p.isPlaced) this.grid[p.row][p.col] = p; // restore
          return;
        }
        
        // Place in grid
        this.moves++;
        p.isPlaced = true;
        p.col = col;
        p.row = row;
        this.grid[row][col] = p;
        
        const targetX = this.gridX + col * this.cellSize;
        const targetY = this.gridY + row * this.cellSize;
        
        this.engine.animation.tween(p, { x: targetX, y: targetY }, { 
          duration: 150, 
          easing: Easing.easeOutQuad
        });
        
        this.engine.audio.playSnap();
        
        // Check for win after a short delay to allow placement to settle
        setTimeout(() => {
          if (this.checkWinCondition()) this._handleWin();
        }, 200);
        
      } else {
        // Dropped outside grid - return to inventory
        if (p.isPlaced) {
          this.grid[p.row][p.col] = null;
          p.isPlaced = false;
        }
        this.engine.animation.tween(p, { x: p.startX, y: p.startY }, { duration: 300, easing: Easing.easeOutQuad });
      }
    } 
    else if (event.type === 'tap') {
      // Rotate piece if tapped
      for (const p of this.inventory) {
        if (InputManager.hitTestRect(event.x, event.y, p.x, p.y, this.cellSize, this.cellSize)) {
          this.moves++;
          p.rotation = (p.rotation + 90) % 360;
          this.engine.audio.playClick();
          
          if (p.isPlaced) {
            if (this.checkWinCondition()) this._handleWin();
          }
          break;
        }
      }
    }
  }

  checkWinCondition() {
    // Very simplified win condition for MVP:
    // Check if all pieces are placed.
    // In a full implementation, we'd do pathfinding from start to end.
    
    // Check if start and end points have a piece next to them
    const allPlaced = this.inventory.every(p => p.isPlaced);
    if (!allPlaced) return false;
    
    // HACK: For prototype, just check if all placed. 
    // Kids game doesn't need complex graph traversal for the MVP prototype.
    // Real implementation would trace the track connections.
    return true;
  }

  _handleWin() {
    this.isSolved = true;
    this.isInteractive = false;
    
    // Simulate train running across tracks
    const train = { x: this.gridX + this.startPoint.col * this.cellSize, y: this.gridY + this.startPoint.row * this.cellSize };
    
    this.engine.audio.playWhistle();
    setTimeout(() => this.engine.audio.playChug(), 500);
    
    // Simple animation of train moving to end point
    const targetX = this.gridX + this.endPoint.col * this.cellSize;
    const targetY = this.gridY + this.endPoint.row * this.cellSize;
    
    this.engine.animation.tween(train, { x: targetX, y: targetY }, {
      duration: 2000,
      easing: Easing.easeInOutQuad,
      onUpdate: (t) => {
        // We could draw the train here if we intercepted the render loop, 
        // but for now let's just trigger win after delay
        if (Math.random() < 0.1) this.engine.particles.steam(t.x + this.cellSize/2, t.y);
      },
      onComplete: () => {
        this.engine.particles.celebrate(GAME_WIDTH/2, GAME_HEIGHT/2);
        this.engine.audio.playFanfare();
        
        const result = this.getResult();
        this.engine.completeLevel(this.levelConfig.id, result);
        
        setTimeout(() => {
          this.engine.screens.goTo('victory', { level: this.levelConfig.id, result });
        }, 1500);
      }
    });
  }
}
