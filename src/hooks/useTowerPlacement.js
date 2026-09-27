import { useState, useCallback } from 'react';
import { ROWS, COLS, TILE_EMPTY } from '../utils/constants.js';
import { TOWER_TYPES, DAMAGE_TYPES, getTowerStats, getTowerType } from '../data/towers.js';

export function runHeadlessSim(path, tr, tc, towerStats, enemyStats) {
  if (!path || path.length < 2) return null;

  const ts = 40;
  const waypoints = path.map(p => ({
    x: p.c * ts + ts / 2,
    y: p.r * ts + ts / 2
  }));

  const maxEnemies = Number(enemyStats.count);
  const spawnInterval = Number(enemyStats.spawnInterval);
  const hp = Number(enemyStats.hp);
  const baseArmor = Number(enemyStats.armor ?? 15);
  const baseMagicRes = Number(enemyStats.magicRes ?? 15);
  const moveSpeed = Number(enemyStats.moveSpeed);
  const bounty = Number(enemyStats.bounty);

  const damage = Number(towerStats.damage || 0);
  const attackSpeed = Number(towerStats.attackSpeed || 1);
  const attackInterval = 1 / Math.max(0.1, attackSpeed);
  const rangePx = Number(towerStats.range || 3.5) * ts;
  const damageType = towerStats.damageType || DAMAGE_TYPES.MAGICAL;

  const towerX = tc * ts + ts / 2;
  const towerY = tr * ts + ts / 2;

  const dt = 0.03;
  let simTime = 0;
  let spawnedCount = 0;
  let lastSpawnTime = -spawnInterval;
  let lastShotTime = -attackInterval;

  let enemies = [];
  let killed = 0;
  let leaked = 0;
  let goldEarned = 0;
  let totalDamage = 0;

  // Aegis Bastion leak absorption
  let shieldHp = Number(towerStats.shieldHp || 0);
  const slowPct = Number(towerStats.slowPct || 0);

  while (simTime < 300) {
    simTime += dt;

    // Spawn
    if (spawnedCount < maxEnemies) {
      if (simTime - lastSpawnTime >= spawnInterval) {
        enemies.push({
          x: waypoints[0].x,
          y: waypoints[0].y,
          hp: hp,
          armor: baseArmor,
          magicRes: baseMagicRes,
          slowFactor: 1.0,
          waypointIdx: 0,
          distanceTraveled: 0
        });
        spawnedCount++;
        lastSpawnTime = simTime;
      }
    }

    // Move
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const distToTower = Math.hypot(e.x - towerX, e.y - towerY);
      const isSlowed = slowPct > 0 && distToTower <= rangePx;
      const effectiveSpeed = moveSpeed * (isSlowed ? Math.max(0.2, 1 - slowPct / 100) : 1.0);

      const targetPoint = waypoints[e.waypointIdx + 1];
      if (targetPoint) {
        const dx = targetPoint.x - e.x;
        const dy = targetPoint.y - e.y;
        const dist = Math.hypot(dx, dy);
        const step = effectiveSpeed * ts * dt;

        if (dist <= step) {
          e.x = targetPoint.x;
          e.y = targetPoint.y;
          e.distanceTraveled += dist;
          e.waypointIdx++;

          if (e.waypointIdx >= waypoints.length - 1) {
            if (shieldHp > 0) {
              shieldHp--;
              e.hp = 0;
            } else {
              leaked++;
              e.hp = 0;
            }
          }
        } else {
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
          e.distanceTraveled += step;
        }
      }
    }

    enemies = enemies.filter(e => e.hp > 0);

    // Tower attack
    if (damage > 0 && enemies.length > 0) {
      if (simTime - lastShotTime >= attackInterval) {
        const inRange = [];
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          const d = Math.hypot(e.x - towerX, e.y - towerY);
          if (d <= rangePx) inRange.push(e);
        }

        if (inRange.length > 0) {
          inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
          const target = inRange[0];

          let mitigation = 0;
          if (damageType === DAMAGE_TYPES.PHYSICAL) {
            mitigation = target.armor / 100;
          } else {
            mitigation = target.magicRes / 100;
          }

          const actualDmg = Math.max(1, Math.round(damage * (1 - mitigation)));
          target.hp -= actualDmg;
          totalDamage += actualDmg;
          lastShotTime = simTime;

          if (target.hp <= 0) {
            killed++;
            goldEarned += bounty;
          }
        }
      }
    }

    enemies = enemies.filter(e => e.hp > 0);

    if (spawnedCount >= maxEnemies && enemies.length === 0) {
      break;
    }
  }

  return {
    r: tr,
    c: tc,
    leaks: leaked,
    killed: killed,
    totalDamage: totalDamage,
    goldEarned: goldEarned,
    timeElapsed: Number(simTime.toFixed(1))
  };
}

/**
 * Headless multi-tower wave simulation for heuristic optimization
 */
export function runMultiTowerHeadlessSim(path, towers, enemyStats) {
  if (!path || path.length < 2) return null;

  const ts = 40;
  const waypoints = path.map(p => ({
    x: p.c * ts + ts / 2,
    y: p.r * ts + ts / 2
  }));

  const maxEnemies = Number(enemyStats.count);
  const spawnInterval = Number(enemyStats.spawnInterval);
  const hp = Number(enemyStats.hp);
  const baseArmor = Number(enemyStats.armor ?? 15);
  const baseMagicRes = Number(enemyStats.magicRes ?? 15);
  const moveSpeed = Number(enemyStats.moveSpeed);
  const bounty = Number(enemyStats.bounty);

  // Setup towers
  let totalBastionShields = 0;
  const activeTowers = (towers || []).map(t => {
    const stats = t.stats || getTowerStats(t.typeId, t.level || 1);
    const towerTypeObj = getTowerType(t.typeId);
    const damageType = stats.damageType || towerTypeObj.damageType || DAMAGE_TYPES.MAGICAL;
    const attackSpeed = Math.max(0.1, Number(stats.attackSpeed || 1));
    const attackInterval = 1 / attackSpeed;

    if (t.typeId === 'bastion') {
      totalBastionShields += Number(stats.shieldHp || 2);
    }

    return {
      r: t.r,
      c: t.c,
      x: t.c * ts + ts / 2,
      y: t.r * ts + ts / 2,
      typeId: t.typeId,
      damageType: damageType,
      damage: Number(stats.damage || 0),
      attackInterval,
      rangePx: Number(stats.range || 3.5) * ts,
      lastShotTime: -attackInterval,
      slowPct: Number(stats.slowPct || 0),
      shredPct: Number(stats.shredPct || 0),
      buffSpeedPct: Number(stats.buffSpeedPct || 0),
      buffDmgPct: Number(stats.buffDmgPct || 0),
      goldPerTick: Number(stats.goldPerTick || 0),
      bountyMult: Number(stats.bountyMult || 1.0)
    };
  });

  // Calculate Pylon buffs
  activeTowers.forEach(t => {
    if (t.typeId === 'pylon') {
      activeTowers.forEach(targetT => {
        if (targetT !== t) {
          const d = Math.hypot(targetT.x - t.x, targetT.y - t.y);
          if (d <= t.rangePx) {
            targetT.buffSpeedBonus = Math.max(targetT.buffSpeedBonus || 0, t.buffSpeedPct / 100);
            targetT.buffDmgBonus = Math.max(targetT.buffDmgBonus || 0, t.buffDmgPct / 100);
          }
        }
      });
    }
  });

  // Recalculate attack intervals for buffed towers
  activeTowers.forEach(t => {
    if (t.buffSpeedBonus) {
      t.attackInterval = t.attackInterval / (1 + t.buffSpeedBonus);
    }
  });

  const dt = 0.04;
  let simTime = 0;
  let spawnedCount = 0;
  let lastSpawnTime = -spawnInterval;
  let lastHarvesterTime = 0;

  let enemies = [];
  let killed = 0;
  let leaked = 0;
  let goldEarned = 0;
  let totalDamage = 0;
  let bastionShieldsRemaining = totalBastionShields;

  while (simTime < 300) {
    simTime += dt;

    // 1. Spawn enemies
    if (spawnedCount < maxEnemies) {
      if (simTime - lastSpawnTime >= spawnInterval) {
        enemies.push({
          x: waypoints[0].x,
          y: waypoints[0].y,
          hp: hp,
          armor: baseArmor,
          magicRes: baseMagicRes,
          slowFactor: 1.0,
          shredArmor: 0,
          shredMagicRes: 0,
          waypointIdx: 0,
          distanceTraveled: 0
        });
        spawnedCount++;
        lastSpawnTime = simTime;
      }
    }

    // 2. Solar Harvester tick
    if (simTime - lastHarvesterTime >= 3.0) {
      lastHarvesterTime = simTime;
      activeTowers.forEach(t => {
        if (t.typeId === 'harvester') {
          goldEarned += t.goldPerTick;
        }
      });
    }

    // 3. Apply Slow & Shred Auras on Enemies
    enemies.forEach(e => {
      let maxSlow = 0;
      let maxShred = 0;
      activeTowers.forEach(t => {
        if (t.slowPct > 0 || t.shredPct > 0) {
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d <= t.rangePx) {
            maxSlow = Math.max(maxSlow, t.slowPct);
            maxShred = Math.max(maxShred, t.shredPct);
          }
        }
      });
      e.slowFactor = Math.max(0.2, 1 - maxSlow / 100);
      e.shredArmor = maxShred;
      e.shredMagicRes = maxShred;
    });

    // 4. Move enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const targetPoint = waypoints[e.waypointIdx + 1];
      if (targetPoint) {
        const dx = targetPoint.x - e.x;
        const dy = targetPoint.y - e.y;
        const dist = Math.hypot(dx, dy);
        const step = moveSpeed * e.slowFactor * ts * dt;

        if (dist <= step) {
          e.x = targetPoint.x;
          e.y = targetPoint.y;
          e.distanceTraveled += dist;
          e.waypointIdx++;

          if (e.waypointIdx >= waypoints.length - 1) {
            if (bastionShieldsRemaining > 0) {
              bastionShieldsRemaining--;
              e.hp = 0;
            } else {
              leaked++;
              e.hp = 0;
            }
          }
        } else {
          e.x += (dx / dist) * step;
          e.y += (dy / dist) * step;
          e.distanceTraveled += step;
        }
      }
    }

    enemies = enemies.filter(e => e.hp > 0);

    // 5. Towers attack
    if (enemies.length > 0) {
      for (let tIdx = 0; tIdx < activeTowers.length; tIdx++) {
        const tw = activeTowers[tIdx];
        if (tw.damage <= 0) continue;

        if (simTime - tw.lastShotTime >= tw.attackInterval) {
          const inRange = [];
          for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const d = Math.hypot(e.x - tw.x, e.y - tw.y);
            if (d <= tw.rangePx) inRange.push(e);
          }

          if (inRange.length > 0) {
            const isAoE = tw.typeId === 'shockwall';
            const targets = isAoE ? inRange : [inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled)[0]];

            targets.forEach(target => {
              const rawDmg = tw.damage * (1 + (tw.buffDmgBonus || 0));
              let mitigation = 0;
              if (tw.damageType === DAMAGE_TYPES.PHYSICAL) {
                const effArmor = Math.max(0, target.armor - target.shredArmor);
                mitigation = effArmor / 100;
              } else {
                const effMagicRes = Math.max(0, target.magicRes - target.shredMagicRes);
                mitigation = effMagicRes / 100;
              }

              const actualDmg = Math.max(1, Math.round(rawDmg * (1 - mitigation)));
              target.hp -= actualDmg;
              totalDamage += actualDmg;

              if (target.hp <= 0) {
                killed++;
                let bountyMult = 1.0;
                activeTowers.forEach(h => {
                  if (h.typeId === 'harvester') {
                    if (Math.hypot(target.x - h.x, target.y - h.y) <= h.rangePx) {
                      bountyMult = Math.max(bountyMult, h.bountyMult);
                    }
                  }
                });
                goldEarned += Math.round(bounty * bountyMult);
              }
            });

            tw.lastShotTime = simTime;
          }
        }
      }
    }

    enemies = enemies.filter(e => e.hp > 0);

    if (spawnedCount >= maxEnemies && enemies.length === 0) {
      break;
    }
  }

  return {
    leaks: leaked,
    killed: killed,
    totalDamage: totalDamage,
    goldEarned: goldEarned,
    timeElapsed: Number(simTime.toFixed(1))
  };
}

export function useTowerPlacement() {
  const [bestTowerTile, setBestTowerTile] = useState(null);
  const [aiResultsModal, setAiResultsModal] = useState(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const [optimalDefenseModal, setOptimalDefenseModal] = useState(null);
  const [optimalDefenseTowers, setOptimalDefenseTowers] = useState([]);
  const [isSearchingOptimal, setIsSearchingOptimal] = useState(false);

  /**
   * Find Best Single Placement
   */
  const findBestPlacement = useCallback((grid, path, spawnPos, goalPos, towerStats, enemyStats) => {
    if (!path || path.length < 2) return;

    setIsSearchingAI(true);

    setTimeout(() => {
      const candidateTiles = [];
      const rangeTiles = Number(towerStats.range);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const isSpawn = spawnPos && spawnPos.r === r && spawnPos.c === c;
          const isGoal = goalPos && goalPos.r === r && goalPos.c === c;
          if (grid[r]?.[c] === TILE_EMPTY && !isSpawn && !isGoal) {
            let inRangeOfPath = false;
            for (let i = 0; i < path.length; i++) {
              const d = Math.hypot(c - path[i].c, r - path[i].r);
              if (d <= rangeTiles) {
                inRangeOfPath = true;
                break;
              }
            }
            if (inRangeOfPath) {
              candidateTiles.push({ r, c });
            }
          }
        }
      }

      if (candidateTiles.length === 0) {
        setIsSearchingAI(false);
        return;
      }

      const results = [];
      candidateTiles.forEach(tile => {
        const sim = runHeadlessSim(path, tile.r, tile.c, towerStats, enemyStats);
        if (sim) results.push(sim);
      });

      results.sort((a, b) => {
        if (a.leaks !== b.leaks) return a.leaks - b.leaks;
        if (a.killed !== b.killed) return b.killed - a.killed;
        if (a.timeElapsed !== b.timeElapsed) return a.timeElapsed - b.timeElapsed;
        return b.totalDamage - a.totalDamage;
      });

      const top5 = results.slice(0, 5);
      const isZeroLeakPossible = top5.some(r => r.leaks === 0);

      if (top5.length > 0) {
        setBestTowerTile({ r: top5[0].r, c: top5[0].c });
      }

      setAiResultsModal({
        top5,
        totalTested: candidateTiles.length,
        isZeroLeakPossible
      });

      setIsSearchingAI(false);
    }, 50);
  }, []);

  const closeAiModal = useCallback((selectedPlacement = null) => {
    if (selectedPlacement) {
      setBestTowerTile({ r: selectedPlacement.r, c: selectedPlacement.c });
    }
    setAiResultsModal(null);
  }, []);

  /**
   * Greedy heuristic optimizer to find best combination of towers and upgrades
   */
  const findOptimalDefense = useCallback((gridOrOptions, path, spawnPos, goalPos, budget = 1000, enemyStats) => {
    let actualGrid = gridOrOptions;
    let actualPath = path;
    let actualSpawnPos = spawnPos;
    let actualGoalPos = goalPos;
    let actualBudget = budget;
    let actualEnemyStats = enemyStats;

    if (gridOrOptions && typeof gridOrOptions === 'object' && gridOrOptions.grid && Array.isArray(gridOrOptions.grid)) {
      actualGrid = gridOrOptions.grid;
      actualPath = gridOrOptions.path;
      actualSpawnPos = gridOrOptions.spawnPos;
      actualGoalPos = gridOrOptions.goalPos;
      actualBudget = gridOrOptions.budget !== undefined ? gridOrOptions.budget : 1000;
      actualEnemyStats = gridOrOptions.enemyStats;
    }

    if (!actualPath || actualPath.length < 2) return;

    setIsSearchingOptimal(true);

    setTimeout(() => {
      const maxBudget = Number(actualBudget) || 1000;
      let currentTowers = [];
      let currentGoldSpent = 0;

      const maxPossibleRange = 6.0;
      const candidateTiles = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const isSpawn = actualSpawnPos && actualSpawnPos.r === r && actualSpawnPos.c === c;
          const isGoal = actualGoalPos && actualGoalPos.r === r && actualGoalPos.c === c;
          if (actualGrid[r]?.[c] === TILE_EMPTY && !isSpawn && !isGoal) {
            let minDistanceToPath = Infinity;
            for (let i = 0; i < actualPath.length; i++) {
              const d = Math.hypot(c - actualPath[i].c, r - actualPath[i].r);
              if (d < minDistanceToPath) minDistanceToPath = d;
            }
            if (minDistanceToPath <= maxPossibleRange) {
              candidateTiles.push({ r, c, minDistanceToPath });
            }
          }
        }
      }

      candidateTiles.sort((a, b) => a.minDistanceToPath - b.minDistanceToPath);

      // Initial simulation with no towers
      let currentSim = runMultiTowerHeadlessSim(actualPath, currentTowers, actualEnemyStats) || {
        leaks: Number(actualEnemyStats?.count || 10),
        killed: 0,
        totalDamage: 0,
        timeElapsed: 0
      };

      const maxIterations = 14;
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        if (currentSim.leaks === 0) break;

        let bestNewTower = null;
        let bestNewTowerSim = null;
        let bestLeakReduction = 0;

        // Try adding one tower of each type at candidate positions
        for (const type of TOWER_TYPES) {
          const lvl1Stats = getTowerStats(type.id, 1);
          const towerCost = lvl1Stats.cost || 100;

          if (currentGoldSpent + towerCost > maxBudget) continue;

          for (const tile of candidateTiles) {
            const alreadyOccupied = currentTowers.some(tw => tw.r === tile.r && tw.c === tile.c);
            if (alreadyOccupied) continue;

            const testTowers = [
              ...currentTowers,
              { r: tile.r, c: tile.c, typeId: type.id, level: 1, stats: lvl1Stats }
            ];
            const sim = runMultiTowerHeadlessSim(actualPath, testTowers, actualEnemyStats);
            if (!sim) continue;

            const leakReduction = currentSim.leaks - sim.leaks;

            if (
              leakReduction > bestLeakReduction ||
              (leakReduction === bestLeakReduction && bestNewTowerSim && sim.totalDamage > bestNewTowerSim.totalDamage) ||
              (!bestNewTowerSim && leakReduction >= 0)
            ) {
              bestLeakReduction = leakReduction;
              bestNewTower = {
                r: tile.r,
                c: tile.c,
                typeId: type.id,
                typeName: type.name,
                level: 1,
                stats: lvl1Stats,
                cost: towerCost,
                color: type.color
              };
              bestNewTowerSim = sim;
            }
          }
        }

        // If a new tower successfully reduced leaks, add it
        if (bestNewTower && bestLeakReduction > 0) {
          currentTowers.push(bestNewTower);
          currentGoldSpent += bestNewTower.cost;
          currentSim = bestNewTowerSim;
          if (currentSim.leaks === 0) break;
          continue;
        }

        // If no new tower reduced leaks, try upgrading an existing tower
        let bestUpgradeIdx = -1;
        let bestUpgradeSim = null;
        let bestUpgradeLeakReduction = 0;
        let bestUpgradeCostDiff = 0;

        for (let idx = 0; idx < currentTowers.length; idx++) {
          const tw = currentTowers[idx];
          if (tw.level >= 3) continue;

          const nextLevel = tw.level + 1;
          const nextStats = getTowerStats(tw.typeId, nextLevel);
          const currentStats = getTowerStats(tw.typeId, tw.level);
          const upgradeCostDiff = nextStats.cost - currentStats.cost;

          if (currentGoldSpent + upgradeCostDiff > maxBudget) continue;

          const testTowers = currentTowers.map((twItem, i) =>
            i === idx ? { ...twItem, level: nextLevel, stats: nextStats } : twItem
          );
          const sim = runMultiTowerHeadlessSim(actualPath, testTowers, actualEnemyStats);
          if (!sim) continue;

          const leakReduction = currentSim.leaks - sim.leaks;

          if (
            leakReduction > bestUpgradeLeakReduction ||
            (leakReduction === bestUpgradeLeakReduction && bestUpgradeSim && sim.totalDamage > bestUpgradeSim.totalDamage) ||
            (!bestUpgradeSim && leakReduction >= 0)
          ) {
            bestUpgradeLeakReduction = leakReduction;
            bestUpgradeIdx = idx;
            bestUpgradeSim = sim;
            bestUpgradeCostDiff = upgradeCostDiff;
          }
        }

        if (bestUpgradeIdx !== -1 && bestUpgradeLeakReduction > 0) {
          const tw = currentTowers[bestUpgradeIdx];
          const nextLevel = tw.level + 1;
          const nextStats = getTowerStats(tw.typeId, nextLevel);
          currentTowers[bestUpgradeIdx] = {
            ...tw,
            level: nextLevel,
            stats: nextStats,
            cost: nextStats.cost
          };
          currentGoldSpent += bestUpgradeCostDiff;
          currentSim = bestUpgradeSim;
          if (currentSim.leaks === 0) break;
          continue;
        }

        // Fallback: If no strict leak reduction, but budget permits, place highest damage/utility tower
        if (bestNewTower && currentGoldSpent + bestNewTower.cost <= maxBudget && bestNewTowerSim && bestNewTowerSim.totalDamage > currentSim.totalDamage) {
          currentTowers.push(bestNewTower);
          currentGoldSpent += bestNewTower.cost;
          currentSim = bestNewTowerSim;
          continue;
        }

        break;
      }

      setOptimalDefenseTowers(currentTowers);

      const enemyCount = Number(actualEnemyStats?.count || 10);
      const isDoable = (currentSim.leaks === 0 || currentSim.killed >= enemyCount) && currentGoldSpent <= maxBudget;

      const optimalResult = {
        isDoable,
        towers: currentTowers,
        totalGoldSpent: currentGoldSpent,
        budget: maxBudget,
        leaks: currentSim.leaks,
        killed: currentSim.killed,
        totalDamage: currentSim.totalDamage,
        timeElapsed: currentSim.timeElapsed,
        enemyCount: Number(actualEnemyStats?.count || 10)
      };

      setOptimalDefenseModal(optimalResult);
      setIsSearchingOptimal(false);
    }, 60);
  }, []);

  const closeOptimalModal = useCallback(() => {
    setOptimalDefenseModal(null);
  }, []);

  return {
    bestTowerTile,
    setBestTowerTile,
    aiResultsModal,
    isSearchingAI,
    findBestPlacement,
    closeAiModal,
    optimalDefenseModal,
    optimalDefenseTowers,
    setOptimalDefenseTowers,
    isSearchingOptimal,
    findOptimalDefense,
    closeOptimalModal
  };
}
