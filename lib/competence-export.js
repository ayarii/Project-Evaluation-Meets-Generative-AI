import { computeCompetenceTotals } from "./scoring.js";

export function buildCompetenceExport(rubric, state, bands) {
  const totals = computeCompetenceTotals(rubric, state.criteria, bands);
  const criteria = Object.fromEntries(
    Object.entries(totals.byCriterion).map(([id, result]) => [
      id,
      {
        level: result.level,
        note: result.note,
        status: result.status,
        interval: result.interval,
      },
    ]),
  );
  const sections = Object.fromEntries(
    Object.entries(totals.bySection).map(([id, result]) => [
      id,
      { points: result.points, range: result.range },
    ]),
  );

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    type: "competences",
    meta: state.meta,
    criteria,
    notes: state.notes,
    sections,
    totals: {
      points: totals.points,
      rangePoints: totals.rangePoints,
      complete: totals.complete,
      on100: totals.on100,
      on20: totals.on20,
      range20: totals.range20,
    },
  };
}
