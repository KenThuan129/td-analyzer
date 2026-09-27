import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Activity,
  TrendingUp,
  Shield,
  Coins,
  AlertTriangle,
  CheckCircle,
  Play,
  Square,
  Sparkles,
  Zap,
  BarChart3,
  RotateCcw,
  Flame,
  Award,
  Layers,
  Clock,
  Database,
  Swords,
  Timer,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { DAMAGE_TYPES, getTowerStats } from '../data/towers.js';
import { saveArchiveRun } from '../utils/archiveStore.js';

export default function PacingDashboard({
  waves,
  startingGold,
  allowedTowers,
  towers,
  setTowers,
  playerGold,
  setPlayerGold,
  isSimulating,
  simSpeed,
  setSimSpeed,
  currentWaveIndex,
  currentSquadIndex,
  pacingTelemetry = [],
  simStatus,
  simResults,
  onStartPlaytest,
  onStopPlaytest,
  onResetPlaytest,
  pathValidation,
  isBlocked,
  levelName = 'Playtest Sandbox Map',
  onOpenArchive
}) {
  // Active chart tab: 'tension' | 'economy' | 'categories' | 'curve'
  const [activeTab, setActiveTab] = useState('tension');
  const [savedRunNotice, setSavedRunNotice] = useState(false);

  // Live Timer for Playtest Execution
  const [liveSeconds, setLiveSeconds] = useState(0);
  useEffect(() => {
    let interval = null;
    if (isSimulating) {
      interval = setInterval(() => {
        setLiveSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating]);

  // Reset live timer when resetting playtest
  useEffect(() => {
    if (!isSimulating && (simResults?.timeElapsed === 0 || !simResults)) {
      setLiveSeconds(0);
    }
  }, [isSimulating, simResults]);

  // 1. Tower Investment Categorization (Kinetic, Energy, Support, Economy, Cryo)
  const categoryStats = useMemo(() => {
    let physical = { count: 0, spent: 0, dps: 0 };
    let magical = { count: 0, spent: 0, dps: 0 };
    let support = { count: 0, spent: 0, pylonBoost: 0 };
    let economy = { count: 0, spent: 0, bonusYield: 0 };
    let cryo = { count: 0, spent: 0, slowPct: 0 };

    let totalSpent = 0;
    let totalDPS = 0;

    towers.forEach(t => {
      const stats = t.stats || getTowerStats(t.typeId, t.level || 1);
      const cost = stats.cost || 100;
      totalSpent += cost;

      const dmg = Number(stats.damage || 0);
      const spd = Number(stats.attackSpeed || 1.0);
      const dps = dmg * spd;
      totalDPS += dps;

      if (t.typeId === 'laser' || t.typeId === 'shockwall' || stats.damageType === DAMAGE_TYPES.MAGICAL) {
        magical.count++;
        magical.spent += cost;
        magical.dps += dps;
      } else if (t.typeId === 'pylon' || t.typeId === 'bastion') {
        support.count++;
        support.spent += cost;
        if (t.typeId === 'pylon') support.pylonBoost += 25;
      } else if (t.typeId === 'harvester') {
        economy.count++;
        economy.spent += cost;
        economy.bonusYield += 40;
      } else if (t.typeId === 'cryo') {
        cryo.count++;
        cryo.spent += cost;
        cryo.slowPct += stats.slowPct || 40;
      } else {
        physical.count++;
        physical.spent += cost;
        physical.dps += dps;
      }
    });

    const calcPct = (spent) => totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

    return {
      totalSpent,
      totalDPS: Math.round(totalDPS),
      physical: { ...physical, percent: calcPct(physical.spent), dps: Math.round(physical.dps) },
      magical: { ...magical, percent: calcPct(magical.spent), dps: Math.round(magical.dps) },
      support: { ...support, percent: calcPct(support.spent) },
      economy: { ...economy, percent: calcPct(economy.spent) },
      cryo: { ...cryo, percent: calcPct(cryo.spent) }
    };
  }, [towers]);

  // 2. Economy Breakdown: Earned vs Cost Live Tracking
  const economyTracking = useMemo(() => {
    const goldEarned = simResults.goldEarned || 0;
    const goldSpent = categoryStats.totalSpent || 0;
    const currentPurse = playerGold;
    const goldVelocity = liveSeconds > 0 ? ((goldEarned / liveSeconds) * 60).toFixed(1) : '0.0';

    return {
      startingGold,
      goldEarned,
      goldSpent,
      currentPurse,
      netVelocity: `${goldVelocity} 🪙/min`
    };
  }, [simResults, categoryStats, playerGold, startingGold, liveSeconds]);

  // 3. Difficulty Curve & Monster Setup Analysis
  const difficultyCurveAnalysis = useMemo(() => {
    const currentWave = waves[currentWaveIndex] || waves[0];
    if (!currentWave) {
      return {
        expectedTTK: 6.5,
        actualTTK: 6.8,
        armorMitigationPct: 20,
        magicMitigationPct: 15,
        threatRating: 'Balanced'
      };
    }

    let totalHp = 0;
    let avgArmor = 0;
    let avgMagicRes = 0;
    let enemyCount = 0;

    currentWave.squads.forEach(sq => {
      const count = Number(sq.count || 0);
      enemyCount += count;
      totalHp += count * Number(sq.hp || 100);
      avgArmor += count * Number(sq.armor || 15);
      avgMagicRes += count * Number(sq.magicRes || 15);
    });

    const armorPct = enemyCount > 0 ? Math.round(avgArmor / enemyCount) : 15;
    const magicPct = enemyCount > 0 ? Math.round(avgMagicRes / enemyCount) : 15;
    const expectedTTK = categoryStats.totalDPS > 0 ? Math.min(15, (totalHp / Math.max(1, categoryStats.totalDPS)).toFixed(1)) : '10.0+';
    const actualTTK = categoryStats.totalDPS > 0 ? (Number(expectedTTK) * (1 + (armorPct + magicPct) / 200)).toFixed(1) : '12.0+';

    const threatRating =
      Number(actualTTK) > 10 ? 'High Threat Spike (High Leak Risk)' :
      Number(actualTTK) < 4 ? 'Low Pressure (Towers Overpowered)' :
      'Well Balanced (Optimal Tension)';

    return {
      totalHp,
      enemyCount,
      expectedTTK,
      actualTTK,
      armorMitigationPct: armorPct,
      magicMitigationPct: magicPct,
      threatRating
    };
  }, [waves, currentWaveIndex, categoryStats]);

  // 4. Chart Data Generation (Live Telemetry or Projected)
  const chartData = useMemo(() => {
    if (pacingTelemetry && pacingTelemetry.length > 3) {
      return pacingTelemetry.map((pt, idx) => ({
        name: `${idx * 2}s`,
        threatEHP: pt.threatEHP || 0,
        defenseDPS: pt.defenseDPS || categoryStats.totalDPS,
        tensionIndex: Math.min(100, Math.round(((pt.threatEHP || 10) / Math.max(1, pt.defenseDPS || 40)) * 50)),
        goldPool: pt.goldPool || (startingGold + (pt.threatEHP * 2)),
        investedGold: categoryStats.totalSpent
      }));
    }

    // Default 5-point live/projected curve
    return [0, 1, 2, 3, 4].map(step => ({
      name: `${step * 10}s`,
      threatEHP: Math.round((difficultyCurveAnalysis.totalHp || 500) / (step + 1) / 10),
      defenseDPS: categoryStats.totalDPS || 60,
      tensionIndex: Math.min(100, Math.round(35 + step * 8)),
      goldPool: startingGold + step * 40,
      investedGold: categoryStats.totalSpent
    }));
  }, [pacingTelemetry, categoryStats, startingGold, difficultyCurveAnalysis]);

  // Save Playtest Diagnostics to Data Archive
  const handleSaveToArchive = () => {
    const runRecord = {
      levelName: `${levelName} (Playtest Wave ${currentWaveIndex + 1})`,
      sessionType: 'playtest_sandbox',
      status: simStatus || (isSimulating ? 'in_progress' : 'evaluated'),
      totalTimeSeconds: liveSeconds || 45,
      setupTimeSeconds: 0,
      battleTimeSeconds: liveSeconds || 45,
      phasesCompleted: currentWaveIndex + 1,
      totalPhases: waves.length,
      startingGold,
      goldEarned: economyTracking.goldEarned,
      goldSpent: economyTracking.goldSpent,
      netEndGold: playerGold,
      shieldsRemaining: 3,
      maxShields: 3,
      leaks: simResults.leaked || 0,
      enemiesSpawned: simResults.spawned || difficultyCurveAnalysis.enemyCount,
      enemiesDefeated: simResults.killed || 0,
      towersPlacedCount: towers.length,
      categoryBreakdown: {
        physical: categoryStats.physical,
        magical: categoryStats.magical,
        support: categoryStats.support,
        economy: categoryStats.economy,
        cryo: categoryStats.cryo
      },
      buffDebuffMetrics: {
        pylonDpsBoostPct: categoryStats.support.pylonBoost,
        cryoSlowTimeSeconds: Math.round(categoryStats.cryo.slowPct * 0.8),
        harvesterBonusGold: categoryStats.economy.bonusYield,
        shieldsAbsorbed: simResults.leaksAbsorbed || 0
      },
      difficultyCurveImpact: {
        expectedTTK: Number(difficultyCurveAnalysis.expectedTTK),
        actualTTK: Number(difficultyCurveAnalysis.actualTTK),
        armorMitigationPct: difficultyCurveAnalysis.armorMitigationPct,
        magicMitigationPct: difficultyCurveAnalysis.magicMitigationPct,
        difficultyRating: difficultyCurveAnalysis.threatRating
      },
      designerNotes: `Playtest diagnostics captured at Wave ${currentWaveIndex + 1}. DPS: ${categoryStats.totalDPS}, Net Gold velocity: ${economyTracking.netVelocity}.`
    };

    saveArchiveRun(runRecord);
    setSavedRunNotice(true);
    setTimeout(() => setSavedRunNotice(false), 3000);
  };

  return (
    <div className="space-y-3.5 text-slate-100 select-none">
      {/* 1. Controller Bar with Live Time Tracking */}
      <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>Step 4: Live Data & Pacing Diagnostics</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Wave {currentWaveIndex + 1} of {waves.length} • {waves[currentWaveIndex]?.name || 'Standard Wave'}
              </div>
            </div>
          </div>

          {/* Live Timer Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg font-mono text-xs text-teal-300">
            <Timer className="w-3.5 h-3.5 text-teal-400" />
            <span>{Math.floor(liveSeconds / 60)}:{(liveSeconds % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Start / Stop / Speed buttons */}
        <div className="flex gap-2">
          {isSimulating ? (
            <button
              id="btn-stop-playtest"
              onClick={onStopPlaytest}
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Pause / Stop Wave</span>
            </button>
          ) : (
            <button
              id="btn-start-playtest"
              onClick={onStartPlaytest}
              disabled={isBlocked}
              className={`flex-1 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isBlocked
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{currentWaveIndex > 0 ? `Resume Wave ${currentWaveIndex + 1}` : 'Start Playtest Simulation'}</span>
            </button>
          )}

          <button
            id="btn-reset-playtest"
            onClick={onResetPlaytest}
            className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Reset Playtest State & Economy"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Speed Selection */}
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5">
            {[1, 2, 3].map(spd => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  simSpeed === spd
                    ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Live Economy Mini Tracker */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans font-bold">Player Purse</div>
            <div className="text-amber-400 font-bold">{playerGold} 🪙</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans font-bold">Gold Spent</div>
            <div className="text-purple-300 font-bold">{economyTracking.goldSpent} 🪙</div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans font-bold">Net Velocity</div>
            <div className="text-emerald-400 font-bold">{economyTracking.netVelocity}</div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs for Step 4 Diagnostic Systems */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] shadow-inner gap-1">
        <button
          onClick={() => setActiveTab('tension')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'tension' ? 'bg-slate-800 text-teal-300 shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tension & Pacing
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'categories' ? 'bg-slate-800 text-purple-300 shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tower Categories
        </button>
        <button
          onClick={() => setActiveTab('curve')}
          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'curve' ? 'bg-slate-800 text-rose-300 shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Difficulty vs Play
        </button>
      </div>

      {/* TAB 1: Pacing & Tension Dynamics Chart */}
      {activeTab === 'tension' && (
        <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Pacing & Tension Dynamics (Live Time)
              </span>
            </div>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/40">
              Live Threat vs DPS
            </span>
          </div>

          <div className="h-44 w-full bg-slate-900/60 rounded-xl p-2 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="dpsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="threatEHP" name="Enemy Threat (EHP/s)" stroke="#ef4444" fillOpacity={1} fill="url(#threatGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="defenseDPS" name="Player Defense DPS" stroke="#2dd4bf" fillOpacity={1} fill="url(#dpsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Total Firepower Online:</span>
            <span className="font-mono font-bold text-teal-300">{categoryStats.totalDPS} DPS</span>
          </div>
        </div>
      )}

      {/* TAB 2: Towers Spent in Each Category */}
      {activeTab === 'categories' && (
        <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Tower Investment by Category
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300">
              {categoryStats.totalSpent} 🪙 Invested
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Kinetic / Physical */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400">Kinetic / Physical</span>
                <span className="font-mono text-slate-300">{categoryStats.physical.spent} 🪙 ({categoryStats.physical.percent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${categoryStats.physical.percent}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{categoryStats.physical.count} towers (Gatling/Sniper/Mortar)</span>
                <span className="font-mono">{categoryStats.physical.dps} DPS</span>
              </div>
            </div>

            {/* Energy / Magic */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400">Energy / Magic</span>
                <span className="font-mono text-slate-300">{categoryStats.magical.spent} 🪙 ({categoryStats.magical.percent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all" style={{ width: `${categoryStats.magical.percent}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{categoryStats.magical.count} towers (Laser/Shockwall)</span>
                <span className="font-mono">{categoryStats.magical.dps} DPS</span>
              </div>
            </div>

            {/* Support / Amplifiers */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-400">Support / Amplifiers</span>
                <span className="font-mono text-slate-300">{categoryStats.support.spent} 🪙 ({categoryStats.support.percent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${categoryStats.support.percent}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">
                {categoryStats.support.count} towers (Pylon Speed Aura: +{categoryStats.support.pylonBoost}% / Bastion Shields)
              </div>
            </div>

            {/* Economy / Harvester */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-400">Economy / Harvester</span>
                <span className="font-mono text-slate-300">{categoryStats.economy.spent} 🪙 ({categoryStats.economy.percent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${categoryStats.economy.percent}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">
                {categoryStats.economy.count} Harvester Drills (Mining Yield: +{categoryStats.economy.bonusYield} 🪙/wave)
              </div>
            </div>

            {/* Crowd Control / Cryo */}
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-300">Crowd Control / Cryo</span>
                <span className="font-mono text-slate-300">{categoryStats.cryo.spent} 🪙 ({categoryStats.cryo.percent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 transition-all" style={{ width: `${categoryStats.cryo.percent}%` }} />
              </div>
              <div className="text-[10px] text-slate-400">
                {categoryStats.cryo.count} Cryo Cores (Frost Slow Area: {categoryStats.cryo.slowPct}% reduction)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Expectation Design VS Realistic Play & Buffs/Debuffs */}
      {activeTab === 'curve' && (
        <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Design Expectation vs Realistic Play
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-300">
              Impact Analysis
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-slate-400 font-sans">Difficulty Surge Verdict:</span>
              <span className="text-teal-300 font-bold">{difficultyCurveAnalysis.threatRating}</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-slate-400 font-sans">Observed TTK vs Expected:</span>
              <span className="text-slate-200">{difficultyCurveAnalysis.actualTTK}s <span className="text-slate-500">(Target: {difficultyCurveAnalysis.expectedTTK}s)</span></span>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-slate-400 font-sans">Armor Damage Mitigation:</span>
              <span className="text-amber-300 font-bold">-{difficultyCurveAnalysis.armorMitigationPct}% Physical Dmg</span>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-slate-400 font-sans">Magic Resistance Mitigation:</span>
              <span className="text-cyan-300 font-bold">-{difficultyCurveAnalysis.magicMitigationPct}% Energy Dmg</span>
            </div>
          </div>

          {/* Buff / Debuff Multipliers */}
          <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-300 uppercase text-[10px]">
              Active Synergy Multipliers:
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Pylon Overclock Multiplier:</span>
              <span className="text-purple-300 font-bold">+{categoryStats.support.pylonBoost}% Atk Spd</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Cryo Frost Window Extension:</span>
              <span className="text-blue-300 font-bold">+{categoryStats.cryo.slowPct}% Path Delay</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Harvester Passive Yield:</span>
              <span className="text-emerald-400 font-bold">+{categoryStats.economy.bonusYield} 🪙 / wave</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Save to Data Archive Action */}
      <div className="pt-1">
        <button
          onClick={handleSaveToArchive}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold rounded-xl border border-teal-500/30 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Save Playtest Diagnostics to Data Archive</span>
        </button>

        {savedRunNotice && (
          <div className="mt-1.5 text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Diagnostics logged to Data Archive!</span>
          </div>
        )}
      </div>
    </div>
  );
}
