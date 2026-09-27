import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Wrench,
  Shield,
  Zap,
  Target,
  Crosshair,
  Bomb,
  Radio,
  Snowflake,
  Coins,
  ShieldAlert,
  Play,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  BarChart3,
  Flame,
  Activity,
  Award,
  Swords,
  ChevronRight,
  Info,
  Heart,
  Gauge,
  Dna,
  Eye,
  Cpu,
  BookOpen,
  Layers,
  ArrowUpRight,
  Search,
  Copy,
  Sparkle,
  Filter
} from 'lucide-react';
import { DAMAGE_TYPES, TOWER_CATEGORIES } from '../data/towers.js';
import { computeDerivedStats, computeDPS, computeTTK } from '../utils/combat.js';
import { manaRegenRate } from '../utils/mana.js';
import { TRIGGER_TYPES, EFFECT_TYPES } from '../utils/skills.js';

export default function AssetStudio({
  towersData,
  setTowersData,
  enemyTypesData,
  setEnemyTypesData,
  onSwitchToPlaytest
}) {
  const [activeTab, setActiveTab] = useState('towers'); // 'towers' | 'enemies' | 'demo'
  const [selectedTowerId, setSelectedTowerId] = useState(towersData[0]?.id || 'laser');
  const [selectedEnemyId, setSelectedEnemyId] = useState(enemyTypesData[0]?.id || 'grunt');
  const [activeTierPreview, setActiveTierPreview] = useState(1); // 1 | 2 | 3

  // Sidebar Filter & Search States
  const [towerCategoryFilter, setTowerCategoryFilter] = useState('all'); // 'all' | 'offense' | 'defense' | 'utility'
  const [towerSearchQuery, setTowerSearchQuery] = useState('');
  const [enemySearchQuery, setEnemySearchQuery] = useState('');

  // Demo Arena State
  const [demoTowerId, setDemoTowerId] = useState(towersData[0]?.id || 'laser');
  const [demoTowerLevel, setDemoTowerLevel] = useState(1);
  const [demoEnemyId, setDemoEnemyId] = useState(enemyTypesData[0]?.id || 'grunt');
  const [demoIsRunning, setDemoIsRunning] = useState(false);
  const [demoLogs, setDemoLogs] = useState([]);

  const demoCanvasRef = useRef(null);
  const demoEnemyPosRef = useRef({ x: 40, hp: 150, maxHp: 150, slowFactor: 1.0 });
  const demoLastShotRef = useRef(0);
  const demoActiveLaserRef = useRef(null);
  const demoAnimRef = useRef(null);

  const selectedTower = towersData.find(t => t.id === selectedTowerId) || towersData[0];
  const selectedEnemy = enemyTypesData.find(e => e.id === selectedEnemyId) || enemyTypesData[0];

  // ================= TOWER ACTIONS =================
  // Create a Custom Tower
  const handleAddCustomTower = () => {
    const newId = `custom_tower_${Date.now()}`;
    const customCount = towersData.filter(t => t.id.startsWith('custom_') || t.isCustom).length + 1;
    const newTower = {
      id: newId,
      name: `Custom Turret ${customCount}`,
      isCustom: true,
      category: TOWER_CATEGORIES.OFFENSE,
      damageType: DAMAGE_TYPES.MAGICAL,
      tagline: 'Custom prototype tactical platform',
      description: 'Custom engineered turret with calibrated base attributes, upgrade matrix, and combat skills.',
      icon: 'Target',
      color: '#06b6d4',
      baseStats: {
        STR: 12,
        INT: 16,
        AGI: 12,
        VIT: 10,
        baseDamage: 28,
        baseAttackSpeed: 1.3,
        baseRange: 4.0,
        baseHp: 150,
        baseDef: 8,
        baseMres: 18,
        baseMana: 110
      },
      skills: [
        {
          id: `skill_${Date.now()}`,
          name: 'Overcharge Pulse',
          type: 'active',
          trigger: TRIGGER_TYPES.ON_HIT,
          cooldown: 4.0,
          manaCost: 15,
          manaGain: 0,
          radius: 4.0,
          duration: 2.0,
          effects: [
            { type: 'damage', value: 20, scaling: { int: 2.0 }, damageType: 'magical' }
          ]
        }
      ],
      levels: [
        { level: 1, damage: 32, attackSpeed: 1.3, range: 4.0, cost: 120 },
        { level: 2, damage: 65, attackSpeed: 1.6, range: 4.8, cost: 260 },
        { level: 3, damage: 120, attackSpeed: 2.0, range: 5.5, cost: 520 }
      ]
    };
    setTowersData(prev => [...prev, newTower]);
    setSelectedTowerId(newId);
  };

  // Duplicate Existing Tower
  const handleDuplicateTower = (sourceTower) => {
    if (!sourceTower) return;
    const newId = `custom_tower_${Date.now()}`;
    const duplicate = JSON.parse(JSON.stringify(sourceTower));
    duplicate.id = newId;
    duplicate.name = `${sourceTower.name} (Copy)`;
    duplicate.isCustom = true;
    setTowersData(prev => [...prev, duplicate]);
    setSelectedTowerId(newId);
  };

  // Remove Tower
  const handleRemoveTower = (id) => {
    if (towersData.length <= 1) return;
    setTowersData(prev => prev.filter(t => t.id !== id));
    const remaining = towersData.filter(t => t.id !== id);
    if (remaining.length > 0) {
      setSelectedTowerId(remaining[0].id);
    }
  };

  // Update Tower Stats for a specific level tier
  const handleUpdateTowerLevelStat = (tierIndex, field, value) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const newLevels = t.levels.map((lvl, idx) => {
          if (idx !== tierIndex) return lvl;
          return { ...lvl, [field]: Number(value) };
        });
        return { ...t, levels: newLevels };
      });
    });
  };

  // Update Tower General Meta
  const handleUpdateTowerMeta = (field, value) => {
    setTowersData(prev => {
      return prev.map(t => t.id === selectedTowerId ? { ...t, [field]: value } : t);
    });
  };

  // Update Tower Base Stat / Primary Attribute
  const handleUpdateTowerBaseStat = (field, value) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const baseStats = { ...(t.baseStats || {}) };
        baseStats[field] = Number(value);
        return { ...t, baseStats };
      });
    });
  };

  // Update Skill Property
  const handleUpdateTowerSkill = (skillIndex, field, value) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const skills = [...(t.skills || [])];
        if (!skills[skillIndex]) return t;
        skills[skillIndex] = {
          ...skills[skillIndex],
          [field]: typeof skills[skillIndex][field] === 'number' ? Number(value) : value
        };
        return { ...t, skills };
      });
    });
  };

  // Add Skill
  const handleAddSkill = () => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const newSkill = {
          id: `skill_${Date.now()}`,
          name: 'New Core Skill',
          type: 'active',
          trigger: TRIGGER_TYPES.ON_HIT,
          cooldown: 4.0,
          manaCost: 15,
          manaGain: 0,
          radius: 3.5,
          duration: 2.0,
          effects: [
            { type: 'damage', value: 20, scaling: { int: 2.0 } }
          ]
        };
        return { ...t, skills: [...(t.skills || []), newSkill] };
      });
    });
  };

  // Remove Skill
  const handleRemoveSkill = (skillIndex) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const skills = (t.skills || []).filter((_, idx) => idx !== skillIndex);
        return { ...t, skills };
      });
    });
  };

  // Add Effect to Skill
  const handleAddSkillEffect = (skillIndex) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const skills = [...(t.skills || [])];
        if (!skills[skillIndex]) return t;
        const effects = [...(skills[skillIndex].effects || []), { type: 'damage', value: 15, scaling: { int: 1.5 } }];
        skills[skillIndex] = { ...skills[skillIndex], effects };
        return { ...t, skills };
      });
    });
  };

  // Remove Effect from Skill
  const handleRemoveSkillEffect = (skillIndex, effectIndex) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const skills = [...(t.skills || [])];
        if (!skills[skillIndex]) return t;
        const effects = (skills[skillIndex].effects || []).filter((_, idx) => idx !== effectIndex);
        skills[skillIndex] = { ...skills[skillIndex], effects };
        return { ...t, skills };
      });
    });
  };

  // Update Effect
  const handleUpdateSkillEffect = (skillIndex, effectIndex, field, value) => {
    setTowersData(prev => {
      return prev.map(t => {
        if (t.id !== selectedTowerId) return t;
        const skills = [...(t.skills || [])];
        if (!skills[skillIndex]) return t;
        const effects = [...(skills[skillIndex].effects || [])];
        if (!effects[effectIndex]) return t;
        effects[effectIndex] = {
          ...effects[effectIndex],
          [field]: typeof effects[effectIndex][field] === 'number' ? Number(value) : value
        };
        skills[skillIndex] = { ...skills[skillIndex], effects };
        return { ...t, skills };
      });
    });
  };

  // ================= ENEMY ACTIONS =================
  // Update Enemy General Meta & Base Stats
  const handleUpdateEnemyStat = (field, value) => {
    setEnemyTypesData(prev => {
      return prev.map(e => e.id === selectedEnemyId ? { ...e, [field]: typeof e[field] === 'number' ? Number(value) : value } : e);
    });
  };

  // Add a Custom Enemy Type
  const handleAddCustomEnemy = () => {
    const newId = `custom_enemy_${Date.now()}`;
    const customCount = enemyTypesData.filter(e => e.id.startsWith('custom_') || e.isCustom).length + 1;
    const newEnemy = {
      id: newId,
      name: `Mutated Chimera ${customCount}`,
      desc: 'High-resilience hybrid beast engineered for advanced wave pressure.',
      isCustom: true,
      hp: 380,
      armor: 25,
      magicRes: 25,
      moveSpeed: 2.2,
      bounty: 35,
      color: '#06b6d4'
    };
    setEnemyTypesData(prev => [...prev, newEnemy]);
    setSelectedEnemyId(newId);
  };

  const handleRemoveEnemy = (id) => {
    if (enemyTypesData.length <= 1) return;
    setEnemyTypesData(prev => prev.filter(e => e.id !== id));
    const remaining = enemyTypesData.filter(e => e.id !== id);
    if (remaining.length > 0) {
      setSelectedEnemyId(remaining[0].id);
    }
  };

  // Derived calculations for the selected tower at active tier
  const activeTierStats = useMemo(() => {
    if (!selectedTower) return null;
    const baseAttrs = selectedTower.baseStats || { STR: 10, INT: 10, AGI: 10, VIT: 10 };
    const tierData = selectedTower.levels?.[activeTierPreview - 1] || selectedTower.levels?.[0] || {};
    const derived = computeDerivedStats(baseAttrs, {
      ...tierData,
      damageType: selectedTower.damageType
    });
    const dps = computeDPS(derived, selectedTower.damageType);
    const ttkGrunt = computeTTK(derived, 0, { hp: 150, armor: 15, magicRes: 15 }, selectedTower.damageType);
    const ttkArmored = computeTTK(derived, 0, { hp: 450, armor: 40, magicRes: 10 }, selectedTower.damageType);
    const ttkMystic = computeTTK(derived, 0, { hp: 500, armor: 10, magicRes: 45 }, selectedTower.damageType);

    return {
      ...derived,
      tierCost: tierData.cost || 100,
      dps,
      ttkGrunt,
      ttkArmored,
      ttkMystic
    };
  }, [selectedTower, activeTierPreview]);

  // Filtered lists for sidebars
  const filteredTowers = useMemo(() => {
    return towersData.filter(t => {
      const matchCat = towerCategoryFilter === 'all' || t.category === towerCategoryFilter;
      const matchSearch = !towerSearchQuery.trim() ||
        t.name.toLowerCase().includes(towerSearchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(towerSearchQuery.toLowerCase()) ||
        t.damageType.toLowerCase().includes(towerSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [towersData, towerCategoryFilter, towerSearchQuery]);

  const filteredEnemies = useMemo(() => {
    return enemyTypesData.filter(e => {
      return !enemySearchQuery.trim() ||
        e.name.toLowerCase().includes(enemySearchQuery.toLowerCase()) ||
        (e.desc && e.desc.toLowerCase().includes(enemySearchQuery.toLowerCase()));
    });
  }, [enemyTypesData, enemySearchQuery]);

  // 1v1 Benchmark Arena Loop
  useEffect(() => {
    if (!demoIsRunning) {
      if (demoAnimRef.current) cancelAnimationFrame(demoAnimRef.current);
      return;
    }

    const canvas = demoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const eArchetype = enemyTypesData.find(e => e.id === demoEnemyId) || enemyTypesData[0];
    const tArchetype = towersData.find(t => t.id === demoTowerId) || towersData[0];
    const tStats = tArchetype.levels[demoTowerLevel - 1] || tArchetype.levels[0];

    demoEnemyPosRef.current = {
      x: 30,
      y: 75,
      hp: eArchetype.hp,
      maxHp: eArchetype.hp,
      armor: eArchetype.armor,
      magicRes: eArchetype.magicRes,
      speed: eArchetype.moveSpeed,
      slowFactor: 1.0,
      distanceTraveled: 0
    };
    demoLastShotRef.current = performance.now();
    demoActiveLaserRef.current = null;

    let startTime = performance.now();
    let totalDmgDone = 0;
    let shotsFired = 0;

    const loop = (timestamp) => {
      const dt = 0.016; // 60fps fixed step
      const enemy = demoEnemyPosRef.current;

      // Clear Canvas
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Track Lane
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(20, 65, canvas.width - 40, 20);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(20, 65, canvas.width - 40, 20);

      // Spawn & Goal markers
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(30, 75, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(canvas.width - 30, 75, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw Tower in Center
      const twX = canvas.width / 2;
      const twY = 32;
      const rangePx = (tStats.range || 3.5) * 28;

      // Range
      ctx.strokeStyle = `${tArchetype.color || '#a855f7'}40`;
      ctx.fillStyle = `${tArchetype.color || '#a855f7'}10`;
      ctx.beginPath();
      ctx.arc(twX, twY, rangePx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tower body
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(twX, twY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tArchetype.color || '#a855f7';
      ctx.beginPath();
      ctx.arc(twX, twY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Enemy Movement
      if (enemy.hp > 0 && enemy.x < canvas.width - 30) {
        enemy.x += (enemy.speed * 28 * enemy.slowFactor) * dt;

        // Tower combat range check
        const dist = Math.hypot(enemy.x - twX, 75 - twY);
        if (dist <= rangePx) {
          // Slow effect
          if (tStats.slowPct > 0) {
            enemy.slowFactor = Math.max(0.2, 1 - tStats.slowPct / 100);
          }

          // Attack interval
          const atkSpd = Math.max(0.1, tStats.attackSpeed || 1.0);
          const intervalMs = (1 / atkSpd) * 1000;

          if (timestamp - demoLastShotRef.current >= intervalMs) {
            demoLastShotRef.current = timestamp;
            shotsFired++;

            // Damage mitigation calculation
            const rawDmg = tStats.damage || 0;
            let mitigation = 0;
            if (tArchetype.damageType === DAMAGE_TYPES.PHYSICAL) {
              mitigation = (enemy.armor || 0) / 100;
            } else if (tArchetype.damageType === DAMAGE_TYPES.MAGICAL) {
              mitigation = (enemy.magicRes || 0) / 100;
            }

            const finalDmg = Math.max(1, Math.round(rawDmg * (1 - mitigation)));
            enemy.hp -= finalDmg;
            totalDmgDone += finalDmg;

            demoActiveLaserRef.current = {
              ex: enemy.x,
              ey: 75,
              opacity: 1.0
            };
          }
        }
      }

      // Draw Laser Beam
      if (demoActiveLaserRef.current && demoActiveLaserRef.current.opacity > 0) {
        ctx.strokeStyle = tArchetype.color || '#a855f7';
        ctx.lineWidth = 3;
        ctx.globalAlpha = demoActiveLaserRef.current.opacity;
        ctx.beginPath();
        ctx.moveTo(twX, twY);
        ctx.lineTo(demoActiveLaserRef.current.ex, demoActiveLaserRef.current.ey);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        demoActiveLaserRef.current.opacity -= dt * 4;
      }

      // Draw Enemy
      if (enemy.hp > 0 && enemy.x < canvas.width - 30) {
        ctx.fillStyle = eArchetype.color || '#ef4444';
        ctx.beginPath();
        ctx.arc(enemy.x, 75, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Enemy HP Bar
        const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(enemy.x - 14, 54, 28, 4);
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(enemy.x - 14, 54, 28 * hpPct, 4);
      }

      // Benchmark conclusion check
      if (enemy.hp <= 0 || enemy.x >= canvas.width - 30) {
        const timeTaken = ((timestamp - startTime) / 1000).toFixed(2);
        const result = enemy.hp <= 0 ? 'ELIMINATED' : 'BREACHED';

        setDemoLogs(prev => [
          {
            id: Date.now(),
            tower: `${tArchetype.name} (T${demoTowerLevel})`,
            enemy: eArchetype.name,
            result,
            timeTaken,
            totalDmg: totalDmgDone,
            shotsFired
          },
          ...prev.slice(0, 5)
        ]);

        setDemoIsRunning(false);
        return;
      }

      demoAnimRef.current = requestAnimationFrame(loop);
    };

    demoAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (demoAnimRef.current) cancelAnimationFrame(demoAnimRef.current);
    };
  }, [demoIsRunning, demoTowerId, demoTowerLevel, demoEnemyId, enemyTypesData, towersData]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* 1. Asset Studio Header */}
      <header className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/50 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-purple-300">
                Asset Balance Studio
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 font-mono">
                Master Database
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Calibrate master tower attributes, upgrade tiers & bestiary stats
            </div>
          </div>
        </div>

        {/* Tab Controls & Switch to Playtest */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              id="tab-btn-towers"
              onClick={() => setActiveTab('towers')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'towers'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tower Armory
            </button>
            <button
              id="tab-btn-enemies"
              onClick={() => setActiveTab('enemies')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'enemies'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enemy Bestiary
            </button>
            <button
              id="tab-btn-demo"
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'demo'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>1v1 Arena</span>
            </button>
          </div>

          <button
            id="back-to-sandbox-btn"
            onClick={onSwitchToPlaytest}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <span>Back to Level Sandbox</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Studio Body */}
      <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col">
        {/* ==================== TAB 1: TOWER ARMORY (LEFT SIDEBAR + RIGHT DASHBOARD) ==================== */}
        {activeTab === 'towers' && (
          <div className="flex-1 flex flex-col md:flex-row gap-4 h-full overflow-hidden w-full max-w-[1700px] mx-auto">
            {/* LEFT SIDEBAR: Tower Arsenal Directory */}
            <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex-shrink-0 h-full overflow-hidden">
              {/* Top Controls & Create Button */}
              <div className="space-y-3 pb-3 border-b border-slate-800/80 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-300">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span>Tower Arsenal</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40">
                      {towersData.length}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">Master DB</span>
                </div>

                {/* Prominent Create Custom Tower Button */}
                <button
                  id="create-custom-tower-btn"
                  onClick={handleAddCustomTower}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all cursor-pointer active:scale-[0.98] border border-purple-400/40"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Custom Tower</span>
                </button>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="tower-search-input"
                    type="text"
                    placeholder="Search by name, role or damage..."
                    value={towerSearchQuery}
                    onChange={(e) => setTowerSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  {towerSearchQuery && (
                    <button
                      onClick={() => setTowerSearchQuery('')}
                      className="text-slate-500 hover:text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  {['all', 'offense', 'defense', 'utility'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTowerCategoryFilter(cat)}
                      className={`flex-1 py-1 rounded text-center capitalize font-bold transition-all cursor-pointer ${
                        towerCategoryFilter === cat
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Tower List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pt-2 pr-1">
                {filteredTowers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                    <p>No towers matching filter criteria.</p>
                    <button
                      onClick={() => { setTowerCategoryFilter('all'); setTowerSearchQuery(''); }}
                      className="text-purple-400 text-[11px] underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filteredTowers.map(t => {
                    const isSel = t.id === selectedTowerId;
                    const tier1Cost = t.levels?.[0]?.cost || 100;
                    return (
                      <div
                        key={t.id}
                        id={`tower-sidebar-item-${t.id}`}
                        onClick={() => setSelectedTowerId(t.id)}
                        className={`group relative p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-purple-950/70 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)] text-white ring-1 ring-purple-500/50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/90'
                        }`}
                      >
                        {/* Active Accent Stripe */}
                        {isSel && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-purple-400 rounded-r"></div>
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: t.color || '#a855f7', color: t.color || '#a855f7' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black truncate">{t.name}</span>
                              {t.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-mono font-bold flex items-center gap-1">
                              <span>{t.category}</span>
                              <span>•</span>
                              <span className={t.damageType === 'magical' ? 'text-purple-300' : t.damageType === 'physical' ? 'text-amber-300' : 'text-cyan-300'}>
                                {t.damageType}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Cost / Actions Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-mono text-[11px] text-amber-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            🪙 {tier1Cost}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer Stats */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-shrink-0">
                <span>Total Units: {towersData.length}</span>
                <span className="text-purple-400 font-bold">
                  {towersData.filter(t => t.category === 'offense').length} Offense / {towersData.filter(t => t.category === 'defense').length} Def / {towersData.filter(t => t.category === 'utility').length} Util
                </span>
              </div>
            </aside>

            {/* RIGHT PANEL: Deep Information Dashboard */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6 shadow-xl h-full">
              {selectedTower ? (
                <>
                  {/* 1. Header Hero Card & Meta Tuning */}
                  <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-md">
                    <div className="flex items-start justify-between flex-wrap gap-4 pb-3 border-b border-slate-800">
                      <div className="space-y-2 flex-1 min-w-[300px]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <input
                            id="tower-name-input"
                            type="text"
                            value={selectedTower.name}
                            onChange={(e) => handleUpdateTowerMeta('name', e.target.value)}
                            className="text-lg font-black bg-slate-900 border border-purple-500/40 rounded-xl px-3 py-1 text-slate-100 focus:border-purple-400 focus:outline-none shadow-inner"
                          />
                          <select
                            id="tower-category-select"
                            value={selectedTower.category}
                            onChange={(e) => handleUpdateTowerMeta('category', e.target.value)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 border border-slate-700 text-purple-300 uppercase focus:outline-none"
                          >
                            <option value={TOWER_CATEGORIES.OFFENSE}>OFFENSE</option>
                            <option value={TOWER_CATEGORIES.DEFENSE}>DEFENSE</option>
                            <option value={TOWER_CATEGORIES.UTILITY}>UTILITY</option>
                          </select>
                          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Color:</span>
                            <input
                              type="color"
                              value={selectedTower.color || '#a855f7'}
                              onChange={(e) => handleUpdateTowerMeta('color', e.target.value)}
                              className="w-6 h-6 rounded-lg border-0 bg-transparent cursor-pointer"
                              title="Tower Accent Color"
                            />
                          </div>
                        </div>

                        <input
                          id="tower-description-input"
                          type="text"
                          placeholder="Tower combat description or tactical purpose..."
                          value={selectedTower.description}
                          onChange={(e) => handleUpdateTowerMeta('description', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      {/* Right Meta Controls & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1 text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">DAMAGE ARCHETYPE</span>
                          <select
                            id="tower-damage-type-select"
                            value={selectedTower.damageType}
                            onChange={(e) => handleUpdateTowerMeta('damageType', e.target.value)}
                            className="bg-slate-950 border border-purple-500/40 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-200 focus:outline-none shadow-inner"
                          >
                            <option value={DAMAGE_TYPES.MAGICAL}>Magical (Pierces Armor)</option>
                            <option value={DAMAGE_TYPES.PHYSICAL}>Physical (Reduced by Armor)</option>
                            <option value={DAMAGE_TYPES.DEFENSE}>Defense (Shielding Barrier)</option>
                            <option value={DAMAGE_TYPES.UTILITY}>Utility (Economy/Support)</option>
                          </select>
                        </div>

                        {/* Duplicate & Delete Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            id="duplicate-tower-btn"
                            onClick={() => handleDuplicateTower(selectedTower)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Duplicate this tower configuration"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </button>

                          {towersData.length > 1 && (
                            <button
                              id="delete-tower-btn"
                              onClick={() => handleRemoveTower(selectedTower.id)}
                              className="p-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Delete Tower from Master DB"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Live Analytical Combat Projections & TTK Simulation Dashboard */}
                  {activeTierStats && (
                    <div className="bg-purple-950/25 rounded-2xl border border-purple-500/40 p-4 sm:p-5 space-y-3.5 shadow-md">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-black uppercase text-purple-200 tracking-wider">
                            Live Combat Projections & TTK Simulation Dashboard
                          </span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-purple-500/40 text-xs">
                          <span className="px-2 text-slate-400 font-bold">Tier Level:</span>
                          {[1, 2, 3].map(tNum => (
                            <button
                              key={tNum}
                              id={`tier-preview-btn-${tNum}`}
                              onClick={() => setActiveTierPreview(tNum)}
                              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                                activeTierPreview === tNum ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              T{tNum}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Effective ATK</div>
                          <div className="font-mono font-black text-amber-300 text-base mt-0.5">
                            {selectedTower.damageType === 'magical' ? activeTierStats.magicalATK : activeTierStats.physicalATK}
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Attack Cadence</div>
                          <div className="font-mono font-black text-cyan-300 text-base mt-0.5">
                            {activeTierStats.attackSpeed} <span className="text-[10px] text-slate-400">atk/s</span>
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Expected DPS</div>
                          <div className="font-mono font-black text-emerald-400 text-base mt-0.5">
                            {activeTierStats.dps}
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Crit Rate / Mult</div>
                          <div className="font-mono font-bold text-rose-300 text-xs mt-1">
                            {(activeTierStats.critRate * 100).toFixed(1)}% / {activeTierStats.critDamage}x
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">TTK (150 HP Grunt)</div>
                          <div className="font-mono font-black text-purple-300 text-base mt-0.5">
                            {activeTierStats.ttkGrunt === Infinity ? '∞' : `${activeTierStats.ttkGrunt}s`}
                          </div>
                        </div>

                        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">TTK (450 HP Heavy)</div>
                          <div className="font-mono font-black text-purple-300 text-base mt-0.5">
                            {activeTierStats.ttkArmored === Infinity ? '∞' : `${activeTierStats.ttkArmored}s`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Primary Attributes & Core DNA Matrix */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dna className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Primary Attributes & Core DNA
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Governs damage scaling, crit rates, mana regeneration, and defense
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* STR */}
                      <div className="bg-slate-950/90 rounded-xl border border-rose-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-rose-400 uppercase flex items-center gap-1">
                            <span>STR</span>
                            <span className="text-[10px] text-slate-400 font-normal">Strength</span>
                          </span>
                          <input
                            id="tower-stat-str"
                            type="number"
                            value={selectedTower.baseStats?.STR ?? 10}
                            onChange={(e) => handleUpdateTowerBaseStat('STR', e.target.value)}
                            className="w-14 bg-slate-900 border border-rose-500/40 rounded px-1.5 py-0.5 text-right font-mono font-black text-rose-300 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                          <div>+2 Phys ATK / pt</div>
                          <div>+0.01x Crit Dmg / pt</div>
                        </div>
                      </div>

                      {/* INT */}
                      <div className="bg-slate-950/90 rounded-xl border border-purple-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-400 uppercase flex items-center gap-1">
                            <span>INT</span>
                            <span className="text-[10px] text-slate-400 font-normal">Intellect</span>
                          </span>
                          <input
                            id="tower-stat-int"
                            type="number"
                            value={selectedTower.baseStats?.INT ?? 10}
                            onChange={(e) => handleUpdateTowerBaseStat('INT', e.target.value)}
                            className="w-14 bg-slate-900 border border-purple-500/40 rounded px-1.5 py-0.5 text-right font-mono font-black text-purple-300 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                          <div>+2 Magic ATK / pt</div>
                          <div>+0.05/s Mana Regen</div>
                        </div>
                      </div>

                      {/* AGI */}
                      <div className="bg-slate-950/90 rounded-xl border border-cyan-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1">
                            <span>AGI</span>
                            <span className="text-[10px] text-slate-400 font-normal">Agility</span>
                          </span>
                          <input
                            id="tower-stat-agi"
                            type="number"
                            value={selectedTower.baseStats?.AGI ?? 10}
                            onChange={(e) => handleUpdateTowerBaseStat('AGI', e.target.value)}
                            className="w-14 bg-slate-900 border border-cyan-500/40 rounded px-1.5 py-0.5 text-right font-mono font-black text-cyan-300 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                          <div>+2% Atk Cadence</div>
                          <div>+0.5% Crit Chance</div>
                        </div>
                      </div>

                      {/* VIT */}
                      <div className="bg-slate-950/90 rounded-xl border border-emerald-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1">
                            <span>VIT</span>
                            <span className="text-[10px] text-slate-400 font-normal">Vitality</span>
                          </span>
                          <input
                            id="tower-stat-vit"
                            type="number"
                            value={selectedTower.baseStats?.VIT ?? 10}
                            onChange={(e) => handleUpdateTowerBaseStat('VIT', e.target.value)}
                            className="w-14 bg-slate-900 border border-emerald-500/40 rounded px-1.5 py-0.5 text-right font-mono font-black text-emerald-300 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                          <div>+20 Max HP / pt</div>
                          <div>+0.5 Armor & Res</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Base Defensive & Resource Pool Profile */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" />
                        <span>Base Defensive & Resource Pool Profile</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        Mana Regen: {(0.5 + (selectedTower.baseStats?.INT ?? 10) * 0.05).toFixed(2)}/sec
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Base HP:</span>
                        <input
                          type="number"
                          value={selectedTower.baseStats?.baseHp ?? 140}
                          onChange={(e) => handleUpdateTowerBaseStat('baseHp', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-emerald-300"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Base Armor (DEF):</span>
                        <input
                          type="number"
                          value={selectedTower.baseStats?.baseDef ?? 10}
                          onChange={(e) => handleUpdateTowerBaseStat('baseDef', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Base Magic Res:</span>
                        <input
                          type="number"
                          value={selectedTower.baseStats?.baseMres ?? 15}
                          onChange={(e) => handleUpdateTowerBaseStat('baseMres', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-purple-300"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Base Mana Pool:</span>
                        <input
                          type="number"
                          value={selectedTower.baseStats?.baseMana ?? 100}
                          onChange={(e) => handleUpdateTowerBaseStat('baseMana', e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-cyan-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. 3-Tier Upgrade Matrix & Calibration Engine */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>3-Tier Upgrade Matrix & Calibration</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Configure costs, damage scaling, range, and specialized utility across tiers
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedTower.levels.map((lvl, tierIdx) => (
                        <div
                          key={lvl.level}
                          className={`bg-slate-950/90 rounded-xl border p-4 space-y-3 transition-colors ${
                            activeTierPreview === lvl.level
                              ? 'border-purple-500/70 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-black uppercase text-purple-400">
                              Tier {lvl.level} Upgrade
                            </span>
                            <div className="flex items-center gap-1 font-mono text-xs text-amber-400 font-bold">
                              <span>Cost:</span>
                              <input
                                type="number"
                                value={lvl.cost}
                                onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'cost', e.target.value)}
                                className="w-16 bg-slate-900 border border-amber-500/40 rounded px-1.5 py-0.5 text-right font-bold text-amber-300"
                              />
                              <span>🪙</span>
                            </div>
                          </div>

                          {/* Stat inputs for Tier */}
                          <div className="space-y-2 text-xs">
                            {/* Damage */}
                            {lvl.damage !== undefined && selectedTower.category !== TOWER_CATEGORIES.UTILITY && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">Base Damage:</span>
                                <input
                                  type="number"
                                  value={lvl.damage}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'damage', e.target.value)}
                                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-slate-200"
                                />
                              </div>
                            )}

                            {/* Attack Speed */}
                            {lvl.attackSpeed !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">Attack Speed (atk/s):</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={lvl.attackSpeed}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'attackSpeed', e.target.value)}
                                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-cyan-300"
                                />
                              </div>
                            )}

                            {/* Range */}
                            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                              <span className="text-slate-400">Grid Range:</span>
                              <input
                                type="number"
                                step="0.5"
                                value={lvl.range}
                                onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'range', e.target.value)}
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-emerald-300"
                              />
                            </div>

                            {/* AoE Radius */}
                            {lvl.aoeRadius !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-rose-400 font-bold">💥 AoE Blast Radius:</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={lvl.aoeRadius}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'aoeRadius', e.target.value)}
                                  className="w-16 bg-slate-950 border border-rose-500/40 rounded px-1.5 py-0.5 text-right font-mono font-bold text-rose-300"
                                />
                              </div>
                            )}

                            {/* Shield HP */}
                            {lvl.shieldHp !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-emerald-400 font-bold">🛡️ Shield Barrier HP:</span>
                                <input
                                  type="number"
                                  value={lvl.shieldHp}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'shieldHp', e.target.value)}
                                  className="w-16 bg-slate-950 border border-emerald-500/40 rounded px-1.5 py-0.5 text-right font-mono font-bold text-emerald-300"
                                />
                              </div>
                            )}

                            {/* Slow % */}
                            {lvl.slowPct !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-cyan-400 font-bold">❄️ Slow Effect (%):</span>
                                <input
                                  type="number"
                                  value={lvl.slowPct}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'slowPct', e.target.value)}
                                  className="w-16 bg-slate-950 border border-cyan-500/40 rounded px-1.5 py-0.5 text-right font-mono font-bold text-cyan-300"
                                />
                              </div>
                            )}

                            {/* Pylon Buff % */}
                            {lvl.buffSpeedPct !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-amber-400 font-bold">⚡ Pylon Speed Buff (%):</span>
                                <input
                                  type="number"
                                  value={lvl.buffSpeedPct}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'buffSpeedPct', e.target.value)}
                                  className="w-16 bg-slate-950 border border-amber-500/40 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300"
                                />
                              </div>
                            )}

                            {/* Harvester Gold */}
                            {lvl.goldPerTick !== undefined && (
                              <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
                                <span className="text-amber-400 font-bold">🪙 Harvest Gold / Tick:</span>
                                <input
                                  type="number"
                                  value={lvl.goldPerTick}
                                  onChange={(e) => handleUpdateTowerLevelStat(tierIdx, 'goldPerTick', e.target.value)}
                                  className="w-16 bg-slate-950 border border-amber-500/40 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Skills & Ability Codices */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Tower Skills & Tactical Triggers ({selectedTower.skills?.length || 0})
                        </span>
                      </div>

                      <button
                        id="add-tower-skill-btn"
                        onClick={handleAddSkill}
                        className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Skill</span>
                      </button>
                    </div>

                    {(!selectedTower.skills || selectedTower.skills.length === 0) ? (
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                        No active or passive skills configured for this tower. Click "Add Skill" to create one.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedTower.skills.map((sk, skIdx) => (
                          <div
                            key={sk.id || skIdx}
                            className="bg-slate-950 rounded-xl border border-slate-800 p-3.5 space-y-3"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={sk.name}
                                  onChange={(e) => handleUpdateTowerSkill(skIdx, 'name', e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-black text-slate-100 focus:outline-none"
                                />
                                <select
                                  value={sk.type}
                                  onChange={(e) => handleUpdateTowerSkill(skIdx, 'type', e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] font-bold text-purple-300 uppercase focus:outline-none"
                                >
                                  <option value="active">Active</option>
                                  <option value="passive">Passive</option>
                                  <option value="aura">Aura</option>
                                </select>
                                <select
                                  value={sk.trigger}
                                  onChange={(e) => handleUpdateTowerSkill(skIdx, 'trigger', e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] font-bold text-amber-300 focus:outline-none"
                                >
                                  <option value={TRIGGER_TYPES.ON_HIT}>On Hit</option>
                                  <option value={TRIGGER_TYPES.ON_KILL}>On Kill</option>
                                  <option value={TRIGGER_TYPES.PERIODIC}>Periodic</option>
                                  <option value={TRIGGER_TYPES.AURA}>Aura</option>
                                  <option value={TRIGGER_TYPES.ON_HP_BELOW_X}>On HP Below X</option>
                                </select>
                              </div>

                              <button
                                onClick={() => handleRemoveSkill(skIdx)}
                                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50 cursor-pointer"
                                title="Delete Skill"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Skill Timing & Resource Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="bg-slate-900/70 p-1.5 rounded flex items-center justify-between">
                                <span className="text-slate-400">Cooldown:</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={sk.cooldown}
                                    onChange={(e) => handleUpdateTowerSkill(skIdx, 'cooldown', e.target.value)}
                                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-right font-mono font-bold text-slate-200 text-xs"
                                  />
                                  <span className="text-slate-400">s</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/70 p-1.5 rounded flex items-center justify-between">
                                <span className="text-slate-400">Mana Cost:</span>
                                <input
                                  type="number"
                                  value={sk.manaCost}
                                  onChange={(e) => handleUpdateTowerSkill(skIdx, 'manaCost', e.target.value)}
                                  className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-right font-mono font-bold text-cyan-300 text-xs"
                                />
                              </div>

                              <div className="bg-slate-900/70 p-1.5 rounded flex items-center justify-between">
                                <span className="text-slate-400">Radius:</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={sk.radius}
                                    onChange={(e) => handleUpdateTowerSkill(skIdx, 'radius', e.target.value)}
                                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-right font-mono font-bold text-emerald-300 text-xs"
                                  />
                                  <span className="text-slate-400">tiles</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/70 p-1.5 rounded flex items-center justify-between">
                                <span className="text-slate-400">Duration:</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={sk.duration}
                                    onChange={(e) => handleUpdateTowerSkill(skIdx, 'duration', e.target.value)}
                                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-right font-mono font-bold text-slate-200 text-xs"
                                  />
                                  <span className="text-slate-400">s</span>
                                </div>
                              </div>
                            </div>

                            {/* Effects Codex */}
                            <div className="space-y-1.5 border-t border-slate-800 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-300 uppercase">
                                  Skill Effects & Scaling
                                </span>
                                <button
                                  onClick={() => handleAddSkillEffect(skIdx)}
                                  className="text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Effect</span>
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                {sk.effects?.map((eff, effIdx) => (
                                  <div
                                    key={effIdx}
                                    className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-xs flex-wrap gap-2"
                                  >
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <select
                                        value={eff.type}
                                        onChange={(e) => handleUpdateSkillEffect(skIdx, effIdx, 'type', e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-bold text-cyan-300 focus:outline-none"
                                      >
                                        <option value="damage">Damage</option>
                                        <option value="slow">Slow</option>
                                        <option value="buff">Buff</option>
                                        <option value="debuff">Debuff</option>
                                        <option value="gain_mana">Gain Mana</option>
                                        <option value="gain_gold">Gain Gold</option>
                                        <option value="shield">Shield</option>
                                      </select>

                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-400 text-[11px]">Base:</span>
                                        <input
                                          type="number"
                                          value={eff.value}
                                          onChange={(e) => handleUpdateSkillEffect(skIdx, effIdx, 'value', e.target.value)}
                                          className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right font-mono font-bold text-amber-300 text-xs"
                                        />
                                      </div>

                                      {eff.scaling && (
                                        <div className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                                          Scaling: {Object.entries(eff.scaling).map(([k, v]) => `+${v} × ${k.toUpperCase()}`).join(', ')}
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => handleRemoveSkillEffect(skIdx, effIdx)}
                                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-3">
                  <p>Select a tower from the left sidebar or create a new custom tower.</p>
                  <button
                    onClick={handleAddCustomTower}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                  >
                    + Create Custom Tower
                  </button>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ==================== TAB 2: ENEMY BESTIARY (LEFT SIDEBAR + RIGHT DASHBOARD) ==================== */}
        {activeTab === 'enemies' && (
          <div className="flex-1 flex flex-col md:flex-row gap-4 h-full overflow-hidden w-full max-w-[1700px] mx-auto">
            {/* LEFT SIDEBAR: Enemy Bestiary Directory */}
            <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 shadow-xl flex-shrink-0 h-full overflow-hidden">
              {/* Top Controls & Create Button */}
              <div className="space-y-3 pb-3 border-b border-slate-800/80 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-400">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Enemy Bestiary</span>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                      {enemyTypesData.length}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">Archetypes</span>
                </div>

                {/* Create Custom Enemy Button */}
                <button
                  id="create-custom-enemy-btn"
                  onClick={handleAddCustomEnemy}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all cursor-pointer active:scale-[0.98] border border-rose-400/40"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Custom Enemy</span>
                </button>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="enemy-search-input"
                    type="text"
                    placeholder="Search enemy archetypes..."
                    value={enemySearchQuery}
                    onChange={(e) => setEnemySearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  {enemySearchQuery && (
                    <button
                      onClick={() => setEnemySearchQuery('')}
                      className="text-slate-500 hover:text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Enemy List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pt-2 pr-1">
                {filteredEnemies.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                    <p>No enemies matching search.</p>
                    <button
                      onClick={() => setEnemySearchQuery('')}
                      className="text-rose-400 text-[11px] underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredEnemies.map(e => {
                    const isSel = e.id === selectedEnemyId;
                    return (
                      <div
                        key={e.id}
                        id={`enemy-sidebar-item-${e.id}`}
                        onClick={() => setSelectedEnemyId(e.id)}
                        className={`group relative p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-rose-950/70 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] text-white ring-1 ring-rose-500/50'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/90'
                        }`}
                      >
                        {/* Active Accent Stripe */}
                        {isSel && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-rose-400 rounded-r"></div>
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: e.color || '#ef4444', color: e.color || '#ef4444' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black truncate">{e.name}</span>
                              {e.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1.5">
                              <span className="text-rose-300">{e.hp} HP</span>
                              <span>•</span>
                              <span>🛡️{e.armor}%</span>
                              <span>•</span>
                              <span>🔮{e.magicRes}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Bounty Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-mono text-[11px] text-amber-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            🪙 {e.bounty}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Sidebar Footer Stats */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-shrink-0">
                <span>Total Archetypes: {enemyTypesData.length}</span>
                <span className="text-rose-400 font-bold">Combat Ready</span>
              </div>
            </aside>

            {/* RIGHT PANEL: Deep Enemy Dashboard */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 space-y-6 shadow-xl h-full">
              {selectedEnemy ? (
                <>
                  {/* 1. Header Hero Card & Meta Tuning */}
                  <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-md">
                    <div className="flex items-start justify-between flex-wrap gap-4 pb-3 border-b border-slate-800">
                      <div className="space-y-2 flex-1 min-w-[300px]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <input
                            id="enemy-name-input"
                            type="text"
                            value={selectedEnemy.name}
                            onChange={(e) => handleUpdateEnemyStat('name', e.target.value)}
                            className="text-lg font-black bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-1 text-slate-100 focus:border-rose-400 focus:outline-none shadow-inner"
                          />
                          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Token Color:</span>
                            <input
                              type="color"
                              value={selectedEnemy.color || '#ef4444'}
                              onChange={(e) => handleUpdateEnemyStat('color', e.target.value)}
                              className="w-6 h-6 rounded-lg border-0 bg-transparent cursor-pointer"
                              title="Enemy Token Color"
                            />
                          </div>
                        </div>

                        <input
                          id="enemy-desc-input"
                          type="text"
                          placeholder="Enemy tactical role or armor lore..."
                          value={selectedEnemy.desc || ''}
                          onChange={(e) => handleUpdateEnemyStat('desc', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      {/* Delete Action */}
                      {enemyTypesData.length > 1 && (
                        <button
                          id="delete-enemy-btn"
                          onClick={() => handleRemoveEnemy(selectedEnemy.id)}
                          className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Archetype</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Core Vitals & Movement Dashboard */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Vitals, Movement & Economy Bounty
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Health */}
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-purple-500/30 space-y-1.5">
                        <span className="text-xs font-bold uppercase text-purple-400 block">Base Health (HP)</span>
                        <input
                          type="number"
                          step="10"
                          value={selectedEnemy.hp}
                          onChange={(e) => handleUpdateEnemyStat('hp', e.target.value)}
                          className="w-full bg-slate-900 border border-purple-500/40 rounded-lg px-2.5 py-1.5 font-mono font-black text-purple-300 text-base"
                        />
                        <span className="text-[10px] text-slate-500 block">Raw hit points before mitigation</span>
                      </div>

                      {/* Movement Speed */}
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/30 space-y-1.5">
                        <span className="text-xs font-bold uppercase text-amber-400 block">Movement Speed</span>
                        <input
                          type="number"
                          step="0.1"
                          value={selectedEnemy.moveSpeed}
                          onChange={(e) => handleUpdateEnemyStat('moveSpeed', e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 font-mono font-black text-amber-300 text-base"
                        />
                        <span className="text-[10px] text-slate-500 block">Grid tiles traversed per second</span>
                      </div>

                      {/* Kill Bounty */}
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
                        <span className="text-xs font-bold uppercase text-emerald-400 block">Kill Bounty (🪙)</span>
                        <input
                          type="number"
                          value={selectedEnemy.bounty}
                          onChange={(e) => handleUpdateEnemyStat('bounty', e.target.value)}
                          className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 font-mono font-black text-emerald-300 text-base"
                        />
                        <span className="text-[10px] text-slate-500 block">Gold rewarded to player upon defeat</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Dual Mitigation Curves Dashboard */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Damage Mitigation & Resistance Profiles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Physical Armor */}
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-amber-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span>Physical Armor Defense</span>
                          </span>
                          <span className="font-mono font-black text-amber-300 text-sm bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                            {selectedEnemy.armor}% Mitigation
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          value={selectedEnemy.armor}
                          onChange={(e) => handleUpdateEnemyStat('armor', e.target.value)}
                          className="w-full accent-amber-400 h-2 bg-slate-900 rounded-lg cursor-pointer"
                        />
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          Reduces kinetic physical damage from <strong className="text-amber-300">Gatling Cannon</strong> and <strong className="text-amber-300">Heavy Mortar</strong>.
                        </div>
                      </div>

                      {/* Magical Resistance */}
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-purple-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                            <Sparkle className="w-4 h-4 text-purple-400" />
                            <span>Magical Energy Resistance</span>
                          </span>
                          <span className="font-mono font-black text-purple-300 text-sm bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40">
                            {selectedEnemy.magicRes}% Mitigation
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="80"
                          value={selectedEnemy.magicRes}
                          onChange={(e) => handleUpdateEnemyStat('magicRes', e.target.value)}
                          className="w-full accent-purple-400 h-2 bg-slate-900 rounded-lg cursor-pointer"
                        />
                        <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          Reduces magical beam damage from <strong className="text-purple-300">Pulse Laser</strong> and <strong className="text-purple-300">Railgun Sniper</strong>.
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 space-y-3">
                  <p>Select an enemy archetype from the left sidebar or create a new custom enemy.</p>
                  <button
                    onClick={handleAddCustomEnemy}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
                  >
                    + Create Custom Enemy
                  </button>
                </div>
              )}
            </main>
          </div>
        )}

        {/* ==================== TAB 3: 1v1 BENCHMARK ARENA ==================== */}
        {activeTab === 'demo' && (
          <div className="space-y-4 max-w-5xl mx-auto w-full">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-teal-400" />
                  <div>
                    <span className="text-sm font-black uppercase text-slate-100">
                      1v1 Combat Benchmark & Demo Sandbox
                    </span>
                    <div className="text-[11px] text-slate-400">
                      Test single tower DPS against individual enemy archetypes to verify Time-to-Kill (TTK)
                    </div>
                  </div>
                </div>

                {/* Matchup Pickers */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Select Tower */}
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-purple-500/40 text-xs">
                    <span className="text-purple-400 font-bold">Tower:</span>
                    <select
                      value={demoTowerId}
                      onChange={(e) => setDemoTowerId(e.target.value)}
                      className="bg-transparent font-bold text-slate-200 focus:outline-none"
                    >
                      {towersData.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>

                    <select
                      value={demoTowerLevel}
                      onChange={(e) => setDemoTowerLevel(Number(e.target.value))}
                      className="bg-transparent font-bold text-amber-400 focus:outline-none ml-1"
                    >
                      <option value={1}>T1</option>
                      <option value={2}>T2</option>
                      <option value={3}>T3</option>
                    </select>
                  </div>

                  <span className="text-xs font-bold text-slate-500">VS</span>

                  {/* Select Enemy */}
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-rose-500/40 text-xs">
                    <span className="text-rose-400 font-bold">Enemy:</span>
                    <select
                      value={demoEnemyId}
                      onChange={(e) => setDemoEnemyId(e.target.value)}
                      className="bg-transparent font-bold text-slate-200 focus:outline-none"
                    >
                      {enemyTypesData.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Run Battle */}
                  <button
                    onClick={() => setDemoIsRunning(true)}
                    disabled={demoIsRunning}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      demoIsRunning
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Duel</span>
                  </button>
                </div>
              </div>

              {/* Canvas Visualizer */}
              <div className="bg-slate-950 rounded-xl p-2 border border-slate-800 flex justify-center">
                <canvas
                  ref={demoCanvasRef}
                  width={680}
                  height={110}
                  className="rounded-lg max-w-full bg-[#090d16]"
                />
              </div>

              {/* Combat Telemetry Logs */}
              {demoLogs.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-400">Combat Test Logs</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar font-mono text-xs">
                    {demoLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between bg-slate-950/60 px-3 py-1.5 rounded border border-slate-800 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            log.result === 'ELIMINATED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}>
                            {log.result}
                          </span>
                          <span className="text-purple-300 font-bold">{log.tower}</span>
                          <span className="text-slate-500">vs</span>
                          <span className="text-rose-300 font-bold">{log.enemy}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                          <span>⏱️ {log.timeTaken}s</span>
                          <span>💥 {log.totalDmg} dmg</span>
                          <span>🎯 {log.shotsFired} shots</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
