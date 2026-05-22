/**
 * App Entry Point — Initializes the game engine, registers screens,
 * sets up PWA service worker, and starts the game.
 */

import { GameEngine, GAME_WIDTH, GAME_HEIGHT } from './engine/GameEngine.js';
import { Easing } from './engine/AnimationSystem.js';
import { InputManager } from './engine/InputManager.js';
import { LEVELS } from './levels.js';

// Import Puzzle Mechanics
import { JigsawPuzzle } from './puzzles/JigsawPuzzle.js';
import { OrderingPuzzle } from './puzzles/OrderingPuzzle.js';
import { TrackBuilder } from './puzzles/TrackBuilder.js';
import { MatchingPuzzle } from './puzzles/MatchingPuzzle.js';
import { PathChooser } from './puzzles/PathChooser.js';

/** @type {GameEngine} */
const engine = new GameEngine();

// Make engine globally accessible for screens (via import)
export { engine };

/* ============================================================
   Temporary Placeholder Screens
   These will be replaced with full implementations in Phase 2.
   ============================================================ */

/**
 * Title Screen — Shows game logo and play button.
 */
function createTitleScreen() {
  const buttonAnim = { scale: 1, glow: 0, trainX: -100 };
  let trainDirection = 1;

  return {
    id: 'title',

    enter() {
      buttonAnim.scale = 1;
      buttonAnim.glow = 0;
      buttonAnim.trainX = -100;

      // Animate train across screen
      engine.animation.tween(buttonAnim, { trainX: GAME_WIDTH + 150 }, {
        duration: 8000,
        easing: Easing.linear,
        loop: true,
      });

      // Pulse the play button glow
      engine.animation.tween(buttonAnim, { glow: 1 }, {
        duration: 1500,
        easing: Easing.easeInOutQuad,
        yoyo: true,
        loop: true,
      });
    },

    exit() {
      engine.animation.cancelFor(buttonAnim);
    },

    update(dt) {},

    render(ctx) {
      // Draw background image
      const bgImg = engine.getImage('game_background');
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        // Dim overlay for readability
        ctx.fillStyle = 'rgba(135, 206, 235, 0.3)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // Draw animated train
      const trainImg = engine.getImage('train_engine');
      if (trainImg) {
        const trainScale = 0.15;
        const trainW = trainImg.width * trainScale;
        const trainH = trainImg.height * trainScale;
        ctx.drawImage(trainImg, buttonAnim.trainX, GAME_HEIGHT - trainH - 30, trainW, trainH);
      }

      // Draw title logo
      const logoImg = engine.getImage('title_logo');
      if (logoImg) {
        const logoScale = Math.min(0.55, (GAME_WIDTH * 0.7) / logoImg.width);
        const logoW = logoImg.width * logoScale;
        const logoH = logoImg.height * logoScale;
        const logoX = (GAME_WIDTH - logoW) / 2;
        ctx.drawImage(logoImg, logoX, 40, logoW, logoH);
      }

      // Draw Play button
      const btnX = GAME_WIDTH / 2;
      const btnY = GAME_HEIGHT * 0.68;
      const btnW = 220;
      const btnH = 64;

      // Button glow
      if (buttonAnim.glow > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(76, 175, 80, 0.6)';
        ctx.shadowBlur = 20 * buttonAnim.glow;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
        ctx.restore();
      }

      // Button body
      const gradient = ctx.createLinearGradient(0, btnY - btnH / 2, 0, btnY + btnH / 2);
      gradient.addColorStop(0, '#66BB6A');
      gradient.addColorStop(1, '#388E3C');
      ctx.fillStyle = gradient;
      this._roundRect(ctx, btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 20);
      ctx.fill();

      // Button shadow
      ctx.shadowColor = 'rgba(56, 142, 60, 0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      // Button text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold 28px 'Fredoka One', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 2;
      ctx.fillText('▶ MAIN!', btnX, btnY);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Settings button (bottom-right)
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this._roundRect(ctx, GAME_WIDTH - 60, GAME_HEIGHT - 50, 44, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = '24px sans-serif';
      ctx.fillText('⚙️', GAME_WIDTH - 38, GAME_HEIGHT - 26);

      ctx.textAlign = 'start';
    },

    handleInput(event) {
      if (event.type !== 'tap') return;

      const btnX = GAME_WIDTH / 2;
      const btnY = GAME_HEIGHT * 0.68;
      const btnW = 220;
      const btnH = 64;

      // Check play button hit
      if (InputManager.hitTestRect(event.x, event.y, btnX - btnW / 2, btnY - btnH / 2, btnW, btnH)) {
        engine.audio.playButton();
        engine.screens.goTo('levelSelect');
      }
    },

    /** Helper: draw rounded rectangle path */
    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    },
  };
}

/**
 * Level Select Screen — Shows the level map with 10 stations.
 */
function createLevelSelectScreen() {
  const nodes = [];
  const nodeRadius = 28;
  let selectedNode = -1;

  // Generate node positions along a path
  function generateNodes() {
    const positions = [
      { x: 100, y: 480 }, // Level 1
      { x: 220, y: 400 }, // Level 2
      { x: 160, y: 290 }, // Level 3
      { x: 280, y: 220 }, // Level 4
      { x: 400, y: 260 }, // Level 5
      { x: 520, y: 340 }, // Level 6
      { x: 580, y: 230 }, // Level 7
      { x: 640, y: 150 }, // Level 8
      { x: 500, y: 100 }, // Level 9
      { x: 700, y: 60 },  // Level 10
    ];

    const emojis = ['🌿', '🐄', '🐻', '🦊', '🌊', '⛰️', '🪨', '❄️', '☁️', '🏰'];
    const names = [
      'Meadow Station', 'Happy Farm', 'Bear Woods', 'Fox Glade',
      'River Crossing', 'Mountain Foot', 'Rock Tunnel', 'Snowy Peaks',
      'Cloud View', 'Dragon Peak',
    ];

    nodes.length = 0;
    for (let i = 0; i < 10; i++) {
      nodes.push({
        id: i + 1,
        ...positions[i],
        emoji: emojis[i],
        name: names[i],
        unlocked: engine.storage.isLevelUnlocked(i + 1),
        stars: engine.storage.getLevelProgress(i + 1)?.stars || 0,
      });
    }
  }

  return {
    id: 'levelSelect',

    enter() {
      generateNodes();
      selectedNode = -1;
    },

    exit() {},
    update(dt) {},

    render(ctx) {
      // Draw map background
      const mapImg = engine.getImage('level_select_map');
      if (mapImg) {
        ctx.drawImage(mapImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      // Draw path connecting nodes
      ctx.strokeStyle = '#795548';
      ctx.lineWidth = 6;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (i === 0) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw rails on path
      ctx.strokeStyle = '#9E9E9E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (i === 0) ctx.moveTo(n.x, n.y);
        else ctx.lineTo(n.x, n.y);
      }
      ctx.stroke();

      // Draw nodes
      for (const node of nodes) {
        ctx.save();

        if (node.unlocked) {
          // Unlocked node — colorful circle
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeRadius);
          grad.addColorStop(0, '#FFD700');
          grad.addColorStop(1, '#FFA000');
          ctx.fillStyle = grad;

          ctx.shadowColor = 'rgba(255, 152, 0, 0.5)';
          ctx.shadowBlur = 12;
        } else {
          // Locked node — grey
          ctx.fillStyle = '#9E9E9E';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 6;
        }

        // Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = node.unlocked ? '#E65100' : '#616161';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Number or lock
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 20px 'Fredoka One', cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (node.unlocked) {
          ctx.fillText(node.id.toString(), node.x, node.y);
        } else {
          ctx.fillText('🔒', node.x, node.y);
        }

        // Stars below node
        if (node.stars > 0) {
          const starStr = '⭐'.repeat(node.stars);
          ctx.font = '12px sans-serif';
          ctx.fillText(starStr, node.x, node.y + nodeRadius + 14);
        }

        ctx.restore();
      }

      // Title bar
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, 0, GAME_WIDTH, 50);
      ctx.fillStyle = '#4A148C';
      ctx.font = `bold 24px 'Fredoka One', cursive`;
      ctx.textAlign = 'center';
      ctx.fillText('🗺️ Pilih Level', GAME_WIDTH / 2, 32);

      // Back button
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(36, 25, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.font = '18px sans-serif';
      ctx.fillText('⬅️', 36, 27);

      // Total stars
      const totalStars = engine.storage.getTotalStars();
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold 18px 'Fredoka One', cursive`;
      ctx.textAlign = 'right';
      ctx.fillText(`⭐ ${totalStars}/30`, GAME_WIDTH - 20, 32);

      ctx.textAlign = 'start';
    },

    handleInput(event) {
      if (event.type !== 'tap') return;

      // Check back button
      if (InputManager.hitTestCircle(event.x, event.y, 36, 25, 20)) {
        engine.audio.playButton();
        engine.screens.goTo('title');
        return;
      }

      // Check node hits
      for (const node of nodes) {
        if (InputManager.hitTestCircle(event.x, event.y, node.x, node.y, nodeRadius)) {
          if (node.unlocked) {
            engine.audio.playButton();
            engine.state.currentLevel = node.id;
            engine.screens.goTo('game', { level: node.id });
          } else {
            engine.audio.playError();
          }
          return;
        }
      }
    },
  };
}

/**
 * Game Screen — Hosts and manages the active puzzle logic.
 */
function createGameScreen() {
  let levelId = 1;
  let activePuzzle = null;

  return {
    id: 'game',

    enter(data) {
      levelId = data?.level || 1;
      const config = LEVELS.find(l => l.id === levelId) || LEVELS[0];

      // Show HUD
      const hud = document.getElementById('hud');
      if (hud) hud.classList.remove('hidden');

      const levelNum = document.getElementById('level-number');
      if (levelNum) levelNum.textContent = levelId;

      const moveCount = document.getElementById('move-count');
      if (moveCount) moveCount.textContent = '0';

      // Initialize the appropriate puzzle mechanic
      switch(config.type) {
        case 'jigsaw':
          activePuzzle = new JigsawPuzzle(engine, config);
          break;
        case 'ordering':
          activePuzzle = new OrderingPuzzle(engine, config);
          break;
        case 'trackBuilder':
          activePuzzle = new TrackBuilder(engine, config);
          break;
        case 'matching':
          activePuzzle = new MatchingPuzzle(engine, config);
          break;
        case 'pathChooser':
          activePuzzle = new PathChooser(engine, config);
          break;
        default:
          console.warn('Unknown puzzle type:', config.type);
          return;
      }
      
      activePuzzle.init();
      engine.audio.playLevelStart();
    },

    exit() {
      const hud = document.getElementById('hud');
      if (hud) hud.classList.add('hidden');
      
      if (activePuzzle) {
        activePuzzle.destroy();
        activePuzzle = null;
      }
    },

    update(dt) {
      if (activePuzzle) {
        activePuzzle.update(dt);
        
        // Update move counter in HUD
        const moveCount = document.getElementById('move-count');
        if (moveCount) moveCount.textContent = activePuzzle.moves;
      }
    },

    render(ctx) {
      // Background
      const bgImg = engine.getImage('game_background');
      if (bgImg) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.globalAlpha = 1;
      }
      
      // Render active puzzle
      if (activePuzzle) {
        activePuzzle.render(ctx);
      }
    },

    handleInput(event) {
      if (activePuzzle) {
        activePuzzle.handleInput(event);
      }
    },
  };
}

/**
 * Victory Screen — Shows stars and next level button.
 */
function createVictoryScreen() {
  let levelId = 1;
  let result = { stars: 0, moves: 0, time: 0, hintsUsed: 0 };

  return {
    id: 'victory',

    enter(data) {
      levelId = data?.level || 1;
      result = data?.result || { stars: 3, moves: 0, time: 0, hintsUsed: 0 };

      // Show victory modal
      const modal = document.getElementById('victory-modal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('visible');
      }

      // Animate stars
      const starEls = document.querySelectorAll('.victory-star');
      starEls.forEach((el, i) => {
        el.classList.remove('earned');
        if (i < result.stars) {
          setTimeout(() => {
            el.classList.add('earned');
            engine.audio.playStar();
          }, 300 + i * 300);
        }
      });

      // Update text
      const texts = ['HEBAT! 🎉', 'BAGUS! 👏', 'KEREN! 🌟', 'LUAR BIASA! 🏆'];
      const victoryText = document.getElementById('victory-text');
      if (victoryText) victoryText.textContent = texts[Math.floor(Math.random() * texts.length)];

      const msg = document.getElementById('victory-message');
      if (msg) msg.textContent = `Level ${levelId} selesai dalam ${result.moves} langkah!`;
    },

    exit() {
      const modal = document.getElementById('victory-modal');
      if (modal) {
        modal.classList.remove('visible');
        modal.classList.add('hidden');
      }
    },

    update(dt) {},

    render(ctx) {
      // Draw confetti background
      const bgImg = engine.getImage('game_background');
      if (bgImg) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(bgImg, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.globalAlpha = 1;
      }
    },

    handleInput(event) {},
  };
}


/* ============================================================
   PWA Service Worker Registration
   ============================================================ */

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service worker registered:', reg.scope);

      reg.addEventListener('updatefound', () => {
        console.log('[PWA] New service worker installing...');
      });
    } catch (err) {
      console.warn('[PWA] Service worker registration failed:', err);
    }
  }
}


/* ============================================================
   PWA Install Prompt
   ============================================================ */

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Show install banner
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.remove('hidden');
});

// Install button handler
document.getElementById('btn-install')?.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install result:', result.outcome);
    deferredInstallPrompt = null;
  }
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
});

// Dismiss install banner
document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
});


/* ============================================================
   DOM UI Event Handlers
   ============================================================ */

function setupUIHandlers() {
  // Pause button
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    engine.audio.playButton();
    const modal = document.getElementById('pause-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('visible');
    }
  });

  // Resume button
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    engine.audio.playButton();
    const modal = document.getElementById('pause-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.classList.add('hidden');
    }
  });

  // Restart button
  document.getElementById('btn-restart')?.addEventListener('click', () => {
    engine.audio.playButton();
    const modal = document.getElementById('pause-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.classList.add('hidden');
    }
    engine.screens.goTo('game', { level: engine.state.currentLevel });
  });

  // Quit to menu
  document.getElementById('btn-quit')?.addEventListener('click', () => {
    engine.audio.playButton();
    const modal = document.getElementById('pause-modal');
    if (modal) {
      modal.classList.remove('visible');
      modal.classList.add('hidden');
    }
    engine.screens.goTo('title');
  });

  // Home button (HUD)
  document.getElementById('btn-home')?.addEventListener('click', () => {
    engine.audio.playButton();
    engine.screens.goTo('levelSelect');
  });

  // Hint button
  document.getElementById('btn-hint')?.addEventListener('click', () => {
    engine.audio.playClick();
    // Will be implemented in Phase 3
  });

  // Sound toggle
  document.getElementById('btn-sound')?.addEventListener('click', () => {
    const enabled = engine.audio.toggleSound();
    engine.state.settings.soundEnabled = enabled;
    engine.saveSettings();
    const btn = document.getElementById('btn-sound');
    if (btn) btn.textContent = enabled ? '🔊' : '🔇';
  });

  // Music toggle
  document.getElementById('btn-music')?.addEventListener('click', () => {
    const enabled = engine.audio.toggleMusic();
    engine.state.settings.musicEnabled = enabled;
    engine.saveSettings();
    const btn = document.getElementById('btn-music');
    if (btn) btn.textContent = enabled ? '🎵' : '🔇';
  });

  // Victory: Next level
  document.getElementById('btn-next-level')?.addEventListener('click', () => {
    engine.audio.playButton();
    const nextLevel = Math.min(engine.state.currentLevel + 1, 10);
    engine.state.currentLevel = nextLevel;
    engine.screens.goTo('game', { level: nextLevel });
  });

  // Victory: Replay
  document.getElementById('btn-replay')?.addEventListener('click', () => {
    engine.audio.playButton();
    engine.screens.goTo('game', { level: engine.state.currentLevel });
  });

  // Victory: Level select
  document.getElementById('btn-levels')?.addEventListener('click', () => {
    engine.audio.playButton();
    engine.screens.goTo('levelSelect');
  });
}


/* ============================================================
   Boot Sequence
   ============================================================ */

async function boot() {
  console.log('🚂 Choo-Choo Puzzle Adventure — Booting...');

  // Register PWA service worker
  registerServiceWorker();

  // Initialize game engine (loads assets)
  await engine.init();

  // Register screens
  engine.screens.register('title', createTitleScreen());
  engine.screens.register('levelSelect', createLevelSelectScreen());
  engine.screens.register('game', createGameScreen());
  engine.screens.register('victory', createVictoryScreen());

  // Setup DOM UI handlers
  setupUIHandlers();

  // Hide loading screen
  setTimeout(() => {
    engine.hideLoadingScreen();

    // Navigate to title screen
    engine.screens.goTo('title');

    // Start game loop
    engine.start();

    console.log('🚂 Game started!');
  }, 500);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
