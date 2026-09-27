/**
 * Pure-function Combat Engine for Tower Defense
 * Handles primary attributes, derived stats, damage pipeline, expected DPS, and TTK calculations.
 */

/**
 * Applies flat then multiplicative modifiers to STR / INT / AGI / VIT.
 * @param {Object} baseAttributes - { STR, INT, AGI, VIT }
 * @param {Array|Object} modifiers - Array of modifier objects [{ stat, type: 'flat'|'mult'|'percent', value }] or { flat: {}, mult: {} }
 * @returns {Object} Updated primary attributes { STR, INT, AGI, VIT }
 */
export function computePrimaryStats(baseAttributes = {}, modifiers = []) {
  const stats = ['STR', 'INT', 'AGI', 'VIT'];
  const base = {
    STR: Number(baseAttributes.STR ?? baseAttributes.str ?? 0),
    INT: Number(baseAttributes.INT ?? baseAttributes.int ?? 0),
    AGI: Number(baseAttributes.AGI ?? baseAttributes.agi ?? 0),
    VIT: Number(baseAttributes.VIT ?? baseAttributes.vit ?? 0)
  };

  const flatMods = { STR: 0, INT: 0, AGI: 0, VIT: 0 };
  const multMods = { STR: 0, INT: 0, AGI: 0, VIT: 0 };

  // Support both object { flat: {}, mult: {} } and array of modifiers
  if (Array.isArray(modifiers)) {
    modifiers.forEach(mod => {
      if (!mod) return;
      if (mod.stat && stats.includes(mod.stat.toUpperCase())) {
        const key = mod.stat.toUpperCase();
        const val = Number(mod.value ?? 0);
        if (mod.type === 'mult' || mod.type === 'percent') {
          // If value is passed as percentage like 20 for 20%, convert if > 1 and percent
          const m = mod.type === 'percent' && Math.abs(val) > 1 ? val / 100 : val;
          multMods[key] += m;
        } else {
          flatMods[key] += val;
        }
      } else if (mod.flat || mod.mult) {
        if (mod.flat) {
          stats.forEach(s => {
            if (mod.flat[s] !== undefined || mod.flat[s.toLowerCase()] !== undefined) {
              flatMods[s] += Number(mod.flat[s] ?? mod.flat[s.toLowerCase()] ?? 0);
            }
          });
        }
        if (mod.mult) {
          stats.forEach(s => {
            if (mod.mult[s] !== undefined || mod.mult[s.toLowerCase()] !== undefined) {
              multMods[s] += Number(mod.mult[s] ?? mod.mult[s.toLowerCase()] ?? 0);
            }
          });
        }
      }
    });
  } else if (typeof modifiers === 'object' && modifiers !== null) {
    if (modifiers.flat) {
      stats.forEach(s => {
        flatMods[s] += Number(modifiers.flat[s] ?? modifiers.flat[s.toLowerCase()] ?? 0);
      });
    }
    if (modifiers.mult) {
      stats.forEach(s => {
        multMods[s] += Number(modifiers.mult[s] ?? modifiers.mult[s.toLowerCase()] ?? 0);
      });
    }
  }

  const result = {};
  stats.forEach(s => {
    const afterFlat = Math.max(0, base[s] + flatMods[s]);
    const finalVal = Math.max(0, afterFlat * (1 + multMods[s]));
    result[s] = Math.round(finalVal * 100) / 100;
  });

  return result;
}

/**
 * Computes derived combat stats from primary attributes and base stats.
 * Returns physicalATK, magicalATK, critRate, critDamage, attackSpeed, maxHp, hpRegen, defense, magicResist, mana pool stats.
 * @param {Object} attributes - { STR, INT, AGI, VIT }
 * @param {Object} baseStats - Base tower/entity stats
 * @returns {Object} Complete derived stats object
 */
export function computeDerivedStats(attributes = {}, baseStats = {}) {
  const str = Number(attributes.STR ?? attributes.str ?? 0);
  const intVal = Number(attributes.INT ?? attributes.int ?? 0);
  const agi = Number(attributes.AGI ?? attributes.agi ?? 0);
  const vit = Number(attributes.VIT ?? attributes.vit ?? 0);

  const baseDmg = Number(baseStats.baseDamage ?? baseStats.damage ?? 0);
  const baseSpeed = Number(baseStats.baseAttackSpeed ?? baseStats.attackSpeed ?? 1.0);
  const baseRange = Number(baseStats.baseRange ?? baseStats.range ?? 3.5);
  const baseHp = Number(baseStats.baseHp ?? baseStats.hp ?? 100);
  const baseHpRegen = Number(baseStats.baseHpRegen ?? baseStats.hpRegen ?? 0);
  const baseDef = Number(baseStats.baseDef ?? baseStats.def ?? baseStats.defense ?? 0);
  const baseMres = Number(baseStats.baseMres ?? baseStats.magicResist ?? baseStats.magicRes ?? 0);
  const baseCritRate = Number(baseStats.baseCritRate ?? baseStats.critRate ?? 0.05);
  const baseCritDmg = Number(baseStats.baseCritDamage ?? baseStats.critDamage ?? 1.5);
  const baseMana = Number(baseStats.baseMana ?? baseStats.maxMana ?? 100);

  // Derived calculations
  const physicalATK = Math.max(0, Math.round((baseStats.basePhysicalATK ?? baseDmg) + str * 2.0));
  const magicalATK = Math.max(0, Math.round((baseStats.baseMagicalATK ?? baseDmg) + intVal * 2.0));

  const critRate = Math.min(1.0, Math.max(0, Number((baseCritRate + agi * 0.005).toFixed(3))));
  const critDamage = Math.max(1.0, Number((baseCritDmg + str * 0.01).toFixed(2)));

  const attackSpeed = Math.max(0.1, Number((baseSpeed * (1 + agi * 0.02)).toFixed(2)));

  const maxHp = Math.max(1, Math.round(baseHp + vit * 20));
  const hpRegen = Math.max(0, Number((baseHpRegen + vit * 0.2).toFixed(2)));

  const defense = Math.max(0, Math.round(baseDef + vit * 0.5 + str * 0.2));
  const magicResist = Math.max(0, Math.round(baseMres + intVal * 0.5));

  // Mana pool stats
  const maxMana = Math.max(0, Math.round(baseMana + intVal * 10));
  const manaRegen = Number((0.5 + intVal * 0.05).toFixed(2));

  // Determine active default damage based on damage type
  const isMagical = baseStats.damageType === 'magical';
  const effectiveDamage = isMagical ? magicalATK : physicalATK;

  return {
    ...baseStats,
    physicalATK,
    magicalATK,
    critRate,
    critDamage,
    attackSpeed,
    maxHp,
    hpRegen,
    defense,
    magicResist,
    maxMana,
    manaRegen,
    // Aliases & gameplay compatibility properties
    damage: baseDmg > 0 ? (isMagical ? magicalATK : physicalATK) : 0,
    range: baseRange,
    cost: baseStats.cost ?? 100,
    attributes: { STR: str, INT: intVal, AGI: agi, VIT: vit }
  };
}

/**
 * Computes damage through full pipeline:
 * amplify -> crit roll -> defense reduction via 100/(100+DEF) -> elemental resistance -> floor.
 * @param {Object} attacker - Attacker entity or stats
 * @param {Object} defender - Target entity with armor/defense/resistances
 * @param {string} damageType - 'physical' | 'magical' | 'pure'
 * @param {number} [rawDamage] - Optional raw base damage override
 * @returns {{ damage: number, isCrit: boolean }} Resulting damage and crit flag
 */
export function computeDamage(attacker = {}, defender = {}, damageType = 'physical', rawDamage) {
  // 1. Raw Base Damage
  const isMagical = damageType === 'magical';
  const isPure = damageType === 'pure';

  let base = rawDamage !== undefined
    ? Number(rawDamage)
    : Number(isMagical ? (attacker.magicalATK ?? attacker.damage ?? 0) : (attacker.physicalATK ?? attacker.damage ?? 0));

  // 2. Amplify
  let amp = 0;
  if (attacker.amplify !== undefined) {
    amp += attacker.amplify > 1 ? (attacker.amplify - 1) : attacker.amplify;
  }
  if (attacker.damageAmp !== undefined) {
    amp += attacker.damageAmp;
  }
  if (attacker.buffDmgPct !== undefined) {
    amp += Number(attacker.buffDmgPct) / 100;
  }
  const amplified = Math.max(0, base * (1 + amp));

  // 3. Crit Roll
  const critRate = Math.min(1.0, Math.max(0, Number(attacker.critRate ?? 0)));
  const isCrit = critRate > 0 && Math.random() < critRate;
  const critMultiplier = isCrit ? Number(attacker.critDamage ?? 1.5) : 1.0;
  const afterCrit = amplified * critMultiplier;

  // Pure damage bypasses all defenses and resistances
  if (isPure) {
    return {
      damage: Math.floor(Math.max(1, afterCrit)),
      isCrit
    };
  }

  // 4. Defense Reduction via 100 / (100 + DEF)
  const defVal = Math.max(
    0,
    Number(defender.defense ?? defender.armor ?? defender.baseDef ?? 0) - Number(defender.shredArmor ?? 0)
  );
  const defFactor = damageType === 'physical' ? (100 / (100 + defVal)) : 1.0;

  // 5. Elemental / Magic Resistance Reduction
  const mresVal = Math.max(
    0,
    Number(defender.magicResist ?? defender.magicRes ?? defender.baseMres ?? 0) - Number(defender.shredMagicRes ?? 0)
  );

  let resFactor = 1.0;
  if (defender.elementalRes && defender.elementalRes[damageType] !== undefined) {
    const elemRes = Number(defender.elementalRes[damageType]);
    resFactor = Math.max(0, 1 - elemRes / 100);
  } else if (isMagical) {
    // Magic resistance mitigation: 100 / (100 + MRES) or % reduction
    resFactor = 100 / (100 + mresVal);
  }

  // 6. Floor
  const finalDamage = Math.floor(Math.max(1, afterCrit * defFactor * resFactor));

  return {
    damage: finalDamage,
    isCrit
  };
}

/**
 * Computes expected DPS including crit chance and multiplier.
 * @param {Object} derivedStats - Entity derived stats
 * @param {string} [damageType] - 'physical' | 'magical'
 * @returns {number} Expected damage per second
 */
export function computeDPS(derivedStats = {}, damageType) {
  const type = damageType || derivedStats.damageType || 'physical';
  const isMagical = type === 'magical';

  const atk = Number(
    isMagical
      ? (derivedStats.magicalATK ?? derivedStats.damage ?? 0)
      : (derivedStats.physicalATK ?? derivedStats.damage ?? 0)
  );

  const critRate = Math.min(1.0, Math.max(0, Number(derivedStats.critRate ?? 0)));
  const critDmg = Number(derivedStats.critDamage ?? 1.5);

  const expectedHit = atk * (1 - critRate + critRate * critDmg);
  const attackSpeed = Number(derivedStats.attackSpeed ?? 1.0);

  return Number((expectedHit * attackSpeed).toFixed(2));
}

/**
 * Computes averaged time-to-kill against a defender.
 * @param {Object} derivedStats - Attacker derived stats
 * @param {number} [amplify=0] - Additional damage amplify percentage/multiplier
 * @param {Object} [enemyStats={}] - Target health and defense stats
 * @param {string} [damageType] - 'physical' | 'magical'
 * @returns {number} Averaged seconds to kill target
 */
export function computeTTK(derivedStats = {}, amplify = 0, enemyStats = {}, damageType) {
  const type = damageType || derivedStats.damageType || 'physical';
  const effectiveHp = Number(enemyStats.hp ?? enemyStats.maxHp ?? 100);

  const amp = Number(amplify || 0);
  const ampMult = 1 + (amp > 1 ? amp - 1 : amp);

  const isMagical = type === 'magical';
  const baseAtk = Number(
    isMagical
      ? (derivedStats.magicalATK ?? derivedStats.damage ?? 0)
      : (derivedStats.physicalATK ?? derivedStats.damage ?? 0)
  ) * ampMult;

  const critRate = Math.min(1.0, Math.max(0, Number(derivedStats.critRate ?? 0)));
  const critDmg = Number(derivedStats.critDamage ?? 1.5);
  const avgHit = baseAtk * (1 - critRate + critRate * critDmg);

  // Defense mitigation
  const defVal = Math.max(
    0,
    Number(enemyStats.defense ?? enemyStats.armor ?? 0) - Number(enemyStats.shredArmor ?? 0)
  );
  const defFactor = type === 'physical' ? (100 / (100 + defVal)) : 1.0;

  // Resistance mitigation
  const mresVal = Math.max(
    0,
    Number(enemyStats.magicResist ?? enemyStats.magicRes ?? 0) - Number(enemyStats.shredMagicRes ?? 0)
  );
  const resFactor = isMagical ? (100 / (100 + mresVal)) : 1.0;

  const avgDamagePerHit = Math.max(1, avgHit * defFactor * resFactor);
  const atkSpeed = Number(derivedStats.attackSpeed ?? 1.0);

  const expectedDps = avgDamagePerHit * atkSpeed;
  if (expectedDps <= 0) return Infinity;

  return Number((effectiveHp / expectedDps).toFixed(2));
}
