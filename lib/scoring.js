export const LEVELS = ["A", "B", "C", "D"];

export const DEFAULT_LEVEL_BANDS = Object.freeze({
  A: { min: 90, max: 100 },
  B: { min: 75, max: 89 },
  C: { min: 60, max: 74 },
  D: { min: 0, max: 59 },
});

function normalizeBands(bands) {
  return bands && typeof bands === "object" ? bands : DEFAULT_LEVEL_BANDS;
}

export function bandMidpoint(level, bands = DEFAULT_LEVEL_BANDS) {
  const selected = normalizeBands(bands)[level];
  if (!selected) {
    throw new RangeError(`Unknown level band: ${String(level)}`);
  }

  return Math.round((selected.min + selected.max) / 2);
}

export function clampScoreToBand(level, scorePct, bands = DEFAULT_LEVEL_BANDS) {
  const selected = normalizeBands(bands)[level];
  if (!selected) {
    throw new RangeError(`Unknown level band: ${String(level)}`);
  }

  const rawValue = scorePct ?? "";
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric) || rawValue === "" || rawValue === null || rawValue === undefined) {
    return bandMidpoint(level, bands);
  }

  return Math.min(selected.max, Math.max(selected.min, Math.round(numeric)));
}

export function criterionPoints(maxPoints, scorePct) {
  const pct = Number(scorePct ?? 0); 
  return Math.round((maxPoints * pct) / 10) / 10;
}

export function makeEvaluation(level, scorePct, bands = DEFAULT_LEVEL_BANDS) {
  const selected = normalizeBands(bands)[level];
  if (!selected) {
    throw new RangeError(`Unknown level band: ${String(level)}`);
  }

  const finalScore = clampScoreToBand(level, scorePct ?? bandMidpoint(level, bands), bands);
  return {
    level,
    scorePct: finalScore,
    status: "evaluated",
  };
}

function sectionSum(sectionCriteria, criteriaState, bands) {
  let points = 0;
  let rangeMin = 0;
  let rangeMax = 0;
  let evaluated = 0;
  let maxEvaluated = 0;

  for (const criterion of sectionCriteria) {
    const state = criteriaState[criterion.id];
    if (!state || typeof state !== "object") continue;
    if (!LEVELS.includes(state.level)) continue;
    if (state.status === "not_evaluated") continue;

    const band = normalizeBands(bands)[state.level];
    if (!band) continue;

    const score = clampScoreToBand(state.level, state.scorePct ?? bandMidpoint(state.level, bands), bands);
    points += criterionPoints(criterion.max, score);
    rangeMin += (criterion.max * band.min) / 100;
    rangeMax += (criterion.max * band.max) / 100;
    maxEvaluated += criterion.max;
    evaluated += 1;
  }

  return {
    points: Number(points.toFixed(1)),
    rangeMin: Number(rangeMin.toFixed(1)),
    rangeMax: Number(rangeMax.toFixed(1)),
    evaluated,
    maxEvaluated: Number(maxEvaluated.toFixed(1)),
  };
}

export function computeCompetenceTotals(rubric, criteriaState, bands = DEFAULT_LEVEL_BANDS) {
  const totalCriteria = rubric.reduce((count, section) => count + section.criteria.length, 0);
  let evaluatedCount = 0;
  let totalMax = 0;
  let points = 0;
  let rangeMin = 0;
  let rangeMax = 0;
  const bySection = {};

  for (const section of rubric) {
    const sectionData = sectionSum(section.criteria, criteriaState, bands);
    bySection[section.id] = {
      points: sectionData.points,
      maxEvaluated: sectionData.maxEvaluated,
      max: Number(section.max),
      evaluated: sectionData.evaluated,
      total: sectionData.points,
    };
    points += sectionData.points;
    rangeMin += sectionData.rangeMin;
    rangeMax += sectionData.rangeMax;
    evaluatedCount += sectionData.evaluated;
    totalMax += section.criteria.reduce((sum, criterion) => sum + criterion.max, 0);
  }

  const complete = evaluatedCount === totalCriteria;
  const on100 = complete ? Number(points.toFixed(1)) : null;
  const on20 = complete ? Number(((points / totalMax) * 20).toFixed(1)) : null;
  const range20 = complete ? {
    min: Number(((rangeMin / totalMax) * 20).toFixed(1)),
    max: Number(((rangeMax / totalMax) * 20).toFixed(1)),
  } : null;

  return {
    totalCriteria,
    evaluatedCount,
    complete,
    totalMax: Number(totalMax.toFixed(1)),
    maxEvaluated: Number(rubric.reduce((sum, section) => sum + section.criteria.reduce((count, criterion) => count + criterion.max, 0), 0).toFixed(1)),
    points: Number(points.toFixed(1)),
    rangePoints: {
      min: Number(rangeMin.toFixed(1)),
      max: Number(rangeMax.toFixed(1)),
    },
    on100,
    on20,
    range20,
    bySection,
  };
}

export function validateRubricStructure(rubric) {
  const issues = [];
  const seenIds = new Set();

  if (!Array.isArray(rubric)) {
    return { valid: false, issues: ["rubric must be an array"], totalMax: 0 };
  }

  let totalMax = 0;
  for (const section of rubric) {
    if (!section || typeof section !== "object") {
      issues.push("section missing");
      continue;
    }
    if (!Array.isArray(section.criteria)) {
      issues.push(`section ${section.id ?? "unknown"} has no criteria array`);
      continue;
    }

    let sectionMax = 0;
    for (const criterion of section.criteria) {
      if (!criterion || typeof criterion !== "object") {
        issues.push(`criterion in section ${section.id ?? "unknown"} invalid`);
        continue;
      }
      if (typeof criterion.id !== "string" || criterion.id.length === 0) {
        issues.push(`criterion in section ${section.id ?? "unknown"} has invalid id`);
      }
      if (seenIds.has(criterion.id)) {
        issues.push(`duplicate criterion id: ${criterion.id}`);
      }
      seenIds.add(criterion.id);
      sectionMax += Number(criterion.max ?? 0);
    }

    if (Number(section.max ?? 0) !== sectionMax) {
      issues.push(`section ${section.id ?? "unknown"} max mismatch: ${sectionMax} vs ${section.max}`);
    }
    totalMax += sectionMax;
  }

  return { valid: issues.length === 0, issues, totalMax };
}
