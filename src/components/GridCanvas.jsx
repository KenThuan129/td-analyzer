import React, { useRef, useEffect, useCallback } from 'react';
import { ROWS, COLS, TILE_EMPTY, TILE_WALL } from '../utils/constants.js';
import { DAMAGE_TYPES, getTowerStats, getTowerType } from '../data/towers.js';

// Visual Tactical Color Palette
const COLORS = {
  bg: '#070b14',
  gridBorder: '#141d2e',
  gridDot: '#1e293b',
  wall: '#1e293b',
  wallTop: '#334155',
  wallBevel: '#475569',
  wallShadow: '#090d16',
  wallTrim: '#0284c7',
  towerBody: '#0f172a',
  towerRing: '#334155',
  towerRangeStroke: 'rgba(168, 85, 247, 0.35)',
  towerRangeFill: 'rgba(168, 85, 247, 0.05)'
};

export default function GridCanvas({
  grid,
  setGrid,
  spawns,
  setSpawns,
  goals,
  setGoals,
  towers,
  setTowers,
  selectedTowerType,
  selectedTowerLevel,
  activePlacementTarget,
  paths = {},
  isBlocked = false,
  isSimulating = false,
  tileSize = 40,
  enemiesRef,
  projectilesRef,
  particlesRef,
  towerStatesRef,
  pacingStateRef,
  combatHeatRef,
  activeLasersRef,
  popupsRef,
  bastionShieldsRef,
  onTowerPlaced,
  onSelectTower,
  onSelectEnemy,
  inspectedTowerId,
  playerGold = 500,
  isPlaytestMode = false,
  towersData
}) {
  const canvasRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Store frequently updated props in a ref to avoid recreating the RAF loop
  const propsRef = useRef({
    grid,
    spawns,
    goals,
    towers,
    paths,
    tileSize,
    activePlacementTarget,
    isSimulating,
    towersData,
    inspectedTowerId
  });

  useEffect(() => {
    propsRef.current = {
      grid,
      spawns,
      goals,
      towers,
      paths,
      tileSize,
      activePlacementTarget,
      isSimulating,
      towersData,
      inspectedTowerId
    };
  }, [
    grid,
    spawns,
    goals,
    towers,
    paths,
    tileSize,
    activePlacementTarget,
    isSimulating,
    towersData,
    inspectedTowerId
  ]);

  // Main Drawing Function (Silky 60fps Animation Loop)
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      grid: curGrid,
      spawns: curSpawns,
      goals: curGoals,
      towers: curTowers,
      paths: curPaths,
      tileSize: curTileSize,
      activePlacementTarget: curPlacement,
      isSimulating: curSimulating,
      towersData: curTowersData,
      inspectedTowerId: curInspectedId
    } = propsRef.current;

    const ts = curTileSize || 40;
    const width = COLS * ts;
    const height = ROWS * ts;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const now = performance.now();

    // 1. Grid Background & Tactical Matrix
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle matrix dots at grid intersections
    ctx.fillStyle = COLORS.gridDot;
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        ctx.fillRect(c * ts - 1, r * ts - 1, 2, 2);
      }
    }

    // 2. Cells & Walls (3D Isometric Beveled Extrusion)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * ts;
        const y = r * ts;

        if (curGrid[r]?.[c] === TILE_WALL) {
          // Dark drop shadow
          ctx.fillStyle = COLORS.wallShadow;
          ctx.fillRect(x + 2, y + 2, ts - 2, ts - 2);

          // Base block
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, ts, ts);

          // Top highlight bevel
          ctx.fillStyle = COLORS.wallBevel;
          ctx.fillRect(x + 1, y + 1, ts - 2, 3);
          ctx.fillRect(x + 1, y + 1, 3, ts - 2);

          // Side shading
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y + ts - 4, ts, 4);
          ctx.fillRect(x + ts - 4, y, 4, ts);

          // Tactical tech circuit core
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 6, y + 6, ts - 12, ts - 12);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 6, y + 6, ts - 12, ts - 12);
        } else {
          // Standard cell border
          ctx.strokeStyle = COLORS.gridBorder;
          ctx.lineWidth = 0.8;
          ctx.strokeRect(x, y, ts, ts);
        }
      }
    }

    // 3. Combat Intensity Heatmaps (Where Pacing Changes & Chokepoints Form)
    if (combatHeatRef?.current && isSimulating) {
      const heatMap = combatHeatRef.current;
      Object.keys(heatMap).forEach(key => {
        const heat = heatMap[key];
        if (heat > 0) {
          const [rStr, cStr] = key.split('-');
          const r = Number(rStr);
          const c = Number(cStr);
          const hx = c * ts + ts / 2;
          const hy = r * ts + ts / 2;

          const heatAlpha = Math.min(0.45, (heat / 300) * 0.45);
          const grad = ctx.createRadialGradient(hx, hy, ts * 0.2, hx, hy, ts * 1.5);
          grad.addColorStop(0, `rgba(245, 158, 11, ${heatAlpha})`);
          grad.addColorStop(0.6, `rgba(239, 68, 68, ${heatAlpha * 0.5})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(hx, hy, ts * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Slowly decay heat map
          heatMap[key] = Math.max(0, heat - 0.5);
        }
      });
    }

    // 4. Multi-Path Tracing with Flowing Energy & Tactical Milestones
    const pathColors = [
      { line: '#38bdf8', glow: '#0284c7', core: '#e0f2fe' }, // S1: Cyan
      { line: '#34d399', glow: '#059669', core: '#d1fae5' }  // S2: Emerald
    ];

    const hasDangerEnemies = (pacingStateRef?.current?.dangerZoneEnemies || 0) > 0;

    Object.keys(curPaths).forEach((spId, idx) => {
      const spPath = curPaths[spId];
      if (spPath && spPath.length > 1) {
        const colorPair = pathColors[idx % pathColors.length];
        const spTotalNodes = spPath.length;

        // Path Outer Glow
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = colorPair.line;
        ctx.lineWidth = Math.max(3, ts * 0.16);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const startX = spPath[0].c * ts + ts / 2;
        const startY = spPath[0].r * ts + ts / 2;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < spPath.length; i++) {
          const px = spPath[i].c * ts + ts / 2;
          const py = spPath[i].r * ts + ts / 2;
          ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Flowing core energy dashed line
        ctx.strokeStyle = colorPair.core;
        ctx.lineWidth = Math.max(1.5, ts * 0.05);
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -now * 0.035;
        ctx.stroke();
        ctx.restore();

        // Track Milestones: 25%, 50%, and 75% Critical Danger Threshold
        const m25Idx = Math.floor(spTotalNodes * 0.25);
        const m50Idx = Math.floor(spTotalNodes * 0.50);
        const m75Idx = Math.floor(spTotalNodes * 0.75);

        [
          { idx: m25Idx, label: '25%', color: '#94a3b8' },
          { idx: m50Idx, label: '50%', color: '#38bdf8' },
          { idx: m75Idx, label: '75% ⚠️', color: hasDangerEnemies ? '#ef4444' : '#f59e0b', isDanger: true }
        ].forEach(m => {
          if (spPath[m.idx]) {
            const mx = spPath[m.idx].c * ts + ts / 2;
            const my = spPath[m.idx].r * ts + ts / 2;

            ctx.save();
            if (m.isDanger && hasDangerEnemies && curSimulating) {
              const pulse = Math.sin(now * 0.012) * 0.35 + 0.65;
              ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(mx, my, ts * 0.48, 0, Math.PI * 2);
              ctx.stroke();
            }

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = m.color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(mx, my, ts * 0.24, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = m.color;
            ctx.font = `bold ${Math.max(7, Math.floor(ts * 0.16))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(m.label, mx, my);
            ctx.restore();
          }
        });
      }
    });

    // 5. Spawns (Animated Vortex Portals)
    curSpawns.forEach((spawn, idx) => {
      const sx = spawn.c * ts + ts / 2;
      const sy = spawn.r * ts + ts / 2;
      const rad = ts * 0.38;
      const isTargeted = curPlacement?.type === 'spawn' && curPlacement?.id === spawn.id;

      ctx.save();
      if (curSimulating) {
        // Swirling vortex portal rings
        const p1 = (now * 0.003) % 1;
        ctx.strokeStyle = `rgba(16, 185, 129, ${Math.max(0, 0.7 * (1 - p1))})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, rad + p1 * (ts * 0.5), 0, Math.PI * 2);
        ctx.stroke();

        // Rotating portal turbine blades
        const spinAngle = now * 0.003;
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 1.5;
        for (let a = 0; a < 4; a++) {
          const bAngle = spinAngle + (a * Math.PI) / 2;
          ctx.beginPath();
          ctx.arc(sx, sy, rad * 1.1, bAngle, bAngle + 0.4);
          ctx.stroke();
        }
      }

      if (isTargeted) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, rad * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Portal Core
      const pGrad = ctx.createRadialGradient(sx, sy, rad * 0.1, sx, sy, rad);
      pGrad.addColorStop(0, '#6ee7b7');
      pGrad.addColorStop(0.6, idx === 0 ? '#10b981' : '#059669');
      pGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(11, Math.floor(ts * 0.36))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`S${idx + 1}`, sx, sy);
      ctx.restore();
    });

    // 6. Goals (Hexagonal Holographic Bastion Dome)
    curGoals.forEach((goal, idx) => {
      const gx = goal.c * ts + ts / 2;
      const gy = goal.r * ts + ts / 2;
      const rad = ts * 0.38;
      const shieldsRemaining = bastionShieldsRef?.current ?? 0;
      const isTargeted = curPlacement?.type === 'goal' && curPlacement?.id === goal.id;

      ctx.save();
      // Shield Dome Aura
      if (shieldsRemaining > 0 && curSimulating) {
        const sPulse = Math.sin(now * 0.007) * 0.25 + 0.75;
        ctx.strokeStyle = `rgba(16, 185, 129, ${sPulse})`;
        ctx.lineWidth = 2.5;

        // Draw hexagonal forcefield
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const hAngle = (i * Math.PI) / 3 + now * 0.001;
          const hx = gx + Math.cos(hAngle) * (rad * 1.35);
          const hy = gy + Math.sin(hAngle) * (rad * 1.35);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }

      if (isTargeted) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(gx, gy, rad * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Goal Core
      const gGrad = ctx.createRadialGradient(gx, gy, rad * 0.1, gx, gy, rad);
      gGrad.addColorStop(0, '#fca5a5');
      gGrad.addColorStop(0.6, idx === 0 ? '#ef4444' : '#e11d48');
      gGrad.addColorStop(1, '#881337');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `black ${Math.max(11, Math.floor(ts * 0.36))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`G${idx + 1}`, gx, gy);

      // Bastion Shield Counter Tag
      if (shieldsRemaining > 0 && curSimulating && idx === 0) {
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.max(9, Math.floor(ts * 0.22))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`🛡️ SHIELDS: ${shieldsRemaining}`, gx, gy - rad - 3);
      }
      ctx.restore();
    });

    // 7. Power Pylon High-Voltage Buff Conduits
    curTowers.forEach(tw => {
      if (tw.typeId === 'pylon') {
        const px = tw.c * ts + ts / 2;
        const py = tw.r * ts + ts / 2;
        const twStats = tw.stats || getTowerStats(tw.typeId, tw.level || 1, curTowersData);
        const pRangePx = Number(twStats.range || 3.5) * ts;

        curTowers.forEach(targetTw => {
          if (targetTw !== tw && targetTw.typeId !== 'pylon') {
            const tx = targetTw.c * ts + ts / 2;
            const ty = targetTw.r * ts + ts / 2;
            const d = Math.hypot(tx - px, ty - py);
            if (d <= pRangePx) {
              ctx.save();
              const beamPulse = Math.sin(now * 0.008 + d) * 0.3 + 0.6;
              ctx.strokeStyle = `rgba(234, 179, 8, ${beamPulse * 0.75})`;
              ctx.lineWidth = 2.0;
              ctx.setLineDash([5, 5]);
              ctx.lineDashOffset = -now * 0.03;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(tx, ty);
              ctx.stroke();

              // Traveling energy node
              const pRatio = ((now * 0.001) % 1);
              const enX = px + (tx - px) * pRatio;
              const enY = py + (ty - py) * pRatio;
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(enX, enY, 2.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        });
      }
    });

    // 8. Towers (Custom Turret Hardware Models, Directional Aiming & Recoil Kick)
    curTowers.forEach(tw => {
      const tx = tw.c * ts + ts / 2;
      const ty = tw.r * ts + ts / 2;
      const twStats = tw.stats || getTowerStats(tw.typeId, tw.level || 1, curTowersData);
      const towerTypeObj = getTowerType(tw.typeId);
      const rangePx = Number(twStats.range || 3.5) * ts;
      const towerColor = tw.color || towerTypeObj.color || '#a855f7';
      const lvl = tw.level || 1;

      // Range indicator ring
      ctx.save();
      ctx.strokeStyle =
        tw.typeId === 'bastion' ? 'rgba(16, 185, 129, 0.35)' :
        tw.typeId === 'pylon' ? 'rgba(234, 179, 8, 0.35)' :
        tw.typeId === 'cryo' ? 'rgba(56, 189, 248, 0.35)' :
        COLORS.towerRangeStroke;

      ctx.fillStyle =
        tw.typeId === 'bastion' ? 'rgba(16, 185, 129, 0.06)' :
        tw.typeId === 'pylon' ? 'rgba(234, 179, 8, 0.05)' :
        tw.typeId === 'cryo' ? 'rgba(56, 189, 248, 0.06)' :
        COLORS.towerRangeFill;

      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(tx, ty, rangePx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Base Platform Chassis
      const baseRad = ts * 0.40;
      ctx.fillStyle = '#0b1329';
      ctx.beginPath();
      ctx.arc(tx, ty, baseRad, 0, Math.PI * 2);
      ctx.fill();

      // Tier Trim: Tier 1 bronze, Tier 2 dual silver, Tier 3 masterwork radiant gold
      ctx.strokeStyle = lvl === 3 ? '#eab308' : lvl === 2 ? '#94a3b8' : '#78716c';
      ctx.lineWidth = lvl === 3 ? 2.5 : lvl === 2 ? 2.0 : 1.5;
      ctx.stroke();

      if (lvl === 3) {
        // Radiant gear notches for max tier
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = 1.5;
        for (let g = 0; g < 8; g++) {
          const gAng = (g * Math.PI) / 4 + now * 0.0005;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(gAng) * baseRad, ty + Math.sin(gAng) * baseRad);
          ctx.lineTo(tx + Math.cos(gAng) * (baseRad + 3), ty + Math.sin(gAng) * (baseRad + 3));
          ctx.stroke();
        }
      }

      // Read turret animation state
      const twKey = tw.id || `${tw.r}-${tw.c}`;
      const twState = towerStatesRef?.current?.[twKey] || { angle: 0, recoil: 0, barrelSpin: 0, muzzleFlash: 0 };
      const recoilOffset = -twState.recoil * (tw.typeId === 'mortar' ? 3.5 : tw.typeId === 'sniper' ? 3.0 : 1.5);

      // Rotating Turret Hardware Assembly
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(twState.angle);
      ctx.translate(recoilOffset, 0);

      // Turret Weapon Hardware by Type
      if (tw.typeId === 'gatling') {
        // Triple-barrel rotary cannon
        ctx.fillStyle = '#334155';
        ctx.fillRect(-baseRad * 0.2, -baseRad * 0.3, baseRad * 0.6, baseRad * 0.6);

        // Barrels
        ctx.fillStyle = '#64748b';
        ctx.fillRect(baseRad * 0.4, -baseRad * 0.22, baseRad * 0.65, 3.5);
        ctx.fillRect(baseRad * 0.4, -1.75, baseRad * 0.65, 3.5);
        ctx.fillRect(baseRad * 0.4, baseRad * 0.22 - 3.5, baseRad * 0.65, 3.5);

        // Muzzle brake ring
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(baseRad * 0.95, -baseRad * 0.24, 3, baseRad * 0.48);

      } else if (tw.typeId === 'sniper') {
        // Elongated dual magnetic railgun
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-baseRad * 0.25, -baseRad * 0.25, baseRad * 0.5, baseRad * 0.5);

        // Accelerator rails
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(baseRad * 0.25, -baseRad * 0.16, baseRad * 0.95, 3);
        ctx.fillRect(baseRad * 0.25, baseRad * 0.16 - 3, baseRad * 0.95, 3);

        // Glowing magnetic energy core
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(baseRad * 0.4, -baseRad * 0.08, baseRad * 0.6, baseRad * 0.16);

      } else if (tw.typeId === 'mortar') {
        // Heavy artillery tube
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-baseRad * 0.3, -baseRad * 0.35, baseRad * 0.6, baseRad * 0.7);

        // Cannon barrel
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(baseRad * 0.2, -baseRad * 0.22, baseRad * 0.65, baseRad * 0.44);

        // Barrel muzzle flange
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(baseRad * 0.82, -baseRad * 0.26, 4, baseRad * 0.52);

      } else if (tw.typeId === 'cryo') {
        // Sub-zero vortex turbine
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(0, 0, baseRad * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // 4 snowflake blades
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        const bSpin = now * 0.004;
        for (let b = 0; b < 4; b++) {
          const bAng = bSpin + (b * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(bAng) * baseRad * 0.65, Math.sin(bAng) * baseRad * 0.65);
          ctx.stroke();
        }

      } else if (tw.typeId === 'pylon') {
        // Hovering power crystal
        const pBob = Math.sin(now * 0.006) * 2;
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(0, 0, baseRad * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -baseRad * 0.55 + pBob);
        ctx.lineTo(baseRad * 0.4, pBob);
        ctx.lineTo(0, baseRad * 0.55 + pBob);
        ctx.lineTo(-baseRad * 0.4, pBob);
        ctx.closePath();
        ctx.fill();

      } else if (tw.typeId === 'harvester') {
        // Rotary mining drill
        ctx.fillStyle = '#713f12';
        ctx.beginPath();
        ctx.arc(0, 0, baseRad * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(baseRad * 0.6, 0);
        ctx.lineTo(-baseRad * 0.3, -baseRad * 0.35);
        ctx.lineTo(-baseRad * 0.3, baseRad * 0.35);
        ctx.closePath();
        ctx.fill();

      } else {
        // Default Pulse Laser Turret
        ctx.fillStyle = towerColor;
        ctx.beginPath();
        ctx.arc(0, 0, baseRad * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Emitter lens
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(baseRad * 0.3, -2, baseRad * 0.4, 4);
      }

      // Muzzle Flash Effect (Simple, crisp, zero shadowBlur)
      if (twState.muzzleFlash > 0.08) {
        const mX = baseRad * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mX, 0, Math.max(2, baseRad * 0.28 * twState.muzzleFlash), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Core Gem / Role Pip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, ts * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Inspected / Targeted Tower Ring Indicator
      const isInspected = curInspectedId && (tw.id === curInspectedId || (tw.r === curInspectedId.r && tw.c === curInspectedId.c));
      if (isInspected) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -now * 0.02;
        ctx.beginPath();
        ctx.arc(tx, ty, baseRad * 1.35, 0, Math.PI * 2);
        ctx.stroke();

        // 4 glowing corner tick brackets
        const bRad = baseRad * 1.5;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([]);
        for (let corner = 0; corner < 4; corner++) {
          const cAng = (corner * Math.PI) / 2 + Math.PI / 4;
          const cx = tx + Math.cos(cAng) * bRad;
          const cy = ty + Math.sin(cAng) * bRad;
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Tier Level Pip Badges
      ctx.fillStyle = '#facc15';
      const dotRadius = Math.max(1.5, ts * 0.04);
      if (lvl === 1) {
        ctx.beginPath();
        ctx.arc(tx, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (lvl === 2) {
        ctx.beginPath();
        ctx.arc(tx - 4, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.arc(tx + 4, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (lvl >= 3) {
        ctx.beginPath();
        ctx.arc(tx - 6, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.arc(tx, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.arc(tx + 6, ty + ts * 0.30, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 9. Projectiles (Mortar Artillery Shells - Responsive ballistic flight tracking moving target)
    if (projectilesRef?.current && projectilesRef.current.length > 0) {
      projectilesRef.current.forEach(proj => {
        const { sx, sy, tx, ty, progress, arcHeight = 28, color = '#ef4444' } = proj;
        // Dynamically lead and track moving target enemy
        const targetX = (proj.targetEnemy && proj.targetEnemy.hp > 0) ? proj.targetEnemy.x : tx;
        const targetY = (proj.targetEnemy && proj.targetEnemy.hp > 0) ? proj.targetEnemy.y : ty;
        const curX = sx + (targetX - sx) * progress;
        const curY = sy + (targetY - sy) * progress;

        // Ballistic altitude
        const altitude = Math.sin(progress * Math.PI) * arcHeight;
        const shellY = curY - altitude;

        ctx.save();
        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(curX, curY, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flying Shell - simple, high contrast
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(curX, shellY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Shell bright tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX, shellY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 10. Combat Laser Beams & Kinetic Tracers (Simple, clean, responsive & locked to moving enemy)
    if (activeLasersRef?.current && activeLasersRef.current.length > 0) {
      activeLasersRef.current.forEach(laser => {
        const { tx, ty, opacity, color, isSniper, isShockwall, damageType } = laser;
        // Dynamically get enemy's live position so beam never lags behind
        const ex = (laser.target && laser.target.hp > 0) ? laser.target.x : laser.ex;
        const ey = (laser.target && laser.target.hp > 0) ? laser.target.y : laser.ey;
        const alpha = Math.max(0, Math.min(1, opacity));

        if (alpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = alpha;

          const beamColor = isSniper ? '#38bdf8' : isShockwall ? '#06b6d4' : (color || (damageType === DAMAGE_TYPES.PHYSICAL ? '#f59e0b' : '#a855f7'));
          const beamWidth = isSniper ? 3.5 : isShockwall ? 2.5 : 2.0;

          // Main colored beam line
          ctx.strokeStyle = beamColor;
          ctx.lineWidth = beamWidth;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Bright crisp white core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, beamWidth * 0.4);
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // Crisp impact spark at target
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex, ey, isSniper ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      });
    }

    // 11. Active Enemies (Distinct Archetype Visuals, Hit Flash & Status Overlays)
    // 11. Active Enemies (Clean, optimized archetype visuals & responsive hit flash)
    if (enemiesRef?.current && enemiesRef.current.length > 0) {
      enemiesRef.current.forEach(enemy => {
        const ex = enemy.x;
        const ey = enemy.y;
        const rad = ts * 0.32;
        const isSlowed = (enemy.slowFactor || 1) < 0.95;
        const eType = enemy.enemyType || 'grunt';
        const isHit = (enemy.hitFlash || 0) > 0.05;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(enemy.angle || 0);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, rad * 0.25, rad * 0.9, rad * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Archetype Specific Renderings
        if (eType === 'scout') {
          // Fast Scout: Swept delta skimmer
          ctx.fillStyle = isHit ? '#ffffff' : (isSlowed ? '#0284c7' : '#f59e0b');
          ctx.beginPath();
          ctx.moveTo(rad * 1.2, 0);
          ctx.lineTo(-rad * 0.8, -rad * 0.65);
          ctx.lineTo(-rad * 0.4, 0);
          ctx.lineTo(-rad * 0.8, rad * 0.65);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = isHit ? '#ffffff' : '#fbbf24';
          ctx.lineWidth = 1.2;
          ctx.stroke();

        } else if (eType === 'tank') {
          // Heavy Tank: Armored chassis
          ctx.fillStyle = '#334155';
          ctx.fillRect(-rad * 0.85, -rad * 0.75, rad * 1.7, rad * 0.28);
          ctx.fillRect(-rad * 0.85, rad * 0.47, rad * 1.7, rad * 0.28);

          ctx.fillStyle = isHit ? '#ffffff' : (isSlowed ? '#0284c7' : '#8b5cf6');
          ctx.fillRect(-rad * 0.7, -rad * 0.5, rad * 1.4, rad * 1.0);

          // Front plate
          ctx.fillStyle = '#6d28d9';
          ctx.beginPath();
          ctx.moveTo(rad * 0.7, -rad * 0.5);
          ctx.lineTo(rad * 1.05, 0);
          ctx.lineTo(rad * 0.7, rad * 0.5);
          ctx.closePath();
          ctx.fill();

          // Reactor core
          ctx.fillStyle = isHit ? '#fef08a' : '#c084fc';
          ctx.beginPath();
          ctx.arc(0, 0, rad * 0.26, 0, Math.PI * 2);
          ctx.fill();

        } else if (eType === 'swarm') {
          // Vermin Swarm: Skittering runner
          ctx.fillStyle = isHit ? '#ffffff' : (isSlowed ? '#0284c7' : '#ec4899');
          ctx.beginPath();
          ctx.ellipse(0, 0, rad * 0.7, rad * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 1.2;
          ctx.stroke();

        } else if (eType === 'boss') {
          // Apex Boss
          const bRadius = rad * 1.5;
          ctx.fillStyle = isHit ? '#ffffff' : '#dc2626';
          ctx.beginPath();
          ctx.arc(0, 0, bRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Core
          ctx.fillStyle = isHit ? '#fef08a' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, bRadius * 0.35, 0, Math.PI * 2);
          ctx.fill();

        } else {
          // Standard Grunt
          ctx.fillStyle = isHit ? '#ffffff' : (isSlowed ? '#0284c7' : '#ef4444');
          ctx.beginPath();
          ctx.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHit ? '#ffffff' : '#fca5a5';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Visor
          ctx.fillStyle = isHit ? '#ffffff' : '#ffffff';
          ctx.fillRect(rad * 0.2, -2.5, rad * 0.4, 5);
        }

        ctx.restore();

        // Enemy Health Bar & Vital Stats (clean, zero shadowBlur)
        const currentHp = Math.max(0, Math.ceil(enemy.hp));
        const totalHp = Number(enemy.maxHp || 150);
        const hpPct = Math.max(0, Math.min(1, enemy.hp / totalHp));

        const barW = Math.max(26, ts * 0.75);
        const barH = eType === 'boss' ? 6 : 4;
        const barX = ex - barW / 2;
        const barY = ey - rad - (eType === 'boss' ? 14 : 8);

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(barX, barY, barW, barH);

        const barFillColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillStyle = barFillColor;
        ctx.fillRect(barX, barY, barW * hpPct, barH);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX, barY, barW, barH);

        if (eType === 'boss' || hpPct < 1.0) {
          ctx.font = `bold ${Math.max(8, Math.floor(ts * 0.20))}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = hpPct > 0.5 ? '#86efac' : hpPct > 0.25 ? '#fde047' : '#fca5a5';
          ctx.fillText(`${currentHp}`, ex, barY - 1.5);
        }
        ctx.restore();
      });
    }

    // 12. Minimal Subtle Particles
    if (particlesRef?.current && particlesRef.current.length > 0) {
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(0.5, p.life * 0.5));
        ctx.fillStyle = p.color || '#f59e0b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.min(2.5, p.size || 1.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 13. Popups (Fast & snappy with zero shadowBlur)
    if (popupsRef?.current && popupsRef.current.length > 0) {
      const curTime = performance.now();
      popupsRef.current = popupsRef.current.filter(p => (curTime - p.startTime) < p.duration);

      popupsRef.current.forEach(popup => {
        const elapsed = curTime - popup.startTime;
        const progress = Math.min(1, elapsed / popup.duration);
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        if (popup.type === 'damage') {
          const yOff = progress * 16;
          const isPhysical = popup.damageType === DAMAGE_TYPES.PHYSICAL;
          const isCrit = popup.isCrit;

          ctx.font = isCrit ? `black ${Math.max(12, Math.floor(ts * 0.35))}px monospace` : `bold ${Math.max(10, Math.floor(ts * 0.28))}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isCrit ? `rgba(254, 240, 138, ${alpha})` : isPhysical ? `rgba(245, 158, 11, ${alpha})` : `rgba(192, 132, 252, ${alpha})`;

          const prefix = isCrit ? '💥 ' : '';
          ctx.fillText(`${prefix}-${popup.damage}`, popup.x, popup.y - yOff);

        } else if (popup.type === 'explosionRing') {
          // Clean expanding ring
          const curRad = popup.radius * progress;
          ctx.strokeStyle = `rgba(249, 115, 22, ${alpha * 0.85})`;
          ctx.lineWidth = Math.max(1.5, 3 * (1 - progress));
          ctx.beginPath();
          ctx.arc(popup.x, popup.y, curRad, 0, Math.PI * 2);
          ctx.stroke();

        } else if (popup.type === 'goldHarvest') {
          const yOff = progress * 20;
          ctx.font = `bold ${Math.max(11, Math.floor(ts * 0.32))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
          ctx.fillText(`+${popup.amount} 🪙`, popup.x, popup.y - yOff);

        } else if (popup.type === 'shieldAbsorb') {
          const yOff = progress * 14;
          ctx.font = `bold ${Math.max(10, Math.floor(ts * 0.30))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
          ctx.fillText(`🛡️ DEFLECTED`, popup.x, popup.y - yOff);

        } else if (popup.type === 'enemyDeath') {
          const yOff = progress * 18;
          ctx.font = `bold ${Math.max(10, Math.floor(ts * 0.30))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
          ctx.fillText(`+${popup.bounty} 🪙`, popup.x, popup.y - yOff);
        } else if (popup.type === 'skillTrigger') {
          const yOff = progress * 24;
          ctx.font = `bold ${Math.max(10, Math.floor(ts * 0.28))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = popup.color ? popup.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba') : `rgba(56, 189, 248, ${alpha})`;
          ctx.fillText(popup.text || '⚡ SKILL', popup.x, popup.y - yOff);
        }
        ctx.restore();
      });
    }

    // 14. Tactical Battlefield Pacing HUD & Alert Banners
    if (curSimulating && pacingStateRef?.current) {
      const pState = pacingStateRef.current;
      const phase = pState.phase || 'calm';

      // Phase Header Banner (Top Center)
      ctx.save();
      const bannerW = Math.min(340, width * 0.7);
      const bannerH = 26;
      const bannerX = (width - bannerW) / 2;
      const bannerY = 10;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle =
        phase === 'boss_battle' ? '#ef4444' :
        phase === 'critical_breach' ? '#f97316' :
        phase === 'chokepoint_clash' ? '#eab308' :
        phase === 'approaching' ? '#38bdf8' : '#10b981';

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      const phaseText =
        phase === 'boss_battle' ? `💀 BOSS ENGAGEMENT • EHP: ${pState.threatEHP}` :
        phase === 'critical_breach' ? `🚨 CRITICAL PERIMETER BREACH IN PROGRESS!` :
        phase === 'chokepoint_clash' ? `🔥 CHOKEPOINT CLASH • DPS: ${pState.defenseDPS} vs THREAT: ${pState.threatEHP}` :
        phase === 'approaching' ? `⚔️ VANGUARD SKIRMISH • ${enemiesRef.current.length} HOSTILES` :
        `🛡️ DEFENSIVE PATROL • MAZE SECURE`;

      ctx.fillText(phaseText, width / 2, bannerY + bannerH / 2);
      ctx.restore();

      // Dynamic Squad Transition / Breach Alert Banner
      const activeAlert = pState.activeAlert;
      if (activeAlert && (now - activeAlert.timestamp) < activeAlert.duration) {
        const aElapsed = now - activeAlert.timestamp;
        const aProgress = Math.min(1, aElapsed / activeAlert.duration);
        const aAlpha = aProgress > 0.8 ? (1 - aProgress) / 0.2 : 1;

        ctx.save();
        ctx.globalAlpha = aAlpha;
        const aW = Math.min(420, width * 0.85);
        const aH = 42;
        const aX = (width - aW) / 2;
        const aY = 44;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = activeAlert.type === 'breach' ? '#ef4444' : activeAlert.type === 'boss' ? '#a855f7' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(aX, aY, aW, aH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'black 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = activeAlert.type === 'breach' ? '#fca5a5' : activeAlert.type === 'boss' ? '#e9d5ff' : '#bae6fd';
        ctx.fillText(activeAlert.text, width / 2, aY + 14);

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(activeAlert.subtext || '', width / 2, aY + 29);
        ctx.restore();
      }
    }
  }, []);

  // Request continuous 60fps redraw loop
  useEffect(() => {
    let animId;
    const loop = () => {
      drawCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [drawCanvas]);

  // Grid interaction handlers (Wall placing, Erasing, Spawns, Goals, Towers)
  const handleCellAction = (r, c) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

    const isSpawnCell = spawns.some(s => s.r === r && s.c === c);
    const isGoalCell = goals.some(g => g.r === r && g.c === c);
    const existingTower = towers.find(t => t.r === r && t.c === c);

    // 1. Relocating a Spawn Point
    if (activePlacementTarget?.type === 'spawn') {
      const spId = activePlacementTarget.id;
      if (grid[r][c] === TILE_EMPTY && !isGoalCell) {
        setSpawns(prev => prev.map(s => s.id === spId ? { ...s, r, c } : s));
      }
      return;
    }

    // 2. Relocating a Goal Point
    if (activePlacementTarget?.type === 'goal') {
      const gId = activePlacementTarget.id;
      if (grid[r][c] === TILE_EMPTY && !isSpawnCell) {
        setGoals(prev => prev.map(g => g.id === gId ? { ...g, r, c } : g));
      }
      return;
    }

    // 3. Wall Brush
    if (activePlacementTarget?.type === 'wall') {
      if (!isSpawnCell && !isGoalCell && !existingTower) {
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = next[r][c] === TILE_WALL ? TILE_EMPTY : TILE_WALL;
          return next;
        });
      }
      return;
    }

    // 4. Erase Brush
    if (activePlacementTarget?.type === 'erase') {
      if (grid[r][c] === TILE_WALL) {
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          next[r][c] = TILE_EMPTY;
          return next;
        });
      }
      return;
    }

    // Check if clicked near an active enemy during battle/play
    if (enemiesRef?.current?.length > 0 && onSelectEnemy) {
      const clickX = c * tileSize + tileSize / 2;
      const clickY = r * tileSize + tileSize / 2;
      const clickedEnemy = enemiesRef.current.find(e => Math.hypot(e.x - clickX, e.y - clickY) <= tileSize * 0.95);
      if (clickedEnemy) {
        onSelectEnemy(clickedEnemy.enemyType || clickedEnemy.id);
        return;
      }
    }

    // 5. Tower Placement / Upgrade / Selection
    if (existingTower) {
      if (onSelectTower) onSelectTower(existingTower);
      // Upgrade tower if possible
      if (activePlacementTarget?.type === 'tower' || isPlaytestMode) {
        if (existingTower.level < 3) {
          const nextLevel = existingTower.level + 1;
          const nextStats = getTowerStats(existingTower.typeId, nextLevel, towersData);
          const costDiff = nextStats.cost - existingTower.stats.cost;

          if (isPlaytestMode && playerGold < costDiff) return;

          setTowers(prev => prev.map(t =>
            (t.r === r && t.c === c)
              ? { ...t, level: nextLevel, stats: nextStats, cost: nextStats.cost }
              : t
          ));

          if (onTowerPlaced) onTowerPlaced(costDiff, existingTower.typeId);
        }
      }
      return;
    }

    if (activePlacementTarget?.type === 'tower' || isPlaytestMode) {
      if (grid[r][c] === TILE_EMPTY && !isSpawnCell && !isGoalCell) {
        const lvl = selectedTowerLevel || 1;
        const stats = getTowerStats(selectedTowerType, lvl, towersData);
        const cost = stats.cost || 100;

        if (isPlaytestMode && playerGold < cost) return;

        const newTower = {
          id: `tw-${r}-${c}-${Date.now()}`,
          r,
          c,
          typeId: selectedTowerType,
          level: lvl,
          stats: stats,
          cost: cost
        };

        setTowers(prev => [...prev, newTower]);
        if (onSelectTower) onSelectTower(newTower);
        if (onTowerPlaced) onTowerPlaced(cost, selectedTowerType);
      }
    }
  };

  const getCoordinatesFromEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = Math.floor(x / tileSize);
    const r = Math.floor(y / tileSize);
    return { r, c };
  };

  const handlePointerDown = (e) => {
    isInteractingRef.current = true;
    const pos = getCoordinatesFromEvent(e);
    if (pos) handleCellAction(pos.r, pos.c);
  };

  const handlePointerMove = (e) => {
    if (!isInteractingRef.current) return;
    const pos = getCoordinatesFromEvent(e);
    if (pos && pos.r >= 0 && pos.r < ROWS && pos.c >= 0 && pos.c < COLS) {
      if (activePlacementTarget?.type === 'wall' && grid[pos.r]?.[pos.c] !== TILE_WALL) {
        const isSpawn = spawns.some(s => s.r === pos.r && s.c === pos.c);
        const isGoal = goals.some(g => g.r === pos.r && g.c === pos.c);
        if (!isSpawn && !isGoal) {
          setGrid(prev => {
            const next = prev.map(row => [...row]);
            next[pos.r][pos.c] = TILE_WALL;
            return next;
          });
        }
      } else if (activePlacementTarget?.type === 'erase' && grid[pos.r]?.[pos.c] === TILE_WALL) {
        setGrid(prev => {
          const next = prev.map(row => [...row]);
          next[pos.r][pos.c] = TILE_EMPTY;
          return next;
        });
      }
    }
  };

  const handlePointerUp = () => {
    isInteractingRef.current = false;
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-none p-2 sm:p-4">
      <canvas
        id="grid-canvas"
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className="rounded-xl shadow-2xl border-2 border-slate-800/80 cursor-crosshair bg-slate-950"
      />
    </div>
  );
}
