import { computeDerivedStats } from '../utils/combat.js';

export const TOWER_CATEGORIES = {
  OFFENSE: 'offense',
  DEFENSE: 'defense',
  UTILITY: 'utility'
};

export const DAMAGE_TYPES = {
  PHYSICAL: 'physical',
  MAGICAL: 'magical',
  DEFENSE: 'defense',
  UTILITY: 'utility'
};

export const TOWER_TYPES = [
  // --- OFFENSE TOWERS ---
  {
    id: 'laser',
    name: 'Pulse Laser',
    category: TOWER_CATEGORIES.OFFENSE,
    damageType: DAMAGE_TYPES.MAGICAL,
    tagline: 'Balanced magical beam',
    description: 'Fires continuous concentrated magical energy. Bypasses physical armor.',
    icon: 'Target',
    color: '#a855f7',
    baseStats: {
      STR: 4,
      INT: 16,
      AGI: 10,
      VIT: 8,
      baseDamage: 4,
      baseAttackSpeed: 1.4,
      baseRange: 3.5,
      baseHp: 140,
      baseDef: 6,
      baseMres: 20,
      baseMana: 120
    },
    skills: [
      {
        id: 'overcharge_beam',
        name: 'Overcharge Beam',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 5.0,
        manaCost: 20,
        manaGain: 0,
        radius: 3.5,
        duration: 2.5,
        effects: [
          { type: 'damage', value: 16, scaling: { int: 2.5 }, damageType: 'magical' },
          { type: 'debuff', stat: 'magicRes', value: 12, scaling: { int: 0.5 }, duration: 2.5 }
        ]
      },
      {
        id: 'arcane_harvest',
        name: 'Arcane Harvest',
        type: 'passive',
        trigger: 'on_kill',
        cooldown: 1.0,
        manaCost: 0,
        manaGain: 15,
        radius: 3.5,
        duration: 0,
        effects: [
          { type: 'gain_mana', value: 15, scaling: { int: 0.5 } },
          { type: 'gain_gold', value: 3, scaling: { int: 0.2 } }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 28, attackSpeed: 1.5, range: 3.5, cost: 100 },
      { level: 2, damage: 52, attackSpeed: 1.8, range: 4.0, cost: 220 },
      { level: 3, damage: 90, attackSpeed: 2.2, range: 4.5, cost: 450 }
    ]
  },
  {
    id: 'sniper',
    name: 'Railgun Sniper',
    category: TOWER_CATEGORIES.OFFENSE,
    damageType: DAMAGE_TYPES.MAGICAL,
    tagline: 'Extreme range arcane piercer',
    description: 'High-voltage magical railgun with extreme range and colossal punch.',
    icon: 'Crosshair',
    color: '#38bdf8',
    baseStats: {
      STR: 22,
      INT: 28,
      AGI: 6,
      VIT: 10,
      baseDamage: 45,
      baseAttackSpeed: 0.6,
      baseRange: 6.5,
      baseHp: 160,
      baseDef: 10,
      baseMres: 25,
      baseMana: 150
    },
    skills: [
      {
        id: 'pierce_slug',
        name: 'Hyper-Piercing Slug',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 7.0,
        manaCost: 35,
        manaGain: 0,
        radius: 6.5,
        duration: 3.5,
        effects: [
          { type: 'damage', value: 65, scaling: { str: 2.0, int: 2.5 }, damageType: 'magical' },
          { type: 'debuff', stat: 'armor', value: 25, scaling: { str: 0.6 }, duration: 3.5 }
        ]
      },
      {
        id: 'headhunter',
        name: 'Headhunter Focus',
        type: 'passive',
        trigger: 'on_kill',
        cooldown: 2.0,
        manaCost: 0,
        manaGain: 20,
        radius: 6.5,
        duration: 3.0,
        effects: [
          { type: 'buff', stat: 'attackSpeed', value: 25, scaling: { agi: 0.5 }, duration: 3.0 },
          { type: 'gain_gold', value: 10, scaling: { int: 0.3 } }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 95, attackSpeed: 0.6, range: 6.0, cost: 150 },
      { level: 2, damage: 190, attackSpeed: 0.7, range: 7.0, cost: 320 },
      { level: 3, damage: 360, attackSpeed: 0.8, range: 8.5, cost: 650 }
    ]
  },
  {
    id: 'gatling',
    name: 'Gatling Cannon',
    category: TOWER_CATEGORIES.OFFENSE,
    damageType: DAMAGE_TYPES.PHYSICAL,
    tagline: 'Ultra-fast kinetic shredder',
    description: 'Rapid-fire ballistic rounds. Devastates enemies with low physical armor.',
    icon: 'Zap',
    color: '#f59e0b',
    baseStats: {
      STR: 6,
      INT: 3,
      AGI: 26,
      VIT: 8,
      baseDamage: 4,
      baseAttackSpeed: 3.0,
      baseRange: 3.0,
      baseHp: 130,
      baseDef: 8,
      baseMres: 6,
      baseMana: 80
    },
    skills: [
      {
        id: 'bullet_storm',
        name: 'Bullet Storm',
        type: 'active',
        trigger: 'on_attack',
        cooldown: 4.5,
        manaCost: 15,
        manaGain: 5,
        radius: 3.0,
        duration: 2.0,
        effects: [
          { type: 'damage', value: 12, scaling: { agi: 1.5, str: 0.8 }, damageType: 'physical' },
          { type: 'buff', stat: 'attackSpeed', value: 30, scaling: { agi: 1.0 }, duration: 2.0 }
        ]
      },
      {
        id: 'momentum_surge',
        name: 'Momentum Surge',
        type: 'passive',
        trigger: 'on_kill',
        cooldown: 1.0,
        manaCost: 0,
        manaGain: 10,
        radius: 3.0,
        duration: 2.5,
        effects: [
          { type: 'gain_mana', value: 10, scaling: { agi: 0.4 } },
          { type: 'buff', stat: 'attackSpeed', value: 20, scaling: { agi: 0.5 }, duration: 2.5 }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 14, attackSpeed: 3.6, range: 3.0, cost: 120 },
      { level: 2, damage: 26, attackSpeed: 4.4, range: 3.5, cost: 260 },
      { level: 3, damage: 45, attackSpeed: 5.2, range: 4.0, cost: 500 }
    ]
  },
  {
    id: 'mortar',
    name: 'Heavy Mortar',
    category: TOWER_CATEGORIES.OFFENSE,
    damageType: DAMAGE_TYPES.PHYSICAL,
    tagline: 'Heavy kinetic explosive artillery',
    description: 'High-yield explosive artillery dealing crushing physical area damage.',
    icon: 'Bomb',
    color: '#ef4444',
    baseStats: {
      STR: 32,
      INT: 5,
      AGI: 4,
      VIT: 16,
      baseDamage: 70,
      baseAttackSpeed: 0.45,
      baseRange: 5.0,
      baseHp: 220,
      baseDef: 18,
      baseMres: 12,
      baseMana: 100
    },
    skills: [
      {
        id: 'cluster_shrapnel',
        name: 'Cluster Shrapnel',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 6.0,
        manaCost: 25,
        manaGain: 0,
        radius: 2.5,
        duration: 2.0,
        effects: [
          { type: 'damage', value: 45, scaling: { str: 2.2 }, damageType: 'physical' },
          { type: 'slow', value: 30, scaling: { str: 0.4 }, duration: 2.0 }
        ]
      },
      {
        id: 'cataclysm_round',
        name: 'Cataclysm Round',
        type: 'active',
        trigger: 'periodic',
        cooldown: 12.0,
        manaCost: 35,
        manaGain: 0,
        radius: 3.5,
        duration: 4.0,
        effects: [
          { type: 'damage', value: 90, scaling: { str: 3.5 }, damageType: 'physical' },
          { type: 'debuff', stat: 'armor', value: 30, scaling: { str: 0.5 }, duration: 4.0 }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 125, attackSpeed: 0.45, range: 5.0, cost: 180 },
      { level: 2, damage: 260, attackSpeed: 0.55, range: 5.5, cost: 380 },
      { level: 3, damage: 520, attackSpeed: 0.65, range: 6.0, cost: 800 }
    ]
  },

  // --- DEFENSE & PROTECTION TOWERS ---
  {
    id: 'bastion',
    name: 'Aegis Bastion',
    category: TOWER_CATEGORIES.DEFENSE,
    damageType: DAMAGE_TYPES.DEFENSE,
    tagline: 'Base shield & kinetic barrier',
    description: 'Generates an energy barrier that absorbs leaks and slows passing enemies.',
    icon: 'Shield',
    color: '#10b981',
    baseStats: {
      STR: 10,
      INT: 8,
      AGI: 4,
      VIT: 32,
      baseDamage: 0,
      baseAttackSpeed: 1.0,
      baseRange: 3.5,
      baseHp: 400,
      baseDef: 35,
      baseMres: 30,
      baseMana: 140
    },
    skills: [
      {
        id: 'bastion_aura',
        name: 'Bastion Fortification',
        type: 'aura',
        trigger: 'aura',
        cooldown: 0,
        manaCost: 0,
        manaGain: 10,
        radius: 3.5,
        duration: 2.5,
        effects: [
          { type: 'buff', stat: 'defense', value: 20, scaling: { vit: 1.5 } },
          { type: 'slow', value: 25, scaling: { vit: 0.5 }, duration: 2.5 }
        ]
      },
      {
        id: 'emergency_barrier',
        name: 'Emergency Bulwark',
        type: 'passive',
        trigger: 'on_hp_below_30',
        cooldown: 15.0,
        manaCost: 0,
        manaGain: 0,
        radius: 3.5,
        duration: 8.0,
        effects: [
          { type: 'shield', value: 120, scaling: { vit: 4.0 }, duration: 8.0 }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 0, attackSpeed: 1.0, range: 3.2, cost: 130, shieldHp: 2, slowPct: 20 },
      { level: 2, damage: 0, attackSpeed: 1.0, range: 4.0, cost: 280, shieldHp: 4, slowPct: 35 },
      { level: 3, damage: 0, attackSpeed: 1.0, range: 4.8, cost: 550, shieldHp: 7, slowPct: 50 }
    ]
  },
  {
    id: 'shockwall',
    name: 'Tesla Barricade',
    category: TOWER_CATEGORIES.DEFENSE,
    damageType: DAMAGE_TYPES.MAGICAL,
    tagline: 'Shock defense & stasis pulses',
    description: 'Channels continuous high-voltage electrical fields damaging all nearby enemies.',
    icon: 'ShieldAlert',
    color: '#06b6d4',
    baseStats: {
      STR: 6,
      INT: 20,
      AGI: 8,
      VIT: 18,
      baseDamage: 12,
      baseAttackSpeed: 1.1,
      baseRange: 2.8,
      baseHp: 240,
      baseDef: 20,
      baseMres: 24,
      baseMana: 120
    },
    skills: [
      {
        id: 'static_discharge',
        name: 'Static Overload',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 4.0,
        manaCost: 15,
        manaGain: 0,
        radius: 2.8,
        duration: 2.0,
        effects: [
          { type: 'damage', value: 22, scaling: { int: 2.2 }, damageType: 'magical' },
          { type: 'slow', value: 35, scaling: { int: 0.6 }, duration: 2.0 }
        ]
      },
      {
        id: 'overload_nova',
        name: 'Overload EMP Discharge',
        type: 'active',
        trigger: 'on_hp_below_50',
        cooldown: 12.0,
        manaCost: 0,
        manaGain: 0,
        radius: 3.5,
        duration: 3.5,
        effects: [
          { type: 'damage', value: 50, scaling: { int: 3.0 }, damageType: 'magical' },
          { type: 'debuff', stat: 'armor', value: 20, duration: 3.5 }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 22, attackSpeed: 1.2, range: 2.8, cost: 140, slowPct: 25 },
      { level: 2, damage: 45, attackSpeed: 1.4, range: 3.4, cost: 300, slowPct: 35 },
      { level: 3, damage: 85, attackSpeed: 1.8, range: 4.0, cost: 600, slowPct: 45 }
    ]
  },

  // --- UTILITY TOWERS ---
  {
    id: 'pylon',
    name: 'Power Pylon',
    category: TOWER_CATEGORIES.UTILITY,
    damageType: DAMAGE_TYPES.UTILITY,
    tagline: 'Tower amplifier beacon',
    description: 'Overcharges nearby towers, boosting their attack speed and damage output.',
    icon: 'Radio',
    color: '#eab308',
    baseStats: {
      STR: 3,
      INT: 25,
      AGI: 7,
      VIT: 12,
      baseDamage: 0,
      baseAttackSpeed: 0,
      baseRange: 3.8,
      baseHp: 160,
      baseDef: 12,
      baseMres: 28,
      baseMana: 160
    },
    skills: [
      {
        id: 'resonance_aura',
        name: 'Harmonic Amplification',
        type: 'aura',
        trigger: 'aura',
        cooldown: 0,
        manaCost: 0,
        manaGain: 5,
        radius: 3.8,
        duration: 0,
        effects: [
          { type: 'buff', stat: 'attackSpeed', value: 25, scaling: { int: 0.8 } },
          { type: 'buff', stat: 'damage', value: 18, scaling: { int: 0.6 } }
        ]
      },
      {
        id: 'mana_surge',
        name: 'Mana Surge Pulse',
        type: 'active',
        trigger: 'periodic',
        cooldown: 6.0,
        manaCost: 0,
        manaGain: 25,
        radius: 3.8,
        duration: 0,
        effects: [
          { type: 'gain_mana', value: 25, scaling: { int: 1.0 } }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 0, attackSpeed: 0, range: 3.5, cost: 140, buffSpeedPct: 20, buffDmgPct: 15 },
      { level: 2, damage: 0, attackSpeed: 0, range: 4.2, cost: 300, buffSpeedPct: 35, buffDmgPct: 25 },
      { level: 3, damage: 0, attackSpeed: 0, range: 5.0, cost: 600, buffSpeedPct: 50, buffDmgPct: 40 }
    ]
  },
  {
    id: 'cryo',
    name: 'Cryo Emitter',
    category: TOWER_CATEGORIES.UTILITY,
    damageType: DAMAGE_TYPES.MAGICAL,
    tagline: 'Aura slow & armor shredder',
    description: 'Emits sub-zero pulses that slow enemies and weakens their armor and magic resistance.',
    icon: 'Snowflake',
    color: '#38bdf8',
    baseStats: {
      STR: 4,
      INT: 22,
      AGI: 6,
      VIT: 14,
      baseDamage: 5,
      baseAttackSpeed: 0.95,
      baseRange: 3.4,
      baseHp: 180,
      baseDef: 14,
      baseMres: 25,
      baseMana: 140
    },
    skills: [
      {
        id: 'blizzard_aura',
        name: 'Glacial Chill Aura',
        type: 'aura',
        trigger: 'aura',
        cooldown: 0,
        manaCost: 0,
        manaGain: 0,
        radius: 3.4,
        duration: 2.5,
        effects: [
          { type: 'slow', value: 35, scaling: { int: 0.8 }, duration: 2.5 },
          { type: 'debuff', stat: 'armor', value: 15, scaling: { int: 0.4 }, duration: 2.5 }
        ]
      },
      {
        id: 'frostbite_shatter',
        name: 'Frostbite Shatter',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 3.5,
        manaCost: 15,
        manaGain: 0,
        radius: 3.4,
        duration: 3.0,
        effects: [
          { type: 'damage', value: 20, scaling: { int: 2.0 }, damageType: 'magical' },
          { type: 'debuff', stat: 'magicRes', value: 15, scaling: { int: 0.5 }, duration: 3.0 }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 8, attackSpeed: 1.0, range: 3.2, cost: 120, slowPct: 35, shredPct: 15 },
      { level: 2, damage: 16, attackSpeed: 1.0, range: 3.8, cost: 260, slowPct: 50, shredPct: 25 },
      { level: 3, damage: 32, attackSpeed: 1.0, range: 4.5, cost: 520, slowPct: 65, shredPct: 40 }
    ]
  },
  {
    id: 'harvester',
    name: 'Solar Harvester',
    category: TOWER_CATEGORIES.UTILITY,
    damageType: DAMAGE_TYPES.UTILITY,
    tagline: 'Resource farming & bounty boost',
    description: 'Passively produces bonus gold during waves and amplifies kill bounties in range.',
    icon: 'Coins',
    color: '#fbbf24',
    baseStats: {
      STR: 4,
      INT: 18,
      AGI: 6,
      VIT: 12,
      baseDamage: 0,
      baseAttackSpeed: 0,
      baseRange: 3.5,
      baseHp: 140,
      baseDef: 10,
      baseMres: 18,
      baseMana: 100
    },
    skills: [
      {
        id: 'solar_pulse',
        name: 'Solar Bounty Pulse',
        type: 'active',
        trigger: 'periodic',
        cooldown: 5.0,
        manaCost: 0,
        manaGain: 15,
        radius: 3.5,
        duration: 0,
        effects: [
          { type: 'gain_gold', value: 20, scaling: { int: 1.2 } }
        ]
      },
      {
        id: 'bounty_siphon',
        name: 'Bounty Siphon',
        type: 'passive',
        trigger: 'on_kill',
        cooldown: 1.0,
        manaCost: 0,
        manaGain: 10,
        radius: 3.5,
        duration: 0,
        effects: [
          { type: 'gain_gold', value: 8, scaling: { int: 0.5 } }
        ]
      }
    ],
    levels: [
      { level: 1, damage: 0, attackSpeed: 0, range: 3.5, cost: 110, goldPerTick: 15, bountyMult: 1.25 },
      { level: 2, damage: 0, attackSpeed: 0, range: 4.2, cost: 240, goldPerTick: 35, bountyMult: 1.50 },
      { level: 3, damage: 0, attackSpeed: 0, range: 5.0, cost: 480, goldPerTick: 70, bountyMult: 1.80 }
    ]
  }
];

export const DEFAULT_TOWER_TYPE = 'laser';
export const DEFAULT_TOWER_LEVEL = 1;

export function getTowerType(id, customList = TOWER_TYPES) {
  const list = customList || TOWER_TYPES;
  return list.find(t => t.id === id) || list[0];
}

/**
 * Retrieves tower stats for a given type and tier level.
 * Routes directly through computeDerivedStats from the pure-function combat engine.
 * @param {string} typeId - Tower identifier
 * @param {number} [level=1] - Tower tier level
 * @param {Array} [customList=TOWER_TYPES] - Optional custom towers data array
 * @returns {Object} Complete derived stats and mechanics
 */
export function getTowerStats(typeId, level = 1, customList = TOWER_TYPES) {
  const tower = getTowerType(typeId, customList);
  const lvlObj = tower?.levels?.find(l => l.level === level) || tower?.levels?.[0] || {};

  // Tier multiplier for scaling base attributes (1x at T1, 1.6x at T2, 2.5x at T3)
  const tierMultiplier = level === 1 ? 1.0 : (level === 2 ? 1.6 : 2.5);

  const baseAttributes = {
    STR: Math.round((tower.baseStats?.STR ?? 5) * (lvlObj.strMultiplier || tierMultiplier)),
    INT: Math.round((tower.baseStats?.INT ?? 5) * (lvlObj.intMultiplier || tierMultiplier)),
    AGI: Math.round((tower.baseStats?.AGI ?? 5) * (lvlObj.agiMultiplier || tierMultiplier)),
    VIT: Math.round((tower.baseStats?.VIT ?? 5) * (lvlObj.vitMultiplier || tierMultiplier))
  };

  const mergedBaseStats = {
    ...tower.baseStats,
    ...lvlObj,
    damageType: tower.damageType,
    category: tower.category,
    skills: tower.skills || []
  };

  // Route through computeDerivedStats
  const derived = computeDerivedStats(baseAttributes, mergedBaseStats);

  return {
    ...derived,
    // Preserve level-explicit values for backwards compatibility and exact design tuning
    damage: lvlObj.damage !== undefined ? lvlObj.damage : derived.damage,
    attackSpeed: lvlObj.attackSpeed !== undefined ? lvlObj.attackSpeed : derived.attackSpeed,
    range: lvlObj.range !== undefined ? lvlObj.range : derived.range,
    cost: lvlObj.cost ?? 100,
    shieldHp: lvlObj.shieldHp ?? 0,
    slowPct: lvlObj.slowPct ?? 0,
    buffSpeedPct: lvlObj.buffSpeedPct ?? 0,
    buffDmgPct: lvlObj.buffDmgPct ?? 0,
    shredPct: lvlObj.shredPct ?? 0,
    goldPerTick: lvlObj.goldPerTick ?? 0,
    bountyMult: lvlObj.bountyMult ?? 1.0,
    damageType: tower.damageType,
    category: tower.category,
    skills: tower.skills || [],
    baseStats: tower.baseStats,
    attributes: baseAttributes
  };
}
