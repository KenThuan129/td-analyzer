import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Target,
  Crosshair,
  Bomb,
  Snowflake,
  Coins,
  Sparkles,
  Info,
  Swords,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  Maximize2,
  Heart,
  Droplet,
  Percent,
  Timer,
  Radio,
  BarChart3
} from 'lucide-react';
import { DAMAGE_TYPES, getTowerStats, getTowerType, TOWER_CATEGORIES } from '../data/towers.js';
import { ENEMY_TYPES, getEnemyStats } from '../data/enemies.js';
import { computeDPS, computeTTK } from '../utils/combat.js';
import { manaRegenRate } from '../utils/mana.js';
import { resolveEffectValue } from '../utils/skills.js';

export default function InspectorSidebar({
  inspectedItem, // { type: 'tower'|'tower_archetype'|'enemy', tower?: Object, towerTypeId?: string, level?: number, enemyId?: string }
  onSelectTowerType,
  onUpgradePlacedTower,
  onSellPlacedTower,
  onDeletePlacedTower,
  towersData,
  enemyTypesData,
  playerGold = 500,
  isPlaytestMode = false,
  onSelectEnemy
}) {
  const [selectedInspectLevel, setSelectedInspectLevel] = useState(1);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'combat' | 'skills' | 'matchups'

  // Helper icons
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case TOWER_CATEGORIES.OFFENSE: return <Target className="w-3.5 h-3.5 text-rose-400" />;
      case TOWER_CATEGORIES.DEFENSE: return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case TOWER_CATEGORIES.UTILITY: return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  // 1. Tower Inspection View
  if (inspectedItem?.type === 'tower' || inspectedItem?.type === 'tower_archetype') {
    const isPlaced = inspectedItem.type === 'tower' && inspectedItem.tower;
    const towerObj = isPlaced ? inspectedItem.tower : null;
    const typeId = towerObj?.typeId || inspectedItem.towerTypeId || 'laser';
    const activeLevel = towerObj?.level || inspectedItem.level || selectedInspectLevel || 1;

    const towerTypeData = towersData?.find(t => t.id === typeId) || getTowerType(typeId);
    const currentStats = getTowerStats(typeId, activeLevel, towersData);

    const dps = computeDPS(currentStats, currentStats.damageType);
    const scoutEnemy = ENEMY_TYPES.find(e => e.id === 'scout') || { hp: 70, armor: 0, magicRes: 0 };
    const gruntEnemy = ENEMY_TYPES.find(e => e.id === 'grunt') || { hp: 150, armor: 15, magicRes: 15 };
    const tankEnemy = ENEMY_TYPES.find(e => e.id === 'tank') || { hp: 450, armor: 40, magicRes: 20 };
    const bossEnemy = ENEMY_TYPES.find(e => e.id === 'boss') || { hp: 1200, armor: 50, magicRes: 50 };

    const ttkScout = computeTTK(currentStats, 0, scoutEnemy, currentStats.damageType);
    const ttkGrunt = computeTTK(currentStats, 0, gruntEnemy, currentStats.damageType);
    const ttkTank = computeTTK(currentStats, 0, tankEnemy, currentStats.damageType);
    const ttkBoss = computeTTK(currentStats, 0, bossEnemy, currentStats.damageType);

    const cycleTime = (1 / Math.max(0.01, currentStats.attackSpeed || 1)).toFixed(2);
    const regenRate = manaRegenRate(currentStats.attributes?.INT ?? 0);
    const attrs = currentStats.attributes || currentStats.baseStats || { STR: 5, INT: 5, AGI: 5, VIT: 5 };

    const isMaxLevel = activeLevel >= 3;
    const nextStats = !isMaxLevel ? getTowerStats(typeId, activeLevel + 1, towersData) : null;
    const upgradeCost = nextStats ? nextStats.cost - currentStats.cost : 0;
    const canAffordUpgrade = isPlaytestMode ? playerGold >= upgradeCost : true;
    const sellRefund = towerObj ? Math.round(currentStats.cost * 0.7) : Math.round(currentStats.cost * 0.7);

    return (
      <div className="space-y-3.5 text-xs select-none">
        {/* Top Header Card */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                style={{ backgroundColor: towerTypeData.color || '#a855f7' }}
              >
                {getCategoryIcon(towerTypeData.category)}
              </div>
              <div>
                <div className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                  <span>{towerTypeData.name}</span>
                  {isPlaced ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-500/40">
                      Tier {activeLevel}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                      Tier {activeLevel}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {isPlaced ? `Placed at [R${towerObj.r}, C${towerObj.c}]` : (towerTypeData.tagline || 'Defense Archetype')}
                </div>
              </div>
            </div>

            {/* Damage Type Badge */}
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                towerTypeData.damageType === DAMAGE_TYPES.MAGICAL
                  ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                  : towerTypeData.damageType === DAMAGE_TYPES.PHYSICAL
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
              }`}>
                {towerTypeData.damageType}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2">
            {towerTypeData.description}
          </p>

          {/* Placed Tower Quick Actions (Upgrade, Sell, Demolish) */}
          {isPlaced && (
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {!isMaxLevel && (
                <button
                  id="btn-upgrade-placed-tower"
                  onClick={() => onUpgradePlacedTower && onUpgradePlacedTower(towerObj)}
                  disabled={isPlaytestMode && !canAffordUpgrade}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    canAffordUpgrade
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Upgrade to T{activeLevel + 1} ({upgradeCost}🪙)</span>
                </button>
              )}

              <button
                id="btn-sell-placed-tower"
                onClick={() => onSellPlacedTower && onSellPlacedTower(towerObj)}
                className="py-1.5 px-2.5 bg-slate-900 hover:bg-amber-950 hover:text-amber-300 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title={`Refund 70% gold (+${sellRefund}🪙)`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Sell (+{sellRefund}🪙)</span>
              </button>

              <button
                id="btn-demolish-placed-tower"
                onClick={() => onDeletePlacedTower && onDeletePlacedTower(towerObj)}
                className="py-1.5 px-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 rounded-lg text-xs transition-colors cursor-pointer"
                title="Demolish Defense"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs for In-Depth Data Inspection */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
          <button
            id="tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'overview' ? 'bg-slate-800 text-teal-300 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            id="tab-combat"
            onClick={() => setActiveTab('combat')}
            className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'combat' ? 'bg-slate-800 text-teal-300 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Stats
          </button>
          <button
            id="tab-skills"
            onClick={() => setActiveTab('skills')}
            className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'skills' ? 'bg-slate-800 text-teal-300 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Skills ({currentStats.skills?.length || towerTypeData.skills?.length || 0})
          </button>
          <button
            id="tab-matchups"
            onClick={() => setActiveTab('matchups')}
            className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center cursor-pointer ${
              activeTab === 'matchups' ? 'bg-slate-800 text-teal-300 shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TTK
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Tactical Combat Metrics Card */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Core Metrics (Tier {activeLevel})</span>
                <span className="text-teal-400 font-mono font-black">{dps} DPS</span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                {/* Damage */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Damage / Strike</div>
                  <div className="text-sm font-black text-rose-300 mt-0.5">{currentStats.damage}</div>
                  <div className="text-[9px] text-slate-500 font-sans">
                    {towerTypeData.damageType === DAMAGE_TYPES.MAGICAL ? 'Bypasses Physical Armor' : 'Mitigated by Armor'}
                  </div>
                </div>

                {/* Attack Speed */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Fire Rate</div>
                  <div className="text-sm font-black text-amber-300 mt-0.5">{currentStats.attackSpeed}/s</div>
                  <div className="text-[9px] text-slate-500 font-sans">Period: {cycleTime}s cycle</div>
                </div>

                {/* Range */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Radar Range</div>
                  <div className="text-sm font-black text-purple-300 mt-0.5">{currentStats.range} Tiles</div>
                  <div className="text-[9px] text-slate-500 font-sans">Radius: {Math.round(currentStats.range * 40)}px</div>
                </div>

                {/* Build Cost */}
                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans font-bold">Investment Cost</div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">{currentStats.cost} 🪙</div>
                  <div className="text-[9px] text-slate-500 font-sans">Tier {activeLevel} Value</div>
                </div>
              </div>

              {/* Primary Attributes (STR / INT / AGI / VIT) */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Primary RPG Attributes</span>
                  <span className="text-[9px] text-slate-500 font-mono">Engine Base</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <div className="text-[9px] text-rose-400 font-bold font-sans">STR</div>
                    <div className="text-xs font-black text-slate-100">{attrs.STR}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <div className="text-[9px] text-purple-400 font-bold font-sans">INT</div>
                    <div className="text-xs font-black text-slate-100">{attrs.INT}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <div className="text-[9px] text-amber-400 font-bold font-sans">AGI</div>
                    <div className="text-xs font-black text-slate-100">{attrs.AGI}</div>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <div className="text-[9px] text-emerald-400 font-bold font-sans">VIT</div>
                    <div className="text-xs font-black text-slate-100">{attrs.VIT}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Mechanics & Perks */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Special Mechanics & Perks</span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 font-sans leading-relaxed">
                {typeId === 'laser' && (
                  <div>⚡ <strong>Continuous Magical Beam</strong>: Instantaneous hitscan delivery with 0 travel delay. Bypasses 100% of physical armor on armored targets.</div>
                )}
                {typeId === 'sniper' && (
                  <div>🎯 <strong>Railgun Piercer</strong>: Extreme range ({currentStats.range} tiles) and heavy punch. Shreds single-target armor with precision.</div>
                )}
                {typeId === 'gatling' && (
                  <div>🔥 <strong>Kinetic Shredder</strong>: High attack cadence ({currentStats.attackSpeed}/s). Rapidly eliminates unarmored Swarms and Scouts.</div>
                )}
                {typeId === 'mortar' && (
                  <div>💥 <strong>Ballistic Splash</strong>: Heavy physical artillery with {currentStats.aoeRadius || 60}px blast radius. Devastates clustered enemy squads.</div>
                )}
                {typeId === 'cryo' && (
                  <div>❄️ <strong>Sub-Zero Field</strong>: Applies a frost vortex slowing enemy velocity by {currentStats.slowPct || 35}% and shredding magic resistance by {currentStats.shredPct || 15}%.</div>
                )}
                {typeId === 'pylon' && (
                  <div>🔋 <strong>Resonance Overcharge</strong>: Laser link buffing neighboring offensive towers within {currentStats.range} tiles with +{currentStats.buffSpeedPct || 20}% speed and +{currentStats.buffDmgPct || 15}% damage.</div>
                )}
                {typeId === 'harvester' && (
                  <div>⛏️ <strong>Subterranean Drill</strong>: Produces +{currentStats.goldPerTick || 15}🪙 gold every tick and amplifies enemy kill bounties by {currentStats.bountyMult || 1.25}x.</div>
                )}
                {typeId === 'bastion' && (
                  <div>🛡️ <strong>Aegis Citadel Barrier</strong>: Reinforces the Command Goal with +{currentStats.shieldHp || 2} leak-absorbing barrier shields and slows nearby hostiles by {currentStats.slowPct || 20}%.</div>
                )}
                {typeId === 'shockwall' && (
                  <div>⚡ <strong>Static Field</strong>: Shocks all hostiles in range simultaneously, stripping physical armor by {currentStats.shredPct || 15}% and dealing {currentStats.damage} pulse damage.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: ALL STATS (FULL COMPREHENSIVE DATA SHEET) */}
        {activeTab === 'combat' && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                Comprehensive Stats Dossier
              </span>
              <span className="text-[10px] text-teal-400 font-mono">T{activeLevel}</span>
            </div>

            {/* Offense & Combat Scaling */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                <Target className="w-3 h-3" /> Offense & Scaling
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Physical ATK</span>
                  <span className="text-slate-200 font-bold">{currentStats.physicalATK ?? currentStats.damage}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Magical ATK</span>
                  <span className="text-purple-300 font-bold">{currentStats.magicalATK ?? currentStats.damage}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Effective DPS</span>
                  <span className="text-teal-300 font-bold">{dps}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Crit Strike</span>
                  <span className="text-amber-300 font-bold">{Math.round((currentStats.critRate || 0.05) * 100)}% ({currentStats.critDamage || 1.5}x)</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Fire Rate</span>
                  <span className="text-slate-200 font-bold">{currentStats.attackSpeed}/s</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Cycle Period</span>
                  <span className="text-slate-300 font-bold">{cycleTime}s</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Range (Tiles)</span>
                  <span className="text-sky-300 font-bold">{currentStats.range} tiles</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Range (Pixels)</span>
                  <span className="text-sky-300 font-bold">{Math.round(currentStats.range * 40)}px</span>
                </div>
              </div>
            </div>

            {/* Durability & Citadel Defenses */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Durability & Shielding
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Structure HP</span>
                  <span className="text-rose-300 font-bold">{currentStats.maxHp || 100}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">HP Regen</span>
                  <span className="text-emerald-300 font-bold">+{currentStats.hpRegen || 0}/s</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Physical Armor</span>
                  <span className="text-blue-300 font-bold">{currentStats.defense || currentStats.baseDef || 0}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Magic Resist</span>
                  <span className="text-purple-300 font-bold">{currentStats.magicResist || currentStats.baseMres || 0}</span>
                </div>
                {currentStats.shieldHp > 0 && (
                  <div className="col-span-2 bg-emerald-950/40 p-1.5 rounded border border-emerald-500/30 flex justify-between">
                    <span className="text-emerald-300 font-sans text-[10px]">Citadel Barrier Shields</span>
                    <span className="text-emerald-200 font-bold">+{currentStats.shieldHp} Leaks Absorbed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mana & Casting Parameters */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                <Droplet className="w-3 h-3" /> Mana Pool & Energy Engine
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Max Mana Pool</span>
                  <span className="text-sky-300 font-bold">{currentStats.maxMana || 100}</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Mana Regen Rate</span>
                  <span className="text-sky-300 font-bold">+{regenRate}/s</span>
                </div>
              </div>
            </div>

            {/* Utility & Economy Factors */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Coins className="w-3 h-3" /> Utility & Economics
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Total Cost</span>
                  <span className="text-amber-300 font-bold">{currentStats.cost} 🪙</span>
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                  <span className="text-slate-400 font-sans text-[10px]">Sell Refund (70%)</span>
                  <span className="text-emerald-300 font-bold">+{sellRefund} 🪙</span>
                </div>
                {currentStats.slowPct > 0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Slow Factor</span>
                    <span className="text-sky-300 font-bold">-{currentStats.slowPct}%</span>
                  </div>
                )}
                {currentStats.shredPct > 0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Resist Shred</span>
                    <span className="text-purple-300 font-bold">-{currentStats.shredPct}%</span>
                  </div>
                )}
                {currentStats.buffSpeedPct > 0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Speed Aura</span>
                    <span className="text-amber-300 font-bold">+{currentStats.buffSpeedPct}%</span>
                  </div>
                )}
                {currentStats.buffDmgPct > 0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Damage Aura</span>
                    <span className="text-rose-300 font-bold">+{currentStats.buffDmgPct}%</span>
                  </div>
                )}
                {currentStats.goldPerTick > 0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Passive Income</span>
                    <span className="text-yellow-300 font-bold">+{currentStats.goldPerTick}🪙/tick</span>
                  </div>
                )}
                {currentStats.bountyMult > 1.0 && (
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800/90 flex justify-between">
                    <span className="text-slate-400 font-sans text-[10px]">Bounty Amp</span>
                    <span className="text-yellow-300 font-bold">{currentStats.bountyMult}x</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SKILLS & CASTING TRIGGERS */}
        {activeTab === 'skills' && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Arsenal Skills & Scaling
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Mana & CD Engine</span>
            </div>

            {((currentStats.skills && currentStats.skills.length > 0) || (towerTypeData.skills && towerTypeData.skills.length > 0)) ? (
              <div className="space-y-2">
                {(currentStats.skills || towerTypeData.skills || []).map((sk, idx) => (
                  <div key={sk.id || idx} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs">{sk.name || sk.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        sk.type === 'active'
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          : sk.type === 'aura'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-teal-950 text-teal-300 border border-teal-500/40'
                      }`}>
                        {sk.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono flex-wrap">
                      {sk.manaCost > 0 && <span>💧 {sk.manaCost} Mana</span>}
                      {sk.manaGain > 0 && <span>💧 +{sk.manaGain} Mana</span>}
                      {sk.cooldown > 0 && <span>⏱️ {sk.cooldown}s CD</span>}
                      {sk.trigger && <span className="text-slate-400 bg-slate-800/80 px-1 py-0.5 rounded">Trigger: {sk.trigger}</span>}
                      {sk.radius && <span>📡 {sk.radius} tiles</span>}
                    </div>

                    {sk.effects && sk.effects.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-300">
                        {sk.effects.map((eff, eIdx) => {
                          const scaled = resolveEffectValue(eff.value, eff.scaling, currentStats);
                          return (
                            <div key={eIdx} className="flex items-center justify-between">
                              <span className="capitalize text-slate-400">{eff.type} {eff.stat ? `(${eff.stat})` : ''}:</span>
                              <span className="font-mono text-teal-300 font-bold">
                                {scaled} {eff.damageType ? `[${eff.damageType}]` : ''} {eff.duration ? `(${eff.duration}s)` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-slate-500 text-xs italic bg-slate-900/60 rounded-lg">
                No active skills configured for this archetype.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENEMY MATCHUP TIME-TO-KILL (TTK) */}
        {activeTab === 'matchups' && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                Time-to-Kill (TTK) Benchmark
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Solo Tower DPS</span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              {/* Scout */}
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <div className="font-bold text-slate-200">Scout (Speedster)</div>
                    <div className="text-[10px] text-slate-400 font-sans">70 HP • 0 Armor</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-300">{Number.isFinite(ttkScout) ? `${ttkScout}s` : '∞'}</div>
                  <div className="text-[9px] text-slate-500 font-sans">TTK Duration</div>
                </div>
              </div>

              {/* Grunt */}
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div>
                    <div className="font-bold text-slate-200">Grunt (Vanguard)</div>
                    <div className="text-[10px] text-slate-400 font-sans">150 HP • 15 Armor / 15 Res</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-rose-300">{Number.isFinite(ttkGrunt) ? `${ttkGrunt}s` : '∞'}</div>
                  <div className="text-[9px] text-slate-500 font-sans">TTK Duration</div>
                </div>
              </div>

              {/* Tank */}
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <div>
                    <div className="font-bold text-slate-200">Tank (Colossus)</div>
                    <div className="text-[10px] text-slate-400 font-sans">450 HP • 40 Armor / 20 Res</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-300">{Number.isFinite(ttkTank) ? `${ttkTank}s` : '∞'}</div>
                  <div className="text-[9px] text-slate-500 font-sans">TTK Duration</div>
                </div>
              </div>

              {/* Boss */}
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <div>
                    <div className="font-bold text-slate-200">Apex Boss</div>
                    <div className="text-[10px] text-slate-400 font-sans">1200 HP • 50 Armor / 50 Res</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-purple-300">{Number.isFinite(ttkBoss) ? `${ttkBoss}s` : '∞'}</div>
                  <div className="text-[9px] text-slate-500 font-sans">TTK Duration</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3-Tier Upgrade Progression Matrix */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tier Progression Matrix
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            {towerTypeData.levels?.map((lvlData, i) => {
              const tierLvl = lvlData.level || (i + 1);
              const isCurrent = tierLvl === activeLevel;
              const lvlDps = (lvlData.damage * lvlData.attackSpeed).toFixed(1);

              return (
                <div
                  key={tierLvl}
                  onClick={() => !isPlaced && setSelectedInspectLevel(tierLvl)}
                  className={`p-2 rounded-lg border transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'bg-teal-950/70 border-teal-400 text-slate-100 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                      isCurrent ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      T{tierLvl}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200">{lvlData.cost}🪙</div>
                      <div className="text-[10px] text-slate-400">{lvlDps} DPS</div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-slate-300 space-y-0.5">
                    <div>{lvlData.damage} dmg • {lvlData.attackSpeed}/s</div>
                    <div className="text-slate-400">{lvlData.range} tiles range</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. Enemy / Hostile Dossier Inspection View
  if (inspectedItem?.type === 'enemy') {
    const enemyId = inspectedItem.enemyId || 'grunt';
    const enemyData = getEnemyStats(enemyId, enemyTypesData);

    const armorPct = Number(enemyData.armor ?? enemyData.defense ?? 0);
    const magicResPct = Number(enemyData.magicRes ?? enemyData.magicResist ?? 0);

    const physicalEHP = Math.round(enemyData.hp / Math.max(0.05, 1 - armorPct / 100));
    const magicEHP = Math.round(enemyData.hp / Math.max(0.05, 1 - magicResPct / 100));

    const enemyAttrs = enemyData.attributes || enemyData.baseStats || { STR: 10, INT: 10, AGI: 10, VIT: 10 };
    const enemySkills = enemyData.skills || [];

    return (
      <div className="space-y-3.5 text-xs select-none">
        {/* Top Header */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0"
                style={{ backgroundColor: enemyData.color || '#ef4444' }}
              >
                <Swords className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                  <span>{enemyData.name}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {enemyData.desc || 'Hostile Combatant'}
                </div>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-500/40">
              Hostile Dossier
            </span>
          </div>
        </div>

        {/* System Primary Attributes */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Primary Attributes</span>
            <span className="text-[10px] font-mono text-slate-500">RPG System</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 font-mono text-center">
            <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans font-bold">STR</div>
              <div className="text-xs font-black text-rose-400 mt-0.5">{enemyAttrs.STR ?? 10}</div>
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans font-bold">INT</div>
              <div className="text-xs font-black text-purple-400 mt-0.5">{enemyAttrs.INT ?? 10}</div>
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans font-bold">AGI</div>
              <div className="text-xs font-black text-amber-400 mt-0.5">{enemyAttrs.AGI ?? 10}</div>
            </div>
            <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans font-bold">VIT</div>
              <div className="text-xs font-black text-emerald-400 mt-0.5">{enemyAttrs.VIT ?? 10}</div>
            </div>
          </div>
        </div>

        {/* Combat Stats Grid */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Combat Derived Stats
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono">
            {/* HP */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-sans font-bold">Health Pool (HP)</div>
              <div className="text-sm font-black text-rose-400 mt-0.5">{enemyData.hp} HP</div>
              <div className="text-[9px] text-slate-500 font-sans">Base vitality</div>
            </div>

            {/* Move Speed */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-sans font-bold">Velocity</div>
              <div className="text-sm font-black text-amber-300 mt-0.5">{enemyData.moveSpeed} tiles/s</div>
              <div className="text-[9px] text-slate-500 font-sans">Labyrinth traverse speed</div>
            </div>

            {/* Physical Armor */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-sans font-bold">Physical Armor</div>
              <div className="text-sm font-black text-blue-300 mt-0.5">{armorPct}% Mitigated</div>
              <div className="text-[9px] text-slate-500 font-sans">Reduces Gatling / Mortar</div>
            </div>

            {/* Magic Resistance */}
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-sans font-bold">Magic Resistance</div>
              <div className="text-sm font-black text-purple-300 mt-0.5">{magicResPct}% Mitigated</div>
              <div className="text-[9px] text-slate-500 font-sans">Reduces Laser / Railgun</div>
            </div>
          </div>
        </div>

        {/* Hostile Skills & Triggers Card */}
        {enemySkills.length > 0 && (
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Hostile Skills & Triggers</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">{enemySkills.length} Active</span>
            </div>

            <div className="space-y-2">
              {enemySkills.map((sk) => {
                const triggerBadgeColor =
                  sk.trigger?.startsWith('on_hp_below') ? 'bg-rose-950 text-rose-300 border-rose-800/60' :
                  sk.trigger === 'on_hit' ? 'bg-amber-950 text-amber-300 border-amber-800/60' :
                  'bg-purple-950 text-purple-300 border-purple-800/60';

                return (
                  <div key={sk.id} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{sk.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${triggerBadgeColor}`}>
                        {sk.trigger}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <span>⏱️ {sk.cooldown}s CD</span>
                      {sk.duration > 0 && <span>⌛ {sk.duration}s Dur</span>}
                    </div>

                    {sk.effects && sk.effects.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[10px]">
                        {sk.effects.map((eff, eIdx) => (
                          <div key={eIdx} className="flex items-center justify-between">
                            <span className="capitalize text-slate-400">{eff.type} ({eff.stat}):</span>
                            <span className="font-mono text-teal-300 font-bold">
                              {eff.value > 0 ? `+${eff.value}` : eff.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Fallback / Default Info Card
  return (
    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2 text-xs">
      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400">
        <Info className="w-5 h-5" />
      </div>
      <div className="font-bold text-slate-300">Tactical Telemetry Inspector</div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Click any placed tower on the grid canvas or select an archetype in the palette to inspect its complete combat stats, damage pipeline, and mana engine.
      </p>
    </div>
  );
}
