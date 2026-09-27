export const COLS = 20;
export const ROWS = 15;

export const TILE_EMPTY = 0;
export const TILE_WALL = 1;

export const MODES = {
  SPAWN: 'spawn',
  GOAL: 'goal',
  WALL: 'wall',
  TOWER: 'tower'
};

export const COLORS = {
  bg: '#18141f',
  gridBorder: '#292233',
  wall: '#334155',
  wallBevel: 'rgba(255, 255, 255, 0.08)',
  wallShadow: 'rgba(0, 0, 0, 0.45)',
  pathLine: '#38bdf8',
  pathGlow: '#0284c7',
  spawn: '#22c55e',
  spawnRing: '#86efac',
  goal: '#ef4444',
  goalRing: '#fca5a5',
  towerBody: '#6b21a8',
  towerRing: '#c084fc',
  towerCore: '#a855f7',
  towerRangeFill: 'rgba(168, 85, 247, 0.08)',
  towerRangeStroke: 'rgba(168, 85, 247, 0.35)',
  bestTileStroke: '#eab308',
  laser: '#f43f5e',
  enemyBody: '#dc2626',
  enemyAccent: '#f87171'
};

export const SIMULATION_SPEEDS = [1, 2, 3];
