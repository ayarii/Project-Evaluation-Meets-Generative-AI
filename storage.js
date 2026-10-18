export const STORAGE_KEYS = Object.freeze({
  rubricV1: "edueval-ai-rubric:v1",
  rubricV2: "edueval-ai-rubric:v2",
  competencesV1: "edueval-ai-competences:v1",
  competencesV2: "edueval-ai-competences:v2",
});

export function readStoredState(storageKey, fallbackFactory, legacyKeys = [], storage = globalThis.localStorage) {
  if (!storage) return fallbackFactory();

  const raw = storage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallbackFactory();
    } catch {
      storage.removeItem(storageKey);
    }
  }

  for (const legacyKey of legacyKeys) {
    const legacyValue = storage.getItem(legacyKey);
    if (!legacyValue) continue;
    try {
      const parsed = JSON.parse(legacyValue);
      const migrated = parsed && typeof parsed === "object" ? parsed : fallbackFactory();
      storage.setItem(storageKey, JSON.stringify(migrated));
      storage.removeItem(legacyKey);
      return migrated;
    } catch {
      storage.removeItem(legacyKey);
    }
  }

  return fallbackFactory();
}

export function writeStoredState(storageKey, state, storage = globalThis.localStorage) {
  if (!storage) return state;
  storage.setItem(storageKey, JSON.stringify(state));
  return state;
}
