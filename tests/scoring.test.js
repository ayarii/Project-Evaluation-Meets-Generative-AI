import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_LEVEL_BANDS,
  LEVELS,
  NOTE_STEP,
  computeCompetenceTotals,
  levelPointsInterval,
  normalizeNote,
} from "../lib/scoring.js";
import { CURRENT_VERSION, migrateCompetences } from "../lib/migrate.js";
import { buildCompetenceExport } from "../lib/competence-export.js";

const rubric = [
  { id: "tech", max: 40, criteria: [{ id: "func", max: 30 }, { id: "understand", max: 10 }] },
  { id: "quality", max: 30, criteria: [{ id: "code", max: 15 }, { id: "ux", max: 15 }] },
];

const tenCriterionRubric = [{
  id: "all",
  max: 100,
  criteria: [30, 10, 15, 15, 8, 6, 6, 4, 3, 3].map((max, index) => ({ id: `c${index}`, max })),
}];

test("LEVELS exports A through D in order", () => {
  assert.deepEqual(LEVELS, ["A", "B", "C", "D"]);
  assert.equal(NOTE_STEP, 0.5);
  assert.deepEqual(DEFAULT_LEVEL_BANDS, {
    A: { min: 90, max: 100 },
    B: { min: 75, max: 89 },
    C: { min: 60, max: 74 },
    D: { min: 0, max: 59 },
  });
});

test("levelPointsInterval returns the B interval for a 30 point criterion", () => {
  assert.deepEqual(levelPointsInterval(30, "B"), { min: 22.5, max: 26.7 });
  assert.deepEqual(levelPointsInterval(20, "X", { X: { min: 50, max: 75 } }), { min: 10, max: 15 });
});

test("levelPointsInterval rounds decimal point bounds to tenths", () => {
  assert.deepEqual(levelPointsInterval(15, "B"), { min: 11.3, max: 13.4 });
});

test("levelPointsInterval throws for an unknown level", () => {
  assert.throws(() => levelPointsInterval(10, "Z"), RangeError);
});

test("normalizeNote leaves empty, null and invalid notes unassigned", () => {
  assert.equal(normalizeNote("", 30), null);
  assert.equal(normalizeNote(null, 30), null);
  assert.equal(normalizeNote("not a number", 30), null);
});

test("normalizeNote preserves an explicitly entered zero", () => {
  assert.equal(normalizeNote(0, 30), 0);
});

test("normalizeNote bounds notes to the criterion maximum and minimum", () => {
  assert.equal(normalizeNote(-2, 30), 0);
  assert.equal(normalizeNote(40, 30), 30);
});

test("normalizeNote rounds to the nearest half point", () => {
  assert.equal(normalizeNote(2.24, 30), 2);
  assert.equal(normalizeNote(2.25, 30), 2.5);
  assert.equal(normalizeNote(2.74, 30), 2.5);
  assert.equal(normalizeNote(2.75, 30), 3);
  assert.equal(normalizeNote(2.8, 10, 0.25), 2.75);
});

test("criteria with no level or note are not evaluated", () => {
  const totals = computeCompetenceTotals(rubric, {});
  assert.equal(totals.byCriterion.func.status, "not_evaluated");
  assert.equal(totals.evaluatedCount, 0);
  assert.equal(totals.points, 0);
});

test("a level without a note is level_only, not zero", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: null } });
  assert.equal(totals.byCriterion.func.status, "level_only");
  assert.equal(totals.byCriterion.func.note, null);
  assert.equal(totals.points, 0);
});

test("a note without a valid level is note_only", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "unknown", note: 12 } });
  assert.equal(totals.byCriterion.func.status, "note_only");
  assert.equal(totals.byCriterion.func.level, null);
  assert.equal(totals.points, 0);
});

test("a valid level and note make a criterion evaluated", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 25 } });
  assert.equal(totals.byCriterion.func.status, "evaluated");
  assert.equal(totals.evaluatedCount, 1);
  assert.equal(totals.points, 25);
});

test("corrupt imported notes are normalized to the criterion bounds", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 99 } });
  assert.equal(totals.byCriterion.func.note, 30);
  assert.equal(totals.points, 30);
});

test("position includes notes on either interval boundary", () => {
  const totals = computeCompetenceTotals(rubric, {
    func: { level: "B", note: 22.5 },
    understand: { level: "B", note: 8.9 },
  });
  assert.equal(totals.byCriterion.func.position, "inside");
  assert.equal(totals.byCriterion.understand.position, "inside");
});

test("position marks a note below its level interval", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 20 } });
  assert.equal(totals.byCriterion.func.position, "below");
});

test("position marks a note above its level interval", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 29 } });
  assert.equal(totals.byCriterion.func.position, "above");
});

test("incomplete totals sum only criteria with both a level and note", () => {
  const totals = computeCompetenceTotals(rubric, {
    func: { level: "B", note: 25 },
    understand: { level: "A", note: null },
    code: { level: null, note: 10 },
  });
  assert.equal(totals.points, 25);
  assert.equal(totals.evaluatedCount, 1);
  assert.equal(totals.complete, false);
});

test("incomplete grids do not expose final scores", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 25 } });
  assert.equal(totals.on100, null);
  assert.equal(totals.on20, null);
  assert.equal(totals.range20, null);
});

test("level intervals count toward ranges even before notes are entered", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: null } });
  assert.deepEqual(totals.rangePoints, { min: 22.5, max: 26.7 });
});

test("full ten-criterion B evaluation sums the manually entered notes", () => {
  const notes = [26, 8.5, 13, 13, 7, 5, 5, 2.5, 1.5, 1];
  const criteria = Object.fromEntries(notes.map((note, index) => [`c${index}`, { level: "B", note }]));
  const totals = computeCompetenceTotals(tenCriterionRubric, criteria);
  assert.equal(totals.complete, true);
  assert.equal(totals.points, 82.5);
  assert.equal(totals.on100, 82.5);
  assert.equal(totals.on20, 16.5);
});

test("complete B evaluation reports the full level interval range", () => {
  const criteria = Object.fromEntries(tenCriterionRubric[0].criteria.map(({ id }) => [id, { level: "B", note: 8 }]));
  const totals = computeCompetenceTotals(tenCriterionRubric, criteria);
  assert.deepEqual(totals.rangePoints, { min: 75, max: 89 });
  assert.deepEqual(totals.range20, { min: 15, max: 17.8 });
});

test("section totals report evaluated weights and ranges", () => {
  const totals = computeCompetenceTotals(rubric, {
    func: { level: "B", note: 25 },
    understand: { level: "A", note: 9 },
    code: { level: "C", note: null },
  });
  assert.deepEqual(totals.bySection.tech, {
    max: 40,
    total: 34,
    evaluated: 2,
    levelCount: 2,
    points: 34,
    maxEvaluated: 40,
    range: { min: 31.5, max: 36.7 },
  });
  assert.equal(totals.bySection.quality.levelCount, 1);
});

test("byCriterion exposes status, normalized note, interval and position", () => {
  const totals = computeCompetenceTotals(rubric, { func: { level: "B", note: 20 } });
  assert.deepEqual(totals.byCriterion.func, {
    status: "evaluated",
    level: "B",
    note: 20,
    interval: { min: 22.5, max: 26.7 },
    position: "below",
  });
});

test("v1 migration preserves levels and observations but creates no notes", () => {
  const migrated = migrateCompetences({
    version: 1,
    meta: { projectName: "Legacy" },
    levels: { func: "A", understand: "" },
    notes: { func: "teacher comment" },
  });
  assert.equal(migrated.version, CURRENT_VERSION);
  assert.deepEqual(migrated.criteria, { func: { level: "A", note: null }, understand: { level: null, note: null } });
  assert.deepEqual(migrated.notes, { func: "teacher comment" });
});

test("v2 migration preserves levels but drops generated scores and proof data", () => {
  const migrated = migrateCompetences({
    version: 2,
    meta: { projectName: "Intermediate" },
    criteria: { func: { level: "B", scorePct: 82, status: "evaluated", url: "https://example.test" } },
    notes: { func: "Observation" },
    proofs: { func: [{ url: "https://example.test", status: "seen" }] },
  });
  assert.deepEqual(migrated.criteria, { func: { level: "B", note: null } });
  assert.deepEqual(migrated.notes, { func: "Observation" });
  assert.equal("proofs" in migrated, false);
});

test("v3 migration is idempotent", () => {
  const state = { version: 3, meta: { projectName: "Current" }, criteria: { func: { level: "C", note: 18 } }, notes: {} };
  assert.deepEqual(migrateCompetences(state), state);
});

test("migration returns an empty v3 state for invalid inputs", () => {
  for (const invalid of [null, 42, [], "invalid"]) {
    assert.deepEqual(migrateCompetences(invalid), { version: 3, meta: {}, criteria: {}, notes: {} });
  }
});

test("JSON export contains v3 manual notes, intervals and totals only", () => {
  const payload = buildCompetenceExport(rubric, {
    meta: { projectName: "Demo" },
    criteria: { func: { level: "B", note: 25 } },
    notes: { func: "Justification" },
  });
  assert.equal(payload.version, 3);
  assert.deepEqual(payload.criteria.func, {
    level: "B",
    note: 25,
    status: "evaluated",
    interval: { min: 22.5, max: 26.7 },
  });
  assert.deepEqual(payload.sections.tech, { points: 25, range: { min: 22.5, max: 26.7 } });
  assert.equal(payload.totals.complete, false);
  assert.equal(payload.totals.points, 25);
  assert.equal(JSON.stringify(payload).includes("scorePct"), false);
  assert.equal(JSON.stringify(payload).includes("proof"), false);
});
