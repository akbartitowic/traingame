/**
 * Level Configurations for Choo-Choo Puzzle Adventure
 * Total 10 Levels with progressively introduced mechanics.
 */

export const LEVELS = [
  // --------------------------------------------------------
  // Mechanic 1: Jigsaw Puzzle (Levels 1-2)
  // Assemble train parts into outlines
  // --------------------------------------------------------
  {
    id: 1,
    name: "Meadow Station",
    emoji: "🌿",
    type: "jigsaw",
    difficulty: 1,
    targetMoves: 4, // 4 pieces
    config: {
      image: "train_engine",
      pieces: 4,
      grid: { cols: 2, rows: 2 },
    },
    tutorial: true,
  },
  {
    id: 2,
    name: "Happy Farm",
    emoji: "🐄",
    type: "jigsaw",
    difficulty: 2,
    targetMoves: 6, // 6 pieces
    config: {
      image: "train_station",
      pieces: 6,
      grid: { cols: 3, rows: 2 },
    },
    tutorial: false,
  },
  
  // --------------------------------------------------------
  // Mechanic 2: Ordering Puzzle (Levels 3-4)
  // Arrange train wagons in correct order (numbers/colors)
  // --------------------------------------------------------
  {
    id: 3,
    name: "Bear Woods",
    emoji: "🐻",
    type: "ordering",
    difficulty: 2,
    targetMoves: 3, 
    config: {
      wagonCount: 3,
      orderType: "numbers", // 1, 2, 3
    },
    tutorial: true,
  },
  {
    id: 4,
    name: "Fox Glade",
    emoji: "🦊",
    type: "ordering",
    difficulty: 3,
    targetMoves: 5,
    config: {
      wagonCount: 5,
      orderType: "colors", // Rainbow order
    },
    tutorial: false,
  },
  
  // --------------------------------------------------------
  // Mechanic 3: Track Builder (Levels 5-6)
  // Place and rotate tracks to connect start to end
  // --------------------------------------------------------
  {
    id: 5,
    name: "River Crossing",
    emoji: "🌊",
    type: "trackBuilder",
    difficulty: 3,
    targetMoves: 5,
    config: {
      gridCols: 4,
      gridRows: 3,
      pieces: ['horizontal', 'horizontal', 'curve-se', 'vertical', 'curve-nw'],
      startPoint: { col: 0, row: 0, dir: 'right' },
      endPoint: { col: 3, row: 2, dir: 'left' }
    },
    tutorial: true,
  },
  {
    id: 6,
    name: "Mountain Foot",
    emoji: "⛰️",
    type: "trackBuilder",
    difficulty: 4,
    targetMoves: 8,
    config: {
      gridCols: 5,
      gridRows: 4,
      pieces: ['horizontal', 'vertical', 'curve-se', 'curve-sw', 'curve-ne', 'curve-nw', 'horizontal', 'vertical'],
      startPoint: { col: 0, row: 3, dir: 'right' },
      endPoint: { col: 4, row: 0, dir: 'left' }
    },
    tutorial: false,
  },

  // --------------------------------------------------------
  // Mechanic 4: Matching Puzzle (Levels 7-8)
  // Match cargo (animals/shapes) to correct wagons
  // --------------------------------------------------------
  {
    id: 7,
    name: "Rock Tunnel",
    emoji: "🪨",
    type: "matching",
    difficulty: 4,
    targetMoves: 4,
    config: {
      pairs: 4,
      matchType: "shapes" // Triangle cargo -> Triangle wagon
    },
    tutorial: true,
  },
  {
    id: 8,
    name: "Snowy Peaks",
    emoji: "❄️",
    type: "matching",
    difficulty: 5,
    targetMoves: 6,
    config: {
      pairs: 6,
      matchType: "animals" // Pig -> Farm wagon, etc
    },
    tutorial: false,
  },

  // --------------------------------------------------------
  // Mechanic 5: Path Chooser (Levels 9-10)
  // Train is moving, click switches to guide it to station
  // --------------------------------------------------------
  {
    id: 9,
    name: "Cloud View",
    emoji: "☁️",
    type: "pathChooser",
    difficulty: 5,
    targetMoves: 3, // Number of switches to flip
    config: {
      trainSpeed: 1, // Slow moving train
      switches: 3,
      correctPath: [1, 0, 1] // Which way switch should be flipped
    },
    tutorial: true,
  },
  {
    id: 10,
    name: "Dragon Peak",
    emoji: "🏰",
    type: "pathChooser",
    difficulty: 6,
    targetMoves: 5,
    config: {
      trainSpeed: 1.5, // Faster
      switches: 5,
      correctPath: [0, 1, 1, 0, 1]
    },
    tutorial: false,
  }
];
