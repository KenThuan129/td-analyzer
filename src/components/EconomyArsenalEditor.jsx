import React from 'react';
import {
  Coins,
  Shield,
  Zap,
  Target,
  Crosshair,
  Bomb,
  Radio,
  Snowflake,
  ShieldAlert,
  Check,
  Lock,
  Unlock,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { TOWER_TYPES, TOWER_CATEGORIES, DAMAGE_TYPES, getTowerStats } from '../data/towers.js';

export default function EconomyArsenalEditor({
  startingGold,
  setStartingGold,
  allowedTowers,
  setAllowedTowers,
  towersData = TOWER_TYPES
}) {
  const currentTowers = towersData && towersData.length > 0 ? towersData : TOWER_TYPES;
  const isTowerAllowed = (id) => allowedTowers.includes(id);

  const toggleTower = (id) => {
    setAllowedTowers(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Keep at least 1 tower allowed
        return prev.filter(t => t !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    setAllowedTowers(currentTowers.map(t => t.id));
  };

  const handleSelectOffenseOnly = () => {
    setAllowedTowers(currentTowers.filter(t => t.category === TOWER_CATEGORIES.OFFENSE).map(t => t.id));
  };

  const handleSelectStarterPack = () => {
    setAllowedTowers(currentTowers.slice(0, 4).map(t => t.id));
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* 1. Starting Gold Configuration */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Level Starting Gold
              </span>
              <div className="text-[11px] text-slate-400">
                Initial player purse available at the beginning of the level
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-inner">
            <input
              type="number"
              min="100"
              max="5000"
              step="50"
              value={startingGold}
              onChange={(e) => setStartingGold(Math.max(50, Number(e.target.value)))}
              className="w-20 bg-transparent font-mono font-black text-amber-400 text-sm text-right focus:outline-none"
            />
            <span className="text-amber-400 text-xs font-bold">🪙</span>
          </div>
        </div>

        {/* Quick budget presets */}
        <div className="flex gap-1.5 pt-1">
          {[300, 500, 750, 1000, 1500].map(amt => (
            <button
              key={amt}
              onClick={() => setStartingGold(amt)}
              className={`flex-1 py-1 rounded-lg font-mono text-[11px] font-bold border transition-colors cursor-pointer ${
                startingGold === amt
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {amt}🪙
            </button>
          ))}
        </div>
      </div>

      {/* 2. Allowed Towers Roster */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
              <span>Allowed Tower Arsenal ({allowedTowers.length} / {currentTowers.length})</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Restrict which towers players can purchase in this level
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300 transition-colors cursor-pointer"
            >
              All
            </button>
            <button
              onClick={handleSelectOffenseOnly}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-amber-300 transition-colors cursor-pointer"
            >
              Offense
            </button>
            <button
              onClick={handleSelectStarterPack}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-teal-300 transition-colors cursor-pointer"
            >
              Starter
            </button>
          </div>
        </div>

        {/* Tower Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currentTowers.map(tower => {
            const isAllowed = isTowerAllowed(tower.id);
            const lvl1Stats = getTowerStats(tower.id, 1, currentTowers);

            return (
              <div
                key={tower.id}
                onClick={() => toggleTower(tower.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isAllowed
                    ? 'bg-slate-900/95 border-teal-500/50 shadow-[0_0_12px_rgba(45,212,191,0.1)]'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-50 grayscale hover:opacity-75 hover:grayscale-0'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner flex-shrink-0"
                    style={{ backgroundColor: `${tower.color}25`, color: tower.color }}
                  >
                    {tower.id === 'sniper' ? <Crosshair className="w-4 h-4" /> :
                     tower.id === 'gatling' ? <Zap className="w-4 h-4" /> :
                     tower.id === 'mortar' ? <Bomb className="w-4 h-4" /> :
                     tower.id === 'bastion' ? <Shield className="w-4 h-4" /> :
                     tower.id === 'shockwall' ? <ShieldAlert className="w-4 h-4" /> :
                     tower.id === 'pylon' ? <Radio className="w-4 h-4" /> :
                     tower.id === 'cryo' ? <Snowflake className="w-4 h-4" /> :
                     tower.id === 'harvester' ? <Coins className="w-4 h-4" /> :
                     <Target className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200">{tower.name}</span>
                      <span className="text-[10px] font-mono font-bold text-amber-400">
                        {lvl1Stats.cost}🪙
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {tower.tagline}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    isAllowed
                      ? 'bg-teal-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isAllowed ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3 h-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
