import { computeDerivedStats } from '../utils/combat.js';

export const ENEMY_TYPES = [
  {
    id: 'grunt',
    name: 'Standard Grunt',
    desc: 'Balanced infantry wave unit with resilient survival training.',
    hp: 150,
    armor: 15, // 15% physical damage reduction
    magicRes: 15, // 15% magical damage reduction
    moveSpeed: 2.0,
    bounty: 15,
    count: 10,
    spawnInterval: 1.0,
    color: '#ef4444',
    baseStats: {
      STR: 8,
      INT: 4,
      AGI: 8,
      VIT: 10,
      baseHp: 150,
      baseDef: 15,
      baseMres: 15,
      baseSpeed: 2.0,
      baseBounty: 15,
      baseMana: 50
    },
    skills: [
      {
        id: 'resolute_advance',
        name: 'Resolute Advance',
        type: 'passive',
        trigger: 'on_hp_below_50',
        cooldown: 8.0,
        manaCost: 0,
        manaGain: 0,
        radius: 2.0,
        duration: 3.5,
        effects: [
          { type: 'buff', stat: 'armor', value: 12, scaling: { vit: 0.8 }, duration: 3.5 },
          { type: 'buff', stat: 'moveSpeed', value: 15, scaling: { agi: 0.5 }, duration: 3.5 }
        ]
      }
    ]
  },
  {
    id: 'scout',
    name: 'Fast Scout',
    desc: 'Magic-resistant speedy runner capable of sudden acceleration.',
    hp: 85,
    armor: 0, // 0% armor -> very vulnerable to physical Gatling & Mortar
    magicRes: 40, // 40% magic resistance
    moveSpeed: 3.5,
    bounty: 12,
    count: 15,
    spawnInterval: 0.6,
    color: '#f59e0b',
    baseStats: {
      STR: 3,
      INT: 18,
      AGI: 24,
      VIT: 5,
      baseHp: 85,
      baseDef: 0,
      baseMres: 40,
      baseSpeed: 3.5,
      baseBounty: 12,
      baseMana: 80
    },
    skills: [
      {
        id: 'evasive_burst',
        name: 'Evasive Sprint',
        type: 'passive',
        trigger: 'on_hp_below_40',
        cooldown: 6.0,
        manaCost: 0,
        manaGain: 0,
        radius: 2.0,
        duration: 2.5,
        effects: [
          { type: 'buff', stat: 'moveSpeed', value: 40, scaling: { agi: 0.8 }, duration: 2.5 }
        ]
      },
      {
        id: 'null_ward',
        name: 'Null Arcane Ward',
        type: 'aura',
        trigger: 'aura',
        cooldown: 0,
        manaCost: 0,
        manaGain: 0,
        radius: 2.0,
        duration: 0,
        effects: [
          { type: 'buff', stat: 'magicRes', value: 25, scaling: { int: 0.6 } }
        ]
      }
    ]
  },
  {
    id: 'tank',
    name: 'Armored Golem',
    desc: 'Heavy physical armor juggernaut with reactive stone plating.',
    hp: 600,
    armor: 55, // 55% physical armor -> physical attacks reduced, weak to magic
    magicRes: 5, // 5% magic resistance -> vulnerable to Pulse Laser & Railgun
    moveSpeed: 1.1,
    bounty: 45,
    count: 5,
    spawnInterval: 2.0,
    color: '#8b5cf6',
    baseStats: {
      STR: 25,
      INT: 2,
      AGI: 3,
      VIT: 35,
      baseHp: 600,
      baseDef: 55,
      baseMres: 5,
      baseSpeed: 1.1,
      baseBounty: 45,
      baseMana: 60
    },
    skills: [
      {
        id: 'hardened_carapace',
        name: 'Hardened Carapace',
        type: 'passive',
        trigger: 'on_hit',
        cooldown: 3.0,
        manaCost: 0,
        manaGain: 0,
        radius: 1.5,
        duration: 2.0,
        effects: [
          { type: 'buff', stat: 'armor', value: 15, scaling: { vit: 0.5 }, duration: 2.0 }
        ]
      },
      {
        id: 'earthen_bulwark',
        name: 'Earthen Bulwark',
        type: 'passive',
        trigger: 'on_hp_below_30',
        cooldown: 12.0,
        manaCost: 0,
        manaGain: 0,
        radius: 2.0,
        duration: 6.0,
        effects: [
          { type: 'shield', value: 150, scaling: { vit: 3.0 }, duration: 6.0 }
        ]
      }
    ]
  },
  {
    id: 'swarm',
    name: 'Vermin Swarm',
    desc: 'Low health rapid cluster that frenzies and regenerates kin upon death.',
    hp: 45,
    armor: 0,
    magicRes: 0,
    moveSpeed: 2.7,
    bounty: 8,
    count: 24,
    spawnInterval: 0.35,
    color: '#ec4899',
    baseStats: {
      STR: 2,
      INT: 4,
      AGI: 20,
      VIT: 3,
      baseHp: 45,
      baseDef: 0,
      baseMres: 0,
      baseSpeed: 2.7,
      baseBounty: 8,
      baseMana: 40
    },
    skills: [
      {
        id: 'swarm_frenzy',
        name: 'Hive Rush',
        type: 'passive',
        trigger: 'on_hit',
        cooldown: 2.0,
        manaCost: 0,
        manaGain: 0,
        radius: 1.5,
        duration: 1.5,
        effects: [
          { type: 'buff', stat: 'moveSpeed', value: 20, scaling: { agi: 0.5 }, duration: 1.5 }
        ]
      },
      {
        id: 'death_spore',
        name: 'Death Spore Restoration',
        type: 'passive',
        trigger: 'on_kill',
        cooldown: 0,
        manaCost: 0,
        manaGain: 0,
        radius: 2.5,
        duration: 0,
        effects: [
          { type: 'heal', value: 15, scaling: { int: 1.0 }, target: 'all_targets' }
        ]
      }
    ]
  },
  {
    id: 'boss',
    name: 'Apex Behemoth',
    desc: 'Fortified colossal boss entity with devastating aura and catastrophe enrage.',
    hp: 1800,
    armor: 35,
    magicRes: 35,
    moveSpeed: 0.85,
    bounty: 150,
    count: 1,
    spawnInterval: 3.0,
    color: '#dc2626',
    baseStats: {
      STR: 40,
      INT: 30,
      AGI: 8,
      VIT: 50,
      baseHp: 1800,
      baseDef: 35,
      baseMres: 35,
      baseSpeed: 0.85,
      baseBounty: 150,
      baseMana: 250
    },
    skills: [
      {
        id: 'cataclysm_enrage',
        name: 'Cataclysm Enrage',
        type: 'active',
        trigger: 'on_hp_below_50',
        cooldown: 20.0,
        manaCost: 0,
        manaGain: 50,
        radius: 4.0,
        duration: 8.0,
        effects: [
          { type: 'buff', stat: 'moveSpeed', value: 35, scaling: { str: 0.4 }, duration: 8.0 },
          { type: 'shield', value: 300, scaling: { vit: 4.0 }, duration: 8.0 }
        ]
      },
      {
        id: 'dread_aura',
        name: 'Dread Presence',
        type: 'aura',
        trigger: 'aura',
        cooldown: 0,
        manaCost: 0,
        manaGain: 0,
        radius: 4.0,
        duration: 0,
        effects: [
          { type: 'debuff', stat: 'attackSpeed', value: 15, scaling: { int: 0.3 } }
        ]
      },
      {
        id: 'retaliation_pulse',
        name: 'Retaliation Pulse',
        type: 'active',
        trigger: 'on_hit',
        cooldown: 4.0,
        manaCost: 20,
        manaGain: 0,
        radius: 3.0,
        duration: 0,
        effects: [
          { type: 'damage', value: 35, scaling: { str: 1.5, int: 1.5 }, damageType: 'magical' }
        ]
      }
    ]
  }
];

export const DEFAULT_ENEMY_ID = 'grunt';

export function getEnemyPreset(id, customList = ENEMY_TYPES) {
  const list = customList || ENEMY_TYPES;
  return list.find(e => e.id === id) || list[0];
}

/**
 * Computes complete system derived stats for an enemy archetype or customized wave entity.
 * Routes through computeDerivedStats from the combat engine.
 * @param {string|Object} idOrObj - Enemy id or partial enemy config object
 * @param {Array} [customList=ENEMY_TYPES] - Optional custom enemy definitions
 * @returns {Object} Full derived stats object matching the system stats
 */
export function getEnemyStats(idOrObj, customList = ENEMY_TYPES) {
  const preset = typeof idOrObj === 'string'
    ? getEnemyPreset(idOrObj, customList)
    : (customList.find(e => e.id === idOrObj?.id) || idOrObj || getEnemyPreset(DEFAULT_ENEMY_ID));

  const baseAttributes = {
    STR: preset.baseStats?.STR ?? 10,
    INT: preset.baseStats?.INT ?? 10,
    AGI: preset.baseStats?.AGI ?? 10,
    VIT: preset.baseStats?.VIT ?? 10
  };

  const mergedStats = {
    ...preset.baseStats,
    baseHp: preset.hp ?? preset.baseStats?.baseHp ?? 150,
    baseDef: preset.armor ?? preset.baseStats?.baseDef ?? 15,
    baseMres: preset.magicRes ?? preset.baseStats?.baseMres ?? 15,
    baseSpeed: preset.moveSpeed ?? preset.baseStats?.baseSpeed ?? 2.0,
    baseBounty: preset.bounty ?? preset.baseStats?.baseBounty ?? 15,
    damageType: 'physical',
    skills: preset.skills || []
  };

  const derived = computeDerivedStats(baseAttributes, mergedStats);

  return {
    ...derived,
    id: preset.id,
    name: preset.name,
    desc: preset.desc,
    color: preset.color,
    hp: preset.hp ?? derived.maxHp,
    maxHp: preset.hp ?? derived.maxHp,
    armor: preset.armor ?? derived.defense,
    magicRes: preset.magicRes ?? derived.magicResist,
    moveSpeed: preset.moveSpeed ?? mergedStats.baseSpeed,
    bounty: preset.bounty ?? mergedStats.baseBounty,
    count: preset.count ?? 10,
    spawnInterval: preset.spawnInterval ?? 1.0,
    skills: preset.skills || [],
    attributes: baseAttributes,
    baseStats: preset.baseStats
  };
}
