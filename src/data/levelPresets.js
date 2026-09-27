import { ROWS, COLS, TILE_WALL, TILE_EMPTY } from '../utils/constants.js';

export const DEFAULT_ALLOWED_TOWERS = [
  'laser',
  'sniper',
  'gatling',
  'mortar',
  'bastion',
  'shockwall',
  'pylon',
  'cryo',
  'harvester'
];

export const LEVEL_PRESETS = [
  {
    id: 'two_rivers',
    name: 'Twin Valleys (2 Spawns, 1 Goal)',
    tagline: 'Converging multi-lane choke defense',
    desc: 'Two enemy entry vectors meeting at a fortified central gate before the final goal.',
    startingGold: 550,
    allowedTowers: ['laser', 'gatling', 'mortar', 'cryo', 'bastion', 'pylon'],
    spawns: [
      { id: 's1', name: 'North Pass (S1)', r: 2, c: 1, color: '#22c55e' },
      { id: 's2', name: 'South Gorge (S2)', r: 12, c: 1, color: '#10b981' }
    ],
    goals: [
      { id: 'g1', name: 'Citadel Gate (G1)', r: 7, c: 18, color: '#ef4444' }
    ],
    getGrid: () => {
      const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY));
      // Top channel
      for (let c = 0; c < 12; c++) {
        grid[0][c] = TILE_WALL;
        grid[4][c] = TILE_WALL;
      }
      // Bottom channel
      for (let c = 0; c < 12; c++) {
        grid[10][c] = TILE_WALL;
        grid[14][c] = TILE_WALL;
      }
      // Center divider & funnels
      for (let r = 5; r <= 9; r++) {
        grid[r][11] = TILE_WALL;
      }
      for (let c = 12; c < 17; c++) {
        grid[4][c] = TILE_WALL;
        grid[10][c] = TILE_WALL;
      }
      return grid;
    },
    waves: [
      {
        id: 'w1',
        name: 'Wave 1: Vanguard Incursion',
        rewardGold: 75,
        squads: [
          { enemyType: 'grunt', count: 8, spawnId: 's1', spawnInterval: 0.9, hp: 130, armor: 10, magicRes: 10, moveSpeed: 2.0, bounty: 14 },
          { enemyType: 'grunt', count: 8, spawnId: 's2', spawnInterval: 0.9, hp: 130, armor: 10, magicRes: 10, moveSpeed: 2.0, bounty: 14 }
        ]
      },
      {
        id: 'w2',
        name: 'Wave 2: Scout Ambush & Armored Push',
        rewardGold: 100,
        squads: [
          { enemyType: 'scout', count: 12, spawnId: 's1', spawnInterval: 0.6, hp: 80, armor: 0, magicRes: 40, moveSpeed: 3.4, bounty: 12 },
          { enemyType: 'tank', count: 4, spawnId: 's2', spawnInterval: 2.0, hp: 550, armor: 50, magicRes: 5, moveSpeed: 1.1, bounty: 40 }
        ]
      },
      {
        id: 'w3',
        name: 'Wave 3: Vermin Blitzkrieg',
        rewardGold: 120,
        squads: [
          { enemyType: 'swarm', count: 20, spawnId: 'both', spawnInterval: 0.35, hp: 45, armor: 0, magicRes: 0, moveSpeed: 2.8, bounty: 8 },
          { enemyType: 'grunt', count: 10, spawnId: 's2', spawnInterval: 0.8, hp: 180, armor: 20, magicRes: 20, moveSpeed: 2.1, bounty: 16 }
        ]
      },
      {
        id: 'w4',
        name: 'Wave 4: Siege Colossus',
        rewardGold: 200,
        squads: [
          { enemyType: 'tank', count: 6, spawnId: 's1', spawnInterval: 1.6, hp: 700, armor: 60, magicRes: 10, moveSpeed: 1.0, bounty: 50 },
          { enemyType: 'boss', count: 1, spawnId: 's2', spawnInterval: 3.0, hp: 2200, armor: 40, magicRes: 40, moveSpeed: 0.85, bounty: 180 }
        ]
      }
    ]
  },
  {
    id: 'crossroads_siege',
    name: 'Crossroads Siege (2 Spawns, 2 Goals)',
    tagline: 'Multi-target split defense',
    desc: 'Dual ingress points with dual goals requiring strategic coverage of two separate fronts.',
    startingGold: 700,
    allowedTowers: ['laser', 'sniper', 'gatling', 'mortar', 'bastion', 'shockwall', 'pylon', 'cryo', 'harvester'],
    spawns: [
      { id: 's1', name: 'West Rampart (S1)', r: 3, c: 1, color: '#22c55e' },
      { id: 's2', name: 'South Bastion (S2)', r: 12, c: 3, color: '#10b981' }
    ],
    goals: [
      { id: 'g1', name: 'North Sanctum (G1)', r: 2, c: 18, color: '#ef4444' },
      { id: 'g2', name: 'East Vault (G2)', r: 12, c: 18, color: '#f43f5e' }
    ],
    getGrid: () => {
      const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY));
      // Central cross blocks
      for (let r = 5; r <= 9; r++) {
        for (let c = 7; c <= 12; c++) {
          if (r === 7 && c === 9) continue; // single pass opening
          if (r === 7 && c === 10) continue;
          grid[r][c] = TILE_WALL;
        }
      }
      return grid;
    },
    waves: [
      {
        id: 'w1',
        name: 'Wave 1: Scout Probing',
        rewardGold: 80,
        squads: [
          { enemyType: 'scout', count: 10, spawnId: 's1', spawnInterval: 0.7, hp: 85, armor: 0, magicRes: 35, moveSpeed: 3.2, bounty: 12 },
          { enemyType: 'grunt', count: 8, spawnId: 's2', spawnInterval: 1.0, hp: 140, armor: 15, magicRes: 15, moveSpeed: 2.0, bounty: 14 }
        ]
      },
      {
        id: 'w2',
        name: 'Wave 2: Dual Front Pressure',
        rewardGold: 120,
        squads: [
          { enemyType: 'tank', count: 4, spawnId: 's1', spawnInterval: 1.8, hp: 600, armor: 55, magicRes: 5, moveSpeed: 1.1, bounty: 45 },
          { enemyType: 'swarm', count: 18, spawnId: 's2', spawnInterval: 0.35, hp: 45, armor: 0, magicRes: 0, moveSpeed: 2.7, bounty: 8 }
        ]
      },
      {
        id: 'w3',
        name: 'Wave 3: Heavy Golem Vanguard',
        rewardGold: 180,
        squads: [
          { enemyType: 'tank', count: 5, spawnId: 's1', spawnInterval: 1.5, hp: 750, armor: 60, magicRes: 10, moveSpeed: 1.0, bounty: 50 },
          { enemyType: 'boss', count: 1, spawnId: 's2', spawnInterval: 2.5, hp: 2000, armor: 35, magicRes: 35, moveSpeed: 0.85, bounty: 160 }
        ]
      }
    ]
  },
  {
    id: 'serpent_canyon',
    name: 'Serpent Canyon (1 Spawn, 1 Goal)',
    tagline: 'Classic deep winding labyrinth',
    desc: 'A single spawn with high maze length, allowing heavy focus on kill zones and synergy combos.',
    startingGold: 450,
    allowedTowers: ['laser', 'sniper', 'gatling', 'mortar', 'bastion', 'shockwall', 'cryo', 'pylon', 'harvester'],
    spawns: [
      { id: 's1', name: 'Canyon Entrance (S1)', r: 7, c: 1, color: '#22c55e' }
    ],
    goals: [
      { id: 'g1', name: 'Inner Keep (G1)', r: 7, c: 18, color: '#ef4444' }
    ],
    getGrid: () => {
      const grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY));
      for (let c = 3; c < 16; c++) grid[3][c] = TILE_WALL;
      for (let c = 3; c < 16; c++) grid[11][c] = TILE_WALL;
      for (let r = 3; r <= 11; r++) grid[r][11] = TILE_WALL;
      grid[7][11] = TILE_EMPTY; // bridge passage
      return grid;
    },
    waves: [
      {
        id: 'w1',
        name: 'Wave 1: Infantry March',
        rewardGold: 60,
        squads: [
          { enemyType: 'grunt', count: 12, spawnId: 's1', spawnInterval: 0.9, hp: 140, armor: 15, magicRes: 15, moveSpeed: 2.0, bounty: 15 }
        ]
      },
      {
        id: 'w2',
        name: 'Wave 2: Speed Surge',
        rewardGold: 90,
        squads: [
          { enemyType: 'scout', count: 16, spawnId: 's1', spawnInterval: 0.5, hp: 90, armor: 0, magicRes: 40, moveSpeed: 3.5, bounty: 12 }
        ]
      },
      {
        id: 'w3',
        name: 'Wave 3: Heavy Juggernauts',
        rewardGold: 140,
        squads: [
          { enemyType: 'tank', count: 6, spawnId: 's1', spawnInterval: 1.8, hp: 650, armor: 55, magicRes: 5, moveSpeed: 1.1, bounty: 45 },
          { enemyType: 'swarm', count: 20, spawnId: 's1', spawnInterval: 0.35, hp: 45, armor: 0, magicRes: 0, moveSpeed: 2.7, bounty: 8 }
        ]
      },
      {
        id: 'w4',
        name: 'Wave 4: Apex Behemoth',
        rewardGold: 220,
        squads: [
          { enemyType: 'boss', count: 2, spawnId: 's1', spawnInterval: 4.0, hp: 2400, armor: 40, magicRes: 40, moveSpeed: 0.8, bounty: 200 }
        ]
      }
    ]
  }
];
