import React from 'react';
import { Skull, Sparkles, Coins, Users, Clock, Shield, Flame, Sparkle } from 'lucide-react';
import { ENEMY_TYPES, getEnemyPreset } from '../data/enemies.js';

export default function EnemyForge({
  enemyStats,
  setEnemyStats,
  selectedEnemyPreset,
  setSelectedEnemyPreset
}) {
  const handleSelectPreset = (presetId) => {
    setSelectedEnemyPreset(presetId);
    const preset = getEnemyPreset(presetId);
    setEnemyStats({
      hp: preset.hp,
      armor: preset.armor ?? 15,
      magicRes: preset.magicRes ?? 15,
      moveSpeed: preset.moveSpeed,
      bounty: preset.bounty,
      count: preset.count,
      spawnInterval: preset.spawnInterval
    });
  };

  const totalWaveHp = (Number(enemyStats.hp) * Number(enemyStats.count)).toLocaleString();
  const totalBounty = Number(enemyStats.bounty) * Number(enemyStats.count);
  const estWaveDuration = (Math.max(0, Number(enemyStats.count) - 1) * Number(enemyStats.spawnInterval)).toFixed(1);

  return (
    <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
          <Skull className="w-4 h-4 text-rose-400" />
          <span>Enemy Wave Forge</span>
        </div>
        <div className="text-[11px] font-mono text-rose-300 font-semibold bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-md">
          {totalWaveHp} Total HP
        </div>
      </div>

      {/* Preset Archetypes */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-rose-400" />
            Wave Presets
          </span>
          <span className="text-[10px] text-slate-500">Click to apply</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ENEMY_TYPES.map((preset) => {
            const isSelected = selectedEnemyPreset === preset.id;
            return (
              <button
                key={preset.id}
                id={`enemy-preset-${preset.id}`}
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.35)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {preset.name.split(' ')[1] || preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
        {/* HP */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Skull className="w-3 h-3 text-rose-400" />
              Hit Points (HP)
            </span>
            <span className="font-mono font-bold text-rose-300 text-xs">{enemyStats.hp} HP</span>
          </div>
          <input
            id="enemy-stat-hp"
            type="range"
            min="10"
            max="3000"
            step="10"
            value={enemyStats.hp}
            onChange={(e) => setEnemyStats({ ...enemyStats, hp: Number(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Physical Armor & Magic Resistance Dual Sliders */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
          {/* Physical Armor */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-400" />
                Armor (Phys)
              </span>
              <span className="font-mono font-bold text-amber-300">{enemyStats.armor ?? 0}%</span>
            </div>
            <input
              id="enemy-stat-armor"
              type="range"
              min="0"
              max="80"
              step="5"
              value={enemyStats.armor ?? 0}
              onChange={(e) => setEnemyStats({ ...enemyStats, armor: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[9px] text-slate-500 block leading-tight">Reduces Physical Dmg</span>
          </div>

          {/* Magic Resistance */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-purple-400 font-medium flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-purple-400" />
                Magic Res
              </span>
              <span className="font-mono font-bold text-purple-300">{enemyStats.magicRes ?? 0}%</span>
            </div>
            <input
              id="enemy-stat-magic-res"
              type="range"
              min="0"
              max="80"
              step="5"
              value={enemyStats.magicRes ?? 0}
              onChange={(e) => setEnemyStats({ ...enemyStats, magicRes: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[9px] text-slate-500 block leading-tight">Reduces Magic Dmg</span>
          </div>
        </div>

        {/* Move Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Move Speed</span>
            <span className="font-mono font-bold text-rose-300 text-xs">{enemyStats.moveSpeed} tiles/s</span>
          </div>
          <input
            id="enemy-stat-speed"
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={enemyStats.moveSpeed}
            onChange={(e) => setEnemyStats({ ...enemyStats, moveSpeed: Number(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Bounty */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              Bounty Reward
            </span>
            <span className="font-mono font-bold text-amber-400 text-xs">{enemyStats.bounty} 🪙</span>
          </div>
          <input
            id="enemy-stat-bounty"
            type="range"
            min="1"
            max="150"
            value={enemyStats.bounty}
            onChange={(e) => setEnemyStats({ ...enemyStats, bounty: Number(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Wave Count */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Users className="w-3 h-3 text-rose-400" />
              Wave Size (Count)
            </span>
            <span className="font-mono font-bold text-rose-300 text-xs">{enemyStats.count} units</span>
          </div>
          <input
            id="enemy-stat-count"
            type="range"
            min="1"
            max="50"
            value={enemyStats.count}
            onChange={(e) => setEnemyStats({ ...enemyStats, count: Number(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Spawn Interval */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              Spawn Interval
            </span>
            <span className="font-mono font-bold text-rose-300 text-xs">{enemyStats.spawnInterval}s</span>
          </div>
          <input
            id="enemy-stat-interval"
            type="range"
            min="0.1"
            max="3.0"
            step="0.05"
            value={enemyStats.spawnInterval}
            onChange={(e) => setEnemyStats({ ...enemyStats, spawnInterval: Number(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Summary Footnote */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Spawn Duration: ~{estWaveDuration}s</span>
        <span className="text-amber-400/90 font-medium">Bounty Pool: {totalBounty}🪙</span>
      </div>
    </div>
  );
}
