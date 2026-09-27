import { ROWS, COLS, TILE_WALL, TILE_EMPTY } from './constants.js';

/**
 * Multi-Spawn and Multi-Goal BFS Pathfinding
 * Finds the shortest reachable BFS path from a spawn point to any of the available goals.
 */
export function calculateSinglePath(grid, spawnPos, goalPositions) {
  if (!spawnPos || !goalPositions || goalPositions.length === 0 || !grid || grid.length !== ROWS) {
    return null;
  }

  // If spawn is on a wall, cannot path
  if (grid[spawnPos.r]?.[spawnPos.c] === TILE_WALL) {
    return null;
  }

  // Filter valid goals that aren't on walls
  const validGoals = goalPositions.filter(g => g && grid[g.r]?.[g.c] !== TILE_WALL);
  if (validGoals.length === 0) return null;

  const visited = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  const parent = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  const queue = [{ r: spawnPos.r, c: spawnPos.c }];
  visited[spawnPos.r][spawnPos.c] = true;

  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];
  let reachedGoal = null;

  while (queue.length > 0) {
    const curr = queue.shift();

    // Check if reached any goal
    const matchedGoal = validGoals.find(g => g.r === curr.r && g.c === curr.c);
    if (matchedGoal) {
      reachedGoal = matchedGoal;
      break;
    }

    for (let i = 0; i < 4; i++) {
      const nr = curr.r + dr[i];
      const nc = curr.c + dc[i];

      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (!visited[nr][nc] && grid[nr][nc] !== TILE_WALL) {
          visited[nr][nc] = true;
          parent[nr][nc] = { r: curr.r, c: curr.c };
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  if (!reachedGoal) return null;

  const path = [];
  let curr = reachedGoal;
  while (curr !== null) {
    path.push({ r: curr.r, c: curr.c });
    curr = parent[curr.r][curr.c];
  }
  return {
    path: path.reverse(),
    targetGoal: reachedGoal
  };
}

/**
 * Validate and calculate paths for all active spawns (max 2) to active goals (max 2).
 * Rule: Each active spawn MUST link to at least one reachable existing goal.
 */
export function calculateMultiPaths(grid, spawns, goals) {
  const activeSpawns = (spawns || []).slice(0, 2);
  const activeGoals = (goals || []).slice(0, 2);

  const paths = {};
  const targetGoals = {};
  const unlinkedSpawns = [];
  const errors = [];

  if (activeSpawns.length === 0) {
    errors.push('No spawn points defined. Place at least 1 spawn point.');
  }
  if (activeGoals.length === 0) {
    errors.push('No goal points defined. Place at least 1 goal point.');
  }

  activeSpawns.forEach((spawn, idx) => {
    const spawnId = spawn.id || `s${idx + 1}`;
    const result = calculateSinglePath(grid, spawn, activeGoals);

    if (result && result.path && result.path.length > 1) {
      paths[spawnId] = result.path;
      targetGoals[spawnId] = result.targetGoal;
    } else {
      unlinkedSpawns.push(spawn.name || `Spawn ${idx + 1}`);
      errors.push(`${spawn.name || `Spawn ${idx + 1}`} has no valid path to any Goal!`);
    }
  });

  const isValid = errors.length === 0 && unlinkedSpawns.length === 0 && activeSpawns.length > 0 && activeGoals.length > 0;

  return {
    isValid,
    paths,
    targetGoals,
    unlinkedSpawns,
    errors,
    spawnsCount: activeSpawns.length,
    goalsCount: activeGoals.length
  };
}
