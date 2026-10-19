export const LEVELS = ["A", "B", "C", "D"];
export const NOTE_STEP = 0.5;

export const DEFAULT_LEVEL_BANDS = Object.freeze({
  A: { min: 90, max: 100 },
  B: { min: 75, max: 89 },
  C: { min: 60, max: 74 },
  D: { min: 0, max: 59 },
});

function getBand(level, bands) {
  const band = bands?.[level];
  if (!band) throw new RangeError(`Unknown level band: ${String(level)}`);
  return band;
}

function decimalPlaces(value) {
  const text = String(value).toLowerCase();
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  const decimal = text.split(".")[1];
  return decimal ? decimal.length : 0;
}

function roundedTenth(value) {
  return Math.round(value * 10) / 10;
}

export function levelPointsInterval(maxPoints, level, bands = DEFAULT_LEVEL_BANDS) {
  const band = getBand(level, bands);
  return {
    min: Math.round(Number(maxPoints) * band.min / 10) / 10,
    max: Math.round(Number(maxPoints) * band.max / 10) / 10,
  };
}

export function normalizeNote(note, maxPoints, step = NOTE_STEP) {
  if (note === null || note === undefined || (typeof note === "string" && note.trim() === "")) return null;
  if (typeof note !== "number" && typeof note !== "string") return null;
  const numeric = Number(note);
  const max = Number(maxPoints);
  const increment = Number(step);
  if (!Number.isFinite(numeric) || !Number.isFinite(max) || !Number.isFinite(increment) || max < 0 || increment <= 0) {
    return null;
  }

  const precision = Math.min(10, Math.max(decimalPlaces(numeric), decimalPlaces(max), decimalPlaces(increment)));
  const scale = 10 ** precision;
  const maxUnits = Math.round(max * scale);
  const stepUnits = Math.max(1, Math.round(increment * scale));
  const boundedUnits = Math.min(maxUnits, Math.max(0, Math.round(numeric * scale)));
  const snappedUnits = Math.min(maxUnits, Math.floor((boundedUnits + stepUnits / 2) / stepUnits) * stepUnits);
  return snappedUnits / scale;
}

function clampStoredNote(note, maxPoints) {
  if (note === null || note === undefined || (typeof note === "string" && note.trim() === "")) return null;
  if (typeof note !== "number" && typeof note !== "string") return null;
  const numeric = Number(note);
  const max = Number(maxPoints);
  if (!Number.isFinite(numeric) || !Number.isFinite(max) || max < 0) return null;
  return Math.min(max, Math.max(0, numeric));
}

function validLevel(level, bands) {
  return typeof level === "string" && Object.hasOwn(bands, level);
}

export function computeCompetenceTotals(rubric, criteriaState, bands = DEFAULT_LEVEL_BANDS) {
  const state = criteriaState && typeof criteriaState === "object" ? criteriaState : {};
  const totalCriteria = rubric.reduce((count, section) => count + section.criteria.length, 0);
  const totalMax = rubric.reduce((sum, section) => sum + section.criteria.reduce((part, criterion) => part + Number(criterion.max), 0), 0);
  const bySection = {};
  const byCriterion = {};
  let levelCount = 0;
  let evaluatedCount = 0;
  let maxEvaluated = 0;
  let points = 0;
  let rangeMin = 0;
  let rangeMax = 0;

  for (const section of rubric) {
    let sectionPoints = 0;
    let sectionEvaluated = 0;
    let sectionLevelCount = 0;
    let sectionMaxEvaluated = 0;
    let sectionRangeMin = 0;
    let sectionRangeMax = 0;

    for (const criterion of section.criteria) {
      const raw = state[criterion.id] && typeof state[criterion.id] === "object"
        ? state[criterion.id]
        : {};
      const level = validLevel(raw.level, bands) ? raw.level : null;
      const note = clampStoredNote(raw.note, criterion.max);
      const interval = level ? levelPointsInterval(criterion.max, level, bands) : null;
      const status = level && note !== null
        ? "evaluated"
        : level
          ? "level_only"
          : note !== null
            ? "note_only"
            : "not_evaluated";
      const position = interval && note !== null
        ? note < interval.min
          ? "below"
          : note > interval.max
            ? "above"
            : "inside"
        : null;

      byCriterion[criterion.id] = { status, level, note, interval, position };
      if (level) {
        levelCount += 1;
        sectionLevelCount += 1;
        const band = getBand(level, bands);
        const exactMin = Number(criterion.max) * band.min / 100;
        const exactMax = Number(criterion.max) * band.max / 100;
        rangeMin += exactMin;
        rangeMax += exactMax;
        sectionRangeMin += interval.min;
        sectionRangeMax += interval.max;
      }
      if (status === "evaluated") {
        evaluatedCount += 1;
        sectionEvaluated += 1;
        maxEvaluated += Number(criterion.max);
        sectionMaxEvaluated += Number(criterion.max);
        points += note;
        sectionPoints += note;
      }
    }

    bySection[section.id] = {
      max: Number(section.max),
      total: roundedTenth(sectionPoints),
      evaluated: sectionEvaluated,
      levelCount: sectionLevelCount,
      points: roundedTenth(sectionPoints),
      maxEvaluated: roundedTenth(sectionMaxEvaluated),
      range: { min: roundedTenth(sectionRangeMin), max: roundedTenth(sectionRangeMax) },
    };
  }

  const complete = evaluatedCount === totalCriteria;
  const normalizedPoints = roundedTenth(points);
  const rangePoints = { min: roundedTenth(rangeMin), max: roundedTenth(rangeMax) };
  return {
    totalCriteria,
    levelCount,
    evaluatedCount,
    complete,
    totalMax: roundedTenth(totalMax),
    maxEvaluated: roundedTenth(maxEvaluated),
    points: normalizedPoints,
    rangePoints,
    on100: complete ? normalizedPoints : null,
    on20: complete && totalMax > 0 ? roundedTenth((normalizedPoints / totalMax) * 20) : null,
    range20: complete && totalMax > 0
      ? {
          min: roundedTenth((rangePoints.min / totalMax) * 20),
          max: roundedTenth((rangePoints.max / totalMax) * 20),
        }
      : null,
    bySection,
    byCriterion,
  };
}
