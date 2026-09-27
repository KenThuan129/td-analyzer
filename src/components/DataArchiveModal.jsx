import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  X,
  Trash2,
  Download,
  Clock,
  Shield,
  Coins,
  Swords,
  TrendingUp,
  Activity,
  Award,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { getArchiveRuns, deleteArchiveRun, clearArchive } from '../utils/archiveStore.js';

export default function DataArchiveModal({ isOpen, onClose }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'real_gameplay' | 'playtest_sandbox'

  const refreshRuns = () => {
    const list = getArchiveRuns();
    setRuns(list);
    if (list.length > 0 && !selectedRunId) {
      setSelectedRunId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshRuns();
    }
  }, [isOpen]);

  const filteredRuns = useMemo(() => {
    return runs.filter(r => {
      const matchSearch =
        (r.levelName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.status || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || r.sessionType === filterType;
      return matchSearch && matchType;
    });
  }, [runs, searchQuery, filterType]);

  const selectedRun = useMemo(() => {
    return runs.find(r => r.id === selectedRunId) || filteredRuns[0] || null;
  }, [runs, selectedRunId, filteredRuns]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const updated = deleteArchiveRun(id);
    setRuns(updated);
    if (selectedRunId === id) {
      setSelectedRunId(updated[0]?.id || null);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `level-designer-telemetry-archive-${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all telemetry runs in the data archive?')) {
      clearArchive();
      setRuns([]);
      setSelectedRunId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-base font-black tracking-wide text-slate-100 flex items-center gap-2">
                <span>Level Designer Telemetry Data Archive</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono font-bold">
                  {runs.length} Sessions Logged
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live playfield telemetry, tension dynamics, category economy, and difficulty impact archives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              disabled={runs.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Export Archive JSON</span>
            </button>
            <button
              onClick={handleClearAll}
              disabled={runs.length === 0}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body (2 Columns: List on left, Deep analysis on right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Run Selector */}
          <div className="w-full md:w-80 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col p-3 flex-shrink-0">
            {/* Search & Filters */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by level or status..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 py-1 rounded font-bold cursor-pointer transition-colors ${
                    filterType === 'all' ? 'bg-slate-800 text-teal-300' : 'text-slate-400'
                  }`}
                >
                  All ({runs.length})
                </button>
                <button
                  onClick={() => setFilterType('real_gameplay')}
                  className={`flex-1 py-1 rounded font-bold cursor-pointer transition-colors ${
                    filterType === 'real_gameplay' ? 'bg-slate-800 text-teal-300' : 'text-slate-400'
                  }`}
                >
                  Gameplay
                </button>
                <button
                  onClick={() => setFilterType('playtest_sandbox')}
                  className={`flex-1 py-1 rounded font-bold cursor-pointer transition-colors ${
                    filterType === 'playtest_sandbox' ? 'bg-slate-800 text-teal-300' : 'text-slate-400'
                  }`}
                >
                  Sandbox
                </button>
              </div>
            </div>

            {/* Run Cards Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredRuns.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No recorded sessions match your filter.
                </div>
              ) : (
                filteredRuns.map(r => {
                  const isSelected = selectedRun?.id === r.id;
                  const isWin = r.status === 'victory' || r.status === 'level_complete' || r.status === 'wave_cleared';

                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-slate-800/90 border-teal-400 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-200 group-hover:text-teal-300 transition-colors">
                          {r.levelName || 'Custom Level'}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded border ${
                            isWin
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                              : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          {r.status || 'Finished'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{r.totalTimeSeconds || 0}s total</span>
                        </span>
                        <span className="text-amber-400 font-bold">
                          {r.goldSpent || 0} 🪙
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="capitalize">{r.sessionType?.replace('_', ' ')}</span>
                      </div>

                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        title="Delete run from archive"
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded bg-slate-950 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Deep Session Breakdown */}
          <div className="flex-1 bg-slate-900/90 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            {selectedRun ? (
              <div className="space-y-5">
                {/* Top Summary Banner */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-100">
                        {selectedRun.levelName || 'Custom Labyrinth Challenge'}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 font-mono font-bold">
                        Phase {selectedRun.phasesCompleted || 4}/{selectedRun.totalPhases || 4}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Session recorded on {new Date(selectedRun.timestamp).toLocaleString()} • Type: <strong className="text-slate-200 capitalize">{selectedRun.sessionType?.replace('_', ' ')}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Run Time</div>
                      <div className="font-mono text-sm font-black text-teal-300">
                        {selectedRun.totalTimeSeconds}s <span className="text-xs text-slate-400 font-normal">({selectedRun.setupTimeSeconds || 0}s prep + {selectedRun.battleTimeSeconds || selectedRun.totalTimeSeconds}s combat)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Total Gold Flow</span>
                    </div>
                    <div className="text-base font-black text-amber-300 font-mono">
                      {selectedRun.goldEarned || 0} 🪙
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Spent: {selectedRun.goldSpent || 0} 🪙 • Left: {selectedRun.netEndGold || 0} 🪙
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                      <Swords className="w-3.5 h-3.5 text-rose-400" />
                      <span>Combat Kill Rate</span>
                    </div>
                    <div className="text-base font-black text-rose-300 font-mono">
                      {selectedRun.enemiesDefeated || 0} / {selectedRun.enemiesSpawned || 0}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Leaks: {selectedRun.leaks || 0} • Absorbed: {selectedRun.buffDebuffMetrics?.shieldsAbsorbed || 0}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Base Integrity</span>
                    </div>
                    <div className="text-base font-black text-emerald-300 font-mono">
                      {selectedRun.shieldsRemaining ?? 3} / {selectedRun.maxShields || 3} Shields
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Core status: {selectedRun.status === 'victory' ? 'Intact 100%' : 'Breached'}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span>Towers Deployed</span>
                    </div>
                    <div className="text-base font-black text-purple-300 font-mono">
                      {selectedRun.towersPlacedCount || 0} Towers
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Avg cost/tower: {selectedRun.towersPlacedCount ? Math.round((selectedRun.goldSpent || 0) / selectedRun.towersPlacedCount) : 0}🪙
                    </div>
                  </div>
                </div>

                {/* Section 1: Expectation Design vs Realistic Play & Category Investment */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-teal-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Tower Investment by Category vs Realistic Play
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Total Allocated: {selectedRun.goldSpent || 0} 🪙
                    </span>
                  </div>

                  {/* Category Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(selectedRun.categoryBreakdown || {}).map(([cat, data]) => {
                      const colors = {
                        physical: { bar: 'bg-amber-500', text: 'text-amber-400', label: 'Kinetic / Physical (Gatling, Sniper, Mortar)' },
                        magical: { bar: 'bg-cyan-500', text: 'text-cyan-400', label: 'Energy / Magic (Laser, Shockwall)' },
                        support: { bar: 'bg-purple-500', text: 'text-purple-400', label: 'Support / Buffs (Pylon, Bastion)' },
                        economy: { bar: 'bg-emerald-500', text: 'text-emerald-400', label: 'Economic (Harvester Drill)' },
                        cryo: { bar: 'bg-blue-400', text: 'text-blue-300', label: 'Crowd Control (Cryo Core)' }
                      }[cat] || { bar: 'bg-slate-500', text: 'text-slate-300', label: cat };

                      return (
                        <div key={cat} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-bold ${colors.text}`}>{colors.label}</span>
                            <span className="font-mono text-slate-300 text-[11px]">
                              {data.spent} 🪙 ({data.percent || 0}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} transition-all`}
                              style={{ width: `${Math.min(100, data.percent || 0)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {data.count} towers placed in this archetype
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 2: Difficulty Curve Impact & Buff/Debuff Efficiency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Difficulty Curve Impact */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Difficulty Curve & TTK Impact
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Pacing Rating:</span>
                        <span className="font-bold text-teal-300 font-mono">
                          {selectedRun.difficultyCurveImpact?.difficultyRating || 'Balanced Progression'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Observed TTK vs Expected:</span>
                        <span className="text-slate-200">
                          {selectedRun.difficultyCurveImpact?.actualTTK || 7.2}s <span className="text-slate-500">(target: {selectedRun.difficultyCurveImpact?.expectedTTK || 6.5}s)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Armor Mitigation Absorbed:</span>
                        <span className="text-amber-300 font-bold">
                          {selectedRun.difficultyCurveImpact?.armorMitigationPct || 25}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Magic Shield Mitigation:</span>
                        <span className="text-cyan-300 font-bold">
                          {selectedRun.difficultyCurveImpact?.magicMitigationPct || 15}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buffs & Debuffs Performance */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Synergy Buffs & Debuff Dynamics
                      </h3>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Pylon Aura Attack Speed Multiplier:</span>
                        <span className="text-purple-300 font-bold">
                          +{selectedRun.buffDebuffMetrics?.pylonDpsBoostPct || 0}% DPS
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Cryo Frost Slow Delay Delivered:</span>
                        <span className="text-blue-300 font-bold">
                          {selectedRun.buffDebuffMetrics?.cryoSlowTimeSeconds || 0}s delay
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Harvester Economy Mining Yield:</span>
                        <span className="text-emerald-400 font-bold">
                          +{selectedRun.buffDebuffMetrics?.harvesterBonusGold || 0} 🪙
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono">
                        <span className="text-slate-400">Bastion Shield Barrier Saves:</span>
                        <span className="text-teal-300 font-bold">
                          {selectedRun.buffDebuffMetrics?.shieldsAbsorbed || 0} leaks blocked
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Designer Notes */}
                {selectedRun.designerNotes && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Designer Balance Observations
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">
                      "{selectedRun.designerNotes}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-12">
                <Database className="w-10 h-10 text-slate-700" />
                <div className="text-sm font-bold text-slate-400">Select a Telemetry Run</div>
                <div className="text-xs">Choose a session on the left to inspect its deep balance analytics.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
