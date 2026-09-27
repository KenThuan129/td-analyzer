/**
 * Pure-function Skills Engine for Tower Defense
 * Skill Schema: { id, type: 'active'|'passive'|'aura', trigger, cooldown, manaCost, manaGain, radius, duration, effects[] }
 * Supports attribute scaling (STR / INT / AGI / VIT) and outputs event arrays.
 */

export const SKILL_TYPES = {
  ACTIVE: 'active',
  PASSIVE: 'passive',
  AURA: 'aura'
};

export const TRIGGER_TYPES = {
  ON_ATTACK: 'on_attack',
  ON_HIT: 'on_hit',
  ON_KILL: 'on_kill',
  PERIODIC: 'periodic',
  AURA: 'aura',
  ON_HP_BELOW_X: 'on_hp_below_x',
  COOLDOWN: 'cooldown',
  MANUAL: 'manual'
};

export const EFFECT_TYPES = {
  DAMAGE: 'damage',
  HEAL: 'heal',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  SHIELD: 'shield',
  SLOW: 'slow',
  SPAWN: 'spawn',
  GAIN_GOLD: 'gain_gold',
  SPEND_MANA: 'spend_mana',
  GAIN_MANA: 'gain_mana'
};

/**
 * Resolves an effect's numerical value by applying attribute scaling from the caster.
 * e.g., { int: 3.0 } adds 3 * INT to the base value.
 * @param {number} baseValue - Base effect value
 * @param {Object} [scaling={}] - Attribute multipliers { str, int, agi, vit }
 * @param {Object} [caster={}] - Entity with attributes/baseStats
 * @returns {number} Final calculated value
 */
export function resolveEffectValue(baseValue = 0, scaling = {}, caster = {}) {
  const attrs = caster?.attributes || caster?.baseStats || caster || {};
  const str = Number(attrs.STR ?? attrs.str ?? 0);
  const intVal = Number(attrs.INT ?? attrs.int ?? 0);
  const agi = Number(attrs.AGI ?? attrs.agi ?? 0);
  const vit = Number(attrs.VIT ?? attrs.vit ?? 0);

  let bonus = 0;
  if (scaling) {
    if (scaling.str || scaling.STR) bonus += Number(scaling.str || scaling.STR) * str;
    if (scaling.int || scaling.INT) bonus += Number(scaling.int || scaling.INT) * intVal;
    if (scaling.agi || scaling.AGI) bonus += Number(scaling.agi || scaling.AGI) * agi;
    if (scaling.vit || scaling.VIT) bonus += Number(scaling.vit || scaling.VIT) * vit;
  }

  return Number((Number(baseValue || 0) + bonus).toFixed(2));
}

/**
 * Validates whether a skill can trigger under current cooldown and context conditions.
 * @param {Object} skill - Skill definition object
 * @param {Object} [cooldownState={}] - Current cooldown values mapped by skill id
 * @param {Object} [context={}] - Invocation context { trigger, caster, targets, worldState }
 * @returns {boolean} True if the skill trigger conditions are met
 */
export function canTriggerSkill(skill = {}, cooldownState = {}, context = {}) {
  if (!skill || !skill.id) return false;

  // 1. Cooldown validation
  if (cooldownState && cooldownState[skill.id] !== undefined) {
    if (Number(cooldownState[skill.id]) > 0) return false;
  }

  // 2. Trigger condition validation
  const skillTrigger = String(skill.trigger || 'cooldown').toLowerCase();
  const ctxTrigger = String(context.trigger || '').toLowerCase();

  // Evaluate on_hp_below_X triggers (e.g. 'on_hp_below_50', 'on_hp_below_30', 'on_hp_below_x')
  const hpBelowMatch = skillTrigger.match(/^on_hp_below_(\d+)$/);
  const isHpBelowTrigger = skillTrigger === TRIGGER_TYPES.ON_HP_BELOW_X || Boolean(hpBelowMatch);

  if (isHpBelowTrigger) {
    let thresholdRatio = 0.5;
    if (hpBelowMatch) {
      thresholdRatio = parseInt(hpBelowMatch[1], 10) / 100;
    } else if (skill.hpThreshold !== undefined) {
      thresholdRatio = skill.hpThreshold > 1 ? skill.hpThreshold / 100 : Number(skill.hpThreshold);
    }

    const entity = context.entity || context.caster || context.target;
    if (!entity) return false;

    const currentHp = Number(entity.hp ?? entity.currentHp ?? entity.maxHp ?? 100);
    const maxHp = Number(entity.maxHp ?? entity.baseHp ?? 100);
    const currentRatio = maxHp > 0 ? (currentHp / maxHp) : 1;

    // Check if HP is below or equal to threshold
    if (currentRatio > thresholdRatio) {
      return false;
    }

    // Context trigger check: accept on_hp_below_x, on_hit, damage_taken, periodic, tick, check_hp, or matching trigger
    const validHpContexts = ['on_hp_below_x', 'on_hit', 'damage_taken', 'periodic', 'tick', 'check_hp', skillTrigger];
    if (ctxTrigger && !validHpContexts.includes(ctxTrigger)) {
      return false;
    }
  } else if (skillTrigger === TRIGGER_TYPES.AURA || skill.type === SKILL_TYPES.AURA) {
    // Aura skills trigger on 'aura', 'periodic', or tick contexts
    const validAuraContexts = ['aura', 'periodic', 'tick', 'on_attack'];
    if (ctxTrigger && !validAuraContexts.includes(ctxTrigger) && ctxTrigger !== skillTrigger) {
      return false;
    }
  } else if (skillTrigger === TRIGGER_TYPES.PERIODIC) {
    if (ctxTrigger && !['periodic', 'tick'].includes(ctxTrigger) && ctxTrigger !== skillTrigger) {
      return false;
    }
  } else if (skillTrigger === TRIGGER_TYPES.ON_HIT) {
    if (ctxTrigger && ctxTrigger !== TRIGGER_TYPES.ON_HIT) {
      return false;
    }
  } else if (skillTrigger === TRIGGER_TYPES.ON_KILL) {
    if (ctxTrigger && ctxTrigger !== TRIGGER_TYPES.ON_KILL) {
      return false;
    }
  } else if (skillTrigger === TRIGGER_TYPES.ON_ATTACK) {
    if (ctxTrigger && ctxTrigger !== TRIGGER_TYPES.ON_ATTACK) {
      return false;
    }
  } else if (skill.trigger && ctxTrigger && skillTrigger !== ctxTrigger) {
    return false;
  }

  // 3. Mana validation
  const caster = context.caster || context.entity;
  if (caster && skill.manaCost > 0) {
    const currentMana = Number(caster.currentMana ?? caster.maxMana ?? 0);
    if (currentMana < skill.manaCost) {
      return false;
    }
  }

  // 4. Custom predicate validation if defined on skill
  if (typeof skill.condition === 'function') {
    if (!skill.condition(context)) return false;
  }

  return true;
}

/**
 * Executes eligible skills for an entity and returns triggered skills, emitted effect events, and updated cooldowns.
 * @param {Object} entity - The caster or owner entity
 * @param {Array<Object>} skills - List of skill definitions
 * @param {Object} [cooldownState={}] - Current cooldown table
 * @param {Object} [context={}] - Invocation context
 * @returns {Object} { triggeredSkills, events, nextCooldowns }
 */
export function executeEntitySkills(entity = {}, skills = [], cooldownState = {}, context = {}) {
  const mergedContext = { caster: entity, entity, ...context };
  const nextCooldowns = { ...(cooldownState || {}) };
  const triggeredSkills = [];
  const allEvents = [];

  const skillList = Array.isArray(skills) ? skills : [];

  for (const sk of skillList) {
    if (canTriggerSkill(sk, nextCooldowns, mergedContext)) {
      triggeredSkills.push(sk);
      if (sk.cooldown > 0) {
        nextCooldowns[sk.id] = sk.cooldown;
      }
      const events = applySkillEffects(sk, entity, mergedContext.targets || [], mergedContext.worldState || {});
      allEvents.push(...events);
    }
  }

  return {
    triggeredSkills,
    events: allEvents,
    nextCooldowns
  };
}

/**
 * Applies skill effects, resolving attribute scaling, and returns an array of result events:
 * damage, heal, buff, debuff, shield, slow, spawn, gain_gold, spend_mana, gain_mana.
 * @param {Object} skill - The skill being triggered
 * @param {Object} [caster={}] - The source entity casting/triggering the skill
 * @param {Array|Object} [targets=[]] - Target entity or list of target entities
 * @param {Object} [worldState={}] - Optional reference to global world state
 * @returns {Array<Object>} List of emitted effect event objects
 */
export function applySkillEffects(skill = {}, caster = {}, targets = [], worldState = {}) {
  if (!skill) return [];

  const events = [];
  const targetList = Array.isArray(targets) ? targets : (targets ? [targets] : []);
  const casterId = caster?.id || 'caster';

  // 1. Mana cost event if applicable
  if (skill.manaCost > 0) {
    events.push({
      type: EFFECT_TYPES.SPEND_MANA,
      sourceId: casterId,
      amount: skill.manaCost,
      skillId: skill.id
    });
  }

  // 2. Mana gain event if skill generates mana
  if (skill.manaGain > 0) {
    events.push({
      type: EFFECT_TYPES.GAIN_MANA,
      sourceId: casterId,
      amount: skill.manaGain,
      skillId: skill.id
    });
  }

  // 3. Process each defined effect in skill.effects
  const effects = Array.isArray(skill.effects) ? skill.effects : [];

  effects.forEach(eff => {
    if (!eff || !eff.type) return;

    const scaledValue = resolveEffectValue(eff.value ?? eff.amount ?? eff.baseValue ?? 0, eff.scaling, caster);
    const effType = eff.type;
    const duration = eff.duration ?? skill.duration;

    switch (effType) {
      case EFFECT_TYPES.DAMAGE: {
        const damageType = eff.damageType || skill.damageType || 'magical';
        if (targetList.length > 0) {
          targetList.forEach(t => {
            events.push({
              type: EFFECT_TYPES.DAMAGE,
              sourceId: casterId,
              targetId: t?.id,
              target: t,
              damage: scaledValue,
              value: scaledValue,
              amount: scaledValue,
              damageType,
              skillId: skill.id,
              skillName: skill.name
            });
          });
        } else {
          events.push({
            type: EFFECT_TYPES.DAMAGE,
            sourceId: casterId,
            targetId: null,
            damage: scaledValue,
            value: scaledValue,
            amount: scaledValue,
            damageType,
            skillId: skill.id,
            skillName: skill.name
          });
        }
        break;
      }

      case EFFECT_TYPES.HEAL: {
        const recipients = eff.target === 'self' || targetList.length === 0 ? [caster] : targetList;
        recipients.forEach(r => {
          events.push({
            type: EFFECT_TYPES.HEAL,
            sourceId: casterId,
            targetId: r?.id,
            target: r,
            amount: scaledValue,
            value: scaledValue,
            skillId: skill.id,
            skillName: skill.name
          });
        });
        break;
      }

      case EFFECT_TYPES.BUFF: {
        const recipients = eff.target === 'all_targets' ? targetList : [caster];
        recipients.forEach(r => {
          events.push({
            type: EFFECT_TYPES.BUFF,
            sourceId: casterId,
            targetId: r?.id,
            target: r,
            stat: eff.stat || 'damage',
            statKey: eff.stat || 'damage',
            value: scaledValue,
            amount: scaledValue,
            duration,
            skillId: skill.id,
            skillName: skill.name
          });
        });
        break;
      }

      case EFFECT_TYPES.DEBUFF: {
        targetList.forEach(t => {
          events.push({
            type: EFFECT_TYPES.DEBUFF,
            sourceId: casterId,
            targetId: t?.id,
            target: t,
            stat: eff.stat || 'armor',
            statKey: eff.stat || 'armor',
            value: scaledValue,
            amount: scaledValue,
            duration,
            skillId: skill.id,
            skillName: skill.name
          });
        });
        break;
      }

      case EFFECT_TYPES.SHIELD: {
        const recipients = eff.target === 'all_targets' ? targetList : [caster];
        recipients.forEach(r => {
          events.push({
            type: EFFECT_TYPES.SHIELD,
            sourceId: casterId,
            targetId: r?.id,
            target: r,
            amount: scaledValue,
            value: scaledValue,
            duration,
            skillId: skill.id,
            skillName: skill.name
          });
        });
        break;
      }

      case EFFECT_TYPES.SLOW: {
        targetList.forEach(t => {
          events.push({
            type: EFFECT_TYPES.SLOW,
            sourceId: casterId,
            targetId: t?.id,
            target: t,
            slowPct: scaledValue,
            value: scaledValue,
            amount: scaledValue,
            duration,
            skillId: skill.id,
            skillName: skill.name
          });
        });
        break;
      }

      case EFFECT_TYPES.SPAWN: {
        events.push({
          type: EFFECT_TYPES.SPAWN,
          sourceId: casterId,
          entityType: eff.entityType || 'minion',
          count: Math.max(1, Math.round(scaledValue)),
          value: Math.max(1, Math.round(scaledValue)),
          radius: skill.radius,
          skillId: skill.id,
          skillName: skill.name
        });
        break;
      }

      case EFFECT_TYPES.GAIN_GOLD: {
        events.push({
          type: EFFECT_TYPES.GAIN_GOLD,
          sourceId: casterId,
          amount: Math.round(scaledValue),
          value: Math.round(scaledValue),
          skillId: skill.id,
          skillName: skill.name
        });
        break;
      }

      case EFFECT_TYPES.SPEND_MANA: {
        events.push({
          type: EFFECT_TYPES.SPEND_MANA,
          sourceId: casterId,
          amount: Math.round(scaledValue),
          value: Math.round(scaledValue),
          skillId: skill.id,
          skillName: skill.name
        });
        break;
      }

      case EFFECT_TYPES.GAIN_MANA: {
        events.push({
          type: EFFECT_TYPES.GAIN_MANA,
          sourceId: casterId,
          amount: Math.round(scaledValue),
          value: Math.round(scaledValue),
          skillId: skill.id,
          skillName: skill.name
        });
        break;
      }

      default: {
        events.push({
          type: effType,
          sourceId: casterId,
          value: scaledValue,
          amount: scaledValue,
          skillId: skill.id,
          skillName: skill.name,
          payload: eff
        });
      }
    }
  });

  return events;
}
