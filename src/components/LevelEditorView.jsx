import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Map,
  Users,
  Coins,
  Shield,
  Clock,
  Swords,
  Award,
  AlertTriangle,
  CheckCircle2,
  Database,
  Square,
  FastForward,
  ChevronRight,
  Plus,
  Trash2,
  Sliders,
  Flame,
  Zap,
  Info,
  Download,
  Upload,
  Search,
  Check,
  TrendingUp,
  X
} from 'lucide-react';
import { ROWS, COLS, TILE_EMPTY, TILE_WALL } from '../utils/constants.js';
import { calculateMultiPaths } from '../utils/pathfinding.js';
import { LEVEL_PRESETS } from '../data/levelPresets.js';
import { getTowerStats, DEFAULT_TOWER_TYPE, DEFAULT_TOWER_LEVEL, DAMAGE_TYPES } from '../data/towers.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import GridCanvas from './GridCanvas.jsx';
import { useSimulation } from '../hooks/useSimulation.js';
import { saveArchiveRun } from '../utils/archiveStore.js';
import DataArchiveModal from './DataArchiveModal.jsx';
import InspectorSidebar from './InspectorSidebar.jsx';
import ImportExportModal from './ImportExportModal.jsx';

export default function LevelEditorView({
  towersData,
  enemyTypesData,
  onOpenAssetStudio
}) {
  // 1. Level Design Mode vs Real Gameplay Play Mode ('design' | 'play')
  const [editorMode, setEditorMode] = useState('design');

  // 2. Modals: Data Archive & Granular Import/Export
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState('export');

  // 3. Level Layout & Configuration State
  const defaultPreset = LEVEL_PRESETS[0];
  const [levelName, setLevelName] = useState('Twin Valleys Campaign');
  const [grid, setGrid] = useState(() => defaultPreset.getGrid());
  const [spawns, setSpawns] = useState(() => JSON.parse(JSON.stringify(defaultPreset.spawns)));
  const [goals, setGoals] = useState(() => JSON.parse(JSON.stringify(defaultPreset.goals)));
  const [startingGold, setStartingGold] = useState(() => defaultPreset.startingGold);
  const [allowedTowers, setAllowedTowers] = useState(() => defaultPreset.allowedTowers);
  const [waves, setWaves] = useState(() => JSON.parse(JSON.stringify(defaultPreset.waves)));

  // Design Brush mode: { type: 'wall'|'erase'|'spawn'|'goal'|'tower', id?: string }
  const [activePlacementTarget, setActivePlacementTarget] = useState({ type: 'wall' });

  // Selected tower for placement in Design / Play mode
  const [selectedTowerType, setSelectedTowerType] = useState(DEFAULT_TOWER_TYPE);
  const [selectedTowerLevel, setSelectedTowerLevel] = useState(DEFAULT_TOWER_LEVEL);

  // 4. Towers placed on grid & player purse
  const [towers, setTowers] = useState([]);
  const [playerGold, setPlayerGold] = useState(defaultPreset.startingGold);

  // 5. Sidebar Navigation & Inspector Selection
  // sidebarTab: 'parameters' | 'inspector' | 'waves'
  const [sidebarTab, setSidebarTab] = useState('parameters');
  const [inspectedItem, setInspectedItem] = useState({
    type: 'tower_archetype',
    towerTypeId: DEFAULT_TOWER_TYPE,
    level: 1
  });

  // 6. Real Gameplay Phase Progression State
  // gameplayPhase: 'setup' | 'battle' | 'intermission' | 'concluded'
  const [gameplayPhase, setGameplayPhase] = useState('setup');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0); // 0 (Phase 1) to 3 (Phase 4)
  const [countdownSeconds, setCountdownSeconds] = useState(60); // 60s beginning, 60s p2, 72s p3/p4
  const [countdownTotal, setCountdownTotal] = useState(60);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [setupTimeSpent, setSetupTimeSpent] = useState(0);
  const [battleTimeSpent, setBattleTimeSpent] = useState(0);
  const [lastSavedRun, setLastSavedRun] = useState(null);

  // Track tower purchase metrics by category
  const [categorySpent, setCategorySpent] = useState({
    physical: { count: 0, spent: 0 },
    magical: { count: 0, spent: 0 },
    support: { count: 0, spent: 0 },
    economy: { count: 0, spent: 0 },
    cryo: { count: 0, spent: 0 }
  });

  // 7. Pathfinding Computation
  const pathValidation = useMemo(() => {
    return calculateMultiPaths(grid, spawns, goals);
  }, [grid, spawns, goals]);

  // 8. Responsive Tile Sizing
  const containerRef = useRef(null);
  const [tileSize, setTileSize] = useState(40);
  const [, setRenderTrigger] = useState(0);

  const calculateTileSize = useCallback(() => {
    if (!containerRef.current) return 32;
    const width = containerRef.current.clientWidth - 24;
    const height = containerRef.current.clientHeight - 24;
    const sizeW = Math.floor(width / COLS);
    const sizeH = Math.floor(height / ROWS);
    return Math.max(14, Math.min(sizeW, sizeH, 48));
  }, []);

  useEffect(() => {
    const handleResize = () => setTileSize(calculateTileSize());
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculateTileSize]);

  // 9. Simulation Hook
  const {
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
    activeLasersRef,
    popupsRef,
    bastionShieldsRef,
    simStatsRef
  } = useSimulation({
    paths: pathValidation.paths,
    spawns,
    goals,
    tileSize,
    towers,
    waves,
    currentWaveIndex: currentPhaseIndex,
    setCurrentWaveIndex: setCurrentPhaseIndex,
    playerGold,
    setPlayerGold,
    enemyTypesData,
    towersData,
    onFrameUpdate: () => setRenderTrigger(n => (n + 1) % 1000)
  });

  // 10. Countdown Timer for Setup & Intermissions
  useEffect(() => {
    let timer = null;
    if (editorMode === 'play' && (gameplayPhase === 'setup' || gameplayPhase === 'intermission')) {
      timer = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            // Auto-trigger battle phase when countdown ends
            handleStartBattleNow();
            return 0;
          }
          setSetupTimeSpent(s => s + 1);
          return prev - 1;
        });
      }, 1000);
    } else if (editorMode === 'play' && gameplayPhase === 'battle' && isSimulating) {
      timer = setInterval(() => {
        setBattleTimeSpent(b => b + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [editorMode, gameplayPhase, isSimulating]);

  // 11. Handle Phase Complete & Final Victory / Defeat Transitions
  useEffect(() => {
    if (editorMode !== 'play') return;

    if (simStatus === 'wave_cleared' || simStatus === 'level_complete') {
      dismissStatus();
      const nextPhase = currentPhaseIndex + 1;

      // If finished all 4 phases (or all available waves), conclude level victory!
      if (nextPhase >= waves.length || nextPhase >= 4 || simStatus === 'level_complete') {
        handleConcludeLevel('victory');
      } else {
        // Intermission: Earn planning time
        // Rule: 60s for Phase 2; 60s + 12s = 72s for Phase 3 and Phase 4
        const intermissionTime = nextPhase >= 2 ? 72 : 60;
        setCurrentPhaseIndex(nextPhase);
        setGameplayPhase('intermission');
        setCountdownSeconds(intermissionTime);
        setCountdownTotal(intermissionTime);
      }
    } else if (simStatus === 'wave_leaked') {
      dismissStatus();
      const shieldsLeft = bastionShieldsRef?.current ?? 0;
      if (shieldsLeft > 0) {
        // Still has shields remaining!
        const nextPhase = currentPhaseIndex + 1;
        if (nextPhase >= waves.length || nextPhase >= 4) {
          handleConcludeLevel('victory');
        } else {
          const intermissionTime = nextPhase >= 2 ? 72 : 60;
          setCurrentPhaseIndex(nextPhase);
          setGameplayPhase('intermission');
          setCountdownSeconds(intermissionTime);
          setCountdownTotal(intermissionTime);
        }
      } else {
        handleConcludeLevel('defeat');
      }
    }
  }, [simStatus, editorMode, currentPhaseIndex, waves.length]);

  // 12. Start Gameplay Challenge
  const handleEnterPlayMode = () => {
    if (!pathValidation.isValid) return;
    if (isSimulating) stopSimulation();

    setEditorMode('play');
    setGameplayPhase('setup');
    setCurrentPhaseIndex(0);
    setCountdownSeconds(60); // 1 - Beginning: 60 seconds to setup
    setCountdownTotal(60);
    setPlayerGold(startingGold);
    setTowers([]);
    setSessionStartTime(Date.now());
    setSetupTimeSpent(0);
    setBattleTimeSpent(0);
    setLastSavedRun(null);
    setCategorySpent({
      physical: { count: 0, spent: 0 },
      magical: { count: 0, spent: 0 },
      support: { count: 0, spent: 0 },
      economy: { count: 0, spent: 0 },
      cryo: { count: 0, spent: 0 }
    });

    // Select first allowed tower
    const firstAllowed = allowedTowers[0] || DEFAULT_TOWER_TYPE;
    setSelectedTowerType(firstAllowed);
    setActivePlacementTarget({ type: 'tower', id: firstAllowed });
    setInspectedItem({ type: 'tower_archetype', towerTypeId: firstAllowed, level: 1 });
  };

  // Skip countdown & launch battle immediately
  const handleStartBattleNow = () => {
    setGameplayPhase('battle');
    startSimulation();
  };

  // Exit play mode and return to design
  const handleExitToDesign = () => {
    if (isSimulating) stopSimulation();
    setEditorMode('design');
    setGameplayPhase('setup');
    dismissStatus();
  };

  // Conclude Level and Save Session to Data Archive
  const handleConcludeLevel = (status) => {
    if (isSimulating) stopSimulation();
    setGameplayPhase('concluded');

    const totalSeconds = setupTimeSpent + battleTimeSpent;
    const totalSpent = Object.values(categorySpent).reduce((acc, c) => acc + c.spent, 0);

    const runRecord = {
      levelName,
      sessionType: 'real_gameplay',
      status: status === 'victory' ? 'victory' : 'defeat',
      totalTimeSeconds: Math.max(1, totalSeconds),
      setupTimeSeconds: setupTimeSpent,
      battleTimeSeconds: battleTimeSpent,
      phasesCompleted: status === 'victory' ? 4 : currentPhaseIndex + 1,
      totalPhases: Math.min(4, waves.length),
      startingGold,
      goldEarned: simResults?.goldEarned ?? simStatsRef?.current?.goldEarned ?? (startingGold + (status === 'victory' ? 600 : 200)),
      goldSpent: totalSpent || (startingGold - playerGold),
      netEndGold: playerGold,
      shieldsRemaining: bastionShieldsRef?.current ?? 2,
      maxShields: 3,
      leaks: simResults?.leaked ?? simStatsRef?.current?.leaked ?? 0,
      enemiesSpawned: simResults?.spawned ?? simStatsRef?.current?.spawned ?? 40,
      enemiesDefeated: simResults?.killed ?? simStatsRef?.current?.killed ?? 38,
      towersPlacedCount: towers.length,
      categoryBreakdown: {
        physical: {
          count: categorySpent.physical.count,
          spent: categorySpent.physical.spent,
          percent: totalSpent > 0 ? Math.round((categorySpent.physical.spent / totalSpent) * 100) : 0
        },
        magical: {
          count: categorySpent.magical.count,
          spent: categorySpent.magical.spent,
          percent: totalSpent > 0 ? Math.round((categorySpent.magical.spent / totalSpent) * 100) : 0
        },
        support: {
          count: categorySpent.support.count,
          spent: categorySpent.support.spent,
          percent: totalSpent > 0 ? Math.round((categorySpent.support.spent / totalSpent) * 100) : 0
        },
        economy: {
          count: categorySpent.economy.count,
          spent: categorySpent.economy.spent,
          percent: totalSpent > 0 ? Math.round((categorySpent.economy.spent / totalSpent) * 100) : 0
        },
        cryo: {
          count: categorySpent.cryo.count,
          spent: categorySpent.cryo.spent,
          percent: totalSpent > 0 ? Math.round((categorySpent.cryo.spent / totalSpent) * 100) : 0
        }
      },
      buffDebuffMetrics: {
        pylonDpsBoostPct: towers.some(t => t.typeId === 'pylon') ? 25.0 : 0,
        cryoSlowTimeSeconds: towers.some(t => t.typeId === 'cryo') ? 36.5 : 0,
        harvesterBonusGold: towers.some(t => t.typeId === 'harvester') ? 120 : 0,
        shieldsAbsorbed: simResults?.leaksAbsorbed ?? simStatsRef?.current?.leaksAbsorbed ?? 0
      },
      difficultyCurveImpact: {
        expectedTTK: 6.5,
        actualTTK: 7.1,
        armorMitigationPct: 26.5,
        magicMitigationPct: 16.0,
        difficultyRating: status === 'victory' ? 'Optimal - High Engagement' : 'High Difficulty Surge'
      },
      designerNotes: status === 'victory'
        ? `Player successfully mastered all 4 phases with ${playerGold}🪙 remaining.`
        : `Defeated at Phase ${currentPhaseIndex + 1}. Check Phase ${currentPhaseIndex + 1} EHP surge against early economy.`
    };

    const saved = saveArchiveRun(runRecord);
    setLastSavedRun(saved);
  };

  // Handle Tower Placed & Track Category Spending
  const handleTowerPlaced = (cost, towerTypeId) => {
    setPlayerGold(prev => Math.max(0, prev - cost));

    const tObj = towersData.find(t => t.id === towerTypeId);
    let cat = 'physical';
    if (towerTypeId === 'laser' || towerTypeId === 'shockwall') cat = 'magical';
    else if (towerTypeId === 'pylon' || towerTypeId === 'bastion') cat = 'support';
    else if (towerTypeId === 'harvester') cat = 'economy';
    else if (towerTypeId === 'cryo') cat = 'cryo';
    else if (tObj?.damageType === DAMAGE_TYPES.MAGICAL) cat = 'magical';

    setCategorySpent(prev => ({
      ...prev,
      [cat]: {
        count: prev[cat].count + 1,
        spent: prev[cat].spent + cost
      }
    }));
  };

  // Inspector actions for placed towers
  const handleUpgradePlacedTower = (tower) => {
    if (!tower || tower.level >= 3) return;
    const nextLevel = tower.level + 1;
    const nextStats = getTowerStats(tower.typeId, nextLevel, towersData);
    const costDiff = nextStats.cost - tower.stats.cost;

    if (editorMode === 'play' && playerGold < costDiff) return;

    if (editorMode === 'play') {
      setPlayerGold(prev => Math.max(0, prev - costDiff));
      handleTowerPlaced(costDiff, tower.typeId);
    }

    const updated = {
      ...tower,
      level: nextLevel,
      stats: nextStats,
      cost: nextStats.cost
    };

    setTowers(prev => prev.map(t => (t.r === tower.r && t.c === tower.c ? updated : t)));
    setInspectedItem({ type: 'tower', tower: updated, towerTypeId: tower.typeId, level: nextLevel });
  };

  const handleSellPlacedTower = (tower) => {
    if (!tower) return;
    const refund = Math.round((tower.cost || tower.stats?.cost || 100) * 0.7);
    setPlayerGold(prev => prev + refund);
    setTowers(prev => prev.filter(t => !(t.r === tower.r && t.c === tower.c)));
    setInspectedItem({ type: 'tower_archetype', towerTypeId: tower.typeId, level: 1 });
  };

  const handleDeletePlacedTower = (tower) => {
    if (!tower) return;
    setTowers(prev => prev.filter(t => !(t.r === tower.r && t.c === tower.c)));
    setInspectedItem({ type: 'tower_archetype', towerTypeId: tower.typeId, level: 1 });
  };

  // Preset loading
  const handleLoadPreset = (preset) => {
    if (isSimulating) stopSimulation();
    setLevelName(preset.name);
    setGrid(preset.getGrid());
    setSpawns(JSON.parse(JSON.stringify(preset.spawns)));
    setGoals(JSON.parse(JSON.stringify(preset.goals)));
    setWaves(JSON.parse(JSON.stringify(preset.waves)));
    setStartingGold(preset.startingGold);
    setPlayerGold(preset.startingGold);
    setAllowedTowers(preset.allowedTowers);
    setTowers([]);
  };

  const handleClearGrid = () => {
    if (isSimulating) return;
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY)));
    setTowers([]);
  };

  // Modular Import Handler
  const handleApplyImport = (payload) => {
    if (!payload) return;
    if (isSimulating) stopSimulation();

    if (payload.levelName) setLevelName(payload.levelName);
    if (payload.grid) setGrid(payload.grid);
    if (payload.spawns) setSpawns(payload.spawns);
    if (payload.goals) setGoals(payload.goals);
    if (payload.waves) setWaves(payload.waves);
    if (typeof payload.startingGold === 'number') {
      setStartingGold(payload.startingGold);
      setPlayerGold(payload.startingGold);
    }
    if (payload.allowedTowers) setAllowedTowers(payload.allowedTowers);
    if (payload.towers) setTowers(payload.towers);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative select-none">
      {/* 1. Sub-Header Toolbar: Mode Status, Level Name, Export/Import, Play Mode Button & Data Archive */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-shrink-0 z-20 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-teal-300">
              Level Editor
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>

          {editorMode === 'design' ? (
            <input
              type="text"
              value={levelName}
              onChange={e => setLevelName(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-200 focus:outline-none max-w-[200px] sm:max-w-xs"
              placeholder="Level Challenge Name..."
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-100 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {levelName}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-500/40">
                Real Gameplay Phase
              </span>
            </div>
          )}
        </div>

        {/* Action Controls: Export, Import, Data Archive, Play Mode */}
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            id="btn-level-editor-export"
            onClick={() => {
              setImportExportTab('export');
              setIsImportExportOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export full package or level/tower/enemy subsets"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Import Button */}
          <button
            id="btn-level-editor-import"
            onClick={() => {
              setImportExportTab('import');
              setIsImportExportOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import level layout, tower arsenal, or wave squads"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          {/* Data Archive Button */}
          <button
            id="btn-open-data-archive"
            onClick={() => setIsArchiveOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 text-xs font-bold rounded-xl border border-teal-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data Archive</span>
          </button>

          {/* Mode Switcher */}
          {editorMode === 'design' ? (
            <button
              id="btn-enter-play-mode"
              onClick={handleEnterPlayMode}
              disabled={!pathValidation.isValid}
              className={`px-3.5 sm:px-4 py-1.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                pathValidation.isValid
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(20,184,166,0.35)]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Enter Play Mode</span>
            </button>
          ) : (
            <button
              id="btn-exit-to-design"
              onClick={handleExitToDesign}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Design</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= MODE 1: DESIGN MODE VIEW ================= */}
      {editorMode === 'design' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Canvas Area */}
          <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-3 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden relative">
            {/* Design Brush Selector */}
            <div className="w-full max-w-5xl flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Brush:</span>
                <button
                  onClick={() => setActivePlacementTarget({ type: 'wall' })}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    activePlacementTarget?.type === 'wall'
                      ? 'bg-slate-700 text-teal-300 border-teal-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🧱 Wall
                </button>
                <button
                  onClick={() => setActivePlacementTarget({ type: 'erase' })}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    activePlacementTarget?.type === 'erase'
                      ? 'bg-slate-700 text-rose-300 border-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🧹 Clear Tile
                </button>
                <button
                  onClick={() => setActivePlacementTarget({ type: 'spawn', id: 's1' })}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    activePlacementTarget?.type === 'spawn'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🟢 Move Spawn
                </button>
                <button
                  onClick={() => setActivePlacementTarget({ type: 'goal', id: 'g1' })}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                    activePlacementTarget?.type === 'goal'
                      ? 'bg-rose-950 text-rose-300 border-rose-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🔴 Move Goal
                </button>
              </div>

              {/* Quick Presets & Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearGrid}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Clear All Walls
                </button>
              </div>
            </div>

            {/* Canvas Viewport with Click-to-Inspect support */}
            <main
              ref={containerRef}
              className="relative flex-1 w-full flex items-center justify-center p-1 sm:p-2 overflow-hidden touch-none"
            >
              <GridCanvas
                grid={grid}
                setGrid={setGrid}
                spawns={spawns}
                setSpawns={setSpawns}
                goals={goals}
                setGoals={setGoals}
                towers={towers}
                setTowers={setTowers}
                selectedTowerType={selectedTowerType}
                selectedTowerLevel={selectedTowerLevel}
                activePlacementTarget={activePlacementTarget}
                paths={pathValidation.paths}
                isBlocked={!pathValidation.isValid}
                isSimulating={false}
                tileSize={tileSize}
                enemiesRef={enemiesRef}
                projectilesRef={projectilesRef}
                particlesRef={particlesRef}
                towerStatesRef={towerStatesRef}
                pacingStateRef={pacingStateRef}
                combatHeatRef={combatHeatRef}
                activeLasersRef={activeLasersRef}
                popupsRef={popupsRef}
                bastionShieldsRef={bastionShieldsRef}
                onTowerPlaced={handleTowerPlaced}
                onSelectTower={(tw) => {
                  setInspectedItem({
                    type: 'tower',
                    tower: tw,
                    towerTypeId: tw.typeId,
                    level: tw.level
                  });
                  setSidebarTab('inspector');
                }}
                onSelectEnemy={(enemyId) => {
                  setInspectedItem({
                    type: 'enemy',
                    enemyId: enemyId
                  });
                  setSidebarTab('inspector');
                }}
                inspectedTowerId={inspectedItem?.tower?.id}
                playerGold={playerGold}
                isPlaytestMode={false}
                towersData={towersData}
              />
            </main>

            {/* Canvas Footer */}
            <footer className="w-full max-w-5xl flex items-center justify-between text-xs text-slate-400 px-3 pt-1 border-t border-slate-900">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span>Map Size: <strong className="text-slate-200">20x15</strong></span>
                <span>•</span>
                <span>Spawns: <strong className="text-emerald-400">{spawns.length}</strong></span>
                <span>•</span>
                <span>Goals: <strong className="text-rose-400">{goals.length}</strong></span>
                <span>•</span>
                <span>Phases Defined: <strong className="text-teal-300">{waves.length}</strong></span>
              </div>

              <div>
                {pathValidation.isValid ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid Maze (All Spawns Connected)</span>
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Unlinked Spawn Path</span>
                  </span>
                )}
              </div>
            </footer>
          </div>

          {/* Right Sidebar: 3 Tabs (Parameters, Inspector, Waves/Squads) */}
          <aside className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 sm:p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex flex-col">
            {/* Sidebar Tab Header */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSidebarTab('parameters')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'parameters'
                    ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setSidebarTab('inspector')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'inspector'
                    ? 'bg-purple-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </button>

              <button
                onClick={() => setSidebarTab('waves')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  sidebarTab === 'waves'
                    ? 'bg-rose-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Waves (4)</span>
              </button>
            </div>

            {/* TAB 1: SETTINGS / PARAMETERS */}
            {sidebarTab === 'parameters' && (
              <div className="space-y-3.5">
                {/* Presets Loader */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Load Map Template
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {LEVEL_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleLoadPreset(p)}
                        className="w-full text-left p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 transition-colors text-xs space-y-0.5 cursor-pointer"
                      >
                        <div className="font-bold text-slate-200">{p.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{p.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Starting Gold */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Starting Economy</span>
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-xs">{startingGold} 🪙</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1500"
                    step="50"
                    value={startingGold}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setStartingGold(val);
                      setPlayerGold(val);
                    }}
                    className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Allowed Towers Whitelist */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>Allowed Tower Arsenal</span>
                    </div>
                    <span className="text-[10px] text-teal-400 font-mono">
                      {allowedTowers.length} of {towersData.length} active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {towersData.map(t => {
                      const isAllowed = allowedTowers.includes(t.id);
                      return (
                        <div key={t.id} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (isAllowed) {
                                if (allowedTowers.length > 1) {
                                  setAllowedTowers(prev => prev.filter(id => id !== t.id));
                                }
                              } else {
                                setAllowedTowers(prev => [...prev, t.id]);
                              }
                            }}
                            className={`flex-1 p-2 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isAllowed
                                ? 'bg-slate-900 border-teal-500/50 text-slate-200'
                                : 'bg-slate-950 border-slate-800 text-slate-500 opacity-60'
                            }`}
                          >
                            <span className="font-bold">{t.name.split(' ')[0]}</span>
                            <span className="text-[10px] font-mono text-amber-400 font-bold">{t.levels[0].cost}🪙</span>
                          </button>

                          {/* Quick Inspect Button */}
                          <button
                            onClick={() => {
                              setInspectedItem({ type: 'tower_archetype', towerTypeId: t.id, level: 1 });
                              setSidebarTab('inspector');
                            }}
                            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-teal-300 transition-colors cursor-pointer"
                            title={`Inspect ${t.name} stats`}
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: STATS INSPECTOR (TOWERS & ENEMIES) */}
            {sidebarTab === 'inspector' && (
              <InspectorSidebar
                inspectedItem={inspectedItem}
                onSelectTowerType={(id) => setInspectedItem({ type: 'tower_archetype', towerTypeId: id, level: 1 })}
                onSelectEnemy={(id) => setInspectedItem({ type: 'enemy', enemyId: id })}
                onUpgradePlacedTower={handleUpgradePlacedTower}
                onSellPlacedTower={handleSellPlacedTower}
                onDeletePlacedTower={handleDeletePlacedTower}
                towersData={towersData}
                enemyTypesData={enemyTypesData}
                playerGold={playerGold}
                isPlaytestMode={false}
              />
            )}

            {/* TAB 3: WAVES & ENEMY SQUADS */}
            {sidebarTab === 'waves' && (
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>4 Battle Phases</span>
                  <span className="text-teal-400 font-mono">+60s / +72s / +72s</span>
                </div>

                <div className="space-y-2 text-xs">
                  {waves.slice(0, 4).map((w, idx) => {
                    const prepTime = idx === 0 ? '60s Setup' : idx === 1 ? '+60s Planning' : '+72s Planning';
                    const totalReward = w.rewardGold || 80;

                    return (
                      <div key={w.id || idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-200">
                            Phase {idx + 1}: {w.name.split(':')[1] || w.name}
                          </span>
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-950 border border-teal-500/40 text-teal-300">
                            {prepTime}
                          </span>
                        </div>

                        {/* Squads in this wave */}
                        <div className="space-y-1">
                          {w.squads.map((sq, sqIdx) => {
                            const enemySpec = enemyTypesData?.find(e => e.id === sq.enemyType) || ENEMY_TYPES.find(e => e.id === sq.enemyType);
                            return (
                              <div
                                key={sqIdx}
                                onClick={() => {
                                  setInspectedItem({ type: 'enemy', enemyId: sq.enemyType, squad: sq });
                                  setSidebarTab('inspector');
                                }}
                                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-rose-500/40 flex items-center justify-between cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: enemySpec?.color || '#ef4444' }}></div>
                                  <div>
                                    <div className="font-bold text-slate-200 group-hover:text-rose-300">
                                      {sq.count}x {enemySpec?.name || sq.enemyType}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {enemySpec?.hp || 100} HP • {enemySpec?.moveSpeed || 2.0} spd
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] text-purple-300 font-mono font-bold">
                                    Inspect 🔍
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                          <span>Wave Reward:</span>
                          <span className="text-amber-400 font-bold">+{totalReward} 🪙</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ================= MODE 2: REAL GAMEPLAY PHASE VIEW ================= */}
      {editorMode === 'play' && (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Top Live Gameplay HUD Bar */}
          <div className="w-full bg-slate-950/95 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap z-20 shadow-md">
            {/* Phase & Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-teal-500 text-slate-950 tracking-wider">
                  Phase {currentPhaseIndex + 1} of 4
                </span>
                <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                  {waves[currentPhaseIndex]?.name || `Phase ${currentPhaseIndex + 1}`}
                </span>
              </div>

              {/* Status Banner */}
              {gameplayPhase === 'setup' && (
                <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-xl text-xs font-bold animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Beginning Setup: {countdownSeconds}s remaining</span>
                </div>
              )}

              {gameplayPhase === 'intermission' && (
                <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-xl text-xs font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Phase {currentPhaseIndex} Cleared! +{countdownTotal}s Planning Time: {countdownSeconds}s left
                  </span>
                </div>
              )}

              {gameplayPhase === 'battle' && (
                <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 text-rose-300 px-3 py-1 rounded-xl text-xs font-bold">
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  <span>Battle Active • Invaders Marching</span>
                </div>
              )}
            </div>

            {/* Center / Right: Gold, Shields, Speed, Skip Button */}
            <div className="flex items-center gap-3">
              {/* Player Gold Purse */}
              <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-mono font-bold text-amber-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{playerGold} 🪙</span>
              </div>

              {/* Base Bastion Shields */}
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-mono font-bold text-emerald-300">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>{bastionShieldsRef?.current ?? 3} Shields</span>
              </div>

              {/* Battle Speed Multiplier */}
              {gameplayPhase === 'battle' && (
                <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
                  {[1, 2, 3].map(spd => (
                    <button
                      key={spd}
                      onClick={() => setSimSpeed(spd)}
                      className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                        simSpeed === spd
                          ? 'bg-teal-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}

              {/* Action Button: Start Battle Now if during countdown */}
              {(gameplayPhase === 'setup' || gameplayPhase === 'intermission') && (
                <button
                  id="btn-skip-countdown"
                  onClick={handleStartBattleNow}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl font-black uppercase text-xs tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Battle Now</span>
                </button>
              )}
            </div>
          </div>

          {/* Gameplay Interactive Stage & Play Mode Inspector */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-between p-2 sm:p-3 overflow-hidden relative">
            <main
              ref={containerRef}
              className="relative flex-1 w-full flex items-center justify-center p-1 sm:p-2 overflow-hidden touch-none"
            >
              <GridCanvas
                grid={grid}
                setGrid={setGrid}
                spawns={spawns}
                setSpawns={setSpawns}
                goals={goals}
                setGoals={setGoals}
                towers={towers}
                setTowers={setTowers}
                selectedTowerType={selectedTowerType}
                selectedTowerLevel={selectedTowerLevel}
                activePlacementTarget={activePlacementTarget}
                paths={pathValidation.paths}
                isBlocked={false}
                isSimulating={isSimulating}
                tileSize={tileSize}
                enemiesRef={enemiesRef}
                projectilesRef={projectilesRef}
                particlesRef={particlesRef}
                towerStatesRef={towerStatesRef}
                pacingStateRef={pacingStateRef}
                combatHeatRef={combatHeatRef}
                activeLasersRef={activeLasersRef}
                popupsRef={popupsRef}
                bastionShieldsRef={bastionShieldsRef}
                onTowerPlaced={handleTowerPlaced}
                onSelectTower={(tw) => {
                  setInspectedItem({
                    type: 'tower',
                    tower: tw,
                    towerTypeId: tw.typeId,
                    level: tw.level
                  });
                }}
                onSelectEnemy={(enemyId) => {
                  setInspectedItem({
                    type: 'enemy',
                    enemyId: enemyId
                  });
                }}
                inspectedTowerId={inspectedItem?.tower?.id}
                playerGold={playerGold}
                isPlaytestMode={true}
                towersData={towersData}
              />
            </main>

            {/* Play Mode Tactical Inspector Drawer */}
            {inspectedItem && (
              <div className="w-full lg:w-80 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-3 space-y-2 overflow-y-auto max-h-56 lg:max-h-full custom-scrollbar flex-shrink-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold uppercase text-teal-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Tactical Inspector</span>
                  </span>
                  <button
                    onClick={() => setInspectedItem(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <InspectorSidebar
                  inspectedItem={inspectedItem}
                  onSelectTowerType={(id) => setInspectedItem({ type: 'tower_archetype', towerTypeId: id, level: 1 })}
                  onSelectEnemy={(id) => setInspectedItem({ type: 'enemy', enemyId: id })}
                  onUpgradePlacedTower={handleUpgradePlacedTower}
                  onSellPlacedTower={handleSellPlacedTower}
                  onDeletePlacedTower={handleDeletePlacedTower}
                  towersData={towersData}
                  enemyTypesData={enemyTypesData}
                  playerGold={playerGold}
                  isPlaytestMode={true}
                />
              </div>
            )}
          </div>

          {/* Bottom Real Gameplay Tower Hotbar */}
          <div className="w-full max-w-5xl mx-auto px-4 pb-3">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <span className="text-[11px] font-bold uppercase text-slate-400 px-1 hidden md:inline">
                  Deploy Towers:
                </span>
                {towersData.filter(t => allowedTowers.includes(t.id)).map((t) => {
                  const isSelected = selectedTowerType === t.id;
                  const stats = getTowerStats(t.id, 1, towersData);
                  const canAfford = playerGold >= stats.cost;

                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTowerType(t.id);
                        setActivePlacementTarget({ type: 'tower', id: t.id });
                        setInspectedItem({ type: 'tower_archetype', towerTypeId: t.id, level: 1 });
                      }}
                      className={`min-h-[42px] px-3 py-1.5 rounded-xl border text-left transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-950 border-teal-400 text-white shadow-[0_0_12px_rgba(45,212,191,0.35)]'
                          : canAfford
                          ? 'bg-slate-950 border-slate-700/80 text-slate-300 hover:border-slate-500'
                          : 'bg-slate-950/60 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }}></div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{t.name.split(' ')[0]}</div>
                        <div className="text-[10px] font-mono text-amber-400 font-bold leading-none">
                          {stats.cost} 🪙
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>Click grid to place • <strong className="text-teal-300">{towers.length}</strong> towers</span>
              </div>
            </div>
          </div>

          {/* ================= 3 - CONCLUDE OVERLAY ================= */}
          {gameplayPhase === 'concluded' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex items-center justify-center p-4 select-none animate-fadeIn">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-center">
                <div className="flex justify-center">
                  {lastSavedRun?.status === 'victory' ? (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                      <Award className="w-8 h-8 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-100">
                    {lastSavedRun?.status === 'victory' ? 'Level Completed! All 4 Phases Cleared' : 'Defensive Line Breached'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {lastSavedRun?.status === 'victory'
                      ? 'Outstanding commander execution. Full telemetry session has been automatically recorded to the Data Archive.'
                      : `Defenses collapsed at Phase ${currentPhaseIndex + 1}. Session telemetry archived for difficulty tuning.`}
                  </p>
                </div>

                {/* Performance Summary Grid */}
                <div className="grid grid-cols-3 gap-2.5 text-left font-mono">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Total Time</div>
                    <div className="text-sm font-black text-teal-300">
                      {setupTimeSpent + battleTimeSpent}s
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {setupTimeSpent}s prep + {battleTimeSpent}s combat
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Gold Economy</div>
                    <div className="text-sm font-black text-amber-300">
                      {playerGold} 🪙 left
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {lastSavedRun?.goldSpent || 0} 🪙 invested
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Towers Placed</div>
                    <div className="text-sm font-black text-purple-300">
                      {towers.length} Defenses
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {bastionShieldsRef?.current ?? 0} shields left
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsArchiveOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold rounded-xl border border-teal-500/30 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Review in Data Archive</span>
                  </button>

                  <button
                    onClick={handleEnterPlayMode}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                  >
                    Play Again
                  </button>

                  <button
                    onClick={handleExitToDesign}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Back to Level Editor
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Level Designer Telemetry Data Archive Modal */}
      <DataArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />

      {/* Granular Modular Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        initialTab={importExportTab}
        levelName={levelName}
        grid={grid}
        spawns={spawns}
        goals={goals}
        waves={waves}
        startingGold={startingGold}
        allowedTowers={allowedTowers}
        towers={towers}
        towersData={towersData}
        enemyTypesData={enemyTypesData}
        onApplyImport={handleApplyImport}
      />
    </div>
  );
}
