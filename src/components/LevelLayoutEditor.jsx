import React from 'react';
import {
  Map,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ROWS, COLS, TILE_WALL, TILE_EMPTY } from '../utils/constants.js';

export default function LevelLayoutEditor({
  spawns,
  setSpawns,
  goals,
  setGoals,
  activePlacementTarget, // { type: 'spawn' | 'goal' | 'wall' | 'erase', id?: string }
  setActivePlacementTarget,
  pathValidation,
  onClearGrid,
  onResetMaze
}) {
  const canAddSpawn = spawns.length < 2;
  const canAddGoal = goals.length < 2;

  const handleAddSpawn = () => {
    if (!canAddSpawn) return;
    const newId = spawns.some(s => s.id === 's1') ? 's2' : 's1';
    const newName = newId === 's1' ? 'North Pass (S1)' : 'South Gorge (S2)';
    const defaultPos = newId === 's1' ? { r: 3, c: 2 } : { r: 11, c: 2 };
    const newSpawn = {
      id: newId,
      name: newName,
      r: defaultPos.r,
      c: defaultPos.c,
      color: newId === 's1' ? '#22c55e' : '#10b981'
    };
    setSpawns(prev => [...prev, newSpawn]);
    setActivePlacementTarget({ type: 'spawn', id: newId });
  };

  const handleRemoveSpawn = (id) => {
    if (spawns.length <= 1) return; // Keep at least 1 spawn
    setSpawns(prev => prev.filter(s => s.id !== id));
    if (activePlacementTarget?.type === 'spawn' && activePlacementTarget?.id === id) {
      setActivePlacementTarget({ type: 'wall' });
    }
  };

  const handleAddGoal = () => {
    if (!canAddGoal) return;
    const newId = goals.some(g => g.id === 'g1') ? 'g2' : 'g1';
    const newName = newId === 'g1' ? 'Citadel Gate (G1)' : 'East Vault (G2)';
    const defaultPos = newId === 'g1' ? { r: 4, c: 17 } : { r: 10, c: 17 };
    const newGoal = {
      id: newId,
      name: newName,
      r: defaultPos.r,
      c: defaultPos.c,
      color: newId === 'g1' ? '#ef4444' : '#f43f5e'
    };
    setGoals(prev => [...prev, newGoal]);
    setActivePlacementTarget({ type: 'goal', id: newId });
  };

  const handleRemoveGoal = (id) => {
    if (goals.length <= 1) return; // Keep at least 1 goal
    setGoals(prev => prev.filter(g => g.id !== id));
    if (activePlacementTarget?.type === 'goal' && activePlacementTarget?.id === id) {
      setActivePlacementTarget({ type: 'wall' });
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. Path Connectivity & Validation Banner */}
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          pathValidation.isValid
            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'bg-rose-950/60 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          {pathValidation.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs font-black uppercase tracking-wider">
            {pathValidation.isValid
              ? 'All Spawns Linked to Goals (Valid Map)'
              : 'Pathfinding Blocked / Unlinked Spawn'}
          </span>
        </div>

        {pathValidation.isValid ? (
          <div className="space-y-1 text-xs text-slate-300">
            {spawns.map(sp => {
              const spPath = pathValidation.paths[sp.id];
              const tgtGoal = pathValidation.targetGoals[sp.id];
              return (
                <div key={sp.id} className="flex items-center justify-between font-mono text-[11px] bg-slate-900/80 px-2 py-1 rounded">
                  <span className="text-emerald-400 font-bold">{sp.name || sp.id}:</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <span>{spPath ? `${spPath.length} steps` : '0 steps'}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-rose-400 font-semibold">{tgtGoal?.name || 'Goal'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1 text-xs text-rose-300 font-medium">
            {pathValidation.errors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>{err}</span>
              </div>
            ))}
            <div className="text-[11px] text-rose-400/90 pt-1">
              * Rule: Maximum 2 Spawns & 2 Goals. Every spawn must have a clear path to at least one reachable Goal.
            </div>
          </div>
        )}
      </div>

      {/* 2. Spawn Points Management (Max 2) */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Spawn Points ({spawns.length} / 2)
            </span>
          </div>

          {canAddSpawn && (
            <button
              id="btn-add-spawn-point"
              onClick={handleAddSpawn}
              className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Spawn 2</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {spawns.map((spawn, idx) => {
            const isSelected = activePlacementTarget?.type === 'spawn' && activePlacementTarget?.id === spawn.id;
            return (
              <div
                key={spawn.id}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs text-white shadow"
                    style={{ backgroundColor: spawn.color || '#22c55e' }}
                  >
                    S{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{spawn.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pos: Row {spawn.r}, Col {spawn.c}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-select-spawn-${spawn.id}`}
                    onClick={() => setActivePlacementTarget({ type: 'spawn', id: spawn.id })}
                    className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Placing...' : 'Relocate'}
                  </button>

                  {spawns.length > 1 && (
                    <button
                      onClick={() => handleRemoveSpawn(spawn.id)}
                      title="Remove Spawn"
                      className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Goal Points Management (Max 2) */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Goals to Protect ({goals.length} / 2)
            </span>
          </div>

          {canAddGoal && (
            <button
              id="btn-add-goal-point"
              onClick={handleAddGoal}
              className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add Goal 2</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {goals.map((goal, idx) => {
            const isSelected = activePlacementTarget?.type === 'goal' && activePlacementTarget?.id === goal.id;
            return (
              <div
                key={goal.id}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-rose-950/60 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs text-white shadow"
                    style={{ backgroundColor: goal.color || '#ef4444' }}
                  >
                    G{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{goal.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pos: Row {goal.r}, Col {goal.c}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`btn-select-goal-${goal.id}`}
                    onClick={() => setActivePlacementTarget({ type: 'goal', id: goal.id })}
                    className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? 'Placing...' : 'Relocate'}
                  </button>

                  {goals.length > 1 && (
                    <button
                      onClick={() => handleRemoveGoal(goal.id)}
                      title="Remove Goal"
                      className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Wall Editing Tools */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Wall Drawing Brushes</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-wall-brush-draw"
            onClick={() => setActivePlacementTarget({ type: 'wall' })}
            className={`py-2 px-3 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activePlacementTarget?.type === 'wall'
                ? 'bg-slate-700 border-slate-400 text-white shadow-[0_0_10px_rgba(148,163,184,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-400"></span>
            <span>Build Wall</span>
          </button>

          <button
            id="btn-wall-brush-erase"
            onClick={() => setActivePlacementTarget({ type: 'erase' })}
            className={`py-2 px-3 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              activePlacementTarget?.type === 'erase'
                ? 'bg-amber-900/60 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            <span>Erase / Path</span>
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            id="btn-reset-layout-maze"
            onClick={onResetMaze}
            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Labyrinth</span>
          </button>

          <button
            id="btn-clear-all-walls"
            onClick={onClearGrid}
            className="flex-1 py-1.5 px-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear Walls</span>
          </button>
        </div>
      </div>
    </div>
  );
}
