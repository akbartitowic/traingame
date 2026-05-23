import { BasePuzzle } from '../engine/BasePuzzle.js';
import { Easing } from '../engine/AnimationSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/GameEngine.js';

export class OrderingPuzzle extends BasePuzzle {
  constructor(engine, levelConfig) {
    super(engine, levelConfig);
    
    this.wagonCount = levelConfig.config.wagonCount;
    this.orderType = levelConfig.config.orderType; // 'numbers' or 'colors'
    
    this.wagons = [];
    this.slots = [];
    
    this.draggedWagon = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    this.wagonWidth = 100;
    this.wagonHeight = 70;
    
    this.snapRadius = 40;
    
    // Engine position
    this.enginePos = { x: 0, y: 0, width: 120, height: 90 };
  }

  init() {
    const totalWidth = this.enginePos.width + (this.wagonCount * this.wagonWidth) + (this.wagonCount * 10);
    const startX = (GAME_WIDTH - totalWidth) / 2;
    
    // Engine is on the right side of the train (facing left conceptually, or right? Let's make it face right, so engine is on the right, wagons attach to left)
    // Actually, usually engine pulls from the front (right side), wagons follow on the left.
    // Let's place engine at startX
    this.enginePos.x = startX;
    this.enginePos.y = GAME_HEIGHT / 2 - 20;
    
    // Create slots behind the engine (to the right)
    // Let's place engine on the left, facing right. Wagons attach behind it to the right.
    this.enginePos.x = startX;
    
    for (let i = 0; i < this.wagonCount; i++) {
      // Slot position
      const slotX = startX + this.enginePos.width + 10 + i * (this.wagonWidth + 10);
      const slotY = this.enginePos.y + 10;
      
      this.slots.push({
        id: i, // 0 is first wagon behind engine
        x: slotX,
        y: slotY,
        filledBy: null
      });
      
      // Wagon properties
      let color, label;
      if (this.orderType === 'numbers') {
        color = ['#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#E53935'][i % 5];
        label = (i + 1).toString();
      } else {
        // Colors (e.g. rainbow order: Red, Orange, Yellow, Green, Blue)
        const colors = [
          { c: '#E53935', l: 'Merah' },
          { c: '#FF9800', l: 'Jingga' },
          { c: '#FFD700', l: 'Kuning' },
          { c: '#4CAF50', l: 'Hijau' },
          { c: '#2196F3', l: 'Biru' }
        ];
        color = colors[i % 5].c;
        label = ''; // No text for colors, just color order
      }
      
      // Scatter wagons at the bottom
      const rx = 100 + Math.random() * (GAME_WIDTH - 200 - this.wagonWidth);
      const ry = GAME_HEIGHT - 150 + Math.random() * 40;
      
      this.wagons.push({
        id: i, // Correct slot id
        x: rx,
        y: ry,
        startX: rx,
        startY: ry,
        color: color,
        label: label,
        isPlaced: false,
        animScale: 1
      });
    }
    
    // Shuffle wagons
    this.wagons.sort(() => Math.random() - 0.5);
  }

  update(deltaTime) {
    // Generate some smoke from the engine
    if (Math.random() < 0.05 && !this.isSolved) {
      this.engine.particles.steam(this.enginePos.x + 30, this.enginePos.y);
    }
  }

  render(ctx) {
    // Draw tracks for the train to sit on
    const trackImg = this.engine.getImage('train_tracks');
    if (trackImg) {
      ctx.drawImage(trackImg, 0, 0, 100, 100, 
        this.enginePos.x - 50, this.enginePos.y + this.enginePos.height - 10, 
        GAME_WIDTH - this.enginePos.x + 100, 40);
    } else {
      ctx.fillStyle = '#795548';
      ctx.fillRect(this.enginePos.x - 50, this.enginePos.y + this.enginePos.height + 10, GAME_WIDTH, 10);
    }
    
    // Draw Engine
    const engImg = this.engine.getImage('train_engine');
    if (engImg) {
      ctx.drawImage(engImg, this.enginePos.x, this.enginePos.y, this.enginePos.width, this.enginePos.height);
    } else {
      // Fallback shape
      ctx.fillStyle = '#E53935';
      ctx.fillRect(this.enginePos.x, this.enginePos.y, this.enginePos.width, this.enginePos.height);
    }
    
    // Draw slots
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    
    for (const slot of this.slots) {
      if (!slot.filledBy) {
        ctx.beginPath();
        ctx.roundRect(slot.x, slot.y, this.wagonWidth, this.wagonHeight, 10);
        ctx.stroke();
        
        // Draw connection link hint
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(slot.x - 10, slot.y + 40, 10, 5);
      }
    }
    ctx.restore();
    
    // Draw Wagons
    // 1. Placed wagons
    for (const w of this.wagons) {
      if (w.isPlaced) this._drawWagon(ctx, w);
    }
    // 2. Unplaced wagons
    for (const w of this.wagons) {
      if (!w.isPlaced && w !== this.draggedWagon) this._drawWagon(ctx, w);
    }
    // 3. Dragged wagon
    if (this.draggedWagon) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;
      this._drawWagon(ctx, this.draggedWagon);
      ctx.restore();
    }
    
    // Draw instructions
    ctx.fillStyle = '#4A148C';
    ctx.font = `bold 24px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    let instruction = this.orderType === 'numbers' ? 'Susun gerbong sesuai urutan angka (1, 2, 3...)' : 'Susun gerbong sesuai warna pelangi!';
    ctx.fillText(instruction, GAME_WIDTH / 2, 80);
    ctx.textAlign = 'start';
  }
  
  _drawWagon(ctx, w) {
    ctx.save();
    
    const cx = w.x + this.wagonWidth / 2;
    const cy = w.y + this.wagonHeight / 2;
    ctx.translate(cx, cy);
    ctx.scale(w.animScale, w.animScale);
    ctx.translate(-cx, -cy);
    
    // Wagon Body
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.roundRect(w.x, w.y, this.wagonWidth, this.wagonHeight, 8);
    ctx.fill();
    
    // Wagon border
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Wheels
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(w.x + 20, w.y + this.wagonHeight, 12, 0, Math.PI * 2);
    ctx.arc(w.x + this.wagonWidth - 20, w.y + this.wagonHeight, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Linker
    ctx.fillStyle = '#666';
    ctx.fillRect(w.x - 10, w.y + 40, 10, 5);
    
    // Number/Label
    if (w.label) {
      ctx.fillStyle = '#FFF';
      ctx.font = `bold 36px 'Fredoka One', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.fillText(w.label, w.x + this.wagonWidth / 2, w.y + this.wagonHeight / 2);
    }
    
    ctx.restore();
  }

  handleInput(event) {
    super.handleInput(event);
    if (!this.isInteractive || this.isSolved) return;

    if (event.type === 'down') {
      for (let i = this.wagons.length - 1; i >= 0; i--) {
        const w = this.wagons[i];
        if (!w.isPlaced && event.x >= w.x && event.x <= w.x + this.wagonWidth && 
            event.y >= w.y && event.y <= w.y + this.wagonHeight) {
          
          this.draggedWagon = w;
          this.dragOffsetX = event.x - w.x;
          this.dragOffsetY = event.y - w.y;
          
          this.engine.animation.cancelFor(w);
          this.engine.animation.tween(w, { animScale: 1.1 }, { duration: 150 });
          this.engine.audio.playSlide();
          
          this.wagons.splice(i, 1);
          this.wagons.push(w);
          break;
        }
      }
    } 
    else if (event.type === 'drag' && this.draggedWagon) {
      this.draggedWagon.x = event.x - this.dragOffsetX;
      this.draggedWagon.y = event.y - this.dragOffsetY;
    } 
    else if (event.type === 'up' && this.draggedWagon) {
      const w = this.draggedWagon;
      this.draggedWagon = null;
      this.moves++;
      
      this.engine.animation.cancelFor(w);
      this.engine.animation.tween(w, { animScale: 1 }, { duration: 150 });
      
      // Find nearest empty slot
      let snappedSlot = null;
      let minSlotDist = this.snapRadius;
      
      const cx = w.x + this.wagonWidth / 2;
      const cy = w.y + this.wagonHeight / 2;
      
      for (const slot of this.slots) {
        const tx = slot.x + this.wagonWidth / 2;
        const ty = slot.y + this.wagonHeight / 2;
        const dist = Math.sqrt((cx - tx)**2 + (cy - ty)**2);
        
        if (dist < minSlotDist) {
          snappedSlot = slot;
          minSlotDist = dist;
        }
      }
      
      if (snappedSlot) {
        // Is it the correct slot?
        if (snappedSlot.id === w.id) {
          w.isPlaced = true;
          snappedSlot.filledBy = w;
          
          this.engine.animation.tween(w, { x: snappedSlot.x, y: snappedSlot.y }, { 
            duration: 200, 
            easing: Easing.easeOutBack,
            onComplete: () => {
              this.engine.particles.sparkle(cx, cy, 5);
            }
          });
          
          this.engine.audio.playSnap();
          this.engine.audio.playCorrect();
          
          if (this.checkWinCondition()) {
            this._handleWin();
          }
        } else {
          // Wrong slot
          this._rejectWagon(w);
        }
      } else {
        // Dropped nowhere near a slot
        this.engine.animation.tween(w, { x: w.startX, y: w.startY }, { duration: 300, easing: Easing.easeOutQuad });
      }
    }
  }

  _rejectWagon(w) {
    this.engine.audio.playError();
    this.engine.animation.sequence(w, [
      { to: { x: w.x - 10 }, options: { duration: 50 } },
      { to: { x: w.x + 10 }, options: { duration: 50 } },
      { to: { x: w.x - 5 }, options: { duration: 50 } },
      { to: { x: w.x + 5 }, options: { duration: 50 } },
      { to: { x: w.startX, y: w.startY }, options: { duration: 300, easing: Easing.easeOutQuad } }
    ]);
  }

  checkWinCondition() {
    return this.wagons.every(w => w.isPlaced);
  }

  _handleWin() {
    this.isSolved = true;
    this.isInteractive = false;
    
    setTimeout(() => {
      // Make train chug forward!
      this.engine.audio.playWhistle();
      setTimeout(() => this.engine.audio.playChug(), 500);
      
      this.engine.animation.tween(this.enginePos, { x: GAME_WIDTH + 200 }, { duration: 2500, easing: Easing.easeInQuad });
      
      for (const w of this.wagons) {
        this.engine.animation.tween(w, { x: GAME_WIDTH + 200 + (w.id * 110) }, { 
          duration: 2500, 
          easing: Easing.easeInQuad 
        });
      }
      
      this.engine.particles.celebrate(GAME_WIDTH/2, GAME_HEIGHT/2);
      this.engine.audio.playFanfare();
      
      const result = this.getResult();
      this.engine.completeLevel(this.levelConfig.id, result);
      
      setTimeout(() => {
        this.engine.screens.goTo('victory', { level: this.levelConfig.id, result });
      }, 2500);
      
    }, 500);
  }
}
