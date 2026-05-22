import { BasePuzzle } from '../engine/BasePuzzle.js';
import { Easing } from '../engine/AnimationSystem.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../engine/GameEngine.js';
import { InputManager } from '../engine/InputManager.js';

export class PathChooser extends BasePuzzle {
  constructor(engine, levelConfig) {
    super(engine, levelConfig);
    
    this.trainSpeed = levelConfig.config.trainSpeed;
    this.switchCount = levelConfig.config.switches;
    this.correctPath = levelConfig.config.correctPath; // Array of 0 (up/left) or 1 (down/right)
    
    this.switches = [];
    this.train = { x: 50, y: GAME_HEIGHT / 2, active: false, segment: 0, progress: 0 };
    
    this.pathLength = (GAME_WIDTH - 200) / this.switchCount;
  }

  init() {
    // Generate track switches
    for (let i = 0; i < this.switchCount; i++) {
      this.switches.push({
        id: i,
        x: 150 + i * this.pathLength,
        y: GAME_HEIGHT / 2,
        state: 0, // 0 = straight/up, 1 = diverge/down
        radius: 40
      });
    }
    
    // Wait 2 seconds before train starts moving
    setTimeout(() => {
      this.train.active = true;
      this.engine.audio.playWhistle();
      this.chugInterval = setInterval(() => {
        if (this.train.active && !this.isSolved) this.engine.audio.playChug();
      }, 600);
    }, 2000);
  }

  update(deltaTime) {
    if (!this.train.active || this.isSolved) return;
    
    // Move train
    const speed = this.trainSpeed * (deltaTime / 16);
    this.train.x += speed;
    
    // Steam
    if (Math.random() < 0.1) {
      this.engine.particles.steam(this.train.x, this.train.y - 20);
    }
    
    // Check collision with switches
    for (let i = 0; i < this.switches.length; i++) {
      const sw = this.switches[i];
      if (this.train.x > sw.x - 10 && this.train.x < sw.x + 10) {
        // Train just passed a switch, check if it's correct
        if (sw.state !== this.correctPath[i]) {
          // WRONG PATH
          this.train.active = false;
          this.engine.audio.playError();
          
          // Animate crash/fail (gentle shake and reset)
          this.engine.animation.sequence(this.train, [
            { to: { y: this.train.y - 10 }, options: { duration: 100 } },
            { to: { y: this.train.y + 10 }, options: { duration: 100 } },
            { to: { y: GAME_HEIGHT / 2 }, options: { duration: 100 } }
          ]);
          
          setTimeout(() => {
            // Reset train
            this.train.x = 50;
            this.train.y = GAME_HEIGHT / 2;
            this.train.active = true;
            this.moves++; // Count a fail as a move
          }, 1000);
          return; // Stop processing this frame
        }
      }
    }
    
    // Check win (reached end)
    if (this.train.x > GAME_WIDTH - 100) {
      this._handleWin();
    }
  }

  render(ctx) {
    // Draw Tracks
    ctx.strokeStyle = '#9E9E9E';
    ctx.lineWidth = 10;
    
    // Main line
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT / 2);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
    ctx.stroke();
    
    // Branches (wrong paths)
    for (let i = 0; i < this.switches.length; i++) {
      const sw = this.switches[i];
      const correctDir = this.correctPath[i];
      
      // Draw the alternate branch
      ctx.beginPath();
      ctx.moveTo(sw.x, GAME_HEIGHT / 2);
      // Curve down or up depending on correct dir
      const dirY = correctDir === 0 ? 1 : -1; // If 0 is correct, wrong is 1 (down)
      ctx.quadraticCurveTo(sw.x + 50, GAME_HEIGHT / 2 + (100 * dirY), sw.x + 100, GAME_HEIGHT / 2 + (150 * dirY));
      ctx.stroke();
    }
    
    // Draw Switches (Interactive Nodes)
    for (const sw of this.switches) {
      ctx.fillStyle = sw.state === 0 ? '#2196F3' : '#FF9800'; // Blue vs Orange
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Draw arrow indicating direction
      ctx.fillStyle = '#FFF';
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sw.state === 0 ? '⬆️' : '⬇️', sw.x, sw.y);
    }
    
    // Draw Destination Station
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(GAME_WIDTH - 120, GAME_HEIGHT / 2 - 60, 100, 120);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('STASIUN', GAME_WIDTH - 70, GAME_HEIGHT / 2);
    
    // Draw Train
    const engImg = this.engine.getImage('train_engine');
    if (engImg) {
      ctx.drawImage(engImg, this.train.x - 60, this.train.y - 45, 100, 75);
    } else {
      ctx.fillStyle = '#E53935';
      ctx.fillRect(this.train.x - 50, this.train.y - 30, 80, 60);
    }
    
    // Instructions
    ctx.fillStyle = '#4A148C';
    ctx.font = `bold 24px 'Fredoka One', cursive`;
    ctx.textAlign = 'center';
    ctx.fillText('Kereta sedang berjalan! Tap tombol untuk mengatur jalur yang benar!', GAME_WIDTH / 2, 60);
    ctx.textAlign = 'start';
  }

  handleInput(event) {
    super.handleInput(event);
    if (!this.isInteractive || this.isSolved) return;

    if (event.type === 'tap') {
      for (const sw of this.switches) {
        if (InputManager.hitTestCircle(event.x, event.y, sw.x, sw.y, sw.radius)) {
          sw.state = sw.state === 0 ? 1 : 0;
          this.engine.audio.playClick();
          this.moves++;
          break;
        }
      }
    }
  }

  checkWinCondition() {
    return false; // Win is handled by update() when train reaches end
  }

  _handleWin() {
    this.isSolved = true;
    this.train.active = false;
    this.isInteractive = false;
    
    if (this.chugInterval) clearInterval(this.chugInterval);
    
    this.engine.audio.playFanfare();
    this.engine.particles.celebrate(GAME_WIDTH - 100, GAME_HEIGHT / 2);
    
    const result = this.getResult();
    this.engine.completeLevel(this.levelConfig.id, result);
    
    setTimeout(() => {
      this.engine.screens.goTo('victory', { level: this.levelConfig.id, result });
    }, 2000);
  }
  
  destroy() {
    if (this.chugInterval) clearInterval(this.chugInterval);
  }
}
