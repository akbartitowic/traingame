/**
 * ParticleSystem — Creates and animates particles for visual effects.
 * Used for confetti, sparkles, steam, snow, and celebration effects.
 */

/** @typedef {{ x:number, y:number, vx:number, vy:number, life:number, maxLife:number, size:number, color:string, rotation:number, rotationSpeed:number, type:string, alpha:number, gravity:number, friction:number, shape:string }} Particle */

/** Pre-defined cheerful colors for particles. */
const CONFETTI_COLORS = [
  '#E53935', '#FF69B4', '#FFD700', '#4CAF50',
  '#2196F3', '#FF9800', '#9C27B0', '#00BCD4',
];

const SPARKLE_COLORS = ['#FFD700', '#FFF9C4', '#FFFFFF', '#FFE082'];

const SHAPES = ['rect', 'circle', 'triangle', 'star'];

export class ParticleSystem {
  constructor() {
    /** @type {Particle[]} */
    this.particles = [];
    this.maxParticles = 300;
  }

  /**
   * Spawn a burst of confetti particles from a point.
   * @param {number} x - Center X.
   * @param {number} y - Center Y.
   * @param {number} [count=50] - Number of particles.
   */
  confetti(x, y, count = 50) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        type: 'confetti',
        alpha: 1,
        gravity: 0.12,
        friction: 0.98,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      });
    }
  }

  /**
   * Spawn a small burst of sparkles (for correct placement feedback).
   * @param {number} x - Center X.
   * @param {number} y - Center Y.
   * @param {number} [count=5] - Number of sparkles.
   */
  sparkle(x, y, count = 5) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        rotation: 0,
        rotationSpeed: 0,
        type: 'sparkle',
        alpha: 1,
        gravity: 0,
        friction: 0.95,
        shape: 'star',
      });
    }
  }

  /**
   * Spawn steam puffs rising upward (for train chimney).
   * @param {number} x - Start X.
   * @param {number} y - Start Y.
   * @param {number} [count=3] - Number of puffs.
   */
  steam(x, y, count = 3) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random() * 1.5,
        life: 1,
        maxLife: 1,
        size: 6 + Math.random() * 8,
        color: 'rgba(255, 255, 255, 0.7)',
        rotation: 0,
        rotationSpeed: 0,
        type: 'steam',
        alpha: 0.7,
        gravity: -0.02,
        friction: 0.99,
        shape: 'circle',
      });
    }
  }

  /**
   * Spawn celebration explosion from screen center.
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  celebrate(canvasWidth, canvasHeight) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    // Big center burst
    this.confetti(cx, cy, 60);

    // Side bursts
    this.confetti(cx * 0.3, cy * 0.5, 20);
    this.confetti(cx * 1.7, cy * 0.5, 20);

    // Sparkle ring
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.sparkle(cx + Math.cos(angle) * 80, cy + Math.sin(angle) * 80, 3);
    }
  }

  /**
   * Update all particles. Call once per frame.
   * @param {number} deltaTime - Seconds (not ms) since last frame.
   */
  update(deltaTime) {
    const dt = deltaTime / 16.67; // Normalize to ~60fps frame

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      // Life decay
      const decayRate = p.type === 'steam' ? 0.015 : 0.012;
      p.life -= decayRate * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      // Grow steam particles
      if (p.type === 'steam') {
        p.size += 0.08 * dt;
      }

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render all particles to canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.shape) {
        case 'rect':
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          break;

        case 'circle':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'triangle':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
          break;

        case 'star':
          this._drawStar(ctx, 0, 0, p.size / 2, p.color);
          break;

        default:
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw a 4-point star shape.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx
   * @param {number} cy
   * @param {number} radius
   * @param {string} color
   */
  _drawStar(ctx, cx, cy, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.4;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** @returns {number} Active particle count. */
  get count() {
    return this.particles.length;
  }

  /** @returns {boolean} True if any particles are alive. */
  get active() {
    return this.particles.length > 0;
  }

  /** Remove all particles immediately. */
  clear() {
    this.particles.length = 0;
  }
}
