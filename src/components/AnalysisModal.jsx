import React from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  Trophy,
  X,
  Shield,
  Zap,
  Target,
  Crosshair,
  Bomb,
  Radio,
  Snowflake,
  Coins,
  ShieldAlert
} from 'lucide-react';

export default function AnalysisModal({
  simStatus,
  simResults,
  onDismissSimStatus,
  onNextWave,
  onRetryWave,
  currentWaveIndex = 0,
  totalWaves = 1,
  aiResultsModal,
  onCloseAiModal,
  optimalDefenseModal,
  onCloseOptimalModal,
  onApplyOptimalDefense
}) {
  // If no modal is open, return null
  if (!simStatus && !aiResultsModal && !optimalDefenseModal) return null;

  // Determine if playtest simulation is DOABLE
  // It is DOABLE if:
  // 1. Path is not blocked
  // 2. No unabsorbed enemies leaked (simResults.leaked === 0)
  // 3. Status is wave_cleared / level_complete, or all enemies were neutralized (killed + absorbed >= spawned)
  const isZeroLeaks = (simResults?.leaked || 0) === 0;
  const allEnemiesNeutralized =
    simResults &&
    simResults.spawned > 0 &&
    (simResults.killed + (simResults.leaksAbsorbed || 0)) >= simResults.spawned;

  const isDoable =
    simStatus !== 'blocked' &&
    isZeroLeaks &&
    (simStatus === 'wave_cleared' ||
     simStatus === 'level_complete' ||
     simStatus === 'killed' ||
     allEnemiesNeutralized ||
     (simResults?.killed || 0) > 0 ||
     (simResults?.spawned || 0) === 0);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      {/* 1. Post-Simulation Results Dashboard */}
      {simStatus && (
        <div
          id="simulation-results-modal"
          className="bg-slate-900 border-2 border-slate-700 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center relative animate-in zoom-in-95 duration-150"
        >
          <button
            onClick={onDismissSimStatus}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {simStatus === 'blocked' ? (
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-950 border-2 border-amber-500 text-amber-400 rounded-full mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest">
                PATH BLOCKED
              </h2>
              <p className="text-xs text-amber-300/90 mt-1">
                No valid route from spawn to goal exists.
              </p>
            </div>
          ) : isDoable ? (
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-950 border-2 border-emerald-500 text-emerald-400 rounded-full mb-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                {simStatus === 'level_complete' ? 'LEVEL COMPLETE' : 'DOABLE'}
              </h2>
              <p className="text-xs text-emerald-300/90 mt-1">
                {simStatus === 'level_complete'
                  ? 'All campaign waves neutralized with zero perimeter leaks!'
                  : simResults?.leaksAbsorbed > 0
                  ? `Wave ${currentWaveIndex + 1} cleared! All wave units neutralized (${simResults.leaksAbsorbed} absorbed by Bastion shields, 0 leaked)!`
                  : `Wave ${currentWaveIndex + 1} cleared! All wave units successfully neutralized with zero leaks!`}
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-950 border-2 border-rose-500 text-rose-400 rounded-full mb-3 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-rose-500 uppercase tracking-widest">
                NOT DOABLE
              </h2>
              <p className="text-xs text-rose-300/90 mt-1">
                Defense breached! {simResults?.leaked || 1} {simResults?.leaked === 1 ? 'enemy' : 'enemies'} reached the goal.
              </p>
            </div>
          )}

          {/* Stat metrics */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-xs text-left mb-5 space-y-2 font-medium">
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="text-slate-400">Enemies Spawned:</span>
              <span className="font-mono font-bold text-slate-200">{simResults.spawned}</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="text-slate-400">Enemies Defeated:</span>
              <span className="font-mono font-bold text-emerald-400">{simResults.killed}</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="text-slate-400">Enemies Leaked:</span>
              <span className="font-mono font-bold text-rose-400">
                {simResults.leaked}
                {simResults.leaksAbsorbed > 0 && (
                  <span className="text-emerald-400 text-[10px] ml-1">
                    ({simResults.leaksAbsorbed} Shield Absorbed)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="text-slate-400">Total Damage Dealt:</span>
              <span className="font-mono font-bold text-purple-400">{simResults.totalDamage} HP</span>
            </div>
            <div className="flex justify-between border-b border-slate-850 pb-1.5">
              <span className="text-slate-400">Gold Earned / Spent:</span>
              <span className="font-mono font-bold text-amber-400">
                +{simResults.goldEarned} / -{simResults.goldSpent || 0} 🪙
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time Elapsed:</span>
              <span className="font-mono font-bold text-cyan-400">{simResults.timeElapsed}s</span>
            </div>
          </div>

          <div className="space-y-2">
            {isDoable && onNextWave && currentWaveIndex < totalWaves - 1 && (
              <button
                id="btn-next-wave-playtest"
                onClick={onNextWave}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] border border-emerald-400 text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Wave {currentWaveIndex + 2}</span>
              </button>
            )}

            {!isDoable && simStatus !== 'blocked' && onRetryWave && (
              <button
                id="btn-retry-wave-playtest"
                onClick={onRetryWave}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-400 text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Retry Wave {currentWaveIndex + 1}</span>
              </button>
            )}

            <button
              id="btn-dismiss-sim-results"
              onClick={onDismissSimStatus}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-wider transition-colors border border-slate-600 text-xs cursor-pointer"
            >
              {isDoable && currentWaveIndex < totalWaves - 1 ? 'Review Wave Layout' : 'Dismiss Analysis'}
            </button>
          </div>
        </div>
      )}

      {/* 2. AI Auto-Placement Optimization Modal */}
      {aiResultsModal && (
        <div
          id="ai-results-modal"
          className="bg-slate-900 border-2 border-amber-500/60 p-6 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center max-w-lg w-full relative animate-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => onCloseAiModal(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h3 className="text-lg font-black text-amber-400 uppercase tracking-wider">
              AI Optimal Tower Placement
            </h3>
          </div>

          {aiResultsModal.top5.length > 0 ? (
            <>
              <p className="text-xs text-slate-300 mb-4">
                Tested <span className="font-bold text-amber-400">{aiResultsModal.totalTested}</span> candidate tiles.{' '}
                {aiResultsModal.isZeroLeakPossible ? (
                  <>Found <span className="font-bold text-emerald-400">{aiResultsModal.top5.length}</span> zero-leak configuration(s):</>
                ) : (
                  <>Ranked tiles with lowest enemy leak count:</>
                )}
              </p>

              <div className="mb-5 bg-slate-950 rounded-xl border border-slate-800 p-2 sm:p-3 overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px]">
                      <th className="py-2 px-2">Rank</th>
                      <th className="py-2 px-2">Tile (R, C)</th>
                      <th className="py-2 px-2 text-right">Clear Time</th>
                      <th className="py-2 px-2 text-right">Leaks</th>
                      <th className="py-2 px-2 text-right">Damage</th>
                      <th className="py-2 px-2 text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiResultsModal.top5.map((res, idx) => (
                      <tr
                        key={`${res.r}-${res.c}`}
                        className={`border-b border-slate-850 hover:bg-slate-900 transition-colors ${
                          idx === 0 ? 'bg-amber-950/20 font-bold text-amber-200' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 px-2 flex items-center gap-1">
                          {idx === 0 ? (
                            <Trophy className="w-4 h-4 text-amber-400" />
                          ) : (
                            <span className="text-slate-500 ml-1">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          Row {res.r}, Col {res.c}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-cyan-400">
                          {res.timeElapsed}s
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          <span className={res.leaks === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                            {res.leaks}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-purple-400">
                          {res.totalDamage}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            id={`btn-select-ai-rank-${idx + 1}`}
                            onClick={() => onCloseAiModal({ r: res.r, c: res.c })}
                            className="px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded text-[11px] font-semibold transition-colors border border-purple-700/50 cursor-pointer"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl p-4 mb-5 text-rose-300 text-xs font-medium leading-relaxed">
              No placement could clear this wave with current tower parameters. Consider upgrading tower damage, range, or attack speed.
            </div>
          )}

          <button
            id="btn-apply-best-ai-placement"
            onClick={() => onCloseAiModal(null)}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all shadow-lg text-xs cursor-pointer"
          >
            {aiResultsModal.top5.length > 0 && aiResultsModal.isZeroLeakPossible
              ? 'Apply Best (#1) Placement'
              : 'Close Analysis'}
          </button>
        </div>
      )}

      {/* 3. Optimal Defense Layout & Combination Modal */}
      {optimalDefenseModal && (
        <div
          id="optimal-defense-modal"
          className={`bg-slate-900 border-2 ${
            optimalDefenseModal.isDoable
              ? 'border-emerald-500/90 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
              : 'border-rose-500/90 shadow-[0_0_50px_rgba(244,63,94,0.25)]'
          } p-5 sm:p-6 rounded-2xl max-w-lg w-full relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col`}
        >
          <button
            onClick={onCloseOptimalModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors z-10 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* VERDICT BANNER AT TOP */}
          {optimalDefenseModal.isDoable ? (
            <div
              id="verdict-banner-doable"
              className="mb-4 p-3.5 bg-emerald-950/90 border-2 border-emerald-500 rounded-xl text-center shadow-[0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0"
            >
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <span className="text-2xl font-black text-emerald-400 tracking-wider uppercase">
                  DOABLE
                </span>
              </div>
              <p className="text-xs text-emerald-300 font-medium">
                Wave cleared with 0 leaks within budget!
              </p>
            </div>
          ) : (
            <div
              id="verdict-banner-not-doable"
              className="mb-4 p-3.5 bg-rose-950/90 border-2 border-rose-500 rounded-xl text-center shadow-[0_0_20px_rgba(244,63,94,0.3)] flex-shrink-0"
            >
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <XCircle className="w-6 h-6 text-rose-400" />
                <span className="text-lg sm:text-xl font-black text-rose-400 tracking-wider uppercase">
                  NOT DOABLE WITHIN BUDGET
                </span>
              </div>
              <p className="text-xs text-rose-300 font-medium">
                {optimalDefenseModal.leaks} leaks remaining. Could not clear wave within {optimalDefenseModal.budget} 🪙 budget.
              </p>
            </div>
          )}

          {/* Summary Stat Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center flex-shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Gold Spent</span>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-400">
                {optimalDefenseModal.totalGoldSpent} / {optimalDefenseModal.budget} 🪙
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Clear Time</span>
              <span className="text-xs sm:text-sm font-black font-mono text-cyan-400">
                {optimalDefenseModal.timeElapsed}s
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Enemies / Leaks</span>
              <span className="text-xs sm:text-sm font-black font-mono">
                <span className="text-emerald-400">{optimalDefenseModal.killed}</span>
                <span className="text-slate-500"> / </span>
                <span className={optimalDefenseModal.leaks === 0 ? 'text-slate-400' : 'text-rose-400'}>
                  {optimalDefenseModal.leaks}
                </span>
              </span>
            </div>
          </div>

          {/* Optimal Defense Layout List */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1 custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Optimal Defense Layout ({optimalDefenseModal.towers.length} Towers)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Highlighted with golden borders on grid
              </span>
            </div>

            {optimalDefenseModal.towers.length > 0 ? (
              <div className="space-y-2">
                {optimalDefenseModal.towers.map((tw, idx) => {
                  return (
                    <div
                      key={tw.id || idx}
                      className="flex items-center justify-between p-2.5 bg-slate-950/90 rounded-xl border border-amber-500/40 hover:border-amber-400 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner"
                          style={{ backgroundColor: `${tw.color || '#a855f7'}25`, color: tw.color || '#a855f7' }}
                        >
                          {tw.typeId === 'sniper' ? <Crosshair className="w-4 h-4" /> :
                           tw.typeId === 'gatling' ? <Zap className="w-4 h-4" /> :
                           tw.typeId === 'mortar' ? <Bomb className="w-4 h-4" /> :
                           tw.typeId === 'bastion' ? <Shield className="w-4 h-4" /> :
                           tw.typeId === 'shockwall' ? <ShieldAlert className="w-4 h-4" /> :
                           tw.typeId === 'pylon' ? <Radio className="w-4 h-4" /> :
                           tw.typeId === 'cryo' ? <Snowflake className="w-4 h-4" /> :
                           tw.typeId === 'harvester' ? <Coins className="w-4 h-4" /> :
                           <Target className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              {tw.typeName || 'Tower'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Lv {tw.level}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Pos: ({tw.r}, {tw.c}) • {tw.stats?.damage ? `Dmg: ${tw.stats.damage}` : 'Utility / Defense'} • Rng: {tw.stats?.range}t
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-amber-400">
                          {tw.cost} 🪙
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                No towers placed in optimal defense.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-800 flex-shrink-0">
            {onApplyOptimalDefense && optimalDefenseModal.towers.length > 0 && (
              <button
                id="btn-apply-optimal-defense"
                onClick={() => onApplyOptimalDefense(optimalDefenseModal.towers)}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black rounded-xl uppercase tracking-wider text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply Defense to Grid</span>
              </button>
            )}

            <button
              id="btn-dismiss-optimal-defense"
              onClick={onCloseOptimalModal}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl uppercase tracking-wider text-xs transition-colors cursor-pointer border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
