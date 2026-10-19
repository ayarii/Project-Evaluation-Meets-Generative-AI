import { LEVELS } from "./scoring.js";

export const CURRENT_VERSION = 3;

const emptyState = () => ({
  version: CURRENT_VERSION,
  meta: {},
  criteria: {},
  notes: {},
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function migrateCompetences(state) {
  if (!isRecord(state)) return emptyState();

  const meta = isRecord(state.meta) ? state.meta : {};
  const notes = isRecord(state.notes) ? state.notes : {};
  const source = state.version === CURRENT_VERSION && isRecord(state.criteria)
    ? state.criteria
    : state.version === 2 && isRecord(state.criteria)
      ? state.criteria
      : isRecord(state.levels)
        ? state.levels
        : {};
  const criteria = {};

  for (const [id, entry] of Object.entries(source)) {
    const level = typeof entry === "string" ? entry : entry?.level;
    criteria[id] = {
      level: LEVELS.includes(level) ? level : null,
      note: null,
    };
    if (state.version === CURRENT_VERSION && entry && Object.hasOwn(entry, "note")) {
      criteria[id].note = entry.note;
    }
  }

  return { version: CURRENT_VERSION, meta, criteria, notes };
}
