export const LEVEL_BANDS = Object.freeze({
  A: { min: 90, max: 100 },
  B: { min: 75, max: 89 },
  C: { min: 60, max: 74 },
  D: { min: 0, max: 59 },
});

export function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function sanitizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function levelToPoints(level, max, bands = LEVEL_BANDS) {
  if (!level || !bands[level]) return 0;
  const band = bands[level];
  const midpoint = Math.round((band.min + band.max) / 2);
  return Number(((max * midpoint) / 100).toFixed(1));
}

export function toScoreOutOf20(totalOn100) {
  return Number((((totalOn100 / 100) * 20) || 0).toFixed(1));
}

export function computeWeightedTotals(stateScores, rubric, maxOverall = 100) {
  const bySection = {};
  let total = 0;

  for (const section of rubric) {
    let sum = 0;
    for (const criterion of section.criteria) {
      const raw = Number(stateScores[criterion.id] ?? 0);
      sum += clamp(raw, 0, criterion.max);
    }
    bySection[section.id] = Number(sum.toFixed(1));
    total += sum;
  }

  return {
    bySection,
    total: Number(clamp(total, 0, maxOverall).toFixed(1)),
  };
}

export function computeCompetenceTotals(levels, rubric, bands = LEVEL_BANDS) {
  const bySection = {};
  let filled = 0;
  const totalCriteria = rubric.flatMap((section) => section.criteria).length;

  for (const section of rubric) {
    let sum = 0;
    for (const criterion of section.criteria) {
      const level = levels[criterion.id];
      if (level) filled += 1;
      sum += levelToPoints(level, criterion.max, bands);
    }
    bySection[section.id] = Number(sum.toFixed(1));
  }

  const total = Number(Object.values(bySection).reduce((acc, value) => acc + value, 0).toFixed(1));
  return {
    bySection,
    total,
    filled,
    totalCriteria,
    complete: filled === totalCriteria,
  };
}

export function validateRubricStructure(rubric) {
  const issues = [];
  const seenIds = new Set();
  let totalMax = 0;

  for (const section of rubric) {
    if (!section || !Array.isArray(section.criteria)) {
      issues.push(`Section invalide : ${section?.id ?? "inconnue"}`);
      continue;
    }

    let sectionMax = 0;
    for (const criterion of section.criteria) {
      if (!criterion || typeof criterion.id !== "string") {
        issues.push(`Critère invalide dans la section ${section.id}`);
        continue;
      }
      if (seenIds.has(criterion.id)) {
        issues.push(`Identifiant dupliqué : ${criterion.id}`);
      }
      seenIds.add(criterion.id);
      sectionMax += Number(criterion.max ?? 0);
    }

    if (sectionMax !== Number(section.max ?? 0)) {
      issues.push(`Mauvais max pour ${section.id} (${sectionMax} ≠ ${section.max})`);
    }
    totalMax += sectionMax;
  }

  return { valid: issues.length === 0, issues, totalMax };
}

export function sanitizeImportedJson(raw, fallback) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  return raw ?? fallback;
}
