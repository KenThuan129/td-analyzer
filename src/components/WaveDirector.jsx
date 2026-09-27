import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Coins,
  Shield,
  Zap,
  Sparkles,
  Sliders,
  ListOrdered,
  Percent,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export const WAVE_SPAWN_MODES = {
  RATIO: 'ratio',
  SPECIFIC: 'specific'
};

export default function WaveDirector({
  waves,
  setWaves,
  spawns,
  selectedWaveIndex,
  setSelectedWaveIndex,
  enemyTypesData,
  onOpenAssetStudio
}) {
  const currentWave = waves[selectedWaveIndex] || waves[0];
  const [spawnMode, setSpawnMode] = useState(currentWave?.spawnMode || WAVE_SPAWN_MODES.RATIO);

  // Helper to find archetype
  const getArchetype = (typeId) => {
    return enemyTypesData.find(e => e.id === typeId) || enemyTypesData[0];
  };

  const handleAddWave = () => {
    const nextNum = waves.length + 1;
    const newWave = {
      id: `w${Date.now()}`,
      name: `Wave ${nextNum}: Sector Assault`,
      spawnMode: WAVE_SPAWN_MODES.RATIO,
      rewardGold: 80 + nextNum * 25,
      totalUnits: 16,
      spawnInterval: 0.8,
      spawnVector: spawns[0]?.id || 's1',
      ratios: {
        grunt: 60,
        scout: 30,
        tank: 10
      },
      squads: [
        { enemyType: 'grunt', count: 10, spawnId: spawns[0]?.id || 's1', spawnInterval: 0.8 },
        { enemyType: 'scout', count: 6, spawnId: spawns[0]?.id || 's1', spawnInterval: 0.6 }
      ]
    };
    setWaves(prev => [...prev, newWave]);
    setSelectedWaveIndex(waves.length);
  };

  const handleDuplicateWave = (idx) => {
    const source = waves[idx];
    const newWave = {
      ...JSON.parse(JSON.stringify(source)),
      id: `w${Date.now()}`,
      name: `${source.name} (Copy)`
    };
    setWaves(prev => [...prev.slice(0, idx + 1), newWave, ...prev.slice(idx + 1)]);
    setSelectedWaveIndex(idx + 1);
  };

  const handleRemoveWave = (idx) => {
    if (waves.length <= 1) return;
    setWaves(prev => prev.filter((_, i) => i !== idx));
    setSelectedWaveIndex(Math.max(0, idx - 1));
  };

  const handleUpdateWaveMeta = (field, value) => {
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedWaveIndex][field] = value;
      return copy;
    });
  };

  // Switch between Ratio Mode and Specific Squad Mode
  const handleToggleSpawnMode = (mode) => {
    setSpawnMode(mode);
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const w = copy[selectedWaveIndex];
      w.spawnMode = mode;

      if (mode === WAVE_SPAWN_MODES.RATIO) {
        // Build squads from ratios
        const total = w.totalUnits || 15;
        const ratios = w.ratios || { grunt: 70, scout: 30 };
        const newSquads = [];

        Object.keys(ratios).forEach(eId => {
          const pct = ratios[eId] || 0;
          const count = Math.max(1, Math.round((pct / 100) * total));
          if (pct > 0) {
            newSquads.push({
              enemyType: eId,
              count,
              spawnId: w.spawnVector || spawns[0]?.id || 's1',
              spawnInterval: w.spawnInterval || 0.8
            });
          }
        });
        w.squads = newSquads;
      }
      return copy;
    });
  };

  // Ratio Mode: Update Enemy Ratio
  const handleUpdateRatio = (enemyId, newPct) => {
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const w = copy[selectedWaveIndex];
      if (!w.ratios) w.ratios = {};
      w.ratios[enemyId] = Number(newPct);

      // Rebuild squads
      const total = Number(w.totalUnits || 15);
      const newSquads = [];
      Object.keys(w.ratios).forEach(eId => {
        const pct = w.ratios[eId] || 0;
        if (pct > 0) {
          const count = Math.max(1, Math.round((pct / 100) * total));
          newSquads.push({
            enemyType: eId,
            count,
            spawnId: w.spawnVector || spawns[0]?.id || 's1',
            spawnInterval: Number(w.spawnInterval || 0.8)
          });
        }
      });
      w.squads = newSquads;
      return copy;
    });
  };

  // Specific Squad Mode: Add Squad
  const handleAddSpecificSquad = () => {
    const newSquad = {
      enemyType: enemyTypesData[0]?.id || 'grunt',
      count: 6,
      spawnId: spawns[0]?.id || 's1',
      spawnInterval: 0.8
    };
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedWaveIndex].squads.push(newSquad);
      return copy;
    });
  };

  const handleRemoveSquad = (squadIdx) => {
    if (currentWave.squads.length <= 1) return;
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedWaveIndex].squads.splice(squadIdx, 1);
      return copy;
    });
  };

  const handleUpdateSquad = (squadIdx, field, value) => {
    setWaves(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedWaveIndex].squads[squadIdx][field] = value;
      return copy;
    });
  };

  // Wave summary telemetry derived from master archetypes
  const totalWaveUnits = currentWave?.squads?.reduce((sum, s) => sum + Number(s.count || 0), 0) || 0;
  const totalWaveHp = currentWave?.squads?.reduce((sum, s) => {
    const arch = getArchetype(s.enemyType);
    return sum + (Number(s.count || 0) * Number(arch.hp || 100));
  }, 0) || 0;

  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. Wave Carousel Strip */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Wave Sequences ({waves.length} Total)
            </span>
          </div>

          <button
            id="btn-add-new-wave"
            onClick={handleAddWave}
            className="px-2.5 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-500/50 text-teal-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Wave</span>
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {waves.map((w, idx) => {
            const isSel = idx === selectedWaveIndex;
            const waveUnits = w.squads.reduce((sum, s) => sum + Number(s.count || 0), 0);
            return (
              <button
                key={w.id || idx}
                id={`btn-select-wave-${idx + 1}`}
                onClick={() => {
                  setSelectedWaveIndex(idx);
                  setSpawnMode(w.spawnMode || WAVE_SPAWN_MODES.RATIO);
                }}
                className={`px-3 py-1.5 rounded-lg border text-left flex-shrink-0 transition-all cursor-pointer ${
                  isSel
                    ? 'bg-teal-950/90 border-teal-400 text-white shadow-[0_0_12px_rgba(45,212,191,0.25)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="text-xs font-black leading-none">Wave {idx + 1}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  {waveUnits} units • +{w.rewardGold}🪙
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Wave Meta & Mode Selection */}
      {currentWave && (
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
          {/* Wave Name & Duplication Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <input
              type="text"
              value={currentWave.name}
              onChange={(e) => handleUpdateWaveMeta('name', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-100 flex-1 min-w-[150px] focus:outline-none focus:border-teal-400"
            />

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDuplicateWave(selectedWaveIndex)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Duplicate</span>
              </button>

              {waves.length > 1 && (
                <button
                  onClick={() => handleRemoveWave(selectedWaveIndex)}
                  className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900 text-rose-300 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Spawn Configuration Mode Switcher: Ratio vs Specific */}
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>Spawn Strategy Option:</span>
              </span>

              {/* Mode Toggle Pills */}
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => handleToggleSpawnMode(WAVE_SPAWN_MODES.RATIO)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    spawnMode === WAVE_SPAWN_MODES.RATIO
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3 h-3" />
                  <span>Ratio Spawn</span>
                </button>

                <button
                  onClick={() => handleToggleSpawnMode(WAVE_SPAWN_MODES.SPECIFIC)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    spawnMode === WAVE_SPAWN_MODES.SPECIFIC
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-3 h-3" />
                  <span>Specific Spawn</span>
                </button>
              </div>
            </div>

            {/* Locked Enemy Stats Notice with Asset Studio Link */}
            <div className="bg-slate-950/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Enemy base stats are calibrated in the Asset Studio</span>
              </span>

              <button
                onClick={onOpenAssetStudio}
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Open Asset Studio</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Units</span>
              <span className="font-mono font-bold text-teal-300">{totalWaveUnits} Units</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Wave HP</span>
              <span className="font-mono font-bold text-purple-300">{totalWaveHp} HP</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Wave Reward</span>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={currentWave.rewardGold || 80}
                  onChange={(e) => handleUpdateWaveMeta('rewardGold', Number(e.target.value))}
                  className="w-14 bg-slate-950 border border-amber-500/40 rounded px-1 py-0.5 text-center font-mono font-bold text-amber-400 text-xs"
                />
                <span className="text-amber-400 text-[10px]">🪙</span>
              </div>
            </div>
          </div>

          {/* ================= MODE 1: RATIO SPAWN SETUP ================= */}
          {spawnMode === WAVE_SPAWN_MODES.RATIO ? (
            <div className="space-y-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Composition Ratios
                </span>

                {/* Total Units & Vector */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Total:</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={currentWave.totalUnits || 16}
                      onChange={(e) => {
                        handleUpdateWaveMeta('totalUnits', Number(e.target.value));
                        handleToggleSpawnMode(WAVE_SPAWN_MODES.RATIO);
                      }}
                      className="w-12 bg-transparent font-mono font-bold text-teal-300 text-center focus:outline-none"
                    />
                  </div>

                  <select
                    value={currentWave.spawnVector || 's1'}
                    onChange={(e) => {
                      handleUpdateWaveMeta('spawnVector', e.target.value);
                      handleToggleSpawnMode(WAVE_SPAWN_MODES.RATIO);
                    }}
                    className="bg-slate-950 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400 focus:outline-none"
                  >
                    {spawns.map((sp, idx) => (
                      <option key={sp.id} value={sp.id}>From {sp.name || `Spawn ${idx + 1}`}</option>
                    ))}
                    {spawns.length > 1 && <option value="both">Alternate S1 & S2</option>}
                  </select>
                </div>
              </div>

              {/* Ratios Sliders */}
              <div className="space-y-2.5">
                {enemyTypesData.map(e => {
                  const currentRatio = (currentWave.ratios && currentWave.ratios[e.id]) ?? (e.id === 'grunt' ? 60 : 0);
                  const approxCount = Math.round(((currentRatio || 0) / 100) * (currentWave.totalUnits || 16));

                  return (
                    <div
                      key={e.id}
                      className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }}></span>
                          <span className="font-bold text-slate-200">{e.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({e.hp} HP • 🛡️{e.armor}% 🔮{e.magicRes}%)
                          </span>
                        </div>
                        <div className="font-mono text-xs font-bold text-teal-300">
                          {currentRatio}% ({approxCount} units)
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentRatio}
                        onChange={(ev) => handleUpdateRatio(e.id, ev.target.value)}
                        className="w-full h-1.5 accent-teal-400 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================= MODE 2: SPECIFIC SQUAD SPAWN SETUP ================= */
            <div className="space-y-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Sequenced Squad List ({currentWave.squads.length})
                </span>

                <button
                  id="btn-add-specific-squad"
                  onClick={handleAddSpecificSquad}
                  className="px-2 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-500/40 text-teal-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Squad</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {currentWave.squads.map((squad, sIdx) => {
                  const arch = getArchetype(squad.enemyType);
                  return (
                    <div
                      key={sIdx}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <select
                            value={squad.enemyType}
                            onChange={(e) => handleUpdateSquad(sIdx, 'enemyType', e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-200"
                          >
                            {enemyTypesData.map(et => (
                              <option key={et.id} value={et.id}>
                                {et.name} ({et.hp}HP)
                              </option>
                            ))}
                          </select>

                          <select
                            value={squad.spawnId || 's1'}
                            onChange={(e) => handleUpdateSquad(sIdx, 'spawnId', e.target.value)}
                            className="bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs font-bold text-emerald-400"
                          >
                            {spawns.map((sp, idx) => (
                              <option key={sp.id} value={sp.id}>From {sp.name || `Spawn ${idx + 1}`}</option>
                            ))}
                            {spawns.length > 1 && <option value="both">Alternate S1 & S2</option>}
                          </select>
                        </div>

                        {currentWave.squads.length > 1 && (
                          <button
                            onClick={() => handleRemoveSquad(sIdx)}
                            className="p-1 hover:bg-rose-950 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Squad Count & Interval */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] uppercase">Count:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={squad.count}
                            onChange={(e) => handleUpdateSquad(sIdx, 'count', Number(e.target.value))}
                            className="w-16 bg-transparent font-bold text-slate-100 text-right focus:outline-none"
                          />
                        </div>

                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] uppercase">Interval:</span>
                          <input
                            type="number"
                            min="0.2"
                            max="5.0"
                            step="0.1"
                            value={squad.spawnInterval}
                            onChange={(e) => handleUpdateSquad(sIdx, 'spawnInterval', Number(e.target.value))}
                            className="w-16 bg-transparent font-bold text-cyan-300 text-right focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Read-Only Calibrated Master Stats Indicator */}
                      <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded">
                        <span>Calibrated Stats:</span>
                        <span>{arch.hp} HP • 🛡️{arch.armor}% • 🔮{arch.magicRes}% • {arch.moveSpeed} spd</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
