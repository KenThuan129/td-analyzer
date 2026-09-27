import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Shield,
  Sparkles,
  Map,
  Users,
  Coins,
  Play,
  RotateCcw,
  Target,
  Layers,
  ChevronRight,
  Download,
  AlertCircle,
  Wrench,
  Gamepad2,
  Database
} from 'lucide-react';
import { ROWS, COLS, TILE_EMPTY, TILE_WALL, MODES } from './utils/constants.js';
import { calculateMultiPaths } from './utils/pathfinding.js';
import { LEVEL_PRESETS, DEFAULT_ALLOWED_TOWERS } from './data/levelPresets.js';
import { getTowerStats, DEFAULT_TOWER_TYPE, DEFAULT_TOWER_LEVEL, TOWER_TYPES } from './data/towers.js';
import { ENEMY_TYPES } from './data/enemies.js';

import WorkflowHeader, { WORKFLOW_STEPS, WORKSPACES } from './components/WorkflowHeader.jsx';
import LevelLayoutEditor from './components/LevelLayoutEditor.jsx';
import WaveDirector from './components/WaveDirector.jsx';
import EconomyArsenalEditor from './components/EconomyArsenalEditor.jsx';
import PacingDashboard from './components/PacingDashboard.jsx';
import AssetStudio from './components/AssetStudio.jsx';
import LevelEditorView from './components/LevelEditorView.jsx';
import GridCanvas from './components/GridCanvas.jsx';
import AnalysisModal from './components/AnalysisModal.jsx';
import DataArchiveModal from './components/DataArchiveModal.jsx';
import ImportExportModal from './components/ImportExportModal.jsx';
import { useSimulation } from './hooks/useSimulation.js';

export default function App() {
  // 1. Primary 3-Workspace Page Switcher: 'level_editor' | 'playtest_sandbox' | 'asset_studio'
  const [activeWorkspace, setActiveWorkspace] = useState(WORKSPACES.LEVEL_EDITOR);

  // 2. Global Modals
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState('export');

  // 3. Master Game Database (Tuned in Asset Studio, referenced across all systems)
  const [towersData, setTowersData] = useState(() => JSON.parse(JSON.stringify(TOWER_TYPES)));
  const [enemyTypesData, setEnemyTypesData] = useState(() => JSON.parse(JSON.stringify(ENEMY_TYPES)));

  // 4. Playtest Sandbox Workflow Stepper State (4 Steps)
  const [activeStep, setActiveStep] = useState(WORKFLOW_STEPS.LAYOUT);

  // 5. Level Layout State (Step 1)
  const defaultPreset = LEVEL_PRESETS[0];

  const [grid, setGrid] = useState(() => defaultPreset.getGrid());
  const [spawns, setSpawns] = useState(() => JSON.parse(JSON.stringify(defaultPreset.spawns)));
  const [goals, setGoals] = useState(() => JSON.parse(JSON.stringify(defaultPreset.goals)));

  // Target brush mode: { type: 'spawn'|'goal'|'wall'|'erase'|'tower', id?: string }
  const [activePlacementTarget, setActivePlacementTarget] = useState({ type: 'wall' });

  // 6. Multi-Wave Configuration State (Step 2)
  const [waves, setWaves] = useState(() => JSON.parse(JSON.stringify(defaultPreset.waves)));
  const [selectedWaveIndex, setSelectedWaveIndex] = useState(0);

  // 7. Level Economy & Allowed Arsenal State (Step 3)
  const [startingGold, setStartingGold] = useState(() => defaultPreset.startingGold);
  const [allowedTowers, setAllowedTowers] = useState(() => defaultPreset.allowedTowers);

  // 8. Towers & Player Purse State (Step 4 Playtesting)
  const [towers, setTowers] = useState([]);
  const [playerGold, setPlayerGold] = useState(() => defaultPreset.startingGold);

  // Selected tower for placement in Playtest Sandbox
  const [selectedTowerType, setSelectedTowerType] = useState(DEFAULT_TOWER_TYPE);
  const [selectedTowerLevel, setSelectedTowerLevel] = useState(DEFAULT_TOWER_LEVEL);
  const [towerStats, setTowerStats] = useState(() => getTowerStats(DEFAULT_TOWER_TYPE, DEFAULT_TOWER_LEVEL, towersData));

  // 9. Multi-Spawn & Multi-Goal Pathfinding Computation
  const pathValidation = useMemo(() => {
    return calculateMultiPaths(grid, spawns, goals);
  }, [grid, spawns, goals]);

  // 10. Responsive Tile Sizing
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

  // 11. Simulation & Playtest Hook
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
    activeLaserRef,
    activeLasersRef,
    popupsRef,
    bastionShieldsRef,
    maxBastionShieldsRef
  } = useSimulation({
    paths: pathValidation.paths,
    spawns,
    goals,
    tileSize,
    towers,
    waves,
    currentWaveIndex: selectedWaveIndex,
    setCurrentWaveIndex: setSelectedWaveIndex,
    playerGold,
    setPlayerGold,
    enemyTypesData,
    towersData,
    onFrameUpdate: () => setRenderTrigger(n => (n + 1) % 1000)
  });

  // Keep towerStats in sync with selected tower type and level
  useEffect(() => {
    setTowerStats(getTowerStats(selectedTowerType, selectedTowerLevel, towersData));
  }, [selectedTowerType, selectedTowerLevel, towersData]);

  // When changing starting gold in Step 3, refresh player purse if not simulating
  useEffect(() => {
    if (!isSimulating) {
      setPlayerGold(startingGold);
    }
  }, [startingGold, isSimulating]);

  // Handlers for Presets & Export / Import
  const handleLoadPreset = (preset) => {
    if (isSimulating) stopSimulation();
    setGrid(preset.getGrid());
    setSpawns(JSON.parse(JSON.stringify(preset.spawns)));
    setGoals(JSON.parse(JSON.stringify(preset.goals)));
    setWaves(JSON.parse(JSON.stringify(preset.waves)));
    setStartingGold(preset.startingGold);
    setPlayerGold(preset.startingGold);
    setAllowedTowers(preset.allowedTowers);
    setTowers([]);
    setSelectedWaveIndex(0);
  };

  const handleOpenExport = () => {
    setImportExportTab('export');
    setIsImportExportOpen(true);
  };

  const handleOpenImport = () => {
    setImportExportTab('import');
    setIsImportExportOpen(true);
  };

  const handleApplyImport = (payload) => {
    if (!payload) return;
    if (isSimulating) stopSimulation();

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
    if (payload.towersData) setTowersData(payload.towersData);
    if (payload.enemyTypesData) setEnemyTypesData(payload.enemyTypesData);
  };

  const handleResetMaze = () => {
    if (isSimulating) return;
    setGrid(defaultPreset.getGrid());
    setSpawns(JSON.parse(JSON.stringify(defaultPreset.spawns)));
    setGoals(JSON.parse(JSON.stringify(defaultPreset.goals)));
    setTowers([]);
  };

  const handleClearGrid = () => {
    if (isSimulating) return;
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(TILE_EMPTY)));
    setTowers([]);
  };

  const handleTowerPlaced = (cost) => {
    if (activeStep === WORKFLOW_STEPS.PLAYTEST) {
      setPlayerGold(prev => Math.max(0, prev - cost));
    }
  };

  const handleResetPlaytest = () => {
    if (isSimulating) stopSimulation();
    setTowers([]);
    setPlayerGold(startingGold);
    setSelectedWaveIndex(0);
    dismissStatus();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Universal Top Navigation Bar with 3 Dedicated Workspaces */}
      <WorkflowHeader
        activeWorkspace={activeWorkspace}
        setActiveWorkspace={setActiveWorkspace}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        pathValidation={pathValidation}
        wavesCount={waves.length}
        startingGold={startingGold}
        allowedTowersCount={allowedTowers.length}
        onLoadPreset={handleLoadPreset}
        onExportLevel={handleOpenExport}
        onOpenImport={handleOpenImport}
        onOpenArchive={() => setIsArchiveOpen(true)}
      />

      {/* ================= PAGE 1: LEVEL EDITOR ================= */}
      {activeWorkspace === WORKSPACES.LEVEL_EDITOR && (
        <main className="flex-1 overflow-hidden flex flex-col">
          <LevelEditorView
            towersData={towersData}
            enemyTypesData={enemyTypesData}
            onOpenAssetStudio={() => setActiveWorkspace(WORKSPACES.ASSET_STUDIO)}
          />
        </main>
      )}

      {/* ================= PAGE 2: PLAYTEST SANDBOX ================= */}
      {activeWorkspace === WORKSPACES.PLAYTEST && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left Interactive Grid Stage */}
          <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-3 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden relative">
            {/* Sub-header Controls / Tower Selector */}
            <div className="w-full max-w-5xl flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-sm flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-400">Playtest Workflow:</span>
                <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[11px] bg-slate-800 text-teal-300 border border-teal-500/30">
                  Step {activeStep === WORKFLOW_STEPS.LAYOUT ? '1: Layout Design' :
                        activeStep === WORKFLOW_STEPS.WAVES ? '2: Wave Director' :
                        activeStep === WORKFLOW_STEPS.ECONOMY ? '3: Economy & Arsenal' : '4: Live Data & Pacing'}
                </span>
              </div>

              {/* Tower Placement Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
                {towersData.filter(t => allowedTowers.includes(t.id)).map(t => {
                  const isSelected = selectedTowerType === t.id && activePlacementTarget?.type === 'tower';
                  const lvlStats = getTowerStats(t.id, selectedTowerLevel, towersData);
                  const canAfford = activeStep !== WORKFLOW_STEPS.PLAYTEST || playerGold >= lvlStats.cost;

                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTowerType(t.id);
                        setActivePlacementTarget({ type: 'tower', id: t.id });
                      }}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-950 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                          : canAfford
                          ? 'bg-slate-900 border-slate-700/70 text-slate-300 hover:border-slate-500'
                          : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                      <span className="whitespace-nowrap">{t.name.split(' ')[0]}</span>
                      <span className="font-mono text-amber-400 font-bold">{lvlStats.cost}🪙</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Viewport */}
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
                playerGold={playerGold}
                isPlaytestMode={activeStep === WORKFLOW_STEPS.PLAYTEST}
                towersData={towersData}
              />
            </main>

            {/* Grid Canvas Footer Stats */}
            <footer className="w-full max-w-5xl flex items-center justify-between text-xs text-slate-400 px-3 pt-1 border-t border-slate-900 flex-wrap gap-2">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span>Map: <strong className="text-slate-300">20x15</strong></span>
                <span>•</span>
                <span>Spawns: <strong className="text-emerald-400">{spawns.length}/2</strong></span>
                <span>•</span>
                <span>Goals: <strong className="text-rose-400">{goals.length}/2</strong></span>
                <span>•</span>
                <span>Towers: <strong className="text-purple-300">{towers.length}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {pathValidation.isValid ? (
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <span>✔ All Spawns Valid</span>
                  </span>
                ) : (
                  <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Unlinked Spawn Route</span>
                  </span>
                )}
              </div>
            </footer>
          </div>

          {/* Right Sidebar: Step-Specific Designer Workspace */}
          <aside className="w-full lg:w-[460px] bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between shadow-2xl overflow-hidden h-96 lg:h-full flex-shrink-0">
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar">
              {/* Step 1: Layout & Multi-Spawns / Goals */}
              {activeStep === WORKFLOW_STEPS.LAYOUT && (
                <LevelLayoutEditor
                  spawns={spawns}
                  setSpawns={setSpawns}
                  goals={goals}
                  setGoals={setGoals}
                  activePlacementTarget={activePlacementTarget}
                  setActivePlacementTarget={setActivePlacementTarget}
                  pathValidation={pathValidation}
                  onClearGrid={handleClearGrid}
                  onResetMaze={handleResetMaze}
                />
              )}

              {/* Step 2: Multi-Wave Enemy Director */}
              {activeStep === WORKFLOW_STEPS.WAVES && (
                <WaveDirector
                  waves={waves}
                  setWaves={setWaves}
                  spawns={spawns}
                  selectedWaveIndex={selectedWaveIndex}
                  setSelectedWaveIndex={setSelectedWaveIndex}
                  enemyTypesData={enemyTypesData}
                  onOpenAssetStudio={() => setActiveWorkspace(WORKSPACES.ASSET_STUDIO)}
                />
              )}

              {/* Step 3: Level Economy & Arsenal Whitelist */}
              {activeStep === WORKFLOW_STEPS.ECONOMY && (
                <EconomyArsenalEditor
                  startingGold={startingGold}
                  setStartingGold={setStartingGold}
                  allowedTowers={allowedTowers}
                  setAllowedTowers={setAllowedTowers}
                  towersData={towersData}
                />
              )}

              {/* Step 4: Playtest & Live Tracking Diagnostics */}
              {activeStep === WORKFLOW_STEPS.PLAYTEST && (
                <PacingDashboard
                  waves={waves}
                  startingGold={startingGold}
                  allowedTowers={allowedTowers}
                  towers={towers}
                  setTowers={setTowers}
                  playerGold={playerGold}
                  setPlayerGold={setPlayerGold}
                  isSimulating={isSimulating}
                  simSpeed={simSpeed}
                  setSimSpeed={setSimSpeed}
                  currentWaveIndex={selectedWaveIndex}
                  currentSquadIndex={0}
                  pacingTelemetry={pacingTelemetry}
                  simStatus={simStatus}
                  simResults={simResults}
                  onStartPlaytest={startSimulation}
                  onStopPlaytest={stopSimulation}
                  onResetPlaytest={handleResetPlaytest}
                  pathValidation={pathValidation}
                  isBlocked={!pathValidation.isValid}
                  levelName="Playtest Sandbox Map"
                  onOpenArchive={() => setIsArchiveOpen(true)}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ================= PAGE 3: ASSET STUDIO ================= */}
      {activeWorkspace === WORKSPACES.ASSET_STUDIO && (
        <main className="flex-1 overflow-hidden">
          <AssetStudio
            towersData={towersData}
            setTowersData={setTowersData}
            enemyTypesData={enemyTypesData}
            setEnemyTypesData={setEnemyTypesData}
            onSwitchToPlaytest={() => setActiveWorkspace(WORKSPACES.PLAYTEST)}
          />
        </main>
      )}

      {/* Analysis & Post-Simulation Modals */}
      <AnalysisModal
        simStatus={simStatus}
        simResults={simResults}
        onDismissSimStatus={dismissStatus}
        currentWaveIndex={selectedWaveIndex}
        totalWaves={waves.length}
        onNextWave={() => {
          dismissStatus();
          if (selectedWaveIndex < waves.length - 1) {
            setSelectedWaveIndex(prev => prev + 1);
          }
        }}
        onRetryWave={() => {
          dismissStatus();
          startSimulation();
        }}
      />

      {/* Telemetry Data Archive Modal */}
      <DataArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
      />

      {/* Modular Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        initialTab={importExportTab}
        levelName="Tower Defense Design"
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
