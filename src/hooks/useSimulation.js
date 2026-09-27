import { useState, useRef, useCallback, useEffect } from 'react';
import { DAMAGE_TYPES, getTowerStats, getTowerType } from '../data/towers.js';
import { computeDamage } from '../utils/combat.js';
import { executeEntitySkills, TRIGGER_TYPES, EFFECT_TYPES } from '../utils/skills.js';
import { manaRegenRate } from '../utils/mana.js';

export function useSimulation({
  paths = {}, // { [spawnId]: path[] }
  spawns = [],
  goals = [],
  tileSize = 40,
  towers = [],
  waves = [],
  currentWaveIndex = 0,
  setCurrentWaveIndex,
  playerGold = 500,
  setPlayerGold,
  enemyTypesData = [],
  towersData = [],
  onFrameUpdate
}) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState(null); // null | 'wave_cleared' | 'wave_leaked' | 'level_complete' | 'blocked'
  const [simSpeed, setSimSpeed] = useState(1);
  const [pacingTelemetry, setPacingTelemetry] = useState([]);

  const [simResults, setSimResults] = useState({
    waveIndex: 0,
    spawned: 0,
    killed: 0,
    leaked: 0,
    leaksAbsorbed: 0,
    totalDamage: 0,
    goldEarned: 0,
    goldSpent: 0,
    timeElapsed: 0
  });

  // Keep latest prop values in stable refs to avoid re-instantiating the 60fps loop
  const pathsRef = useRef(paths);
  const spawnsRef = useRef(spawns);
  const goalsRef = useRef(goals);
  const tileSizeRef = useRef(tileSize);
  const towersRef = useRef(towers);
  const wavesRef = useRef(waves);
  const currentWaveIndexRef = useRef(currentWaveIndex);
  const playerGoldRef = useRef(playerGold);
  const setPlayerGoldRef = useRef(setPlayerGold);
  const enemyTypesDataRef = useRef(enemyTypesData);
  const towersDataRef = useRef(towersData);
  const simSpeedRef = useRef(simSpeed);
  const onFrameUpdateRef = useRef(onFrameUpdate);

  useEffect(() => { pathsRef.current = paths; }, [paths]);
  useEffect(() => { spawnsRef.current = spawns; }, [spawns]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { tileSizeRef.current = tileSize; }, [tileSize]);
  useEffect(() => { wavesRef.current = waves; }, [waves]);
  useEffect(() => { currentWaveIndexRef.current = currentWaveIndex; }, [currentWaveIndex]);
  useEffect(() => { playerGoldRef.current = playerGold; }, [playerGold]);
  useEffect(() => { setPlayerGoldRef.current = setPlayerGold; }, [setPlayerGold]);
  useEffect(() => { enemyTypesDataRef.current = enemyTypesData; }, [enemyTypesData]);
  useEffect(() => { towersDataRef.current = towersData; }, [towersData]);
  useEffect(() => { simSpeedRef.current = simSpeed; }, [simSpeed]);
  useEffect(() => { onFrameUpdateRef.current = onFrameUpdate; }, [onFrameUpdate]);

  // Core Simulation References
  const enemiesRef = useRef([]);
  const spawnQueueRef = useRef([]);
  const lastSpawnTimeRef = useRef(0);
  const towerLastShotsRef = useRef({});
  const harvesterLastTickRef = useRef({});
  const activeLaserRef = useRef(null);
  const activeLasersRef = useRef([]);
  const popupsRef = useRef([]);
  const bastionShieldsRef = useRef(0);
  const maxBastionShieldsRef = useRef(0);
  const lastTelemetrySecRef = useRef(0);
  const towerRuntimesRef = useRef({});

  // Enhanced Battle Simulation References
  const projectilesRef = useRef([]);      // Arcing mortar shells, rockets, etc.
  const particlesRef = useRef([]);        // High-performance particle pool (sparks, explosions, debris, coins)
  const towerStatesRef = useRef({});      // Turret angle, recoil, barrelSpin, muzzleFlash, charging state
  const pacingStateRef = useRef({         // Real-time battlefield tension & pacing state
    phase: 'calm',                        // 'calm' | 'approaching' | 'chokepoint_clash' | 'critical_breach' | 'boss_battle'
    threatRatio: 1.0,
    threatEHP: 0,
    defenseDPS: 0,
    activeAlert: null,                    // { text, subtext, type, duration, timestamp }
    dangerZoneEnemies: 0,
    isBossAlive: false,
    chokepoints: []                       // [{ x, y, intensity }]
  });
  const combatHeatRef = useRef({});       // Tile damage density for heatmap rendering
  const lastSquadIdxRef = useRef(-1);     // To trigger squad transition notifications
  const lastUiUpdateRef = useRef(0);      // Throttle React state triggers to 5Hz to prevent frame drops

  const simStatsRef = useRef({
    waveIndex: 0,
    spawned: 0,
    killed: 0,
    leaked: 0,
    leaksAbsorbed: 0,
    totalDamage: 0,
    goldEarned: 0,
    goldSpent: 0,
    timeElapsed: 0
  });

  const animFrameIdRef = useRef(null);
  const lastFrameTimeRef = useRef(null);

  // Synchronize and reconcile tower runtimes & states when towers are added, sold, or upgraded
  useEffect(() => {
    towersRef.current = towers;
    const activeKeys = new Set();

    towers.forEach(t => {
      const key = `${t.r}-${t.c}`;
      activeKeys.add(key);
      const stats = t.stats || getTowerStats(t.typeId, t.level || 1, towersDataRef.current);

      if (!towerRuntimesRef.current[key]) {
        towerRuntimesRef.current[key] = {
          mana: stats.maxMana || 100,
          maxMana: stats.maxMana || 100,
          cooldowns: {},
          stats
        };
        towerLastShotsRef.current[key] = 0;
      } else {
        // Update stats on existing tower (e.g. on upgrade)
        towerRuntimesRef.current[key].stats = stats;
        towerRuntimesRef.current[key].maxMana = stats.maxMana || 100;
      }

      if (!towerStatesRef.current[key]) {
        towerStatesRef.current[key] = {
          angle: 0,
          recoil: 0,
          barrelSpin: 0,
          muzzleFlash: 0,
          charge: 0,
          lastTarget: null
        };
      }
    });

    // Prune sold towers
    Object.keys(towerRuntimesRef.current).forEach(k => {
      if (!activeKeys.has(k)) {
        delete towerRuntimesRef.current[k];
        delete towerStatesRef.current[k];
        delete towerLastShotsRef.current[k];
        delete harvesterLastTickRef.current[k];
      }
    });

    // Clean lasers from sold towers
    activeLasersRef.current = activeLasersRef.current.filter(l => {
      if (l.towerKey) return activeKeys.has(l.towerKey);
      return true;
    });
  }, [towers]);

  const stopSimulation = useCallback((status = null) => {
    setIsSimulating(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (status) {
      setSimStatus(status);
      setSimResults({ ...simStatsRef.current });
    }
  }, []);

  const dismissStatus = useCallback(() => {
    setSimStatus(null);
  }, []);

  // Pre-calculate waypoint pixel coordinates and total path length for each spawn
  const getWaypointsForSpawn = useCallback((spawnId) => {
    const currentPaths = pathsRef.current;
    const spPath = currentPaths[spawnId] || currentPaths['s1'] || Object.values(currentPaths)[0];
    if (!spPath || spPath.length < 2) return null;
    const ts = tileSizeRef.current;
    const waypoints = spPath.map(p => ({
      x: p.c * ts + ts / 2,
      y: p.r * ts + ts / 2,
      c: p.c,
      r: p.r
    }));

    let totalLength = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalLength += Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
    }

    return { waypoints, totalLength: Math.max(1, totalLength) };
  }, []);

  // Minimal burst particles
  const spawnParticles = useCallback((x, y, count, color, type = 'spark', speed = 40) => {
    const actualCount = Math.min(count, 3);
    if (particlesRef.current.length > 25) {
      particlesRef.current.splice(0, actualCount);
    }
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.5 + 0.3) * speed;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.6,
        decay: Math.random() * 2.0 + 1.8,
        color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
        size: Math.random() * 2 + 1.5,
        type
      });
    }
  }, []);

  // Main high-performance simulation frame loop (stable reference, reads latest via refs)
  const runSimFrame = useCallback((timestamp) => {
    if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
    const rawDt = (timestamp - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = timestamp;

    const currentSimSpeed = simSpeedRef.current || 1;
    const dt = Math.min(rawDt, 0.1) * currentSimSpeed;
    const ts = tileSizeRef.current || 40;
    const currentWaves = wavesRef.current || [];
    const waveIdx = currentWaveIndexRef.current || 0;
    const activeWave = currentWaves[waveIdx] || currentWaves[0];
    const currentTowers = towersRef.current || [];
    const currentTowersData = towersDataRef.current || [];

    simStatsRef.current.timeElapsed = Number((simStatsRef.current.timeElapsed + dt).toFixed(1));

    if (!activeWave) {
      stopSimulation('blocked');
      return;
    }

    // 1. Spawning from Spawn Queue with Pacing Transitions
    if (spawnQueueRef.current.length > 0) {
      const nextUnit = spawnQueueRef.current[0];
      const elapsedSinceSpawn = (timestamp - lastSpawnTimeRef.current) / 1000;

      if (lastSpawnTimeRef.current === 0 || elapsedSinceSpawn >= (nextUnit.spawnInterval || 0.8) / currentSimSpeed) {
        spawnQueueRef.current.shift();
        lastSpawnTimeRef.current = timestamp;

        // Squad transition alert check
        if (nextUnit.squadIdx !== undefined && nextUnit.squadIdx !== lastSquadIdxRef.current) {
          lastSquadIdxRef.current = nextUnit.squadIdx;
          const archName = nextUnit.archName || 'Enemies';
          const isBoss = nextUnit.enemyType === 'boss';
          pacingStateRef.current.activeAlert = {
            text: isBoss ? `⚠️ APEX BOSS DETECTED!` : `⚡ SQUAD ${nextUnit.squadIdx + 1}: ${archName.toUpperCase()}`,
            subtext: isBoss ? 'Extreme armor & HP. Direct all firepower!' : `${nextUnit.enemyType === 'scout' ? 'Rapid Speedster • Low Armor' : nextUnit.enemyType === 'tank' ? 'Heavy Plating • Physical Resistant' : 'Combat Vanguard'}`,
            type: isBoss ? 'boss' : 'squad',
            timestamp: performance.now(),
            duration: isBoss ? 4000 : 2500
          };
        }

        const pathData = getWaypointsForSpawn(nextUnit.spawnId);
        if (pathData && pathData.waypoints.length >= 2) {
          const { waypoints, totalLength } = pathData;
          const initialTarget = waypoints[1];
          const initialAngle = Math.atan2(initialTarget.y - waypoints[0].y, initialTarget.x - waypoints[0].x);

          enemiesRef.current.push({
            id: `en-${Date.now()}-${Math.random()}`,
            spawnId: nextUnit.spawnId,
            enemyType: nextUnit.enemyType,
            waypoints: waypoints,
            totalPathLength: totalLength,
            x: waypoints[0].x,
            y: waypoints[0].y,
            hp: nextUnit.hp,
            maxHp: nextUnit.hp,
            currentMana: 50,
            maxMana: 100,
            cooldowns: {},
            baseStats: nextUnit.baseStats || {},
            skills: nextUnit.skills || [],
            armor: nextUnit.armor ?? 15,
            magicRes: nextUnit.magicRes ?? 15,
            moveSpeed: nextUnit.moveSpeed,
            baseMoveSpeed: nextUnit.moveSpeed,
            bounty: nextUnit.bounty,
            slowFactor: 1.0,
            shredArmor: 0,
            shredMagicRes: 0,
            waypointIdx: 0,
            distanceTraveled: 0,
            pathProgress: 0,
            angle: initialAngle,
            spawnTime: timestamp,
            hitFlash: 0,
            flinchX: 0,
            flinchY: 0
          });

          simStatsRef.current.spawned++;

          popupsRef.current.push({
            type: 'spawnPortal',
            x: waypoints[0].x,
            y: waypoints[0].y,
            startTime: timestamp,
            duration: 400
          });
        }
      }
    }

    // 2. Utility Auras: Pylon Buffs & Harvester Passive Gold
    const towerBuffs = {};
    currentTowers.forEach(tw => {
      const twStats = tw.stats || getTowerStats(tw.typeId, tw.level || 1, currentTowersData);
      if (tw.typeId === 'pylon') {
        const pylonX = tw.c * ts + ts / 2;
        const pylonY = tw.r * ts + ts / 2;
        const pylonRangePx = Number(twStats.range || 3.5) * ts;
        const buffSpeed = Number(twStats.buffSpeedPct || 20) / 100;
        const buffDmg = Number(twStats.buffDmgPct || 15) / 100;

        currentTowers.forEach(targetTw => {
          if (targetTw !== tw) {
            const tx = targetTw.c * ts + ts / 2;
            const ty = targetTw.r * ts + ts / 2;
            if (Math.hypot(tx - pylonX, ty - pylonY) <= pylonRangePx) {
              const targetKey = `${targetTw.r}-${targetTw.c}`;
              if (!towerBuffs[targetKey]) {
                towerBuffs[targetKey] = { speedBonus: 0, dmgBonus: 0 };
              }
              towerBuffs[targetKey].speedBonus = Math.max(towerBuffs[targetKey].speedBonus, buffSpeed);
              towerBuffs[targetKey].dmgBonus = Math.max(towerBuffs[targetKey].dmgBonus, buffDmg);
            }
          }
        });
      } else if (tw.typeId === 'harvester') {
        const hKey = `${tw.r}-${tw.c}`;
        const lastTick = harvesterLastTickRef.current[hKey] || 0;
        const elapsed = (timestamp - lastTick) / 1000;
        const goldTick = Number(twStats.goldPerTick || 10);

        if (lastTick === 0 || elapsed >= 3.0 / currentSimSpeed) {
          harvesterLastTickRef.current[hKey] = timestamp;
          simStatsRef.current.goldEarned += goldTick;
          if (setPlayerGoldRef.current) setPlayerGoldRef.current(prev => prev + goldTick);

          const hx = tw.c * ts + ts / 2;
          const hy = tw.r * ts + ts / 2;

          popupsRef.current.push({
            type: 'goldHarvest',
            x: hx,
            y: hy - 14,
            amount: goldTick,
            startTime: performance.now(),
            duration: 800
          });
        }
      }
    });

    // 3. Enemy Aura Application & Cooldown Updates
    enemiesRef.current.forEach(enemy => {
      let maxSlowPct = 0;
      let maxShredPct = 0;

      // Decrement enemy skill cooldowns
      if (enemy.cooldowns) {
        Object.keys(enemy.cooldowns).forEach(k => {
          enemy.cooldowns[k] = Math.max(0, enemy.cooldowns[k] - dt);
        });
      }

      currentTowers.forEach(tw => {
        const twStats = tw.stats || getTowerStats(tw.typeId, tw.level || 1, currentTowersData);
        const twX = tw.c * ts + ts / 2;
        const twY = tw.r * ts + ts / 2;
        const rangePx = Number(twStats.range || 3.5) * ts;
        const dist = Math.hypot(enemy.x - twX, enemy.y - twY);

        if (dist <= rangePx) {
          if (tw.typeId === 'cryo') {
            maxSlowPct = Math.max(maxSlowPct, Number(twStats.slowPct || 35));
            maxShredPct = Math.max(maxShredPct, Number(twStats.shredPct || 15));
          } else if (tw.typeId === 'bastion') {
            maxSlowPct = Math.max(maxSlowPct, Number(twStats.slowPct || 20));
          } else if (tw.typeId === 'shockwall') {
            maxSlowPct = Math.max(maxSlowPct, Number(twStats.slowPct || 25));
          }
        }
      });

      enemy.slowFactor = Math.max(0.2, 1 - maxSlowPct / 100);
      enemy.shredArmor = maxShredPct;
      enemy.shredMagicRes = maxShredPct;

      // Decay hit flash
      if (enemy.hitFlash > 0) {
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 8.0);
      }
      enemy.flinchX = 0;
      enemy.flinchY = 0;
    });

    // 4. Enemy Movement along assigned waypoints
    let dangerZoneCount = 0;
    let isBossPresent = false;

    enemiesRef.current.forEach(enemy => {
      if (enemy.enemyType === 'boss') isBossPresent = true;

      const waypoints = enemy.waypoints;
      if (!waypoints || waypoints.length < 2) return;

      const effectiveSpeed = (enemy.moveSpeed || 2.0) * (enemy.slowFactor || 1.0);
      let remainingDist = effectiveSpeed * ts * dt;

      while (remainingDist > 0 && enemy.waypointIdx < waypoints.length - 1) {
        const targetPoint = waypoints[enemy.waypointIdx + 1];
        const dx = targetPoint.x - enemy.x;
        const dy = targetPoint.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.001) {
          const targetAngle = Math.atan2(dy, dx);
          let diff = targetAngle - enemy.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          enemy.angle += diff * Math.min(1.0, dt * 20);
        }

        if (dist <= remainingDist) {
          enemy.x = targetPoint.x;
          enemy.y = targetPoint.y;
          enemy.distanceTraveled += dist;
          remainingDist -= dist;
          enemy.waypointIdx++;

          // Reached Final Goal
          if (enemy.waypointIdx >= waypoints.length - 1) {
            if (bastionShieldsRef.current > 0) {
              bastionShieldsRef.current--;
              simStatsRef.current.leaksAbsorbed++;
              enemy.leaked = true;
              enemy.hp = 0;
              remainingDist = 0;

              pacingStateRef.current.activeAlert = {
                text: `🛡️ BASTION DEFLECTED LEAK!`,
                subtext: `${bastionShieldsRef.current} Shield Barrier(s) remaining`,
                type: 'shield',
                timestamp: performance.now(),
                duration: 2500
              };

              popupsRef.current.push({
                type: 'shieldAbsorb',
                x: targetPoint.x,
                y: targetPoint.y,
                shieldsLeft: bastionShieldsRef.current,
                startTime: timestamp,
                duration: 800
              });
            } else {
              enemy.leaked = true;
              enemy.hp = 0;
              simStatsRef.current.leaked++;
              remainingDist = 0;

              pacingStateRef.current.activeAlert = {
                text: `🚨 PERIMETER BREACH!`,
                subtext: `Hostile breached command goal!`,
                type: 'breach',
                timestamp: performance.now(),
                duration: 2500
              };
            }
            break;
          }
        } else {
          enemy.x += (dx / dist) * remainingDist;
          enemy.y += (dy / dist) * remainingDist;
          enemy.distanceTraveled += remainingDist;
          remainingDist = 0;
        }
      }

      enemy.pathProgress = Math.min(1.0, enemy.distanceTraveled / (enemy.totalPathLength || 1));
      if (enemy.pathProgress >= 0.75) {
        dangerZoneCount++;
      }
    });

    pacingStateRef.current.dangerZoneEnemies = dangerZoneCount;
    pacingStateRef.current.isBossAlive = isBossPresent;

    enemiesRef.current = enemiesRef.current.filter(e => e.hp > 0 && !e.leaked);

    // 5. Projectiles Updates (e.g. Mortar ballistic shells)
    const activeProjectiles = [];
    projectilesRef.current.forEach(proj => {
      if (proj.targetEnemy && proj.targetEnemy.hp > 0 && !proj.targetEnemy.leaked) {
        proj.tx = proj.targetEnemy.x;
        proj.ty = proj.targetEnemy.y;
      }
      proj.progress += dt * proj.speed;

      if (proj.progress >= 1.0) {
        if (proj.type === 'mortar') {
          popupsRef.current.push({
            type: 'explosionRing',
            x: proj.tx,
            y: proj.ty,
            radius: proj.aoeRadius,
            startTime: performance.now(),
            duration: 250
          });

          enemiesRef.current.forEach(e => {
            const dist = Math.hypot(e.x - proj.tx, e.y - proj.ty);
            if (dist <= proj.aoeRadius) {
              const { damage: dmg, isCrit } = computeDamage(
                { critRate: 0.1, critDamage: 1.5 },
                e,
                DAMAGE_TYPES.PHYSICAL,
                proj.damage
              );

              e.hp -= dmg;
              e.hitFlash = 1.0;
              simStatsRef.current.totalDamage += dmg;

              const heatKey = `${Math.floor(e.y / ts)}-${Math.floor(e.x / ts)}`;
              combatHeatRef.current[heatKey] = (combatHeatRef.current[heatKey] || 0) + dmg;

              popupsRef.current.push({
                type: 'damage',
                x: e.x,
                y: e.y,
                damage: dmg,
                damageType: DAMAGE_TYPES.PHYSICAL,
                isCrit: isCrit,
                startTime: performance.now(),
                duration: 400
              });

              if (e.hp <= 0) {
                simStatsRef.current.killed++;
                const earned = Number(e.bounty || 15);
                simStatsRef.current.goldEarned += earned;
                if (setPlayerGoldRef.current) setPlayerGoldRef.current(prev => prev + earned);

                popupsRef.current.push({
                  type: 'enemyDeath',
                  x: e.x,
                  y: e.y,
                  bounty: earned,
                  startTime: performance.now(),
                  duration: 500
                });
              }
            }
          });
        }
      } else {
        activeProjectiles.push(proj);
      }
    });
    projectilesRef.current = activeProjectiles;

    // 6. Laser Beams Decay (Snappy ~130ms duration)
    if (activeLasersRef.current.length > 0) {
      activeLasersRef.current.forEach(l => {
        l.opacity -= dt * 7.5;
      });
      activeLasersRef.current = activeLasersRef.current.filter(l => l.opacity > 0);
      if (activeLasersRef.current.length > 15) {
        activeLasersRef.current = activeLasersRef.current.slice(-15);
      }
      activeLaserRef.current = activeLasersRef.current[0] || null;
    } else {
      activeLaserRef.current = null;
    }

    // 7. Tower Attacks, Directional Aiming & Recoil Animation
    let totalEngagedTowers = 0;

    if (currentTowers.length > 0) {
      for (let tIdx = 0; tIdx < currentTowers.length; tIdx++) {
        const tw = currentTowers[tIdx];
        const twStats = tw.stats || getTowerStats(tw.typeId, tw.level || 1, currentTowersData);
        const towerTypeObj = getTowerType(tw.typeId);
        const damageType = twStats.damageType || towerTypeObj.damageType || DAMAGE_TYPES.MAGICAL;

        const towerKey = `${tw.r}-${tw.c}`;
        const towerX = tw.c * ts + ts / 2;
        const towerY = tw.r * ts + ts / 2;

        // Tower Mana Regeneration & Cooldowns
        let twRuntime = towerRuntimesRef.current[towerKey];
        if (!twRuntime) {
          twRuntime = {
            mana: twStats.maxMana || 100,
            maxMana: twStats.maxMana || 100,
            cooldowns: {},
            stats: twStats
          };
          towerRuntimesRef.current[towerKey] = twRuntime;
        }

        const twInt = twStats.attributes?.INT || 10;
        const manaRegen = manaRegenRate({ INT: twInt });
        twRuntime.mana = Math.min(twRuntime.maxMana || 100, (twRuntime.mana || 0) + manaRegen * dt);
        if (twRuntime.cooldowns) {
          Object.keys(twRuntime.cooldowns).forEach(k => {
            twRuntime.cooldowns[k] = Math.max(0, twRuntime.cooldowns[k] - dt);
          });
        }

        if (!towerStatesRef.current[towerKey]) {
          towerStatesRef.current[towerKey] = {
            angle: 0,
            recoil: 0,
            barrelSpin: 0,
            muzzleFlash: 0,
            charge: 0,
            lastTarget: null
          };
        }
        const twState = towerStatesRef.current[towerKey];

        // Smooth snappy decay of recoil & muzzle flash
        twState.recoil = Math.max(0, twState.recoil - dt * 8.0);
        twState.muzzleFlash = Math.max(0, twState.muzzleFlash - dt * 10.0);
        if (tw.typeId === 'gatling' && twState.recoil > 0.05) {
          twState.barrelSpin += dt * 30.0;
        }

        // Non-combat towers skip targeting
        if (tw.typeId === 'pylon' || tw.typeId === 'harvester' || (tw.typeId === 'bastion' && Number(twStats.damage || 0) === 0)) {
          continue;
        }

        const buff = towerBuffs[towerKey] || { speedBonus: 0, dmgBonus: 0 };
        const rangePx = Number(twStats.range || 3.5) * ts;
        const baseSpeed = Math.max(0.1, Number(twStats.attackSpeed || 1.0));
        const finalSpeed = baseSpeed * (1 + buff.speedBonus);
        const attackInterval = 1 / finalSpeed;

        const lastShotTime = towerLastShotsRef.current[towerKey] || 0;
        const elapsedSinceShot = (timestamp - lastShotTime) / 1000;

        // Find enemies in range
        const inRange = enemiesRef.current.filter(e => {
          return Math.hypot(e.x - towerX, e.y - towerY) <= rangePx;
        });

        if (inRange.length > 0) {
          totalEngagedTowers++;
          const primaryTarget = inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled)[0];

          // Snappy aim rotation towards primary target
          const targetAngle = Math.atan2(primaryTarget.y - towerY, primaryTarget.x - towerX);
          let angleDiff = targetAngle - twState.angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          twState.angle += angleDiff * Math.min(1.0, dt * 25.0);
          twState.lastTarget = { x: primaryTarget.x, y: primaryTarget.y };

          // Fire weapons when cooldown expires
          if (lastShotTime === 0 || elapsedSinceShot >= attackInterval / currentSimSpeed) {
            twState.recoil = 0.6;
            twState.muzzleFlash = 0.8;

            const isMortar = tw.typeId === 'mortar';
            const isShockwall = tw.typeId === 'shockwall';
            const isSniper = tw.typeId === 'sniper';

            if (isMortar) {
              projectilesRef.current.push({
                id: `mortar-${Date.now()}-${Math.random()}`,
                type: 'mortar',
                sx: towerX,
                sy: towerY,
                tx: primaryTarget.x,
                ty: primaryTarget.y,
                targetEnemy: primaryTarget,
                progress: 0,
                speed: 3.0 * currentSimSpeed,
                aoeRadius: ts * 1.5,
                damage: Number(twStats.damage || 125) * (1 + buff.dmgBonus),
                damageType: DAMAGE_TYPES.PHYSICAL
              });
            } else {
              const targets = isShockwall ? inRange : [primaryTarget];

              targets.forEach(target => {
                const rawDmg = Number(twStats.damage || 20) * (1 + buff.dmgBonus);

                const attacker = {
                  ...twStats,
                  buffDmgPct: (buff.dmgBonus || 0) * 100
                };
                const { damage: finalDmg, isCrit } = computeDamage(
                  attacker,
                  target,
                  damageType,
                  rawDmg
                );
                target.hp -= finalDmg;
                target.hitFlash = 1.0;

                simStatsRef.current.totalDamage += finalDmg;

                // Heat map recording
                const heatKey = `${Math.floor(target.y / ts)}-${Math.floor(target.x / ts)}`;
                combatHeatRef.current[heatKey] = (combatHeatRef.current[heatKey] || 0) + finalDmg;

                // Visual combat beam
                const laserColor =
                  damageType === DAMAGE_TYPES.PHYSICAL ? '#f59e0b' :
                  isSniper ? '#38bdf8' :
                  isShockwall ? '#06b6d4' :
                  tw.typeId === 'cryo' ? '#38bdf8' : '#a855f7';

                const newLaser = {
                  id: `${towerKey}-${target.id}-${Date.now()}`,
                  towerKey: towerKey,
                  target: target,
                  tx: towerX,
                  ty: towerY,
                  ex: target.x,
                  ey: target.y,
                  color: laserColor,
                  damageType: damageType,
                  isSniper,
                  isShockwall,
                  opacity: 1.0
                };

                activeLasersRef.current.push(newLaser);
                activeLaserRef.current = newLaser;

                // Damage number popup
                popupsRef.current.push({
                  type: 'damage',
                  x: target.x,
                  y: target.y,
                  damage: finalDmg,
                  damageType: damageType,
                  isCrit: isCrit || (isSniper && finalDmg > 120),
                  startTime: performance.now(),
                  duration: 400
                });

                if (popupsRef.current.length > 25) {
                  popupsRef.current.splice(0, popupsRef.current.length - 25);
                }

                // Attacker on_hit skill trigger (safely handle skill execution result object)
                if (twStats.skills && twStats.skills.length > 0) {
                  const hitSkillResult = executeEntitySkills(twStats, twStats.skills, twRuntime.cooldowns, {
                    trigger: TRIGGER_TYPES.ON_HIT,
                    target: target
                  });
                  if (hitSkillResult?.nextCooldowns) {
                    twRuntime.cooldowns = hitSkillResult.nextCooldowns;
                  }
                  const hitEvents = hitSkillResult?.events || [];
                  hitEvents.forEach(ev => {
                    if (ev.type === EFFECT_TYPES.DAMAGE) {
                      const dmgVal = Number(ev.damage ?? ev.value ?? ev.amount ?? 0);
                      target.hp -= dmgVal;
                      simStatsRef.current.totalDamage += dmgVal;
                    } else if (ev.type === EFFECT_TYPES.DEBUFF && ev.statKey) {
                      if (ev.statKey === 'magicRes' || ev.stat === 'magicRes') {
                        target.shredMagicRes = Math.min(100, (target.shredMagicRes || 0) + Number(ev.value || 0));
                      } else if (ev.statKey === 'armor' || ev.stat === 'armor') {
                        target.shredArmor = Math.min(100, (target.shredArmor || 0) + Number(ev.value || 0));
                      }
                    }
                  });
                }

                // Defender on_hp_below_x skill trigger
                if (target.skills && target.skills.length > 0 && target.hp > 0) {
                  const defSkillResult = executeEntitySkills(target, target.skills, target.cooldowns, {
                    trigger: TRIGGER_TYPES.ON_HP_BELOW_X,
                    entity: target
                  });
                  if (defSkillResult?.nextCooldowns) {
                    target.cooldowns = defSkillResult.nextCooldowns;
                  }
                  const defEvents = defSkillResult?.events || [];
                  defEvents.forEach(ev => {
                    popupsRef.current.push({
                      type: 'skillTrigger',
                      x: target.x,
                      y: target.y,
                      text: `🛡️ ${ev.skillName || 'SURGE'}`,
                      color: 'rgb(244, 63, 94)',
                      startTime: performance.now(),
                      duration: 700
                    });
                    if (ev.statKey === 'moveSpeed' || ev.stat === 'moveSpeed') {
                      const speedBonus = Number(ev.value || 15) / 100;
                      target.moveSpeed = (target.baseMoveSpeed || target.moveSpeed || 2.0) * (1 + speedBonus);
                    } else if (ev.statKey === 'armor' || ev.stat === 'armor') {
                      target.armor = (target.armor || 15) + Number(ev.value || 10);
                    }
                  });
                }

                if (target.hp <= 0) {
                  simStatsRef.current.killed++;

                  // Killing tower on_kill skill trigger
                  if (twStats.skills && twStats.skills.length > 0) {
                    const killSkillResult = executeEntitySkills(twStats, twStats.skills, twRuntime.cooldowns, {
                      trigger: TRIGGER_TYPES.ON_KILL,
                      target: target
                    });
                    if (killSkillResult?.nextCooldowns) {
                      twRuntime.cooldowns = killSkillResult.nextCooldowns;
                    }
                    const killEvents = killSkillResult?.events || [];
                    killEvents.forEach(ev => {
                      if (ev.type === EFFECT_TYPES.GAIN_GOLD) {
                        const bonusG = Math.round(Number(ev.amount ?? ev.value ?? 0));
                        simStatsRef.current.goldEarned += bonusG;
                        if (setPlayerGoldRef.current) setPlayerGoldRef.current(prev => prev + bonusG);
                      } else if (ev.type === EFFECT_TYPES.GAIN_MANA) {
                        twRuntime.mana = Math.min(twRuntime.maxMana || 100, (twRuntime.mana || 0) + Number(ev.amount ?? ev.value ?? 0));
                      }
                    });
                  }

                  let bountyMult = 1.0;
                  currentTowers.forEach(harv => {
                    if (harv.typeId === 'harvester') {
                      const hStats = harv.stats || getTowerStats(harv.typeId, harv.level || 1, currentTowersData);
                      const hX = harv.c * ts + ts / 2;
                      const hY = harv.r * ts + ts / 2;
                      if (Math.hypot(target.x - hX, target.y - hY) <= Number(hStats.range || 3.5) * ts) {
                        bountyMult = Math.max(bountyMult, Number(hStats.bountyMult || 1.25));
                      }
                    }
                  });

                  const earned = Math.round(Number(target.bounty || 15) * bountyMult);
                  simStatsRef.current.goldEarned += earned;
                  if (setPlayerGoldRef.current) setPlayerGoldRef.current(prev => prev + earned);

                  popupsRef.current.push({
                    type: 'enemyDeath',
                    x: target.x,
                    y: target.y,
                    bounty: earned,
                    startTime: performance.now(),
                    duration: 700
                  });
                }
              });
            }

            towerLastShotsRef.current[towerKey] = timestamp;
          }
        }
      }
    }

    enemiesRef.current = enemiesRef.current.filter(e => e.hp > 0 && !e.leaked);

    // 8. Particle System Physics Update
    const aliveParticles = [];
    particlesRef.current.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * p.decay;
      p.vy += dt * 25.0;
      if (p.life > 0) aliveParticles.push(p);
    });
    particlesRef.current = aliveParticles;

    // 9. Combat Intensity & Battlefield Pacing State Evaluation
    let currentPhysicalDPS = 0;
    let currentMagicalDPS = 0;
    currentTowers.forEach(t => {
      const stats = t.stats || getTowerStats(t.typeId, t.level || 1, currentTowersData);
      const dps = (stats.damage || 0) * (stats.attackSpeed || 1);
      if (stats.damageType === DAMAGE_TYPES.PHYSICAL) currentPhysicalDPS += dps;
      else currentMagicalDPS += dps;
    });
    const totalDefenseDPS = Math.round(currentPhysicalDPS + currentMagicalDPS);

    let currentThreatEHP = 0;
    enemiesRef.current.forEach(e => {
      const ehp = e.hp / Math.max(0.2, 1 - (e.armor / 100));
      currentThreatEHP += Math.round(ehp * ((e.moveSpeed || 2) / 2));
    });

    pacingStateRef.current.threatEHP = currentThreatEHP;
    pacingStateRef.current.defenseDPS = totalDefenseDPS;
    pacingStateRef.current.threatRatio = totalDefenseDPS > 0 ? Number((currentThreatEHP / totalDefenseDPS).toFixed(2)) : 1.0;

    // Determine current Tactical Pacing Phase
    if (isBossPresent) {
      pacingStateRef.current.phase = 'boss_battle';
    } else if (dangerZoneCount > 0) {
      pacingStateRef.current.phase = 'critical_breach';
    } else if (totalEngagedTowers >= 2 && enemiesRef.current.length >= 3) {
      pacingStateRef.current.phase = 'chokepoint_clash';
    } else if (enemiesRef.current.length > 0) {
      pacingStateRef.current.phase = 'approaching';
    } else {
      pacingStateRef.current.phase = 'calm';
    }

    // 10. Real-Time Pacing Telemetry Sampling (Every 0.8s)
    const curSec = Math.floor(simStatsRef.current.timeElapsed);
    if (curSec > lastTelemetrySecRef.current) {
      lastTelemetrySecRef.current = curSec;

      setPacingTelemetry(prev => [
        ...prev.slice(-40),
        {
          name: `${curSec}s`,
          time: curSec,
          waveIndex: waveIdx,
          threatEHP: currentThreatEHP,
          defenseDPS: totalDefenseDPS,
          goldPool: (playerGoldRef.current || 0) + simStatsRef.current.goldEarned,
          investedGold: simStatsRef.current.goldSpent,
          activeEnemies: enemiesRef.current.length,
          leaks: simStatsRef.current.leaked
        }
      ]);
    }

    // 11. Wave Completion & Progression Check
    if (spawnQueueRef.current.length === 0 && enemiesRef.current.length === 0) {
      projectilesRef.current = [];
      activeLasersRef.current = [];

      const isCleanClear = simStatsRef.current.leaked === 0;
      const isSurvived = (bastionShieldsRef.current || 0) > 0 || isCleanClear;

      const bonusGold = activeWave.rewardGold || 80;
      simStatsRef.current.goldEarned += bonusGold;
      if (setPlayerGoldRef.current) setPlayerGoldRef.current(prev => prev + bonusGold);

      const hasNextWave = waveIdx < currentWaves.length - 1;
      if (hasNextWave) {
        stopSimulation(isSurvived ? 'wave_cleared' : 'wave_leaked');
      } else {
        stopSimulation(isSurvived ? 'level_complete' : 'wave_leaked');
      }
      return;
    }

    if (onFrameUpdateRef.current && timestamp - lastUiUpdateRef.current >= 200) {
      lastUiUpdateRef.current = timestamp;
      onFrameUpdateRef.current();
    }
    animFrameIdRef.current = requestAnimationFrame(runSimFrame);
  }, [getWaypointsForSpawn, stopSimulation]);

  useEffect(() => {
    if (isSimulating) {
      lastFrameTimeRef.current = performance.now();
      animFrameIdRef.current = requestAnimationFrame(runSimFrame);
    }
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isSimulating, runSimFrame]);

  // Start Playtest Simulation for Current Wave
  const startSimulation = useCallback(() => {
    const activeWave = wavesRef.current[currentWaveIndexRef.current] || wavesRef.current[0];
    if (!activeWave) return;

    // Check path validity
    const currentSpawns = spawnsRef.current;
    const currentPaths = pathsRef.current;
    const hasValidPaths = currentSpawns.every(sp => currentPaths[sp.id] && currentPaths[sp.id].length >= 2);
    if (!hasValidPaths) {
      setSimStatus('blocked');
      return;
    }

    setSimStatus(null);
    enemiesRef.current = [];
    projectilesRef.current = [];
    particlesRef.current = [];
    towerStatesRef.current = {};
    combatHeatRef.current = {};
    towerLastShotsRef.current = {};
    harvesterLastTickRef.current = {};
    activeLaserRef.current = null;
    activeLasersRef.current = [];
    popupsRef.current = [];
    lastSpawnTimeRef.current = 0;
    lastTelemetrySecRef.current = 0;
    lastSquadIdxRef.current = -1;

    // Calculate Bastion Shields (Base Citadel has 3 shields + bastion tower contributions)
    const baseCitadelShields = 3;
    let totalShields = 0;
    let totalSpent = 0;
    const towerRuntimes = {};

    towersRef.current.forEach(t => {
      const stats = t.stats || getTowerStats(t.typeId, t.level || 1, towersDataRef.current);
      totalSpent += (t.cost || stats.cost || 100);
      if (t.typeId === 'bastion') {
        totalShields += Number(stats.shieldHp || 2);
      }
      const twKey = `${t.r}-${t.c}`;
      towerRuntimes[twKey] = {
        mana: stats.maxMana || 100,
        maxMana: stats.maxMana || 100,
        cooldowns: {},
        stats
      };
      towerLastShotsRef.current[twKey] = 0;
    });

    towerRuntimesRef.current = towerRuntimes;
    bastionShieldsRef.current = baseCitadelShields + totalShields;
    maxBastionShieldsRef.current = baseCitadelShields + totalShields;

    // Build Spawn Queue for active wave
    const spawnQueue = [];
    const enemyDataList = enemyTypesDataRef.current || [];

    activeWave.squads.forEach((sq, sIdx) => {
      const count = Number(sq.count || 8);
      const arch = enemyDataList.find(e => e.id === sq.enemyType) || {};
      const hp = Number(arch.hp ?? sq.hp ?? 140);
      const armor = Number(arch.armor ?? sq.armor ?? 15);
      const magicRes = Number(arch.magicRes ?? sq.magicRes ?? 15);
      const moveSpeed = Number(arch.moveSpeed ?? sq.moveSpeed ?? 2.0);
      const bounty = Number(arch.bounty ?? sq.bounty ?? 15);

      for (let i = 0; i < count; i++) {
        let spawnId = sq.spawnId || 's1';
        if (spawnId === 'both') {
          spawnId = i % 2 === 0 ? 's1' : (currentSpawns[1]?.id || 's2');
        }

        spawnQueue.push({
          squadIdx: sIdx,
          archName: arch.name || sq.enemyType,
          enemyType: sq.enemyType,
          spawnId: spawnId,
          spawnInterval: Number(sq.spawnInterval || 0.8),
          hp,
          armor,
          magicRes,
          moveSpeed,
          bounty,
          baseStats: arch.baseStats,
          skills: arch.skills || []
        });
      }
    });

    spawnQueueRef.current = spawnQueue;

    pacingStateRef.current = {
      phase: 'calm',
      threatRatio: 1.0,
      threatEHP: 0,
      defenseDPS: 0,
      activeAlert: {
        text: `⚔️ WAVE ${currentWaveIndexRef.current + 1} COMMENCING`,
        subtext: `${activeWave.name || 'Hostile Incursion'} • ${spawnQueue.length} Units Inbound`,
        type: 'squad',
        timestamp: performance.now(),
        duration: 2500
      },
      dangerZoneEnemies: 0,
      isBossAlive: false,
      chokepoints: []
    };

    simStatsRef.current = {
      waveIndex: currentWaveIndexRef.current,
      spawned: 0,
      killed: 0,
      leaked: 0,
      leaksAbsorbed: 0,
      totalDamage: 0,
      goldEarned: 0,
      goldSpent: totalSpent,
      timeElapsed: 0
    };

    setIsSimulating(true);
  }, []);

  return {
    isSimulating,
    simStatus,
    setSimStatus,
    simSpeed,
    setSimSpeed,
    simResults,
    pacingTelemetry,
    startSimulation,
    stopSimulation,
    dismissStatus,
    enemiesRef,
    projectilesRef,
    particlesRef,
    towerStatesRef,
    pacingStateRef,
    combatHeatRef,
    activeLaserRef,
    activeLasersRef,
    popupsRef,
    simStatsRef,
    bastionShieldsRef,
    maxBastionShieldsRef
  };
}
