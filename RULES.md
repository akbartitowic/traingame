# 🚂 Choo-Choo Puzzle Adventure — Vibe Coding Rules

> Context file for AI-assisted vibe coding. Attach this file to your AI coding session for consistent code generation.

---

## 🎯 Project Overview

- **Game**: Train-themed puzzle game for children (ages 4-8)
- **Platform**: PWA (Progressive Web App) — installable, offline-capable
- **Auth**: ❌ TANPA LOGIN — anak langsung bisa main
- **Backend**: ❌ TANPA API/SERVER — 100% client-side
- **Tech**: HTML5 Canvas + vanilla JavaScript (ES6 modules) + vanilla CSS
- **No frameworks, no build tools, no npm dependencies**
- **Single `index.html` entry point with `<script type="module">`**
- **Storage**: `localStorage` only — semua data di browser

---

## 📦 PWA Rules

### Service Worker
56. `sw.js` MUST be placed at **root level** (same directory as index.html)
57. Use **Cache-first** strategy for static assets (images, fonts, CSS, JS)
58. Use **Network-first** strategy for index.html (to get updates)
59. Cache name must include version: `choo-choo-v1`
60. On activation, delete old caches automatically
61. Pre-cache ALL game assets during install event

### Manifest
62. `manifest.json` at root level with these required fields:
    ```json
    {
      "name": "Choo-Choo Puzzle Adventure",
      "short_name": "Choo-Choo",
      "start_url": "/index.html",
      "display": "fullscreen",
      "orientation": "landscape",
      "background_color": "#87CEEB",
      "theme_color": "#E53935"
    }
    ```
63. Include icons in sizes: 72, 96, 128, 144, 192, 512 + maskable
64. Set `categories: ["games", "kids", "education"]`

### Offline Support
65. Game MUST work 100% offline after first load
66. All Google Fonts must be cached by service worker
67. Show "Offline Ready ✅" toast notification after first cache
68. NEVER make network requests during gameplay

### Install Prompt
69. Show custom "Install Game" button on title screen (not browser default)
70. Use `beforeinstallprompt` event to trigger install
71. Hide install button after game is installed (use `display-mode: fullscreen` media query)

### No-Login Design
72. **ZERO authentication** — no login, no signup, no guest mode
73. Player progress saved in `localStorage` — specific to device/browser
74. No user identification whatsoever
75. No personal data collection
76. No cookies (except service worker cache)

---

## 📐 Architecture Rules

### Rendering
1. **All game graphics rendered on HTML5 Canvas** — trains, tracks, puzzle pieces, grid, animations
2. **DOM elements ONLY for UI overlay** — buttons, score display, modals, menus
3. Use `requestAnimationFrame` for the game loop — target **60fps**
4. Canvas auto-scales to fit container while maintaining aspect ratio (16:9 preferred)
5. Draw order: background → grid → game objects → particles → UI hints

### Code Structure
6. Use **ES6 modules** (`import`/`export`) — one class per file
7. **No external libraries or CDN dependencies** — everything is vanilla
8. Follow this module hierarchy:
   ```
   app.js → GameEngine → ScreenManager → Screens → PuzzleEngine → Puzzles
                       → InputManager
                       → AudioManager
                       → StorageManager
                       → AnimationSystem
                       → ParticleSystem
   ```
9. Each puzzle type extends `BasePuzzle` class with these methods:
   ```javascript
   class BasePuzzle {
     init(levelConfig) {}     // Setup puzzle state
     update(deltaTime) {}     // Game loop tick
     render(ctx) {}           // Draw to canvas
     handleInput(event) {}    // Process user interaction
     checkWinCondition() {}   // Return true if solved
     getHint() {}             // Return hint data
     getScore() {}            // Return { moves, time, hintsUsed }
     destroy() {}             // Cleanup
   }
   ```

### State Management
10. Single `GameState` object as source of truth:
    ```javascript
    const GameState = {
      currentScreen: 'title',  // 'title' | 'levelSelect' | 'playing' | 'paused' | 'victory'
      currentLevel: 1,
      levelProgress: {},       // { [levelId]: { completed, stars, bestMoves, bestTime } }
      settings: { soundEnabled: true, musicEnabled: true }
    };
    ```
11. **Auto-save** to `localStorage` on every state change
12. Use `localStorage` key prefix: `choo-choo-adventure-`

---

## 🎨 Design Rules

### Color Palette (MUST use these CSS variables)
```css
:root {
  --sky-blue: #87CEEB;
  --grass-green: #4CAF50;
  --sun-yellow: #FFD700;
  --train-red: #E53935;
  --candy-pink: #FF69B4;
  --ocean-blue: #2196F3;
  --warm-orange: #FF9800;
  --cloud-white: #FFFFFF;
  --night-purple: #4A148C;
  --wood-brown: #795548;
  --success-green: #66BB6A;
  --error-red: #EF5350;
  --bg-gradient-start: #87CEEB;
  --bg-gradient-end: #E3F2FD;
}
```

### Typography
```css
/* Import in index.css */
@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

/* Usage */
--font-heading: 'Fredoka One', cursive;
--font-body: 'Nunito', sans-serif;
```

### Animation Easing
```css
--ease-bounce: cubic-bezier(0.68, -0.55, 0.27, 1.55);
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-snap: cubic-bezier(0.19, 1, 0.22, 1);
```

### Visual Style Rules
13. **Rounded corners everywhere** — minimum `border-radius: 12px` on buttons, `8px` on cards
14. **Drop shadows** — soft, colorful shadows (not grey). Example: `box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3)`
15. **No sharp edges** — this is a kids' game, everything should feel soft and friendly
16. **Large touch targets** — minimum 48x48px for all interactive elements
17. **High contrast text** — white text on colored backgrounds, dark text on light backgrounds
18. **Emoji in UI** — use emoji for visual cues (⭐, 🔒, 🚂, 💡)

---

## 🎮 Game Design Rules

### Difficulty & UX
19. **NO fail state** — children can always retry, no game over screen
20. **NO scary feedback** — wrong answers get gentle shake animation, NEVER red X marks
21. **Always reward** — minimum 1 star for completing any level
22. **Generous hints** — unlimited hints, but affects star rating
23. **No time pressure** — except Level 9-10 where train moves (but slowly, ~3 seconds per tile)
24. **Tutorial on first play** — animated hand showing what to do on Level 1

### Feedback Rules
25. **Correct placement**: 
    - Green glow pulse
    - Satisfying "click" sound
    - +1 particle burst (3-5 sparkles)
    - Piece snaps to grid with bounce
26. **Wrong placement**:
    - Gentle shake (200ms, 5px amplitude)
    - Soft "bonk" sound
    - Piece slides back to original position
    - NO negative visual indicators
27. **Level complete**:
    - 500ms pause
    - Train whistle sound
    - Full confetti particle explosion (50+ particles)
    - Stars animate in one by one (300ms delay each)
    - Character waves animation
    - "HEBAT!" / "BAGUS!" text bounces in
28. **Hint activation**:
    - Target position pulses with golden glow
    - Hint icon dims slightly (visual feedback of use)

### Input Handling
29. **Drag and drop** is the primary interaction for most puzzles
30. Support both **mouse** and **touch** with the same code path
31. **Tap/click** for switches (Level 9-10) and rotate (Level 5-6)
32. **No keyboard required** — but support arrow keys for accessibility
33. Implement **ghost preview** — show where piece will land while dragging
34. **Snap radius**: 30px — if piece is within 30px of target, snap it

---

## 🔧 Canvas Drawing Rules

### Drawing Trains (Programmatic)
35. Draw trains using basic shapes (rectangles, circles, arcs) — NOT image sprites
36. Train colors should be parameterizable:
    ```javascript
    function drawTrain(ctx, x, y, color, scale = 1) {
      // Body: rounded rectangle
      // Wheels: circles with inner detail
      // Chimney: small rectangle + circle
      // Windows: smaller rounded rectangles
      // Face: two dots for eyes, arc for smile
    }
    ```
37. Each wagon type has a distinct silhouette but same connection points

### Drawing Tracks
38. Tracks rendered as two parallel lines with perpendicular ties:
    ```javascript
    function drawTrack(ctx, x, y, type, tileSize) {
      // type: 'horizontal', 'vertical', 'curve-ne', 'curve-nw', 'curve-se', 'curve-sw'
      // Rails: 2 parallel lines (grey, 3px wide)
      // Ties: perpendicular brown rectangles every 15px
    }
    ```
39. Track connections must align pixel-perfectly at tile edges
40. Use **Bezier curves** for smooth curved track sections

### Drawing Grid
41. Grid cells drawn with subtle dashed borders
42. Valid placement cells have a light green tint
43. Hover state: cell background becomes slightly highlighted
44. Occupied cells show the placed piece with full opacity

---

## 📱 Responsive Design Rules

45. **Mobile-first** — design for 360px width first, then scale up
46. **Canvas sizing**: 
    ```javascript
    const GAME_WIDTH = 800;  // logical pixels
    const GAME_HEIGHT = 600; // logical pixels
    // Scale canvas to fit container while maintaining ratio
    ```
47. **Touch-friendly spacing**: minimum 16px gap between interactive elements
48. **Orientation**: Support both portrait and landscape, but optimize for landscape
49. **UI scales with viewport** — use `rem` units, base `font-size` responsive

---

## 🔊 Audio Rules

50. Use **Web Audio API** for sound effects (not `<audio>` elements)
51. Generate simple sounds programmatically when possible:
    - Click: short sine wave burst
    - Success: ascending three-note chime
    - Error: single low "bonk" tone
    - Whistle: frequency sweep
52. All audio **disabled by default** on mobile (autoplay policy)
53. Mute button always visible and accessible
54. Music is separate from SFX — independent volume controls

---

## 📊 Level Data Format

55. Level configurations in `levels.js`:
```javascript
export const LEVELS = [
  {
    id: 1,
    name: "Meadow Station",
    emoji: "🌿",
    type: "jigsaw",         // 'jigsaw' | 'ordering' | 'trackBuilder' | 'matching' | 'pathChooser'
    difficulty: 1,
    gridSize: { cols: 2, rows: 2 },
    targetMoves: 8,
    targetTime: 60,         // seconds
    config: {
      // Puzzle-type-specific configuration
      image: "train_engine",
      pieces: 4
    },
    tutorial: true,          // Show tutorial overlay on first play
    unlockRequires: null     // null = always unlocked (Level 1)
  },
  // ... more levels
];
```

---

## 🚫 Do NOT Do

- ❌ Use any npm packages or CDN libraries
- ❌ Use React, Vue, Angular, or any framework
- ❌ Use `<img>` tags for game elements (use Canvas drawing)
- ❌ Use inline styles in HTML (use CSS classes)
- ❌ Use `var` — always `const` or `let`
- ❌ Use `document.write` or `eval`
- ❌ Create scary or negative feedback for children
- ❌ Use small fonts (minimum 16px)
- ❌ Use alert/confirm/prompt dialogs
- ❌ Use complex words in UI text (target age 4-8)
- ❌ Block interaction during animations (cancel ongoing animation if user acts)
- ❌ Use grey or muted colors — everything should be BRIGHT and CHEERFUL

---

## ✅ Always Do

- ✅ Use `const` by default, `let` only when reassignment needed
- ✅ Add JSDoc comments to all public methods
- ✅ Use descriptive variable names (not `x`, `i`, `tmp`)
- ✅ Handle both mouse and touch events
- ✅ Auto-save progress after every meaningful action
- ✅ Provide visual feedback for EVERY user interaction (< 100ms)
- ✅ Use CSS custom properties for all colors
- ✅ Test on mobile viewport sizes
- ✅ Keep all text in Bahasa Indonesia
- ✅ Add `aria-label` to all buttons
- ✅ Preload all images before showing loading screen
- ✅ Use `will-change` CSS property sparingly and only when needed
- ✅ Clean up event listeners in `destroy()` methods
