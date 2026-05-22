import { BasePuzzle } from '../engine/BasePuzzle.js';
import { Easing } from '../engine/AnimationSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/GameEngine.js';
import { InputManager } from '../engine/InputManager.js';

export class MatchingPuzzle extends BasePuzzle {
  constructor(engine, levelConfig) {
    super(engine, levelConfig);
    
    this.pairs = levelConfig.config.pairs;
    this.matchType = levelConfig.config.matchType; // 'shapes' or 'animals'
    
    this.wagons = [];
    this.cargo = [];
    
    this.draggedCargo = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    this.wagonWidth = 110;
    this.wagonHeight = 80;
    this.cargoSize = 60;
  }

  init() {
    // Generate pairs
    const types = this.matchType === 'shapes' 
      ? ['circle', 'square', 'triangle', 'star', 'hexagon', 'heart']
      : ['pig', 'cow', 'chicken', 'horse', 'sheep', 'duck'];
      
    const colors = ['#F44336', '#2196F3', '#4CAF50', '#FFEB3B', '#9C27B0', '#FF9800'];
    
    const selectedPairs = [];
    for (let i = 0; i < this.pairs; i++) {
      selectedPairs.push({ type: types[i], color: colors[i], id: i });
    }
    
    // Create Wagons (targets) - spread evenly
    const totalWagonsW = this.pairs * (this.wagonWidth + 20);
    const startX = (GAME_WIDTH - totalWagonsW) / 2;
    const startY = GAME_HEIGHT / 2 - 40;
    
    // Shuffle wagons
    const shuffledWagons = [...selectedPairs].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < this.pairs; i++) {
      const data = shuffledWagons[i];
      this.wagons.push({
        id: data.id,
        type: data.type,
        color: data.color,
        x: startX + i * (this.wagonWidth + 20),
        y: startY,
        filled: false
      });
    }
    
    // Create Cargo (draggable) - scattered at bottom
    const shuffledCargo = [...selectedPairs].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < this.pairs; i++) {
      const data = shuffledCargo[i];
      const cx = 100 + Math.random() * (GAME_WIDTH - 200 - this.cargoSize);
      const cy = GAME_HEIGHT - 120 + Math.random() * 40;
      
      this.cargo.push({
        id: data.id,
        type: data.type,
        color: data.color,
        x: cx,
        y: cy,
        startX: cx,
        startY: cy,
        isPlaced: false,
        animScale: 1
      });
    }
  }

  update(deltaTime) {}

  render(ctx) {
    // Draw Tracks
    ctx.fillStyle = '#795548';
    ctx.fillRect(0, GAME_HEIGHT / 2 + 40, GAME_WIDTH, 10);
    
    // Draw Wagons
    for (const w of this.wagons) {
      this._drawWagon(ctx, w);
    }
    
    // Draw Cargo
    for (const c of this.cargo) {
      if (!c.isPlaced && c !== this.draggedCargo) {
        this._drawCargo(ctx, c);
      }
    }
    
    // Draw placed cargo inside wagons
    for (const w of this.wagons) {
      if (w.filled) {
        const c = this.cargo.find(c => c.id === w.id);
        if (c) {
          c.x = w.x + (this.wagonWidth - this.cargoSize) / 2;
          c.y = w.y + (this.wagonHeight - this.cargoSize) / 2 - 10;
          this._drawCargo(ctx, c);
        }
      }
    }
    
    // Draw dragged cargo
    if (this.draggedCargo) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 10;
      this._drawCargo(ctx, this.draggedCargo);
      ctx.restore();
    }
    
    // Instructions
    ctx.fillStyle = '#4A148C';
    ctx.font = `bold 24px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.fillText('Masukkan muatan ke gerbong yang tepat!', GAME_WIDTH / 2, 60);
    ctx.textAlign = 'start';
  }
  
  _drawWagon(ctx, w) {
    // Body
    ctx.fillStyle = w.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.roundRect(w.x, w.y, this.wagonWidth, this.wagonHeight, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Target outline/hint inside wagon
    ctx.save();
    ctx.translate(w.x + this.wagonWidth/2, w.y + this.wagonHeight/2 - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this._drawShapePath(ctx, w.type, this.cargoSize);
    ctx.fill();
    ctx.restore();
    
    // Wheels
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(w.x + 20, w.y + this.wagonHeight, 14, 0, Math.PI*2);
    ctx.arc(w.x + this.wagonWidth - 20, w.y + this.wagonHeight, 14, 0, Math.PI*2);
    ctx.fill();
  }
  
  _drawCargo(ctx, c) {
    ctx.save();
    
    ctx.translate(c.x + this.cargoSize/2, c.y + this.cargoSize/2);
    ctx.scale(c.animScale, c.animScale);
    
    ctx.fillStyle = c.color;
    this._drawShapePath(ctx, c.type, this.cargoSize);
    ctx.fill();
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Shine effect
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(-10, -10, 8, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
  }
  
  _drawShapePath(ctx, type, size) {
    const s = size / 2;
    ctx.beginPath();
    
    if (type === 'circle' || type === 'pig') {
      ctx.arc(0, 0, s, 0, Math.PI*2);
    } 
    else if (type === 'square' || type === 'cow') {
      ctx.rect(-s, -s, size, size);
    } 
    else if (type === 'triangle' || type === 'chicken') {
      ctx.moveTo(0, -s);
      ctx.lineTo(-s, s);
      ctx.lineTo(s, s);
      ctx.closePath();
    }
    else {
      // Fallback star for other types
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const r = i % 2 === 0 ? s : s/2;
        if(i===0) ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r);
        else ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
      }
      ctx.closePath();
    }
  }

  handleInput(event) {
    super.handleInput(event);
    if (!this.isInteractive || this.isSolved) return;

    if (event.type === 'down') {
      for (let i = this.cargo.length - 1; i >= 0; i--) {
        const c = this.cargo[i];
        if (!c.isPlaced && 
            event.x >= c.x && event.x <= c.x + this.cargoSize && 
            event.y >= c.y && event.y <= c.y + this.cargoSize) {
          
          this.draggedCargo = c;
          this.dragOffsetX = event.x - c.x;
          this.dragOffsetY = event.y - c.y;
          
          this.engine.animation.cancelFor(c);
          this.engine.animation.tween(c, { animScale: 1.2 }, { duration: 150 });
          this.engine.audio.playPop();
          
          this.cargo.splice(i, 1);
          this.cargo.push(c);
          break;
        }
      }
    } 
    else if (event.type === 'move' && event.isDragging && this.draggedCargo) {
      this.draggedCargo.x = event.x - this.dragOffsetX;
      this.draggedCargo.y = event.y - this.dragOffsetY;
    } 
    else if (event.type === 'up' && this.draggedCargo) {
      const c = this.draggedCargo;
      this.draggedCargo = null;
      this.moves++;
      
      this.engine.animation.cancelFor(c);
      this.engine.animation.tween(c, { animScale: 1 }, { duration: 150 });
      
      // Check collision with wagons
      const cx = c.x + this.cargoSize / 2;
      const cy = c.y + this.cargoSize / 2;
      
      let matchedWagon = null;
      for (const w of this.wagons) {
        if (!w.filled && cx >= w.x && cx <= w.x + this.wagonWidth && 
            cy >= w.y && cy <= w.y + this.wagonHeight) {
          matchedWagon = w;
          break;
        }
      }
      
      if (matchedWagon) {
        if (matchedWagon.id === c.id) {
          // Correct match!
          c.isPlaced = true;
          matchedWagon.filled = true;
          
          this.engine.audio.playCorrect();
          this.engine.particles.confetti(cx, cy, 15);
          
          if (this.checkWinCondition()) this._handleWin();
        } else {
          // Wrong wagon
          this.engine.audio.playError();
          this.engine.animation.tween(c, { x: c.startX, y: c.startY }, { duration: 300, easing: Easing.easeOutQuad });
        }
      } else {
        // Dropped outside
        this.engine.animation.tween(c, { x: c.startX, y: c.startY }, { duration: 300, easing: Easing.easeOutQuad });
      }
    }
  }

  checkWinCondition() {
    return this.wagons.every(w => w.filled);
  }

  _handleWin() {
    this.isSolved = true;
    this.isInteractive = false;
    
    setTimeout(() => {
      this.engine.audio.playFanfare();
      this.engine.particles.celebrate(GAME_WIDTH/2, GAME_HEIGHT/2);
      
      // Animate wagons driving away
      for(let i=0; i<this.wagons.length; i++) {
        this.engine.animation.tween(this.wagons[i], { x: GAME_WIDTH + 200 }, { duration: 2000, delay: i*100, easing: Easing.easeInQuad });
      }
      this.engine.audio.playWhistle();
      setTimeout(()=>this.engine.audio.playChug(), 300);
      
      const result = this.getResult();
      this.engine.completeLevel(this.levelConfig.id, result);
      
      setTimeout(() => {
        this.engine.screens.goTo('victory', { level: this.levelConfig.id, result });
      }, 2500);
      
    }, 500);
  }
}
