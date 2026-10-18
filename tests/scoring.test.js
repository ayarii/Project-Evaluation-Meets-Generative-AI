import test from "node:test";
import assert from "node:assert/strict";

import {
  LEVELS,
  DEFAULT_LEVEL_BANDS,
  bandMidpoint,
  clampScoreToBand,
  criterionPoints,
  makeEvaluation,
  computeCompetenceTotals,
  validateRubricStructure,
} from "../lib/scoring.js";

import { LEGACY_SCORES, migrateCompetencesV1 } from "../lib/migrate.js";

const rubric = [
  {
    id: "tech",
    max: 40,
    criteria: [
      { id: "tech_func", max: 30 },
      { id: "tech_understand", max: 10 },
    ],
  },
  {
    id: "quality",
    max: 30,
    criteria: [
      { id: "quality_code", max: 15 },
      { id: "quality_ux", max: 15 },
    ],
  },
];

test("LEVELS exports the expected order", () => {
  assert.deepEqual(LEVELS, ["A", "B", "C", "D"]);
});

test("default bands respect the specification", () => {
  assert.deepEqual(DEFAULT_LEVEL_BANDS, {
    A: { min: 90, max: 100 },
    B: { min: 75, max: 89 },
    C: { min: 60, max: 74 },
    D: { min: 0, max: 59 },
  });
});

test("band midpoint returns the expected value", () => {
  assert.equal(bandMidpoint("A"), 95);
  assert.equal(bandMidpoint("B"), 82);
  assert.equal(bandMidpoint("C"), 67);
  assert.equal(bandMidpoint("D"), 30);
});

test("unknown band raises RangeError", () => {
  assert.throws(() => bandMidpoint("Z"), RangeError);
});

test("clampScoreToBand returns the band midpoint for invalid values", () => {
  assert.equal(clampScoreToBand("A", ""), 95);
  assert.equal(clampScoreToBand("B", null), 82);
  assert.equal(clampScoreToBand("C", Number.NaN), 67);
});

test("clampScoreToBand bounds a score within the selected band", () => {
  assert.equal(clampScoreToBand("A", 100), 100);
  assert.equal(clampScoreToBand("A", 10), 90);
  assert.equal(clampScoreToBand("D", 80), 59);
});

test("clampScoreToBand raises on unknown level", () => {
  assert.throws(() => clampScoreToBand("Z", 50), RangeError);
});

test("criterionPoints rounds to one decimal place", () => {
  assert.equal(criterionPoints(30, 95), 28.5);
  assert.equal(criterionPoints(10, 82), 8.2);
  assert.equal(criterionPoints(15, 67), 10.1);
});

test("makeEvaluation fills the midpoint by default", () => {
  const evaluation = makeEvaluation("C");
  assert.deepEqual(evaluation, { level: "C", scorePct: 67, status: "evaluated" });
});

test("makeEvaluation clamps the score within the selected interval", () => {
  const evaluation = makeEvaluation("B", 100);
  assert.equal(evaluation.scorePct, 89);
});

test("computeCompetenceTotals sums evaluated criteria in a section", () => {
  const criteriaState = {
    tech_func: { level: "A", scorePct: 95, status: "evaluated" },
    tech_understand: { level: "B", scorePct: 82, status: "evaluated" },
    quality_code: { level: "C", scorePct: 67, status: "evaluated" },
    quality_ux: { level: "D", scorePct: 45, status: "evaluated" },
  };

  const totals = computeCompetenceTotals(rubric, criteriaState);
  assert.equal(totals.totalCriteria, 4);
  assert.equal(totals.evaluatedCount, 4);
  assert.equal(totals.complete, true);
  assert.equal(totals.points, 53.6);
  assert.equal(totals.on20, 15.3);
});

test("computeCompetenceTotals keeps partial totals open while incomplete", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: { level: "A", scorePct: 95, status: "evaluated" },
  });

  assert.equal(totals.complete, false);
  assert.equal(totals.on100, null);
  assert.equal(totals.on20, null);
  assert.equal(totals.evaluatedCount, 1);
});

test("rangePoints tracks lower and upper bounds for each evaluated criterion", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: { level: "A", scorePct: 95, status: "evaluated" },
    tech_understand: { level: "B", scorePct: 82, status: "evaluated" },
    quality_code: { level: "C", scorePct: 67, status: "evaluated" },
    quality_ux: { level: "D", scorePct: 45, status: "evaluated" },
  });

  assert.equal(totals.rangePoints.min, 43.5);
  assert.equal(totals.rangePoints.max, 58.8);
});

test("section totals include points and evaluation counts", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: { level: "A", scorePct: 95, status: "evaluated" },
    tech_understand: { level: "B", scorePct: 82, status: "evaluated" },
  });

  assert.equal(totals.bySection.tech.points, 36.7);
  assert.equal(totals.bySection.tech.evaluated, 2);
  assert.equal(totals.bySection.quality.points, 0);
});

test("not_evaluated entries are excluded from totals", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: { level: "A", scorePct: 95, status: "not_evaluated" },
    tech_understand: { level: "B", scorePct: 82, status: "evaluated" },
    quality_code: { level: "C", scorePct: 67, status: "evaluated" },
    quality_ux: { level: "D", scorePct: 45, status: "evaluated" },
  });

  assert.equal(totals.evaluatedCount, 3);
  assert.equal(totals.complete, false);
});

test("validateRubricStructure accepts a valid structure", () => {
  const result = validateRubricStructure(rubric);
  assert.equal(result.valid, true);
  assert.equal(result.totalMax, 70);
});

test("validateRubricStructure flags duplicates and mismatched section maxima", () => {
  const result = validateRubricStructure([
    {
      id: "tech",
      max: 41,
      criteria: [
        { id: "a", max: 20 },
        { id: "a", max: 20 },
      ],
    },
  ]);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.includes("duplicate")));
  assert.ok(result.issues.some((issue) => issue.includes("max mismatch")));
});

test("validateRubricStructure fails on non-array inputs", () => {
  const result = validateRubricStructure(null);
  assert.equal(result.valid, false);
  assert.ok(result.issues.length > 0);
});

test("legacy scores use the expected defaults", () => {
  assert.equal(LEGACY_SCORES.A, 95);
  assert.equal(LEGACY_SCORES.B, 82);
  assert.equal(LEGACY_SCORES.C, 67);
  assert.equal(LEGACY_SCORES.D, 45);
});

test("migrateCompetencesV1 converts legacy level entries to version 2", () => {
  const migrated = migrateCompetencesV1({
    meta: { projectName: "Demo" },
    levels: { tech_func: "A", tech_understand: "C" },
    notes: { tech_func: "note" },
  });

  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.criteria.tech_func, { level: "A", scorePct: 95, status: "migrated_default" });
  assert.deepEqual(migrated.criteria.tech_understand, { level: "C", scorePct: 67, status: "migrated_default" });
  assert.equal(migrated.meta.projectName, "Demo");
});

test("migrateCompetencesV1 converts blank legacy entries to not_evaluated", () => {
  const migrated = migrateCompetencesV1({
    levels: { tech_func: "" },
  });

  assert.deepEqual(migrated.criteria.tech_func, { level: null, scorePct: null, status: "not_evaluated" });
});

test("migrateCompetencesV1 is idempotent on version 2 inputs", () => {
  const original = { version: 2, meta: { projectName: "Ok" }, criteria: { tech_func: { level: "B", scorePct: 82, status: "evaluated" } }, notes: { tech_func: "ok" } };
  const migrated = migrateCompetencesV1(original);
  assert.deepEqual(migrated, original);
});

test("migrateCompetencesV1 sanitizes invalid input without throwing", () => {
  assert.doesNotThrow(() => migrateCompetencesV1(null));
  assert.doesNotThrow(() => migrateCompetencesV1([]));
  assert.doesNotThrow(() => migrateCompetencesV1(42));
  assert.deepEqual(migrateCompetencesV1([]), { version: 2, meta: {}, criteria: {}, notes: {} });
});

test("empty state migration defaults to a clean version 2 payload", () => {
  const migrated = migrateCompetencesV1({});
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.criteria, {});
  assert.deepEqual(migrated.notes, {});
});

test("migrateCompetencesV1 tolerates malformed notes and metadata", () => {
  const migrated = migrateCompetencesV1({ levels: { tech_func: "A" }, notes: "bad", meta: null });
  assert.equal(migrated.meta.projectName, undefined);
  assert.deepEqual(migrated.criteria.tech_func, { level: "A", scorePct: 95, status: "migrated_default" });
});

test("criterionPoints handles zero and negative values safely", () => {
  assert.equal(criterionPoints(10, 0), 0);
  assert.equal(criterionPoints(10, -10), -1);
});

test("makeEvaluation rejects unknown levels with RangeError", () => {
  assert.throws(() => makeEvaluation("Z"), RangeError);
});

test("computeCompetenceTotals ignores invalid states and malformed entries", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: null,
    tech_understand: { level: "B", scorePct: 82, status: "migrated_default" },
    quality_code: { level: "Z", scorePct: 90, status: "evaluated" },
    quality_ux: { level: "D", scorePct: 45, status: "evaluated" },
  });

  assert.equal(totals.evaluatedCount, 2);
  assert.equal(totals.complete, false);
});

test("computeCompetenceTotals handles a fully evaluated set with all B values", () => {
  const totals = computeCompetenceTotals(rubric, {
    tech_func: { level: "B", scorePct: 82, status: "evaluated" },
    tech_understand: { level: "B", scorePct: 82, status: "evaluated" },
    quality_code: { level: "B", scorePct: 82, status: "evaluated" },
    quality_ux: { level: "B", scorePct: 82, status: "evaluated" },
  });

  assert.equal(totals.points, 57.4);
  assert.equal(totals.on20, 16.4);
  assert.equal(totals.range20.min, 15.0);
  assert.equal(totals.range20.max, 17.8);
});
