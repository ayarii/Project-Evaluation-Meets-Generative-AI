import test from "node:test";
import assert from "node:assert/strict";

import { readStoredState, writeStoredState, STORAGE_KEYS } from "../storage.js";

function makeStore(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("reads the v2 storage key and falls back to v1 when needed", () => {
  const legacyStore = makeStore({ [STORAGE_KEYS.rubricV1]: JSON.stringify({ meta: { projectName: "Legacy" } }) });
  const state = readStoredState(STORAGE_KEYS.rubricV2, () => ({ meta: {} }), [STORAGE_KEYS.rubricV1], legacyStore);
  assert.equal(state.meta.projectName, "Legacy");
  assert.equal(legacyStore.getItem(STORAGE_KEYS.rubricV1), null);
  assert.equal(legacyStore.getItem(STORAGE_KEYS.rubricV2), JSON.stringify(state));
});

test("writeStoredState persists the latest version", () => {
  const store = makeStore();
  const state = { meta: { projectName: "Demo" } };
  writeStoredState(STORAGE_KEYS.rubricV2, state, store);
  assert.equal(store.getItem(STORAGE_KEYS.rubricV2), JSON.stringify(state));
});
