import { useMemo, useCallback } from 'react';
import { ROWS, COLS, TILE_WALL } from '../utils/constants.js';

export function calculateBfsPath(grid, spawnPos, goalPos) {
  if (!spawnPos || !goalPos || !grid || grid.length !== ROWS) return null;

  // If spawn or goal is on a wall, path is blocked
  if (grid[spawnPos.r]?.[spawnPos.c] === TILE_WALL || grid[goalPos.r]?.[goalPos.c] === TILE_WALL) {
    return null;
  }

  const visited = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  const parent = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
  const queue = [{ r: spawnPos.r, c: spawnPos.c }];
  visited[spawnPos.r][spawnPos.c] = true;

  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];
  let reachedGoal = false;

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.r === goalPos.r && curr.c === goalPos.c) {
      reachedGoal = true;
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
  let curr = goalPos;
  while (curr !== null) {
    path.push(curr);
    curr = parent[curr.r][curr.c];
  }
  return path.reverse();
}

export function usePathfinding(grid, spawnPos, goalPos) {
  const findPath = useCallback((currentGrid, currentSpawn, currentGoal) => {
    return calculateBfsPath(currentGrid, currentSpawn, currentGoal);
  }, []);

  const path = useMemo(() => {
    return calculateBfsPath(grid, spawnPos, goalPos);
  }, [grid, spawnPos, goalPos]);

  const isBlocked = !path;

  return {
    path,
    isBlocked,
    findPath
  };
}
