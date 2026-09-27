import React, { useState } from 'react';
import {
  Target,
  Crosshair,
  Zap,
  Bomb,
  Shield,
  ShieldAlert,
  Radio,
  Snowflake,
  Coins,
  ChevronUp,
  Sliders,
  Sparkles,
  Sword,
  Wand2
} from 'lucide-react';
import {
  TOWER_TYPES,
  TOWER_CATEGORIES,
  DAMAGE_TYPES,
  getTowerType,
  getTowerStats
} from '../data/towers.js';

const ICON_MAP = {
  Target: Target,
  Crosshair: Crosshair,
  Zap: Zap,
  Bomb: Bomb,
  Shield: Shield,
  ShieldAlert: ShieldAlert,
  Radio: Radio,
  Snowflake: Snowflake,
  Coins: Coins
};

export default function TowerPalette({
  selectedType,
  setSelectedType,
  selectedLevel,
  setSelectedLevel,
  towerStats,
  setTowerStats,
  towersData = TOWER_TYPES
}) {
  const currentTowers = towersData && towersData.length > 0 ? towersData : TOWER_TYPES;
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'offense' | 'defense' | 'utility'

  const currentTower = getTowerType(selectedType, currentTowers);

  const handleSelectType = (typeId) => {
    setSelectedType(typeId);
    const newStats = getTowerStats(typeId, selectedLevel, currentTowers);
    setTowerStats(newStats);
  };

  const handleSelectLevel = (level) => {
    setSelectedLevel(level);
    const newStats = getTowerStats(selectedType, level, currentTowers);
    setTowerStats(newStats);
  };

  const filteredTowers = currentTowers.filter(t => {
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  const isOffense = currentTower.category === TOWER_CATEGORIES.OFFENSE;
  const isDefense = currentTower.category === TOWER_CATEGORIES.DEFENSE;
  const isUtility = currentTower.category === TOWER_CATEGORIES.UTILITY;

  const dps = isOffense || currentTower.id === 'shockwall' || currentTower.id === 'cryo'
    ? (Number(towerStats.damage || 0) * Number(towerStats.attackSpeed || 1)).toFixed(1)
    : null;

  return (
    <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800/80 space-y-3.5">
      {/* Header with DPS or Role Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
          <Target className="w-4 h-4 text-purple-400" />
          <span>Tower Forge & Archetypes</span>
        </div>
        {dps !== null ? (
          <div className="text-[11px] font-mono text-purple-300 font-semibold bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
            {currentTower.damageType === DAMAGE_TYPES.PHYSICAL ? (
              <Sword className="w-3 h-3 text-amber-400" />
            ) : (
              <Wand2 className="w-3 h-3 text-cyan-400" />
            )}
            <span>{dps} DPS</span>
          </div>
        ) : isDefense ? (
          <div className="text-[11px] font-mono text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Defend / Shield</span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-amber-300 font-semibold bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Utility / Support</span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800/80 text-[11px]">
        {[
          { id: 'all', label: 'All' },
          { id: 'offense', label: '⚔️ Offense' },
          { id: 'defense', label: '🛡️ Defense' },
          { id: 'utility', label: '⚡ Utility' }
        ].map((cat) => (
          <button
            key={cat.id}
            id={`tab-tower-cat-${cat.id}`}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-1 py-1 px-1.5 rounded font-bold transition-all truncate text-center ${
              activeCategory === cat.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tower Type Selection Grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
        {filteredTowers.map((t) => {
          const Icon = ICON_MAP[t.icon] || Target;
          const isSelected = selectedType === t.id;

          const badgeText =
            t.damageType === DAMAGE_TYPES.PHYSICAL ? 'PHYSICAL ⚔️' :
            t.damageType === DAMAGE_TYPES.MAGICAL ? 'MAGICAL 🔮' :
            t.category === TOWER_CATEGORIES.DEFENSE ? 'DEFENSE 🛡️' : 'UTILITY ⚡';

          const badgeColor =
            t.damageType === DAMAGE_TYPES.PHYSICAL ? 'text-amber-400 bg-amber-950/50 border-amber-800/40' :
            t.damageType === DAMAGE_TYPES.MAGICAL ? 'text-cyan-400 bg-cyan-950/50 border-cyan-800/40' :
            t.category === TOWER_CATEGORIES.DEFENSE ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40' :
            'text-yellow-400 bg-yellow-950/50 border-yellow-800/40';

          return (
            <button
              key={t.id}
              id={`tower-type-${t.id}`}
              onClick={() => handleSelectType(t.id)}
              className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/70 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)] text-white'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold leading-tight truncate">{t.name}</span>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.color }} />
              </div>
              <span className="text-[10px] text-slate-400 leading-tight truncate mb-1">{t.tagline}</span>
              <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded border self-start ${badgeColor}`}>
                {badgeText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Upgrade Level Selector (Tiers 1, 2, 3) */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <ChevronUp className="w-3.5 h-3.5 text-purple-400" />
            Upgrade Tier
          </span>
          <span className="text-purple-300 text-[11px] font-bold">Tier {selectedLevel} (Level {selectedLevel})</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map((lvl) => {
            const isSelected = selectedLevel === lvl;
            const lvlStats = currentTower.levels.find(l => l.level === lvl);
            return (
              <button
                key={lvl}
                id={`tower-level-${lvl}`}
                onClick={() => handleSelectLevel(lvl)}
                className={`py-1.5 px-2 rounded-md font-bold text-xs uppercase transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>Level {lvl}</span>
                <span className="text-[9px] opacity-80">{lvlStats?.cost}g</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Fine-Tuning Stat Sliders */}
      <div className="space-y-2.5 pt-1 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-purple-400" />
            Attributes & Customization
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {currentTower.damageType ? currentTower.damageType.toUpperCase() : 'SUPPORT'}
          </span>
        </div>

        {/* 1. Offense / Damage Slider */}
        {(isOffense || currentTower.id === 'shockwall' || currentTower.id === 'cryo') && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Damage ({currentTower.damageType === DAMAGE_TYPES.PHYSICAL ? 'Physical ⚔️' : 'Magical 🔮'})
              </span>
              <span className="font-mono font-bold text-purple-300 text-xs">{towerStats.damage} HP</span>
            </div>
            <input
              id="tower-stat-damage"
              type="range"
              min="1"
              max="600"
              value={towerStats.damage}
              onChange={(e) => setTowerStats({ ...towerStats, damage: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* 2. Attack Speed Slider */}
        {(isOffense || currentTower.id === 'shockwall' || currentTower.id === 'cryo') && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Attack / Pulse Speed</span>
              <span className="font-mono font-bold text-purple-300 text-xs">{towerStats.attackSpeed} /s</span>
            </div>
            <input
              id="tower-stat-speed"
              type="range"
              min="0.1"
              max="6.0"
              step="0.1"
              value={towerStats.attackSpeed}
              onChange={(e) => setTowerStats({ ...towerStats, attackSpeed: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* 3. Defense Aegis Bastion Shield & Slow Sliders */}
        {currentTower.id === 'bastion' && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Base Shield Capacity
                </span>
                <span className="font-mono font-bold text-emerald-300 text-xs">{towerStats.shieldHp || 2} Leaks Absorbed</span>
              </div>
              <input
                id="tower-stat-shield"
                type="range"
                min="1"
                max="10"
                value={towerStats.shieldHp || 2}
                onChange={(e) => setTowerStats({ ...towerStats, shieldHp: Number(e.target.value) })}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-400 text-[11px]">Kinetic Barrier Slow</span>
                <span className="font-mono font-bold text-cyan-300 text-xs">{towerStats.slowPct || 25}%</span>
              </div>
              <input
                id="tower-stat-slow"
                type="range"
                min="5"
                max="75"
                step="5"
                value={towerStats.slowPct || 25}
                onChange={(e) => setTowerStats({ ...towerStats, slowPct: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </>
        )}

        {/* 4. Power Pylon Buff Sliders */}
        {currentTower.id === 'pylon' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-yellow-400 text-[11px] flex items-center gap-1">
                <Radio className="w-3 h-3" /> Tower Overcharge Buff
              </span>
              <span className="font-mono font-bold text-yellow-300 text-xs">+{towerStats.buffSpeedPct || 20}% Speed / +{towerStats.buffDmgPct || 15}% Dmg</span>
            </div>
            <input
              id="tower-stat-buff"
              type="range"
              min="10"
              max="80"
              step="5"
              value={towerStats.buffSpeedPct || 20}
              onChange={(e) => setTowerStats({
                ...towerStats,
                buffSpeedPct: Number(e.target.value),
                buffDmgPct: Math.round(Number(e.target.value) * 0.75)
              })}
              className="w-full accent-yellow-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* 5. Cryo Emitter Slow & Armor Shred */}
        {currentTower.id === 'cryo' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-sky-400 text-[11px] flex items-center gap-1">
                <Snowflake className="w-3 h-3" /> Aura Slow & Shred
              </span>
              <span className="font-mono font-bold text-sky-300 text-xs">-{towerStats.slowPct || 35}% Spd / -{towerStats.shredPct || 15}% Res</span>
            </div>
            <input
              id="tower-stat-cryo-slow"
              type="range"
              min="10"
              max="80"
              step="5"
              value={towerStats.slowPct || 35}
              onChange={(e) => setTowerStats({
                ...towerStats,
                slowPct: Number(e.target.value),
                shredPct: Math.round(Number(e.target.value) * 0.5)
              })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* 6. Solar Harvester Gold Production */}
        {currentTower.id === 'harvester' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 text-[11px] flex items-center gap-1">
                <Coins className="w-3 h-3" /> Gold Farming Harvest
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs">+{towerStats.goldPerTick || 15} 🪙 / 3s</span>
            </div>
            <input
              id="tower-stat-gold-farming"
              type="range"
              min="5"
              max="150"
              step="5"
              value={towerStats.goldPerTick || 15}
              onChange={(e) => setTowerStats({ ...towerStats, goldPerTick: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Range Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Range (Aura / Reach)</span>
            <span className="font-mono font-bold text-purple-300 text-xs">{towerStats.range} tiles</span>
          </div>
          <input
            id="tower-stat-range"
            type="range"
            min="1.5"
            max="9.0"
            step="0.5"
            value={towerStats.range}
            onChange={(e) => setTowerStats({ ...towerStats, range: Number(e.target.value) })}
            className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Cost Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Cost</span>
            <span className="font-mono font-bold text-amber-400 text-xs">{towerStats.cost} 🪙</span>
          </div>
          <input
            id="tower-stat-cost"
            type="range"
            min="10"
            max="1200"
            step="10"
            value={towerStats.cost}
            onChange={(e) => setTowerStats({ ...towerStats, cost: Number(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
