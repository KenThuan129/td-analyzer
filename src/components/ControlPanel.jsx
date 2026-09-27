import React, { useState } from 'react';
import { Play, Square, Search, Save, Trash2, RotateCcw, Check, Sparkles, Target, Shield, Coins } from 'lucide-react';
import { MODES, SIMULATION_SPEEDS } from '../utils/constants.js';

export default function ControlPanel({
  mode,
  setMode,
  isSimulating,
  startSimulation,
  stopSimulation,
  simSpeed,
  setSimSpeed,
  isBlocked,
  isSearchingAI,
  onFindBestPlacement,
  isSearchingOptimal,
  onFindOptimalDefense,
  budget = 1000,
  setBudget,
  onClearGrid,
  onResetDefaultMaze,
  onSaveConfig,
  pathLength,
  hideGridTools = false
}) {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    if (onSaveConfig) onSaveConfig();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Editor Placement Modes */}
      {!hideGridTools && (
      <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Grid Tools
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {isBlocked ? (
              <span className="text-rose-400 font-bold">❌ Path Blocked</span>
            ) : (
              <span className="text-emerald-400">✅ {pathLength} Steps Path</span>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            id="tool-mode-spawn"
            onClick={() => setMode(MODES.SPAWN)}
            className={`px-2.5 py-2 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 border ${
              mode === MODES.SPAWN
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
            <span className="truncate">Spawn</span>
          </button>

          <button
            id="tool-mode-goal"
            onClick={() => setMode(MODES.GOAL)}
            className={`px-2.5 py-2 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 border ${
              mode === MODES.GOAL
                ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span>
            <span className="truncate">Goal</span>
          </button>

          <button
            id="tool-mode-wall"
            onClick={() => setMode(MODES.WALL)}
            className={`px-2.5 py-2 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 border ${
              mode === MODES.WALL
                ? 'bg-slate-600 border-slate-400 text-white shadow-[0_0_12px_rgba(100,116,139,0.35)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded bg-slate-400 flex-shrink-0"></span>
            <span className="truncate">Wall</span>
          </button>

          <button
            id="tool-mode-tower"
            onClick={() => setMode(MODES.TOWER)}
            className={`px-2.5 py-2 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 border ${
              mode === MODES.TOWER
                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
            <span className="truncate">Tower</span>
          </button>
        </div>

        {/* Clear & Reset Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            id="btn-reset-default-maze"
            onClick={onResetDefaultMaze}
            disabled={isSimulating}
            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Default Maze</span>
          </button>

          <button
            id="btn-clear-grid"
            onClick={onClearGrid}
            disabled={isSimulating}
            className="flex-1 py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear Grid</span>
          </button>
        </div>
      </div>
      )}

      {/* Simulation Operations */}
      <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-3">
        {/* Speed Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium">Simulation Speed:</span>
          <div className="flex gap-1">
            {SIMULATION_SPEEDS.map((spd) => (
              <button
                key={spd}
                id={`sim-speed-${spd}x`}
                onClick={() => setSimSpeed(spd)}
                className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs transition-all ${
                  simSpeed === spd
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Run / Stop Simulation */}
        {isSimulating ? (
          <button
            id="btn-stop-simulation"
            onClick={() => stopSimulation(null)}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black uppercase tracking-wider shadow-lg transition-all border border-amber-400 flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Simulation</span>
          </button>
        ) : (
          <button
            id="btn-run-simulation"
            onClick={startSimulation}
            disabled={isBlocked}
            className={`w-full py-3 rounded-xl font-black uppercase tracking-wider shadow-lg transition-all border flex items-center justify-center gap-2 ${
              isBlocked
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] cursor-pointer'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run Simulation</span>
          </button>
        )}

        {/* AI Auto-Placement Optimizer (Single Tower) */}
        <button
          id="btn-find-best-tower"
          onClick={onFindBestPlacement}
          disabled={isBlocked || isSimulating || isSearchingAI}
          className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-wider shadow-md transition-all border text-xs flex items-center justify-center gap-2 ${
            isBlocked || isSimulating || isSearchingAI
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              : 'bg-purple-900/70 hover:bg-purple-800 text-purple-200 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)] cursor-pointer'
          }`}
        >
          {isSearchingAI ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-purple-300" />
              <span>Analyzing Grid Placements...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-purple-300" />
              <span>Find Best Tower Placement</span>
            </>
          )}
        </button>

        {/* Optimal Multi-Tower Defense Budget Slider */}
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/40 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Defense Budget
            </span>
            <span className="text-xs font-black font-mono text-amber-400">
              {budget} 🪙
            </span>
          </div>
          <input
            id="optimal-defense-budget-slider"
            type="range"
            min="200"
            max="3000"
            step="50"
            value={budget}
            onChange={(e) => setBudget?.(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>200 🪙</span>
            <span>1000 🪙</span>
            <span>3000 🪙</span>
          </div>
        </div>

        {/* New 🔍 Find Optimal Defense Button */}
        <button
          id="btn-find-optimal-defense"
          onClick={onFindOptimalDefense}
          disabled={isBlocked || isSimulating || isSearchingOptimal}
          className={`w-full py-2.5 rounded-xl font-black uppercase tracking-wider shadow-lg transition-all border text-xs flex items-center justify-center gap-2 ${
            isBlocked || isSimulating || isSearchingOptimal
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer'
          }`}
        >
          {isSearchingOptimal ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
              <span>Optimizing Defense Combination...</span>
            </>
          ) : (
            <>
              <span>🔍 Find Optimal Defense</span>
            </>
          )}
        </button>

        {/* Save Config */}
        <button
          id="btn-save-configuration"
          onClick={handleSave}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors border border-slate-800 flex items-center justify-center gap-2"
        >
          {saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Saved to Console & State!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5 text-slate-400" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
