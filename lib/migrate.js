import { LEVELS } from "./scoring.js";

export const LEGACY_SCORES = Object.freeze({
  A: 95,
  B: 82,
  C: 67,
  D: 45,
});

export function migrateCompetencesV1(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return { version: 2, meta: {}, criteria: {}, notes: {} };
  }

  if (state.version === 2 && state.criteria && typeof state.criteria === "object") {
    return {
      version: 2,
      meta: state.meta && typeof state.meta === "object" ? state.meta : {},
      criteria: state.criteria,
      notes: state.notes && typeof state.notes === "object" ? state.notes : {},
    };
  }

  const meta = state.meta && typeof state.meta === "object" ? state.meta : {};
  const notes = state.notes && typeof state.notes === "object" ? state.notes : {};
  const criteria = {};

  if (state.levels && typeof state.levels === "object") {
    for (const [criterionId, level] of Object.entries(state.levels)) {
      const validLevel = LEVELS.includes(level);
      if (validLevel) {
        criteria[criterionId] = {
          level,
          scorePct: LEGACY_SCORES[level],
          status: "migrated_default",
        };
      } else {
        criteria[criterionId] = {
          level: null,
          scorePct: null,
          status: "not_evaluated",
        };
      }
    }
  }

  return {
    version: 2,
    meta,
    criteria,
    notes,
  };
}
