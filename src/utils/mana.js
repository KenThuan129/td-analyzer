/**
 * Pure-function Mana Management Module for Entities and Towers
 * Implements mana regeneration rates, cast checks, and state transitions.
 */

/**
 * Calculates mana regeneration rate per second: 0.5 + INT * 0.05.
 * @param {Object|number} stats - Entity stats or raw INT attribute value
 * @returns {number} Mana regenerated per second
 */
export function manaRegenRate(stats = {}) {
  const intVal = typeof stats === 'number'
    ? stats
    : Number(stats?.INT ?? stats?.int ?? stats?.attributes?.INT ?? stats?.attributes?.int ?? 0);

  return Number((0.5 + intVal * 0.05).toFixed(3));
}

/**
 * Validates whether an entity has enough mana and cooldown is ready to cast a skill.
 * @param {Object} skill - Skill definition object { id, manaCost, cooldown }
 * @param {Object} entity - Entity with currentMana, cooldowns/cooldownTimestamps
 * @returns {boolean} True if ready to cast
 */
export function canCast(skill = {}, entity = {}) {
  if (!skill) return false;

  // 1. Mana check
  const currentMana = Number(entity.currentMana ?? entity.maxMana ?? 0);
  const cost = Number(skill.manaCost ?? 0);
  if (currentMana < cost) {
    return false;
  }

  // 2. Cooldown check
  const skillId = skill.id;
  if (skillId) {
    // Check numeric cooldown timers (seconds or ticks remaining)
    if (entity.cooldowns && entity.cooldowns[skillId] !== undefined) {
      if (Number(entity.cooldowns[skillId]) > 0) return false;
    }

    // Check epoch timestamp based cooldowns
    if (entity.cooldownTimestamps && entity.cooldownTimestamps[skillId] !== undefined) {
      if (Number(entity.cooldownTimestamps[skillId]) > Date.now()) return false;
    }
  }

  return true;
}

/**
 * Purely deducts mana from an entity, clamped at 0.
 * @param {Object} entity - Entity with currentMana
 * @param {number} amount - Mana cost to spend
 * @returns {Object} New entity state with updated currentMana
 */
export function spendMana(entity = {}, amount = 0) {
  const current = Number(entity.currentMana ?? entity.maxMana ?? 0);
  const cost = Math.max(0, Number(amount || 0));
  const currentMana = Math.max(0, Math.round((current - cost) * 100) / 100);

  return {
    ...entity,
    currentMana
  };
}

/**
 * Purely adds mana to an entity, clamped at maxMana.
 * @param {Object} entity - Entity with currentMana and maxMana
 * @param {number} amount - Mana to gain
 * @returns {Object} New entity state with updated currentMana
 */
export function gainMana(entity = {}, amount = 0) {
  const current = Number(entity.currentMana ?? 0);
  const max = Number(entity.maxMana ?? 100);
  const gain = Math.max(0, Number(amount || 0));
  const currentMana = Math.min(max, Math.round((current + gain) * 100) / 100);

  return {
    ...entity,
    currentMana
  };
}
